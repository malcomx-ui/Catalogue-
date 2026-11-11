import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { AddMortgageModal } from './AddMortgageModal';

export interface BankWorkspaceProps {
  bankName: string;
  currentUser?: any;
  onBack: () => void;
}

export const BankWorkspace: React.FC<BankWorkspaceProps> = ({ bankName, currentUser, onBack }) => {
  const [mortgages, setMortgages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    console.log('[BankWorkspace] Mounted for bank:', bankName);
  }, [bankName]);

  useEffect(() => {
    loadBankData();
  }, [bankName]);

  const loadBankData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mortgages')
        .select('*')
        .eq('client_bank_name', bankName)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Mortgages fetch warning:', error.message);
        setMortgages([]);
      } else {
        setMortgages(data || []);
      }
    } catch (err) {
      console.error('Error loading bank data:', err);
      setMortgages([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMortgages = loadBankData;

  const filteredMortgages = mortgages.filter((m) => {
    const matchesSearch =
      !searchTerm ||
      m.borrower_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.mortgagor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.title_deed_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.property_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.file_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.rim_no?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = mortgages.reduce((acc, curr) => acc + (Number(curr.loan_amount) || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 w-full h-full min-h-[500px]">
      {/* Header with Back Button & Record Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 transition"
          >
            <span>←</span>
            <span>Back to Portfolios</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{bankName}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                Lending Partner Workspace
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Active Securities &amp; Mortgage Register · Scoped to {currentUser?.branchName || 'All Branch Stations'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right border-r border-gray-200 pr-4">
            <span className="text-xs text-gray-500 block">Total Portfolio Value</span>
            <span className="text-sm font-bold text-blue-700 font-mono">
              {totalValue > 0 ? `UGX ${(totalValue / 1e9).toFixed(2)}B` : 'UGX 0'}
            </span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
          >
            <span>+</span>
            <span>Add Mortgage File</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by mortgagor, RIM no, title deed number, or file ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500 font-medium text-gray-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="Under Preparation">Under Preparation</option>
            <option value="Sent for Registration">Sent for Registration</option>
            <option value="Registered">Registered (Custody Safe)</option>
            <option value="Pending Release">Pending Release</option>
            <option value="Released / Discharged">Released / Discharged</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            Loading {bankName} mortgage registers...
          </div>
        ) : filteredMortgages.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">
              📄
            </div>
            <h3 className="text-base font-semibold text-gray-800">No Mortgage Files Found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              There are currently no mortgage or security files recorded under {bankName} matching your search filter.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              + Add Mortgage File
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold">File / RIM Ref</th>
                  <th className="py-3 px-4 font-semibold">Mortgagor Name</th>
                  <th className="py-3 px-4 font-semibold">Bank Branch</th>
                  <th className="py-3 px-4 font-semibold">Loan Facility</th>
                  <th className="py-3 px-4 font-semibold">Disbursements</th>
                  <th className="py-3 px-4 font-semibold">Grand Total</th>
                  <th className="py-3 px-4 font-semibold">Property Description</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredMortgages.map((m, idx) => {
                  const disbursementsVal = Number(m.total_disbursements) || 0;
                  const grandTotalVal = Number(m.grand_total) || 0;
                  return (
                    <tr key={m.id || idx} className="hover:bg-blue-50/40 transition">
                      <td className="py-3 px-4 font-mono font-medium text-blue-600">
                        {m.rim_no || m.file_number || `MORT-${idx + 1}`}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {m.mortgagor_name || m.borrower_name || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {m.bank_branch || m.branch_name || 'Main Branch'}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        UGX {Number(m.loan_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-600 font-medium">
                        {disbursementsVal > 0 ? `UGX ${disbursementsVal.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-blue-700 font-bold">
                        {grandTotalVal > 0 ? `UGX ${grandTotalVal.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={m.property_description || m.title_deed_no}>
                        {m.property_description || m.title_deed_no || 'Freehold Title Pending'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {m.status || 'Registered'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Conditionally rendered AddMortgageModal */}
      {isModalOpen && (
        <AddMortgageModal 
          bankName={bankName} 
          currentUser={currentUser} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => loadBankData()} 
        />
      )}
    </div>
  );
};

export default BankWorkspace;
