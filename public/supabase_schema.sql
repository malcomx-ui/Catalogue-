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
    brief_summary TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    file_location TEXT DEFAULT 'Central Registry Safe',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
-- 10. INITIAL SEED DATA: FORT PORTAL MATTERS (30 CASES)
-- ------------------------------------------------------------------------------
INSERT INTO public.cases (id, case_number, suit_number, title, client_name, court, division, status, branch_id, branch_name, lead_advocate) VALUES
('ftp-case-001', 'MK-0017-2020', 'MK-0017-2020', 'BRIGHTH EMMANUEL VS CENTENARY BANK', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-002', 'MK-005-2020', 'MK-005-2020', 'CENTENARY BANK VS MASEREKA ABDUL', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-003', 'MK-006-2020', 'MK-006-2020', 'CENTENARY BANK VS TUGUME JOHN', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-004', 'MK-008-2020', 'MK-008-2020', 'CENTENARY BANK VS KABASINGUZI ALICE', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-005', 'MK-011-2020', 'MK-011-2020', 'CENTENARY BANK VS MUGISA PETER', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-006', 'MK-012-2020', 'MK-012-2020', 'CENTENARY BANK VS KYOMUHENDO GRACE', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-007', 'MK-014-2020', 'MK-014-2020', 'CENTENARY BANK VS BIRUNGI MOSES', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-008', 'MK-015-2020', 'MK-015-2020', 'CENTENARY BANK VS ASIIMWE PATRICK', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-009', 'MK-019-2020', 'MK-019-2020', 'CENTENARY BANK VS TWINOMUJUNI ENID', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-010', 'MK-021-2020', 'MK-021-2020', 'CENTENARY BANK VS BYAMUKAMA JOSEPH', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-011', 'MK-022-2020', 'MK-022-2020', 'CENTENARY BANK VS TUSIIME RICHARD', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-012', 'MK-025-2020', 'MK-025-2020', 'CENTENARY BANK VS MUGAMBWA FRED', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-013', 'MK-027-2020', 'MK-027-2020', 'CENTENARY BANK VS NYANGOMA ROSE', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-014', 'MK-029-2020', 'MK-029-2020', 'CENTENARY BANK VS KIIZA EMMANUEL', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-015', 'MK-031-2020', 'MK-031-2020', 'CENTENARY BANK VS AHEEBWA DAVID', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-016', 'MK-033-2020', 'MK-033-2020', 'CENTENARY BANK VS KAKURU FRANCIS', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-017', 'MK-035-2020', 'MK-035-2020', 'CENTENARY BANK VS TINDYEBWA STEPHEN', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-018', 'MK-036-2020', 'MK-036-2020', 'CENTENARY BANK VS KEMIGISA BEATRICE', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-019', 'MK-038-2020', 'MK-038-2020', 'CENTENARY BANK VS MBABAZI CHARLES', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-020', 'MK-040-2020', 'MK-040-2020', 'CENTENARY BANK VS ATUHEIRE JANET', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-021', 'MK-042-2020', 'MK-042-2020', 'CENTENARY BANK VS RWAKAIKARA PAUL', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-022', 'MK-044-2020', 'MK-044-2020', 'CENTENARY BANK VS BAZARABUSA SIMON', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Inactive', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-023', 'MK-045-2020', 'MK-045-2020', 'CENTENARY BANK VS KASAIJA RONALD', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Inactive', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-024', 'MK-001-2020', 'MK-001-2020', 'CENTENARY BANK VS TUMWESIGE EDWARD', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Closed', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-025', 'MK-002-2020', 'MK-002-2020', 'CENTENARY BANK VS KOMUNTALE MARY', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Closed', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-026', 'MK-003-2020', 'MK-003-2020', 'CENTENARY BANK VS BUSINGE ROBERT', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Closed', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-027', 'MK-004-2020', 'MK-004-2020', 'CENTENARY BANK VS MUHUMUZA GEOFFREY', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Closed', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-028', 'MK-007-2020', 'MK-007-2020', 'CENTENARY BANK VS KAHWA JULIUS', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Closed', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-029', 'MK-009-2020', 'MK-009-2020', 'CENTENARY BANK VS BAGUMA KENNETH', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Closed', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-030', 'MK-010-2020', 'MK-010-2020', 'CENTENARY BANK VS NYAKAANA DANIEL', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Closed', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  updated_at = timezone('utc'::text, now());
