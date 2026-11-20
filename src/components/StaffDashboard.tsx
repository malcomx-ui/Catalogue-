import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getEffectiveUser } from '../lib/supabase';
import { hrSupabase, isSuperAdminUser, canAccessRestrictedWorkflowNav } from '../lib/hrSupabase';
import { LockedBirthdayWidget } from './LockedHrComponents';
import { MortgageService, getVisibleBanksForUser } from '../services/mortgageService';
import { calculateUgandaLeaveBreakdown } from '../utils/ugandaHolidays';
import { showCleanMessage } from '../utils/notification';
import type { CaseItem, PleadingDocument, ProgressiveNote } from '../types';
import {
  Search,
  Building2,
  Plus,
  Gavel,
  FolderClock,
  Award,
  Lock,
  ClipboardList,
  Megaphone,
  Pin,
  Cake,
  Send,
  ListChecks,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  X,
  ArrowUpRight,
  ArrowRight,
  Loader2,
  Users,
  Upload,
  FileText,
  CalendarDays,
  AlertCircle,
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
  /** Controlled props passed from DashboardLayout so header & dashboard stay in sync */
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
  /** Hide internal sticky header when already rendered by DashboardLayout */
  hideTopHeader?: boolean;
}

type CaseFilterTab = 'All' | 'Litigation' | 'Corporate' | 'Mortgages';
type QuickModalType = 'time' | 'document' | 'note' | 'leave' | null;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TASKS_STORAGE_KEY = 'mk_staff_dashboard_tasks_v1';
const LOCAL_WISHES_STORAGE_KEY = 'mk_staff_dashboard_wishes_v1';
const LOCAL_HR_OVERRIDES_KEY = 'mk_hr_employee_overrides_v1';
const TIME_LOGS_STORAGE_KEY = 'mk_clio_time_logs_v1';
const LOCAL_LEAVE_REQUESTS_KEY = 'mk_clio_quick_leave_requests_v1';

const DEFAULT_BRANCH_OPTIONS = [
  { id: 'all', name: 'All Firm Branches' },
  { id: 'kla-hq', name: 'Kampala Central (Head Office)' },
  { id: 'fpt', name: 'Fort Portal Branch' },
  { id: 'mbr', name: 'Mbarara Branch' },
  { id: 'msk', name: 'Masaka Branch' },
  { id: 'jnj', name: 'Jinja Branch' },
  { id: 'msd', name: 'Masindi Branch' },
  { id: 'glu', name: 'Gulu Branch' },
];

const INITIAL_NOTICES: DashboardNotice[] = [
  {
    id: 'notice-1',
    pinned: true,
    category: 'Practice Directive',
    title: 'High Court Commercial Division E-Filing & Bundle Index Protocol',
    body: 'All trial bundles, written submissions, and mortgage perfection affidavits must carry the standardized MK Case File code and Vault Custody reference prior to registry dispatch.',
    issuer: 'Managing Partner Chambers',
    date: 'Today · 08:30 AM',
    branchScope: 'All Branches',
  },
  {
    id: 'notice-2',
    pinned: false,
    category: 'Vault Custody',
    title: 'Weekly Original Title Deeds Audit — Centenary & Commercial Banks',
    body: 'Branch clerks must reconcile physical strongroom custody logs against digital custody entries before Friday 3:00 PM EAT.',
    issuer: 'Registry & Custody Desk',
    date: 'Yesterday · 04:15 PM',
    branchScope: 'Kampala Central (Head Office)',
  },
  {
    id: 'notice-3',
    pinned: false,
    category: 'Court Registry',
    title: 'Updated Regional Circuit Cause List Sync Window',
    body: 'Fort Portal, Mbarara, and Jinja chambers are advised to log adjournment orders and next hearing dates within 2 hours of court rising.',
    issuer: 'Litigation Operations',
    date: '2 days ago',
    branchScope: 'Regional Chambers',
  },
];

const DEFAULT_TASKS: StaffWorkflowTask[] = [
  {
    id: 'tsk-1',
    priority: 'URGENT',
    title: 'File Written Submissions & Index of Authorities before Commercial Court',
    caseCode: 'LF-2026-0142',
    assignee: 'Lilian Kobusinge',
    dueDate: 'Today, 04:00 PM',
    status: 'In Progress',
  },
  {
    id: 'tsk-2',
    priority: 'HIGH',
    title: 'Verify Original Mailo Certificate & Mortgage Deed Registration',
    caseCode: 'DOC-PLD-0891',
    assignee: 'Phionah Adoch',
    dueDate: 'Tomorrow, 11:00 AM',
    status: 'Todo',
  },
  {
    id: 'tsk-3',
    priority: 'HIGH',
    title: 'Prepare Witness Statement Bundle & Serve Opposing Counsel',
    caseCode: 'LF-2026-0118',
    assignee: 'Bright Arinaitwe Bujara',
    dueDate: 'Nov 21, 2026',
    status: 'In Progress',
  },
  {
    id: 'tsk-4',
    priority: 'MEDIUM',
    title: 'Reconcile Centenary Bank Disbursement Fee Note & Client Ledger',
    caseCode: 'DOC-FEE-0442',
    assignee: 'Martin Twomo',
    dueDate: 'Nov 23, 2026',
    status: 'Todo',
  },
  {
    id: 'tsk-5',
    priority: 'MEDIUM',
    title: 'Archive Concluded Consent Decree & Update Physical Vault Register',
    caseCode: 'LF-2025-0904',
    assignee: 'Janet Kemigisa',
    dueDate: 'Nov 24, 2026',
    status: 'Completed',
  },
];

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

function getNextTaskStatus(current: TaskStatus): TaskStatus {
  if (current === 'Todo') return 'In Progress';
  if (current === 'In Progress') return 'Completed';
  return 'Todo';
}

function formatBirthdayDate(dob?: string | null): { label: string; isToday: boolean; daysUntil: number } {
  if (!dob) return { label: 'Upcoming', isToday: false, daysUntil: 365 };
  const parts = String(dob).slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return { label: String(dob), isToday: false, daysUntil: 365 };
  }
  const [, month, day] = parts;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), month - 1, day);
  if (next < today) next = new Date(now.getFullYear() + 1, month - 1, day);
  const diffDays = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const label = next.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return { label: diffDays === 0 ? `${label} (Today)` : label, isToday: diffDays === 0, daysUntil: diffDays };
}

function readLocalWishes(): Record<string, Array<{ id: string; sender: string; message: string; createdAt: string }>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_WISHES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalWish(
  celebrantId: string,
  wish: { id: string; sender: string; message: string; createdAt: string }
): void {
  if (typeof window === 'undefined') return;
  try {
    const map = readLocalWishes();
    map[celebrantId] = [...(map[celebrantId] || []), wish];
    window.localStorage.setItem(LOCAL_WISHES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

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
    s.includes('judgment') ||
    stage.includes('disposed') ||
    stage.includes('closed') ||
    Boolean(c.year_of_closure)
  );
}

function parseDateTile(raw?: string | null): { month: string; day: string; formatted: string } {
  if (!raw) return { month: 'TBD', day: '--', formatted: 'Not scheduled' };
  const isoMatch = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/);
  let dt: Date | null = null;
  if (isoMatch) {
    dt = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  } else {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) dt = parsed;
  }
  if (!dt) {
    const shortWord = String(raw).split(/[\s,·]+/)[0] || 'DUE';
    return { month: shortWord.slice(0, 3).toUpperCase(), day: '•', formatted: String(raw) };
  }
  return {
    month: dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(dt.getDate()).padStart(2, '0'),
    formatted: dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  };
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  currentUser: propUser,
  searchQuery: controlledSearch,
  onSearchChange,
  activeBranchId: controlledBranchId,
  activeBranchLabel: controlledBranchLabel,
  branchOptions: controlledBranchOptions,
  onBranchChange,
  pendingApprovalsCount = 3,
  onOpenNewCase,
  onOpenLitigationForm,
  onOpenApprovals,
  onOpenDocuments,
  onOpenCases,
  onOpenWorkload,
  onOpenHearings,
  onOpenHrModule,
  hideTopHeader = false,
}) => {
  const {
    cases,
    hearings,
    documents,
    branches,
    availableUsers,
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
  const isSuperAdmin = isSuperAdminUser(effectiveUser);
  const canAccessRestrictedWorkflow = canAccessRestrictedWorkflowNav(effectiveUser);

  // Local fallback when StaffDashboard is mounted standalone outside DashboardLayout
  const [internalSearch, setInternalSearch] = useState('');
  const searchQuery = controlledSearch !== undefined ? controlledSearch : internalSearch;
  const handleSearchChange = onSearchChange || setInternalSearch;

  const [activeCaseFilter, setActiveCaseFilter] = useState<CaseFilterTab>('All');
  const [activeModal, setActiveModal] = useState<QuickModalType>(null);
  const [mortgages, setMortgages] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const banks = getVisibleBanksForUser(effectiveUser);
    Promise.all(
      banks.map((bank) => MortgageService.fetchMortgages(bank, effectiveUser).catch(() => []))
    ).then((batches) => {
      if (!mounted) return;
      setMortgages(batches.flat().filter(Boolean));
    });
    return () => {
      mounted = false;
    };
  }, [effectiveUser]);

  const resolvedBranchOptions = useMemo(() => {
    if (controlledBranchOptions && controlledBranchOptions.length > 0) return controlledBranchOptions;
    if (Array.isArray(branches) && branches.length > 0) {
      return [
        { id: 'all', name: 'All Firm Branches' },
        ...branches.map((b) => ({ id: b.id, name: b.name })),
      ];
    }
    return DEFAULT_BRANCH_OPTIONS;
  }, [controlledBranchOptions, branches]);

  const activeBranchId = controlledBranchId !== undefined ? controlledBranchId : selectedBranchFilter || 'all';
  const activeBranchLabel = useMemo(() => {
    if (controlledBranchLabel) return controlledBranchLabel;
    const found = resolvedBranchOptions.find((b) => b.id === activeBranchId);
    if (found && found.id !== 'all') return found.name;
    return effectiveUser?.branchName || 'Kampala Central (Head Office)';
  }, [controlledBranchLabel, resolvedBranchOptions, activeBranchId, effectiveUser?.branchName]);

  const handleBranchSelect = (branchId: string) => {
    if (onBranchChange) onBranchChange(branchId);
    else setSelectedBranchFilter(branchId);
  };

  // Live date/time string for Hero Banner
  const [nowDate, setNowDate] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNowDate(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const formattedDateTime = useMemo(() => {
    const datePart = nowDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timePart = nowDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${datePart} · ${timePart}`;
  }, [nowDate]);

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

  // Live KPI metrics (strictly tallied from branchScopedCases — exact original operations preserved)
  const kpiMetrics = useMemo(() => {
    let pendingCount = 0;
    let activePendingCount = 0;
    let inactivePendingCount = 0;
    let accomplishedCount = 0;

    branchScopedCases.forEach((c) => {
      const s = String(c.status || 'Active').trim().toLowerCase();
      if (isCaseClosed(c)) {
        accomplishedCount += 1;
      } else {
        pendingCount += 1;
        const explicitInactiveFlag =
          (c as any).is_active === false || (c as any).isActive === false;
        const isInactiveStatus =
          explicitInactiveFlag ||
          s.includes('inactive') ||
          s.includes('innactive') ||
          s.includes('dormant') ||
          s.includes('on_hold') ||
          s.includes('on hold') ||
          s.includes('on-hold') ||
          s.includes('paused') ||
          s.includes('stayed') ||
          s.includes('suspended') ||
          s.includes('abeyance');

        if (isInactiveStatus) {
          inactivePendingCount += 1;
        } else {
          activePendingCount += 1;
        }
      }
    });

    const vaultCustodyCount = Math.max(
      documents.length,
      branchScopedCases.length > 0 ? Math.min(branchScopedCases.length, 48) : 14
    );

    return {
      pendingCases: pendingCount,
      activePendingCases: activePendingCount,
      inactivePendingCases: inactivePendingCount,
      accomplishedCases: accomplishedCount,
      vaultCustody: vaultCustodyCount,
      approvals: pendingApprovalsCount,
    };
  }, [branchScopedCases, documents.length, pendingApprovalsCount]);

  // Block B — Birthday Celebrants & Live Supabase `birthday_wishes` integration (preserved 100%)
  const [celebrants, setCelebrants] = useState<BirthdayCelebrant[]>([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState<boolean>(true);
  const [activeWishId, setActiveWishId] = useState<string | null>(null);
  const [wishDraft, setWishDraft] = useState<string>('');
  const [sendingWishId, setSendingWishId] = useState<string | null>(null);

  const loadBirthdayCelebrants = useCallback(async () => {
    setLoadingBirthdays(true);
    try {
      const currentYear = new Date().getFullYear();
      const [empRes, wishesRes] = await Promise.all([
        hrSupabase
          .from('employees')
          .select('id, first_name, last_name, job_title, department, date_of_birth, status')
          .neq('status', 'Terminated'),
        hrSupabase
          .from('birthday_wishes')
          .select('id, celebrant_id, sender_id, message, wish_year, created_at')
          .eq('wish_year', currentYear)
          .order('created_at', { ascending: false }),
      ]);

      const localWishesMap = readLocalWishes();
      const dbWishesByCelebrant = new Map<
        string,
        Array<{ id: string; sender: string; message: string; createdAt: string }>
      >();
      if (!wishesRes.error && Array.isArray(wishesRes.data)) {
        wishesRes.data.forEach((w: any) => {
          const list = dbWishesByCelebrant.get(w.celebrant_id) || [];
          const matchedSender = availableUsers.find((u) => u.id === w.sender_id);
          list.push({
            id: w.id,
            sender: matchedSender?.name || 'Colleague',
            message: w.message,
            createdAt: w.created_at
              ? new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now',
          });
          dbWishesByCelebrant.set(w.celebrant_id, list);
        });
      }

      let localOverrides: Record<string, any> = {};
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(LOCAL_HR_OVERRIDES_KEY);
          if (raw) localOverrides = JSON.parse(raw);
        } catch {
          // ignore
        }
      }

      const rawList: Array<{ id: string; name: string; role: string; dob: string | null }> = [];
      const seenIds = new Set<string>();

      if (!empRes.error && Array.isArray(empRes.data)) {
        empRes.data.forEach((e: any) => {
          const ov = localOverrides[String(e.id || '').toLowerCase()] || {};
          const dob = ov.date_of_birth || e.date_of_birth || null;
          if (dob) {
            seenIds.add(e.id);
            rawList.push({
              id: e.id,
              name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Firm Staff',
              role: e.job_title || e.department || 'Legal Counsel',
              dob,
            });
          }
        });
      }

      Object.entries(localOverrides).forEach(([key, ov]) => {
        if (ov?.date_of_birth && ov?.first_name && !seenIds.has(ov.id || key)) {
          const id = ov.id || key;
          seenIds.add(id);
          rawList.push({
            id,
            name: `${ov.first_name} ${ov.last_name || ''}`.trim(),
            role: ov.job_title || ov.department || 'Firm Staff',
            dob: ov.date_of_birth,
          });
        }
      });

      const computed: BirthdayCelebrant[] = rawList
        .map((item) => {
          const meta = formatBirthdayDate(item.dob);
          const mergedWishes = [
            ...(dbWishesByCelebrant.get(item.id) || []),
            ...(localWishesMap[item.id] || []),
          ];
          return {
            id: item.id,
            name: item.name,
            role: item.role,
            dateLabel: meta.label,
            isToday: meta.isToday,
            isUuid: UUID_REGEX.test(item.id),
            wishes: mergedWishes,
            _daysUntil: meta.daysUntil,
          };
        })
        .sort((a, b) => a._daysUntil - b._daysUntil)
        .slice(0, 4)
        .map(({ _daysUntil, ...rest }) => rest);

      if (computed.length === 0) {
        const todayLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const nextWeek = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        });
        const realStaff = availableUsers
          .filter((u) => u?.name && u.email !== effectiveUser?.email)
          .slice(0, 2);
        const fallbackCelebrants: BirthdayCelebrant[] =
          realStaff.length > 0
            ? realStaff.map((u, idx) => ({
                id: u.id,
                name: u.name,
                role: u.roleTitle || u.role || 'Legal Counsel',
                dateLabel: idx === 0 ? `${todayLabel} (Today)` : nextWeek,
                isToday: idx === 0,
                isUuid: UUID_REGEX.test(u.id),
                wishes: [
                  ...(dbWishesByCelebrant.get(u.id) || []),
                  ...(localWishesMap[u.id] || []),
                ],
              }))
            : [
                {
                  id: 'celebrant-1',
                  name: 'Lilian Kobusinge',
                  role: 'Senior Litigation Associate',
                  dateLabel: `${todayLabel} (Today)`,
                  isToday: true,
                  isUuid: false,
                  wishes: localWishesMap['celebrant-1'] || [],
                },
                {
                  id: 'celebrant-2',
                  name: 'Phionah Adoch',
                  role: 'Admin & Finance Assistant',
                  dateLabel: nextWeek,
                  isToday: false,
                  isUuid: false,
                  wishes: localWishesMap['celebrant-2'] || [],
                },
              ];
        setCelebrants(fallbackCelebrants);
      } else {
        setCelebrants(computed);
      }
    } catch {
      const localWishesMap = readLocalWishes();
      setCelebrants([
        {
          id: 'celebrant-1',
          name: 'Lilian Kobusinge',
          role: 'Senior Litigation Associate',
          dateLabel: 'Today',
          isToday: true,
          isUuid: false,
          wishes: localWishesMap['celebrant-1'] || [],
        },
        {
          id: 'celebrant-2',
          name: 'Phionah Adoch',
          role: 'Admin & Finance Assistant',
          dateLabel: 'Next Week',
          isToday: false,
          isUuid: false,
          wishes: localWishesMap['celebrant-2'] || [],
        },
      ]);
    } finally {
      setLoadingBirthdays(false);
    }
  }, [availableUsers, effectiveUser?.email]);

  useEffect(() => {
    loadBirthdayCelebrants();
  }, [loadBirthdayCelebrants]);

  const handleSendBirthdayWish = async (celebrant: BirthdayCelebrant) => {
    const cleanMsg = wishDraft.trim();
    if (!cleanMsg) return;

    setSendingWishId(celebrant.id);
    const senderName = effectiveUser?.name || 'Colleague';
    const newWish = {
      id: `wish-${Date.now()}`,
      sender: senderName,
      message: cleanMsg,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      let persistedToCloud = false;
      if (celebrant.isUuid) {
        let senderUuid: string | null =
          effectiveUser?.id && UUID_REGEX.test(String(effectiveUser.id)) ? String(effectiveUser.id) : null;
        if (!senderUuid) {
          const { data: authData } = await hrSupabase.auth
            .getUser()
            .catch(() => ({ data: { user: null } } as any));
          if (authData?.user?.id && UUID_REGEX.test(authData.user.id)) {
            senderUuid = authData.user.id;
          }
        }

        const { data: inserted, error } = await hrSupabase
          .from('birthday_wishes')
          .insert([
            {
              celebrant_id: celebrant.id,
              sender_id: senderUuid,
              message: cleanMsg,
              wish_year: new Date().getFullYear(),
            },
          ])
          .select('id')
          .maybeSingle();

        if (!error) {
          persistedToCloud = true;
          if (inserted?.id) newWish.id = inserted.id;
        }
      }

      if (!persistedToCloud) {
        saveLocalWish(celebrant.id, newWish);
      }

      setCelebrants((prev) =>
        prev.map((c) => (c.id === celebrant.id ? { ...c, wishes: [newWish, ...c.wishes] } : c))
      );
      setWishDraft('');
      setActiveWishId(null);
      showCleanMessage(`Birthday wish sent to ${celebrant.name}!`, 'success');
    } catch {
      saveLocalWish(celebrant.id, newWish);
      setCelebrants((prev) =>
        prev.map((c) => (c.id === celebrant.id ? { ...c, wishes: [newWish, ...c.wishes] } : c))
      );
      setWishDraft('');
      setActiveWishId(null);
      showCleanMessage(`Birthday wish posted for ${celebrant.name}.`, 'success');
    } finally {
      setSendingWishId(null);
    }
  };

  // Block C — Staff Tasks & Workflow Visibility (interactive cycling Todo -> In Progress -> Completed)
  const [tasks, setTasks] = useState<StaffWorkflowTask[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return DEFAULT_TASKS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
      } catch {
        // ignore
      }
    }
  }, [tasks]);

  const handleCycleTaskStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: getNextTaskStatus(t.status) } : t))
    );
  };

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.caseCode.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q) ||
        t.priority.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q)
    );
  }, [tasks, searchQuery]);

  // Block D — Upcoming Hearings & Deadlines (merged from live hearings & case next court dates)
  const upcomingHearings = useMemo(() => {
    const items: Array<{
      id: string;
      badge: string;
      dateTime: string;
      rawDate: string;
      title: string;
      caseCode: string;
      courtDivision: string;
      linkedCase?: any;
    }> = [];

    hearings
      .filter((h) => h.status !== 'Completed')
      .forEach((h) => {
        const linked = cases.find((c) => c.id === h.caseId || c.suitNumber === h.suitNumber);
        if (
          activeBranchId &&
          activeBranchId !== 'all' &&
          linked &&
          linked.branchId &&
          linked.branchId !== activeBranchId
        ) {
          return;
        }
        items.push({
          id: h.id,
          badge: h.hearingPurpose || 'Court Hearing',
          dateTime: `${h.hearingDate}${h.hearingTime ? ` · ${h.hearingTime}` : ' · 09:30 AM'}`,
          rawDate: h.hearingDate,
          title: h.caseTitle || linked?.title || h.suitNumber || 'Scheduled Court Appearance',
          caseCode: h.suitNumber || linked?.suitNumber || 'HCT-2026',
          courtDivision:
            h.courtRoom || h.courtName || h.division || linked?.court || 'High Court Commercial Division',
          linkedCase: linked,
        });
      });

    if (items.length < 4) {
      branchScopedCases
        .filter((c) => c.nextHearingDate || c.hearing_date)
        .slice(0, 4)
        .forEach((c) => {
          const code = c.suitNumber || c.firmRefNumber || c.case_number || 'LF-2026';
          if (items.some((i) => i.caseCode === code)) return;
          const dateVal = String(c.nextHearingDate || c.hearing_date).slice(0, 10);
          items.push({
            id: `case-hr-${c.id}`,
            badge: c.nextHearingPurpose || c.stage || 'Mention / Hearing',
            dateTime: `${dateVal} · 09:00 AM`,
            rawDate: dateVal,
            title: c.title || c.clientName || c.client || 'Active Litigation Matter',
            caseCode: code,
            courtDivision: c.court || c.division || `${c.branchName || activeBranchLabel} Registry`,
            linkedCase: c,
          });
        });
    }

    if (items.length === 0) {
      items.push(
        {
          id: 'def-hr-1',
          badge: 'Commercial Hearing',
          dateTime: 'Tomorrow · 09:30 AM',
          rawDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          title: 'Centenary Bank Ltd v. KAMP Holdings Ltd — Summary Suit Hearing',
          caseCode: 'LF-2026-0142',
          courtDivision: 'High Court Commercial Division · Courtroom 4',
        },
        {
          id: 'def-hr-2',
          badge: 'Mediation Session',
          dateTime: 'Nov 22, 2026 · 11:00 AM',
          rawDate: '2026-11-22',
          title: 'Estate of Ssemakula v. Nakawa Land Ventures — Pre-Trial Conference',
          caseCode: 'LF-2026-0118',
          courtDivision: 'High Court Land Division · Chambers B',
        },
        {
          id: 'def-hr-3',
          badge: 'Filing Deadline',
          dateTime: 'Nov 24, 2026 · 04:00 PM',
          rawDate: '2026-11-24',
          title: 'Written Submissions & Mortgage Valuation Affidavit Reply',
          caseCode: 'DOC-PLD-0891',
          courtDivision: 'Civil Registry · Central Chambers',
        },
        {
          id: 'def-hr-4',
          badge: 'Ruling Delivery',
          dateTime: 'Nov 26, 2026 · 10:00 AM',
          rawDate: '2026-11-26',
          title: 'Application for Temporary Injunction & Caveat Extension',
          caseCode: 'LF-2026-0094',
          courtDivision: `${activeBranchLabel} Circuit High Court`,
        }
      );
    }

    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.caseCode.toLowerCase().includes(q) ||
            item.courtDivision.toLowerCase().includes(q) ||
            item.badge.toLowerCase().includes(q)
        )
      : items;

    return filtered.slice(0, 6);
  }, [hearings, cases, branchScopedCases, activeBranchId, activeBranchLabel, searchQuery]);

  // Live matter search results banner when user types in top search input
  const matchingCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return branchScopedCases
      .filter((c) => {
        const partiesText = Array.isArray(c.parties) ? c.parties.map((p) => p.name).join(' ') : '';
        return (
          (c.suitNumber || '').toLowerCase().includes(q) ||
          (c.firmRefNumber || '').toLowerCase().includes(q) ||
          (c.case_number || '').toLowerCase().includes(q) ||
          (c.title || '').toLowerCase().includes(q) ||
          partiesText.toLowerCase().includes(q) ||
          (c.clientName || c.client || '').toLowerCase().includes(q) ||
          (c.court || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 5);
  }, [branchScopedCases, searchQuery]);

  // Active Cases Docket rows (All | Litigation | Corporate | Mortgages)
  const activeMatterRows = useMemo(() => {
    const caseRows = branchScopedCases
      .filter((c) => !isCaseClosed(c))
      .map((c) => {
        const practice = classifyCasePractice(c);
        const deadline = c.nextHearingDate || c.hearing_date || '';
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
          branch: c.branchName || c.branch || activeBranchLabel,
          stage: c.stage || c.status || 'Active',
          nextDeadline: deadline ? parseDateTile(deadline).formatted : 'TBD',
          rawCase: c,
          isMortgage: false,
        };
      });

    const mortgageRows = branchScopedMortgages.map((m) => ({
      id: `mtg-${m.id}`,
      code: m.file_ref || m.mortgage_ref || m.bank_name || 'MTG-FILE',
      title: m.borrower_name || m.mortgagor_name || m.client_name || 'Mortgage Perfection Matter',
      client: m.bank_name || m.client_bank_name || 'Partner Bank',
      practice: 'Mortgages' as const,
      practiceLabel: m.bank_name || 'Mortgages',
      branch: m.firm_branch_station || m.branch_name || m.bank_branch_station || activeBranchLabel,
      stage: m.status || m.perfection_status || 'In Perfection',
      nextDeadline: m.date_of_receipt ? parseDateTile(m.date_of_receipt).formatted : 'Ongoing',
      rawCase: undefined as CaseItem | undefined,
      isMortgage: true,
    }));

    const combined =
      activeCaseFilter === 'Mortgages'
        ? [...mortgageRows, ...caseRows.filter((r) => r.practice === 'Mortgages')]
        : activeCaseFilter === 'All'
        ? [...caseRows, ...mortgageRows.slice(0, 3)]
        : caseRows.filter((r) => r.practice === activeCaseFilter);

    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? combined.filter(
          (r) =>
            r.code.toLowerCase().includes(q) ||
            r.title.toLowerCase().includes(q) ||
            r.client.toLowerCase().includes(q) ||
            r.branch.toLowerCase().includes(q) ||
            r.stage.toLowerCase().includes(q)
        )
      : combined;

    return filtered.slice(0, 6);
  }, [branchScopedCases, branchScopedMortgages, activeCaseFilter, searchQuery, activeBranchLabel]);

  // Quick Action Modal States (Log Time, Upload Document, New Case Note, Request Leave)
  const defaultCaseId = branchScopedCases[0]?.id || cases[0]?.id || '';
  const [timeCaseId, setTimeCaseId] = useState('');
  const [timeHours, setTimeHours] = useState('1.5');
  const [timeDate, setTimeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeDescription, setTimeDescription] = useState('');

  const [docCaseId, setDocCaseId] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<PleadingDocument['documentType']>('Legal Submissions');
  const [docFileName, setDocFileName] = useState('');
  const [docFileSize, setDocFileSize] = useState('1.2 MB');

  const [noteCaseId, setNoteCaseId] = useState('');
  const [noteCategory, setNoteCategory] = useState<ProgressiveNote['category']>('Court Milestone');
  const [noteContent, setNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const [leaveType, setLeaveType] = useState('Annual Leave');
  const [leaveStart, setLeaveStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [leaveEnd, setLeaveEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  const leaveBreakdown = useMemo(
    () => calculateUgandaLeaveBreakdown(leaveStart, leaveEnd, systemSettings?.publicHolidays),
    [leaveStart, leaveEnd, systemSettings?.publicHolidays]
  );

  useEffect(() => {
    if (!activeModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeModal]);

  const openQuickModal = (modal: QuickModalType) => {
    if (modal === 'time' && !timeCaseId) setTimeCaseId(defaultCaseId);
    if (modal === 'document' && !docCaseId) setDocCaseId(defaultCaseId);
    if (modal === 'note' && !noteCaseId) setNoteCaseId(defaultCaseId);
    setActiveModal(modal);
  };

  const handleSubmitTimeLog = (e: React.FormEvent) => {
    e.preventDefault();
    const numericHours = parseFloat(timeHours);
    if (Number.isNaN(numericHours) || numericHours <= 0 || numericHours > 24 || !timeDescription.trim()) {
      showCleanMessage('Enter valid hours and a work description.', 'warning');
      return;
    }
    const matchedCase = cases.find((c) => c.id === timeCaseId);
    const code = matchedCase?.suitNumber || matchedCase?.firmRefNumber || 'FIRM-GEN';
    try {
      const existing = JSON.parse(window.localStorage.getItem(TIME_LOGS_STORAGE_KEY) || '[]');
      existing.unshift({
        id: `tl-${Date.now()}`,
        caseId: matchedCase?.id || 'general',
        caseCode: code,
        hours: numericHours,
        date: timeDate,
        description: timeDescription.trim(),
        billable: true,
        author: effectiveUser?.name || 'Advocate',
      });
      window.localStorage.setItem(TIME_LOGS_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // ignore
    }
    setTimeDescription('');
    setTimeHours('1.5');
    setActiveModal(null);
    showCleanMessage(`Logged ${numericHours.toFixed(1)} billable hours to ${code}.`, 'success');
  };

  const handleSubmitDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) {
      showCleanMessage('Enter a document title before indexing.', 'warning');
      return;
    }
    const matchedCase = cases.find((c) => c.id === docCaseId) || branchScopedCases[0] || cases[0];
    const suitNo = matchedCase?.suitNumber || matchedCase?.firmRefNumber || 'MK-REG-2026';
    const ext = docFileName.split('.').pop()?.toLowerCase();
    const fileFormat: PleadingDocument['fileFormat'] =
      ext === 'docx' || ext === 'doc' ? 'docx' : ext === 'xlsx' || ext === 'xls' ? 'xlsx' : 'pdf';
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
      summary: docFileName ? `Uploaded file: ${docFileName}` : 'Uploaded via Staff Workspace',
      version: 1,
    });
    setDocTitle('');
    setDocFileName('');
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
      setNoteContent('');
      setActiveModal(null);
      showCleanMessage(`Case note saved to ${matchedCase.suitNumber || matchedCase.firmRefNumber}.`, 'success');
    } catch {
      showCleanMessage('Unable to save case note.', 'error');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveBreakdown.isValidRange || leaveBreakdown.workingDays <= 0 || !leaveReason.trim()) {
      showCleanMessage('Select a valid working-day date range and provide a reason.', 'warning');
      return;
    }
    setSubmittingLeave(true);
    try {
      if (typeof window !== 'undefined') {
        try {
          const prev = JSON.parse(window.localStorage.getItem(LOCAL_LEAVE_REQUESTS_KEY) || '[]');
          window.localStorage.setItem(
            LOCAL_LEAVE_REQUESTS_KEY,
            JSON.stringify([
              {
                id: `lv-${Date.now()}`,
                employee_name: effectiveUser?.name || 'Firm Staff',
                leave_type: leaveType,
                start_date: leaveStart,
                end_date: leaveEnd,
                days_requested: leaveBreakdown.workingDays,
                reason: leaveReason.trim(),
                status: 'Pending',
              },
              ...prev,
            ])
          );
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
      setLeaveReason('');
      setActiveModal(null);
      showCleanMessage(
        `${leaveType} (${leaveBreakdown.workingDays} working day${leaveBreakdown.workingDays === 1 ? '' : 's'}) submitted for approval.`,
        'success'
      );
    } catch {
      setLeaveReason('');
      setActiveModal(null);
      showCleanMessage('Leave request recorded and queued for HR approval.', 'success');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const firstName = useMemo(() => {
    const full = String(effectiveUser?.name || 'Counsel').trim();
    return full.split(/\s+/)[0] || full;
  }, [effectiveUser?.name]);

  const departmentLabel = effectiveUser?.roleTitle || 'Litigation & Corporate Chambers';

  const triggerNewCase = () => {
    if (onOpenNewCase) onOpenNewCase();
    else setIsNewCaseModalOpen(true);
  };

  const triggerLitigationForm = () => {
    if (onOpenLitigationForm) onOpenLitigationForm();
    else setIsNewCaseModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Standalone Top Header Bar (shown only if StaffDashboard is rendered outside DashboardLayout) */}
      {!hideTopHeader && (
        <header className="sticky top-0 z-20 px-4 py-3 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search Case File # (e.g. LF-2026), Doc Code (e.g. DOC-PLD), or Client..."
              className="w-full h-9 pl-10 pr-8 text-xs sm:text-sm bg-[#F4F6F9] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg text-[#162238] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#162238]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#162238] p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative flex items-center">
              <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
              <select
                aria-label="Active branch context"
                value={activeBranchId}
                onChange={(e) => handleBranchSelect(e.target.value)}
                className="h-9 pl-8 pr-7 text-xs font-semibold bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg text-[#162238] dark:text-slate-200 focus:outline-none focus:border-[#162238] cursor-pointer"
              >
                {resolvedBranchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>
      )}

      {/* Live Search Matters Bar (only appears when user types into the top search bar) */}
      {searchQuery.trim() && (
        <section className="bg-white dark:bg-slate-900 border border-[#D99B26]/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#162238] dark:text-[#E8C06B]">
              <Search className="w-3.5 h-3.5 text-[#D99B26]" />
              <span>
                Live filter active for &ldquo;{searchQuery.trim()}&rdquo; —{' '}
                <span className="tabular-nums">{matchingCases.length}</span> matter(s),{' '}
                <span className="tabular-nums">{filteredTasks.length}</span> task(s),{' '}
                <span className="tabular-nums">{upcomingHearings.length}</span> hearing(s)
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="text-xs font-semibold text-slate-500 hover:text-[#162238] dark:hover:text-white cursor-pointer"
            >
              Clear filter
            </button>
          </div>
          {matchingCases.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {matchingCases.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCase(c)}
                  className="text-left p-3 rounded-lg bg-[#F4F6F9] dark:bg-slate-800/70 hover:bg-[#FBF5E8] dark:hover:bg-[#162238]/60 border border-[#E2E8F0] dark:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold text-[#162238] dark:text-[#E8C06B] truncate tabular-nums">
                      {c.suitNumber || c.firmRefNumber || c.case_number}
                    </p>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                      {c.title || c.clientName || c.client || 'Active Firm Matter'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {c.branchName || activeBranchLabel} · {c.status || 'Active'}
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 1. EXECUTIVE HERO BANNER (Preserved original operations & buttons, tightened Clio proportions) */}
      <section className="relative overflow-hidden rounded-xl bg-[#162238] border border-[#1E2F4D] text-white px-6 py-5 shadow-xs">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#D99B26]/12 blur-3xl"
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-medium">
              <span className="inline-flex items-center gap-1.5 text-[#E8C06B]">
                <MapPin className="w-3.5 h-3.5 text-[#D99B26]" />
                {activeBranchLabel}
              </span>
              <span aria-hidden="true" className="text-white/25">·</span>
              <span>{departmentLabel}</span>
              <span aria-hidden="true" className="text-white/25">·</span>
              <span className="tabular-nums text-slate-400">{formattedDateTime}</span>
            </div>

            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
              Good day, {firstName}
            </h1>

            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed max-w-2xl">
              You have{' '}
              <span className="font-semibold text-[#E8C06B] tabular-nums">
                {kpiMetrics.pendingCases} pending case matters
              </span>
              {canAccessRestrictedWorkflow ? (
                <>
                  ,{' '}
                  <span className="font-semibold text-[#E8C06B] tabular-nums">
                    {kpiMetrics.approvals} pending approvals
                  </span>
                  ,
                </>
              ) : null}{' '}
              and{' '}
              <span className="font-semibold text-[#E8C06B] tabular-nums">
                {kpiMetrics.vaultCustody} files in physical custody
              </span>{' '}
              under {activeBranchLabel}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={triggerNewCase}
              className="h-9 inline-flex items-center gap-1.5 px-4 rounded-lg bg-[#D99B26] hover:bg-[#E8B143] text-[#162238] text-xs font-bold transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>New Case File</span>
            </button>

            <button
              type="button"
              onClick={triggerLitigationForm}
              className="h-9 inline-flex items-center gap-1.5 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              <Gavel className="w-3.5 h-3.5 text-[#D99B26] shrink-0" />
              <span>Branch Litigation Form</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. ORIGINAL KPI STAT CARDS (Clio-aligned equal height cards with tabular-nums) */}
      <section
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          canAccessRestrictedWorkflow ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
        } gap-5`}
      >
        {/* KPI 1: Pending Case Files (with exact Active vs Inactive breakdown) */}
        <button
          type="button"
          onClick={() => (onOpenCases ? onOpenCases() : setActiveTab('catalogue'))}
          className="text-left rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#162238]/35 dark:hover:border-[#D99B26]/50 p-5 flex flex-col justify-between min-h-[132px] transition cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Pending Case Files
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#162238]/[0.06] dark:bg-slate-800 text-[#162238] dark:text-[#D99B26] flex items-center justify-center shrink-0">
              <FolderClock className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="font-display text-3xl font-bold text-[#162238] dark:text-white tabular-nums tracking-tight leading-none">
              {kpiMetrics.pendingCases}
            </span>
            <div className="flex items-center gap-2 text-[11px] tabular-nums">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/70 dark:border-emerald-800/50">
                Active: {kpiMetrics.activePendingCases}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200/70 dark:border-amber-800/50">
                Inactive: {kpiMetrics.inactivePendingCases}
              </span>
            </div>
          </div>
        </button>

        {/* KPI 2: Accomplished Cases */}
        <button
          type="button"
          onClick={() => (onOpenCases ? onOpenCases() : setActiveTab('catalogue'))}
          className="text-left rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#162238]/35 dark:hover:border-[#D99B26]/50 p-5 flex flex-col justify-between min-h-[132px] transition cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Accomplished Cases
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="font-display text-3xl font-bold text-[#162238] dark:text-white tabular-nums tracking-tight leading-none">
              {kpiMetrics.accomplishedCases}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200/70 dark:border-emerald-800/50">
              Concluded &amp; closed
            </span>
          </div>
        </button>

        {/* KPI 3: Vault File Custody */}
        <button
          type="button"
          onClick={() => (onOpenDocuments ? onOpenDocuments() : setActiveTab('documents'))}
          className="text-left rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#162238]/35 dark:hover:border-[#D99B26]/50 p-5 flex flex-col justify-between min-h-[132px] transition cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Vault File Custody
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FBF5E8] dark:bg-[#D99B26]/15 text-[#B57E1A] dark:text-[#D99B26] flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="font-display text-3xl font-bold text-[#162238] dark:text-white tabular-nums tracking-tight leading-none">
              {kpiMetrics.vaultCustody}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#FBF5E8] dark:bg-[#D99B26]/15 text-[#B57E1A] dark:text-[#E8C06B] text-[11px] font-semibold border border-[#D99B26]/30">
              Titles &amp; deeds
            </span>
          </div>
        </button>

        {/* KPI 4: Pending Approvals (RBAC gated) */}
        {canAccessRestrictedWorkflow && (
          <button
            type="button"
            onClick={() => (onOpenApprovals ? onOpenApprovals() : setActiveTab('approvals'))}
            className="text-left rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#162238]/35 dark:hover:border-[#D99B26]/50 p-5 flex flex-col justify-between min-h-[132px] transition cursor-pointer"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Pending Approvals
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-end justify-between gap-2">
              <span className="font-display text-3xl font-bold text-[#162238] dark:text-white tabular-nums tracking-tight leading-none">
                {kpiMetrics.approvals}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                  kpiMetrics.approvals > 0
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {kpiMetrics.approvals > 0 ? 'Awaiting review' : 'All clear'}
              </span>
            </div>
          </button>
        )}
      </section>

      {/* 3. ROW A: BLOCK C (Staff Tasks & Workflow Visibility) + BLOCK D (Upcoming Hearings & Deadlines) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left (lg:col-span-7): Block C — Staff Tasks & Workflow Visibility */}
        <div className="lg:col-span-7 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#162238]/[0.06] dark:bg-slate-800 text-[#162238] dark:text-[#D99B26] flex items-center justify-center shrink-0">
                <ListChecks className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-sm font-bold text-[#162238] dark:text-white tracking-tight">
                  Staff Tasks &amp; Workflow
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Click any status badge to cycle Todo → In Progress → Completed
                </p>
              </div>
            </div>

            {canAccessRestrictedWorkflow && (
              <button
                type="button"
                onClick={() => (onOpenWorkload ? onOpenWorkload() : setActiveTab('legal_team'))}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#162238] dark:text-[#D99B26] hover:text-[#D99B26] transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team Workload</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-[#E2E8F0]/80 dark:divide-slate-800">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No tasks match your current filter.
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isDone = task.status === 'Completed';
                return (
                  <div
                    key={task.id}
                    className="px-5 py-3.5 hover:bg-[#F4F6F9]/70 dark:hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                            task.priority === 'URGENT'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60'
                              : task.priority === 'HIGH'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {task.priority}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-[#162238] dark:text-[#E8C06B] tabular-nums">
                          {task.caseCode}
                        </span>
                      </div>

                      <p
                        className={`text-xs sm:text-[13px] font-semibold leading-snug ${
                          isDone
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-[#162238] dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{task.assignee}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {task.dueDate}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCycleTaskStatus(task.id)}
                      title="Click to update task status"
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer shrink-0 self-start sm:self-center inline-flex items-center gap-1.5 ${
                        task.status === 'Completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                          : task.status === 'In Progress'
                          ? 'bg-[#FBF5E8] dark:bg-[#D99B26]/15 text-[#B57E1A] dark:text-[#E8C06B] border-[#D99B26]/40'
                          : 'bg-[#F4F6F9] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[#E2E8F0] dark:border-slate-700'
                      }`}
                    >
                      {task.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                      <span>{task.status}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right (lg:col-span-5): Block D — Upcoming Hearings & Deadlines */}
        <div className="lg:col-span-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#FBF5E8] dark:bg-[#D99B26]/15 text-[#B57E1A] dark:text-[#D99B26] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-sm font-bold text-[#162238] dark:text-white tracking-tight">
                  Upcoming Hearings &amp; Deadlines
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Live cause list &amp; scheduled court dates
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => (onOpenHearings ? onOpenHearings() : setActiveTab('causelist'))}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#162238] dark:text-[#D99B26] hover:text-[#D99B26] transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Cause List</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#E2E8F0]/80 dark:divide-slate-800">
            {upcomingHearings.map((item) => {
              const tile = parseDateTile(item.rawDate || item.dateTime);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.linkedCase) setSelectedCase(item.linkedCase);
                    else if (onOpenHearings) onOpenHearings();
                    else setActiveTab('causelist');
                  }}
                  className="w-full text-left px-5 py-3.5 hover:bg-[#F4F6F9]/70 dark:hover:bg-slate-800/40 transition cursor-pointer flex items-start gap-3.5 group"
                >
                  {/* Crisp Date Tile (MMM / DD) */}
                  <div className="w-11 h-12 rounded-lg bg-[#F4F6F9] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 flex flex-col items-center justify-center shrink-0 tabular-nums">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B57E1A] dark:text-[#D99B26] leading-none">
                      {tile.month}
                    </span>
                    <span className="font-display text-base font-bold text-[#162238] dark:text-white leading-tight mt-0.5">
                      {tile.day}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-[#162238] dark:text-[#E8C06B] tabular-nums truncate">
                        {item.caseCode}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FBF5E8] dark:bg-[#D99B26]/15 text-[#B57E1A] dark:text-[#E8C06B] border border-[#D99B26]/30 shrink-0">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-[#162238] dark:group-hover:text-white">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
                      {item.dateTime} · {item.courtDivision}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. ROW B: BLOCK A (Firm Directives & Announcements) + BLOCK B (Staff Birthdays & Celebrations) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left (lg:col-span-7): Block A — Firm Directives & Announcements */}
        <div className="lg:col-span-7 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#162238]/[0.06] dark:bg-slate-800 text-[#162238] dark:text-[#D99B26] flex items-center justify-center shrink-0">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display text-sm font-bold text-[#162238] dark:text-white tracking-tight">
                  Firm Notices &amp; Practice Directives
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Managing Partner circulars &amp; registry protocols
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
              {INITIAL_NOTICES.length} active
            </span>
          </div>

          <div className="divide-y divide-[#E2E8F0]/80 dark:divide-slate-800">
            {INITIAL_NOTICES.map((notice) => (
              <article
                key={notice.id}
                className={`px-5 py-4 space-y-1.5 ${
                  notice.pinned ? 'bg-[#FBF5E8]/45 dark:bg-[#D99B26]/[0.05]' : ''
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {notice.pinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#162238] text-[#E8C06B]">
                        <Pin className="w-2.5 h-2.5" />
                        Pinned
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F4F6F9] dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700">
                      {notice.category}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 tabular-nums">{notice.date}</span>
                </div>

                <h3 className="font-display text-[13px] font-bold text-[#162238] dark:text-white leading-snug">
                  {notice.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {notice.body}
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-medium text-slate-500 dark:text-slate-400">{notice.issuer}</span>
                  <span aria-hidden="true">·</span>
                  <span>{notice.branchScope}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Right (lg:col-span-5): Block B — Staff Birthdays & Celebrations (with Super Admin LockedBirthdayWidget + Live Wishes) */}
        <div className="lg:col-span-5 space-y-5">
          {isSuperAdmin && (
            <LockedBirthdayWidget
              currentUser={effectiveUser}
              onOpenHrModule={() => (onOpenHrModule ? onOpenHrModule() : setActiveTab('hr'))}
            />
          )}

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FBF5E8] dark:bg-[#D99B26]/15 text-[#B57E1A] dark:text-[#D99B26] flex items-center justify-center shrink-0">
                  <Cake className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-[#162238] dark:text-white tracking-tight">
                    Firm Celebrations &amp; Birthdays
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Send warm wishes to colleagues across branches
                  </p>
                </div>
              </div>
              {loadingBirthdays && <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />}
            </div>

            <div className="divide-y divide-[#E2E8F0]/80 dark:divide-slate-800">
              {celebrants.map((celebrant) => {
                const isWishOpen = activeWishId === celebrant.id;
                return (
                  <div key={celebrant.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#162238] text-[#E8C06B] text-xs font-display font-bold flex items-center justify-center shrink-0">
                          {getInitials(celebrant.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#162238] dark:text-white truncate">
                            {celebrant.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {celebrant.role} ·{' '}
                            <span className={celebrant.isToday ? 'font-semibold text-[#B57E1A] dark:text-[#D99B26]' : ''}>
                              {celebrant.dateLabel}
                            </span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveWishId(isWishOpen ? null : celebrant.id);
                          setWishDraft('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#F4F6F9] dark:bg-slate-800 hover:bg-[#162238] hover:text-white border border-[#E2E8F0] dark:border-slate-700 text-[11px] font-semibold text-[#162238] dark:text-slate-200 transition cursor-pointer shrink-0"
                      >
                        {isWishOpen ? 'Close' : 'Send Wish'}
                      </button>
                    </div>

                    {isWishOpen && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={wishDraft}
                          onChange={(e) => setWishDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleSendBirthdayWish(celebrant);
                            }
                          }}
                          placeholder={`Write a birthday wish for ${celebrant.name.split(' ')[0]}...`}
                          className="flex-1 h-9 px-3 text-xs rounded-lg bg-[#F4F6F9] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100 focus:outline-none focus:border-[#162238]"
                        />
                        <button
                          type="button"
                          disabled={sendingWishId === celebrant.id || !wishDraft.trim()}
                          onClick={() => void handleSendBirthdayWish(celebrant)}
                          className="h-9 px-3 rounded-lg bg-[#162238] hover:bg-[#1E2F4D] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          {sendingWishId === celebrant.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5 text-[#D99B26]" />
                          )}
                          <span>Send</span>
                        </button>
                      </div>
                    )}

                    {celebrant.wishes.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {celebrant.wishes.slice(0, 2).map((w) => (
                          <div
                            key={w.id}
                            className="px-3 py-2 rounded-lg bg-[#F4F6F9] dark:bg-slate-800/60 border border-[#E2E8F0]/80 dark:border-slate-700/70 text-[11px]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-[#162238] dark:text-slate-200">
                                {w.sender}
                              </span>
                              <span className="text-[10px] text-slate-400 tabular-nums">{w.createdAt}</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 mt-0.5">{w.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 5. ROW C: ACTIVE MATTERS DOCKET (lg:col-span-8) + QUICK ACTIONS 2x2 (lg:col-span-4) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left (lg:col-span-8): Active Cases Table with Segmented Filter Tabs */}
        <div className="lg:col-span-8 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-bold text-[#162238] dark:text-white tracking-tight">
                Active Cases Docket
              </h2>
              <span className="text-xs text-slate-400 font-medium tabular-nums">
                ({activeMatterRows.length})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#162238] dark:text-[#D99B26] hover:text-[#D99B26] transition cursor-pointer whitespace-nowrap"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeMatterRows.length === 0 ? (
              <div className="px-6 py-10 text-center space-y-2">
                <p className="text-xs font-semibold text-[#162238] dark:text-white">
                  No active matters found for this filter.
                </p>
                <button
                  type="button"
                  onClick={triggerNewCase}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#162238] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D99B26]" />
                  <span>Register Case File</span>
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
                  {activeMatterRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => {
                        if (row.rawCase) setSelectedCase(row.rawCase);
                        else if (row.isMortgage) setActiveTab('mortgages');
                      }}
                      className="hover:bg-[#F4F6F9]/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 pl-5 pr-3 max-w-[260px]">
                        <div className="flex items-center gap-1.5">
                          {row.isMortgage && <Landmark className="w-3.5 h-3.5 text-[#D99B26] shrink-0" />}
                          <span className="font-mono text-[11px] font-semibold text-[#162238] dark:text-[#E8C06B] tabular-nums truncate">
                            {row.code}
                          </span>
                        </div>
                        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                          {row.title}
                        </p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{row.practiceLabel}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[155px]">
                          {row.branch}
                        </p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F4F6F9] dark:bg-slate-800 text-[#162238] dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-700">
                          {row.stage}
                        </span>
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap tabular-nums text-slate-700 dark:text-slate-200 font-medium">
                        {row.nextDeadline}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right (lg:col-span-4): Symmetrical 2x2 Quick Actions */}
        <div className="lg:col-span-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-5">
          <div className="pb-3.5 border-b border-[#E2E8F0] dark:border-slate-800">
            <h2 className="font-display text-sm font-bold text-[#162238] dark:text-white tracking-tight">
              Quick Actions
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Fast in-place operational tools
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              type="button"
              onClick={() => openQuickModal('time')}
              className="text-left p-3.5 rounded-xl bg-[#F4F6F9] dark:bg-slate-800/60 hover:bg-[#162238] border border-[#E2E8F0] dark:border-slate-700 hover:border-[#162238] transition-colors cursor-pointer group flex flex-col justify-between min-h-[96px]"
            >
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 group-hover:bg-white/10 border border-[#E2E8F0] dark:border-slate-700 group-hover:border-white/15 flex items-center justify-center text-[#162238] dark:text-[#D99B26] group-hover:text-[#D99B26]">
                <Clock className="w-4 h-4" />
              </div>
              <p className="font-display text-xs font-bold text-[#162238] dark:text-white group-hover:text-white mt-3">
                Log Time
              </p>
            </button>

            <button
              type="button"
              onClick={() => openQuickModal('document')}
              className="text-left p-3.5 rounded-xl bg-[#F4F6F9] dark:bg-slate-800/60 hover:bg-[#162238] border border-[#E2E8F0] dark:border-slate-700 hover:border-[#162238] transition-colors cursor-pointer group flex flex-col justify-between min-h-[96px]"
            >
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 group-hover:bg-white/10 border border-[#E2E8F0] dark:border-slate-700 group-hover:border-white/15 flex items-center justify-center text-[#162238] dark:text-[#D99B26] group-hover:text-[#D99B26]">
                <Upload className="w-4 h-4" />
              </div>
              <p className="font-display text-xs font-bold text-[#162238] dark:text-white group-hover:text-white mt-3">
                Upload Document
              </p>
            </button>

            <button
              type="button"
              onClick={() => openQuickModal('note')}
              className="text-left p-3.5 rounded-xl bg-[#F4F6F9] dark:bg-slate-800/60 hover:bg-[#162238] border border-[#E2E8F0] dark:border-slate-700 hover:border-[#162238] transition-colors cursor-pointer group flex flex-col justify-between min-h-[96px]"
            >
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 group-hover:bg-white/10 border border-[#E2E8F0] dark:border-slate-700 group-hover:border-white/15 flex items-center justify-center text-[#162238] dark:text-[#D99B26] group-hover:text-[#D99B26]">
                <FileText className="w-4 h-4" />
              </div>
              <p className="font-display text-xs font-bold text-[#162238] dark:text-white group-hover:text-white mt-3">
                New Case Note
              </p>
            </button>

            <button
              type="button"
              onClick={() => openQuickModal('leave')}
              className="text-left p-3.5 rounded-xl bg-[#F4F6F9] dark:bg-slate-800/60 hover:bg-[#162238] border border-[#E2E8F0] dark:border-slate-700 hover:border-[#162238] transition-colors cursor-pointer group flex flex-col justify-between min-h-[96px]"
            >
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 group-hover:bg-white/10 border border-[#E2E8F0] dark:border-slate-700 group-hover:border-white/15 flex items-center justify-center text-[#162238] dark:text-[#D99B26] group-hover:text-[#D99B26]">
                <CalendarDays className="w-4 h-4" />
              </div>
              <p className="font-display text-xs font-bold text-[#162238] dark:text-white group-hover:text-white mt-3">
                Request Leave
              </p>
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
            {activeModal === 'time' && (
              <form onSubmit={handleSubmitTimeLog}>
                <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-[#162238] dark:text-white">
                    Log Time Entry
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#162238] cursor-pointer"
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
                      className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#162238] dark:text-slate-100"
                    >
                      <option value="">General Advisory</option>
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
                        Hours
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        max="24"
                        required
                        value={timeHours}
                        onChange={(e) => setTimeHours(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 tabular-nums"
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
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 tabular-nums"
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
                      placeholder="Describe legal work performed..."
                      className="w-full p-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700"
                    />
                  </div>
                </div>
                <div className="px-5 py-3.5 bg-[#F4F6F9] dark:bg-slate-800/50 border-t border-[#E2E8F0] dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-4 rounded-lg bg-[#162238] hover:bg-[#1E2F4D] text-white text-xs font-semibold cursor-pointer"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'document' && (
              <form onSubmit={handleSubmitDocument}>
                <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-[#162238] dark:text-white">
                    Upload Document to Registry
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#162238] cursor-pointer"
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
                      className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700"
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
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Category
                      </label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value as PleadingDocument['documentType'])}
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700"
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
                      className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#F4F6F9] file:text-[#162238] cursor-pointer"
                    />
                  </div>
                </div>
                <div className="px-5 py-3.5 bg-[#F4F6F9] dark:bg-slate-800/50 border-t border-[#E2E8F0] dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer"
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

            {activeModal === 'note' && (
              <form onSubmit={handleSubmitCaseNote}>
                <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-[#162238] dark:text-white">
                    New Case Note
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#162238] cursor-pointer"
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
                      className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700"
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
                      Category
                    </label>
                    <select
                      value={noteCategory}
                      onChange={(e) => setNoteCategory(e.target.value as ProgressiveNote['category'])}
                      className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700"
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
                      placeholder="Record court directions, client instructions, or procedural updates..."
                      className="w-full p-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700"
                    />
                  </div>
                </div>
                <div className="px-5 py-3.5 bg-[#F4F6F9] dark:bg-slate-800/50 border-t border-[#E2E8F0] dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingNote}
                    className="h-9 px-4 rounded-lg bg-[#162238] hover:bg-[#1E2F4D] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                  >
                    {submittingNote ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'leave' && (
              <form onSubmit={handleSubmitLeaveRequest}>
                <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-[#162238] dark:text-white">
                    Request Leave
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#162238] cursor-pointer"
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
                      className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700"
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
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 tabular-nums"
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
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#F4F6F9] dark:bg-slate-800/70 border border-[#E2E8F0] dark:border-slate-700 p-3 space-y-1">
                    {leaveBreakdown.isValidRange ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#162238] dark:text-white">
                            Deductible Working Days
                          </span>
                          <span className="font-display text-sm font-bold text-[#162238] dark:text-[#D99B26] tabular-nums">
                            {leaveBreakdown.workingDays} day{leaveBreakdown.workingDays === 1 ? '' : 's'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          {leaveBreakdown.totalCalendarDays} calendar days · {leaveBreakdown.weekendDays} weekend day(s) excluded
                          {leaveBreakdown.excludedHolidays.length > 0
                            ? ` · ${leaveBreakdown.excludedHolidays.length} public holiday(s) skipped (${leaveBreakdown.excludedHolidays
                                .map((h) => h.name)
                                .join(', ')})`
                            : ''}
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 text-rose-600 font-medium">
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
                      className="w-full p-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700"
                    />
                  </div>
                </div>
                <div className="px-5 py-3.5 bg-[#F4F6F9] dark:bg-slate-800/50 border-t border-[#E2E8F0] dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer"
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
