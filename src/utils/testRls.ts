import { supabase } from '../services/supabaseClient';

export interface TestRlsResult {
  blocked: boolean;
  message: string;
  data?: any;
  error?: any;
}

/**
 * Diagnostic test for Supabase Row Level Security (RLS) and branch isolation.
 * Attempts to insert a case record assigned to a foreign/unauthorized branch ('wrong-branch-id-123').
 */
export async function testUnauthorizedInsert(): Promise<TestRlsResult> {
  console.log('[RLS Test] Executing testUnauthorizedInsert() against Supabase cases table...');

  // Attempt to insert a case into a different branch than the user belongs to
  const { data, error } = await supabase
    .from('cases')
    .insert([
      { title: 'Test Case', branch_id: 'wrong-branch-id-123' }
    ])
    .select('*');

  if (error) {
    console.log(" SUCCESS! RLS correctly blocked the unauthorized insert:", error.message);
    return {
      blocked: true,
      message: `SUCCESS! RLS correctly blocked the unauthorized insert: ${error.message}`,
      error,
    };
  } else {
    console.warn(" WARNING: The insert went through. Check your RLS WITH CHECK policy.");
    // Clean up rogue test record if it bypassed policies
    if (data && data[0]?.id) {
      try {
        await supabase.from('cases').delete().eq('id', data[0].id);
      } catch (e) {}
    }
    return {
      blocked: false,
      message: "WARNING: The insert went through. Check your RLS WITH CHECK policy.",
      data,
    };
  }
}

// Attach to window for direct browser console execution: window.testUnauthorizedInsert()
if (typeof window !== 'undefined') {
  (window as any).testUnauthorizedInsert = testUnauthorizedInsert;
}

export default testUnauthorizedInsert;
