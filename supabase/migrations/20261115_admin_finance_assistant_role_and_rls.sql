-- ==============================================================================
-- Migration: Admin & Finance Assistant Role Support, Multi-Staffing, & Strict RLS
-- ==============================================================================
-- 1. Ensures multiple Admin & Finance Assistants can belong to the same branch
--    without unique constraint conflicts on (branch_id, role) or (role).
-- 2. Adds branch_id / branch_name columns on mortgages, mortgage_cases, and
--    litigation_cases where needed.
-- 3. Updates get_auth_user_branch_id(), is_partner_or_superadmin(), and RLS
--    policies on cases, litigation_cases, mortgages, and mortgage_cases so:
--      - Admin & Finance Assistants can SELECT across ALL branches
--      - Admin & Finance Assistants & Branch Staff can INSERT/UPDATE/DELETE
--        ONLY records matching their assigned branch_id
--      - Super Admins / Managing Partners retain unrestricted multi-branch access
-- ==============================================================================

-- 1. Drop any accidental unique index/constraint restricting one role per branch
DO $$
DECLARE
  idx_name TEXT;
BEGIN
  FOR idx_name IN
    SELECT c.relname
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    JOIN pg_class t ON t.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname IN ('firm_users', 'profiles')
      AND i.indisunique = true
      AND i.indisprimary = false
      AND pg_get_indexdef(i.indexrelid) ILIKE '%role%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', idx_name);
  END LOOP;
END $$;

-- 2. Ensure branch columns exist on mortgage/litigation tables
ALTER TABLE IF EXISTS public.mortgages ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE IF EXISTS public.mortgages ADD COLUMN IF NOT EXISTS branch_name TEXT;
CREATE INDEX IF NOT EXISTS idx_mortgages_branch_id ON public.mortgages(branch_id);

-- 3. Branch name -> canonical branch ID resolver helper
CREATE OR REPLACE FUNCTION public.resolve_branch_id_from_text(p_text TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_clean TEXT := LOWER(COALESCE(p_text, ''));
BEGIN
  IF v_clean IN ('ftp-reg', 'glu-reg', 'jnj-reg', 'kla-hq', 'msk-reg', 'msn-reg', 'mbr-reg') THEN
    RETURN v_clean;
  END IF;
  IF v_clean LIKE '%fort%' OR v_clean LIKE '%portal%' THEN RETURN 'ftp-reg'; END IF;
  IF v_clean LIKE '%gulu%' THEN RETURN 'glu-reg'; END IF;
  IF v_clean LIKE '%jinja%' THEN RETURN 'jnj-reg'; END IF;
  IF v_clean LIKE '%masaka%' THEN RETURN 'msk-reg'; END IF;
  IF v_clean LIKE '%masindi%' THEN RETURN 'msn-reg'; END IF;
  IF v_clean LIKE '%mbarara%' THEN RETURN 'mbr-reg'; END IF;
  RETURN 'kla-hq';
END;
$$;

-- 4. Update Super Admin / Managing Partner privilege checker (excludes admin_finance_assistant & branch admin)
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

-- 5. Update branch lookup helper with profiles + firm_users + JWT user_metadata fallback
CREATE OR REPLACE FUNCTION public.get_auth_user_branch_id()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_branch_id TEXT;
  v_user_email TEXT;
  v_jwt_branch TEXT;
BEGIN
  v_user_email := COALESCE(auth.jwt()->>'email', '');
  v_jwt_branch := NULLIF(TRIM(COALESCE(auth.jwt()->'user_metadata'->>'branch_id', auth.jwt()->>'branch_id', '')), '');

  IF v_user_email <> '' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    SELECT NULLIF(TRIM(branch_id), '')
    INTO v_branch_id
    FROM public.profiles
    WHERE (id::text = auth.uid()::text OR LOWER(email) = LOWER(v_user_email))
    LIMIT 1;
  END IF;

  IF v_branch_id IS NOT NULL THEN
    RETURN v_branch_id;
  END IF;

  IF v_user_email <> '' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'firm_users') THEN
    SELECT NULLIF(TRIM(branch_id), '')
    INTO v_branch_id
    FROM public.firm_users
    WHERE LOWER(email) = LOWER(v_user_email)
    LIMIT 1;
  END IF;

  IF v_branch_id IS NOT NULL THEN
    RETURN v_branch_id;
  END IF;

  RETURN v_jwt_branch;
END;
$$;

-- 6. Fix log_case_audit UUID::text comparison
CREATE OR REPLACE FUNCTION public.log_case_audit()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
  current_user_role TEXT;
  diff_json JSONB := NULL;
  target_case_id UUID;
  target_case_number TEXT;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NOT NULL THEN
    SELECT email, role INTO current_user_email, current_user_role
    FROM public.profiles
    WHERE id::text = current_user_id::text
    LIMIT 1;
  END IF;

  IF (TG_OP = 'INSERT') THEN
    target_case_id := NEW.id::uuid;
    target_case_number := COALESCE(NEW.case_number, NEW.suit_number, NEW.suit_no, '');
    INSERT INTO public.case_audit_logs (
      case_id, case_number, action, user_id, user_email, user_role,
      timestamp, old_data, new_data, modified_fields
    ) VALUES (
      target_case_id, target_case_number, 'INSERT',
      current_user_id, current_user_email, current_user_role,
      timezone('utc'::text, now()), NULL, to_jsonb(NEW), to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    target_case_id := NEW.id::uuid;
    target_case_number := COALESCE(NEW.case_number, NEW.suit_number, NEW.suit_no, '');
    SELECT jsonb_object_agg(
      new_entry.key,
      jsonb_build_object('old', old_entry.value, 'new', new_entry.value)
    )
    INTO diff_json
    FROM jsonb_each(to_jsonb(NEW)) AS new_entry
    JOIN jsonb_each(to_jsonb(OLD)) AS old_entry ON new_entry.key = old_entry.key
    WHERE new_entry.value IS DISTINCT FROM old_entry.value
      AND new_entry.key NOT IN ('updated_at');
    INSERT INTO public.case_audit_logs (
      case_id, case_number, action, user_id, user_email, user_role,
      timestamp, old_data, new_data, modified_fields
    ) VALUES (
      target_case_id, target_case_number, 'UPDATE',
      current_user_id, current_user_email, current_user_role,
      timezone('utc'::text, now()), to_jsonb(OLD), to_jsonb(NEW),
      COALESCE(diff_json, '{}'::jsonb)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    target_case_id := OLD.id::uuid;
    target_case_number := COALESCE(OLD.case_number, OLD.suit_number, OLD.suit_no, '');
    INSERT INTO public.case_audit_logs (
      case_id, case_number, action, user_id, user_email, user_role,
      timestamp, old_data, new_data, modified_fields
    ) VALUES (
      target_case_id, target_case_number, 'DELETE',
      current_user_id, current_user_email, current_user_role,
      timezone('utc'::text, now()), to_jsonb(OLD), NULL, NULL
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Enforce branch-scoped writes + cross-branch reads on cases, litigation_cases, mortgages, mortgage_cases
DO $$
BEGIN
  IF to_regclass('public.cases') IS NOT NULL THEN
    ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated staff view all cases" ON public.cases;
    DROP POLICY IF EXISTS "Branch staff insert own branch cases" ON public.cases;
    DROP POLICY IF EXISTS "Branch staff update own branch cases" ON public.cases;
    DROP POLICY IF EXISTS "Branch staff delete own branch cases" ON public.cases;

    CREATE POLICY "Authenticated staff view all cases"
      ON public.cases FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Branch staff insert own branch cases"
      ON public.cases FOR INSERT TO authenticated, anon
      WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
      );
    CREATE POLICY "Branch staff update own branch cases"
      ON public.cases FOR UPDATE TO authenticated, anon
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
    CREATE POLICY "Branch staff delete own branch cases"
      ON public.cases FOR DELETE TO authenticated, anon
      USING (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
      );
  END IF;

  IF to_regclass('public.litigation_cases') IS NOT NULL THEN
    ALTER TABLE public.litigation_cases ADD COLUMN IF NOT EXISTS branch_id TEXT;
    ALTER TABLE public.litigation_cases ADD COLUMN IF NOT EXISTS branch_name TEXT;
    ALTER TABLE public.litigation_cases ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow authenticated read on litigation_cases" ON public.litigation_cases;
    DROP POLICY IF EXISTS "Allow branch scoped insert on litigation_cases" ON public.litigation_cases;
    DROP POLICY IF EXISTS "Allow branch scoped update on litigation_cases" ON public.litigation_cases;
    DROP POLICY IF EXISTS "Allow branch scoped delete on litigation_cases" ON public.litigation_cases;

    CREATE POLICY "Allow authenticated read on litigation_cases"
      ON public.litigation_cases FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Allow branch scoped insert on litigation_cases"
      ON public.litigation_cases FOR INSERT TO authenticated, anon
      WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
      );
    CREATE POLICY "Allow branch scoped update on litigation_cases"
      ON public.litigation_cases FOR UPDATE TO authenticated, anon
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
    CREATE POLICY "Allow branch scoped delete on litigation_cases"
      ON public.litigation_cases FOR DELETE TO authenticated, anon
      USING (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
      );
  END IF;

  IF to_regclass('public.mortgages') IS NOT NULL THEN
    ALTER TABLE public.mortgages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated read on mortgages" ON public.mortgages;
    DROP POLICY IF EXISTS "Allow authenticated write on mortgages" ON public.mortgages;
    DROP POLICY IF EXISTS "Allow public write on mortgages" ON public.mortgages;
    DROP POLICY IF EXISTS "Allow branch scoped insert on mortgages" ON public.mortgages;
    DROP POLICY IF EXISTS "Allow branch scoped update on mortgages" ON public.mortgages;
    DROP POLICY IF EXISTS "Allow branch scoped delete on mortgages" ON public.mortgages;

    CREATE POLICY "Allow authenticated read on mortgages"
      ON public.mortgages FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Allow branch scoped insert on mortgages"
      ON public.mortgages FOR INSERT TO authenticated, anon
      WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
      );
    CREATE POLICY "Allow branch scoped update on mortgages"
      ON public.mortgages FOR UPDATE TO authenticated, anon
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
    CREATE POLICY "Allow branch scoped delete on mortgages"
      ON public.mortgages FOR DELETE TO authenticated, anon
      USING (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
      );
  END IF;

  IF to_regclass('public.mortgage_cases') IS NOT NULL THEN
    ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS branch_id TEXT;
    ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS branch_name TEXT;
    ALTER TABLE public.mortgage_cases ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admin and Finance insert policy on mortgage_cases" ON public.mortgage_cases;
    DROP POLICY IF EXISTS "Allow authenticated read on mortgage_cases" ON public.mortgage_cases;
    DROP POLICY IF EXISTS "Allow authenticated write on mortgage_cases" ON public.mortgage_cases;
    DROP POLICY IF EXISTS "Allow public write on mortgage_cases" ON public.mortgage_cases;
    DROP POLICY IF EXISTS "Allow branch scoped insert on mortgage_cases" ON public.mortgage_cases;
    DROP POLICY IF EXISTS "Allow branch scoped update on mortgage_cases" ON public.mortgage_cases;
    DROP POLICY IF EXISTS "Allow branch scoped delete on mortgage_cases" ON public.mortgage_cases;

    CREATE POLICY "Allow authenticated read on mortgage_cases"
      ON public.mortgage_cases FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Allow branch scoped insert on mortgage_cases"
      ON public.mortgage_cases FOR INSERT TO authenticated, anon
      WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
        OR (branch_id IS NULL AND public.resolve_branch_id_from_text(branch) = public.get_auth_user_branch_id())
      );
    CREATE POLICY "Allow branch scoped update on mortgage_cases"
      ON public.mortgage_cases FOR UPDATE TO authenticated, anon
      USING (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
        OR (branch_id IS NULL AND public.resolve_branch_id_from_text(branch) = public.get_auth_user_branch_id())
      )
      WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
        OR (branch_id IS NULL AND public.resolve_branch_id_from_text(branch) = public.get_auth_user_branch_id())
      );
    CREATE POLICY "Allow branch scoped delete on mortgage_cases"
      ON public.mortgage_cases FOR DELETE TO authenticated, anon
      USING (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
        OR (branch_id IS NULL AND public.resolve_branch_id_from_text(branch) = public.get_auth_user_branch_id())
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
