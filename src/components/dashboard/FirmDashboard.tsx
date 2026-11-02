import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CaseItem } from '../../types';
import {
  Calendar,
  Clock,
  Briefcase,
  Activity,
  CheckCircle2,
  Plus,
  Upload,
  ChevronRight,
  Gavel,
  Scale,
  FolderOpen,
  MapPin,
  Building2,
  Database,
  Printer,
  ShieldCheck,
  Search,
} from 'lucide-react';

export const FirmDashboard: React.FC = () => {
  const {
    cases,
    hearings,
    branches,
    currentUser,
    userPermissions,
    setActiveTab,
    setSelectedCase,
    setIsNewCaseModalOpen,
    setIsImportModalOpen,
    setIsCpanelMigrationModalOpen,
    selectedBranchFilter,
    setSelectedBranchFilter,
  } = useApp();

  // Dynamic formatted date e.g. "Mon, 2 Nov 2026"
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  // Filter cases based on selected branch scope
  const branchScopedCases = useMemo(() => {
    if (selectedBranchFilter === 'all') return cases;
    const targetBranch = branches.find((b) => b.id === selectedBranchFilter);
    if (!targetBranch) return cases;

    const targetCity = targetBranch.city.toLowerCase();
    const targetName = targetBranch.name.toLowerCase();

    return cases.filter((c) => {
      const bId = c.branchId;
      const bName = (c.branch || c.branchName || '').toLowerCase();
      return bId === targetBranch.id || bName.includes(targetCity) || bName.includes(targetName);
    });
  }, [cases, selectedBranchFilter, branches]);

  // Active cases count
  const activeCases = useMemo(() => {
    return branchScopedCases.filter(
      (c) => !c.status || c.status.toLowerCase() === 'active' || c.status.toLowerCase() === 'instructions'
    );
  }, [branchScopedCases]);

  // Inactive cases count
  const inactiveCases = useMemo(() => {
    return branchScopedCases.filter(
      (c) => c.status && (c.status.toLowerCase() === 'inactive' || c.status.toLowerCase() === 'dormant' || c.status.toLowerCase() === 'pending')
    );
  }, [branchScopedCases]);

  // Closed / Concluded matters
  const closedCases = useMemo(() => {
    return branchScopedCases.filter(
      (c) =>
        c.status &&
        (c.status.toLowerCase() === 'closed' ||
          c.status.toLowerCase() === 'archived' ||
          c.status.toLowerCase() === 'concluded' ||
          c.status.toLowerCase() === 'resolved')
    );
  }, [branchScopedCases]);

  // Upcoming hearings (next 30 days)
  const upcomingHearings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 30);
    maxDate.setHours(23, 59, 59, 999);

    const list: Array<{
      id: string;
      date: string;
      time: string;
      suitNumber: string;
      title: string;
      court: string;
      caseItem?: CaseItem;
    }> = [];

    hearings.forEach((h) => {
      if (!h.hearingDate) return;
      const hDate = new Date(h.hearingDate);
      if (hDate >= today && hDate <= maxDate) {
        const matchedCase = cases.find(
          (c) => c.id === h.caseId || (c.suitNumber && c.suitNumber === h.suitNumber)
        );
        list.push({
          id: h.id,
          date: h.hearingDate,
          time: h.hearingTime || '09:30 AM',
          suitNumber: h.suitNumber || matchedCase?.case_number || matchedCase?.suitNumber || 'Suit Pending',
          title: h.caseTitle || matchedCase?.title || 'Litigation Matter',
          court: h.courtName || matchedCase?.court || 'High Court of Uganda',
          caseItem: matchedCase,
        });
      }
    });

    branchScopedCases.forEach((c) => {
      const hearingDate = c.hearing_date || c.nextHearingDate;
      if (!hearingDate) return;
      const cDate = new Date(hearingDate);
      if (cDate >= today && cDate <= maxDate) {
        const refNo = c.case_number || c.suitNumber;
        const exists = list.some((item) => item.suitNumber === refNo && item.date === hearingDate);
        if (!exists) {
          list.push({
            id: `case-hearing-${c.id}`,
            date: hearingDate,
            time: '09:30 AM',
            suitNumber: refNo || 'Suit Pending',
            title: c.title || 'Litigation Matter',
            court: c.court || 'High Court of Uganda',
            caseItem: c,
          });
        }
      }
    });

    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [hearings, cases, branchScopedCases]);

  // Standard ordered branches list (matching screenshot: Fort Portal, Gulu, Jinja, Kampala, Masaka, Masindi, Mbarara)
  const orderedBranches = useMemo(() => {
    const desiredOrder = [
      'fort portal',
      'gulu',
      'jinja',
      'kampala',
      'masaka',
      'masindi',
      'mbarara',
    ];

    const sorted = [...branches].sort((a, b) => {
      const aIndex = desiredOrder.findIndex((city) => a.city.toLowerCase().includes(city) || a.name.toLowerCase().includes(city));
      const bIndex = desiredOrder.findIndex((city) => b.city.toLowerCase().includes(city) || b.name.toLowerCase().includes(city));
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [branches]);

  // Branch statistics calculation helper
  const getBranchStats = (branch: any) => {
    const targetCity = branch.city.toLowerCase();
    const targetName = branch.name.toLowerCase();

    const branchCases = cases.filter((c) => {
      const bId = c.branchId;
      const bName = (c.branch || c.branchName || '').toLowerCase();
      return bId === branch.id || bName.includes(targetCity) || bName.includes(targetName);
    });

    const active = branchCases.filter(
      (c) => !c.status || c.status.toLowerCase() === 'active' || c.status.toLowerCase() === 'instructions'
    ).length;

    const inactive = branchCases.filter(
      (c) => c.status && (c.status.toLowerCase() === 'inactive' || c.status.toLowerCase() === 'pending' || c.status.toLowerCase() === 'dormant')
    ).length;

    const closed = branchCases.filter(
      (c) => c.status && (c.status.toLowerCase() === 'closed' || c.status.toLowerCase() === 'archived' || c.status.toLowerCase() === 'concluded' || c.status.toLowerCase() === 'resolved')
    ).length;

    // Upcoming hearings for this branch
    const branchHearingsCount = upcomingHearings.filter((h) => {
      if (h.caseItem && (h.caseItem.branchId === branch.id || h.caseItem.branch?.toLowerCase().includes(targetCity))) {
        return true;
      }
      return false;
    }).length;

    return {
      total: branchCases.length,
      active,
      inactive,
      closed,
      upcoming: branchHearingsCount,
    };
  };

  // Recent cases (top 10)
  const recentCases = useMemo(() => {
    return branchScopedCases.slice(0, 8);
  }, [branchScopedCases]);

  // User management location badge
  const userBranchName = currentUser.branchName || 'Fort Portal Office';

  return (
    <div className="space-y-6 text-slate-900 pb-16">
      {/* 1. TOP HERO BANNER (Muhumuza-Kiiza ADVOCATES & LEGAL CONSULTANTS) */}
      <section className="bg-[#0b132b] text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4">
          {/* Emblem Seal Logo */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white flex items-center justify-center p-1 shadow-sm shrink-0">
            <img
              src="/logo.png"
              alt="Muhumuza-Kiiza Seal"
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Muhumuza-Kiiza
            </h1>
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-widest text-slate-300 uppercase">
              ADVOCATES &amp; LEGAL CONSULTANTS
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {formattedToday} · You Manage {userBranchName}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {userPermissions.canCreateCases && (
            <button
              type="button"
              onClick={() => setIsNewCaseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-semibold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4 text-slate-900" />
              <span>New case</span>
            </button>
          )}

          {userPermissions.canBulkImport && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1c2541] hover:bg-[#253259] text-white border border-slate-600 rounded-lg text-xs font-medium transition-all"
              title="Import Cases"
            >
              <Upload className="w-4 h-4 text-slate-200" />
              <span>Import</span>
            </button>
          )}
        </div>
      </section>

      {/* 2. 4 KPI STAT CARDS ROW */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL CASES */}
        <div
          onClick={() => {
            setSelectedBranchFilter('all');
            setActiveTab('catalogue');
          }}
          className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-3.5 group"
        >
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 group-hover:scale-105 transition-transform">
            <Briefcase className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              TOTAL CASES
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-900">
                {branchScopedCases.length}
              </span>
              <span className="text-xs text-slate-500 font-normal">
                across all branches
              </span>
            </div>
          </div>
        </div>

        {/* ACTIVE */}
        <div
          onClick={() => {
            setSelectedBranchFilter('all');
            setActiveTab('catalogue');
          }}
          className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-3.5 group"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              ACTIVE
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-900">
                {activeCases.length}
              </span>
              <span className="text-xs text-slate-500 font-normal">
                in progress
              </span>
            </div>
          </div>
        </div>

        {/* UPCOMING */}
        <div
          onClick={() => setActiveTab('causelist')}
          className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-3.5 group"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              UPCOMING
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-900">
                {upcomingHearings.length}
              </span>
              <span className="text-xs text-slate-500 font-normal">
                next 30 days
              </span>
            </div>
          </div>
        </div>

        {/* CLOSED */}
        <div
          onClick={() => {
            setSelectedBranchFilter('all');
            setActiveTab('catalogue');
          }}
          className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-3.5 group"
        >
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              CLOSED
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-900">
                {closedCases.length}
              </span>
              <span className="text-xs text-slate-500 font-normal">
                resolved
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BRANCH OVERVIEW SECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Branch Overview
          </h2>
          <button
            type="button"
            onClick={() => {
              setSelectedBranchFilter('all');
              setActiveTab('catalogue');
            }}
            className="text-xs text-slate-600 hover:text-blue-600 font-semibold transition-colors flex items-center gap-0.5"
          >
            <span>All cases</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Grid of 7 Branch Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {orderedBranches.map((b) => {
            const stats = getBranchStats(b);
            const isSelected = selectedBranchFilter === b.id;

            return (
              <div
                key={b.id}
                onClick={() => {
                  setSelectedBranchFilter(isSelected ? 'all' : b.id);
                }}
                className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-2xs transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                    : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  {/* Top: Branch Name + View > */}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                      {b.name}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBranchFilter(b.id);
                        setActiveTab('catalogue');
                      }}
                      className="text-xs text-slate-400 group-hover:text-blue-600 transition-colors flex items-center font-medium"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Main: Large Case Count + Upcoming */}
                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-extrabold text-slate-900">
                        {stats.total}
                      </span>
                      <span className="text-xs text-slate-500 font-normal ml-1">
                        cases
                      </span>
                    </div>

                    <div className="text-xs text-amber-700 flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>{stats.upcoming} upcoming</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Status Pills: Active / Inactive / Closed */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full px-2.5 py-0.5 font-medium">
                    Active: <strong className="font-bold">{stats.active}</strong>
                  </span>
                  <span className="bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full px-2.5 py-0.5 font-medium">
                    Inactive: <strong className="font-bold">{stats.inactive}</strong>
                  </span>
                  <span className="bg-slate-50 text-slate-700 border border-slate-200/80 rounded-full px-2.5 py-0.5 font-medium">
                    Closed: <strong className="font-bold">{stats.closed}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. BOTTOM SPLIT: RECENT CASES (LEFT) + UPCOMING HEARINGS (RIGHT) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Recent Cases (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Recent Cases
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('catalogue')}
              className="text-xs text-slate-600 hover:text-blue-600 font-semibold transition-colors flex items-center gap-0.5"
            >
              <span>All cases</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
            {recentCases.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No cases found in this branch docket.
              </div>
            ) : (
              recentCases.map((c) => {
                const caseNo = c.case_number || c.suitNumber || 'Pending';
                const branchName = c.branch || c.branchName || 'Fort Portal Office';
                const clientName = c.clientName || c.client || 'CENTENARY BANK';
                const status = c.status || 'Active';

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                        {c.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                        <span>{caseNo}</span>
                        <span>·</span>
                        <span>{branchName}</span>
                        <span>·</span>
                        <span className="uppercase">{clientName}</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full px-3 py-1 text-xs font-semibold">
                        {status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Upcoming Hearings (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Upcoming Hearings</span>
            </h2>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {upcomingHearings.length}
            </span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs min-h-[160px] flex flex-col justify-between">
            {upcomingHearings.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-10 text-xs text-slate-400 text-center">
                No upcoming hearings scheduled.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingHearings.slice(0, 4).map((h) => (
                  <div
                    key={h.id}
                    onClick={() => {
                      if (h.caseItem) setSelectedCase(h.caseItem);
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors text-xs border border-slate-200/60"
                  >
                    <div className="flex items-center justify-between text-[11px] text-amber-700 font-semibold mb-1">
                      <span>{new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                      <span>{h.time}</span>
                    </div>
                    <div className="font-bold text-slate-900 truncate">{h.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">{h.court}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setActiveTab('causelist')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
              >
                Open Cause Diary &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
