import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CaseItem, CourtHearing, PleadingDocument, Branch, User } from '../types';

export const DEFAULT_SUPABASE_URL = 'https://kidaxoubrzbvnrtuinff.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGF4b3Vicnpidm5ydHVpbmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODE0NjAsImV4cCI6MjEwOTE1NzQ2MH0.eDf8euIyXDj5CEzZbW3Dy8irKqGWC-0scvftzfwMS5g';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') && 
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Maps database row to frontend CaseItem
 */
export function mapRowToCase(row: any): CaseItem {
  return {
    id: row.id,
    suitNumber: row.suit_number || row.case_number || '',
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
    assistingAdvocates: Array.isArray(row.assisting_advocates) ? row.assisting_advocates : [],
    parties: Array.isArray(row.parties) ? row.parties : [],
    clientName: row.client_name || '',
    opposingFirm: row.opposing_firm || '',
    opposingCounsel: row.opposing_counsel || '',
    claimValueUGX: Number(row.claim_value_ugx) || 0,
    filingDate: row.filing_date || '',
    hearing_date: row.hearing_date || '',
    nextHearingDate: row.next_hearing_date || '',
    nextHearingPurpose: row.next_hearing_purpose || '',
    syncedAcrossBranches: true,
    documentsCount: 0,
    lastUpdated: row.updated_at || new Date().toISOString(),
    status: row.status || 'Active',
    briefSummary: row.brief_summary || '',
    notes: row.notes || '',
    file_location: row.file_location || 'Central Registry Safe',
    client: row.client_name || '',
    case_number: row.case_number || row.suit_number || '',
    branch: row.branch_name || 'Fort Portal Office',
  };
}

/**
 * Maps frontend CaseItem to database row
 */
export function mapCaseToRow(c: Partial<CaseItem>): any {
  return {
    id: c.id,
    case_number: c.suitNumber || (c as any).case_number || '',
    suit_number: c.suitNumber || (c as any).case_number || '',
    firm_ref_number: c.firmRefNumber || '',
    title: c.title || '',
    client_name: c.clientName || (c as any).client_name || '',
    court: c.court || '',
    division: c.division || 'High Court (Civil Division)',
    presiding_judge: c.presidingJudge || '',
    court_station: c.courtStation || '',
    stage: c.stage || 'Trial (Plaintiff Stage)',
    priority: c.priority || 'Standard',
    branch_id: c.branchId || 'ftp-reg',
    branch_name: c.branchName || (c as any).branch || 'Fort Portal Office',
    lead_advocate: c.leadAdvocate || '',
    assisting_advocates: c.assistingAdvocates || [],
    parties: c.parties || [],
    opposing_firm: c.opposingFirm || '',
    opposing_counsel: c.opposingCounsel || '',
    claim_value_ugx: c.claimValueUGX || 0,
    filing_date: c.filingDate || null,
    hearing_date: c.hearing_date || c.nextHearingDate || null,
    next_hearing_date: c.nextHearingDate || null,
    next_hearing_purpose: c.nextHearingPurpose || '',
    status: c.status || 'Active',
    brief_summary: c.briefSummary || '',
    notes: c.notes || '',
    file_location: c.file_location || 'Central Registry Safe',
    updated_at: new Date().toISOString(),
  };
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
    hearing_date: h.hearingDate,
    hearing_time: h.hearingTime,
    court_name: h.courtName,
    division: h.division,
    court_room: h.courtRoom,
    presiding_judge: h.presidingJudge,
    hearing_purpose: h.hearingPurpose,
    lead_counsel: h.leadCounsel,
    assigned_advocates: h.assignedAdvocates,
    status: h.status,
    court_notes: h.courtNotes,
    branch_id: h.branchId,
  };
}

/**
 * Production Supabase Service
 */
export const SupabaseService = {
  async fetchCases(): Promise<CaseItem[] | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from('cases').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('Supabase fetchCases error:', error);
      return null;
    }
    return (data || []).map(mapRowToCase);
  },

  async upsertCase(caseItem: CaseItem) {
    if (!supabase) return null;
    const row = mapCaseToRow(caseItem);
    const { data, error } = await supabase.from('cases').upsert([row]);
    if (error) {
      console.warn('Supabase upsertCase error:', error);
      throw error;
    }
    return data;
  },

  async deleteCase(id: string) {
    if (!supabase) return null;
    const { error } = await supabase.from('cases').delete().eq('id', id);
    if (error) throw error;
    return true;
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

  async fetchUsers(): Promise<User[] | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from('firm_users').select('*');
    if (error) return null;
    return (data || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      roleTitle: u.role_title,
      branchId: u.branch_id || 'kla-hq',
      branchName: u.branch_name || 'Kampala Office',
      isSuperAdmin: Boolean(u.is_super_admin),
      isBranchAdmin: Boolean(u.is_branch_admin),
      isSuspended: Boolean(u.is_suspended),
      advocateRollNo: u.advocate_roll_no || '',
    })) as User[];
  },
};
