import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { isUserAdmin } from '../../lib/supabase';
import {
  Network,
  RefreshCw,
  Building2,
  Users,
  ShieldCheck,
  Briefcase,
  FileText,
  UserCheck,
  Lock,
  Archive,
  X,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export const BranchSyncHub: React.FC = () => {
  const {
    branches,
    syncLogs,
    isSyncing,
    lastGlobalSync,
    triggerManualSync,
    cases,
    currentUser,
    setActiveTab,
  } = useApp();

  const [syncingNodeId, setSyncingNodeId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const isAdmin = isUserAdmin(currentUser);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-center shadow-xs">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Access Restricted</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          The Regional Offices &amp; Sync Hub is strictly reserved for Super Admins and Managing Partners. Standard counsel and branch staff do not have authorization to view or manage live synchronization circuits.
        </p>
        <button
          onClick={() => setActiveTab('dashboard')}
          className="px-4 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleSyncNode = async (branchId: string) => {
    setSyncingNodeId(branchId);
    await triggerManualSync(branchId);
    setSyncingNodeId(null);
  };

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  // Firm-wide live case synchronization metrics
  const overallMetrics = useMemo(() => {
    let totalActive = 0;
    let totalPending = 0;
    let totalClosed = 0;
    let totalArchived = 0;

    cases.forEach((c) => {
      const s = (c.status || '').toLowerCase();
      const isArchived = s === 'archived' || s.includes('archived') || (c.file_location || '').toLowerCase().includes('archive');
      if (isArchived) {
        totalArchived++;
      } else if (
        s === 'closed' ||
        s.includes('closed') ||
        s === 'concluded' ||
        s === 'resolved' ||
        Boolean(c.year_of_closure)
      ) {
        totalClosed++;
      } else if (s.includes('inactive') || s.includes('dormant') || s.includes('pending') || s.includes('ruling')) {
        totalPending++;
      } else {
        totalActive++;
      }
    });

    return {
      total: cases.length,
      active: totalActive,
      pending: totalPending,
      closed: totalClosed,
      archived: totalArchived,
    };
  }, [cases]);

  // Branch statistics calculation helper with archived count
  const getBranchCaseMetrics = (branch: any) => {
    const targetCity = (branch.city || '').toLowerCase();
    const targetName = (branch.name || '').toLowerCase();

    const branchCases = cases.filter((c) => {
      const bId = c.branchId;
      const bName = (c.branch || c.branchName || '').toLowerCase();
      return bId === branch.id || bName.includes(targetCity) || bName.includes(targetName);
    });

    const active = branchCases.filter((c) => {
      const s = (c.status || 'Active').toLowerCase();
      const isClosedOrArchived = s === 'closed' || s === 'archived' || s.includes('closed') || s.includes('concluded') || Boolean(c.year_of_closure);
      return !isClosedOrArchived && (s.includes('active') || s.includes('ongoing') || s.includes('mention') || s.includes('instructions'));
    }).length;

    const closed = branchCases.filter((c) => {
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

    const archived = branchCases.filter((c) => {
      const s = (c.status || '').toLowerCase();
      return s === 'archived' || s.includes('archived') || (c.file_location || '').toLowerCase().includes('archive');
    }).length;

    const pending = branchCases.filter((c) => {
      const s = (c.status || '').toLowerCase();
      const isClosedOrArchived = s === 'closed' || s === 'archived' || s.includes('closed') || Boolean(c.year_of_closure);
      return !isClosedOrArchived && (s.includes('inactive') || s.includes('dormant') || s.includes('pending') || s.includes('ruling'));
    }).length;

    return {
      total: branchCases.length,
      active,
      pending,
      closed,
      archived,
    };
  };

  return (
    <div className="space-y-4">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Regional Offices & Sync Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            1 Partner · Regional Team Leads, Lawyers, Office Admins & Clerks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerManualSync()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync All Branches'}</span>
          </button>
        </div>
      </div>

      {/* Firm-Wide Live Case Synchronization Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Matters</div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">{overallMetrics.active}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">across 7 circuits</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending / Mention</div>
          <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 mt-1 tabular-nums">{overallMetrics.pending}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">awaiting proceedings</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Closed Matters</div>
          <div className="text-2xl font-extrabold text-slate-700 dark:text-slate-200 mt-1 tabular-nums">{overallMetrics.closed}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">judgments &amp; decrees</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Archive className="w-3 h-3 text-zinc-500" />
            Archived Matters
          </div>
          <div className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-200 mt-1 tabular-nums">{overallMetrics.archived}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">in branch safe archives</div>
        </div>
      </div>

      {/* Firm Organizational Structure Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Firm Governance:</span>
          <span>1 Partner (Managing Partner)</span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>6 Regional Offices</span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>Each with Team Lead, Lawyers, Office Admin & Clerk</span>
        </div>
        <div className="text-slate-400 font-mono tabular-nums text-[11px]">
          Central Core DB: <strong className="text-emerald-600 dark:text-emerald-400 font-medium">Replicated ({lastGlobalSync})</strong>
        </div>
      </div>

      {/* Regional Branch Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b) => {
          const metrics = getBranchCaseMetrics(b);
          return (
          <div
            key={b.id}
            className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100">{b.name}</h3>
                    <div className="text-[10px] text-slate-400">{b.city} Circuit</div>
                  </div>
                </div>

                <StatusBadge
                  tone={b.isHeadquarters ? 'emerald' : 'slate'}
                  label={b.isHeadquarters ? 'Head Office' : 'Regional'}
                  showDot={false}
                  size="xs"
                />
              </div>

              {/* Exact Staff Hierarchy */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">
                    {b.isHeadquarters ? 'Partner:' : 'Team Lead:'}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate max-w-[150px]">
                    {b.teamLead || 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Office Admin:</span>
                  <span className="text-slate-700 dark:text-slate-300 text-right truncate max-w-[150px]">
                    {b.officeAdmin || 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Clerk:</span>
                  <span className="text-slate-700 dark:text-slate-300 text-right truncate max-w-[150px]">
                    {b.clerk || 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Litigation Lawyers:</span>
                  <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                    {b.lawyersCount} advocates
                  </span>
                </div>

                {/* Branch Case Registry Metrics including Archived */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">Case Registry Metrics</span>
                    <span className="font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-slate-100">{metrics.total} total</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] tabular-nums">
                    <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                      <span className="font-medium">Active:</span>
                      <strong className="font-bold">{metrics.active}</strong>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                      <span className="font-medium">Pending:</span>
                      <strong className="font-bold">{metrics.pending}</strong>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                      <span className="font-medium">Closed:</span>
                      <strong className="font-bold">{metrics.closed}</strong>
                    </div>
                    <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                      <span className="font-medium flex items-center gap-1">
                        <Archive className="w-3 h-3 text-zinc-600 dark:text-zinc-400 inline" />
                        Archived:
                      </span>
                      <strong className="font-bold">{metrics.archived}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => setSelectedBranchId(b.id)}
                className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
              >
                View Staff ({b.staff?.length || 0})
              </button>

              <button
                onClick={() => handleSyncNode(b.id)}
                disabled={syncingNodeId === b.id}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${syncingNodeId === b.id ? 'animate-spin' : ''}`} />
                <span>Sync Node</span>
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {/* Staff Drawer Modal */}
      {selectedBranch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {selectedBranch.name} — Staff Directory
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Regional Office Structure: Team Lead, Lawyers, Office Admin & Clerk
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBranchId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {(!selectedBranch.staff || selectedBranch.staff.length === 0) ? (
                <div className="p-4 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  No staff registered for this branch yet. Use the Super Admin Access Roles & Staff center to add counsel and clerks.
                </div>
              ) : (
                selectedBranch.staff.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{s.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{s.email}</div>
                      {s.advocateRollNo && (
                        <div className="text-[10px] text-slate-400 font-mono tabular-nums mt-0.5">
                          Roll: {s.advocateRollNo}
                        </div>
                      )}
                    </div>
                    <StatusBadge
                      tone={s.role === 'clerk' ? 'emerald' : s.role === 'office_admin' ? 'amber' : 'slate'}
                      label={s.roleTitle}
                      showDot={false}
                      size="xs"
                    />
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedBranchId(null)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
