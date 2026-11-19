import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  hrSupabase,
  ActiveUser,
  isSuperAdminUser,
  syncFirmUsersToHrModule,
  getStaffLeaveBalances,
  type StaffLeaveBalance,
} from '../lib/hrSupabase';
import { useApp } from '../context/AppContext';
import { showCleanMessage } from '../utils/notification';
import {
  StaffMemberWorkspace,
  type WorkspaceLeaveItem,
  type WorkspaceStaffProfile,
} from './legal-team/StaffMemberWorkspace';
import { INITIAL_APPROVAL_ITEMS } from './ErpWorkspaceViews';
import {
  Users,
  UserPlus,
  CalendarClock,
  Cake,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Edit3,
  Trash2,
  X,
  RefreshCw,
  Loader2,
  ShieldAlert,
  Building2,
  Mail,
  Phone,
  Sparkles,
  Download,
  Heart,
  ChevronRight,
  AlertCircle,
  Link2,
} from 'lucide-react';

// ============================================================================
// Types matching live Supabase HR tables:
// - employees: id, first_name, last_name, email, phone_number, date_of_birth, job_title, department, status, created_at
// - leave_requests: id, employee_id, leave_type, start_date, end_date, reason, status, approved_by, created_at
// - birthday_wishes: id, celebrant_id, sender_id, message, wish_year, created_at
// - upcoming_birthdays: id, first_name, last_name, department, job_title, date_of_birth, is_today
// ============================================================================

export interface HrEmployee {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  job_title: string | null;
  department: string | null;
  status: string;
  created_at?: string;
  /** Client-only connection metadata (never written to Supabase employees columns) */
  source?: 'hr_synced' | 'hr_only' | 'firm_profile';
  linked_profile_id?: string | null;
}

export interface HrLeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  approved_by: string | null;
  created_at?: string;
}

export interface HrBirthdayWish {
  id: string;
  celebrant_id: string;
  sender_id: string | null;
  message: string;
  wish_year: number;
  created_at?: string;
}

export interface UpcomingBirthdayItem {
  id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  job_title: string | null;
  date_of_birth: string | null;
  is_today: boolean;
  daysUntil: number;
  displayDate: string;
}

const DEPARTMENTS = [
  'Litigation & Dispute Resolution',
  'Banking & Securities',
  'Corporate & Commercial',
  'Real Estate & Conveyancing',
  'Debt Recovery',
  'Administration & Finance',
  'Operations & Registry',
  'Human Resources',
];

const EMPLOYEE_STATUSES = ['Active', 'On Leave', 'Probation', 'Inactive', 'Terminated'];

const LEAVE_TYPES = [
  'Annual Leave',
  'Sick Leave',
  'Maternity / Paternity',
  'Compassionate Leave',
  'Study Leave',
  'Unpaid Leave',
];

const QUICK_WISH_TEMPLATES = [
  'Happy Birthday! Wishing you a wonderful year filled with health and success.',
  'Warmest birthday wishes from the MK Advocates team!',
  'Cheers to another inspiring year ahead. Happy Birthday!',
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function computeDaysUntilBirthday(dob?: string | null): { daysUntil: number; isToday: boolean; displayDate: string } {
  if (!dob) return { daysUntil: 999, isToday: false, displayDate: '—' };
  const parts = String(dob).slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return { daysUntil: 999, isToday: false, displayDate: dob };
  }
  const [, month, day] = parts;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), month - 1, day);
  if (next < today) {
    next = new Date(now.getFullYear() + 1, month - 1, day);
  }
  const diffDays = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const displayDate = next.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return {
    daysUntil: diffDays,
    isToday: diffDays === 0,
    displayDate,
  };
}

function calcCalendarDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function formatShortDate(raw?: string | null): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInitials(first?: string | null, last?: string | null): string {
  const f = (first || '').trim().charAt(0).toUpperCase();
  const l = (last || '').trim().charAt(0).toUpperCase();
  return f + l || 'MK';
}

async function resolveSafeActorUuid(candidateId?: string | null): Promise<string | null> {
  if (candidateId && UUID_REGEX.test(candidateId)) {
    return candidateId;
  }
  try {
    const { data } = await hrSupabase.auth.getUser();
    if (data?.user?.id && UUID_REGEX.test(data.user.id)) {
      return data.user.id;
    }
  } catch {
    // ignore
  }
  return null;
}

function getStatusPillClasses(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'active' || s === 'approved') {
    return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70';
  }
  if (s === 'pending' || s === 'on leave' || s === 'probation') {
    return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70';
  }
  if (s === 'rejected' || s === 'terminated') {
    return 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70';
  }
  return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
}

const LOCAL_HR_OVERRIDES_KEY = 'mk_hr_employee_overrides_v1';

function readLocalHrOverrides(): Record<string, Partial<HrEmployee>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_HR_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalHrOverride(key: string, patch: Partial<HrEmployee>): void {
  if (typeof window === 'undefined' || !key) return;
  try {
    const map = readLocalHrOverrides();
    map[key.toLowerCase()] = { ...(map[key.toLowerCase()] || {}), ...patch };
    window.localStorage.setItem(LOCAL_HR_OVERRIDES_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota issues
  }
}

function splitStaffName(rawName?: string | null, email?: string | null): { first_name: string; last_name: string } {
  const cleaned = String(rawName || '').trim();
  if (cleaned) {
    const spaceParts = cleaned.split(/\s+/).filter(Boolean);
    if (spaceParts.length >= 2) {
      return {
        first_name: spaceParts[0],
        last_name: spaceParts.slice(1).join(' '),
      };
    }
    const dotParts = cleaned.split(/[._-]+/).filter(Boolean);
    if (dotParts.length >= 2) {
      const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      return {
        first_name: cap(dotParts[0]),
        last_name: dotParts.slice(1).map(cap).join(' '),
      };
    }
    return { first_name: cleaned, last_name: 'Staff' };
  }
  const emailUser = String(email || '').split('@')[0] || 'Staff';
  const parts = emailUser.split(/[._-]+/).filter(Boolean);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    first_name: cap(parts[0] || 'Firm'),
    last_name: parts.length > 1 ? parts.slice(1).map(cap).join(' ') : 'Member',
  };
}

function formatFirmRoleTitle(role?: string | null, roleTitle?: string | null): string {
  if (roleTitle && roleTitle.trim()) return roleTitle.trim();
  const r = String(role || '').trim().toLowerCase();
  if (r === 'partner' || r === 'managing_partner') return 'Managing Partner';
  if (r === 'super_admin' || r === 'superadmin') return 'Super Administrator';
  if (r === 'branch_admin') return 'Branch Administrator';
  if (r === 'admin_finance_assistant') return 'Admin & Finance Assistant';
  if (r === 'lawyer' || r === 'advocate') return 'Litigation Advocate';
  if (r === 'clerk') return 'Legal Clerk';
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Firm Staff';
}

interface RawFirmUserProfile {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  role_title?: string | null;
  title?: string | null;
  branch?: string | null;
  branch_name?: string | null;
  branchName?: string | null;
  is_suspended?: boolean | null;
  created_at?: string | null;
}

function buildEmployeeFromFirmProfile(profile: RawFirmUserProfile): HrEmployee {
  const { first_name, last_name } = splitStaffName(profile.full_name || profile.name, profile.email);
  const branchLabel =
    (profile.branch_name || profile.branchName || profile.branch || '').trim() ||
    'Kampala Central (Head Office)';
  return {
    id: profile.id,
    first_name,
    last_name,
    email: profile.email ? profile.email.trim() : null,
    phone_number: profile.phone ? String(profile.phone).trim() : null,
    date_of_birth: null,
    job_title: formatFirmRoleTitle(profile.role, profile.role_title || profile.title),
    department: branchLabel,
    status: profile.is_suspended ? 'Inactive' : 'Active',
    created_at: profile.created_at || undefined,
    source: 'firm_profile',
    linked_profile_id: profile.id,
  };
}

async function fetchConnectedFirmProfiles(fallbackUsers?: any[]): Promise<RawFirmUserProfile[]> {
  const byEmail = new Map<string, RawFirmUserProfile>();
  const withoutEmail: RawFirmUserProfile[] = [];

  try {
    const { data, error } = await hrSupabase
      .from('profiles')
      .select('id, full_name, email, role, role_title, branch, branch_name, is_suspended, created_at')
      .order('full_name', { ascending: true });

    if (!error && Array.isArray(data)) {
      data.forEach((row: any) => {
        const emailKey = String(row.email || '').trim().toLowerCase();
        if (emailKey) {
          byEmail.set(emailKey, row);
        } else if (row.id) {
          withoutEmail.push(row);
        }
      });
    }
  } catch {
    // fall back to AppContext availableUsers below
  }

  if (Array.isArray(fallbackUsers)) {
    fallbackUsers.forEach((u: any) => {
      const emailKey = String(u?.email || '').trim().toLowerCase();
      if (emailKey && !byEmail.has(emailKey)) {
        byEmail.set(emailKey, {
          id: u.id,
          full_name: u.name,
          email: u.email,
          phone: u.phone || null,
          role: u.role,
          role_title: u.roleTitle || u.title || null,
          branch_name: u.branchName || u.branch || null,
          is_suspended: u.isSuspended || u.isActive === false,
        });
      }
    });
  }

  return [...Array.from(byEmail.values()), ...withoutEmail];
}

function mergeEmployeesWithFirmProfiles(
  dbEmployees: HrEmployee[],
  firmProfiles: RawFirmUserProfile[]
): { merged: HrEmployee[]; unsyncedProfiles: RawFirmUserProfile[] } {
  const localOverrides = readLocalHrOverrides();
  const profileByEmail = new Map<string, RawFirmUserProfile>();
  const profileById = new Map<string, RawFirmUserProfile>();

  firmProfiles.forEach((p) => {
    const emailKey = String(p.email || '').trim().toLowerCase();
    if (emailKey) profileByEmail.set(emailKey, p);
    if (p.id) profileById.set(p.id, p);
  });

  const matchedProfileKeys = new Set<string>();
  const merged: HrEmployee[] = dbEmployees.map((emp) => {
    const emailKey = String(emp.email || '').trim().toLowerCase();
    const matchedProfile =
      (emailKey ? profileByEmail.get(emailKey) : undefined) || profileById.get(emp.id);

    if (matchedProfile) {
      if (matchedProfile.email) matchedProfileKeys.add(matchedProfile.email.trim().toLowerCase());
      matchedProfileKeys.add(matchedProfile.id);
    }

    const override =
      (emailKey ? localOverrides[emailKey] : undefined) || localOverrides[emp.id.toLowerCase()] || {};

    return {
      ...emp,
      ...override,
      id: emp.id,
      source: matchedProfile ? 'hr_synced' : 'hr_only',
      linked_profile_id: matchedProfile?.id || null,
    };
  });

  const unsyncedProfiles: RawFirmUserProfile[] = [];
  firmProfiles.forEach((profile) => {
    const emailKey = String(profile.email || '').trim().toLowerCase();
    const alreadyMatched =
      (emailKey && matchedProfileKeys.has(emailKey)) || matchedProfileKeys.has(profile.id);
    if (!alreadyMatched) {
      unsyncedProfiles.push(profile);
      const baseEmp = buildEmployeeFromFirmProfile(profile);
      const override =
        (emailKey ? localOverrides[emailKey] : undefined) ||
        localOverrides[profile.id.toLowerCase()] ||
        {};
      merged.push({
        ...baseEmp,
        ...override,
        id: baseEmp.id,
        source: 'firm_profile',
        linked_profile_id: profile.id,
      });
    }
  });

  merged.sort((a, b) =>
    `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
  );

  return { merged, unsyncedProfiles };
}

// ============================================================================
// 1. BirthdayWidget
// ============================================================================

export interface BirthdayWidgetProps {
  currentUserId: string;
  onOpenHrModule?: () => void;
  compact?: boolean;
}

export const BirthdayWidget: React.FC<BirthdayWidgetProps> = ({
  currentUserId,
  onOpenHrModule,
  compact = false,
}) => {
  const currentYear = new Date().getFullYear();
  const [celebrants, setCelebrants] = useState<UpcomingBirthdayItem[]>([]);
  const [wishes, setWishes] = useState<HrBirthdayWish[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeWishId, setActiveWishId] = useState<string | null>(null);
  const [wishText, setWishText] = useState<string>('');
  const [sendingWish, setSendingWish] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadBirthdays = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [viewRes, empRes, wishRes] = await Promise.all([
        hrSupabase
          .from('upcoming_birthdays')
          .select('id, first_name, last_name, department, job_title, date_of_birth, is_today'),
        hrSupabase
          .from('employees')
          .select('id, first_name, last_name, department, job_title, date_of_birth, status')
          .not('date_of_birth', 'is', null),
        hrSupabase
          .from('birthday_wishes')
          .select('id, celebrant_id, sender_id, message, wish_year, created_at')
          .eq('wish_year', currentYear)
          .order('created_at', { ascending: false }),
      ]);

      const mergedMap = new Map<string, UpcomingBirthdayItem>();

      const pushCandidate = (row: any) => {
        if (!row?.id || !row?.date_of_birth) return;
        const calc = computeDaysUntilBirthday(row.date_of_birth);
        const isToday = Boolean(row.is_today) || calc.isToday;
        if (calc.daysUntil <= 30 || isToday) {
          mergedMap.set(row.id, {
            id: row.id,
            first_name: row.first_name || '',
            last_name: row.last_name || '',
            department: row.department || null,
            job_title: row.job_title || null,
            date_of_birth: row.date_of_birth,
            is_today: isToday,
            daysUntil: isToday ? 0 : calc.daysUntil,
            displayDate: calc.displayDate,
          });
        }
      };

      if (!viewRes.error && Array.isArray(viewRes.data)) {
        viewRes.data.forEach(pushCandidate);
      }
      if (!empRes.error && Array.isArray(empRes.data)) {
        empRes.data
          .filter((e) => (e.status || 'Active').toLowerCase() !== 'terminated')
          .forEach((e) => {
            if (!mergedMap.has(e.id)) pushCandidate(e);
          });
      }

      // Also include any firm profiles that have DOB saved in local HR enrichment cache
      const overrides = readLocalHrOverrides();
      Object.values(overrides).forEach((ov) => {
        if (ov?.id && ov?.date_of_birth && !mergedMap.has(ov.id)) {
          pushCandidate(ov);
        }
      });

      const sorted = Array.from(mergedMap.values()).sort((a, b) => a.daysUntil - b.daysUntil);
      setCelebrants(sorted);

      if (!wishRes.error && Array.isArray(wishRes.data)) {
        setWishes(wishRes.data as HrBirthdayWish[]);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load upcoming birthdays.');
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    loadBirthdays();
  }, [loadBirthdays]);

  const handleSendWish = async (celebrant: UpcomingBirthdayItem) => {
    const trimmed = wishText.trim();
    if (!trimmed) return;
    setSendingWish(true);
    setErrorMsg(null);
    try {
      const safeSenderId = await resolveSafeActorUuid(currentUserId);
      const payload: Record<string, any> = {
        celebrant_id: celebrant.id,
        message: trimmed,
        wish_year: currentYear,
      };
      if (safeSenderId) {
        payload.sender_id = safeSenderId;
      }

      const { data, error } = await hrSupabase
        .from('birthday_wishes')
        .insert([payload])
        .select('id, celebrant_id, sender_id, message, wish_year, created_at')
        .single();

      if (error) throw error;

      if (data) {
        setWishes((prev) => [data as HrBirthdayWish, ...prev]);
      } else {
        await loadBirthdays();
      }
      setWishText('');
      setActiveWishId(null);
      showCleanMessage(`Birthday wish sent to ${celebrant.first_name} ${celebrant.last_name}!`, 'success');
    } catch (err: any) {
      const msg = err?.message || 'Could not send birthday wish.';
      setErrorMsg(msg);
      showCleanMessage(msg, 'error');
    } finally {
      setSendingWish(false);
    }
  };

  const todayCount = celebrants.filter((c) => c.is_today).length;

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Cake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Team Birthdays &amp; Wishes
              </h3>
              {todayCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  <Sparkles className="w-3 h-3" />
                  {todayCount} Today
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upcoming firm staff birthdays within the next 30 days
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadBirthdays}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Refresh birthdays"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onOpenHrModule && (
            <button
              type="button"
              onClick={onOpenHrModule}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer"
            >
              <span>Open HR Suite</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Checking staff birthday calendar...</span>
        </div>
      ) : celebrants.length === 0 ? (
        <div className="py-5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            No upcoming staff birthdays in the next 30 days. Add employee dates of birth in the HR Directory to activate automated birthday alerts.
          </div>
          {onOpenHrModule && (
            <button
              type="button"
              onClick={onOpenHrModule}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
            >
              Manage Staff Directory →
            </button>
          )}
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${compact ? '' : 'md:grid-cols-2'} gap-3`}>
          {celebrants.map((person) => {
            const personWishes = wishes.filter((w) => w.celebrant_id === person.id);
            const isComposerOpen = activeWishId === person.id;
            return (
              <div
                key={person.id}
                className={`rounded-xl border p-4 transition-all space-y-3 ${
                  person.is_today
                    ? 'bg-gradient-to-br from-rose-50/80 to-amber-50/50 dark:from-rose-950/30 dark:to-amber-950/20 border-rose-200/90 dark:border-rose-800/70'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        person.is_today
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {getInitials(person.first_name, person.last_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {person.first_name} {person.last_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {[person.job_title, person.department].filter(Boolean).join(' · ') || 'MK Firm Staff'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tabular-nums shrink-0 border ${
                      person.is_today
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {person.is_today
                      ? 'Today!'
                      : person.daysUntil === 1
                      ? 'Tomorrow'
                      : `${person.displayDate} · ${person.daysUntil}d`}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    {personWishes.length} {personWishes.length === 1 ? 'wish' : 'wishes'} in {currentYear}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (isComposerOpen) {
                        setActiveWishId(null);
                      } else {
                        setActiveWishId(person.id);
                        setWishText(QUICK_WISH_TEMPLATES[0]);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-rose-300 hover:text-rose-700 dark:hover:text-rose-300 transition cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isComposerOpen ? 'Close' : 'Send Wish'}</span>
                  </button>
                </div>

                {isComposerOpen && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_WISH_TEMPLATES.map((tpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setWishText(tpl)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400 transition cursor-pointer"
                        >
                          Template {idx + 1}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={wishText}
                        onChange={(e) => setWishText(e.target.value)}
                        placeholder={`Write a birthday note for ${person.first_name}...`}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={sendingWish || !wishText.trim()}
                        onClick={() => handleSendWish(person)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50 transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        {sendingWish ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Post</span>
                      </button>
                    </div>
                  </div>
                )}

                {personWishes.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
                    {personWishes.slice(0, 2).map((w) => (
                      <div
                        key={w.id}
                        className="text-[11px] bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300"
                      >
                        “{w.message}”
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

// ============================================================================
// 2. HrModuleEntry (Full Super Admin HR Management Suite)
// ============================================================================

export interface HrModuleEntryProps {
  currentUser?: ActiveUser | null;
  gateForSuperAdmin?: boolean;
}

export const HrModuleEntry: React.FC<HrModuleEntryProps> = ({
  currentUser,
  gateForSuperAdmin = true,
}) => {
  const { availableUsers } = useApp();
  const isAuthorized = !gateForSuperAdmin || isSuperAdminUser(currentUser);

  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'leaves' | 'birthdays'>('employees');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<HrLeaveRequest[]>([]);
  const [leaveBalancesById, setLeaveBalancesById] = useState<Record<string, StaffLeaveBalance>>({});
  const [leaveBalancesByEmail, setLeaveBalancesByEmail] = useState<Record<string, StaffLeaveBalance>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [syncingStaff, setSyncingStaff] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Employee Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Leave Filter
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('ALL');
  const [updatingLeaveId, setUpdatingLeaveId] = useState<string | null>(null);

  // Employee Modal State
  const [isEmpModalOpen, setIsEmpModalOpen] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<HrEmployee | null>(null);
  const [savingEmployee, setSavingEmployee] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    job_title: '',
    department: DEPARTMENTS[0],
    status: 'Active',
  });

  // Leave Request Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [savingLeave, setSavingLeave] = useState<boolean>(false);
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: LEAVE_TYPES[0],
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    reason: '',
  });

  const [firmProfilesCount, setFirmProfilesCount] = useState<number>(0);

  const loadHrData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      void getStaffLeaveBalances({ defaultAnnualAllowance: 21 }).then((res) => {
        if (res.success) {
          setLeaveBalancesById(res.byEmployeeId);
          setLeaveBalancesByEmail(res.byEmail);
        }
      });
      // Automatically sync auth.users / firm profiles into the HR `employees` table on load
      const [syncResult, leaveRes, firmProfiles] = await Promise.all([
        syncFirmUsersToHrModule({ fallbackUsers: availableUsers }),
        hrSupabase
          .from('leave_requests')
          .select('id, employee_id, leave_type, start_date, end_date, reason, status, approved_by, created_at')
          .order('created_at', { ascending: false }),
        fetchConnectedFirmProfiles(availableUsers),
      ]);

      setFirmProfilesCount(Math.max(firmProfiles.length, syncResult.totalFetched || 0));

      let dbEmployees: HrEmployee[] = Array.isArray(syncResult.employees)
        ? (syncResult.employees as HrEmployee[])
        : [];

      // If sync returned empty, also try a direct read from `employees`
      if (dbEmployees.length === 0) {
        const empRes = await hrSupabase
          .from('employees')
          .select('id, first_name, last_name, email, phone_number, date_of_birth, job_title, department, status, created_at')
          .order('first_name', { ascending: true });
        if (!empRes.error && Array.isArray(empRes.data)) {
          dbEmployees = empRes.data as HrEmployee[];
        }
      }

      const finalMerge = mergeEmployeesWithFirmProfiles(dbEmployees, firmProfiles);
      setEmployees(finalMerge.merged);

      if (!leaveRes.error && Array.isArray(leaveRes.data)) {
        setLeaveRequests(leaveRes.data as HrLeaveRequest[]);
      } else if (leaveRes.error) {
        setErrorMsg(`Leave requests notice: ${leaveRes.error.message}`);
      }
    } catch (err: any) {
      // Even if Supabase query fails, fall back cleanly to AppContext firm users
      const fallbackProfiles = await fetchConnectedFirmProfiles(availableUsers);
      const fallbackMerge = mergeEmployeesWithFirmProfiles([], fallbackProfiles);
      setEmployees(fallbackMerge.merged);
      setFirmProfilesCount(fallbackProfiles.length);
      setErrorMsg(err?.message || 'Loaded connected firm staff profiles (cloud HR sync notice).');
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, availableUsers]);

  useEffect(() => {
    loadHrData();
  }, [loadHrData]);

  // Derived stats
  const employeeMap = useMemo(() => {
    const map = new Map<string, HrEmployee>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const activeStaffCount = useMemo(
    () => employees.filter((e) => (e.status || '').toLowerCase() === 'active').length,
    [employees]
  );

  const pendingLeaveCount = useMemo(
    () => leaveRequests.filter((l) => (l.status || '').toLowerCase() === 'pending').length,
    [leaveRequests]
  );

  const upcomingBirthdaysCount = useMemo(() => {
    return employees.filter((e) => {
      if (!e.date_of_birth || (e.status || '').toLowerCase() === 'terminated') return false;
      return computeDaysUntilBirthday(e.date_of_birth).daysUntil <= 30;
    }).length;
  }, [employees]);

  const departmentsList = useMemo(() => {
    const set = new Set<string>(DEPARTMENTS);
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((e) => {
      if (departmentFilter !== 'ALL' && (e.department || '') !== departmentFilter) return false;
      if (statusFilter !== 'ALL' && (e.status || 'Active') !== statusFilter) return false;
      if (!q) return true;
      const fullName = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
      return (
        fullName.includes(q) ||
        (e.email || '').toLowerCase().includes(q) ||
        (e.job_title || '').toLowerCase().includes(q) ||
        (e.department || '').toLowerCase().includes(q) ||
        (e.phone_number || '').toLowerCase().includes(q)
      );
    });
  }, [employees, searchQuery, departmentFilter, statusFilter]);

  const filteredLeaveRequests = useMemo(() => {
    if (leaveStatusFilter === 'ALL') return leaveRequests;
    return leaveRequests.filter(
      (l) => (l.status || 'Pending').toLowerCase() === leaveStatusFilter.toLowerCase()
    );
  }, [leaveRequests, leaveStatusFilter]);

  // Employee CRUD handlers
  const openAddEmployee = () => {
    setEditingEmployee(null);
    setEmpForm({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      date_of_birth: '',
      job_title: '',
      department: DEPARTMENTS[0],
      status: 'Active',
    });
    setIsEmpModalOpen(true);
  };

  const openEditEmployee = (emp: HrEmployee) => {
    setEditingEmployee(emp);
    setEmpForm({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      phone_number: emp.phone_number || '',
      date_of_birth: emp.date_of_birth ? String(emp.date_of_birth).slice(0, 10) : '',
      job_title: emp.job_title || '',
      department: emp.department || DEPARTMENTS[0],
      status: emp.status || 'Active',
    });
    setIsEmpModalOpen(true);
  };

  const ensureEmployeePersisted = async (emp: HrEmployee): Promise<string | null> => {
    if (emp.source !== 'firm_profile') {
      return emp.id;
    }
    const row: Record<string, any> = {
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email || null,
      phone_number: emp.phone_number || null,
      date_of_birth: emp.date_of_birth || null,
      job_title: emp.job_title || null,
      department: emp.department || null,
      status: emp.status || 'Active',
    };
    if (UUID_REGEX.test(emp.id)) {
      row.id = emp.id;
    }
    const { data, error } = await hrSupabase
      .from('employees')
      .upsert([row], { onConflict: 'id' })
      .select('id')
      .single();

    if (!error && data?.id) {
      return data.id;
    }
    // Retry without explicit id in case employees.id is generated or unique by email
    const { data: insertData, error: insertError } = await hrSupabase
      .from('employees')
      .insert([
        {
          first_name: emp.first_name,
          last_name: emp.last_name,
          email: emp.email || null,
          phone_number: emp.phone_number || null,
          date_of_birth: emp.date_of_birth || null,
          job_title: emp.job_title || null,
          department: emp.department || null,
          status: emp.status || 'Active',
        },
      ])
      .select('id')
      .single();
    if (!insertError && insertData?.id) {
      return insertData.id;
    }
    return null;
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.first_name.trim() || !empForm.last_name.trim()) {
      showCleanMessage('First name and last name are required.', 'warning');
      return;
    }
    setSavingEmployee(true);
    setErrorMsg(null);

    const payload = {
      first_name: empForm.first_name.trim(),
      last_name: empForm.last_name.trim(),
      email: empForm.email.trim() || null,
      phone_number: empForm.phone_number.trim() || null,
      date_of_birth: empForm.date_of_birth || null,
      job_title: empForm.job_title.trim() || null,
      department: empForm.department.trim() || null,
      status: empForm.status || 'Active',
    };

    try {
      if (editingEmployee) {
        if (editingEmployee.source === 'firm_profile') {
          const rowWithId = UUID_REGEX.test(editingEmployee.id)
            ? { id: editingEmployee.id, ...payload }
            : payload;
          const { error } = await hrSupabase
            .from('employees')
            .upsert([rowWithId], { onConflict: 'id' });
          if (error) {
            // Save enrichment locally if RLS restricts direct employees table insert
            const overrideKey = editingEmployee.email || editingEmployee.id;
            writeLocalHrOverride(overrideKey, { id: editingEmployee.id, ...payload });
            setEmployees((prev) =>
              prev.map((item) =>
                item.id === editingEmployee.id ? { ...item, ...payload } : item
              )
            );
            setIsEmpModalOpen(false);
            showCleanMessage(
              `Saved HR details for ${payload.first_name} ${payload.last_name} locally (Supabase employees RLS requires write policy for cloud sync).`,
              'warning'
            );
            return;
          }
          showCleanMessage(`Synced & updated HR record for ${payload.first_name} ${payload.last_name}.`, 'success');
        } else {
          const { error } = await hrSupabase
            .from('employees')
            .update(payload)
            .eq('id', editingEmployee.id);
          if (error) throw error;
          showCleanMessage(`Updated employee profile for ${payload.first_name} ${payload.last_name}.`, 'success');
        }
      } else {
        const { error } = await hrSupabase.from('employees').insert([payload]);
        if (error) throw error;
        showCleanMessage(`Added ${payload.first_name} ${payload.last_name} to the HR directory.`, 'success');
      }
      setIsEmpModalOpen(false);
      await loadHrData();
    } catch (err: any) {
      const msg = err?.message || 'Failed to save employee record.';
      setErrorMsg(msg);
      showCleanMessage(msg, 'error');
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleDeleteEmployee = async (emp: HrEmployee) => {
    setErrorMsg(null);
    if (emp.source === 'firm_profile') {
      setConfirmDeleteId(null);
      showCleanMessage(
        'This staff member is linked from active firm user accounts. Suspend or manage their login account under Access Roles & Staff.',
        'info'
      );
      return;
    }
    try {
      const { error } = await hrSupabase.from('employees').delete().eq('id', emp.id);
      if (error) throw error;
      setConfirmDeleteId(null);
      await loadHrData();
      showCleanMessage(`Removed HR record for ${emp.first_name} ${emp.last_name}.`, 'success');
    } catch (err: any) {
      const msg = err?.message || 'Failed to delete employee record.';
      setErrorMsg(msg);
      showCleanMessage(msg, 'error');
    }
  };

  const handleSyncFromFirmUsers = async () => {
    setSyncingStaff(true);
    setErrorMsg(null);
    try {
      const result = await syncFirmUsersToHrModule({ fallbackUsers: availableUsers });

      if (result.error && result.upsertedCount === 0 && result.employees.length === 0) {
        throw new Error(result.error);
      }

      if (result.upsertedCount > 0) {
        showCleanMessage(
          `Synced ${result.upsertedCount} firm user(s) from ${result.source} into the HR employees table.`,
          'success'
        );
      } else if (result.totalFetched > 0) {
        showCleanMessage(
          `All ${result.totalFetched} firm user accounts (${result.source}) are connected in the HR directory.`,
          'info'
        );
      } else {
        showCleanMessage('No firm user profiles found to sync.', 'warning');
      }

      await loadHrData();
    } catch (err: any) {
      const msg = err?.message || 'Failed to sync firm users into Supabase employees table.';
      setErrorMsg(msg);
      showCleanMessage(msg, 'error');
    } finally {
      setSyncingStaff(false);
    }
  };

  // Leave request handlers
  const openNewLeaveModal = (preselectedEmployeeId?: string) => {
    const defaultEmpId = preselectedEmployeeId || employees[0]?.id || '';
    setLeaveForm({
      employee_id: defaultEmpId,
      leave_type: LEAVE_TYPES[0],
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      reason: '',
    });
    setIsLeaveModalOpen(true);
  };

  const handleSaveLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.employee_id) {
      showCleanMessage('Please select an employee first.', 'warning');
      return;
    }
    if (leaveForm.end_date < leaveForm.start_date) {
      showCleanMessage('End date cannot be earlier than start date.', 'warning');
      return;
    }
    setSavingLeave(true);
    setErrorMsg(null);
    try {
      const targetEmp = employeeMap.get(leaveForm.employee_id);
      let persistedEmployeeId = leaveForm.employee_id;
      if (targetEmp && targetEmp.source === 'firm_profile') {
        const syncedId = await ensureEmployeePersisted(targetEmp);
        if (!syncedId) {
          throw new Error(
            'Could not register this firm user in the Supabase employees table before logging leave (check Supabase employees RLS policy).'
          );
        }
        persistedEmployeeId = syncedId;
      }

      const { error } = await hrSupabase.from('leave_requests').insert([
        {
          employee_id: persistedEmployeeId,
          leave_type: leaveForm.leave_type,
          start_date: leaveForm.start_date,
          end_date: leaveForm.end_date,
          reason: leaveForm.reason.trim() || null,
          status: 'Pending',
        },
      ]);
      if (error) throw error;
      setIsLeaveModalOpen(false);
      showCleanMessage('Leave request submitted for approval.', 'success');
      await loadHrData();
    } catch (err: any) {
      const msg = err?.message || 'Failed to submit leave request.';
      setErrorMsg(msg);
      showCleanMessage(msg, 'error');
    } finally {
      setSavingLeave(false);
    }
  };

  const handleLeaveDecision = async (leave: HrLeaveRequest, decision: 'Approved' | 'Rejected') => {
    setUpdatingLeaveId(leave.id);
    setErrorMsg(null);
    try {
      const safeApproverId = await resolveSafeActorUuid(currentUser?.id);
      const updatePayload: Record<string, any> = {
        status: decision,
      };
      if (safeApproverId) {
        updatePayload.approved_by = safeApproverId;
      }

      const { error } = await hrSupabase
        .from('leave_requests')
        .update(updatePayload)
        .eq('id', leave.id);
      if (error) throw error;

      setLeaveRequests((prev) =>
        prev.map((item) =>
          item.id === leave.id
            ? { ...item, status: decision, approved_by: safeApproverId || item.approved_by }
            : item
        )
      );
      showCleanMessage(`Leave request marked as ${decision}.`, 'success');
    } catch (err: any) {
      const msg = err?.message || `Failed to update leave request status.`;
      setErrorMsg(msg);
      showCleanMessage(msg, 'error');
    } finally {
      setUpdatingLeaveId(null);
    }
  };

  const selectedEmployee = useMemo(
    () => (selectedEmployeeId ? employees.find((e) => e.id === selectedEmployeeId) || null : null),
    [selectedEmployeeId, employees]
  );

  const hrWorkspaceLeaves: WorkspaceLeaveItem[] = useMemo(() => {
    const byId = new Map(employees.map((e) => [e.id, e]));
    return leaveRequests.map((lr) => {
      const emp = byId.get(lr.employee_id);
      const fullName = emp ? `${emp.first_name} ${emp.last_name}`.trim() : 'Firm Staff';
      const normStatus = String(lr.status || 'Pending').toLowerCase();
      return {
        id: lr.id,
        employee_id: lr.employee_id,
        employeeName: fullName,
        employeeEmail: emp?.email || '',
        branchName: emp?.department || 'Kampala Central (Head Office)',
        leave_type: lr.leave_type || 'Annual Leave',
        start_date: lr.start_date,
        end_date: lr.end_date,
        days: calcCalendarDays(lr.start_date, lr.end_date) || 1,
        reason: lr.reason || '',
        status:
          normStatus === 'approved'
            ? 'Approved'
            : normStatus === 'rejected'
            ? 'Rejected'
            : 'Pending',
        created_at: lr.created_at || new Date().toISOString(),
        persistedInSupabase: true,
      };
    });
  }, [leaveRequests, employees]);

  const selectedWorkspaceProfile: WorkspaceStaffProfile | null = useMemo(() => {
    if (!selectedEmployee) return null;
    const fullName = `${selectedEmployee.first_name} ${selectedEmployee.last_name}`.trim();
    const em = (selectedEmployee.email || '').trim().toLowerCase();
    const bal =
      leaveBalancesById[selectedEmployee.id.toLowerCase()] || (em ? leaveBalancesByEmail[em] : undefined);
    const annualAllowance = bal?.annual_allowance ?? 21;
    const usedLeaveDays =
      bal?.used_days ??
      hrWorkspaceLeaves
        .filter(
          (l) =>
            l.employee_id === selectedEmployee.id &&
            l.status === 'Approved' &&
            l.leave_type.toLowerCase().includes('annual')
        )
        .reduce((acc, l) => acc + l.days, 0);
    const pendingLeaveDays =
      bal?.pending_days ??
      hrWorkspaceLeaves
        .filter(
          (l) =>
            l.employee_id === selectedEmployee.id &&
            l.status === 'Pending' &&
            l.leave_type.toLowerCase().includes('annual')
        )
        .reduce((acc, l) => acc + l.days, 0);
    const otherLeaveDays = bal?.other_used_days ?? 0;
    const leaveRemaining = Math.max(0, annualAllowance - usedLeaveDays);
    const leaveRemainingPercent = Math.min(
      100,
      Math.max(0, Math.round((leaveRemaining / Math.max(1, annualAllowance)) * 100))
    );
    const statusNorm = (selectedEmployee.status || 'Active').toLowerCase();

    return {
      id: selectedEmployee.id,
      name: fullName || 'Firm Staff',
      email: selectedEmployee.email || 'staff@mkadvocates.ug',
      phone: selectedEmployee.phone_number || undefined,
      roleTitle: selectedEmployee.job_title || 'Staff Member',
      role: selectedEmployee.job_title || 'lawyer',
      branchName: selectedEmployee.department || 'Kampala Central (Head Office)',
      department: selectedEmployee.department || undefined,
      isActive: statusNorm === 'active',
      statusLabel: selectedEmployee.status || 'Active',
      annualAllowance,
      usedLeaveDays,
      pendingLeaveDays,
      otherLeaveDays,
      leaveRemaining,
      leaveRemainingPercent,
      dateOfBirth: selectedEmployee.date_of_birth,
      joinedAt: selectedEmployee.created_at || null,
      isUuid: UUID_REGEX.test(selectedEmployee.id),
    };
  }, [selectedEmployee, leaveBalancesById, leaveBalancesByEmail, hrWorkspaceLeaves]);

  // Super Admin Gate
  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto mt-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Super Admin Authorization Required
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Human Resources, Employee Records, and Leave Approvals are restricted to Managing Partners and Super Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 text-slate-900 dark:text-slate-100">
      {selectedWorkspaceProfile && selectedEmployee ? (
        <StaffMemberWorkspace
          staff={selectedWorkspaceProfile}
          onBack={() => setSelectedEmployeeId(null)}
          leaveRequests={hrWorkspaceLeaves}
          onLeaveStatusChange={(record, nextStatus) => {
            const matched = leaveRequests.find((lr) => lr.id === record.id);
            if (matched) {
              void handleLeaveDecision(matched, nextStatus);
            }
          }}
          approvals={INITIAL_APPROVAL_ITEMS}
          onApplyLeave={(empId) => openNewLeaveModal(empId)}
        />
      ) : (
      <>
      {/* Executive Header */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 border border-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">HR &amp; People Operations</h1>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 font-semibold">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Centralized staff directory, leave approvals, and birthday milestone tracking across MK Advocates
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadHrData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleSyncFromFirmUsers}
            disabled={syncingStaff}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 transition cursor-pointer disabled:opacity-50"
            title="Import existing MK Firm user profiles into the HR employees directory"
          >
            {syncingStaff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>Sync Firm Staff</span>
          </button>
          <button
            type="button"
            onClick={openAddEmployee}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Staff
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums mt-3">
            {employees.length}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {firmProfilesCount > 0 ? `${firmProfilesCount} connected firm users` : 'Registered in HR directory'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Staff
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums mt-3">
            {activeStaffCount}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Currently on active duty</p>
        </div>

        <div
          onClick={() => setActiveSubTab('leaves')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Leave
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 tabular-nums mt-3">
            {pendingLeaveCount}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Awaiting partner decision</p>
        </div>

        <div
          onClick={() => setActiveSubTab('birthdays')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-rose-300 dark:hover:border-rose-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Upcoming Birthdays
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Cake className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums mt-3">
            {upcomingBirthdaysCount}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Within the next 30 days</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('employees')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === 'employees'
              ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employee Directory ({employees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('leaves')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === 'leaves'
              ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          <span>Leave Requests ({leaveRequests.length})</span>
          {pendingLeaveCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 tabular-nums">
              {pendingLeaveCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('birthdays')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === 'birthdays'
              ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Cake className="w-4 h-4" />
          <span>Birthdays &amp; Wishes</span>
        </button>
      </div>

      {/* TAB 1: EMPLOYEE DIRECTORY */}
      {activeSubTab === 'employees' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, role, or department..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
              >
                <option value="ALL">All Departments</option>
                {departmentsList.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                {EMPLOYEE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading employee directory...</span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {employees.length === 0 ? 'No employees added yet' : 'No matching employees found'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {employees.length === 0
                    ? 'Add staff manually or click Sync Firm Staff to import existing MK Advocates user profiles.'
                    : 'Try clearing your search query or adjusting the department/status filters.'}
                </p>
              </div>
              {employees.length === 0 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSyncFromFirmUsers}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Sync Firm Staff
                  </button>
                  <button
                    type="button"
                    onClick={openAddEmployee}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    + Add First Employee
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Employee</th>
                    <th className="py-3 px-4 font-semibold">Role &amp; Department</th>
                    <th className="py-3 px-4 font-semibold">Contact</th>
                    <th className="py-3 px-4 font-semibold">Date of Birth</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedEmployeeId(emp.id)}
                            className="w-9 h-9 rounded-full bg-slate-900 dark:bg-blue-600/20 text-white dark:text-blue-300 border border-slate-800 dark:border-blue-500/30 flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition"
                            title="Open Staff Member Workspace"
                          >
                            {getInitials(emp.first_name, emp.last_name)}
                          </button>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setSelectedEmployeeId(emp.id)}
                                className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition text-left cursor-pointer"
                              >
                                {emp.first_name} {emp.last_name}
                              </button>
                              {(emp.source === 'hr_synced' || emp.source === 'firm_profile') && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/70"
                                  title={
                                    emp.source === 'hr_synced'
                                      ? 'Connected firm user synced with HR employees table'
                                      : 'Connected directly from MK Firm user profiles'
                                  }
                                >
                                  <Link2 className="w-2.5 h-2.5" />
                                  Firm User
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span>{emp.email || 'No email'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {emp.job_title || 'Staff Member'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          <span>{emp.department || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {emp.phone_number || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {formatShortDate(emp.date_of_birth)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusPillClasses(
                            emp.status || 'Active'
                          )}`}
                        >
                          {emp.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {confirmDeleteId === emp.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(emp)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedEmployeeId(emp.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                              title="Open Staff Member Workspace"
                            >
                              <span>Workspace</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openNewLeaveModal(emp.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                              title="Log leave request"
                            >
                              <CalendarClock className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditEmployee(emp)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                              title="Edit employee"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(emp.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                              title="Delete employee"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LEAVE REQUESTS */}
      {activeSubTab === 'leaves' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(['ALL', 'Pending', 'Approved', 'Rejected'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setLeaveStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    leaveStatusFilter === st
                      ? 'bg-slate-900 dark:bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {st === 'ALL' ? 'All Requests' : st}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => openNewLeaveModal()}
              disabled={employees.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Log Leave Request</span>
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading leave requests...</span>
            </div>
          ) : filteredLeaveRequests.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                No leave requests found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Submit a staff leave application to track schedules and approvals.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Employee</th>
                    <th className="py-3 px-4 font-semibold">Leave Type</th>
                    <th className="py-3 px-4 font-semibold">Period</th>
                    <th className="py-3 px-4 font-semibold">Reason</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLeaveRequests.map((leave) => {
                    const emp = employeeMap.get(leave.employee_id);
                    const days = calcCalendarDays(leave.start_date, leave.end_date);
                    const isPending = (leave.status || 'Pending').toLowerCase() === 'pending';
                    return (
                      <tr
                        key={leave.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {emp ? `${emp.first_name} ${emp.last_name}` : 'Staff Member'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {emp?.department || emp?.job_title || '—'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {leave.leave_type}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          <div>
                            {formatShortDate(leave.start_date)} → {formatShortDate(leave.end_date)}
                          </div>
                          {days > 0 && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {days} {days === 1 ? 'day' : 'days'}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs">
                          {leave.reason || <span className="italic text-slate-400">No notes</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusPillClasses(
                              leave.status || 'Pending'
                            )}`}
                          >
                            {leave.status || 'Pending'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {isPending ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={updatingLeaveId === leave.id}
                                onClick={() => handleLeaveDecision(leave, 'Approved')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition disabled:opacity-50 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                disabled={updatingLeaveId === leave.id}
                                onClick={() => handleLeaveDecision(leave, 'Rejected')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold transition disabled:opacity-50 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BIRTHDAYS & WISHES */}
      {activeSubTab === 'birthdays' && (
        <BirthdayWidget currentUserId={currentUser?.id || ''} />
      )}
      </>
      )}

      {/* MODAL: ADD / EDIT EMPLOYEE */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">
                  {editingEmployee ? 'Edit Employee Profile' : 'Add New Employee'}
                </h2>
                <p className="text-[11px] text-slate-400">
                  Saved directly to the Supabase HR employees table
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEmpModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={empForm.first_name}
                    onChange={(e) => setEmpForm((p) => ({ ...p, first_name: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={empForm.last_name}
                    onChange={(e) => setEmpForm((p) => ({ ...p, last_name: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={empForm.email}
                    onChange={(e) => setEmpForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="advocate@mkadvocates.ug"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={empForm.phone_number}
                    onChange={(e) => setEmpForm((p) => ({ ...p, phone_number: e.target.value }))}
                    placeholder="+256 7XX XXX XXX"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={empForm.job_title}
                    onChange={(e) => setEmpForm((p) => ({ ...p, job_title: e.target.value }))}
                    placeholder="e.g. Senior Associate"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={empForm.department}
                    onChange={(e) => setEmpForm((p) => ({ ...p, department: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {departmentsList.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={empForm.date_of_birth}
                    onChange={(e) => setEmpForm((p) => ({ ...p, date_of_birth: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Employment Status
                  </label>
                  <select
                    value={empForm.status}
                    onChange={(e) => setEmpForm((p) => ({ ...p, status: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {EMPLOYEE_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEmployee}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {savingEmployee && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingEmployee ? 'Save Changes' : 'Create Employee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW LEAVE REQUEST */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Log Staff Leave Request</h2>
                <p className="text-[11px] text-slate-400">
                  Creates a leave application in Supabase for approval tracking
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={leaveForm.employee_id}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, employee_id: e.target.value }))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} {emp.department ? `(${emp.department})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Leave Type <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, leave_type: e.target.value }))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm((p) => ({ ...p, start_date: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Handover Notes
                </label>
                <textarea
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Optional reason or file coverage handover details..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLeave}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {savingLeave && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Leave Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HrModuleEntry;
