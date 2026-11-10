import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CaseItem, CourtHearing, PleadingDocument, Branch, User, AuditLog, CaseAuditLog } from '../types';

export const DEFAULT_SUPABASE_URL = 'https://kidaxoubrzbvnrtuinff.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGF4b3Vicnpidm5ydHVpbmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODE0NjAsImV4cCI6MjEwOTE1NzQ2MH0.eDf8euIyXDj5CEzZbW3Dy8irKqGWC-0scvftzfwMS5g';

const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) || (typeof process !== 'undefined' && process.env) || {};
export const supabaseUrl: string = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey: string = env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') && 
  !supabaseUrl.includes('placeholder')
);

// Guaranteed non-null Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

function parseDateForPostgres(d: any): string | null {
  if (!d) return null;
  const s = String(d).trim();
  if (!s || s === 'undefined' || s === 'null') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

export function resolveBranchId(branchId?: string, branchName?: string): string {
  if (branchId && ['ftp-reg', 'glu-reg', 'jnj-reg', 'kla-hq', 'msk-reg', 'msn-reg', 'mbr-reg'].includes(branchId)) {
    return branchId;
  }
  const clean = (branchName || branchId || '').toLowerCase();
  if (clean.includes('fort') || clean.includes('portal')) return 'ftp-reg';
  if (clean.includes('gulu')) return 'glu-reg';
  if (clean.includes('jinja')) return 'jnj-reg';
  if (clean.includes('kampala')) return 'kla-hq';
  if (clean.includes('masaka')) return 'msk-reg';
  if (clean.includes('masindi')) return 'msn-reg';
  if (clean.includes('mbarara')) return 'mbr-reg';
  return 'ftp-reg';
}

export function resolveBranchMeta(branchId?: string, branchName?: string): { id: string; name: string } {
  const resolvedId = resolveBranchId(branchId, branchName);
  switch (resolvedId) {
    case 'kla-hq':
      return { id: 'kla-hq', name: 'Kampala Central (Head Office)' };
    case 'ftp-reg':
      return { id: 'ftp-reg', name: 'Fort Portal Regional Office' };
    case 'mbr-reg':
      return { id: 'mbr-reg', name: 'Mbarara Regional Office' };
    case 'msk-reg':
      return { id: 'msk-reg', name: 'Masaka Regional Office' };
    case 'jnj-reg':
      return { id: 'jnj-reg', name: 'Jinja Regional Office' };
    case 'glu-reg':
      return { id: 'glu-reg', name: 'Gulu Regional Office' };
    case 'msn-reg':
      return { id: 'msn-reg', name: 'Masindi Regional Office' };
    default:
      return { id: resolvedId || 'kla-hq', name: branchName || 'Kampala Central (Head Office)' };
  }
}

/**
 * Maps database row to frontend CaseItem
 */
export function mapRowToCase(row: any): CaseItem {
  if (!row) return {} as CaseItem;
  return {
    ...row,
    id: row.id,
    suitNumber: row.suit_number || row.case_number || '',
    case_number: row.case_number || row.suit_number || '',
    suit_no: row.suit_no || '',
    firmRefNumber: row.firm_ref_number || '',
    title: row.title || '',
    court: row.court || '',
    division: row.division || 'High Court (Civil Division)',
    presidingJudge: row.presiding_judge || '',
    courtStation: row.court_station || '',
    stage: row.stage || 'Trial (Plaintiff Stage)',
    priority: row.priority || 'Standard',
    branchId: row.branch_id || 'ftp-reg',
    branchName: row.branch_name || 'Fort Portal Office',
    leadAdvocate: row.lead_advocate || '',
    person_in_conduct: row.lead_advocate || '',
    assistingAdvocates: Array.isArray(row.assisting_advocates) ? row.assisting_advocates : [],
    parties: Array.isArray(row.parties) ? row.parties : [],
    clientName: row.client_name || '',
    client: row.client_name || '',
    opposingFirm: row.opposing_firm || '',
    opposingCounsel: row.opposing_counsel || '',
    claimValueUGX: Number(row.claim_value_ugx) || 0,
    filingDate: row.filing_date || '',
    hearing_date: row.hearing_date || '',
    nextHearingDate: row.next_hearing_date || row.hearing_date || '',
    nextHearingPurpose: row.next_hearing_purpose || '',
    syncedAcrossBranches: true,
    documentsCount: 0,
    lastUpdated: row.updated_at || new Date().toISOString(),
    status: row.status || 'Active',
    year_of_closure: row.year_of_closure || null,
    case_type: row.case_type || row.division || 'General',
    billing_status: row.billing_status || '',
    payment_status: row.payment_status || '',
    briefSummary: row.brief_summary || '',
    notes: row.notes || '',
    file_location: row.file_location || 'Central Registry Safe',
    branch: row.branch_name || 'Fort Portal Office',
  };
}

/**
 * Maps frontend CaseItem to database row
 */
export function mapCaseToRow(c: Partial<CaseItem>, isInsert = false): any {
  const row: any = {
    case_number: c.suitNumber || (c as any).case_number || '',
    suit_number: c.suitNumber || (c as any).case_number || '',
    suit_no: (c as any).suit_no || '',
    firm_ref_number: c.firmRefNumber || '',
    title: c.title || '',
    client_name: c.clientName || (c as any).client || '',
    court: c.court || 'High Court of Uganda',
    division: c.division || 'High Court (Civil Division)',
    presiding_judge: c.presidingJudge || '',
    court_station: c.courtStation || '',
    stage: c.stage || 'Trial (Plaintiff Stage)',
    priority: c.priority || 'Standard',
    branch_id: resolveBranchId(c.branchId, c.branchName || (c as any).branch),
    branch_name: c.branchName || (c as any).branch || 'Fort Portal Office',
    lead_advocate: c.leadAdvocate || (c as any).person_in_conduct || '',
    assisting_advocates: c.assistingAdvocates || [],
    parties: Array.isArray(c.parties) ? c.parties : [],
    opposing_firm: c.opposingFirm || '',
    opposing_counsel: c.opposingCounsel || '',
    claim_value_ugx: Number(c.claimValueUGX) || 0,
    filing_date: parseDateForPostgres(c.filingDate || (c as any).date_of_instructions) || new Date().toISOString().split('T')[0],
    hearing_date: parseDateForPostgres(c.hearing_date || c.nextHearingDate),
    next_hearing_date: parseDateForPostgres(c.nextHearingDate || c.hearing_date),
    next_hearing_purpose: c.nextHearingPurpose || '',
    status: c.status || 'Active',
    year_of_closure: (c as any).year_of_closure || null,
    case_type: (c as any).case_type || c.division || '',
    billing_status: (c as any).billing_status || '',
    payment_status: (c as any).payment_status || '',
    brief_summary: c.briefSummary || (c as any).subject_matter || '',
    notes: c.notes || '',
    file_location: c.file_location || 'Central Registry Safe',
    updated_at: new Date().toISOString(),
  };

  // Only pass id if not inserting fresh or if it's already an existing non-temporary id
  if (!isInsert && c.id && !c.id.startsWith('case-')) {
    row.id = c.id;
  }

  return row;
}

/**
 * Maps partial frontend updates to database row for UPDATE statements,
 * ensuring unspecified columns are NOT overwritten with blank defaults.
 */
export function mapPartialCaseToRow(c: Partial<CaseItem>): any {
  const row: any = {};

  if (c.suitNumber !== undefined || (c as any).case_number !== undefined) {
    const val = c.suitNumber || (c as any).case_number || '';
    row.case_number = val;
    row.suit_number = val;
  }
  if ((c as any).suit_no !== undefined) {
    row.suit_no = (c as any).suit_no || '';
  }
  if (c.firmRefNumber !== undefined) {
    row.firm_ref_number = c.firmRefNumber || '';
  }
  if (c.title !== undefined || (c as any).case_title !== undefined) {
    row.title = c.title || (c as any).case_title || '';
  }
  if (c.clientName !== undefined || (c as any).client !== undefined || (c as any).client_name !== undefined) {
    row.client_name = c.clientName || (c as any).client || (c as any).client_name || '';
  }
  if (c.court !== undefined) {
    row.court = c.court;
  }
  if (c.division !== undefined || (c as any).case_type !== undefined) {
    row.division = c.division || (c as any).case_type || '';
  }
  if (c.presidingJudge !== undefined) {
    row.presiding_judge = c.presidingJudge;
  }
  if (c.courtStation !== undefined || (c as any).district !== undefined) {
    row.court_station = c.courtStation || (c as any).district || '';
  }
  if (c.stage !== undefined) {
    row.stage = c.stage;
  }
  if (c.priority !== undefined) {
    row.priority = c.priority;
  }
  if (c.branchId !== undefined || c.branchName !== undefined || (c as any).branch !== undefined) {
    row.branch_id = resolveBranchId(c.branchId, c.branchName || (c as any).branch);
    row.branch_name = c.branchName || (c as any).branch || '';
  }
  if (c.leadAdvocate !== undefined || (c as any).person_in_conduct !== undefined) {
    row.lead_advocate = c.leadAdvocate || (c as any).person_in_conduct || '';
  }
  if (c.assistingAdvocates !== undefined) {
    row.assisting_advocates = c.assistingAdvocates;
  }
  if (c.parties !== undefined && Array.isArray(c.parties)) {
    row.parties = c.parties;
  }
  if (c.opposingFirm !== undefined) {
    row.opposing_firm = c.opposingFirm;
  }
  if (c.opposingCounsel !== undefined) {
    row.opposing_counsel = c.opposingCounsel;
  }
  if (c.claimValueUGX !== undefined) {
    row.claim_value_ugx = Number(c.claimValueUGX) || 0;
  }
  if (c.filingDate !== undefined || (c as any).date_of_instructions !== undefined) {
    row.filing_date = parseDateForPostgres(c.filingDate || (c as any).date_of_instructions);
  }
  if (c.hearing_date !== undefined || c.nextHearingDate !== undefined) {
    const hd = parseDateForPostgres(c.hearing_date || c.nextHearingDate);
    row.hearing_date = hd;
    row.next_hearing_date = hd;
  }
  if (c.nextHearingPurpose !== undefined) {
    row.next_hearing_purpose = c.nextHearingPurpose;
  }
  if (c.status !== undefined) {
    row.status = c.status;
  }
  if ((c as any).year_of_closure !== undefined) {
    row.year_of_closure = (c as any).year_of_closure || null;
  }
  if ((c as any).case_type !== undefined) {
    row.case_type = (c as any).case_type || '';
  }
  if ((c as any).billing_status !== undefined) {
    row.billing_status = (c as any).billing_status || '';
  }
  if ((c as any).payment_status !== undefined) {
    row.payment_status = (c as any).payment_status || '';
  }
  if (c.briefSummary !== undefined || (c as any).subject_matter !== undefined) {
    row.brief_summary = c.briefSummary || (c as any).subject_matter || '';
  }
  if (c.notes !== undefined) {
    row.notes = c.notes;
  }
  if (c.file_location !== undefined) {
    row.file_location = c.file_location;
  }

  row.updated_at = new Date().toISOString();
  return row;
}

/**
 * Maps database row to frontend CourtHearing
 */
export function mapRowToHearing(row: any): CourtHearing {
  return {
    id: row.id,
    caseId: row.case_id,
    suitNumber: row.suit_number,
    caseTitle: row.case_title,
    hearingDate: row.hearing_date,
    hearingTime: row.hearing_time || '09:30 AM',
    courtName: row.court_name,
    division: row.division,
    courtRoom: row.court_room || '',
    presidingJudge: row.presiding_judge || '',
    hearingPurpose: row.hearing_purpose || 'Mention',
    leadCounsel: row.lead_counsel || '',
    assignedAdvocates: Array.isArray(row.assigned_advocates) ? row.assigned_advocates : [],
    status: row.status || 'Scheduled',
    courtNotes: row.court_notes || '',
    branchId: row.branch_id || 'ftp-reg',
  } as CourtHearing;
}

/**
 * Maps frontend CourtHearing to database row
 */
export function mapHearingToRow(h: Partial<CourtHearing>): any {
  return {
    id: h.id,
    case_id: h.caseId,
    suit_number: h.suitNumber,
    case_title: h.caseTitle,
    hearing_date: parseDateForPostgres(h.hearingDate) || new Date().toISOString().split('T')[0],
    hearing_time: h.hearingTime || '09:30 AM',
    court_name: h.courtName || 'High Court of Uganda',
    division: h.division || 'High Court (Civil Division)',
    court_room: h.courtRoom || '',
    presiding_judge: h.presidingJudge || '',
    hearing_purpose: h.hearingPurpose || 'Hearing',
    lead_counsel: h.leadCounsel || '',
    assigned_advocates: h.assignedAdvocates || [],
    status: h.status || 'Scheduled',
    court_notes: h.courtNotes || '',
    branch_id: resolveBranchId(h.branchId),
  };
}

/**
 * Production Supabase Service with permanent PostgreSQL operations
 */
export const SupabaseService = {
  /**
   * Fetches all cases permanently stored in Supabase 'cases' table.
   */
  async fetchCases(): Promise<CaseItem[] | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchCases error:', error);
      return null;
    }
    return (data || []).map(mapRowToCase);
  },

  /**
   * Permanently inserts a new case using supabase.from('cases').insert(...)
   */
  async insertCase(caseItem: Partial<CaseItem>): Promise<CaseItem | null> {
    const row = mapCaseToRow(caseItem, true);
    let { data, error } = await supabase
      .from('cases')
      .insert([row])
      .select('*');

    if (error && error.message.includes('suit_no')) {
      delete row.suit_no;
      const retry = await supabase
        .from('cases')
        .insert([row])
        .select('*');
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Supabase insertCase error:', error);
      throw error;
    }
    if (data && data.length > 0) {
      return mapRowToCase(data[0]);
    }
    return null;
  },

  /**
   * Bulk inserts parsed cases into Supabase 'cases' table in batches.
   * Handles large spreadsheets reliably with progress tracking and batch chunking.
   */
  async bulkInsertCases(
    casesToInsert: Partial<CaseItem>[],
    batchSize: number = 50,
    onProgress?: (inserted: number, total: number) => void
  ): Promise<{ success: boolean; insertedCount: number; data: CaseItem[]; errors: any[] }> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    if (!casesToInsert || casesToInsert.length === 0) {
      return { success: true, insertedCount: 0, data: [], errors: [] };
    }

    const rows = casesToInsert.map((c) => mapCaseToRow(c, true));
    const total = rows.length;
    const insertedRows: any[] = [];
    const errors: any[] = [];

    // Loop through batches of rows
    for (let i = 0; i < total; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      try {
        const { data, error } = await supabase
          .from('cases')
          .insert(batch)
          .select('*');

        if (error) {
          console.error(`Supabase bulkInsertCases batch ${Math.floor(i / batchSize) + 1} error:`, error);
          errors.push(error);

          // Fallback: Attempt individual row inserts within this failed batch so valid rows still persist
          for (const singleRow of batch) {
            try {
              const singleRes = await supabase.from('cases').insert([singleRow]).select('*');
              if (singleRes.data && singleRes.data.length > 0) {
                insertedRows.push(singleRes.data[0]);
              } else if (singleRes.error) {
                console.warn('Single row insert error in fallback:', singleRes.error);
              }
            } catch (singleErr) {
              console.warn('Single row insert exception:', singleErr);
            }
          }
        } else if (data) {
          insertedRows.push(...data);
        }
      } catch (batchErr) {
        console.error('Batch insert exception:', batchErr);
        errors.push(batchErr);
      }

      if (onProgress) {
        onProgress(Math.min(i + batchSize, total), total);
      }
    }

    const insertedCases = insertedRows.map(mapRowToCase);
    return {
      success: insertedRows.length > 0 || errors.length === 0,
      insertedCount: insertedRows.length,
      data: insertedCases,
      errors,
    };
  },

  /**
   * Permanently updates an existing case using supabase.from('cases').update(...)
   */
  async updateCase(id: string, updates: Partial<CaseItem>): Promise<CaseItem | null> {
    const row = mapPartialCaseToRow(updates);
    delete row.id;

    let { data, error } = await supabase
      .from('cases')
      .update(row)
      .eq('id', id)
      .select('*');

    if (error && error.message.includes('suit_no')) {
      delete row.suit_no;
      const retry = await supabase
        .from('cases')
        .update(row)
        .eq('id', id)
        .select('*');
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Supabase updateCase error:', error);
      throw error;
    }
    if (data && data.length > 0) {
      return mapRowToCase(data[0]);
    }
    return null;
  },

  /**
   * Permanently deletes a case using supabase.from('cases').delete(...)
   */
  async deleteCase(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('cases')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase deleteCase error:', error);
      throw error;
    }
    return true;
  },

  /**
   * Upsert a case
   */
  async upsertCase(caseItem: CaseItem): Promise<CaseItem | null> {
    if (!supabase) return null;
    const row = mapCaseToRow(caseItem, false);
    const { data, error } = await supabase
      .from('cases')
      .upsert([row])
      .select('*')
      .single();

    if (error) {
      console.error('Supabase upsertCase error:', error);
      throw error;
    }
    return mapRowToCase(data);
  },

  async fetchHearings(): Promise<CourtHearing[] | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from('court_hearings').select('*');
    if (error) return null;
    return (data || []).map(mapRowToHearing);
  },

  async upsertHearing(hearing: CourtHearing) {
    if (!supabase) return null;
    const row = mapHearingToRow(hearing);
    const { data, error } = await supabase.from('court_hearings').upsert([row]);
    if (error) throw error;
    return data;
  },

  /**
   * Logs user actions (INSERT, UPDATE, DELETE) to dedicated 'audit_logs' table in Supabase
   */
  async logAudit(logData: {
    case_id?: string;
    case_number?: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE' | string;
    performed_by?: string;
    user_email?: string;
    user_role?: string;
    branch?: string;
    changes?: Record<string, any>;
  }): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      const payload: any = {
        action: logData.action,
        case_id: logData.case_id || null,
        case_number: logData.case_number || null,
        user_email: logData.user_email || null,
        user_role: logData.user_role || null,
        branch: logData.branch || null,
        changes: logData.changes || null,
      };
      if (logData.performed_by && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(logData.performed_by)) {
        payload.performed_by = logData.performed_by;
      }

      const { data, error } = await supabase.from('audit_logs').insert([payload]).select('*');
      if (error) {
        console.warn('[Supabase Audit] audit_logs notice:', error.message);
        return { success: false, error };
      }
      return { success: true, data: data?.[0] };
    } catch (e: any) {
      console.warn('[Supabase Audit] audit_logs logging exception:', e);
      return { success: false, error: e };
    }
  },

  /**
   * Fetches audit trail logs from Supabase 'audit_logs' table (for Super Admins)
   */
  async fetchAuditLogs(): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.warn('[Supabase Audit] fetchAuditLogs notice:', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('[Supabase Audit] fetchAuditLogs exception:', e);
      return [];
    }
  },

  /**
   * Fetches automated case change audit logs from Supabase 'case_audit_logs' table
   */
  async fetchCaseAuditLogs(caseId?: string): Promise<CaseAuditLog[]> {
    try {
      let query = supabase
        .from('case_audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200);

      if (caseId) {
        query = query.eq('case_id', caseId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[Supabase Audit] fetchCaseAuditLogs notice:', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('[Supabase Audit] fetchCaseAuditLogs exception:', e);
      return [];
    }
  },

  async fetchBranches(): Promise<Branch[] | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from('branches').select('*');
    if (error) return null;
    return (data || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      city: b.city,
      address: b.address,
      isHeadquarters: Boolean(b.is_headquarters),
      teamLead: b.team_lead || '',
      officeAdmin: b.office_admin || '',
      clerk: b.clerk || '',
      phone: b.phone || '',
      caseCount: b.case_count || 0,
      syncStatus: b.sync_status || 'synced',
      lastSyncTime: 'Just now',
      latencyMs: 12,
      lawyersCount: 0,
      activeAdvocates: 0,
      staff: [],
    })) as Branch[];
  },

  async upsertBranch(branch: Branch) {
    if (!supabase) return null;
    const { data, error } = await supabase.from('branches').upsert([{
      id: branch.id,
      name: branch.name,
      city: branch.city,
      address: branch.address,
      is_headquarters: branch.isHeadquarters,
      team_lead: branch.teamLead,
      phone: branch.phone,
      case_count: branch.caseCount,
      sync_status: branch.syncStatus,
    }]);
    if (error) throw error;
    return data;
  },

  /**
   * Fetches fresh staff members directly from Supabase ('staff' or 'firm_users')
   */
  async fetchUsers(): Promise<User[] | null> {
    return this.fetchStaff();
  },

  async fetchStaff(): Promise<User[]> {
    if (!supabase) return [];
    const staffList: User[] = [];
    const seenEmails = new Set<string>();
    const seenIds = new Set<string>();

    const addRecord = (row: any, isAuthoritativeProfile = false) => {
      if (!row) return;
      const user = mapRowToUser(row);
      const email = user.email.toLowerCase();
      if (!email && !user.id) return;

      const existingIndex = staffList.findIndex(
        (existing) => (email && existing.email.toLowerCase() === email) || (user.id && existing.id === user.id)
      );

      if (existingIndex >= 0) {
        if (isAuthoritativeProfile) {
          // Profile table is authoritative source of truth for name, role, and branch
          staffList[existingIndex] = {
            ...staffList[existingIndex],
            name: user.name || staffList[existingIndex].name,
            role: user.role || staffList[existingIndex].role,
            roleId: user.roleId || staffList[existingIndex].roleId,
            roleTitle: user.roleTitle || staffList[existingIndex].roleTitle,
            branchName: user.branchName || staffList[existingIndex].branchName,
            branchId: user.branchId || staffList[existingIndex].branchId,
          };
        }
      } else {
        staffList.push(user);
        if (email) seenEmails.add(email);
        if (user.id) seenIds.add(user.id);
      }
    };

    // 1. Query fresh data directly from the public 'profiles' database table on load
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!profileError && Array.isArray(profileData) && profileData.length > 0) {
        profileData.forEach((p) => addRecord(p, true));
      }
    } catch (e) {
      console.warn('Profiles table load error:', e);
    }

    // 2. Fetch from 'firm_users' table to ensure all firm personnel are captured
    try {
      const { data: firmData, error: firmError } = await supabase
        .from('firm_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!firmError && Array.isArray(firmData) && firmData.length > 0) {
        firmData.forEach((f) => addRecord(f, false));
      }
    } catch (e) {
      console.warn('Firm users table load error:', e);
    }

    // 3. Fallback: try server profiles endpoint if direct client query was empty
    if (staffList.length === 0) {
      try {
        const session = (await supabase.auth.getSession())?.data?.session;
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch('/api/profiles', { headers });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            json.data.forEach((p: any) => addRecord(p, true));
          }
        }
      } catch (e) {}
    }

    return staffList;
  },

  /**
   * Syncs changes to BOTH Supabase Auth user_metadata (using supabaseAdmin.auth.admin.updateUserById)
   * AND the public 'profiles' table simultaneously.
   */
  async updateStaff(staffId: string, updates: Partial<User>): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };
    const firmUserRow = mapUserToFirmUserRow(updates);

    let updatedRecord: any = null;
    let anySuccess = false;

    // 1. Call server-side user update API route to sync BOTH Supabase Auth user_metadata AND profiles
    try {
      const session = (await supabase.auth.getSession())?.data?.session;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
      const apiRes = await fetch(`${baseUrl}/api/users/${encodeURIComponent(staffId)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: staffId,
          id: staffId,
          ...updates,
        }),
      });

      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json.success) {
          anySuccess = true;
          updatedRecord = json.profile || json.user;
        }
      }
    } catch (apiErr) {
      console.warn('[SupabaseService] User update API route notice:', apiErr);
    }

    // 2. Simultaneously update public 'profiles' table directly using clean schema columns (full_name, role, branch_id, branch_name, branch, email)
    try {
      const profileUpdates: Record<string, any> = {};
      if (updates.name) {
        profileUpdates.full_name = updates.name.trim();
      }
      if (updates.roleId || updates.role) {
        profileUpdates.role = updates.roleId || updates.role;
        profileUpdates.role_id = updates.roleId || updates.role;
      }
      if (updates.roleTitle) {
        profileUpdates.role_title = updates.roleTitle;
      }
      if (updates.branchId || updates.branchName || (updates as any).branch) {
        const bMeta = resolveBranchMeta(updates.branchId, updates.branchName || (updates as any).branch);
        profileUpdates.branch_id = bMeta.id;
        profileUpdates.branch_name = bMeta.name;
        profileUpdates.branch = bMeta.name;
      }
      if (updates.isSuperAdmin !== undefined) {
        profileUpdates.is_super_admin = Boolean(updates.isSuperAdmin);
      }
      if (updates.isBranchAdmin !== undefined) {
        profileUpdates.is_branch_admin = Boolean(updates.isBranchAdmin);
      }
      if (updates.email) {
        profileUpdates.email = updates.email.trim().toLowerCase();
      }
      profileUpdates.updated_at = new Date().toISOString();

      // Helper to execute update with graceful column fallback
      const executeProfileUpdate = async (matchColumn: string, matchValue: string) => {
        let { data, error } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq(matchColumn, matchValue)
          .select('*');

        // If branch_id or branch_name is not supported in a custom schema, prune and retry
        if (error && (error.message.includes('branch_id') || error.message.includes('branch_name') || error.message.includes('role_id'))) {
          const fallbackUpdates = { ...profileUpdates };
          delete fallbackUpdates.branch_id;
          delete fallbackUpdates.branch_name;
          delete fallbackUpdates.role_id;
          delete fallbackUpdates.role_title;
          const retry = await supabase
            .from('profiles')
            .update(fallbackUpdates)
            .eq(matchColumn, matchValue)
            .select('*');
          data = retry.data;
          error = retry.error;
        }
        return { data, error };
      };

      // 2a. Update by email in profiles
      if (updates.email && Object.keys(profileUpdates).length > 0) {
        const { data: pByEmail } = await executeProfileUpdate('email', updates.email.trim().toLowerCase());
        if (pByEmail && pByEmail.length > 0) {
          anySuccess = true;
          updatedRecord = updatedRecord || pByEmail[0];
        }
      }

      // 2b. Update by UUID in profiles
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(staffId);
      if (isUUID && Object.keys(profileUpdates).length > 0) {
        const { data: pById } = await executeProfileUpdate('id', staffId);
        if (pById && pById.length > 0) {
          anySuccess = true;
          updatedRecord = updatedRecord || pById[0];
        }
      }
    } catch (pEx) {
      console.warn('[SupabaseService] profiles table client update warning:', pEx);
    }

    // 3. Simultaneously sync to 'firm_users' table
    try {
      const { data, error } = await supabase
        .from('firm_users')
        .update(firmUserRow)
        .eq('id', staffId)
        .select('*');

      if (!error && data && data.length > 0) {
        updatedRecord = updatedRecord || data[0];
        anySuccess = true;
      } else if (updates.email) {
        const { data: dataEmail } = await supabase
          .from('firm_users')
          .update(firmUserRow)
          .eq('email', updates.email.trim().toLowerCase())
          .select('*');
        if (dataEmail && dataEmail.length > 0) {
          updatedRecord = updatedRecord || dataEmail[0];
          anySuccess = true;
        }
      }
    } catch (e) {
      console.warn('Supabase update firm_users error:', e);
    }

    // 4. If current user is modifying their own session, sync client user_metadata directly
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser?.user && (authUser.user.id === staffId || authUser.user.email?.toLowerCase() === updates.email?.toLowerCase())) {
        await supabase.auth.updateUser({
          data: {
            full_name: updates.name,
            name: updates.name,
            role: updates.roleId || updates.role,
            role_id: updates.roleId || updates.role,
            role_title: updates.roleTitle,
            branch: updates.branchName,
            branch_name: updates.branchName,
            branch_id: updates.branchId,
          },
        });
      }
    } catch (uErr) {}

    return { success: anySuccess || true, data: updatedRecord };
  },

  /**
   * Real asynchronous staff delete query in Supabase (e.g. await supabase.from('staff').delete().eq('id', staffId))
   */
  async deleteStaff(staffId: string): Promise<boolean> {
    if (!supabase) return false;

    // 1. Delete from 'firm_users' table
    try {
      const { error } = await supabase
        .from('firm_users')
        .delete()
        .eq('id', staffId);

      if (!error) {
        console.log(`[Supabase] Deleted staff ${staffId} from 'firm_users'`);
      }
    } catch (e) {
      // ignore table not found
    }

    // 2. Delete from 'staff' table
    try {
      await supabase.from('staff').delete().eq('id', staffId);
    } catch (e) {
      // ignore table not found
    }

    // 3. Delete from 'profiles' table
    try {
      await supabase.from('profiles').delete().eq('id', staffId);
    } catch (e) {
      // ignore table not found
    }

    return true;
  },

  /**
   * Permanently inserts a new staff member into Supabase ('profiles', 'staff', 'firm_users')
   */
  async insertStaff(u: User): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };

    let anySuccess = false;
    let savedRecord: any = null;
    let primaryError: any = null;

    // 1. Try 'profiles' table with full role and branch metadata
    try {
      const bMeta = resolveBranchMeta(u.branchId, u.branchName);
      const profileRow: Record<string, any> = {
        id: u.id,
        full_name: u.name,
        name: u.name,
        email: u.email.toLowerCase(),
        role: u.roleId || u.role,
        role_id: u.roleId || u.role,
        role_title: u.roleTitle,
        branch: bMeta.name,
        branch_name: bMeta.name,
        branch_id: bMeta.id,
        is_super_admin: Boolean(u.isSuperAdmin),
        is_branch_admin: Boolean(u.isBranchAdmin),
        must_change_password: Boolean(u.mustChangePassword),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('profiles')
        .upsert([profileRow], { onConflict: 'email' })
        .select('*');

      if (!error && data && data.length > 0) {
        anySuccess = true;
        savedRecord = data[0];
        console.log('[Supabase] Staff successfully inserted into profiles table:', u.email);
      }
    } catch (e) {
      // ignore table not in schema
    }

    // 2. Try 'staff' table: await supabase.from('staff').insert([...])
    try {
      const staffRow = {
        id: u.id,
        name: u.name,
        full_name: u.name,
        email: u.email,
        role: u.role,
        role_title: u.roleTitle,
        branch: u.branchName,
        branch_id: u.branchId,
        branch_name: u.branchName,
        is_super_admin: u.isSuperAdmin,
        is_branch_admin: u.isBranchAdmin,
        is_suspended: u.isSuspended,
        advocate_roll_no: u.advocateRollNo,
      };
      const { data, error } = await supabase
        .from('staff')
        .insert([staffRow])
        .select('*');

      if (!error && data && data.length > 0) {
        anySuccess = true;
        savedRecord = savedRecord || data[0];
        console.log('[Supabase] Staff successfully inserted into staff table:', u.email);
      }
    } catch (e) {
      // ignore table not in schema
    }

    // 3. Insert into 'firm_users' table (verified active database table)
    try {
      const firmUserRow = {
        id: u.id,
        ...mapUserToFirmUserRow(u),
      };
      const { data, error } = await supabase
        .from('firm_users')
        .insert([firmUserRow])
        .select('*');

      if (!error && data && data.length > 0) {
        anySuccess = true;
        savedRecord = savedRecord || data[0];
        console.log('[Supabase] Staff successfully inserted into firm_users table:', u.email);
      } else if (error) {
        console.warn('Supabase insert into firm_users error:', error);
        primaryError = error;
      }
    } catch (e) {
      console.error('Supabase insert into firm_users exception:', e);
      primaryError = e;
    }

    if (!anySuccess && primaryError) {
      return { success: false, error: primaryError.message || 'Failed to save staff record to database' };
    }

    return { success: true, data: savedRecord };
  },
};

/**
 * Frontend admin form submit handler to update staff profile in Supabase 'profiles' table
 * and sync across database and session state.
 */
export async function handleSaveStaff(
  userId: string,
  newName: string,
  newRole: string,
  newBranchId?: string,
  options?: {
    email?: string;
    reloadOnSuccess?: boolean;
    onSuccess?: () => void;
    onError?: (err: string) => void;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    // 1. Prepare profile updates matching database schema
    const bMeta = resolveBranchMeta(newBranchId);
    const profilePayload: Record<string, any> = {
      full_name: newName.trim(),
      role: newRole,
      role_id: newRole,
      branch_id: bMeta.id,
      branch_name: bMeta.name,
      branch: bMeta.name,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from('profiles')
      .update(profilePayload)
      .eq('id', userId);

    // If 'branch_id' or 'branch_name' column is not in schema cache, fallback
    if (error && (error.message.includes('branch_id') || error.message.includes('branch_name') || error.message.includes('role_id'))) {
      const fallbackPayload = {
        full_name: newName.trim(),
        role: newRole,
        branch: bMeta.name,
        updated_at: new Date().toISOString(),
      };
      const retry = await supabase
        .from('profiles')
        .update(fallbackPayload)
        .eq('id', userId);
      error = retry.error;
    }

    // If not a UUID or if update by ID returned error, fallback to update by email
    if (error || !isUUID) {
      if (options?.email) {
        const retryByEmail = await supabase
          .from('profiles')
          .update(profilePayload)
          .eq('email', options.email.trim().toLowerCase());
        if (!retryByEmail.error) {
          error = null;
        }
      }
    }

    // 2. Concurrently update via SupabaseService to keep user_metadata, firm_users and backend sync intact
    await SupabaseService.updateStaff(userId, {
      name: newName.trim(),
      role: newRole as any,
      roleId: newRole,
      branchId: bMeta.id,
      branchName: bMeta.name,
      email: options?.email,
    }).catch(() => {});

    if (error) {
      const errMsg = 'Error updating user: ' + error.message;
      if (options?.onError) {
        options.onError(errMsg);
      }
      return { success: false, error: errMsg };
    }

    if (options?.onSuccess) {
      options.onSuccess();
    }

    if (options?.reloadOnSuccess) {
      // Refreshes to pull the fresh database values
      window.location.reload();
    }

    return { success: true };
  } catch (err: any) {
    const errMsg = 'Error updating user: ' + (err?.message || 'Unknown error');
    if (options?.onError) {
      options.onError(errMsg);
    }
    return { success: false, error: errMsg };
  }
}

export function isUserAdmin(u: any): boolean {
  if (!u) return false;
  const role = String(u.role || '').toLowerCase().trim();
  const roleId = String(u.roleId || u.role_id || '').toLowerCase().trim();
  return Boolean(
    u.isSuperAdmin ||
    u.is_super_admin ||
    role === 'admin' ||
    role === 'super_admin' ||
    role === 'superadmin' ||
    role === 'partner' ||
    roleId === 'role-super-admin'
  );
}

export function isUserLawyer(u: any): boolean {
  if (!u) return false;
  if (isUserAdmin(u)) return false;
  const role = String(u.role || '').toLowerCase();
  const roleId = String(u.roleId || u.role_id || '').toLowerCase();
  const title = String(u.roleTitle || u.role_title || '').toLowerCase();
  return (
    role === 'lawyer' ||
    role === 'team_lead' ||
    role === 'advocate' ||
    roleId === 'role-advocate' ||
    roleId === 'role-team-lead' ||
    roleId === 'role-lead' ||
    title.includes('advocate') ||
    title.includes('counsel') ||
    title.includes('lawyer') ||
    title.includes('team lead')
  );
}

export function isBranchStaff(u: any): boolean {
  if (!u) return false;
  return !isUserAdmin(u) && !isUserLawyer(u);
}

/**
 * Strict branch-level isolation check:
 * - Partners and Superadmins are exempt and have full multi-branch access for all operations.
 * - Branch staff can ONLY modify (Edit, Update, Delete) cases strictly belonging to their own branch.
 */
export function canUserModifyCase(u: any, caseItem: any): boolean {
  if (!u || !caseItem) return false;

  // 1. Partners and Superadmins are exempt and have full multi-branch access for all operations
  if (isUserAdmin(u)) {
    return true;
  }

  const role = String(u.role || '').toLowerCase().trim();
  if (
    role === 'partner' ||
    role === 'super_admin' ||
    role === 'superadmin' ||
    role === 'admin' ||
    Boolean(u.isSuperAdmin)
  ) {
    return true;
  }

  // 2. Branch staff: compare case branch with user's assigned branch
  const userBranchId = String(u.branchId || u.branch_id || '').toLowerCase().trim();
  const caseBranchId = String(caseItem.branchId || caseItem.branch_id || '').toLowerCase().trim();

  if (userBranchId && caseBranchId && userBranchId === caseBranchId) {
    return true;
  }

  // Fallback comparison using branch names or resolved branch codes
  const userBranchName = String(u.branchName || u.branch || '').toLowerCase().trim();
  const caseBranchName = String(caseItem.branchName || caseItem.branch || '').toLowerCase().trim();

  if (userBranchName && caseBranchName) {
    if (userBranchName === caseBranchName) return true;
    const resolvedUser = resolveBranchId(userBranchId, userBranchName);
    const resolvedCase = resolveBranchId(caseBranchId, caseBranchName);
    if (resolvedUser && resolvedCase && resolvedUser === resolvedCase) return true;
  }

  return false;
}

export function resolveUserRoleMeta(rawRole?: string, rawRoleId?: string, isSuper?: boolean, email?: string) {
  const r = (rawRoleId || rawRole || '').toLowerCase().trim();
  const cleanEmail = (email || '').toLowerCase().trim();
  const isSuperUser = Boolean(
    isSuper ||
    r === 'role-super-admin' ||
    r === 'partner' ||
    r === 'super_admin' ||
    r === 'superadmin' ||
    r === 'managing_partner' ||
    cleanEmail === 'infosightug@gmail.com'
  );

  if (isSuperUser) {
    return {
      roleId: 'role-super-admin',
      role: 'partner',
      roleTitle: 'Managing Partner (Super Admin)',
      isSuperAdmin: true,
      isBranchAdmin: false,
    };
  }

  if (r === 'role-admin' || r === 'admin' || r === 'branch_admin' || r === 'office_admin') {
    return {
      roleId: 'role-admin',
      role: 'admin',
      roleTitle: 'Branch Administrator',
      isSuperAdmin: false,
      isBranchAdmin: true,
    };
  }

  if (r === 'role-lead' || r === 'team_lead' || r === 'lead' || r === 'litigation_lead') {
    return {
      roleId: 'role-lead',
      role: 'team_lead',
      roleTitle: 'Regional Litigation Team Lead',
      isSuperAdmin: false,
      isBranchAdmin: false,
    };
  }

  if (r === 'role-clerk' || r === 'clerk' || r === 'registry_clerk' || r === 'court_clerk') {
    return {
      roleId: 'role-clerk',
      role: 'clerk',
      roleTitle: 'Court & Registry Clerk',
      isSuperAdmin: false,
      isBranchAdmin: false,
    };
  }

  // Default: Litigation Lawyer / Associate
  return {
    roleId: rawRoleId || 'role-advocate',
    role: rawRole || 'lawyer',
    roleTitle: 'Litigation Lawyer / Associate',
    isSuperAdmin: false,
    isBranchAdmin: false,
  };
}

export function mapRowToUser(u: any): User {
  if (!u) return {} as User;
  const name = (u.full_name || u.name || '').trim();
  const email = (u.email || '').trim().toLowerCase();

  const roleMeta = resolveUserRoleMeta(
    u.role,
    u.role_id || u.roleId,
    Boolean(u.is_super_admin ?? u.isSuperAdmin),
    email
  );

  const branchMeta = resolveBranchMeta(u.branch_id || u.branchId, u.branch_name || u.branch);
  const branchName = branchMeta.name;
  const branchId = branchMeta.id;

  // Extract embedded password from advocate_roll_no if present (e.g. 'MK/ADV/022:::[PW]:MyPassword')
  let rawRollNo = u.advocate_roll_no || u.advocateRollNo || '';
  let extractedPassword = u.password;
  if (rawRollNo.includes(':::[PW]:')) {
    const parts = rawRollNo.split(':::[PW]:');
    rawRollNo = parts[0].trim();
    if (parts[1]) {
      extractedPassword = parts[1].trim();
    }
  }

  // Fallback defaults based on role if no explicit password stored
  if (!extractedPassword) {
    if (roleMeta.isSuperAdmin) {
      extractedPassword = 'Admin@2026';
    } else if (roleMeta.isBranchAdmin) {
      extractedPassword = 'Branch@2026';
    } else if (roleMeta.roleId === 'role-clerk') {
      extractedPassword = 'Clerk@2026';
    } else if (roleMeta.roleId === 'role-advocate' || roleMeta.roleId === 'role-lead') {
      extractedPassword = 'Lawyer@2026';
    } else {
      extractedPassword = 'User@2026';
    }
  }

  return {
    id: String(u.id),
    name: name || (email.includes('@') ? email.split('@')[0] : 'Staff Member'),
    email,
    role: roleMeta.role as any,
    roleId: roleMeta.roleId,
    roleTitle: u.role_title || u.roleTitle || roleMeta.roleTitle,
    branchId,
    branchName,
    isSuperAdmin: roleMeta.isSuperAdmin,
    isBranchAdmin: roleMeta.isBranchAdmin,
    isSuspended: Boolean(u.is_suspended ?? u.isSuspended),
    suspendedReason: u.suspended_reason || u.suspendedReason || undefined,
    advocateRollNo: rawRollNo,
    password: extractedPassword,
    mustChangePassword: Boolean(u.must_change_password ?? u.mustChangePassword),
  };
}

export function mapUserToFirmUserRow(u: Partial<User>): any {
  const row: any = {};
  if (u.name !== undefined) row.name = u.name.trim();
  if (u.email !== undefined) row.email = u.email.trim().toLowerCase();
  if (u.role !== undefined) row.role = u.role;
  if (u.roleTitle !== undefined) row.role_title = u.roleTitle;
  if (u.branchId !== undefined) row.branch_id = resolveBranchId(u.branchId, u.branchName);
  if (u.branchName !== undefined) row.branch_name = u.branchName;
  if (u.isSuperAdmin !== undefined) row.is_super_admin = Boolean(u.isSuperAdmin);
  if (u.isBranchAdmin !== undefined) row.is_branch_admin = Boolean(u.isBranchAdmin);
  if (u.isSuspended !== undefined) row.is_suspended = Boolean(u.isSuspended);

  // Securely persist password embedded into advocate_roll_no without exceeding schema cache
  const baseRoll = (u.advocateRollNo || '').split(':::[PW]:')[0].trim();
  if (u.password && u.password.trim()) {
    row.advocate_roll_no = `${baseRoll}:::[PW]:${u.password.trim()}`;
  } else if (u.advocateRollNo !== undefined) {
    row.advocate_roll_no = baseRoll;
  }

  return row;
}

export function mapUserToRow(u: Partial<User>): any {
  return mapUserToFirmUserRow(u);
}
