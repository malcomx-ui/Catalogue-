import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { MortgageService } from '../../services/mortgageService';
import {
  getEffectiveUser,
  isUserAdmin,
  canUserModifyMortgage,
  resolveBranchMeta,
} from '../../lib/supabase';
import { showCleanMessage } from '../../utils/notification';

export interface EditMortgageModalProps {
  record: any;
  currentUser?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const DEPARTMENTS = [
  'Banking & Securities',
  'Commercial & Corporate',
  'Litigation & Debt Recovery',
  'Real Estate & Conveyancing',
  'Legal Audit & Compliance',
];

const DEFAULT_BRANCHES = [
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

export const EditMortgageModal: React.FC<EditMortgageModalProps> = ({
  record,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'transfer' | 'fees'>('details');
  const effectiveUser = useMemo(() => getEffectiveUser(currentUser), [currentUser]);
  const isGlobalAdmin = isUserAdmin(effectiveUser);
  const canModifyRecord = useMemo(
    () => canUserModifyMortgage(effectiveUser, record),
    [effectiveUser, record]
  );

  const normalizeMonthValue = (raw?: string) => {
    if (!raw) return MONTHS[new Date().getMonth()];
    const clean = String(raw).trim().toLowerCase();
    const matched = MONTHS.find((m) => m.toLowerCase() === clean || m.toLowerCase().startsWith(clean.slice(0, 3)));
    return matched || MONTHS[new Date().getMonth()];
  };

  // Reporting Period (Year & Month Sheet)
  const [recordYear, setRecordYear] = useState<number>(
    record?.record_year ? Number(record.record_year) : new Date().getFullYear()
  );
  const [monthSheet, setMonthSheet] = useState<string>(() => normalizeMonthValue(record?.month_sheet));

  // Basic particulars
  const [mortgagorName, setMortgagorName] = useState(
    record?.client_name || record?.mortgagor_name || record?.borrower_name || ''
  );
  const [rimNo, setRimNo] = useState(record?.rim_no || record?.file_number || '');
  const [bankBranch, setBankBranch] = useState(
    record?.branch || record?.client_branch_location || record?.bank_branch || record?.branch_name || ''
  );
  const [propertyDescription, setPropertyDescription] = useState(
    record?.property_description || record?.description || record?.title_deed_no || ''
  );
  const [loanAmount, setLoanAmount] = useState<number | ''>(record?.loan_amount ?? '');
  const [status, setStatus] = useState<string>(record?.status || 'Active / Processing');

  // Dates
  const [dateOfReceipt, setDateOfReceipt] = useState<string>(
    record?.date_of_receipt ? String(record.date_of_receipt).slice(0, 10) : ''
  );
  const [dateOfPayment, setDateOfPayment] = useState<string>(
    record?.date_of_payment ? String(record.date_of_payment).slice(0, 10) : ''
  );
  const [dateOfReturn, setDateOfReturn] = useState<string>(
    record?.date_of_return ? String(record.date_of_return).slice(0, 10) : ''
  );
  const [dateInstructed, setDateInstructed] = useState<string>(record?.date_instructed || '');
  const [dateSentRegistration, setDateSentRegistration] = useState<string>(record?.date_sent_registration || '');
  const [dateRegistered, setDateRegistered] = useState<string>(record?.date_registered || '');

  // Transfer & Assignment
  const [branchName, setBranchName] = useState<string>(() =>
    resolveBranchMeta(
      record?.branch_id || record?.branchId,
      record?.branch_name || record?.branch || record?.client_branch_location || record?.bank_branch
    ).name
  );
  const [department, setDepartment] = useState<string>(record?.department || 'Banking & Securities');
  const [assignedLawyerId, setAssignedLawyerId] = useState<string>(record?.assigned_lawyer_id || '');
  const [assignedLawyerName, setAssignedLawyerName] = useState<string>(record?.assigned_lawyer_name || '');
  const [transferReason, setTransferReason] = useState<string>(record?.transfer_reason || '');

  // Lawyers list loaded from database
  const [lawyersList, setLawyersList] = useState<any[]>([]);

  // Fees & Disbursements
  const [legalFees, setLegalFees] = useState<number | ''>(record?.legal_fees ?? '');
  const [searchFee, setSearchFee] = useState<number | ''>(record?.search_fee ?? '');
  const [stampDuty, setStampDuty] = useState<number | ''>(record?.stamp_duty ?? '');
  const [extraCopies, setExtraCopies] = useState<number | ''>(record?.extra_copies ?? '');
  const [registrationFee, setRegistrationFee] = useState<number | ''>(
    record?.registration_fee ?? record?.registration ?? ''
  );
  const [bankCharges, setBankCharges] = useState<number | ''>(record?.bank_charges ?? '');
  const [transport, setTransport] = useState<number | ''>(record?.transport ?? '');
  const [linkageFees, setLinkageFees] = useState<number | ''>(record?.linkage_fees ?? '');
  const [filingFee, setFilingFee] = useState<number | ''>(record?.filing_fee ?? '');
  const [valuationFee, setValuationFee] = useState<number | ''>(record?.valuation_fee ?? '');
  const [courierFee, setCourierFee] = useState<number | ''>(record?.courier_fee ?? '');
  const [otherDisbursements, setOtherDisbursements] = useState<number | ''>(
    record?.other_fees ?? record?.other_disbursements ?? record?.other ?? ''
  );

  const [comments, setComments] = useState<string>(record?.comments || record?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load advocates from profiles
  useEffect(() => {
    async function loadLawyers() {
      try {
        const { data, error: staffErr } = await supabase
          .from('profiles')
          .select('id, full_name, name, role, email')
          .order('full_name', { ascending: true });

        if (!staffErr && data) {
          setLawyersList(data);
        }
      } catch (e) {
        console.warn('Lawyers list load notice:', e);
      }
    }
    loadLawyers();
  }, []);

  // 1. AUTO-CALCULATION: Total Disbursements
  const totalDisbursements = useMemo(() => {
    return (
      (Number(searchFee) || 0) +
      (Number(stampDuty) || 0) +
      (Number(extraCopies) || 0) +
      (Number(registrationFee) || 0) +
      (Number(bankCharges) || 0) +
      (Number(transport) || 0) +
      (Number(linkageFees) || 0) +
      (Number(filingFee) || 0) +
      (Number(valuationFee) || 0) +
      (Number(courierFee) || 0) +
      (Number(otherDisbursements) || 0)
    );
  }, [
    searchFee,
    stampDuty,
    extraCopies,
    registrationFee,
    bankCharges,
    transport,
    linkageFees,
    filingFee,
    valuationFee,
    courierFee,
    otherDisbursements,
  ]);

  // 2. AUTO-CALCULATION: VAT 18%
  const vat = useMemo(() => {
    const fees = Number(legalFees) || 0;
    return Math.round(fees * 0.18);
  }, [legalFees]);

  // 3. AUTO-CALCULATION: Grand Total
  const grandTotal = useMemo(() => {
    const fees = Number(legalFees) || 0;
    return totalDisbursements + fees + vat;
  }, [totalDisbursements, legalFees, vat]);

  const handleLawyerSelect = (lawyerId: string) => {
    setAssignedLawyerId(lawyerId);
    const selected = lawyersList.find((l) => l.id === lawyerId);
    if (selected) {
      setAssignedLawyerName(selected.full_name || selected.name || selected.email);
    } else {
      setAssignedLawyerName('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!canModifyRecord) {
      const msg = `View-Only Access: You can only edit mortgages belonging to your assigned branch (${effectiveUser?.branchName || currentUser?.branchName || 'your station'}).`;
      setError(msg);
      showCleanMessage(msg, 'warning');
      return;
    }

    if (
      !isGlobalAdmin &&
      !canUserModifyMortgage(effectiveUser, {
        branch: bankBranch.trim(),
        branch_name: branchName,
      })
    ) {
      const msg = `Permission Denied: You cannot transfer or save this mortgage outside your assigned branch (${effectiveUser?.branchName || currentUser?.branchName || 'your station'}).`;
      setError(msg);
      showCleanMessage(msg, 'warning');
      return;
    }

    setLoading(true);

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignedLawyerId);

    const updatePayload: Record<string, any> = {
      record_year: recordYear ? parseInt(String(recordYear), 10) : new Date().getFullYear(),
      month_sheet: monthSheet || MONTHS[new Date().getMonth()],
      client_name: mortgagorName.trim(),
      borrower_name: mortgagorName.trim(),
      mortgagor_name: mortgagorName.trim(),
      rim_no: rimNo.trim(),
      file_number: rimNo.trim() || record.file_number,
      branch: bankBranch.trim(),
      client_branch_location: bankBranch.trim(),
      bank_branch: bankBranch.trim(),
      property_description: propertyDescription.trim(),
      title_deed_no: propertyDescription.trim(),
      loan_amount: Number(loanAmount) || 0,
      status: status,
      branch_name: branchName,
      department: department,
      assigned_lawyer_id: isUUID ? assignedLawyerId : null,
      assigned_lawyer_name: assignedLawyerName.trim(),
      transfer_reason: transferReason.trim(),
      date_of_receipt: dateOfReceipt || null,
      date_of_payment: dateOfPayment || null,
      date_of_return: dateOfReturn || null,
      date_instructed: dateInstructed || null,
      date_sent_registration: dateSentRegistration || null,
      date_registered: dateRegistered || null,
      legal_fees: Number(legalFees) || 0,
      search_fee: Number(searchFee) || 0,
      stamp_duty: Number(stampDuty) || 0,
      extra_copies: Number(extraCopies) || 0,
      registration_fee: Number(registrationFee) || 0,
      bank_charges: Number(bankCharges) || 0,
      transport: Number(transport) || 0,
      linkage_fees: Number(linkageFees) || 0,
      filing_fee: Number(filingFee) || 0,
      valuation_fee: Number(valuationFee) || 0,
      courier_fee: Number(courierFee) || 0,
      other_fees: Number(otherDisbursements) || 0,
      other_disbursements: Number(otherDisbursements) || 0,
      total_disbursements: totalDisbursements,
      vat: vat,
      vat_18: vat,
      grand_total: grandTotal,
      comments: comments.trim(),
      notes: comments.trim(),
      updated_at: new Date().toISOString(),
    };

    try {
      const res = await MortgageService.updateMortgage(record.id, updatePayload, effectiveUser, record);

      if (!res.success) {
        throw new Error(res.error || 'Failed to update mortgage record.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update mortgage:', err);
      setError(err?.message || 'Failed to update mortgage record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                {record?.client_bank_name || 'Lending Partner'}
              </span>
              <span className="text-xs text-gray-400">File Ref: {rimNo || record?.file_number || 'N/A'}</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">Edit Mortgage File &amp; Department Transfer</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 flex space-x-6 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('details')}
            className={`py-3 border-b-2 transition ${
              activeSubTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 File Particulars &amp; Status
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('transfer')}
            className={`py-3 border-b-2 transition ${
              activeSubTab === 'transfer'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🔄 Branch, Department &amp; Lawyer Assignment
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('fees')}
            className={`py-3 border-b-2 transition ${
              activeSubTab === 'fees'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            💰 Fees &amp; Disbursement Ledger
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {!canModifyRecord && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-medium">
              View-Only Mode: This mortgage belongs to <strong>{branchName}</strong>. Your account can only edit files assigned to your branch ({effectiveUser?.branchName || currentUser?.branchName || 'your station'}).
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}
          <fieldset disabled={!canModifyRecord} className="space-y-6">

          {/* TAB 1: File Particulars & Status */}
          {activeSubTab === 'details' && (
            <div className="space-y-4">
              {/* Reporting Period: Year & Month Sheet */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-xs font-bold text-blue-900 mb-1">Record Year *</label>
                  <input 
                    type="number" 
                    value={recordYear} 
                    onChange={(e) => setRecordYear(Number(e.target.value))} 
                    className="w-full border border-blue-200 p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-blue-950" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-900 mb-1">Month Sheet *</label>
                  <select 
                    value={monthSheet} 
                    onChange={(e) => setMonthSheet(e.target.value)} 
                    className="w-full border border-blue-200 p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-blue-950" 
                    required
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-gray-700 mb-1">Mortgagor / Borrower Name *</label>
                  <input
                    type="text"
                    required
                    value={mortgagorName}
                    onChange={(e) => setMortgagorName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">RIM No. / Customer ID</label>
                  <input
                    type="text"
                    value={rimNo}
                    onChange={(e) => setRimNo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Bank Branch</label>
                  <input
                    type="text"
                    value={bankBranch}
                    onChange={(e) => {
                      if (isGlobalAdmin) setBankBranch(e.target.value);
                    }}
                    disabled={!canModifyRecord || !isGlobalAdmin}
                    className={`w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                      !canModifyRecord || !isGlobalAdmin ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Loan Amount (UGX) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Registration Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="Active / Processing">Active / Processing</option>
                    <option value="Completed / Cleared">Completed / Cleared</option>
                    <option value="Pending Valuation">Pending Valuation</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Under Preparation">Under Preparation</option>
                    <option value="Sent for Registration">Sent for Registration</option>
                    <option value="Registered">Registered (Custody Safe)</option>
                    <option value="Pending Release">Pending Release</option>
                    <option value="Released / Discharged">Released / Discharged</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-medium text-gray-700 mb-1">Property Description / Title Particulars *</label>
                  <input
                    type="text"
                    required
                    value={propertyDescription}
                    onChange={(e) => setPropertyDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Date of Receipt</label>
                  <input
                    type="date"
                    value={dateOfReceipt}
                    onChange={(e) => setDateOfReceipt(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Date of Payment</label>
                  <input
                    type="date"
                    value={dateOfPayment}
                    onChange={(e) => setDateOfPayment(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Date of Return</label>
                  <input
                    type="date"
                    value={dateOfReturn}
                    onChange={(e) => setDateOfReturn(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Date Instructed</label>
                  <input
                    type="date"
                    value={dateInstructed}
                    onChange={(e) => setDateInstructed(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Date Sent for Registration</label>
                  <input
                    type="date"
                    value={dateSentRegistration}
                    onChange={(e) => setDateSentRegistration(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Date Registered</label>
                  <input
                    type="date"
                    value={dateRegistered}
                    onChange={(e) => setDateRegistered(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-medium text-gray-700 mb-1">Comments &amp; File Notes</label>
                  <textarea
                    rows={2}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Branch, Department & Lawyer Assignment */}
          {activeSubTab === 'transfer' && (
            <div className="space-y-5">
              <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100">
                <h4 className="text-xs font-bold text-indigo-900 mb-1">Station &amp; Department Transfer Controls</h4>
                <p className="text-[11px] text-indigo-700">
                  Reassign the mortgage file across regional branch registries or transfer jurisdiction to specialized firm practice groups.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Assigned Branch Station *</label>
                  <select
                    value={branchName}
                    onChange={(e) => {
                      if (isGlobalAdmin) setBranchName(e.target.value);
                    }}
                    disabled={!canModifyRecord || !isGlobalAdmin}
                    className={`w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 font-medium ${
                      !canModifyRecord || !isGlobalAdmin ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'
                    }`}
                  >
                    {DEFAULT_BRANCHES.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  {!isGlobalAdmin && (
                    <p className="text-[10px] text-amber-700 mt-1">
                      Only Super Admin / Firm Admin may transfer mortgages to another branch.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Firm Department *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">Assigned Lawyer / Responsible Advocate</label>
                  <select
                    value={assignedLawyerId}
                    onChange={(e) => handleLawyerSelect(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Unassigned Advocate --</option>
                    {lawyersList.map((lawyer) => (
                      <option key={lawyer.id} value={lawyer.id}>
                        {lawyer.full_name || lawyer.name || lawyer.email} ({lawyer.role || 'Staff'})
                      </option>
                    ))}
                  </select>
                  {assignedLawyerName && (
                    <p className="text-[11px] text-gray-500 mt-1">Currently assigned: {assignedLawyerName}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">Transfer Reason / Audit Justification</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Transferred to Mbarara branch as land title registry is situated in Mbarara MZO..."
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Fees & Disbursement Ledger */}
          {activeSubTab === 'fees' && (
            <div className="space-y-5">
              <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200">
                <label className="block font-semibold text-blue-900 mb-1 text-xs">
                  Professional Legal Fees (Base for 18% VAT) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={legalFees}
                  onChange={(e) => setLegalFees(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-blue-300 rounded-lg p-2 font-mono bg-white text-blue-950 font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Stamp Duty</label>
                  <input
                    type="number"
                    min="0"
                    value={stampDuty}
                    onChange={(e) => setStampDuty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Extra Copies</label>
                  <input
                    type="number"
                    min="0"
                    value={extraCopies}
                    onChange={(e) => setExtraCopies(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Registration Fee</label>
                  <input
                    type="number"
                    min="0"
                    value={registrationFee}
                    onChange={(e) => setRegistrationFee(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Other Fees</label>
                  <input
                    type="number"
                    min="0"
                    value={otherDisbursements}
                    onChange={(e) => setOtherDisbursements(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Bank Charges</label>
                  <input
                    type="number"
                    min="0"
                    value={bankCharges}
                    onChange={(e) => setBankCharges(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Transport</label>
                  <input
                    type="number"
                    min="0"
                    value={transport}
                    onChange={(e) => setTransport(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Linkage Fees</label>
                  <input
                    type="number"
                    min="0"
                    value={linkageFees}
                    onChange={(e) => setLinkageFees(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Search Fee</label>
                  <input
                    type="number"
                    min="0"
                    value={searchFee}
                    onChange={(e) => setSearchFee(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Filing Fee</label>
                  <input
                    type="number"
                    min="0"
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
                    value={valuationFee}
                    onChange={(e) => setValuationFee(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-gray-700 mb-1">Courier / Logistics</label>
                  <input
                    type="number"
                    min="0"
                    value={courierFee}
                    onChange={(e) => setCourierFee(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Calculation Summary Card */}
              <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                    Updated Auto-Calculated Ledger
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                    Total Disbursements + Legal Fees + 18% VAT
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                    <span className="text-[11px] text-slate-400 block mb-1">Total Disbursements</span>
                    <span className="font-mono font-bold text-sm text-amber-300">
                      UGX {totalDisbursements.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                    <span className="text-[11px] text-slate-400 block mb-1">Legal Fees</span>
                    <span className="font-mono font-bold text-sm text-blue-300">
                      UGX {(Number(legalFees) || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                    <span className="text-[11px] text-slate-400 block mb-1">VAT 18%</span>
                    <span className="font-mono font-bold text-sm text-indigo-300">
                      UGX {vat.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-blue-600/20 rounded-lg border border-blue-500/40">
                    <span className="text-[11px] text-blue-200 block mb-1">Grand Total</span>
                    <span className="font-mono font-bold text-base text-white">
                      UGX {grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          </fieldset>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canModifyRecord}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {!canModifyRecord
                ? 'View-Only (External Branch)'
                : loading
                ? 'Saving Changes...'
                : 'Save & Update Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMortgageModal;