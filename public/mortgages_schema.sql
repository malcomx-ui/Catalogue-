-- ==============================================================================
-- MORTGAGES & SECURITIES REGISTER TABLE
-- ==============================================================================
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

-- Idempotent column additions for existing tables
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

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_mortgages_bank_year ON public.mortgages(client_bank_name, record_year);
CREATE INDEX IF NOT EXISTS idx_mortgages_status ON public.mortgages(status);
CREATE INDEX IF NOT EXISTS idx_mortgages_borrower ON public.mortgages(borrower_name);
CREATE INDEX IF NOT EXISTS idx_mortgages_branch ON public.mortgages(branch_id);
CREATE INDEX IF NOT EXISTS idx_mortgages_lawyer ON public.mortgages(assigned_lawyer_id);

-- RLS Policies
ALTER TABLE public.mortgages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read on mortgages" ON public.mortgages;
CREATE POLICY "Allow authenticated read on mortgages"
  ON public.mortgages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated write on mortgages" ON public.mortgages;
CREATE POLICY "Allow authenticated write on mortgages"
  ON public.mortgages FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public write on mortgages" ON public.mortgages;
CREATE POLICY "Allow public write on mortgages"
  ON public.mortgages FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- CENTENARY BANK MORTGAGE CASES IMPORT TABLE
-- Matches bulk import script schema for 20260108-EXCEL CENT (1).xlsx
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.centenary_mortgage_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch TEXT,
  client_name TEXT NOT NULL,
  rim_no TEXT,
  property_description TEXT,
  loan_amount NUMERIC(18,2) DEFAULT 0,
  grand_total NUMERIC(18,2) DEFAULT 0,
  comments TEXT,
  source_sheet TEXT,
  record_year INTEGER DEFAULT 2026,
  status TEXT DEFAULT 'Pending Review',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_centenary_mortgages_branch ON public.centenary_mortgage_cases(branch);
CREATE INDEX IF NOT EXISTS idx_centenary_mortgages_client ON public.centenary_mortgage_cases(client_name);
CREATE INDEX IF NOT EXISTS idx_centenary_mortgages_rim ON public.centenary_mortgage_cases(rim_no);
CREATE INDEX IF NOT EXISTS idx_centenary_mortgages_sheet ON public.centenary_mortgage_cases(source_sheet);

-- RLS Policies
ALTER TABLE public.centenary_mortgage_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read on centenary_mortgage_cases" ON public.centenary_mortgage_cases;
CREATE POLICY "Allow authenticated read on centenary_mortgage_cases"
  ON public.centenary_mortgage_cases FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin and Finance insert policy" ON public.centenary_mortgage_cases;
DROP POLICY IF EXISTS "Allow authenticated write on centenary_mortgage_cases" ON public.centenary_mortgage_cases;
CREATE POLICY "Allow authenticated write on centenary_mortgage_cases"
  ON public.centenary_mortgage_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public write on centenary_mortgage_cases" ON public.centenary_mortgage_cases;
CREATE POLICY "Allow public write on centenary_mortgage_cases"
  ON public.centenary_mortgage_cases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update on centenary_mortgage_cases" ON public.centenary_mortgage_cases;
CREATE POLICY "Allow authenticated update on centenary_mortgage_cases"
  ON public.centenary_mortgage_cases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role on centenary_mortgage_cases" ON public.centenary_mortgage_cases;
CREATE POLICY "Allow service role on centenary_mortgage_cases"
  ON public.centenary_mortgage_cases FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==============================================================================
-- UNIVERSAL MORTGAGE CASES IMPORT TABLE (mortgage_cases)
-- Matches bulk import script schema for mortgage_cases table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.mortgage_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL DEFAULT 'Centenary Bank',
  client_bank_name TEXT DEFAULT 'Centenary Bank',
  date_of_receipt DATE DEFAULT CURRENT_DATE,
  branch TEXT,
  client_name TEXT NOT NULL,
  mortgagor_name TEXT,
  name TEXT,
  rim_no TEXT,
  property_description TEXT,
  description TEXT,
  loan_amount NUMERIC(18,2) DEFAULT 0,
  stamp_duty NUMERIC(18,2) DEFAULT 0,
  extra_copies NUMERIC(18,2) DEFAULT 0,
  registration_fee NUMERIC(18,2) DEFAULT 0,
  registration NUMERIC(18,2) DEFAULT 0,
  other_fees NUMERIC(18,2) DEFAULT 0,
  other NUMERIC(18,2) DEFAULT 0,
  bank_charges NUMERIC(18,2) DEFAULT 0,
  transport NUMERIC(18,2) DEFAULT 0,
  total_disbursements NUMERIC(18,2) DEFAULT 0,
  legal_fees NUMERIC(18,2) DEFAULT 0,
  vat_18 NUMERIC(18,2) DEFAULT 0,
  grand_total NUMERIC(18,2) DEFAULT 0,
  date_of_payment DATE,
  date_of_return DATE,
  comments TEXT DEFAULT '',
  linkage_fees NUMERIC(18,2) DEFAULT 0,
  other_disbursements NUMERIC(18,2) DEFAULT 0,
  source_sheet TEXT,
  record_year INTEGER DEFAULT 2026,
  month_sheet TEXT,
  status TEXT DEFAULT 'Active / Processing',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Idempotent column additions for existing live table
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS client_bank_name TEXT DEFAULT 'Centenary Bank';
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS mortgagor_name TEXT;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS date_of_receipt DATE;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS stamp_duty NUMERIC(18,2) DEFAULT 0;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS extra_copies NUMERIC(18,2) DEFAULT 0;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS registration_fee NUMERIC(18,2) DEFAULT 0;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS registration NUMERIC(18,2) DEFAULT 0;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS other_fees NUMERIC(18,2) DEFAULT 0;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS other NUMERIC(18,2) DEFAULT 0;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS total_disbursements NUMERIC(18,2) DEFAULT 0;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS legal_fees NUMERIC(18,2) DEFAULT 0;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS vat_18 NUMERIC(18,2) DEFAULT 0;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS date_of_payment DATE;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS date_of_return DATE;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS other_disbursements NUMERIC(18,2) DEFAULT 0;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS record_year INTEGER DEFAULT 2026;
ALTER TABLE public.mortgage_cases ADD COLUMN IF NOT EXISTS month_sheet TEXT;

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_mortgage_cases_bank ON public.mortgage_cases(bank_name);
CREATE INDEX IF NOT EXISTS idx_mortgage_cases_branch ON public.mortgage_cases(branch);
CREATE INDEX IF NOT EXISTS idx_mortgage_cases_client ON public.mortgage_cases(client_name);
CREATE INDEX IF NOT EXISTS idx_mortgage_cases_rim ON public.mortgage_cases(rim_no);
CREATE INDEX IF NOT EXISTS idx_mortgage_cases_sheet ON public.mortgage_cases(source_sheet);
CREATE INDEX IF NOT EXISTS idx_mortgage_cases_year ON public.mortgage_cases(record_year);
CREATE INDEX IF NOT EXISTS idx_mortgage_cases_month ON public.mortgage_cases(month_sheet);

-- RLS Policies for mortgage_cases
ALTER TABLE public.mortgage_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read on mortgage_cases" ON public.mortgage_cases;
CREATE POLICY "Allow authenticated read on mortgage_cases"
  ON public.mortgage_cases FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin and Finance insert policy on mortgage_cases" ON public.mortgage_cases;
DROP POLICY IF EXISTS "Allow authenticated write on mortgage_cases" ON public.mortgage_cases;
CREATE POLICY "Allow authenticated write on mortgage_cases"
  ON public.mortgage_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role on mortgage_cases" ON public.mortgage_cases;
CREATE POLICY "Allow service role on mortgage_cases"
  ON public.mortgage_cases FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public write on mortgage_cases" ON public.mortgage_cases;
CREATE POLICY "Allow public write on mortgage_cases"
  ON public.mortgage_cases FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
