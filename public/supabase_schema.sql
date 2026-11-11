-- ==============================================================================
-- MUHUMUZA-KIIZA ADVOCATES & LEGAL CONSULTANTS (MK ADVOCATES)
-- Complete Supabase PostgreSQL Schema & Initial Seed
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. BRANCHES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    is_headquarters BOOLEAN DEFAULT false,
    team_lead TEXT DEFAULT '',
    office_admin TEXT DEFAULT '',
    clerk TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    case_count INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'synced',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. FIRM USERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.firm_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'lawyer',
    role_title TEXT NOT NULL DEFAULT 'Advocate',
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    branch_name TEXT DEFAULT '',
    is_super_admin BOOLEAN DEFAULT false,
    is_branch_admin BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    advocate_roll_no TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2b. PROFILES TABLE (Supabase Auth mirror with role and branch persistence)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'lawyer',
    role_id TEXT NOT NULL DEFAULT 'role-advocate',
    role_title TEXT NOT NULL DEFAULT 'Litigation Lawyer / Associate',
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    branch_name TEXT DEFAULT 'Kampala Central (Head Office)',
    branch TEXT DEFAULT 'Kampala Central (Head Office)',
    is_super_admin BOOLEAN DEFAULT false,
    is_branch_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ------------------------------------------------------------------------------
-- 3. LITIGATION CASES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cases (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    case_number TEXT NOT NULL,
    suit_number TEXT NOT NULL,
    suit_no TEXT DEFAULT '',
    firm_ref_number TEXT DEFAULT '',
    title TEXT NOT NULL,
    client_name TEXT NOT NULL,
    court TEXT NOT NULL,
    division TEXT NOT NULL,
    presiding_judge TEXT DEFAULT '',
    court_station TEXT DEFAULT '',
    stage TEXT DEFAULT 'Trial (Plaintiff Stage)',
    priority TEXT DEFAULT 'Standard',
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    branch_name TEXT DEFAULT '',
    lead_advocate TEXT DEFAULT '',
    assisting_advocates TEXT[] DEFAULT '{}',
    parties JSONB DEFAULT '[]'::jsonb,
    opposing_firm TEXT DEFAULT '',
    opposing_counsel TEXT DEFAULT '',
    claim_value_ugx NUMERIC DEFAULT 0,
    filing_date DATE DEFAULT CURRENT_DATE,
    hearing_date DATE,
    next_hearing_date DATE,
    next_hearing_purpose TEXT DEFAULT '',
    status TEXT DEFAULT 'Active',
    year_of_closure INTEGER,
    case_type TEXT DEFAULT '',
    billing_status TEXT DEFAULT '',
    payment_status TEXT DEFAULT '',
    brief_summary TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    file_location TEXT DEFAULT 'Central Registry Safe',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_cases_status CHECK (status IN ('Active', 'Mention', 'Pending Ruling / Judgment', 'Pending Ruling', 'Pending', 'Instructions', 'Adjourned', 'At Execution', 'Closed', 'Archived', 'Dormant', 'Stayed', 'Inactive'))
);

CREATE INDEX IF NOT EXISTS idx_cases_suit_no ON public.cases(suit_no);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(status);

-- ------------------------------------------------------------------------------
-- 4. COURT HEARINGS / CAUSE LIST TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.court_hearings (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    suit_number TEXT NOT NULL,
    case_title TEXT NOT NULL,
    hearing_date DATE NOT NULL,
    hearing_time TEXT DEFAULT '09:30 AM',
    court_name TEXT NOT NULL,
    division TEXT NOT NULL,
    court_room TEXT DEFAULT '',
    presiding_judge TEXT DEFAULT '',
    hearing_purpose TEXT DEFAULT 'Mention / Hearing',
    lead_counsel TEXT DEFAULT '',
    assigned_advocates TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'Scheduled',
    court_notes TEXT DEFAULT '',
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. PLEADING DOCUMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pleading_documents (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    suit_number TEXT NOT NULL,
    title TEXT NOT NULL,
    document_type TEXT NOT NULL,
    file_format TEXT NOT NULL DEFAULT 'pdf',
    file_size TEXT DEFAULT '1.2 MB',
    filing_date DATE DEFAULT CURRENT_DATE,
    filed_by TEXT DEFAULT '',
    court_registry_stamp BOOLEAN DEFAULT true,
    download_url TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 6. SYSTEM SETTINGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'current_settings',
    firm_name TEXT DEFAULT 'Muhumuza-Kiiza Advocates & Legal Consultants',
    features JSONB DEFAULT '{}'::jsonb,
    entry_fields JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pleading_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow read & write access for application operations
CREATE POLICY "Allow public read on branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Allow public write on branches" ON public.branches FOR ALL USING (true);

CREATE POLICY "Allow public read on firm_users" ON public.firm_users FOR SELECT USING (true);
CREATE POLICY "Allow public write on firm_users" ON public.firm_users FOR ALL USING (true);

CREATE POLICY "Allow public read on cases" ON public.cases FOR SELECT USING (true);
CREATE POLICY "Allow public write on cases" ON public.cases FOR ALL USING (true);

CREATE POLICY "Allow public read on court_hearings" ON public.court_hearings FOR SELECT USING (true);
CREATE POLICY "Allow public write on court_hearings" ON public.court_hearings FOR ALL USING (true);

CREATE POLICY "Allow public read on pleading_documents" ON public.pleading_documents FOR SELECT USING (true);
CREATE POLICY "Allow public write on pleading_documents" ON public.pleading_documents FOR ALL USING (true);

CREATE POLICY "Allow public read on system_settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Allow public write on system_settings" ON public.system_settings FOR ALL USING (true);

-- ------------------------------------------------------------------------------
-- 8. INITIAL SEED DATA: REGIONAL BRANCHES
-- ------------------------------------------------------------------------------
INSERT INTO public.branches (id, name, city, address, is_headquarters, team_lead, phone, case_count) VALUES
('ftp-reg', 'Fort Portal Office', 'Fort Portal', 'Plot 12 Lugard Road, Rwenzori Commercial Chambers', false, 'Adv. Sarah Namatovu', '+256 483 422 150', 30),
('glu-reg', 'Gulu Office', 'Gulu', 'Plot 18 Awere Road, Northern Circuit Towers', false, '', '+256 471 432 890', 0),
('jnj-reg', 'Jinja Office', 'Jinja', 'Plot 32 Main Street, Nile Crescent Building', false, '', '+256 434 120 750', 0),
('kla-hq', 'Kampala Office', 'Kampala', 'Millennium Plaza, 2nd Floor, Plot 69 Spring Road, Bugolobi', true, 'Managing Partner', '+256 414 250 890', 0),
('msk-reg', 'Masaka Office', 'Masaka', 'Plot 24 Elgin Road, Greater Masaka Arcade', false, '', '+256 481 421 990', 0),
('msn-reg', 'Masindi Office', 'Masindi', 'Plot 8 Commercial Street, Bunyoro Commercial Chambers', false, '', '+256 465 420 180', 0),
('mbr-reg', 'Mbarara Office', 'Mbarara', 'Plot 4 High Street, Ankole Kingdom Plaza', false, '', '+256 485 420 310', 0)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 9. INITIAL SEED DATA: FIRM USERS
-- ------------------------------------------------------------------------------
INSERT INTO public.firm_users (id, name, email, role, role_title, branch_id, branch_name, is_super_admin, is_branch_admin, advocate_roll_no) VALUES
('user-admin', 'Firm Administrator', 'infosightug@gmail.com', 'partner', 'Sole Managing Partner & Super Admin', 'kla-hq', 'Kampala Office', true, true, 'MK/ADV/001'),
('user-advocate-ftp', 'Adv. Sarah Namatovu', 'sarah.namatovu@mkadvocates.ug', 'lawyer', 'Regional Trial Advocate', 'ftp-reg', 'Fort Portal Office', false, false, 'MK/ADV/022')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 10. AUTOMATIC BRANCH ASSIGNMENT ON NEW CASE CREATION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_case_branch()
RETURNS TRIGGER AS $$
DECLARE
  user_branch TEXT;
  user_role TEXT;
BEGIN
  -- Fetch the current user's role and branch_id from their profile
  SELECT role, branch_id INTO user_role, user_branch
  FROM public.profiles
  WHERE id = auth.uid();

  -- Allow global partners and super admins to assign any branch they choose
  IF user_role IN ('partner', 'super_admin') THEN
    RETURN NEW;
  END IF;

  -- Automatically lock regular staff members to their own assigned branch
  IF user_branch IS NOT NULL THEN
    NEW.branch_id := user_branch;
  ELSE
    RAISE EXCEPTION 'Access Denied: Your user profile does not have an assigned branch.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists to prevent duplicate execution
DROP TRIGGER IF EXISTS tr_set_case_branch ON public.cases;

-- Create trigger to execute before any insert on cases table
CREATE TRIGGER tr_set_case_branch
  BEFORE INSERT ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_case_branch();

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------------------------
-- 11. CASE AUDIT TRAIL LOGGING (INSERT, UPDATE, DELETE)
-- ------------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_case_audit_logs_case_id ON public.case_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_case_audit_logs_case_number ON public.case_audit_logs(case_number);
CREATE INDEX IF NOT EXISTS idx_case_audit_logs_action ON public.case_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_case_audit_logs_timestamp ON public.case_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_case_audit_logs_user_id ON public.case_audit_logs(user_id);

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
    WHERE id = current_user_id;
  END IF;

  IF (TG_OP = 'INSERT') THEN
    target_case_id := NEW.id;
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
    target_case_id := NEW.id;
    target_case_number := COALESCE(NEW.case_number, NEW.suit_number, NEW.suit_no, '');

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
    target_case_id := OLD.id;
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

DROP TRIGGER IF EXISTS tr_case_audit_logs ON public.cases;
CREATE TRIGGER tr_case_audit_logs
  AFTER INSERT OR UPDATE OR DELETE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.log_case_audit();

ALTER TABLE public.case_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read on case_audit_logs" ON public.case_audit_logs;
CREATE POLICY "Allow authenticated read on case_audit_logs"
  ON public.case_audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow service role full on case_audit_logs" ON public.case_audit_logs;
CREATE POLICY "Allow service role full on case_audit_logs"
  ON public.case_audit_logs FOR ALL TO service_role USING (true);

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------------------------
-- 12. MORTGAGES & SECURITIES REGISTER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mortgages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_bank_name TEXT NOT NULL,
  record_year INTEGER DEFAULT 2026,
  month_sheet TEXT,
  bank_branch TEXT,
  file_number TEXT,
  rim_no TEXT,
  borrower_name TEXT NOT NULL,
  mortgagor_name TEXT,
  loan_amount NUMERIC(18,2) DEFAULT 0,
  title_deed_no TEXT,
  property_description TEXT,
  property_location TEXT,
  
  -- Branch, Department & Lawyer Assignment
  branch_id TEXT,
  branch_name TEXT,
  department TEXT DEFAULT 'Banking & Securities',
  assigned_lawyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_lawyer_name TEXT,
  
  -- Status & Dates
  status TEXT DEFAULT 'Under Preparation',
  date_instructed DATE DEFAULT CURRENT_DATE,
  date_sent_registration DATE,
  date_registered DATE,
  
  -- Financial & Fee Auto-Calculated Ledger
  legal_fees NUMERIC(18,2) DEFAULT 0,
  search_fee NUMERIC(18,2) DEFAULT 0,
  stamp_duty NUMERIC(18,2) DEFAULT 0,
  registration_fee NUMERIC(18,2) DEFAULT 0,
  filing_fee NUMERIC(18,2) DEFAULT 0,
  valuation_fee NUMERIC(18,2) DEFAULT 0,
  courier_fee NUMERIC(18,2) DEFAULT 0,
  other_disbursements NUMERIC(18,2) DEFAULT 0,
  total_disbursements NUMERIC(18,2) DEFAULT 0,
  vat NUMERIC(18,2) DEFAULT 0,
  grand_total NUMERIC(18,2) DEFAULT 0,

  comments TEXT,
  notes TEXT,
  transfer_reason TEXT,
  transfer_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.mortgages ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Banking & Securities';
ALTER TABLE public.mortgages ADD COLUMN IF NOT EXISTS assigned_lawyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.mortgages ADD COLUMN IF NOT EXISTS assigned_lawyer_name TEXT;
ALTER TABLE public.mortgages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Under Preparation';
ALTER TABLE public.mortgages ADD COLUMN IF NOT EXISTS month_sheet TEXT;
ALTER TABLE public.mortgages ADD COLUMN IF NOT EXISTS bank_branch TEXT;
ALTER TABLE public.mortgages ADD COLUMN IF NOT EXISTS rim_no TEXT;
ALTER TABLE public.mortgages ADD COLUMN IF NOT EXISTS property_description TEXT;
ALTER TABLE public.mortgages ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE public.mortgages ADD COLUMN IF NOT EXISTS transfer_reason TEXT;
ALTER TABLE public.mortgages ADD COLUMN IF NOT EXISTS transfer_history JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_mortgages_bank_year ON public.mortgages(client_bank_name, record_year);
CREATE INDEX IF NOT EXISTS idx_mortgages_status ON public.mortgages(status);
CREATE INDEX IF NOT EXISTS idx_mortgages_borrower ON public.mortgages(borrower_name);
CREATE INDEX IF NOT EXISTS idx_mortgages_branch ON public.mortgages(branch_id);
CREATE INDEX IF NOT EXISTS idx_mortgages_lawyer ON public.mortgages(assigned_lawyer_id);

ALTER TABLE public.mortgages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read on mortgages" ON public.mortgages;
CREATE POLICY "Allow authenticated read on mortgages"
  ON public.mortgages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated write on mortgages" ON public.mortgages;
CREATE POLICY "Allow authenticated write on mortgages"
  ON public.mortgages FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public write on mortgages" ON public.mortgages;
CREATE POLICY "Allow public write on mortgages"
  ON public.mortgages FOR ALL USING (true);

NOTIFY pgrst, 'reload schema';




