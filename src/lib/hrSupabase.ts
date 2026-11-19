import { supabase } from './supabase';
import { calculateUgandaWorkingDays } from '../utils/ugandaHolidays';

/**
 * Shared authenticated Supabase client for the HR Module.
 * Uses the application's configured Vite Supabase singleton so active auth sessions
 * and RLS policies remain synchronized across the ERP.
 */
export const hrSupabase = supabase;

export interface ActiveUser {
  id?: string | null;
  role?: string | null;
  roleId?: string | null;
  role_id?: string | null;
  email?: string | null;
  name?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  isSuperAdmin?: boolean;
  is_super_admin?: boolean;
}

export interface HrSyncedEmployee {
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
}

export interface SyncFirmUsersResult {
  success: boolean;
  source: 'auth.users' | 'profiles' | 'local';
  totalFetched: number;
  upsertedCount: number;
  employees: HrSyncedEmployee[];
  error?: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function splitUserFullName(rawName?: string | null, email?: string | null): { first_name: string; last_name: string } {
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

  const emailPrefix = String(email || '').split('@')[0] || 'Firm';
  const parts = emailPrefix.split(/[._-]+/).filter(Boolean);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    first_name: cap(parts[0] || 'Firm'),
    last_name: parts.length > 1 ? parts.slice(1).map(cap).join(' ') : 'Member',
  };
}

function formatHrJobTitle(role?: string | null, roleTitle?: string | null): string {
  if (roleTitle && String(roleTitle).trim()) return String(roleTitle).trim();
  const r = String(role || '').trim().toLowerCase();
  if (r === 'partner' || r === 'managing_partner') return 'Managing Partner';
  if (r === 'super_admin' || r === 'superadmin') return 'Super Administrator';
  if (r === 'branch_admin') return 'Branch Administrator';
  if (r === 'admin_finance_assistant') return 'Admin & Finance Assistant';
  if (r === 'lawyer' || r === 'advocate') return 'Litigation Advocate';
  if (r === 'clerk') return 'Legal Clerk';
  return role ? String(role).charAt(0).toUpperCase() + String(role).slice(1) : 'Firm Staff';
}

/**
 * Fetches all firm users from Supabase `auth.users` (via the authenticated backend sync route
 * with automatic fallback to `public.profiles` and optional directory users) and upserts them
 * into the HR module's `employees` table while preserving existing HR-specific fields such as
 * date_of_birth, phone_number, department, and status.
 */
export async function syncFirmUsersToHrModule(options?: {
  fallbackUsers?: any[];
}): Promise<SyncFirmUsersResult> {
  // 1. Primary path: invoke server route that reads `auth.users` via Supabase Admin API and upserts into `employees`
  try {
    const { data: sessionData } = await hrSupabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch('/api/hr/sync-users', {
      method: 'POST',
      headers,
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const json = await res.json();
      if (json?.success && Array.isArray(json.employees) && json.employees.length > 0 && !json.error) {
        return {
          success: true,
          source: json.source === 'auth.users' ? 'auth.users' : 'profiles',
          totalFetched: Number(json.totalFetched || json.employees.length),
          upsertedCount: Number(json.upsertedCount || 0),
          employees: json.employees as HrSyncedEmployee[],
          error: null,
        };
      }
    }
  } catch {
    // Backend route unavailable (e.g. static SPA host) — fall through to direct Supabase sync below
  }

  // 2. Fallback path: fetch firm accounts from `public.profiles` (mirrored from `auth.users`) + optional fallbackUsers
  try {
    const [profilesRes, existingRes] = await Promise.all([
      hrSupabase
        .from('profiles')
        .select('id, full_name, email, role, role_title, branch, branch_name, is_suspended, created_at')
        .order('full_name', { ascending: true }),
      hrSupabase
        .from('employees')
        .select('id, first_name, last_name, email, phone_number, date_of_birth, job_title, department, status, created_at'),
    ]);

    const byEmail = new Map<string, any>();
    const withoutEmail: any[] = [];

    if (!profilesRes.error && Array.isArray(profilesRes.data)) {
      profilesRes.data.forEach((p: any) => {
        const emailKey = String(p?.email || '').trim().toLowerCase();
        if (emailKey) {
          byEmail.set(emailKey, p);
        } else if (p?.id) {
          withoutEmail.push(p);
        }
      });
    }

    if (Array.isArray(options?.fallbackUsers)) {
      options.fallbackUsers.forEach((u: any) => {
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
            is_suspended: Boolean(u.isSuspended || u.isActive === false),
          });
        }
      });
    }

    const firmUsers = [...Array.from(byEmail.values()), ...withoutEmail];
    const existingEmployees: HrSyncedEmployee[] =
      !existingRes.error && Array.isArray(existingRes.data)
        ? (existingRes.data as HrSyncedEmployee[])
        : [];

    const existingById = new Map<string, HrSyncedEmployee>();
    const existingByEmail = new Map<string, HrSyncedEmployee>();
    existingEmployees.forEach((emp) => {
      if (emp.id) existingById.set(emp.id, emp);
      if (emp.email) existingByEmail.set(emp.email.trim().toLowerCase(), emp);
    });

    const rowsToUpsert: Array<Record<string, any>> = firmUsers
      .filter((u) => UUID_REGEX.test(String(u?.id || '')) || Boolean(u?.email))
      .map((u) => {
        const email = u?.email ? String(u.email).trim() : null;
        const emailKey = email ? email.toLowerCase() : '';
        const existing = existingById.get(String(u.id)) || (emailKey ? existingByEmail.get(emailKey) : undefined);
        const { first_name, last_name } = splitUserFullName(u.full_name || u.name, email);

        const row: Record<string, any> = {
          first_name: existing?.first_name || first_name,
          last_name: existing?.last_name || last_name,
          email: email || existing?.email || null,
          phone_number: existing?.phone_number || (u.phone ? String(u.phone).trim() : null),
          date_of_birth: existing?.date_of_birth || null,
          job_title: existing?.job_title || formatHrJobTitle(u.role, u.role_title || u.title),
          department:
            existing?.department ||
            String(u.branch_name || u.branch || 'Kampala Central (Head Office)').trim(),
          status: existing?.status || (u.is_suspended ? 'Inactive' : 'Active'),
        };

        const resolvedId = existing?.id || u.id;
        if (UUID_REGEX.test(String(resolvedId || ''))) {
          row.id = String(resolvedId);
        }

        return row;
      });

    let upsertedCount = 0;
    let upsertError: string | null = null;

    if (rowsToUpsert.length > 0) {
      const withId = rowsToUpsert.filter((r) => Boolean(r.id));
      if (withId.length > 0) {
        const { data: upsertedData, error: upErr } = await hrSupabase
          .from('employees')
          .upsert(withId, { onConflict: 'id' })
          .select('id, first_name, last_name, email, phone_number, date_of_birth, job_title, department, status, created_at');
        if (upErr) {
          upsertError = upErr.message;
        } else {
          upsertedCount = Array.isArray(upsertedData) ? upsertedData.length : withId.length;
        }
      }
    }

    const { data: refreshed } = await hrSupabase
      .from('employees')
      .select('id, first_name, last_name, email, phone_number, date_of_birth, job_title, department, status, created_at')
      .order('first_name', { ascending: true });

    const finalEmployees: HrSyncedEmployee[] =
      Array.isArray(refreshed) && refreshed.length > 0
        ? (refreshed as HrSyncedEmployee[])
        : (rowsToUpsert as HrSyncedEmployee[]);

    return {
      success: !upsertError || finalEmployees.length > 0,
      source: profilesRes.error ? 'local' : 'profiles',
      totalFetched: firmUsers.length,
      upsertedCount,
      employees: finalEmployees,
      error: upsertError,
    };
  } catch (err: any) {
    return {
      success: false,
      source: 'local',
      totalFetched: 0,
      upsertedCount: 0,
      employees: [],
      error: err?.message || 'Unable to sync firm users to HR module.',
    };
  }
}

export interface HrLeaveRequestRecord {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  approved_by: string | null;
  created_at: string;
}

export interface SubmitLeaveRequestInput {
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  status?: 'Pending' | 'Approved' | 'Rejected';
  /** Optional staff profile metadata used to ensure the parent `employees` FK row exists before insert */
  employee_name?: string | null;
  employee_email?: string | null;
  job_title?: string | null;
  department?: string | null;
}

export interface SubmitLeaveRequestResult {
  success: boolean;
  data: HrLeaveRequestRecord | null;
  persistedInSupabase: boolean;
  error: string | null;
}

/**
 * Inserts a new leave request into Supabase `leave_requests`.
 * Ensures a matching parent row exists in `employees` when `employee_id` is a valid UUID
 * so foreign-key constraints succeed cleanly for newly connected firm users.
 */
export async function submitLeaveRequest(
  input: SubmitLeaveRequestInput
): Promise<SubmitLeaveRequestResult> {
  const employeeId = String(input.employee_id || '').trim();
  const leaveType = String(input.leave_type || '').trim();
  const startDate = String(input.start_date || '').trim();
  const endDate = String(input.end_date || '').trim();
  const reason = input.reason ? String(input.reason).trim() : null;
  const status = input.status || 'Pending';

  if (!employeeId) {
    return { success: false, data: null, persistedInSupabase: false, error: 'Employee ID is required.' };
  }
  if (!leaveType || !startDate || !endDate) {
    return {
      success: false,
      data: null,
      persistedInSupabase: false,
      error: 'Leave type, start date, and end date are required.',
    };
  }
  if (endDate < startDate) {
    return {
      success: false,
      data: null,
      persistedInSupabase: false,
      error: 'End date cannot be earlier than start date.',
    };
  }
  const workingDays = calculateUgandaWorkingDays(startDate, endDate);
  if (workingDays <= 0) {
    return {
      success: false,
      data: null,
      persistedInSupabase: false,
      error:
        'Selected dates only fall on weekends or Uganda public holidays (0 working days). Please select at least one working day.',
    };
  }

  if (!UUID_REGEX.test(employeeId)) {
    return {
      success: false,
      data: null,
      persistedInSupabase: false,
      error: 'Selected staff account is not linked to a UUID employee record yet.',
    };
  }

  try {
    // Ensure parent employee record exists in `employees` (best-effort; ignores RLS errors if already synced)
    if (input.employee_name || input.employee_email) {
      const { first_name, last_name } = splitUserFullName(input.employee_name, input.employee_email);
      await hrSupabase
        .from('employees')
        .upsert(
          [
            {
              id: employeeId,
              first_name,
              last_name,
              email: input.employee_email ? String(input.employee_email).trim() : null,
              job_title: input.job_title ? String(input.job_title).trim() : 'Firm Staff',
              department: input.department ? String(input.department).trim() : 'Kampala Central (Head Office)',
              status: 'Active',
            },
          ],
          { onConflict: 'id', ignoreDuplicates: true }
        )
        .select('id');
    }

    const { data, error } = await hrSupabase
      .from('leave_requests')
      .insert([
        {
          employee_id: employeeId,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
          status,
        },
      ])
      .select('id, employee_id, leave_type, start_date, end_date, reason, status, approved_by, created_at')
      .single();

    if (error) {
      return {
        success: false,
        data: null,
        persistedInSupabase: false,
        error: error.message || 'Failed to insert leave request into Supabase.',
      };
    }

    return {
      success: true,
      data: data as HrLeaveRequestRecord,
      persistedInSupabase: true,
      error: null,
    };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      persistedInSupabase: false,
      error: err?.message || 'Unexpected error while submitting leave request.',
    };
  }
}

export interface EmployeeAllowanceRecord {
  id?: string;
  employee_id: string;
  year?: number | null;
  allowance_year?: number | null;
  annual_allowance?: number | null;
  annual_days?: number | null;
  annual_leave_days?: number | null;
  total_days?: number | null;
  allowance_days?: number | null;
  carry_over_days?: number | null;
  carried_over_days?: number | null;
}

export interface StaffLeaveBalance {
  employee_id: string;
  email: string | null;
  full_name: string;
  job_title: string | null;
  department: string | null;
  year: number;
  annual_allowance: number;
  carry_over_days: number;
  allowance_source: 'employee_allowances' | 'default';
  /** Approved annual leave days deducted from annual_allowance */
  used_days: number;
  /** Pending annual leave days awaiting approval */
  pending_days: number;
  /** Approved non-annual leave days (e.g. Sick, Study, Compassionate) */
  other_used_days: number;
  remaining_days: number;
  remaining_percent: number;
}

export interface FetchStaffLeaveBalancesOptions {
  /** Calendar year to aggregate leave usage for (defaults to current year) */
  year?: number;
  /** Default annual leave entitlement in days when no row exists in `employee_allowances` (defaults to 21) */
  defaultAnnualAllowance?: number;
  /** Optional list of employee IDs to filter results to */
  employeeIds?: string[];
}

export interface FetchStaffLeaveBalancesResult {
  success: boolean;
  balances: StaffLeaveBalance[];
  byEmployeeId: Record<string, StaffLeaveBalance>;
  byEmail: Record<string, StaffLeaveBalance>;
  error: string | null;
}

function isAnnualLeaveCategory(leaveType?: string | null): boolean {
  const normalized = String(leaveType || '').trim().toLowerCase();
  return !normalized || normalized.includes('annual');
}

function calculateInclusiveLeaveDays(startDate?: string | null, endDate?: string | null): number {
  return calculateUgandaWorkingDays(startDate, endDate);
}

function matchesTargetYear(startDate?: string | null, endDate?: string | null, targetYear?: number): boolean {
  if (!targetYear) return true;
  const sYear = startDate ? new Date(startDate).getFullYear() : NaN;
  const eYear = endDate ? new Date(endDate).getFullYear() : NaN;
  if (Number.isNaN(sYear) && Number.isNaN(eYear)) return true;
  return sYear === targetYear || eYear === targetYear;
}

function resolveAllowanceDaysFromRow(
  row: EmployeeAllowanceRecord,
  fallbackAllowance: number
): { baseDays: number; carryOverDays: number; totalDays: number } {
  const candidates = [
    row.annual_allowance,
    row.annual_leave_days,
    row.annual_days,
    row.allowance_days,
    row.total_days,
  ];
  const parsedBase = candidates.find(
    (val): val is number => typeof val === 'number' && Number.isFinite(val) && val > 0
  );
  const baseDays = parsedBase ?? fallbackAllowance;

  const carryCandidates = [row.carry_over_days, row.carried_over_days];
  const parsedCarry = carryCandidates.find(
    (val): val is number => typeof val === 'number' && Number.isFinite(val) && val > 0
  );
  const carryOverDays = parsedCarry ?? 0;

  return {
    baseDays,
    carryOverDays,
    totalDays: Math.max(1, baseDays + carryOverDays),
  };
}

/**
 * Queries `leave_requests` and `employee_allowances` (enriched with `employees` and `profiles`)
 * to calculate remaining annual leave days per employee for the target calendar year.
 */
export async function getStaffLeaveBalances(
  options: FetchStaffLeaveBalancesOptions = {}
): Promise<FetchStaffLeaveBalancesResult> {
  const targetYear = options.year ?? new Date().getFullYear();
  const defaultAllowance = Math.max(1, options.defaultAnnualAllowance ?? 21);
  const filterIdSet =
    options.employeeIds && options.employeeIds.length > 0
      ? new Set(options.employeeIds.map((id) => String(id).trim().toLowerCase()))
      : null;

  try {
    const validUuidFilter =
      options.employeeIds && options.employeeIds.length > 0
        ? options.employeeIds.filter((id) => UUID_REGEX.test(String(id).trim()))
        : [];

    let leavesQuery = hrSupabase
      .from('leave_requests')
      .select('id, employee_id, leave_type, start_date, end_date, status, created_at');

    let allowancesQuery = hrSupabase.from('employee_allowances').select('*');

    if (validUuidFilter.length > 0) {
      leavesQuery = leavesQuery.in('employee_id', validUuidFilter);
      allowancesQuery = allowancesQuery.in('employee_id', validUuidFilter);
    }

    const [allowancesRes, leavesRes, employeesRes, profilesRes] = await Promise.all([
      allowancesQuery,
      leavesQuery,
      hrSupabase
        .from('employees')
        .select('id, first_name, last_name, email, job_title, department, status')
        .order('first_name', { ascending: true }),
      hrSupabase
        .from('profiles')
        .select('id, full_name, email, role, role_title, branch, branch_name')
        .order('full_name', { ascending: true }),
    ]);

    if (allowancesRes.error && leavesRes.error && employeesRes.error && profilesRes.error) {
      return {
        success: false,
        balances: [],
        byEmployeeId: {},
        byEmail: {},
        error:
          leavesRes.error.message ||
          allowancesRes.error.message ||
          employeesRes.error.message ||
          'Failed to fetch staff leave balances.',
      };
    }

    // Resolve per-employee entitlement from `employee_allowances` (preferring rows for targetYear)
    const allowanceByEmp = new Map<
      string,
      { totalDays: number; carryOverDays: number; matchedYear: boolean }
    >();

    if (!allowancesRes.error && Array.isArray(allowancesRes.data)) {
      (allowancesRes.data as EmployeeAllowanceRecord[]).forEach((row) => {
        if (!row?.employee_id) return;
        const empKey = String(row.employee_id).trim().toLowerCase();
        if (filterIdSet && !filterIdSet.has(empKey)) return;

        const rowYear =
          typeof row.year === 'number'
            ? row.year
            : typeof row.allowance_year === 'number'
            ? row.allowance_year
            : null;
        if (rowYear !== null && rowYear !== targetYear) {
          // Ignore rows explicitly scoped to a different calendar year
          return;
        }

        const { totalDays, carryOverDays } = resolveAllowanceDaysFromRow(row, defaultAllowance);
        const existing = allowanceByEmp.get(empKey);
        const isExactYear = rowYear === targetYear;

        if (!existing || (isExactYear && !existing.matchedYear)) {
          allowanceByEmp.set(empKey, {
            totalDays,
            carryOverDays,
            matchedYear: isExactYear,
          });
        }
      });
    }

    // Build unified staff registry keyed by lowercased employee_id
    const staffMap = new Map<
      string,
      {
        employee_id: string;
        email: string | null;
        full_name: string;
        job_title: string | null;
        department: string | null;
      }
    >();

    const profilesByEmail = new Map<string, any>();
    (profilesRes.data || []).forEach((p: any) => {
      const em = String(p?.email || '').trim().toLowerCase();
      if (em) profilesByEmail.set(em, p);
      if (!p?.id) return;
      const key = String(p.id).trim().toLowerCase();
      if (filterIdSet && !filterIdSet.has(key)) return;
      staffMap.set(key, {
        employee_id: String(p.id),
        email: p.email ? String(p.email).trim() : null,
        full_name: String(p.full_name || em.split('@')[0] || 'Firm Staff').trim(),
        job_title: p.role_title || p.role || null,
        department: p.branch_name || p.branch || null,
      });
    });

    (employeesRes.data || []).forEach((emp: any) => {
      if (!emp?.id) return;
      const key = String(emp.id).trim().toLowerCase();
      if (filterIdSet && !filterIdSet.has(key)) return;
      const em = String(emp.email || '').trim().toLowerCase();
      const matchedProfile = em ? profilesByEmail.get(em) : undefined;
      const fullName =
        `${emp.first_name || ''} ${emp.last_name || ''}`.trim() ||
        matchedProfile?.full_name ||
        (em ? em.split('@')[0] : 'Firm Staff');
      const existing = staffMap.get(key);
      staffMap.set(key, {
        employee_id: String(emp.id),
        email: emp.email ? String(emp.email).trim() : existing?.email || null,
        full_name: fullName,
        job_title: emp.job_title || existing?.job_title || null,
        department: emp.department || existing?.department || null,
      });
    });

    // Include any employee IDs present in `employee_allowances` not yet in `staffMap`
    allowanceByEmp.forEach((_val, empKey) => {
      if (!staffMap.has(empKey)) {
        const rawRow = (allowancesRes.data as EmployeeAllowanceRecord[] | null)?.find(
          (r) => String(r?.employee_id || '').trim().toLowerCase() === empKey
        );
        staffMap.set(empKey, {
          employee_id: String(rawRow?.employee_id || empKey),
          email: null,
          full_name: 'Firm Staff',
          job_title: null,
          department: null,
        });
      }
    });

    // Aggregate approved annual, pending annual, and approved non-annual leave days per employee_id
    const usedAnnualByEmp = new Map<string, number>();
    const pendingAnnualByEmp = new Map<string, number>();
    const otherUsedByEmp = new Map<string, number>();

    (leavesRes.data || []).forEach((lr: any) => {
      if (!lr?.employee_id) return;
      const empKey = String(lr.employee_id).trim().toLowerCase();
      if (filterIdSet && !filterIdSet.has(empKey)) return;
      if (!matchesTargetYear(lr.start_date, lr.end_date, targetYear)) return;

      const statusNorm = String(lr.status || '').trim().toLowerCase();
      const days = calculateInclusiveLeaveDays(lr.start_date, lr.end_date);
      const isAnnual = isAnnualLeaveCategory(lr.leave_type);

      if (statusNorm === 'approved') {
        if (isAnnual) {
          usedAnnualByEmp.set(empKey, (usedAnnualByEmp.get(empKey) || 0) + days);
        } else {
          otherUsedByEmp.set(empKey, (otherUsedByEmp.get(empKey) || 0) + days);
        }
      } else if (statusNorm === 'pending' && isAnnual) {
        pendingAnnualByEmp.set(empKey, (pendingAnnualByEmp.get(empKey) || 0) + days);
      }

      if (!staffMap.has(empKey)) {
        staffMap.set(empKey, {
          employee_id: String(lr.employee_id),
          email: null,
          full_name: 'Firm Staff',
          job_title: null,
          department: null,
        });
      }
    });

    const balances: StaffLeaveBalance[] = [];
    const byEmployeeId: Record<string, StaffLeaveBalance> = {};
    const byEmail: Record<string, StaffLeaveBalance> = {};

    staffMap.forEach((member, empKey) => {
      const customAllowance = allowanceByEmp.get(empKey);
      const allowance = Math.max(1, customAllowance?.totalDays ?? defaultAllowance);
      const carryOverDays = customAllowance?.carryOverDays ?? 0;
      const allowanceSource: 'employee_allowances' | 'default' = customAllowance
        ? 'employee_allowances'
        : 'default';

      const usedDays = usedAnnualByEmp.get(empKey) || 0;
      const pendingDays = pendingAnnualByEmp.get(empKey) || 0;
      const otherUsedDays = otherUsedByEmp.get(empKey) || 0;
      const remainingDays = Math.max(0, allowance - usedDays);
      const remainingPercent = Math.min(100, Math.max(0, Math.round((remainingDays / allowance) * 100)));

      const record: StaffLeaveBalance = {
        employee_id: member.employee_id,
        email: member.email,
        full_name: member.full_name,
        job_title: member.job_title,
        department: member.department,
        year: targetYear,
        annual_allowance: allowance,
        carry_over_days: carryOverDays,
        allowance_source: allowanceSource,
        used_days: usedDays,
        pending_days: pendingDays,
        other_used_days: otherUsedDays,
        remaining_days: remainingDays,
        remaining_percent: remainingPercent,
      };

      balances.push(record);
      byEmployeeId[empKey] = record;
      if (record.email) {
        byEmail[record.email.trim().toLowerCase()] = record;
      }
    });

    balances.sort((a, b) => a.full_name.localeCompare(b.full_name));

    return {
      success: true,
      balances,
      byEmployeeId,
      byEmail,
      error: leavesRes.error ? leavesRes.error.message : null,
    };
  } catch (err: any) {
    return {
      success: false,
      balances: [],
      byEmployeeId: {},
      byEmail: {},
      error: err?.message || 'Unexpected error while fetching staff leave balances.',
    };
  }
}

/**
 * Alias for `getStaffLeaveBalances` retained for backwards compatibility.
 */
export async function fetchStaffLeaveBalances(
  options: FetchStaffLeaveBalancesOptions = {}
): Promise<FetchStaffLeaveBalancesResult> {
  return getStaffLeaveBalances(options);
}

/**
 * Convenience helper to fetch a single employee's annual leave balance by ID.
 */
export async function fetchEmployeeLeaveBalance(
  employeeId: string,
  options: Omit<FetchStaffLeaveBalancesOptions, 'employeeIds'> = {}
): Promise<StaffLeaveBalance | null> {
  const cleanId = String(employeeId || '').trim();
  if (!cleanId) return null;
  const res = await getStaffLeaveBalances({ ...options, employeeIds: [cleanId] });
  if (!res.success) return null;
  return res.byEmployeeId[cleanId.toLowerCase()] || res.balances[0] || null;
}

/**
 * Returns true ONLY for Super Admin accounts.
 * All regular staff, associates, clerks, branch admins, and unauthenticated users get `false`.
 */
export function isSuperAdminUser(user?: ActiveUser | null): boolean {
  if (!user || !user.id) return false;

  const normalizedRole = (user.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalizedRole === 'super_admin' || normalizedRole === 'superadmin') {
    return true;
  }

  const normalizedRoleId = String(user.roleId || user.role_id || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (normalizedRoleId === 'role_super_admin' || normalizedRoleId === 'super_admin') {
    return true;
  }

  if (user.isSuperAdmin === true || user.is_super_admin === true) {
    return true;
  }

  return false;
}
