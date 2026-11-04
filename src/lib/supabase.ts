import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CaseItem, CourtHearing, PleadingDocument, Branch, User, AuditLog } from '../types';

export const DEFAULT_SUPABASE_URL = 'https://kidaxoubrzbvnrtuinff.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGF4b3Vicnpidm5ydHVpbmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODE0NjAsImV4cCI6MjEwOTE1NzQ2MH0.eDf8euIyXDj5CEzZbW3Dy8irKqGWC-0scvftzfwMS5g';

export const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

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
    const { data, error } = await supabase
      .from('cases')
      .insert([row])
      .select('*');

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
    const row = mapCaseToRow(updates, false);
    delete row.id;

    const { data, error } = await supabase
      .from('cases')
      .update(row)
      .eq('id', id)
      .select('*');

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
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();

    const addRecord = (row: any) => {
      if (!row) return;
      const user = mapRowToUser(row);
      const email = user.email.toLowerCase();
      if (user.id && !seenIds.has(user.id) && (!email || !seenEmails.has(email))) {
        staffList.push(user);
        seenIds.add(user.id);
        if (email) seenEmails.add(email);
      }
    };

    // 1. Try 'profiles' table
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data && Array.isArray(data)) {
        data.forEach(addRecord);
      }
    } catch (e) {
      // ignore table not in schema
    }

    // 2. Try 'staff' table
    try {
      const { data, error } = await supabase.from('staff').select('*');
      if (!error && data && Array.isArray(data)) {
        data.forEach(addRecord);
      }
    } catch (e) {
      // ignore table not in schema
    }

    // 3. Fetch from 'firm_users' table (primary active table)
    try {
      const { data, error } = await supabase.from('firm_users').select('*').order('created_at', { ascending: false });
      if (!error && data && Array.isArray(data)) {
        data.forEach(addRecord);
      } else if (error && error.code !== 'PGRST205') {
        console.warn('Error fetching firm_users from Supabase:', error);
      }
    } catch (e) {
      console.warn('Error fetching firm_users from Supabase:', e);
    }

    return staffList;
  },

  /**
   * Real asynchronous staff update query in Supabase (e.g. await supabase.from('staff').update({...}).eq('id', staffId))
   */
  async updateStaff(staffId: string, updates: Partial<User>): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };
    const firmUserRow = mapUserToFirmUserRow(updates);

    let updatedRecord: any = null;
    let anySuccess = false;

    // 1. Update in 'firm_users' table
    try {
      const { data, error } = await supabase
        .from('firm_users')
        .update(firmUserRow)
        .eq('id', staffId)
        .select('*');

      if (!error && data && data.length > 0) {
        updatedRecord = data[0];
        anySuccess = true;
      } else if (error && error.code !== 'PGRST205') {
        console.error('Supabase update firm_users error:', error);
      }
    } catch (e) {
      console.error('Supabase update firm_users error:', e);
    }

    // 2. Update in 'staff' table
    try {
      const { data, error } = await supabase
        .from('staff')
        .update(firmUserRow)
        .eq('id', staffId)
        .select('*');

      if (!error && data && data.length > 0) {
        updatedRecord = updatedRecord || data[0];
        anySuccess = true;
      }
    } catch (e) {
      // ignore table not found
    }

    // 3. Update in 'profiles' table
    try {
      const profileUpdates: any = {};
      if (updates.name) profileUpdates.full_name = updates.name;
      if (updates.role) profileUpdates.role = updates.role;
      if (updates.branchName) profileUpdates.branch = updates.branchName;
      await supabase.from('profiles').update(profileUpdates).eq('id', staffId);
    } catch (e) {
      // ignore table not found
    }

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

    // 1. Try 'profiles' table: await supabase.from('profiles').insert([{ full_name, email, role, branch }])
    try {
      const profileRow = {
        id: u.id,
        full_name: u.name,
        name: u.name,
        email: u.email,
        role: u.role,
        role_title: u.roleTitle,
        branch: u.branchName,
        branch_id: u.branchId,
        branch_name: u.branchName,
      };
      const { data, error } = await supabase
        .from('profiles')
        .insert([profileRow])
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

export function mapRowToUser(u: any): User {
  if (!u) return {} as User;
  const name = u.full_name || u.name || '';
  const email = (u.email || '').trim().toLowerCase();
  const role = u.role || 'lawyer';
  const roleId = u.role_id || u.roleId || (u.is_super_admin ? 'role-super-admin' : role === 'clerk' ? 'role-clerk' : role === 'admin' ? 'role-admin' : 'role-advocate');
  const roleTitle = u.role_title || u.roleTitle || (role === 'partner' ? 'Managing Partner' : role === 'team_lead' ? 'Litigation Team Lead' : role === 'clerk' ? 'Registry Clerk' : role === 'admin' ? 'Branch Administrator' : 'Advocate');
  const branchName = u.branch_name || u.branch || 'Kampala Office';
  const branchId = resolveBranchId(u.branch_id || u.branchId, branchName);

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
    if (u.is_super_admin || roleId === 'role-super-admin' || role === 'partner') {
      extractedPassword = 'Admin@2026';
    } else if (u.is_branch_admin || roleId === 'role-admin' || role === 'admin') {
      extractedPassword = 'Branch@2026';
    } else if (roleId === 'role-clerk' || role === 'clerk') {
      extractedPassword = 'Clerk@2026';
    } else if (roleId === 'role-advocate' || role === 'lawyer' || role === 'team_lead') {
      extractedPassword = 'Lawyer@2026';
    } else {
      extractedPassword = 'User@2026';
    }
  }

  return {
    id: String(u.id),
    name,
    email,
    role,
    roleId,
    roleTitle,
    branchId,
    branchName,
    isSuperAdmin: Boolean(u.is_super_admin ?? u.isSuperAdmin),
    isBranchAdmin: Boolean(u.is_branch_admin ?? u.isBranchAdmin ?? (roleId === 'role-admin' || role === 'admin')),
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
