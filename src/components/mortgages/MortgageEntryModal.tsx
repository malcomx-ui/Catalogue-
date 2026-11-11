import React, { useState, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';

export interface MortgageEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankName: string;
  currentUser?: any;
  onSuccess?: () => void;
}

export const MortgageEntryModal: React.FC<MortgageEntryModalProps> = ({
  isOpen,
  onClose,
  bankName,
  currentUser,
  onSuccess,
}) => {
  const [borrowerName, setBorrowerName] = useState('');
  const [fileNumber, setFileNumber] = useState('');
  const [loanAmount, setLoanAmount] = useState<number | ''>('');
  const [titleDeedNo, setTitleDeedNo] = useState('');
  const [propertyLocation, setPropertyLocation] = useState('');
  const [status, setStatus] = useState('Under Preparation');
  const [recordYear, setRecordYear] = useState<number>(2026);
  const [dateInstructed, setDateInstructed] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Legal Fee
  const [legalFees, setLegalFees] = useState<number | ''>('');

  // Itemized Disbursements
  const [searchFee, setSearchFee] = useState<number | ''>('');
  const [stampDuty, setStampDuty] = useState<number | ''>('');
  const [registrationFee, setRegistrationFee] = useState<number | ''>('');
  const [filingFee, setFilingFee] = useState<number | ''>('');
  const [valuationFee, setValuationFee] = useState<number | ''>('');
  const [courierFee, setCourierFee] = useState<number | ''>('');
  const [otherDisbursements, setOtherDisbursements] = useState<number | ''>('');

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. AUTO-CALCULATION: Total Disbursements = sum of all disbursement fields
  const totalDisbursements = useMemo(() => {
    return (
      (Number(searchFee) || 0) +
      (Number(stampDuty) || 0) +
      (Number(registrationFee) || 0) +
      (Number(filingFee) || 0) +
      (Number(valuationFee) || 0) +
      (Number(courierFee) || 0) +
      (Number(otherDisbursements) || 0)
    );
  }, [searchFee, stampDuty, registrationFee, filingFee, valuationFee, courierFee, otherDisbursements]);

  // 2. AUTO-CALCULATION: VAT = 18% of legal fees
  const vat = useMemo(() => {
    const fees = Number(legalFees) || 0;
    return Math.round(fees * 0.18);
  }, [legalFees]);

  // 3. AUTO-CALCULATION: Grand Total = Total Disbursements + Legal Fees + VAT
  const grandTotal = useMemo(() => {
    const fees = Number(legalFees) || 0;
    return totalDisbursements + fees + vat;
  }, [totalDisbursements, legalFees, vat]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const generatedFileNo = fileNumber.trim() || `MORT-${Date.now().toString().slice(-6)}`;

    const payload = {
      client_bank_name: bankName,
      record_year: recordYear,
      file_number: generatedFileNo,
      borrower_name: borrowerName.trim(),
      loan_amount: Number(loanAmount) || 0,
      title_deed_no: titleDeedNo.trim(),
      property_location: propertyLocation.trim(),
      branch_id: currentUser?.branchId || null,
      branch_name: currentUser?.branchName || 'Kampala Head Office',
      status: status,
      date_instructed: dateInstructed,
      legal_fees: Number(legalFees) || 0,
      search_fee: Number(searchFee) || 0,
      stamp_duty: Number(stampDuty) || 0,
      registration_fee: Number(registrationFee) || 0,
      filing_fee: Number(filingFee) || 0,
      valuation_fee: Number(valuationFee) || 0,
      courier_fee: Number(courierFee) || 0,
      other_disbursements: Number(otherDisbursements) || 0,
      total_disbursements: totalDisbursements,
      vat: vat,
      grand_total: grandTotal,
      notes: notes.trim(),
    };

    try {
      const { error: insertError } = await supabase
        .from('mortgages')
        .insert([payload]);

      if (insertError) {
        throw insertError;
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to create mortgage entry:', err);
      setError(err?.message || 'Failed to save mortgage entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {bankName}
              </span>
              <span className="text-xs text-gray-400">Securities &amp; Mortgage Register</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">Record Mortgage / Facility Instruction</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* Section 1: Facility Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-1">1. Borrower &amp; Facility Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Borrower / Mortgagor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mukasa David &amp; Sons Ltd"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">File / Reference No.</label>
                <input
                  type="text"
                  placeholder="Auto-generated if blank (e.g. MORT-0024)"
                  value={fileNumber}
                  onChange={(e) => setFileNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Loan Facility Amount (UGX) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="e.g. 250000000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Financial Year</label>
                <select
                  value={recordYear}
                  onChange={(e) => setRecordYear(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2 bg-white focus:outline-none"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Title Deed / Collateral Particulars *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FRV 214 Folio 12 Kyadondo Block 244 Plot 89"
                  value={titleDeedNo}
                  onChange={(e) => setTitleDeedNo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Property Location / District</label>
                <input
                  type="text"
                  placeholder="e.g. Wakiso District, Kira Municipality"
                  value={propertyLocation}
                  onChange={(e) => setPropertyLocation(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Registration Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 bg-white focus:outline-none"
                >
                  <option value="Under Preparation">Under Preparation</option>
                  <option value="Registered">Registered (Custody Safe)</option>
                  <option value="Pending Release">Pending Release</option>
                  <option value="Released / Discharged">Released / Discharged</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Date of Instructions</label>
                <input
                  type="date"
                  value={dateInstructed}
                  onChange={(e) => setDateInstructed(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Professional Fees & Itemized Disbursements */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-1">
              2. Professional Fees &amp; Itemized Disbursements (UGX)
            </h3>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <label className="block font-semibold text-blue-900 mb-1 text-xs">
                Professional Legal Fees (Base for VAT) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Enter base legal fees in UGX..."
                value={legalFees}
                onChange={(e) => setLegalFees(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border border-blue-300 rounded-lg p-2 font-mono bg-white text-blue-950 font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-blue-700 mt-1 block">
                18% VAT will be calculated automatically on this amount.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Search Fee</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={searchFee}
                  onChange={(e) => setSearchFee(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Stamp Duty</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={stampDuty}
                  onChange={(e) => setStampDuty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Registration Fee</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={registrationFee}
                  onChange={(e) => setRegistrationFee(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Filing Fee</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={filingFee}
                  onChange={(e) => setFilingFee(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Valuation / Inspection</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={valuationFee}
                  onChange={(e) => setValuationFee(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Courier / Logistics</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={courierFee}
                  onChange={(e) => setCourierFee(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-medium text-gray-700 mb-1">Other Sundry Disbursements</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={otherDisbursements}
                  onChange={(e) => setOtherDisbursements(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Live Auto-Calculation Breakdown Card */}
          <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Fee &amp; Disbursement Calculation Breakdown
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-mono">
                Live Auto-Calculated
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                <span className="text-[11px] text-slate-400 block mb-1">Total Disbursements</span>
                <span className="font-mono font-bold text-sm text-amber-400">
                  UGX {totalDisbursements.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Sum of all disbursements</span>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                <span className="text-[11px] text-slate-400 block mb-1">Legal Fees (Base)</span>
                <span className="font-mono font-bold text-sm text-blue-400">
                  UGX {(Number(legalFees) || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Agreed instruction fees</span>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                <span className="text-[11px] text-slate-400 block mb-1">VAT (18%)</span>
                <span className="font-mono font-bold text-sm text-cyan-400">
                  UGX {vat.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">18% of Legal Fees</span>
              </div>

              <div className="p-3 bg-gradient-to-br from-blue-900 to-indigo-900 rounded-lg border border-blue-600/50 shadow-inner">
                <span className="text-[11px] text-blue-200 block mb-1 font-semibold">Grand Total</span>
                <span className="font-mono font-bold text-base text-white">
                  UGX {grandTotal.toLocaleString()}
                </span>
                <span className="text-[10px] text-blue-300 block mt-0.5">Disbursements + Fees + VAT</span>
              </div>
            </div>
          </div>

          {/* Section 4: Notes */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">Mortgage Register Notes / Remarks</label>
            <textarea
              rows={2}
              placeholder="e.g. Original duplicate certificate in custody safe; awaits tax clearance certificate..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {loading ? 'Saving Mortgage...' : 'Save Mortgage Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MortgageEntryModal;
