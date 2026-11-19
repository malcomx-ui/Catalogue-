import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { getEffectiveUser, isUserAdmin } from '../../lib/supabase';
import {
  hrSupabase,
  submitLeaveRequest,
  getStaffLeaveBalances,
  type StaffLeaveBalance,
} from '../../lib/hrSupabase';
import { showCleanMessage } from '../../utils/notification';
import {
  CalendarDays,
  Plus,
  Users,
  ListChecks,
  CalendarClock,
  Gift,
  Mail,
  Clock,
  Send,
  X,
  CheckCircle2,
  XCircle,
  Building2,
  Briefcase,
  Loader2,
  Trash2,
  LayoutList,
  Columns3,
  Cake,
  Search,
  RefreshCw,
} from 'lucide-react';

export interface LegalTeamDashboardProps {
  /** Controlled props synced with DashboardLayout sticky top header */
  searchQuery?: string;
  isClockedIn?: boolean;
  clockInTime?: string;
  hoursLogged?: number;
  onToggleClock?: () => void;
}

type StaffSubTab = 'directory' | 'tasks' | 'leaves';
type TaskStatus = 'Todo' | 'In Progress' | 'Completed';
type TaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM';

interface DelegatedTask {
  id: string;
  priority: TaskPriority;
  title: string;
  caseCode: string;
  assignee: string;
  assigneeEmail?: string;
  branchName?: string;
  dueDate: string;
  status: TaskStatus;
}

interface LeaveRequestRecord {
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

interface StaffMemberCardData {
  id: string;
  name: string;
  email: string;
  roleTitle: string;
  role: string;
  branchId: string;
  branchName: string;
  avatarUrl?: string;
  isActive: boolean;
  isCurrentUser: boolean;
  todaysPunch: string;
  hoursLogged: number;
  hourlyRate: number;
  annualAllowance: number;
  usedLeaveDays: number;
  pendingLeaveDays: number;
  otherLeaveDays: number;
  leaveRemaining: number;
  leaveRemainingPercent: number;
  birthdayEligible: boolean;
  birthdayLabel?: string;
  isUuid: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TASKS_STORAGE_KEY = 'mk_staff_dashboard_tasks_v1';
const LOCAL_LEAVES_STORAGE_KEY = 'mk_staff_leave_requests_v1';
const LOCAL_WISHES_STORAGE_KEY = 'mk_staff_dashboard_wishes_v1';
const LOCAL_HR_OVERRIDES_KEY = 'mk_hr_employee_overrides_v1';

const LEAVE_TYPES = [
  'Annual Leave',
  'Sick Leave',
  'Study Leave',
  'Compassionate Leave',
  'Maternity / Paternity',
  'Unpaid Leave',
];

const DEFAULT_TASKS: DelegatedTask[] = [
  {
    id: 'tsk-1',
    priority: 'URGENT',
    title: 'File Written Submissions & Index of Authorities before Commercial Court',
    caseCode: 'LF-2026-0142',
    assignee: 'Lilian Kobusinge',
    branchName: 'Kampala Central (Head Office)',
    dueDate: 'Today, 04:00 PM',
    status: 'In Progress',
  },
  {
    id: 'tsk-2',
    priority: 'HIGH',
    title: 'Verify Original Mailo Certificate & Mortgage Deed Registration',
    caseCode: 'DOC-PLD-0891',
    assignee: 'Phionah Adoch',
    branchName: 'Kampala Central (Head Office)',
    dueDate: 'Tomorrow, 11:00 AM',
    status: 'Todo',
  },
  {
    id: 'tsk-3',
    priority: 'HIGH',
    title: 'Prepare Witness Statement Bundle & Serve Opposing Counsel',
    caseCode: 'LF-2026-0118',
    assignee: 'Bright Arinaitwe Bujara',
    branchName: 'Kampala Central (Head Office)',
    dueDate: 'Nov 21, 2026',
    status: 'In Progress',
  },
  {
    id: 'tsk-4',
    priority: 'MEDIUM',
    title: 'Reconcile Centenary Bank Disbursement Fee Note & Client Ledger',
    caseCode: 'DOC-FEE-0442',
    assignee: 'Martin Twomo',
    branchName: 'Fort Portal Branch',
    dueDate: 'Nov 23, 2026',
    status: 'Todo',
  },
  {
    id: 'tsk-5',
    priority: 'MEDIUM',
    title: 'Archive Concluded Consent Decree & Update Physical Vault Register',
    caseCode: 'LF-2025-0904',
    assignee: 'Janet Kemigisa',
    branchName: 'Kampala Central (Head Office)',
    dueDate: 'Nov 24, 2026',
    status: 'Completed',
  },
];

const INITIAL_LEAVE_REQUESTS: LeaveRequestRecord[] = [
  {
    id: 'lv-seed-1',
    employee_id: 'seed-emp-1',
    employeeName: 'Lilian Kobusinge',
    employeeEmail: 'lilian.kobusinge@mkadvocates.ug',
    branchName: 'Kampala Central (Head Office)',
    leave_type: 'Annual Leave',
    start_date: '2026-12-07',
    end_date: '2026-12-11',
    days: 5,
    reason: 'Scheduled year-end family travel (all Commercial Court briefs handed over).',
    status: 'Pending',
    created_at: new Date().toISOString(),
  },
  {
    id: 'lv-seed-2',
    employee_id: 'seed-emp-2',
    employeeName: 'Martin Twomo',
    employeeEmail: 'martin.twomo@mkadvocates.ug',
    branchName: 'Fort Portal Branch',
    leave_type: 'Study Leave',
    start_date: '2026-11-26',
    end_date: '2026-11-27',
    days: 2,
    reason: 'Uganda Law Society Continuing Legal Education (CLE) seminar.',
    status: 'Approved',
    created_at: new Date().toISOString(),
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

function calcCalendarDays(start: string, end: string): number {
  if (!start || !end) return 1;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 1;
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function getNextTaskStatus(current: TaskStatus): TaskStatus {
  if (current === 'Todo') return 'In Progress';
  if (current === 'In Progress') return 'Completed';
  return 'Todo';
}

function resolveHourlyRate(role?: string | null, roleTitle?: string | null): number {
  const combined = `${role || ''} ${roleTitle || ''}`.toLowerCase();
  if (combined.includes('partner') || combined.includes('super')) return 850;
  if (combined.includes('team lead') || combined.includes('senior')) return 650;
  if (combined.includes('branch_admin') || combined.includes('branch admin')) return 520;
  if (combined.includes('lawyer') || combined.includes('advocate') || combined.includes('counsel')) return 450;
  if (combined.includes('finance') || combined.includes('admin')) return 280;
  if (combined.includes('clerk')) return 160;
  return 350;
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

function persistLocalWish(
  staffId: string,
  wish: { id: string; sender: string; message: string; createdAt: string }
): void {
  if (typeof window === 'undefined') return;
  try {
    const map = readLocalWishes();
    map[staffId] = [wish, ...(map[staffId] || [])];
    window.localStorage.setItem(LOCAL_WISHES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

function isBirthdayUpcomingWithin30Days(dob?: string | null): { eligible: boolean; label: string } {
  if (!dob) return { eligible: false, label: '' };
  const parts = String(dob).slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return { eligible: false, label: '' };
  const [, month, day] = parts;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), month - 1, day);
  if (next < today) next = new Date(now.getFullYear() + 1, month - 1, day);
  const diffDays = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const label = next.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return { eligible: diffDays <= 30, label: diffDays === 0 ? `${label} (Today)` : label };
}

export const LegalTeamDashboard: React.FC<LegalTeamDashboardProps> = ({
  searchQuery = '',
  isClockedIn = true,
  clockInTime = '08:15 AM',
  hoursLogged = 6.5,
  onToggleClock,
}) => {
  const { availableUsers, cases, branches, currentUser, selectedBranchFilter } = useApp();

  const effectiveUser = useMemo(() => getEffectiveUser(currentUser), [currentUser]);
  const isAdmin = isUserAdmin(effectiveUser);

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<StaffSubTab>('directory');

  // Live Supabase profiles + HR employee DOB enrichment + individual leave balances
  const [supabaseProfiles, setSupabaseProfiles] = useState<any[]>([]);
  const [employeeDobMap, setEmployeeDobMap] = useState<Record<string, string>>({});
  const [fetchedLeaveBalances, setFetchedLeaveBalances] = useState<StaffLeaveBalance[]>([]);
  const [leaveBalancesById, setLeaveBalancesById] = useState<Record<string, StaffLeaveBalance>>({});
  const [leaveBalancesByEmail, setLeaveBalancesByEmail] = useState<Record<string, StaffLeaveBalance>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [hasCloudLeavesLoaded, setHasCloudLeavesLoaded] = useState(false);
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'healthy' | 'low'>('all');

  // Birthday wishes inline composer state
  const [openWishStaffId, setOpenWishStaffId] = useState<string | null>(null);
  const [wishDraft, setWishDraft] = useState('');
  const [sendingWishId, setSendingWishId] = useState<string | null>(null);
  const [wishesByStaff, setWishesByStaff] = useState<
    Record<string, Array<{ id: string; sender: string; message: string; createdAt: string }>>
  >(() => readLocalWishes());

  // Workflow & Tasks state (shared localStorage key with StaffDashboard Block C)
  const [tasks, setTasks] = useState<DelegatedTask[]>(() => {
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
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'board'>('list');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<'ALL' | TaskPriority>('ALL');

  // Leave Management state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(LOCAL_LEAVES_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return INITIAL_LEAVE_REQUESTS;
  });

  // Modals: Apply for Leave & Delegate Task
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    staffId: '',
    leaveType: LEAVE_TYPES[0],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    reason: '',
  });

  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    priority: 'HIGH' as TaskPriority,
    caseCode: '',
    assignee: '',
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    status: 'Todo' as TaskStatus,
  });

  // Persist tasks and local leaves
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
      } catch {
        // ignore
      }
    }
  }, [tasks]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LOCAL_LEAVES_STORAGE_KEY, JSON.stringify(leaveRequests));
      } catch {
        // ignore
      }
    }
  }, [leaveRequests]);

  // Fetch individual staff leave balances from Supabase via hrSupabase.getStaffLeaveBalances
  const refreshLeaveBalances = useCallback(async () => {
    setLoadingBalances(true);
    try {
      const res = await getStaffLeaveBalances({ defaultAnnualAllowance: 21 });
      if (res.success) {
        setFetchedLeaveBalances(res.balances);
        setLeaveBalancesById(res.byEmployeeId);
        setLeaveBalancesByEmail(res.byEmail);
      }
    } finally {
      setLoadingBalances(false);
    }
  }, []);

  // Fetch live Supabase profiles, employee DOBs, leave_requests, and leave balances on mount
  const loadLiveStaffMetadata = useCallback(async () => {
    try {
      const [profilesRes, employeesRes, leavesRes] = await Promise.all([
        hrSupabase
          .from('profiles')
          .select('id, full_name, email, role, role_title, branch, branch_name, is_suspended')
          .order('full_name', { ascending: true }),
        hrSupabase.from('employees').select('id, email, date_of_birth, first_name, last_name'),
        hrSupabase
          .from('leave_requests')
          .select('id, employee_id, leave_type, start_date, end_date, reason, status, created_at')
          .order('created_at', { ascending: false }),
        refreshLeaveBalances(),
      ]);

      if (!profilesRes.error && Array.isArray(profilesRes.data)) {
        setSupabaseProfiles(profilesRes.data);
      }

      const dobLookup: Record<string, string> = {};
      if (!employeesRes.error && Array.isArray(employeesRes.data)) {
        employeesRes.data.forEach((emp: any) => {
          if (emp.date_of_birth) {
            if (emp.id) dobLookup[String(emp.id).toLowerCase()] = emp.date_of_birth;
            if (emp.email) dobLookup[String(emp.email).trim().toLowerCase()] = emp.date_of_birth;
          }
        });
      }
      if (typeof window !== 'undefined') {
        try {
          const rawOv = window.localStorage.getItem(LOCAL_HR_OVERRIDES_KEY);
          if (rawOv) {
            const parsedOv = JSON.parse(rawOv);
            Object.entries(parsedOv).forEach(([k, val]: [string, any]) => {
              if (val?.date_of_birth) {
                dobLookup[k.toLowerCase()] = val.date_of_birth;
              }
            });
          }
        } catch {
          // ignore
        }
      }
      setEmployeeDobMap(dobLookup);

      if (!leavesRes.error && Array.isArray(leavesRes.data) && leavesRes.data.length > 0) {
        const empById = new Map<string, any>();
        (employeesRes.data || []).forEach((e: any) => empById.set(e.id, e));
        (profilesRes.data || []).forEach((p: any) => {
          if (!empById.has(p.id)) empById.set(p.id, p);
        });

        const cloudLeaves: LeaveRequestRecord[] = leavesRes.data.map((lr: any) => {
          const matched = empById.get(lr.employee_id);
          const name = matched
            ? matched.full_name || `${matched.first_name || ''} ${matched.last_name || ''}`.trim()
            : 'Firm Staff';
          return {
            id: lr.id,
            employee_id: lr.employee_id,
            employeeName: name || 'Firm Staff',
            employeeEmail: matched?.email || '',
            branchName: matched?.branch_name || matched?.branch || 'Kampala Central (Head Office)',
            leave_type: lr.leave_type || 'Annual Leave',
            start_date: lr.start_date,
            end_date: lr.end_date,
            days: calcCalendarDays(lr.start_date, lr.end_date),
            reason: lr.reason || '',
            status:
              String(lr.status || 'Pending').toLowerCase() === 'approved'
                ? 'Approved'
                : String(lr.status || 'Pending').toLowerCase() === 'rejected'
                ? 'Rejected'
                : 'Pending',
            created_at: lr.created_at || new Date().toISOString(),
            persistedInSupabase: true,
          };
        });

        setLeaveRequests((prev) => {
          const cloudIds = new Set(cloudLeaves.map((c) => c.id));
          const localOnly = prev.filter((p) => !p.persistedInSupabase && !cloudIds.has(p.id));
          return [...cloudLeaves, ...localOnly];
        });
        setHasCloudLeavesLoaded(true);
      }
    } catch {
      // gracefully rely on availableUsers + local storage
    }
  }, [refreshLeaveBalances]);

  useEffect(() => {
    loadLiveStaffMetadata();
  }, [loadLiveStaffMetadata]);

  // Approved annual, pending annual, and non-annual approved leave days from state per staff member
  const leaveUsageByKey = useMemo(() => {
    const usedAll = new Map<string, number>();
    const pendingAll = new Map<string, number>();
    const otherUsedAll = new Map<string, number>();
    const usedLocalOnly = new Map<string, number>();
    const pendingLocalOnly = new Map<string, number>();
    const otherUsedLocalOnly = new Map<string, number>();

    const addTo = (map: Map<string, number>, key: string, days: number) => {
      if (!key) return;
      map.set(key, (map.get(key) || 0) + days);
    };

    leaveRequests.forEach((l) => {
      const d = Number(l.days || calcCalendarDays(l.start_date, l.end_date));
      const idKey = l.employee_id ? l.employee_id.toLowerCase() : '';
      const emailKey = l.employeeEmail ? l.employeeEmail.trim().toLowerCase() : '';
      const typeNorm = String(l.leave_type || '').trim().toLowerCase();
      const isAnnual = !typeNorm || typeNorm.includes('annual');

      if (l.status === 'Approved') {
        if (isAnnual) {
          addTo(usedAll, idKey, d);
          addTo(usedAll, emailKey, d);
          if (!l.persistedInSupabase) {
            addTo(usedLocalOnly, idKey, d);
            addTo(usedLocalOnly, emailKey, d);
          }
        } else {
          addTo(otherUsedAll, idKey, d);
          addTo(otherUsedAll, emailKey, d);
          if (!l.persistedInSupabase) {
            addTo(otherUsedLocalOnly, idKey, d);
            addTo(otherUsedLocalOnly, emailKey, d);
          }
        }
      } else if (l.status === 'Pending' && isAnnual) {
        addTo(pendingAll, idKey, d);
        addTo(pendingAll, emailKey, d);
        if (!l.persistedInSupabase) {
          addTo(pendingLocalOnly, idKey, d);
          addTo(pendingLocalOnly, emailKey, d);
        }
      }
    });

    return { usedAll, pendingAll, otherUsedAll, usedLocalOnly, pendingLocalOnly, otherUsedLocalOnly };
  }, [leaveRequests]);

  // Build unified Staff Directory & Attendance cards
  const allStaffCards = useMemo<StaffMemberCardData[]>(() => {
    const byEmail = new Map<string, any>();
    const noEmail: any[] = [];

    supabaseProfiles.forEach((p) => {
      const em = String(p?.email || '').trim().toLowerCase();
      if (em) {
        byEmail.set(em, {
          id: p.id,
          name: p.full_name || em.split('@')[0],
          email: p.email,
          role: p.role || 'lawyer',
          roleTitle: p.role_title || p.role || 'Legal Counsel',
          branchId: p.branch_id || '',
          branchName: p.branch_name || p.branch || 'Kampala Central (Head Office)',
          isSuspended: Boolean(p.is_suspended),
        });
      } else if (p?.id) {
        noEmail.push(p);
      }
    });

    availableUsers.forEach((u) => {
      const em = String(u?.email || '').trim().toLowerCase();
      if (em && !byEmail.has(em)) {
        byEmail.set(em, {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          roleTitle: u.roleTitle || u.role || 'Legal Counsel',
          branchId: u.branchId || '',
          branchName: u.branchName || 'Kampala Central (Head Office)',
          avatarUrl: u.avatarUrl,
          isSuspended: Boolean(u.isSuspended),
        });
      }
    });

    // Ensure any employees fetched via fetchStaffLeaveBalances are included even if not in profiles
    const seenIds = new Set<string>([
      ...Array.from(byEmail.values()).map((v) => String(v.id || '').toLowerCase()),
      ...noEmail.map((v) => String(v.id || '').toLowerCase()),
    ]);
    fetchedLeaveBalances.forEach((bal) => {
      const em = String(bal.email || '').trim().toLowerCase();
      const idKey = String(bal.employee_id || '').trim().toLowerCase();
      if (em && byEmail.has(em)) return;
      if (idKey && seenIds.has(idKey)) return;
      const entry = {
        id: bal.employee_id,
        name: bal.full_name || (em ? em.split('@')[0] : 'Firm Staff'),
        email: bal.email || '',
        role: 'lawyer',
        roleTitle: bal.job_title || 'Legal Counsel',
        branchId: '',
        branchName: bal.department || 'Kampala Central (Head Office)',
        isSuspended: false,
      };
      if (em) {
        byEmail.set(em, entry);
      } else {
        noEmail.push(entry);
      }
      if (idKey) seenIds.add(idKey);
    });

    // Ensure current user is included
    const currentEmail = String(effectiveUser?.email || '').trim().toLowerCase();
    if (currentEmail && !byEmail.has(currentEmail)) {
      byEmail.set(currentEmail, {
        id: effectiveUser?.id || 'current-user',
        name: effectiveUser?.name || 'Firm Staff',
        email: effectiveUser?.email,
        role: effectiveUser?.role || 'lawyer',
        roleTitle: effectiveUser?.roleTitle || effectiveUser?.role || 'Legal Counsel',
        branchId: effectiveUser?.branchId || 'kla-hq',
        branchName: effectiveUser?.branchName || 'Kampala Central (Head Office)',
        isSuspended: false,
      });
    }

    const rawList = [...Array.from(byEmail.values()), ...noEmail];
    const presetPunches = ['In @ 08:04 AM', 'In @ 08:15 AM', 'In @ 08:22 AM', 'In @ 08:31 AM', 'In @ 08:45 AM', 'In @ 08:52 AM'];
    const presetHours = [6.9, 6.5, 6.3, 6.1, 5.8, 5.5];

    return rawList.map((u, idx) => {
      const em = String(u.email || '').trim().toLowerCase();
      const idStr = String(u.id || `staff-${idx}`);
      const isSelf = Boolean(
        (currentEmail && em && currentEmail === em) ||
          (effectiveUser?.id && String(effectiveUser.id) === idStr)
      );

      const dob = employeeDobMap[idStr.toLowerCase()] || (em ? employeeDobMap[em] : undefined);
      const bdayMeta = isBirthdayUpcomingWithin30Days(dob);
      // Mark staff with upcoming DOBs (or top 2 featured colleagues when DOBs are not yet filled) as birthday-eligible
      const hasAnyRealDob = Object.keys(employeeDobMap).length > 0;
      const birthdayEligible = hasAnyRealDob ? bdayMeta.eligible : idx < 2;
      const birthdayLabel = bdayMeta.label || (idx === 0 ? 'Birthday Today' : 'Upcoming Birthday');

      const cloudBalance =
        leaveBalancesById[idStr.toLowerCase()] || (em ? leaveBalancesByEmail[em] : undefined);
      const annualAllowance = cloudBalance?.annual_allowance ?? 21;

      const localOnlyUsed = Math.max(
        leaveUsageByKey.usedLocalOnly.get(idStr.toLowerCase()) || 0,
        em ? leaveUsageByKey.usedLocalOnly.get(em) || 0 : 0
      );
      const localOnlyPending = Math.max(
        leaveUsageByKey.pendingLocalOnly.get(idStr.toLowerCase()) || 0,
        em ? leaveUsageByKey.pendingLocalOnly.get(em) || 0 : 0
      );
      const localOnlyOther = Math.max(
        leaveUsageByKey.otherUsedLocalOnly.get(idStr.toLowerCase()) || 0,
        em ? leaveUsageByKey.otherUsedLocalOnly.get(em) || 0 : 0
      );
      const allUsedFromState = Math.max(
        leaveUsageByKey.usedAll.get(idStr.toLowerCase()) || 0,
        em ? leaveUsageByKey.usedAll.get(em) || 0 : 0
      );
      const allPendingFromState = Math.max(
        leaveUsageByKey.pendingAll.get(idStr.toLowerCase()) || 0,
        em ? leaveUsageByKey.pendingAll.get(em) || 0 : 0
      );
      const allOtherFromState = Math.max(
        leaveUsageByKey.otherUsedAll.get(idStr.toLowerCase()) || 0,
        em ? leaveUsageByKey.otherUsedAll.get(em) || 0 : 0
      );

      // Use authoritative fetched balance merged with local entries; once cloud leaves are hydrated in state,
      // reflect optimistic approvals/rejections immediately without stale counts sticking.
      const usedLeaveDays = hasCloudLeavesLoaded
        ? allUsedFromState
        : cloudBalance
        ? cloudBalance.used_days + localOnlyUsed
        : allUsedFromState;
      const pendingLeaveDays = hasCloudLeavesLoaded
        ? allPendingFromState
        : cloudBalance
        ? cloudBalance.pending_days + localOnlyPending
        : allPendingFromState;
      const otherLeaveDays = hasCloudLeavesLoaded
        ? allOtherFromState
        : cloudBalance
        ? (cloudBalance.other_used_days || 0) + localOnlyOther
        : allOtherFromState;

      const leaveRemaining = Math.max(0, annualAllowance - usedLeaveDays);
      const leaveRemainingPercent = Math.min(
        100,
        Math.max(0, Math.round((leaveRemaining / Math.max(1, annualAllowance)) * 100))
      );

      const isActive = isSelf ? isClockedIn : !u.isSuspended;
      const todaysPunch = isSelf
        ? isClockedIn
          ? `In @ ${clockInTime}`
          : 'Clocked Out'
        : u.isSuspended
        ? 'Inactive'
        : presetPunches[idx % presetPunches.length];
      const staffHours = isSelf ? hoursLogged : u.isSuspended ? 0 : presetHours[idx % presetHours.length];

      return {
        id: idStr,
        name: u.name || 'Firm Staff',
        email: u.email || 'staff@mkadvocates.ug',
        role: u.role || 'lawyer',
        roleTitle: u.roleTitle || 'Legal Counsel',
        branchId: u.branchId || '',
        branchName: u.branchName || 'Kampala Central (Head Office)',
        avatarUrl: u.avatarUrl,
        isActive,
        isCurrentUser: isSelf,
        todaysPunch,
        hoursLogged: staffHours,
        hourlyRate: resolveHourlyRate(u.role, u.roleTitle),
        annualAllowance,
        usedLeaveDays,
        pendingLeaveDays,
        otherLeaveDays,
        leaveRemaining,
        leaveRemainingPercent,
        birthdayEligible,
        birthdayLabel,
        isUuid: UUID_REGEX.test(idStr),
      };
    });
  }, [
    supabaseProfiles,
    availableUsers,
    fetchedLeaveBalances,
    effectiveUser,
    employeeDobMap,
    leaveBalancesById,
    leaveBalancesByEmail,
    leaveUsageByKey,
    hasCloudLeavesLoaded,
    isClockedIn,
    clockInTime,
    hoursLogged,
  ]);

  // Resolve active branch filter label
  const activeBranchObj = useMemo(
    () => (selectedBranchFilter && selectedBranchFilter !== 'all' ? branches.find((b) => b.id === selectedBranchFilter) : undefined),
    [selectedBranchFilter, branches]
  );

  const matchesActiveBranch = useCallback(
    (branchId?: string, branchName?: string): boolean => {
      if (!selectedBranchFilter || selectedBranchFilter === 'all') return true;
      const targetName = (activeBranchObj?.name || '').toLowerCase();
      const targetCity = (activeBranchObj?.city || '').toLowerCase();
      const bName = (branchName || '').toLowerCase();
      return (
        Boolean(branchId && branchId === selectedBranchFilter) ||
        Boolean(targetName && bName.includes(targetName)) ||
        Boolean(targetCity && bName.includes(targetCity))
      );
    },
    [selectedBranchFilter, activeBranchObj]
  );

  // Filtered Staff Directory Cards
  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allStaffCards.filter((s) => {
      if (!matchesActiveBranch(s.branchId, s.branchName)) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.roleTitle.toLowerCase().includes(q) ||
        s.branchName.toLowerCase().includes(q)
      );
    });
  }, [allStaffCards, matchesActiveBranch, searchQuery]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (t.branchName && !matchesActiveBranch(undefined, t.branchName)) return false;
      if (taskPriorityFilter !== 'ALL' && t.priority !== taskPriorityFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.caseCode.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q) ||
        t.priority.toLowerCase().includes(q)
      );
    });
  }, [tasks, matchesActiveBranch, taskPriorityFilter, searchQuery]);

  // Filtered Leave Requests
  const filteredLeaves = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leaveRequests.filter((l) => {
      if (l.branchName && !matchesActiveBranch(undefined, l.branchName)) return false;
      if (!q) return true;
      return (
        l.employeeName.toLowerCase().includes(q) ||
        l.employeeEmail.toLowerCase().includes(q) ||
        l.leave_type.toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q) ||
        l.status.toLowerCase().includes(q)
      );
    });
  }, [leaveRequests, matchesActiveBranch, searchQuery]);

  const pendingLeaveCount = useMemo(
    () => filteredLeaves.filter((l) => l.status === 'Pending').length,
    [filteredLeaves]
  );

  // Handlers
  const openApplyLeaveModal = (preselectedStaffId?: string) => {
    const defaultStaff =
      preselectedStaffId ||
      allStaffCards.find((s) => s.isCurrentUser)?.id ||
      allStaffCards[0]?.id ||
      '';
    setLeaveForm({
      staffId: defaultStaff,
      leaveType: LEAVE_TYPES[0],
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      reason: '',
    });
    setIsLeaveModalOpen(true);
  };

  const openDelegateTaskModal = (preselectedAssignee?: string) => {
    const defaultAssignee =
      preselectedAssignee || allStaffCards[0]?.name || effectiveUser?.name || '';
    const defaultCaseCode = cases[0]?.suitNumber || cases[0]?.firmRefNumber || 'LF-2026-0142';
    setTaskForm({
      title: '',
      priority: 'HIGH',
      caseCode: defaultCaseCode,
      assignee: defaultAssignee,
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      status: 'Todo',
    });
    setIsDelegateModalOpen(true);
  };

  const handleSendBirthdayWish = async (staff: StaffMemberCardData) => {
    const msg = wishDraft.trim();
    if (!msg) return;
    setSendingWishId(staff.id);

    const newWish = {
      id: `wish-${Date.now()}`,
      sender: effectiveUser?.name || 'Colleague',
      message: msg,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      let persistedCloud = false;
      if (staff.isUuid) {
        let senderUuid: string | null =
          effectiveUser?.id && UUID_REGEX.test(String(effectiveUser.id)) ? String(effectiveUser.id) : null;
        if (!senderUuid) {
          const { data } = await hrSupabase.auth.getUser().catch(() => ({ data: { user: null } } as any));
          if (data?.user?.id && UUID_REGEX.test(data.user.id)) senderUuid = data.user.id;
        }
        const { data: inserted, error } = await hrSupabase
          .from('birthday_wishes')
          .insert([
            {
              celebrant_id: staff.id,
              sender_id: senderUuid,
              message: msg,
              wish_year: new Date().getFullYear(),
            },
          ])
          .select('id')
          .maybeSingle();

        if (!error) {
          persistedCloud = true;
          if (inserted?.id) newWish.id = inserted.id;
        }
      }

      if (!persistedCloud) {
        persistLocalWish(staff.id, newWish);
      }

      setWishesByStaff((prev) => ({
        ...prev,
        [staff.id]: [newWish, ...(prev[staff.id] || [])],
      }));
      setWishDraft('');
      setOpenWishStaffId(null);
      showCleanMessage(`Birthday wish sent to ${staff.name}!`, 'success');
    } catch {
      persistLocalWish(staff.id, newWish);
      setWishesByStaff((prev) => ({
        ...prev,
        [staff.id]: [newWish, ...(prev[staff.id] || [])],
      }));
      setWishDraft('');
      setOpenWishStaffId(null);
      showCleanMessage(`Birthday wish posted for ${staff.name}.`, 'success');
    } finally {
      setSendingWishId(null);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const staff = allStaffCards.find((s) => s.id === leaveForm.staffId) || allStaffCards[0];
    if (!staff) {
      showCleanMessage('Please select a staff member.', 'warning');
      return;
    }
    if (leaveForm.endDate < leaveForm.startDate) {
      showCleanMessage('End date cannot be earlier than start date.', 'warning');
      return;
    }

    setSubmittingLeave(true);
    const days = calcCalendarDays(leaveForm.startDate, leaveForm.endDate);
    const cleanReason = leaveForm.reason.trim() || 'Requested via Staff Management portal';

    try {
      const result = await submitLeaveRequest({
        employee_id: staff.id,
        leave_type: leaveForm.leaveType,
        start_date: leaveForm.startDate,
        end_date: leaveForm.endDate,
        reason: cleanReason,
        status: 'Pending',
        employee_name: staff.name,
        employee_email: staff.email,
        job_title: staff.roleTitle,
        department: staff.branchName,
      });

      const inserted = result.data;
      const newRecord: LeaveRequestRecord = {
        id: inserted?.id || `lv-${Date.now()}`,
        employee_id: inserted?.employee_id || staff.id,
        employeeName: staff.name,
        employeeEmail: staff.email,
        branchName: staff.branchName,
        leave_type: inserted?.leave_type || leaveForm.leaveType,
        start_date: inserted?.start_date || leaveForm.startDate,
        end_date: inserted?.end_date || leaveForm.endDate,
        days,
        reason: inserted?.reason || cleanReason,
        status:
          inserted?.status === 'Approved' || inserted?.status === 'Rejected'
            ? inserted.status
            : 'Pending',
        created_at: inserted?.created_at || new Date().toISOString(),
        persistedInSupabase: result.persistedInSupabase,
      };

      setLeaveRequests((prev) => [newRecord, ...prev]);
      setIsLeaveModalOpen(false);
      setActiveSubTab('leaves');
      if (result.persistedInSupabase) {
        void refreshLeaveBalances();
      }
      showCleanMessage(
        result.persistedInSupabase
          ? `Leave request saved to HR register for ${staff.name} (${days} day${days > 1 ? 's' : ''}).`
          : `Leave request logged for ${staff.name} (${days} day${days > 1 ? 's' : ''}).`,
        'success'
      );
    } catch (err: any) {
      const fallbackRecord: LeaveRequestRecord = {
        id: `lv-${Date.now()}`,
        employee_id: staff.id,
        employeeName: staff.name,
        employeeEmail: staff.email,
        branchName: staff.branchName,
        leave_type: leaveForm.leaveType,
        start_date: leaveForm.startDate,
        end_date: leaveForm.endDate,
        days,
        reason: cleanReason,
        status: 'Pending',
        created_at: new Date().toISOString(),
        persistedInSupabase: false,
      };
      setLeaveRequests((prev) => [fallbackRecord, ...prev]);
      setIsLeaveModalOpen(false);
      setActiveSubTab('leaves');
      showCleanMessage(err?.message || `Leave request logged for ${staff.name}.`, 'warning');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleLeaveStatusChange = async (record: LeaveRequestRecord, nextStatus: 'Approved' | 'Rejected') => {
    setLeaveRequests((prev) => prev.map((l) => (l.id === record.id ? { ...l, status: nextStatus } : l)));
    if (record.persistedInSupabase && UUID_REGEX.test(record.id)) {
      try {
        await hrSupabase.from('leave_requests').update({ status: nextStatus }).eq('id', record.id);
        await refreshLeaveBalances();
      } catch {
        // local state already updated
      }
    }
    showCleanMessage(
      `${record.employeeName}'s ${record.leave_type} marked as ${nextStatus}.`,
      nextStatus === 'Approved' ? 'success' : 'warning'
    );
  };

  const handleSubmitDelegatedTask = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = taskForm.title.trim();
    if (!cleanTitle) {
      showCleanMessage('Please enter a task title.', 'warning');
      return;
    }

    const matchedStaff = allStaffCards.find((s) => s.name === taskForm.assignee);
    const newTask: DelegatedTask = {
      id: `tsk-${Date.now()}`,
      priority: taskForm.priority,
      title: cleanTitle,
      caseCode: taskForm.caseCode.trim() || 'LF-2026-GEN',
      assignee: taskForm.assignee || effectiveUser?.name || 'Firm Staff',
      assigneeEmail: matchedStaff?.email,
      branchName: matchedStaff?.branchName || activeBranchObj?.name || effectiveUser?.branchName,
      dueDate: taskForm.dueDate
        ? new Date(taskForm.dueDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Upcoming',
      status: taskForm.status,
    };

    setTasks((prev) => [newTask, ...prev]);
    setIsDelegateModalOpen(false);
    setActiveSubTab('tasks');
    showCleanMessage(`Task delegated to ${newTask.assignee}.`, 'success');
  };

  const handleCycleTaskStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: getNextTaskStatus(t.status) } : t))
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    showCleanMessage('Task removed from workflow board.', 'info');
  };

  const avatarGradients = [
    'from-blue-600 to-indigo-600',
    'from-emerald-600 to-teal-600',
    'from-slate-800 to-slate-950',
    'from-indigo-600 to-violet-600',
    'from-amber-600 to-orange-600',
    'from-cyan-600 to-blue-700',
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. MODULE HEADER & ACTION BUTTONS */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Staff Management &amp; Workflow Delegation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Leave administration, clock-in/out timesheets, task workflows, and staff birthday notifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onToggleClock && (
            <button
              type="button"
              onClick={onToggleClock}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer whitespace-nowrap tabular-nums ${
                isClockedIn
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isClockedIn
                  ? `Clocked In (${clockInTime}) • ${hoursLogged.toFixed(1)}h`
                  : `Clocked Out • ${hoursLogged.toFixed(1)}h`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => openApplyLeaveModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap shadow-xs"
          >
            <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Apply for Leave</span>
          </button>

          <button
            type="button"
            onClick={() => openDelegateTaskModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>+ Delegate Task</span>
          </button>
        </div>
      </header>

      {/* Active Filter Context Indicator when searching or branch-filtering */}
      {(searchQuery.trim() || (selectedBranchFilter && selectedBranchFilter !== 'all')) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5">
          {selectedBranchFilter && selectedBranchFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Branch Scope: <strong className="text-slate-900 dark:text-white">{activeBranchObj?.name || selectedBranchFilter}</strong>
            </span>
          )}
          {searchQuery.trim() && selectedBranchFilter && selectedBranchFilter !== 'all' && <span aria-hidden="true">·</span>}
          {searchQuery.trim() && (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Search className="w-3.5 h-3.5 text-blue-600" />
              Filtering by &ldquo;{searchQuery.trim()}&rdquo;
            </span>
          )}
        </div>
      )}

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('directory')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'directory'
              ? 'border-blue-600 text-blue-700 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span className="tabular-nums">Staff Directory &amp; Attendance ({filteredStaff.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('tasks')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'tasks'
              ? 'border-blue-600 text-blue-700 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ListChecks className="w-4 h-4 shrink-0" />
          <span className="tabular-nums">Workflow &amp; Tasks Board ({filteredTasks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('leaves')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'leaves'
              ? 'border-blue-600 text-blue-700 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CalendarClock className="w-4 h-4 shrink-0" />
          <span>Leave Management &amp; Allowances</span>
          {pendingLeaveCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 tabular-nums">
              {pendingLeaveCount}
            </span>
          )}
        </button>
      </div>

      {/* 3. TAB 1: 2-COLUMN STAFF DIRECTORY & ATTENDANCE CARDS */}
      {activeSubTab === 'directory' && (
        <section>
          {filteredStaff.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No staff members match the active branch or search filter.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Try switching the top branch selector to &ldquo;All Firm Branches&rdquo; or clearing the search query.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredStaff.map((staff, idx) => {
                const isWishOpen = openWishStaffId === staff.id;
                const staffWishes = wishesByStaff[staff.id] || [];
                const gradient = avatarGradients[idx % avatarGradients.length];

                return (
                  <article
                    key={staff.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    {/* Top Row: Avatar, Name, Role, Active Status Dot + Branch, Birthday Gift Button */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {staff.avatarUrl ? (
                          <img
                            src={staff.avatarUrl}
                            alt={staff.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} text-white font-bold text-sm flex items-center justify-center shrink-0`}
                          >
                            {getInitials(staff.name)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                              {staff.name}
                              {staff.isCurrentUser ? ' (You)' : ''}
                            </h3>
                          </div>
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                            {staff.roleTitle}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                staff.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                              }`}
                              title={staff.isActive ? 'Active / Clocked In' : 'Offline / Clocked Out'}
                            />
                            <span className="truncate">{staff.branchName}</span>
                          </div>
                        </div>
                      </div>

                      {staff.birthdayEligible && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isWishOpen) {
                              setOpenWishStaffId(null);
                              setWishDraft('');
                            } else {
                              setOpenWishStaffId(staff.id);
                              setWishDraft(`Happy Birthday ${staff.name.split(' ')[0]}! Wishing you a wonderful year ahead.`);
                            }
                          }}
                          title={`Send birthday wish (${staff.birthdayLabel || 'Birthday'})`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer shrink-0 ${
                            isWishOpen
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                          }`}
                        >
                          <Gift className="w-3.5 h-3.5 shrink-0" />
                          <span>{isWishOpen ? 'Close' : 'Wish'}</span>
                        </button>
                      )}
                    </div>

                    {/* Inline Birthday Wish Input + Send Action */}
                    {isWishOpen && (
                      <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                          <Cake className="w-3.5 h-3.5" />
                          <span>{staff.birthdayLabel || 'Staff Birthday Celebration'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={wishDraft}
                            onChange={(e) => setWishDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSendBirthdayWish(staff);
                              }
                            }}
                            placeholder={`Write a birthday wish for ${staff.name}...`}
                            className="flex-1 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                          <button
                            type="button"
                            disabled={sendingWishId === staff.id || !wishDraft.trim()}
                            onClick={() => handleSendBirthdayWish(staff)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer shrink-0"
                          >
                            {sendingWishId === staff.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>Send</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Recent wishes posted on this staff card */}
                    {staffWishes.length > 0 && (
                      <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                        {staffWishes.slice(0, 2).map((w) => (
                          <p key={w.id} className="text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-semibold text-slate-900 dark:text-white">{w.sender}:</span> {w.message}{' '}
                            <span className="text-[10px] text-slate-400 tabular-nums">({w.createdAt})</span>
                          </p>
                        ))}
                      </div>
                    )}

                    {/* 4-Cell Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Today&apos;s Punch</p>
                        <p
                          className={`text-xs sm:text-sm font-bold mt-1 tabular-nums truncate ${
                            staff.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {staff.todaysPunch}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Hours Logged</p>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                          {staff.hoursLogged.toFixed(1)}h
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Rate</p>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                          ${staff.hourlyRate}/hr
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Leave Remaining</p>
                        <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
                          {staff.leaveRemaining} Days
                        </p>
                      </div>
                    </div>

                    {/* Footer Row: Email + Quick Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{staff.email}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openDelegateTaskModal(staff.name)}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Delegate Task
                        </button>
                        <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                          ·
                        </span>
                        <button
                          type="button"
                          onClick={() => openApplyLeaveModal(staff.id)}
                          className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          Log Leave
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: WORKFLOW & TASKS BOARD */}
      {activeSubTab === 'tasks' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(['ALL', 'URGENT', 'HIGH', 'MEDIUM'] as const).map((prio) => (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setTaskPriorityFilter(prio)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    taskPriorityFilter === prio
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {prio}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setTaskViewMode('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  taskViewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                List
              </button>
              <button
                type="button"
                onClick={() => setTaskViewMode('board')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  taskViewMode === 'board'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5" />
                Board
              </button>
            </div>
          </div>

          {taskViewMode === 'list' ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  No workflow tasks match the current filter. Click &ldquo;+ Delegate Task&rdquo; to assign one.
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
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : task.status === 'In Progress'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                  return (
                    <div
                      key={task.id}
                      className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
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
                                ? 'line-through text-slate-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                              {task.caseCode}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{task.assignee}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">Due {task.dueDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCycleTaskStatus(task.id)}
                          title="Click to cycle status (Todo → In Progress → Completed)"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer whitespace-nowrap ${statusStyle}`}
                        >
                          {task.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>{task.status}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          aria-label="Remove task"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(['Todo', 'In Progress', 'Completed'] as TaskStatus[]).map((colStatus) => {
                const colTasks = filteredTasks.filter((t) => t.status === colStatus);
                return (
                  <div
                    key={colStatus}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">{colStatus}</h3>
                      <span className="text-xs font-semibold text-slate-400 tabular-nums">{colTasks.length}</span>
                    </div>
                    <div className="space-y-2.5">
                      {colTasks.length === 0 ? (
                        <p className="text-xs text-slate-400 py-6 text-center">No tasks in {colStatus}</p>
                      ) : (
                        colTasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 font-mono">
                                {task.caseCode}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  task.priority === 'URGENT'
                                    ? 'bg-rose-100 text-rose-700'
                                    : task.priority === 'HIGH'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {task.priority}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                              {task.title}
                            </p>
                            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                              <span className="truncate">{task.assignee}</span>
                              <button
                                type="button"
                                onClick={() => handleCycleTaskStatus(task.id)}
                                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
                              >
                                Move →
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: LEAVE MANAGEMENT & ALLOWANCES */}
      {activeSubTab === 'leaves' && (() => {
        const totalStaffCount = filteredStaff.length;
        const avgRemainingDays =
          totalStaffCount > 0
            ? Math.round(
                (filteredStaff.reduce((acc, s) => acc + s.leaveRemaining, 0) / totalStaffCount) * 10
              ) / 10
            : 0;
        const totalUsedDays = filteredStaff.reduce((acc, s) => acc + s.usedLeaveDays, 0);
        const totalPendingDays = filteredStaff.reduce((acc, s) => acc + s.pendingLeaveDays, 0);

        const displayedBalanceStaff = filteredStaff.filter((s) => {
          if (balanceFilter === 'healthy') return s.leaveRemainingPercent >= 50;
          if (balanceFilter === 'low') return s.leaveRemainingPercent < 50;
          return true;
        });

        return (
          <section className="space-y-6">
            {/* Leave Balance Summary Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Tracked Staff</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {totalStaffCount}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">Active annual entitlements</p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Avg. Remaining Leave</p>
                <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                  {avgRemainingDays} <span className="text-xs font-semibold text-slate-400">Days</span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">Per staff member ({new Date().getFullYear()})</p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Annual Days Used</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {totalUsedDays} <span className="text-xs font-semibold text-slate-400">Days</span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">Approved annual leave</p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pending Annual Leave</p>
                <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {totalPendingDays} <span className="text-xs font-semibold text-slate-400">Days</span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">Awaiting supervisor sign-off</p>
              </div>
            </div>

            {/* Staff Annual Leave Allowances & Progress Bars */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Annual Leave Allowances ({displayedBalanceStaff.length})
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Individual remaining annual leave days calculated from live HR leave records
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'healthy', label: 'Healthy ≥50%' },
                        { id: 'low', label: 'Low <50%' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setBalanceFilter(opt.id)}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                          balanceFilter === opt.id
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => void refreshLeaveBalances()}
                    disabled={loadingBalances}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingBalances ? 'animate-spin' : ''}`} />
                    {loadingBalances ? 'Refreshing...' : 'Refresh Balances'}
                  </button>
                </div>
              </div>

              {loadingBalances && filteredStaff.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[0, 1, 2].map((skeleton) => (
                    <div
                      key={skeleton}
                      className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3 animate-pulse"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700" />
                          <div className="space-y-1.5">
                            <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                            <div className="h-2.5 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                          </div>
                        </div>
                        <div className="h-4 w-12 rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
                    </div>
                  ))}
                </div>
              ) : displayedBalanceStaff.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No staff leave balances match the current filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedBalanceStaff.map((s, idx) => {
                    const pct = s.leaveRemainingPercent;
                    const barColor =
                      pct >= 50
                        ? 'bg-blue-600 dark:bg-blue-500'
                        : pct >= 20
                        ? 'bg-amber-500 dark:bg-amber-400'
                        : 'bg-rose-600 dark:bg-rose-500';
                    const textAccent =
                      pct >= 50
                        ? 'text-blue-600 dark:text-blue-400'
                        : pct >= 20
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400';

                    return (
                      <div
                        key={s.id}
                        className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-full bg-gradient-to-br ${
                                avatarGradients[idx % avatarGradients.length]
                              } text-white text-xs font-bold flex items-center justify-center shrink-0`}
                            >
                              {getInitials(s.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {s.name}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {s.roleTitle}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 tabular-nums">
                            <p className={`text-sm font-bold leading-tight ${textAccent}`}>
                              {s.leaveRemaining}{' '}
                              <span className="text-[11px] font-semibold text-slate-400">
                                / {s.annualAllowance}d
                              </span>
                            </p>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                              {pct}% remaining
                            </p>
                          </div>
                        </div>

                        {/* Remaining Annual Leave Progress Bar */}
                        <div className="space-y-1.5">
                          <div
                            role="progressbar"
                            aria-label={`${s.name} remaining annual leave days`}
                            aria-valuenow={s.leaveRemaining}
                            aria-valuemin={0}
                            aria-valuemax={s.annualAllowance}
                            title={`${s.leaveRemaining} of ${s.annualAllowance} annual leave days remaining (${pct}%)`}
                            className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700/80 overflow-hidden"
                          >
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span>
                                Used: <strong className="text-slate-700 dark:text-slate-200">{s.usedLeaveDays}d</strong>
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                Pending:{' '}
                                <strong className="text-amber-600 dark:text-amber-400">{s.pendingLeaveDays}d</strong>
                              </span>
                              {s.otherLeaveDays > 0 && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    Other:{' '}
                                    <strong className="text-slate-600 dark:text-slate-300">{s.otherLeaveDays}d</strong>
                                  </span>
                                </>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => openApplyLeaveModal(s.id)}
                              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Leave Requests Queue */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Leave Applications &amp; Approvals
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Submit and track annual, sick, and study leave schedules across branches
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openApplyLeaveModal()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Application
                </button>
              </div>

              {filteredLeaves.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No leave requests found for the current branch or search filter.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLeaves.map((lr) => (
                    <div
                      key={lr.id}
                      className="p-4 sm:px-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-slate-900 dark:text-white">{lr.employeeName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-blue-700 dark:text-blue-400">{lr.leave_type}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-500 tabular-nums">
                            {lr.start_date} to {lr.end_date} ({lr.days} day{lr.days > 1 ? 's' : ''})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{lr.reason}</p>
                        <p className="text-[11px] text-slate-400">{lr.branchName}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {lr.status === 'Pending' && isAdmin ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleLeaveStatusChange(lr, 'Approved')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLeaveStatusChange(lr, 'Rejected')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                              lr.status === 'Approved'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : lr.status === 'Rejected'
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {lr.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* MODAL: APPLY FOR LEAVE */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-leave-modal-title"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                <h2 id="apply-leave-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Apply for Leave
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Staff Member
                </label>
                <select
                  value={leaveForm.staffId}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, staffId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {allStaffCards.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.leaveRemaining} Days Remaining
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Leave Category
                </label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, leaveType: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {LEAVE_TYPES.map((lt) => (
                    <option key={lt} value={lt}>
                      {lt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Handover Notes / Reason
                </label>
                <textarea
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Provide covering advocate details and brief handover summary..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                  Duration: {calcCalendarDays(leaveForm.startDate, leaveForm.endDate)} calendar day(s)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLeaveModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingLeave}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                  >
                    {submittingLeave && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Submit Leave Request</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELEGATE TASK */}
      {isDelegateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delegate-task-modal-title"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <h2 id="delegate-task-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Delegate Workflow Task
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDelegateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDelegatedTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Draft Affidavit in Reply & File Commercial Court Bundle"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Assign To
                  </label>
                  <select
                    value={taskForm.assignee}
                    onChange={(e) => setTaskForm((f) => ({ ...f, assignee: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {allStaffCards.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.roleTitle})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="URGENT">URGENT</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Case File / Doc Code
                  </label>
                  <input
                    type="text"
                    value={taskForm.caseCode}
                    onChange={(e) => setTaskForm((f) => ({ ...f, caseCode: e.target.value }))}
                    placeholder="e.g. LF-2026-0142"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDelegateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Delegate Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalTeamDashboard;
