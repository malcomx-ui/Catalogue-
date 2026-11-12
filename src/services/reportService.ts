import { supabase } from './supabaseClient';
import { CaseItem } from '../types';

export interface CaseReportSummary {
  branch_id?: string;
  total_cases: number;
  active_cases: number;
  pending_cases: number;
  closed_cases: number;
  archived_cases: number;
  urgent_cases: number;
  total_claim_value: number;
  stages: Record<string, number>;
  divisions: Record<string, number>;
  source?: 'supabase_rpc' | 'practice_cache';
}

/**
 * Calls the Supabase database function 'get_case_summary' to load live aggregated case statistics.
 * If the remote database function is not yet created in PostgreSQL, it gracefully falls back
 * to computing the exact same data structure from local case items.
 */
export async function loadCaseReport(
  branchId?: string | null,
  fallbackCases?: CaseItem[]
): Promise<CaseReportSummary | null> {
  const queryBranch = !branchId || branchId === 'all' ? null : branchId;

  // 1. Call the Supabase database function
  try {
    const { data, error } = await supabase
      .rpc('get_case_summary', { p_branch_id: queryBranch });

    if (error) {
      console.error("Failed to load report:", error.message);
      // Fall through to client-side computation fallback if provided
    } else if (data) {
      console.log("Case Report Summary:", data);
      return {
        ...data,
        source: 'supabase_rpc',
      } as CaseReportSummary;
    }
  } catch (err: any) {
    console.error("Failed to load report:", err?.message || err);
  }

  // 2. Fallback client-side calculation if RPC returned an error or is unprovisioned
  if (fallbackCases && Array.isArray(fallbackCases)) {
    const filtered = fallbackCases.filter((c) => {
      if (!queryBranch || queryBranch === 'all') return true;
      return c.branchId === queryBranch || (c.branchName || '').toLowerCase().includes(queryBranch.toLowerCase());
    });

    let active = 0;
    let pending = 0;
    let closed = 0;
    let archived = 0;
    let urgent = 0;
    let totalClaim = 0;
    const stages: Record<string, number> = {};
    const divisions: Record<string, number> = {};

    filtered.forEach((c) => {
      const s = (c.status || '').toLowerCase();
      const isArchived = s === 'archived' || (c.file_location || '').toLowerCase().includes('archive');
      const isClosed = s === 'closed' || s === 'concluded' || s === 'resolved' || Boolean(c.year_of_closure);

      if (isArchived) archived++;
      else if (isClosed) closed++;
      else if (s.includes('inactive') || s.includes('dormant') || s.includes('pending') || s.includes('ruling')) pending++;
      else active++;

      if ((c.priority || '').toLowerCase().includes('urgent') || (c.priority || '').toLowerCase().includes('injunction')) {
        urgent++;
      }

      totalClaim += Number(c.claimValueUGX) || 0;

      const stg = c.stage || 'Pleadings & Defense';
      stages[stg] = (stages[stg] || 0) + 1;

      const div = c.division ? c.division.replace('High Court ', '').replace('Court of Appeal / ', '') : 'General Civil';
      divisions[div] = (divisions[div] || 0) + 1;
    });

    const summary: CaseReportSummary = {
      branch_id: queryBranch || 'all',
      total_cases: filtered.length,
      active_cases: active,
      pending_cases: pending,
      closed_cases: closed,
      archived_cases: archived,
      urgent_cases: urgent,
      total_claim_value: totalClaim,
      stages,
      divisions,
      source: 'practice_cache',
    };

    console.log("Case Report Summary (Calculated from Practice Records):", summary);
    return summary;
  }

  return null;
}

// Attach to window for direct browser console testing: window.loadCaseReport('kla-hq')
if (typeof window !== 'undefined') {
  (window as any).loadCaseReport = loadCaseReport;
}

export default loadCaseReport;
