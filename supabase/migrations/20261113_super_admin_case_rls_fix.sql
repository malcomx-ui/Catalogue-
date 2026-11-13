-- ==============================================================================
-- Migration: Super Admin & Admin Case Insert/Update Bypass & Kampala HQ Default
-- ==============================================================================
-- Ensures super_admin, admin, and partner roles can INSERT/UPDATE litigation
-- records in `public.cases` (and `public.litigation_cases` if present) regardless
-- of whether `branch_id` is set on their profile, and regardless of varying
-- `branch_id` values on the case row.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_partner_or_superadmin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_role TEXT;
  v_is_super BOOLEAN;
  v_user_email TEXT;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  v_user_email := LOWER(COALESCE(auth.jwt()->>'email', ''));

  IF v_user_email = 'infosightug@gmail.com' THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (id::text = auth.uid()::text OR (v_user_email <> '' AND LOWER(email) = v_user_email))
        AND (
          LOWER(COALESCE(role, '')) IN ('partner', 'super_admin', 'superadmin', 'managing_partner')
          OR is_super_admin IS TRUE
        )
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  IF v_user_email <> '' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'firm_users') THEN
    SELECT role, is_super_admin
    INTO v_role, v_is_super
    FROM public.firm_users
    WHERE LOWER(email) = v_user_email
    LIMIT 1;

    IF v_is_super IS TRUE OR LOWER(COALESCE(v_role, '')) IN ('partner', 'super_admin', 'superadmin', 'managing_partner') THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_case_branch()
RETURNS TRIGGER AS $$
DECLARE
  user_branch TEXT;
  user_role TEXT;
  user_is_super BOOLEAN := false;
  caller_email TEXT;
BEGIN
  caller_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));

  SELECT role, branch_id, is_super_admin
  INTO user_role, user_branch, user_is_super
  FROM public.profiles
  WHERE id::text = auth.uid()::text OR (caller_email <> '' AND LOWER(email) = caller_email)
  LIMIT 1;

  IF user_role IS NULL AND caller_email <> '' THEN
    SELECT role, branch_id, is_super_admin
    INTO user_role, user_branch, user_is_super
    FROM public.firm_users
    WHERE LOWER(email) = caller_email
    LIMIT 1;
  END IF;

  -- Bypass branch restriction strictly for super_admin and partner roles (NOT branch admins)
  IF LOWER(COALESCE(user_role, '')) IN ('partner', 'super_admin', 'superadmin', 'managing_partner')
     OR user_is_super = true
     OR caller_email = 'infosightug@gmail.com' THEN
    IF NEW.branch_id IS NULL OR NEW.branch_id = '' THEN
      NEW.branch_id := COALESCE(NULLIF(user_branch, ''), 'kla-hq');
    END IF;
    IF NEW.branch_name IS NULL OR NEW.branch_name = '' THEN
      NEW.branch_name := 'Kampala Central (Head Office)';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.branch_id IS NOT NULL AND NEW.branch_id <> '' AND user_branch IS NOT NULL AND user_branch <> '' AND NEW.branch_id <> user_branch THEN
    RAISE EXCEPTION 'RLS Policy Violation: You cannot insert cases into branch %, only into your assigned branch %.', NEW.branch_id, user_branch;
  END IF;

  IF NEW.branch_id IS NULL OR NEW.branch_id = '' THEN
    NEW.branch_id := COALESCE(NULLIF(user_branch, ''), 'kla-hq');
  END IF;
  IF NEW.branch_name IS NULL OR NEW.branch_name = '' THEN
    NEW.branch_name := 'Kampala Central (Head Office)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_set_case_branch ON public.cases;
CREATE TRIGGER tr_set_case_branch
  BEFORE INSERT ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_case_branch();

-- Refresh RLS policies on public.cases
DROP POLICY IF EXISTS "Enforce branch isolation on case insert" ON public.cases;
DROP POLICY IF EXISTS "Branch staff insert own branch cases" ON public.cases;
CREATE POLICY "Branch staff insert own branch cases"
ON public.cases
FOR INSERT
TO authenticated, anon
WITH CHECK (
  auth.role() = 'service_role'
  OR public.is_partner_or_superadmin()
  OR branch_id = public.get_auth_user_branch_id()
  OR branch_id IS NULL
);

DROP POLICY IF EXISTS "Enforce branch isolation on case update" ON public.cases;
DROP POLICY IF EXISTS "Branch staff update own branch cases" ON public.cases;
CREATE POLICY "Branch staff update own branch cases"
ON public.cases
FOR UPDATE
TO authenticated, anon
USING (
  auth.role() = 'service_role'
  OR public.is_partner_or_superadmin()
  OR branch_id = public.get_auth_user_branch_id()
)
WITH CHECK (
  auth.role() = 'service_role'
  OR public.is_partner_or_superadmin()
  OR branch_id = public.get_auth_user_branch_id()
);

-- Conditionally apply identical Super Admin/Admin bypass policies to public.litigation_cases if that table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'litigation_cases'
  ) THEN
    EXECUTE 'ALTER TABLE public.litigation_cases ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Super admin insert litigation_cases" ON public.litigation_cases';
    EXECUTE 'DROP POLICY IF EXISTS "Super admin update litigation_cases" ON public.litigation_cases';
    EXECUTE $p$
      CREATE POLICY "Super admin insert litigation_cases"
      ON public.litigation_cases
      FOR INSERT
      TO authenticated, anon
      WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
        OR branch_id IS NULL
      )
    $p$;
    EXECUTE $p$
      CREATE POLICY "Super admin update litigation_cases"
      ON public.litigation_cases
      FOR UPDATE
      TO authenticated, anon
      USING (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
      )
      WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
      )
    $p$;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
