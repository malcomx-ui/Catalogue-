import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, AlertTriangle, Copy, Check, X, Plus } from 'lucide-react';
import { MortgageService, BankSummary, MONTHS, MORTGAGE_RLS_FIX_SQL } from '../services/mortgageService';
import { ImportMortgagesModal } from '../components/ImportMortgagesModal';
import { AddMortgageModal } from '../components/AddMortgageModal';
import { useApp, MortgageViewAction } from '../context/AppContext';
import { getEffectiveUser, isUserAdmin } from '../lib/supabase';
import { showCleanMessage } from '../utils/notification';

export const BankHubPage: React.FC<{
  onSelectBank: (bankName: string) => void;
  externalAction?: MortgageViewAction;
  externalActionNonce?: number;
}> = ({ onSelectBank, externalAction, externalActionNonce }) => {
  const { currentUser, userPermissions } = useApp();
  const canBulkImportMortgages = isUserAdmin(getEffectiveUser(currentUser)) || Boolean(userPermissions.canBulkImport);
  const [banksSummary, setBanksSummary] = useState<BankSummary[]>([
    { bank_name: 'Centenary Bank', file_count: 0, total_loan: 0 },
    { bank_name: 'Finance Trust', file_count: 0, total_loan: 0 },
    { bank_name: 'Rushere SACCO', file_count: 0, total_loan: 0 },
    { bank_name: 'Opportunity Bank', file_count: 0, total_loan: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => MONTHS[new Date().getMonth()]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [cloudRlsNotice, setCloudRlsNotice] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    fetchPortfolios();
  }, [selectedYear]);

  useEffect(() => {
    if (!externalActionNonce) return;
    if (externalAction === 'add') {
      setIsImportModalOpen(false);
      setIsAddModalOpen(true);
    } else if (externalAction === 'import') {
      if (canBulkImportMortgages) {
        setIsAddModalOpen(false);
        setIsImportModalOpen(true);
      } else {
        showCleanMessage('Bulk mortgage import is restricted to Firm Administrators and Super Admins.', 'warning');
      }
    } else if (externalAction === 'workspace') {
      setIsAddModalOpen(false);
      setIsImportModalOpen(false);
    }
  }, [externalAction, externalActionNonce, canBulkImportMortgages]);

  const fetchPortfolios = async () => {
    setLoading(true);
    try {
      const result = await MortgageService.fetchBankSummaries(selectedYear);
      if (result.summaries && result.summaries.length > 0) {
        setBanksSummary(result.summaries);
      }
    } catch (err: any) {
      console.warn('[BankHubPage] Notice loading bank summaries:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 w-full h-full min-h-[500px]">
      {/* Header with Title, Month/Year Selector and Excel Import */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mortgage Portfolios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select a lending partner to manage branch registers and mortgage files.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Mortgage</span>
          </button>

          {canBulkImportMortgages && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </button>
          )}

          <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 pl-1">Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 pl-1">Financial Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 focus:outline-none cursor-pointer tabular-nums"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
          </div>
        </div>
      </div>

      {cloudRlsNotice && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-950 shadow-xs space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">
                  Imported to Workstation Register · Supabase Cloud RLS Policy Blocked Direct Cloud Write
                </p>
                <p className="text-amber-800 mt-0.5">
                  Records are saved locally and counted below, but Supabase returned:{' '}
                  <span className="font-mono font-semibold">{cloudRlsNotice}</span>. Run the SQL fix once in your Supabase SQL Editor to enable cloud sync.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(MORTGAGE_RLS_FIX_SQL);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2500);
                  } catch {
                    // ignore
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied SQL!' : 'Copy Supabase RLS Fix SQL'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCloudRlsNotice(null)}
                className="p-1 text-amber-700 hover:text-amber-950 rounded-lg hover:bg-amber-100 transition"
                aria-label="Dismiss notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading bank portfolios for {selectedYear}...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {banksSummary.map((b) => (
            <div
              key={b.bank_name}
              onClick={() => onSelectBank(b.bank_name)}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div>
                <span className="text-xs font-medium px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 transition">
                  Lending Partner
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-3 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition">
                  {b.bank_name}
                </h3>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Active Files ({selectedYear})</span>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">{b.file_count}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Portfolio Value</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                    {b.total_loan > 0 ? `UGX ${(b.total_loan / 1e9).toFixed(2)}B` : 'UGX 0'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddModalOpen && (
        <AddMortgageModal
          bankName="Centenary Bank"
          allowBankSelection
          defaultMonth={selectedMonth}
          currentUser={currentUser}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(_, meta) => {
            if (meta && meta.cloudSaved === false && meta.cloudError) {
              setCloudRlsNotice(meta.cloudError);
            } else if (meta?.cloudSaved) {
              setCloudRlsNotice(null);
            }
            fetchPortfolios();
          }}
        />
      )}

      {canBulkImportMortgages && isImportModalOpen && (
        <ImportMortgagesModal
          defaultBank="Centenary Bank"
          defaultMonth={selectedMonth}
          defaultYear={selectedYear}
          currentUser={currentUser}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={(meta) => {
            if (meta && meta.cloudSaved === false && meta.cloudError) {
              setCloudRlsNotice(meta.cloudError);
            } else if (meta?.cloudSaved) {
              setCloudRlsNotice(null);
            }
            fetchPortfolios();
          }}
        />
      )}
    </div>
  );
};

export default BankHubPage;
