export interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  roleId?: string;
  roleTitle?: string;
  branchId?: string;
  branchName?: string;
  isSuperAdmin?: boolean;
  isBranchAdmin?: boolean;
}

const CANONICAL_BRANCH_NAMES: Record<string, string> = {
  'kla-hq': 'Kampala Central (Head Office)',
  'ftp-reg': 'Fort Portal Regional Office',
  'mbr-reg': 'Mbarara Regional Office',
  'msk-reg': 'Masaka Regional Office',
  'jnj-reg': 'Jinja Regional Office',
  'glu-reg': 'Gulu Regional Office',
  'msn-reg': 'Masindi Regional Office',
};

function normalizeBranchIdLocal(branchId?: string, branchName?: string): string {
  const cleanId = String(branchId || '').trim().toLowerCase();
  if (cleanId && (CANONICAL_BRANCH_NAMES[cleanId] || cleanId.startsWith('br-'))) {
    return cleanId;
  }
  const clean = `${branchName || ''} ${branchId || ''}`.toLowerCase();
  if (clean.includes('fort') || clean.includes('portal')) return 'ftp-reg';
  if (clean.includes('gulu')) return 'glu-reg';
  if (clean.includes('jinja')) return 'jnj-reg';
  if (clean.includes('kampala') || clean.includes('head office') || clean.includes('hq')) return 'kla-hq';
  if (clean.includes('masaka')) return 'msk-reg';
  if (clean.includes('masindi')) return 'msn-reg';
  if (clean.includes('mbarara')) return 'mbr-reg';
  return cleanId;
}

function normalizeBranchLabelLocal(val?: string | null): string {
  return String(val || '')
    .toLowerCase()
    .replace(/\bregional office\b/g, '')
    .replace(/\bhead office\b/g, '')
    .replace(/\boffice\b/g, '')
    .replace(/\bbranch\b/g, '')
    .replace(/[()]/g, '')
    .trim();
}

/**
 * Checks if user is an unrestricted System / Global Administrator
 * (`super_admin`, `admin`, `system_admin`, `partner`, `managing_partner` when not flagged as a branch-only admin or finance assistant)
 */
export function isSystemAdmin(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase().trim();
  const roleId = String(user.roleId || (user as any).role_id || '').toLowerCase().trim();
  const title = String(user.roleTitle || (user as any).role_title || '').toLowerCase().trim();
  const email = String(user.email || '').toLowerCase().trim();

  if (
    email === 'infosightug@gmail.com' ||
    user.isSuperAdmin ||
    (user as any).is_super_admin ||
    roleId === 'system_admin' ||
    roleId === 'role-super-admin' ||
    role === 'super_admin' ||
    role === 'superadmin' ||
    role === 'system_admin' ||
    role === 'partner' ||
    role === 'managing_partner'
  ) {
    return true;
  }

  if (
    role === 'admin_finance_assistant' ||
    role === 'admin-finance-assistant' ||
    role === 'finance_assistant' ||
    roleId === 'role-admin-finance-assistant' ||
    roleId === 'admin_finance_assistant' ||
    (title.includes('admin') && title.includes('finance') && title.includes('assistant'))
  ) {
    return false;
  }

  const explicitBranchAdmin = Boolean(
    user.isBranchAdmin ||
    (user as any).is_branch_admin ||
    role === 'branch_admin' ||
    role === 'office_admin' ||
    roleId === 'role-admin' ||
    roleId === 'branch_admin'
  );
  if (explicitBranchAdmin) return false;

  return role === 'admin';
}

/**
 * Backward-compatible alias for isSystemAdmin
 */
export const isSuperAdmin = isSystemAdmin;

/**
 * Checks if user is strictly an Admin & Finance Assistant
 * (View-all branches; Add/Edit/Delete strictly scoped to assigned branch)
 */
export function isAdminFinanceAssistant(user: UserProfile | null | undefined): boolean {
  if (!user || isSystemAdmin(user)) return false;
  const role = String(user.role || '').toLowerCase().trim();
  const roleId = String(user.roleId || (user as any).role_id || '').toLowerCase().trim();
  const title = String(user.roleTitle || (user as any).role_title || '').toLowerCase().trim();
  return Boolean(
    role === 'admin_finance_assistant' ||
    role === 'admin-finance-assistant' ||
    role === 'finance_assistant' ||
    roleId === 'role-admin-finance-assistant' ||
    roleId === 'admin_finance_assistant' ||
    (title.includes('admin') && title.includes('finance') && title.includes('assistant'))
  );
}

/**
 * Checks if user is strictly a Branch Administrator (restricted to their branch)
 */
export function isBranchAdmin(user: UserProfile | null | undefined): boolean {
  if (!user || isSystemAdmin(user) || isAdminFinanceAssistant(user)) return false;
  const role = String(user.role || '').toLowerCase().trim();
  const roleId = String(user.roleId || (user as any).role_id || '').toLowerCase().trim();
  return Boolean(
    user.isBranchAdmin ||
    (user as any).is_branch_admin ||
    roleId === 'branch_admin' ||
    roleId === 'role-admin' ||
    role === 'branch_admin' ||
    role === 'office_admin'
  );
}

/**
 * Checks whether user can view cases and mortgages across all branches
 */
export function canViewAllBranches(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (isSystemAdmin(user) || isAdminFinanceAssistant(user)) return true;
  const role = String(user.role || '').toLowerCase().trim();
  const roleId = String(user.roleId || (user as any).role_id || '').toLowerCase().trim();
  return (
    role === 'lawyer' ||
    role === 'advocate' ||
    role === 'team_lead' ||
    roleId === 'role-advocate' ||
    roleId === 'role-team-lead'
  );
}

/**
 * Checks whether user can add, edit, or delete a record (case or mortgage) in the given branch
 * - `super_admin` and `admin`: unrestricted across all branches
 * - `admin_finance_assistant` and branch staff: strictly limited to their assigned branch
 */
export function canModifyRecordInBranch(
  user: UserProfile | null | undefined,
  recordBranch?: { branchId?: string; branch_id?: string; branchName?: string; branch_name?: string; branch?: string } | string | null
): boolean {
  if (!user) return false;
  if (isSystemAdmin(user)) return true;

  const userBranchId = String(user.branchId || (user as any).branch_id || '').trim();
  const userBranchName = String(user.branchName || (user as any).branch_name || (user as any).branch || '').trim();

  const recId =
    typeof recordBranch === 'string'
      ? ''
      : String(recordBranch?.branchId || recordBranch?.branch_id || '').trim();
  const recName =
    typeof recordBranch === 'string'
      ? recordBranch.trim()
      : String(recordBranch?.branchName || recordBranch?.branch_name || recordBranch?.branch || '').trim();

  if (!recId && !recName) return false;
  if (!userBranchId && !userBranchName) return false;

  if (userBranchId && recId && userBranchId.toLowerCase() === recId.toLowerCase()) {
    return true;
  }

  const canonicalUser = normalizeBranchIdLocal(userBranchId, userBranchName);
  const canonicalRec = normalizeBranchIdLocal(recId, recName);
  if (canonicalUser && canonicalRec && canonicalUser === canonicalRec) {
    return true;
  }

  const normUser = normalizeBranchLabelLocal(userBranchName || userBranchId);
  const normRec = normalizeBranchLabelLocal(recName || recId);
  return Boolean(normUser && normRec && normUser === normRec);
}

/**
 * Permission guard for global firm settings / user management
 */
export function canAccessGlobalSettings(user: UserProfile | null | undefined): boolean {
  return isSystemAdmin(user); // Branch admins and Admin & Finance Assistants cannot access global settings
}

/**
 * Backward-compatible alias for canAccessGlobalSettings
 */
export const canManageFirm = canAccessGlobalSettings;
