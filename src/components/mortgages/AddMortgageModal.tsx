import React, { useState, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { MortgageService } from '../../services/mortgageService';
import {
  Building2,
  X,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Calendar,
  Calculator,
  FileText,
  Receipt,
  RotateCcw,
} from 'lucide-react';

export interface AddMortgageModalProps {
  bankName?: string;
  defaultMonth?: string;
  currentUser?: any;
  onClose: () => void;
  onSuccess: (savedRecord?: any) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const AddMortgageModal: React.FC<AddMortgageModalProps> = ({
  bankName = 'Centenary Bank',
  defaultMonth,
  currentUser,
  onClose,
  onSuccess,
}) => {
  // Reporting Period (defaults to selected month if provided, else current year and current month)
  const [recordYear, setRecordYear] = useState<number>(() => new Date().getFullYear());
  const [monthSheet, setMonthSheet] = useState<string>(() =>
    defaultMonth && MONTHS.includes(defaultMonth) ? defaultMonth : MONTHS[new Date().getMonth()]
  );

  // 1. Exactly 19 Columns from the tracker sheet and live Supabase table `mortgage_cases`:
  // 1) date_of_receipt (Date)
  const [dateOfReceipt, setDateOfReceipt] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  // 2) branch (Text)
  const [branch, setBranch] = useState<string>('');
  // 3) client_name / name (Text, Required)
  const [clientName, setClientName] = useState<string>('');
  // 4) rim_no (Text)
  const [rimNo, setRimNo] = useState<string>('');
  // 5) property_description / description (Textarea)
  const [propertyDescription, setPropertyDescription] = useState<string>('');

  // 6) loan_amount (Number)
  const [loanAmount, setLoanAmount] = useState<string>('');
  // 7) stamp_duty (Number)
  const [stampDuty, setStampDuty] = useState<string>('');
  // 8) extra_copies (Number)
  const [extraCopies, setExtraCopies] = useState<string>('');
  // 9) registration (Number)
  const [registration, setRegistration] = useState<string>('');
  // 10) other (Number)
  const [other, setOther] = useState<string>('');
  // 11) bank_charges (Number)
  const [bankCharges, setBankCharges] = useState<string>('');
  // 12) transport (Number)
  const [transport, setTransport] = useState<string>('');

  // 13) total_disbursements (Number) - auto-sum or manual
  const [manualDisbursements, setManualDisbursements] = useState<string>('');
  const [autoCalcDisbursements, setAutoCalcDisbursements] = useState<boolean>(true);

  // 14) legal_fees (Number)
  const [legalFees, setLegalFees] = useState<string>('');
  // 15) vat_18 (Number) - 18% of legal_fees or manual
  const [manualVat, setManualVat] = useState<string>('');
  const [autoCalcVat, setAutoCalcVat] = useState<boolean>(true);

  // 16) grand_total (Number)
  const [manualGrandTotal, setManualGrandTotal] = useState<string>('');
  const [autoCalcGrandTotal, setAutoCalcGrandTotal] = useState<boolean>(true);

  // 17) date_of_payment (Date)
  const [dateOfPayment, setDateOfPayment] = useState<string>('');
  // 18) date_of_return (Date)
  const [dateOfReturn, setDateOfReturn] = useState<string>('');
  // 19) comments (Text)
  const [comments, setComments] = useState<string>('');

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Safe numeric parsing helper
  const cleanFloat = (val: string | number | undefined | null): number => {
    if (val === null || val === undefined || val === '') return 0.0;
    if (typeof val === 'number') return isNaN(val) ? 0.0 : val;
    const cleaned = String(val).replace(/,/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0.0 : parsed;
  };

  // 13. Auto-calculate total_disbursements:
  // total_disbursements = stamp_duty + extra_copies + registration + other + bank_charges + transport
  const calculatedDisbursements = useMemo(() => {
    return (
      cleanFloat(stampDuty) +
      cleanFloat(extraCopies) +
      cleanFloat(registration) +
      cleanFloat(other) +
      cleanFloat(bankCharges) +
      cleanFloat(transport)
    );
  }, [stampDuty, extraCopies, registration, other, bankCharges, transport]);

  const effectiveTotalDisbursements = autoCalcDisbursements
    ? calculatedDisbursements
    : cleanFloat(manualDisbursements);

  // 15. Auto-calculate vat_18: 18% of legal_fees
  const calculatedVat = useMemo(() => {
    const fees = cleanFloat(legalFees);
    return Math.round(fees * 0.18);
  }, [legalFees]);

  const effectiveVat = autoCalcVat ? calculatedVat : cleanFloat(manualVat);

  // 16. Auto-calculate grand_total:
  // grand_total = total_disbursements + legal_fees + vat_18
  const calculatedGrandTotal = useMemo(() => {
    return effectiveTotalDisbursements + cleanFloat(legalFees) + effectiveVat;
  }, [effectiveTotalDisbursements, legalFees, effectiveVat]);

  const effectiveGrandTotal = autoCalcGrandTotal
    ? calculatedGrandTotal
    : cleanFloat(manualGrandTotal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Form Validation: client_name is Required
    if (!clientName.trim()) {
      setErrorMessage('Client Name / Name is required.');
      return;
    }

    setLoading(true);

    // Exact live database column mapping (without non-existent PGRST204 columns):
    const payload = {
      bank_name: bankName,
      client_bank_name: bankName,
      date_of_receipt: dateOfReceipt || new Date().toISOString().slice(0, 10),
      branch: branch.trim(),
      client_name: clientName.trim(),
      mortgagor_name: clientName.trim(),
      rim_no: rimNo.trim(),
      property_description: propertyDescription.trim(),
      loan_amount: cleanFloat(loanAmount),
      stamp_duty: cleanFloat(stampDuty),
      extra_copies: cleanFloat(extraCopies),
      registration_fee: cleanFloat(registration),
      other_fees: cleanFloat(other),
      other_disbursements: cleanFloat(other),
      bank_charges: cleanFloat(bankCharges),
      transport: cleanFloat(transport),
      total_disbursements: effectiveTotalDisbursements,
      legal_fees: cleanFloat(legalFees),
      vat_18: effectiveVat,
      grand_total: effectiveGrandTotal,
      date_of_payment: dateOfPayment || null,
      date_of_return: dateOfReturn || null,
      comments: comments.trim(),
      status: dateOfReturn ? 'Completed / Cleared' : 'Active / Processing',
      source_sheet: 'Tracker Entry',
      record_year: recordYear ? parseInt(String(recordYear), 10) : new Date().getFullYear(),
      month_sheet: monthSheet || MONTHS[new Date().getMonth()],
      department: 'Banking & Securities',
      assigned_lawyer_name: currentUser?.name || '',
      assigned_lawyer_id:
        currentUser?.id && !String(currentUser.id).startsWith('user-') ? currentUser.id : null,
    };

    try {
      const res = await MortgageService.insertMortgage(payload);

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to save mortgage record to database.');
        return;
      }

      setSuccessMessage('Mortgage tracker record saved successfully!');
      onSuccess(res.data || payload);
      setTimeout(() => {
        onClose();
      }, 450);
    } catch (err: any) {
      console.error('Submit error:', err);
      setErrorMessage(err?.message || 'Failed to save mortgage record to database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {bankName}
                </span>
                <span className="text-[11px] text-slate-300">19-Column Tracker Register</span>
              </div>
              <h2 className="text-base font-bold text-white tracking-wide mt-0.5">
                New Mortgage Case Registration
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alerts */}
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

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          
          {/* Reporting Period: Record Year & Month Sheet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/60 p-4 rounded-xl border border-blue-100">
            <div>
              <label className="block font-bold text-blue-900 mb-1">
                Record Year <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="record_year"
                required
                value={recordYear}
                onChange={(e) => setRecordYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-950 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-blue-900 mb-1">
                Month Sheet <span className="text-rose-500">*</span>
              </label>
              <select
                name="month_sheet"
                required
                value={monthSheet}
                onChange={(e) => setMonthSheet(e.target.value)}
                className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-950 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 1: Identification & Core Particulars */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Basic File Particulars &amp; Receipt</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              {/* 1. date_of_receipt */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Date of Receipt <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dateOfReceipt}
                  onChange={(e) => setDateOfReceipt(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 2. branch */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Branch Station
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mbarara Branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 3. client_name / name (Required) */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Client Name / Name <span className="text-rose-500">* (Required)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Borrower / Mortgagor full legal name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 4. rim_no */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  RIM NO.
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1029482"
                  value={rimNo}
                  onChange={(e) => setRimNo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 6. loan_amount */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Loan Amount (UGX)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-400 font-mono text-[10px]">UGX</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-3 py-2 font-mono text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 5. property_description / description */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Property Description / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kyadondo Block 214 Plot 892 situated at Kyanja..."
                  value={propertyDescription}
                  onChange={(e) => setPropertyDescription(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Itemized Disbursements (Columns 7 - 13) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <Receipt className="w-3.5 h-3.5 text-amber-600" />
                <span>2. Statutory Fees &amp; Registry Disbursements</span>
              </div>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={autoCalcDisbursements}
                  onChange={(e) => setAutoCalcDisbursements(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Auto-Sum Disbursements</span>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {/* 7. stamp_duty */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Stamp Duty</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={stampDuty}
                  onChange={(e) => setStampDuty(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 8. extra_copies */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Extra Copies</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={extraCopies}
                  onChange={(e) => setExtraCopies(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 9. registration */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Registration</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 10. other */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Other</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 11. bank_charges */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Charges</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={bankCharges}
                  onChange={(e) => setBankCharges(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 12. transport */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transport</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 13. total_disbursements */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-700">13. Total Disbursements:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={autoCalcDisbursements}
                  value={autoCalcDisbursements ? calculatedDisbursements : manualDisbursements}
                  onChange={(e) => setManualDisbursements(e.target.value)}
                  className={`w-36 text-right border rounded-lg px-3 py-1 font-mono font-bold ${
                    autoCalcDisbursements
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-white border-blue-400 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
                <span className="text-slate-500 font-mono text-[11px]">UGX</span>
              </div>
            </div>
          </div>

          {/* Section 3: Legal Fees, VAT & Grand Total (Columns 14 - 16) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. Legal Fees, VAT 18% &amp; Grand Total</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-600 select-none">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCalcVat}
                    onChange={(e) => setAutoCalcVat(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Auto 18% VAT</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCalcGrandTotal}
                    onChange={(e) => setAutoCalcGrandTotal(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Auto Grand Total</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* 14. legal_fees */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  14. Legal Fees (UGX)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={legalFees}
                  onChange={(e) => setLegalFees(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 15. vat_18 */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  15. VAT 18% (UGX)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={autoCalcVat}
                  value={autoCalcVat ? calculatedVat : manualVat}
                  onChange={(e) => setManualVat(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 font-mono font-medium focus:outline-none ${
                    autoCalcVat
                      ? 'bg-slate-100 border-slate-300 text-slate-700'
                      : 'bg-white border-blue-400 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
              </div>

              {/* 16. grand_total */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  16. Grand Total (UGX)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={autoCalcGrandTotal}
                  value={autoCalcGrandTotal ? calculatedGrandTotal : manualGrandTotal}
                  onChange={(e) => setManualGrandTotal(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 font-mono font-bold text-base focus:outline-none ${
                    autoCalcGrandTotal
                      ? 'bg-gradient-to-r from-blue-900 to-indigo-900 text-white border-blue-700'
                      : 'bg-white border-blue-400 text-blue-900 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Settlement Dates & Comments (Columns 17 - 19) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>4. Payment, Return Dates &amp; Comments</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* 17. date_of_payment */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  17. Date of Payment
                </label>
                <input
                  type="date"
                  value={dateOfPayment}
                  onChange={(e) => setDateOfPayment(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 18. date_of_return */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  18. Date of Return
                </label>
                <input
                  type="date"
                  value={dateOfReturn}
                  onChange={(e) => setDateOfReturn(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 19. comments */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  19. Comments
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cleared and returned to bank registry"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
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
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {loading && <span className="animate-spin text-sm">⏳</span>}
              <span>{loading ? 'Saving Record...' : 'Save Mortgage Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMortgageModal;
