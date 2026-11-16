import React, { useState, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { MortgageService, MORTGAGE_RLS_FIX_SQL } from '../../services/mortgageService';
import { useApp } from '../../context/AppContext';
import { getEffectiveUser, isUserAdmin, canUserModifyMortgage, resolveBranchMeta } from '../../lib/supabase';
import { showCleanMessage } from '../../utils/notification';
import { isCentenaryBank } from './banks/bankConfigs';

export interface MortgageCaseFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
  defaultBank?: string;
}

const DEFAULT_FIRM_BRANCHES = [
  { id: 'kla-hq', name: 'Kampala Central (Head Office)' },
  { id: 'ftp-reg', name: 'Fort Portal Regional Office' },
  { id: 'mbr-reg', name: 'Mbarara Regional Office' },
  { id: 'msk-reg', name: 'Masaka Regional Office' },
  { id: 'jnj-reg', name: 'Jinja Regional Office' },
  { id: 'glu-reg', name: 'Gulu Regional Office' },
  { id: 'msn-reg', name: 'Masindi Regional Office' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MortgageCaseForm({ onSuccess, onClose, defaultBank = 'Centenary Bank' }: MortgageCaseFormProps) {
  const { currentUser } = useApp();
  const effectiveUser = useMemo(() => getEffectiveUser(currentUser), [currentUser]);
  const isGlobalAdmin = isUserAdmin(effectiveUser);
  const isCentenary = isCentenaryBank(defaultBank);
  const assignedBranchMeta = useMemo(
    () =>
      resolveBranchMeta(
        effectiveUser?.branchId || currentUser?.branchId,
        effectiveUser?.branchName || currentUser?.branchName
      ),
    [effectiveUser?.branchId, effectiveUser?.branchName, currentUser?.branchId, currentUser?.branchName]
  );
  const assignedBranchLabel = effectiveUser?.branchName || currentUser?.branchName || assignedBranchMeta.name;
  const firmBranchOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    DEFAULT_FIRM_BRANCHES.forEach((b) => map.set(b.name.toLowerCase(), b));
    if (assignedBranchLabel && !map.has(assignedBranchLabel.toLowerCase())) {
      map.set(assignedBranchLabel.toLowerCase(), {
        id: assignedBranchMeta.id,
        name: assignedBranchLabel,
      });
    }
    return Array.from(map.values());
  }, [assignedBranchLabel, assignedBranchMeta.id]);

  const [formData, setFormData] = useState({
    record_year: new Date().getFullYear(), // Defaults to current year (e.g. 2026)
    month_sheet: MONTHS[new Date().getMonth()], // Defaults to current month
    date_of_receipt: '',
    bank_branch_station: '',
    firm_branch_station: assignedBranchLabel,
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

    const effectiveFirmName = isCentenary
      ? ''
      : isGlobalAdmin
      ? String(formData.firm_branch_station || '').trim() || assignedBranchLabel
      : assignedBranchLabel;
    const effectiveFirmMeta = isCentenary
      ? { id: '', name: '' }
      : resolveBranchMeta(!isGlobalAdmin ? assignedBranchMeta.id : undefined, effectiveFirmName);

    if (
      !isCentenary &&
      !isGlobalAdmin &&
      !canUserModifyMortgage(effectiveUser, {
        branch_id: effectiveFirmMeta.id,
        firm_branch_station: effectiveFirmName,
        branch_name: effectiveFirmName,
      })
    ) {
      const msg = `Permission Denied: You can only add mortgages for your assigned MK firm branch (${assignedBranchLabel}).`;
      setFeedback({ type: 'error', text: msg });
      showCleanMessage(msg, 'warning');
      return;
    }

    setLoading(true);
    const trimmedBankBranch = String(formData.bank_branch_station || '').trim();

    const payload = {
      record_year: formData.record_year ? parseInt(String(formData.record_year), 10) : new Date().getFullYear(),
      month_sheet: formData.month_sheet || MONTHS[new Date().getMonth()],
      bank_name: defaultBank,
      client_bank_name: defaultBank,
      date_of_receipt: formData.date_of_receipt || null,
      bank_branch_station: trimmedBankBranch,
      bank_branch: trimmedBankBranch,
      client_branch_location: trimmedBankBranch,
      branch: trimmedBankBranch,
      firm_branch_station: effectiveFirmName,
      branch_name: effectiveFirmName,
      branch_id: effectiveFirmMeta.id,
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
          bank_branch_station: '',
          firm_branch_station: assignedBranchLabel,
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
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-800 mt-2 font-sans relative">
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close"
        >
          ✕
        </button>
      )}

      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">MK Firm - Mortgage Case Entry Form</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">VAT (18%) automatically feeds from Legal Fees.</p>
      </div>

      {feedback && (
        <div
          className={`p-4 mb-6 rounded-xl text-sm font-medium space-y-2 ${
            feedback.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
          }`}
        >
          <div>{feedback.text}</div>
          {feedback.cloudError && (
            <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800/60 space-y-2">
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
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shrink-0"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
          <div>
            <label className="block text-xs font-bold text-blue-900 dark:text-blue-200 mb-1">Record Year</label>
            <input 
              type="number" 
              name="record_year" 
              value={formData.record_year} 
              onChange={handleChange} 
              className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-900 dark:text-blue-200 mb-1">Month Sheet</label>
            <select 
              name="month_sheet" 
              value={formData.month_sheet} 
              onChange={handleChange} 
              className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              required
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${isCentenary ? 'md:grid-cols-4' : 'md:grid-cols-5'} gap-4`}>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date of Receipt</label>
            <input type="date" name="date_of_receipt" value={formData.date_of_receipt} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 rounded-lg text-sm tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bank Branch Station</label>
            <input
              type="text"
              name="bank_branch_station"
              placeholder="e.g. Centenary Bank Kamwenge Branch"
              value={formData.bank_branch_station}
              onChange={handleChange}
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          {!isCentenary && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Firm Branch Station (MK Office)</label>
              {isGlobalAdmin ? (
                <select
                  name="firm_branch_station"
                  value={formData.firm_branch_station}
                  onChange={handleChange}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {firmBranchOptions.map((b) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="firm_branch_station"
                  value={assignedBranchLabel}
                  disabled
                  readOnly
                  className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded-lg text-sm bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                />
              )}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Client Name (Name)</label>
            <input type="text" name="name" placeholder="Full legal name" value={formData.name} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">RIM NO.</label>
            <input type="text" name="rim_no" placeholder="RIM Number" value={formData.rim_no} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 rounded-lg text-sm tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Property Description (Description)</label>
          <textarea name="description" rows={2} placeholder="Plot, Block, Location details..." value={formData.description} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fees & Financial Breakdown</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Loan Amount</label>
              <input type="number" step="any" name="loan_amount" value={formData.loan_amount} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Total Disbursements</label>
              <input type="number" step="any" name="total_disbursements" value={formData.total_disbursements} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Grand Total</label>
              <input type="number" step="any" name="grand_total" value={formData.grand_total} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded-lg text-sm bg-white dark:bg-slate-800 font-bold text-blue-600 dark:text-blue-400 tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Stamp Duty</label>
              <input type="number" step="any" name="stamp_duty" value={formData.stamp_duty} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 p-1.5 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Extra Copies</label>
              <input type="number" step="any" name="extra_copies" value={formData.extra_copies} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 p-1.5 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Registration</label>
              <input type="number" step="any" name="registration" value={formData.registration} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 p-1.5 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Other</label>
              <input type="number" step="any" name="other" value={formData.other} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 p-1.5 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Bank Charges</label>
              <input type="number" step="any" name="bank_charges" value={formData.bank_charges} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 p-1.5 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Transport</label>
              <input type="number" step="any" name="transport" value={formData.transport} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 p-1.5 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Legal Fees</label>
              <input type="number" step="any" name="legal_fees" value={formData.legal_fees} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">VAT 18% (Auto-calculated)</label>
              <input type="number" step="any" name="vat_18" value={formData.vat_18} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded-lg text-sm bg-slate-100 dark:bg-slate-800/80 font-semibold text-slate-700 dark:text-slate-300 tabular-nums" readOnly />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date of Payment</label>
            <input type="date" name="date_of_payment" value={formData.date_of_payment} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 rounded-lg text-sm tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date of Return</label>
            <input type="date" name="date_of_return" value={formData.date_of_return} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 rounded-lg text-sm tabular-nums focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Comments</label>
            <input type="text" name="comments" placeholder="Notes..." value={formData.comments} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-1/3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
          >
            {loading ? 'Saving Record...' : 'Save Mortgage Case'}
          </button>
        </div>
      </form>
    </div>
  );
}