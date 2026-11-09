import React from 'react';
import { useApp } from '../../context/AppContext';
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
} from 'lucide-react';

export const LitigationAnalytics: React.FC = () => {
  const { cases, branches, hearings } = useApp();

  const totalValueUGX = cases.reduce((acc, c) => acc + c.claimValueUGX, 0);
  const totalValueUSD = Math.round(totalValueUGX / 3700);

  // Group by Division
  const divisionCounts: Record<string, { count: number; value: number }> = {};
  cases.forEach((c) => {
    const key = c.division.replace('High Court ', '').replace('Court of Appeal / ', '');
    if (!divisionCounts[key]) {
      divisionCounts[key] = { count: 0, value: 0 };
    }
    divisionCounts[key].count += 1;
    divisionCounts[key].value += c.claimValueUGX;
  });

  // Group by Stage
  const stageCounts: Record<string, number> = {};
  cases.forEach((c) => {
    stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
  });

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
          <BarChart3 className="w-4 h-4" />
          <span>Practice Intelligence & Portfolio Valuation</span>
          <span className="text-slate-300">·</span>
          <span>Managing Partner Overview</span>
        </div>
        <h1 className="font-serif-legal text-2xl font-bold text-slate-900 mt-1">
          Litigation Portfolio & Division Analytics
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time practice performance metrics, financial exposure, procedural flow rates, and branch caseload allocation.
        </p>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Total Claim Valuation
          </div>
          <div className="font-mono-legal text-2xl font-bold text-slate-900 mt-1">
            UGX {(totalValueUGX / 1000000000).toFixed(2)}B
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono-legal">
            ≈ USD ${(totalValueUSD / 1000000).toFixed(2)}M at risk/recovery
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Active Docket Files
          </div>
          <div className="font-mono-legal text-2xl font-bold text-slate-900 mt-1">
            {cases.length} <span className="text-sm font-normal text-slate-500">matters</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Distributed across 7 branch offices
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Upcoming Appearances
          </div>
          <div className="font-mono-legal text-2xl font-bold text-amber-600 mt-1">
            {hearings.filter(h => h.status === 'Scheduled').length} <span className="text-sm font-normal text-slate-500">causes</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            In High Court & Appellate dockets
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Injunctions & Expedited
          </div>
          <div className="font-mono-legal text-2xl font-bold text-rose-700 mt-1">
            {cases.filter(c => c.priority.includes('Urgent') || c.priority.includes('Injunction')).length} <span className="text-sm font-normal text-slate-500">urgent</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Restraining orders & interim applications
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
            <span className="text-xs text-slate-500 font-mono-legal">Exposure (UGX)</span>
          </div>

          <div className="space-y-3">
            {Object.entries(divisionCounts).map(([division, data]) => {
              const pct = Math.round((data.value / totalValueUGX) * 100);

              return (
                <div key={division} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-800 font-medium">
                    <span>{division} ({data.count} suits)</span>
                    <span className="font-mono-legal">
                      UGX {(data.value / 1000000000).toFixed(2)}B ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Procedural Stage Funnel */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <h3 className="font-serif-legal text-lg font-bold text-slate-900">
            Procedural Stage Funnel
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
              const pct = Math.round((count / cases.length) * 100);

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
          Branch Caseload & Resident Advocate Deployment
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

                return (
                  <tr key={b.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 font-medium text-slate-900 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
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
