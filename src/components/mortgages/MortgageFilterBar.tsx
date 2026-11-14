import React from 'react';
import { Search, X } from 'lucide-react';
import { MONTHS } from '../../services/mortgageService';

export interface MortgageFilters {
  search: string;
  month: string;
  branch?: string;
  department: string;
  status: string;
  lawyerId: string;
}

export interface LawyerOption {
  id: string;
  full_name?: string;
  name?: string;
  email?: string;
  role_title?: string;
}

export interface MortgageFilterBarProps {
  filters: MortgageFilters;
  onChange: React.Dispatch<React.SetStateAction<MortgageFilters>> | ((updated: MortgageFilters | ((prev: MortgageFilters) => MortgageFilters)) => void);
  lawyers?: LawyerOption[];
  branches?: string[];
  onOpenAddModal?: () => void;
  canAdd?: boolean;
  addDisabledReason?: string;
  className?: string;
}

const DEPARTMENTS = [
  'Banking & Securities',
  'Commercial & Corporate',
  'Litigation & Debt Recovery',
  'Real Estate & Conveyancing',
  'Legal Audit & Compliance',
];

const STATUSES = [
  'Active / Processing',
  'Completed / Cleared',
  'Pending Valuation',
  'On Hold',
  'Under Preparation',
  'Sent for Registration',
  'Registered',
  'Pending Release',
  'Released / Discharged',
];

export const MortgageFilterBar: React.FC<MortgageFilterBarProps> = ({
  filters,
  onChange,
  lawyers = [],
  branches = [],
  onOpenAddModal,
  canAdd = true,
  addDisabledReason = 'View-Only: Adding files is disabled while viewing another branch.',
  className = '',
}) => {
  const updateFilter = (key: keyof MortgageFilters, value: string) => {
    onChange((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = () => {
    onChange({
      search: '',
      month: '',
      branch: '',
      department: '',
      status: '',
      lawyerId: '',
    });
  };

  const hasActiveFilters = Boolean(
    filters.search || filters.month || filters.branch || filters.department || filters.status || filters.lawyerId
  );

  return (
    <div className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 w-full min-w-0 ${className}`}>
      {/* Top Controls Row */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between min-w-0">
        {/* Search input with live clear */}
        <div className="relative w-full flex-1 min-w-0">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by mortgagor, RIM no, deed, or notes..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400 bg-slate-50/70 hover:bg-white transition"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => updateFilter('search', '')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Filter */}
          <div className="flex items-center min-w-[130px] flex-1 sm:flex-initial">
            <select
              value={filters.month || ''}
              onChange={(e) => updateFilter('month', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              aria-label="Filter by Month"
            >
              <option value="">All Months</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          {branches.length > 0 && (
            <div className="flex items-center min-w-[150px] flex-1 sm:flex-initial">
              <select
                value={filters.branch || ''}
                onChange={(e) => updateFilter('branch', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                aria-label="Filter by Branch"
              >
                <option value="">All Branches</option>
                {branches.map((br) => (
                  <option key={br} value={br}>
                    {br}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Department Filter */}
          <div className="flex items-center min-w-[140px] flex-1 sm:flex-initial">
            <select
              value={filters.department}
              onChange={(e) => updateFilter('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center min-w-[130px] flex-1 sm:flex-initial">
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Lawyer / Advocate Filter */}
          <div className="flex items-center min-w-[140px] flex-1 sm:flex-initial">
            <select
              value={filters.lawyerId}
              onChange={(e) => updateFilter('lawyerId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Advocates</option>
              {lawyers.map((lawyer) => {
                const displayName =
                  lawyer.full_name ||
                  lawyer.name ||
                  lawyer.email ||
                  `Advocate (${lawyer.id.slice(0, 6)})`;
                return (
                  <option key={lawyer.id} value={lawyer.id}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-2 text-xs font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition flex items-center gap-1"
              title="Reset all active filters"
            >
              <span>↺</span>
              <span>Reset</span>
            </button>
          )}

          {/* Quick Action: Add Mortgage (if callback provided) */}
          {onOpenAddModal && (
            <button
              type="button"
              onClick={onOpenAddModal}
              disabled={!canAdd}
              title={!canAdd ? addDisabledReason : 'Register a new mortgage file'}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition shrink-0 disabled:opacity-45 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              <span>+</span>
              <span>{canAdd ? 'New File' : 'New File (View-Only)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Pills (if any filter is selected) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100 text-[11px] text-gray-500">
          <span className="font-semibold text-gray-600">Active Filters:</span>
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Query: &ldquo;{filters.search}&rdquo;
              <button
                type="button"
                onClick={() => updateFilter('search', '')}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.month && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Month: {filters.month}
              <button
                type="button"
                onClick={() => updateFilter('month', '')}
                className="hover:text-teal-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.branch && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Branch: {filters.branch}
              <button
                type="button"
                onClick={() => updateFilter('branch', '')}
                className="hover:text-purple-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.department && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Dept: {filters.department}
              <button
                type="button"
                onClick={() => updateFilter('department', '')}
                className="hover:text-indigo-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Status: {filters.status}
              <button
                type="button"
                onClick={() => updateFilter('status', '')}
                className="hover:text-emerald-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.lawyerId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Advocate:{' '}
              {lawyers.find((l) => l.id === filters.lawyerId)?.full_name ||
                lawyers.find((l) => l.id === filters.lawyerId)?.name ||
                'Selected'}
              <button
                type="button"
                onClick={() => updateFilter('lawyerId', '')}
                className="hover:text-amber-900"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MortgageFilterBar;
