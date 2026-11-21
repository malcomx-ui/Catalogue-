import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getEffectiveUser } from '../lib/supabase';
import { hrSupabase, isSuperAdminUser, canAccessRestrictedWorkflowNav } from '../lib/hrSupabase';
import { LockedBirthdayWidget } from './LockedHrComponents';
import { StaffOnLeaveCard } from './StaffOnLeaveCard';
import { MortgageService, getVisibleBanksForUser } from '../services/mortgageService';
import { calculateUgandaLeaveBreakdown } from '../utils/ugandaHolidays';
import { showCleanMessage } from '../utils/notification';
import {
  computeBirthdayProximity,
  STAFF_BIRTHDAYS_UPDATED_EVENT,
} from '../utils/birthdayAlerts';
import {
  dedupeBranches,
  getBranchCode,
  getBranchSearchTokens,
  getBranchStationKey,
  getCaseMatchDimensions,
  matchesBranchGlobalSearch,
  matchesCaseGlobalSearch,
  matchesMortgageGlobalSearch,
  matchesMultiTokenQuery,
  resolveBranchForRecord,
} from '../utils/globalSearch';
import type { CaseItem, PleadingDocument, ProgressiveNote } from '../types';
import {
  buildNewCashRequisition,
  loadLocalRequisitions,
  saveLocalRequisitions,
  syncCashRequisitionToSupabase,
  type CashRequisitionItem,
  type CreateCashRequisitionInput,
} from '../lib/cashRequisitionStore';
import {
  fetchAnnouncementsFromSupabase,
  formatAnnouncementTimestamp,
  loadLocalAnnouncements,
  subscribeToAnnouncements,
  type FirmAnnouncement,
} from '../lib/announcementsStore';
import {
  Search,
  Building2,
  Plus,
  FolderClock,
  Award,
  Lock,
  ClipboardList,
  Megaphone,
  Pin,
  Cake,
  Send,
  Calendar,
  MapPin,
  X,
  ArrowUpRight,
  ArrowRight,
  Loader2,
  Upload,
  FileText,
  CalendarDays,
  AlertCircle,
  Landmark,
  Zap,
  Banknote,
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
  isWithinThreeDays?: boolean;
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
  onOpenCashRequisitions?: () => void;
  onCreateCashRequisition?: (input: CreateCashRequisitionInput) => CashRequisitionItem;
  onOpenDocuments?: () => void;
  onOpenCases?: () => void;
  onOpenWorkload?: () => void;
  onOpenHearings?: () => void;
  onOpenHrModule?: () => void;
  /** Hide internal sticky header when already rendered by DashboardLayout */
  hideTopHeader?: boolean;
}

type CaseFilterTab = 'Litigation' | 'Mortgages';
type QuickModalType = 'requisition' | 'document' | 'note' | 'leave' | null;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TASKS_STORAGE_KEY = 'mk_staff_dashboard_tasks_v1';
const LOCAL_WISHES_STORAGE_KEY = 'mk_staff_dashboard_wishes_v1';
const LOCAL_HR_OVERRIDES_KEY = 'mk_hr_employee_overrides_v1';
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

function formatBirthdayDate(dob?: string | null): {
  label: string;
  isToday: boolean;
  isWithinThreeDays: boolean;
  daysUntil: number;
} {
  const prox = computeBirthdayProximity(dob);
  return {
    label: prox.label,
    isToday: prox.isToday,
    isWithinThreeDays: prox.isWithinWindow,
    daysUntil: prox.daysUntil,
  };
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
    stage.includes('concluded') ||
    Boolean(c.year_of_closure)
  );
}

function isCaseConcluded(c: CaseItem): boolean {
  const s = String(c.status || '').trim().toLowerCase();
  const stage = String(c.stage || '').trim().toLowerCase();
  if (s === 'closed' || s === 'archived') return false;
  return (
    s === 'concluded' ||
    s === 'disposed' ||
    s === 'completed' ||
    s.includes('concluded') ||
    s.includes('disposed') ||
    s.includes('judgment') ||
    stage.includes('concluded') ||
    stage.includes('disposed')
  );
}

function isCaseInactive(c: CaseItem): boolean {
  const s = String(c.status || 'Active').trim().toLowerCase();
  const explicitInactiveFlag = (c as any).is_active === false || (c as any).isActive === false;
  return (
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
    s.includes('abeyance')
  );
}

function matchesBranchRecord(
  recordBranchId?: string | null,
  recordBranchName?: string | null,
  branchId?: string,
  branchName?: string,
  branchCity?: string
): boolean {
  const normalizedTargetId = String(branchId || '').trim().toLowerCase();
  const targetCity = String(branchCity || '').trim().toLowerCase();
  const targetName = String(branchName || '').trim().toLowerCase();
  const bId = String(recordBranchId || '').trim().toLowerCase();
  const bName = String(recordBranchName || '').trim().toLowerCase();

  return (
    (bId !== '' && normalizedTargetId !== '' && bId === normalizedTargetId) ||
    (targetCity !== '' && (bName.includes(targetCity) || bId.includes(targetCity))) ||
    (targetName !== '' &&
      bName !== '' &&
      (bName.includes(targetName) || (bName.length >= 3 && targetName.includes(bName))))
  );
}

function parseDateTile(raw?: string | null): { month: string; day: string; formatted: string; sortTs: number } {
  if (!raw) {
    return { month: 'TBD', day: '--', formatted: 'Not scheduled', sortTs: Number.MAX_SAFE_INTEGER };
  }
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
    return {
      month: shortWord.slice(0, 3).toUpperCase(),
      day: '•',
      formatted: String(raw),
      sortTs: Number.MAX_SAFE_INTEGER - 1,
    };
  }
  return {
    month: dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(dt.getDate()).padStart(2, '0'),
    formatted: dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    sortTs: dt.getTime(),
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
  onOpenApprovals,
  onOpenCashRequisitions,
  onCreateCashRequisition,
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

  const [activeCaseFilter, setActiveCaseFilter] = useState<CaseFilterTab>('Litigation');
  const [activeModal, setActiveModal] = useState<QuickModalType>(null);
  const [mortgages, setMortgages] = useState<any[]>([]);
  const [leaveRefreshKey, setLeaveRefreshKey] = useState<number>(0);
  const [firmAnnouncements, setFirmAnnouncements] = useState<FirmAnnouncement[]>(() =>
    loadLocalAnnouncements()
  );

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAnnouncements((next) => {
      if (active) setFirmAnnouncements(next);
    });
    fetchAnnouncementsFromSupabase().then((items) => {
      if (active) setFirmAnnouncements(items);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

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
        ...dedupeBranches(branches).map(({ primary }) => ({ id: primary.id, name: primary.name })),
      ];
    }
    return DEFAULT_BRANCH_OPTIONS;
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
    return cases.filter((c) =>
      matchesBranchRecord(
        c.branchId,
        c.branch || c.branchName,
        normalizedBranchId,
        targetBranch?.name || activeBranchLabel,
        targetBranch?.city
      )
    );
  }, [cases, activeBranchId, branches, activeBranchLabel]);

  // Branch-scoped mortgages
  const branchScopedMortgages = useMemo(() => {
    const normalizedBranchId = String(activeBranchId || '').trim().toLowerCase();
    if (!normalizedBranchId || normalizedBranchId === 'all' || normalizedBranchId === 'all firm branches') {
      return mortgages;
    }
    const targetBranch = branches.find((b) => b.id.toLowerCase() === normalizedBranchId);
    return mortgages.filter((m) =>
      matchesBranchRecord(
        m.branch_id,
        m.firm_branch_station || m.branch_name || m.bank_branch_station,
        normalizedBranchId,
        targetBranch?.name || activeBranchLabel,
        targetBranch?.city
      )
    );
  }, [mortgages, activeBranchId, branches, activeBranchLabel]);

  const trimmedSearchQuery = searchQuery.trim();
  const isGlobalSearchActive = Boolean(trimmedSearchQuery);

  // Live global search across Case ID, client names, and branch codes
  const searchMatchedCases = useMemo(() => {
    if (!isGlobalSearchActive) return branchScopedCases;
    return cases.filter((c) => matchesCaseGlobalSearch(c, trimmedSearchQuery, branches));
  }, [isGlobalSearchActive, branchScopedCases, cases, trimmedSearchQuery, branches]);

  const searchMatchedMortgages = useMemo(() => {
    if (!isGlobalSearchActive) return branchScopedMortgages;
    return mortgages.filter((m) => matchesMortgageGlobalSearch(m, trimmedSearchQuery, branches));
  }, [isGlobalSearchActive, branchScopedMortgages, mortgages, trimmedSearchQuery, branches]);

  // Live KPI metrics for the 4 Signed-In Branch Stat Blocks (dynamically reflects global search as user types)
  const kpiMetrics = useMemo(() => {
    let pendingCount = 0;
    let activePendingCount = 0;
    let inactivePendingCount = 0;
    let accomplishedCount = 0;
    let concludedCount = 0;
    let closedCount = 0;

    searchMatchedCases.forEach((c) => {
      if (isCaseClosed(c)) {
        accomplishedCount += 1;
        if (isCaseConcluded(c)) concludedCount += 1;
        else closedCount += 1;
      } else {
        pendingCount += 1;
        if (isCaseInactive(c)) inactivePendingCount += 1;
        else activePendingCount += 1;
      }
    });

    const vaultCustodyCount = isGlobalSearchActive
      ? searchMatchedCases.length
      : Math.max(
          documents.length,
          searchMatchedCases.length > 0 ? Math.min(searchMatchedCases.length, 48) : 14
        );

    return {
      pendingCases: pendingCount,
      activePendingCases: activePendingCount,
      inactivePendingCases: inactivePendingCount,
      accomplishedCases: accomplishedCount,
      concludedCases: concludedCount,
      closedCases: closedCount,
      vaultCustody: vaultCustodyCount,
      approvals: pendingApprovalsCount,
      mortgagesCount: searchMatchedMortgages.length,
    };
  }, [
    searchMatchedCases,
    searchMatchedMortgages.length,
    isGlobalSearchActive,
    documents.length,
    pendingApprovalsCount,
  ]);

  // Branch Case Blocks (deduplicated per station, excluding the signed-in user's branch which is already represented in the 4 main stat blocks)
  const branchCaseBlocks = useMemo(() => {
    const rawSourceBranches =
      Array.isArray(branches) && branches.length > 0
        ? branches
        : DEFAULT_BRANCH_OPTIONS.filter((b) => b.id !== 'all').map((b) => ({
            id: b.id,
            name: b.name,
            city: b.name.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*Branch\s*/gi, '').trim(),
            isHeadquarters: b.id === 'kla-hq',
          }));

    const dedupedBranches = dedupeBranches(rawSourceBranches);

    // Resolve signed-in user's home branch so it is excluded from Branch Case Blocks
    const userBranchId = String(effectiveUser?.branchId || '').trim().toLowerCase();
    const userBranchRecord = rawSourceBranches.find(
      (b) => b.id.toLowerCase() === userBranchId
    );
    const rawUserBranchName = String(
      userBranchRecord?.name || effectiveUser?.branchName || ''
    ).trim();
    const normalizedUserBranchName = rawUserBranchName.toLowerCase();
    const hasSpecificUserBranch =
      (Boolean(userBranchId) && userBranchId !== 'all') ||
      (Boolean(normalizedUserBranchName) &&
        normalizedUserBranchName !== 'all' &&
        !normalizedUserBranchName.includes('all firm'));

    const userStationKey = hasSpecificUserBranch
      ? getBranchStationKey(
          userBranchId !== 'all' ? userBranchId : undefined,
          rawUserBranchName,
          (userBranchRecord as any)?.city
        )
      : '';

    const otherBranches = hasSpecificUserBranch
      ? dedupedBranches.filter(({ primary: branch, mergedIds }) => {
          const matchesUserId =
            Boolean(userBranchId) &&
            userBranchId !== 'all' &&
            mergedIds.some((id) => id.toLowerCase() === userBranchId);
          const branchStationKey = getBranchStationKey(
            branch.id,
            branch.name,
            (branch as any).city
          );
          const matchesUserStation =
            Boolean(userStationKey) &&
            userStationKey !== 'all' &&
            branchStationKey === userStationKey;
          return !matchesUserId && !matchesUserStation;
        })
      : dedupedBranches;

    const mapped = otherBranches.map(({ primary: branch, mergedIds, mergedNames }) => {
      const branchCity = (branch as any).city || branch.name;
      const branchCode = getBranchCode(branch.id, branch.name, branchCity);
      const branchDirectlyMatches = isGlobalSearchActive
        ? mergedIds.some((id) =>
            matchesBranchGlobalSearch({ id, name: branch.name, city: branchCity }, trimmedSearchQuery)
          ) ||
          mergedNames.some((name) =>
            matchesBranchGlobalSearch({ id: branch.id, name, city: branchCity }, trimmedSearchQuery)
          )
        : false;

      const caseSource =
        isGlobalSearchActive && !branchDirectlyMatches ? searchMatchedCases : cases;
      const mortgageSource =
        isGlobalSearchActive && !branchDirectlyMatches ? searchMatchedMortgages : mortgages;

      const bCases = caseSource.filter((c) =>
        mergedIds.some((id) =>
          matchesBranchRecord(c.branchId, c.branch || c.branchName, id, branch.name, branchCity)
        )
      );
      let pending = 0;
      let active = 0;
      let inactive = 0;
      let accomplished = 0;

      bCases.forEach((c) => {
        if (isCaseClosed(c)) {
          accomplished += 1;
        } else {
          pending += 1;
          if (isCaseInactive(c)) inactive += 1;
          else active += 1;
        }
      });

      const bMortgages = mortgageSource.filter((m) =>
        mergedIds.some((id) =>
          matchesBranchRecord(
            m.branch_id,
            m.firm_branch_station || m.branch_name || m.bank_branch_station,
            id,
            branch.name,
            branchCity
          )
        )
      ).length;

      return {
        id: branch.id,
        code: branchCode,
        name: branch.name,
        city: branchCity,
        isHeadquarters: Boolean((branch as any).isHeadquarters),
        total: bCases.length,
        pending,
        active,
        inactive,
        accomplished,
        mortgages: bMortgages,
        branchDirectlyMatches,
      };
    });

    if (!isGlobalSearchActive) return mapped;
    return mapped.filter(
      (b) => b.branchDirectlyMatches || b.total > 0 || b.mortgages > 0
    );
  }, [
    branches,
    cases,
    mortgages,
    searchMatchedCases,
    searchMatchedMortgages,
    isGlobalSearchActive,
    trimmedSearchQuery,
    effectiveUser?.branchId,
    effectiveUser?.branchName,
  ]);

  // Birthday Celebrants & Live Supabase `birthday_wishes` integration
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
            isWithinThreeDays: meta.isWithinThreeDays,
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
    if (typeof window === 'undefined') return;
    const handleUpdated = () => {
      void loadBirthdayCelebrants();
    };
    window.addEventListener(STAFF_BIRTHDAYS_UPDATED_EVENT, handleUpdated);
    return () => {
      window.removeEventListener(STAFF_BIRTHDAYS_UPDATED_EVENT, handleUpdated);
    };
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

  // Upcoming Hearings & Deadlines (capped to 2 displayed items on dashboard rail, live-filtered across Case ID, client names & branch codes)
  const upcomingHearings = useMemo(() => {
    const items: Array<{
      id: string;
      badge: string;
      dateTime: string;
      rawDate: string;
      title: string;
      caseCode: string;
      courtDivision: string;
      linkedCase?: CaseItem;
      searchFields: Array<string | null | undefined>;
    }> = [];

    hearings
      .filter((h) => h.status !== 'Completed')
      .forEach((h) => {
        const linked = cases.find((c) => c.id === h.caseId || c.suitNumber === h.suitNumber);
        if (
          !isGlobalSearchActive &&
          activeBranchId &&
          activeBranchId !== 'all' &&
          linked &&
          linked.branchId &&
          linked.branchId !== activeBranchId
        ) {
          return;
        }
        const matchedBranch = resolveBranchForRecord(
          h.branchId || linked?.branchId,
          linked?.branchName || linked?.branch,
          branches
        );
        const branchTokens = getBranchSearchTokens(
          h.branchId || linked?.branchId || matchedBranch?.id,
          linked?.branchName || linked?.branch || matchedBranch?.name,
          matchedBranch?.city
        );
        const partiesText = Array.isArray(linked?.parties)
          ? linked.parties.map((p) => p?.name || '').filter(Boolean)
          : [];

        items.push({
          id: h.id,
          badge: h.hearingPurpose || 'Court Hearing',
          dateTime: `${h.hearingDate}${h.hearingTime ? ` · ${h.hearingTime}` : ' · 09:30 AM'}`,
          rawDate: h.hearingDate,
          title: h.caseTitle || linked?.title || h.suitNumber || 'Scheduled Court Appearance',
          caseCode: h.suitNumber || linked?.suitNumber || linked?.case_number || 'HCT-2026',
          courtDivision:
            h.courtRoom || h.courtName || h.division || linked?.court || 'High Court Commercial Division',
          linkedCase: linked,
          searchFields: [
            h.id,
            h.caseId,
            h.suitNumber,
            h.caseTitle,
            h.hearingPurpose,
            h.courtName,
            h.courtRoom,
            linked?.id,
            linked?.case_number,
            linked?.firmRefNumber,
            linked?.suitNumber,
            linked?.suit_no,
            linked?.clientName,
            linked?.client,
            linked?.title,
            ...partiesText,
            ...branchTokens,
          ],
        });
      });

    if (items.length < 4 || isGlobalSearchActive) {
      searchMatchedCases
        .filter((c) => !isCaseClosed(c) && (c.nextHearingDate || c.hearing_date))
        .slice(0, isGlobalSearchActive ? 12 : 6)
        .forEach((c) => {
          const code = c.suitNumber || c.firmRefNumber || c.case_number || 'LF-2026';
          if (items.some((i) => i.caseCode === code)) return;
          const dateVal = String(c.nextHearingDate || c.hearing_date).slice(0, 10);
          const matchedBranch = resolveBranchForRecord(c.branchId, c.branch || c.branchName, branches);
          const branchTokens = getBranchSearchTokens(
            c.branchId || matchedBranch?.id,
            c.branchName || c.branch || matchedBranch?.name,
            matchedBranch?.city
          );
          const partiesText = Array.isArray(c.parties)
            ? c.parties.map((p) => p?.name || '').filter(Boolean)
            : [];
          items.push({
            id: `case-hr-${c.id}`,
            badge: c.nextHearingPurpose || c.stage || 'Mention / Hearing',
            dateTime: `${dateVal} · 09:00 AM`,
            rawDate: dateVal,
            title: c.title || c.clientName || c.client || 'Active Litigation Matter',
            caseCode: code,
            courtDivision: c.court || c.division || `${c.branchName || activeBranchLabel} Registry`,
            linkedCase: c,
            searchFields: [
              c.id,
              c.case_number,
              c.firmRefNumber,
              c.suitNumber,
              c.suit_no,
              c.clientName,
              c.client,
              c.title,
              c.court,
              c.nextHearingPurpose,
              ...partiesText,
              ...branchTokens,
            ],
          });
        });
    }

    const filtered = isGlobalSearchActive
      ? items.filter((item) => matchesMultiTokenQuery(item.searchFields, trimmedSearchQuery))
      : items;

    return filtered.slice(0, 5);
  }, [
    hearings,
    cases,
    branches,
    searchMatchedCases,
    activeBranchId,
    activeBranchLabel,
    isGlobalSearchActive,
    trimmedSearchQuery,
  ]);

  // Upcoming Cases Table Rows (live-filtered across Case ID, client names & branch codes; supports Litigation | Mortgages)
  const upcomingCasesRows = useMemo(() => {
    const caseRows = searchMatchedCases
      .filter((c) => (isGlobalSearchActive ? true : !isCaseClosed(c)))
      .map((c) => {
        const practice = classifyCasePractice(c);
        const deadline = c.nextHearingDate || c.hearing_date || '';
        const dt = parseDateTile(deadline);
        const primaryClient =
          c.clientName ||
          c.client ||
          (Array.isArray(c.parties) && c.parties.length > 0 ? c.parties[0].name : '') ||
          'Firm Client';
        const matchedBranch = resolveBranchForRecord(c.branchId, c.branch || c.branchName, branches);
        const branchCode = getBranchCode(
          c.branchId || matchedBranch?.id,
          c.branchName || c.branch || matchedBranch?.name,
          matchedBranch?.city
        );
        return {
          id: c.id,
          code: c.suitNumber || c.firmRefNumber || c.case_number || c.id || 'MK-MATTER',
          title: c.title || primaryClient,
          client: primaryClient,
          practice,
          practiceLabel: c.case_type || practice,
          branch: c.branchName || c.branch || matchedBranch?.name || activeBranchLabel,
          branchCode,
          stage: c.nextHearingPurpose || c.stage || c.status || 'Active',
          nextDateLabel: deadline ? dt.formatted : 'TBD',
          sortTs: dt.sortTs,
          rawCase: c,
          isMortgage: false,
        };
      });

    const mortgageRows = searchMatchedMortgages.map((m) => {
      const dt = parseDateTile(m.date_of_receipt || m.updated_at || '');
      const branchLabel =
        m.firm_branch_station || m.branch_name || m.bank_branch_station || activeBranchLabel;
      const matchedBranch = resolveBranchForRecord(m.branch_id, branchLabel, branches);
      const branchCode = getBranchCode(
        m.branch_id || matchedBranch?.id,
        branchLabel || matchedBranch?.name,
        matchedBranch?.city
      );
      return {
        id: `mtg-${m.id}`,
        code: m.file_ref || m.mortgage_ref || m.bank_name || 'MTG-FILE',
        title: m.borrower_name || m.mortgagor_name || m.client_name || 'Mortgage Perfection Matter',
        client: m.bank_name || m.client_bank_name || 'Partner Bank',
        practice: 'Mortgages' as const,
        practiceLabel: m.bank_name || 'Mortgages',
        branch: branchLabel,
        branchCode,
        stage: m.status || m.perfection_status || 'In Perfection',
        nextDateLabel: m.date_of_receipt ? dt.formatted : 'Ongoing',
        sortTs: dt.sortTs,
        rawCase: undefined as CaseItem | undefined,
        isMortgage: true,
      };
    });

    const combined =
      activeCaseFilter === 'Mortgages'
        ? [...mortgageRows, ...caseRows.filter((r) => r.practice === 'Mortgages')]
        : caseRows.filter((r) => r.practice !== 'Mortgages');

    const sorted = combined.sort((a, b) => a.sortTs - b.sortTs);
    return sorted.slice(0, isGlobalSearchActive ? 12 : 7);
  }, [
    searchMatchedCases,
    searchMatchedMortgages,
    branches,
    activeCaseFilter,
    isGlobalSearchActive,
    activeBranchLabel,
  ]);

  // Live matter search results banner (top matched cases with match-dimension badges)
  const matchingCases = useMemo(() => {
    if (!isGlobalSearchActive) return [];
    return searchMatchedCases.slice(0, 6);
  }, [isGlobalSearchActive, searchMatchedCases]);

  // Quick Action Modal States
  const defaultCaseId = branchScopedCases[0]?.id || cases[0]?.id || '';
  const [reqPurpose, setReqPurpose] = useState('');
  const [reqAmount, setReqAmount] = useState('');
  const [reqCurrency, setReqCurrency] = useState<'UGX' | 'USD'>('UGX');
  const [reqCaseRef, setReqCaseRef] = useState('');

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
    if (modal === 'document' && !docCaseId) setDocCaseId(defaultCaseId);
    if (modal === 'note' && !noteCaseId) setNoteCaseId(defaultCaseId);
    setActiveModal(modal);
  };

  const handleSubmitRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(reqAmount);
    if (!reqPurpose.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      showCleanMessage('Enter a valid disbursement purpose and amount.', 'warning');
      return;
    }

    const input: CreateCashRequisitionInput = {
      purpose: reqPurpose.trim(),
      amount: parsedAmount,
      currency: reqCurrency,
      branch: activeBranchLabel,
      caseRef: reqCaseRef.trim() || undefined,
      requesterName: effectiveUser?.name || 'Firm Staff',
      requesterRole: effectiveUser?.roleTitle || effectiveUser?.role || 'Staff Member',
    };

    if (onCreateCashRequisition) {
      onCreateCashRequisition(input);
    } else {
      const existing = loadLocalRequisitions();
      const created = buildNewCashRequisition(existing, input);
      saveLocalRequisitions([created, ...existing]);
      void syncCashRequisitionToSupabase(created);
      showCleanMessage(
        `eRequisition ${created.referenceCode} submitted for Level 1 review.`,
        'success'
      );
    }

    setReqPurpose('');
    setReqAmount('');
    setReqCurrency('UGX');
    setReqCaseRef('');
    setActiveModal(null);
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
      setLeaveRefreshKey((k) => k + 1);
      setActiveModal(null);
      showCleanMessage(
        `${leaveType} (${leaveBreakdown.workingDays} working day${leaveBreakdown.workingDays === 1 ? '' : 's'}) submitted for approval.`,
        'success'
      );
    } catch {
      setLeaveReason('');
      setLeaveRefreshKey((k) => k + 1);
      setActiveModal(null);
      showCleanMessage('Leave request recorded and queued for HR approval.', 'success');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const triggerNewCase = () => {
    if (onOpenNewCase) onOpenNewCase();
    else setIsNewCaseModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Standalone fallback header only if mounted outside DashboardLayout */}
      {!hideTopHeader && (
        <header className="sticky top-0 z-20 px-4 py-3 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search Case File # (e.g. LF-2026), Doc Code (e.g. DOC-PLD), or Client..."
              className="w-full h-9 pl-10 pr-8 text-xs sm:text-sm bg-[#F4F6F9] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg text-[#000065] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#000065]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#000065] p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative flex items-center">
            <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
            <select
              aria-label="Active branch context"
              value={activeBranchId}
              onChange={(e) => handleBranchSelect(e.target.value)}
              className="h-9 pl-8 pr-7 text-xs font-semibold bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg text-[#000065] dark:text-slate-200 focus:outline-none focus:border-[#000065] cursor-pointer"
            >
              {resolvedBranchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </header>
      )}

      {/* Live Global Search Results Bar (filters Case ID, Client Names & Branch Codes across the dashboard) */}
      {isGlobalSearchActive && (
        <section className="bg-white dark:bg-slate-900 border border-[#D99B26]/70 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#000065] dark:text-[#E8C06B] flex-wrap">
              <Search className="w-3.5 h-3.5 text-[#D99B26] shrink-0" />
              <span>
                Global search for &ldquo;{trimmedSearchQuery}&rdquo; —{' '}
                <span className="tabular-nums font-bold">{searchMatchedCases.length}</span> case(s),{' '}
                <span className="tabular-nums font-bold">{searchMatchedMortgages.length}</span> mortgage(s),{' '}
                <span className="tabular-nums font-bold">{branchCaseBlocks.length}</span> branch(es)
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="text-xs font-semibold text-slate-500 hover:text-[#000065] dark:hover:text-white inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear search</span>
            </button>
          </div>

          {matchingCases.length === 0 && searchMatchedMortgages.length === 0 && branchCaseBlocks.length === 0 ? (
            <div className="px-3 py-2.5 rounded-lg bg-[#F4F6F9] dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
              No records matched &ldquo;{trimmedSearchQuery}&rdquo; across Case IDs, client names, or branch codes.
            </div>
          ) : (
            matchingCases.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {matchingCases.map((c) => {
                  const matchedBranch = resolveBranchForRecord(c.branchId, c.branch || c.branchName, branches);
                  const branchCode = getBranchCode(
                    c.branchId || matchedBranch?.id,
                    c.branchName || c.branch || matchedBranch?.name,
                    matchedBranch?.city
                  );
                  const matchDims = getCaseMatchDimensions(c, trimmedSearchQuery, branches);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCase(c)}
                      className="text-left p-3 rounded-lg bg-[#F4F6F9] dark:bg-slate-800/70 hover:bg-[#FBF5E8] dark:hover:bg-[#000065]/60 border border-[#E2E8F0] dark:border-slate-700 transition cursor-pointer flex items-start justify-between gap-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-bold text-[#000065] dark:text-[#E8C06B] truncate tabular-nums">
                            {c.suitNumber || c.firmRefNumber || c.case_number || c.id}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#000065] text-[#E8C06B] font-mono text-[10px] font-semibold shrink-0">
                            {branchCode}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate mt-1">
                          {c.title || c.clientName || c.client || 'Active Firm Matter'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {c.clientName || c.client || 'Firm Client'} · {c.status || 'Active'}
                        </p>
                        {matchDims.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {matchDims.map((dim) => (
                              <span
                                key={dim}
                                className="px-1.5 py-0.5 rounded bg-[#FBF5E8] dark:bg-[#D99B26]/15 text-[#9A6B11] dark:text-[#F5D28B] text-[9px] font-semibold uppercase tracking-wider"
                              >
                                {dim}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    </button>
                  );
                })}
              </div>
            )
          )}
        </section>
      )}

      {/* ROW 1 — Top Quick Actions Ribbon (Single Sleek Horizontal Bar) */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,101,0.04)] px-5 py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#000065] to-[#121285] text-[#E8C06B] flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(0,0,101,0.22)]">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold text-[#000065] dark:text-white tracking-tight leading-tight">
              Quick Actions
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-[#D99B26] shrink-0" />
              <span>{activeBranchLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={triggerNewCase}
            className="h-9 px-3.5 rounded-lg bg-[#000065] hover:bg-[#121285] active:bg-[#00004A] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,101,0.22)] hover:shadow-[0_6px_16px_-4px_rgba(0,0,101,0.36)] transition-all duration-200 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-[#E8C06B] shrink-0" />
            <span>New Case File</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickModal('requisition')}
            className="h-9 px-3.5 rounded-lg bg-[#F5F7FB] dark:bg-slate-800 hover:bg-[#000065] hover:text-white text-[#000065] dark:text-slate-200 border border-[#DFE5F2] dark:border-slate-700 hover:border-[#000065] hover:shadow-[0_4px_12px_-3px_rgba(0,0,101,0.25)] text-xs font-semibold inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer whitespace-nowrap group"
          >
            <Banknote className="w-3.5 h-3.5 text-[#B57E1A] group-hover:text-[#E8C06B] transition-colors duration-200 shrink-0" />
            <span>eRequisition</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickModal('document')}
            className="h-9 px-3 rounded-lg bg-[#F5F7FB] dark:bg-slate-800 hover:bg-[#000065] hover:text-white text-[#000065] dark:text-slate-200 border border-[#DFE5F2] dark:border-slate-700 hover:border-[#000065] hover:shadow-[0_4px_12px_-3px_rgba(0,0,101,0.25)] text-xs font-semibold inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer whitespace-nowrap group"
          >
            <Upload className="w-3.5 h-3.5 text-[#000065]/60 dark:text-slate-400 group-hover:text-[#E8C06B] transition-colors duration-200 shrink-0" />
            <span>Upload Doc</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickModal('note')}
            className="h-9 px-3 rounded-lg bg-[#F5F7FB] dark:bg-slate-800 hover:bg-[#000065] hover:text-white text-[#000065] dark:text-slate-200 border border-[#DFE5F2] dark:border-slate-700 hover:border-[#000065] hover:shadow-[0_4px_12px_-3px_rgba(0,0,101,0.25)] text-xs font-semibold inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer whitespace-nowrap group"
          >
            <FileText className="w-3.5 h-3.5 text-[#000065]/60 dark:text-slate-400 group-hover:text-[#E8C06B] transition-colors duration-200 shrink-0" />
            <span>Case Note</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickModal('leave')}
            className="h-9 px-3 rounded-lg bg-[#F5F7FB] dark:bg-slate-800 hover:bg-[#000065] hover:text-white text-[#000065] dark:text-slate-200 border border-[#DFE5F2] dark:border-slate-700 hover:border-[#000065] hover:shadow-[0_4px_12px_-3px_rgba(0,0,101,0.25)] text-xs font-semibold inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer whitespace-nowrap group"
          >
            <CalendarDays className="w-3.5 h-3.5 text-[#000065]/60 dark:text-slate-400 group-hover:text-[#E8C06B] transition-colors duration-200 shrink-0" />
            <span>Request Leave</span>
          </button>
        </div>
      </section>

      {/* ROW 2 — 4 Signed-In Branch Stat Blocks (Pending Cases | Accomplished Cases | Pending Approvals | Vault) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Block 1: Pending Cases */}
        <button
          type="button"
          onClick={() => (onOpenCases ? onOpenCases() : setActiveTab('catalogue'))}
          className="group text-left rounded-xl bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 hover:border-[#000065]/35 dark:hover:border-[#D99B26]/50 hover:bg-gradient-to-br hover:from-white hover:to-[#F2F5FC] dark:hover:from-slate-900 dark:hover:to-[#000065]/20 hover:shadow-[0_12px_26px_-14px_rgba(0,0,101,0.28)] hover:-translate-y-0.5 p-5 flex flex-col justify-between min-h-[130px] transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-[#000065] dark:group-hover:text-slate-200 transition-colors duration-200">
              Pending Cases
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#000065]/[0.07] dark:bg-slate-800 text-[#000065] dark:text-[#D99B26] group-hover:bg-[#000065] group-hover:text-[#E8C06B] flex items-center justify-center shrink-0 transition-colors duration-200">
              <FolderClock className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-2">
            <span className="font-display text-3xl font-bold text-[#000065] dark:text-white tabular-nums tracking-tight leading-none">
              {kpiMetrics.pendingCases}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] tabular-nums">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/70 dark:border-emerald-800/50">
                Active: {kpiMetrics.activePendingCases}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200/70 dark:border-amber-800/50">
                Inactive: {kpiMetrics.inactivePendingCases}
              </span>
            </div>
          </div>
        </button>

        {/* Block 2: Accomplished Cases */}
        <button
          type="button"
          onClick={() => (onOpenCases ? onOpenCases() : setActiveTab('catalogue'))}
          className="group text-left rounded-xl bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 hover:border-[#000065]/35 dark:hover:border-[#D99B26]/50 hover:bg-gradient-to-br hover:from-white hover:to-[#F2F5FC] dark:hover:from-slate-900 dark:hover:to-[#000065]/20 hover:shadow-[0_12px_26px_-14px_rgba(0,0,101,0.28)] hover:-translate-y-0.5 p-5 flex flex-col justify-between min-h-[130px] transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-[#000065] dark:group-hover:text-slate-200 transition-colors duration-200">
              Accomplished Cases
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 group-hover:bg-[#000065] group-hover:text-[#E8C06B] flex items-center justify-center shrink-0 transition-colors duration-200">
              <Award className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-2">
            <span className="font-display text-3xl font-bold text-[#000065] dark:text-white tabular-nums tracking-tight leading-none">
              {kpiMetrics.accomplishedCases}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] tabular-nums flex-wrap justify-end">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/70 dark:border-emerald-800/50">
                Concluded: {kpiMetrics.concludedCases}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#000065] dark:text-slate-200 font-semibold border border-[#DFE5F2] dark:border-slate-700">
                Closed: {kpiMetrics.closedCases}
              </span>
            </div>
          </div>
        </button>

        {/* Block 3: Pending Approvals (RBAC-aware: Approvals for restricted workflow users, Mortgages for general staff) */}
        <button
          type="button"
          onClick={() => {
            if (canAccessRestrictedWorkflow) {
              if (onOpenApprovals) onOpenApprovals();
              else setActiveTab('approvals');
            } else {
              setActiveTab('mortgages');
            }
          }}
          className="group text-left rounded-xl bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 hover:border-[#000065]/35 dark:hover:border-[#D99B26]/50 hover:bg-gradient-to-br hover:from-white hover:to-[#F2F5FC] dark:hover:from-slate-900 dark:hover:to-[#000065]/20 hover:shadow-[0_12px_26px_-14px_rgba(0,0,101,0.28)] hover:-translate-y-0.5 p-5 flex flex-col justify-between min-h-[130px] transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-[#000065] dark:group-hover:text-slate-200 transition-colors duration-200">
              {canAccessRestrictedWorkflow ? 'Pending Approvals' : 'Branch Mortgages'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 group-hover:bg-[#000065] group-hover:text-[#E8C06B] flex items-center justify-center shrink-0 transition-colors duration-200">
              {canAccessRestrictedWorkflow ? (
                <ClipboardList className="w-4 h-4" />
              ) : (
                <Landmark className="w-4 h-4" />
              )}
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-2">
            <span className="font-display text-3xl font-bold text-[#000065] dark:text-white tabular-nums tracking-tight leading-none">
              {canAccessRestrictedWorkflow ? kpiMetrics.approvals : kpiMetrics.mortgagesCount}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                (canAccessRestrictedWorkflow ? kpiMetrics.approvals : kpiMetrics.mortgagesCount) > 0
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/50'
                  : 'bg-[#F5F7FB] dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-[#DFE5F2] dark:border-slate-700'
              }`}
            >
              {canAccessRestrictedWorkflow
                ? kpiMetrics.approvals > 0
                  ? 'Awaiting review'
                  : 'All clear'
                : isGlobalSearchActive
                ? 'Search matched'
                : 'Securities active'}
            </span>
          </div>
        </button>

        {/* Block 4: Vault */}
        <button
          type="button"
          onClick={() => (onOpenDocuments ? onOpenDocuments() : setActiveTab('documents'))}
          className="group text-left rounded-xl bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 hover:border-[#000065]/35 dark:hover:border-[#D99B26]/50 hover:bg-gradient-to-br hover:from-white hover:to-[#F2F5FC] dark:hover:from-slate-900 dark:hover:to-[#000065]/20 hover:shadow-[0_12px_26px_-14px_rgba(0,0,101,0.28)] hover:-translate-y-0.5 p-5 flex flex-col justify-between min-h-[130px] transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-[#000065] dark:group-hover:text-slate-200 transition-colors duration-200">
              Vault
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FBF5E8] dark:bg-[#D99B26]/15 text-[#B57E1A] dark:text-[#D99B26] group-hover:bg-[#000065] group-hover:text-[#E8C06B] flex items-center justify-center shrink-0 transition-colors duration-200">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-2">
            <span className="font-display text-3xl font-bold text-[#000065] dark:text-white tabular-nums tracking-tight leading-none">
              {kpiMetrics.vaultCustody}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#FBF5E8] dark:bg-[#D99B26]/15 text-[#B57E1A] dark:text-[#E8C06B] text-[11px] font-semibold border border-[#D99B26]/30">
              Files in custody
            </span>
          </div>
        </button>
      </section>

      {/* ROW 3 — Asymmetric 2-Column Main Workspace (lg:col-span-8 Left | lg:col-span-4 Right) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (lg:col-span-8 space-y-5): Upcoming Cases Table -> Branch Case Blocks */}
        <div className="lg:col-span-8 space-y-5">
          {/* 1. Upcoming Cases Table */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,101,0.03)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DFE5F2] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-bold text-[#000065] dark:text-white tracking-tight">
                  Upcoming Cases
                </h2>
                <span className="text-xs text-slate-400 font-medium tabular-nums">
                  ({upcomingCasesRows.length})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div
                  role="tablist"
                  aria-label="Filter upcoming cases by practice"
                  className="inline-flex items-center p-0.5 rounded-lg bg-[#EEF1FA] dark:bg-slate-800 border border-[#DFE5F2] dark:border-slate-700"
                >
                  {(['Litigation', 'Mortgages'] as CaseFilterTab[]).map((tab) => {
                    const selected = activeCaseFilter === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setActiveCaseFilter(tab)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                          selected
                            ? 'bg-[#000065] text-white shadow-2xs'
                            : 'text-[#000065]/70 dark:text-slate-400 hover:text-[#000065] hover:bg-white/70 dark:hover:text-slate-200'
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
                  className="group inline-flex items-center gap-1 text-xs font-semibold text-[#000065] dark:text-[#D99B26] hover:text-[#B57E1A] dark:hover:text-[#E8C06B] transition-colors duration-150 cursor-pointer whitespace-nowrap"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {upcomingCasesRows.length === 0 ? (
                <div className="px-6 py-10 text-center space-y-2.5">
                  <p className="text-xs font-semibold text-[#000065] dark:text-white">
                    No upcoming cases found for {activeBranchLabel}.
                  </p>
                  <button
                    type="button"
                    onClick={triggerNewCase}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#000065] hover:bg-[#121285] text-white text-xs font-semibold transition-colors duration-150 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#E8C06B]" />
                    <span>New Case File</span>
                  </button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#DFE5F2] dark:border-slate-800 bg-[#F7F9FD] dark:bg-slate-800/40 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 pl-5 pr-3">Case ID &amp; Matter</th>
                      <th className="py-3 px-3">Practice / Branch</th>
                      <th className="py-3 px-3">Stage / Purpose</th>
                      <th className="py-3 pl-3 pr-5 text-right">Next Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFE5F2]/80 dark:divide-slate-800 text-xs">
                    {upcomingCasesRows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => {
                          if (row.rawCase) setSelectedCase(row.rawCase);
                          else if (row.isMortgage) setActiveTab('mortgages');
                        }}
                        className="group hover:bg-[#F1F4FC] dark:hover:bg-[#000065]/20 transition-colors duration-150 cursor-pointer"
                      >
                        <td className="py-3 pl-5 pr-3 max-w-[270px]">
                          <div className="flex items-center gap-1.5">
                            {row.isMortgage && <Landmark className="w-3.5 h-3.5 text-[#D99B26] shrink-0" />}
                            <span className="font-mono text-[11px] font-semibold text-[#000065] dark:text-[#E8C06B] group-hover:text-[#121285] tabular-nums truncate transition-colors">
                              {row.code}
                            </span>
                          </div>
                          <p className="text-[13px] font-semibold text-[#0F1336] dark:text-slate-100 group-hover:text-[#000065] dark:group-hover:text-white truncate mt-0.5 transition-colors">
                            {row.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {row.client}
                          </p>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{row.practiceLabel}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-[#000065]/[0.07] group-hover:bg-[#000065] text-[#000065] group-hover:text-[#E8C06B] dark:bg-slate-800 dark:text-[#E8C06B] font-mono text-[10px] font-semibold transition-colors duration-150">
                              {row.branchCode}
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                              {row.branch}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F5F7FB] group-hover:bg-white dark:bg-slate-800 text-[#000065] dark:text-slate-200 border border-[#DFE5F2] group-hover:border-[#000065]/25 dark:border-slate-700 max-w-[165px] truncate transition-colors duration-150">
                            {row.stage}
                          </span>
                        </td>
                        <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap tabular-nums text-[#0F1336] dark:text-slate-200 font-semibold">
                          {row.nextDateLabel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* 2. Branch Case Blocks (Other firm stations with live DB-accurate tallies) */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,101,0.03)] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-[#DFE5F2] dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#000065]/[0.07] dark:bg-slate-800 text-[#000065] dark:text-[#D99B26] flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-[#000065] dark:text-white tracking-tight">
                    Branch Case Blocks
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Click any branch block to scope dashboard metrics to that station
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeBranchId !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleBranchSelect('all')}
                    className="text-xs font-semibold text-[#B57E1A] dark:text-[#D99B26] hover:text-[#000065] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Show All Branches
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('branches')}
                  className="group inline-flex items-center gap-1 text-xs font-semibold text-[#000065] dark:text-[#D99B26] hover:text-[#B57E1A] dark:hover:text-[#E8C06B] transition-colors cursor-pointer"
                >
                  <span>Directory</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            {branchCaseBlocks.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-[#F5F7FB] dark:bg-slate-800/40 border border-dashed border-[#DFE5F2] dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                {isGlobalSearchActive
                  ? `No other branches matched “${trimmedSearchQuery}”. Try searching a branch code (e.g. MSK-REG, MBR-REG), Case ID, or client name.`
                  : 'No other firm branches are currently listed.'}
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {branchCaseBlocks.map((branch) => {
                const isSelected = activeBranchId.toLowerCase() === branch.id.toLowerCase();
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => handleBranchSelect(isSelected ? 'all' : branch.id)}
                    className={`group text-left rounded-xl p-4 border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#000065] to-[#121285] text-white border-[#000065] shadow-[0_12px_26px_-10px_rgba(0,0,101,0.45)]'
                        : 'bg-[#F6F8FC] dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border-[#DFE5F2] dark:border-slate-700 hover:border-[#000065]/40 hover:shadow-[0_10px_24px_-14px_rgba(0,0,101,0.28)] hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p
                            className={`font-display text-[13px] font-bold truncate ${
                              isSelected ? 'text-white' : 'text-[#000065] dark:text-white'
                            }`}
                          >
                            {branch.name}
                          </p>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold shrink-0 transition-colors duration-200 ${
                              isSelected
                                ? 'bg-[#D99B26]/25 text-[#F5D28B]'
                                : 'bg-[#000065]/[0.08] group-hover:bg-[#000065] text-[#000065] group-hover:text-[#E8C06B] dark:bg-slate-700 dark:text-[#E8C06B]'
                            }`}
                          >
                            {branch.code}
                          </span>
                        </div>
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? 'text-[#E8C06B]' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {branch.isHeadquarters ? 'Head Office' : `${branch.city} Station`}
                        </p>
                      </div>
                      <span
                        className={`font-display text-lg font-bold tabular-nums leading-none shrink-0 ${
                          isSelected ? 'text-[#E8C06B]' : 'text-[#000065] dark:text-white'
                        }`}
                      >
                        {branch.total}
                      </span>
                    </div>

                    <div
                      className={`pt-2.5 border-t grid grid-cols-3 gap-2 text-[11px] tabular-nums ${
                        isSelected ? 'border-white/15' : 'border-[#DFE5F2] dark:border-slate-700'
                      }`}
                    >
                      <div>
                        <p className={isSelected ? 'text-blue-200/80' : 'text-slate-500 dark:text-slate-400'}>
                          Pending
                        </p>
                        <p className={`font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-[#000065] dark:text-slate-100'}`}>
                          {branch.pending}
                        </p>
                      </div>
                      <div>
                        <p className={isSelected ? 'text-blue-200/80' : 'text-slate-500 dark:text-slate-400'}>
                          Closed
                        </p>
                        <p className={`font-bold mt-0.5 ${isSelected ? 'text-emerald-300' : 'text-emerald-700 dark:text-emerald-400'}`}>
                          {branch.accomplished}
                        </p>
                      </div>
                      <div>
                        <p className={isSelected ? 'text-blue-200/80' : 'text-slate-500 dark:text-slate-400'}>
                          Mortgages
                        </p>
                        <p className={`font-bold mt-0.5 ${isSelected ? 'text-[#E8C06B]' : 'text-[#B57E1A] dark:text-[#D99B26]'}`}>
                          {branch.mortgages}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN (lg:col-span-4 space-y-5): 1) Firm Announcements -> 2) Staff Birthdays & Wishes -> 3) Staff on Leave (Firm-Wide) */}
        <div className="lg:col-span-4 space-y-5">
          {/* 1. Firm Announcements (live feed, capped to 2 latest) */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,101,0.03)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#DFE5F2] dark:border-slate-800 bg-[#F8FAFE] dark:bg-slate-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Megaphone className="w-4 h-4 text-[#000065] dark:text-[#D99B26] shrink-0" />
                <h2 className="font-display text-sm font-bold text-[#000065] dark:text-white tracking-tight truncate">
                  Firm Announcements
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('announcements')}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#000065] hover:text-[#121285] dark:text-[#E8C06B] dark:hover:text-[#F5D28B] transition-colors shrink-0 cursor-pointer"
              >
                <span>Post / View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#DFE5F2]/80 dark:divide-slate-800">
              {firmAnnouncements.slice(0, 2).map((notice) => (
                <article
                  key={notice.id}
                  onClick={() => setActiveTab('announcements')}
                  className={`px-4 py-3.5 space-y-1.5 transition-colors duration-150 cursor-pointer ${
                    notice.pinned
                      ? 'bg-[#FBF7EE] hover:bg-[#F7F0DF] dark:bg-[#D99B26]/[0.06] dark:hover:bg-[#D99B26]/[0.10]'
                      : 'hover:bg-[#F5F7FC] dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {notice.pinned && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#000065] text-[#E8C06B] shrink-0">
                          <Pin className="w-2.5 h-2.5" />
                          Pinned
                        </span>
                      )}
                      {notice.priority === 'Urgent' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 shrink-0">
                          Urgent
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                        {notice.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                      {formatAnnouncementTimestamp(notice.createdAtIso, notice.date)}
                    </span>
                  </div>
                  <h3 className="font-display text-xs font-bold text-[#000065] dark:text-white leading-snug">
                    {notice.title}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {notice.body}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate pt-0.5">
                    {notice.issuer} · {notice.branchScope}
                  </p>
                </article>
              ))}
            </div>
          </div>

          {/* 2. Staff Birthdays & Wishes (with Super Admin LockedBirthdayWidget + Live Wishes) */}
          {isSuperAdmin && (
            <LockedBirthdayWidget
              currentUser={effectiveUser}
              onOpenHrModule={() => (onOpenHrModule ? onOpenHrModule() : setActiveTab('hr'))}
            />
          )}

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,101,0.03)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#DFE5F2] dark:border-slate-800 bg-[#F8FAFE] dark:bg-slate-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Cake className="w-4 h-4 text-[#D99B26] shrink-0" />
                <h2 className="font-display text-sm font-bold text-[#000065] dark:text-white tracking-tight truncate">
                  Staff Birthdays &amp; Wishes
                </h2>
              </div>
              {loadingBirthdays && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />}
            </div>

            <div className="divide-y divide-[#DFE5F2]/80 dark:divide-slate-800">
              {celebrants.map((celebrant) => {
                const isWishOpen = activeWishId === celebrant.id;
                return (
                  <div key={celebrant.id} className="p-4 space-y-2.5 hover:bg-[#F7F9FD] dark:hover:bg-slate-800/35 transition-colors duration-150">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#000065] to-[#121285] text-[#E8C06B] text-[11px] font-display font-bold flex items-center justify-center shrink-0">
                          {getInitials(celebrant.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#000065] dark:text-white truncate">
                            {celebrant.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            <span
                              className={
                                celebrant.isToday || celebrant.isWithinThreeDays
                                  ? 'font-semibold text-[#B57E1A] dark:text-[#D99B26]'
                                  : ''
                              }
                            >
                              {celebrant.dateLabel}
                            </span>
                            {' · '}
                            {celebrant.role}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveWishId(isWishOpen ? null : celebrant.id);
                          setWishDraft('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#F5F7FB] dark:bg-slate-800 hover:bg-[#000065] hover:text-white border border-[#DFE5F2] dark:border-slate-700 hover:border-[#000065] text-[11px] font-semibold text-[#000065] dark:text-slate-200 transition-all duration-150 cursor-pointer shrink-0"
                      >
                        {isWishOpen ? 'Close' : 'Wish'}
                      </button>
                    </div>

                    {isWishOpen && (
                      <div className="flex items-center gap-2">
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
                          placeholder={`Wish ${celebrant.name.split(' ')[0]}...`}
                          className="flex-1 h-8 px-2.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-[#DFE5F2] dark:border-slate-700 text-[#0F1336] dark:text-slate-100 focus:outline-none focus:border-[#000065] focus:ring-2 focus:ring-[#000065]/12 transition-all duration-150"
                        />
                        <button
                          type="button"
                          disabled={sendingWishId === celebrant.id || !wishDraft.trim()}
                          onClick={() => void handleSendBirthdayWish(celebrant)}
                          className="h-8 px-2.5 rounded-lg bg-[#000065] hover:bg-[#121285] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors duration-150 cursor-pointer shrink-0"
                        >
                          {sendingWishId === celebrant.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3 text-[#E8C06B]" />
                          )}
                        </button>
                      </div>
                    )}

                    {celebrant.wishes.length > 0 && (
                      <div className="space-y-1.5">
                        {celebrant.wishes.slice(0, 2).map((w) => (
                          <div
                            key={w.id}
                            className="px-2.5 py-1.5 rounded-lg bg-[#F5F7FB] dark:bg-slate-800/60 border border-[#DFE5F2]/80 dark:border-slate-700/70 text-[11px]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-[#000065] dark:text-slate-200">{w.sender}</span>
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

          {/* 3. Staff on Leave (Firm-Wide across all branches + next working return date) */}
          <StaffOnLeaveCard
            searchQuery={trimmedSearchQuery}
            refreshKey={leaveRefreshKey}
            canOpenHrModule={canAccessRestrictedWorkflow}
            onOpenHrModule={() => (onOpenHrModule ? onOpenHrModule() : setActiveTab('hr'))}
            onRequestLeave={() => openQuickModal('leave')}
          />
        </div>
      </section>

      {/* IN-PLACE QUICK ACTION MODALS */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000065]/60 backdrop-blur-xs"
          onClick={() => setActiveModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xl overflow-hidden"
          >
            {activeModal === 'requisition' && (
              <form onSubmit={handleSubmitRequisition}>
                <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-[#D99B26]" />
                    <h3 className="font-display text-sm font-bold text-[#000065] dark:text-white">
                      New eRequisition
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#000065] cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-4 text-xs">
                  <div className="px-3 py-2 rounded-lg bg-[#F4F6F9] dark:bg-slate-800/70 border border-[#E2E8F0] dark:border-slate-700 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      Requester: <strong className="text-[#000065] dark:text-white">{effectiveUser?.name || 'Firm Staff'}</strong>
                    </span>
                    <span className="font-semibold text-[#000065] dark:text-[#E8C06B]">
                      {activeBranchLabel}
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Disbursement Purpose / Particulars
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={reqPurpose}
                      onChange={(e) => setReqPurpose(e.target.value)}
                      placeholder="e.g. Court filing fees, process service, registry search stamps, or witness facilitation..."
                      className="w-full p-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#000065] dark:text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3.5">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Currency
                      </label>
                      <select
                        value={reqCurrency}
                        onChange={(e) => setReqCurrency(e.target.value as 'UGX' | 'USD')}
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#000065] dark:text-slate-100"
                      >
                        <option value="UGX">UGX</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Amount
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        required
                        value={reqAmount}
                        onChange={(e) => setReqAmount(e.target.value)}
                        placeholder="e.g. 250000"
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#000065] dark:text-slate-100 tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Linked Matter / Case Reference (Optional)
                    </label>
                    <select
                      value={reqCaseRef}
                      onChange={(e) => setReqCaseRef(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#000065] dark:text-slate-100"
                    >
                      <option value="">General Office / Non-Matter Expense</option>
                      {cases.slice(0, 60).map((c) => {
                        const code = c.suitNumber || c.firmRefNumber || c.case_number || c.id;
                        return (
                          <option key={c.id} value={code}>
                            {code} — {c.title}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                <div className="px-5 py-3.5 bg-[#F4F6F9] dark:bg-slate-800/50 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    {canAccessRestrictedWorkflow && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal(null);
                          if (onOpenCashRequisitions) onOpenCashRequisitions();
                          else setActiveTab('cash_requisitions');
                        }}
                        className="text-xs font-semibold text-[#000065] dark:text-[#D99B26] hover:underline cursor-pointer"
                      >
                        Open All eRequisitions →
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="h-9 px-4 rounded-lg bg-[#000065] hover:bg-[#0F0F80] text-white text-xs font-semibold cursor-pointer"
                    >
                      Submit eRequisition
                    </button>
                  </div>
                </div>
              </form>
            )}

            {activeModal === 'document' && (
              <form onSubmit={handleSubmitDocument}>
                <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-[#000065] dark:text-white">
                    Upload Document to Registry
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#000065] cursor-pointer"
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
                      className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#F4F6F9] file:text-[#000065] cursor-pointer"
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
                    className="h-9 px-4 rounded-lg bg-[#000065] hover:bg-[#0F0F80] text-white text-xs font-semibold cursor-pointer"
                  >
                    Index Document
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'note' && (
              <form onSubmit={handleSubmitCaseNote}>
                <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-[#000065] dark:text-white">
                    New Case Note
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#000065] cursor-pointer"
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
                    className="h-9 px-4 rounded-lg bg-[#000065] hover:bg-[#0F0F80] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                  >
                    {submittingNote ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'leave' && (
              <form onSubmit={handleSubmitLeaveRequest}>
                <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-[#000065] dark:text-white">
                    Request Leave
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#000065] cursor-pointer"
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
                          <span className="font-semibold text-[#000065] dark:text-white">
                            Deductible Working Days
                          </span>
                          <span className="font-display text-sm font-bold text-[#000065] dark:text-[#D99B26] tabular-nums">
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
                    className="h-9 px-4 rounded-lg bg-[#000065] hover:bg-[#0F0F80] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
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
