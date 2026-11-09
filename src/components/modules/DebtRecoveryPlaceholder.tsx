import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Banknote,
  Briefcase,
  Calendar,
  Clock,
  ArrowRight,
  FileCheck2,
  Scale,
  Building2,
  DollarSign,
  ChevronRight,
  AlertCircle,
  Plus,
} from 'lucide-react';

export const DebtRecoveryPlaceholder: React.FC = () => {
  const { setActiveTab, setIsNewCaseModalOpen, cases } = useApp();

  // Matched debt recovery or commercial recovery matters from current catalogue
  const recoveryMatters = cases.filter((c) => {
    const text = `${c.title} ${c.division} ${c.briefSummary} ${c.subject_matter || ''} ${c.stage}`.toLowerCase();
    return (
      text.includes('debt') ||
      text.includes('recovery') ||
      text.includes('commercial') ||
      text.includes('banking') ||
      text.includes('loan') ||
      text.includes('claim')
    );
  });

  return (
    <div className="space-y-6 text-slate-900 pb-16 max-w-6xl mx-auto">
      {/* 1. Header Hero Banner */}
      <div className="bg-[#0b132b] text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Banknote className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Debt Recovery &amp; Asset Tracing</h1>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Under Development
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Institutional debt recovery workflows, statutory demand letters, repayment schedule monitoring, and execution directives across all 7 regional circuits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsNewCaseModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Intake Matter</span>
            </button>
            <button
              onClick={() => setActiveTab('catalogue')}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-semibold transition-all"
            >
              View Cases ({recoveryMatters.length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Notice Card: Under Development */}
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <AlertCircle className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Debt Recovery module under development
            </h3>
            <p className="text-xs text-amber-800 mt-0.5">
              Dedicated recovery ledger, automatic statutory demand calculators, and bailiff oversight tools are currently being engineered. You can continue managing recovery claims directly through the primary Case Catalogue.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('dashboard')}
          className="text-xs font-bold text-amber-900 hover:text-amber-950 underline shrink-0 whitespace-nowrap"
        >
          Return to Dashboard
        </button>
      </div>

      {/* 3. Pipeline Roadmap & Planned Capabilities */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase tracking-wider text-slate-500 text-[11px]">
            Planned Recovery Workflow Components
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Phase 2 Release</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-900 mb-1">
              Demand Letters &amp; Default Notices
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Standardized statutory notice tracking under the Civil Procedure Rules and commercial contracts, with automated countdown timers for 14-day and 21-day demand expirations.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Notice expiration tracking</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-900 mb-1">
              Payment Plans &amp; Remittance Ledger
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Structured installment schedules, post-dated checks (PDC) logs, principal vs. interest breakdown, and transparent client remittance accounting.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>Multi-currency UGX &amp; USD ledgers</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <Scale className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-900 mb-1">
              Bailiff Oversight &amp; Decree Execution
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Direct tracking of Court Bailiff warrants of attachment, advertisement periods, public auction logs, and certificate of satisfaction filings.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-slate-400" />
              <span>High Court Execution Division sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Active Recovery Cases from Catalogue (Live Integration) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Current Recovery &amp; Commercial Claims</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Matters currently active in your Case Catalogue involving debt claims and financial recovery.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('catalogue')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Open in Catalogue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recoveryMatters.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No commercial recovery claims registered yet. Intake new matters from the primary catalogue.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recoveryMatters.slice(0, 5).map((matter) => (
              <div key={matter.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-slate-900 truncate">
                    {matter.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>MK Case No: <strong className="text-slate-700">{matter.suitNumber}</strong></span>
                    {matter.suit_no && <span>· Suit No: <strong className="text-slate-700">{matter.suit_no}</strong></span>}
                    <span>· {matter.branchName || 'Fort Portal'}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold font-mono text-emerald-700">
                    {matter.claimValueUGX ? `UGX ${matter.claimValueUGX.toLocaleString()}` : '—'}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {matter.status || 'Active'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
