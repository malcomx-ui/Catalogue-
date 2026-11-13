import { supabase } from './supabaseClient';
import {
  getEffectiveUser,
  isUserAdmin,
  resolveBranchId,
  resolveBranchMeta,
} from '../lib/supabase';
import { showCleanMessage } from '../utils/notification';

export const DEFAULT_HQ_BRANCH_ID = 'kla-hq';
export const DEFAULT_HQ_BRANCH_NAME = 'Kampala Central (Head Office)';

/**
 * Resolves the authoritative branch_id & branch_name for a litigation case write.
 * - Allows super_admin, admin, partner, and managing_partner roles to create/edit/save
 *   even when user.branch_id is missing on their profile.
 * - Defaults to the selected case branch or 'Kampala Central (Head Office)'.
 */
export function resolveCaseBranchForSave(caseData: any, userProfile?: any): {
  branchId: string;
  branchName: string;
  isGlobalBypass: boolean;
} {
  const effectiveUser = getEffectiveUser(userProfile);
  const role = String(effectiveUser?.role || '').toLowerCase().trim();
  const isGlobalBypass =
    isUserAdmin(effectiveUser) ||
    ['super_admin', 'superadmin', 'admin', 'partner', 'managing_partner'].includes(role) ||
    Boolean(effectiveUser?.isSuperAdmin || (effectiveUser as any)?.is_super_admin);

  const rawCaseBranchName =
    caseData?.branchName ||
    caseData?.branch_name ||
    caseData?.branch ||
    '';
  const rawCaseBranchId = caseData?.branchId || caseData?.branch_id || '';

  const rawUserBranchName =
    effectiveUser?.branchName ||
    (effectiveUser as any)?.branch_name ||
    (effectiveUser as any)?.branch ||
    '';
  const rawUserBranchId =
    effectiveUser?.branchId ||
    (effectiveUser as any)?.branch_id ||
    '';

  if (isGlobalBypass) {
    const chosenName =
      String(rawCaseBranchName || '').trim() ||
      String(rawUserBranchName || '').trim() ||
      DEFAULT_HQ_BRANCH_NAME;
    const chosenId = resolveBranchId(
      rawCaseBranchId || (!rawCaseBranchName ? rawUserBranchId : '') || DEFAULT_HQ_BRANCH_ID,
      chosenName
    );
    const meta = resolveBranchMeta(chosenId, chosenName);
    return {
      branchId: chosenId || DEFAULT_HQ_BRANCH_ID,
      branchName: rawCaseBranchName ? chosenName : meta.name || DEFAULT_HQ_BRANCH_NAME,
      isGlobalBypass: true,
    };
  }

  const staffBranchName =
    String(rawUserBranchName || '').trim() ||
    String(rawCaseBranchName || '').trim() ||
    DEFAULT_HQ_BRANCH_NAME;
  const staffBranchId = resolveBranchId(
    rawUserBranchId || rawCaseBranchId || DEFAULT_HQ_BRANCH_ID,
    staffBranchName
  );

  return {
    branchId: staffBranchId || DEFAULT_HQ_BRANCH_ID,
    branchName: staffBranchName || DEFAULT_HQ_BRANCH_NAME,
    isGlobalBypass: false,
  };
}

/**
 * Inserts a new case record securely into Supabase with Super Admin/Admin bypass
 * and RLS error handling.
 */
export async function handleSecureInsert(newCaseData: any, userProfile?: any): Promise<boolean> {
  try {
    const { branchId, branchName } = resolveCaseBranchForSave(newCaseData, userProfile);
    const payload: any = {
      ...newCaseData,
      branch_id: branchId,
      branch_name: newCaseData?.branch_name || newCaseData?.branchName || branchName,
    };
    delete payload.branch;
    delete payload.branchId;
    delete payload.branchName;

    let { error } = await supabase
      .from('cases')
      .insert([payload])
      .select('*');

    if (error && error.message?.includes('suit_no')) {
      const retryPayload = { ...payload };
      delete retryPayload.suit_no;
      const retry = await supabase
        .from('cases')
        .insert([retryPayload])
        .select('*');
      error = retry.error;
    }

    if (error) {
      console.error('Supabase Error Object:', error);

      if (
        error.code === '42501' ||
        error.message?.toLowerCase().includes('row-level security') ||
        error.message?.toLowerCase().includes('rls') ||
        error.message?.toLowerCase().includes('permission denied') ||
        error.message?.toLowerCase().includes('violates row-level security policy')
      ) {
        showCleanMessage('Permission Denied: You do not have authorization to modify cases for this branch.', 'error');
      } else {
        showCleanMessage(`An error occurred: ${error.message}`, 'error');
      }
      return false;
    }

    showCleanMessage('Success! Record saved securely.', 'success');
    return true;
  } catch (err: any) {
    console.error('Exception in handleSecureInsert:', err);
    showCleanMessage(`An unexpected error occurred: ${err?.message || err}`, 'error');
    return false;
  }
}

/**
 * Updates an existing case record securely into Supabase with Super Admin/Admin bypass.
 */
export async function handleSecureUpdate(caseId: string, updates: any, userProfile?: any): Promise<boolean> {
  try {
    const { branchId, branchName } = resolveCaseBranchForSave(updates, userProfile);
    const payload: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates?.branch_id || updates?.branchId || updates?.branch_name || updates?.branchName || updates?.branch) {
      payload.branch_id = branchId;
      payload.branch_name = branchName;
    }
    delete payload.id;
    delete payload.branch;
    delete payload.branchId;
    delete payload.branchName;

    let { error } = await supabase
      .from('cases')
      .update(payload)
      .eq('id', caseId)
      .select('*');

    if (error && error.message?.includes('suit_no')) {
      const retryPayload = { ...payload };
      delete retryPayload.suit_no;
      const retry = await supabase
        .from('cases')
        .update(retryPayload)
        .eq('id', caseId)
        .select('*');
      error = retry.error;
    }

    if (error) {
      console.error('Supabase update error:', error);
      showCleanMessage(`An error occurred: ${error.message}`, 'error');
      return false;
    }

    showCleanMessage('Success! Case updated securely.', 'success');
    return true;
  } catch (err: any) {
    console.error('Exception in handleSecureUpdate:', err);
    showCleanMessage(`An unexpected error occurred: ${err?.message || err}`, 'error');
    return false;
  }
}

// Attach to window object for direct browser console execution
if (typeof window !== 'undefined') {
  (window as any).handleSecureInsert = handleSecureInsert;
}

export { showCleanMessage };
export default handleSecureInsert;
