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
  const role = String(user.role || '').toLowerCase().trim();
  const roleId = String(user.roleId || '').toLowerCase().trim();
  const email = String(user.email || '').toLowerCase().trim();
  return Boolean(
    user.isSuperAdmin ||
    roleId === 'system_admin' ||
    roleId === 'role-super-admin' ||
    role === 'super_admin' ||
    role === 'superadmin' ||
    role === 'partner' ||
    role === 'managing_partner' ||
    email === 'infosightug@gmail.com'
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
  const role = String(user.role || '').toLowerCase().trim();
  const roleId = String(user.roleId || '').toLowerCase().trim();
  return Boolean(
    (
      user.isBranchAdmin ||
      roleId === 'branch_admin' ||
      roleId === 'role-admin' ||
      role === 'branch_admin' ||
      role === 'admin' ||
      role === 'office_admin'
    ) &&
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
