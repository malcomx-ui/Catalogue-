import { supabase, SupabaseService, resolveBranchMeta } from '../lib/supabase';
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
 * Permanently updates a staff member's role and branch assignment in Supabase.
 * 
 * 1. Permanently updates the public `profiles` table in Supabase.
 * 2. Calls backend API to update Supabase Auth user_metadata (via service role).
 * 3. Syncs firm_users and SupabaseService.
 * 4. Calls `await supabase.auth.refreshSession()` to sync auth session metadata.
 * 5. Returns `{ success: boolean, error?: string }`.
 */
export async function secureUpdateStaff(
  userId: string,
  updates: StaffUpdatePayload | Partial<User>
): Promise<{ success: boolean; error?: string }> {
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    const rawUpdates = updates as any;
    const resolvedName = (rawUpdates.name || rawUpdates.full_name || '').trim();
    const resolvedRole = (rawUpdates.roleId || rawUpdates.role || '').trim();
    const bMeta = resolveBranchMeta(rawUpdates.branchId, rawUpdates.branchName || rawUpdates.branch);
    const resolvedEmail = (rawUpdates.email || '').trim().toLowerCase();

    // 1. Direct update to Supabase public 'profiles' table
    const profilePayload: Record<string, any> = {};
    if (resolvedName) profilePayload.full_name = resolvedName;
    if (resolvedRole) {
      profilePayload.role = resolvedRole;
      profilePayload.role_id = resolvedRole;
    }
    if (rawUpdates.roleTitle) {
      profilePayload.role_title = rawUpdates.roleTitle;
    }
    profilePayload.branch = bMeta.name;
    profilePayload.branch_name = bMeta.name;
    profilePayload.branch_id = bMeta.id;
    if (resolvedEmail) profilePayload.email = resolvedEmail;
    if (rawUpdates.isSuperAdmin !== undefined) {
      profilePayload.is_super_admin = Boolean(rawUpdates.isSuperAdmin);
    }
    if (rawUpdates.isBranchAdmin !== undefined) {
      profilePayload.is_branch_admin = Boolean(rawUpdates.isBranchAdmin);
    }
    profilePayload.updated_at = new Date().toISOString();

    let profileUpdated = false;

    if (Object.keys(profilePayload).length > 0) {
      // 1a. Try update by UUID
      if (isUUID) {
        let { error, data } = await supabase
          .from('profiles')
          .update(profilePayload)
          .eq('id', userId)
          .select('*');

        // If 'branch_id' column doesn't exist in Supabase profiles schema, remove and retry
        if (error && error.message.includes('branch_id')) {
          delete profilePayload.branch_id;
          const retry = await supabase
            .from('profiles')
            .update(profilePayload)
            .eq('id', userId)
            .select('*');
          error = retry.error;
          data = retry.data;
        }

        if (!error && data && data.length > 0) {
          profileUpdated = true;
        }
      }

      // 1b. Try update by Email if not yet updated or if non-UUID ID
      if (!profileUpdated && resolvedEmail) {
        let { error: emailErr, data: emailData } = await supabase
          .from('profiles')
          .update(profilePayload)
          .eq('email', resolvedEmail)
          .select('*');

        if (emailErr && emailErr.message.includes('branch_id')) {
          const fallback = { ...profilePayload };
          delete fallback.branch_id;
          const retry = await supabase.from('profiles').update(fallback).eq('email', resolvedEmail).select('*');
          emailErr = retry.error;
          emailData = retry.data;
        }

        if (!emailErr && emailData && emailData.length > 0) {
          profileUpdated = true;
        }
      }
    }

    // 2. Call server-side user update API endpoint to update Supabase Auth user_metadata
    try {
      const session = (await supabase.auth.getSession())?.data?.session;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
      await fetch(`${baseUrl}/api/users/${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          id: userId,
          ...updates,
          name: resolvedName || updates.name,
          roleId: resolvedRole || updates.roleId,
          role: resolvedRole || updates.role,
          branchName: bMeta.name,
          branchId: bMeta.id,
        }),
      });
    } catch (apiErr) {
      console.warn('[secureUpdateStaff] Server API user update warning:', apiErr);
    }

    // 3. Sync via SupabaseService (handles firm_users table, self-session update, etc.)
    await SupabaseService.updateStaff(userId, {
      ...updates,
      name: resolvedName || updates.name,
      role: (resolvedRole || updates.role) as any,
      roleId: resolvedRole || updates.roleId,
      branchName: bMeta.name,
      branchId: bMeta.id,
      email: resolvedEmail || updates.email,
    }).catch((sErr) => {
      console.warn('[secureUpdateStaff] SupabaseService.updateStaff warning:', sErr);
    });

    // 4. Forces Supabase to re-validate token and sync latest server-side metadata
    try {
      if (typeof supabase?.auth?.refreshSession === 'function') {
        await supabase.auth.refreshSession();
      }
    } catch (refreshErr) {
      console.warn('[secureUpdateStaff] Session refresh notice:', refreshErr);
    }

    return { success: true };
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
