import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { loadCaseReport, CaseReportSummary } from '../../services/reportService';
import {
  BarChart3,
  TrendingUp,
  Building2,
  Scale,
  Briefcase,
  DollarSign,
  Gavel,
  ShieldAlert,
  PieChart,
  RefreshCw,
  Database,
  CheckCircle2,
} from 'lucide-react';

export const LitigationAnalytics: React.FC = () => {
  const { cases, branches, hearings } = useApp();

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [reportData, setReportData] = useState<CaseReportSummary | null>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);

  // Fetch report via Supabase RPC get_case_summary
  const handleFetchReport = async (branchId: string) => {
    setLoadingReport(true);
    try {
      const summary = await loadCaseReport(branchId, cases);
      setReportData(summary);
    } catch (err) {
      console.error('Error in handleFetchReport:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    handleFetchReport(selectedBranchId);
  }, [selectedBranchId, cases]);

  // Fallback / active calculations
  const totalCasesCount = reportData?.total_cases ?? cases.length;
  const activeCasesCount = reportData?.active_cases ?? cases.filter(c => !c.status?.toLowerCase().includes('closed')).length;
  const pendingCasesCount = reportData?.pending_cases ?? cases.filter(c => c.status?.toLowerCase().includes('pending')).length;
  const closedCasesCount = reportData?.closed_cases ?? cases.filter(c => c.status?.toLowerCase().includes('closed')).length;
  const urgentCount = reportData?.urgent_cases ?? cases.filter(c => c.priority.includes('Urgent')).length;
  const totalValueUGX = reportData?.total_claim_value ?? cases.reduce((acc, c) => acc + c.claimValueUGX, 0);
  const totalValueUSD = Math.round(totalValueUGX / 3700);

  // Divisions map
  const divisionCounts: Record<string, { count: number; value: number }> = {};
  if (reportData?.divisions && Object.keys(reportData.divisions).length > 0) {
    Object.entries(reportData.divisions).forEach(([div, count]) => {
      divisionCounts[div] = { count: Number(count), value: 0 };
    });
    // Calculate values from matching cases
    cases.forEach((c) => {
      const key = c.division.replace('High Court ', '').replace('Court of Appeal / ', '');
      if (divisionCounts[key]) {
        divisionCounts[key].value += c.claimValueUGX;
      }
    });
  } else {
    cases.forEach((c) => {
      const key = c.division.replace('High Court ', '').replace('Court of Appeal / ', '');
      if (!divisionCounts[key]) {
        divisionCounts[key] = { count: 0, value: 0 };
      }
      divisionCounts[key].count += 1;
      divisionCounts[key].value += c.claimValueUGX;
    });
  }

  // Stages map
  const stageCounts: Record<string, number> = reportData?.stages || {};
  if (Object.keys(stageCounts).length === 0) {
    cases.forEach((c) => {
      stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
    });
  }

  const selectedBranchName = selectedBranchId === 'all'
    ? 'All Regional Circuits'
    : branches.find(b => b.id === selectedBranchId)?.name || 'Selected Branch';

  return (
    <div className="space-y-5">
      {/* Top Banner with Branch Report Filter */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
            <BarChart3 className="w-4 h-4" />
            <span>Practice Intelligence &amp; Case Report Summary</span>
            <span className="text-slate-300">·</span>
            <span>Managing Partner Overview</span>
          </div>
          <h1 className="font-serif-legal text-2xl font-bold text-slate-900 mt-1">
            Litigation Portfolio &amp; Division Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time practice performance metrics, claim valuation, and branch caseload summary generated via <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">get_case_summary</code>.
          </p>
        </div>

        {/* Branch Report Filter & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-2"
            >
              <option value="all">Firm-Wide (All 7 Circuits)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleFetchReport(selectedBranchId)}
            disabled={loadingReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs disabled:opacity-50"
            title="Execute Supabase RPC get_case_summary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingReport ? 'animate-spin' : ''}`} />
            <span>{loadingReport ? 'Querying...' : 'Run RPC'}</span>
          </button>

          {reportData?.source === 'supabase_rpc' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>RPC Live</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              <Database className="w-3 h-3 text-blue-600" />
              <span>Practice Data</span>
            </span>
          )}
        </div>
      </div>

      {/* KPI Metric Cards Loaded from Case Report */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Claim Valuation */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Total Claim Valuation</span>
            <DollarSign className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="font-mono-legal text-2xl font-bold text-slate-900 mt-1">
            UGX {(totalValueUGX / 1000000000).toFixed(2)}B
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono-legal">
            ≈ USD ${(totalValueUSD / 1000000).toFixed(2)}M in dispute / recovery
          </div>
        </div>

        {/* Card 2: Active vs Total Files */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Case Docket Summary</span>
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="font-mono-legal text-2xl font-bold text-slate-900 mt-1">
            {totalCasesCount} <span className="text-sm font-normal text-slate-500">total matters</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>{activeCasesCount} active</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 font-normal">{selectedBranchName}</span>
          </div>
        </div>

        {/* Card 3: Upcoming & Reserved */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Pending &amp; Reserved Rulings</span>
            <Gavel className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="font-mono-legal text-2xl font-bold text-indigo-700 mt-1">
            {pendingCasesCount} <span className="text-sm font-normal text-slate-500">pending</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {closedCasesCount} decrees &amp; concluded files
          </div>
        </div>

        {/* Card 4: Injunctions & Expedited */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Injunctions &amp; Expedited</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="font-mono-legal text-2xl font-bold text-rose-700 mt-1">
            {urgentCount} <span className="text-sm font-normal text-slate-500">urgent</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Restraining orders &amp; interim applications
          </div>
        </div>
      </div>

      {/* Grid: Division Breakdown & Stage Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Division Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-legal text-lg font-bold text-slate-900">
              Judicial Division Distribution
            </h3>
            <span className="text-xs text-slate-500 font-mono-legal">Suits ({selectedBranchName})</span>
          </div>

          <div className="space-y-3">
            {Object.keys(divisionCounts).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No suits recorded for this division.</p>
            ) : (
              Object.entries(divisionCounts).map(([division, data]) => {
                const pct = totalCasesCount > 0 ? Math.round((data.count / totalCasesCount) * 100) : 0;

                return (
                  <div key={division} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-800 font-medium">
                      <span>{division} ({data.count} suits)</span>
                      <span className="font-mono-legal">
                        {data.value > 0 ? `UGX ${(data.value / 1000000000).toFixed(2)}B ` : ''}({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Procedural Stage Funnel */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <h3 className="font-serif-legal text-lg font-bold text-slate-900">
            Procedural Stage Funnel ({selectedBranchName})
          </h3>

          <div className="space-y-2.5">
            {[
              'Pleadings & Defense',
              'Mediation & Scheduling',
              'Trial (Plaintiff Stage)',
              'Trial (Defense Stage)',
              'Final Legal Submissions',
              'Judgment / Ruling Reserved',
              'Decree & Execution',
            ].map((stg) => {
              const count = stageCounts[stg] || 0;
              const pct = totalCasesCount > 0 ? Math.round((count / totalCasesCount) * 100) : 0;

              return (
                <div key={stg} className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                    <span className="font-medium text-slate-800">{stg}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono-legal">
                    <span className="font-bold text-slate-900">{count} suits</span>
                    <span className="text-slate-400 text-[11px]">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Regional Branch Caseload Matrix */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <h3 className="font-serif-legal text-lg font-bold text-slate-900 mb-3">
          Branch Caseload &amp; Resident Advocate Deployment
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="pb-2 font-semibold">Branch Office</th>
                <th className="pb-2 font-semibold">City Circuit</th>
                <th className="pb-2 font-semibold">Team Lead / Partner</th>
                <th className="pb-2 font-semibold">Office Admin</th>
                <th className="pb-2 font-semibold">Clerk</th>
                <th className="pb-2 font-semibold text-center">Lawyers</th>
                <th className="pb-2 font-semibold text-center">Active</th>
                <th className="pb-2 font-semibold text-center">Closed</th>
                <th className="pb-2 font-semibold text-center">Archived</th>
                <th className="pb-2 font-semibold text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((b) => {
                const targetCity = (b.city || '').toLowerCase();
                const targetName = (b.name || '').toLowerCase();
                const branchCases = cases.filter((c) => {
                  const bId = c.branchId;
                  const bName = (c.branch || c.branchName || '').toLowerCase();
                  return bId === b.id || bName.includes(targetCity) || bName.includes(targetName);
                });
                const activeCount = branchCases.filter((c) => {
                  const s = (c.status || 'Active').toLowerCase();
                  const isClosedOrArchived = s === 'closed' || s === 'archived' || s.includes('closed') || s.includes('concluded') || Boolean(c.year_of_closure);
                  return !isClosedOrArchived && (s.includes('active') || s.includes('ongoing') || s.includes('mention') || s.includes('instructions'));
                }).length;
                const closedCount = branchCases.filter((c) => {
                  const s = (c.status || '').toLowerCase();
                  return (
                    (s === 'closed' ||
                    s.includes('closed') ||
                    s === 'concluded' ||
                    s === 'resolved' ||
                    Boolean(c.year_of_closure)) &&
                    s !== 'archived' &&
                    !s.includes('archived')
                  );
                }).length;
                const archivedCount = branchCases.filter((c) => {
                  const s = (c.status || '').toLowerCase();
                  return s === 'archived' || s.includes('archived') || (c.file_location || '').toLowerCase().includes('archive');
                }).length;

                const isSelected = selectedBranchId === b.id;

                return (
                  <tr
                    key={b.id}
                    onClick={() => setSelectedBranchId(b.id)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-amber-50/80' : 'hover:bg-slate-50/70'}`}
                  >
                    <td className="py-2.5 font-medium text-slate-900 flex items-center gap-2">
                      <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span>{b.name}</span>
                    </td>
                    <td className="py-2.5 text-slate-600">{b.city}</td>
                    <td className="py-2.5 text-slate-800 font-medium">
                      {b.teamLead}
                    </td>
                    <td className="py-2.5 text-slate-600">{b.officeAdmin}</td>
                    <td className="py-2.5 text-slate-600">{b.clerk}</td>
                    <td className="py-2.5 text-center font-mono text-slate-800">{b.lawyersCount}</td>
                    <td className="py-2.5 text-center font-mono font-semibold text-emerald-700">{activeCount}</td>
                    <td className="py-2.5 text-center font-mono font-medium text-slate-700">{closedCount}</td>
                    <td className="py-2.5 text-center font-mono font-semibold text-zinc-700">{archivedCount}</td>
                    <td className="py-2.5 text-center font-mono font-bold text-slate-900">{branchCases.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LitigationAnalytics;
