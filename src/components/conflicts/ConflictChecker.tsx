import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ConflictCheckResult } from '../../types';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Building2,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Printer,
  FileCheck,
} from 'lucide-react';

import { isUserAdmin } from '../../lib/supabase';
import { showCleanMessage } from '../../utils/notification';
import { Lock } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export const ConflictChecker: React.FC = () => {
  const { runConflictCheck, currentUser, setSelectedCase, cases, setActiveTab } = useApp();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ConflictCheckResult | null>(null);

  const canRunConflicts =
    isUserAdmin(currentUser) ||
    currentUser?.role === 'partner' ||
    currentUser?.role === 'managing_partner' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'superadmin' ||
    Boolean(currentUser?.isSuperAdmin);

  if (!canRunConflicts) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-center shadow-xs">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Access Restricted</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          Enterprise Conflict of Interest Clearance is restricted to Managing Partners and Super Administrators because it searches across all regional firm dockets.
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const res = runConflictCheck(query);
    setResult(res);
  };

  const handleQuickPreset = (name: string) => {
    setQuery(name);
    const res = runConflictCheck(name);
    setResult(res);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          <ShieldAlert className="w-4 h-4" />
          <span>Professional Conduct & Ethics</span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>Uganda Law Council Compliance</span>
        </div>
        <h1 className="font-sans text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 tracking-tight">
          Enterprise Conflict of Interest Clearance
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-3xl">
          Instantly verify proposed clients, opposing corporate entities, guarantors, or directors against the entire multi-branch litigation catalogue before accepting legal briefs or filing pleadings.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-5 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter prospective client, company name, director, or adversary (e.g. Equator Agro, TotalEnergies, DTB)..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-medium rounded-xl shadow-xs transition-all shrink-0"
          >
            Run Conflict Check
          </button>
        </form>

        {/* Preset quick test searches */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="text-[11px] font-medium text-slate-400">Quick Test Searches:</span>
          {['Equator Agro', 'Diamond Trust', 'TotalEnergies', 'Pearl Heights', 'Buliisa Farmers', 'Nile Breweries'].map((preset) => (
            <button
              key={preset}
              onClick={() => handleQuickPreset(preset)}
              className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-[11px] transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Results View */}
      {result && (
        <div className="space-y-4">
          {result.hasConflict ? (
            /* CONFLICT DETECTED */
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-sans text-lg font-bold text-amber-950 dark:text-amber-200">
                      Conflict Notice: Representation Bar Flagged
                    </h3>
                    <StatusBadge
                      tone="amber"
                      label={`${result.matchedCases.length} Match(es) Found`}
                      size="xs"
                      className="tabular-nums"
                    />
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-300/90 leading-relaxed">
                    The search query <strong className="underline">"{result.searchQuery}"</strong> matches active entities or adverse parties in firm dockets. Under Advocates (Professional Conduct) Regulations, partners must review ethical boundaries prior to accepting a retainer.
                  </p>
                </div>
              </div>

              {/* Matched Matters Table */}
              <div className="mt-4 pt-4 border-t border-amber-200/70 dark:border-amber-800/50 space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  Conflicting Matter Records Across Branch Nodes:
                </div>

                <div className="space-y-2">
                  {result.matchedCases.map((match, idx) => {
                    const originalCase = cases.find((c) => c.id === match.caseId);

                    return (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-800/70 shadow-xs hover:shadow-sm transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {match.suitNumber ? (
                              <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                {match.suitNumber}
                              </span>
                            ) : (
                              <span className="text-[11px] italic text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                No case number
                              </span>
                            )}
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{match.branchName}</span>
                          </div>

                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {match.caseTitle}
                          </div>

                          <div className="text-[11px] text-slate-600 dark:text-slate-400">
                            Party: <strong className="text-amber-900 dark:text-amber-300">{match.partyName}</strong> ({match.partyType}) ·{' '}
                            {match.representedByFirm ? (
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Existing MK Client</span>
                            ) : (
                              <span className="text-amber-800 dark:text-amber-400 font-semibold">Adverse Party</span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Lead Counsel: {match.leadAdvocate}
                          </div>
                          {originalCase && (
                            <button
                              onClick={() => setSelectedCase(originalCase)}
                              className="mt-1 px-3 py-1.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-lg text-[11px] font-medium transition-colors"
                            >
                              Inspect Docket
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* CONFLICT CLEARANCE APPROVED */
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-sans text-lg font-bold text-emerald-950 dark:text-emerald-200">
                      Conflict Clearance Verified: Clean Certificate
                    </h3>
                    <StatusBadge
                      status="Cleared"
                      label="No Ethical Bars Found"
                      size="xs"
                    />
                  </div>
                  <p className="text-xs text-emerald-900 dark:text-emerald-300/90 leading-relaxed">
                    Zero adverse records or active client conflicts found for <strong className="underline">"{result.searchQuery}"</strong> across all 7 regional branches (Kampala Central HQ, Fort Portal, Mbarara, Gulu, Masindi, Masaka, Jinja). Retainer intake approved.
                  </p>

                  <div className="mt-3 pt-3 border-t border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                    <div>
                      Verified by: <strong className="text-emerald-950 dark:text-emerald-100">{result.checkedBy}</strong> · Timestamp: <span className="font-mono tabular-nums">{new Date(result.timestamp).toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => showCleanMessage(`Conflict Clearance Certificate generated for "${result.searchQuery}" on ${new Date().toLocaleDateString()}. Indexed into MK Advocates central compliance registry.`, 'success')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Issue Clearance Slip</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
