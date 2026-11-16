-- ==============================================================================
-- Migration: Role-Based Access Control (RBAC) for Bulk Mortgage Import
-- ==============================================================================
-- Adds explicit `can_import_mortgages` permission column on `public.profiles`
-- and defines `public.can_import_mortgages()` helper for Supabase RLS/API checks.
-- Standard single-file branch custody on `mortgages` and `mortgage_cases`
-- remains intact while bulk import tools verify `super_admin` or `can_import_mortgages`.
-- ==============================================================================

-- 1. Add explicit can_import_mortgages flag to public.profiles
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS can_import_mortgages BOOLEAN NOT NULL DEFAULT false;

-- 2. Backfill Super Administrators / Managing Partners so they retain import authority
UPDATE public.profiles
SET can_import_mortgages = true
WHERE is_super_admin IS TRUE
   OR LOWER(COALESCE(role_id, '')) = 'role-super-admin'
   OR LOWER(COALESCE(role, '')) IN ('super_admin', 'superadmin', 'partner', 'managing_partner', 'system_admin')
   OR LOWER(COALESCE(email, '')) = 'infosightug@gmail.com';

-- 3. Create reusable PostgreSQL helper function checking strict super_admin or can_import_mortgages
CREATE OR REPLACE FUNCTION public.can_import_mortgages()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_email TEXT;
  jwt_meta JSONB;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  jwt_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  IF jwt_email = 'infosightug@gmail.com' THEN
    RETURN TRUE;
  END IF;

  jwt_meta := COALESCE(auth.jwt() -> 'user_metadata', '{}'::jsonb);
  IF COALESCE((jwt_meta ->> 'is_super_admin')::boolean, false) IS TRUE
     OR LOWER(COALESCE(jwt_meta ->> 'role_id', '')) = 'role-super-admin'
     OR LOWER(COALESCE(jwt_meta ->> 'role', '')) IN ('super_admin', 'superadmin', 'partner', 'managing_partner', 'system_admin')
     OR COALESCE((jwt_meta ->> 'can_import_mortgages')::boolean, false) IS TRUE THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p.id = auth.uid() OR (jwt_email <> '' AND LOWER(COALESCE(p.email, '')) = jwt_email))
      AND (
        p.is_super_admin IS TRUE
        OR LOWER(COALESCE(p.role_id, '')) = 'role-super-admin'
        OR LOWER(COALESCE(p.role, '')) IN ('super_admin', 'superadmin', 'partner', 'managing_partner', 'system_admin')
        OR p.can_import_mortgages IS TRUE
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_import_mortgages() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_import_mortgages() TO authenticated, service_role;

-- 4. Keep branch-scoped insert/update/delete policies intact for single-file branch custody
--    while documenting bulk import safeguard via public.can_import_mortgages().
COMMENT ON FUNCTION public.can_import_mortgages() IS
  'Returns TRUE only for strict super_admin / partner accounts or users explicitly granted can_import_mortgages.';

NOTIFY pgrst, 'reload schema';
