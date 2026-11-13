import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { MortgageService } from '../../services/mortgageService';

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
  const [formData, setFormData] = useState({
    record_year: new Date().getFullYear(), // Defaults to current year (e.g. 2026)
    month_sheet: MONTHS[new Date().getMonth()], // Defaults to current month
    date_of_receipt: '',
    branch: '',
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
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

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
    setLoading(true);
    setFeedback(null);

    const payload = {
      record_year: formData.record_year ? parseInt(String(formData.record_year), 10) : new Date().getFullYear(),
      month_sheet: formData.month_sheet || MONTHS[new Date().getMonth()],
      bank_name: defaultBank,
      date_of_receipt: formData.date_of_receipt || null,
      branch: formData.branch || null,
      client_name: formData.name,
      name: formData.name,
      rim_no: formData.rim_no || null,
      property_description: formData.description || null,
      description: formData.description || null,
      loan_amount: formData.loan_amount ? parseFloat(formData.loan_amount) : null,
      stamp_duty: formData.stamp_duty ? parseFloat(formData.stamp_duty) : 0,
      extra_copies: formData.extra_copies ? parseFloat(formData.extra_copies) : 0,
      registration: formData.registration ? parseFloat(formData.registration) : 0,
      other: formData.other ? parseFloat(formData.other) : 0,
      bank_charges: formData.bank_charges ? parseFloat(formData.bank_charges) : 0,
      transport: formData.transport ? parseFloat(formData.transport) : 0,
      total_disbursements: formData.total_disbursements ? parseFloat(formData.total_disbursements) : 0,
      legal_fees: formData.legal_fees ? parseFloat(formData.legal_fees) : 0,
      vat_18: formData.vat_18 ? parseFloat(formData.vat_18) : 0,
      grand_total: formData.grand_total ? parseFloat(formData.grand_total) : null,
      date_of_payment: formData.date_of_payment || null,
      date_of_return: formData.date_of_return || null,
      comments: formData.comments || null
    };

    try {
      const { error } = await supabase
        .from('mortgage_cases')
        .insert([payload]);

      if (error) {
        setFeedback({ type: 'error', text: 'Error saving record: ' + error.message });
      } else {
        setFeedback({ type: 'success', text: '✅ Mortgage case saved successfully!' });
        
        // Also sync with central workstation database
        await MortgageService.insertMortgage({
          ...payload,
          client_bank_name: defaultBank,
          borrower_name: payload.client_name,
          mortgagor_name: payload.client_name,
          bank_branch: payload.branch,
          file_number: payload.rim_no || `MORT-${Date.now().toString().slice(-6)}`,
        }).catch(() => {});

        setFormData((prev) => ({
          ...prev,
          date_of_receipt: '',
          branch: '',
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
          setTimeout(onSuccess, 800);
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
        <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${feedback.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {feedback.text}
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
            <input type="text" name="branch" placeholder="e.g. RUBAGA" value={formData.branch} onChange={handleChange} className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
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