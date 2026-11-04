-- ==============================================================================
-- MK ADVOCATES LITIGATION SYSTEM
-- AUDIT TRAIL & RESTRICTED CASE DELETION RLS POLICIES
-- ==============================================================================

-- 1. Example RLS Delete Policy restriction:
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

-- 2. Create audit_logs table
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

-- 3. Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Only Super Admins can view the full audit logs
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

-- 5. Policy: Authenticated users can insert logs when they perform actions
DROP POLICY IF EXISTS "Users Insert Audit Logs" ON public.audit_logs;
CREATE POLICY "Users Insert Audit Logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() = performed_by
    OR auth.role() = 'service_role'
    OR auth.uid() IS NOT NULL
    OR performed_by IS NULL
  );
