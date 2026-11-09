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
