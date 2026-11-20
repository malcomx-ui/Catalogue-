import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StaffDiaryEntryType } from '../../types';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { showCleanMessage } from '../../utils/notification';
import { X, Calendar, Clock, AlertCircle, Users, FileCheck2 } from 'lucide-react';

export type DiaryCategoryPreset = 'deadline' | 'meeting' | 'hearing';

interface AddDiaryEntryModalProps {
  isOpen: boolean;
  initialDate?: string;
  initialCategory?: DiaryCategoryPreset;
  onClose: () => void;
  onSaved?: () => void;
}

const CATEGORY_OPTIONS: {
  id: DiaryCategoryPreset;
  entryType: StaffDiaryEntryType;
  label: string;
  viewCategory: string;
  colorTag: string;
  description: string;
}[] = [
  {
    id: 'deadline',
    entryType: 'deadline',
    label: 'Statutory & Perfection Deadline',
    viewCategory: 'Statutory & Perfection Deadlines',
    colorTag: '#3b82f6',
    description: 'Filing limitation, land registry perfection, or bank SLA deadline',
  },
  {
    id: 'meeting',
    entryType: 'meeting',
    label: 'Internal Review & Client Meeting',
    viewCategory: 'Internal Reviews & Client Meetings',
    colorTag: '#22c55e',
    description: 'Partner brief review, pre-trial conference, or client briefing',
  },
];

export const AddDiaryEntryModal: React.FC<AddDiaryEntryModalProps> = ({
  isOpen,
  initialDate,
  initialCategory = 'deadline',
  onClose,
  onSaved,
}) => {
  const { cases, currentUser, branches, selectedBranchFilter, addStaffDiaryEntry } = useApp();

  const defaultDate = initialDate || new Date().toISOString().split('T')[0];
  const [category, setCategory] = useState<DiaryCategoryPreset>(
    initialCategory === 'meeting' ? 'meeting' : 'deadline'
  );
  const [date, setDate] = useState<string>(defaultDate);
  const [time, setTime] = useState<string>('10:00');
  const [title, setTitle] = useState<string>('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      setDate(initialDate || new Date().toISOString().split('T')[0]);
      setCategory(initialCategory === 'meeting' ? 'meeting' : 'deadline');
    }
  }, [isOpen, initialDate, initialCategory]);

  const visibleCases = useMemo(() => {
    if (!selectedBranchFilter || selectedBranchFilter === 'all') return cases;
    return cases.filter((c) => !c.branchId || c.branchId === selectedBranchFilter);
  }, [cases, selectedBranchFilter]);

  if (!isOpen) return null;

  const selectedMeta =
    CATEGORY_OPTIONS.find((opt) => opt.id === category) || CATEGORY_OPTIONS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setSaving(true);
    try {
      const matchedCase = cases.find((c) => c.id === selectedCaseId);
      const branchId =
        matchedCase?.branchId ||
        (selectedBranchFilter !== 'all' ? selectedBranchFilter : currentUser?.branchId || 'kla-hq');
      const branchObj = branches.find((b) => b.id === branchId);

      // 1. Save into local/context StaffDiaryEntry store immediately
      addStaffDiaryEntry({
        staffKey: currentUser?.email || currentUser?.id || 'staff',
        staffName: currentUser?.name || 'Legal Counsel',
        date,
        time: time || '10:00',
        entryType: selectedMeta.entryType,
        title: title.trim(),
        notes: [
          notes.trim(),
          branchObj?.name ? `Branch: ${branchObj.name}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
        caseId: matchedCase?.id,
        suitNumber: matchedCase?.case_number || matchedCase?.suitNumber,
        completed: false,
      });

      // 2. Opportunistically sync reminder metadata to Supabase if schema columns/table exist
      if (isSupabaseConfigured) {
        const reminderIso = new Date(`${date}T${time || '09:00'}:00`).toISOString();

        if (matchedCase?.id) {
          const { error: caseUpdateErr } = await supabase
            .from('cases')
            .update({
              reminder_at: reminderIso,
              view_category: selectedMeta.viewCategory,
              color_tag: selectedMeta.colorTag,
            })
            .eq('id', matchedCase.id);

          if (caseUpdateErr && caseUpdateErr.code !== '42703' && caseUpdateErr.code !== 'PGRST204') {
            console.warn('Optional case reminder update skipped:', caseUpdateErr.message);
          }
        }

        const { error: notifErr } = await supabase.from('dashboard_notifications').insert({
          title: selectedMeta.label,
          message: `${title.trim()}${matchedCase ? ` (${matchedCase.case_number || matchedCase.title})` : ''} — Scheduled for ${date}`,
          category: selectedMeta.viewCategory,
          color_tag: selectedMeta.colorTag,
          case_id: matchedCase?.id || null,
          branch_id: branchId,
        });

        if (notifErr && notifErr.code !== 'PGRST205' && notifErr.code !== '42P01') {
          console.warn('Optional dashboard notification insert skipped:', notifErr.message);
        }
      }

      showCleanMessage(
        `${title.trim()} scheduled under ${selectedMeta.label}.`,
        'success'
      );

      setTitle('');
      setNotes('');
      setSelectedCaseId('');
      if (onSaved) onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/55 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div>
            <h2 className="text-base font-bold text-white">
              Add Statutory Deadline or Review
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Track statutory filing limits, mortgage perfection SLAs, and client meetings
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs text-slate-700 dark:text-slate-300">
          {/* Category Selector */}
          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              Diary Category *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATEGORY_OPTIONS.map((opt) => {
                const isSelected = category === opt.id;
                const Icon = opt.id === 'deadline' ? FileCheck2 : Users;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCategory(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? opt.id === 'deadline'
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 text-slate-900 dark:text-white ring-2 ring-blue-500/20'
                          : 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/50 text-slate-900 dark:text-white ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: opt.colorTag }}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                        <span className="truncate">{opt.id === 'deadline' ? 'Statutory Deadline' : 'Review / Meeting'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Title / Action Required *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                category === 'deadline'
                  ? 'e.g. File Written Statement of Defense / Mortgage Registration SLA'
                  : 'e.g. Pre-Trial Client Strategy Conference'
              }
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Due / Meeting Date *
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Reminder Time *
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Link to Litigation Matter (Optional)
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
            >
              <option value="">General Office / Unlinked Matter</option>
              {visibleCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number || c.suitNumber ? `[${c.case_number || c.suitNumber}] ` : ''}
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Notes / Compliance Checklist
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Statutory provision, bank SLA target, or attendees..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Appears immediately in Agenda, Month, Week, and Day calendar views and triggers Smart Alerts.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#0B132B] dark:bg-[#000065] hover:bg-[#000065] dark:hover:bg-[#131C42] disabled:opacity-60 text-white rounded-xl font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              {saving ? 'Saving...' : 'Save Diary Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
