import React, { useState, useMemo, useEffect } from 'react';
import {
  Banknote,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Building2,
  Bell,
  History,
  Send,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { showCleanMessage } from '../utils/notification';

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

export interface CashRequisitionModuleProps {
  currentUserName?: string;
  currentUserRole?: string;
  activeBranch?: string;
  isApprover?: boolean;
  searchQuery?: string;
  onPendingCountChange?: (count: number) => void;
}

const REQUISITIONS_STORAGE_KEY = 'mk_cash_requisitions_v1';
const NOTIFICATIONS_STORAGE_KEY = 'mk_cash_requisition_notifications_v1';

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
    branch: 'Mbarara Regional Office',
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

const INITIAL_NOTIFICATIONS: RequisitionNotification[] = [
  {
    id: 'notif-1',
    requisitionId: 'req-2',
    referenceCode: 'CR-2026-015',
    recipientName: 'Julian Thorne',
    status: 'Approved',
    reason: 'Regional hearing schedule confirmed; cleared for final finance sign-off.',
    actorName: 'Marcus Sterling',
    createdAt: '2026-11-18 04:40 PM',
    unread: true,
  },
];

function formatMoney(amount: number, currency: 'UGX' | 'USD'): string {
  const formatted = Number(amount || 0).toLocaleString('en-US', {
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  });
  return `${currency} ${formatted}`;
}

export default function CashRequisitionModule({
  currentUserName = 'Managing Partner',
  currentUserRole = 'Senior Approver',
  activeBranch = 'Kampala Central (Head Office)',
  isApprover = true,
  searchQuery = '',
  onPendingCountChange,
}: CashRequisitionModuleProps) {
  const { branches } = useApp();

  const [requisitions, setRequisitions] = useState<CashRequisitionItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(REQUISITIONS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // fallback to seed items
      }
    }
    return INITIAL_REQUISITIONS;
  });

  const [notifications, setNotifications] = useState<RequisitionNotification[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // fallback to seed notifications
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [filterStage, setFilterStage] = useState<'All' | RequisitionStage>('All');

  // New request form state
  const [purpose, setPurpose] = useState('');
  const [branch, setBranch] = useState(
    activeBranch && activeBranch !== 'All Firm Branches'
      ? activeBranch
      : 'Kampala Central (Head Office)'
  );
  const [caseRef, setCaseRef] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'UGX' | 'USD'>('UGX');

  // Active review/approval inline panel state
  const [activeDecisionId, setActiveDecisionId] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [expandedLogsId, setExpandedLogsId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (activeBranch && activeBranch !== 'All Firm Branches') {
      setBranch(activeBranch);
    }
  }, [activeBranch]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(REQUISITIONS_STORAGE_KEY, JSON.stringify(requisitions));
      } catch {
        // ignore storage quota errors
      }
    }
    if (onPendingCountChange) {
      const pending = requisitions.filter(
        (r) => r.stage === 'Pending Review' || r.stage === 'Level 1 Approved'
      ).length;
      onPendingCountChange(pending);
    }
  }, [requisitions, onPendingCountChange]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
      } catch {
        // ignore storage quota errors
      }
    }
  }, [notifications]);

  const branchChoices = useMemo(() => {
    const base =
      Array.isArray(branches) && branches.length > 0
        ? branches.map((b) => b.name)
        : [
            'Kampala Central (Head Office)',
            'Fort Portal Branch',
            'Mbarara Branch',
            'Masaka Branch',
            'Jinja Branch',
            'Masindi Branch',
            'Gulu Branch',
          ];
    if (branch && !base.includes(branch)) {
      return [branch, ...base];
    }
    return base;
  }, [branches, branch]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const stageCounts = useMemo(() => {
    const counts: Record<'All' | RequisitionStage, number> = {
      All: requisitions.length,
      'Pending Review': 0,
      'Level 1 Approved': 0,
      Approved: 0,
      Denied: 0,
    };
    requisitions.forEach((r) => {
      counts[r.stage] = (counts[r.stage] || 0) + 1;
    });
    return counts;
  }, [requisitions]);

  const visibleRequisitions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requisitions.filter((r) => {
      if (filterStage !== 'All' && r.stage !== filterStage) return false;
      if (!q) return true;
      return (
        r.referenceCode.toLowerCase().includes(q) ||
        r.requesterName.toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q) ||
        r.branch.toLowerCase().includes(q) ||
        (r.caseRef || '').toLowerCase().includes(q) ||
        r.stage.toLowerCase().includes(q)
      );
    });
  }, [requisitions, filterStage, searchQuery]);

  function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!purpose.trim() || !numericAmount || numericAmount <= 0) {
      setFormError('Please enter a valid purpose and amount greater than zero.');
      return;
    }

    const nextNum = String(requisitions.length + 14).padStart(3, '0');
    const nowLabel = new Date().toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newReq: CashRequisitionItem = {
      id: `req-${Date.now()}`,
      referenceCode: `CR-2026-${nextNum}`,
      requesterName: currentUserName,
      requesterRole: currentUserRole,
      branch: branch.trim() || 'Kampala Central (Head Office)',
      caseRef: caseRef.trim() || undefined,
      purpose: purpose.trim(),
      amount: numericAmount,
      currency,
      stage: 'Pending Review',
      currentLevel: 1,
      createdAt: nowLabel,
      logs: [
        {
          id: `log-${Date.now()}`,
          action: 'Reviewed',
          actorName: currentUserName,
          actorRole: currentUserRole,
          levelLabel: 'Submission Logged',
          reason: 'Requisition submitted for Level 1 review.',
          timestamp: nowLabel,
        },
      ],
    };

    setRequisitions((prev) => [newReq, ...prev]);
    setPurpose('');
    setCaseRef('');
    setAmount('');
    setFormError(null);
    showCleanMessage(`Cash requisition ${newReq.referenceCode} submitted for Level 1 review.`, 'success');
  }

  function handleApplyDecision(req: CashRequisitionItem, action: ApprovalActionType) {
    const cleanReason = decisionReason.trim();
    if (!cleanReason) {
      setFormError(`Please enter a reason before marking ${req.referenceCode} as ${action}.`);
      return;
    }

    const nowLabel = new Date().toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

    const newLog: RequisitionDecisionLog = {
      id: `log-${Date.now()}`,
      action,
      actorName: currentUserName,
      actorRole: currentUserRole,
      levelLabel,
      reason: cleanReason,
      timestamp: nowLabel,
    };

    setRequisitions((prev) =>
      prev.map((item) =>
        item.id === req.id
          ? {
              ...item,
              stage: nextStage,
              currentLevel: nextLevel,
              logs: [...item.logs, newLog],
            }
          : item
      )
    );

    const notification: RequisitionNotification = {
      id: `notif-${Date.now()}`,
      requisitionId: req.id,
      referenceCode: req.referenceCode,
      recipientName: req.requesterName,
      status: action,
      reason: cleanReason,
      actorName: `${currentUserName} (${levelLabel})`,
      createdAt: nowLabel,
      unread: true,
    };

    setNotifications((prev) => [notification, ...prev]);
    setActiveDecisionId(null);
    setDecisionReason('');
    setFormError(null);
    showCleanMessage(
      `${req.referenceCode} marked as ${nextStage} (${levelLabel}).`,
      action === 'Denied' ? 'warning' : 'success'
    );
  }

  function markAllNotificationsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  function getStageBadgeClass(stage: RequisitionStage) {
    switch (stage) {
      case 'Approved':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Level 1 Approved':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Denied':
        return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Notifications Feed */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Cash Requisition &amp; Multi-Level Approval Workflow
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Submit requisitions, complete Level 1 &amp; Level 2 reviews, and log mandatory reasons on every decision.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 tabular-nums">
              <Bell className="w-3.5 h-3.5" />
              {unreadCount} New Decision Notice{unreadCount === 1 ? '' : 's'}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline cursor-pointer whitespace-nowrap"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Decision Notifications Banner List */}
        {notifications.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Decision Notifications (Reviewed, Approved &amp; Denied)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {notifications.slice(0, 4).map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    n.status === 'Denied'
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-100'
                      : n.status === 'Approved'
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-100'
                      : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-bold">
                    <span className="font-mono">
                      {n.referenceCode} · {n.status}
                    </span>
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 tabular-nums">
                      {n.createdAt}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    For <strong>{n.recipientName}</strong> by <strong>{n.actorName}</strong>
                  </div>
                  <div className="text-xs font-medium pt-0.5">Reason: &ldquo;{n.reason}&rdquo;</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {formError && (
        <div
          role="alert"
          className="px-4 py-3 text-xs font-semibold text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Grid: New Requisition Form + Queue & Multi-Level Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* New Cash Requisition Form */}
        <form
          onSubmit={handleCreateRequest}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4 h-fit"
        >
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              New Cash Requisition Request
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Requests start at Level 1 Review and progress to Level 2 Final Approval.
            </p>
          </div>

          <div>
            <label
              htmlFor="req-purpose"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Purpose / Expense Details *
            </label>
            <textarea
              id="req-purpose"
              rows={3}
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., Court filing fees, witness travel, registry stamps..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="req-amount"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Amount *
              </label>
              <input
                id="req-amount"
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="250000"
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="req-currency"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Currency
              </label>
              <select
                id="req-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'UGX' | 'USD')}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="UGX">UGX</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="req-branch"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Branch
            </label>
            <select
              id="req-branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {branchChoices.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="req-case-ref"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Case File Reference (Optional)
            </label>
            <input
              id="req-case-ref"
              type="text"
              value={caseRef}
              onChange={(e) => setCaseRef(e.target.value)}
              placeholder="e.g., HC-2026-CV-019"
              className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Cash Requisition</span>
          </button>
        </form>

        {/* Requisition Queue & Multi-Level Approval Workspace */}
        <section className="lg:col-span-2 space-y-4">
          {/* Stage Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
            {(['All', 'Pending Review', 'Level 1 Approved', 'Approved', 'Denied'] as const).map(
              (stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setFilterStage(stage)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                    filterStage === stage
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {stage} ({stageCounts[stage]})
                </button>
              )
            )}
          </div>

          {visibleRequisitions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <Banknote className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No cash requisitions match this stage or search filter.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Switch the filter above or submit a new cash requisition request on the left.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {visibleRequisitions.map((req) => {
                const isFinalized = req.stage === 'Approved' || req.stage === 'Denied';
                const isDeciding = activeDecisionId === req.id;
                const isLogsOpen = expandedLogsId === req.id;

                return (
                  <article
                    key={req.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                            {req.referenceCode}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${getStageBadgeClass(
                              req.stage
                            )}`}
                          >
                            {req.stage}
                          </span>
                          {!isFinalized && (
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Level {req.currentLevel} of 2
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {req.purpose}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {req.requesterName}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{req.requesterRole}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {req.branch}
                          </span>
                          {req.caseRef && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                {req.caseRef}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0 space-y-1">
                        <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                          {formatMoney(req.amount, req.currency)}
                        </p>
                        <p className="text-[11px] text-slate-400 tabular-nums">{req.createdAt}</p>
                      </div>
                    </div>

                    {/* Multi-Level Progress Bar / Stepper */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex flex-wrap items-center gap-3 text-[11px]">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            req.stage === 'Level 1 Approved' || req.stage === 'Approved'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : req.stage === 'Denied'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Level 1: {req.stage === 'Pending Review' ? 'Awaiting Review' : 'Cleared'}
                        </span>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                          →
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            req.stage === 'Approved'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : req.stage === 'Denied'
                              ? 'text-rose-600 dark:text-rose-400'
                              : req.stage === 'Level 1 Approved'
                              ? 'text-blue-700 dark:text-blue-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Level 2:{' '}
                          {req.stage === 'Approved'
                            ? 'Final Approved'
                            : req.stage === 'Denied'
                            ? 'Denied'
                            : req.stage === 'Level 1 Approved'
                            ? 'Ready for Final Sign-Off'
                            : 'Waiting on Level 1'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setExpandedLogsId(isLogsOpen ? null : req.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Decision Log ({req.logs.length})</span>
                        </button>

                        {isApprover && !isFinalized && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isDeciding) {
                                setActiveDecisionId(null);
                                setDecisionReason('');
                              } else {
                                setActiveDecisionId(req.id);
                                setDecisionReason('');
                                setFormError(null);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              isDeciding
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {isDeciding
                              ? 'Cancel'
                              : req.currentLevel === 1
                              ? 'Level 1 Review'
                              : 'Level 2 Sign-Off'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Review / Approval Panel with Mandatory Reason */}
                    {isDeciding && isApprover && !isFinalized && (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor={`decision-reason-${req.id}`}
                            className="text-xs font-bold text-slate-900 dark:text-white"
                          >
                            {req.currentLevel === 1
                              ? 'Level 1 Review / Approval Decision'
                              : 'Level 2 Final Finance Approval Decision'}{' '}
                            — Mandatory Reason *
                          </label>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Acting as {currentUserName}
                          </span>
                        </div>

                        <textarea
                          id={`decision-reason-${req.id}`}
                          rows={2}
                          value={decisionReason}
                          onChange={(e) => setDecisionReason(e.target.value)}
                          placeholder="Enter verification notes, budget check, or denial justification..."
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleApplyDecision(req, 'Reviewed')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/70 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-semibold cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Log Reviewed</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApplyDecision(req, 'Denied')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Deny</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApplyDecision(req, 'Approved')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {req.currentLevel === 1
                                ? 'Approve Level 1'
                                : 'Final Approve (Level 2)'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Decision Audit Log */}
                    {isLogsOpen && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Decision Audit Trail
                        </p>
                        <div className="space-y-2">
                          {req.logs.map((log) => (
                            <div
                              key={log.id}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {log.levelLabel} ·{' '}
                                  <span
                                    className={
                                      log.action === 'Denied'
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : log.action === 'Approved'
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : 'text-amber-700 dark:text-amber-400'
                                    }
                                  >
                                    {log.action}
                                  </span>
                                </span>
                                <span className="text-[11px] text-slate-400 tabular-nums">
                                  {log.timestamp}
                                </span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-300">{log.reason}</p>
                              <p className="text-[11px] text-slate-400">
                                {log.actorName} ({log.actorRole})
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
