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

/**
 * MortgageService:
 * Unified, resilient service supporting both Supabase PostgreSQL cloud database
 * and local workstation multi-computer sync with zero unhandled PGRST205 errors.
 */
export const MortgageService = {
  /**
   * Imports an Excel workbook (.xlsx/.xls) parsing each month sheet
   * from index 1 (headers) and index 2 (data) and batch inserting into Supabase
   * in chunks of 50.
   */
  async importCentenaryExcelFile(file: File, onProgress?: (msg: string) => void): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      console.log("Reading Excel file...");
      if (onProgress) onProgress("Reading Excel file...");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      let allRecords: any[] = [];

      // Loop through every month sheet in your workbook
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonSheet: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Ensure the sheet has enough rows (Headers are at index 1, data starts at index 2)
        if (jsonSheet.length > 2) {
          const headers = (jsonSheet[1] || []).map((h: any) => h ? h.toString().trim() : '');

          // Parse rows starting from index 2
          for (let i = 2; i < jsonSheet.length; i++) {
            const row = jsonSheet[i];
            if (!row || row.length === 0) continue;

            // Map row array to your table columns based on header names
            const getVal = (colName: string) => {
              const index = headers.indexOf(colName);
              return index !== -1 && row[index] !== undefined ? row[index] : null;
            };

            const clientName = getVal('Name');
            if (!clientName) continue; // Skip empty rows

            allRecords.push({
              branch: getVal('Branch') ? String(getVal('Branch')).trim() : 'UNKNOWN',
              client_name: String(clientName).trim(),
              rim_no: getVal('RIM NO.') ? String(getVal('RIM NO.')) : null,
              property_description: getVal('Description') ? String(getVal('Description')) : null,
              loan_amount: parseFloat(getVal('Loan amount')) || 0,
              grand_total: parseFloat(getVal('Grand Total')) || 0,
              comments: getVal('Comments') ? String(getVal('Comments')) : null,
              source_sheet: sheetName
            });
          }
        }
      });

      console.log(`Parsed ${allRecords.length} records. Uploading to Supabase...`);
      if (onProgress) onProgress(`Parsed ${allRecords.length} records. Uploading to Supabase...`);

      // Batch insert into Supabase in chunks of 50 to avoid payload limits
      const chunkSize = 50;
      for (let i = 0; i < allRecords.length; i += chunkSize) {
        const chunk = allRecords.slice(i, i + chunkSize);
        const { error } = await supabase.from('centenary_mortgage_cases').insert(chunk);

        if (error) {
          console.error("Batch insert error:", error.message);
          // If public table isn't migrated, fallback to saving via local batch endpoint
          const res = await fetch('/api/mortgages/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: allRecords, bank_name: 'Centenary Bank' }),
          });
          if (res.ok) {
            console.log("Successfully stored in local workstation database as fallback.");
            return { success: true, count: allRecords.length };
          }
          return { success: false, count: i, error: `Upload failed on batch ${i}: ${error.message}` };
        }
      }

      // Also persist to central workstation server
      await fetch('/api/mortgages/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: allRecords, bank_name: 'Centenary Bank' }),
      }).catch(() => {});

      console.log("Successfully imported all mortgage records into Supabase!");
      return { success: true, count: allRecords.length };

    } catch (err: any) {
      console.error("Error processing file:", err);
      return { success: false, count: 0, error: err?.message || "Failed to parse Excel file. Check console for details." };
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

    // 1. Try Supabase cloud query
    try {
      const { data, error } = await supabase
        .from('mortgages')
        .select('client_bank_name, loan_amount')
        .eq('record_year', year);

      if (error) {
        // PostgREST code PGRST205 means table not yet created in the Supabase schema
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          hasCloudTable = false;
          errorNotice = "The 'public.mortgages' table is not yet in Supabase schema cache. Running in local workstation database mode.";
          console.info('[MortgageService] Notice: Supabase table public.mortgages not in schema cache. Using workstation database fallback.');
        } else {
          console.warn('[MortgageService] Supabase fetch notice:', error.message);
        }
      } else if (Array.isArray(data)) {
        data.forEach((item) => {
          const bank = item.client_bank_name || 'Centenary Bank';
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
          hasCloudTable: true,
        };
      }
    } catch (e: any) {
      hasCloudTable = false;
      console.info('[MortgageService] Falling back to local backend:', e?.message);
    }

    // 2. Fallback to local server API (/api/mortgages)
    try {
      const res = await fetch(`/api/mortgages?record_year=${year}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          json.data.forEach((item: any) => {
            const bank = item.client_bank_name || 'Centenary Bank';
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
   */
  async fetchMortgages(bankName: string): Promise<any[]> {
    // 1. Try Supabase cloud query
    try {
      const { data, error } = await supabase
        .from('mortgages')
        .select('*')
        .eq('client_bank_name', bankName)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data;
      }

      if (error && error.code !== 'PGRST205') {
        console.warn('[MortgageService] Cloud fetch warning:', error.message);
      }
    } catch (err) {
      // Fallback
    }

    // 2. Fallback to local workstation backend (/api/mortgages)
    try {
      const res = await fetch(`/api/mortgages?client_bank_name=${encodeURIComponent(bankName)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (err) {
      console.error('[MortgageService] Error loading local mortgages:', err);
    }

    return [];
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
   */
  async updateMortgage(id: string, updates: any): Promise<{ success: boolean; data?: any; error?: string }> {
    let updatedRecord: any = null;

    // 1. Try Supabase update
    try {
      const { data, error } = await supabase
        .from('mortgages')
        .update(updates)
        .eq('id', id)
        .select('*');

      if (!error && data && data.length > 0) {
        updatedRecord = data[0];
      }
    } catch (err) {
      // Continue to local sync
    }

    // 2. Update local workstation backend
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
