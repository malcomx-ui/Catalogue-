-- ==============================================================================
-- Migration: Distinct Bank Branch Station & Firm Branch Station on Mortgages
-- ==============================================================================
-- Separates:
--   1) bank_branch_station : Lending bank's handling branch (e.g. Centenary Bank Kamwenge Branch)
--   2) firm_branch_station : MK Advocates office processing the file (e.g. Kampala Central (Head Office))
--   3) branch_id           : Canonical MK Advocates branch ID for RBAC & RLS scoping
-- ==============================================================================

-- 1. Add distinct branch columns to public.mortgage_cases and public.mortgages
ALTER TABLE IF EXISTS public.mortgage_cases ADD COLUMN IF NOT EXISTS bank_branch_station TEXT;
ALTER TABLE IF EXISTS public.mortgage_cases ADD COLUMN IF NOT EXISTS firm_branch_station TEXT;
ALTER TABLE IF EXISTS public.mortgage_cases ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE IF EXISTS public.mortgage_cases ADD COLUMN IF NOT EXISTS branch_name TEXT;

ALTER TABLE IF EXISTS public.mortgages ADD COLUMN IF NOT EXISTS bank_branch_station TEXT;
ALTER TABLE IF EXISTS public.mortgages ADD COLUMN IF NOT EXISTS firm_branch_station TEXT;
ALTER TABLE IF EXISTS public.mortgages ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE IF EXISTS public.mortgages ADD COLUMN IF NOT EXISTS branch_name TEXT;

CREATE INDEX IF NOT EXISTS idx_mortgage_cases_branch_id ON public.mortgage_cases(branch_id);
CREATE INDEX IF NOT EXISTS idx_mortgages_branch_id ON public.mortgages(branch_id);

-- 2. Backfill existing records cleanly without overwriting one branch with the other
DO $$
BEGIN
  IF to_regclass('public.mortgage_cases') IS NOT NULL THEN
    UPDATE public.mortgage_cases
    SET
      bank_branch_station = COALESCE(
        NULLIF(TRIM(bank_branch_station), ''),
        NULLIF(TRIM(client_branch_location), ''),
        NULLIF(TRIM(branch), '')
      ),
      firm_branch_station = COALESCE(
        NULLIF(TRIM(firm_branch_station), ''),
        NULLIF(TRIM(branch_name), ''),
        CASE LOWER(COALESCE(branch_id, ''))
          WHEN 'kla-hq' THEN 'Kampala Central (Head Office)'
          WHEN 'ftp-reg' THEN 'Fort Portal Regional Office'
          WHEN 'mbr-reg' THEN 'Mbarara Regional Office'
          WHEN 'msk-reg' THEN 'Masaka Regional Office'
          WHEN 'jnj-reg' THEN 'Jinja Regional Office'
          WHEN 'glu-reg' THEN 'Gulu Regional Office'
          WHEN 'msn-reg' THEN 'Masindi Regional Office'
          ELSE NULL
        END
      )
    WHERE bank_branch_station IS NULL
       OR firm_branch_station IS NULL;
  END IF;

  IF to_regclass('public.mortgages') IS NOT NULL THEN
    UPDATE public.mortgages
    SET
      firm_branch_station = COALESCE(
        NULLIF(TRIM(firm_branch_station), ''),
        NULLIF(TRIM(branch_name), ''),
        CASE LOWER(COALESCE(branch_id, ''))
          WHEN 'kla-hq' THEN 'Kampala Central (Head Office)'
          WHEN 'ftp-reg' THEN 'Fort Portal Regional Office'
          WHEN 'mbr-reg' THEN 'Mbarara Regional Office'
          WHEN 'msk-reg' THEN 'Masaka Regional Office'
          WHEN 'jnj-reg' THEN 'Jinja Regional Office'
          WHEN 'glu-reg' THEN 'Gulu Regional Office'
          WHEN 'msn-reg' THEN 'Masindi Regional Office'
          ELSE NULL
        END
      )
    WHERE firm_branch_station IS NULL;
  END IF;
END $$;

-- 3. Update RLS on mortgages & mortgage_cases to scope strictly by MK Firm Branch (branch_id / firm_branch_station)
DO $$
BEGIN
  IF to_regclass('public.mortgages') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow authenticated read on mortgages" ON public.mortgages;
    DROP POLICY IF EXISTS "Allow branch scoped insert on mortgages" ON public.mortgages;
    DROP POLICY IF EXISTS "Allow branch scoped update on mortgages" ON public.mortgages;
    DROP POLICY IF EXISTS "Allow branch scoped delete on mortgages" ON public.mortgages;

    CREATE POLICY "Allow authenticated read on mortgages"
      ON public.mortgages FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Allow branch scoped insert on mortgages"
      ON public.mortgages FOR INSERT TO authenticated, anon
      WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
        OR (branch_id IS NULL AND firm_branch_station IS NOT NULL AND public.resolve_branch_id_from_text(firm_branch_station) = public.get_auth_user_branch_id())
      );
    CREATE POLICY "Allow branch scoped update on mortgages"
      ON public.mortgages FOR UPDATE TO authenticated, anon
      USING (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
        OR (branch_id IS NULL AND firm_branch_station IS NOT NULL AND public.resolve_branch_id_from_text(firm_branch_station) = public.get_auth_user_branch_id())
      )
      WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
        OR (branch_id IS NULL AND firm_branch_station IS NOT NULL AND public.resolve_branch_id_from_text(firm_branch_station) = public.get_auth_user_branch_id())
      );
    CREATE POLICY "Allow branch scoped delete on mortgages"
      ON public.mortgages FOR DELETE TO authenticated, anon
      USING (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
        OR (branch_id IS NULL AND firm_branch_station IS NOT NULL AND public.resolve_branch_id_from_text(firm_branch_station) = public.get_auth_user_branch_id())
      );
  END IF;

  IF to_regclass('public.mortgage_cases') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow authenticated read on mortgage_cases" ON public.mortgage_cases;
    DROP POLICY IF EXISTS "Allow branch scoped insert on mortgage_cases" ON public.mortgage_cases;
    DROP POLICY IF EXISTS "Allow branch scoped update on mortgage_cases" ON public.mortgage_cases;
    DROP POLICY IF EXISTS "Allow branch scoped delete on mortgage_cases" ON public.mortgage_cases;

    CREATE POLICY "Allow authenticated read on mortgage_cases"
      ON public.mortgage_cases FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY "Allow branch scoped insert on mortgage_cases"
      ON public.mortgage_cases FOR INSERT TO authenticated, anon
      WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
        OR (branch_id IS NULL AND firm_branch_station IS NOT NULL AND public.resolve_branch_id_from_text(firm_branch_station) = public.get_auth_user_branch_id())
        OR (branch_id IS NULL AND firm_branch_station IS NULL AND branch_name IS NULL AND public.resolve_branch_id_from_text(branch) = public.get_auth_user_branch_id())
      );
    CREATE POLICY "Allow branch scoped update on mortgage_cases"
      ON public.mortgage_cases FOR UPDATE TO authenticated, anon
      USING (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
        OR (branch_id IS NULL AND firm_branch_station IS NOT NULL AND public.resolve_branch_id_from_text(firm_branch_station) = public.get_auth_user_branch_id())
        OR (branch_id IS NULL AND firm_branch_station IS NULL AND branch_name IS NULL AND public.resolve_branch_id_from_text(branch) = public.get_auth_user_branch_id())
      )
      WITH CHECK (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
        OR (branch_id IS NULL AND firm_branch_station IS NOT NULL AND public.resolve_branch_id_from_text(firm_branch_station) = public.get_auth_user_branch_id())
        OR (branch_id IS NULL AND firm_branch_station IS NULL AND branch_name IS NULL AND public.resolve_branch_id_from_text(branch) = public.get_auth_user_branch_id())
      );
    CREATE POLICY "Allow branch scoped delete on mortgage_cases"
      ON public.mortgage_cases FOR DELETE TO authenticated, anon
      USING (
        auth.role() = 'service_role'
        OR public.is_partner_or_superadmin()
        OR branch_id = public.get_auth_user_branch_id()
        OR (branch_id IS NULL AND firm_branch_station IS NOT NULL AND public.resolve_branch_id_from_text(firm_branch_station) = public.get_auth_user_branch_id())
        OR (branch_id IS NULL AND firm_branch_station IS NULL AND branch_name IS NULL AND public.resolve_branch_id_from_text(branch) = public.get_auth_user_branch_id())
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
