import React, { useState, useMemo } from 'react';
import {
  Building2,
  X,
  AlertCircle,
  CheckCircle2,
  FileText,
  Receipt,
  Calculator,
  Clock,
  Loader2,
  Briefcase,
  Lock,
} from 'lucide-react';
import { MortgageService, DEFAULT_BANKS } from '../../../services/mortgageService';
import {
  getEffectiveUser,
  isUserAdmin,
  isStrictSuperAdmin,
  canUserModifyMortgage,
  resolveBranchMeta,
} from '../../../lib/supabase';
import { showCleanMessage } from '../../../utils/notification';
import {
  MONTHS,
  DEFAULT_FIRM_BRANCHES,
  KCB_FACILITY_TYPES,
  KCB_PERFECTION_STAGES,
  KCB_STATUSES,
  DedicatedBankFormProps,
  isSuperAdminOnlyBank,
} from './bankConfigs';
import { computeTurnaroundDays } from './bankReportUtils';

const normalizeMonthValue = (raw?: string) => {
  if (!raw) return MONTHS[new Date().getMonth()];
  const clean = String(raw).trim().toLowerCase();
  const matched = MONTHS.find(
    (m) => m.toLowerCase() === clean || m.toLowerCase().startsWith(clean.slice(0, 3))
  );
  return matched || MONTHS[new Date().getMonth()];
};

const numVal = (v: any): string => (v === null || v === undefined || v === '' ? '' : String(v));
const cleanFloat = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const parsed = parseFloat(String(v).replace(/,/g, '').trim());
  return isNaN(parsed) ? 0 : parsed;
};

export const KCBMortgageForm: React.FC<DedicatedBankFormProps> = ({
  initialRecord,
  allowBankSelection = false,
  onBankChange,
  defaultMonth,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const isEdit = Boolean(initialRecord?.id);
  const bsd = initialRecord?.bank_specific_data || {};

  const effectiveUser = useMemo(() => getEffectiveUser(currentUser), [currentUser]);
  const isStrictSuper = isStrictSuperAdmin(effectiveUser);
  const isGlobalAdmin = isUserAdmin(effectiveUser);
  const visibleBanks = useMemo(
    () => DEFAULT_BANKS.filter((b) => isStrictSuper || !isSuperAdminOnlyBank(b)),
    [isStrictSuper]
  );
  const canModifyRecord = useMemo(
    () => (isEdit ? canUserModifyMortgage(effectiveUser, initialRecord) : true),
    [isEdit, effectiveUser, initialRecord]
  );

  const assignedBranchMeta = useMemo(
    () =>
      resolveBranchMeta(
        effectiveUser?.branchId || currentUser?.branchId,
        effectiveUser?.branchName || currentUser?.branchName
      ),
    [effectiveUser?.branchId, effectiveUser?.branchName, currentUser?.branchId, currentUser?.branchName]
  );
  const assignedBranchLabel =
    effectiveUser?.branchName || currentUser?.branchName || assignedBranchMeta.name;

  const [recordYear, setRecordYear] = useState<number>(() =>
    initialRecord?.record_year ? Number(initialRecord.record_year) : new Date().getFullYear()
  );
  const [monthSheet, setMonthSheet] = useState<string>(() =>
    initialRecord?.month_sheet
      ? normalizeMonthValue(initialRecord.month_sheet)
      : defaultMonth && MONTHS.includes(defaultMonth)
      ? defaultMonth
      : MONTHS[new Date().getMonth()]
  );

  const [firmBranchStation, setFirmBranchStation] = useState<string>(() => {
    const existing =
      initialRecord?.firm_branch_station || initialRecord?.branch_name || '';
    return existing || assignedBranchLabel;
  });

  const firmBranchOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    DEFAULT_FIRM_BRANCHES.forEach((b) => map.set(b.name.toLowerCase(), b));
    [firmBranchStation, assignedBranchLabel].forEach((n) => {
      const clean = String(n || '').trim();
      if (clean && !map.has(clean.toLowerCase())) {
        map.set(clean.toLowerCase(), { id: resolveBranchMeta(undefined, clean).id, name: clean });
      }
    });
    return Array.from(map.values());
  }, [firmBranchStation, assignedBranchLabel]);

  // KCB Panel Instruction & SLA Tracking
  const [dateOfReceipt, setDateOfReceipt] = useState<string>(() =>
    initialRecord?.date_of_receipt
      ? String(initialRecord.date_of_receipt).slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [slaTargetDate, setSlaTargetDate] = useState<string>(
    (initialRecord?.sla_target_date || bsd.sla_target_date || '').slice(0, 10)
  );
  const [kcbCustomerId, setKcbCustomerId] = useState<string>(
    initialRecord?.kcb_customer_id || bsd.kcb_customer_id || initialRecord?.rim_no || ''
  );
  const [panelInstructionNo, setPanelInstructionNo] = useState<string>(
    initialRecord?.panel_instruction_no ||
      bsd.panel_instruction_no ||
      initialRecord?.file_number ||
      ''
  );
  const [facilityType, setFacilityType] = useState<string>(
    initialRecord?.facility_type || bsd.facility_type || KCB_FACILITY_TYPES[0]
  );
  const [bankBranchStation, setBankBranchStation] = useState<string>(
    initialRecord?.bank_branch_station ||
      initialRecord?.bank_branch ||
      initialRecord?.client_branch_location ||
      ''
  );

  // Borrower, Perfection Stage & Instrument Number
  const [clientName, setClientName] = useState<string>(
    initialRecord?.client_name || initialRecord?.mortgagor_name || initialRecord?.borrower_name || ''
  );
  const [perfectionStage, setPerfectionStage] = useState<string>(
    initialRecord?.perfection_stage || bsd.perfection_stage || KCB_PERFECTION_STAGES[0]
  );
  const [instrumentNumber, setInstrumentNumber] = useState<string>(
    initialRecord?.instrument_number || bsd.instrument_number || ''
  );
  const [propertyDescription, setPropertyDescription] = useState<string>(
    initialRecord?.property_description || initialRecord?.description || initialRecord?.title_deed_no || ''
  );
  const [loanAmount, setLoanAmount] = useState<string>(() => numVal(initialRecord?.loan_amount));
  const [status, setStatus] = useState<string>(initialRecord?.status || 'Active / Processing');

  const [dateSentRegistration, setDateSentRegistration] = useState<string>(
    (initialRecord?.date_sent_registration || bsd.date_sent_registration || '').slice(0, 10)
  );
  const [dateRegistered, setDateRegistered] = useState<string>(
    (initialRecord?.date_registered || bsd.date_registered || '').slice(0, 10)
  );
  const [dateOfPayment, setDateOfPayment] = useState<string>(
    (initialRecord?.date_of_payment || '').slice(0, 10)
  );
  const [dateOfReturn, setDateOfReturn] = useState<string>(
    (initialRecord?.date_of_return || '').slice(0, 10)
  );

  // KCB Fee Ledger
  const [stampDuty, setStampDuty] = useState<string>(() => numVal(initialRecord?.stamp_duty));
  const [registrationFee, setRegistrationFee] = useState<string>(() =>
    numVal(initialRecord?.registration_fee ?? initialRecord?.registration)
  );
  const [searchFee, setSearchFee] = useState<string>(() => numVal(initialRecord?.search_fee));
  const [courierFee, setCourierFee] = useState<string>(() => numVal(initialRecord?.courier_fee));
  const [extraCopies, setExtraCopies] = useState<string>(() => numVal(initialRecord?.extra_copies));
  const [otherFees, setOtherFees] = useState<string>(() =>
    numVal(initialRecord?.other_fees ?? initialRecord?.other_disbursements)
  );
  const [autoCalcDisb, setAutoCalcDisb] = useState<boolean>(true);
  const [manualDisb, setManualDisb] = useState<string>(() =>
    numVal(initialRecord?.total_disbursements)
  );

  const [legalFees, setLegalFees] = useState<string>(() => numVal(initialRecord?.legal_fees));
  const [autoCalcVat, setAutoCalcVat] = useState<boolean>(true);
  const [manualVat, setManualVat] = useState<string>(() =>
    numVal(initialRecord?.vat_18 ?? initialRecord?.vat)
  );
  const [autoCalcGrand, setAutoCalcGrand] = useState<boolean>(true);
  const [manualGrand, setManualGrand] = useState<string>(() => numVal(initialRecord?.grand_total));
  const [comments, setComments] = useState<string>(initialRecord?.comments || '');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const calculatedDisb = useMemo(
    () =>
      cleanFloat(stampDuty) +
      cleanFloat(registrationFee) +
      cleanFloat(searchFee) +
      cleanFloat(courierFee) +
      cleanFloat(extraCopies) +
      cleanFloat(otherFees),
    [stampDuty, registrationFee, searchFee, courierFee, extraCopies, otherFees]
  );
  const effectiveTotalDisb = autoCalcDisb ? calculatedDisb : cleanFloat(manualDisb);
  const calculatedVat = useMemo(() => Math.round(cleanFloat(legalFees) * 0.18), [legalFees]);
  const effectiveVat = autoCalcVat ? calculatedVat : cleanFloat(manualVat);
  const calculatedGrand = useMemo(
    () => effectiveTotalDisb + cleanFloat(legalFees) + effectiveVat,
    [effectiveTotalDisb, legalFees, effectiveVat]
  );
  const effectiveGrand = autoCalcGrand ? calculatedGrand : cleanFloat(manualGrand);

  const turnaroundDays = useMemo(() => {
    const end = dateOfReturn || dateRegistered || new Date().toISOString().slice(0, 10);
    return computeTurnaroundDays(dateOfReceipt, end);
  }, [dateOfReceipt, dateOfReturn, dateRegistered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isStrictSuper) {
      const msg = 'Restricted: KCB is currently limited to Super Admin access.';
      setErrorMessage(msg);
      showCleanMessage(msg, 'warning');
      return;
    }

    if (!canModifyRecord) {
      const msg = `View-Only Access: You can only modify mortgages assigned to ${assignedBranchLabel}.`;
      setErrorMessage(msg);
      showCleanMessage(msg, 'warning');
      return;
    }

    if (!clientName.trim()) {
      setErrorMessage('Borrower / Mortgagor Name is required.');
      return;
    }

    const effectiveFirmName = isGlobalAdmin
      ? firmBranchStation.trim() || assignedBranchLabel
      : assignedBranchLabel;
    const effectiveFirmMeta = resolveBranchMeta(
      !isGlobalAdmin ? assignedBranchMeta.id : undefined,
      effectiveFirmName
    );

    if (
      !isGlobalAdmin &&
      !canUserModifyMortgage(effectiveUser, {
        branch_id: effectiveFirmMeta.id,
        firm_branch_station: effectiveFirmName,
        branch_name: effectiveFirmName,
      })
    ) {
      const msg = `Permission Denied: You can only save mortgages for your assigned MK office (${assignedBranchLabel}).`;
      setErrorMessage(msg);
      showCleanMessage(msg, 'warning');
      return;
    }

    setLoading(true);

    const bankSpecificData = {
      kcb_customer_id: kcbCustomerId.trim(),
      panel_instruction_no: panelInstructionNo.trim(),
      facility_type: facilityType,
      perfection_stage: perfectionStage,
      instrument_number: instrumentNumber.trim(),
      sla_target_date: slaTargetDate || null,
      turnaround_days: turnaroundDays ?? 0,
      date_sent_registration: dateSentRegistration || null,
      date_registered: dateRegistered || null,
    };

    const payload: Record<string, any> = {
      bank_name: 'KCB',
      client_bank_name: 'KCB',
      record_year: recordYear || new Date().getFullYear(),
      month_sheet: monthSheet,
      date_of_receipt: dateOfReceipt || new Date().toISOString().slice(0, 10),
      sla_target_date: slaTargetDate || null,
      turnaround_days: turnaroundDays ?? 0,
      date_sent_registration: dateSentRegistration || null,
      date_registered: dateRegistered || null,
      date_of_payment: dateOfPayment || null,
      date_of_return: dateOfReturn || null,
      bank_branch_station: bankBranchStation.trim(),
      bank_branch: bankBranchStation.trim(),
      client_branch_location: bankBranchStation.trim(),
      branch: bankBranchStation.trim(),
      firm_branch_station: effectiveFirmName,
      branch_name: effectiveFirmName,
      branch_id: effectiveFirmMeta.id,
      client_name: clientName.trim(),
      mortgagor_name: clientName.trim(),
      borrower_name: clientName.trim(),
      rim_no: kcbCustomerId.trim() || panelInstructionNo.trim(),
      file_number: panelInstructionNo.trim() || kcbCustomerId.trim(),
      kcb_customer_id: kcbCustomerId.trim(),
      panel_instruction_no: panelInstructionNo.trim(),
      facility_type: facilityType,
      perfection_stage: perfectionStage,
      instrument_number: instrumentNumber.trim(),
      property_description: propertyDescription.trim(),
      title_deed_no: propertyDescription.trim(),
      loan_amount: cleanFloat(loanAmount),
      stamp_duty: cleanFloat(stampDuty),
      registration_fee: cleanFloat(registrationFee),
      search_fee: cleanFloat(searchFee),
      courier_fee: cleanFloat(courierFee),
      extra_copies: cleanFloat(extraCopies),
      other_fees: cleanFloat(otherFees),
      other_disbursements: cleanFloat(otherFees),
      total_disbursements: effectiveTotalDisb,
      legal_fees: cleanFloat(legalFees),
      vat_18: effectiveVat,
      vat: effectiveVat,
      grand_total: effectiveGrand,
      status: status,
      comments: comments.trim(),
      notes: comments.trim(),
      source_sheet: isEdit ? initialRecord?.source_sheet || 'KCB Entry' : 'KCB Entry',
      department: initialRecord?.department || 'Banking & Securities',
      bank_specific_data: bankSpecificData,
      assigned_lawyer_name:
        initialRecord?.assigned_lawyer_name || currentUser?.name || effectiveUser?.name || '',
      assigned_lawyer_id:
        initialRecord?.assigned_lawyer_id ||
        (currentUser?.id && !String(currentUser.id).startsWith('user-') ? currentUser.id : null),
    };

    try {
      const res = isEdit
        ? await MortgageService.updateMortgage(initialRecord.id, payload, effectiveUser, initialRecord)
        : await MortgageService.insertMortgage(payload, effectiveUser);

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to save KCB mortgage record.');
        return;
      }

      const successText = isEdit
        ? 'KCB mortgage record updated successfully.'
        : 'KCB mortgage instruction registered successfully.';
      setSuccessMessage(successText);
      showCleanMessage(successText, 'success');
      onSuccess(res.data || payload, {
        cloudSaved: res.cloudSaved,
        cloudError: res.cloudError,
      });
      setTimeout(() => {
        onClose();
      }, 350);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected error saving KCB record.');
    } finally {
      setLoading(false);
    }
  };

  if (!isStrictSuper) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 max-w-md w-full p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Access Restricted</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              KCB Bank Uganda is currently restricted to Super Admin users while its module is being finalized.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  KCB Bank Uganda
                </span>
                <span className="text-[11px] text-slate-300">
                  Panel Instruction, Perfection Stage &amp; SLA Form
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-wide mt-0.5">
                {isEdit ? 'Edit KCB Panel Mortgage File' : 'New KCB Bank Panel Instruction'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          <fieldset disabled={!canModifyRecord} className="space-y-5">
            {/* Period & Bank Switcher */}
            <div
              className={`grid grid-cols-1 ${
                allowBankSelection && !isEdit ? 'md:grid-cols-4' : 'md:grid-cols-3'
              } gap-4 bg-emerald-50/70 dark:bg-emerald-950/25 p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50`}
            >
              {allowBankSelection && !isEdit && (
                <div>
                  <label className="block font-bold text-emerald-950 dark:text-emerald-200 mb-1">
                    Lending Bank / SACCO *
                  </label>
                  <select
                    value="KCB"
                    onChange={(e) => onBankChange?.(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 text-sm text-emerald-950 dark:text-emerald-100 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {visibleBanks.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block font-bold text-emerald-950 dark:text-emerald-200 mb-1">
                  Record Year *
                </label>
                <input
                  type="number"
                  required
                  value={recordYear}
                  onChange={(e) =>
                    setRecordYear(parseInt(e.target.value, 10) || new Date().getFullYear())
                  }
                  className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 text-sm text-emerald-950 dark:text-emerald-100 font-semibold tabular-nums focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-emerald-950 dark:text-emerald-200 mb-1">
                  Month Sheet *
                </label>
                <select
                  required
                  value={monthSheet}
                  onChange={(e) => setMonthSheet(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 text-sm text-emerald-950 dark:text-emerald-100 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-emerald-950 dark:text-emerald-200 mb-1">
                  SLA Target Completion Date
                </label>
                <input
                  type="date"
                  value={slaTargetDate}
                  onChange={(e) => setSlaTargetDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 text-sm text-emerald-950 dark:text-emerald-100 tabular-nums focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Section 1: KCB Panel Instruction & Branch Routing */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold uppercase tracking-wider text-[11px]">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>1. KCB Panel Instruction &amp; Branch Particulars</span>
                </div>
                {turnaroundDays !== null && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-300">
                    <Clock className="w-3 h-3" />
                    Turnaround: {turnaroundDays} day{turnaroundDays === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    KCB Customer ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KCB-CID-40912"
                    value={kcbCustomerId}
                    onChange={(e) => setKcbCustomerId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Panel Instruction Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KCB/UG/LEG/2026/088"
                    value={panelInstructionNo}
                    onChange={(e) => setPanelInstructionNo(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    KCB Facility Product Type
                  </label>
                  <select
                    value={facilityType}
                    onChange={(e) => setFacilityType(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {KCB_FACILITY_TYPES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date Instruction Received *
                  </label>
                  <input
                    type="date"
                    required
                    value={dateOfReceipt}
                    onChange={(e) => setDateOfReceipt(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    KCB Bank Branch Station
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KCB Oasis Mall / Lugogo Branch"
                    value={bankBranchStation}
                    onChange={(e) => setBankBranchStation(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Firm Branch Station (MK Office)
                  </label>
                  {isGlobalAdmin ? (
                    <select
                      value={firmBranchStation}
                      onChange={(e) => setFirmBranchStation(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {firmBranchOptions.map((b) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={assignedBranchLabel}
                      disabled
                      readOnly
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Perfection Stage, Instrument No. & Security */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold uppercase tracking-wider text-[11px]">
                <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>2. Borrower, Perfection Stage &amp; Registry Instrument</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Borrower / Mortgagor Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Borrower or corporate mortgagor legal name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Facility Value (UGX)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Perfection Workflow Stage
                  </label>
                  <select
                    value={perfectionStage}
                    onChange={(e) => setPerfectionStage(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {KCB_PERFECTION_STAGES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Registered Instrument Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KLA-2026-009421"
                    value={instrumentNumber}
                    onChange={(e) => setInstrumentNumber(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Register Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {KCB_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Security Description / Land Title Particulars
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wakiso Block 185 Plot 1403 Kira Municipality"
                    value={propertyDescription}
                    onChange={(e) => setPropertyDescription(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Sent to Registry</label>
                    <input type="date" value={dateSentRegistration} onChange={(e) => setDateSentRegistration(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date Registered</label>
                    <input type="date" value={dateRegistered} onChange={(e) => setDateRegistered(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date of Payment</label>
                    <input type="date" value={dateOfPayment} onChange={(e) => setDateOfPayment(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Returned to KCB</label>
                    <input type="date" value={dateOfReturn} onChange={(e) => setDateOfReturn(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: KCB Fee Ledger */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold uppercase tracking-wider text-[11px]">
                  <Receipt className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>3. KCB Panel Fee Ledger &amp; Disbursements</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={autoCalcDisb} onChange={(e) => setAutoCalcDisb(e.target.checked)} className="rounded text-emerald-600" />
                    <span>Auto Disb.</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={autoCalcVat} onChange={(e) => setAutoCalcVat(e.target.checked)} className="rounded text-emerald-600" />
                    <span>Auto 18% VAT</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={autoCalcGrand} onChange={(e) => setAutoCalcGrand(e.target.checked)} className="rounded text-emerald-600" />
                    <span>Auto Total</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Stamp Duty</label>
                  <input type="number" min="0" step="any" placeholder="0" value={stampDuty} onChange={(e) => setStampDuty(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Registration</label>
                  <input type="number" min="0" step="any" placeholder="0" value={registrationFee} onChange={(e) => setRegistrationFee(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Search Fee</label>
                  <input type="number" min="0" step="any" placeholder="0" value={searchFee} onChange={(e) => setSearchFee(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Courier / MZO</label>
                  <input type="number" min="0" step="any" placeholder="0" value={courierFee} onChange={(e) => setCourierFee(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Extra Copies</label>
                  <input type="number" min="0" step="any" placeholder="0" value={extraCopies} onChange={(e) => setExtraCopies(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Other Fees</label>
                  <input type="number" min="0" step="any" placeholder="0" value={otherFees} onChange={(e) => setOtherFees(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Disbursements</label>
                  <input type="number" min="0" step="any" disabled={autoCalcDisb} value={autoCalcDisb ? calculatedDisb : manualDisb} onChange={(e) => setManualDisb(e.target.value)} className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Legal Fees (UGX)</label>
                  <input type="number" min="0" step="any" placeholder="0" value={legalFees} onChange={(e) => setLegalFees(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">VAT 18% (UGX)</label>
                  <input type="number" min="0" step="any" disabled={autoCalcVat} value={autoCalcVat ? calculatedVat : manualVat} onChange={(e) => setManualVat(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-800 dark:text-slate-200" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Calculator className="w-3 h-3 text-emerald-600" />
                    <span>Grand Total (UGX)</span>
                  </label>
                  <input type="number" min="0" step="any" disabled={autoCalcGrand} value={autoCalcGrand ? calculatedGrand : manualGrand} onChange={(e) => setManualGrand(e.target.value)} className="w-full bg-emerald-900 text-white border border-emerald-700 rounded-lg px-3 py-2 font-mono tabular-nums font-bold" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  KCB Panel Remarks &amp; SLA Notes
                </label>
                <input
                  type="text"
                  placeholder="Title verification status, MZO dispatch ref, or SLA blocker..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canModifyRecord}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {loading
                  ? 'Saving KCB Record...'
                  : isEdit
                  ? 'Update KCB Mortgage File'
                  : 'Save KCB Mortgage File'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KCBMortgageForm;
