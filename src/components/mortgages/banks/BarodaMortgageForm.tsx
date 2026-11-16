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
  Landmark,
} from 'lucide-react';
import { MortgageService, DEFAULT_BANKS } from '../../../services/mortgageService';
import {
  getEffectiveUser,
  isUserAdmin,
  canUserModifyMortgage,
  resolveBranchMeta,
} from '../../../lib/supabase';
import { showCleanMessage } from '../../../utils/notification';
import {
  MONTHS,
  DEFAULT_FIRM_BRANCHES,
  BARODA_SECURITY_NATURES,
  BARODA_CUSTODY_STATUSES,
  BARODA_STATUSES,
  DedicatedBankFormProps,
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

export const BarodaMortgageForm: React.FC<DedicatedBankFormProps> = ({
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
  const isGlobalAdmin = isUserAdmin(effectiveUser);
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

  // Bank of Baroda Specific Fields
  const [barodaAccountNo, setBarodaAccountNo] = useState<string>(
    initialRecord?.baroda_account_no || bsd.baroda_account_no || initialRecord?.rim_no || ''
  );
  const [schemeCode, setSchemeCode] = useState<string>(
    initialRecord?.scheme_code || bsd.scheme_code || ''
  );
  const [sanctionLetterRef, setSanctionLetterRef] = useState<string>(
    initialRecord?.sanction_letter_ref || bsd.sanction_letter_ref || initialRecord?.file_number || ''
  );
  const [sanctionDate, setSanctionDate] = useState<string>(
    (initialRecord?.sanction_date || bsd.sanction_date || '').slice(0, 10)
  );
  const [barodaBranchCode, setBarodaBranchCode] = useState<string>(
    initialRecord?.baroda_branch_code || bsd.baroda_branch_code || ''
  );
  const [bankBranchStation, setBankBranchStation] = useState<string>(
    initialRecord?.bank_branch_station ||
      initialRecord?.bank_branch ||
      initialRecord?.client_branch_location ||
      ''
  );
  const [dateOfReceipt, setDateOfReceipt] = useState<string>(() =>
    initialRecord?.date_of_receipt
      ? String(initialRecord.date_of_receipt).slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );

  // Mortgagor, Security Nature, Title Custody & URA Stamp Duty PRN
  const [clientName, setClientName] = useState<string>(
    initialRecord?.client_name || initialRecord?.mortgagor_name || initialRecord?.borrower_name || ''
  );
  const [securityNature, setSecurityNature] = useState<string>(
    initialRecord?.security_nature || bsd.security_nature || BARODA_SECURITY_NATURES[0]
  );
  const [titleCustodyStatus, setTitleCustodyStatus] = useState<string>(
    initialRecord?.title_custody_status || bsd.title_custody_status || BARODA_CUSTODY_STATUSES[0]
  );
  const [uraPrn, setUraPrn] = useState<string>(initialRecord?.ura_prn || bsd.ura_prn || '');
  const [propertyDescription, setPropertyDescription] = useState<string>(
    initialRecord?.property_description || initialRecord?.description || initialRecord?.title_deed_no || ''
  );
  const [loanAmount, setLoanAmount] = useState<string>(() => numVal(initialRecord?.loan_amount));

  // Status & Dates
  const [status, setStatus] = useState<string>(initialRecord?.status || 'Active / Processing');
  const [dateOfPayment, setDateOfPayment] = useState<string>(
    (initialRecord?.date_of_payment || '').slice(0, 10)
  );
  const [dateOfReturn, setDateOfReturn] = useState<string>(
    (initialRecord?.date_of_return || '').slice(0, 10)
  );

  // Disbursements & Fees
  const [stampDuty, setStampDuty] = useState<string>(() => numVal(initialRecord?.stamp_duty));
  const [registrationFee, setRegistrationFee] = useState<string>(() =>
    numVal(initialRecord?.registration_fee ?? initialRecord?.registration)
  );
  const [searchFee, setSearchFee] = useState<string>(() => numVal(initialRecord?.search_fee));
  const [extraCopies, setExtraCopies] = useState<string>(() => numVal(initialRecord?.extra_copies));
  const [bankCharges, setBankCharges] = useState<string>(() => numVal(initialRecord?.bank_charges));
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
      cleanFloat(extraCopies) +
      cleanFloat(bankCharges) +
      cleanFloat(otherFees),
    [stampDuty, registrationFee, searchFee, extraCopies, bankCharges, otherFees]
  );
  const effectiveTotalDisb = autoCalcDisb ? calculatedDisb : cleanFloat(manualDisb);
  const calculatedVat = useMemo(() => Math.round(cleanFloat(legalFees) * 0.18), [legalFees]);
  const effectiveVat = autoCalcVat ? calculatedVat : cleanFloat(manualVat);
  const calculatedGrand = useMemo(
    () => effectiveTotalDisb + cleanFloat(legalFees) + effectiveVat,
    [effectiveTotalDisb, legalFees, effectiveVat]
  );
  const effectiveGrand = autoCalcGrand ? calculatedGrand : cleanFloat(manualGrand);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!canModifyRecord) {
      const msg = `View-Only Access: You can only modify mortgages assigned to ${assignedBranchLabel}.`;
      setErrorMessage(msg);
      showCleanMessage(msg, 'warning');
      return;
    }

    if (!clientName.trim()) {
      setErrorMessage('Mortgagor / Account Holder Name is required.');
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
      baroda_account_no: barodaAccountNo.trim(),
      scheme_code: schemeCode.trim(),
      sanction_letter_ref: sanctionLetterRef.trim(),
      sanction_date: sanctionDate || null,
      baroda_branch_code: barodaBranchCode.trim(),
      security_nature: securityNature,
      title_custody_status: titleCustodyStatus,
      ura_prn: uraPrn.trim(),
    };

    const payload: Record<string, any> = {
      bank_name: 'Bank of Baroda',
      client_bank_name: 'Bank of Baroda',
      record_year: recordYear || new Date().getFullYear(),
      month_sheet: monthSheet,
      date_of_receipt: dateOfReceipt || new Date().toISOString().slice(0, 10),
      sanction_date: sanctionDate || null,
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
      rim_no: barodaAccountNo.trim() || sanctionLetterRef.trim(),
      file_number: sanctionLetterRef.trim() || barodaAccountNo.trim(),
      baroda_account_no: barodaAccountNo.trim(),
      scheme_code: schemeCode.trim(),
      sanction_letter_ref: sanctionLetterRef.trim(),
      baroda_branch_code: barodaBranchCode.trim(),
      security_nature: securityNature,
      title_custody_status: titleCustodyStatus,
      ura_prn: uraPrn.trim(),
      property_description: propertyDescription.trim(),
      title_deed_no: propertyDescription.trim(),
      loan_amount: cleanFloat(loanAmount),
      stamp_duty: cleanFloat(stampDuty),
      registration_fee: cleanFloat(registrationFee),
      search_fee: cleanFloat(searchFee),
      extra_copies: cleanFloat(extraCopies),
      bank_charges: cleanFloat(bankCharges),
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
      source_sheet: isEdit ? initialRecord?.source_sheet || 'Baroda Entry' : 'Baroda Entry',
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
        setErrorMessage(res.error || 'Failed to save Bank of Baroda mortgage record.');
        return;
      }

      const successText = isEdit
        ? 'Bank of Baroda mortgage record updated successfully.'
        : 'Bank of Baroda mortgage record saved successfully.';
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
      setErrorMessage(err?.message || 'Unexpected error saving Bank of Baroda record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-orange-300">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/20 text-orange-200 border border-orange-400/30">
                  Bank of Baroda (Uganda)
                </span>
                <span className="text-[11px] text-slate-300">
                  Sanction, Scheme Code &amp; URA PRN Register
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-wide mt-0.5">
                {isEdit ? 'Edit Bank of Baroda Mortgage File' : 'New Bank of Baroda Security File'}
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
            {/* Period & Bank Selector */}
            <div
              className={`grid grid-cols-1 ${
                allowBankSelection && !isEdit ? 'md:grid-cols-4' : 'md:grid-cols-3'
              } gap-4 bg-orange-50/70 dark:bg-orange-950/25 p-5 rounded-2xl border border-orange-200/80 dark:border-orange-900/50`}
            >
              {allowBankSelection && !isEdit && (
                <div>
                  <label className="block font-bold text-orange-950 dark:text-orange-200 mb-1">
                    Lending Bank / SACCO *
                  </label>
                  <select
                    value="Bank of Baroda"
                    onChange={(e) => onBankChange?.(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-sm text-orange-950 dark:text-orange-100 font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    {DEFAULT_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block font-bold text-orange-950 dark:text-orange-200 mb-1">
                  Record Year *
                </label>
                <input
                  type="number"
                  required
                  value={recordYear}
                  onChange={(e) =>
                    setRecordYear(parseInt(e.target.value, 10) || new Date().getFullYear())
                  }
                  className="w-full bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-sm text-orange-950 dark:text-orange-100 font-semibold tabular-nums focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-orange-950 dark:text-orange-200 mb-1">
                  Month Sheet *
                </label>
                <select
                  required
                  value={monthSheet}
                  onChange={(e) => setMonthSheet(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-sm text-orange-950 dark:text-orange-100 font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-orange-950 dark:text-orange-200 mb-1">
                  Date of Receipt *
                </label>
                <input
                  type="date"
                  required
                  value={dateOfReceipt}
                  onChange={(e) => setDateOfReceipt(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-sm text-orange-950 dark:text-orange-100 tabular-nums focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Section 1: Baroda Account, Sanction & Branches */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold uppercase tracking-wider text-[11px]">
                <Building2 className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                <span>1. Baroda Account, Sanction Reference &amp; Branch Routing</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Baroda Account No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 95010400001829"
                    value={barodaAccountNo}
                    onChange={(e) => setBarodaAccountNo(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Scheme Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LA701 / OD204"
                    value={schemeCode}
                    onChange={(e) => setSchemeCode(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sanction Letter Ref
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BOB/KLA/ADV/2026/118"
                    value={sanctionLetterRef}
                    onChange={(e) => setSanctionLetterRef(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sanction Date
                  </label>
                  <input
                    type="date"
                    value={sanctionDate}
                    onChange={(e) => setSanctionDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Baroda Branch Name &amp; Code
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="SOL ID"
                      value={barodaBranchCode}
                      onChange={(e) => setBarodaBranchCode(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="e.g. Kampala Main"
                      value={bankBranchStation}
                      onChange={(e) => setBankBranchStation(e.target.value)}
                      className="col-span-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Firm Branch Station (MK Office)
                  </label>
                  {isGlobalAdmin ? (
                    <select
                      value={firmBranchStation}
                      onChange={(e) => setFirmBranchStation(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
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

            {/* Section 2: Mortgagor, URA Assessment & Title Custody */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold uppercase tracking-wider text-[11px]">
                <FileText className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                <span>2. Mortgagor, Title Custody &amp; URA Stamp Duty PRN</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mortgagor / Account Holder Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full legal name of borrower / corporate entity"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sanctioned Loan Amount (UGX)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Security Nature
                  </label>
                  <select
                    value={securityNature}
                    onChange={(e) => setSecurityNature(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    {BARODA_SECURITY_NATURES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Title Custody Status
                  </label>
                  <select
                    value={titleCustodyStatus}
                    onChange={(e) => setTitleCustodyStatus(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    {BARODA_CUSTODY_STATUSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    URA Stamp Duty PRN
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2260008491023"
                    value={uraPrn}
                    onChange={(e) => setUraPrn(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Charged Title / Security Description
                  </label>
                  <input
                    type="text"
                    placeholder="Block, Plot, Volume/Folio & location of mortgaged property"
                    value={propertyDescription}
                    onChange={(e) => setPropertyDescription(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Status, Settlement Dates & Disbursements */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold uppercase tracking-wider text-[11px]">
                  <Receipt className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>3. Statutory Fees, Settlement &amp; Fee Billing</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={autoCalcDisb} onChange={(e) => setAutoCalcDisb(e.target.checked)} className="rounded text-orange-600" />
                    <span>Auto Disb.</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={autoCalcVat} onChange={(e) => setAutoCalcVat(e.target.checked)} className="rounded text-orange-600" />
                    <span>Auto 18% VAT</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={autoCalcGrand} onChange={(e) => setAutoCalcGrand(e.target.checked)} className="rounded text-orange-600" />
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
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Extra Copies</label>
                  <input type="number" min="0" step="any" placeholder="0" value={extraCopies} onChange={(e) => setExtraCopies(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Bank Charges</label>
                  <input type="number" min="0" step="any" placeholder="0" value={bankCharges} onChange={(e) => setBankCharges(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
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
                    <Calculator className="w-3 h-3 text-orange-600" />
                    <span>Grand Total (UGX)</span>
                  </label>
                  <input type="number" min="0" step="any" disabled={autoCalcGrand} value={autoCalcGrand ? calculatedGrand : manualGrand} onChange={(e) => setManualGrand(e.target.value)} className="w-full bg-orange-900 text-white border border-orange-700 rounded-lg px-3 py-2 font-mono tabular-nums font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">File Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-slate-100 font-medium">
                    {BARODA_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Date of Payment</span>
                  </label>
                  <input type="date" value={dateOfPayment} onChange={(e) => setDateOfPayment(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date Returned to Baroda</label>
                  <input type="date" value={dateOfReturn} onChange={(e) => setDateOfReturn(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 font-mono tabular-nums text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Comments</label>
                  <input type="text" placeholder="Baroda credit officer notes..." value={comments} onChange={(e) => setComments(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-slate-100" />
                </div>
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
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {loading
                  ? 'Saving Baroda Record...'
                  : isEdit
                  ? 'Update Bank of Baroda File'
                  : 'Save Bank of Baroda File'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BarodaMortgageForm;
