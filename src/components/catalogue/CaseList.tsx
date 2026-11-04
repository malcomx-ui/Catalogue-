import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CaseItem } from '../../types';
import CasesPage from './CasesPage';
import {
  Search,
  Filter,
  Calendar,
  Building2,
  ChevronRight,
  Gavel,
  Plus,
  Eye,
  FileText,
  Clock,
  Upload,
  FileSpreadsheet,
  Trash2,
  Briefcase,
  UserCheck,
  X,
  Scale,
  ShieldCheck,
  Layers,
} from 'lucide-react';

export const CaseList: React.FC = () => {
  const {
    cases,
    filteredCases,
    setSelectedCase,
    setIsNewCaseModalOpen,
    setIsImportModalOpen,
    selectedBranchFilter,
    setSelectedBranchFilter,
    selectedLawyerFilter,
    setSelectedLawyerFilter,
    branches,
    searchQuery,
    setSearchQuery,
    userPermissions,
    currentUser,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'directory'>('table');

  // Extract all distinct lawyers from cases and firm legal staff with active case counts
  const lawyerOptions = React.useMemo(() => {
    const lawyerMap = new Map<string, number>();

    // Seed from active legal staff across branches
    branches.forEach((b) => {
      b.staff?.forEach((s) => {
        if (s.role === 'partner' || s.role === 'team_lead' || s.role === 'lawyer') {
          if (!lawyerMap.has(s.name)) {
            lawyerMap.set(s.name, 0);
          }
        }
      });
      if (b.leadAdvocate && !lawyerMap.has(b.leadAdvocate)) {
        lawyerMap.set(b.leadAdvocate, 0);
      }
      if (b.teamLead && !lawyerMap.has(b.teamLead)) {
        lawyerMap.set(b.teamLead, 0);
      }
    });

    // Count appearances in all matters (lead counsel, assisting, persons in conduct)
    cases.forEach((c) => {
      const caseLawyers = new Set<string>();

      if (c.leadAdvocate) {
        c.leadAdvocate.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).forEach((l) => caseLawyers.add(l));
      }
      (c.assistingAdvocates || []).forEach((l) => {
        if (l && l.trim()) caseLawyers.add(l.trim());
      });
      if (c.person_in_conduct) {
        c.person_in_conduct.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).forEach((l) => caseLawyers.add(l));
      }
      (c.persons_in_conduct || []).forEach((l) => {
        if (l && l.trim()) caseLawyers.add(l.trim());
      });

      caseLawyers.forEach((lawyer) => {
        lawyerMap.set(lawyer, (lawyerMap.get(lawyer) || 0) + 1);
      });
    });

    return Array.from(lawyerMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });
  }, [cases, branches]);

  const displayCases = filteredCases.filter((c) => {
    if (statusFilter !== 'all') {
      const caseStatus = (c.status || 'Active').toLowerCase();
      if (!caseStatus.includes(statusFilter.toLowerCase())) return false;
    }
    if (divisionFilter !== 'all' && !c.division.includes(divisionFilter)) return false;
    return true;
  });

  const getStatusBadgeColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('active') || s.includes('ongoing')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s.includes('pending') || s.includes('instruction')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (s.includes('adjourn')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (s.includes('closed') || s.includes('concluded') || s.includes('disposed')) {
      return 'bg-slate-100 text-slate-700 border-slate-300';
    }
    if (s.includes('dormant') || s.includes('inactive')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-4">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Litigation Cases
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Managing {displayCases.length} matters {userPermissions.canViewAllBranches ? 'across all branches' : `in ${currentUser.branchName || 'Assigned Branch'}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors min-h-[34px] ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors min-h-[34px] ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('directory')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors min-h-[34px] flex items-center gap-1.5 ${
                viewMode === 'directory' ? 'bg-white text-indigo-700 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cases Directory</span>
            </button>
          </div>

          {/* Import Excel - Strictly Super Admin Only */}
          {userPermissions.canBulkImport && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-2xs min-h-[34px]"
              title="Super Admin: Bulk Import Excel"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </button>
          )}

          {/* Add Case - Manual Entry Available to Permitted Advocates/Clerks */}
          {userPermissions.canCreateCases && (
            <button
              onClick={() => setIsNewCaseModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-2xs min-h-[34px]"
              title="Manually Type / Register New Case"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Case</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar Container */}
      <div className="w-full md:w-[420px] mb-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client, case no, lawyer, title..."
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-sm font-medium text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1 w-full sm:w-auto">
          {/* Branch filter */}
          {userPermissions.canViewAllBranches ? (
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-600 min-h-[38px] flex-1 sm:flex-initial"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-md px-3 py-2 text-xs font-semibold text-blue-900 flex items-center gap-1.5 min-h-[38px]">
              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Branch: {currentUser.branchName || 'Assigned Branch'}</span>
              <span className="text-[10px] text-blue-600 font-mono bg-blue-100 px-1 rounded ml-1">Custody</span>
            </div>
          )}

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-600 min-h-[38px] flex-1 sm:flex-initial"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Adjourned">Adjourned</option>
            <option value="Closed">Closed</option>
            <option value="Dormant">Dormant</option>
          </select>

          {/* Division filter */}
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-600 min-h-[38px] flex-1 sm:flex-initial"
          >
            <option value="all">All Court Divisions</option>
            <option value="Commercial">Commercial Division</option>
            <option value="Land">Land Division</option>
            <option value="Civil">Civil Division</option>
            <option value="Court of Appeal">Court of Appeal</option>
            <option value="Tax Appeals">Tax Appeals</option>
          </select>

          {/* Filter by Lawyer / Counsel */}
          <div className="relative inline-flex items-center flex-1 sm:flex-initial">
            <select
              value={selectedLawyerFilter}
              onChange={(e) => setSelectedLawyerFilter(e.target.value)}
              className={`w-full bg-slate-50 border rounded-md pl-7 pr-3 py-2 text-xs focus:outline-none transition-colors min-h-[38px] ${
                selectedLawyerFilter !== 'all'
                  ? 'border-indigo-400 bg-indigo-50/50 text-indigo-900 font-semibold shadow-2xs'
                  : 'border-slate-200 text-slate-700 focus:border-blue-600'
              }`}
            >
              <option value="all">
                {lawyerOptions.length > 0 ? `All Lawyers / Counsel (${lawyerOptions.length})` : 'All Lawyers / Counsel'}
              </option>
              {lawyerOptions.map((lawyer) => (
                <option key={lawyer.name} value={lawyer.name}>
                  {lawyer.name} ({lawyer.count} {lawyer.count === 1 ? 'matter' : 'matters'})
                </option>
              ))}
            </select>
            <UserCheck
              className={`w-3.5 h-3.5 absolute left-2 pointer-events-none ${
                selectedLawyerFilter !== 'all' ? 'text-indigo-600' : 'text-slate-400'
              }`}
            />
          </div>

          {/* Active Lawyer Badge */}
          {selectedLawyerFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 text-[11px] font-medium px-2 py-1 rounded-md border border-indigo-200 shadow-2xs">
              <UserCheck className="w-3 h-3 text-indigo-600" />
              <span>Counsel: <strong className="font-semibold">{selectedLawyerFilter}</strong></span>
              <button
                onClick={() => setSelectedLawyerFilter('all')}
                className="hover:bg-indigo-200/80 rounded p-0.5 text-indigo-600 transition-colors"
                title="Clear lawyer filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(selectedBranchFilter !== 'all' || selectedLawyerFilter !== 'all' || statusFilter !== 'all' || divisionFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedBranchFilter('all');
                setSelectedLawyerFilter('all');
                setStatusFilter('all');
                setDivisionFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing {displayCases.length} of {filteredCases.length}
        </div>
      </div>

      {/* Main Views */}
      {viewMode === 'directory' ? (
        <CasesPage
          userSession={{
            user: currentUser,
            profile: {
              role: currentUser.role,
              branch: currentUser.branchName,
              full_name: currentUser.name,
            },
          }}
        />
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">File NO.</th>
                  <th className="py-3 px-4">Case Title & Parties</th>
                  <th className="py-3 px-4">Court & Division</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Next Hearing</th>
                  <th className="py-3 px-4">Lead Counsel</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayCases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                      {selectedLawyerFilter !== 'all' ? (
                        <div className="max-w-md mx-auto py-6 space-y-3">
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto border border-indigo-200">
                            <UserCheck className="w-6 h-6" />
                          </div>
                          <div className="text-sm font-bold text-slate-800">
                            Counsel: {selectedLawyerFilter}
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            No cases currently assigned to Counsel {selectedLawyerFilter} match the active branch and status filters.
                          </p>
                          <div className="pt-2 flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedLawyerFilter('all')}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                            >
                              <span>Show All Counsel</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedBranchFilter('all');
                                setSelectedLawyerFilter('all');
                                setStatusFilter('all');
                                setDivisionFilter('all');
                                setSearchQuery('');
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                            >
                              <span>Reset All Filters</span>
                            </button>
                          </div>
                        </div>
                      ) : selectedBranchFilter !== 'all' ? (
                        <div className="max-w-md mx-auto py-6 space-y-3">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border border-blue-200">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div className="text-sm font-bold text-slate-800">
                            {branches.find((b) => b.id === selectedBranchFilter)?.name || 'Branch Circuit'}
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            No cases registered for this branch yet.
                            <br />
                            <span className="text-slate-600 font-medium">All demo records have been permanently cleared for client confidentiality.</span>
                          </p>
                          <div className="pt-2 flex items-center justify-center gap-2">
                            {userPermissions.canBulkImport && (
                              <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload Branch Excel File</span>
                              </button>
                            )}
                            {userPermissions.canCreateCases && (
                              <button
                                onClick={() => setIsNewCaseModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Case Manually</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : cases.length === 0 ? (
                        <div className="max-w-lg mx-auto py-8 space-y-3.5">
                          <div className="w-13 h-13 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
                            <ShieldCheck className="w-7 h-7 text-emerald-600" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-base font-bold text-slate-900">
                              Client Files Secured & Storage Cleared
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>0 Cases · 0 Hearings · 0 Documents · 100% Confidential</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                            All demo data, sample litigation records, and mock lawyers have been purged. The catalogue is completely clean and ready for your actual firm matters.
                          </p>
                          <div className="pt-2 flex items-center justify-center gap-2">
                            {userPermissions.canBulkImport && (
                              <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Import Firm Excel File</span>
                              </button>
                            )}
                            {userPermissions.canCreateCases && (
                              <button
                                onClick={() => setIsNewCaseModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Case Manually</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        'No cases found matching your filters.'
                      )}
                    </td>
                  </tr>
                ) : (
                  displayCases.map((caseItem) => (
                    <tr
                      key={caseItem.id}
                      onClick={() => setSelectedCase(caseItem)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        {caseItem.case_number || caseItem.suitNumber ? (
                          <>
                            <div className="font-mono font-medium text-slate-900">
                              {caseItem.case_number || caseItem.suitNumber}
                            </div>
                            {caseItem.firmRefNumber && caseItem.firmRefNumber !== (caseItem.case_number || caseItem.suitNumber) && (
                              <div className="text-[10px] text-slate-400 font-sans">{caseItem.firmRefNumber}</div>
                            )}
                          </>
                        ) : (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCase(caseItem);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2 py-0.5 rounded font-medium cursor-pointer transition-colors shadow-2xs"
                            title="Click to enter File NO. manually"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Enter File NO.</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 leading-snug truncate">
                          {caseItem.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {caseItem.parties && caseItem.parties.length > 0
                            ? `${caseItem.parties[0]?.name || caseItem.client || ''}${caseItem.parties[1]?.name ? ` v. ${caseItem.parties[1].name}` : caseItem.opposingFirm ? ` v. ${caseItem.opposingFirm}` : ''}`
                            : (caseItem.client || caseItem.clientName || 'Direct Instruction')}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{caseItem.division.replace('High Court ', '')}</div>
                        <div className="text-[10px] text-slate-400">{caseItem.presidingJudge}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {caseItem.branchName.replace(' Regional Office', '').replace(' (Head Office)', ' HQ')}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border capitalize ${getStatusBadgeColor(caseItem.status)}`}>
                          {caseItem.status || 'Active'}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {caseItem.nextHearingDate ? (
                          <div>
                            <div className="font-mono font-medium text-slate-900">{caseItem.nextHearingDate}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              {caseItem.nextHearingPurpose || 'Hearing'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                        {caseItem.leadAdvocate ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const counselName = caseItem.leadAdvocate.split(',')[0].trim();
                              setSelectedLawyerFilter(counselName);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors group ${
                              selectedLawyerFilter.toLowerCase() === caseItem.leadAdvocate.split(',')[0].trim().toLowerCase()
                                ? 'bg-indigo-100 text-indigo-900 font-bold border border-indigo-300 shadow-2xs'
                                : 'hover:bg-indigo-50 hover:text-indigo-700 text-slate-700'
                            }`}
                            title={`Filter catalogue by ${caseItem.leadAdvocate.split(',')[0].trim()}`}
                          >
                            <UserCheck className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
                            <span>{caseItem.leadAdvocate.split(',')[0]}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCase(caseItem);
                          }}
                          className="px-2.5 py-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded font-medium transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : displayCases.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center shadow-2xs">
          {cases.length === 0 ? (
            <div className="max-w-md mx-auto space-y-3.5">
              <div className="w-13 h-13 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="text-base font-bold text-slate-900">
                  Client Files Secured & Storage Cleared
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>0 Cases · 0 Hearings · 0 Documents</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                All client matters and demo data have been completely cleared for confidentiality. You can import your firm litigation spreadsheet or register matters manually.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                {userPermissions.canBulkImport && (
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Excel File</span>
                  </button>
                )}
                {userPermissions.canCreateCases && (
                  <button
                    onClick={() => setIsNewCaseModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Single Case</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No cases found matching your filters.</p>
          )}
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {displayCases.map((caseItem) => (
            <div
              key={caseItem.id}
              onClick={() => setSelectedCase(caseItem)}
              className="bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-300 shadow-2xs cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  {caseItem.case_number || caseItem.suitNumber ? (
                    <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                      {caseItem.case_number || caseItem.suitNumber}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 inline-flex items-center gap-1 shadow-2xs">
                      <Plus className="w-2.5 h-2.5" /> Enter File NO.
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${getStatusBadgeColor(caseItem.status)}`}>
                    {caseItem.status || 'Active'}
                  </span>
                </div>

                <h3 className="font-semibold text-sm text-slate-900 mt-2 leading-snug">
                  {caseItem.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {caseItem.briefSummary}
                </p>

                <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Court:</span>
                    <strong className="text-slate-700 font-medium">{caseItem.division}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Branch:</span>
                    <span className="text-slate-700">{caseItem.branchName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Lead Counsel:</span>
                    {caseItem.leadAdvocate ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLawyerFilter(caseItem.leadAdvocate.split(',')[0].trim());
                        }}
                        className={`text-xs font-medium flex items-center gap-1 transition-colors ${
                          selectedLawyerFilter.toLowerCase() === caseItem.leadAdvocate.split(',')[0].trim().toLowerCase()
                            ? 'text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 shadow-2xs'
                            : 'text-slate-700 hover:text-indigo-700 hover:underline'
                        }`}
                        title={`Filter catalogue by ${caseItem.leadAdvocate.split(',')[0].trim()}`}
                      >
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        <span>{caseItem.leadAdvocate}</span>
                      </button>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                </div>
              </div>

              {caseItem.nextHearingDate && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50 p-2 rounded">
                  <span className="text-slate-500">Next Hearing:</span>
                  <span className="font-mono font-semibold text-slate-900">{caseItem.nextHearingDate}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
