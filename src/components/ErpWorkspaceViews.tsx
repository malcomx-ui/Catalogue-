import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getEffectiveUser, isUserAdmin } from '../lib/supabase';
import {
  fetchLoginSessions,
  recordCurrentUserSession,
  revokeUserSession,
  type UserLoginSession,
} from '../services/sessionService';
import CashRequisitionModule from './CashRequisitionModule';
import type {
  ApprovalActionType,
  CashRequisitionItem,
  CreateCashRequisitionInput,
  RequisitionNotification,
} from '../lib/cashRequisitionStore';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Send,
  ShieldCheck,
  Sliders,
  Network,
  Users,
  Lock,
  Banknote,
  Bell,
  ArrowRight,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  RefreshCw,
  Download,
  Search,
  Ban,
  Activity,
  Loader2,
  KeyRound,
  AlertCircle,
} from 'lucide-react';

export interface ApprovalWorkflowItem {
  id: string;
  code: string;
  title: string;
  category: 'Fee Note' | 'Vault Release' | 'Filing Clearance' | 'Cash Requisition';
  requester: string;
  branch: string;
  submittedAt: string;
  amountOrDetail: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export const INITIAL_APPROVAL_ITEMS: ApprovalWorkflowItem[] = [
  {
    id: 'apr-01',
    code: 'APR-2026-041',
    title: 'Physical Title Deed Release — Centenary Bank Mortgage Perfection',
    category: 'Vault Release',
    requester: 'Lilian Kobusinge',
    branch: 'Kampala Central (Head Office)',
    submittedAt: 'Today, 09:20 AM',
    amountOrDetail: 'Original Mailo Certificate • Vault Shelf B-14',
    status: 'Pending',
  },
  {
    id: 'apr-02',
    code: 'APR-2026-042',
    title: 'Interim Counsel Fee Note & Court Filing Disbursements',
    category: 'Fee Note',
    requester: 'Bright Arinaitwe Bujara',
    branch: 'Kampala Central (Head Office)',
    submittedAt: 'Today, 10:05 AM',
    amountOrDetail: 'UGX 4,850,000 • Commercial Division Suit',
    status: 'Pending',
  },
  {
    id: 'apr-03',
    code: 'APR-2026-043',
    title: 'Urgent Chamber Summons & Injunction Filing Clearance',
    category: 'Filing Clearance',
    requester: 'Martin Twomo',
    branch: 'Fort Portal Branch',
    submittedAt: 'Yesterday, 04:45 PM',
    amountOrDetail: 'High Court Civil Registry • Deadline Tomorrow',
    status: 'Pending',
  },
];

interface ChatMessage {
  id: string;
  channel: string;
  sender: string;
  role: string;
  body: string;
  timestamp: string;
  unread?: boolean;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    channel: 'Litigation Registry',
    sender: 'Lilian Kobusinge',
    role: 'Senior Associate',
    body: 'Please confirm if the amended plaint for the Commercial Court matter has been stamped and uploaded to Documents & Custody.',
    timestamp: '09:42 AM',
    unread: true,
  },
  {
    id: 'msg-2',
    channel: 'Mortgages & Vault',
    sender: 'Phionah Adoch',
    role: 'Admin & Finance Assistant',
    body: 'Centenary Bank batch schedules for this week are reconciled. Ready for Partner sign-off in Approvals.',
    timestamp: '10:18 AM',
    unread: true,
  },
  {
    id: 'msg-3',
    channel: 'Firm Announcements',
    sender: 'Firm Administrator',
    role: 'Managing Chambers',
    body: 'All regional branches should update Friday cause list outcomes before 4:30 PM EAT.',
    timestamp: 'Yesterday',
    unread: false,
  },
];

export const ApprovalsQueueView: React.FC<{
  approvals: ApprovalWorkflowItem[];
  onDecide: (id: string, decision: 'Approved' | 'Rejected') => void;
  cashRequisitions?: CashRequisitionItem[];
  cashNotifications?: RequisitionNotification[];
  onCreateCashRequisition?: (input: CreateCashRequisitionInput) => CashRequisitionItem;
  onDecideCashRequisition?: (
    req: CashRequisitionItem,
    action: ApprovalActionType,
    reason: string
  ) => { updated: CashRequisitionItem; notification: RequisitionNotification } | null;
  onMarkAllCashNotificationsRead?: () => void;
  onMarkCashNotificationRead?: (id: string) => void;
  currentUserName?: string;
  currentUserRole?: string;
  activeBranch?: string;
  isApprover?: boolean;
  searchQuery?: string;
}> = ({
  approvals,
  onDecide,
  cashRequisitions = [],
  cashNotifications = [],
  onCreateCashRequisition,
  onDecideCashRequisition,
  onMarkAllCashNotificationsRead,
  onMarkCashNotificationRead,
  currentUserName = 'Managing Partner',
  currentUserRole = 'Senior Approver',
  activeBranch = 'Kampala Central (Head Office)',
  isApprover = true,
  searchQuery = '',
}) => {
  const [workspaceSection, setWorkspaceSection] = useState<'all' | 'cash' | 'general'>('all');
  const [filter, setFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL');

  const visible = useMemo(
    () => (filter === 'ALL' ? approvals : approvals.filter((a) => a.status === filter)),
    [approvals, filter]
  );

  const generalPendingCount = approvals.filter((a) => a.status === 'Pending').length;
  const activeCashCount = cashRequisitions.filter(
    (r) => r.stage === 'Pending Review' || r.stage === 'Level 1 Approved'
  ).length;
  const unreadNoticeCount = cashNotifications.filter((n) => n.unread).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B132B] dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <ClipboardCheck className="w-6 h-6 text-[#000065] dark:text-[#C5A880]" />
            Approval Workflows
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review and authorize multi-level cash requisitions, vault releases, fee notes, and urgent litigation filings.
          </p>
        </div>

        {/* Section Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setWorkspaceSection('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap tabular-nums ${
              workspaceSection === 'all'
                ? 'bg-[#0B132B] dark:bg-[#000065] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Workflows ({generalPendingCount + activeCashCount} active)
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceSection('cash')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap tabular-nums ${
              workspaceSection === 'cash'
                ? 'bg-[#0B132B] dark:bg-[#000065] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Banknote className={`w-3.5 h-3.5 ${workspaceSection === 'cash' ? 'text-[#C5A880]' : 'text-[#000065] dark:text-[#C5A880]'}`} />
            Cash Requisitions ({activeCashCount})
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceSection('general')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap tabular-nums ${
              workspaceSection === 'general'
                ? 'bg-[#0B132B] dark:bg-[#000065] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Vault, Fees &amp; Filings ({generalPendingCount})
          </button>
        </div>
      </div>

      {/* Decision Notifications Quick Banner when on General tab */}
      {workspaceSection === 'general' && cashNotifications.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-[#C5A880]/50 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <Bell className="w-4 h-4 text-[#000065] dark:text-[#C5A880] shrink-0 mt-0.5" />
            <div className="text-xs min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white">
                Latest Cash Requisition Notice: {cashNotifications[0].referenceCode} ·{' '}
                {cashNotifications[0].status}
                {unreadNoticeCount > 0 && (
                  <span className="ml-2 text-[#000065] dark:text-[#C5A880] tabular-nums">
                    ({unreadNoticeCount} unread)
                  </span>
                )}
              </p>
              <p className="text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                By {cashNotifications[0].actorName} — &ldquo;{cashNotifications[0].reason}&rdquo;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWorkspaceSection('cash')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#000065] dark:text-[#C5A880] hover:underline shrink-0 cursor-pointer"
          >
            <span>Open Cash Requisitions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Cash Requisition Multi-Level Approval Workflow Section */}
      {(workspaceSection === 'all' || workspaceSection === 'cash') && (
        <CashRequisitionModule
          compactHeader={true}
          currentUserName={currentUserName}
          currentUserRole={currentUserRole}
          activeBranch={activeBranch}
          isApprover={isApprover}
          searchQuery={searchQuery}
          requisitions={cashRequisitions}
          notifications={cashNotifications}
          onCreateRequisition={onCreateCashRequisition}
          onApplyDecision={onDecideCashRequisition}
          onMarkAllNotificationsRead={onMarkAllCashNotificationsRead}
          onMarkNotificationRead={onMarkCashNotificationRead}
        />
      )}

      {/* General Firm Approvals Section (Vault Release, Fee Notes, Filing Clearances) */}
      {(workspaceSection === 'all' || workspaceSection === 'general') && (
        <section className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Vault Releases, Fee Notes &amp; Filing Clearances
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chambers operational sign-offs awaiting managing partner authorization.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
              {(['ALL', 'Pending', 'Approved', 'Rejected'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                    filter === tab
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab === 'Pending' ? `Pending (${generalPendingCount})` : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {visible.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-[#000065] dark:text-[#E2CFAF]">
                      {item.code}
                    </span>
                    <span>·</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.category}
                    </span>
                    <span>·</span>
                    <span>{item.branch}</span>
                    <span>·</span>
                    <span className="tabular-nums">{item.submittedAt}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Requested by{' '}
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {item.requester}
                    </span>{' '}
                    · {item.amountOrDetail}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'Pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onDecide(item.id, 'Approved')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onDecide(item.id, 'Rejected')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Return
                      </button>
                    </>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        item.status === 'Approved'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {item.status === 'Approved' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export const TeamMessengerView: React.FC<{
  unreadCount: number;
  onMarkAllRead: () => void;
}> = ({ unreadCount, onMarkAllRead }) => {
  const { currentUser } = useApp();
  const effectiveUser = getEffectiveUser(currentUser);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [activeChannel, setActiveChannel] = useState<string>('Litigation Registry');
  const [draft, setDraft] = useState<string>('');

  const channels = ['Litigation Registry', 'Mortgages & Vault', 'Firm Announcements'];
  const channelMessages = messages.filter((m) => m.channel === activeChannel);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draft.trim();
    if (!clean) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        channel: activeChannel,
        sender: effectiveUser.name || 'Firm Counsel',
        role: effectiveUser.roleTitle || 'Advocate',
        body: clean,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: false,
      },
    ]);
    setDraft('');
    if (unreadCount > 0) onMarkAllRead();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0B132B] dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-[#000065] dark:text-[#C5A880]" />
            Team Messenger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Internal chambers communication across litigation, mortgages, and regional branches.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer self-start"
          >
            Mark {unreadCount} unread as read
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 pb-1">Practice Channels</p>
          {channels.map((ch) => {
            const isSelected = activeChannel === ch;
            const count = messages.filter((m) => m.channel === ch).length;
            return (
              <button
                key={ch}
                type="button"
                onClick={() => {
                  setActiveChannel(ch);
                  if (unreadCount > 0) onMarkAllRead();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#0B132B] dark:bg-[#000065] text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="truncate">{ch}</span>
                <span className={`text-xs tabular-nums ${isSelected ? 'text-[#E2CFAF]' : 'text-slate-400'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col min-h-[420px]">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activeChannel}</h2>
            <span className="text-xs text-[#9E7B46] dark:text-[#C5A880] font-medium">Encrypted Firm Channel</span>
          </div>

          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            {channelMessages.map((msg) => (
              <div key={msg.id} className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-800/80 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{msg.sender}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 dark:text-slate-400">{msg.role}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 tabular-nums">{msg.timestamp}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{msg.body}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message ${activeChannel}...`}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#000065] dark:focus:ring-[#C5A880]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B132B] hover:bg-[#000065] text-white text-xs font-semibold transition cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-[#C5A880]" />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

function formatSessionTimestamp(iso?: string): { date: string; time: string; relative: string } {
  if (!iso) return { date: '—', time: '—', relative: 'Unknown' };
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return { date: iso, time: '', relative: '' };
  }

  const date = parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = parsed.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const diffSec = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
  let relative = 'Just now';
  if (diffSec >= 86400) {
    const days = Math.floor(diffSec / 86400);
    relative = `${days}d ago`;
  } else if (diffSec >= 3600) {
    const hrs = Math.floor(diffSec / 3600);
    relative = `${hrs}h ago`;
  } else if (diffSec >= 60) {
    const mins = Math.floor(diffSec / 60);
    relative = `${mins}m ago`;
  }

  return { date, time, relative };
}

function escapeCsvCell(value: unknown): string {
  const raw = String(value ?? '');
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export const AuditTrailSecurityView: React.FC = () => {
  const { auditLogs, currentUser, setActiveTab } = useApp();
  const effectiveUser = getEffectiveUser(currentUser);
  const isAdmin = isUserAdmin(effectiveUser);

  const [activeSection, setActiveSection] = useState<'sessions' | 'activity'>('sessions');
  const [sessions, setSessions] = useState<UserLoginSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Revoked'>('ALL');
  const [deviceFilter, setDeviceFilter] = useState<'ALL' | 'Desktop' | 'Mobile' | 'Tablet'>('ALL');

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    setSessionsError(null);
    try {
      await recordCurrentUserSession(effectiveUser);
      const result = await fetchLoginSessions(effectiveUser);
      if (result.error) {
        setSessionsError(result.error);
      }
      setSessions(result.sessions);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [effectiveUser?.id, effectiveUser?.email, effectiveUser?.role, effectiveUser?.branchId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const filteredSessions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return sessions.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (deviceFilter !== 'ALL' && s.deviceType !== deviceFilter) return false;
      if (!q) return true;
      return (
        s.userName.toLowerCase().includes(q) ||
        s.userEmail.toLowerCase().includes(q) ||
        s.userRole.toLowerCase().includes(q) ||
        s.ipAddress.toLowerCase().includes(q) ||
        s.deviceLabel.toLowerCase().includes(q) ||
        s.browser.toLowerCase().includes(q) ||
        s.os.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q)
      );
    });
  }, [sessions, searchTerm, statusFilter, deviceFilter]);

  const sessionMetrics = useMemo(() => {
    const total = sessions.length;
    const activeCount = sessions.filter((s) => s.status === 'Active').length;
    const uniqueUsers = new Set(
      sessions.map((s) => (s.userEmail || s.userId || s.userName).toLowerCase()).filter(Boolean)
    ).size;
    const distinctIps = new Set(
      sessions
        .map((s) => s.ipAddress)
        .filter((ip) => Boolean(ip) && ip !== 'Unknown IP' && ip !== 'Recorded via Auth')
    ).size;
    return { total, activeCount, uniqueUsers, distinctIps };
  }, [sessions]);

  const handleRevokeSession = async (session: UserLoginSession) => {
    if (!isAdmin || revokingId) return;
    setRevokingId(session.id);
    setSessionNotice(null);
    const res = await revokeUserSession(session.id, effectiveUser);
    setRevokingId(null);

    if (!res.success) {
      setSessionNotice({
        type: 'error',
        text: res.error || 'Could not revoke this session.',
      });
      return;
    }

    setSessions((prev) =>
      prev.map((item) => (item.id === session.id ? { ...item, status: 'Revoked' } : item))
    );
    setSessionNotice({
      type: 'success',
      text: `Session for ${session.userName} (${session.ipAddress}) has been revoked and logged.`,
    });
  };

  const handleExportCsv = () => {
    const headers = [
      'Session ID',
      'User Name',
      'Email',
      'Role',
      'Branch',
      'IP Address',
      'Device Type',
      'Browser',
      'Operating System',
      'Login Timestamp (ISO)',
      'Last Active (ISO)',
      'Status',
      'Database Source',
    ];
    const rows = filteredSessions.map((s) => [
      s.id,
      s.userName,
      s.userEmail,
      s.userRole,
      s.branch,
      s.ipAddress,
      s.deviceType,
      s.browser,
      s.os,
      s.loginAt,
      s.lastActiveAt,
      s.status,
      s.source,
    ]);

    const csvLines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
    const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mk_session_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderDeviceIcon = (deviceType: UserLoginSession['deviceType']) => {
    if (deviceType === 'Mobile') return <Smartphone className="w-4 h-4 text-[#000065] dark:text-[#C5A880]" />;
    if (deviceType === 'Tablet') return <Tablet className="w-4 h-4 text-[#000065] dark:text-[#C5A880]" />;
    return <Monitor className="w-4 h-4 text-[#000065] dark:text-[#C5A880]" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B132B] dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-[#000065] dark:text-[#C5A880]" />
            Audit Trail &amp; Security Governance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Login session telemetry, IP and device verification, compliance activity log, and role access governance.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-[#000065] dark:text-[#C5A880]" />
              Access Roles &amp; Staff
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('synchub')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <Network className="w-3.5 h-3.5 text-[#9E7B46] dark:text-[#C5A880]" />
              Branch Sync Hub
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#000065] dark:bg-[#C5A880] text-white dark:text-[#0B132B] text-xs font-semibold hover:bg-[#000049] dark:hover:bg-[#D4BA94] cursor-pointer transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              System Settings
            </button>
          </div>
        )}
      </div>

      {/* Dashboard Tab Bar */}
      <div className="border-b border-[#DFE5F2] dark:border-slate-800 flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection('sessions')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeSection === 'sessions'
              ? 'border-[#000065] dark:border-[#C5A880] text-[#000065] dark:text-[#C5A880]'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Session Management
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums ${
              activeSection === 'sessions'
                ? 'bg-[#000065]/10 text-[#000065] dark:bg-[#C5A880]/20 dark:text-[#C5A880]'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {sessions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('activity')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeSection === 'activity'
              ? 'border-[#000065] dark:border-[#C5A880] text-[#000065] dark:text-[#C5A880]'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          Activity &amp; Compliance Log
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums ${
              activeSection === 'activity'
                ? 'bg-[#000065]/10 text-[#000065] dark:bg-[#C5A880]/20 dark:text-[#C5A880]'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {auditLogs.length}
          </span>
        </button>
      </div>

      {activeSection === 'sessions' ? (
        <div className="space-y-5">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 rounded-xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Login Sessions
              </p>
              <p className="text-2xl font-bold text-[#0B132B] dark:text-slate-100 mt-1 tabular-nums">
                {sessionMetrics.total}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Queried from firm database
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 rounded-xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Sessions
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                {sessionMetrics.activeCount}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Verified open staff logins
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 rounded-xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Unique Staff Accounts
              </p>
              <p className="text-2xl font-bold text-[#000065] dark:text-[#C5A880] mt-1 tabular-nums">
                {sessionMetrics.uniqueUsers}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Authenticated identities
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 rounded-xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Distinct IP Addresses
              </p>
              <p className="text-2xl font-bold text-[#0B132B] dark:text-slate-100 mt-1 tabular-nums">
                {sessionMetrics.distinctIps}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Observed network endpoints
              </p>
            </div>
          </div>

          {sessionNotice && (
            <div
              className={`px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
                sessionNotice.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
              }`}
            >
              <span className="flex items-center gap-2">
                {sessionNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {sessionNotice.text}
              </span>
              <button
                type="button"
                onClick={() => setSessionNotice(null)}
                className="text-xs underline opacity-80 hover:opacity-100 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Session Table Card */}
          <div className="bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 rounded-xl overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-[#DFE5F2] dark:border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search user, email, IP address, browser, or OS..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#DFE5F2] dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000065]/20 focus:border-[#000065]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filter by session status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'Active' | 'Revoked')}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-[#DFE5F2] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#000065]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Revoked">Revoked</option>
                </select>

                <select
                  aria-label="Filter by device type"
                  value={deviceFilter}
                  onChange={(e) => setDeviceFilter(e.target.value as 'ALL' | 'Desktop' | 'Mobile' | 'Tablet')}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-[#DFE5F2] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#000065]"
                >
                  <option value="ALL">All Devices</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Tablet">Tablet</option>
                </select>

                <button
                  type="button"
                  onClick={() => void loadSessions()}
                  disabled={isLoadingSessions}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#DFE5F2] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSessions ? 'animate-spin' : ''}`} />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={filteredSessions.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#000065] dark:bg-[#C5A880] text-white dark:text-[#0B132B] hover:bg-[#000049] dark:hover:bg-[#D4BA94] disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            </div>

            {sessionsError ? (
              <div className="p-8 text-center space-y-3">
                <AlertCircle className="w-7 h-7 text-rose-500 mx-auto" />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{sessionsError}</p>
                <button
                  type="button"
                  onClick={() => void loadSessions()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#000065] text-white text-xs font-semibold hover:bg-[#000049] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Database Query
                </button>
              </div>
            ) : isLoadingSessions && sessions.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-[#000065] dark:text-[#C5A880]" />
                Querying login session metadata from database...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No login sessions match your current filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-[#DFE5F2] dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-5">User &amp; Role</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Device Info</th>
                      <th className="py-3 px-4">Login Timestamp</th>
                      <th className="py-3 px-5 text-right">Status &amp; Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F9] dark:divide-slate-800 text-xs">
                    {filteredSessions.map((session) => {
                      const ts = formatSessionTimestamp(session.loginAt);
                      const initials = (session.userName || 'FS')
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase() || '')
                        .join('');

                      return (
                        <tr
                          key={session.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* User & Role */}
                          <td className="py-3.5 px-5 align-top">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#000065]/10 dark:bg-[#C5A880]/15 text-[#000065] dark:text-[#C5A880] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                {initials || 'MK'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {session.userName}
                                </p>
                                {session.userEmail && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {session.userEmail}
                                  </p>
                                )}
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                  {session.userRole} · {session.branch}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* IP Address */}
                          <td className="py-3.5 px-4 align-top whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {session.ipAddress}
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                              {session.source}
                            </p>
                          </td>

                          {/* Device Info */}
                          <td className="py-3.5 px-4 align-top">
                            <div
                              className="flex items-start gap-2.5 max-w-[260px]"
                              title={session.userAgent || session.deviceLabel}
                            >
                              <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                                {renderDeviceIcon(session.deviceType)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {session.deviceLabel}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {session.deviceType} · {session.os}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Login Timestamp */}
                          <td className="py-3.5 px-4 align-top whitespace-nowrap">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                              {ts.date}
                              {ts.time ? ` · ${ts.time}` : ''}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {ts.relative}
                            </div>
                          </td>

                          {/* Status & Action */}
                          <td className="py-3.5 px-5 align-top text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              {session.status === 'Revoked' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                                  <XCircle className="w-3 h-3" />
                                  Revoked
                                </span>
                              ) : session.isCurrentSession ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#000065]/10 dark:bg-[#C5A880]/15 border border-[#000065]/20 dark:border-[#C5A880]/30 text-[#000065] dark:text-[#C5A880] text-[11px] font-semibold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Current Session
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Active
                                </span>
                              )}

                              {isAdmin && session.status === 'Active' && !session.isCurrentSession && (
                                <button
                                  type="button"
                                  disabled={revokingId === session.id}
                                  onClick={() => void handleRevokeSession(session)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-[11px] font-semibold disabled:opacity-50 cursor-pointer transition-colors"
                                >
                                  {revokingId === session.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Ban className="w-3 h-3" />
                                  )}
                                  Revoke
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-5 py-3 border-t border-[#DFE5F2] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>
                Showing <strong className="text-slate-700 dark:text-slate-200 tabular-nums">{filteredSessions.length}</strong> of{' '}
                <strong className="text-slate-700 dark:text-slate-200 tabular-nums">{sessions.length}</strong> login session records
              </span>
              <span>IP addresses &amp; device profiles verified server-side</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" />
              Recent Security &amp; Matter Events ({auditLogs.length})
            </h2>
            <span className="text-xs text-slate-500">Role-Based Access Control Enforced</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No audit events recorded in this session yet. Actions on case files, vault custody, and staff permissions will appear here automatically.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.slice(0, 20).map((log) => (
                <div key={log.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {log.action}{' '}
                      <span className="font-normal text-slate-500">
                        · {log.performed_by || log.user_email || 'Authorized Staff'}
                      </span>
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 truncate">
                      {log.case_number ? `Case ${log.case_number}` : 'System Event'}
                      {log.branch ? ` · ${log.branch}` : ''}
                      {log.user_role ? ` · ${log.user_role}` : ''}
                    </p>
                  </div>
                  <span className="text-slate-400 tabular-nums shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
