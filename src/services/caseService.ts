import { supabase } from './supabaseClient';
import { showCleanMessage } from '../utils/notification';

/**
 * Inserts a new case record securely into Supabase with RLS error handling.
 * Checks for PostgreSQL code 42501 (insufficient privilege / RLS violation)
 * and displays clean user-facing notifications.
 */
export async function handleSecureInsert(newCaseData: any): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('cases')
      .insert([newCaseData])
      .select('*');

    if (error) {
      console.error("Supabase Error Object:", error);

      // Check if it's an RLS permission denied error (PostgreSQL code 42501)
      if (
        error.code === '42501' ||
        error.message?.toLowerCase().includes('row-level security') ||
        error.message?.toLowerCase().includes('rls') ||
        error.message?.toLowerCase().includes('permission denied') ||
        error.message?.toLowerCase().includes('violates row-level security policy')
      ) {
        showCleanMessage("Permission Denied: You do not have authorization to modify cases for this branch.", 'error');
      } 
      // Handle other database errors (e.g., missing required fields, duplicate keys)
      else {
        showCleanMessage(`An error occurred: ${error.message}`, 'error');
      }
      return false;
    }

    showCleanMessage("Success! Record saved securely.", 'success');
    return true;
  } catch (err: any) {
    console.error("Exception in handleSecureInsert:", err);
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
