import type { CaseItem, CourtHearing, NotificationRulesConfig } from '../types';
import type { RequisitionNotification } from '../lib/cashRequisitionStore';
import {
  formatAnnouncementTimestamp,
  type FirmAnnouncement,
} from '../lib/announcementsStore';
import { DEFAULT_NOTIFICATION_RULES } from '../data/defaultSettings';

export type UnifiedNotificationCategory = 'announcement' | 'requisition' | 'hearing' | 'approval';

export interface UnifiedNotificationItem {
  id: string;
  category: UnifiedNotificationCategory;
  /** Lower number = higher priority (1 = urgent/today/new announcement, 2 = decision/approval, 3 = upcoming deadline) */
  priority: 1 | 2 | 3;
  unread: boolean;
  code: string;
  badgeLabel: string;
  badgeTone: 'danger' | 'success' | 'warning' | 'gold' | 'navy';
  title: string;
  subtitle: string;
  body: string;
  timestampLabel: string;
  targetTab: 'announcements' | 'cash_requisitions' | 'causelist' | 'approvals';
  /** Original RequisitionNotification id when category === 'requisition' */
  requisitionNotificationId?: string;
  /** Days until hearing/deadline (0 = today, >0 = future) when category === 'hearing' */
  daysUntil?: number;
  /** Epoch ms for recency sorting on newly posted announcements */
  createdAtMs?: number;
}

export interface EvaluateNotificationRulesParams {
  rules?: Partial<NotificationRulesConfig> | null;
  canAccessRestrictedWorkflow: boolean;
  isSuperAdmin: boolean;
  selectedBranchFilter: string;
  userBranchId?: string | null;
  userBranchName?: string | null;
  decisionNotifications: RequisitionNotification[];
  hearings: CourtHearing[];
  cases: CaseItem[];
  approvalsBadgeCount: number;
  readAlertIds: string[];
  announcements?: FirmAnnouncement[];
}

export function resolveNotificationRules(
  rules?: Partial<NotificationRulesConfig> | null
): NotificationRulesConfig {
  const leadDays = Number(rules?.hearingLeadDays);
  return {
    ...DEFAULT_NOTIFICATION_RULES,
    ...(rules || {}),
    hearingLeadDays:
      Number.isFinite(leadDays) && leadDays >= 1 && leadDays <= 60
        ? Math.round(leadDays)
        : DEFAULT_NOTIFICATION_RULES.hearingLeadDays,
  };
}

function getLocalTodayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseIsoDateOnly(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function diffDaysFromToday(isoDate: string, todayIso: string): number {
  const target = new Date(`${isoDate}T00:00:00`);
  const today = new Date(`${todayIso}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function normalizeBranchToken(val?: string | null): string {
  return String(val || '')
    .trim()
    .toLowerCase()
    .replace(/\s+branch$/i, '')
    .replace(/\s*\(head office\)$/i, '')
    .trim();
}

function matchesBranchScope(
  itemBranchId: string | undefined,
  itemBranchName: string | undefined,
  activeBranchFilter: string,
  userBranchId: string | null | undefined,
  userBranchName: string | null | undefined,
  isSuperAdmin: boolean,
  branchScopedAlerts: boolean
): boolean {
  if (!branchScopedAlerts) return true;

  const filterActive = activeBranchFilter && activeBranchFilter !== 'all';
  if (filterActive) {
    const filterNorm = normalizeBranchToken(activeBranchFilter);
    if (itemBranchId && itemBranchId === activeBranchFilter) return true;
    if (itemBranchId && normalizeBranchToken(itemBranchId) === filterNorm) return true;
    if (itemBranchName && normalizeBranchToken(itemBranchName).includes(filterNorm)) return true;
    return !itemBranchId && !itemBranchName;
  }

  // When filter is 'all', Super Admins see firm-wide alerts; regular staff see their assigned branch
  if (isSuperAdmin) return true;
  if (!userBranchId && !userBranchName) return true;

  const userIdNorm = normalizeBranchToken(userBranchId);
  const userNameNorm = normalizeBranchToken(userBranchName);
  const itemIdNorm = normalizeBranchToken(itemBranchId);
  const itemNameNorm = normalizeBranchToken(itemBranchName);

  if (!itemIdNorm && !itemNameNorm) return true;
  if (userIdNorm && itemIdNorm && userIdNorm === itemIdNorm) return true;
  if (userNameNorm && itemNameNorm && (itemNameNorm.includes(userNameNorm) || userNameNorm.includes(itemNameNorm))) {
    return true;
  }
  return false;
}

export function getAlertReadStorageKey(userId?: string | null, userEmail?: string | null): string {
  const userKey = userId || userEmail || 'staff';
  return `mk_read_unified_alerts_v1_${String(userKey).toLowerCase()}`;
}

export function loadReadAlertIds(storageKey: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function persistReadAlertIds(storageKey: string, ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Evaluates all configured Notification Rules (RBAC, lead-time window, past-date exclusion,
 * branch scoping, category toggles, and priority ordering) to produce the unified notification feed.
 */
export function evaluateNotificationRules(
  params: EvaluateNotificationRulesParams
): {
  rules: NotificationRulesConfig;
  allItems: UnifiedNotificationItem[];
  unreadItems: UnifiedNotificationItem[];
  latestUnread: UnifiedNotificationItem | null;
} {
  const rules = resolveNotificationRules(params.rules);
  const readSet = new Set(params.readAlertIds);
  const todayIso = getLocalTodayIso();
  const items: UnifiedNotificationItem[] = [];

  // 0. Firm Announcements (staff-published notices immediately trigger bell + persistent unread popup)
  if (Array.isArray(params.announcements) && params.announcements.length > 0) {
    params.announcements.forEach((ann) => {
      if (ann.isSeed) return;
      const scopeNorm = String(ann.branchScope || '').trim().toLowerCase();
      const isFirmWide =
        !scopeNorm ||
        scopeNorm === 'all branches' ||
        scopeNorm === 'all firm branches' ||
        scopeNorm === 'all' ||
        scopeNorm === 'regional chambers';

      if (
        !isFirmWide &&
        !matchesBranchScope(
          undefined,
          ann.branchScope,
          params.selectedBranchFilter,
          params.userBranchId,
          params.userBranchName,
          params.isSuperAdmin,
          rules.branchScopedAlerts
        )
      ) {
        return;
      }

      const alertId = `announcement_${ann.id}`;
      const isUrgent = ann.priority === 'Urgent';
      const createdAtMs = new Date(ann.createdAtIso || 0).getTime() || Date.now();

      items.push({
        id: alertId,
        category: 'announcement',
        priority: 1,
        unread: !readSet.has(alertId),
        code: isUrgent ? 'URGENT NOTICE' : 'ANNOUNCEMENT',
        badgeLabel: isUrgent ? 'Urgent' : ann.pinned ? 'Pinned' : ann.category,
        badgeTone: isUrgent ? 'danger' : 'gold',
        title: ann.title,
        subtitle: `By ${ann.issuer}${ann.issuerRole ? ` · ${ann.issuerRole}` : ''} · ${ann.branchScope}`,
        body: ann.body,
        timestampLabel: formatAnnouncementTimestamp(ann.createdAtIso, ann.date),
        targetTab: 'announcements',
        createdAtMs,
      });
    });
  }

  // 1. Restricted Cash Requisition Decision Notifications (RBAC-enforced)
  if (params.canAccessRestrictedWorkflow && rules.enableCashRequisitionAlerts) {
    params.decisionNotifications.forEach((n) => {
      const badgeTone: UnifiedNotificationItem['badgeTone'] =
        n.status === 'Denied' ? 'danger' : n.status === 'Approved' ? 'success' : 'warning';
      items.push({
        id: `req_notif_${n.id}`,
        category: 'requisition',
        priority: n.status === 'Denied' ? 1 : 2,
        unread: Boolean(n.unread),
        code: n.referenceCode,
        badgeLabel: n.status,
        badgeTone,
        title: `Cash Requisition ${n.status}`,
        subtitle: `For ${n.recipientName} · By ${n.actorName}`,
        body: `Reason: "${n.reason}"`,
        timestampLabel: n.createdAt,
        targetTab: 'cash_requisitions',
        requisitionNotificationId: n.id,
      });
    });
  }

  // 2. Restricted Pending Approval Queue Alert (RBAC-enforced)
  if (
    params.canAccessRestrictedWorkflow &&
    rules.enableApprovalAlerts &&
    params.approvalsBadgeCount > 0
  ) {
    const approvalAlertId = `approvals_queue_${todayIso}_${params.approvalsBadgeCount}`;
    items.push({
      id: approvalAlertId,
      category: 'approval',
      priority: 2,
      unread: !readSet.has(approvalAlertId),
      code: 'APPROVALS',
      badgeLabel: `${params.approvalsBadgeCount} Pending`,
      badgeTone: 'gold',
      title: 'Pending Workflow Approvals',
      subtitle: 'Action required in Approvals Queue',
      body: `${params.approvalsBadgeCount} item${params.approvalsBadgeCount === 1 ? '' : 's'} awaiting executive review or sign-off.`,
      timestampLabel: `Active · ${todayIso}`,
      targetTab: 'approvals',
    });
  }

  // 3. Upcoming Court Hearings & Case Filing Deadlines (lead-time window + branch scope + past exclusion)
  if (rules.enableHearingAlerts) {
    const seenCaseDates = new Set<string>();

    params.hearings.forEach((h) => {
      if (h.status !== 'Scheduled') return;
      const isoDate = parseIsoDateOnly(h.hearingDate);
      if (!isoDate) return;

      const daysUntil = diffDaysFromToday(isoDate, todayIso);
      if (rules.excludePastHearings && daysUntil < 0) return;
      if (daysUntil > rules.hearingLeadDays) return;

      const linkedCase = params.cases.find(
        (c) => c.id === h.caseId || (c.suitNumber && h.suitNumber && c.suitNumber === h.suitNumber)
      );

      if (
        !matchesBranchScope(
          h.branchId || linkedCase?.branchId,
          linkedCase?.branchName,
          params.selectedBranchFilter,
          params.userBranchId,
          params.userBranchName,
          params.isSuperAdmin,
          rules.branchScopedAlerts
        )
      ) {
        return;
      }

      if (linkedCase?.id) {
        seenCaseDates.add(`${linkedCase.id}__${isoDate}`);
      }
      if (h.suitNumber) {
        seenCaseDates.add(`${h.suitNumber.toLowerCase()}__${isoDate}`);
      }

      const alertId = `hearing_${h.id}_${isoDate}`;
      const isToday = daysUntil === 0;
      const isOverdue = daysUntil < 0;
      const timingLabel = isToday
        ? 'Today'
        : isOverdue
        ? `${Math.abs(daysUntil)}d overdue`
        : daysUntil === 1
        ? 'Tomorrow'
        : `In ${daysUntil} days`;

      items.push({
        id: alertId,
        category: 'hearing',
        priority: isToday || isOverdue ? 1 : 3,
        unread: !readSet.has(alertId),
        code: h.suitNumber || linkedCase?.case_number || 'COURT DATE',
        badgeLabel: timingLabel,
        badgeTone: isToday || isOverdue ? 'danger' : 'gold',
        title: h.caseTitle || linkedCase?.title || 'Scheduled Court Appearance',
        subtitle: `${isoDate}${h.hearingTime ? ` · ${h.hearingTime}` : ''}`,
        body: `${h.hearingPurpose || 'Court Hearing'} · ${h.courtName || linkedCase?.court || 'Court Registry'}`,
        timestampLabel: `${isoDate} (${timingLabel})`,
        targetTab: 'causelist',
        daysUntil,
      });
    });

    // Also include active cases whose nextHearingDate / hearing_date falls in the lead window (not already in court_hearings)
    params.cases.forEach((c) => {
      const statusLower = String(c.status || '').toLowerCase();
      if (statusLower === 'closed' || statusLower === 'accomplished' || statusLower === 'archived') {
        return;
      }
      const isoDate = parseIsoDateOnly(c.nextHearingDate || c.hearing_date);
      if (!isoDate) return;

      const daysUntil = diffDaysFromToday(isoDate, todayIso);
      if (rules.excludePastHearings && daysUntil < 0) return;
      if (daysUntil > rules.hearingLeadDays) return;

      const refKey = (c.suitNumber || c.case_number || '').toLowerCase();
      if (seenCaseDates.has(`${c.id}__${isoDate}`) || (refKey && seenCaseDates.has(`${refKey}__${isoDate}`))) {
        return;
      }

      if (
        !matchesBranchScope(
          c.branchId,
          c.branchName,
          params.selectedBranchFilter,
          params.userBranchId,
          params.userBranchName,
          params.isSuperAdmin,
          rules.branchScopedAlerts
        )
      ) {
        return;
      }

      const alertId = `case_deadline_${c.id}_${isoDate}`;
      const isToday = daysUntil === 0;
      const isOverdue = daysUntil < 0;
      const timingLabel = isToday
        ? 'Today'
        : isOverdue
        ? `${Math.abs(daysUntil)}d overdue`
        : daysUntil === 1
        ? 'Tomorrow'
        : `In ${daysUntil} days`;

      items.push({
        id: alertId,
        category: 'hearing',
        priority: isToday || isOverdue ? 1 : 3,
        unread: !readSet.has(alertId),
        code: c.case_number || c.suitNumber || 'MATTER',
        badgeLabel: timingLabel,
        badgeTone: isToday || isOverdue ? 'danger' : 'gold',
        title: c.title || 'Upcoming Matter Deadline',
        subtitle: `${isoDate} · ${c.branchName || 'Firm Matter'}`,
        body: `${c.nextHearingPurpose || 'Scheduled Appearance / Deadline'} · ${c.court || 'Court Registry'}`,
        timestampLabel: `${isoDate} (${timingLabel})`,
        targetTab: 'causelist',
        daysUntil,
      });
    });
  }

  // Sort: Unread first, then priority (1 -> 2 -> 3), then newest announcements first, then soonest hearing daysUntil ascending
  items.sort((a, b) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.category === 'announcement' && b.category !== 'announcement') return -1;
    if (b.category === 'announcement' && a.category !== 'announcement') return 1;
    if (a.createdAtMs !== undefined && b.createdAtMs !== undefined && a.createdAtMs !== b.createdAtMs) {
      return b.createdAtMs - a.createdAtMs;
    }
    if (a.daysUntil !== undefined && b.daysUntil !== undefined && a.daysUntil !== b.daysUntil) {
      return a.daysUntil - b.daysUntil;
    }
    return 0;
  });

  const unreadItems = items.filter((item) => item.unread);
  const latestUnread = unreadItems[0] ?? null;

  return {
    rules,
    allItems: items,
    unreadItems,
    latestUnread,
  };
}
