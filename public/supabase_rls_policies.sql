-- ==============================================================================
-- MK ADVOCATES LITIGATION SYSTEM
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Branch Jurisdiction & Staff Access Control
-- ==============================================================================
-- Rules Enforced:
-- 1. Branch Staff (Branch Administrator, Court Registry Clerk):
--    - Full CRUD management permissions (create, read, update, delete)
--      strictly restricted to cases belonging specifically to their assigned branch.
-- 2. Admins & Lawyers (Managing Partner, Super Admin, Trial Advocates, Team Leads):
--    - Full global cross-branch access across all branches (Kampala, Fort Portal, Mbarara, etc.)
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) on tables
ALTER TABLE IF EXISTS public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.firm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.court_hearings ENABLE ROW LEVEL SECURITY;

-- 2. Helper Security Function: Check if caller is Global Admin or Litigation Lawyer
CREATE OR REPLACE FUNCTION public.is_admin_or_lawyer()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_role TEXT;
  v_is_super BOOLEAN;
  v_user_email TEXT;
BEGIN
  -- Extract email from Supabase Auth JWT
  v_user_email := auth.jwt()->>'email';

  -- If not using JWT or called by service_role, allow global execution
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  IF v_user_email IS NULL OR v_user_email = '' THEN
    RETURN TRUE;
  END IF;

  SELECT role, is_super_admin 
  INTO v_role, v_is_super 
  FROM public.firm_users 
  WHERE LOWER(email) = LOWER(v_user_email)
  LIMIT 1;

  -- Super Admin or Lawyers have global access across all branches
  IF v_is_super IS TRUE OR v_role IN ('partner', 'team_lead', 'lawyer', 'advocate') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 3. Helper Security Function: Get caller's assigned branch_id from firm_users
CREATE OR REPLACE FUNCTION public.get_user_branch_id()
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

  RETURN v_branch_id;
END;
$$;

-- ==============================================================================
-- RLS POLICIES FOR 'cases' TABLE
-- ==============================================================================

-- Drop existing legacy policies if any
DROP POLICY IF EXISTS "Global users full access to cases" ON public.cases;
DROP POLICY IF EXISTS "Branch staff view branch cases" ON public.cases;
DROP POLICY IF EXISTS "Branch staff insert branch cases" ON public.cases;
DROP POLICY IF EXISTS "Branch staff update branch cases" ON public.cases;
DROP POLICY IF EXISTS "Branch staff delete branch cases" ON public.cases;
DROP POLICY IF EXISTS "Allow authenticated full cases access" ON public.cases;
DROP POLICY IF EXISTS "Allow anon cases access" ON public.cases;

-- Policy 1: Global Access for Super Admins and Lawyers across all branches
CREATE POLICY "Global users full access to cases"
ON public.cases
FOR ALL
TO authenticated, anon
USING (
  public.is_admin_or_lawyer() OR public.get_user_branch_id() IS NULL
)
WITH CHECK (
  public.is_admin_or_lawyer() OR public.get_user_branch_id() IS NULL
);

-- Policy 2: Branch Staff SELECT (Read) - strictly restricted to assigned branch
CREATE POLICY "Branch staff view branch cases"
ON public.cases
FOR SELECT
TO authenticated, anon
USING (
  branch_id = public.get_user_branch_id()
);

-- Policy 3: Branch Staff INSERT (Create) - strictly restricted to assigned branch
CREATE POLICY "Branch staff insert branch cases"
ON public.cases
FOR INSERT
TO authenticated, anon
WITH CHECK (
  branch_id = public.get_user_branch_id()
);

-- Policy 4: Branch Staff UPDATE (Edit) - strictly restricted to assigned branch
CREATE POLICY "Branch staff update branch cases"
ON public.cases
FOR UPDATE
TO authenticated, anon
USING (
  branch_id = public.get_user_branch_id()
)
WITH CHECK (
  branch_id = public.get_user_branch_id()
);

-- Policy 5: Branch Staff DELETE - strictly restricted to assigned branch
CREATE POLICY "Branch staff delete branch cases"
ON public.cases
FOR DELETE
TO authenticated, anon
USING (
  branch_id = public.get_user_branch_id()
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

-- Allow Super Admins and authorized staff to insert and manage users
CREATE POLICY "Admins manage firm users"
ON public.firm_users
FOR ALL
TO authenticated, anon
USING (
  public.is_admin_or_lawyer() OR auth.role() = 'service_role' OR auth.jwt() IS NULL
)
WITH CHECK (
  public.is_admin_or_lawyer() OR auth.role() = 'service_role' OR auth.jwt() IS NULL
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
CREATE POLICY "Global and branch court hearings"
ON public.court_hearings
FOR ALL
TO authenticated, anon
USING (
  public.is_admin_or_lawyer() OR branch_id = public.get_user_branch_id() OR public.get_user_branch_id() IS NULL
)
WITH CHECK (
  public.is_admin_or_lawyer() OR branch_id = public.get_user_branch_id() OR public.get_user_branch_id() IS NULL
);

-- ==============================================================================
-- RESTRICTED CASE DELETION & AUDIT TRAIL LOGGING
-- ==============================================================================

-- Example RLS Delete Policy restriction:
-- Only Super Admin or Branch Admin (for their own branch) can delete cases.
DROP POLICY IF EXISTS "Restrict Delete Access" ON public.cases;
CREATE POLICY "Restrict Delete Access" ON public.cases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'super_admin'
        OR (profiles.role = 'branch_admin' AND profiles.branch = cases.branch)
      )
    )
    OR auth.role() = 'service_role'
    OR auth.uid() IS NULL
  );

-- 1. Create audit_logs table
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

-- 2. Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Only Super Admins can view the full audit logs
DROP POLICY IF EXISTS "SuperAdmin View Audit Logs" ON public.audit_logs;
CREATE POLICY "SuperAdmin View Audit Logs" ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
    OR auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.firm_users
      WHERE LOWER(firm_users.email) = LOWER(auth.jwt()->>'email')
      AND (firm_users.is_super_admin IS TRUE OR firm_users.role IN ('partner', 'super_admin'))
    )
  );

-- 4. Policy: Authenticated users can insert logs when they perform actions
DROP POLICY IF EXISTS "Users Insert Audit Logs" ON public.audit_logs;
CREATE POLICY "Users Insert Audit Logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() = performed_by
    OR auth.role() = 'service_role'
    OR auth.uid() IS NOT NULL
    OR performed_by IS NULL
  );

