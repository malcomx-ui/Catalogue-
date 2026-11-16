import React, { useState, useMemo } from 'react';
import {
  Building2,
  X,
  AlertCircle,
  CheckCircle2,
  FileText,
  Receipt,
  Calculator,
  Calendar,
  Loader2,
  ShieldCheck,
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
  IM_SECURITY_TYPES,
  IM_TITLE_TYPES,
  IM_STATUSES,
  DedicatedBankFormProps,
  isSuperAdminOnlyBank,
} from './bankConfigs';

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

export const IMBankMortgageForm: React.FC<DedicatedBankFormProps> = ({
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

  // I&M Bank Specific Identification & Dates
  const [customerCif, setCustomerCif] = useState<string>(
    initialRecord?.customer_cif || bsd.customer_cif || initialRecord?.rim_no || ''
  );
  const [facilityReference, setFacilityReference] = useState<string>(
    initialRecord?.facility_reference || bsd.facility_reference || initialRecord?.file_number || ''
  );
  const [relationshipManager, setRelationshipManager] = useState<string>(
    initialRecord?.relationship_manager || bsd.relationship_manager || ''
  );
  const [bankBranchStation, setBankBranchStation] = useState<string>(
    initialRecord?.bank_branch_station ||
      initialRecord?.bank_branch ||
      initialRecord?.client_branch_location ||
      ''
  );
  const [dateInstructed, setDateInstructed] = useState<string>(
    (initialRecord?.date_instructed || bsd.date_instructed || '').slice(0, 10)
  );
  const [dateOfReceipt, setDateOfReceipt] = useState<string>(() =>
    initialRecord?.date_of_receipt
      ? String(initialRecord.date_of_receipt).slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );

  // Borrower & Security Valuation
  const [clientName, setClientName] = useState<string>(
    initialRecord?.client_name || initialRecord?.mortgagor_name || initialRecord?.borrower_name || ''
  );
  const [securityType, setSecurityType] = useState<string>(
    initialRecord?.security_type || bsd.security_type || IM_SECURITY_TYPES[0]
  );
  const [titleType, setTitleType] = useState<string>(
    initialRecord?.title_type || bsd.title_type || IM_TITLE_TYPES[0]
  );
  const [propertyDescription, setPropertyDescription] = useState<string>(
    initialRecord?.property_description || initialRecord?.description || initialRecord?.title_deed_no || ''
  );
  const [loanAmount, setLoanAmount] = useState<string>(() => numVal(initialRecord?.loan_amount));
  const [forcedSaleValue, setForcedSaleValue] = useState<string>(() =>
    numVal(initialRecord?.forced_sale_value ?? bsd.forced_sale_value)
  );

  // Registration & Perfection Tracking
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

  // Disbursements & Fee Schedule
  const [stampDuty, setStampDuty] = useState<string>(() => numVal(initialRecord?.stamp_duty));
  const [registrationFee, setRegistrationFee] = useState<string>(() =>
    numVal(initialRecord?.registration_fee ?? initialRecord?.registration)
  );
  const [searchFee, setSearchFee] = useState<string>(() => numVal(initialRecord?.search_fee));
  const [valuationFee, setValuationFee] = useState<string>(() => numVal(initialRecord?.valuation_fee));
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
      cleanFloat(valuationFee) +
      cleanFloat(extraCopies) +
      cleanFloat(otherFees),
    [stampDuty, registrationFee, searchFee, valuationFee, extraCopies, otherFees]
  );
  const effectiveTotalDisb = autoCalcDisb ? calculatedDisb : cleanFloat(manualDisb);

  const calculatedVat = useMemo(() => Math.round(cleanFloat(legalFees) * 0.18), [legalFees]);
  const effectiveVat = autoCalcVat ? calculatedVat : cleanFloat(manualVat);

  const calculatedGrand = useMemo(
    () => effectiveTotalDisb + cleanFloat(legalFees) + effectiveVat,
    [effectiveTotalDisb, legalFees, effectiveVat]
  );
  const effectiveGrand = autoCalcGrand ? calculatedGrand : cleanFloat(manualGrand);

  // Auto Loan-to-Value (LTV %) based on Loan Amount / Forced Sale Value
  const ltvPercentage = useMemo(() => {
    const loan = cleanFloat(loanAmount);
    const fsv = cleanFloat(forcedSaleValue);
    if (!loan || !fsv) return null;
    return ((loan / fsv) * 100).toFixed(1);
  }, [loanAmount, forcedSaleValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isStrictSuper) {
      const msg = 'Restricted: I&M Bank is currently limited to Super Admin access.';
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
      customer_cif: customerCif.trim(),
      facility_reference: facilityReference.trim(),
      relationship_manager: relationshipManager.trim(),
      security_type: securityType,
      title_type: titleType,
      forced_sale_value: cleanFloat(forcedSaleValue),
      date_instructed: dateInstructed || null,
      date_sent_registration: dateSentRegistration || null,
      date_registered: dateRegistered || null,
    };

    const payload: Record<string, any> = {
      bank_name: 'I&M Bank',
      client_bank_name: 'I&M Bank',
      record_year: recordYear || new Date().getFullYear(),
      month_sheet: monthSheet,
      date_of_receipt: dateOfReceipt || new Date().toISOString().slice(0, 10),
      date_instructed: dateInstructed || null,
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
      rim_no: customerCif.trim() || facilityReference.trim(),
      file_number: facilityReference.trim() || customerCif.trim(),
      customer_cif: customerCif.trim(),
      facility_reference: facilityReference.trim(),
      relationship_manager: relationshipManager.trim(),
      security_type: securityType,
      title_type: titleType,
      forced_sale_value: cleanFloat(forcedSaleValue),
      property_description: propertyDescription.trim(),
      title_deed_no: propertyDescription.trim(),
      loan_amount: cleanFloat(loanAmount),
      stamp_duty: cleanFloat(stampDuty),
      registration_fee: cleanFloat(registrationFee),
      search_fee: cleanFloat(searchFee),
      valuation_fee: cleanFloat(valuationFee),
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
      source_sheet: isEdit ? initialRecord?.source_sheet || 'I&M Bank Entry' : 'I&M Bank Entry',
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
        setErrorMessage(res.error || 'Failed to save I&M Bank mortgage record.');
        return;
      }

      const successText = isEdit
        ? 'I&M Bank mortgage file updated successfully.'
        : 'I&M Bank mortgage file registered successfully.';
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
      setErrorMessage(err?.message || 'Unexpected error saving I&M Bank record.');
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
              I&amp;M Bank is currently restricted to Super Admin users while its module is being finalized.
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
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/30">
                  I&amp;M Bank Uganda
                </span>
                <span className="text-[11px] text-slate-300">
                  CIF, Facility &amp; Valuation Security Form
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-wide mt-0.5">
                {isEdit ? 'Edit I&M Bank Mortgage File' : 'New I&M Bank Security Instruction'}
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
              } gap-4 bg-sky-50/70 dark:bg-sky-950/30 p-5 rounded-2xl border border-sky-200/80 dark:border-sky-900/60`}
            >
              {allowBankSelection && !isEdit && (
                <div>
                  <label className="block font-bold text-sky-950 dark:text-sky-200 mb-1">
                    Lending Bank / SACCO *
                  </label>
                  <select
                    value="I&M Bank"
                    onChange={(e) => onBankChange?.(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 rounded-lg px-3 py-2 text-sm text-sky-950 dark:text-sky-100 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                <label className="block font-bold text-sky-950 dark:text-sky-200 mb-1">
                  Record Year *
                </label>
                <input
                  type="number"
                  required
                  value={recordYear}
                  onChange={(e) =>
                    setRecordYear(parseInt(e.target.value, 10) || new Date().getFullYear())
                  }
                  className="w-full bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 rounded-lg px-3 py-2 text-sm text-sky-950 dark:text-sky-100 font-semibold tabular-nums focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-sky-950 dark:text-sky-200 mb-1">
                  Month Sheet *
                </label>
                <select
                  required
                  value={monthSheet}
                  onChange={(e) => setMonthSheet(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 rounded-lg px-3 py-2 text-sm text-sky-950 dark:text-sky-100 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-sky-950 dark:text-sky-200 mb-1">
                  Date Instructed by I&amp;M
                </label>
                <input
                  type="date"
                  value={dateInstructed}
                  onChange={(e) => setDateInstructed(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 rounded-lg px-3 py-2 text-sm text-sky-950 dark:text-sky-100 tabular-nums focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Section 1: I&M Bank Identification & Branch Routing */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold uppercase tracking-wider text-[11px]">
                <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>1. I&amp;M Bank CIF, Facility &amp; Branch Particulars</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer CIF Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CIF-0084921"
                    value={customerCif}
                    onChange={(e) => setCustomerCif(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Facility / Offer Letter Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. IMB/CR/2026/0419"
                    value={facilityReference}
                    onChange={(e) => setFacilityReference(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    I&amp;M Relationship Manager
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah N. (Corporate Credit)"
                    value={relationshipManager}
                    onChange={(e) => setRelationshipManager(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date Received by MK Advocates *
                  </label>
                  <input
                    type="date"
                    required
                    value={dateOfReceipt}
                    onChange={(e) => setDateOfReceipt(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    I&amp;M Bank Branch Station
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. I&M Kingdom Kampala Branch"
                    value={bankBranchStation}
                    onChange={(e) => setBankBranchStation(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    >
                      {firmBranchOptions.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
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

            {/* Section 2: Security, Tenure & Valuation */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold uppercase tracking-wider text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>2. Borrower, Collateral Security &amp; Valuation</span>
                </div>
                {ltvPercentage && (
                  <span className="text-[11px] font-mono tabular-nums font-semibold text-sky-700 dark:text-sky-300">
                    Loan-to-FSV Ratio: {ltvPercentage}%
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Borrower / Mortgagor Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Individual or corporate borrower name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Security Instrument Type
                  </label>
                  <select
                    value={securityType}
                    onChange={(e) => setSecurityType(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    {IM_SECURITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Land Tenure / Title Type
                  </label>
                  <select
                    value={titleType}
                    onChange={(e) => setTitleType(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    {IM_TITLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Facility / Loan Amount (UGX)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Forced Sale Value (FSV - UGX)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={forcedSaleValue}
                    onChange={(e) => setForcedSaleValue(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Title Particulars / Property Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LRV 4512 Folio 18 Plot 42 Kololo / Kyadondo Block 220 Plot 91"
                    value={propertyDescription}
                    onChange={(e) => setPropertyDescription(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Registry Perfection Dates */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold uppercase tracking-wider text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>3. Registry Perfection Milestones &amp; Status</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    File Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    {IM_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sent to Registry
                  </label>
                  <input
                    type="date"
                    value={dateSentRegistration}
                    onChange={(e) => setDateSentRegistration(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date Registered
                  </label>
                  <input
                    type="date"
                    value={dateRegistered}
                    onChange={(e) => setDateRegistered(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Payment
                  </label>
                  <input
                    type="date"
                    value={dateOfPayment}
                    onChange={(e) => setDateOfPayment(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Returned to Bank
                  </label>
                  <input
                    type="date"
                    value={dateOfReturn}
                    onChange={(e) => setDateOfReturn(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Disbursements & Fees */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold uppercase tracking-wider text-[11px]">
                  <Receipt className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>4. Registry Disbursements &amp; I&amp;M Fee Billing</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCalcDisb}
                      onChange={(e) => setAutoCalcDisb(e.target.checked)}
                      className="rounded text-sky-600"
                    />
                    <span>Auto Disb.</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCalcVat}
                      onChange={(e) => setAutoCalcVat(e.target.checked)}
                      className="rounded text-sky-600"
                    />
                    <span>Auto 18% VAT</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCalcGrand}
                      onChange={(e) => setAutoCalcGrand(e.target.checked)}
                      className="rounded text-sky-600"
                    />
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
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Valuation / Insp.</label>
                  <input type="number" min="0" step="any" placeholder="0" value={valuationFee} onChange={(e) => setValuationFee(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
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
                  <input
                    type="number"
                    min="0"
                    step="any"
                    disabled={autoCalcDisb}
                    value={autoCalcDisb ? calculatedDisb : manualDisb}
                    onChange={(e) => setManualDisb(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Legal Fees (UGX)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={legalFees}
                    onChange={(e) => setLegalFees(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">VAT 18% (UGX)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    disabled={autoCalcVat}
                    value={autoCalcVat ? calculatedVat : manualVat}
                    onChange={(e) => setManualVat(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Calculator className="w-3 h-3 text-sky-600" />
                    <span>Grand Total (UGX)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    disabled={autoCalcGrand}
                    value={autoCalcGrand ? calculatedGrand : manualGrand}
                    onChange={(e) => setManualGrand(e.target.value)}
                    className="w-full bg-sky-900 text-white border border-sky-700 rounded-lg px-3 py-2 font-mono tabular-nums font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks &amp; Registry Notes
                </label>
                <input
                  type="text"
                  placeholder="Perfection remarks, caveat notes, or RM instructions..."
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
              className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {loading
                  ? 'Saving I&M Record...'
                  : isEdit
                  ? 'Update I&M Mortgage File'
                  : 'Save I&M Mortgage File'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IMBankMortgageForm;
