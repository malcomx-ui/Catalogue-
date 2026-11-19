import { supabase } from './supabase';

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
