import React, { useState, useEffect } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { MortgageService, BankSummary, MONTHS } from '../services/mortgageService';
import { ImportMortgagesModal } from '../components/ImportMortgagesModal';

export const BankHubPage: React.FC<{ onSelectBank: (bankName: string) => void }> = ({ onSelectBank }) => {
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

  useEffect(() => {
    fetchPortfolios();
  }, [selectedYear]);

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
          <h1 className="text-2xl font-bold text-gray-900">Mortgage Portfolios</h1>
          <p className="text-sm text-gray-500">
            Select a lending partner to manage branch registers and mortgage files.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import Excel</span>
          </button>

          <div className="flex items-center space-x-2 bg-white p-1.5 rounded-lg border border-gray-200 shadow-xs">
            <label className="text-xs font-medium text-gray-700">Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-white p-1.5 rounded-lg border border-gray-200 shadow-xs">
            <label className="text-xs font-medium text-gray-700">Financial Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 focus:outline-none cursor-pointer"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Loading bank portfolios for {selectedYear}...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {banksSummary.map((b) => (
            <div
              key={b.bank_name}
              onClick={() => onSelectBank(b.bank_name)}
              className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 hover:border-blue-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full group-hover:bg-blue-100 transition">
                  Lending Partner
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-3 group-hover:text-blue-700 transition">
                  {b.bank_name}
                </h3>
              </div>
              <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-gray-500 block">Active Files ({selectedYear})</span>
                  <span className="text-base font-semibold text-gray-900">{b.file_count}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Portfolio Value</span>
                  <span className="text-sm font-bold text-blue-600 font-mono">
                    {b.total_loan > 0 ? `UGX ${(b.total_loan / 1e9).toFixed(2)}B` : 'UGX 0'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isImportModalOpen && (
        <ImportMortgagesModal
          defaultBank="Centenary Bank"
          defaultMonth={selectedMonth}
          defaultYear={selectedYear}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => fetchPortfolios()}
        />
      )}
    </div>
  );
};

export default BankHubPage;
