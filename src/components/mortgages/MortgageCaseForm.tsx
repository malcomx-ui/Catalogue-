import React, { useState, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { MortgageService, MORTGAGE_RLS_FIX_SQL } from '../../services/mortgageService';
import { useApp } from '../../context/AppContext';
import { getEffectiveUser, isUserAdmin, canUserModifyMortgage } from '../../lib/supabase';
import { showCleanMessage } from '../../utils/notification';

export interface MortgageCaseFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
  defaultBank?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MortgageCaseForm({ onSuccess, onClose, defaultBank = 'Centenary Bank' }: MortgageCaseFormProps) {
  const { currentUser } = useApp();
  const effectiveUser = useMemo(() => getEffectiveUser(currentUser), [currentUser]);
  const isGlobalAdmin = isUserAdmin(effectiveUser);
  const assignedBranchLabel = effectiveUser?.branchName || currentUser?.branchName || 'Kampala Central (Head Office)';

  const [formData, setFormData] = useState({
    record_year: new Date().getFullYear(), // Defaults to current year (e.g. 2026)
    month_sheet: MONTHS[new Date().getMonth()], // Defaults to current month
    date_of_receipt: '',
    branch: isGlobalAdmin ? '' : assignedBranchLabel,
    name: '',
    rim_no: '',
    description: '',
    loan_amount: '',
    stamp_duty: '',
    extra_copies: '',
    registration: '',
    other: '',
    bank_charges: '',
    transport: '',
    total_disbursements: '',
    legal_fees: '',
    vat_18: '',
    grand_total: '',
    date_of_payment: '',
    date_of_return: '',
    comments: ''
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
    cloudError?: string;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If legal_fees changes, automatically calculate VAT (18% of legal fees)
    if (name === 'legal_fees') {
      const legalVal = parseFloat(value) || 0;
      const calculatedVat = legalVal > 0 ? (legalVal * 0.18).toFixed(2) : '';
      
      setFormData((prev) => ({
        ...prev,
        legal_fees: value,
        vat_18: calculatedVat
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const resolvedBranch = isGlobalAdmin ? formData.branch || null : assignedBranchLabel;
    if (!isGlobalAdmin && !canUserModifyMortgage(effectiveUser, { branch: resolvedBranch })) {
      const msg = `Permission Denied: You can only add mortgages for your assigned branch (${assignedBranchLabel}).`;
      setFeedback({ type: 'error', text: msg });
      showCleanMessage(msg, 'warning');
      return;
    }

    setLoading(true);

    const payload = {
      record_year: formData.record_year ? parseInt(String(formData.record_year), 10) : new Date().getFullYear(),
      month_sheet: formData.month_sheet || MONTHS[new Date().getMonth()],
      bank_name: defaultBank,
      client_bank_name: defaultBank,
      date_of_receipt: formData.date_of_receipt || null,
      branch: resolvedBranch,
      client_name: formData.name,
      mortgagor_name: formData.name,
      rim_no: formData.rim_no || null,
      property_description: formData.description || null,
      loan_amount: formData.loan_amount ? parseFloat(formData.loan_amount) : 0,
      stamp_duty: formData.stamp_duty ? parseFloat(formData.stamp_duty) : 0,
      extra_copies: formData.extra_copies ? parseFloat(formData.extra_copies) : 0,
      registration_fee: formData.registration ? parseFloat(formData.registration) : 0,
      other_fees: formData.other ? parseFloat(formData.other) : 0,
      other_disbursements: formData.other ? parseFloat(formData.other) : 0,
      bank_charges: formData.bank_charges ? parseFloat(formData.bank_charges) : 0,
      transport: formData.transport ? parseFloat(formData.transport) : 0,
      total_disbursements: formData.total_disbursements ? parseFloat(formData.total_disbursements) : 0,
      legal_fees: formData.legal_fees ? parseFloat(formData.legal_fees) : 0,
      vat_18: formData.vat_18 ? parseFloat(formData.vat_18) : 0,
      grand_total: formData.grand_total ? parseFloat(formData.grand_total) : 0,
      date_of_payment: formData.date_of_payment || null,
      date_of_return: formData.date_of_return || null,
      comments: formData.comments || '',
      source_sheet: 'Tracker Entry',
    };

    try {
      const res = await MortgageService.insertMortgage(payload, effectiveUser);

      if (!res.success) {
        setFeedback({ type: 'error', text: 'Error saving record: ' + (res.error || 'Unknown error') });
      } else {
        setFeedback({
          type: 'success',
          text: res.cloudSaved
            ? '✅ Mortgage case saved successfully!'
            : '✅ Mortgage case saved to workstation register (Supabase cloud RLS policy needs update for cloud sync).',
          cloudError: res.cloudError,
        });

        setFormData((prev) => ({
          ...prev,
          date_of_receipt: '',
          branch: isGlobalAdmin ? '' : assignedBranchLabel,
          name: '',
          rim_no: '',
          description: '',
          loan_amount: '',
          stamp_duty: '',
          extra_copies: '',
          registration: '',
          other: '',
          bank_charges: '',
          transport: '',
          total_disbursements: '',
          legal_fees: '',
          vat_18: '',
          grand_total: '',
          date_of_payment: '',
          date_of_return: '',
          comments: ''
        }));

        if (onSuccess) {
          setTimeout(onSuccess, 500);
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Exception saving record: ' + (err?.message || 'Unknown error') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100 mt-2 font-sans relative">
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition"
          aria-label="Close"
        >
          ✕
        </button>
      )}

      <div className="border-b pb-4 mb-6">
        <h2 className="text-xl font-bold text-gray-800">MK Firm - Mortgage Case Entry Form</h2>
        <p className="text-sm text-gray-500">VAT (18%) automatically feeds from Legal Fees.</p>
      </div>

      {feedback && (
        <div
          className={`p-4 mb-6 rounded-lg text-sm font-medium space-y-2 ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          <div>{feedback.text}</div>
          {feedback.cloudError && (
            <div className="pt-2 border-t border-green-200 text-xs text-amber-900 bg-amber-50 p-3 rounded border border-amber-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span>Supabase notice: {feedback.cloudError}</span>
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
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold shrink-0"
                >
                  {copiedSql ? 'Copied SQL!' : 'Copy RLS Fix SQL'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Reporting Period: Year & Month Sheet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
          <div>
            <label className="block text-xs font-bold text-blue-900 mb-1">Record Year</label>
            <input 
              type="number" 
              name="record_year" 
              value={formData.record_year} 
              onChange={handleChange} 
              className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-900 mb-1">Month Sheet</label>
            <select 
              name="month_sheet" 
              value={formData.month_sheet} 
              onChange={handleChange} 
              className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              required
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Receipt</label>
            <input type="date" name="date_of_receipt" value={formData.date_of_receipt} onChange={handleChange} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Branch</label>
            <input
              type="text"
              name="branch"
              placeholder="e.g. RUBAGA"
              value={isGlobalAdmin ? formData.branch : assignedBranchLabel}
              onChange={(e) => {
                if (isGlobalAdmin) handleChange(e);
              }}
              disabled={!isGlobalAdmin}
              className={`w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                !isGlobalAdmin ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Client Name (Name)</label>
            <input type="text" name="name" placeholder="Full legal name" value={formData.name} onChange={handleChange} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">RIM NO.</label>
            <input type="text" name="rim_no" placeholder="RIM Number" value={formData.rim_no} onChange={handleChange} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Property Description (Description)</label>
          <textarea name="description" rows={2} placeholder="Plot, Block, Location details..." value={formData.description} onChange={handleChange} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Fees & Financial Breakdown</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Loan Amount</label>
              <input type="number" step="any" name="loan_amount" value={formData.loan_amount} onChange={handleChange} className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Total Disbursements</label>
              <input type="number" step="any" name="total_disbursements" value={formData.total_disbursements} onChange={handleChange} className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Grand Total</label>
              <input type="number" step="any" name="grand_total" value={formData.grand_total} onChange={handleChange} className="w-full border p-2 rounded-lg text-sm bg-white font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Stamp Duty</label>
              <input type="number" step="any" name="stamp_duty" value={formData.stamp_duty} onChange={handleChange} className="w-full border p-1.5 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Extra Copies</label>
              <input type="number" step="any" name="extra_copies" value={formData.extra_copies} onChange={handleChange} className="w-full border p-1.5 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Registration</label>
              <input type="number" step="any" name="registration" value={formData.registration} onChange={handleChange} className="w-full border p-1.5 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Other</label>
              <input type="number" step="any" name="other" value={formData.other} onChange={handleChange} className="w-full border p-1.5 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Bank Charges</label>
              <input type="number" step="any" name="bank_charges" value={formData.bank_charges} onChange={handleChange} className="w-full border p-1.5 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Transport</label>
              <input type="number" step="any" name="transport" value={formData.transport} onChange={handleChange} className="w-full border p-1.5 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Legal Fees</label>
              <input type="number" step="any" name="legal_fees" value={formData.legal_fees} onChange={handleChange} className="w-full border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">VAT 18% (Auto-calculated)</label>
              <input type="number" step="any" name="vat_18" value={formData.vat_18} onChange={handleChange} className="w-full border p-2 rounded-lg text-sm bg-gray-100 font-semibold text-gray-700" readOnly />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Payment</label>
            <input type="date" name="date_of_payment" value={formData.date_of_payment} onChange={handleChange} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Return</label>
            <input type="date" name="date_of_return" value={formData.date_of_return} onChange={handleChange} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Comments</label>
            <input type="text" name="comments" placeholder="Notes..." value={formData.comments} onChange={handleChange} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-1/3 bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50`}
          >
            {loading ? 'Saving Record...' : 'Save Mortgage Case'}
          </button>
        </div>
      </form>
    </div>
  );
}