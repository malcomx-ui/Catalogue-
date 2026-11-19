import { supabase, isSupabaseConfigured } from './supabase';

export type RequisitionStage =
  | 'Pending Review'
  | 'Level 1 Approved'
  | 'Approved'
  | 'Denied';

export type ApprovalActionType = 'Reviewed' | 'Approved' | 'Denied';

export interface RequisitionDecisionLog {
  id: string;
  action: ApprovalActionType;
  actorName: string;
  actorRole: string;
  levelLabel: string;
  reason: string;
  timestamp: string;
}

export interface CashRequisitionItem {
  id: string;
  referenceCode: string;
  requesterName: string;
  requesterRole: string;
  branch: string;
  caseRef?: string;
  purpose: string;
  amount: number;
  currency: 'UGX' | 'USD';
  stage: RequisitionStage;
  currentLevel: 1 | 2;
  createdAt: string;
  logs: RequisitionDecisionLog[];
}

export interface RequisitionNotification {
  id: string;
  requisitionId: string;
  referenceCode: string;
  recipientName: string;
  status: ApprovalActionType;
  reason: string;
  actorName: string;
  createdAt: string;
  unread: boolean;
}

export interface CreateCashRequisitionInput {
  purpose: string;
  amount: number;
  currency: 'UGX' | 'USD';
  branch: string;
  caseRef?: string;
  requesterName: string;
  requesterRole: string;
}

export const REQUISITIONS_STORAGE_KEY = 'mk_cash_requisitions_v1';
export const NOTIFICATIONS_STORAGE_KEY = 'mk_cash_requisition_notifications_v1';

export const INITIAL_REQUISITIONS: CashRequisitionItem[] = [
  {
    id: 'req-1',
    referenceCode: 'CR-2026-014',
    requesterName: 'Amara Patel',
    requesterRole: 'Senior Paralegal & File Custodian',
    branch: 'Kampala Central (Head Office)',
    caseRef: 'HC-2026-CV-019',
    purpose: 'Court filing fees, process service & registry search stamps',
    amount: 480000,
    currency: 'UGX',
    stage: 'Pending Review',
    currentLevel: 1,
    createdAt: '2026-11-19 09:30 AM',
    logs: [
      {
        id: 'log-1',
        action: 'Reviewed',
        actorName: 'System Intake',
        actorRole: 'Registry Desk',
        levelLabel: 'Intake Check',
        reason: 'Receipt checklist attached and case reference verified.',
        timestamp: '2026-11-19 09:35 AM',
      },
    ],
  },
  {
    id: 'req-2',
    referenceCode: 'CR-2026-015',
    requesterName: 'Julian Thorne',
    requesterRole: 'Litigation Associate',
    branch: 'Mbarara Branch',
    caseRef: 'MB-2026-LD-008',
    purpose: 'Witness transport & regional court appearance facilitation',
    amount: 320000,
    currency: 'UGX',
    stage: 'Level 1 Approved',
    currentLevel: 2,
    createdAt: '2026-11-18 02:15 PM',
    logs: [
      {
        id: 'log-2',
        action: 'Approved',
        actorName: 'Marcus Sterling',
        actorRole: 'Branch / Litigation Lead',
        levelLabel: 'Level 1 Approval',
        reason: 'Regional hearing schedule confirmed; cleared for final finance sign-off.',
        timestamp: '2026-11-18 04:40 PM',
      },
    ],
  },
];

export const INITIAL_NOTIFICATIONS: RequisitionNotification[] = [
  {
    id: 'notif-1',
    requisitionId: 'req-2',
    referenceCode: 'CR-2026-015',
    recipientName: 'Julian Thorne',
    status: 'Approved',
    reason: 'Regional hearing schedule confirmed; cleared for final finance sign-off.',
    actorName: 'Marcus Sterling (Level 1 Review / Approval)',
    createdAt: '2026-11-18 04:40 PM',
    unread: true,
  },
];

export function formatRequisitionMoney(amount: number, currency: 'UGX' | 'USD'): string {
  const formatted = Number(amount || 0).toLocaleString('en-US', {
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  });
  return `${currency} ${formatted}`;
}

export function formatTimestampNow(): string {
  return new Date().toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateNextReferenceCode(existing: CashRequisitionItem[]): string {
  const year = new Date().getFullYear();
  let maxSeq = 13;
  existing.forEach((item) => {
    const match = String(item.referenceCode || '').match(/CR-\d{4}-(\d+)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > maxSeq) {
        maxSeq = n;
      }
    }
  });
  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `CR-${year}-${nextSeq}`;
}

export function loadLocalRequisitions(): CashRequisitionItem[] {
  if (typeof window === 'undefined') return INITIAL_REQUISITIONS;
  try {
    const raw = window.localStorage.getItem(REQUISITIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupted cache
  }
  return INITIAL_REQUISITIONS;
}

export function saveLocalRequisitions(items: CashRequisitionItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(REQUISITIONS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage quota errors
  }
}

export function loadLocalNotifications(): RequisitionNotification[] {
  if (typeof window === 'undefined') return INITIAL_NOTIFICATIONS;
  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupted cache
  }
  return INITIAL_NOTIFICATIONS;
}

export function saveLocalNotifications(items: RequisitionNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage quota errors
  }
}

export function buildNewCashRequisition(
  existing: CashRequisitionItem[],
  input: CreateCashRequisitionInput
): CashRequisitionItem {
  const nowLabel = formatTimestampNow();
  const refCode = generateNextReferenceCode(existing);
  const stamp = Date.now();
  return {
    id: `req-${stamp}`,
    referenceCode: refCode,
    requesterName: input.requesterName.trim() || 'Firm Staff',
    requesterRole: input.requesterRole.trim() || 'Staff Member',
    branch: input.branch.trim() || 'Kampala Central (Head Office)',
    caseRef: input.caseRef?.trim() || undefined,
    purpose: input.purpose.trim(),
    amount: Number(input.amount),
    currency: input.currency,
    stage: 'Pending Review',
    currentLevel: 1,
    createdAt: nowLabel,
    logs: [
      {
        id: `log-${stamp}`,
        action: 'Reviewed',
        actorName: input.requesterName.trim() || 'Firm Staff',
        actorRole: input.requesterRole.trim() || 'Staff Member',
        levelLabel: 'Submission Logged',
        reason: 'Requisition submitted for Level 1 review.',
        timestamp: nowLabel,
      },
    ],
  };
}

export function applyRequisitionDecision(
  req: CashRequisitionItem,
  action: ApprovalActionType,
  actorName: string,
  actorRole: string,
  reason: string
): { updated: CashRequisitionItem; notification: RequisitionNotification } {
  const cleanReason = reason.trim();
  const nowLabel = formatTimestampNow();
  const levelLabel =
    req.currentLevel === 1 ? 'Level 1 Review / Approval' : 'Level 2 Final Approval';

  let nextStage: RequisitionStage = req.stage;
  let nextLevel: 1 | 2 = req.currentLevel;

  if (action === 'Denied') {
    nextStage = 'Denied';
  } else if (action === 'Reviewed') {
    nextStage = req.currentLevel === 1 ? 'Pending Review' : 'Level 1 Approved';
  } else if (action === 'Approved') {
    if (req.currentLevel === 1) {
      nextStage = 'Level 1 Approved';
      nextLevel = 2;
    } else {
      nextStage = 'Approved';
    }
  }

  const stamp = Date.now();
  const newLog: RequisitionDecisionLog = {
    id: `log-${stamp}`,
    action,
    actorName,
    actorRole,
    levelLabel,
    reason: cleanReason,
    timestamp: nowLabel,
  };

  const updated: CashRequisitionItem = {
    ...req,
    stage: nextStage,
    currentLevel: nextLevel,
    logs: [...req.logs, newLog],
  };

  const notification: RequisitionNotification = {
    id: `notif-${stamp}`,
    requisitionId: req.id,
    referenceCode: req.referenceCode,
    recipientName: req.requesterName,
    status: action,
    reason: cleanReason,
    actorName: `${actorName} (${levelLabel})`,
    createdAt: nowLabel,
    unread: true,
  };

  return { updated, notification };
}

// Track whether remote table exists in Supabase so we never spam 404 requests
let remoteTableAvailable: boolean | null = null;

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === 'PGRST116' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist') ||
    msg.includes('not found')
  );
}

/**
 * Best-effort read of cash requisitions using the single shared Supabase client.
 * Gracefully falls back to local state if the optional `cash_requisitions` table
 * has not been created in the Supabase schema yet.
 */
export async function fetchCashRequisitionsFromSupabase(): Promise<CashRequisitionItem[] | null> {
  if (!isSupabaseConfigured || remoteTableAvailable === false) return null;
  try {
    const { data, error } = await supabase
      .from('cash_requisitions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      if (isMissingTableError(error)) {
        remoteTableAvailable = false;
      }
      return null;
    }

    remoteTableAvailable = true;
    if (!Array.isArray(data) || data.length === 0) return null;

    return data.map((row: any): CashRequisitionItem => ({
      id: String(row.id),
      referenceCode: String(row.reference_code || row.referenceCode || 'CR-2026-000'),
      requesterName: String(row.requester_name || row.requesterName || 'Firm Staff'),
      requesterRole: String(row.requester_role || row.requesterRole || 'Staff Member'),
      branch: String(row.branch || 'Kampala Central (Head Office)'),
      caseRef: row.case_ref || row.caseRef || undefined,
      purpose: String(row.purpose || ''),
      amount: Number(row.amount || 0),
      currency: row.currency === 'USD' ? 'USD' : 'UGX',
      stage: (row.stage as RequisitionStage) || 'Pending Review',
      currentLevel: Number(row.current_level || row.currentLevel) === 2 ? 2 : 1,
      createdAt: String(row.created_at_label || row.created_at || formatTimestampNow()),
      logs: Array.isArray(row.logs) ? row.logs : [],
    }));
  } catch {
    return null;
  }
}

/**
 * Best-effort persistence of a cash requisition using the shared Supabase client.
 * Silently no-ops if the optional table does not exist in Supabase yet.
 */
export async function syncCashRequisitionToSupabase(item: CashRequisitionItem): Promise<void> {
  if (!isSupabaseConfigured || remoteTableAvailable === false) return;
  try {
    const { error } = await supabase.from('cash_requisitions').upsert(
      {
        id: item.id,
        reference_code: item.referenceCode,
        requester_name: item.requesterName,
        requester_role: item.requesterRole,
        branch: item.branch,
        case_ref: item.caseRef || null,
        purpose: item.purpose,
        amount: item.amount,
        currency: item.currency,
        stage: item.stage,
        current_level: item.currentLevel,
        created_at_label: item.createdAt,
        logs: item.logs,
      },
      { onConflict: 'id' }
    );
    if (error && isMissingTableError(error)) {
      remoteTableAvailable = false;
    }
  } catch {
    // non-fatal; localStorage persistence already succeeded
  }
}
