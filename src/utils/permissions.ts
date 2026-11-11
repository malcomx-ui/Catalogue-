import { User } from '../types';

/**
 * Helper to check if a user is a Global System / Super Admin
 */
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false;
  return Boolean(user.isSuperAdmin || user.role === 'super_admin' || user.role === 'managing_partner');
}

/**
 * Helper to check if a user is a Branch Admin (restricted to their branch)
 */
export function isBranchAdmin(user: User | null): boolean {
  if (!user) return false;
  return Boolean(user.isBranchAdmin && !isSuperAdmin(user));
}

/**
 * Helper to check if a user has permission to manage global firm settings or all users
 */
export function canManageFirm(user: User | null): boolean {
  return isSuperAdmin(user); // Branch admins should NOT be able to manage firm-wide settings
}
