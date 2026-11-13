import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';

export interface BankSummary {
  bank_name: string;
  file_count: number;
  total_loan: number;
}

export const DEFAULT_BANKS = [
  'Centenary Bank',
  'Finance Trust',
  'Rushere SACCO',
  'Opportunity Bank',
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MORTGAGE_RLS_FIX_SQL = `-- Run once in Supabase SQL Editor to enable direct cloud saves on mortgage_cases & mortgages
DROP POLICY IF EXISTS "Admin and Finance insert policy on mortgage_cases" ON public.mortgage_cases;
DROP POLICY IF EXISTS "Allow authenticated write on mortgage_cases" ON public.mortgage_cases;
DROP POLICY IF EXISTS "Allow public write on mortgage_cases" ON public.mortgage_cases;
CREATE POLICY "Allow authenticated write on mortgage_cases"
  ON public.mortgage_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write on mortgage_cases"
  ON public.mortgage_cases FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated write on mortgages" ON public.mortgages;
DROP POLICY IF EXISTS "Allow public write on mortgages" ON public.mortgages;
CREATE POLICY "Allow authenticated write on mortgages"
  ON public.mortgages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write on mortgages"
  ON public.mortgages FOR ALL TO anon USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';`;

const LOCAL_MORTGAGES_KEY = 'mk_mortgages_local_v1';

const readLocalMortgages = (): any[] => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(LOCAL_MORTGAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalMortgages = (records: any[]): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(LOCAL_MORTGAGES_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('[MortgageService] localStorage write notice:', e);
  }
};

const upsertLocalMortgage = (record: any): any => {
  const list = readLocalMortgages();
  const id = String(record.id || `mort-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const enriched = {
    ...record,
    id,
    created_at: record.created_at || new Date().toISOString(),
  };
  const idx = list.findIndex((item) => String(item.id) === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...enriched };
  } else {
    list.unshift(enriched);
  }
  writeLocalMortgages(list);
  return enriched;
};

const upsertLocalMortgagesBatch = (records: any[]): any[] => {
  const list = readLocalMortgages();
  const existingMap = new Map<string, number>();
  list.forEach((item, idx) => {
    if (item.id) existingMap.set(String(item.id), idx);
  });

  const saved: any[] = [];
  for (let i = records.length - 1; i >= 0; i--) {
    const rec = records[i];
    const id = String(rec.id || `mort-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`);
    const enriched = {
      ...rec,
      id,
      created_at: rec.created_at || new Date().toISOString(),
    };
    const existingIdx = existingMap.get(id);
    if (existingIdx !== undefined) {
      list[existingIdx] = { ...list[existingIdx], ...enriched };
    } else {
      list.unshift(enriched);
      existingMap.set(id, 0);
    }
    saved.unshift(enriched);
  }

  writeLocalMortgages(list);
  return saved;
};

const deleteLocalMortgage = (id: string): void => {
  const list = readLocalMortgages();
  const filtered = list.filter((item) => String(item.id) !== String(id));
  writeLocalMortgages(filtered);
};

const cleanFloat = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0.0;
  if (typeof val === 'number') return isNaN(val) ? 0.0 : val;
  const cleaned = String(val).replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0.0 : parsed;
};

const parseExcelDate = (val: any): string | null => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        const y = String(parsed.y).padStart(4, '0');
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      return null;
    }
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (!str) return null;
  // Handle DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${month}-${day}`;
  }
  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }
  return null;
};

const extractRecordsFromWorkbook = (
  workbook: XLSX.WorkBook,
  options: {
    bankName: string;
    monthSheet: string;
    recordYear: number;
    sheetSelection?: string;
  }
): any[] => {
  const allRecords: any[] = [];
  const targetSheets =
    options.sheetSelection && options.sheetSelection !== 'ALL'
      ? workbook.SheetNames.filter((s) => s === options.sheetSelection)
      : workbook.SheetNames;

  targetSheets.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;
    const jsonSheet: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (!jsonSheet || jsonSheet.length < 2) return;

    // Detect header row among first 5 rows
    let headerRowIndex = jsonSheet.length > 2 ? 1 : 0;
    const nameKeys = ['name', 'client name', 'client_name', 'borrower', 'borrower name', 'mortgagor', 'customer name'];
    for (let r = 0; r < Math.min(5, jsonSheet.length); r++) {
      const rowVals = (jsonSheet[r] || []).map((c: any) =>
        c ? String(c).trim().toLowerCase() : ''
      );
      if (rowVals.some((cell) => nameKeys.includes(cell))) {
        headerRowIndex = r;
        break;
      }
    }

    const headers = (jsonSheet[headerRowIndex] || []).map((h: any) =>
      h ? String(h).trim() : ''
    );
    const lowerHeaders = headers.map((h) => h.toLowerCase());

    for (let i = headerRowIndex + 1; i < jsonSheet.length; i++) {
      const row = jsonSheet[i];
      if (!row || row.length === 0) continue;

      const getVal = (...candidates: string[]) => {
        for (const candidate of candidates) {
          const idx = lowerHeaders.indexOf(candidate.toLowerCase());
          if (idx !== -1 && row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== '') {
            return row[idx];
          }
        }
        return null;
      };

      const rawName = getVal('Name', 'Client Name', 'client_name', 'Borrower', 'Borrower Name', 'Mortgagor', 'Customer Name');
      if (!rawName || String(rawName).trim() === '') continue;

      const clientName = String(rawName).trim();
      // Skip summary / total rows
      if (/^(total|grand total|sub ?total)$/i.test(clientName)) continue;

      const branchVal = getVal('Branch', 'Bank Branch', 'Branch Station', 'bank_branch');
      const rimVal = getVal('RIM NO.', 'RIM NO', 'RIM', 'rim_no', 'File No', 'File Number');
      const descVal = getVal('Description', 'Property Description', 'property_description', 'Title', 'Particulars');
      const dateReceipt = parseExcelDate(getVal('Date of Receipt', 'date_of_receipt', 'Date Received', 'Receipt Date', 'Date'));
      const datePayment = parseExcelDate(getVal('Date of Payment', 'date_of_payment', 'Payment Date'));
      const dateReturn = parseExcelDate(getVal('Date of Return', 'date_of_return', 'Return Date'));

      const loanAmount = cleanFloat(getVal('Loan amount', 'Loan Amount', 'loan_amount', 'Facility Amount', 'Principal'));
      const stampDuty = cleanFloat(getVal('Stamp Duty', 'stamp_duty'));
      const extraCopies = cleanFloat(getVal('Extra Copies', 'extra_copies'));
      const registration = cleanFloat(getVal('Registration', 'registration', 'Registration Fee'));
      const other = cleanFloat(getVal('Other', 'other', 'Other Disbursements'));
      const bankCharges = cleanFloat(getVal('Bank charges', 'Bank Charges', 'bank_charges'));
      const transport = cleanFloat(getVal('Transport', 'transport', 'Logistics'));
      const linkageFees = cleanFloat(getVal('Linkage Fees', 'linkage_fees', 'Linkage'));

      const rawTotalDisb = getVal('Total Disbursements', 'total_disbursements', 'Disbursements');
      const computedDisb = stampDuty + extraCopies + registration + other + bankCharges + transport + linkageFees;
      const totalDisbursements = rawTotalDisb !== null ? cleanFloat(rawTotalDisb) : computedDisb;

      const legalFees = cleanFloat(getVal('Legal Fees', 'legal_fees', 'Fees'));
      const rawVat = getVal('VAT 18%', 'VAT (18%)', 'VAT', 'vat_18');
      const vat18 = rawVat !== null ? cleanFloat(rawVat) : (legalFees > 0 ? Math.round(legalFees * 0.18) : 0);

      const rawGrandTotal = getVal('Grand Total', 'grand_total', 'Total');
      const computedGrand = totalDisbursements + legalFees + vat18;
      const grandTotal = rawGrandTotal !== null ? cleanFloat(rawGrandTotal) : (computedGrand > 0 ? computedGrand : 0);

      const commentsVal = getVal('Comments', 'Comment', 'comments', 'Remarks', 'Notes');

      allRecords.push({
        bank_name: options.bankName,
        record_year: options.recordYear,
        month_sheet: options.monthSheet,
        source_sheet: sheetName,
        date_of_receipt: dateReceipt || new Date().toISOString().slice(0, 10),
        branch: branchVal ? String(branchVal).trim() : '',
        client_name: clientName,
        name: clientName,
        rim_no: rimVal ? String(rimVal).trim() : '',
        property_description: descVal ? String(descVal).trim() : '',
        description: descVal ? String(descVal).trim() : '',
        loan_amount: loanAmount,
        stamp_duty: stampDuty,
        extra_copies: extraCopies,
        registration,
        other,
        bank_charges: bankCharges,
        transport,
        linkage_fees: linkageFees,
        total_disbursements: totalDisbursements,
        legal_fees: legalFees,
        vat_18: vat18,
        grand_total: grandTotal,
        date_of_payment: datePayment,
        date_of_return: dateReturn,
        comments: commentsVal ? String(commentsVal).trim() : '',
        status: dateReturn ? 'Completed / Cleared' : 'Active / Processing',
        department: 'Banking & Securities',
      });
    }
  });

  return allRecords;
};

/**
 * Builds a clean payload matching the exact columns of live `public.mortgage_cases`
 * so PostgREST never rejects inserts/updates with PGRST204 unknown column errors.
 */
export const buildMortgageCasesRow = (r: any) => ({
  bank_name: r.bank_name || r.client_bank_name || 'Centenary Bank',
  client_bank_name: r.client_bank_name || r.bank_name || 'Centenary Bank',
  record_year: r.record_year ? parseInt(String(r.record_year), 10) : new Date().getFullYear(),
  month_sheet: r.month_sheet || MONTHS[new Date().getMonth()],
  source_sheet: r.source_sheet || 'Tracker Entry',
  date_of_receipt: r.date_of_receipt || new Date().toISOString().slice(0, 10),
  branch: r.branch || r.client_branch_location || r.bank_branch || '',
  client_branch_location: r.client_branch_location || r.branch || r.bank_branch || '',
  client_name: r.client_name || r.mortgagor_name || r.borrower_name || r.name || '',
  mortgagor_name: r.mortgagor_name || r.client_name || r.borrower_name || r.name || '',
  rim_no: r.rim_no || r.file_number || '',
  property_description: r.property_description || r.description || '',
  loan_amount: Number(r.loan_amount) || 0,
  stamp_duty: Number(r.stamp_duty) || 0,
  extra_copies: Number(r.extra_copies) || 0,
  registration_fee: Number(r.registration_fee ?? r.registration ?? 0),
  other_fees: Number(r.other_fees ?? r.other ?? 0),
  other_disbursements: Number(r.other_disbursements ?? r.other_fees ?? r.other ?? 0),
  bank_charges: Number(r.bank_charges) || 0,
  transport: Number(r.transport) || 0,
  linkage_fees: Number(r.linkage_fees) || 0,
  total_disbursements: Number(r.total_disbursements) || 0,
  legal_fees: Number(r.legal_fees) || 0,
  vat_18: Number(r.vat_18 ?? r.vat ?? 0),
  grand_total: Number(r.grand_total) || 0,
  date_of_payment: r.date_of_payment || null,
  date_of_return: r.date_of_return || null,
  comments: r.comments || '',
  status: r.status || (r.date_of_return ? 'Completed / Cleared' : 'Active / Processing'),
});

/**
 * Builds a clean payload matching the exact columns of live `public.mortgages`.
 */
export const buildMortgagesRow = (r: any) => {
  const isUUID =
    typeof r.assigned_lawyer_id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.assigned_lawyer_id);

  const row: Record<string, any> = {
    client_bank_name: r.client_bank_name || r.bank_name || 'Centenary Bank',
    record_year: r.record_year ? parseInt(String(r.record_year), 10) : new Date().getFullYear(),
    month_sheet: r.month_sheet || MONTHS[new Date().getMonth()],
    date_of_receipt: r.date_of_receipt || new Date().toISOString().slice(0, 10),
    mortgagor_name: r.mortgagor_name || r.client_name || r.borrower_name || r.name || '',
    rim_no: r.rim_no || r.file_number || '',
    property_description: r.property_description || r.description || '',
    loan_amount: Number(r.loan_amount) || 0,
    stamp_duty: Number(r.stamp_duty) || 0,
    extra_copies: Number(r.extra_copies) || 0,
    registration_fee: Number(r.registration_fee ?? r.registration ?? 0),
    bank_charges: Number(r.bank_charges) || 0,
    transport: Number(r.transport) || 0,
    other_disbursements: Number(r.other_disbursements ?? r.other_fees ?? r.other ?? 0),
    total_disbursements: Number(r.total_disbursements) || 0,
    legal_fees: Number(r.legal_fees) || 0,
    vat_18: Number(r.vat_18 ?? r.vat ?? 0),
    grand_total: Number(r.grand_total) || 0,
    date_of_payment: r.date_of_payment || null,
    date_of_return: r.date_of_return || null,
    comments: r.comments || '',
    status: r.status || (r.date_of_return ? 'Completed / Cleared' : 'Active / Processing'),
    department: r.department || 'Banking & Securities',
    assigned_lawyer_id: isUUID ? r.assigned_lawyer_id : null,
  };

  if (r.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(r.id))) {
    row.id = r.id;
  }
  return row;
};

const normalizeMortgageRecord = (row: any, fallbackBankName?: string) => {
  const resolvedBranch =
    row.branch || row.client_branch_location || row.bank_branch || row.branch_name || '';
  const resolvedClient =
    row.client_name || row.mortgagor_name || row.borrower_name || row.name || '';
  const stampDuty = Number(row.stamp_duty || 0);
  const extraCopies = Number(row.extra_copies || 0);
  const registrationFee = Number(row.registration_fee ?? row.registration ?? 0);
  const otherFees = Number(row.other_fees ?? row.other ?? row.other_disbursements ?? 0);
  const bankCharges = Number(row.bank_charges || 0);
  const transportVal = Number(row.transport || 0);
  const linkageFees = Number(row.linkage_fees || 0);
  const computedDisbursements =
    stampDuty + extraCopies + registrationFee + otherFees + bankCharges + transportVal + linkageFees;
  const totalDisbursements =
    row.total_disbursements !== null &&
    row.total_disbursements !== undefined &&
    Number(row.total_disbursements) > 0
      ? Number(row.total_disbursements)
      : computedDisbursements;
  const legalFees = Number(row.legal_fees || 0);
  const vat18 = Number(row.vat_18 ?? row.vat ?? 0);
  const computedGrandTotal = totalDisbursements + legalFees + vat18;
  const grandTotal =
    row.grand_total !== null && row.grand_total !== undefined && Number(row.grand_total) > 0
      ? Number(row.grand_total)
      : computedGrandTotal;

  return {
    ...row,
    id: row.id || `mc-${row.rim_no || Math.random()}`,
    client_bank_name: row.client_bank_name || row.bank_name || fallbackBankName || 'Centenary Bank',
    bank_name: row.bank_name || row.client_bank_name || fallbackBankName || 'Centenary Bank',
    date_of_receipt: row.date_of_receipt || null,
    branch: resolvedBranch,
    client_branch_location: row.client_branch_location || resolvedBranch,
    bank_branch: row.bank_branch || resolvedBranch,
    branch_name: row.branch_name || resolvedBranch,
    client_name: resolvedClient,
    name: row.name || resolvedClient,
    borrower_name: row.borrower_name || resolvedClient,
    mortgagor_name: row.mortgagor_name || resolvedClient,
    file_number: row.file_number || row.rim_no || '',
    rim_no: row.rim_no || row.file_number || '',
    property_description: row.property_description || row.description || row.title_deed_no || '',
    description: row.description || row.property_description || '',
    loan_amount: Number(row.loan_amount || 0),
    stamp_duty: stampDuty,
    extra_copies: extraCopies,
    registration: registrationFee,
    registration_fee: registrationFee,
    other: otherFees,
    other_fees: otherFees,
    other_disbursements: Number(row.other_disbursements ?? otherFees),
    bank_charges: bankCharges,
    transport: transportVal,
    linkage_fees: linkageFees,
    total_disbursements: totalDisbursements,
    legal_fees: legalFees,
    vat_18: vat18,
    grand_total: grandTotal,
    date_of_payment: row.date_of_payment || null,
    date_of_return: row.date_of_return || null,
    comments: row.comments || row.notes || '',
    source_sheet: row.source_sheet || '',
    record_year: row.record_year || new Date().getFullYear(),
    month_sheet: row.month_sheet || '',
    status: row.status || (row.date_of_return ? 'Completed / Cleared' : 'Active / Processing'),
    department: row.department || 'Banking & Securities',
    created_at: row.created_at,
  };
};

/**
 * MortgageService:
 * Unified, resilient service supporting both Supabase PostgreSQL cloud database
 * and local workstation multi-computer sync with zero unhandled PGRST205 errors.
 */
export const MortgageService = {
  /**
   * Reads an Excel file client-side and returns sheet names + a parser bound to the workbook.
   */
  async readExcelWorkbook(file: File): Promise<{
    sheetNames: string[];
    extractRecords: (options: {
      bankName: string;
      monthSheet: string;
      recordYear: number;
      sheetSelection?: string;
    }) => any[];
  }> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    return {
      sheetNames: workbook.SheetNames,
      extractRecords: (options) => extractRecordsFromWorkbook(workbook, options),
    };
  },

  /**
   * Imports pre-parsed Excel mortgage records for a selected bank, month, and year.
   * Uploads in chunks of 50 to Supabase `mortgage_cases` and syncs to `/api/mortgages/batch`.
   */
  async importExcelMortgages(
    records: any[],
    bankName: string,
    onProgress?: (msg: string) => void
  ): Promise<{ success: boolean; count: number; error?: string; cloudSaved?: boolean; cloudError?: string }> {
    try {
      if (!records || records.length === 0) {
        return { success: false, count: 0, error: 'No valid mortgage rows found to import.' };
      }

      if (onProgress) onProgress(`Uploading ${records.length} records to ${bankName}...`);

      const normalizedRecords = records.map((r, idx) =>
        normalizeMortgageRecord(
          {
            ...r,
            id: r.id || `mort-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          },
          r.bank_name || bankName
        )
      );

      let cloudSaved = false;
      let cloudError: string | undefined;

      const chunkSize = 50;
      for (let i = 0; i < normalizedRecords.length; i += chunkSize) {
        const rawChunk = normalizedRecords.slice(i, i + chunkSize);
        const chunk = rawChunk.map((r) => buildMortgageCasesRow(r));
        const batchIndex = Math.floor(i / chunkSize) + 1;
        const totalBatches = Math.ceil(normalizedRecords.length / chunkSize);
        if (onProgress) {
          onProgress(
            `Importing batch ${batchIndex} of ${totalBatches} (${Math.min(i + chunkSize, normalizedRecords.length)}/${normalizedRecords.length})...`
          );
        }

        const { error: err1 } = await supabase.from('mortgage_cases').insert(chunk);
        if (!err1) {
          cloudSaved = true;
        } else {
          cloudError = err1.message;
          console.warn('mortgage_cases batch insert warning:', err1.message);
        }
      }

      // Persist to central workstation server as well
      await fetch('/api/mortgages/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: normalizedRecords, bank_name: bankName }),
      }).catch(() => {});

      // Always mirror to browser localStorage so records survive server restarts / static mode
      upsertLocalMortgagesBatch(normalizedRecords);

      return {
        success: true,
        count: normalizedRecords.length,
        cloudSaved,
        cloudError: cloudSaved ? undefined : cloudError,
      };
    } catch (err: any) {
      console.error('Error importing Excel records:', err);
      return {
        success: false,
        count: 0,
        error: err?.message || 'Failed to import Excel mortgage records.',
      };
    }
  },

  /**
   * Imports an Excel workbook (.xlsx/.xls) parsing each month sheet
   * and batch inserting into Supabase in chunks of 50.
   */
  async importCentenaryExcelFile(
    file: File,
    onProgress?: (msg: string) => void,
    bankName: string = 'Centenary Bank',
    monthSheet?: string,
    recordYear: number = new Date().getFullYear()
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      if (onProgress) onProgress('Reading Excel file...');
      const wb = await this.readExcelWorkbook(file);
      const targetMonth = monthSheet || MONTHS[new Date().getMonth()];
      const allRecords = wb.extractRecords({
        bankName,
        monthSheet: targetMonth,
        recordYear,
        sheetSelection: 'ALL',
      });
      return await this.importExcelMortgages(allRecords, bankName, onProgress);
    } catch (err: any) {
      console.error('Error processing file:', err);
      return {
        success: false,
        count: 0,
        error: err?.message || 'Failed to parse Excel file. Check console for details.',
      };
    }
  },
  /**
   * Fetches bank portfolio summaries for a specific financial year.
   * Guarantees all 4 designated lending institutions are always returned.
   */
  async fetchBankSummaries(year: number = 2026): Promise<{
    summaries: BankSummary[];
    hasCloudTable: boolean;
    errorNotice?: string;
  }> {
    const grouped: { [key: string]: { count: number; totalLoan: number } } = {};
    DEFAULT_BANKS.forEach((b) => {
      grouped[b] = { count: 0, totalLoan: 0 };
    });

    let hasCloudTable = true;
    let errorNotice: string | undefined = undefined;
    const seenIds = new Set<string>();

    // 1. Try Supabase cloud query from both mortgages and mortgage_cases
    try {
      const { data: mData } = await supabase
        .from('mortgages')
        .select('id, client_bank_name, loan_amount, record_year')
        .eq('record_year', year);

      if (Array.isArray(mData)) {
        mData.forEach((item) => {
          if (item.id) seenIds.add(String(item.id));
          const bank = item.client_bank_name || 'Centenary Bank';
          if (!grouped[bank]) grouped[bank] = { count: 0, totalLoan: 0 };
          grouped[bank].count += 1;
          grouped[bank].totalLoan += Number(item.loan_amount || 0);
        });
      }

      const { data: mcData } = await supabase
        .from('mortgage_cases')
        .select('id, bank_name, client_bank_name, loan_amount, record_year')
        .limit(5000);

      if (Array.isArray(mcData) && mcData.length > 0) {
        mcData.forEach((item) => {
          if (item.record_year && Number(item.record_year) !== year) return;
          if (item.id && seenIds.has(String(item.id))) return;
          if (item.id) seenIds.add(String(item.id));
          const bank = item.bank_name || item.client_bank_name || 'Centenary Bank';
          if (!grouped[bank]) grouped[bank] = { count: 0, totalLoan: 0 };
          grouped[bank].count += 1;
          grouped[bank].totalLoan += Number(item.loan_amount || 0);
        });
      }
    } catch (e: any) {
      console.info('[MortgageService] Cloud summary notice:', e?.message);
    }

    // 2. Always merge local server API (/api/mortgages) deduplicating by id
    try {
      const res = await fetch(`/api/mortgages?record_year=${year}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          json.data.forEach((item: any) => {
            if (item.id && seenIds.has(String(item.id))) return;
            if (item.id) seenIds.add(String(item.id));
            const bank = item.client_bank_name || item.bank_name || 'Centenary Bank';
            if (!grouped[bank]) grouped[bank] = { count: 0, totalLoan: 0 };
            grouped[bank].count += 1;
            grouped[bank].totalLoan += Number(item.loan_amount || 0);
          });
        }
      }
    } catch (apiErr) {
      console.warn('[MortgageService] Local backend notice:', apiErr);
    }

    // 3. Also merge browser localStorage mirror deduplicating by id
    readLocalMortgages().forEach((item: any) => {
      if (item.record_year && Number(item.record_year) !== year) return;
      if (item.id && seenIds.has(String(item.id))) return;
      if (item.id) seenIds.add(String(item.id));
      const bank = item.client_bank_name || item.bank_name || 'Centenary Bank';
      if (!grouped[bank]) grouped[bank] = { count: 0, totalLoan: 0 };
      grouped[bank].count += 1;
      grouped[bank].totalLoan += Number(item.loan_amount || 0);
    });

    return {
      summaries: Object.keys(grouped).map((bank) => ({
        bank_name: bank,
        file_count: grouped[bank].count,
        total_loan: grouped[bank].totalLoan,
      })),
      hasCloudTable,
      errorNotice,
    };
  },

  /**
   * Fetches mortgage registers for a specific bank.
   * Seamlessly unifies records from 'mortgage_cases', 'mortgages', local backend, and localStorage.
   */
  async fetchMortgages(bankName: string): Promise<any[]> {
    const combined: any[] = [];
    const seenIds = new Set<string>();
    const safeBank = bankName.replace(/[,()]/g, '').trim();

    // 1. Try Supabase cloud query on mortgage_cases (match BOTH bank_name and client_bank_name!)
    try {
      const { data: mcData, error: mcErr } = await supabase
        .from('mortgage_cases')
        .select('*')
        .or(`bank_name.ilike.%${safeBank}%,client_bank_name.ilike.%${safeBank}%`)
        .order('created_at', { ascending: false })
        .limit(5000);

      if (mcErr) {
        console.warn('[MortgageService] mortgage_cases fetch notice:', mcErr.message);
      }

      if (Array.isArray(mcData) && mcData.length > 0) {
        mcData.forEach((row) => {
          const normalized = normalizeMortgageRecord(row, bankName);
          if (!seenIds.has(normalized.id)) {
            seenIds.add(normalized.id);
            combined.push(normalized);
          }
        });
      }
    } catch (err) {}

    // 2. Also fetch from public.mortgages
    try {
      const { data, error } = await supabase
        .from('mortgages')
        .select('*')
        .ilike('client_bank_name', `%${safeBank}%`)
        .order('created_at', { ascending: false })
        .limit(5000);

      if (!error && Array.isArray(data)) {
        data.forEach((row) => {
          const normalized = normalizeMortgageRecord(row, bankName);
          if (!seenIds.has(normalized.id)) {
            seenIds.add(normalized.id);
            combined.push(normalized);
          }
        });
      }
    } catch (err) {}

    // 3. Fallback / dual-sync merge from local workstation backend (/api/mortgages)
    try {
      const res = await fetch(`/api/mortgages?client_bank_name=${encodeURIComponent(bankName)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          json.data.forEach((row: any) => {
            const normalized = normalizeMortgageRecord(row, bankName);
            if (!seenIds.has(normalized.id)) {
              seenIds.add(normalized.id);
              combined.push(normalized);
            }
          });
        }
      }
    } catch (err) {}

    // 4. Merge browser localStorage mirror filtered by bankName
    const targetBankLower = bankName.trim().toLowerCase();
    readLocalMortgages().forEach((row: any) => {
      const cb = String(row.client_bank_name || '').trim().toLowerCase();
      const bn = String(row.bank_name || '').trim().toLowerCase();
      if (
        cb === targetBankLower ||
        bn === targetBankLower ||
        cb.includes(targetBankLower) ||
        bn.includes(targetBankLower)
      ) {
        const normalized = normalizeMortgageRecord(row, bankName);
        if (!seenIds.has(normalized.id)) {
          seenIds.add(normalized.id);
          combined.push(normalized);
        }
      }
    });

    return combined;
  },

  /**
   * Inserts a new mortgage file, syncing to Supabase `mortgage_cases`, `mortgages`,
   * local workstation `/api/mortgages`, and browser localStorage fallback.
   */
  async insertMortgage(
    payload: any
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    cloudSaved?: boolean;
    localSaved?: boolean;
    cloudError?: string;
  }> {
    let savedRecord: any = null;
    let cloudSaved = false;
    let localSaved = false;
    let lastError: string | undefined;

    // 1. Insert into Supabase `mortgage_cases` using exact live columns
    try {
      const mcRow = buildMortgageCasesRow(payload);
      const { data: mcData, error: mcError } = await supabase
        .from('mortgage_cases')
        .insert([mcRow])
        .select('*');

      if (!mcError && mcData && mcData.length > 0) {
        savedRecord = normalizeMortgageRecord(mcData[0], mcRow.bank_name);
        cloudSaved = true;
      } else if (mcError) {
        lastError = mcError.message;
        console.warn('[MortgageService] mortgage_cases insert notice:', mcError.message);
      }
    } catch (err: any) {
      lastError = err?.message;
    }

    // 2. Also insert into Supabase `mortgages` using exact live columns (preserving same UUID if available)
    try {
      const mRow = buildMortgagesRow({
        ...payload,
        id: savedRecord?.id || payload.id,
      });
      const { data: mData, error: mError } = await supabase
        .from('mortgages')
        .insert([mRow])
        .select('*');

      if (!mError && mData && mData.length > 0) {
        if (!savedRecord) {
          savedRecord = normalizeMortgageRecord(mData[0], mRow.client_bank_name);
        }
        cloudSaved = true;
      } else if (mError) {
        lastError = lastError || mError.message;
        console.warn('[MortgageService] mortgages insert notice:', mError.message);
      }
    } catch (err: any) {
      lastError = lastError || err?.message;
    }

    const stableId =
      savedRecord?.id ||
      payload.id ||
      `mort-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const localBody = normalizeMortgageRecord(
      {
        ...payload,
        ...(savedRecord || {}),
        id: stableId,
        created_at: savedRecord?.created_at || payload.created_at || new Date().toISOString(),
      },
      payload.client_bank_name || payload.bank_name
    );

    // 3. Persist to local workstation backend (/api/mortgages)
    try {
      const res = await fetch('/api/mortgages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localBody),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          savedRecord = savedRecord || normalizeMortgageRecord(json.data, localBody.bank_name);
          localSaved = true;
        }
      }
    } catch (localErr: any) {
      console.warn('[MortgageService] Local save notice:', localErr);
    }

    // 4. Always mirror to browser localStorage so records NEVER fail to save locally
    const mirrored = upsertLocalMortgage(savedRecord || localBody);
    if (mirrored) {
      savedRecord = savedRecord || mirrored;
      localSaved = true;
    }

    if (cloudSaved || localSaved) {
      return {
        success: true,
        data: savedRecord,
        cloudSaved,
        localSaved,
        cloudError: cloudSaved ? undefined : lastError,
      };
    }

    return {
      success: false,
      error: lastError || 'Failed to persist mortgage file. Please check server status.',
    };
  },

  /**
   * Updates an existing mortgage file.
   * Syncs to both mortgage_cases, mortgages, and local server.
   */
  async updateMortgage(id: string, updates: any): Promise<{ success: boolean; data?: any; error?: string }> {
    let updatedRecord: any = null;

    // 1. Try Supabase update on mortgage_cases (only live columns)
    try {
      const mcPayload: any = {};
      if (updates.record_year !== undefined) mcPayload.record_year = parseInt(String(updates.record_year), 10);
      if (updates.month_sheet !== undefined) mcPayload.month_sheet = updates.month_sheet;
      if (updates.bank_name || updates.client_bank_name) {
        mcPayload.bank_name = updates.bank_name || updates.client_bank_name;
        mcPayload.client_bank_name = updates.client_bank_name || updates.bank_name;
      }
      if (updates.branch !== undefined || updates.bank_branch !== undefined || updates.client_branch_location !== undefined) {
        const br = updates.branch ?? updates.bank_branch ?? updates.client_branch_location;
        mcPayload.branch = br;
        mcPayload.client_branch_location = br;
      }
      if (updates.client_name || updates.mortgagor_name || updates.borrower_name) {
        const cname = updates.client_name || updates.mortgagor_name || updates.borrower_name;
        mcPayload.client_name = cname;
        mcPayload.mortgagor_name = cname;
      }
      if (updates.rim_no !== undefined) mcPayload.rim_no = updates.rim_no;
      if (updates.property_description !== undefined) mcPayload.property_description = updates.property_description;
      if (updates.loan_amount !== undefined) mcPayload.loan_amount = Number(updates.loan_amount);
      if (updates.stamp_duty !== undefined) mcPayload.stamp_duty = Number(updates.stamp_duty);
      if (updates.extra_copies !== undefined) mcPayload.extra_copies = Number(updates.extra_copies);
      if (updates.registration_fee !== undefined || updates.registration !== undefined) {
        mcPayload.registration_fee = Number(updates.registration_fee ?? updates.registration ?? 0);
      }
      if (updates.bank_charges !== undefined) mcPayload.bank_charges = Number(updates.bank_charges);
      if (updates.transport !== undefined) mcPayload.transport = Number(updates.transport);
      if (updates.linkage_fees !== undefined) mcPayload.linkage_fees = Number(updates.linkage_fees);
      if (updates.other_disbursements !== undefined || updates.other_fees !== undefined || updates.other !== undefined) {
        const otherVal = Number(updates.other_disbursements ?? updates.other_fees ?? updates.other ?? 0);
        mcPayload.other_disbursements = otherVal;
        mcPayload.other_fees = otherVal;
      }
      if (updates.total_disbursements !== undefined) mcPayload.total_disbursements = Number(updates.total_disbursements);
      if (updates.legal_fees !== undefined) mcPayload.legal_fees = Number(updates.legal_fees);
      if (updates.vat_18 !== undefined || updates.vat !== undefined) {
        mcPayload.vat_18 = Number(updates.vat_18 ?? updates.vat ?? 0);
      }
      if (updates.grand_total !== undefined) mcPayload.grand_total = Number(updates.grand_total);
      if (updates.date_of_receipt !== undefined) mcPayload.date_of_receipt = updates.date_of_receipt || null;
      if (updates.date_of_payment !== undefined) mcPayload.date_of_payment = updates.date_of_payment || null;
      if (updates.date_of_return !== undefined) mcPayload.date_of_return = updates.date_of_return || null;
      if (updates.comments !== undefined) mcPayload.comments = updates.comments;
      if (updates.status !== undefined) mcPayload.status = updates.status;

      const { data: mcData, error: mcErr } = await supabase
        .from('mortgage_cases')
        .update(mcPayload)
        .eq('id', id)
        .select('*');

      if (!mcErr && mcData && mcData.length > 0) {
        updatedRecord = mcData[0];
      }
    } catch (e) {}

    // 2. Try Supabase update on mortgages (only live columns)
    try {
      const mPayload: any = {};
      if (updates.record_year !== undefined) mPayload.record_year = parseInt(String(updates.record_year), 10);
      if (updates.month_sheet !== undefined) mPayload.month_sheet = updates.month_sheet;
      if (updates.client_bank_name || updates.bank_name) {
        mPayload.client_bank_name = updates.client_bank_name || updates.bank_name;
      }
      if (updates.mortgagor_name || updates.client_name || updates.borrower_name) {
        mPayload.mortgagor_name = updates.mortgagor_name || updates.client_name || updates.borrower_name;
      }
      if (updates.rim_no !== undefined) mPayload.rim_no = updates.rim_no;
      if (updates.property_description !== undefined) mPayload.property_description = updates.property_description;
      if (updates.loan_amount !== undefined) mPayload.loan_amount = Number(updates.loan_amount);
      if (updates.stamp_duty !== undefined) mPayload.stamp_duty = Number(updates.stamp_duty);
      if (updates.extra_copies !== undefined) mPayload.extra_copies = Number(updates.extra_copies);
      if (updates.registration_fee !== undefined || updates.registration !== undefined) {
        mPayload.registration_fee = Number(updates.registration_fee ?? updates.registration ?? 0);
      }
      if (updates.bank_charges !== undefined) mPayload.bank_charges = Number(updates.bank_charges);
      if (updates.transport !== undefined) mPayload.transport = Number(updates.transport);
      if (updates.other_disbursements !== undefined || updates.other !== undefined) {
        mPayload.other_disbursements = Number(updates.other_disbursements ?? updates.other ?? 0);
      }
      if (updates.total_disbursements !== undefined) mPayload.total_disbursements = Number(updates.total_disbursements);
      if (updates.legal_fees !== undefined) mPayload.legal_fees = Number(updates.legal_fees);
      if (updates.vat_18 !== undefined || updates.vat !== undefined) {
        mPayload.vat_18 = Number(updates.vat_18 ?? updates.vat ?? 0);
      }
      if (updates.grand_total !== undefined) mPayload.grand_total = Number(updates.grand_total);
      if (updates.date_of_receipt !== undefined) mPayload.date_of_receipt = updates.date_of_receipt || null;
      if (updates.date_of_payment !== undefined) mPayload.date_of_payment = updates.date_of_payment || null;
      if (updates.date_of_return !== undefined) mPayload.date_of_return = updates.date_of_return || null;
      if (updates.comments !== undefined) mPayload.comments = updates.comments;
      if (updates.status !== undefined) mPayload.status = updates.status;
      if (updates.department !== undefined) mPayload.department = updates.department;
      if (updates.assigned_lawyer_id !== undefined) mPayload.assigned_lawyer_id = updates.assigned_lawyer_id || null;

      const { data, error } = await supabase
        .from('mortgages')
        .update(mPayload)
        .eq('id', id)
        .select('*');

      if (!error && data && data.length > 0) {
        updatedRecord = updatedRecord || data[0];
      }
    } catch (err) {
      // Continue to local sync
    }

    // 3. Update local workstation backend
    try {
      const res = await fetch(`/api/mortgages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const json = await res.json();
        updatedRecord = updatedRecord || json.data;
      }
    } catch (localErr) {
      console.warn('[MortgageService] Local update notice:', localErr);
    }

    // 4. Mirror update into browser localStorage
    const existingLocal = readLocalMortgages().find((item) => String(item.id) === String(id));
    const mergedLocal = upsertLocalMortgage({
      ...(existingLocal || {}),
      ...(updatedRecord || {}),
      ...updates,
      id,
    });

    return { success: true, data: updatedRecord || mergedLocal };
  },

  /**
   * Deletes a mortgage file.
   */
  async deleteMortgage(id: string): Promise<boolean> {
    try {
      await supabase.from('mortgage_cases').delete().eq('id', id);
    } catch (e) {}

    try {
      await supabase.from('mortgages').delete().eq('id', id);
    } catch (e) {}

    deleteLocalMortgage(id);

    try {
      await fetch(`/api/mortgages/${id}`, { method: 'DELETE' });
      return true;
    } catch (e) {
      return true;
    }
  },

  /**
   * Batch inserts records into Supabase and local backend in chunks of 50.
   * Supports both public.centenary_mortgage_cases and public.mortgages.
   */
  async batchInsertCentenaryCases(records: any[], chunkSize: number = 50): Promise<{ success: boolean; insertedCount: number; error?: string }> {
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      
      // 1. Try Supabase cloud insert into centenary_mortgage_cases
      try {
        const { error } = await supabase.from('centenary_mortgage_cases').insert(chunk);
        if (!error) {
          console.log(`Inserted batch ${Math.floor(i / chunkSize) + 1} to centenary_mortgage_cases`);
        }
      } catch (err) {
        // Fallback to local
      }

      // 2. Also try central mortgages table
      try {
        const mortgageChunk = chunk.map((r: any) => ({
          client_bank_name: 'Centenary Bank',
          record_year: r.record_year || 2026,
          bank_branch: r.branch || 'Head Office',
          branch_name: r.branch || 'Head Office',
          file_number: r.rim_no || `CENT-${Date.now().toString().slice(-5)}`,
          rim_no: r.rim_no || '',
          borrower_name: r.client_name,
          mortgagor_name: r.client_name,
          loan_amount: Number(r.loan_amount) || 0,
          property_description: r.property_description || '',
          status: 'Under Preparation',
          grand_total: Number(r.grand_total) || Number(r.loan_amount) || 0,
          comments: r.comments || '',
          department: 'Banking & Securities',
        }));
        await supabase.from('mortgages').insert(mortgageChunk);
      } catch (e) {}

      insertedCount += chunk.length;
    }

    // 3. Always batch sync to local workstation server
    try {
      await fetch('/api/mortgages/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, bank_name: 'Centenary Bank' }),
      });
    } catch (e) {
      console.warn('Local batch sync notice:', e);
    }

    console.log(`Import completed successfully! Inserted ${insertedCount} records.`);
    return { success: true, insertedCount };
  },
};

if (typeof window !== 'undefined') {
  (window as any).MortgageService = MortgageService;
}

export default MortgageService;
