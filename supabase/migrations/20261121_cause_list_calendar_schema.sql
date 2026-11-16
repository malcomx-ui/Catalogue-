-- ==============================================================================
-- Migration: Cause List & Court Diary Schedule Columns & Dashboard Notifications
-- Adds optional reminder_at, view_category, and color_tag columns on public.cases
-- and creates public.dashboard_notifications for Smart Alerts in CauseListCalendar.
-- Safe and idempotent to run multiple times.
-- ==============================================================================

-- 1. Extend public.cases with schedule reminder metadata
ALTER TABLE IF EXISTS public.cases
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS view_category TEXT,
  ADD COLUMN IF NOT EXISTS color_tag TEXT;

CREATE INDEX IF NOT EXISTS idx_cases_reminder_at
  ON public.cases (reminder_at)
  WHERE reminder_at IS NOT NULL;

-- 2. Create public.dashboard_notifications table
CREATE TABLE IF NOT EXISTS public.dashboard_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'Court Appearances & Hearings',
  color_tag TEXT DEFAULT '#ef4444',
  case_id TEXT,
  branch_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_notifications_created_at
  ON public.dashboard_notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_notifications_branch_id
  ON public.dashboard_notifications (branch_id);

-- 3. Enable RLS with branch-aware and Super Admin policies
ALTER TABLE public.dashboard_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_notifications_select_policy" ON public.dashboard_notifications;
CREATE POLICY "dashboard_notifications_select_policy"
  ON public.dashboard_notifications
  FOR SELECT
  TO authenticated, anon
  USING (
    auth.role() = 'service_role'
    OR (
      auth.uid() IS NOT NULL AND (
        public.is_partner_or_superadmin()
        OR branch_id IS NULL
        OR TRIM(branch_id) = ''
        OR branch_id = public.get_auth_user_branch_id()
      )
    )
    OR (auth.uid() IS NULL AND branch_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "dashboard_notifications_insert_policy" ON public.dashboard_notifications;
CREATE POLICY "dashboard_notifications_insert_policy"
  ON public.dashboard_notifications
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "dashboard_notifications_update_policy" ON public.dashboard_notifications;
CREATE POLICY "dashboard_notifications_update_policy"
  ON public.dashboard_notifications
  FOR UPDATE
  TO authenticated, anon
  USING (
    auth.role() = 'service_role'
    OR (
      auth.uid() IS NOT NULL AND (
        public.is_partner_or_superadmin()
        OR branch_id IS NULL
        OR branch_id = public.get_auth_user_branch_id()
      )
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.uid() IS NOT NULL
  );

NOTIFY pgrst, 'reload schema';
