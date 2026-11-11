export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId?: string;
  branchId?: string;
  branchName?: string;
  isSuperAdmin?: boolean;
  isBranchAdmin?: boolean;
}

/**
 * Checks if user is a Global System Administrator
 */
export function isSystemAdmin(user: UserProfile | null): boolean {
  if (!user) return false;
  return Boolean(
    user.isSuperAdmin || 
    user.roleId === 'system_admin' || 
    user.role === 'super_admin' || 
    user.role === 'managing_partner'
  );
}

/**
 * Backward-compatible alias for isSystemAdmin
 */
export const isSuperAdmin = isSystemAdmin;

/**
 * Checks if user is strictly a Branch Administrator (restricted to their branch)
 */
export function isBranchAdmin(user: UserProfile | null): boolean {
  if (!user) return false;
  return Boolean(
    (user.isBranchAdmin || user.roleId === 'branch_admin' || user.role === 'branch_admin') && 
    !isSystemAdmin(user)
  );
}

/**
 * Permission guard for global firm settings / user management
 */
export function canAccessGlobalSettings(user: UserProfile | null): boolean {
  return isSystemAdmin(user); // Branch admins cannot access global settings
}

/**
 * Backward-compatible alias for canAccessGlobalSettings
 */
export const canManageFirm = canAccessGlobalSettings;
