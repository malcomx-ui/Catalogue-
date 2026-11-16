-- ==============================================================================
-- Migration: Explicit Mortgage Import Access (phionaadoch@mkadvocates.ug)
--            & Multi-Bank Expansion Columns (I&M Bank, Bank of Baroda, KCB)
-- ==============================================================================

-- 1. Grant explicit mortgage import permission to phionaadoch@mkadvocates.ug
UPDATE public.profiles
SET can_import_mortgages = true
WHERE LOWER(COALESCE(email, '')) = 'phionaadoch@mkadvocates.ug';

CREATE OR REPLACE FUNCTION public.can_import_mortgages()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_email TEXT;
  jwt_meta JSONB;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  jwt_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  IF jwt_email IN ('infosightug@gmail.com', 'phionaadoch@mkadvocates.ug') THEN
    RETURN TRUE;
  END IF;

  jwt_meta := COALESCE(auth.jwt() -> 'user_metadata', '{}'::jsonb);
  IF COALESCE((jwt_meta ->> 'is_super_admin')::boolean, false) IS TRUE
     OR LOWER(COALESCE(jwt_meta ->> 'role_id', '')) = 'role-super-admin'
     OR LOWER(COALESCE(jwt_meta ->> 'role', '')) IN ('super_admin', 'superadmin', 'partner', 'managing_partner', 'system_admin')
     OR COALESCE((jwt_meta ->> 'can_import_mortgages')::boolean, false) IS TRUE THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p.id = auth.uid() OR (jwt_email <> '' AND LOWER(COALESCE(p.email, '')) = jwt_email))
      AND (
        p.is_super_admin IS TRUE
        OR LOWER(COALESCE(p.role_id, '')) = 'role-super-admin'
        OR LOWER(COALESCE(p.role, '')) IN ('super_admin', 'superadmin', 'partner', 'managing_partner', 'system_admin')
        OR LOWER(COALESCE(p.email, '')) = 'phionaadoch@mkadvocates.ug'
        OR p.can_import_mortgages IS TRUE
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_import_mortgages() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_import_mortgages() TO authenticated, service_role;

-- 2. Extend public.mortgage_cases with multi-bank structured columns
ALTER TABLE IF EXISTS public.mortgage_cases
  ADD COLUMN IF NOT EXISTS bank_specific_data JSONB DEFAULT '{}'::jsonb,
  -- I&M Bank fields
  ADD COLUMN IF NOT EXISTS customer_cif TEXT,
  ADD COLUMN IF NOT EXISTS facility_reference TEXT,
  ADD COLUMN IF NOT EXISTS relationship_manager TEXT,
  ADD COLUMN IF NOT EXISTS security_type TEXT,
  ADD COLUMN IF NOT EXISTS title_type TEXT,
  ADD COLUMN IF NOT EXISTS forced_sale_value NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS search_fee NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valuation_fee NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_instructed DATE,
  ADD COLUMN IF NOT EXISTS date_sent_registration DATE,
  ADD COLUMN IF NOT EXISTS date_registered DATE,
  -- Bank of Baroda fields
  ADD COLUMN IF NOT EXISTS baroda_account_no TEXT,
  ADD COLUMN IF NOT EXISTS scheme_code TEXT,
  ADD COLUMN IF NOT EXISTS sanction_letter_ref TEXT,
  ADD COLUMN IF NOT EXISTS sanction_date DATE,
  ADD COLUMN IF NOT EXISTS security_nature TEXT,
  ADD COLUMN IF NOT EXISTS ura_prn TEXT,
  ADD COLUMN IF NOT EXISTS title_custody_status TEXT,
  ADD COLUMN IF NOT EXISTS baroda_branch_code TEXT,
  -- KCB fields
  ADD COLUMN IF NOT EXISTS kcb_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS panel_instruction_no TEXT,
  ADD COLUMN IF NOT EXISTS facility_type TEXT,
  ADD COLUMN IF NOT EXISTS perfection_stage TEXT,
  ADD COLUMN IF NOT EXISTS instrument_number TEXT,
  ADD COLUMN IF NOT EXISTS sla_target_date DATE,
  ADD COLUMN IF NOT EXISTS turnaround_days INTEGER,
  ADD COLUMN IF NOT EXISTS courier_fee NUMERIC(18,2) DEFAULT 0;

-- 3. Extend public.mortgages with matching multi-bank structured columns
ALTER TABLE IF EXISTS public.mortgages
  ADD COLUMN IF NOT EXISTS bank_specific_data JSONB DEFAULT '{}'::jsonb,
  -- I&M Bank fields
  ADD COLUMN IF NOT EXISTS customer_cif TEXT,
  ADD COLUMN IF NOT EXISTS facility_reference TEXT,
  ADD COLUMN IF NOT EXISTS relationship_manager TEXT,
  ADD COLUMN IF NOT EXISTS security_type TEXT,
  ADD COLUMN IF NOT EXISTS title_type TEXT,
  ADD COLUMN IF NOT EXISTS forced_sale_value NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS search_fee NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valuation_fee NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_instructed DATE,
  ADD COLUMN IF NOT EXISTS date_sent_registration DATE,
  ADD COLUMN IF NOT EXISTS date_registered DATE,
  -- Bank of Baroda fields
  ADD COLUMN IF NOT EXISTS baroda_account_no TEXT,
  ADD COLUMN IF NOT EXISTS scheme_code TEXT,
  ADD COLUMN IF NOT EXISTS sanction_letter_ref TEXT,
  ADD COLUMN IF NOT EXISTS sanction_date DATE,
  ADD COLUMN IF NOT EXISTS security_nature TEXT,
  ADD COLUMN IF NOT EXISTS ura_prn TEXT,
  ADD COLUMN IF NOT EXISTS title_custody_status TEXT,
  ADD COLUMN IF NOT EXISTS baroda_branch_code TEXT,
  -- KCB fields
  ADD COLUMN IF NOT EXISTS kcb_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS panel_instruction_no TEXT,
  ADD COLUMN IF NOT EXISTS facility_type TEXT,
  ADD COLUMN IF NOT EXISTS perfection_stage TEXT,
  ADD COLUMN IF NOT EXISTS instrument_number TEXT,
  ADD COLUMN IF NOT EXISTS sla_target_date DATE,
  ADD COLUMN IF NOT EXISTS turnaround_days INTEGER,
  ADD COLUMN IF NOT EXISTS courier_fee NUMERIC(18,2) DEFAULT 0;

NOTIFY pgrst, 'reload schema';
