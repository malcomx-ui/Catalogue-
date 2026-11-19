import { supabase } from './supabase';
import { isStrictSuperAdmin } from './supabase';

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
 * Strict Super Admin check for HR Module access.
 * Recognizes normalized 'super_admin' / 'super admin' roles as well as the ERP's
 * Managing Partner / Super Administrator profile flags.
 */
export function isSuperAdminUser(user?: ActiveUser | null): boolean {
  if (!user) return false;
  const normalized = (user.role || '').trim().toLowerCase();
  if (normalized === 'super_admin' || normalized === 'super admin') {
    return true;
  }
  return isStrictSuperAdmin(user);
}
