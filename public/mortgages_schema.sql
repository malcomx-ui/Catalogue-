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
  ON public.mortgages FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public write on mortgages" ON public.mortgages;
CREATE POLICY "Allow public write on mortgages"
  ON public.mortgages FOR ALL USING (true);

NOTIFY pgrst, 'reload schema';
