import React, { useState, useEffect } from 'react';
import { MortgageService, BankSummary } from '../services/mortgageService';

export const BankHubPage: React.FC<{ onSelectBank: (bankName: string) => void }> = ({ onSelectBank }) => {
  const [banksSummary, setBanksSummary] = useState<BankSummary[]>([
    { bank_name: 'Centenary Bank', file_count: 0, total_loan: 0 },
    { bank_name: 'Finance Trust', file_count: 0, total_loan: 0 },
    { bank_name: 'Rushere SACCO', file_count: 0, total_loan: 0 },
    { bank_name: 'Opportunity Bank', file_count: 0, total_loan: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);

  useEffect(() => {
    console.log('[BankHubPage] Mounted successfully with year:', selectedYear);
  }, []);

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
      if (!result.hasCloudTable && result.errorNotice) {
        setCloudNotice(result.errorNotice);
      } else {
        setCloudNotice(null);
      }
    } catch (err: any) {
      console.warn('[BankHubPage] Notice loading bank summaries:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 w-full h-full min-h-[500px]">
      {/* Header with Title and Year Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mortgage Portfolios</h1>
          <p className="text-sm text-gray-500">
            Select a lending partner to manage branch registers and mortgage files.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-gray-200 shadow-xs">
          <label className="text-sm font-medium text-gray-700">Financial Year:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-blue-600 focus:outline-none cursor-pointer"
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
          </select>
        </div>
      </div>

      {/* Cloud / Workstation Status Banner */}
      {cloudNotice && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
          <span className="text-base leading-none">💡</span>
          <div className="flex-1">
            <span className="font-semibold block">Multi-Computer Workstation Mode Active</span>
            <span>
              Mortgage records are saved and synced across all firm workstations via the backend database.
              To link with your remote Supabase cloud project, run <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">public/mortgages_schema.sql</code> in your Supabase SQL editor.
            </span>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default BankHubPage;
