import React, { useState, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { MortgageService } from '../../services/mortgageService';
import { Building2, X, AlertCircle, CheckCircle2, DollarSign, Calculator, FileText } from 'lucide-react';

export interface AddMortgageModalProps {
  bankName?: string;
  currentUser?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const BANK_OPTIONS = [
  'Centenary Bank',
  'Stanbic Bank',
  'DFCU Bank',
  'Absa Bank',
  'Equity Bank',
];

const STATUS_OPTIONS = [
  'Active / Processing',
  'Completed / Cleared',
  'Pending Valuation',
  'On Hold',
];

export const AddMortgageModal: React.FC<AddMortgageModalProps> = ({
  bankName: initialBankName,
  currentUser,
  onClose,
  onSuccess,
}) => {
  // 1. Form state fields matching exact schema of mortgage_cases table:
  const [bankName, setBankName] = useState<string>(
    initialBankName && BANK_OPTIONS.includes(initialBankName)
      ? initialBankName
      : 'Centenary Bank'
  );
  const [branch, setBranch] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [rimNo, setRimNo] = useState<string>('');
  const [propertyDescription, setPropertyDescription] = useState<string>('');

  // Numeric fields
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [bankCharges, setBankCharges] = useState<string>('');
  const [transport, setTransport] = useState<string>('');
  const [linkageFees, setLinkageFees] = useState<string>('');
  const [otherDisbursements, setOtherDisbursements] = useState<string>('');
  const [grandTotalManual, setGrandTotalManual] = useState<string>('');
  const [autoCalculateTotal, setAutoCalculateTotal] = useState<boolean>(true);

  // Status & comments
  const [comments, setComments] = useState<string>('');
  const [status, setStatus] = useState<string>('Active / Processing');

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Automatic calculation of grand_total if desired:
  // grand_total = bank_charges + transport + linkage_fees + other_disbursements
  const calculatedGrandTotal = useMemo(() => {
    const charges = parseFloat(bankCharges) || 0;
    const trans = parseFloat(transport) || 0;
    const linkage = parseFloat(linkageFees) || 0;
    const other = parseFloat(otherDisbursements) || 0;
    return charges + trans + linkage + other;
  }, [bankCharges, transport, linkageFees, otherDisbursements]);

  const effectiveGrandTotal = autoCalculateTotal
    ? calculatedGrandTotal
    : parseFloat(grandTotalManual) || 0;

  // Helper to parse numeric values safely
  const parseNumber = (val: string): number => {
    if (!val || val.trim() === '') return 0;
    const cleaned = val.replace(/,/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation: client_name is Required
    if (!clientName.trim()) {
      setErrorMessage('Client Name is required.');
      return;
    }

    setLoading(true);

    const payload = {
      bank_name: bankName,
      branch: branch.trim(),
      client_name: clientName.trim(),
      rim_no: rimNo.trim(),
      property_description: propertyDescription.trim(),
      loan_amount: parseNumber(loanAmount),
      bank_charges: parseNumber(bankCharges),
      transport: parseNumber(transport),
      linkage_fees: parseNumber(linkageFees),
      other_disbursements: parseNumber(otherDisbursements),
      grand_total: effectiveGrandTotal,
      comments: comments.trim(),
      status: status,
      source_sheet: 'Manual Entry',
      record_year: new Date().getFullYear(),
      department: 'Banking & Securities',
      assigned_lawyer_name: currentUser?.name || '',
      assigned_lawyer_id: currentUser?.id && !currentUser.id.startsWith('user-') ? currentUser.id : null,
    };

    try {
      // 1. Direct insert to Supabase table mortgage_cases
      let cloudInserted = false;
      const { data, error } = await supabase
        .from('mortgage_cases')
        .insert([payload])
        .select('*');

      if (!error && data && data.length > 0) {
        cloudInserted = true;
      } else if (error) {
        console.warn('Direct mortgage_cases insert note:', error.message);
      }

      // 2. Also register into unified mortgageService to ensure multi-workstation sync & local fallback
      await MortgageService.insertMortgage({
        ...payload,
        client_bank_name: payload.bank_name,
        borrower_name: payload.client_name,
        mortgagor_name: payload.client_name,
        bank_branch: payload.branch,
        branch_name: payload.branch,
        file_number: payload.rim_no || `MORT-${Date.now().toString().slice(-6)}`,
      });

      setSuccessMessage('Mortgage record saved successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 700);

    } catch (err: any) {
      console.error('Submit error:', err);
      setErrorMessage(err?.message || 'Failed to save mortgage record to database. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                New Mortgage Case Registration
              </h2>
              <p className="text-xs text-slate-300">
                Register a new file into the <code className="text-cyan-300 font-mono">mortgage_cases</code> database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts / Feedback */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          
          {/* Section 1: Bank & Client Identity */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Lending Partner &amp; Borrower Particulars</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* bank_name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bank Name <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {BANK_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* branch */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bank Branch
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mbarara Main Branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* rim_no */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  RIM / Customer No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. RIM-902482"
                  value={rimNo}
                  onChange={(e) => setRimNo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* client_name (Required) */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Client / Mortgagor Name <span className="text-rose-500">* (Required)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Full legal name of the borrower / mortgagor"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* status */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Case Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* property_description */}
              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">
                  Property Description &amp; Title Particulars
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Kyadondo Block 214 Plot 892, Land situated at Kyanja, Kampala..."
                  value={propertyDescription}
                  onChange={(e) => setPropertyDescription(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Financials & Disbursements */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                <span>2. Facility Valuation &amp; Financial Ledger</span>
              </div>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={autoCalculateTotal}
                  onChange={(e) => setAutoCalculateTotal(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Auto-calculate Grand Total</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* loan_amount */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Loan Facility Amount (UGX)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-mono text-[11px]">UGX</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-11 pr-3 py-2 font-mono text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* bank_charges */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bank Charges (UGX)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={bankCharges}
                  onChange={(e) => setBankCharges(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* transport */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Transport (UGX)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* linkage_fees */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Linkage Fees (UGX)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={linkageFees}
                  onChange={(e) => setLinkageFees(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* other_disbursements */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Other Disbursements (UGX)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={otherDisbursements}
                  onChange={(e) => setOtherDisbursements(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* grand_total */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Grand Total (UGX)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={autoCalculateTotal}
                  value={autoCalculateTotal ? calculatedGrandTotal : grandTotalManual}
                  onChange={(e) => setGrandTotalManual(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none ${
                    autoCalculateTotal
                      ? 'bg-slate-100 border-slate-300 text-blue-700 cursor-not-allowed'
                      : 'bg-white border-blue-400 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>

            {/* Quick summary strip */}
            <div className="bg-slate-900 text-white rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300">Total Disbursements &amp; Expenses:</span>
              </div>
              <div className="font-mono text-sm font-bold text-cyan-300">
                UGX {effectiveGrandTotal.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Section 3: Comments */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-700">
              Operational Comments &amp; Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Valuation report approved; title submitted for registration search"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {loading && <span className="animate-spin text-sm">⏳</span>}
              <span>{loading ? 'Saving Record...' : 'Save to mortgage_cases'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMortgageModal;
