import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { MortgageService } from '../services/mortgageService';
import { AddMortgageModal } from './AddMortgageModal';
import { EditMortgageModal } from './EditMortgageModal';
import { MortgageFilterBar } from './MortgageFilterBar';

export interface BankWorkspaceProps {
  bankName: string;
  currentUser?: any;
  onBack: () => void;
}

export const BankWorkspace: React.FC<BankWorkspaceProps> = ({ bankName, currentUser, onBack }) => {
  const [mortgages, setMortgages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<any | null>(null);

  // 1. Filter state hook for search query, department, status, and assigned lawyer ID
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    status: '',
    lawyerId: ''
  });

  // 2. Lawyers list for advocate filtering dropdown
  const [lawyersList, setLawyersList] = useState<any[]>([]);

  useEffect(() => {
    console.log('[BankWorkspace] Mounted for bank:', bankName);
  }, [bankName]);

  useEffect(() => {
    loadBankData();
  }, [bankName]);

  useEffect(() => {
    async function loadLawyers() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, name, role, email')
          .order('full_name', { ascending: true });

        if (!error && data && data.length > 0) {
          setLawyersList(data);
        } else {
          // Fallback to firm users or default legal counsel
          const { data: userData } = await supabase
            .from('firm_users')
            .select('id, name, email')
            .order('name', { ascending: true });
          if (userData && userData.length > 0) {
            setLawyersList(userData.map(u => ({ id: u.id, full_name: u.name, email: u.email })));
          }
        }
      } catch (err) {
        console.warn('Notice loading lawyers for filter bar:', err);
      }
    }
    loadLawyers();
  }, []);

  const loadBankData = async () => {
    setLoading(true);
    try {
      const data = await MortgageService.fetchMortgages(bankName);
      setMortgages(data || []);
    } catch (err) {
      console.error('Error loading bank data:', err);
      setMortgages([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMortgages = loadBankData;

  // 3. Filtered mortgages logic against fetched records
  const filteredMortgages = mortgages.filter((m) => {
    const searchQ = (filters.search || '').trim().toLowerCase();
    const matchesSearch =
      !searchQ ||
      m.borrower_name?.toLowerCase().includes(searchQ) ||
      m.mortgagor_name?.toLowerCase().includes(searchQ) ||
      m.title_deed_no?.toLowerCase().includes(searchQ) ||
      m.property_description?.toLowerCase().includes(searchQ) ||
      m.file_number?.toLowerCase().includes(searchQ) ||
      m.rim_no?.toLowerCase().includes(searchQ) ||
      m.bank_branch?.toLowerCase().includes(searchQ) ||
      m.department?.toLowerCase().includes(searchQ) ||
      m.assigned_lawyer_name?.toLowerCase().includes(searchQ) ||
      m.comments?.toLowerCase().includes(searchQ);

    const matchesDept =
      !filters.department ||
      filters.department === 'ALL' ||
      m.department === filters.department;

    const matchesStatus =
      !filters.status ||
      filters.status === 'ALL' ||
      m.status === filters.status;

    const matchesLawyer =
      !filters.lawyerId ||
      filters.lawyerId === 'ALL' ||
      String(m.assigned_lawyer_id || '') === String(filters.lawyerId);

    return matchesSearch && matchesDept && matchesStatus && matchesLawyer;
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

      {/* Mortgage Filter Bar */}
      <MortgageFilterBar
        filters={filters}
        onChange={setFilters}
        lawyers={lawyersList}
        onOpenAddModal={() => setIsModalOpen(true)}
      />

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
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
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
                        <div>{m.client_name || m.mortgagor_name || m.borrower_name || 'N/A'}</div>
                        {(m.department || m.assigned_lawyer_name || m.comments) && (
                          <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                            {m.department || 'Banking & Securities'}
                            {m.assigned_lawyer_name ? ` · ${m.assigned_lawyer_name}` : ''}
                            {m.comments ? ` · ${m.comments}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {m.branch || m.bank_branch || m.branch_name || 'Main Branch'}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        UGX {Number(m.loan_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-600 font-medium">
                        {disbursementsVal > 0 ? `UGX ${disbursementsVal.toLocaleString()}` : (Number(m.bank_charges || 0) + Number(m.transport || 0) + Number(m.linkage_fees || 0) > 0 ? `UGX ${(Number(m.bank_charges || 0) + Number(m.transport || 0) + Number(m.linkage_fees || 0) + Number(m.other_disbursements || 0)).toLocaleString()}` : '-')}
                      </td>
                      <td className="py-3 px-4 font-mono text-blue-700 font-bold">
                        {grandTotalVal > 0 ? `UGX ${grandTotalVal.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={m.property_description || m.title_deed_no}>
                        {m.property_description || m.title_deed_no || 'Freehold Title Pending'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                          (m.status || '').includes('Active') || (m.status || '').includes('Processing')
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : (m.status || '').includes('Completed') || (m.status || '').includes('Cleared') || (m.status || '').includes('Registered')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : (m.status || '').includes('Valuation')
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {m.status || 'Active / Processing'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedRecordForEdit(m)}
                          className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] border border-blue-200 transition"
                        >
                          Edit / Transfer
                        </button>
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

      {/* Conditionally rendered EditMortgageModal */}
      {selectedRecordForEdit && (
        <EditMortgageModal 
          record={selectedRecordForEdit} 
          currentUser={currentUser} 
          onClose={() => setSelectedRecordForEdit(null)} 
          onSuccess={() => loadBankData()} 
        />
      )}
    </div>
  );
};

export default BankWorkspace;
