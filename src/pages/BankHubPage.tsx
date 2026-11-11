import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export const BankHubPage: React.FC<{ onSelectBank: (bankName: string) => void }> = ({ onSelectBank }) => {
  const [banksSummary, setBanksSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  useEffect(() => {
    fetchPortfolios();
  }, [selectedYear]);

  const fetchPortfolios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mortgages')
        .select('client_bank_name, loan_amount')
        .eq('record_year', selectedYear);

      if (error) throw error;

      const grouped: { [key: string]: { count: number; totalLoan: number } } = {};
      const defaultBanks = ['Centenary Bank', 'Stanbic Bank', 'dfcu Bank', 'Equity Bank', 'Absa Bank'];
      defaultBanks.forEach(b => { grouped[b] = { count: 0, totalLoan: 0 }; });

      data?.forEach(item => {
        const bank = item.client_bank_name || 'Centenary Bank';
        if (!grouped[bank]) grouped[bank] = { count: 0, totalLoan: 0 };
        grouped[bank].count += 1;
        grouped[bank].totalLoan += Number(item.loan_amount || 0);
      });

      setBanksSummary(Object.keys(grouped).map(bank => ({
        bank_name: bank,
        file_count: grouped[bank].count,
        total_loan: grouped[bank].totalLoan
      })));
    } catch (err) {
      console.error('Error loading bank summaries:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mortgages & Securities Portfolios</h1>
          <p className="text-sm text-gray-500">Select a lending partner to manage branch registers and mortgage records.</p>
        </div>
        <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border shadow-sm">
          <label className="text-sm font-medium text-gray-700">Financial Year:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-blue-600 focus:outline-none"
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading bank portfolios for {selectedYear}...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {banksSummary.map((b) => (
            <div 
              key={b.bank_name}
              onClick={() => onSelectBank(b.bank_name)}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4"
            >
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">Lending Partner</span>
                <h3 className="text-lg font-bold text-gray-900 mt-3">{b.bank_name}</h3>
              </div>
              <div className="border-t pt-4 grid grid-cols-2 gap-2">
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
