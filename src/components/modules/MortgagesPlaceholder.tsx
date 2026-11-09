import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Landmark,
  Briefcase,
  Calendar,
  Clock,
  ArrowRight,
  FileCheck2,
  Scale,
  Building2,
  ChevronRight,
  AlertCircle,
  Plus,
  ShieldCheck,
  Home,
} from 'lucide-react';

export const MortgagesPlaceholder: React.FC = () => {
  const { setActiveTab, setIsNewCaseModalOpen, cases } = useApp();

  // Matched mortgage, banking, land or security cases from current catalogue
  const mortgageMatters = cases.filter((c) => {
    const text = `${c.title} ${c.division} ${c.briefSummary} ${c.subject_matter || ''} ${c.stage}`.toLowerCase();
    return (
      text.includes('mortgage') ||
      text.includes('land') ||
      text.includes('charge') ||
      text.includes('security') ||
      text.includes('foreclosure') ||
      text.includes('property') ||
      text.includes('rta')
    );
  });

  return (
    <div className="space-y-6 text-slate-900 pb-16 max-w-6xl mx-auto">
      {/* 1. Header Hero Banner */}
      <div className="bg-[#0b132b] text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Landmark className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Mortgages &amp; Banking Securities</h1>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Under Development
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Legal mortgages, statutory power of sale compliance under the Mortgage Act 2009, perfection of securities, charge registration, and foreclosure actions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsNewCaseModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Intake Matter</span>
            </button>
            <button
              onClick={() => setActiveTab('catalogue')}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-semibold transition-all"
            >
              View Cases ({mortgageMatters.length})
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
              Mortgages module under development
            </h3>
            <p className="text-xs text-amber-800 mt-0.5">
              Dedicated perfection workflows, land registry search pipelines, and statutory notice generators are under active development. All ongoing mortgage disputes and land transactions can be managed through the main Case Catalogue.
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
            Planned Banking &amp; Mortgage Registry Features
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Phase 2 Release</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
              <Home className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-900 mb-1">
              Perfection &amp; Title Verification
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ministry of Lands search reports tracking, encumbrance verification, spousal consent verification, and registration of legal mortgages across Ugandan regional land registries.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-slate-400" />
              <span>Due diligence &amp; title search logs</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-900 mb-1">
              Statutory Power of Sale Workflow
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Automated compliance with Section 19 (default notices) and Section 20 (notice to sell) under the Mortgage Act 2009, tracking the mandatory 45-day and 21-day public auction timelines.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Mortgage Act statutory deadlines</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-900 mb-1">
              Discharge &amp; Foreclosure Closure
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Deeds of release, discharge of legal charges upon loan full repayment, escrow accountability, and court applications for orders of foreclosure or vacant possession.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Scale className="w-3 h-3 text-slate-400" />
              <span>Full redemption &amp; release tracking</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Active Mortgage Cases from Catalogue (Live Integration) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Current Mortgage &amp; Property Matters</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Matters currently active in your Case Catalogue related to mortgages, banking securities, and land transactions.
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

        {mortgageMatters.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No active mortgage or land security cases found. Register new files from the primary catalogue.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {mortgageMatters.slice(0, 5).map((matter) => (
              <div key={matter.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-slate-900 truncate">
                    {matter.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>MK Case No: <strong className="text-slate-700">{matter.suitNumber}</strong></span>
                    {matter.suit_no && <span>· Suit No: <strong className="text-slate-700">{matter.suit_no}</strong></span>}
                    <span>· {matter.branchName || 'Kampala Central'}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold font-mono text-indigo-700">
                    {matter.division || 'Commercial / Land'}
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
