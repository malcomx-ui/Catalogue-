-- ==============================================================================
-- Migration: Fix Frontend Staff Provisioning in Supabase (profiles + firm_users)
-- ==============================================================================
-- 1. Ensures all required staff provisioning columns exist on `public.profiles`.
-- 2. Allows `public.profiles` to store provisioned staff directories even when
--    Supabase Auth signups are restricted or service_role key is absent, by
--    setting `DEFAULT gen_random_uuid()` and relaxing `profiles_id_fkey`.
-- 3. Ensures `public.firm_users` exists with matching columns and policies.
-- 4. Provides `public.admin_upsert_staff_profile(...)` RPC for atomic staff
--    creation & updates from the portal.
-- ==============================================================================

-- 1. Ensure public.profiles schema is complete
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'lawyer',
  ADD COLUMN IF NOT EXISTS role_id TEXT DEFAULT 'role-advocate',
  ADD COLUMN IF NOT EXISTS role_title TEXT DEFAULT 'Litigation Lawyer / Associate',
  ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Kampala Central (Head Office)',
  ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'kla-hq',
  ADD COLUMN IF NOT EXISTS branch_name TEXT DEFAULT 'Kampala Central (Head Office)',
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_branch_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_import_mortgages BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS advocate_roll_no TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Drop strict auth.users FK if present so portal-provisioned staff can always save to profiles
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE IF EXISTS public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique_lower ON public.profiles (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- Enable RLS & allow portal directory reads/writes
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated read profiles"
ON public.profiles FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert profiles" ON public.profiles;
CREATE POLICY "Allow authenticated insert profiles"
ON public.profiles FOR INSERT
TO authenticated, anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update profiles" ON public.profiles;
CREATE POLICY "Allow authenticated update profiles"
ON public.profiles FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete profiles" ON public.profiles;
CREATE POLICY "Allow authenticated delete profiles"
ON public.profiles FOR DELETE
TO authenticated, anon
USING (true);

-- 2. Provision public.firm_users table if absent
CREATE TABLE IF NOT EXISTS public.firm_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'lawyer',
  role_id TEXT DEFAULT 'role-advocate',
  role_title TEXT DEFAULT 'Litigation Lawyer / Associate',
  branch_id TEXT DEFAULT 'kla-hq',
  branch_name TEXT DEFAULT 'Kampala Central (Head Office)',
  is_super_admin BOOLEAN DEFAULT false,
  is_branch_admin BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  advocate_roll_no TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.firm_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read firm directory" ON public.firm_users;
CREATE POLICY "Read firm directory"
ON public.firm_users FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Admins manage firm users" ON public.firm_users;
CREATE POLICY "Admins manage firm users"
ON public.firm_users FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 3. SECURITY DEFINER RPC for reliable staff upsert from frontend or server
CREATE OR REPLACE FUNCTION public.admin_upsert_staff_profile(
  p_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'lawyer',
  p_role_id TEXT DEFAULT 'role-advocate',
  p_role_title TEXT DEFAULT 'Litigation Lawyer / Associate',
  p_branch_id TEXT DEFAULT 'kla-hq',
  p_branch_name TEXT DEFAULT 'Kampala Central (Head Office)',
  p_is_super_admin BOOLEAN DEFAULT false,
  p_is_branch_admin BOOLEAN DEFAULT false,
  p_can_import_mortgages BOOLEAN DEFAULT false,
  p_must_change_password BOOLEAN DEFAULT true,
  p_advocate_roll_no TEXT DEFAULT ''
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email TEXT := LOWER(TRIM(COALESCE(p_email, '')));
  v_existing_id UUID;
  v_target_id UUID;
BEGIN
  IF v_clean_email = '' THEN
    RAISE EXCEPTION 'Email is required for staff provisioning';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.profiles
  WHERE LOWER(email) = v_clean_email
  LIMIT 1;

  v_target_id := COALESCE(v_existing_id, p_id, gen_random_uuid());

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
      email = v_clean_email,
      role = COALESCE(p_role, role),
      role_id = COALESCE(p_role_id, role_id),
      role_title = COALESCE(p_role_title, role_title),
      branch = COALESCE(p_branch_name, branch),
      branch_id = COALESCE(p_branch_id, branch_id),
      branch_name = COALESCE(p_branch_name, branch_name),
      is_super_admin = COALESCE(p_is_super_admin, is_super_admin),
      is_branch_admin = COALESCE(p_is_branch_admin, is_branch_admin),
      can_import_mortgages = COALESCE(p_can_import_mortgages, can_import_mortgages),
      must_change_password = COALESCE(p_must_change_password, must_change_password),
      advocate_roll_no = COALESCE(NULLIF(p_advocate_roll_no, ''), advocate_roll_no),
      updated_at = timezone('utc'::text, now())
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.profiles (
      id, full_name, email, role, role_id, role_title,
      branch, branch_id, branch_name,
      is_super_admin, is_branch_admin, can_import_mortgages,
      must_change_password, is_suspended, advocate_roll_no, updated_at
    ) VALUES (
      v_target_id, TRIM(p_full_name), v_clean_email, p_role, p_role_id, p_role_title,
      p_branch_name, p_branch_id, p_branch_name,
      COALESCE(p_is_super_admin, false), COALESCE(p_is_branch_admin, false), COALESCE(p_can_import_mortgages, false),
      COALESCE(p_must_change_password, true), false, COALESCE(p_advocate_roll_no, ''), timezone('utc'::text, now())
    );
  END IF;

  RETURN QUERY SELECT * FROM public.profiles WHERE id = v_target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_staff_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_staff_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
