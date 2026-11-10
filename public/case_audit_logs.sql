-- ==============================================================================
-- MK CASE CATALOGUE: CASE AUDIT LOGS & TRIGGER
-- Tracks all INSERT, UPDATE, and DELETE changes made to the `cases` table,
-- capturing user ID, timestamp, old data, new data, and modified fields.
-- ==============================================================================

-- 1. Create the case_audit_logs table
CREATE TABLE IF NOT EXISTS public.case_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID,
  case_number TEXT,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  modified_fields JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_case_audit_logs_case_id ON public.case_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_case_audit_logs_case_number ON public.case_audit_logs(case_number);
CREATE INDEX IF NOT EXISTS idx_case_audit_logs_action ON public.case_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_case_audit_logs_timestamp ON public.case_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_case_audit_logs_user_id ON public.case_audit_logs(user_id);

-- 3. Audit trigger function
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
  -- Obtain authenticated user ID
  current_user_id := auth.uid();

  -- Lookup user email and role from profiles if available
  IF current_user_id IS NOT NULL THEN
    SELECT email, role INTO current_user_email, current_user_role
    FROM public.profiles
    WHERE id = current_user_id;
  END IF;

  -- Handle INSERT
  IF (TG_OP = 'INSERT') THEN
    target_case_id := NEW.id;
    target_case_number := COALESCE(NEW.case_number, NEW.suit_number, NEW.suit_no, '');

    INSERT INTO public.case_audit_logs (
      case_id,
      case_number,
      action,
      user_id,
      user_email,
      user_role,
      timestamp,
      old_data,
      new_data,
      modified_fields
    ) VALUES (
      target_case_id,
      target_case_number,
      'INSERT',
      current_user_id,
      current_user_email,
      current_user_role,
      timezone('utc'::text, now()),
      NULL,
      to_jsonb(NEW),
      to_jsonb(NEW)
    );

    RETURN NEW;

  -- Handle UPDATE
  ELSIF (TG_OP = 'UPDATE') THEN
    target_case_id := NEW.id;
    target_case_number := COALESCE(NEW.case_number, NEW.suit_number, NEW.suit_no, '');

    -- Compute field-by-field diff between OLD and NEW
    SELECT jsonb_object_agg(
      new_entry.key,
      jsonb_build_object(
        'old', old_entry.value,
        'new', new_entry.value
      )
    )
    INTO diff_json
    FROM jsonb_each(to_jsonb(NEW)) AS new_entry
    JOIN jsonb_each(to_jsonb(OLD)) AS old_entry ON new_entry.key = old_entry.key
    WHERE new_entry.value IS DISTINCT FROM old_entry.value
      AND new_entry.key NOT IN ('updated_at');

    -- Record the audit entry
    INSERT INTO public.case_audit_logs (
      case_id,
      case_number,
      action,
      user_id,
      user_email,
      user_role,
      timestamp,
      old_data,
      new_data,
      modified_fields
    ) VALUES (
      target_case_id,
      target_case_number,
      'UPDATE',
      current_user_id,
      current_user_email,
      current_user_role,
      timezone('utc'::text, now()),
      to_jsonb(OLD),
      to_jsonb(NEW),
      COALESCE(diff_json, '{}'::jsonb)
    );

    RETURN NEW;

  -- Handle DELETE
  ELSIF (TG_OP = 'DELETE') THEN
    target_case_id := OLD.id;
    target_case_number := COALESCE(OLD.case_number, OLD.suit_number, OLD.suit_no, '');

    INSERT INTO public.case_audit_logs (
      case_id,
      case_number,
      action,
      user_id,
      user_email,
      user_role,
      timestamp,
      old_data,
      new_data,
      modified_fields
    ) VALUES (
      target_case_id,
      target_case_number,
      'DELETE',
      current_user_id,
      current_user_email,
      current_user_role,
      timezone('utc'::text, now()),
      to_jsonb(OLD),
      NULL,
      NULL
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Bind trigger to the cases table
DROP TRIGGER IF EXISTS tr_case_audit_logs ON public.cases;
CREATE TRIGGER tr_case_audit_logs
  AFTER INSERT OR UPDATE OR DELETE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.log_case_audit();

-- 5. Row Level Security (RLS)
ALTER TABLE public.case_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (partners, admins, lawyers) to read audit logs
DROP POLICY IF EXISTS "Allow authenticated read on case_audit_logs" ON public.case_audit_logs;
CREATE POLICY "Allow authenticated read on case_audit_logs"
  ON public.case_audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role full access
DROP POLICY IF EXISTS "Allow service role full on case_audit_logs" ON public.case_audit_logs;
CREATE POLICY "Allow service role full on case_audit_logs"
  ON public.case_audit_logs
  FOR ALL
  TO service_role
  USING (true);

-- Note: No UPDATE or DELETE policies are granted to authenticated users,
-- ensuring case_audit_logs remains an immutable legal audit trail.

-- 6. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
