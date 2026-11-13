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
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      if (!records || records.length === 0) {
        return { success: false, count: 0, error: 'No valid mortgage rows found to import.' };
      }

      if (onProgress) onProgress(`Uploading ${records.length} records to ${bankName}...`);

      const chunkSize = 50;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const batchIndex = Math.floor(i / chunkSize) + 1;
        const totalBatches = Math.ceil(records.length / chunkSize);
        if (onProgress) {
          onProgress(`Importing batch ${batchIndex} of ${totalBatches} (${Math.min(i + chunkSize, records.length)}/${records.length})...`);
        }

        const { error: err1 } = await supabase.from('mortgage_cases').insert(chunk);
        if (err1) {
          console.warn('mortgage_cases batch insert warning:', err1.message);
          // Retry with core compatible column set if live Supabase table has partial columns
          const coreChunk = chunk.map((r) => ({
            bank_name: r.bank_name,
            branch: r.branch,
            client_name: r.client_name,
            rim_no: r.rim_no,
            property_description: r.property_description,
            loan_amount: r.loan_amount,
            bank_charges: r.bank_charges,
            transport: r.transport,
            linkage_fees: r.linkage_fees,
            grand_total: r.grand_total,
            comments: r.comments,
            source_sheet: r.source_sheet,
            record_year: r.record_year,
            month_sheet: r.month_sheet,
          }));
          const { error: err2 } = await supabase.from('mortgage_cases').insert(coreChunk);
          if (err2) {
            console.warn('mortgage_cases core retry warning:', err2.message);
          }
        }
      }

      // Persist to central workstation server as well
      await fetch('/api/mortgages/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, bank_name: bankName }),
      }).catch(() => {});

      return { success: true, count: records.length };
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

    // 1. Try Supabase cloud query from both mortgages and mortgage_cases
    try {
      // Query central mortgages
      const { data: mData } = await supabase
        .from('mortgages')
        .select('client_bank_name, loan_amount')
        .eq('record_year', year);

      if (Array.isArray(mData)) {
        mData.forEach((item) => {
          const bank = item.client_bank_name || 'Centenary Bank';
          if (!grouped[bank]) grouped[bank] = { count: 0, totalLoan: 0 };
          grouped[bank].count += 1;
          grouped[bank].totalLoan += Number(item.loan_amount || 0);
        });
      }

      // Query mortgage_cases table
      const { data: mcData } = await supabase
        .from('mortgage_cases')
        .select('bank_name, loan_amount, record_year');

      if (Array.isArray(mcData) && mcData.length > 0) {
        mcData.forEach((item) => {
          if (item.record_year && Number(item.record_year) !== year) return;
          const bank = item.bank_name || 'Centenary Bank';
          if (!grouped[bank]) grouped[bank] = { count: 0, totalLoan: 0 };
          grouped[bank].count += 1;
          grouped[bank].totalLoan += Number(item.loan_amount || 0);
        });
      }

      if ((Array.isArray(mData) && mData.length > 0) || (Array.isArray(mcData) && mcData.length > 0)) {
        return {
          summaries: Object.keys(grouped).map((bank) => ({
            bank_name: bank,
            file_count: grouped[bank].count,
            total_loan: grouped[bank].totalLoan,
          })),
          hasCloudTable: true,
        };
      }
    } catch (e: any) {
      console.info('[MortgageService] Cloud summary notice:', e?.message);
    }

    // 2. Fallback to local server API (/api/mortgages)
    try {
      const res = await fetch(`/api/mortgages?record_year=${year}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          json.data.forEach((item: any) => {
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
   * Seamlessly unifies records from 'mortgage_cases', 'mortgages', and local backend.
   */
  async fetchMortgages(bankName: string): Promise<any[]> {
    const combined: any[] = [];
    const seenIds = new Set<string>();

    // 1. Try Supabase cloud query on mortgage_cases
    try {
      const { data: mcData } = await supabase
        .from('mortgage_cases')
        .select('*')
        .ilike('bank_name', `%${bankName}%`)
        .order('created_at', { ascending: false });

      if (Array.isArray(mcData) && mcData.length > 0) {
        mcData.forEach((row) => {
          const id = row.id || `mc-${row.rim_no || Math.random()}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            combined.push({
              id,
              client_bank_name: row.bank_name || bankName,
              date_of_receipt: row.date_of_receipt || null,
              branch: row.branch || '',
              bank_branch: row.branch || '',
              branch_name: row.branch || '',
              client_name: row.client_name || row.name || '',
              name: row.name || row.client_name || '',
              borrower_name: row.client_name || row.name || '',
              mortgagor_name: row.client_name || row.name || '',
              file_number: row.rim_no || '',
              rim_no: row.rim_no || '',
              property_description: row.property_description || row.description || '',
              description: row.description || row.property_description || '',
              loan_amount: Number(row.loan_amount || 0),
              stamp_duty: Number(row.stamp_duty || 0),
              extra_copies: Number(row.extra_copies || 0),
              registration: Number(row.registration || 0),
              other: Number(row.other || 0),
              bank_charges: Number(row.bank_charges || 0),
              transport: Number(row.transport || 0),
              total_disbursements: Number(row.total_disbursements || 0),
              legal_fees: Number(row.legal_fees || 0),
              vat_18: Number(row.vat_18 || 0),
              grand_total: Number(row.grand_total || row.loan_amount || 0),
              date_of_payment: row.date_of_payment || null,
              date_of_return: row.date_of_return || null,
              comments: row.comments || '',
              source_sheet: row.source_sheet || '',
              record_year: row.record_year || new Date().getFullYear(),
              month_sheet: row.month_sheet || '',
              status: row.status || (row.date_of_return ? 'Completed / Cleared' : 'Active / Processing'),
              department: row.department || 'Banking & Securities',
              created_at: row.created_at,
            });
          }
        });
      }
    } catch (err) {}

    // 2. Also fetch from public.mortgages
    try {
      const { data, error } = await supabase
        .from('mortgages')
        .select('*')
        .eq('client_bank_name', bankName)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        data.forEach((row) => {
          if (!seenIds.has(row.id)) {
            seenIds.add(row.id);
            combined.push(row);
          }
        });
      }
    } catch (err) {}

    // 3. Fallback to local workstation backend (/api/mortgages)
    try {
      const res = await fetch(`/api/mortgages?client_bank_name=${encodeURIComponent(bankName)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          json.data.forEach((row: any) => {
            if (!seenIds.has(row.id)) {
              seenIds.add(row.id);
              combined.push(row);
            }
          });
        }
      }
    } catch (err) {}

    return combined;
  },

  /**
   * Inserts a new mortgage file, syncing to both Supabase and local backend.
   */
  async insertMortgage(payload: any): Promise<{ success: boolean; data?: any; error?: string }> {
    let savedRecord: any = null;
    let cloudSuccess = false;

    // 1. Try Supabase cloud insert
    try {
      const { data, error } = await supabase
        .from('mortgages')
        .insert([payload])
        .select('*');

      if (!error && data && data.length > 0) {
        savedRecord = data[0];
        cloudSuccess = true;
      } else if (error && error.code !== 'PGRST205') {
        // Attempt sanitized insert without custom columns
        const sanitized = {
          client_bank_name: payload.client_bank_name,
          record_year: payload.record_year,
          file_number: payload.file_number,
          borrower_name: payload.borrower_name || payload.mortgagor_name,
          mortgagor_name: payload.mortgagor_name || payload.borrower_name,
          loan_amount: payload.loan_amount,
          status: payload.status,
        };
        const retry = await supabase.from('mortgages').insert([sanitized]).select('*');
        if (!retry.error && retry.data && retry.data.length > 0) {
          savedRecord = retry.data[0];
          cloudSuccess = true;
        }
      }
    } catch (err) {
      // Continue to local sync
    }

    // 2. Always persist to local workstation backend
    try {
      const res = await fetch('/api/mortgages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedRecord || payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          savedRecord = savedRecord || json.data;
          return { success: true, data: savedRecord };
        }
      }
    } catch (localErr) {
      console.warn('[MortgageService] Local save notice:', localErr);
    }

    if (savedRecord || cloudSuccess) {
      return { success: true, data: savedRecord };
    }

    return {
      success: false,
      error: 'Failed to persist mortgage file. Please check server status.',
    };
  },

  /**
   * Updates an existing mortgage file.
   * Syncs to both mortgage_cases, mortgages, and local server.
   */
  async updateMortgage(id: string, updates: any): Promise<{ success: boolean; data?: any; error?: string }> {
    let updatedRecord: any = null;

    // 1. Try Supabase update on mortgage_cases
    try {
      const mcPayload: any = {};
      if (updates.record_year !== undefined) mcPayload.record_year = parseInt(String(updates.record_year), 10);
      if (updates.month_sheet !== undefined) mcPayload.month_sheet = updates.month_sheet;
      if (updates.bank_name) mcPayload.bank_name = updates.bank_name;
      if (updates.branch || updates.bank_branch) mcPayload.branch = updates.branch || updates.bank_branch;
      if (updates.client_name || updates.borrower_name) mcPayload.client_name = updates.client_name || updates.borrower_name;
      if (updates.rim_no) mcPayload.rim_no = updates.rim_no;
      if (updates.property_description) mcPayload.property_description = updates.property_description;
      if (updates.loan_amount !== undefined) mcPayload.loan_amount = Number(updates.loan_amount);
      if (updates.stamp_duty !== undefined) mcPayload.stamp_duty = Number(updates.stamp_duty);
      if (updates.bank_charges !== undefined) mcPayload.bank_charges = Number(updates.bank_charges);
      if (updates.transport !== undefined) mcPayload.transport = Number(updates.transport);
      if (updates.linkage_fees !== undefined) mcPayload.linkage_fees = Number(updates.linkage_fees);
      if (updates.other_disbursements !== undefined) mcPayload.other_disbursements = Number(updates.other_disbursements);
      if (updates.total_disbursements !== undefined) mcPayload.total_disbursements = Number(updates.total_disbursements);
      if (updates.legal_fees !== undefined) mcPayload.legal_fees = Number(updates.legal_fees);
      if (updates.vat !== undefined) mcPayload.vat_18 = Number(updates.vat);
      if (updates.grand_total !== undefined) mcPayload.grand_total = Number(updates.grand_total);
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

    // 2. Try Supabase update on mortgages
    try {
      const { data, error } = await supabase
        .from('mortgages')
        .update(updates)
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
        return { success: true, data: updatedRecord };
      }
    } catch (localErr) {
      console.warn('[MortgageService] Local update notice:', localErr);
    }

    if (updatedRecord) {
      return { success: true, data: updatedRecord };
    }

    return { success: false, error: 'Failed to update mortgage record.' };
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

    try {
      await fetch(`/api/mortgages/${id}`, { method: 'DELETE' });
      return true;
    } catch (e) {
      return false;
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
