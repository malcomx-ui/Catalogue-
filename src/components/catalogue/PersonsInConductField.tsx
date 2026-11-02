import React from 'react';
import { User, UserPlus, Trash2, ShieldCheck, Users } from 'lucide-react';
import { BranchStaffMember } from '../../types';

interface PersonsInConductFieldProps {
  persons: string[];
  onChange: (persons: string[]) => void;
  staffOptions?: BranchStaffMember[];
  idPrefix?: string;
}

export const PersonsInConductField: React.FC<PersonsInConductFieldProps> = ({
  persons,
  onChange,
  staffOptions = [],
  idPrefix = 'person',
}) => {
  // Ensure there's always at least one entry
  const list = persons.length > 0 ? persons : [''];

  const handleUpdate = (index: number, value: string) => {
    // If user pastes comma or semicolon-separated names into a field, auto-split them
    if (value.includes(',') || value.includes(';')) {
      const parts = value
        .split(/[,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 1) {
        const next = [...list];
        next.splice(index, 1, ...parts);
        onChange(next);
        return;
      }
    }

    const next = [...list];
    next[index] = value;
    onChange(next);
  };

  const handleAdd = () => {
    onChange([...list, '']);
  };

  const handleRemove = (index: number) => {
    if (list.length <= 1) {
      onChange(['']);
      return;
    }
    const next = list.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleAddSuggested = (name: string) => {
    if (list.length === 1 && !list[0].trim()) {
      onChange([name]);
      return;
    }
    if (!list.includes(name)) {
      onChange([...list, name]);
    }
  };

  // Filter staff to legal personnel
  const lawyerStaff = staffOptions.filter(
    (s) => s.role === 'partner' || s.role === 'team_lead' || s.role === 'lawyer'
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block font-medium text-slate-700 text-xs sm:text-sm flex items-center gap-1.5">
          <Users className="w-4 h-4 text-blue-600" />
          <span>Person(s) in conduct</span>
          <span className="text-[11px] font-normal text-slate-500">
            ({list.filter((p) => p.trim()).length || 1} assigned)
          </span>
        </label>

        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors border border-blue-200 shadow-2xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Add another advocate</span>
        </button>
      </div>

      <div className="space-y-2">
        {list.map((person, idx) => {
          const isLead = idx === 0;
          const roleLabel = isLead
            ? '1. Lead Advocate / Counsel'
            : idx === 1
            ? '2. Co-Counsel / Associate'
            : idx === 2
            ? '3. Assisting Advocate / Pupil'
            : `${idx + 1}. Assisting Advocate`;

          const datalistId = `${idPrefix}-staff-list-${idx}`;

          return (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border transition-all ${
                isLead
                  ? 'bg-blue-50/40 border-blue-200'
                  : 'bg-slate-50/70 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <User className={`w-3.5 h-3.5 ${isLead ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>{roleLabel}</span>
                  {isLead && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded border border-blue-200 flex items-center gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      Lead
                    </span>
                  )}
                </div>

                {list.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    title="Remove this advocate"
                    className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  id={`${idPrefix}-${idx}`}
                  type="text"
                  list={datalistId}
                  value={person}
                  onChange={(e) => handleUpdate(idx, e.target.value)}
                  placeholder={
                    isLead
                      ? 'e.g. Lead Counsel / Advocate in Conduct'
                      : 'e.g. Associate / Assisting Advocate'
                  }
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                />

                <datalist id={datalistId}>
                  {lawyerStaff.map((staff) => (
                    <option
                      key={staff.id}
                      value={`${staff.name}${staff.advocateRollNo ? ` (${staff.advocateRollNo})` : ''}`}
                    >
                      {staff.roleTitle || staff.role}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick suggest from branch lawyers if available */}
      {lawyerStaff.length > 0 && (
        <div className="pt-1">
          <div className="text-[11px] text-slate-500 mb-1 flex items-center justify-between">
            <span>Quick add from branch counsel:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lawyerStaff.map((staff) => {
              const isAssigned = list.some(
                (p) => p.trim() && (p.includes(staff.name) || staff.name.includes(p.trim()))
              );
              return (
                <button
                  key={staff.id}
                  type="button"
                  disabled={isAssigned}
                  onClick={() => handleAddSuggested(staff.name)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors flex items-center gap-1 ${
                    isAssigned
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                  }`}
                >
                  <span>{staff.name}</span>
                  <span className="text-[9px] text-slate-400">({staff.role === 'partner' ? 'Partner' : staff.role === 'team_lead' ? 'Lead' : 'Associate'})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-500">
        You can assign two, three, or more advocates to this matter. The first advocate is designated as Lead Counsel.
      </p>
    </div>
  );
};

export default PersonsInConductField;
