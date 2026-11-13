-- ==============================================================================
-- Migration: Profiles Schema Columns & Strict Branch Admin Isolation
-- ==============================================================================
-- 1. Adds missing `must_change_password` and `advocate_roll_no` columns to `public.profiles`
--    so staff role, branch, and onboarding updates persist cleanly without schema errors.
-- 2. Updates `is_partner_or_superadmin()`, `is_admin_or_lawyer()`, and `set_case_branch()`
--    so Branch Administrators (`admin`, `branch_admin`, `office_admin`) are strictly
--    scoped to their assigned branch and cannot gain Super Admin cross-branch rights.
-- ==============================================================================

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS advocate_roll_no TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_branch_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS role_id TEXT DEFAULT 'role-advocate',
  ADD COLUMN IF NOT EXISTS role_title TEXT DEFAULT 'Litigation Lawyer / Associate',
  ADD COLUMN IF NOT EXISTS branch_id TEXT,
  ADD COLUMN IF NOT EXISTS branch_name TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT;

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

CREATE OR REPLACE FUNCTION public.is_admin_or_lawyer()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN public.is_partner_or_superadmin();
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

  -- Bypass branch restriction strictly for Super Admins and Managing Partners (NOT Branch Admins)
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

NOTIFY pgrst, 'reload schema';
