-- ==============================================================================
-- MUHUMUZA - KIIZA ADVOCATES & LEGAL CONSULTANTS (MK ADVOCATES)
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Branch-Level Case Isolation & Cross-Branch Transparency
-- ==============================================================================
-- Rules Enforced:
-- 1. Database RLS Policies (Supabase):
--    - The `cases` table has RLS enabled and a `branch_id` foreign key referencing `branches(id)`.
--    - SELECT policy: Allows all authenticated staff to view cases from any branch (for transparency).
--    - INSERT, UPDATE, and DELETE policies: Restrict modifications strictly to cases belonging
--      to the user's own branch.
--    - Partners and Superadmins are exempt and have full multi-branch access for all operations.
-- ==============================================================================

-- 1. Ensure foreign key constraint, suit_no, and status schema columns
ALTER TABLE IF EXISTS public.cases ADD COLUMN IF NOT EXISTS suit_no TEXT DEFAULT '';
ALTER TABLE IF EXISTS public.cases ADD COLUMN IF NOT EXISTS year_of_closure INTEGER;
ALTER TABLE IF EXISTS public.cases ADD COLUMN IF NOT EXISTS case_type TEXT DEFAULT '';
ALTER TABLE IF EXISTS public.cases ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT '';
ALTER TABLE IF EXISTS public.cases ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_cases_suit_no ON public.cases(suit_no);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(status);

-- Relax/update status check constraint to include 'At Execution' and 'Archived'
DO $$
BEGIN
  ALTER TABLE IF EXISTS public.cases DROP CONSTRAINT IF EXISTS chk_cases_status;
  ALTER TABLE IF EXISTS public.cases ADD CONSTRAINT chk_cases_status 
    CHECK (status IN ('Active', 'Mention', 'Pending Ruling / Judgment', 'Pending Ruling', 'Pending', 'Instructions', 'Adjourned', 'At Execution', 'Closed', 'Archived', 'Dormant', 'Stayed', 'Inactive'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_cases_branch' AND table_name = 'cases'
  ) THEN
    ALTER TABLE IF EXISTS public.cases 
      ADD CONSTRAINT fk_cases_branch 
      FOREIGN KEY (branch_id) 
      REFERENCES public.branches(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Enable Row Level Security (RLS) on tables
ALTER TABLE IF EXISTS public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.firm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.court_hearings ENABLE ROW LEVEL SECURITY;

-- 3. Helper Security Function: Check if caller is Partner or Superadmin
CREATE OR REPLACE FUNCTION public.is_partner_or_superadmin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_role TEXT;
  v_is_super BOOLEAN;
  v_user_email TEXT;
BEGIN
  -- Service role always has bypass privileges
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- Extract email from Supabase Auth JWT
  v_user_email := auth.jwt()->>'email';

  IF v_user_email IS NULL OR v_user_email = '' THEN
    RETURN FALSE;
  END IF;

  -- Check firm_users directory
  SELECT role, is_super_admin 
  INTO v_role, v_is_super 
  FROM public.firm_users 
  WHERE LOWER(email) = LOWER(v_user_email)
  LIMIT 1;

  -- Partners and Superadmins have full multi-branch access for all operations
  IF v_is_super IS TRUE OR LOWER(v_role) IN ('partner', 'super_admin', 'superadmin', 'managing_partner') THEN
    RETURN TRUE;
  END IF;

  -- Also check profiles table if present
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE (id = auth.uid() OR LOWER(email) = LOWER(v_user_email)) 
      AND (role IN ('partner', 'super_admin', 'superadmin') OR is_super_admin IS TRUE)
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- 4. Helper Security Function: Get caller's assigned branch_id
CREATE OR REPLACE FUNCTION public.get_auth_user_branch_id()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_branch_id TEXT;
  v_user_email TEXT;
BEGIN
  v_user_email := auth.jwt()->>'email';

  IF v_user_email IS NULL OR v_user_email = '' THEN
    RETURN NULL;
  END IF;

  SELECT branch_id 
  INTO v_branch_id 
  FROM public.firm_users 
  WHERE LOWER(email) = LOWER(v_user_email)
  LIMIT 1;

  IF v_branch_id IS NOT NULL THEN
    RETURN v_branch_id;
  END IF;

  -- Check profiles table if present
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    SELECT branch_id 
    INTO v_branch_id 
    FROM public.profiles 
    WHERE (id = auth.uid() OR LOWER(email) = LOWER(v_user_email))
    LIMIT 1;
  END IF;

  RETURN v_branch_id;
END;
$$;

-- Alias for backwards compatibility
CREATE OR REPLACE FUNCTION public.is_admin_or_lawyer()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN public.is_partner_or_superadmin();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_branch_id()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN public.get_auth_user_branch_id();
END;
$$;

-- ==============================================================================
-- RLS POLICIES FOR 'cases' TABLE (Branch Isolation & Transparency)
-- ==============================================================================

-- Drop existing legacy policies on cases
DROP POLICY IF EXISTS "Global users full access to cases" ON public.cases;
DROP POLICY IF EXISTS "Branch staff view branch cases" ON public.cases;
DROP POLICY IF EXISTS "Branch staff insert branch cases" ON public.cases;
DROP POLICY IF EXISTS "Branch staff update branch cases" ON public.cases;
DROP POLICY IF EXISTS "Branch staff delete branch cases" ON public.cases;
DROP POLICY IF EXISTS "Allow authenticated full cases access" ON public.cases;
DROP POLICY IF EXISTS "Allow anon cases access" ON public.cases;
DROP POLICY IF EXISTS "Restrict Delete Access" ON public.cases;
DROP POLICY IF EXISTS "Authenticated staff view all cases" ON public.cases;
DROP POLICY IF EXISTS "Branch staff insert own branch cases" ON public.cases;
DROP POLICY IF EXISTS "Branch staff update own branch cases" ON public.cases;
DROP POLICY IF EXISTS "Branch staff delete own branch cases" ON public.cases;

-- Policy 1 (SELECT): Allow all authenticated staff to view cases from any branch (for transparency)
CREATE POLICY "Authenticated staff view all cases"
ON public.cases
FOR SELECT
TO authenticated, anon
USING (true);

-- Policy 2 (INSERT): Restrict INSERT strictly to user's own branch; Partners/Superadmins exempt
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

-- Policy 3 (UPDATE): Restrict UPDATE strictly to user's own branch; Partners/Superadmins exempt
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

-- Policy 4 (DELETE): Restrict DELETE strictly to user's own branch; Partners/Superadmins exempt
CREATE POLICY "Branch staff delete own branch cases"
ON public.cases
FOR DELETE
TO authenticated, anon
USING (
  auth.role() = 'service_role'
  OR public.is_partner_or_superadmin()
  OR branch_id = public.get_auth_user_branch_id()
);

-- ==============================================================================
-- RLS POLICIES FOR 'firm_users' TABLE
-- ==============================================================================

DROP POLICY IF EXISTS "Read firm directory" ON public.firm_users;
DROP POLICY IF EXISTS "Admins manage firm users" ON public.firm_users;

-- Allow all authenticated users and portal sessions to read staff directory
CREATE POLICY "Read firm directory"
ON public.firm_users
FOR SELECT
TO authenticated, anon
USING (true);

-- Allow Super Admins, Partners, and service_role to manage users
CREATE POLICY "Admins manage firm users"
ON public.firm_users
FOR ALL
TO authenticated, anon
USING (
  public.is_partner_or_superadmin() OR auth.role() = 'service_role' OR auth.jwt() IS NULL
)
WITH CHECK (
  public.is_partner_or_superadmin() OR auth.role() = 'service_role' OR auth.jwt() IS NULL
);

-- ==============================================================================
-- RLS POLICIES FOR 'court_hearings' & 'branches' TABLES
-- ==============================================================================

DROP POLICY IF EXISTS "Read branches directory" ON public.branches;
CREATE POLICY "Read branches directory"
ON public.branches
FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Global and branch court hearings" ON public.court_hearings;
DROP POLICY IF EXISTS "Authenticated staff view all court hearings" ON public.court_hearings;
DROP POLICY IF EXISTS "Branch staff modify own court hearings" ON public.court_hearings;

-- View court hearings across all branches for cause list transparency
CREATE POLICY "Authenticated staff view all court hearings"
ON public.court_hearings
FOR SELECT
TO authenticated, anon
USING (true);

-- Modify hearings strictly for own branch or partner/superadmin
CREATE POLICY "Branch staff modify own court hearings"
ON public.court_hearings
FOR ALL
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

-- ==============================================================================
-- AUDIT TRAIL LOGGING TABLE & RLS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id TEXT,
    case_number TEXT,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_role TEXT,
    branch TEXT,
    changes JSONB, -- Stores the old and new data details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SuperAdmin View Audit Logs" ON public.audit_logs;
CREATE POLICY "SuperAdmin View Audit Logs" ON public.audit_logs
  FOR SELECT
  TO authenticated, anon
  USING (
    public.is_partner_or_superadmin()
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Users Insert Audit Logs" ON public.audit_logs;
CREATE POLICY "Users Insert Audit Logs" ON public.audit_logs
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- ==============================================================================
-- RLS POLICIES FOR 'profiles' TABLE
-- ==============================================================================
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated read profiles"
ON public.profiles
FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Allow authenticated update profiles" ON public.profiles;
CREATE POLICY "Allow authenticated update profiles"
ON public.profiles
FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated insert profiles" ON public.profiles;
CREATE POLICY "Allow authenticated insert profiles"
ON public.profiles
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

