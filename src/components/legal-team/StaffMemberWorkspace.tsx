import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getEffectiveUser, isUserAdmin } from '../../lib/supabase';
import { hrSupabase } from '../../lib/hrSupabase';
import { showCleanMessage } from '../../utils/notification';
import type { CaseItem, CourtHearing } from '../../types';
import type { ApprovalWorkflowItem } from '../ErpWorkspaceViews';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Cake,
  Calendar,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Gavel,
  Gift,
  ListChecks,
  Loader2,
  Mail,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';

export interface WorkspaceStaffProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleTitle: string;
  role: string;
  branchId?: string;
  branchName: string;
  department?: string;
  avatarUrl?: string;
  isActive: boolean;
  statusLabel?: string;
  isCurrentUser?: boolean;
  annualAllowance: number;
  usedLeaveDays: number;
  pendingLeaveDays: number;
  otherLeaveDays: number;
  leaveRemaining: number;
  leaveRemainingPercent: number;
  dateOfBirth?: string | null;
  birthdayEligible?: boolean;
  birthdayLabel?: string;
  joinedAt?: string | null;
  isUuid?: boolean;
}

export interface WorkspaceLeaveItem {
  id: string;
  employee_id: string;
  employeeName: string;
  employeeEmail: string;
  branchName: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  persistedInSupabase?: boolean;
}

export interface WorkspaceTaskItem {
  id: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM';
  title: string;
  caseCode: string;
  assignee: string;
  assigneeEmail?: string;
  branchName?: string;
  dueDate: string;
  status: 'Todo' | 'In Progress' | 'Completed';
}

export interface WorkspaceWishItem {
  id: string;
  sender: string;
  message: string;
  createdAt: string;
}

export interface StaffMemberWorkspaceProps {
  staff: WorkspaceStaffProfile;
  onBack: () => void;
  tasks?: WorkspaceTaskItem[];
  onCycleTaskStatus?: (taskId: string) => void;
  leaveRequests?: WorkspaceLeaveItem[];
  onLeaveStatusChange?: (record: WorkspaceLeaveItem, nextStatus: 'Approved' | 'Rejected') => void;
  approvals?: ApprovalWorkflowItem[];
  onDecideApproval?: (id: string, decision: 'Approved' | 'Rejected') => void;
  wishes?: WorkspaceWishItem[];
  onSendWish?: (message: string) => Promise<void> | void;
  onApplyLeave?: (staffId: string) => void;
  onDelegateTask?: (staffName: string) => void;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getInitials(name?: string | null): string {
  const parts = String(name || 'MK')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (parts[0] || 'MK').slice(0, 2).toUpperCase();
}

function normalizeToken(val?: string | null): string {
  return String(val || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function matchesPerson(
  candidate: string | null | undefined,
  staffName: string,
  staffEmail?: string
): boolean {
  const target = normalizeToken(candidate);
  if (!target) return false;

  const full = normalizeToken(staffName);
  const email = normalizeToken(staffEmail);
  if (full && (target === full || target.includes(full) || full.includes(target))) {
    return true;
  }
  if (email && (target === email || target.includes(email))) {
    return true;
  }

  // Match on multi-part names (first + last name tokens) when middle names or honorifics differ
  const nameTokens = full.split(' ').filter((t) => t.length >= 3);
  if (nameTokens.length >= 2) {
    const matchedTokens = nameTokens.filter((tok) => target.includes(tok));
    if (matchedTokens.length >= 2) return true;
  }
  return false;
}

function formatReadableDate(raw?: string | null): string {
  if (!raw) return 'Not recorded';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function computeBirthdayMeta(dob?: string | null): {
  formattedDate: string;
  daysUntil: number | null;
  isToday: boolean;
} {
  if (!dob) return { formattedDate: 'Not recorded', daysUntil: null, isToday: false };
  const parts = String(dob).slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return { formattedDate: String(dob), daysUntil: null, isToday: false };
  }
  const [, month, day] = parts;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), month - 1, day);
  if (next < today) next = new Date(now.getFullYear() + 1, month - 1, day);
  const diffDays = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const formattedDate = next.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  return { formattedDate, daysUntil: diffDays, isToday: diffDays === 0 };
}

function isCaseClosed(c: CaseItem): boolean {
  const stage = normalizeToken(c.stage);
  const status = normalizeToken(c.status);
  return (
    stage.includes('disposed') ||
    stage.includes('closed') ||
    status === 'archived' ||
    status === 'closed' ||
    status === 'disposed' ||
    status === 'completed'
  );
}

function formatApprovalStatusBadge(status: string) {
  const s = normalizeToken(status);
  if (s === 'approved') {
    return {
      label: 'Approved',
      className:
        'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      Icon: CheckCircle2,
    };
  }
  if (s === 'rejected') {
    return {
      label: 'Rejected',
      className:
        'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      Icon: XCircle,
    };
  }
  return {
    label: 'Pending',
    className:
      'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    Icon: Clock,
  };
}

export const StaffMemberWorkspace: React.FC<StaffMemberWorkspaceProps> = ({
  staff,
  onBack,
  tasks = [],
  onCycleTaskStatus,
  leaveRequests = [],
  onLeaveStatusChange,
  approvals = [],
  onDecideApproval,
  wishes = [],
  onSendWish,
  onApplyLeave,
  onDelegateTask,
}) => {
  const { cases, hearings, setSelectedCase, setActiveTab, currentUser } = useApp();
  const effectiveUser = useMemo(() => getEffectiveUser(currentUser), [currentUser]);
  const isAdmin = isUserAdmin(effectiveUser);

  // Local wish composer + cloud wishes hydration for this specific staff member
  const [wishDraft, setWishDraft] = useState('');
  const [sendingWish, setSendingWish] = useState(false);
  const [cloudWishes, setCloudWishes] = useState<WorkspaceWishItem[]>([]);
  const [loadingWishes, setLoadingWishes] = useState(false);

  // Hydrate persisted birthday_wishes for this staff member when they have a Supabase UUID
  useEffect(() => {
    let active = true;
    const loadCloudWishes = async () => {
      if (!staff.id || !UUID_REGEX.test(staff.id)) {
        setCloudWishes([]);
        return;
      }
      setLoadingWishes(true);
      try {
        const { data, error } = await hrSupabase
          .from('birthday_wishes')
          .select('id, message, created_at, sender_id')
          .eq('celebrant_id', staff.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!active || error || !Array.isArray(data)) return;

        setCloudWishes(
          data.map((row: any) => ({
            id: String(row.id),
            sender: 'Firm Colleague',
            message: String(row.message || ''),
            createdAt: row.created_at
              ? new Date(row.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })
              : 'Recent',
          }))
        );
      } catch {
        // gracefully fall back to passed local wishes
      } finally {
        if (active) setLoadingWishes(false);
      }
    };

    void loadCloudWishes();
    return () => {
      active = false;
    };
  }, [staff.id]);

  // Combined deduplicated wish log
  const combinedWishes = useMemo(() => {
    const seen = new Set<string>();
    const list: WorkspaceWishItem[] = [];
    [...wishes, ...cloudWishes].forEach((item) => {
      const key = `${item.id}:${item.message.trim().toLowerCase()}`;
      if (!seen.has(key) && item.message.trim()) {
        seen.add(key);
        list.push(item);
      }
    });
    return list;
  }, [wishes, cloudWishes]);

  // 1. Assigned Cases & Matters
  const staffCases = useMemo(() => {
    return cases.filter((c) => {
      if (matchesPerson(c.leadAdvocate, staff.name, staff.email)) return true;
      if (
        Array.isArray(c.assistingAdvocates) &&
        c.assistingAdvocates.some((a) => matchesPerson(a, staff.name, staff.email))
      ) {
        return true;
      }
      return false;
    });
  }, [cases, staff.name, staff.email]);

  const activeStaffCases = useMemo(() => staffCases.filter((c) => !isCaseClosed(c)), [staffCases]);
  const closedStaffCases = useMemo(() => staffCases.filter((c) => isCaseClosed(c)), [staffCases]);

  const staffCaseIdSet = useMemo(() => new Set(staffCases.map((c) => c.id)), [staffCases]);

  // 4 & 5. Hearings split into Upcoming vs Completed / Closed
  const { upcomingHearings, completedHearings } = useMemo(() => {
    const staffHearings: CourtHearing[] = hearings.filter((h) => {
      if (matchesPerson(h.leadCounsel, staff.name, staff.email)) return true;
      if (
        Array.isArray(h.assignedAdvocates) &&
        h.assignedAdvocates.some((a) => matchesPerson(a, staff.name, staff.email))
      ) {
        return true;
      }
      if (h.caseId && staffCaseIdSet.has(h.caseId)) return true;
      return false;
    });

    const todayIso = new Date().toISOString().slice(0, 10);
    const upcoming: Array<{
      id: string;
      suitNumber: string;
      caseTitle: string;
      date: string;
      time: string;
      court: string;
      purpose: string;
      status: string;
      linkedCase?: CaseItem;
    }> = [];

    const completed: Array<{
      id: string;
      suitNumber: string;
      caseTitle: string;
      date: string;
      court: string;
      summary: string;
      status: string;
      linkedCase?: CaseItem;
    }> = [];

    const coveredCaseDates = new Set<string>();

    staffHearings.forEach((h) => {
      const linkedCase = cases.find((c) => c.id === h.caseId || c.suitNumber === h.suitNumber);
      const isDone = h.status === 'Completed' || (linkedCase ? isCaseClosed(linkedCase) : false);
      coveredCaseDates.add(`${h.caseId}:${h.hearingDate}`);

      if (isDone) {
        completed.push({
          id: h.id,
          suitNumber: h.suitNumber || linkedCase?.suitNumber || 'Matter',
          caseTitle: h.caseTitle || linkedCase?.title || 'Court Hearing',
          date: h.hearingDate,
          court: h.courtName || h.division || 'High Court',
          summary: h.courtNotes || h.hearingPurpose || 'Hearing concluded',
          status: 'Completed',
          linkedCase,
        });
      } else {
        upcoming.push({
          id: h.id,
          suitNumber: h.suitNumber || linkedCase?.suitNumber || 'Matter',
          caseTitle: h.caseTitle || linkedCase?.title || 'Scheduled Appearance',
          date: h.hearingDate,
          time: h.hearingTime || '09:00',
          court: h.courtName || h.division || 'High Court',
          purpose: h.hearingPurpose || 'Court Mention / Hearing',
          status: h.status || 'Scheduled',
          linkedCase,
        });
      }
    });

    // Also include upcoming nextHearingDate from assigned active cases if not already in hearings
    activeStaffCases.forEach((c) => {
      const nextDate = c.nextHearingDate || c.hearing_date;
      if (nextDate && !coveredCaseDates.has(`${c.id}:${nextDate}`)) {
        if (nextDate >= todayIso) {
          upcoming.push({
            id: `case-next-${c.id}`,
            suitNumber: c.suitNumber || c.firmRefNumber || 'Case File',
            caseTitle: c.title,
            date: nextDate,
            time: '09:00',
            court: c.court || c.division || 'High Court',
            purpose: c.nextHearingPurpose || c.stage || 'Scheduled Court Date',
            status: 'Scheduled',
            linkedCase: c,
          });
        }
      }
    });

    // Include closed/disposed assigned matters in Completed / Closed Hearings block
    closedStaffCases.forEach((c) => {
      const alreadyListed = completed.some((item) => item.linkedCase?.id === c.id);
      if (!alreadyListed) {
        completed.push({
          id: `closed-case-${c.id}`,
          suitNumber: c.suitNumber || c.firmRefNumber || 'Closed Matter',
          caseTitle: c.title,
          date: c.lastUpdated || c.filingDate || '',
          court: c.court || c.division || c.branchName || 'High Court',
          summary: c.stage || 'Disposed & Closed',
          status: 'Closed Matter',
          linkedCase: c,
        });
      }
    });

    upcoming.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    completed.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    return { upcomingHearings: upcoming, completedHearings: completed };
  }, [hearings, cases, activeStaffCases, closedStaffCases, staff.name, staff.email, staffCaseIdSet]);

  // 2. Staff-specific Leave Requests & Workflow Approvals
  const staffLeaves = useMemo(() => {
    const idLower = staff.id.toLowerCase();
    const emailLower = normalizeToken(staff.email);
    return leaveRequests.filter((lr) => {
      if (lr.employee_id && lr.employee_id.toLowerCase() === idLower) return true;
      if (emailLower && normalizeToken(lr.employeeEmail) === emailLower) return true;
      if (matchesPerson(lr.employeeName, staff.name, staff.email)) return true;
      return false;
    });
  }, [leaveRequests, staff.id, staff.name, staff.email]);

  const staffWorkflowApprovals = useMemo(() => {
    return approvals.filter((a) => matchesPerson(a.requester, staff.name, staff.email));
  }, [approvals, staff.name, staff.email]);

  const unifiedApprovals = useMemo(() => {
    const items: Array<{
      id: string;
      kind: 'leave' | 'workflow';
      code: string;
      title: string;
      subtitle: string;
      status: 'Pending' | 'Approved' | 'Rejected';
      rawLeave?: WorkspaceLeaveItem;
      rawApproval?: ApprovalWorkflowItem;
    }> = [];

    staffLeaves.forEach((lr) => {
      items.push({
        id: `lv-${lr.id}`,
        kind: 'leave',
        code: lr.leave_type,
        title: `${lr.start_date} to ${lr.end_date} (${lr.days} day${lr.days === 1 ? '' : 's'})`,
        subtitle: lr.reason || 'Leave request submitted via staff portal',
        status: lr.status,
        rawLeave: lr,
      });
    });

    staffWorkflowApprovals.forEach((apr) => {
      items.push({
        id: `apr-${apr.id}`,
        kind: 'workflow',
        code: `${apr.code} · ${apr.category}`,
        title: apr.title,
        subtitle: `${apr.amountOrDetail} · ${apr.submittedAt}`,
        status: apr.status,
        rawApproval: apr,
      });
    });

    return items;
  }, [staffLeaves, staffWorkflowApprovals]);

  // 6. Assigned Tasks for this staff member
  const staffTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        matchesPerson(t.assignee, staff.name, staff.email) ||
        (t.assigneeEmail && normalizeToken(t.assigneeEmail) === normalizeToken(staff.email))
    );
  }, [tasks, staff.name, staff.email]);

  const openTasksCount = useMemo(
    () => staffTasks.filter((t) => t.status !== 'Completed').length,
    [staffTasks]
  );

  // Birthday milestone calculation
  const birthdayMeta = useMemo(() => computeBirthdayMeta(staff.dateOfBirth), [staff.dateOfBirth]);

  // Leave progress styling
  const leavePct = Math.min(100, Math.max(0, staff.leaveRemainingPercent));
  const leaveBarColor =
    leavePct >= 50
      ? 'bg-blue-600 dark:bg-blue-500'
      : leavePct >= 20
      ? 'bg-amber-500 dark:bg-amber-400'
      : 'bg-rose-600 dark:bg-rose-500';
  const leaveAccentColor =
    leavePct >= 50
      ? 'text-blue-600 dark:text-blue-400'
      : leavePct >= 20
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';

  const handleSubmitWish = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = wishDraft.trim();
    if (!cleaned) return;
    setSendingWish(true);
    try {
      if (onSendWish) {
        await onSendWish(cleaned);
      } else {
        // Standalone fallback persistence via shared hrSupabase
        if (staff.id && UUID_REGEX.test(staff.id)) {
          const senderUuid =
            effectiveUser?.id && UUID_REGEX.test(String(effectiveUser.id))
              ? String(effectiveUser.id)
              : null;
          await hrSupabase.from('birthday_wishes').insert([
            {
              celebrant_id: staff.id,
              sender_id: senderUuid,
              message: cleaned,
              wish_year: new Date().getFullYear(),
            },
          ]);
        }
        setCloudWishes((prev) => [
          {
            id: `wish-${Date.now()}`,
            sender: effectiveUser?.name || 'Colleague',
            message: cleaned,
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev,
        ]);
        showCleanMessage(`Birthday wish sent to ${staff.name}!`, 'success');
      }
      setWishDraft('');
    } finally {
      setSendingWish(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* TOP BAR: BACK TO DIRECTORY + WORKSPACE ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Back to Directory</span>
          </button>

          <nav
            aria-label="Breadcrumb"
            className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate"
          >
            <span>Staff Directory</span>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate">{staff.name}</span>
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onApplyLeave && (
            <button
              type="button"
              onClick={() => onApplyLeave(staff.id)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Apply for Leave</span>
            </button>
          )}

          {onDelegateTask && (
            <button
              type="button"
              onClick={() => onDelegateTask(staff.name)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Delegate Task</span>
            </button>
          )}
        </div>
      </div>

      {/* STAFF MEMBER HEADER CARD */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            {staff.avatarUrl ? (
              <img
                src={staff.avatarUrl}
                alt={staff.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-lg flex items-center justify-center shrink-0">
                {getInitials(staff.name)}
              </div>
            )}

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  {staff.name}
                  {staff.isCurrentUser ? ' (You)' : ''}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    staff.isActive
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{staff.statusLabel || (staff.isActive ? 'Active Staff' : 'Inactive')}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-800 dark:text-slate-100">{staff.roleTitle}</span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{staff.department || staff.branchName}</span>
                </span>
                {staff.department && staff.branchName && staff.department !== staff.branchName && (
                  <>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                      ·
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{staff.branchName}</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-slate-500 dark:text-slate-400">
                <a
                  href={`mailto:${staff.email}`}
                  className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{staff.email}</span>
                </a>
                {staff.phone && (
                  <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{staff.phone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Key Non-Rate Workspace Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 min-w-[105px]">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Assigned Cases</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {staffCases.length}
              </p>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 min-w-[105px]">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Upcoming Dates</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {upcomingHearings.length}
              </p>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 min-w-[105px]">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Open Tasks</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {openTasksCount}
              </p>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/60 min-w-[105px]">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Leave Remaining</p>
              <p className={`text-lg font-bold mt-0.5 tabular-nums ${leaveAccentColor}`}>
                {staff.leaveRemaining}d
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6 RESPONSIVE WORKSPACE BLOCKS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* BLOCK 1: ASSIGNED CASES & MATTERS */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Assigned Cases &amp; Matters
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {activeStaffCases.length} active · {closedStaffCases.length} concluded
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('catalogue')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              All Cases
            </button>
          </div>

          {staffCases.length === 0 ? (
            <div className="p-8 text-center space-y-1.5">
              <Briefcase className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No case files assigned yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Matters where {staff.name} is listed as lead or assisting counsel appear here automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[360px] overflow-y-auto">
              {staffCases.map((c) => {
                const closed = isCaseClosed(c);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCase(c)}
                    className="w-full text-left px-5 py-3.5 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition cursor-pointer flex items-start justify-between gap-3 group"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                          {c.suitNumber || c.firmRefNumber || 'Case File'}
                        </span>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                          ·
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 truncate">
                          {c.branchName || c.branch || staff.branchName}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-2">
                        {c.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {c.stage || 'Active Litigation'}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`text-xs font-semibold ${
                          closed
                            ? 'text-slate-500 dark:text-slate-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {c.status || (closed ? 'Closed' : 'Active')}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* BLOCK 2: APPROVAL REQUESTS STATUS */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <ClipboardCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Approval Requests Status
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {unifiedApprovals.filter((a) => a.status === 'Pending').length} pending ·{' '}
                  {unifiedApprovals.length} total items
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('approvals')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              Approvals Queue
            </button>
          </div>

          {unifiedApprovals.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <ClipboardCheck className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No approval requests on file
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Leave applications, vault releases, and workflow requests submitted by {staff.name} will be tracked here.
              </p>
              {onApplyLeave && (
                <button
                  type="button"
                  onClick={() => onApplyLeave(staff.id)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Submit Leave Request
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[360px] overflow-y-auto">
              {unifiedApprovals.map((item) => {
                const badge = formatApprovalStatusBadge(item.status);
                const StatusIcon = badge.Icon;
                const canDecide =
                  item.status === 'Pending' &&
                  isAdmin &&
                  ((item.kind === 'leave' && Boolean(onLeaveStatusChange && item.rawLeave)) ||
                    (item.kind === 'workflow' && Boolean(onDecideApproval && item.rawApproval)));

                return (
                  <div
                    key={item.id}
                    className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                          {item.code}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {item.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canDecide ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (item.kind === 'leave' && item.rawLeave && onLeaveStatusChange) {
                                onLeaveStatusChange(item.rawLeave, 'Approved');
                              } else if (item.kind === 'workflow' && item.rawApproval && onDecideApproval) {
                                onDecideApproval(item.rawApproval.id, 'Approved');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (item.kind === 'leave' && item.rawLeave && onLeaveStatusChange) {
                                onLeaveStatusChange(item.rawLeave, 'Rejected');
                              } else if (item.kind === 'workflow' && item.rawApproval && onDecideApproval) {
                                onDecideApproval(item.rawApproval.id, 'Rejected');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap ${badge.className}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{badge.label}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* BLOCK 3: CALENDAR & UPCOMING HEARINGS */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Calendar &amp; Upcoming Hearings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {upcomingHearings.length} scheduled appearance{upcomingHearings.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('causelist')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              Cause List Diary
            </button>
          </div>

          {upcomingHearings.length === 0 ? (
            <div className="p-8 text-center space-y-1.5">
              <Calendar className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No upcoming court dates scheduled
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hearings, mentions, and filing deadlines involving {staff.name} appear here once calendared.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[340px] overflow-y-auto">
              {upcomingHearings.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    if (h.linkedCase) setSelectedCase(h.linkedCase);
                    else setActiveTab('causelist');
                  }}
                  className="w-full text-left px-5 py-3.5 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition cursor-pointer space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
                      <Gavel className="w-3.5 h-3.5 shrink-0" />
                      <span>{h.purpose}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {formatReadableDate(h.date)} · {h.time}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {h.caseTitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {h.suitNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{h.court}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-700 dark:text-amber-400 font-medium">{h.status}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* BLOCK 4: COMPLETED / CLOSED HEARINGS */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Completed &amp; Closed Hearings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {completedHearings.length} concluded record{completedHearings.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </div>

          {completedHearings.length === 0 ? (
            <div className="p-8 text-center space-y-1.5">
              <CheckCircle2 className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No concluded hearings recorded yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Completed appearances and disposed matters for {staff.name} will be archived here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[340px] overflow-y-auto">
              {completedHearings.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.linkedCase) setSelectedCase(item.linkedCase);
                    else setActiveTab('causelist');
                  }}
                  className="w-full text-left px-5 py-3.5 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition cursor-pointer space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.status}</span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {formatReadableDate(item.date)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {item.caseTitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {item.suitNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{item.court}</span>
                  </div>
                  {item.summary && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{item.summary}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* BLOCK 5: BIRTHDAY & MILESTONES */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Cake className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Birthday &amp; Milestones
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Celebration dates and colleague wishes
                </p>
              </div>
            </div>
            {birthdayMeta.isToday && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-400 shrink-0">
                <Gift className="w-3.5 h-3.5" />
                <span>Birthday Today</span>
              </span>
            )}
          </div>

          {/* Milestone Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Birthday</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {birthdayMeta.formattedDate !== 'Not recorded'
                  ? birthdayMeta.formattedDate
                  : staff.birthdayLabel || 'Not recorded'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {birthdayMeta.isToday
                  ? 'Celebrating today'
                  : birthdayMeta.daysUntil !== null
                  ? `In ${birthdayMeta.daysUntil} day${birthdayMeta.daysUntil === 1 ? '' : 's'}`
                  : 'Update DOB in HR profile to enable countdown'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Firm Milestone</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                {staff.roleTitle}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {staff.joinedAt
                  ? `Member since ${formatReadableDate(staff.joinedAt)}`
                  : `${staff.branchName}`}
              </p>
            </div>
          </div>

          {/* Inline Wish Sender */}
          <form onSubmit={handleSubmitWish} className="space-y-2 pt-1">
            <label
              htmlFor="workspace-wish-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Send a Birthday or Milestone Wish
            </label>
            <div className="flex items-center gap-2">
              <input
                id="workspace-wish-input"
                type="text"
                value={wishDraft}
                onChange={(e) => setWishDraft(e.target.value)}
                placeholder={`Write a warm note for ${staff.name.split(' ')[0]}...`}
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={sendingWish || !wishDraft.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer shrink-0"
              >
                {sendingWish ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send</span>
              </button>
            </div>
          </form>

          {/* Wish Log */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Wish Log</span>
              <span className="text-slate-400 tabular-nums">{combinedWishes.length} posted</span>
            </div>
            {loadingWishes ? (
              <p className="text-xs text-slate-400 py-2">Loading wishes...</p>
            ) : combinedWishes.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-1">
                No wishes posted yet. Be the first to celebrate {staff.name.split(' ')[0]}.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {combinedWishes.map((w) => (
                  <div
                    key={w.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <p className="text-slate-700 dark:text-slate-200">{w.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                      {w.sender} · {w.createdAt}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* BLOCK 6: STAFF HR MODULES (LEAVE ALLOWANCE + ASSIGNED TASKS) */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <CalendarClock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Staff HR Modules &amp; Workload
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Leave allowance progress, leave history, and assigned tasks
                </p>
              </div>
            </div>
            {onApplyLeave && (
              <button
                type="button"
                onClick={() => onApplyLeave(staff.id)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                + Apply for Leave
              </button>
            )}
          </div>

          {/* Annual Leave Progress Bar */}
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Annual Leave Balance ({new Date().getFullYear()})
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  Used: {staff.usedLeaveDays}d · Pending: {staff.pendingLeaveDays}d
                  {staff.otherLeaveDays > 0 ? ` · Other: ${staff.otherLeaveDays}d` : ''}
                </p>
              </div>
              <div className="text-right tabular-nums shrink-0">
                <span className={`text-base font-bold ${leaveAccentColor}`}>{staff.leaveRemaining}</span>
                <span className="text-xs font-semibold text-slate-400"> / {staff.annualAllowance}d</span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{leavePct}% remaining</p>
              </div>
            </div>

            <div
              role="progressbar"
              aria-label={`${staff.name} remaining annual leave days`}
              aria-valuenow={staff.leaveRemaining}
              aria-valuemin={0}
              aria-valuemax={staff.annualAllowance}
              className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700/80 overflow-hidden"
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${leaveBarColor}`}
                style={{ width: `${leavePct}%` }}
              />
            </div>
          </div>

          {/* Recent Leave History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Leave History</span>
              <span className="text-slate-400 tabular-nums">{staffLeaves.length} record(s)</span>
            </div>
            {staffLeaves.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No leave entries logged for {staff.name.split(' ')[0]} yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                {staffLeaves.slice(0, 4).map((lr) => {
                  const badge = formatApprovalStatusBadge(lr.status);
                  return (
                    <div
                      key={lr.id}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs bg-white dark:bg-slate-900"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {lr.leave_type} · <span className="tabular-nums">{lr.days}d</span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {lr.start_date} to {lr.end_date}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold shrink-0 ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assigned Tasks & Workload */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <ListChecks className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Assigned Tasks &amp; Workload ({staffTasks.length})</span>
              </div>
              {onDelegateTask && (
                <button
                  type="button"
                  onClick={() => onDelegateTask(staff.name)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  + Assign Task
                </button>
              )}
            </div>

            {staffTasks.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No active workflow tasks delegated to {staff.name.split(' ')[0]}.
              </p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {staffTasks.map((task) => {
                  const prioColor =
                    task.priority === 'URGENT'
                      ? 'text-rose-700 dark:text-rose-400'
                      : task.priority === 'HIGH'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-blue-700 dark:text-blue-400';
                  const statusColor =
                    task.status === 'Completed'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : task.status === 'In Progress'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-x-2 text-[11px]">
                          <span className={`font-bold ${prioColor}`}>{task.priority}</span>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                            ·
                          </span>
                          <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                            {task.caseCode}
                          </span>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                            ·
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                            Due {task.dueDate}
                          </span>
                        </div>
                        <p
                          className={`text-xs font-semibold leading-snug ${
                            task.status === 'Completed'
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </p>
                      </div>

                      {onCycleTaskStatus ? (
                        <button
                          type="button"
                          onClick={() => onCycleTaskStatus(task.id)}
                          title="Click to cycle status (Todo → In Progress → Completed)"
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer whitespace-nowrap shrink-0 ${statusColor}`}
                        >
                          {task.status}
                        </button>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold whitespace-nowrap shrink-0 ${statusColor}`}
                        >
                          {task.status}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
