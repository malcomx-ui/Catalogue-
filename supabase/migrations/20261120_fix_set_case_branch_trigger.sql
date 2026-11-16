-- ==============================================================================
-- Migration: Fix legacy `set_case_branch()` trigger P0001 Configuration Error
-- Replaces older trigger versions that raised:
--   "Configuration Error: Your user profile does not have an assigned branch."
-- Safely backfills blank branch_id values on profiles/firm_users and defaults
-- missing case branch_id/branch_name cleanly to the user's station or Kampala HQ.
-- ==============================================================================

-- 1. Ensure branch columns exist and backfill any NULL/empty branch assignments
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS branch_id TEXT,
  ADD COLUMN IF NOT EXISTS branch_name TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT;

UPDATE public.profiles
SET
  branch_id = COALESCE(NULLIF(TRIM(branch_id), ''), 'kla-hq'),
  branch_name = COALESCE(NULLIF(TRIM(branch_name), ''), NULLIF(TRIM(branch), ''), 'Kampala Central (Head Office)'),
  branch = COALESCE(NULLIF(TRIM(branch), ''), NULLIF(TRIM(branch_name), ''), 'Kampala Central (Head Office)')
WHERE branch_id IS NULL OR TRIM(branch_id) = '';

DO $$
BEGIN
  IF to_regclass('public.firm_users') IS NOT NULL THEN
    ALTER TABLE public.firm_users
      ADD COLUMN IF NOT EXISTS branch_id TEXT,
      ADD COLUMN IF NOT EXISTS branch_name TEXT;

    UPDATE public.firm_users
    SET
      branch_id = COALESCE(NULLIF(TRIM(branch_id), ''), 'kla-hq'),
      branch_name = COALESCE(NULLIF(TRIM(branch_name), ''), 'Kampala Central (Head Office)')
    WHERE branch_id IS NULL OR TRIM(branch_id) = '';
  END IF;
END $$;

-- 2. Resilient auth branch resolver (never throws on unlinked or portal-fallback profiles)
CREATE OR REPLACE FUNCTION public.get_auth_user_branch_id()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_branch_id TEXT;
  v_user_email TEXT;
  v_jwt_branch TEXT;
BEGIN
  v_user_email := LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')));
  v_jwt_branch := NULLIF(TRIM(COALESCE(auth.jwt()->'user_metadata'->>'branch_id', auth.jwt()->>'branch_id', '')), '');

  IF to_regclass('public.profiles') IS NOT NULL THEN
    SELECT NULLIF(TRIM(branch_id), '')
    INTO v_branch_id
    FROM public.profiles
    WHERE (auth.uid() IS NOT NULL AND id::text = auth.uid()::text)
       OR (v_user_email <> '' AND LOWER(email) = v_user_email)
    LIMIT 1;
  END IF;

  IF v_branch_id IS NOT NULL THEN
    RETURN v_branch_id;
  END IF;

  IF v_user_email <> '' AND to_regclass('public.firm_users') IS NOT NULL THEN
    SELECT NULLIF(TRIM(branch_id), '')
    INTO v_branch_id
    FROM public.firm_users
    WHERE LOWER(email) = v_user_email
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_branch_id, v_jwt_branch, 'kla-hq');
END;
$$;

-- 3. Replace legacy set_case_branch() trigger function so it NEVER throws P0001
CREATE OR REPLACE FUNCTION public.set_case_branch()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_branch TEXT;
  user_branch_name TEXT;
  user_role TEXT;
  user_is_super BOOLEAN := false;
  caller_email TEXT;
BEGIN
  caller_email := LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')));

  IF to_regclass('public.profiles') IS NOT NULL THEN
    SELECT role, NULLIF(TRIM(branch_id), ''), COALESCE(NULLIF(TRIM(branch_name), ''), NULLIF(TRIM(branch), '')), COALESCE(is_super_admin, false)
    INTO user_role, user_branch, user_branch_name, user_is_super
    FROM public.profiles
    WHERE (auth.uid() IS NOT NULL AND id::text = auth.uid()::text)
       OR (caller_email <> '' AND LOWER(email) = caller_email)
    LIMIT 1;
  END IF;

  IF (user_role IS NULL OR user_branch IS NULL) AND caller_email <> '' AND to_regclass('public.firm_users') IS NOT NULL THEN
    SELECT COALESCE(user_role, role), COALESCE(user_branch, NULLIF(TRIM(branch_id), '')), COALESCE(user_branch_name, NULLIF(TRIM(branch_name), '')), (user_is_super OR COALESCE(is_super_admin, false))
    INTO user_role, user_branch, user_branch_name, user_is_super
    FROM public.firm_users
    WHERE LOWER(email) = caller_email
    LIMIT 1;
  END IF;

  IF user_branch IS NULL OR user_branch = '' THEN
    user_branch := NULLIF(TRIM(COALESCE(auth.jwt()->'user_metadata'->>'branch_id', '')), '');
  END IF;

  -- Super Admins, Managing Partners, service_role, or requests carrying explicit valid branch pass through cleanly
  IF auth.role() = 'service_role'
     OR user_is_super IS TRUE
     OR LOWER(COALESCE(user_role, '')) IN ('partner', 'super_admin', 'superadmin', 'managing_partner')
     OR caller_email = 'infosightug@gmail.com' THEN
    IF NEW.branch_id IS NULL OR TRIM(NEW.branch_id) = '' THEN
      NEW.branch_id := COALESCE(NULLIF(user_branch, ''), 'kla-hq');
    END IF;
    IF NEW.branch_name IS NULL OR TRIM(NEW.branch_name) = '' THEN
      NEW.branch_name := COALESCE(NULLIF(user_branch_name, ''), 'Kampala Central (Head Office)');
    END IF;
    RETURN NEW;
  END IF;

  -- Default missing branch_id cleanly without raising a missing-profile-branch error
  IF NEW.branch_id IS NULL OR TRIM(NEW.branch_id) = '' THEN
    NEW.branch_id := COALESCE(NULLIF(user_branch, ''), 'kla-hq');
  END IF;
  IF NEW.branch_name IS NULL OR TRIM(NEW.branch_name) = '' THEN
    NEW.branch_name := COALESCE(NULLIF(user_branch_name, ''), 'Kampala Central (Head Office)');
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  r RECORD;
  v_def TEXT;
BEGIN
  IF to_regclass('public.cases') IS NOT NULL THEN
    FOR r IN
      SELECT t.tgname, p.oid AS func_oid
      FROM pg_trigger t
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE t.tgrelid = 'public.cases'::regclass
        AND NOT t.tgisinternal
    LOOP
      v_def := LOWER(pg_get_functiondef(r.func_oid));
      IF v_def LIKE '%assigned branch%'
         OR v_def LIKE '%configuration error%'
         OR v_def LIKE '%set_case_branch%'
         OR v_def LIKE '%p0001%' THEN
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.cases;', r.tgname);
      END IF;
    END LOOP;
  END IF;
END $$;

DROP TRIGGER IF EXISTS tr_set_case_branch ON public.cases;
CREATE TRIGGER tr_set_case_branch
  BEFORE INSERT ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_case_branch();

NOTIFY pgrst, 'reload schema';
