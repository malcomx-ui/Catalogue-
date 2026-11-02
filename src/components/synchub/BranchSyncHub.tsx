import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Network,
  RefreshCw,
  Building2,
  Users,
  ShieldCheck,
  Briefcase,
  FileText,
  UserCheck,
} from 'lucide-react';

export const BranchSyncHub: React.FC = () => {
  const {
    branches,
    syncLogs,
    isSyncing,
    lastGlobalSync,
    triggerManualSync,
    cases,
  } = useApp();

  const [syncingNodeId, setSyncingNodeId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const handleSyncNode = async (branchId: string) => {
    setSyncingNodeId(branchId);
    await triggerManualSync(branchId);
    setSyncingNodeId(null);
  };

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  return (
    <div className="space-y-4">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Regional Offices & Sync Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            1 Partner · Regional Team Leads, Lawyers, Office Admins & Clerks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerManualSync()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync All Branches'}</span>
          </button>
        </div>
      </div>

      {/* Firm Organizational Structure Banner */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">Firm Governance:</span>
          <span>1 Partner (Managing Partner)</span>
          <span className="text-slate-300">·</span>
          <span>6 Regional Offices</span>
          <span className="text-slate-300">·</span>
          <span>Each with Team Lead, Lawyers, Office Admin & Clerk</span>
        </div>
        <div className="text-slate-400 font-mono text-[11px]">
          Central Core DB: <strong className="text-emerald-600 font-medium">Replicated ({lastGlobalSync})</strong>
        </div>
      </div>

      {/* Regional Branch Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {branches.map((b) => (
          <div
            key={b.id}
            className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-slate-900">{b.name}</h3>
                    <div className="text-[10px] text-slate-400">{b.city} Circuit</div>
                  </div>
                </div>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                    b.isHeadquarters ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {b.isHeadquarters ? 'Head Office' : 'Regional'}
                </span>
              </div>

              {/* Exact Staff Hierarchy */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">
                    {b.isHeadquarters ? 'Partner:' : 'Team Lead:'}
                  </span>
                  <span className="font-semibold text-slate-800 text-right truncate max-w-[150px]">
                    {b.teamLead || 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Office Admin:</span>
                  <span className="text-slate-700 text-right truncate max-w-[150px]">
                    {b.officeAdmin || 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Clerk:</span>
                  <span className="text-slate-700 text-right truncate max-w-[150px]">
                    {b.clerk || 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                  <span className="text-slate-400">Litigation Lawyers:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {b.lawyersCount} advocates
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Active Cases:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {b.caseCount} matters
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                onClick={() => setSelectedBranchId(b.id)}
                className="text-[11px] text-slate-600 hover:text-slate-900 font-medium"
              >
                View Staff ({b.staff?.length || 0})
              </button>

              <button
                onClick={() => handleSyncNode(b.id)}
                disabled={syncingNodeId === b.id}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${syncingNodeId === b.id ? 'animate-spin' : ''}`} />
                <span>Sync Node</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Drawer Modal */}
      {selectedBranch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {selectedBranch.name} — Staff Directory
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Regional Office Structure: Team Lead, Lawyers, Office Admin & Clerk
                </p>
              </div>
              <button
                onClick={() => setSelectedBranchId(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {(!selectedBranch.staff || selectedBranch.staff.length === 0) ? (
                <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                  No staff registered for this branch yet. Use the Super Admin Access Roles & Staff center to add counsel and clerks.
                </div>
              ) : (
                selectedBranch.staff.map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-500">{s.email}</div>
                      {s.advocateRollNo && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Roll: {s.advocateRollNo}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        s.role === 'partner'
                          ? 'bg-purple-100 text-purple-800'
                          : s.role === 'team_lead'
                          ? 'bg-blue-100 text-blue-800'
                          : s.role === 'office_admin'
                          ? 'bg-amber-100 text-amber-800'
                          : s.role === 'clerk'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {s.roleTitle}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                onClick={() => setSelectedBranchId(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
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
