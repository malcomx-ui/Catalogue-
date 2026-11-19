import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getEffectiveUser, isUserAdmin } from '../lib/supabase';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Send,
  Sparkles,
  BookOpen,
  Search,
  Mail,
  ShieldCheck,
  FileText,
  ArrowUpRight,
  Sliders,
  Network,
  Users,
  Lock,
} from 'lucide-react';

export interface ApprovalWorkflowItem {
  id: string;
  code: string;
  title: string;
  category: 'Fee Note' | 'Vault Release' | 'Filing Clearance';
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

const UGANDA_LEGAL_AUTHORITIES = [
  {
    id: 'auth-1',
    citation: 'Mortgage Act, Cap. 239 (Laws of Uganda)',
    topic: 'Mortgage Perfection, Statutory Notices & Sale',
    summary: 'Governs creation of legal mortgages, 45-day notice of default (Sec. 19), 21-day notice of sale, and borrower right of redemption.',
    court: 'Statutory Authority',
  },
  {
    id: 'auth-2',
    citation: 'Civil Procedure Rules SI 71-1 — Order 36',
    topic: 'Summary Procedure on Liquidated Demands',
    summary: 'Procedure for summary suits on liquidated claims, unconditional vs conditional leave to appear and defend, and triable issues test.',
    court: 'High Court / Commercial Division',
  },
  {
    id: 'auth-3',
    citation: 'Kiyimba Kaggwa v Haji Abdu Nasser Katende [1985] HCB 43',
    topic: 'Temporary Injunction Threshold',
    summary: 'Establishes the classic three-stage test: prima facie case with probability of success, irreparable injury not compensable in damages, and balance of convenience.',
    court: 'High Court of Uganda',
  },
  {
    id: 'auth-4',
    citation: 'Registration of Titles Act, Cap. 240 — Sec. 59 & 139',
    topic: 'Indefeasibility of Title & Caveat Lodgement',
    summary: 'Certificate of title as conclusive evidence of proprietorship except in cases of fraud; statutory procedure for lodging and lapsing caveats.',
    court: 'Land Division / Court of Appeal',
  },
];

export const ApprovalsQueueView: React.FC<{
  approvals: ApprovalWorkflowItem[];
  onDecide: (id: string, decision: 'Approved' | 'Rejected') => void;
}> = ({ approvals, onDecide }) => {
  const [filter, setFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL');

  const visible = useMemo(
    () => (filter === 'ALL' ? approvals : approvals.filter((a) => a.status === filter)),
    [approvals, filter]
  );

  const pendingCount = approvals.filter((a) => a.status === 'Pending').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
            Approval Workflows
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review and authorize pending vault releases, fee notes, and urgent litigation filings.
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
              {tab === 'Pending' ? `Pending (${pendingCount})` : tab}
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
                <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">{item.code}</span>
                <span>·</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{item.category}</span>
                <span>·</span>
                <span>{item.branch}</span>
                <span>·</span>
                <span className="tabular-nums">{item.submittedAt}</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Requested by <span className="font-medium text-slate-800 dark:text-slate-200">{item.requester}</span> · {item.amountOrDetail}
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-blue-600" />
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
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="truncate">{ch}</span>
                <span className="text-xs text-slate-400 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col min-h-[420px]">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activeChannel}</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">Encrypted Firm Channel</span>
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
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const LegalResearchView: React.FC = () => {
  const { cases, setSelectedCase, setActiveTab } = useApp();
  const [query, setQuery] = useState('');

  const filteredAuthorities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return UGANDA_LEGAL_AUTHORITIES;
    return UGANDA_LEGAL_AUTHORITIES.filter(
      (a) =>
        a.citation.toLowerCase().includes(q) ||
        a.topic.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q)
    );
  }, [query]);

  const matchingMatters = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases.slice(0, 4);
    return cases
      .filter((c) => {
        const partiesText = Array.isArray(c.parties) ? c.parties.map((p) => p.name).join(' ') : '';
        return (
          (c.suitNumber || '').toLowerCase().includes(q) ||
          (c.firmRefNumber || '').toLowerCase().includes(q) ||
          (c.title || '').toLowerCase().includes(q) ||
          partiesText.toLowerCase().includes(q) ||
          (c.clientName || c.client || '').toLowerCase().includes(q) ||
          (c.case_type || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [cases, query]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white space-y-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-blue-100" />
          <h1 className="text-xl font-bold tracking-tight">Legal Research &amp; Case Precedent Finder</h1>
        </div>
        <p className="text-sm text-blue-100 max-w-2xl">
          Search Ugandan statutes, High Court authorities, and MK Advocates firm litigation records in one workspace.
        </p>
        <div className="relative max-w-2xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search statutes (e.g. Mortgage Act, Order 36, Injunction) or firm suit numbers..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Statutory &amp; Case Law Authorities ({filteredAuthorities.length})
          </h2>
          {filteredAuthorities.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.citation}</h3>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium shrink-0">{item.court}</span>
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.topic}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.summary}</p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Related Firm Matters ({matchingMatters.length})
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('catalogue')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Open Full Register
            </button>
          </div>
          {matchingMatters.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
              No matching firm matters for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            matchingMatters.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCase(c)}
                className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 rounded-2xl p-4 transition cursor-pointer flex items-start justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-400 truncate">
                    {c.suitNumber || c.firmRefNumber || c.case_number}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {c.title || c.clientName || c.client || 'Active Firm Matter'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {c.court || c.division || 'High Court'} · {c.branchName || 'Kampala HQ'}
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const CorrespondenceView: React.FC = () => {
  const { cases, setSelectedCase, setActiveTab } = useApp();
  const [filterType, setFilterType] = useState<'All' | 'Demand Notice' | 'Client Brief' | 'Court Registry'>('All');

  const records = useMemo(() => {
    const derived = cases.slice(0, 6).map((c, idx) => ({
      id: `corr-${c.id}`,
      ref: `MK/CORR/2026/${String(104 + idx)}`,
      type: (idx % 3 === 0 ? 'Demand Notice' : idx % 3 === 1 ? 'Client Brief' : 'Court Registry') as
        | 'Demand Notice'
        | 'Client Brief'
        | 'Court Registry',
      subject: `${c.title || c.clientName || c.client || 'Client Matter'} — Status & Registry Dispatch`,
      recipient: c.clientName || c.client || 'Authorized Party',
      branch: c.branchName || 'Kampala Central (Head Office)',
      date: c.lastUpdated ? String(c.lastUpdated).slice(0, 10) : new Date().toISOString().slice(0, 10),
      caseObj: c,
    }));
    if (filterType === 'All') return derived;
    return derived.filter((r) => r.type === filterType);
  }, [cases, filterType]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-blue-600" />
            Correspondence &amp; Client Dispatches
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track formal legal notices, client briefings, and court registry letters across all chambers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('clients')}
          className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 cursor-pointer self-start"
        >
          Open Clients Directory
        </button>
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {(['All', 'Demand Notice', 'Client Brief', 'Court Registry'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              filterType === t
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
        {records.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No correspondence dispatches found for this filter.</div>
        ) : (
          records.map((rec) => (
            <div
              key={rec.id}
              onClick={() => setSelectedCase(rec.caseObj)}
              className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">{rec.ref}</span>
                  <span>·</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{rec.type}</span>
                  <span>·</span>
                  <span>{rec.branch}</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{rec.subject}</p>
                <p className="text-xs text-slate-500">Recipient: {rec.recipient}</p>
              </div>
              <span className="text-xs text-slate-400 tabular-nums shrink-0">{rec.date}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const AuditTrailSecurityView: React.FC = () => {
  const { auditLogs, currentUser, setActiveTab } = useApp();
  const effectiveUser = getEffectiveUser(currentUser);
  const isAdmin = isUserAdmin(effectiveUser);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Audit Trail &amp; Security Governance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Compliance activity log, role access verification, and multi-branch registry security posture.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              Access Roles &amp; Staff
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('synchub')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              <Network className="w-3.5 h-3.5 text-indigo-600" />
              Branch Sync Hub
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              System Settings
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
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
    </div>
  );
};
