import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  IntakeFieldConfig,
  CustomFieldDefinition,
  FieldRequirementLevel,
  PublicHolidayConfig,
  NotificationRulesConfig,
} from '../../types';
import { DEFAULT_UGANDA_HOLIDAYS } from '../../utils/ugandaHolidays';
import { DEFAULT_NOTIFICATION_RULES } from '../../data/defaultSettings';
import {
  Sliders,
  CheckCircle2,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  FileText,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Building2,
  Scale,
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  Layers,
  Key,
  Globe,
  Check,
  Hash,
  Lock,
  CalendarDays,
  Repeat,
  Bell,
} from 'lucide-react';

import { isUserAdmin } from '../../lib/supabase';

export const SystemSettingsManager: React.FC = () => {
  const { systemSettings, updateSystemSettings, currentUser, userPermissions, setActiveTab: setMainTab } = useApp();
  const isSuperAdmin = isUserAdmin(currentUser) || userPermissions.canManageSettings;

  const [activeTab, setActiveTab] = useState<'intake' | 'features' | 'courts' | 'practice' | 'holidays' | 'notifications' | 'firm'>('intake');
  const [formData, setFormData] = useState(systemSettings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [newCourt, setNewCourt] = useState('');
  const [newPracticeArea, setNewPracticeArea] = useState('');

  // Public Holidays configuration state
  const [holidayCategoryFilter, setHolidayCategoryFilter] = useState<'All' | PublicHolidayConfig['category']>('All');
  const [holidaySearch, setHolidaySearch] = useState('');
  const [newHoliday, setNewHoliday] = useState<{
    date: string;
    name: string;
    recurring: boolean;
    category: PublicHolidayConfig['category'];
  }>({
    date: `${new Date().getFullYear()}-01-01`,
    name: '',
    recurring: false,
    category: 'Custom',
  });
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [editingHolidayDraft, setEditingHolidayDraft] = useState<PublicHolidayConfig | null>(null);

  // New Custom Field Modal state
  const [isAddingCustomField, setIsAddingCustomField] = useState(false);
  const [customFieldForm, setCustomFieldForm] = useState<Partial<CustomFieldDefinition>>({
    name: '',
    type: 'text',
    requirement: 'optional',
    helpText: '',
  });

  // Sync state if external changes arrive
  React.useEffect(() => {
    setFormData(systemSettings);
  }, [systemSettings]);

  if (!isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-center shadow-xs">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Access Restricted</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          System Settings &amp; Dynamic Entry Engine is strictly reserved for Super Administrators and Managing Partners.
        </p>
        <button
          onClick={() => setMainTab('dashboard')}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleRequirementChange = (fieldId: string, level: FieldRequirementLevel) => {
    setFormData((prev) => ({
      ...prev,
      intakeFields: {
        ...prev.intakeFields,
        [fieldId]: {
          ...prev.intakeFields[fieldId],
          requirement: level,
        },
      },
    }));
  };

  const handleLabelChange = (fieldId: string, label: string) => {
    setFormData((prev) => ({
      ...prev,
      intakeFields: {
        ...prev.intakeFields,
        [fieldId]: {
          ...prev.intakeFields[fieldId],
          label,
        },
      },
    }));
  };

  const handleToggleFeature = (featureKey: keyof typeof formData.features) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [featureKey]: !prev.features[featureKey],
      },
    }));
  };

  const handleAddCourt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourt.trim()) return;
    if (formData.courtList.includes(newCourt.trim())) return;
    setFormData((prev) => ({
      ...prev,
      courtList: [...prev.courtList, newCourt.trim()],
    }));
    setNewCourt('');
  };

  const handleRemoveCourt = (courtToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      courtList: prev.courtList.filter((c) => c !== courtToRemove),
    }));
  };

  const handleAddPracticeArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPracticeArea.trim()) return;
    if (formData.practiceAreas.includes(newPracticeArea.trim())) return;
    setFormData((prev) => ({
      ...prev,
      practiceAreas: [...prev.practiceAreas, newPracticeArea.trim()],
    }));
    setNewPracticeArea('');
  };

  const handleRemovePracticeArea = (areaToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      practiceAreas: prev.practiceAreas.filter((a) => a !== areaToRemove),
    }));
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFieldForm.name?.trim()) return;
    const newField: CustomFieldDefinition = {
      id: `custom_${Date.now()}`,
      name: customFieldForm.name.trim(),
      type: customFieldForm.type || 'text',
      requirement: customFieldForm.requirement || 'optional',
      helpText: customFieldForm.helpText?.trim() || '',
    };
    setFormData((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), newField],
    }));
    setIsAddingCustomField(false);
    setCustomFieldForm({ name: '', type: 'text', requirement: 'optional', helpText: '' });
  };

  const handleRemoveCustomField = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((f) => f.id !== id),
    }));
  };

  // Public Holidays CRUD handlers
  const configuredHolidays: PublicHolidayConfig[] = Array.isArray(formData.publicHolidays)
    ? formData.publicHolidays
    : DEFAULT_UGANDA_HOLIDAYS;

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDate = newHoliday.date.trim().slice(0, 10);
    const cleanName = newHoliday.name.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate) || !cleanName) {
      setHolidayError('Please select a valid date (YYYY-MM-DD) and enter a holiday name.');
      return;
    }

    const duplicate = configuredHolidays.some(
      (h) => h.date === cleanDate && h.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      setHolidayError(`"${cleanName}" on ${cleanDate} is already in the public holidays list.`);
      return;
    }

    const created: PublicHolidayConfig = {
      id: `hol-${cleanDate}-${Date.now()}`,
      date: cleanDate,
      name: cleanName,
      recurring: newHoliday.recurring,
      category: newHoliday.category,
    };

    const nextList = [...configuredHolidays, created].sort((a, b) => a.date.localeCompare(b.date));
    setFormData((prev) => ({ ...prev, publicHolidays: nextList }));
    setNewHoliday((prev) => ({ ...prev, name: '' }));
    setHolidayError(null);
  };

  const handleDeleteHoliday = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      publicHolidays: (prev.publicHolidays || DEFAULT_UGANDA_HOLIDAYS).filter((h) => h.id !== id),
    }));
    if (editingHolidayId === id) {
      setEditingHolidayId(null);
      setEditingHolidayDraft(null);
    }
  };

  const handleToggleHolidayRecurring = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      publicHolidays: (prev.publicHolidays || DEFAULT_UGANDA_HOLIDAYS).map((h) =>
        h.id === id ? { ...h, recurring: !h.recurring } : h
      ),
    }));
  };

  const handleStartEditHoliday = (holiday: PublicHolidayConfig) => {
    setEditingHolidayId(holiday.id);
    setEditingHolidayDraft({ ...holiday });
    setHolidayError(null);
  };

  const handleSaveEditHoliday = () => {
    if (!editingHolidayDraft) return;
    const cleanDate = editingHolidayDraft.date.trim().slice(0, 10);
    const cleanName = editingHolidayDraft.name.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate) || !cleanName) {
      setHolidayError('Holiday date and name are required.');
      return;
    }
    const nextList = configuredHolidays
      .map((h) =>
        h.id === editingHolidayDraft.id
          ? { ...editingHolidayDraft, date: cleanDate, name: cleanName }
          : h
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    setFormData((prev) => ({ ...prev, publicHolidays: nextList }));
    setEditingHolidayId(null);
    setEditingHolidayDraft(null);
    setHolidayError(null);
  };

  const handleResetDefaultHolidays = () => {
    setFormData((prev) => ({
      ...prev,
      publicHolidays: DEFAULT_UGANDA_HOLIDAYS.map((h) => ({ ...h })),
    }));
    setEditingHolidayId(null);
    setEditingHolidayDraft(null);
    setHolidayError(null);
  };

  // Presets
  const applyPreset = (preset: 'minimal' | 'standard' | 'strict') => {
    setFormData((prev) => {
      const updatedFields = { ...prev.intakeFields };
      if (preset === 'minimal') {
        Object.keys(updatedFields).forEach((k) => {
          if (['caseNumber', 'clientName', 'court'].includes(k)) {
            updatedFields[k].requirement = 'mandatory';
          } else if (['dateOfInstructions', 'leadAdvocate', 'caseType'].includes(k)) {
            updatedFields[k].requirement = 'optional';
          } else {
            updatedFields[k].requirement = 'optional';
          }
        });
      } else if (preset === 'strict') {
        Object.keys(updatedFields).forEach((k) => {
          if (['caseNumber', 'clientName', 'clientContact', 'clientNin', 'court', 'courtDivision', 'dateOfInstructions', 'leadAdvocate', 'caseType', 'subjectMatter'].includes(k)) {
            updatedFields[k].requirement = 'mandatory';
          } else {
            updatedFields[k].requirement = 'optional';
          }
        });
      } else {
        // Standard
        Object.keys(updatedFields).forEach((k) => {
          if (['caseNumber', 'clientName', 'court', 'dateOfInstructions', 'leadAdvocate', 'caseType'].includes(k)) {
            updatedFields[k].requirement = 'mandatory';
          } else {
            updatedFields[k].requirement = 'optional';
          }
        });
      }
      return { ...prev, intakeFields: updatedFields };
    });
  };

  const handleSave = () => {
    updateSystemSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center justify-center border border-purple-200 dark:border-purple-800 shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">System Settings &amp; Dynamic Entry Engine</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Super Admin Exclusive
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Update firm intake requirements, feature toggles, court lists, and branding <strong className="text-slate-700 dark:text-slate-200">without needing to rebuild or re-migrate</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save &amp; Deploy Changes</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-xs">
              <strong className="font-bold">System Configuration Updated Successfully!</strong>
              <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                All changes have been saved to the central database and immediately broadcasted to all firm workstations, laptops, and mobile phones.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-full">Live Synced</span>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('intake')}
          className={`px-3.5 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'intake'
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Case Intake &amp; Entry Requirements</span>
        </button>

        <button
          onClick={() => setActiveTab('features')}
          className={`px-3.5 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'features'
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Operational Feature Toggles</span>
        </button>

        <button
          onClick={() => setActiveTab('courts')}
          className={`px-3.5 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 whitespace-nowrap tabular-nums ${
            activeTab === 'courts'
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Courts &amp; Tribunals List ({formData.courtList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('practice')}
          className={`px-3.5 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 whitespace-nowrap tabular-nums ${
            activeTab === 'practice'
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Practice Areas ({formData.practiceAreas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('holidays')}
          className={`px-3.5 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 whitespace-nowrap tabular-nums ${
            activeTab === 'holidays'
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Public Holidays ({configuredHolidays.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-3.5 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Bell className="w-3.5 h-3.5 text-[#D99B26]" />
          <span>Notification Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('firm')}
          className={`px-3.5 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'firm'
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          <span>Firm Profile &amp; Metadata</span>
        </button>
      </div>

      {/* TAB 1: INTAKE & ENTRY REQUIREMENTS */}
      {activeTab === 'intake' && (
        <div className="space-y-4">
          {/* Quick Presets & Explanation */}
          <div className="bg-purple-50/70 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <strong className="text-purple-950 dark:text-purple-100 block text-sm font-bold">Dynamic Case Intake Requirements</strong>
              <p className="text-purple-900 dark:text-purple-300 text-xs mt-0.5">
                Set fields to <strong>Mandatory</strong> (strictly required for case saving), <strong>Optional</strong>, or <strong>Hidden</strong> (omitted from intake form).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-[11px] text-purple-800 dark:text-purple-300 font-semibold">Quick Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('minimal')}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-900 dark:text-purple-200 rounded-lg text-xs font-medium transition-colors"
              >
                Minimal
              </button>
              <button
                type="button"
                onClick={() => applyPreset('standard')}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-900 dark:text-purple-200 rounded-lg text-xs font-medium transition-colors"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => applyPreset('strict')}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-900 dark:text-purple-200 rounded-lg text-xs font-medium transition-colors"
              >
                Strict / Comprehensive
              </button>
            </div>
          </div>

          {/* Case Auto-Numbering Rule */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                  <Hash className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Case Auto-Numbering Engine</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  When enabled, automatically generates an official firm reference if no court suit number is provided during initial intake.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleFeature('enableCaseAutoNumbering')}
                className={`p-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                  formData.features.enableCaseAutoNumbering
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {formData.features.enableCaseAutoNumbering ? (
                  <ToggleRight className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-slate-400" />
                )}
                <span>{formData.features.enableCaseAutoNumbering ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>

            {formData.features.enableCaseAutoNumbering && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
                <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">MK Case No. Prefix:</label>
                <input
                  type="text"
                  value={formData.features.caseNumberPrefix}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      features: { ...prev.features, caseNumberPrefix: e.target.value },
                    }))
                  }
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-mono w-48 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="e.g. MKA/ or MKA/LIT/"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  Example generated: <code className="font-mono text-purple-700 dark:text-purple-300">{formData.features.caseNumberPrefix}{new Date().getFullYear()}/4891</code>
                </span>
              </div>
            )}
          </div>

          {/* Intake Field Configuration Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
            <div className="px-5 py-3.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">Standard Case Entry Fields &amp; Labels</span>
                <p className="text-[11px] text-purple-700 dark:text-purple-400 font-medium flex items-center gap-1 mt-0.5">
                  <Edit2 className="w-3 h-3 shrink-0" />
                  <span>Click any label to change its name. Your custom name will immediately appear on the case intake form.</span>
                </p>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0">{Object.keys(formData.intakeFields).length} Intake Fields Configured</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(() => {
                const PREFERRED_FIELD_ORDER = [
                  'branch',
                  'caseNumber',
                  'clientName',
                  'title',
                  'caseType',
                  'status',
                  'dateOfInstructions',
                  'nextHearingDate',
                  'court',
                  'district',
                  'personInConduct',
                  'fileLocation',
                  'target',
                  'subjectMatter',
                  'notes',
                  'yearOfClosure',
                  'billingStatus',
                  'paymentStatus',
                  'verdict',
                ];

                const sortedEntries = Object.entries(formData.intakeFields).sort(([a], [b]) => {
                  const idxA = PREFERRED_FIELD_ORDER.indexOf(a);
                  const idxB = PREFERRED_FIELD_ORDER.indexOf(b);
                  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                  if (idxA !== -1) return -1;
                  if (idxB !== -1) return 1;
                  return a.localeCompare(b);
                });

                return sortedEntries.map(([key, field], index) => (
                  <div key={key} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500 font-bold w-5">
                          #{index + 1}
                        </span>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleLabelChange(key, e.target.value)}
                            className="text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-purple-50/40 dark:hover:bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 focus:bg-white dark:focus:bg-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-colors pr-7 w-56 sm:w-64"
                            title="Click to rename this field label"
                          />
                          <Edit2 className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
                        </div>
                        {field.isSystem && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                            Core Field
                          </span>
                        )}
                      </div>
                      {field.helpText && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7">{field.helpText}</p>
                      )}
                    </div>

                    {/* Tri-state Requirement Pill Selector */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0 text-xs">
                      <button
                        type="button"
                        onClick={() => handleRequirementChange(key, 'mandatory')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                          field.requirement === 'mandatory'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                        }`}
                      >
                        * Mandatory
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRequirementChange(key, 'optional')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          field.requirement === 'optional'
                            ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-2xs border border-slate-200 dark:border-slate-600'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                        }`}
                      >
                        Optional
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRequirementChange(key, 'hidden')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                          field.requirement === 'hidden'
                            ? 'bg-slate-800 dark:bg-slate-950 text-slate-200 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                        }`}
                      >
                        <EyeOff className="w-3 h-3" />
                        <span>Hidden</span>
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Custom User-Defined Fields */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Custom Firm Intake Fields</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Need additional custom fields for your firm? Add arbitrary fields here without modifying code.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingCustomField(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-900 dark:text-purple-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Field</span>
              </button>
            </div>

            {isAddingCustomField && (
              <form onSubmit={handleAddCustomField} className="bg-purple-50/50 dark:bg-purple-900/15 border border-purple-200 dark:border-purple-800/80 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Field Name / Label:</label>
                    <input
                      type="text"
                      required
                      value={customFieldForm.name}
                      onChange={(e) => setCustomFieldForm({ ...customFieldForm, name: e.target.value })}
                      placeholder="e.g. Arbitration Clause Present"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Field Type:</label>
                    <select
                      value={customFieldForm.type}
                      onChange={(e) => setCustomFieldForm({ ...customFieldForm, type: e.target.value as any })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="text">Text (Single Line)</option>
                      <option value="number">Numeric Quantum</option>
                      <option value="date">Calendar Date</option>
                      <option value="boolean">Yes / No Switch</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Requirement Level:</label>
                    <select
                      value={customFieldForm.requirement}
                      onChange={(e) => setCustomFieldForm({ ...customFieldForm, requirement: e.target.value as any })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="optional">Optional</option>
                      <option value="mandatory">Mandatory (*)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomField(false)}
                    className="px-3 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1 text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white rounded-lg shadow-2xs"
                  >
                    Save Custom Field
                  </button>
                </div>
              </form>
            )}

            {formData.customFields && formData.customFields.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {formData.customFields.map((f) => (
                  <div key={f.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <div>
                      <strong className="text-slate-800 dark:text-slate-100 font-bold">{f.name}</strong>
                      <span className="ml-2 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded-full font-mono uppercase">
                        {f.type}
                      </span>
                      <span className="ml-2 text-[10px] text-slate-500 dark:text-slate-400">
                        ({f.requirement})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(f.id)}
                      className="p-1 text-rose-600 dark:text-rose-400 hover:text-rose-800 rounded hover:bg-rose-50 dark:hover:bg-rose-900/30"
                      title="Delete custom field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500">
                No custom fields defined yet. Standard intake fields are active.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: OPERATIONAL FEATURE TOGGLES */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          <div className="bg-indigo-50/70 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-5 text-xs">
            <strong className="text-indigo-950 dark:text-indigo-100 block text-sm font-bold">Operational Modules &amp; Feature Flags</strong>
            <p className="text-indigo-900 dark:text-indigo-300 text-xs mt-0.5">
              Turn modules on or off across the law firm. Changes apply instantly to all navigation menus and client interfaces.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <strong className="text-slate-900 dark:text-slate-100 text-xs block font-bold">Cause List Diary &amp; Court Fixtures</strong>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Track court appearances, mentions, hearings, presiding bench officers, and print printable daily cause lists.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('enableCauseList')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.enableCauseList
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {formData.features.enableCauseList ? <ToggleRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <strong className="text-slate-900 dark:text-slate-100 text-xs block font-bold">Pleadings &amp; Document Repository</strong>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Manage digital filings, affidavits, chamber summons, and court registry stamped pleadings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('enableDocuments')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.enableDocuments
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {formData.features.enableDocuments ? <ToggleRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <strong className="text-slate-900 dark:text-slate-100 text-xs block font-bold">Conflict of Interest Clearance Engine</strong>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Real-time screening against existing litigants, adverse parties, and opposing firms across all regional offices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('enableConflicts')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.enableConflicts
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {formData.features.enableConflicts ? <ToggleRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <strong className="text-slate-900 dark:text-slate-100 text-xs block font-bold">Regional Branch Circuits &amp; Sync Hub</strong>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Multi-branch synchronization monitoring between Kampala HQ, Jinja, Mbarara, and Gulu circuits.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('enableBranchSync')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.enableBranchSync
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {formData.features.enableBranchSync ? <ToggleRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>

            {/* Feature 5 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <strong className="text-slate-900 dark:text-slate-100 text-xs block font-bold">Litigation Analytics &amp; Win/Loss Ratios</strong>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Division breakdowns, litigation outcome statistics, and branch case load performance metrics.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('enableAnalytics')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.enableAnalytics
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {formData.features.enableAnalytics ? <ToggleRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>

            {/* Feature 6 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <strong className="text-slate-900 dark:text-slate-100 text-xs block font-bold">Physical Registry Cabinet Tracking</strong>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Track physical paper file box locations, registry transfers, and file custody sign-outs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('enablePhysicalFileTracking')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.enablePhysicalFileTracking
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {formData.features.enablePhysicalFileTracking ? <ToggleRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>

            {/* Security Policy 1: Password Change on First Login */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <div className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <strong className="text-slate-900 dark:text-slate-100 text-xs block font-bold">Mandatory Password Change on First Login</strong>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Requires newly invited advocates with temporary passwords to choose a permanent secure password before accessing files.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('requirePasswordChangeOnFirstLogin')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.requirePasswordChangeOnFirstLogin
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {formData.features.requirePasswordChangeOnFirstLogin ? <ToggleRight className="w-6 h-6 text-blue-600 dark:text-blue-400" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>

            {/* Security Policy 2: Public Registration (Strict Lock) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <strong className="text-slate-900 dark:text-slate-100 text-xs block font-bold">Allow Public Self-Registration</strong>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  When OFF (recommended), only Super Admin can add authorized legal staff. No public registration page is accessible.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('allowPublicRegistration')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.allowPublicRegistration
                    ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {formData.features.allowPublicRegistration ? <ToggleRight className="w-6 h-6 text-amber-600 dark:text-amber-400" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COURTS & TRIBUNALS LIST */}
      {activeTab === 'courts' && (
        <div className="space-y-4">
          <div className="bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <strong className="text-blue-950 dark:text-blue-100 block text-sm font-bold">Judicial Forums, Courts &amp; Tribunals</strong>
              <p className="text-blue-900 dark:text-blue-300 text-xs mt-0.5">
                Add regional circuits, international bodies, or specialized arbitration panels to your firm dropdowns.
              </p>
            </div>

            <form onSubmit={handleAddCourt} className="flex items-center gap-2">
              <input
                type="text"
                value={newCourt}
                onChange={(e) => setNewCourt(e.target.value)}
                placeholder="e.g. Jinja High Court Circuit"
                className="px-3 py-1.5 text-xs border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none w-52 sm:w-64"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#0B132B] hover:bg-[#000065] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors shrink-0 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Court</span>
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow divide-y divide-slate-100 dark:divide-slate-800">
            {formData.courtList.map((courtName, idx) => (
              <div key={courtName} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono tabular-nums text-[11px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{courtName}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveCourt(courtName)}
                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                  title="Remove court option"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PRACTICE AREAS */}
      {activeTab === 'practice' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <strong className="text-emerald-950 dark:text-emerald-100 block text-sm font-bold">Practice Areas &amp; Substantive Matter Classifications</strong>
              <p className="text-emerald-900 dark:text-emerald-300 text-xs mt-0.5">
                Customize the law firm&apos;s legal disciplines and case taxonomy.
              </p>
            </div>

            <form onSubmit={handleAddPracticeArea} className="flex items-center gap-2">
              <input
                type="text"
                value={newPracticeArea}
                onChange={(e) => setNewPracticeArea(e.target.value)}
                placeholder="e.g. Aviation &amp; Maritime Law"
                className="px-3 py-1.5 text-xs border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none w-52 sm:w-64"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors shrink-0 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Area</span>
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow divide-y divide-slate-100 dark:divide-slate-800">
            {formData.practiceAreas.map((area, idx) => (
              <div key={area} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-mono tabular-nums text-[11px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{area}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemovePracticeArea(area)}
                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                  title="Remove practice area"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: FIRM PROFILE & METADATA */}
      {/* TAB 5: PUBLIC HOLIDAYS CONFIGURATION */}
      {activeTab === 'holidays' && (() => {
        const filteredHolidays = [...configuredHolidays]
          .sort((a, b) => a.date.localeCompare(b.date))
          .filter((h) => {
            if (holidayCategoryFilter !== 'All' && h.category !== holidayCategoryFilter) return false;
            const q = holidaySearch.trim().toLowerCase();
            if (!q) return true;
            return (
              h.name.toLowerCase().includes(q) ||
              h.date.includes(q) ||
              h.category.toLowerCase().includes(q)
            );
          });

        const getCategoryBadgeClass = (cat: PublicHolidayConfig['category']) => {
          if (cat === 'Statutory') {
            return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
          }
          if (cat === 'Religious') {
            return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
          }
          return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
        };

        return (
          <div className="space-y-4">
            {/* Header Info & Reset Action */}
            <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/70 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div>
                <strong className="text-amber-950 dark:text-amber-100 block text-sm font-bold">
                  Uganda Public Holidays &amp; Leave Exclusion Calendar
                </strong>
                <p className="text-amber-900 dark:text-amber-200/90 text-xs mt-0.5 leading-relaxed">
                  Dates listed here — together with Saturdays and Sundays — are automatically skipped when staff apply for leave or when HR calculates net annual leave deductions. Mark fixed dates as <strong>Recurring</strong> to repeat every year; leave movable dates (e.g., Good Friday, Easter Monday, Eid) as one-off dates.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetDefaultHolidays}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-semibold transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default Uganda Holidays</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold transition cursor-pointer shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Holidays</span>
                </button>
              </div>
            </div>

            {holidayError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{holidayError}</span>
              </div>
            )}

            {/* Add Public Holiday Form */}
            <form
              onSubmit={handleAddHoliday}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Add Public Holiday or Gazetted Non-Working Day</span>
                </h4>
                <span className="text-[11px] text-slate-400">Applies immediately upon Save</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                <div className="lg:col-span-3">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Date (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    required
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday((p) => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="lg:col-span-4">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Holiday Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newHoliday.name}
                    onChange={(e) => setNewHoliday((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Presidential Inauguration Day"
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={newHoliday.category}
                    onChange={(e) =>
                      setNewHoliday((p) => ({
                        ...p,
                        category: e.target.value as PublicHolidayConfig['category'],
                      }))
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Statutory">Statutory</option>
                    <option value="Religious">Religious</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="lg:col-span-3 flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none py-2">
                    <input
                      type="checkbox"
                      checked={newHoliday.recurring}
                      onChange={(e) =>
                        setNewHoliday((p) => ({ ...p, recurring: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span>Recurring yearly</span>
                  </label>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Configured Holidays List */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['All', 'Statutory', 'Religious', 'Custom'] as const).map((cat) => {
                    const count =
                      cat === 'All'
                        ? configuredHolidays.length
                        : configuredHolidays.filter((h) => h.category === cat).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setHolidayCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer tabular-nums ${
                          holidayCategoryFilter === cat
                            ? 'bg-purple-700 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={holidaySearch}
                  onChange={(e) => setHolidaySearch(e.target.value)}
                  placeholder="Filter by holiday name or date..."
                  className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none sm:w-64"
                />
              </div>

              {filteredHolidays.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No configured public holidays match this filter. Add a holiday above or reset to defaults.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredHolidays.map((h) => {
                    const isEditing = editingHolidayId === h.id && editingHolidayDraft;
                    if (isEditing && editingHolidayDraft) {
                      return (
                        <div
                          key={h.id}
                          className="p-3.5 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col lg:flex-row lg:items-center gap-2.5 text-xs"
                        >
                          <input
                            type="date"
                            value={editingHolidayDraft.date}
                            onChange={(e) =>
                              setEditingHolidayDraft((d) => (d ? { ...d, date: e.target.value } : d))
                            }
                            className="px-2.5 py-1.5 font-mono tabular-nums border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                          />
                          <input
                            type="text"
                            value={editingHolidayDraft.name}
                            onChange={(e) =>
                              setEditingHolidayDraft((d) => (d ? { ...d, name: e.target.value } : d))
                            }
                            className="flex-1 px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                          />
                          <select
                            value={editingHolidayDraft.category}
                            onChange={(e) =>
                              setEditingHolidayDraft((d) =>
                                d
                                  ? {
                                      ...d,
                                      category: e.target.value as PublicHolidayConfig['category'],
                                    }
                                  : d
                              )
                            }
                            className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                          >
                            <option value="Statutory">Statutory</option>
                            <option value="Religious">Religious</option>
                            <option value="Custom">Custom</option>
                          </select>
                          <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={editingHolidayDraft.recurring}
                              onChange={(e) =>
                                setEditingHolidayDraft((d) =>
                                  d ? { ...d, recurring: e.target.checked } : d
                                )
                              }
                            />
                            <span>Recurring</span>
                          </label>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={handleSaveEditHoliday}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Done</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingHolidayId(null);
                                setEditingHolidayDraft(null);
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={h.id}
                        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg tabular-nums shrink-0">
                            {h.date}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {h.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${getCategoryBadgeClass(
                              h.category
                            )}`}
                          >
                            {h.category}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleHolidayRecurring(h.id)}
                            title="Toggle recurring annual vs one-off date"
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer ${
                              h.recurring
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <Repeat className="w-3 h-3" />
                            <span>{h.recurring ? 'Recurring Annual' : 'One-Off / Movable'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditHoliday(h)}
                            className="p-1.5 text-slate-500 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition cursor-pointer"
                            title="Edit holiday"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHoliday(h.id)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition cursor-pointer"
                            title="Remove holiday"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB 6: NOTIFICATION RULES CONFIGURATION */}
      {activeTab === 'notifications' && (() => {
        const notifRules: NotificationRulesConfig = {
          ...DEFAULT_NOTIFICATION_RULES,
          ...(formData.notificationRules || {}),
        };

        const toggleNotificationRule = (
          key: Exclude<keyof NotificationRulesConfig, 'hearingLeadDays'>
        ) => {
          setFormData((prev) => ({
            ...prev,
            notificationRules: {
              ...DEFAULT_NOTIFICATION_RULES,
              ...(prev.notificationRules || {}),
              [key]: !(prev.notificationRules?.[key] ?? DEFAULT_NOTIFICATION_RULES[key]),
            },
          }));
        };

        const setLeadDays = (days: number) => {
          const clamped = Math.max(1, Math.min(60, Math.round(days || 7)));
          setFormData((prev) => ({
            ...prev,
            notificationRules: {
              ...DEFAULT_NOTIFICATION_RULES,
              ...(prev.notificationRules || {}),
              hearingLeadDays: clamped,
            },
          }));
        };

        const resetNotificationRules = () => {
          setFormData((prev) => ({
            ...prev,
            notificationRules: { ...DEFAULT_NOTIFICATION_RULES },
          }));
        };

        return (
          <div className="space-y-5 text-xs">
            {/* Overview Banner */}
            <div className="bg-[#000065] text-white rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#0F0F80]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#D99B26]" />
                  <h4 className="font-display text-sm font-bold tracking-tight">
                    Firm Notification Rules &amp; Unread Alert Governance
                  </h4>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Control how unread notifications pop up, how far ahead upcoming court appearances alert staff, and how role-restricted financial workflow notices are scoped. Click <strong>Save &amp; Publish Changes</strong> above to apply firm-wide.
                </p>
              </div>
              <button
                type="button"
                onClick={resetNotificationRules}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 self-start md:self-center"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#D99B26]" />
                <span>Restore Rule Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Persistent Popup & Read Behavior */}
              <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <div>
                  <h5 className="font-display text-sm font-bold text-[#000065] dark:text-white">
                    Unread Popup &amp; Read Behavior
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Enforces persistent delivery of unread notices until acknowledged.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#000065] dark:text-slate-100">
                        Always Pop Up Latest Unread Notification Until Read
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Keeps the highest-priority unread notification pinned on screen with no auto-dismiss timer until the user clicks Mark Read or opens it.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNotificationRule('persistentUnreadPopup')}
                      className="shrink-0 cursor-pointer"
                      aria-label="Toggle persistent unread popup"
                    >
                      {notifRules.persistentUnreadPopup ? (
                        <ToggleRight className="w-8 h-8 text-[#D99B26]" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  </div>

                  <div className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#000065] dark:text-slate-100">
                        Mark Notification Read Automatically on Open
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Clicking &ldquo;Open &amp; Read&rdquo; or selecting an alert in the header bell marks it read while navigating to the matter or queue.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNotificationRule('markReadOnOpen')}
                      className="shrink-0 cursor-pointer"
                      aria-label="Toggle mark read on open"
                    >
                      {notifRules.markReadOnOpen ? (
                        <ToggleRight className="w-8 h-8 text-[#D99B26]" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  </div>

                  <div className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#000065] dark:text-slate-100">
                        Allow Bulk &ldquo;Mark All Read&rdquo; Action
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Disable to require staff to review and acknowledge each unread notification individually.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNotificationRule('allowMarkAllRead')}
                      className="shrink-0 cursor-pointer"
                      aria-label="Toggle allow mark all read"
                    >
                      {notifRules.allowMarkAllRead ? (
                        <ToggleRight className="w-8 h-8 text-[#D99B26]" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Court Deadlines, Scope & RBAC Channels */}
              <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <div>
                  <h5 className="font-display text-sm font-bold text-[#000065] dark:text-white">
                    Alert Channels, Lead Window &amp; Role Scope
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Controls which modules trigger alerts and enforces branch &amp; RBAC boundaries.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#000065] dark:text-slate-100">
                        Upcoming Court Hearings &amp; Deadlines
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Triggers alerts for scheduled hearings and active case deadlines within the lead window.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNotificationRule('enableHearingAlerts')}
                      className="shrink-0 cursor-pointer"
                      aria-label="Toggle court hearing alerts"
                    >
                      {notifRules.enableHearingAlerts ? (
                        <ToggleRight className="w-8 h-8 text-[#D99B26]" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  </div>

                  {/* Lead Time Window Control */}
                  <div className="py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-semibold text-[#000065] dark:text-slate-100">
                        Hearing &amp; Deadline Lead-Time Window
                      </label>
                      <span className="font-mono font-bold text-[#000065] dark:text-[#D99B26] tabular-nums">
                        {notifRules.hearingLeadDays} day{notifRules.hearingLeadDays === 1 ? '' : 's'} ahead
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {[3, 7, 14, 30].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setLeadDays(preset)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold tabular-nums transition cursor-pointer border ${
                            notifRules.hearingLeadDays === preset
                              ? 'bg-[#000065] text-white border-[#000065]'
                              : 'bg-[#F4F6F9] dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-[#E2E8F0] dark:border-slate-700 hover:border-[#000065]'
                          }`}
                        >
                          {preset} days
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={notifRules.hearingLeadDays}
                        onChange={(e) => setLeadDays(Number(e.target.value))}
                        className="w-20 h-7 px-2 text-xs font-mono tabular-nums border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-[#000065] dark:text-white focus:outline-none focus:border-[#000065]"
                      />
                    </div>
                  </div>

                  <div className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#000065] dark:text-slate-100">
                        Exclude Past / Expired Hearing Dates
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Prevents historical scheduled court rows from triggering unread popups.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNotificationRule('excludePastHearings')}
                      className="shrink-0 cursor-pointer"
                      aria-label="Toggle exclude past hearings"
                    >
                      {notifRules.excludePastHearings ? (
                        <ToggleRight className="w-8 h-8 text-[#D99B26]" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  </div>

                  <div className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#000065] dark:text-slate-100">
                        Scope Matter &amp; Hearing Alerts to Active Branch
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Limits staff deadline alerts to their assigned branch or the currently selected branch filter.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNotificationRule('branchScopedAlerts')}
                      className="shrink-0 cursor-pointer"
                      aria-label="Toggle branch scoped alerts"
                    >
                      {notifRules.branchScopedAlerts ? (
                        <ToggleRight className="w-8 h-8 text-[#D99B26]" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  </div>

                  <div className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#000065] dark:text-slate-100">
                          Cash Requisition Decision Alerts
                        </p>
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                          RBAC Restricted
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Notifies authorized workflow roles on Approved, Reviewed, and Denied requisitions.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNotificationRule('enableCashRequisitionAlerts')}
                      className="shrink-0 cursor-pointer"
                      aria-label="Toggle cash requisition alerts"
                    >
                      {notifRules.enableCashRequisitionAlerts ? (
                        <ToggleRight className="w-8 h-8 text-[#D99B26]" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  </div>

                  <div className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#000065] dark:text-slate-100">
                          Pending Approval Queue Alerts
                        </p>
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                          RBAC Restricted
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Alerts authorized approvers whenever pending workflow items require executive sign-off.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNotificationRule('enableApprovalAlerts')}
                      className="shrink-0 cursor-pointer"
                      aria-label="Toggle approval queue alerts"
                    >
                      {notifRules.enableApprovalAlerts ? (
                        <ToggleRight className="w-8 h-8 text-[#D99B26]" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === 'firm' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Firm Metadata &amp; Regional Header Configuration</h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Updates branding, print sheets, and notification footers across the application.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Official Firm Name:</label>
              <input
                type="text"
                value={formData.firm.firmName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firm: { ...prev.firm, firmName: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Firm Tagline / Subtitle:</label>
              <input
                type="text"
                value={formData.firm.firmTagline}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firm: { ...prev.firm, firmTagline: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Official Registry / Notice Email:</label>
              <input
                type="email"
                value={formData.firm.officialEmail}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firm: { ...prev.firm, officialEmail: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Official Registry Phone / Hotline:</label>
              <input
                type="text"
                value={formData.firm.officialPhone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firm: { ...prev.firm, officialPhone: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none tabular-nums"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Headquarters Physical Address:</label>
              <input
                type="text"
                value={formData.firm.headquartersAddress}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firm: { ...prev.firm, headquartersAddress: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Default Valuation Currency:</label>
              <select
                value={formData.firm.currencySymbol}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firm: { ...prev.firm, currencySymbol: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="UGX">UGX (Ugandan Shilling)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Primary Judicial Jurisdiction:</label>
              <input
                type="text"
                value={formData.firm.jurisdiction}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firm: { ...prev.firm, jurisdiction: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Actions Bar at Bottom */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            Last saved: <strong className="text-white">{formData.lastUpdated ? new Date(formData.lastUpdated).toLocaleDateString() : 'Never'}</strong> by{' '}
            <strong className="text-purple-300">{formData.updatedBy || currentUser.name}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save &amp; Broadcast Changes</span>
          </button>
        </div>
      </div>

    </div>
  );
};
