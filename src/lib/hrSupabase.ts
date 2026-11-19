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
