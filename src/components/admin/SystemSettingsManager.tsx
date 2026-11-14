import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { IntakeFieldConfig, CustomFieldDefinition, FieldRequirementLevel } from '../../types';
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
} from 'lucide-react';

import { isUserAdmin } from '../../lib/supabase';

export const SystemSettingsManager: React.FC = () => {
  const { systemSettings, updateSystemSettings, currentUser, userPermissions, setActiveTab: setMainTab } = useApp();
  const isSuperAdmin = isUserAdmin(currentUser) || userPermissions.canManageSettings;

  const [activeTab, setActiveTab] = useState<'intake' | 'features' | 'courts' | 'practice' | 'firm'>('intake');
  const [formData, setFormData] = useState(systemSettings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [newCourt, setNewCourt] = useState('');
  const [newPracticeArea, setNewPracticeArea] = useState('');

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
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl text-center shadow-xs">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">Access Restricted</h2>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          System Settings &amp; Dynamic Entry Engine is strictly reserved for Super Administrators and Managing Partners.
        </p>
        <button
          onClick={() => setMainTab('dashboard')}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
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
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200 shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">System Settings &amp; Dynamic Entry Engine</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                Super Admin Exclusive
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Update firm intake requirements, feature toggles, court lists, and branding <strong>without needing to rebuild or re-migrate</strong>.
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
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <strong className="font-bold">System Configuration Updated Successfully!</strong>
              <p className="text-emerald-700 mt-0.5">
                All changes have been saved to the central database and immediately broadcasted to all firm workstations, laptops, and mobile phones.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">Live Synced</span>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex items-center gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('intake')}
          className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'intake'
              ? 'bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-purple-600" />
          <span>Case Intake &amp; Entry Requirements</span>
        </button>

        <button
          onClick={() => setActiveTab('features')}
          className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'features'
              ? 'bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>Operational Feature Toggles</span>
        </button>

        <button
          onClick={() => setActiveTab('courts')}
          className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'courts'
              ? 'bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-blue-600" />
          <span>Courts &amp; Tribunals List ({formData.courtList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('practice')}
          className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'practice'
              ? 'bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Practice Areas ({formData.practiceAreas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('firm')}
          className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'firm'
              ? 'bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-slate-600" />
          <span>Firm Profile &amp; Metadata</span>
        </button>
      </div>

      {/* TAB 1: INTAKE & ENTRY REQUIREMENTS */}
      {activeTab === 'intake' && (
        <div className="space-y-4">
          {/* Quick Presets & Explanation */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <strong className="text-purple-950 block text-sm font-bold">Dynamic Case Intake Requirements</strong>
              <p className="text-purple-900 text-xs mt-0.5">
                Set fields to <strong>Mandatory</strong> (strictly required for case saving), <strong>Optional</strong>, or <strong>Hidden</strong> (omitted from intake form).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-purple-800 font-semibold">Quick Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('minimal')}
                className="px-2.5 py-1 bg-white border border-purple-200 hover:bg-purple-100 text-purple-900 rounded-lg text-xs font-medium"
              >
                Minimal
              </button>
              <button
                type="button"
                onClick={() => applyPreset('standard')}
                className="px-2.5 py-1 bg-white border border-purple-200 hover:bg-purple-100 text-purple-900 rounded-lg text-xs font-medium"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => applyPreset('strict')}
                className="px-2.5 py-1 bg-white border border-purple-200 hover:bg-purple-100 text-purple-900 rounded-lg text-xs font-medium"
              >
                Strict / Comprehensive
              </button>
            </div>
          </div>

          {/* Case Auto-Numbering Rule */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <Hash className="w-4 h-4 text-purple-600" />
                  <span>Case Auto-Numbering Engine</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  When enabled, automatically generates an official firm reference if no court suit number is provided during initial intake.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleFeature('enableCaseAutoNumbering')}
                className={`p-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                  formData.features.enableCaseAutoNumbering
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {formData.features.enableCaseAutoNumbering ? (
                  <ToggleRight className="w-5 h-5 text-purple-600" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-slate-400" />
                )}
                <span>{formData.features.enableCaseAutoNumbering ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>

            {formData.features.enableCaseAutoNumbering && (
              <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
                <label className="text-xs text-slate-700 font-medium">MK Case No. Prefix:</label>
                <input
                  type="text"
                  value={formData.features.caseNumberPrefix}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      features: { ...prev.features, caseNumberPrefix: e.target.value },
                    }))
                  }
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono w-48 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="e.g. MKA/ or MKA/LIT/"
                />
                <span className="text-[11px] text-slate-500">
                  Example generated: <code className="font-mono text-purple-700">{formData.features.caseNumberPrefix}{new Date().getFullYear()}/4891</code>
                </span>
              </div>
            )}
          </div>

          {/* Intake Field Configuration Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
            <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <span className="font-bold text-slate-800 text-xs">Standard Case Entry Fields &amp; Labels</span>
                <p className="text-[11px] text-purple-700 font-medium flex items-center gap-1 mt-0.5">
                  <Edit2 className="w-3 h-3 shrink-0" />
                  <span>Click any label to change its name. Your custom name will immediately appear on the case intake form.</span>
                </p>
              </div>
              <span className="text-[11px] text-slate-500 tabular-nums shrink-0">{Object.keys(formData.intakeFields).length} Intake Fields Configured</span>
            </div>

            <div className="divide-y divide-slate-100">
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
                  <div key={key} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 font-bold w-5">
                          #{index + 1}
                        </span>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleLabelChange(key, e.target.value)}
                            className="text-xs font-bold text-slate-900 bg-white hover:bg-purple-50/40 px-2.5 py-1 rounded-lg border border-slate-300 hover:border-purple-400 focus:bg-white focus:border-purple-600 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-colors pr-7 w-56 sm:w-64"
                            title="Click to rename this field label"
                          />
                          <Edit2 className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
                        </div>
                        {field.isSystem && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                            Core Field
                          </span>
                        )}
                      </div>
                      {field.helpText && (
                        <p className="text-[11px] text-slate-500 pl-7">{field.helpText}</p>
                      )}
                    </div>

                    {/* Tri-state Requirement Pill Selector */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0 text-xs">
                      <button
                        type="button"
                        onClick={() => handleRequirementChange(key, 'mandatory')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                          field.requirement === 'mandatory'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        * Mandatory
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRequirementChange(key, 'optional')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          field.requirement === 'optional'
                            ? 'bg-white text-slate-800 shadow-2xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Optional
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRequirementChange(key, 'hidden')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                          field.requirement === 'hidden'
                            ? 'bg-slate-800 text-slate-200 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
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
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Custom Firm Intake Fields</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Need additional custom fields for your firm? Add arbitrary fields here without modifying code.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingCustomField(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Field</span>
              </button>
            </div>

            {isAddingCustomField && (
              <form onSubmit={handleAddCustomField} className="bg-purple-50/50 border border-purple-200 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Field Name / Label:</label>
                    <input
                      type="text"
                      required
                      value={customFieldForm.name}
                      onChange={(e) => setCustomFieldForm({ ...customFieldForm, name: e.target.value })}
                      placeholder="e.g. Arbitration Clause Present"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Field Type:</label>
                    <select
                      value={customFieldForm.type}
                      onChange={(e) => setCustomFieldForm({ ...customFieldForm, type: e.target.value as any })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                    >
                      <option value="text">Text (Single Line)</option>
                      <option value="number">Numeric Quantum</option>
                      <option value="date">Calendar Date</option>
                      <option value="boolean">Yes / No Switch</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Requirement Level:</label>
                    <select
                      value={customFieldForm.requirement}
                      onChange={(e) => setCustomFieldForm({ ...customFieldForm, requirement: e.target.value as any })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
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
                    className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
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
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {formData.customFields.map((f) => (
                  <div key={f.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div>
                      <strong className="text-slate-800 font-bold">{f.name}</strong>
                      <span className="ml-2 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-mono uppercase">
                        {f.type}
                      </span>
                      <span className="ml-2 text-[10px] text-slate-500">
                        ({f.requirement})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(f.id)}
                      className="p-1 text-rose-600 hover:text-rose-800 rounded hover:bg-rose-50"
                      title="Delete custom field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-400">
                No custom fields defined yet. Standard intake fields are active.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: OPERATIONAL FEATURE TOGGLES */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 text-xs">
            <strong className="text-indigo-950 block text-sm font-bold">Operational Modules &amp; Feature Flags</strong>
            <p className="text-indigo-900 text-xs mt-0.5">
              Turn modules on or off across the law firm. Changes apply instantly to all navigation menus and client interfaces.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feature 1 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <strong className="text-slate-900 text-xs block font-bold">Cause List Diary &amp; Court Fixtures</strong>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Track court appearances, mentions, hearings, presiding bench officers, and print printable daily cause lists.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('enableCauseList')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.enableCauseList
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {formData.features.enableCauseList ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <strong className="text-slate-900 text-xs block font-bold">Pleadings &amp; Document Repository</strong>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Manage digital filings, affidavits, chamber summons, and court registry stamped pleadings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('enableDocuments')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.enableDocuments
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {formData.features.enableDocuments ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <strong className="text-slate-900 text-xs block font-bold">Conflict of Interest Clearance Engine</strong>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Real-time screening against existing litigants, adverse parties, and opposing firms across all regional offices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('enableConflicts')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.enableConflicts
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {formData.features.enableConflicts ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>

            {/* Feature 4 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <strong className="text-slate-900 text-xs block font-bold">Regional Branch Circuits &amp; Sync Hub</strong>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Multi-branch synchronization monitoring between Kampala HQ, Jinja, Mbarara, and Gulu circuits.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('enableBranchSync')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.enableBranchSync
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {formData.features.enableBranchSync ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>

            {/* Feature 5 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <strong className="text-slate-900 text-xs block font-bold">Litigation Analytics &amp; Win/Loss Ratios</strong>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Division breakdowns, litigation outcome statistics, and branch case load performance metrics.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('enableAnalytics')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.enableAnalytics
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {formData.features.enableAnalytics ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>

            {/* Feature 6 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <strong className="text-slate-900 text-xs block font-bold">Physical Registry Cabinet Tracking</strong>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Track physical paper file box locations, registry transfers, and file custody sign-outs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('enablePhysicalFileTracking')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.enablePhysicalFileTracking
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {formData.features.enablePhysicalFileTracking ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>

            {/* Security Policy 1: Password Change on First Login */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <div className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-600" />
                  <strong className="text-slate-900 text-xs block font-bold">Mandatory Password Change on First Login</strong>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Requires newly invited advocates with temporary passwords to choose a permanent secure password before accessing files.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('requirePasswordChangeOnFirstLogin')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.requirePasswordChangeOnFirstLogin
                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {formData.features.requirePasswordChangeOnFirstLogin ? <ToggleRight className="w-6 h-6 text-blue-600" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>

            {/* Security Policy 2: Public Registration (Strict Lock) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 flex items-start justify-between shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-1 pr-3">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <strong className="text-slate-900 text-xs block font-bold">Allow Public Self-Registration</strong>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  When OFF (recommended), only Super Admin can add authorized legal staff. No public registration page is accessible.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFeature('allowPublicRegistration')}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  formData.features.allowPublicRegistration
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {formData.features.allowPublicRegistration ? <ToggleRight className="w-6 h-6 text-amber-600" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COURTS & TRIBUNALS LIST */}
      {activeTab === 'courts' && (
        <div className="space-y-4">
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <strong className="text-blue-950 block text-sm font-bold">Judicial Forums, Courts &amp; Tribunals</strong>
              <p className="text-blue-900 text-xs mt-0.5">
                Add regional circuits, international bodies, or specialized arbitration panels to your firm dropdowns.
              </p>
            </div>

            <form onSubmit={handleAddCourt} className="flex items-center gap-2">
              <input
                type="text"
                value={newCourt}
                onChange={(e) => setNewCourt(e.target.value)}
                placeholder="e.g. Jinja High Court Circuit"
                className="px-3 py-1.5 text-xs border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none w-52 sm:w-64"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors shrink-0 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Court</span>
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow divide-y divide-slate-100">
            {formData.courtList.map((courtName, idx) => (
              <div key={courtName} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 font-mono tabular-nums text-[11px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800">{courtName}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveCourt(courtName)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
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
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <strong className="text-emerald-950 block text-sm font-bold">Practice Areas &amp; Substantive Matter Classifications</strong>
              <p className="text-emerald-900 text-xs mt-0.5">
                Customize the law firm&apos;s legal disciplines and case taxonomy.
              </p>
            </div>

            <form onSubmit={handleAddPracticeArea} className="flex items-center gap-2">
              <input
                type="text"
                value={newPracticeArea}
                onChange={(e) => setNewPracticeArea(e.target.value)}
                placeholder="e.g. Aviation &amp; Maritime Law"
                className="px-3 py-1.5 text-xs border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none w-52 sm:w-64"
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

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow divide-y divide-slate-100">
            {formData.practiceAreas.map((area, idx) => (
              <div key={area} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 font-mono tabular-nums text-[11px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800">{area}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemovePracticeArea(area)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
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
      {activeTab === 'firm' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Firm Metadata &amp; Regional Header Configuration</h4>
            <p className="text-slate-500 text-xs mt-0.5">
              Updates branding, print sheets, and notification footers across the application.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Official Firm Name:</label>
              <input
                type="text"
                value={formData.firm.firmName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firm: { ...prev.firm, firmName: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Firm Tagline / Subtitle:</label>
              <input
                type="text"
                value={formData.firm.firmTagline}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firm: { ...prev.firm, firmTagline: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Official Registry / Notice Email:</label>
              <input
                type="email"
                value={formData.firm.officialEmail}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firm: { ...prev.firm, officialEmail: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Official Registry Phone / Hotline:</label>
              <input
                type="text"
                value={formData.firm.officialPhone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firm: { ...prev.firm, officialPhone: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Headquarters Physical Address:</label>
              <input
                type="text"
                value={formData.firm.headquartersAddress}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firm: { ...prev.firm, headquartersAddress: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Default Valuation Currency:</label>
              <select
                value={formData.firm.currencySymbol}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firm: { ...prev.firm, currencySymbol: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
              >
                <option value="UGX">UGX (Ugandan Shilling)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Primary Judicial Jurisdiction:</label>
              <input
                type="text"
                value={formData.firm.jurisdiction}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firm: { ...prev.firm, jurisdiction: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
