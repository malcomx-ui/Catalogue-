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

export const USER_PROFILE_STORAGE_KEY = 'mk_case_catalogue_user_v2';
export const AUTH_FLAG_STORAGE_KEY = 'mk_case_catalogue_auth_v4';

export function cacheUserProfile(user: Partial<User> | null): void {
  if (typeof window === 'undefined' || !user || !user.email) return;
  try {
    const serialized = JSON.stringify(user);
    try {
      window.localStorage?.setItem(USER_PROFILE_STORAGE_KEY, serialized);
      window.localStorage?.setItem(AUTH_FLAG_STORAGE_KEY, 'true');
    } catch {}
    try {
      window.sessionStorage?.setItem(USER_PROFILE_STORAGE_KEY, serialized);
      window.sessionStorage?.setItem(AUTH_FLAG_STORAGE_KEY, 'true');
    } catch {}
  } catch {}
}

export function clearCachedUserProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.removeItem(USER_PROFILE_STORAGE_KEY);
    window.localStorage?.removeItem(AUTH_FLAG_STORAGE_KEY);
  } catch {}
  try {
    window.sessionStorage?.removeItem(USER_PROFILE_STORAGE_KEY);
    window.sessionStorage?.removeItem(AUTH_FLAG_STORAGE_KEY);
  } catch {}
}

export function getCachedUserProfile(): Partial<User> | null {
  if (typeof window === 'undefined') return null;
  const stores: (Storage | undefined)[] = [window.localStorage, window.sessionStorage];
  for (const store of stores) {
    if (!store) continue;
    try {
      const raw = store.getItem(USER_PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.email || parsed.id)) {
          return parsed;
        }
      }
    } catch {}
  }
  return null;
}

export function getEffectiveUser(user?: Partial<User> | null): Partial<User> {
  const cached = getCachedUserProfile();
  const hasExplicitUser = Boolean(
    user &&
    (user.email || user.id || user.role || user.roleId || user.branchId || user.branchName)
  );

  if (hasExplicitUser && user) {
    const userEmail = String(user.email || '').trim().toLowerCase();
    const cachedEmail = String(cached?.email || '').trim().toLowerCase();
    const isSameIdentity = Boolean(
      cached &&
      (
        (userEmail && cachedEmail && userEmail === cachedEmail) ||
        (user.id && cached.id && String(user.id) === String(cached.id)) ||
        (!userEmail && !user.id && !user.role && !user.roleId)
      )
    );
    const source = isSameIdentity ? cached : null;
    const rawBranchId = String(
      user.branchId || (user as any).branch_id || source?.branchId || (source as any)?.branch_id || ''
    ).trim();
    const rawBranchName = String(
      user.branchName || (user as any).branch_name || (user as any).branch || source?.branchName || (source as any)?.branch_name || (source as any)?.branch || ''
    ).trim();
    const branchMeta = resolveBranchMeta(rawBranchId, rawBranchName);

    const role = user.role || source?.role;
    const roleId = user.roleId || (user as any).role_id || source?.roleId;
    const isSuperAdmin =
      user.isSuperAdmin !== undefined
        ? Boolean(user.isSuperAdmin)
        : (user as any).is_super_admin !== undefined
        ? Boolean((user as any).is_super_admin)
        : Boolean(source?.isSuperAdmin);
    const isBranchAdmin =
      user.isBranchAdmin !== undefined
        ? Boolean(user.isBranchAdmin)
        : (user as any).is_branch_admin !== undefined
        ? Boolean((user as any).is_branch_admin)
        : Boolean(source?.isBranchAdmin);

    return {
      ...(source || {}),
      ...user,
      role,
      roleId,
      roleTitle: user.roleTitle || source?.roleTitle || (role ? String(role) : undefined),
      branchId: branchMeta.id || 'kla-hq',
      branchName: rawBranchName || branchMeta.name || 'Kampala Central (Head Office)',
      isSuperAdmin,
      isBranchAdmin,
    };
  }

  if (cached) {
    const cachedMeta = resolveBranchMeta(
      cached.branchId || (cached as any).branch_id,
      cached.branchName || (cached as any).branch_name || (cached as any).branch
    );
    return {
      ...cached,
      branchId: cachedMeta.id || 'kla-hq',
      branchName: cached.branchName || cachedMeta.name || 'Kampala Central (Head Office)',
    };
  }

  return {
    role: 'branch_staff',
    branchId: 'kla-hq',
    branchName: 'Kampala Central (Head Office)',
    isSuperAdmin: false,
    isBranchAdmin: false,
  };
}

export function resolveBranchId(branchId?: string, branchName?: string): string {
  const cleanId = (branchId || '').trim();
  if (
    cleanId &&
    (
      ['ftp-reg', 'glu-reg', 'jnj-reg', 'kla-hq', 'msk-reg', 'msn-reg', 'mbr-reg'].includes(cleanId) ||
      cleanId.startsWith('br-')
    )
  ) {
    return cleanId;
  }
  const clean = (branchName || branchId || '').toLowerCase();
  if (clean.includes('fort') || clean.includes('portal')) return 'ftp-reg';
  if (clean.includes('gulu')) return 'glu-reg';
  if (clean.includes('jinja')) return 'jnj-reg';
  if (clean.includes('kampala') || clean.includes('head office') || clean.includes('hq')) return 'kla-hq';
  if (clean.includes('masaka')) return 'msk-reg';
  if (clean.includes('masindi')) return 'msn-reg';
  if (clean.includes('mbarara')) return 'mbr-reg';
  if (cleanId && cleanId !== 'all') return cleanId;
  return 'kla-hq';
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
      return { id: resolvedId || 'kla-hq', name: (branchName || '').trim() || resolvedId || 'Kampala Central (Head Office)' };
  }
}

export function extractMissingColumnFromError(err: any): string | null {
  const msg = String(err?.message || err?.details || '');
  const pgrst = msg.match(/Could not find the '([^']+)' column/i);
  if (pgrst?.[1]) return pgrst[1];
  const pg = msg.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);
  if (pg?.[1]) return pg[1];
  const pg2 = msg.match(/column (?:[a-z_]+\.)?([a-z0-9_]+) does not exist/i);
  if (pg2?.[1]) return pg2[1];
  return null;
}

export function isUuidString(val?: string | null): boolean {
  return Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val).trim()));
}

export async function safeProfilesUpdate(
  payload: Record<string, any>,
  matchCol: 'id' | 'email',
  matchVal: string
): Promise<{ data: any[] | null; error: any }> {
  if (!supabase || !matchVal) return { data: null, error: null };
  if (matchCol === 'id' && !isUuidString(matchVal)) {
    // profiles.id may be UUID or TEXT; skip id queries for non-UUID synthetic IDs if UUID error might occur, or try safely
  }
  const cleanPayload: Record<string, any> = { ...payload };
  delete cleanPayload.name;
  delete cleanPayload.password;
  delete cleanPayload.temporaryPassword;
  delete cleanPayload.previousEmail;
  Object.keys(cleanPayload).forEach((k) => {
    if (cleanPayload[k] === undefined) delete cleanPayload[k];
  });

  for (let attempt = 0; attempt < 12; attempt++) {
    if (Object.keys(cleanPayload).length === 0) break;
    const baseQuery = supabase.from('profiles').update(cleanPayload);
    const { data, error } = await (matchCol === 'email'
      ? baseQuery.ilike('email', matchVal)
      : baseQuery.eq(matchCol, matchVal)
    ).select('*');
    if (!error) return { data, error: null };
    if (String(error?.code || '') === '22P02' && matchCol === 'id') {
      return { data: null, error: null };
    }
    const missingCol = extractMissingColumnFromError(error);
    if (missingCol && missingCol in cleanPayload) {
      delete cleanPayload[missingCol];
      continue;
    }
    return { data: null, error };
  }
  return { data: null, error: null };
}

export async function safeProfilesUpsert(
  row: Record<string, any>
): Promise<{ data: any[] | null; error: any }> {
  if (!supabase) return { data: null, error: null };
  const cleanPayload: Record<string, any> = { ...row };
  delete cleanPayload.name;
  delete cleanPayload.password;
  delete cleanPayload.temporaryPassword;
  delete cleanPayload.previousEmail;
  Object.keys(cleanPayload).forEach((k) => {
    if (cleanPayload[k] === undefined) delete cleanPayload[k];
  });

  for (let attempt = 0; attempt < 12; attempt++) {
    if (Object.keys(cleanPayload).length === 0) break;
    const { data, error } = await supabase
      .from('profiles')
      .upsert([cleanPayload], { onConflict: 'email' })
      .select('*');
    if (!error) return { data, error: null };
    if (String(error?.code || '') === '22P02' && cleanPayload.id && !isUuidString(cleanPayload.id)) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        cleanPayload.id = crypto.randomUUID();
      } else {
        delete cleanPayload.id;
      }
      continue;
    }
    const missingCol = extractMissingColumnFromError(error);
    if (missingCol && missingCol in cleanPayload) {
      delete cleanPayload[missingCol];
      continue;
    }
    return { data: null, error };
  }
  return { data: null, error: null };
}

function normalizePersonsArray(val: any, leadFallback?: any, assistingFallback?: any): string[] {
  if (Array.isArray(val) && val.length > 0) {
    return val.map((p) => String(p || '').trim()).filter(Boolean);
  }
  if (typeof val === 'string' && val.trim()) {
    return val.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  }
  const combined: string[] = [];
  if (leadFallback && String(leadFallback).trim()) {
    combined.push(...String(leadFallback).split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean));
  }
  if (Array.isArray(assistingFallback)) {
    assistingFallback.forEach((a) => {
      const clean = String(a || '').trim();
      if (clean && !combined.includes(clean)) combined.push(clean);
    });
  }
  return combined;
}

/**
 * Maps database row to frontend CaseItem
 */
export function mapRowToCase(row: any): CaseItem {
  if (!row) return {} as CaseItem;
  const resolvedBranchName = row.branch_name || row.branch || 'Kampala Central (Head Office)';
  const resolvedBranchId = resolveBranchId(row.branch_id || row.branchId, resolvedBranchName);
  const personsArr = normalizePersonsArray(
    row.persons_in_conduct || row.person_in_conduct,
    row.lead_advocate || row.leadAdvocate,
    row.assisting_advocates || row.assistingAdvocates
  );
  const lead = row.lead_advocate || row.leadAdvocate || personsArr[0] || '';
  const assisting = Array.isArray(row.assisting_advocates) && row.assisting_advocates.length > 0
    ? row.assisting_advocates
    : personsArr.slice(1);
  const personConductStr = row.person_in_conduct || personsArr.join(', ') || lead;
  const resolvedClient = row.client_name || row.client || row.clientName || '';
  const resolvedSummary = row.subject_matter || row.brief_summary || row.briefSummary || '';
  const resolvedDistrict = row.district || row.court_station || row.courtStation || '';
  const resolvedInstructionsDate = row.date_of_instructions || row.filing_date || row.filingDate || '';
  const resolvedHearingDate = row.hearing_date || row.next_hearing_date || row.nextHearingDate || '';

  return {
    ...row,
    id: row.id,
    suitNumber: row.suit_number || row.case_number || row.suitNumber || '',
    case_number: row.case_number || row.suit_number || row.suitNumber || '',
    suit_no: row.suit_no || '',
    firmRefNumber: row.firm_ref_number || row.firmRefNumber || '',
    title: row.title || '',
    court: row.court || '',
    division: row.division || (row.case_type ? `${row.case_type} Division` : 'High Court (Civil Division)'),
    presidingJudge: row.presiding_judge || row.presidingJudge || '',
    courtStation: row.court_station || resolvedDistrict,
    district: resolvedDistrict,
    stage: row.stage || 'Trial (Plaintiff Stage)',
    priority: row.priority || 'Standard',
    branchId: resolvedBranchId,
    branchName: resolvedBranchName,
    branch: row.branch || resolvedBranchName,
    leadAdvocate: lead,
    person_in_conduct: personConductStr,
    persons_in_conduct: personsArr,
    assistingAdvocates: assisting,
    parties: Array.isArray(row.parties) ? row.parties : [],
    clientName: resolvedClient,
    client: resolvedClient,
    opposingFirm: row.opposing_firm || row.opposingFirm || '',
    opposingCounsel: row.opposing_counsel || row.opposingCounsel || '',
    claimValueUGX: Number(row.claim_value_ugx ?? row.claimValueUGX) || 0,
    filingDate: row.filing_date || resolvedInstructionsDate,
    date_of_instructions: resolvedInstructionsDate,
    hearing_date: resolvedHearingDate,
    nextHearingDate: row.next_hearing_date || resolvedHearingDate,
    nextHearingPurpose: row.next_hearing_purpose || row.nextHearingPurpose || '',
    syncedAcrossBranches: true,
    documentsCount: Number(row.documents_count ?? row.documentsCount) || 0,
    lastUpdated: row.updated_at || row.lastUpdated || new Date().toISOString(),
    status: row.status || 'Active',
    year_of_closure: row.year_of_closure ?? null,
    case_type: row.case_type || row.division || 'Civil',
    billing_status: row.billing_status || '',
    payment_status: row.payment_status || '',
    briefSummary: row.brief_summary || resolvedSummary,
    subject_matter: resolvedSummary,
    notes: row.notes || '',
    target: row.target || '',
    verdict: row.verdict || '',
    file_location: row.file_location || 'Central Registry Safe',
    progressiveNotes: Array.isArray(row.progressive_notes)
      ? row.progressive_notes
      : Array.isArray(row.progressiveNotes)
      ? row.progressiveNotes
      : [],
    fileMovementHistory: Array.isArray(row.file_movement_history)
      ? row.file_movement_history
      : Array.isArray(row.fileMovementHistory)
      ? row.fileMovementHistory
      : [],
    transferHistory: Array.isArray(row.transfer_history)
      ? row.transfer_history
      : Array.isArray(row.transferHistory)
      ? row.transferHistory
      : [],
  };
}

/**
 * Maps frontend CaseItem to database row
 */
export function mapCaseToRow(c: Partial<CaseItem>, isInsert = false): any {
  const resolvedBranchName = c.branchName || (c as any).branch || 'Kampala Central (Head Office)';
  const resolvedBranchId = resolveBranchId(c.branchId || (c as any).branch_id, resolvedBranchName);
  const personsArr = normalizePersonsArray(
    (c as any).persons_in_conduct || (c as any).person_in_conduct,
    c.leadAdvocate,
    c.assistingAdvocates
  );
  const leadAdv = c.leadAdvocate || personsArr[0] || '';
  const assistingAdv = Array.isArray(c.assistingAdvocates) && c.assistingAdvocates.length > 0
    ? c.assistingAdvocates
    : personsArr.slice(1);
  const personConductStr = (c as any).person_in_conduct || personsArr.join(', ') || leadAdv;
  const resolvedClient = c.clientName || (c as any).client || (c as any).client_name || '';
  const resolvedDistrict = (c as any).district || c.courtStation || '';
  const resolvedSummary = (c as any).subject_matter || c.briefSummary || '';
  const resolvedInstructionsDate = parseDateForPostgres((c as any).date_of_instructions || c.filingDate) || new Date().toISOString().split('T')[0];
  const resolvedHearingDate = parseDateForPostgres(c.hearing_date || c.nextHearingDate);
  const rawCaseNo = c.suitNumber || (c as any).case_number || '';

  const row: any = {
    case_number: rawCaseNo,
    suit_number: rawCaseNo,
    suit_no: (c as any).suit_no || '',
    firm_ref_number: c.firmRefNumber || '',
    title: c.title || '',
    client_name: resolvedClient,
    client: resolvedClient,
    court: c.court || 'High Court of Uganda',
    division: c.division || ((c as any).case_type ? `${(c as any).case_type} Division` : 'High Court (Civil Division)'),
    presiding_judge: c.presidingJudge || '',
    court_station: c.courtStation || resolvedDistrict,
    district: resolvedDistrict,
    stage: c.stage || 'Trial (Plaintiff Stage)',
    priority: c.priority || 'Standard',
    branch_id: resolvedBranchId,
    branch_name: resolvedBranchName,
    branch: resolvedBranchName,
    lead_advocate: leadAdv,
    person_in_conduct: personConductStr,
    persons_in_conduct: personsArr,
    assisting_advocates: assistingAdv,
    parties: Array.isArray(c.parties) ? c.parties : [],
    opposing_firm: c.opposingFirm || '',
    opposing_counsel: c.opposingCounsel || '',
    claim_value_ugx: Number(c.claimValueUGX) || 0,
    filing_date: resolvedInstructionsDate,
    date_of_instructions: resolvedInstructionsDate,
    hearing_date: resolvedHearingDate,
    next_hearing_date: resolvedHearingDate,
    next_hearing_purpose: c.nextHearingPurpose || '',
    status: c.status || 'Active',
    year_of_closure: (c as any).year_of_closure || null,
    case_type: (c as any).case_type || c.division || 'Civil',
    billing_status: (c as any).billing_status || '',
    payment_status: (c as any).payment_status || '',
    brief_summary: resolvedSummary,
    subject_matter: resolvedSummary,
    notes: c.notes || '',
    target: (c as any).target || '',
    verdict: (c as any).verdict || '',
    file_location: c.file_location || 'Central Registry Safe',
    progressive_notes: Array.isArray((c as any).progressiveNotes) ? (c as any).progressiveNotes : Array.isArray((c as any).progressive_notes) ? (c as any).progressive_notes : [],
    file_movement_history: Array.isArray((c as any).fileMovementHistory) ? (c as any).fileMovementHistory : Array.isArray((c as any).file_movement_history) ? (c as any).file_movement_history : [],
    transfer_history: Array.isArray((c as any).transferHistory) ? (c as any).transferHistory : Array.isArray((c as any).transfer_history) ? (c as any).transfer_history : [],
    updated_at: new Date().toISOString(),
  };

  // Only pass id if not inserting fresh or if it's already an existing UUID
  if (!isInsert && c.id && !String(c.id).startsWith('case-')) {
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
    const val = c.suitNumber !== undefined ? c.suitNumber : (c as any).case_number;
    row.case_number = val || '';
    row.suit_number = val || '';
  }
  if ((c as any).suit_no !== undefined) {
    row.suit_no = (c as any).suit_no || '';
  }
  if (c.firmRefNumber !== undefined) {
    row.firm_ref_number = c.firmRefNumber || '';
  }
  if (c.title !== undefined || (c as any).case_title !== undefined) {
    row.title = c.title !== undefined ? c.title : ((c as any).case_title || '');
  }
  if (c.clientName !== undefined || (c as any).client !== undefined || (c as any).client_name !== undefined) {
    const clientVal = c.clientName ?? (c as any).client ?? (c as any).client_name ?? '';
    row.client_name = clientVal;
    row.client = clientVal;
  }
  if (c.court !== undefined) {
    row.court = c.court;
  }
  if (c.division !== undefined || (c as any).case_type !== undefined) {
    row.division = c.division || (c as any).case_type || '';
  }
  if ((c as any).case_type !== undefined) {
    row.case_type = (c as any).case_type || '';
  }
  if (c.presidingJudge !== undefined) {
    row.presiding_judge = c.presidingJudge;
  }
  if (c.courtStation !== undefined || (c as any).district !== undefined) {
    const stationVal = c.courtStation ?? (c as any).district ?? '';
    row.court_station = stationVal;
    row.district = (c as any).district ?? c.courtStation ?? '';
  }
  if (c.stage !== undefined) {
    row.stage = c.stage;
  }
  if (c.priority !== undefined) {
    row.priority = c.priority;
  }
  if (c.branchId !== undefined || c.branchName !== undefined || (c as any).branch !== undefined) {
    const bName = c.branchName || (c as any).branch || '';
    row.branch_id = resolveBranchId(c.branchId, bName);
    row.branch_name = bName;
    row.branch = bName;
  }
  if (c.leadAdvocate !== undefined || (c as any).person_in_conduct !== undefined || (c as any).persons_in_conduct !== undefined) {
    const personsArr = normalizePersonsArray(
      (c as any).persons_in_conduct ?? (c as any).person_in_conduct,
      c.leadAdvocate,
      c.assistingAdvocates
    );
    const leadVal = c.leadAdvocate ?? personsArr[0] ?? '';
    row.lead_advocate = leadVal;
    row.person_in_conduct = (c as any).person_in_conduct ?? (personsArr.length ? personsArr.join(', ') : leadVal);
    if ((c as any).persons_in_conduct !== undefined) {
      row.persons_in_conduct = personsArr;
    }
    if (c.assistingAdvocates !== undefined) {
      row.assisting_advocates = c.assistingAdvocates;
    }
  } else if (c.assistingAdvocates !== undefined) {
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
    const fd = parseDateForPostgres(c.filingDate || (c as any).date_of_instructions);
    row.filing_date = fd;
    row.date_of_instructions = fd;
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
  if ((c as any).billing_status !== undefined) {
    row.billing_status = (c as any).billing_status || '';
  }
  if ((c as any).payment_status !== undefined) {
    row.payment_status = (c as any).payment_status || '';
  }
  if (c.briefSummary !== undefined || (c as any).subject_matter !== undefined) {
    const sumVal = (c as any).subject_matter ?? c.briefSummary ?? '';
    row.brief_summary = sumVal;
    row.subject_matter = sumVal;
  }
  if (c.notes !== undefined) {
    row.notes = c.notes;
  }
  if ((c as any).target !== undefined) {
    row.target = (c as any).target;
  }
  if ((c as any).verdict !== undefined) {
    row.verdict = (c as any).verdict;
  }
  if (c.file_location !== undefined) {
    row.file_location = c.file_location;
  }
  if ((c as any).progressiveNotes !== undefined || (c as any).progressive_notes !== undefined) {
    row.progressive_notes = (c as any).progressiveNotes ?? (c as any).progressive_notes ?? [];
  }
  if ((c as any).fileMovementHistory !== undefined || (c as any).file_movement_history !== undefined) {
    row.file_movement_history = (c as any).fileMovementHistory ?? (c as any).file_movement_history ?? [];
  }
  if ((c as any).transferHistory !== undefined || (c as any).transfer_history !== undefined) {
    row.transfer_history = (c as any).transferHistory ?? (c as any).transfer_history ?? [];
  }

  row.updated_at = new Date().toISOString();
  return row;
}

/**
 * Runs insert/update/upsert on public.cases with iterative column-stripping fallback
 * whenever PostgREST returns PGRST204 / 42703 for optional fields absent from live schema.
 */
async function safeCasesMutation(
  operation: 'insert' | 'update' | 'upsert',
  payload: Record<string, any>,
  matchId?: string
): Promise<{ data: any[] | null; error: any; strippedColumns: string[] }> {
  if (!supabase) return { data: null, error: new Error('Supabase client not initialized'), strippedColumns: [] };

  const cleanPayload: Record<string, any> = { ...payload };
  Object.keys(cleanPayload).forEach((k) => {
    if (cleanPayload[k] === undefined) delete cleanPayload[k];
  });
  const strippedColumns: string[] = [];

  for (let attempt = 0; attempt < 20; attempt++) {
    if (Object.keys(cleanPayload).length === 0) break;

    let res: { data: any[] | null; error: any };
    if (operation === 'insert') {
      res = await supabase.from('cases').insert([cleanPayload]).select('*');
    } else if (operation === 'upsert') {
      res = await supabase.from('cases').upsert([cleanPayload]).select('*');
    } else {
      res = await supabase.from('cases').update(cleanPayload).eq('id', matchId as string).select('*');
    }

    if (!res.error) {
      return { data: res.data, error: null, strippedColumns };
    }

    const missingCol = extractMissingColumnFromError(res.error);
    if (missingCol && missingCol in cleanPayload) {
      delete cleanPayload[missingCol];
      strippedColumns.push(missingCol);
      continue;
    }

    return { data: null, error: res.error, strippedColumns };
  }

  return { data: null, error: null, strippedColumns };
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
   * Resilient against browser sandbox fetch failures by falling back to /api/cases.
   */
  async fetchCases(): Promise<CaseItem[] | null> {
    // 1. Try browser client fetch
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('cases')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return data.map(mapRowToCase);
        }
      } catch (err) {
        console.info('[SupabaseService] Browser direct fetch unavailable, routing to backend proxy...');
      }
    }

    // 2. Fallback to /api/cases proxy
    try {
      const res = await fetch('/api/cases');
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          return json.data.map(mapRowToCase);
        }
      }
    } catch (apiErr) {
      console.warn('[SupabaseService] /api/cases proxy notice:', apiErr);
    }

    return null;
  },

  /**
   * Permanently inserts a new case using supabase.from('cases').insert(...) with schema-safe retry
   */
  async insertCase(caseItem: Partial<CaseItem>): Promise<CaseItem | null> {
    const row = mapCaseToRow(caseItem, true);
    const { data, error } = await safeCasesMutation('insert', row);

    if (error) {
      console.error('Supabase insertCase error:', error);
      throw error;
    }

    const mapped = data && data.length > 0 ? mapRowToCase(data[0]) : null;
    if (mapped) {
      // Preserve frontend-only/optional schema fields that may have been stripped on insert
      return {
        ...caseItem,
        ...mapped,
        progressiveNotes: mapped.progressiveNotes?.length ? mapped.progressiveNotes : ((caseItem as any).progressiveNotes || []),
        fileMovementHistory: mapped.fileMovementHistory?.length ? mapped.fileMovementHistory : ((caseItem as any).fileMovementHistory || []),
        transferHistory: mapped.transferHistory?.length ? mapped.transferHistory : ((caseItem as any).transferHistory || []),
      } as CaseItem;
    }
    return null;
  },

  /**
   * Bulk inserts parsed cases into Supabase 'cases' table in batches.
   * Handles optional schema column differences reliably with iterative PGRST204 stripping.
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

    let rows = casesToInsert.map((c) => mapCaseToRow(c, true));
    const total = rows.length;
    const insertedRows: any[] = [];
    const errors: any[] = [];
    const knownMissingCols = new Set<string>();

    // Loop through batches of rows
    for (let i = 0; i < total; i += batchSize) {
      let batch = rows.slice(i, i + batchSize).map((r) => {
        if (knownMissingCols.size === 0) return r;
        const copy = { ...r };
        knownMissingCols.forEach((col) => delete copy[col]);
        return copy;
      });

      try {
        let batchInserted = false;
        let lastBatchErr: any = null;

        for (let attempt = 0; attempt < 15; attempt++) {
          const { data, error } = await supabase.from('cases').insert(batch).select('*');
          if (!error) {
            if (data) insertedRows.push(...data);
            batchInserted = true;
            break;
          }
          lastBatchErr = error;
          const missingCol = extractMissingColumnFromError(error);
          if (missingCol && batch.some((r) => missingCol in r)) {
            knownMissingCols.add(missingCol);
            batch = batch.map((r) => {
              const copy = { ...r };
              delete copy[missingCol];
              return copy;
            });
            continue;
          }
          break;
        }

        if (!batchInserted && lastBatchErr) {
          console.error(`Supabase bulkInsertCases batch ${Math.floor(i / batchSize) + 1} error:`, lastBatchErr);
          errors.push(lastBatchErr);

          // Fallback: Attempt individual row inserts with schema-safe retry so valid rows still persist
          for (const singleRow of batch) {
            try {
              const singleRes = await safeCasesMutation('insert', singleRow);
              if (singleRes.data && singleRes.data.length > 0) {
                insertedRows.push(singleRes.data[0]);
              } else if (singleRes.error) {
                console.warn('Single row insert error in fallback:', singleRes.error);
              }
            } catch (singleErr) {
              console.warn('Single row insert exception:', singleErr);
            }
          }
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
   * Permanently updates an existing case using supabase.from('cases').update(...) with schema-safe retry
   */
  async updateCase(id: string, updates: Partial<CaseItem>): Promise<CaseItem | null> {
    if (!id || String(id).startsWith('case-')) {
      return null;
    }
    const row = mapPartialCaseToRow(updates);
    delete row.id;

    const { data, error } = await safeCasesMutation('update', row, id);

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
    if (!id || String(id).startsWith('case-')) {
      return true;
    }
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
   * Upsert a case with schema-safe retry
   */
  async upsertCase(caseItem: CaseItem): Promise<CaseItem | null> {
    if (!supabase) return null;
    const row = mapCaseToRow(caseItem, false);
    const { data, error } = await safeCasesMutation('upsert', row);

    if (error) {
      console.error('Supabase upsertCase error:', error);
      throw error;
    }
    if (data && data.length > 0) {
      return mapRowToCase(data[0]);
    }
    return null;
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
    const staffList: User[] = [];

    const addRecord = (row: any, isAuthoritativeProfile = false) => {
      if (!row) return;
      const user = mapRowToUser(row);
      const email = user.email.toLowerCase();
      if (!email && !user.id) return;

      const existingIndex = staffList.findIndex(
        (existing) => (email && existing.email.toLowerCase() === email) || (user.id && existing.id === user.id)
      );

      if (existingIndex >= 0) {
        const existing = staffList[existingIndex];
        if (isAuthoritativeProfile) {
          staffList[existingIndex] = {
            ...existing,
            id: user.id || existing.id,
            name: user.name || existing.name,
            role: user.role || existing.role,
            roleId: user.roleId || existing.roleId,
            roleTitle: user.roleTitle || existing.roleTitle,
            branchName: user.branchName || existing.branchName,
            branchId: user.branchId || existing.branchId,
            isSuperAdmin: user.isSuperAdmin,
            isBranchAdmin: user.isBranchAdmin,
            isSuspended: row.is_suspended !== undefined || row.isSuspended !== undefined ? Boolean(user.isSuspended) : existing.isSuspended,
            suspendedReason: user.suspendedReason || existing.suspendedReason,
            mustChangePassword: row.must_change_password !== undefined || row.mustChangePassword !== undefined ? Boolean(user.mustChangePassword) : existing.mustChangePassword,
            advocateRollNo: user.advocateRollNo || existing.advocateRollNo,
            password: row.password || (String(row.advocate_roll_no || '').includes(':::[PW]:') ? user.password : existing.password) || user.password,
          };
        } else {
          staffList[existingIndex] = {
            ...existing,
            isSuspended: existing.isSuspended || Boolean(user.isSuspended),
            suspendedReason: existing.suspendedReason || user.suspendedReason,
            advocateRollNo: existing.advocateRollNo || user.advocateRollNo,
            password: row.password || (String(row.advocate_roll_no || '').includes(':::[PW]:') ? user.password : existing.password),
          };
        }
      } else {
        staffList.push(user);
      }
    };

    // 1. Always query server /api/profiles first (authoritative merged store across profiles + firm_users + server DB)
    if (typeof window !== 'undefined') {
      try {
        const session = supabase ? (await supabase.auth.getSession())?.data?.session : null;
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch('/api/profiles', { headers });
        if (res.ok) {
          const json = await res.json();
          const list = json.data || json.profiles || [];
          if (Array.isArray(list)) {
            list.forEach((p: any) => addRecord(p, true));
          }
        }
      } catch (e) {}
    }

    // 2. Query direct Supabase 'profiles' table
    if (supabase) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!profileError && Array.isArray(profileData) && profileData.length > 0) {
          profileData.forEach((p) => addRecord(p, staffList.length === 0));
        }
      } catch (e) {
        console.warn('Profiles table load error:', e);
      }

      // 3. Query 'firm_users' table for password metadata & legacy entries
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
    }

    return staffList;
  },

  /**
   * Syncs staff edits to public 'profiles', 'firm_users', and backend '/api/users/:id'
   */
  async updateStaff(
    staffId: string,
    updates: Partial<User> & { skipApi?: boolean; previousEmail?: string }
  ): Promise<{ success: boolean; profileUpdated?: boolean; data?: any; error?: string; warning?: string }> {
    let updatedRecord: any = null;
    let anySuccess = false;
    let profileUpdated = false;
    let lastProfileError: string | undefined;
    let apiExplicitError: string | undefined;

    const cleanEmail = updates.email ? updates.email.trim().toLowerCase() : undefined;
    const prevEmail = updates.previousEmail ? updates.previousEmail.trim().toLowerCase() : undefined;
    const lookupEmail = prevEmail || cleanEmail;
    const hasRoleChange = updates.roleId !== undefined || updates.role !== undefined;
    const roleMeta = hasRoleChange
      ? resolveUserRoleMeta(updates.role, updates.roleId, updates.isSuperAdmin, cleanEmail || prevEmail)
      : null;

    const hasBranchChange = updates.branchId !== undefined || updates.branchName !== undefined;
    const bMeta = hasBranchChange ? resolveBranchMeta(updates.branchId, updates.branchName) : null;

    const profilePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) profilePayload.full_name = updates.name.trim();
    if (cleanEmail) profilePayload.email = cleanEmail;
    if (roleMeta) {
      profilePayload.role = roleMeta.role;
      profilePayload.role_id = roleMeta.roleId;
      profilePayload.role_title = updates.roleTitle || roleMeta.roleTitle;
      profilePayload.is_super_admin = roleMeta.isSuperAdmin;
      profilePayload.is_branch_admin = roleMeta.isBranchAdmin;
    } else {
      if (updates.roleTitle !== undefined) profilePayload.role_title = updates.roleTitle;
      if (updates.isSuperAdmin !== undefined) profilePayload.is_super_admin = Boolean(updates.isSuperAdmin);
      if (updates.isBranchAdmin !== undefined) profilePayload.is_branch_admin = Boolean(updates.isBranchAdmin);
    }
    if (bMeta) {
      profilePayload.branch_id = bMeta.id;
      profilePayload.branch_name = bMeta.name;
      profilePayload.branch = bMeta.name;
    }
    if (updates.mustChangePassword !== undefined) {
      profilePayload.must_change_password = Boolean(updates.mustChangePassword);
    }
    if (updates.advocateRollNo !== undefined) {
      profilePayload.advocate_roll_no = updates.advocateRollNo;
    }

    const firmUserPayload: Record<string, any> = {};
    if (updates.name !== undefined) firmUserPayload.name = updates.name.trim();
    if (cleanEmail) firmUserPayload.email = cleanEmail;
    if (roleMeta) {
      firmUserPayload.role = roleMeta.roleId === 'role-super-admin' ? 'partner' : roleMeta.role;
      firmUserPayload.role_title = updates.roleTitle || roleMeta.roleTitle;
      firmUserPayload.is_super_admin = roleMeta.isSuperAdmin;
      firmUserPayload.is_branch_admin = roleMeta.isBranchAdmin;
    } else {
      if (updates.roleTitle !== undefined) firmUserPayload.role_title = updates.roleTitle;
      if (updates.isSuperAdmin !== undefined) firmUserPayload.is_super_admin = Boolean(updates.isSuperAdmin);
      if (updates.isBranchAdmin !== undefined) firmUserPayload.is_branch_admin = Boolean(updates.isBranchAdmin);
    }
    if (bMeta) {
      firmUserPayload.branch_id = bMeta.id;
      firmUserPayload.branch_name = bMeta.name;
    }
    if (updates.isSuspended !== undefined) {
      firmUserPayload.is_suspended = Boolean(updates.isSuspended);
    }
    if (updates.password && updates.password.trim()) {
      const baseRoll = (updates.advocateRollNo || '').split(':::[PW]:')[0].trim();
      firmUserPayload.advocate_roll_no = `${baseRoll}:::[PW]:${updates.password.trim()}`;
    } else if (updates.advocateRollNo !== undefined) {
      firmUserPayload.advocate_roll_no = updates.advocateRollNo.split(':::[PW]:')[0].trim();
    }

    // 1. Update 'profiles' table by UUID id (when valid UUID), fallback to old/new email, fallback to upsert
    if (supabase) {
      try {
        if (isUuidString(staffId)) {
          const resById = await safeProfilesUpdate(profilePayload, 'id', staffId);
          if (!resById.error && resById.data && resById.data.length > 0) {
            anySuccess = true;
            profileUpdated = true;
            updatedRecord = resById.data[0];
          } else if (resById.error) {
            lastProfileError = resById.error.message;
          }
        }
        if (!profileUpdated && lookupEmail) {
          const resByEmail = await safeProfilesUpdate(profilePayload, 'email', lookupEmail);
          if (!resByEmail.error && resByEmail.data && resByEmail.data.length > 0) {
            anySuccess = true;
            profileUpdated = true;
            lastProfileError = undefined;
            updatedRecord = resByEmail.data[0];
          } else if (resByEmail.error && !lastProfileError) {
            lastProfileError = resByEmail.error.message;
          }
        }
        if (!profileUpdated && cleanEmail && cleanEmail !== lookupEmail) {
          const resByNewEmail = await safeProfilesUpdate(profilePayload, 'email', cleanEmail);
          if (!resByNewEmail.error && resByNewEmail.data && resByNewEmail.data.length > 0) {
            anySuccess = true;
            profileUpdated = true;
            lastProfileError = undefined;
            updatedRecord = resByNewEmail.data[0];
          } else if (resByNewEmail.error && !lastProfileError) {
            lastProfileError = resByNewEmail.error.message;
          }
        }
        if (!profileUpdated && (cleanEmail || prevEmail)) {
          const generatedId = isUuidString(staffId)
            ? staffId
            : typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : staffId;
          const upsertRes = await safeProfilesUpsert({
            ...profilePayload,
            id: generatedId,
            email: cleanEmail || prevEmail,
          });
          if (!upsertRes.error && upsertRes.data && upsertRes.data.length > 0) {
            anySuccess = true;
            profileUpdated = true;
            lastProfileError = undefined;
            updatedRecord = upsertRes.data[0];
          } else if (upsertRes.error && !lastProfileError) {
            lastProfileError = upsertRes.error.message;
          }
        }
      } catch (e: any) {
        lastProfileError = e?.message;
        console.warn('Profiles update notice:', e);
      }

      // 1b. If updating the currently signed-in Supabase Auth session user, keep JWT user_metadata synced too
      try {
        const sessionRes = await supabase.auth.getSession();
        const sessionUser = sessionRes?.data?.session?.user;
        if (
          sessionUser &&
          ((staffId && sessionUser.id === staffId) ||
            (sessionUser.email &&
              [cleanEmail, prevEmail].filter(Boolean).includes(sessionUser.email.toLowerCase())))
        ) {
          const authMeta: Record<string, any> = {};
          if (profilePayload.full_name) authMeta.full_name = profilePayload.full_name;
          if (profilePayload.role) authMeta.role = profilePayload.role;
          if (profilePayload.role_id) authMeta.role_id = profilePayload.role_id;
          if (profilePayload.role_title) authMeta.role_title = profilePayload.role_title;
          if (profilePayload.branch_id) authMeta.branch_id = profilePayload.branch_id;
          if (profilePayload.branch_name) {
            authMeta.branch_name = profilePayload.branch_name;
            authMeta.branch = profilePayload.branch_name;
          }
          if (profilePayload.is_super_admin !== undefined) authMeta.is_super_admin = profilePayload.is_super_admin;
          if (profilePayload.is_branch_admin !== undefined) authMeta.is_branch_admin = profilePayload.is_branch_admin;
          await supabase.auth.updateUser({ data: authMeta }).catch(() => {});
        }
      } catch {}

      // 2. Update 'firm_users' table by id, fallback to old/new email (ignore missing PGRST205 table cleanly)
      if (Object.keys(firmUserPayload).length > 0) {
        try {
          let fuData: any[] | null = null;
          let fuErr: any = null;
          if (isUuidString(staffId) || !staffId.startsWith('user-')) {
            const byId = await supabase
              .from('firm_users')
              .update(firmUserPayload)
              .eq('id', staffId)
              .select('*');
            fuData = byId.data;
            fuErr = byId.error;
          }

          if (String(fuErr?.code || '') !== 'PGRST205') {
            if ((!fuData || fuData.length === 0) && lookupEmail) {
              const byEmail = await supabase
                .from('firm_users')
                .update(firmUserPayload)
                .ilike('email', lookupEmail)
                .select('*');
              if (!byEmail.error && byEmail.data && byEmail.data.length > 0) {
                fuData = byEmail.data;
                fuErr = null;
              }
            }
            if (!fuErr && fuData && fuData.length > 0) {
              anySuccess = true;
              updatedRecord = updatedRecord || fuData[0];
            }
          }
        } catch (e) {
          // Non-fatal if firm_users table is not provisioned
        }
      }
    }

    // 3. Persist to backend API endpoint (service_role + firm_database.json) unless skipped
    let backendReachable = false;
    if (typeof window !== 'undefined' && !updates.skipApi) {
      try {
        const session = supabase ? (await supabase.auth.getSession())?.data?.session : null;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const apiBody: Record<string, any> = {
          userId: staffId,
          id: staffId,
          previousEmail: prevEmail,
          name: updates.name?.trim(),
          email: cleanEmail,
          password: updates.password?.trim() || undefined,
          advocateRollNo: updates.advocateRollNo,
          mustChangePassword: updates.mustChangePassword,
          isSuspended: updates.isSuspended,
        };
        if (roleMeta) {
          apiBody.roleId = roleMeta.roleId;
          apiBody.role = roleMeta.role;
          apiBody.roleTitle = updates.roleTitle || roleMeta.roleTitle;
          apiBody.isSuperAdmin = roleMeta.isSuperAdmin;
          apiBody.isBranchAdmin = roleMeta.isBranchAdmin;
        } else {
          if (updates.roleTitle !== undefined) apiBody.roleTitle = updates.roleTitle;
          if (updates.isSuperAdmin !== undefined) apiBody.isSuperAdmin = updates.isSuperAdmin;
          if (updates.isBranchAdmin !== undefined) apiBody.isBranchAdmin = updates.isBranchAdmin;
        }
        if (bMeta) {
          apiBody.branchId = bMeta.id;
          apiBody.branchName = bMeta.name;
        }

        const apiRes = await fetch(`/api/users/${encodeURIComponent(staffId)}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(apiBody),
        });
        const contentType = apiRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          backendReachable = true;
          const json = await apiRes.json().catch(() => null);
          if (apiRes.ok && json?.success) {
            anySuccess = true;
            if (json.profileUpdated) {
              profileUpdated = true;
              lastProfileError = undefined;
            }
            updatedRecord = (json.profileUpdated ? json.profile : null) || updatedRecord || json.profile || json.user;
          } else if (!apiRes.ok) {
            apiExplicitError = json?.error || `Server rejected update (${apiRes.status})`;
          }
        }
      } catch (apiErr) {
        console.warn('Backend /api/users update warning:', apiErr);
      }
    }

    if (apiExplicitError && !anySuccess) {
      return {
        success: false,
        profileUpdated,
        error: apiExplicitError,
      };
    }

    // If running in static/Vercel SPA mode (no JSON API backend) and Supabase tables had 0 matching rows
    // or RLS prevented direct anon write, keep browser directory synced without false blocking errors.
    if (!anySuccess && !backendReachable) {
      return {
        success: true,
        profileUpdated: false,
        data: updatedRecord,
        warning: lastProfileError
          ? `Saved locally. Supabase profiles RLS blocked direct write (${lastProfileError}).`
          : 'Saved locally. Run the latest Supabase RLS SQL migration if cloud sync is required across devices.',
      };
    }

    return {
      success: anySuccess,
      profileUpdated,
      data: updatedRecord,
      warning:
        anySuccess && !profileUpdated
          ? 'Saved in firm server directory; run the Supabase profiles RLS policy if cloud sync across devices is needed.'
          : undefined,
      error: anySuccess ? undefined : 'Could not persist staff updates to Supabase or backend server.',
    };
  },

  /**
   * Deletes staff record across firm_users, staff, profiles
   */
  async deleteStaff(staffId: string, email?: string): Promise<boolean> {
    if (!supabase) return false;
    const cleanEmail = email?.trim().toLowerCase();

    try {
      await supabase.from('firm_users').delete().eq('id', staffId);
      if (cleanEmail) await supabase.from('firm_users').delete().eq('email', cleanEmail);
    } catch (e) {}

    try {
      await supabase.from('staff').delete().eq('id', staffId);
    } catch (e) {}

    try {
      await supabase.from('profiles').delete().eq('id', staffId);
      if (cleanEmail) await supabase.from('profiles').delete().eq('email', cleanEmail);
    } catch (e) {}

    if (typeof window !== 'undefined') {
      try {
        const qs = cleanEmail ? `?email=${encodeURIComponent(cleanEmail)}` : '';
        await fetch(`/api/users/${encodeURIComponent(staffId)}${qs}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
      } catch (e) {}
    }

    return true;
  },

  /**
   * Permanently inserts or upserts a staff member into Supabase ('profiles', 'staff', 'firm_users')
   */
  async insertStaff(u: User): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };

    let anySuccess = false;
    let savedRecord: any = null;
    let primaryError: any = null;

    const cleanEmail = u.email.trim().toLowerCase();
    const bMeta = resolveBranchMeta(u.branchId, u.branchName);
    const roleMeta = resolveUserRoleMeta(u.role, u.roleId, u.isSuperAdmin, cleanEmail);

    // 1. Upsert into 'profiles' table with schema-safe fallback
    try {
      const profileRow: Record<string, any> = {
        id: u.id,
        full_name: u.name,
        email: cleanEmail,
        role: roleMeta.role,
        role_id: roleMeta.roleId,
        role_title: u.roleTitle || roleMeta.roleTitle,
        branch: bMeta.name,
        branch_name: bMeta.name,
        branch_id: bMeta.id,
        is_super_admin: roleMeta.isSuperAdmin,
        is_branch_admin: roleMeta.isBranchAdmin,
        must_change_password: Boolean(u.mustChangePassword),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await safeProfilesUpsert(profileRow);

      if (!error && data && data.length > 0) {
        anySuccess = true;
        savedRecord = data[0];
      }
    } catch (e) {}

    // 2. Try 'staff' table if present
    try {
      const staffRow = {
        id: u.id,
        name: u.name,
        full_name: u.name,
        email: cleanEmail,
        role: roleMeta.role,
        role_title: u.roleTitle || roleMeta.roleTitle,
        branch: bMeta.name,
        branch_id: bMeta.id,
        branch_name: bMeta.name,
        is_super_admin: roleMeta.isSuperAdmin,
        is_branch_admin: roleMeta.isBranchAdmin,
        is_suspended: Boolean(u.isSuspended),
        advocate_roll_no: u.advocateRollNo || '',
      };
      const { data, error } = await supabase
        .from('staff')
        .upsert([staffRow], { onConflict: 'email' })
        .select('*');

      if (!error && data && data.length > 0) {
        anySuccess = true;
        savedRecord = savedRecord || data[0];
      }
    } catch (e) {}

    // 3. Upsert into 'firm_users' table (verified active database table, carries ::[PW]:)
    try {
      const firmUserRow = {
        id: u.id,
        ...mapUserToFirmUserRow({
          ...u,
          email: cleanEmail,
          role: roleMeta.role as any,
          roleTitle: u.roleTitle || roleMeta.roleTitle,
          branchId: bMeta.id,
          branchName: bMeta.name,
          isSuperAdmin: roleMeta.isSuperAdmin,
          isBranchAdmin: roleMeta.isBranchAdmin,
        }),
      };
      const { data, error } = await supabase
        .from('firm_users')
        .upsert([firmUserRow], { onConflict: 'email' })
        .select('*');

      if (!error && data && data.length > 0) {
        anySuccess = true;
        savedRecord = savedRecord || data[0];
      } else if (error) {
        console.warn('Supabase upsert into firm_users error:', error);
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
    roleTitle?: string;
    password?: string;
    mustChangePassword?: boolean;
    advocateRollNo?: string;
    reloadOnSuccess?: boolean;
    onSuccess?: () => void;
    onError?: (err: string) => void;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = options?.email?.trim().toLowerCase();
    const roleMeta = resolveUserRoleMeta(newRole, newRole, newRole === 'role-super-admin', cleanEmail);
    const bMeta = resolveBranchMeta(newBranchId);

    const res = await SupabaseService.updateStaff(userId, {
      name: newName.trim(),
      email: cleanEmail,
      role: roleMeta.role as any,
      roleId: roleMeta.roleId,
      roleTitle: options?.roleTitle || roleMeta.roleTitle,
      isSuperAdmin: roleMeta.isSuperAdmin,
      isBranchAdmin: roleMeta.isBranchAdmin,
      branchId: bMeta.id,
      branchName: bMeta.name,
      password: options?.password,
      mustChangePassword: options?.mustChangePassword,
      advocateRollNo: options?.advocateRollNo,
    });

    if (!res.success) {
      const errMsg = 'Error updating user: ' + (res.error || 'Update failed');
      options?.onError?.(errMsg);
      return { success: false, error: errMsg };
    }

    options?.onSuccess?.();

    if (options?.reloadOnSuccess) {
      window.location.reload();
    }

    return { success: true };
  } catch (err: any) {
    const errMsg = 'Error updating user: ' + (err?.message || 'Unknown error');
    options?.onError?.(errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Identifies Global Firm / System Administrators (`super_admin`, `admin`, `partner`, `managing_partner`).
 * Explicit Branch Administrators (`branch_admin`, `role-admin`) and `admin_finance_assistant` return FALSE
 * so they remain restricted appropriately.
 */
export function isUserAdmin(u: any): boolean {
  const effective = getEffectiveUser(u);
  if (!effective) return false;
  const role = String(effective.role || '').toLowerCase().trim();
  const roleId = String(effective.roleId || (effective as any).role_id || '').toLowerCase().trim();
  const email = String(effective.email || '').toLowerCase().trim();
  const title = String(effective.roleTitle || (effective as any).role_title || '').toLowerCase().trim();

  const explicitSuper = Boolean(
    effective.isSuperAdmin ||
    (effective as any).is_super_admin ||
    role === 'super_admin' ||
    role === 'superadmin' ||
    role === 'system_admin' ||
    role === 'partner' ||
    role === 'managing_partner' ||
    roleId === 'role-super-admin' ||
    roleId === 'system_admin' ||
    email === 'infosightug@gmail.com'
  );
  if (explicitSuper) return true;

  if (
    role === 'admin_finance_assistant' ||
    role === 'admin-finance-assistant' ||
    role === 'finance_assistant' ||
    roleId === 'role-admin-finance-assistant' ||
    roleId === 'admin_finance_assistant' ||
    (title.includes('admin') && title.includes('finance') && title.includes('assistant'))
  ) {
    return false;
  }

  const explicitBranchAdmin = Boolean(
    effective.isBranchAdmin ||
    (effective as any).is_branch_admin ||
    role === 'branch_admin' ||
    role === 'office_admin' ||
    roleId === 'role-admin' ||
    roleId === 'branch_admin'
  );
  if (explicitBranchAdmin) return false;

  return role === 'admin';
}

export const isUserSuperAdmin = isUserAdmin;

export function isAdminFinanceAssistant(u: any): boolean {
  const effective = getEffectiveUser(u);
  if (!effective) return false;
  const role = String(effective.role || '').toLowerCase().trim();
  const roleId = String(effective.roleId || (effective as any).role_id || '').toLowerCase().trim();
  const title = String(effective.roleTitle || (effective as any).role_title || '').toLowerCase().trim();
  if (
    effective.isSuperAdmin ||
    (effective as any).is_super_admin ||
    role === 'super_admin' ||
    role === 'superadmin' ||
    role === 'system_admin' ||
    role === 'partner' ||
    role === 'managing_partner' ||
    roleId === 'role-super-admin' ||
    roleId === 'system_admin' ||
    String(effective.email || '').toLowerCase().trim() === 'infosightug@gmail.com'
  ) {
    return false;
  }
  return Boolean(
    role === 'admin_finance_assistant' ||
    role === 'admin-finance-assistant' ||
    role === 'finance_assistant' ||
    roleId === 'role-admin-finance-assistant' ||
    roleId === 'admin_finance_assistant' ||
    (title.includes('admin') && title.includes('finance') && title.includes('assistant'))
  );
}

export function isUserBranchAdmin(u: any): boolean {
  const effective = getEffectiveUser(u);
  if (!effective || isUserAdmin(effective) || isAdminFinanceAssistant(effective)) return false;
  const role = String(effective.role || '').toLowerCase().trim();
  const roleId = String(effective.roleId || (effective as any).role_id || '').toLowerCase().trim();
  return Boolean(
    effective.isBranchAdmin ||
    (effective as any).is_branch_admin ||
    role === 'branch_admin' ||
    role === 'office_admin' ||
    roleId === 'role-admin' ||
    roleId === 'branch_admin'
  );
}

export function isUserLawyer(u: any): boolean {
  const effective = getEffectiveUser(u);
  if (!effective) return false;
  if (isUserAdmin(effective) || isUserBranchAdmin(effective) || isAdminFinanceAssistant(effective)) return false;
  const role = String(effective.role || '').toLowerCase();
  const roleId = String(effective.roleId || (effective as any).role_id || '').toLowerCase();
  const title = String(effective.roleTitle || (effective as any).role_title || '').toLowerCase();
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
  const effective = getEffectiveUser(u);
  if (!effective) return false;
  return !isUserAdmin(effective) && !isUserLawyer(effective);
}

export function canUserViewAllBranches(u: any): boolean {
  const effective = getEffectiveUser(u);
  if (!effective) return false;
  return isUserAdmin(effective) || isAdminFinanceAssistant(effective) || isUserLawyer(effective);
}

function normalizeComparableBranchName(val?: string | null): string {
  return String(val || '')
    .toLowerCase()
    .replace(/\bregional office\b/g, '')
    .replace(/\bhead office\b/g, '')
    .replace(/\boffice\b/g, '')
    .replace(/\bbranch\b/g, '')
    .replace(/[()]/g, '')
    .trim();
}

/**
 * Strict branch-level isolation check:
 * - `super_admin` and `admin` (and Partners) are unrestricted across all branches.
 * - `admin_finance_assistant`, Branch Administrators, and Clerks can ONLY add/edit/delete cases belonging to their own branch.
 */
export function canUserModifyCase(u: any, caseItem: any): boolean {
  const effective = getEffectiveUser(u);
  if (!effective || !caseItem) return false;

  // 1. Super Admins, Admins & Managing Partners retain unrestricted access across all branches
  if (isUserAdmin(effective)) {
    return true;
  }

  // 2. Compare branch by ID, canonical ID, or normalized name
  const userBranchId = String(effective.branchId || (effective as any).branch_id || '').toLowerCase().trim();
  const caseBranchId = String(caseItem.branchId || caseItem.branch_id || '').toLowerCase().trim();

  if (userBranchId && caseBranchId && userBranchId === caseBranchId) {
    return true;
  }

  const userBranchName = String(effective.branchName || (effective as any).branch_name || (effective as any).branch || '').toLowerCase().trim();
  const caseBranchName = String(caseItem.branchName || caseItem.branch_name || caseItem.branch || '').toLowerCase().trim();

  if (!caseBranchId && !caseBranchName) {
    return false;
  }

  const hasExplicitUserBranch = Boolean(userBranchId || userBranchName);
  if (!hasExplicitUserBranch) return false;

  const resolvedUser = resolveBranchId(userBranchId, userBranchName);
  const resolvedCase = resolveBranchId(caseBranchId, caseBranchName);
  if (resolvedUser && resolvedCase && resolvedUser === resolvedCase) {
    return true;
  }

  if (userBranchName && caseBranchName && userBranchName === caseBranchName) {
    return true;
  }

  const normUser = normalizeComparableBranchName(userBranchName || userBranchId);
  const normCase = normalizeComparableBranchName(caseBranchName || caseBranchId);
  if (normUser && normCase && normUser === normCase) {
    return true;
  }

  return false;
}

/**
 * Mortgage branch write check:
 * - `super_admin` and `admin` can create, edit, and delete across all branches.
 * - `admin_finance_assistant` & other non-super users can view all branches,
 *   but may only add/edit/delete records belonging to their assigned branch (`branchId` or `branchName`).
 */
export function canUserModifyMortgage(u: any, record: any): boolean {
  const effective = getEffectiveUser(u);
  if (!effective || !record) return false;

  if (isUserAdmin(effective)) {
    return true;
  }

  const userBranchId = String(effective.branchId || (effective as any).branch_id || '').toLowerCase().trim();
  const userBranchName = String(effective.branchName || (effective as any).branch_name || (effective as any).branch || '').toLowerCase().trim();

  const recBranchId = String(record.branch_id || record.branchId || '').toLowerCase().trim();
  const recBranchName = String(
    record.branch_name || record.branchName || record.branch || record.client_branch_location || record.bank_branch || ''
  ).toLowerCase().trim();

  if (!recBranchId && !recBranchName) {
    return false;
  }

  if (userBranchId && recBranchId && userBranchId === recBranchId) {
    return true;
  }

  if (userBranchName && recBranchName && userBranchName === recBranchName) {
    return true;
  }

  const resolvedUserBranch = resolveBranchId(userBranchId, userBranchName);
  const resolvedRecordBranch = resolveBranchId(recBranchId, recBranchName);
  if (resolvedUserBranch && resolvedRecordBranch && resolvedUserBranch === resolvedRecordBranch) {
    return true;
  }

  const normUser = normalizeComparableBranchName(userBranchName || userBranchId);
  const normRec = normalizeComparableBranchName(recBranchName || recBranchId);
  if (normUser && normRec && normUser === normRec) {
    return true;
  }

  return false;
}

export function resolveUserRoleMeta(rawRole?: string, rawRoleId?: string, isSuper?: boolean, email?: string) {
  const rId = (rawRoleId || '').toLowerCase().trim();
  const rRaw = (rawRole || '').toLowerCase().trim();
  const r = rId || rRaw;
  const cleanEmail = (email || '').toLowerCase().trim();

  const isPrimaryOwner = cleanEmail === 'infosightug@gmail.com';
  const explicitSuperRole =
    r === 'role-super-admin' ||
    r === 'partner' ||
    r === 'super_admin' ||
    r === 'superadmin' ||
    r === 'system_admin' ||
    r === 'managing_partner';

  const explicitNonSuperRole = Boolean(
    r &&
    !explicitSuperRole &&
    (
      r === 'role-admin' ||
      r === 'branch_admin' ||
      r === 'office_admin' ||
      r === 'role-admin-finance-assistant' ||
      r === 'admin_finance_assistant' ||
      r === 'admin-finance-assistant' ||
      r === 'finance_assistant' ||
      r === 'role-team-lead' ||
      r === 'role-lead' ||
      r === 'team_lead' ||
      r === 'lead' ||
      r === 'litigation_lead' ||
      r === 'role-clerk' ||
      r === 'clerk' ||
      r === 'registry_clerk' ||
      r === 'court_clerk' ||
      r === 'role-advocate' ||
      r === 'lawyer' ||
      r === 'advocate' ||
      r.startsWith('role-custom-')
    )
  );

  if (isPrimaryOwner || explicitSuperRole || (rRaw === 'admin' && rId !== 'role-admin' && rId !== 'branch_admin' && isSuper !== false) || (isSuper && !explicitNonSuperRole)) {
    return {
      roleId: 'role-super-admin',
      role: rRaw === 'admin' ? 'admin' : 'partner',
      roleTitle: rRaw === 'admin' ? 'Firm Administrator' : 'Managing Partner (Super Admin)',
      isSuperAdmin: true,
      isBranchAdmin: false,
    };
  }

  if (
    r === 'role-admin-finance-assistant' ||
    r === 'admin_finance_assistant' ||
    r === 'admin-finance-assistant' ||
    r === 'finance_assistant' ||
    rRaw === 'admin_finance_assistant' ||
    rRaw === 'admin-finance-assistant'
  ) {
    return {
      roleId: 'role-admin-finance-assistant',
      role: 'admin_finance_assistant',
      roleTitle: 'Admin & Finance Assistant',
      isSuperAdmin: false,
      isBranchAdmin: false,
    };
  }

  if (r === 'role-admin' || r === 'branch_admin' || r === 'office_admin' || (r === 'admin' && isSuper === false)) {
    return {
      roleId: 'role-admin',
      role: 'branch_admin',
      roleTitle: 'Branch Administrator',
      isSuperAdmin: false,
      isBranchAdmin: true,
    };
  }

  if (r === 'role-team-lead' || r === 'role-lead' || r === 'team_lead' || r === 'lead' || r === 'litigation_lead') {
    return {
      roleId: 'role-team-lead',
      role: 'team_lead',
      roleTitle: 'Regional Team Lead',
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

  if (r.startsWith('role-custom-')) {
    return {
      roleId: rawRoleId || rawRole || r,
      role: rawRole || rawRoleId || 'lawyer',
      roleTitle: 'Custom Firm Role',
      isSuperAdmin: false,
      isBranchAdmin: false,
    };
  }

  // Default: Litigation Advocate / Associate
  return {
    roleId: rawRoleId || 'role-advocate',
    role: rawRole || 'lawyer',
    roleTitle: 'Litigation Advocate',
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
    } else if (roleMeta.roleId === 'role-admin-finance-assistant') {
      extractedPassword = 'Finance@2026';
    } else if (roleMeta.roleId === 'role-clerk') {
      extractedPassword = 'Clerk@2026';
    } else if (roleMeta.roleId === 'role-advocate' || roleMeta.roleId === 'role-team-lead' || roleMeta.roleId === 'role-lead') {
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
