-- ==============================================================================
-- MORTGAGES & SECURITIES REGISTER TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.mortgages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_bank_name TEXT NOT NULL,
  record_year INTEGER DEFAULT 2026,
  file_number TEXT,
  borrower_name TEXT NOT NULL,
  loan_amount NUMERIC(18,2) DEFAULT 0,
  title_deed_no TEXT,
  property_location TEXT,
  branch_id TEXT,
  branch_name TEXT,
  status TEXT DEFAULT 'Under Preparation',
  date_instructed DATE DEFAULT CURRENT_DATE,
  
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

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_mortgages_bank_year ON public.mortgages(client_bank_name, record_year);
CREATE INDEX IF NOT EXISTS idx_mortgages_status ON public.mortgages(status);
CREATE INDEX IF NOT EXISTS idx_mortgages_borrower ON public.mortgages(borrower_name);

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
