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

export const ConflictChecker: React.FC = () => {
  const { runConflictCheck, currentUser, setSelectedCase, cases } = useApp();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ConflictCheckResult | null>(null);

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
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
          <ShieldAlert className="w-4 h-4" />
          <span>Professional Conduct & Ethics</span>
          <span className="text-slate-300">·</span>
          <span>Uganda Law Council Compliance</span>
        </div>
        <h1 className="font-serif-legal text-2xl font-bold text-slate-900 mt-1">
          Enterprise Conflict of Interest Clearance
        </h1>
        <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
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
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-medium rounded-lg shadow-sm transition-all shrink-0"
          >
            Run Conflict Check
          </button>
        </form>

        {/* Preset quick test searches */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="text-[11px] font-medium text-slate-400">Quick Test Searches:</span>
          {['Equator Agro', 'Diamond Trust', 'TotalEnergies', 'Pearl Heights', 'Buliisa Farmers', 'Nile Breweries'].map((preset) => (
            <button
              key={preset}
              onClick={() => handleQuickPreset(preset)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition-colors"
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
            <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif-legal text-lg font-bold text-amber-950">
                      Conflict Notice: Representation Bar Flagged
                    </h3>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                      {result.matchedCases.length} Match(es) Found
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    The search query <strong className="underline">"{result.searchQuery}"</strong> matches active entities or adverse parties in firm dockets. Under Advocates (Professional Conduct) Regulations, partners must review ethical boundaries prior to accepting a retainer.
                  </p>
                </div>
              </div>

              {/* Matched Matters Table */}
              <div className="mt-4 pt-4 border-t border-amber-200/70 space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                  Conflicting Matter Records Across Branch Nodes:
                </div>

                <div className="space-y-2">
                  {result.matchedCases.map((match, idx) => {
                    const originalCase = cases.find((c) => c.id === match.caseId);

                    return (
                      <div
                        key={idx}
                        className="bg-white p-3.5 rounded-lg border border-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {match.suitNumber ? (
                              <span className="font-mono-legal font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                                {match.suitNumber}
                              </span>
                            ) : (
                              <span className="text-[11px] italic text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                No case number
                              </span>
                            )}
                            <span className="text-slate-300">·</span>
                            <span className="font-semibold text-slate-800">{match.branchName}</span>
                          </div>

                          <div className="font-medium text-slate-900">
                            {match.caseTitle}
                          </div>

                          <div className="text-[11px] text-slate-600">
                            Party: <strong className="text-amber-900">{match.partyName}</strong> ({match.partyType}) ·{' '}
                            {match.representedByFirm ? (
                              <span className="text-emerald-700 font-semibold">Existing MK Client</span>
                            ) : (
                              <span className="text-amber-800 font-semibold">Adverse Party</span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[11px] text-slate-500">
                            Lead Counsel: {match.leadAdvocate}
                          </div>
                          {originalCase && (
                            <button
                              onClick={() => setSelectedCase(originalCase)}
                              className="mt-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium transition-colors"
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
            <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif-legal text-lg font-bold text-emerald-950">
                      Conflict Clearance Verified: Clean Certificate
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                      No Ethical Bars Found
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    Zero adverse records or active client conflicts found for <strong className="underline">"{result.searchQuery}"</strong> across all 7 regional branches (Kampala Central HQ, Fort Portal, Mbarara, Gulu, Masindi, Masaka, Jinja). Retainer intake approved.
                  </p>

                  <div className="mt-3 pt-3 border-t border-emerald-200/80 flex items-center justify-between text-xs text-emerald-800">
                    <div>
                      Verified by: <strong className="text-emerald-950">{result.checkedBy}</strong> · Timestamp: <span className="font-mono-legal">{new Date(result.timestamp).toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => alert(`Conflict Clearance Certificate generated for "${result.searchQuery}" on ${new Date().toLocaleDateString()}. Indexed into MK Advocates central compliance registry.`)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-medium flex items-center gap-1.5 shadow-xs"
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
