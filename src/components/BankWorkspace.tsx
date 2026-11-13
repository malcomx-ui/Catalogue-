import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  AlertTriangle,
  Copy,
  Check,
  X,
  Eye,
  Edit3,
  LayoutGrid,
  Table2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { MortgageService, MONTHS, MORTGAGE_RLS_FIX_SQL } from '../services/mortgageService';
import { AddMortgageModal } from './AddMortgageModal';
import { EditMortgageModal } from './EditMortgageModal';
import { ImportMortgagesModal } from './ImportMortgagesModal';
import { MortgageFilterBar, MortgageFilters } from './MortgageFilterBar';

export interface BankWorkspaceProps {
  bankName: string;
  currentUser?: any;
  onBack: () => void;
}

const formatUGX = (val: any, dashIfZero = true): string => {
  const num = Number(val || 0);
  if (dashIfZero && num === 0) return '-';
  return `UGX ${num.toLocaleString()}`;
};

const formatDate = (val: any): string => {
  if (!val) return '-';
  const str = String(val).trim();
  if (!str) return '-';
  return str.slice(0, 10);
};

export const BankWorkspace: React.FC<BankWorkspaceProps> = ({ bankName, currentUser, onBack }) => {
  const [mortgages, setMortgages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<any | null>(null);
  const [selectedRecordForView, setSelectedRecordForView] = useState<any | null>(null);
  const [cloudRlsNotice, setCloudRlsNotice] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  // 1. Filter state hook for search query, month, department, status, and assigned lawyer ID
  const [filters, setFilters] = useState<MortgageFilters>({
    search: '',
    month: '',
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

  // 3. Filtered mortgages logic against fetched records (covering all bank/branch/client aliases)
  const filteredMortgages = useMemo(() => {
    return mortgages.filter((m) => {
      const searchQ = (filters.search || '').trim().toLowerCase();
      const matchesSearch =
        !searchQ ||
        m.client_name?.toLowerCase().includes(searchQ) ||
        m.borrower_name?.toLowerCase().includes(searchQ) ||
        m.mortgagor_name?.toLowerCase().includes(searchQ) ||
        m.title_deed_no?.toLowerCase().includes(searchQ) ||
        m.property_description?.toLowerCase().includes(searchQ) ||
        m.file_number?.toLowerCase().includes(searchQ) ||
        m.rim_no?.toLowerCase().includes(searchQ) ||
        m.branch?.toLowerCase().includes(searchQ) ||
        m.client_branch_location?.toLowerCase().includes(searchQ) ||
        m.bank_branch?.toLowerCase().includes(searchQ) ||
        m.month_sheet?.toLowerCase().includes(searchQ) ||
        m.source_sheet?.toLowerCase().includes(searchQ) ||
        m.department?.toLowerCase().includes(searchQ) ||
        m.assigned_lawyer_name?.toLowerCase().includes(searchQ) ||
        m.comments?.toLowerCase().includes(searchQ);

      const matchesMonth = (() => {
        if (!filters.month) return true;
        const targetFull = filters.month.toLowerCase();
        const targetShort = targetFull.slice(0, 3);
        const ms = String(m.month_sheet || '').trim().toLowerCase();
        const ss = String(m.source_sheet || '').trim().toLowerCase();
        return (
          ms === targetFull ||
          ms === targetShort ||
          ss === targetFull ||
          ss === targetShort ||
          ss.includes(targetFull)
        );
      })();

      const matchesDept =
        !filters.department ||
        filters.department === 'ALL' ||
        m.department === filters.department;

      const matchesStatus =
        !filters.status ||
        filters.status === 'ALL' ||
        (m.status || '').toLowerCase() === filters.status.toLowerCase();

      const matchesLawyer =
        !filters.lawyerId ||
        filters.lawyerId === 'ALL' ||
        String(m.assigned_lawyer_id || '') === String(filters.lawyerId);

      return matchesSearch && matchesMonth && matchesDept && matchesStatus && matchesLawyer;
    });
  }, [mortgages, filters]);

  const totalValue = useMemo(
    () => mortgages.reduce((acc, curr) => acc + (Number(curr.loan_amount) || 0), 0),
    [mortgages]
  );

  const filteredTotals = useMemo(() => {
    return filteredMortgages.reduce(
      (acc, m) => {
        acc.loan += Number(m.loan_amount || 0);
        acc.disbursements += Number(m.total_disbursements || 0);
        acc.legalFees += Number(m.legal_fees || 0);
        acc.vat += Number(m.vat_18 ?? m.vat ?? 0);
        acc.grandTotal += Number(m.grand_total || 0);
        return acc;
      },
      { loan: 0, disbursements: 0, legalFees: 0, vat: 0, grandTotal: 0 }
    );
  }, [filteredMortgages]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5 w-full h-full min-h-[500px]">
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
                {mortgages.length} Files Loaded
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Active Securities &amp; 19-Column Mortgage Register · Scoped to {currentUser?.branchName || 'All Branch Stations'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right border-r border-gray-200 pr-4">
            <span className="text-xs text-gray-500 block">Total Portfolio Value</span>
            <span className="text-sm font-bold text-blue-700 font-mono">
              {totalValue > 0 ? `UGX ${(totalValue / 1e9).toFixed(2)}B` : 'UGX 0'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
          >
            <span>+</span>
            <span>Add Mortgage File</span>
          </button>
        </div>
      </div>

      {/* Supabase RLS Non-Blocking Sync Notice */}
      {cloudRlsNotice && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-950 shadow-xs space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">
                  Saved to Workstation Register · Supabase Cloud RLS Policy Blocked Direct Cloud Write
                </p>
                <p className="text-amber-800 mt-0.5">
                  Your mortgage record is saved and visible below, but Supabase returned:{' '}
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
                    // ignore clipboard fallback
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
          <pre className="bg-white/80 border border-amber-200 rounded-lg p-2.5 text-[11px] font-mono text-slate-800 overflow-x-auto select-all">
            {MORTGAGE_RLS_FIX_SQL}
          </pre>
        </div>
      )}

      {/* Mortgage Filter Bar */}
      <MortgageFilterBar
        filters={filters}
        onChange={setFilters}
        lawyers={lawyersList}
        onOpenAddModal={() => setIsModalOpen(true)}
      />

      {/* Filtered Summary Strip */}
      {!loading && mortgages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-gray-500 block">Showing Files</span>
            <span className="text-base font-bold text-gray-900 font-mono">
              {filteredMortgages.length} <span className="text-xs font-normal text-gray-400">/ {mortgages.length}</span>
            </span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-gray-500 block">Loan Facilities</span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              UGX {filteredTotals.loan.toLocaleString()}
            </span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-gray-500 block">Total Disbursements</span>
            <span className="text-sm font-bold text-amber-700 font-mono">
              UGX {filteredTotals.disbursements.toLocaleString()}
            </span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-gray-500 block">Legal Fees + 18% VAT</span>
            <span className="text-sm font-bold text-indigo-700 font-mono">
              UGX {(filteredTotals.legalFees + filteredTotals.vat).toLocaleString()}
            </span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-gray-500 block">Grand Total Billed</span>
            <span className="text-sm font-bold text-blue-700 font-mono">
              UGX {filteredTotals.grandTotal.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Full Register Container (Table + All-Fields Cards View) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {!loading && filteredMortgages.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Table2 className="w-3.5 h-3.5" />
                  <span>Spreadsheet Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    viewMode === 'cards'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>All-Fields Cards</span>
                </button>
              </div>
              <span className="text-[11px] text-gray-500 hidden sm:inline">
                All 22 columns loaded · Click any row or card to inspect full record
              </span>
            </div>

            {viewMode === 'table' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => tableScrollRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-[11px] font-medium text-gray-700 transition"
                  title="Scroll table left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Scroll Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => tableScrollRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-[11px] font-medium text-gray-700 transition"
                  title="Scroll table right for fees, dates & comments"
                >
                  <span>More Columns</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

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
            <div className="flex items-center justify-center gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                + Add Mortgage File
              </button>
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 bg-slate-50/40">
            {filteredMortgages.map((m, idx) => (
              <div
                key={m.id || idx}
                onClick={() => setSelectedRecordForView(m)}
                className="bg-white rounded-xl border border-gray-200 shadow-2xs hover:border-blue-300 hover:shadow-sm transition p-4 space-y-3 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="font-mono text-gray-400">#{idx + 1}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                        {m.month_sheet || m.source_sheet || '-'}
                        {m.record_year ? ` ${m.record_year}` : ''}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {m.branch || m.client_branch_location || m.bank_branch || 'No Branch'}
                      </span>
                      {m.rim_no && (
                        <span className="font-mono font-semibold text-blue-600">
                          RIM: {m.rim_no}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mt-1.5 truncate">
                      {m.client_name || m.mortgagor_name || m.borrower_name || m.name || 'N/A'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSelectedRecordForView(m)}
                      className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-[11px] border border-slate-200 inline-flex items-center gap-1 transition"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRecordForEdit(m)}
                      className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] border border-blue-200 inline-flex items-center gap-1 transition"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                {/* Prominent Property Description */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Property Description
                  </span>
                  <p className="text-xs text-slate-800 font-medium mt-0.5 whitespace-normal leading-relaxed">
                    {m.property_description || m.description || m.title_deed_no || (
                      <span className="italic text-slate-400">Not recorded in source data</span>
                    )}
                  </p>
                </div>

                {/* Financial Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-white border border-gray-100 rounded p-2">
                    <span className="text-gray-400 block">Loan Amount</span>
                    <span className="font-mono font-bold text-gray-900">{formatUGX(m.loan_amount)}</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded p-2">
                    <span className="text-gray-400 block">Stamp Duty</span>
                    <span className="font-mono font-semibold text-gray-700">{formatUGX(m.stamp_duty)}</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded p-2">
                    <span className="text-gray-400 block">Extra Copies</span>
                    <span className="font-mono font-semibold text-gray-700">{formatUGX(m.extra_copies)}</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded p-2">
                    <span className="text-gray-400 block">Registration</span>
                    <span className="font-mono font-semibold text-gray-700">{formatUGX(m.registration_fee ?? m.registration)}</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded p-2">
                    <span className="text-gray-400 block">Other Fees</span>
                    <span className="font-mono font-semibold text-gray-700">{formatUGX(m.other_fees ?? m.other_disbursements ?? m.other)}</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded p-2">
                    <span className="text-gray-400 block">Bank Charges</span>
                    <span className="font-mono font-semibold text-gray-700">{formatUGX(m.bank_charges)}</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded p-2">
                    <span className="text-gray-400 block">Transport</span>
                    <span className="font-mono font-semibold text-gray-700">{formatUGX(m.transport)}</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded p-2">
                    <span className="text-gray-400 block">Linkage Fees</span>
                    <span className="font-mono font-semibold text-gray-700">{formatUGX(m.linkage_fees)}</span>
                  </div>
                </div>

                {/* Totals Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-blue-50/50 border border-blue-100 rounded-lg p-2.5">
                  <div>
                    <span className="text-gray-500 block">Total Disb.</span>
                    <span className="font-mono font-bold text-amber-700">{formatUGX(m.total_disbursements)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Legal Fees</span>
                    <span className="font-mono font-bold text-indigo-700">{formatUGX(m.legal_fees)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">VAT 18%</span>
                    <span className="font-mono font-semibold text-slate-800">{formatUGX(m.vat_18 ?? m.vat)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Grand Total</span>
                    <span className="font-mono font-bold text-blue-700">{formatUGX(m.grand_total)}</span>
                  </div>
                </div>

                {/* Dates, Status & Comments */}
                <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>Receipt: <strong className="font-mono text-gray-800">{formatDate(m.date_of_receipt)}</strong></span>
                    <span>Payment: <strong className="font-mono text-gray-800">{formatDate(m.date_of_payment)}</strong></span>
                    <span>Return: <strong className="font-mono text-gray-800">{formatDate(m.date_of_return)}</strong></span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px]">
                    {m.status || 'Active / Processing'}
                  </span>
                </div>
                {m.comments && (
                  <p className="text-[11px] text-gray-600 bg-amber-50/50 border border-amber-100 rounded px-2.5 py-1.5">
                    <span className="font-semibold text-gray-700">Comments:</span> {m.comments}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div ref={tableScrollRef} className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-gray-200 whitespace-nowrap">
                  <th className="py-3 px-3 font-bold">#</th>
                  <th className="py-3 px-3 font-bold">Period (Month / Year)</th>
                  <th className="py-3 px-3 font-bold min-w-[160px]">Client Name</th>
                  <th className="py-3 px-3 font-bold min-w-[230px]">Property Description</th>
                  <th className="py-3 px-3 font-bold">Branch</th>
                  <th className="py-3 px-3 font-bold">RIM NO.</th>
                  <th className="py-3 px-3 font-bold text-right">Loan Amount</th>
                  <th className="py-3 px-3 font-bold text-right">Stamp Duty</th>
                  <th className="py-3 px-3 font-bold text-right">Extra Copies</th>
                  <th className="py-3 px-3 font-bold text-right">Registration</th>
                  <th className="py-3 px-3 font-bold text-right">Other</th>
                  <th className="py-3 px-3 font-bold text-right">Bank Charges</th>
                  <th className="py-3 px-3 font-bold text-right">Transport</th>
                  <th className="py-3 px-3 font-bold text-right">Linkage Fees</th>
                  <th className="py-3 px-3 font-bold text-right">Total Disb.</th>
                  <th className="py-3 px-3 font-bold text-right">Legal Fees</th>
                  <th className="py-3 px-3 font-bold text-right">VAT 18%</th>
                  <th className="py-3 px-3 font-bold text-right">Grand Total</th>
                  <th className="py-3 px-3 font-bold">Date of Receipt</th>
                  <th className="py-3 px-3 font-bold">Date of Payment</th>
                  <th className="py-3 px-3 font-bold">Date of Return</th>
                  <th className="py-3 px-3 font-bold min-w-[160px]">Comments</th>
                  <th className="py-3 px-3 font-bold">Status</th>
                  <th className="py-3 px-3 font-bold text-right sticky right-0 bg-slate-50 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredMortgages.map((m, idx) => (
                  <tr
                    key={m.id || idx}
                    onClick={() => setSelectedRecordForView(m)}
                    className="hover:bg-blue-50/40 transition whitespace-nowrap group cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono text-gray-400">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                        {m.month_sheet || m.source_sheet || '-'}
                        {m.record_year ? ` ${m.record_year}` : ''}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900 whitespace-normal min-w-[160px] max-w-[210px]">
                      {m.client_name || m.mortgagor_name || m.borrower_name || m.name || 'N/A'}
                    </td>
                    <td
                      className="py-2.5 px-3 text-gray-700 whitespace-normal min-w-[230px] max-w-[320px] leading-snug"
                      title={m.property_description || m.description || m.title_deed_no}
                    >
                      {m.property_description || m.description || m.title_deed_no || (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-gray-700 font-medium">
                      {m.branch || m.client_branch_location || m.bank_branch || m.branch_name || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                      {m.rim_no || m.file_number || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-right text-gray-900">
                      {formatUGX(m.loan_amount)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-gray-700">
                      {formatUGX(m.stamp_duty)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-gray-700">
                      {formatUGX(m.extra_copies)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-gray-700">
                      {formatUGX(m.registration_fee ?? m.registration)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-gray-700">
                      {formatUGX(m.other_fees ?? m.other_disbursements ?? m.other)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-gray-700">
                      {formatUGX(m.bank_charges)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-gray-700">
                      {formatUGX(m.transport)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-gray-700">
                      {formatUGX(m.linkage_fees)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-semibold text-amber-700">
                      {formatUGX(m.total_disbursements)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-medium text-indigo-700">
                      {formatUGX(m.legal_fees)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-slate-700">
                      {formatUGX(m.vat_18 ?? m.vat)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-bold text-blue-700">
                      {formatUGX(m.grand_total)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-600">
                      {formatDate(m.date_of_receipt)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-600">
                      {formatDate(m.date_of_payment)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-600">
                      {formatDate(m.date_of_return)}
                    </td>
                    <td
                      className="py-2.5 px-3 text-gray-600 whitespace-normal min-w-[160px] max-w-xs"
                      title={m.comments}
                    >
                      {m.comments || '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          (m.status || '').includes('Active') || (m.status || '').includes('Processing')
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : (m.status || '').includes('Completed') ||
                              (m.status || '').includes('Cleared') ||
                              (m.status || '').includes('Registered')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : (m.status || '').includes('Valuation')
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {m.status || 'Active / Processing'}
                      </span>
                    </td>
                    <td
                      className="py-2.5 px-3 text-right sticky right-0 bg-white group-hover:bg-blue-50/90 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRecordForView(m)}
                          className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-[11px] border border-slate-200 inline-flex items-center gap-1 transition"
                          title="View all fields"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRecordForEdit(m)}
                          className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] border border-blue-200 inline-flex items-center gap-1 transition"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Record Detail View Modal (All Fields) */}
      {selectedRecordForView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 text-xs text-blue-300">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-400/30 font-semibold">
                    {selectedRecordForView.client_bank_name || selectedRecordForView.bank_name || bankName}
                  </span>
                  <span>·</span>
                  <span>
                    {selectedRecordForView.month_sheet || selectedRecordForView.source_sheet || 'Register'}{' '}
                    {selectedRecordForView.record_year || ''}
                  </span>
                  <span>·</span>
                  <span className="font-mono">RIM: {selectedRecordForView.rim_no || '-'}</span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">
                  {selectedRecordForView.client_name || selectedRecordForView.mortgagor_name || 'Mortgage File Details'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecordForView(null)}
                className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Section 1: Core Particulars */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  1. File Particulars &amp; Security Description
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Bank Name</span>
                    <span className="font-semibold text-slate-900">
                      {selectedRecordForView.client_bank_name || selectedRecordForView.bank_name || bankName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Branch Station</span>
                    <span className="font-semibold text-slate-900">
                      {selectedRecordForView.branch || selectedRecordForView.client_branch_location || selectedRecordForView.bank_branch || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Record Year &amp; Month</span>
                    <span className="font-semibold text-slate-900">
                      {selectedRecordForView.month_sheet || '-'} {selectedRecordForView.record_year || ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Status</span>
                    <span className="font-semibold text-blue-700">
                      {selectedRecordForView.status || 'Active / Processing'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Client / Mortgagor Name</span>
                    <span className="font-semibold text-slate-900">
                      {selectedRecordForView.client_name || selectedRecordForView.mortgagor_name || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">RIM NO.</span>
                    <span className="font-mono font-semibold text-blue-700">
                      {selectedRecordForView.rim_no || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Loan Amount</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatUGX(selectedRecordForView.loan_amount, false)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Source Sheet</span>
                    <span className="font-medium text-slate-700">
                      {selectedRecordForView.source_sheet || '-'}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-4">
                    <span className="text-slate-500 block">Property Description</span>
                    <span className="font-medium text-slate-900">
                      {selectedRecordForView.property_description || selectedRecordForView.description || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Disbursements & Legal Fees */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  2. Statutory Disbursements, Legal Fees &amp; Grand Total
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Stamp Duty</span>
                    <span className="font-mono font-semibold text-slate-900">{formatUGX(selectedRecordForView.stamp_duty, false)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Extra Copies</span>
                    <span className="font-mono font-semibold text-slate-900">{formatUGX(selectedRecordForView.extra_copies, false)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Registration Fee</span>
                    <span className="font-mono font-semibold text-slate-900">{formatUGX(selectedRecordForView.registration_fee ?? selectedRecordForView.registration, false)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Other Fees</span>
                    <span className="font-mono font-semibold text-slate-900">{formatUGX(selectedRecordForView.other_fees ?? selectedRecordForView.other_disbursements ?? selectedRecordForView.other, false)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Bank Charges</span>
                    <span className="font-mono font-semibold text-slate-900">{formatUGX(selectedRecordForView.bank_charges, false)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Transport</span>
                    <span className="font-mono font-semibold text-slate-900">{formatUGX(selectedRecordForView.transport, false)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Linkage Fees</span>
                    <span className="font-mono font-semibold text-slate-900">{formatUGX(selectedRecordForView.linkage_fees, false)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Disbursements</span>
                    <span className="font-mono font-bold text-amber-700">{formatUGX(selectedRecordForView.total_disbursements, false)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Legal Fees</span>
                    <span className="font-mono font-bold text-indigo-700">{formatUGX(selectedRecordForView.legal_fees, false)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">VAT (18%)</span>
                    <span className="font-mono font-semibold text-slate-900">{formatUGX(selectedRecordForView.vat_18 ?? selectedRecordForView.vat, false)}</span>
                  </div>
                  <div className="col-span-2 bg-blue-900 text-white p-2.5 rounded-lg flex items-center justify-between">
                    <span className="font-semibold text-blue-200">Grand Total</span>
                    <span className="font-mono font-bold text-sm">{formatUGX(selectedRecordForView.grand_total, false)}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Dates & Comments */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  3. Dates, Assignment &amp; Comments
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block">Date of Receipt</span>
                    <span className="font-mono font-semibold text-slate-900">{formatDate(selectedRecordForView.date_of_receipt)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date of Payment</span>
                    <span className="font-mono font-semibold text-slate-900">{formatDate(selectedRecordForView.date_of_payment)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date of Return</span>
                    <span className="font-mono font-semibold text-slate-900">{formatDate(selectedRecordForView.date_of_return)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Department</span>
                    <span className="font-medium text-slate-800">{selectedRecordForView.department || 'Banking & Securities'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Assigned Advocate</span>
                    <span className="font-medium text-slate-800">{selectedRecordForView.assigned_lawyer_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Created At</span>
                    <span className="font-mono text-slate-600">{formatDate(selectedRecordForView.created_at)}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-slate-500 block">Comments / Remarks</span>
                    <span className="font-medium text-slate-900">{selectedRecordForView.comments || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedRecordForView(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const rec = selectedRecordForView;
                  setSelectedRecordForView(null);
                  setSelectedRecordForEdit(rec);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Edit / Transfer File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conditionally rendered AddMortgageModal */}
      {isModalOpen && (
        <AddMortgageModal 
          bankName={bankName}
          defaultMonth={filters.month || undefined}
          currentUser={currentUser} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={(savedRecord, meta) => {
            if (savedRecord) {
              setMortgages((prev) => {
                const exists = prev.some((item) => item.id && item.id === savedRecord.id);
                return exists ? prev : [savedRecord, ...prev];
              });
              if (
                filters.month &&
                savedRecord.month_sheet &&
                savedRecord.month_sheet.toLowerCase() !== filters.month.toLowerCase()
              ) {
                setFilters((prev) => ({ ...prev, month: savedRecord.month_sheet }));
              }
            }
            if (meta && meta.cloudSaved === false && meta.cloudError) {
              setCloudRlsNotice(meta.cloudError);
            } else if (meta?.cloudSaved) {
              setCloudRlsNotice(null);
            }
            loadBankData();
          }} 
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

      {/* Conditionally rendered ImportMortgagesModal */}
      {isImportModalOpen && (
        <ImportMortgagesModal
          defaultBank={bankName}
          defaultMonth={filters.month || MONTHS[new Date().getMonth()]}
          defaultYear={new Date().getFullYear()}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={(meta) => {
            if (meta && meta.cloudSaved === false && meta.cloudError) {
              setCloudRlsNotice(meta.cloudError);
            } else if (meta?.cloudSaved) {
              setCloudRlsNotice(null);
            }
            loadBankData();
          }}
        />
      )}
    </div>
  );
};

export default BankWorkspace;
