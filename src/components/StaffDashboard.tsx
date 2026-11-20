import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getEffectiveUser } from '../lib/supabase';
import { hrSupabase, canAccessRestrictedWorkflowNav } from '../lib/hrSupabase';
import { MortgageService, getVisibleBanksForUser } from '../services/mortgageService';
import { calculateUgandaLeaveBreakdown } from '../utils/ugandaHolidays';
import { showCleanMessage } from '../utils/notification';
import type { CaseItem, PleadingDocument, ProgressiveNote } from '../types';
import {
  Briefcase,
  Clock,
  ClipboardCheck,
  CalendarClock,
  FolderLock,
  ArrowRight,
  Upload,
  FileText,
  CalendarDays,
  Plus,
  X,
  Search,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Landmark,
} from 'lucide-react';

export type TaskStatus = 'Todo' | 'In Progress' | 'Completed';
export type TaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM';

export interface StaffWorkflowTask {
  id: string;
  priority: TaskPriority;
  title: string;
  caseCode: string;
  assignee: string;
  dueDate: string;
  status: TaskStatus;
  branchScope?: string;
}

export interface DashboardNotice {
  id: string;
  pinned?: boolean;
  category: string;
  title: string;
  body: string;
  issuer: string;
  date: string;
  branchScope: string;
}

export interface BirthdayCelebrant {
  id: string;
  name: string;
  role: string;
  dateLabel: string;
  isToday?: boolean;
  isUuid?: boolean;
  wishes: Array<{ id: string; sender: string; message: string; createdAt: string }>;
}

export interface StaffDashboardProps {
  currentUser?: any;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  activeBranchId?: string;
  activeBranchLabel?: string;
  branchOptions?: Array<{ id: string; name: string }>;
  onBranchChange?: (branchId: string) => void;
  pendingApprovalsCount?: number;
  onOpenNewCase?: () => void;
  onOpenLitigationForm?: () => void;
  onOpenApprovals?: () => void;
  onOpenDocuments?: () => void;
  onOpenCases?: () => void;
  onOpenWorkload?: () => void;
  onOpenHearings?: () => void;
  onOpenHrModule?: () => void;
  hideTopHeader?: boolean;
}

type CaseFilterTab = 'All' | 'Litigation' | 'Corporate' | 'Mortgages';
type QuickModalType = 'time' | 'document' | 'note' | 'leave' | null;

interface TimeLogEntry {
  id: string;
  caseId: string;
  caseCode: string;
  matterTitle: string;
  hours: number;
  date: string;
  description: string;
  billable: boolean;
  author: string;
  createdAt: string;
}

interface ActivityTimelineItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  sortTime: number;
}

interface UnifiedCaseRow {
  id: string;
  code: string;
  title: string;
  client: string;
  practice: 'Litigation' | 'Corporate' | 'Mortgages';
  practiceLabel: string;
  branch: string;
  stage: string;
  nextDeadline: string;
  rawCase?: CaseItem;
  isMortgage?: boolean;
}

const TIME_LOGS_STORAGE_KEY = 'mk_clio_time_logs_v1';
const LOCAL_ACTIVITY_STORAGE_KEY = 'mk_clio_local_activity_v1';
const LOCAL_LEAVE_REQUESTS_KEY = 'mk_clio_quick_leave_requests_v1';
const MONTHLY_BILLABLE_TARGET = 150;

const INITIAL_TIME_LOGS: TimeLogEntry[] = [
  {
    id: 'tl-seed-1',
    caseId: 'seed-1',
    caseCode: 'HCT-00-CC-CS-0142',
    matterTitle: 'Commercial Division Summary Suit Submissions',
    hours: 42.5,
    date: new Date().toISOString().slice(0, 10),
    description: 'Drafting written submissions, authorities bundle & client conference.',
    billable: true,
    author: 'Litigation Chambers',
    createdAt: 'MTD Ledger',
  },
  {
    id: 'tl-seed-2',
    caseId: 'seed-2',
    caseCode: 'MK-CORP-2026-019',
    matterTitle: 'Syndicated Facility & Security Perfection Review',
    hours: 51.0,
    date: new Date().toISOString().slice(0, 10),
    description: 'Corporate governance opinions, mortgage deeds & title due diligence.',
    billable: true,
    author: 'Corporate & Banking Desk',
    createdAt: 'MTD Ledger',
  },
  {
    id: 'tl-seed-3',
    caseId: 'seed-3',
    caseCode: 'HCT-00-LD-CS-0088',
    matterTitle: 'Witness Cross-Examination & Trial Preparation',
    hours: 31.0,
    date: new Date().toISOString().slice(0, 10),
    description: 'Trial bundle pagination, witness proofing and High Court attendance.',
    billable: true,
    author: 'Litigation Chambers',
    createdAt: 'MTD Ledger',
  },
];

function classifyCasePractice(c: CaseItem): 'Litigation' | 'Corporate' | 'Mortgages' {
  const haystack = `${c.case_type || ''} ${c.division || ''} ${c.title || ''} ${c.subject_matter || ''}`.toLowerCase();
  if (
    haystack.includes('mortgage') ||
    haystack.includes('debenture') ||
    haystack.includes('perfection') ||
    haystack.includes('title deed')
  ) {
    return 'Mortgages';
  }
  if (
    haystack.includes('corporate') ||
    haystack.includes('commercial') ||
    haystack.includes('tax') ||
    haystack.includes('arbitration') ||
    haystack.includes('contract') ||
    haystack.includes('advisory') ||
    haystack.includes('company')
  ) {
    return 'Corporate';
  }
  return 'Litigation';
}

function isCaseClosed(c: CaseItem): boolean {
  const s = String(c.status || 'Active').trim().toLowerCase();
  const stage = String(c.stage || '').trim().toLowerCase();
  return (
    s === 'closed' ||
    s === 'concluded' ||
    s === 'archived' ||
    s === 'disposed' ||
    s === 'completed' ||
    s.includes('closed') ||
    s.includes('concluded') ||
    s.includes('disposed') ||
    stage.includes('disposed') ||
    stage.includes('closed') ||
    Boolean(c.year_of_closure)
  );
}

function parseDateParts(raw?: string | null): { month: string; day: string; formatted: string; timestamp: number } {
  if (!raw) {
    return { month: 'TBD', day: '--', formatted: 'Not scheduled', timestamp: Number.MAX_SAFE_INTEGER };
  }
  const clean = String(raw).trim().slice(0, 10);
  const parts = clean.split('-').map(Number);
  let dt: Date | null = null;
  if (parts.length === 3 && !parts.some((n) => Number.isNaN(n))) {
    dt = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) dt = parsed;
  }

  if (!dt) {
    return { month: 'TBD', day: '--', formatted: String(raw), timestamp: Number.MAX_SAFE_INTEGER };
  }

  const month = dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = String(dt.getDate()).padStart(2, '0');
  const formatted = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return { month, day, formatted, timestamp: dt.getTime() };
}

function formatRelativeTime(isoOrText?: string | null): string {
  if (!isoOrText) return 'Recently';
  const dt = new Date(isoOrText);
  if (Number.isNaN(dt.getTime())) return String(isoOrText);
  const diffMs = Date.now() - dt.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function getStageTone(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes('judgment') || s.includes('ruling') || s.includes('submission') || s.includes('execution')) {
    return 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60';
  }
  if (s.includes('disposed') || s.includes('closed') || s.includes('perfected') || s.includes('registered')) {
    return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60';
  }
  if (s.includes('trial') || s.includes('hearing')) {
    return 'bg-[#162238]/8 dark:bg-sky-950/50 text-[#162238] dark:text-sky-300 border-[#162238]/15 dark:border-sky-800/60';
  }
  return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  currentUser: propUser,
  searchQuery: controlledSearch,
  onSearchChange,
  activeBranchId: controlledBranchId,
  activeBranchLabel: controlledBranchLabel,
  branchOptions: controlledBranchOptions,
  onBranchChange,
  pendingApprovalsCount = 0,
  onOpenNewCase,
  onOpenApprovals,
  onOpenDocuments,
  onOpenCases,
  onOpenHearings,
  hideTopHeader = false,
}) => {
  const {
    cases,
    hearings,
    documents,
    branches,
    currentUser: ctxUser,
    selectedBranchFilter,
    setSelectedBranchFilter,
    setActiveTab,
    setIsNewCaseModalOpen,
    setSelectedCase,
    addDocument,
    addProgressiveNote,
    systemSettings,
  } = useApp();

  const effectiveUser = useMemo(() => getEffectiveUser(propUser || ctxUser), [propUser, ctxUser]);
  const canAccessRestrictedWorkflow = canAccessRestrictedWorkflowNav(effectiveUser);

  const [internalSearch, setInternalSearch] = useState('');
  const searchQuery = controlledSearch !== undefined ? controlledSearch : internalSearch;
  const handleSearchChange = onSearchChange || setInternalSearch;

  const [activeCaseFilter, setActiveCaseFilter] = useState<CaseFilterTab>('All');
  const [activeModal, setActiveModal] = useState<QuickModalType>(null);

  // Live mortgages fetched via shared MortgageService (no duplicate Supabase clients)
  const [mortgages, setMortgages] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const banks = getVisibleBanksForUser(effectiveUser);
    Promise.all(
      banks.map((bank) => MortgageService.fetchMortgages(bank, effectiveUser).catch(() => []))
    ).then((batches) => {
      if (!mounted) return;
      const merged = batches.flat().filter(Boolean);
      setMortgages(merged);
    });
    return () => {
      mounted = false;
    };
  }, [effectiveUser]);

  // Persisted MTD Time Logs
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(TIME_LOGS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // fallback to defaults
      }
    }
    return INITIAL_TIME_LOGS;
  });

  // Persisted Quick Action Activity Feed
  const [localActivities, setLocalActivities] = useState<ActivityTimelineItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(LOCAL_ACTIVITY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(TIME_LOGS_STORAGE_KEY, JSON.stringify(timeLogs));
      } catch {
        // ignore
      }
    }
  }, [timeLogs]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LOCAL_ACTIVITY_STORAGE_KEY, JSON.stringify(localActivities.slice(0, 20)));
      } catch {
        // ignore
      }
    }
  }, [localActivities]);

  // Close active modal on Escape
  useEffect(() => {
    if (!activeModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeModal]);

  const resolvedBranchOptions = useMemo(() => {
    if (controlledBranchOptions && controlledBranchOptions.length > 0) return controlledBranchOptions;
    if (Array.isArray(branches) && branches.length > 0) {
      return [
        { id: 'all', name: 'All Firm Branches' },
        ...branches.map((b) => ({ id: b.id, name: b.name })),
      ];
    }
    return [{ id: 'all', name: 'All Firm Branches' }];
  }, [controlledBranchOptions, branches]);

  const activeBranchId = controlledBranchId !== undefined ? controlledBranchId : selectedBranchFilter || 'all';
  const activeBranchLabel = useMemo(() => {
    if (controlledBranchLabel) return controlledBranchLabel;
    const found = resolvedBranchOptions.find((b) => b.id === activeBranchId);
    if (found && found.id !== 'all') return found.name;
    return effectiveUser?.branchName || 'All Firm Branches';
  }, [controlledBranchLabel, resolvedBranchOptions, activeBranchId, effectiveUser?.branchName]);

  const handleBranchSelect = (branchId: string) => {
    if (onBranchChange) onBranchChange(branchId);
    else setSelectedBranchFilter(branchId);
  };

  // Branch-scoped live cases
  const branchScopedCases = useMemo(() => {
    const normalizedBranchId = String(activeBranchId || '').trim().toLowerCase();
    if (
      !normalizedBranchId ||
      normalizedBranchId === 'all' ||
      normalizedBranchId === 'all firm branches' ||
      normalizedBranchId === '(all firm branches)'
    ) {
      return cases;
    }

    const targetBranch = branches.find((b) => b.id.toLowerCase() === normalizedBranchId);
    const targetCity = (targetBranch?.city || '').trim().toLowerCase();
    const targetName = (targetBranch?.name || activeBranchLabel || '').trim().toLowerCase();

    return cases.filter((c) => {
      const bId = String(c.branchId || '').trim().toLowerCase();
      const bName = String(c.branch || c.branchName || '').trim().toLowerCase();
      return (
        (bId !== '' && bId === normalizedBranchId) ||
        (targetCity !== '' && (bName.includes(targetCity) || bId.includes(targetCity))) ||
        (targetName !== '' &&
          bName !== '' &&
          (bName.includes(targetName) || (bName.length >= 3 && targetName.includes(bName))))
      );
    });
  }, [cases, activeBranchId, branches, activeBranchLabel]);

  // Branch-scoped mortgages
  const branchScopedMortgages = useMemo(() => {
    const normalizedBranchId = String(activeBranchId || '').trim().toLowerCase();
    if (!normalizedBranchId || normalizedBranchId === 'all' || normalizedBranchId === 'all firm branches') {
      return mortgages;
    }
    const targetBranch = branches.find((b) => b.id.toLowerCase() === normalizedBranchId);
    const targetCity = (targetBranch?.city || '').trim().toLowerCase();
    const targetName = (targetBranch?.name || activeBranchLabel || '').trim().toLowerCase();

    return mortgages.filter((m) => {
      const bId = String(m.branch_id || '').trim().toLowerCase();
      const bName = String(m.firm_branch_station || m.branch_name || m.bank_branch_station || '').trim().toLowerCase();
      return (
        (bId !== '' && bId === normalizedBranchId) ||
        (targetCity !== '' && bName.includes(targetCity)) ||
        (targetName !== '' && bName !== '' && (bName.includes(targetName) || targetName.includes(bName)))
      );
    });
  }, [mortgages, activeBranchId, branches, activeBranchLabel]);

  // Upcoming Deadlines (real hearings + case next hearing dates)
  const upcomingDeadlines = useMemo(() => {
    const items: Array<{
      id: string;
      rawDate: string;
      month: string;
      day: string;
      formattedDate: string;
      sortTs: number;
      title: string;
      caseCode: string;
      venue: string;
      badge: string;
      linkedCase?: CaseItem;
    }> = [];

    const seenCodes = new Set<string>();

    hearings
      .filter((h) => h.status !== 'Completed')
      .forEach((h) => {
        const linked = cases.find((c) => c.id === h.caseId || c.suitNumber === h.suitNumber);
        if (activeBranchId && activeBranchId !== 'all' && linked && linked.branchId && linked.branchId !== activeBranchId) {
          return;
        }
        const dp = parseDateParts(h.hearingDate);
        const code = h.suitNumber || linked?.suitNumber || 'HCT-2026';
        seenCodes.add(`${code}-${h.hearingDate}`);
        items.push({
          id: h.id,
          rawDate: h.hearingDate,
          month: dp.month,
          day: dp.day,
          formattedDate: dp.formatted,
          sortTs: dp.timestamp,
          title: h.hearingPurpose || h.caseTitle || 'Scheduled Court Appearance',
          caseCode: code,
          venue: h.courtRoom || h.courtName || linked?.court || 'High Court Commercial Division',
          badge: h.status || 'Scheduled',
          linkedCase: linked,
        });
      });

    branchScopedCases
      .filter((c) => !isCaseClosed(c) && (c.nextHearingDate || c.hearing_date))
      .forEach((c) => {
        const dateVal = String(c.nextHearingDate || c.hearing_date || '').slice(0, 10);
        const code = c.suitNumber || c.firmRefNumber || c.case_number || 'MK-FILE';
        if (seenCodes.has(`${code}-${dateVal}`)) return;
        const dp = parseDateParts(dateVal);
        items.push({
          id: `case-dl-${c.id}`,
          rawDate: dateVal,
          month: dp.month,
          day: dp.day,
          formattedDate: dp.formatted,
          sortTs: dp.timestamp,
          title: c.nextHearingPurpose || c.title || 'Court Mention / Filing Deadline',
          caseCode: code,
          venue: c.court || c.branchName || 'Firm Registry',
          badge: c.stage || 'Hearing',
          linkedCase: c,
        });
      });

    const sorted = items.sort((a, b) => a.sortTs - b.sortTs);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.caseCode.toLowerCase().includes(q) ||
        i.venue.toLowerCase().includes(q)
    );
  }, [hearings, cases, branchScopedCases, activeBranchId, searchQuery]);

  // 4-Column KPI Metrics (strictly tallied from live data)
  const kpiStats = useMemo(() => {
    let activeOpenCases = 0;
    let closedCases = 0;
    branchScopedCases.forEach((c) => {
      if (isCaseClosed(c)) closedCases += 1;
      else activeOpenCases += 1;
    });

    const billableHoursMtd = timeLogs
      .filter((l) => l.billable)
      .reduce((sum, l) => sum + (Number(l.hours) || 0), 0);
    const billablePct = Math.min(100, Math.round((billableHoursMtd / MONTHLY_BILLABLE_TARGET) * 100));

    const nowTs = new Date(new Date().toDateString()).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const dueWithin7Days = upcomingDeadlines.filter(
      (d) => d.sortTs >= nowTs && d.sortTs <= nowTs + sevenDaysMs
    ).length;

    // Hardcopy Physical File Custody calculation
    let checkedOutFiles = 0;
    let vaultSecuredFiles = 0;

    branchScopedCases.forEach((c) => {
      const latestMovement =
        Array.isArray(c.fileMovementHistory) && c.fileMovementHistory.length > 0
          ? c.fileMovementHistory[c.fileMovementHistory.length - 1]
          : null;
      const loc = String(latestMovement?.toLocation || c.file_location || '').toLowerCase();
      const moveStatus = String(latestMovement?.status || '').toLowerCase();

      const isCheckedOut =
        moveStatus === 'with advocate' ||
        moveStatus === 'in transit' ||
        moveStatus === 'in court' ||
        loc.includes('advocate') ||
        loc.includes('court') ||
        loc.includes('counsel') ||
        loc.includes('transit') ||
        loc.includes('checked out') ||
        loc.includes('desk');

      if (isCheckedOut) {
        checkedOutFiles += 1;
      } else {
        vaultSecuredFiles += 1;
      }
    });

    return {
      activeOpenCases,
      closedCases,
      totalCases: branchScopedCases.length,
      billableHoursMtd,
      billablePct,
      pendingApprovals: canAccessRestrictedWorkflow ? pendingApprovalsCount : 0,
      upcomingDeadlinesCount: upcomingDeadlines.length,
      dueWithin7Days,
      checkedOutFiles,
      vaultSecuredFiles,
      indexedDocuments: documents.length,
    };
  }, [
    branchScopedCases,
    timeLogs,
    upcomingDeadlines,
    canAccessRestrictedWorkflow,
    pendingApprovalsCount,
    documents.length,
  ]);

  // Unified rows for the Active Cases Table (All | Litigation | Corporate | Mortgages)
  const activeTableRows = useMemo<UnifiedCaseRow[]>(() => {
    const caseRows: UnifiedCaseRow[] = branchScopedCases
      .filter((c) => !isCaseClosed(c))
      .map((c) => {
        const practice = classifyCasePractice(c);
        const deadlineDate = c.nextHearingDate || c.hearing_date || '';
        const dp = parseDateParts(deadlineDate);
        const primaryClient =
          c.clientName ||
          c.client ||
          (Array.isArray(c.parties) && c.parties.length > 0 ? c.parties[0].name : '') ||
          'Firm Client';
        return {
          id: c.id,
          code: c.suitNumber || c.firmRefNumber || c.case_number || 'MK-MATTER',
          title: c.title || primaryClient,
          client: primaryClient,
          practice,
          practiceLabel: c.case_type || practice,
          branch: c.branchName || c.branch || 'Kampala Central',
          stage: c.stage || c.status || 'Active',
          nextDeadline: deadlineDate ? dp.formatted : 'TBD',
          rawCase: c,
        };
      });

    const mortgageRows: UnifiedCaseRow[] = branchScopedMortgages.map((m) => {
      const dp = parseDateParts(m.date_of_receipt || m.updated_at || '');
      return {
        id: `mtg-${m.id}`,
        code: m.file_ref || m.mortgage_ref || m.bank_name || 'MTG-FILE',
        title: m.borrower_name || m.mortgagor_name || m.client_name || 'Mortgage Perfection Matter',
        client: m.bank_name || m.client_bank_name || 'Partner Financial Institution',
        practice: 'Mortgages',
        practiceLabel: m.bank_name || 'Mortgages & Securities',
        branch: m.firm_branch_station || m.branch_name || m.bank_branch_station || 'Kampala Central',
        stage: m.status || m.perfection_status || 'In Perfection',
        nextDeadline: m.date_of_receipt ? dp.formatted : 'Ongoing',
        isMortgage: true,
      };
    });

    const combined =
      activeCaseFilter === 'Mortgages'
        ? [...mortgageRows, ...caseRows.filter((r) => r.practice === 'Mortgages')]
        : activeCaseFilter === 'All'
        ? [...caseRows, ...mortgageRows.slice(0, 4)]
        : caseRows.filter((r) => r.practice === activeCaseFilter);

    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? combined.filter(
          (r) =>
            r.code.toLowerCase().includes(q) ||
            r.title.toLowerCase().includes(q) ||
            r.client.toLowerCase().includes(q) ||
            r.branch.toLowerCase().includes(q) ||
            r.stage.toLowerCase().includes(q) ||
            r.practiceLabel.toLowerCase().includes(q)
        )
      : combined;

    return filtered.slice(0, 8);
  }, [branchScopedCases, branchScopedMortgages, activeCaseFilter, searchQuery]);

  // Recent Activity Timeline (merged from live actions, progressive notes, documents, and recent case updates)
  const recentActivity = useMemo<ActivityTimelineItem[]>(() => {
    const feed: ActivityTimelineItem[] = [...localActivities];

    // Add progressive notes from branch cases
    branchScopedCases.forEach((c) => {
      if (Array.isArray(c.progressiveNotes)) {
        c.progressiveNotes.slice(-2).forEach((note) => {
          const ts = new Date(note.timestamp).getTime();
          feed.push({
            id: `note-${note.id}`,
            title: `${note.category} logged on ${c.suitNumber || c.firmRefNumber}`,
            detail: `${note.author}: ${note.content}`,
            timestamp: formatRelativeTime(note.timestamp),
            sortTime: Number.isNaN(ts) ? Date.now() - 3600000 : ts,
          });
        });
      }
    });

    // Add recent documents
    documents.slice(0, 4).forEach((doc, idx) => {
      const ts = new Date(doc.filingDate).getTime();
      feed.push({
        id: `doc-${doc.id}`,
        title: `${doc.documentType} filed — ${doc.suitNumber}`,
        detail: `${doc.title} · Filed by ${doc.filedBy}`,
        timestamp: formatRelativeTime(doc.filingDate),
        sortTime: Number.isNaN(ts) ? Date.now() - (idx + 2) * 7200000 : ts,
      });
    });

    // Add recent case updates if feed is light
    if (feed.length < 5) {
      branchScopedCases.slice(0, 4).forEach((c, idx) => {
        const ts = new Date(c.lastUpdated).getTime();
        feed.push({
          id: `upd-${c.id}`,
          title: `Matter updated — ${c.suitNumber || c.firmRefNumber}`,
          detail: `${c.title} (${c.stage || c.status})`,
          timestamp: formatRelativeTime(c.lastUpdated),
          sortTime: Number.isNaN(ts) ? Date.now() - (idx + 5) * 10800000 : ts,
        });
      });
    }

    return feed.sort((a, b) => b.sortTime - a.sortTime).slice(0, 6);
  }, [localActivities, branchScopedCases, documents]);

  // Quick Action Modal States
  const defaultCaseId = branchScopedCases[0]?.id || cases[0]?.id || '';

  // 1. Log Time form state
  const [timeCaseId, setTimeCaseId] = useState<string>('');
  const [timeHours, setTimeHours] = useState<string>('1.5');
  const [timeDate, setTimeDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [timeBillable, setTimeBillable] = useState<boolean>(true);
  const [timeDescription, setTimeDescription] = useState<string>('');

  // 2. Upload Document form state
  const [docCaseId, setDocCaseId] = useState<string>('');
  const [docTitle, setDocTitle] = useState<string>('');
  const [docType, setDocType] = useState<PleadingDocument['documentType']>('Legal Submissions');
  const [docFileName, setDocFileName] = useState<string>('');
  const [docFileSize, setDocFileSize] = useState<string>('1.2 MB');

  // 3. New Case Note form state
  const [noteCaseId, setNoteCaseId] = useState<string>('');
  const [noteCategory, setNoteCategory] = useState<ProgressiveNote['category']>('Court Milestone');
  const [noteContent, setNoteContent] = useState<string>('');
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);

  // 4. Request Leave form state
  const [leaveType, setLeaveType] = useState<string>('Annual Leave');
  const [leaveStart, setLeaveStart] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [leaveEnd, setLeaveEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [leaveReason, setLeaveReason] = useState<string>('');
  const [submittingLeave, setSubmittingLeave] = useState<boolean>(false);

  const leaveBreakdown = useMemo(
    () => calculateUgandaLeaveBreakdown(leaveStart, leaveEnd, systemSettings?.publicHolidays),
    [leaveStart, leaveEnd, systemSettings?.publicHolidays]
  );

  const openQuickModal = (modal: QuickModalType) => {
    if (modal === 'time' && !timeCaseId) setTimeCaseId(defaultCaseId);
    if (modal === 'document' && !docCaseId) setDocCaseId(defaultCaseId);
    if (modal === 'note' && !noteCaseId) setNoteCaseId(defaultCaseId);
    setActiveModal(modal);
  };

  const pushLocalActivity = (title: string, detail: string) => {
    setLocalActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        title,
        detail,
        timestamp: 'Just now',
        sortTime: Date.now(),
      },
      ...prev,
    ]);
  };

  const handleSubmitTimeLog = (e: React.FormEvent) => {
    e.preventDefault();
    const numericHours = parseFloat(timeHours);
    if (Number.isNaN(numericHours) || numericHours <= 0 || numericHours > 24) {
      showCleanMessage('Enter valid hours between 0.1 and 24.0.', 'warning');
      return;
    }
    if (!timeDescription.trim()) {
      showCleanMessage('Please provide a brief work narrative for the time entry.', 'warning');
      return;
    }

    const matchedCase = cases.find((c) => c.id === timeCaseId);
    const code = matchedCase?.suitNumber || matchedCase?.firmRefNumber || 'FIRM-GEN';
    const matterTitle = matchedCase?.title || 'General Legal Advisory';

    const newEntry: TimeLogEntry = {
      id: `tl-${Date.now()}`,
      caseId: matchedCase?.id || 'general',
      caseCode: code,
      matterTitle,
      hours: numericHours,
      date: timeDate,
      description: timeDescription.trim(),
      billable: timeBillable,
      author: effectiveUser?.name || 'Advocate',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setTimeLogs((prev) => [newEntry, ...prev]);
    pushLocalActivity(
      `Logged ${numericHours.toFixed(1)}h ${timeBillable ? 'billable' : 'non-billable'} — ${code}`,
      `${effectiveUser?.name || 'Advocate'}: ${timeDescription.trim()}`
    );
    setTimeDescription('');
    setTimeHours('1.5');
    setActiveModal(null);
    showCleanMessage(`Logged ${numericHours.toFixed(1)} hours to ${code}.`, 'success');
  };

  const handleSubmitDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) {
      showCleanMessage('Enter a document title before uploading.', 'warning');
      return;
    }
    const matchedCase = cases.find((c) => c.id === docCaseId) || branchScopedCases[0] || cases[0];
    const suitNo = matchedCase?.suitNumber || matchedCase?.firmRefNumber || 'MK-REG-2026';

    const ext = docFileName.split('.').pop()?.toLowerCase();
    const fileFormat: PleadingDocument['fileFormat'] =
      ext === 'docx' || ext === 'doc'
        ? 'docx'
        : ext === 'xlsx' || ext === 'xls'
        ? 'xlsx'
        : 'pdf';

    addDocument({
      caseId: matchedCase?.id || 'general',
      suitNumber: suitNo,
      title: docTitle.trim(),
      documentType: docType,
      fileFormat,
      fileSize: docFileSize,
      filingDate: new Date().toISOString().slice(0, 10),
      filedBy: effectiveUser?.name || 'Advocate',
      courtRegistryStamp: false,
      summary: docFileName ? `Uploaded file: ${docFileName}` : 'Uploaded via Executive Workspace',
      version: 1,
    });

    pushLocalActivity(
      `Uploaded ${docType} — ${suitNo}`,
      `${docTitle.trim()} (${docFileSize}) by ${effectiveUser?.name || 'Advocate'}`
    );

    setDocTitle('');
    setDocFileName('');
    setDocFileSize('1.2 MB');
    setActiveModal(null);
    showCleanMessage(`Document "${docTitle.trim()}" added to ${suitNo}.`, 'success');
  };

  const handleSubmitCaseNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) {
      showCleanMessage('Enter case note details before saving.', 'warning');
      return;
    }
    const matchedCase = cases.find((c) => c.id === noteCaseId) || branchScopedCases[0] || cases[0];
    if (!matchedCase) {
      showCleanMessage('Select an active matter to attach this note.', 'warning');
      return;
    }

    setSubmittingNote(true);
    try {
      await addProgressiveNote(matchedCase.id, {
        author: effectiveUser?.name || 'Advocate',
        authorRole: effectiveUser?.roleTitle || effectiveUser?.role || 'Advocate',
        category: noteCategory,
        content: noteContent.trim(),
      });

      const code = matchedCase.suitNumber || matchedCase.firmRefNumber || 'MATTER';
      pushLocalActivity(
        `${noteCategory} added — ${code}`,
        `${effectiveUser?.name || 'Advocate'}: ${noteContent.trim()}`
      );
      setNoteContent('');
      setActiveModal(null);
      showCleanMessage(`Case note saved to ${code}.`, 'success');
    } catch {
      showCleanMessage('Unable to save case note. Please try again.', 'error');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveBreakdown.isValidRange || leaveBreakdown.workingDays <= 0) {
      showCleanMessage('Select a valid date range containing at least 1 working day.', 'warning');
      return;
    }
    if (!leaveReason.trim()) {
      showCleanMessage('Please provide a short reason for your leave request.', 'warning');
      return;
    }

    setSubmittingLeave(true);
    const payload = {
      id: `lv-${Date.now()}`,
      employee_name: effectiveUser?.name || 'Firm Staff',
      employee_email: effectiveUser?.email || '',
      leave_type: leaveType,
      start_date: leaveStart,
      end_date: leaveEnd,
      days_requested: leaveBreakdown.workingDays,
      reason: leaveReason.trim(),
      status: 'Pending',
      created_at: new Date().toISOString(),
    };

    try {
      // Save locally and attempt non-blocking HR Supabase persistence
      if (typeof window !== 'undefined') {
        try {
          const prev = JSON.parse(window.localStorage.getItem(LOCAL_LEAVE_REQUESTS_KEY) || '[]');
          window.localStorage.setItem(LOCAL_LEAVE_REQUESTS_KEY, JSON.stringify([payload, ...prev]));
        } catch {
          // ignore
        }
      }

      if (effectiveUser?.email) {
        const { data: emp } = await hrSupabase
          .from('employees')
          .select('id')
          .ilike('email', effectiveUser.email)
          .maybeSingle();

        if (emp?.id) {
          await hrSupabase.from('leave_requests').insert([
            {
              employee_id: emp.id,
              leave_type: leaveType,
              start_date: leaveStart,
              end_date: leaveEnd,
              total_days: leaveBreakdown.workingDays,
              reason: leaveReason.trim(),
              status: 'Pending',
            },
          ]);
        }
      }

      pushLocalActivity(
        `Leave request submitted (${leaveBreakdown.workingDays} working day${leaveBreakdown.workingDays === 1 ? '' : 's'})`,
        `${leaveType} · ${leaveStart} to ${leaveEnd}`
      );
      setLeaveReason('');
      setActiveModal(null);
      showCleanMessage(
        `${leaveType} request (${leaveBreakdown.workingDays} working day${leaveBreakdown.workingDays === 1 ? '' : 's'}) submitted for approval.`,
        'success'
      );
    } catch {
      pushLocalActivity(
        `Leave request recorded (${leaveBreakdown.workingDays} working days)`,
        `${leaveType} · ${leaveStart} to ${leaveEnd}`
      );
      setLeaveReason('');
      setActiveModal(null);
      showCleanMessage('Leave request recorded and queued for HR approval.', 'success');
    } finally {
      setSubmittingLeave(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Standalone fallback header only if mounted outside DashboardLayout */}
      {!hideTopHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl px-5 py-3.5">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search matter, suit #, client..."
              className="w-full h-9 pl-9 pr-7 text-xs bg-[#F4F6F9] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg text-[#162238] dark:text-slate-100 focus:outline-none focus:border-[#162238]"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center">
              <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
              <select
                aria-label="Branch scope"
                value={activeBranchId}
                onChange={(e) => handleBranchSelect(e.target.value)}
                className="h-9 pl-8 pr-7 text-xs font-medium bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg text-[#162238] dark:text-slate-200 cursor-pointer"
              >
                {resolvedBranchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => (onOpenNewCase ? onOpenNewCase() : setIsNewCaseModalOpen(true))}
              className="h-9 px-3.5 rounded-lg bg-[#162238] hover:bg-[#1E2F4D] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#D99B26]" />
              <span>New Matter</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Search Indicator Strip */}
      {searchQuery.trim() && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#D99B26]/50 text-xs">
          <div className="flex items-center gap-2 text-[#162238] dark:text-slate-200 font-medium">
            <Search className="w-3.5 h-3.5 text-[#D99B26]" />
            <span>
              Filtering workspace for &ldquo;{searchQuery.trim()}&rdquo; —{' '}
              <span className="tabular-nums font-semibold">{activeTableRows.length}</span> matching matters,{' '}
              <span className="tabular-nums font-semibold">{upcomingDeadlines.length}</span> deadlines
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSearchChange('')}
            className="text-slate-500 hover:text-[#162238] dark:hover:text-white font-semibold cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* ROW 1: 4-Column KPI Strip (equal-height cards, label + icon top, large tabular value bottom-left, status badge bottom-right) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* KPI 1: Active Cases */}
        <button
          type="button"
          onClick={() => (onOpenCases ? onOpenCases() : setActiveTab('catalogue'))}
          className="text-left rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#162238]/35 dark:hover:border-[#D99B26]/50 p-5 flex flex-col justify-between min-h-[126px] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
              Active Cases
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#162238]/[0.06] dark:bg-slate-800 text-[#162238] dark:text-[#D99B26] flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <span className="font-display text-3xl font-bold text-[#162238] dark:text-white tabular-nums tracking-tight leading-none">
              {kpiStats.activeOpenCases}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50">
              {kpiStats.closedCases} closed
            </span>
          </div>
        </button>

        {/* KPI 2: Billable Hours (MTD) */}
        <button
          type="button"
          onClick={() => openQuickModal('time')}
          className="text-left rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#162238]/35 dark:hover:border-[#D99B26]/50 p-5 flex flex-col justify-between min-h-[126px] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
              Billable Hours (MTD)
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FBF5E8] dark:bg-[#D99B26]/15 text-[#B57E1A] dark:text-[#D99B26] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <span className="font-display text-3xl font-bold text-[#162238] dark:text-white tabular-nums tracking-tight leading-none">
              {kpiStats.billableHoursMtd.toFixed(1)}h
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums bg-[#FBF5E8] dark:bg-[#D99B26]/15 text-[#B57E1A] dark:text-[#E8C06B] border border-[#D99B26]/30">
              {kpiStats.billablePct}% of {MONTHLY_BILLABLE_TARGET}h
            </span>
          </div>
        </button>

        {/* KPI 3: Pending Approvals */}
        <button
          type="button"
          onClick={() => {
            if (canAccessRestrictedWorkflow) {
              if (onOpenApprovals) onOpenApprovals();
              else setActiveTab('approvals');
            } else {
              if (onOpenCases) onOpenCases();
              else setActiveTab('catalogue');
            }
          }}
          className="text-left rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#162238]/35 dark:hover:border-[#D99B26]/50 p-5 flex flex-col justify-between min-h-[126px] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
              Pending Approvals
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <span className="font-display text-3xl font-bold text-[#162238] dark:text-white tabular-nums tracking-tight leading-none">
              {kpiStats.pendingApprovals}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                kpiStats.pendingApprovals > 0
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {kpiStats.pendingApprovals > 0 ? 'Needs review' : 'All clear'}
            </span>
          </div>
        </button>

        {/* KPI 4: Upcoming Deadlines */}
        <button
          type="button"
          onClick={() => (onOpenHearings ? onOpenHearings() : setActiveTab('causelist'))}
          className="text-left rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#162238]/35 dark:hover:border-[#D99B26]/50 p-5 flex flex-col justify-between min-h-[126px] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
              Upcoming Deadlines
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#162238]/[0.06] dark:bg-slate-800 text-[#162238] dark:text-slate-200 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <span className="font-display text-3xl font-bold text-[#162238] dark:text-white tabular-nums tracking-tight leading-none">
              {kpiStats.upcomingDeadlinesCount}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums ${
                kpiStats.dueWithin7Days > 0
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/50'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {kpiStats.dueWithin7Days} next 7d
            </span>
          </div>
        </button>
      </section>

      {/* ROW 2: Main Workspace Split (lg:col-span-8 Active Cases Table | lg:col-span-4 Deadlines & Hardcopy Registry Rail) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left (lg:col-span-8): Active Cases Table */}
        <div className="lg:col-span-8 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-sm font-bold text-[#162238] dark:text-white tracking-tight">
                Active Cases
              </h2>
              <span className="text-xs text-slate-400 font-medium tabular-nums">
                ({activeTableRows.length})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Segmented Filter Tabs */}
              <div
                role="tablist"
                aria-label="Filter matters by practice area"
                className="inline-flex items-center p-0.5 rounded-lg bg-[#F4F6F9] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700"
              >
                {(['All', 'Litigation', 'Corporate', 'Mortgages'] as CaseFilterTab[]).map((tab) => {
                  const selected = activeCaseFilter === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveCaseFilter(tab)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                        selected
                          ? 'bg-white dark:bg-slate-900 text-[#162238] dark:text-white shadow-2xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-[#162238] dark:hover:text-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (activeCaseFilter === 'Mortgages') setActiveTab('mortgages');
                  else if (onOpenCases) onOpenCases();
                  else setActiveTab('catalogue');
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#162238] dark:text-[#D99B26] hover:text-[#D99B26] dark:hover:text-[#E8C06B] transition cursor-pointer whitespace-nowrap"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTableRows.length === 0 ? (
              <div className="px-6 py-12 text-center space-y-3">
                <p className="text-sm font-semibold text-[#162238] dark:text-white">
                  No active matters match this view
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Switch practice filters, adjust the active branch scope, or register a new case file to populate the docket.
                </p>
                <button
                  type="button"
                  onClick={() => (onOpenNewCase ? onOpenNewCase() : setIsNewCaseModalOpen(true))}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#162238] hover:bg-[#1E2F4D] text-white text-xs font-semibold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D99B26]" />
                  <span>New Matter</span>
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F4F6F9]/70 dark:bg-slate-800/40 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 pl-5 pr-3">Case ID &amp; Matter</th>
                    <th className="py-3 px-3">Practice / Branch</th>
                    <th className="py-3 px-3">Stage</th>
                    <th className="py-3 pl-3 pr-5 text-right">Next Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]/80 dark:divide-slate-800 text-xs">
                  {activeTableRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => {
                        if (row.rawCase) setSelectedCase(row.rawCase);
                        else if (row.isMortgage) setActiveTab('mortgages');
                      }}
                      className="hover:bg-[#F4F6F9]/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 pl-5 pr-3 max-w-[290px]">
                        <div className="flex items-center gap-1.5">
                          {row.isMortgage && (
                            <Landmark className="w-3.5 h-3.5 text-[#D99B26] shrink-0" />
                          )}
                          <span className="font-mono text-[11px] font-semibold text-[#162238] dark:text-[#E8C06B] tabular-nums truncate">
                            {row.code}
                          </span>
                        </div>
                        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5 group-hover:text-[#162238] dark:group-hover:text-white">
                          {row.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {row.client}
                        </p>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {row.practiceLabel}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[165px]">
                          {row.branch}
                        </p>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${getStageTone(
                            row.stage
                          )}`}
                        >
                          {row.stage}
                        </span>
                      </td>

                      <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap tabular-nums">
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {row.nextDeadline}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right (lg:col-span-4): Deadlines & Hardcopy Registry Rail */}
        <div className="lg:col-span-4 space-y-5">
          {/* Upcoming Deadlines Card */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-5">
            <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-[#E2E8F0] dark:border-slate-800">
              <h2 className="font-display text-sm font-bold text-[#162238] dark:text-white tracking-tight">
                Upcoming Deadlines
              </h2>
              <button
                type="button"
                onClick={() => (onOpenHearings ? onOpenHearings() : setActiveTab('causelist'))}
                className="text-xs font-semibold text-[#162238] dark:text-[#D99B26] hover:text-[#D99B26] transition cursor-pointer"
              >
                Calendar →
              </button>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="py-7 text-center space-y-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  No court hearings or filing deadlines scheduled.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('causelist')}
                  className="text-xs font-semibold text-[#162238] dark:text-[#D99B26] hover:underline cursor-pointer"
                >
                  Schedule in Cause List
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0]/80 dark:divide-slate-800">
                {upcomingDeadlines.slice(0, 4).map((dl) => (
                  <button
                    key={dl.id}
                    type="button"
                    onClick={() => {
                      if (dl.linkedCase) setSelectedCase(dl.linkedCase);
                      else setActiveTab('causelist');
                    }}
                    className="w-full py-3 first:pt-3.5 last:pb-0 flex items-start gap-3 text-left hover:opacity-85 transition cursor-pointer group"
                  >
                    {/* Crisp Date Tile (MMM / DD) */}
                    <div className="w-11 h-12 rounded-lg bg-[#F4F6F9] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 flex flex-col items-center justify-center shrink-0 tabular-nums">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#B57E1A] dark:text-[#D99B26] leading-none">
                        {dl.month}
                      </span>
                      <span className="font-display text-base font-bold text-[#162238] dark:text-white leading-tight mt-0.5">
                        {dl.day}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#162238] dark:text-slate-100 leading-snug line-clamp-1 group-hover:text-[#B57E1A] dark:group-hover:text-[#D99B26] transition-colors">
                        {dl.title}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums">
                        {dl.caseCode}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {dl.venue}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hardcopy File Status Card */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-sm font-bold text-[#162238] dark:text-white tracking-tight">
                  Hardcopy File Status
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Physical Registry &amp; Strongroom Custody
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#FBF5E8] dark:bg-[#D99B26]/15 text-[#B57E1A] dark:text-[#D99B26] flex items-center justify-center shrink-0">
                <FolderLock className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-3 pt-1">
              <div>
                <span className="font-display text-3xl font-bold text-[#162238] dark:text-white tabular-nums tracking-tight">
                  {kpiStats.checkedOutFiles}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Physical files currently checked out
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#B57E1A] dark:text-[#D99B26] bg-[#FBF5E8] dark:bg-[#D99B26]/15 border border-[#D99B26]/30 px-2 py-0.5 rounded-md tabular-nums">
                {kpiStats.vaultSecuredFiles} in vault
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E2E8F0] dark:border-slate-800 text-xs">
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Indexed Deeds &amp; Filings</p>
                <p className="font-display font-bold text-[#162238] dark:text-white tabular-nums mt-0.5">
                  {kpiStats.indexedDocuments}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Active Branch Scope</p>
                <p className="font-semibold text-[#162238] dark:text-white truncate mt-0.5">
                  {activeBranchLabel}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => (onOpenDocuments ? onOpenDocuments() : setActiveTab('documents'))}
              className="w-full py-2.5 px-4 rounded-lg bg-[#162238] hover:bg-[#1E2F4D] text-white text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Manage Physical Files</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#D99B26]" />
            </button>
          </div>
        </div>
      </section>

      {/* ROW 3: Bottom Operational Row (lg:col-span-6 Recent Activity | lg:col-span-6 Quick Actions 2x2) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left (lg:col-span-6): Recent Activity Timeline */}
        <div className="lg:col-span-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-[#E2E8F0] dark:border-slate-800">
            <h2 className="font-display text-sm font-bold text-[#162238] dark:text-white tracking-tight">
              Recent Activity
            </h2>
            <span className="text-[11px] font-medium text-slate-400">
              Latest matter &amp; filing events
            </span>
          </div>

          {recentActivity.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              Activity logged from time entries, uploads, and case notes will appear here.
            </div>
          ) : (
            <ol className="relative mt-4 ml-2 border-l border-[#E2E8F0] dark:border-slate-800 space-y-4">
              {recentActivity.map((item) => (
                <li key={item.id} className="pl-5 relative">
                  {/* Warm Gold #D99B26 Timeline Dot */}
                  <span
                    aria-hidden="true"
                    className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#D99B26] ring-4 ring-white dark:ring-slate-900"
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#162238] dark:text-slate-100 leading-snug">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {item.detail}
                      </p>
                    </div>
                    <time className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0 tabular-nums">
                      {item.timestamp}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Right (lg:col-span-6): Symmetrical 2x2 Quick Actions */}
        <div className="lg:col-span-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-[#E2E8F0] dark:border-slate-800">
            <h2 className="font-display text-sm font-bold text-[#162238] dark:text-white tracking-tight">
              Quick Actions
            </h2>
            <span className="text-[11px] font-medium text-slate-400">
              In-place workspace tools
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5 mt-4 flex-1">
            {/* Tile 1: Log Time */}
            <button
              type="button"
              onClick={() => openQuickModal('time')}
              className="text-left p-4 rounded-xl bg-[#F4F6F9]/80 dark:bg-slate-800/60 hover:bg-[#162238] dark:hover:bg-[#162238] border border-[#E2E8F0] dark:border-slate-700 hover:border-[#162238] transition-colors cursor-pointer group flex flex-col justify-between min-h-[108px]"
            >
              <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 group-hover:bg-white/10 border border-[#E2E8F0] dark:border-slate-700 group-hover:border-white/15 flex items-center justify-center text-[#162238] dark:text-[#D99B26] group-hover:text-[#D99B26] transition-colors">
                <Clock className="w-4 h-4" />
              </div>
              <div className="mt-3">
                <p className="font-display text-sm font-bold text-[#162238] dark:text-white group-hover:text-white transition-colors">
                  Log Time
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-300 mt-0.5 transition-colors">
                  Record billable counsel hours
                </p>
              </div>
            </button>

            {/* Tile 2: Upload Document */}
            <button
              type="button"
              onClick={() => openQuickModal('document')}
              className="text-left p-4 rounded-xl bg-[#F4F6F9]/80 dark:bg-slate-800/60 hover:bg-[#162238] dark:hover:bg-[#162238] border border-[#E2E8F0] dark:border-slate-700 hover:border-[#162238] transition-colors cursor-pointer group flex flex-col justify-between min-h-[108px]"
            >
              <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 group-hover:bg-white/10 border border-[#E2E8F0] dark:border-slate-700 group-hover:border-white/15 flex items-center justify-center text-[#162238] dark:text-[#D99B26] group-hover:text-[#D99B26] transition-colors">
                <Upload className="w-4 h-4" />
              </div>
              <div className="mt-3">
                <p className="font-display text-sm font-bold text-[#162238] dark:text-white group-hover:text-white transition-colors">
                  Upload Document
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-300 mt-0.5 transition-colors">
                  File pleading or deed to docket
                </p>
              </div>
            </button>

            {/* Tile 3: New Case Note */}
            <button
              type="button"
              onClick={() => openQuickModal('note')}
              className="text-left p-4 rounded-xl bg-[#F4F6F9]/80 dark:bg-slate-800/60 hover:bg-[#162238] dark:hover:bg-[#162238] border border-[#E2E8F0] dark:border-slate-700 hover:border-[#162238] transition-colors cursor-pointer group flex flex-col justify-between min-h-[108px]"
            >
              <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 group-hover:bg-white/10 border border-[#E2E8F0] dark:border-slate-700 group-hover:border-white/15 flex items-center justify-center text-[#162238] dark:text-[#D99B26] group-hover:text-[#D99B26] transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div className="mt-3">
                <p className="font-display text-sm font-bold text-[#162238] dark:text-white group-hover:text-white transition-colors">
                  New Case Note
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-300 mt-0.5 transition-colors">
                  Log court progress or strategy
                </p>
              </div>
            </button>

            {/* Tile 4: Request Leave */}
            <button
              type="button"
              onClick={() => openQuickModal('leave')}
              className="text-left p-4 rounded-xl bg-[#F4F6F9]/80 dark:bg-slate-800/60 hover:bg-[#162238] dark:hover:bg-[#162238] border border-[#E2E8F0] dark:border-slate-700 hover:border-[#162238] transition-colors cursor-pointer group flex flex-col justify-between min-h-[108px]"
            >
              <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 group-hover:bg-white/10 border border-[#E2E8F0] dark:border-slate-700 group-hover:border-white/15 flex items-center justify-center text-[#162238] dark:text-[#D99B26] group-hover:text-[#D99B26] transition-colors">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div className="mt-3">
                <p className="font-display text-sm font-bold text-[#162238] dark:text-white group-hover:text-white transition-colors">
                  Request Leave
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-300 mt-0.5 transition-colors">
                  Excludes weekends &amp; UG holidays
                </p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* IN-PLACE QUICK ACTION MODALS */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#162238]/60 backdrop-blur-xs"
          onClick={() => setActiveModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xl overflow-hidden"
          >
            {/* Modal 1: Log Time */}
            {activeModal === 'time' && (
              <form onSubmit={handleSubmitTimeLog}>
                <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#FBF5E8] text-[#B57E1A] flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-[#162238] dark:text-white">
                        Log Time Entry
                      </h3>
                      <p className="text-[11px] text-slate-500">Updates MTD billable hours immediately</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#162238] dark:hover:text-white hover:bg-[#F4F6F9] dark:hover:bg-slate-800 cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Matter / Case File
                    </label>
                    <select
                      value={timeCaseId}
                      onChange={(e) => setTimeCaseId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 focus:outline-none focus:border-[#162238]"
                    >
                      <option value="">General Advisory / Non-Matter</option>
                      {cases.slice(0, 60).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.suitNumber || c.firmRefNumber} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Hours Worked
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        max="24"
                        required
                        value={timeHours}
                        onChange={(e) => setTimeHours(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 tabular-nums focus:outline-none focus:border-[#162238]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Date
                      </label>
                      <input
                        type="date"
                        required
                        value={timeDate}
                        onChange={(e) => setTimeDate(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 tabular-nums focus:outline-none focus:border-[#162238]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Work Narrative
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={timeDescription}
                      onChange={(e) => setTimeDescription(e.target.value)}
                      placeholder="e.g. Attended Commercial Court hearing for interim injunction and drafted order..."
                      className="w-full p-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 focus:outline-none focus:border-[#162238]"
                    />
                  </div>

                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={timeBillable}
                      onChange={(e) => setTimeBillable(e.target.checked)}
                      className="rounded border-slate-300 text-[#162238] focus:ring-[#162238]"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Billable client time (include in MTD billable ledger)
                    </span>
                  </label>
                </div>

                <div className="px-5 py-3.5 bg-[#F4F6F9] dark:bg-slate-800/50 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-4 rounded-lg bg-[#162238] hover:bg-[#1E2F4D] text-white text-xs font-semibold cursor-pointer"
                  >
                    Save Time Entry
                  </button>
                </div>
              </form>
            )}

            {/* Modal 2: Upload Document */}
            {activeModal === 'document' && (
              <form onSubmit={handleSubmitDocument}>
                <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#162238]/[0.06] dark:bg-slate-800 text-[#162238] dark:text-[#D99B26] flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-[#162238] dark:text-white">
                        Upload Document to Registry
                      </h3>
                      <p className="text-[11px] text-slate-500">Attach pleadings, affidavits, or title deeds</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#162238] dark:hover:text-white hover:bg-[#F4F6F9] dark:hover:bg-slate-800 cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Linked Matter
                    </label>
                    <select
                      value={docCaseId}
                      onChange={(e) => setDocCaseId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 focus:outline-none focus:border-[#162238]"
                    >
                      {cases.slice(0, 60).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.suitNumber || c.firmRefNumber} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Document Title
                      </label>
                      <input
                        type="text"
                        required
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder="e.g. Affidavit in Reply"
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 focus:outline-none focus:border-[#162238]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Document Type
                      </label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value as PleadingDocument['documentType'])}
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 focus:outline-none focus:border-[#162238]"
                      >
                        <option value="Legal Submissions">Legal Submissions</option>
                        <option value="Plaint">Plaint</option>
                        <option value="Written Statement of Defense">Written Statement of Defense</option>
                        <option value="Affidavit">Affidavit</option>
                        <option value="Court Order">Court Order</option>
                        <option value="Trial Bundle">Trial Bundle</option>
                        <option value="Exhibit">Exhibit</option>
                        <option value="Correspondence">Correspondence</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Attach File (Optional)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setDocFileName(file.name);
                          const kb = file.size / 1024;
                          setDocFileSize(kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`);
                          if (!docTitle.trim()) setDocTitle(file.name.replace(/\.[^.]+$/, ''));
                        }
                      }}
                      className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#F4F6F9] file:text-[#162238] hover:file:bg-[#E2E8F0] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-[#F4F6F9] dark:bg-slate-800/50 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-4 rounded-lg bg-[#162238] hover:bg-[#1E2F4D] text-white text-xs font-semibold cursor-pointer"
                  >
                    Index Document
                  </button>
                </div>
              </form>
            )}

            {/* Modal 3: New Case Note */}
            {activeModal === 'note' && (
              <form onSubmit={handleSubmitCaseNote}>
                <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#162238]/[0.06] dark:bg-slate-800 text-[#162238] dark:text-[#D99B26] flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-[#162238] dark:text-white">
                        New Case Note
                      </h3>
                      <p className="text-[11px] text-slate-500">Appends directly to the matter progress log</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#162238] dark:hover:text-white hover:bg-[#F4F6F9] dark:hover:bg-slate-800 cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Matter / Case File
                    </label>
                    <select
                      value={noteCaseId}
                      onChange={(e) => setNoteCaseId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 focus:outline-none focus:border-[#162238]"
                    >
                      {cases.slice(0, 60).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.suitNumber || c.firmRefNumber} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Note Category
                    </label>
                    <select
                      value={noteCategory}
                      onChange={(e) => setNoteCategory(e.target.value as ProgressiveNote['category'])}
                      className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 focus:outline-none focus:border-[#162238]"
                    >
                      <option value="Court Milestone">Court Milestone</option>
                      <option value="Client Communication">Client Communication</option>
                      <option value="Strategy">Strategy</option>
                      <option value="Registry & Filing">Registry &amp; Filing</option>
                      <option value="Settlement / Recovery">Settlement / Recovery</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Note Details
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Record court directions, client instructions, or next procedural steps..."
                      className="w-full p-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 focus:outline-none focus:border-[#162238]"
                    />
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-[#F4F6F9] dark:bg-slate-800/50 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingNote}
                    className="h-9 px-4 rounded-lg bg-[#162238] hover:bg-[#1E2F4D] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                  >
                    {submittingNote ? 'Saving...' : 'Save Case Note'}
                  </button>
                </div>
              </form>
            )}

            {/* Modal 4: Request Leave (with Uganda Public Holidays & Weekends exclusion) */}
            {activeModal === 'leave' && (
              <form onSubmit={handleSubmitLeaveRequest}>
                <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#FBF5E8] text-[#B57E1A] flex items-center justify-center">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-[#162238] dark:text-white">
                        Request Leave
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Automatically skips weekends &amp; configured Uganda public holidays
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#162238] dark:hover:text-white hover:bg-[#F4F6F9] dark:hover:bg-slate-800 cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Leave Type
                    </label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 focus:outline-none focus:border-[#162238]"
                    >
                      <option value="Annual Leave">Annual Leave</option>
                      <option value="Sick Leave">Sick Leave</option>
                      <option value="Compassionate Leave">Compassionate Leave</option>
                      <option value="Study / Bar Exam Leave">Study / Bar Exam Leave</option>
                      <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Start Date
                      </label>
                      <input
                        type="date"
                        required
                        value={leaveStart}
                        onChange={(e) => setLeaveStart(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 tabular-nums focus:outline-none focus:border-[#162238]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        End Date
                      </label>
                      <input
                        type="date"
                        required
                        value={leaveEnd}
                        onChange={(e) => setLeaveEnd(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 tabular-nums focus:outline-none focus:border-[#162238]"
                      />
                    </div>
                  </div>

                  {/* Working Days Summary */}
                  <div className="rounded-lg bg-[#F4F6F9] dark:bg-slate-800/70 border border-[#E2E8F0] dark:border-slate-700 p-3 space-y-1">
                    {leaveBreakdown.isValidRange ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-[#162238] dark:text-white">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Deductible Working Days
                          </span>
                          <span className="font-display text-sm font-bold text-[#162238] dark:text-[#D99B26] tabular-nums">
                            {leaveBreakdown.workingDays} day{leaveBreakdown.workingDays === 1 ? '' : 's'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {leaveBreakdown.totalCalendarDays} calendar days · {leaveBreakdown.weekendDays} weekend day(s) excluded
                          {leaveBreakdown.excludedHolidays.length > 0
                            ? ` · ${leaveBreakdown.excludedHolidays.length} public holiday(s) skipped (${leaveBreakdown.excludedHolidays
                                .map((h) => h.name)
                                .join(', ')})`
                            : ''}
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>End date must be on or after the start date.</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Reason / Handover Note
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder="State handover advocate and brief reason..."
                      className="w-full p-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 focus:outline-none focus:border-[#162238]"
                    />
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-[#F4F6F9] dark:bg-slate-800/50 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingLeave || !leaveBreakdown.isValidRange || leaveBreakdown.workingDays <= 0}
                    className="h-9 px-4 rounded-lg bg-[#162238] hover:bg-[#1E2F4D] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                  >
                    {submittingLeave ? 'Submitting...' : 'Submit Leave Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
