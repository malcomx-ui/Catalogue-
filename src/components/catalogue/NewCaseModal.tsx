import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CASE_TYPES, CASE_STATUSES, UGANDA_DISTRICTS } from '../../types';
import {
  X,
  Save,
  Scale,
  Building2,
  FolderOpen,
  FileText,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { PersonsInConductField } from './PersonsInConductField';
import { UgxCurrencyIcon } from '../common/UgxCurrencyIcon';
import {
  getEffectiveUser,
  isUserAdmin,
  canUserModifyCase,
  resolveBranchId,
} from '../../lib/supabase';
import {
  resolveCaseBranchForSave,
  DEFAULT_HQ_BRANCH_NAME,
} from '../../services/caseService';
import { showCleanMessage } from '../../utils/notification';

const empty = {
  case_number: '',
  suit_no: '',
  title: '',
  branch: '',
  client: '',
  case_type: 'Civil Litigation',
  status: 'Active',
  date_of_instructions: new Date().toISOString().slice(0, 10),
  court: 'High Court of Uganda',
  district: 'Kampala',
  subject_matter: '',
  notes: '',
  hearing_date: '',
  target: '',
  file_location: 'KAMPALA HEAD OFFICE',
  year_of_closure: '',
  billing_status: 'unbilled',
  payment_status: '',
  verdict: '',
  person_in_conduct: '',
  persons_in_conduct: [] as string[],
};

export const NewCaseModal: React.FC = () => {
  const {
    isNewCaseModalOpen,
    setIsNewCaseModalOpen,
    addCase,
    branches,
    currentUser,
    userPermissions,
    runConflictCheck,
    systemSettings,
  } = useApp();

  const effectiveUser = getEffectiveUser(currentUser);
  const isAdminOrSuper = isUserAdmin(effectiveUser);

  const hqBranch =
    branches.find((b) => b.id === 'kla-hq' || b.isHeadquarters) ||
    branches.find((b) => b.name.toLowerCase().includes('kampala')) ||
    branches[0];

  const intake = systemSettings?.intakeFields || {};
  const getField = (id: string, fallbackLabel: string) => {
    const cfg = intake[id];
    return {
      label: cfg?.label || fallbackLabel,
      isMandatory: cfg?.requirement === 'mandatory',
      isHidden: cfg?.requirement === 'hidden',
    };
  };

  const handleAutoGenerateNumber = () => {
    const prefix = systemSettings?.features?.caseNumberPrefix || 'MKA/';
    const num = `${prefix}${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
    set('case_number', num);
  };

  const [form, setForm] = useState({
    ...empty,
    branch: effectiveUser?.branchName || hqBranch?.name || DEFAULT_HQ_BRANCH_NAME,
    person_in_conduct: effectiveUser?.name || currentUser?.name || '',
    persons_in_conduct: (effectiveUser?.name || currentUser?.name)
      ? [effectiveUser?.name || currentUser?.name || '']
      : [''],
    case_number: '',
    suit_no: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Sync default branch and district when opened
  useEffect(() => {
    if (isNewCaseModalOpen) {
      const userBranch =
        branches.find(
          (b) => b.id === effectiveUser?.branchId || b.name === effectiveUser?.branchName
        ) || hqBranch;
      const initialBranchName = userBranch
        ? userBranch.name
        : (effectiveUser?.branchName || DEFAULT_HQ_BRANCH_NAME);
      const initialDistrict = userBranch ? userBranch.city : 'Kampala';
      const userDisplayName = effectiveUser?.name || currentUser?.name || '';

      setForm((prev) => {
        const initialPersons =
          prev.persons_in_conduct.length > 0 && prev.persons_in_conduct.some((p) => p.trim())
            ? prev.persons_in_conduct
            : userDisplayName
            ? [userDisplayName]
            : [''];

        return {
          ...prev,
          branch: !isAdminOrSuper ? initialBranchName : (prev.branch || initialBranchName),
          district: prev.district || initialDistrict,
          file_location: prev.file_location || `${initialDistrict.toUpperCase()} OFFICE`,
          person_in_conduct: prev.person_in_conduct || userDisplayName,
          persons_in_conduct: initialPersons,
        };
      });
    }
  }, [isNewCaseModalOpen, currentUser, effectiveUser?.branchId, effectiveUser?.branchName, effectiveUser?.name, branches, isAdminOrSuper]);

  if (!isNewCaseModalOpen) return null;

  const currentBranchObj = branches.find((b) => b.name === form.branch) || branches[0];
  const canCreateForSelectedBranch =
    isAdminOrSuper ||
    canUserModifyCase(effectiveUser, {
      branchId: currentBranchObj?.id || resolveBranchId(undefined, form.branch),
      branchName: form.branch,
    });


  const handlePersonsChange = (newPersons: string[]) => {
    setForm((f) => ({
      ...f,
      persons_in_conduct: newPersons,
      person_in_conduct: newPersons.filter((p) => p.trim()).join(', '),
    }));
  };

  const set = (k: string, v: any) => {
    setForm((f) => {
      const updated = { ...f, [k]: v };
      if (k === 'branch') {
        const foundBranch = branches.find((b) => b.name === v);
        if (foundBranch) {
          updated.district = foundBranch.city;
          updated.file_location = `${foundBranch.city.toUpperCase()} OFFICE`;
          if (foundBranch.staff && foundBranch.staff.length > 0) {
            const lead = foundBranch.staff.find((s) => s.role === 'team_lead' || s.role === 'partner');
            if (lead) {
              updated.person_in_conduct = lead.name;
              if (updated.persons_in_conduct.length <= 1) {
                updated.persons_in_conduct = [lead.name];
              }
            }
          }
        }
      }
      return updated;
    });

    if (k === 'client') {
      if (v && v.trim().length > 2) {
        const res = runConflictCheck(v);
        if (res.hasConflict) {
          setConflictWarning(
            `Conflict Alert: "${v}" appears in existing active matters on: ${res.matchedCases.map((m) => m.branchName).join(', ')}.`
          );
        } else {
          setConflictWarning(null);
        }
      } else {
        setConflictWarning(null);
      }
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let finalCaseNumber = form.case_number.trim();
    if (!finalCaseNumber && systemSettings?.features?.enableCaseAutoNumbering) {
      const prefix = systemSettings.features.caseNumberPrefix || 'MKA/';
      finalCaseNumber = `${prefix}${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
    }

    if (getField('caseNumber', 'MK File No.').isMandatory && !finalCaseNumber) {
      setError(`${getField('caseNumber', 'MK File No.').label} is required by firm intake rules.`);
      return;
    }
    if (getField('clientName', 'Client').isMandatory && !form.client.trim()) {
      setError(`${getField('clientName', 'Client').label} is required by firm intake rules.`);
      return;
    }
    if (getField('court', 'Court').isMandatory && !form.court.trim()) {
      setError(`${getField('court', 'Court').label} is required by firm intake rules.`);
      return;
    }

    setSaving(true);
    try {
      const validPersons = form.persons_in_conduct.map((p) => p.trim()).filter(Boolean);
      const primaryLead =
        validPersons[0] || form.person_in_conduct.trim() || effectiveUser?.name || currentUser?.name || '';
      const assistingAdvocates = validPersons.slice(1);
      const combinedPersons = validPersons.length > 0 ? validPersons.join(', ') : primaryLead;

      const matchedSelectedBranch = branches.find((b) => b.name === form.branch);
      const { branchId: resolvedBranchId, branchName: resolvedBranchName } = resolveCaseBranchForSave(
        {
          branch: form.branch,
          branchName: form.branch,
          branchId: matchedSelectedBranch?.id || resolveBranchId(undefined, form.branch),
        },
        effectiveUser
      );

      if (
        !isAdminOrSuper &&
        !canUserModifyCase(effectiveUser, { branchId: resolvedBranchId, branchName: resolvedBranchName })
      ) {
        const msg = `Permission Denied: You can only add new cases belonging to your assigned branch (${effectiveUser?.branchName || currentUser?.branchName || 'your station'}).`;
        showCleanMessage(msg, 'warning');
        setError(msg);
        setSaving(false);
        return;
      }

      const payload = {
        case_number: finalCaseNumber,
        suitNumber: finalCaseNumber,
        suit_no: form.suit_no.trim(),
        title: form.title.trim(),
        branch: resolvedBranchName,
        branchName: resolvedBranchName,
        branch_id: resolvedBranchId,
        branchId: resolvedBranchId,
        client: form.client.trim(),
        clientName: form.client.trim(),
        case_type: form.case_type, // <--- Explicitly included to resolve Supabase cache error
        status: (form.status || 'Active') as any,
        date_of_instructions: form.date_of_instructions || undefined,
        filingDate: form.date_of_instructions || new Date().toISOString().slice(0, 10),
        court: form.court.trim() || 'High Court of Uganda',
        district: form.district.trim(),
        subject_matter: form.subject_matter.trim(),
        briefSummary: form.subject_matter.trim(),
        notes: form.notes.trim(),
        hearing_date: form.hearing_date || undefined,
        nextHearingDate: form.hearing_date || undefined,
        target: form.target.trim(),
        file_location: form.file_location.trim(),
        year_of_closure: (form.status === 'Closed' || form.status === 'Archived')
          ? (form.year_of_closure ? Number(form.year_of_closure) : new Date().getFullYear())
          : (form.year_of_closure ? Number(form.year_of_closure) : null),
        billing_status: form.billing_status.trim() || 'unbilled',
        payment_status: form.payment_status.trim(),
        verdict: form.verdict.trim(),
        person_in_conduct: combinedPersons,
        persons_in_conduct: validPersons.length > 0 ? validPersons : [primaryLead],
        leadAdvocate: primaryLead,
        assistingAdvocates: assistingAdvocates,
      };

      const savedCase = await addCase(payload);
      if (!savedCase) {
        const msg = 'Could not save case. Please verify branch permissions and database connection.';
        setError(msg);
        return;
      }

      showCleanMessage('Success! Case record saved securely.', 'success');
      setIsNewCaseModalOpen(false);
      const resetUserDisplayName = effectiveUser?.name || currentUser?.name || '';
      setForm({
        ...empty,
        branch: effectiveUser?.branchName || hqBranch?.name || DEFAULT_HQ_BRANCH_NAME,
        person_in_conduct: resetUserDisplayName,
        persons_in_conduct: resetUserDisplayName ? [resetUserDisplayName] : [''],
        suit_no: '',
      });
    } catch (err: any) {
      console.error('NewCaseModal submit error:', err);
      const errMsg = err?.message || 'Could not save the case.';
      setError(errMsg);
      showCleanMessage(errMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-2 sm:p-6">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shrink-0 border border-slate-700/50">
              <Scale className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                New Case
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                Register a new matter into the centralized catalogue
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsNewCaseModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Warning Banner */}
        {conflictWarning && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-4 sm:px-6 py-2.5 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="font-medium">{conflictWarning}</div>
          </div>
        )}

        <form onSubmit={submit} className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 text-xs">
          {/* Section 1: Case details */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
              <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Case details</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Branch Selection Field */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Assigned Branch</label>
                {isAdminOrSuper ? (
                  // Super Admin / Admin / Partner: Can select any branch from the dropdown (defaults to Kampala Central HQ if unset)
                  <select
                    className="mt-1 block w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"
                    value={form.branch}
                    onChange={(e) => set('branch', e.target.value)}
                    required
                  >
                    <option value="" disabled>Select branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  // Regular Branch User: Locked, read-only field showing their assigned branch
                  <input
                    type="text"
                    disabled
                    className="mt-1 block w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-medium cursor-not-allowed"
                    value={effectiveUser?.branchName || (effectiveUser as any)?.branch_name || effectiveUser?.branchId || (effectiveUser as any)?.branch_id || DEFAULT_HQ_BRANCH_NAME}
                  />
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isAdminOrSuper
                    ? "Admin Override: You can assign this case to any branch (defaults to Kampala Central Head Office)."
                    : "Cases are automatically locked and registered to your assigned branch."}
                </p>
              </div>

              {/* 2. MK Case No. */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="case_number" className="block font-medium text-slate-700 dark:text-slate-300">
                    {getField('caseNumber', 'MK Case No.').label}
                  </label>
                  {systemSettings?.features?.enableCaseAutoNumbering && (
                    <button
                      type="button"
                      onClick={handleAutoGenerateNumber}
                      className="text-[10px] text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Generate</span>
                    </button>
                  )}
                </div>
                <input
                  id="case_number"
                  type="text"
                  value={form.case_number}
                  onChange={(e) => set('case_number', e.target.value)}
                  placeholder="Enter MK case number"
                  className="w-full font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Suit No. */}
              <div className="space-y-1.5">
                <label htmlFor="suit_no" className="block font-medium text-slate-700 dark:text-slate-300">
                  Suit No.
                </label>
                <input
                  id="suit_no"
                  type="text"
                  value={form.suit_no}
                  onChange={(e) => set('suit_no', e.target.value)}
                  placeholder="e.g. HCT-00-CC-CS-0245-2026"
                  className="w-full font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* 3. Client Full Name/Entity */}
              <div className="space-y-1.5">
                <label htmlFor="client" className="block font-medium text-slate-700 dark:text-slate-300">
                  {getField('clientName', 'Client Full Name/Entity').label} *
                </label>
                <input
                  id="client"
                  type="text"
                  required
                  value={form.client}
                  onChange={(e) => set('client', e.target.value)}
                  placeholder="Client name / corporate entity"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* 4. Case Title */}
              <div className="space-y-1.5">
                <label htmlFor="title" className="block font-medium text-slate-700 dark:text-slate-300">
                  {getField('title', 'Case Title').label} *
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Brief subject of the matter"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              {/* 5. Nature of case (case_type) */}
              <div className="space-y-1.5">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {getField('caseType', 'Nature of case').label} *
                </label>
                <select
                  value={form.case_type}
                  onChange={(e) => set('case_type', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {(systemSettings?.practiceAreas && systemSettings.practiceAreas.length > 0
                    ? systemSettings.practiceAreas
                    : CASE_TYPES
                  ).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Status */}
              <div className="space-y-1.5">
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {getField('status', 'Status').label} *
                </label>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {CASE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="doi" className="block font-medium text-slate-700 dark:text-slate-300">
                  {getField('dateOfInstructions', 'Date of instructions').label}
                </label>
                <input
                  id="doi"
                  type="date"
                  value={form.date_of_instructions}
                  onChange={(e) => set('date_of_instructions', e.target.value)}
                  className="w-full tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="court" className="block font-medium text-slate-700 dark:text-slate-300">
                  {getField('court', 'Court').label} *
                </label>
                <input
                  id="court"
                  type="text"
                  value={form.court}
                  onChange={(e) => set('court', e.target.value)}
                  placeholder="e.g. High Court (Commercial Division)"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="district" className="block font-medium text-slate-700 dark:text-slate-300">
                  District
                </label>
                <select
                  id="district"
                  value={form.district}
                  onChange={(e) => set('district', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="">Select district...</option>
                  {UGANDA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Client & file */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
              <FolderOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Client & file</span>
            </div>

            <div className="space-y-4">
              <PersonsInConductField
                persons={form.persons_in_conduct}
                onChange={handlePersonsChange}
                staffOptions={currentBranchObj?.staff || []}
                idPrefix="new-case-person"
              />

              <div className="grid gap-4 md:grid-cols-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1.5">
                  <label htmlFor="file_loc" className="block font-medium text-slate-700 dark:text-slate-300">
                    Location of physical file
                  </label>
                  <input
                    id="file_loc"
                    type="text"
                    value={form.file_location}
                    onChange={(e) => set('file_location', e.target.value)}
                    placeholder="e.g. KAMPALA OFFICE / CAB-2"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="target" className="block font-medium text-slate-700 dark:text-slate-300">
                    Target
                  </label>
                  <input
                    id="target"
                    type="text"
                    value={form.target}
                    onChange={(e) => set('target', e.target.value)}
                    placeholder="e.g. Recovery of UGX 1.2B"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Matter details */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Matter details</span>
            </div>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label htmlFor="subject" className="block font-medium text-slate-700 dark:text-slate-300">
                  Subject matter
                </label>
                <textarea
                  id="subject"
                  rows={3}
                  value={form.subject_matter}
                  onChange={(e) => set('subject_matter', e.target.value)}
                  placeholder="Detailed summary of facts, claims, or dispute context..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="notes" className="block font-medium text-slate-700 dark:text-slate-300">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Internal notes or client instructions..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Closure & billing */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="text-slate-900 dark:text-slate-100 font-bold border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
              <span>Closure & billing</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="billing" className="block font-medium text-slate-700 dark:text-slate-300">
                  Billing status
                </label>
                <input
                  id="billing"
                  type="text"
                  value={form.billing_status}
                  onChange={(e) => set('billing_status', e.target.value)}
                  placeholder="e.g. unbilled, Billed, Retainer"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="payment" className="block font-medium text-slate-700 dark:text-slate-300">
                  Payment status
                </label>
                <input
                  id="payment"
                  type="text"
                  value={form.payment_status}
                  onChange={(e) => set('payment_status', e.target.value)}
                  placeholder="e.g. Paid, 50% Advance Received"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900/60">
              {error}
            </p>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              * Required fields
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsNewCaseModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !canCreateForSelectedBranch}
                title={
                  !canCreateForSelectedBranch
                    ? `View-Only Mode: Creating cases is restricted to ${effectiveUser?.branchName || currentUser?.branchName || 'your assigned branch'}`
                    : 'Register new case'
                }
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-lg font-medium shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>
                  {!canCreateForSelectedBranch
                    ? 'Restricted to Assigned Branch'
                    : saving
                    ? 'Saving to Supabase...'
                    : 'Create case'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};