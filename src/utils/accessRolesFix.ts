import { supabase, SupabaseService, resolveBranchMeta, resolveUserRoleMeta, safeProfilesUpdate } from '../lib/supabase';
import { User } from '../types';

export interface StaffUpdatePayload {
  name?: string;
  full_name?: string;
  roleId?: string;
  role?: string;
  roleTitle?: string;
  branchId?: string;
  branchName?: string;
  branch?: string;
  email?: string;
  password?: string;
  isSuperAdmin?: boolean;
  isBranchAdmin?: boolean;
  isSuspended?: boolean;
  advocateRollNo?: string;
  mustChangePassword?: boolean;
  [key: string]: any;
}

/**
 * Permanently updates a staff member's role and branch assignment across Supabase & backend DB.
 */
export async function secureUpdateStaff(
  userId: string,
  updates: StaffUpdatePayload | Partial<User>
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const rawUpdates = updates as any;
    const resolvedName = (rawUpdates.name || rawUpdates.full_name || '').trim();
    const resolvedEmail = (rawUpdates.email || '').trim().toLowerCase();
    const hasRoleChange = rawUpdates.roleId !== undefined || rawUpdates.role !== undefined;
    const roleMeta = hasRoleChange
      ? resolveUserRoleMeta(rawUpdates.role, rawUpdates.roleId, rawUpdates.isSuperAdmin, resolvedEmail)
      : null;

    const hasBranchChange =
      rawUpdates.branchId !== undefined ||
      rawUpdates.branchName !== undefined ||
      rawUpdates.branch !== undefined;
    const bMeta = hasBranchChange
      ? resolveBranchMeta(rawUpdates.branchId, rawUpdates.branchName || rawUpdates.branch)
      : null;

    // 1. Direct update to Supabase public 'profiles' table with schema-safe fallback
    const profilePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (resolvedName) profilePayload.full_name = resolvedName;
    if (resolvedEmail) profilePayload.email = resolvedEmail;
    if (roleMeta) {
      profilePayload.role = roleMeta.role;
      profilePayload.role_id = roleMeta.roleId;
      profilePayload.role_title = rawUpdates.roleTitle || roleMeta.roleTitle;
      profilePayload.is_super_admin = roleMeta.isSuperAdmin;
      profilePayload.is_branch_admin = roleMeta.isBranchAdmin;
    } else {
      if (rawUpdates.roleTitle) profilePayload.role_title = rawUpdates.roleTitle;
      if (rawUpdates.isSuperAdmin !== undefined) profilePayload.is_super_admin = Boolean(rawUpdates.isSuperAdmin);
      if (rawUpdates.isBranchAdmin !== undefined) profilePayload.is_branch_admin = Boolean(rawUpdates.isBranchAdmin);
    }
    if (bMeta) {
      profilePayload.branch = bMeta.name;
      profilePayload.branch_name = bMeta.name;
      profilePayload.branch_id = bMeta.id;
    }
    if (rawUpdates.mustChangePassword !== undefined) {
      profilePayload.must_change_password = Boolean(rawUpdates.mustChangePassword);
    }

    let anySuccess = false;
    let savedData: any = null;

    if (Object.keys(profilePayload).length > 1) {
      const byId = await safeProfilesUpdate(profilePayload, 'id', userId);
      if (!byId.error && byId.data && byId.data.length > 0) {
        anySuccess = true;
        savedData = byId.data[0];
      } else if (resolvedEmail) {
        const byEmail = await safeProfilesUpdate(profilePayload, 'email', resolvedEmail);
        if (!byEmail.error && byEmail.data && byEmail.data.length > 0) {
          anySuccess = true;
          savedData = byEmail.data[0];
        }
      }
    }

    // 2. Call server-side user update API endpoint (handles Supabase service_role + firm_users + server DB)
    if (typeof window !== 'undefined') {
      try {
        const session = (await supabase.auth.getSession())?.data?.session;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const apiRes = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            userId,
            id: userId,
            ...updates,
            name: resolvedName || updates.name,
            email: resolvedEmail || updates.email,
            roleId: roleMeta ? roleMeta.roleId : updates.roleId,
            role: roleMeta ? roleMeta.role : updates.role,
            roleTitle: roleMeta ? (updates.roleTitle || roleMeta.roleTitle) : updates.roleTitle,
            isSuperAdmin: roleMeta ? roleMeta.isSuperAdmin : updates.isSuperAdmin,
            isBranchAdmin: roleMeta ? roleMeta.isBranchAdmin : updates.isBranchAdmin,
            branchName: bMeta ? bMeta.name : updates.branchName,
            branchId: bMeta ? bMeta.id : updates.branchId,
          }),
        });
        if (apiRes.ok) {
          const json = await apiRes.json().catch(() => null);
          if (json?.success) {
            anySuccess = true;
            savedData = savedData || json.profile || json.user;
          }
        }
      } catch (apiErr) {
        console.warn('[secureUpdateStaff] Server API user update warning:', apiErr);
      }
    }

    // 3. Sync via SupabaseService (handles firm_users table & password embedding, skips duplicate API post)
    const serviceRes = await SupabaseService.updateStaff(userId, {
      ...updates,
      name: resolvedName || updates.name,
      email: resolvedEmail || updates.email,
      role: (roleMeta ? roleMeta.role : updates.role) as any,
      roleId: roleMeta ? roleMeta.roleId : updates.roleId,
      roleTitle: roleMeta ? (updates.roleTitle || roleMeta.roleTitle) : updates.roleTitle,
      isSuperAdmin: roleMeta ? roleMeta.isSuperAdmin : updates.isSuperAdmin,
      isBranchAdmin: roleMeta ? roleMeta.isBranchAdmin : updates.isBranchAdmin,
      branchName: bMeta ? bMeta.name : updates.branchName,
      branchId: bMeta ? bMeta.id : updates.branchId,
      skipApi: true,
    }).catch((sErr) => {
      console.warn('[secureUpdateStaff] SupabaseService.updateStaff warning:', sErr);
      return { success: false, data: null };
    });

    if (serviceRes.success) {
      anySuccess = true;
      savedData = savedData || serviceRes.data;
    }

    // 4. Refresh session only if updating active auth user
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (sess?.session?.user?.id === userId && typeof supabase?.auth?.refreshSession === 'function') {
        await supabase.auth.refreshSession();
      }
    } catch (refreshErr) {
      console.warn('[secureUpdateStaff] Session refresh notice:', refreshErr);
    }

    return anySuccess
      ? { success: true, data: savedData }
      : { success: false, error: 'Failed to persist staff changes to database.' };
  } catch (err: any) {
    console.error('[secureUpdateStaff] Error during staff update:', err);
    return { success: false, error: err?.message || 'Failed to update staff in Supabase' };
  }
}

/**
 * Utility to manually trigger session token refresh from Supabase
 */
export async function refreshUserSession(): Promise<{ success: boolean; role?: string; error?: string }> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    const currentRole = data.session?.user.user_metadata?.role || 'Unknown';
    return { success: true, role: currentRole };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to refresh session' };
  }
}
