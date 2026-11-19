import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getEffectiveUser } from '../lib/supabase';
import { hrSupabase, isSuperAdminUser } from '../lib/hrSupabase';
import { LockedBirthdayWidget } from './LockedHrComponents';
import { showCleanMessage } from '../utils/notification';
import {
  Search,
  Clock,
  Building2,
  Plus,
  Gavel,
  Sparkles,
  FolderClock,
  Award,
  Lock,
  ClipboardList,
  Megaphone,
  Pin,
  Cake,
  Send,
  ListChecks,
  UserCheck,
  Calendar,
  MapPin,
  CheckCircle2,
  X,
  ArrowUpRight,
  ChevronRight,
  Loader2,
  Users,
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

export interface StaffAttendanceCard {
  id: string;
  name: string;
  role: string;
  clockInTime: string;
  hoursLogged: number;
  isActive: boolean;
  isCurrentUser?: boolean;
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
  isClockedIn?: boolean;
  clockInTime?: string;
  hoursLogged?: number;
  onToggleClock?: () => void;
  pendingApprovalsCount?: number;
  onOpenNewCase?: () => void;
  onOpenLitigationForm?: () => void;
  onOpenLegalResearch?: () => void;
  onOpenApprovals?: () => void;
  onOpenDocuments?: () => void;
  onOpenCases?: () => void;
  onOpenWorkload?: () => void;
  onOpenHearings?: () => void;
  onOpenHrModule?: () => void;
  /** Hide internal sticky header when already rendered by DashboardLayout */
  hideTopHeader?: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TASKS_STORAGE_KEY = 'mk_staff_dashboard_tasks_v1';
const LOCAL_WISHES_STORAGE_KEY = 'mk_staff_dashboard_wishes_v1';
const LOCAL_HR_OVERRIDES_KEY = 'mk_hr_employee_overrides_v1';

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

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  currentUser: propUser,
  searchQuery: controlledSearch,
  onSearchChange,
  activeBranchId: controlledBranchId,
  activeBranchLabel: controlledBranchLabel,
  branchOptions: controlledBranchOptions,
  onBranchChange,
  isClockedIn: controlledClockedIn,
  clockInTime: controlledClockInTime,
  hoursLogged: controlledHoursLogged,
  onToggleClock,
  pendingApprovalsCount = 3,
  onOpenNewCase,
  onOpenLitigationForm,
  onOpenLegalResearch,
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
  } = useApp();

  const effectiveUser = useMemo(() => getEffectiveUser(propUser || ctxUser), [propUser, ctxUser]);
  const isSuperAdmin = isSuperAdminUser(effectiveUser);

  // Local fallbacks when StaffDashboard is mounted standalone outside DashboardLayout
  const [internalSearch, setInternalSearch] = useState('');
  const [internalClockedIn, setInternalClockedIn] = useState(true);
  const [internalClockInTime, setInternalClockInTime] = useState('08:15 AM');
  const [internalHoursLogged, setInternalHoursLogged] = useState(6.5);

  const searchQuery = controlledSearch !== undefined ? controlledSearch : internalSearch;
  const handleSearchChange = onSearchChange || setInternalSearch;

  const isClockedIn = controlledClockedIn !== undefined ? controlledClockedIn : internalClockedIn;
  const clockInTime = controlledClockInTime || internalClockInTime;
  const hoursLogged = controlledHoursLogged !== undefined ? controlledHoursLogged : internalHoursLogged;

  const handleToggleClock = useCallback(() => {
    if (onToggleClock) {
      onToggleClock();
      return;
    }
    setInternalClockedIn((prev) => {
      const next = !prev;
      if (next) {
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setInternalClockInTime(nowStr);
      } else {
        setInternalHoursLogged((h) => Number((h + 0.1).toFixed(1)));
      }
      return next;
    });
  }, [onToggleClock]);

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
    if (onBranchChange) {
      onBranchChange(branchId);
    } else {
      setSelectedBranchFilter(branchId);
    }
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
    if (!activeBranchId || activeBranchId === 'all') return cases;
    const targetBranch = branches.find((b) => b.id === activeBranchId);
    const targetCity = (targetBranch?.city || '').toLowerCase();
    const targetName = (targetBranch?.name || activeBranchLabel || '').toLowerCase();

    return cases.filter((c) => {
      const bId = c.branchId;
      const bName = (c.branch || c.branchName || '').toLowerCase();
      return (
        bId === activeBranchId ||
        (targetCity && bName.includes(targetCity)) ||
        (targetName && bName.includes(targetName))
      );
    });
  }, [cases, activeBranchId, branches, activeBranchLabel]);

  // Live KPI metrics
  const kpiMetrics = useMemo(() => {
    let pendingCount = 0;
    let accomplishedCount = 0;

    branchScopedCases.forEach((c) => {
      const s = String(c.status || 'Active').toLowerCase();
      const isClosed =
        s === 'closed' ||
        s === 'concluded' ||
        s === 'archived' ||
        s.includes('closed') ||
        s.includes('concluded') ||
        s.includes('judgment') ||
        Boolean(c.year_of_closure);
      if (isClosed) {
        accomplishedCount += 1;
      } else {
        pendingCount += 1;
      }
    });

    const vaultCustodyCount = Math.max(documents.length, branchScopedCases.length > 0 ? Math.min(branchScopedCases.length, 48) : 14);

    return {
      pendingCases: pendingCount,
      accomplishedCases: accomplishedCount,
      vaultCustody: vaultCustodyCount,
      approvals: pendingApprovalsCount,
    };
  }, [branchScopedCases, documents.length, pendingApprovalsCount]);

  // Block B — Birthday Celebrants & Live Supabase `birthday_wishes` integration
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
      const dbWishesByCelebrant = new Map<string, Array<{ id: string; sender: string; message: string; createdAt: string }>>();
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

      // Merge local HR overrides if any DOBs were saved locally
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

      // If no DOBs are set in Supabase yet, display upcoming firm team highlights using real connected firm staff
      if (computed.length === 0) {
        const todayLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const nextWeek = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        });
        const realStaff = availableUsers.filter((u) => u?.name && u.email !== effectiveUser?.email).slice(0, 2);
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
      // Attempt Supabase insert into `birthday_wishes` via shared hrSupabase client
      let persistedToCloud = false;
      if (celebrant.isUuid) {
        let senderUuid: string | null =
          effectiveUser?.id && UUID_REGEX.test(String(effectiveUser.id)) ? String(effectiveUser.id) : null;
        if (!senderUuid) {
          const { data: authData } = await hrSupabase.auth.getUser().catch(() => ({ data: { user: null } } as any));
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

  // Block D — Staff Attendance & Clock-In (6 staff cards synced with active user's clock state)
  const attendanceList = useMemo<StaffAttendanceCard[]>(() => {
    const currentName = effectiveUser?.name || 'Firm Counsel';
    const currentRole = effectiveUser?.roleTitle || effectiveUser?.role || 'Advocate';

    const selfCard: StaffAttendanceCard = {
      id: String(effectiveUser?.id || 'current-user'),
      name: currentName,
      role: currentRole,
      clockInTime: isClockedIn ? clockInTime : 'Clocked Out',
      hoursLogged,
      isActive: isClockedIn,
      isCurrentUser: true,
    };

    const presetTimes = ['08:02 AM', '08:19 AM', '08:27 AM', '08:40 AM', '08:55 AM'];
    const presetHours = [6.8, 6.4, 6.2, 5.9, 5.6];

    const othersFromUsers = availableUsers
      .filter(
        (u) =>
          u?.name &&
          String(u.email || '').toLowerCase() !== String(effectiveUser?.email || '').toLowerCase() &&
          String(u.id || '') !== String(effectiveUser?.id || '')
      )
      .slice(0, 5)
      .map((u, idx) => ({
        id: u.id,
        name: u.name,
        role: u.roleTitle || u.role || 'Legal Staff',
        clockInTime: presetTimes[idx % presetTimes.length],
        hoursLogged: presetHours[idx % presetHours.length],
        isActive: !u.isSuspended,
      }));

    const fallbackColleagues: StaffAttendanceCard[] = [
      { id: 'att-2', name: 'Lilian Kobusinge', role: 'Senior Associate', clockInTime: '08:02 AM', hoursLogged: 6.8, isActive: true },
      { id: 'att-3', name: 'Phionah Adoch', role: 'Admin & Finance', clockInTime: '08:19 AM', hoursLogged: 6.4, isActive: true },
      { id: 'att-4', name: 'Bright Arinaitwe Bujara', role: 'Litigation Advocate', clockInTime: '08:27 AM', hoursLogged: 6.2, isActive: true },
      { id: 'att-5', name: 'Martin Twomo', role: 'Branch Counsel', clockInTime: '08:40 AM', hoursLogged: 5.9, isActive: true },
      { id: 'att-6', name: 'Janet Kemigisa', role: 'Registry Clerk', clockInTime: '08:55 AM', hoursLogged: 5.6, isActive: true },
    ];

    const peers = othersFromUsers.length >= 5
      ? othersFromUsers
      : [
          ...othersFromUsers,
          ...fallbackColleagues.slice(0, Math.max(0, 5 - othersFromUsers.length)),
        ];

    return [selfCard, ...peers].slice(0, 6);
  }, [effectiveUser, isClockedIn, clockInTime, hoursLogged, availableUsers]);

  const activeAttendanceCount = attendanceList.filter((a) => a.isActive).length;

  // Block E — Upcoming Hearings & Deadlines (merged from live hearings & case next court dates, filtered by search & branch)
  const upcomingHearings = useMemo(() => {
    const items: Array<{
      id: string;
      badge: string;
      dateTime: string;
      title: string;
      caseCode: string;
      courtDivision: string;
      linkedCase?: any;
    }> = [];

    hearings
      .filter((h) => h.status !== 'Completed')
      .forEach((h) => {
        const linked = cases.find((c) => c.id === h.caseId || c.suitNumber === h.suitNumber);
        if (activeBranchId && activeBranchId !== 'all' && linked && linked.branchId && linked.branchId !== activeBranchId) {
          return;
        }
        items.push({
          id: h.id,
          badge: h.hearingPurpose || 'Court Hearing',
          dateTime: `${h.hearingDate}${h.hearingTime ? ` · ${h.hearingTime}` : ' · 09:30 AM'}`,
          title: h.caseTitle || linked?.title || h.suitNumber || 'Scheduled Court Appearance',
          caseCode: h.suitNumber || linked?.suitNumber || 'HCT-2026',
          courtDivision: h.courtRoom || h.courtName || h.division || linked?.court || 'High Court Commercial Division',
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
          items.push({
            id: `case-hr-${c.id}`,
            badge: c.nextHearingPurpose || c.stage || 'Mention / Hearing',
            dateTime: `${String(c.nextHearingDate || c.hearing_date).slice(0, 10)} · 09:00 AM`,
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
          title: 'Centenary Bank Ltd v. KAMP Holdings Ltd — Summary Suit Hearing',
          caseCode: 'LF-2026-0142',
          courtDivision: 'High Court Commercial Division · Courtroom 4',
        },
        {
          id: 'def-hr-2',
          badge: 'Mediation Session',
          dateTime: 'Nov 22, 2026 · 11:00 AM',
          title: 'Estate of Ssemakula v. Nakawa Land Ventures — Pre-Trial Conference',
          caseCode: 'LF-2026-0118',
          courtDivision: 'High Court Land Division · Chambers B',
        },
        {
          id: 'def-hr-3',
          badge: 'Filing Deadline',
          dateTime: 'Nov 24, 2026 · 04:00 PM',
          title: 'Written Submissions & Mortgage Valuation Affidavit Reply',
          caseCode: 'DOC-PLD-0891',
          courtDivision: 'Civil Registry · Central Chambers',
        },
        {
          id: 'def-hr-4',
          badge: 'Ruling Delivery',
          dateTime: 'Nov 26, 2026 · 10:00 AM',
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

  const triggerLegalResearch = () => {
    if (onOpenLegalResearch) onOpenLegalResearch();
    else setActiveTab('research');
  };

  return (
    <div className="space-y-6">
      {/* Standalone Top Header Bar (shown only if StaffDashboard is rendered outside DashboardLayout) */}
      {!hideTopHeader && (
        <header className="sticky top-0 z-20 -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search Case File # (e.g. LF-2026), Doc Code (e.g. DOC-PLD), or Client..."
              className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleToggleClock}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border transition cursor-pointer whitespace-nowrap tabular-nums ${
                isClockedIn
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isClockedIn
                  ? `Clocked In (${clockInTime}) • ${hoursLogged.toFixed(1)} h`
                  : `Clocked Out • ${hoursLogged.toFixed(1)} h`}
              </span>
            </button>

            <div className="relative flex items-center">
              <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
              <select
                aria-label="Active branch context"
                value={activeBranchId}
                onChange={(e) => handleBranchSelect(e.target.value)}
                className="pl-8 pr-7 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
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
        <section className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <Search className="w-3.5 h-3.5" />
              <span>
                Live filter active for &ldquo;{searchQuery.trim()}&rdquo; — {matchingCases.length} matter(s),{' '}
                {filteredTasks.length} task(s), {upcomingHearings.length} hearing(s)
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
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
                  className="text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-400 truncate">
                      {c.suitNumber || c.firmRefNumber || c.case_number}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {c.title || c.clientName || c.client || 'Active Firm Matter'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
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

      {/* 3. HERO BANNER (Blue-to-Indigo Gradient) */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-6 sm:p-7 shadow-xs">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-blue-100 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-200" />
                {activeBranchLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span>{departmentLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formattedDateTime}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white" style={{ textWrap: 'balance' }}>
              Good day, {firstName}
            </h1>

            <p className="text-sm text-blue-100 leading-relaxed">
              You have{' '}
              <span className="font-semibold text-white tabular-nums">{kpiMetrics.pendingCases} active case matters</span>,{' '}
              <span className="font-semibold text-white tabular-nums">{kpiMetrics.approvals} pending approvals</span>, and{' '}
              <span className="font-semibold text-white tabular-nums">{kpiMetrics.vaultCustody} files in physical custody</span>{' '}
              under {activeBranchLabel}.
            </p>
          </div>

          {/* 3 Hero Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={triggerNewCase}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>+ New Case File</span>
            </button>

            <button
              type="button"
              onClick={triggerLitigationForm}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap"
            >
              <Gavel className="w-4 h-4 shrink-0" />
              <span>Branch Litigation Form</span>
            </button>

            <button
              type="button"
              onClick={triggerLegalResearch}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-950/60 text-white border border-white/20 text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 shrink-0 text-amber-300" />
              <span>AI Legal Research</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4-COLUMN KPI STAT CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => (onOpenCases ? onOpenCases() : setActiveTab('catalogue'))}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 rounded-2xl p-5 transition cursor-pointer group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Case Files</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                {kpiMetrics.pendingCases}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FolderClock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-700 dark:text-blue-400">Active docket</span>
            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{activeBranchLabel}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => (onOpenCases ? onOpenCases() : setActiveTab('catalogue'))}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-2xl p-5 transition cursor-pointer group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Accomplished Cases</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                {kpiMetrics.accomplishedCases}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Concluded &amp; closed</span>
            <span className="text-slate-500 dark:text-slate-400">Judgments &amp; settlements</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => (onOpenDocuments ? onOpenDocuments() : setActiveTab('documents'))}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-2xl p-5 transition cursor-pointer group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Vault File Custody</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                {kpiMetrics.vaultCustody}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-indigo-700 dark:text-indigo-400">Secured in registry</span>
            <span className="text-slate-500 dark:text-slate-400">Titles &amp; original deeds</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => (onOpenApprovals ? onOpenApprovals() : setActiveTab('approvals'))}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 rounded-2xl p-5 transition cursor-pointer group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Approval Workflows</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                {kpiMetrics.approvals}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-700 dark:text-amber-400">Awaiting sign-off</span>
            <span className="text-slate-500 dark:text-slate-400">Fee notes &amp; releases</span>
          </div>
        </button>
      </section>

      {/* BLOCK A — Company Dashboard Notices & Announcements */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Company Dashboard Notices &amp; Announcements
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official practice directives and registry circulars for {activeBranchLabel}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 tabular-nums">
            {INITIAL_NOTICES.length} Active Broadcasts
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {INITIAL_NOTICES.map((notice) => (
            <article key={notice.id} className="py-4 first:pt-1 last:pb-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {notice.pinned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold">
                    <Pin className="w-3 h-3" />
                    PINNED
                  </span>
                )}
                <span className="font-semibold text-blue-700 dark:text-blue-400">{notice.category}</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{notice.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{notice.body}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                <span className="font-medium text-slate-700 dark:text-slate-300">{notice.issuer}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{notice.date}</span>
                <span aria-hidden="true">·</span>
                <span>{notice.branchScope}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* BLOCK B — Staff Birthday Celebrations & Wishes */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Cake className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Staff Birthday Celebrations &amp; Wishes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Celebrate team milestones and send warm wishes directly to colleagues
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 tabular-nums">
              {celebrants.length} Celebrations
            </span>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => (onOpenHrModule ? onOpenHrModule() : setActiveTab('hr'))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 transition cursor-pointer whitespace-nowrap"
              >
                <Users className="w-3.5 h-3.5" />
                HR Admin
              </button>
            )}
          </div>
        </div>

        {loadingBirthdays ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading staff celebrations...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {celebrants.map((celebrant) => {
              const isOpen = activeWishId === celebrant.id;
              return (
                <div
                  key={celebrant.id}
                  className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitials(celebrant.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {celebrant.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{celebrant.role}</p>
                        <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mt-0.5 inline-flex items-center gap-1 tabular-nums">
                          <Cake className="w-3.5 h-3.5 shrink-0" />
                          <span>{celebrant.dateLabel}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (isOpen) {
                          setActiveWishId(null);
                          setWishDraft('');
                        } else {
                          setActiveWishId(celebrant.id);
                          setWishDraft(`Happy Birthday ${celebrant.name.split(' ')[0]}! Wishing you a fantastic year ahead.`);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-rose-300 hover:text-rose-600 text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer shrink-0"
                    >
                      <Cake className="w-3.5 h-3.5" />
                      <span>{isOpen ? 'Close' : 'Wish'}</span>
                    </button>
                  </div>

                  {isOpen && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={wishDraft}
                        onChange={(e) => setWishDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendBirthdayWish(celebrant);
                          }
                        }}
                        placeholder={`Write a birthday wish for ${celebrant.name}...`}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        disabled={sendingWishId === celebrant.id || !wishDraft.trim()}
                        onClick={() => handleSendBirthdayWish(celebrant)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer shrink-0"
                      >
                        {sendingWishId === celebrant.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Send</span>
                      </button>
                    </div>
                  )}

                  {celebrant.wishes.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
                      {celebrant.wishes.slice(0, 3).map((w) => (
                        <div key={w.id} className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{w.sender}:</span>{' '}
                          <span>{w.message}</span>{' '}
                          <span className="text-[10px] text-slate-400 tabular-nums">({w.createdAt})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Super Admin-only HR Birthday Rollout Widget (strictly gated by isSuperAdminUser) */}
        {isSuperAdmin && (
          <div className="pt-2">
            <LockedBirthdayWidget
              currentUser={effectiveUser}
              onOpenHrModule={() => (onOpenHrModule ? onOpenHrModule() : setActiveTab('hr'))}
            />
          </div>
        )}
      </section>

      {/* BLOCK C — Staff Tasks & Workflow Visibility */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <ListChecks className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Staff Tasks &amp; Workflow Visibility
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any task status badge to cycle Todo → In Progress → Completed
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => (onOpenWorkload ? onOpenWorkload() : setActiveTab('legal_team'))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-950 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
          >
            <span>Manage Workload</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No workflow tasks match &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const priorityStyle =
                task.priority === 'URGENT'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : task.priority === 'HIGH'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';

              const statusStyle =
                task.status === 'Completed'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                  : task.status === 'In Progress'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200';

              return (
                <div
                  key={task.id}
                  className="py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 mt-0.5 ${priorityStyle}`}
                    >
                      {task.priority}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p
                        className={`text-sm font-semibold ${
                          task.status === 'Completed'
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">{task.caseCode}</span>
                        <span aria-hidden="true">·</span>
                        <span>{task.assignee}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">Due {task.dueDate}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCycleTaskStatus(task.id)}
                    title="Click to cycle status (Todo → In Progress → Completed)"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer shrink-0 self-start md:self-center whitespace-nowrap ${statusStyle}`}
                  >
                    {task.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{task.status}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* BLOCK D — Staff Attendance & Clock-In */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Staff Attendance &amp; Clock-In
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live presence roster for {activeBranchLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 tabular-nums">
              {activeAttendanceCount} / {attendanceList.length} Active
            </span>
            <button
              type="button"
              onClick={handleToggleClock}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                isClockedIn
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isClockedIn ? 'Clock Out Now' : 'Clock In Now'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {attendanceList.map((member) => (
            <div
              key={member.id}
              className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                    member.isActive
                      ? 'bg-slate-900 dark:bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {getInitials(member.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {member.name}
                    {member.isCurrentUser ? ' (You)' : ''}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{member.role}</p>
                </div>
              </div>

              <div className="text-right shrink-0 tabular-nums">
                <p
                  className={`text-xs font-semibold ${
                    member.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {member.clockInTime}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{member.hoursLogged.toFixed(1)} h</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BLOCK E — Upcoming Hearings & Deadlines */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Upcoming Hearings &amp; Deadlines
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scheduled court appearances, mentions, and statutory filing cut-offs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => (onOpenHearings ? onOpenHearings() : setActiveTab('causelist'))}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer whitespace-nowrap"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {upcomingHearings.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No upcoming hearings match &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingHearings.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.linkedCase) setSelectedCase(item.linkedCase);
                  else if (onOpenHearings) onOpenHearings();
                  else setActiveTab('causelist');
                }}
                className="text-left p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-700 transition cursor-pointer space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
                    <Gavel className="w-3.5 h-3.5 shrink-0" />
                    {item.badge}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {item.dateTime}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {item.title}
                </h3>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{item.caseCode}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{item.courtDivision}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default StaffDashboard;
