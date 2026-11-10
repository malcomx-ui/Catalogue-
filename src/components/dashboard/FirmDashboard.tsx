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
  Bell,
  Archive,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { WeeklyMattersNotificationModal } from '../causelist/WeeklyMattersNotificationModal';

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

  // Dynamic formatted date e.g. "Mon, 9 Nov 2026"
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
    return branchScopedCases.filter((c) => {
      const s = (c.status || 'Active').toLowerCase();
      const isClosed = s === 'closed' || s === 'archived' || s.includes('closed') || s.includes('concluded') || Boolean(c.year_of_closure);
      return !isClosed && (s.includes('active') || s.includes('ongoing') || s.includes('mention') || s.includes('instructions'));
    });
  }, [branchScopedCases]);

  // Inactive / Pending cases count
  const inactiveCases = useMemo(() => {
    return branchScopedCases.filter((c) => {
      const s = (c.status || '').toLowerCase();
      const isClosed = s === 'closed' || s === 'archived' || s.includes('closed') || Boolean(c.year_of_closure);
      return !isClosed && (s.includes('inactive') || s.includes('dormant') || s.includes('pending'));
    });
  }, [branchScopedCases]);

  // Closed / Concluded matters (precise matches excluding archived)
  const closedCases = useMemo(() => {
    return branchScopedCases.filter((c) => {
      const s = (c.status || '').toLowerCase();
      return (
        (s === 'closed' ||
        s.includes('closed') ||
        s === 'concluded' ||
        s === 'resolved' ||
        Boolean(c.year_of_closure)) &&
        s !== 'archived' &&
        !s.includes('archived')
      );
    });
  }, [branchScopedCases]);

  // Archived matters count
  const archivedCases = useMemo(() => {
    return branchScopedCases.filter((c) => {
      const s = (c.status || '').toLowerCase();
      return (
        s === 'archived' ||
        s.includes('archived') ||
        (c.file_location || '').toLowerCase().includes('archive')
      );
    });
  }, [branchScopedCases]);

  // Upcoming matters happening within the current week (next 7 days)
  const weeklyMatters = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7);
    maxDate.setHours(23, 59, 59, 999);

    const todayStr = today.toISOString().split('T')[0];
    const maxDateStr = maxDate.toISOString().split('T')[0];

    const list: Array<{
      id: string;
      date: string;
      time: string;
      suitNumber: string;
      title: string;
      court: string;
      purpose: string;
      caseItem?: CaseItem;
    }> = [];

    hearings.forEach((h) => {
      if (!h.hearingDate) return;
      if (h.hearingDate >= todayStr && h.hearingDate <= maxDateStr) {
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
          purpose: h.hearingPurpose || 'Court Appearance',
          caseItem: matchedCase,
        });
      }
    });

    branchScopedCases.forEach((c) => {
      const hDate = c.hearing_date || c.nextHearingDate;
      if (!hDate) return;
      if (hDate >= todayStr && hDate <= maxDateStr) {
        const refNo = c.case_number || c.suitNumber;
        const exists = list.some((item) => item.date === hDate && item.suitNumber === refNo);
        if (!exists) {
          list.push({
            id: `case-hearing-${c.id}`,
            date: hDate,
            time: '09:30 AM',
            suitNumber: refNo || 'Suit Pending',
            title: c.title || 'Litigation Matter',
            court: c.court || 'High Court of Uganda',
            purpose: c.nextHearingPurpose || 'Court Hearing',
            caseItem: c,
          });
        }
      }
    });

    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [hearings, cases, branchScopedCases]);

  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);

  // Automated pop-up notification on viewing dashboard
  React.useEffect(() => {
    if (weeklyMatters.length > 0) {
      const hasDismissed = sessionStorage.getItem('mk_weekly_alert_dismissed_session');
      if (!hasDismissed) {
        setIsWeeklyModalOpen(true);
        sessionStorage.setItem('mk_weekly_alert_dismissed_session', 'true');
      }
    }
  }, [weeklyMatters.length]);

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
      purpose?: string;
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
          purpose: h.hearingPurpose || 'Hearing',
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
            purpose: c.nextHearingPurpose || 'Hearing',
            caseItem: c,
          });
        }
      }
    });

    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [hearings, cases, branchScopedCases]);

  // Standard ordered branches list (Fort Portal, Gulu, Jinja, Kampala, Masaka, Masindi, Mbarara)
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

    const active = branchCases.filter((c) => {
      const s = (c.status || 'Active').toLowerCase();
      const isClosedOrArchived = s === 'closed' || s === 'archived' || s.includes('closed') || s.includes('concluded') || Boolean(c.year_of_closure);
      return !isClosedOrArchived && (s.includes('active') || s.includes('ongoing') || s.includes('mention') || s.includes('instructions'));
    }).length;

    const inactive = branchCases.filter((c) => {
      const s = (c.status || '').toLowerCase();
      const isClosedOrArchived = s === 'closed' || s === 'archived' || s.includes('closed') || Boolean(c.year_of_closure);
      return !isClosedOrArchived && (s.includes('inactive') || s.includes('dormant') || s.includes('pending') || s.includes('ruling'));
    }).length;

    const closed = branchCases.filter((c) => {
      const s = (c.status || '').toLowerCase();
      return (
        (s === 'closed' ||
        s.includes('closed') ||
        s === 'concluded' ||
        s === 'resolved' ||
        Boolean(c.year_of_closure)) &&
        s !== 'archived' &&
        !s.includes('archived')
      );
    }).length;

    const archived = branchCases.filter((c) => {
      const s = (c.status || '').toLowerCase();
      return s === 'archived' || s.includes('archived') || (c.file_location || '').toLowerCase().includes('archive');
    }).length;

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
      archived,
      upcoming: branchHearingsCount,
    };
  };

  // Recent cases (top 8)
  const recentCases = useMemo(() => {
    return branchScopedCases.slice(0, 8);
  }, [branchScopedCases]);

  // Helper for case status badge styling
  const renderStatusBadge = (rawStatus: string = 'Active') => {
    const s = rawStatus.toLowerCase();
    if (s.includes('archived')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-300">
          <Archive className="w-3 h-3 text-zinc-500" />
          <span>Archived</span>
        </span>
      );
    }
    if (s.includes('closed') || s.includes('concluded') || s.includes('resolved')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          <CheckCircle2 className="w-3 h-3 text-slate-500" />
          <span>Closed</span>
        </span>
      );
    }
    if (s.includes('ruling') || s.includes('judgment')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Pending Ruling / Judgment</span>
        </span>
      );
    }
    if (s.includes('execution')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-300">
          <Gavel className="w-3 h-3 text-rose-600" />
          <span>At Execution</span>
        </span>
      );
    }
    if (s.includes('mention')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-300">
          <Calendar className="w-3 h-3 text-blue-600" />
          <span>Mention</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
        <Activity className="w-3 h-3 text-emerald-600" />
        <span>Active</span>
      </span>
    );
  };

  const userBranchName = currentUser.branchName || 'Fort Portal Office';

  return (
    <div className="space-y-6 text-slate-900 pb-16 max-w-7xl mx-auto">
      {/* 1. TOP HERO BANNER (Muhumuza-Kiiza ADVOCATES & LEGAL CONSULTANTS) */}
      <section className="bg-slate-950 text-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -right-24 -top-24 w-80 h-80 bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          {/* Emblem Seal Logo */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white flex items-center justify-center p-1.5 shadow-md border border-amber-400/30 shrink-0">
            <img
              src="/seal.png"
              alt="Muhumuza-Kiiza Seal"
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-serif-legal">
                Muhumuza-Kiiza
              </h1>
            </div>
            <p className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase mt-0.5">
              ADVOCATES &amp; LEGAL CONSULTANTS
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5">
              <span>{formattedToday}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-300 font-medium">Station: {userBranchName}</span>
              {selectedBranchFilter !== 'all' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-blue-400 font-medium">Filtered Scope</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 relative z-10">
          {weeklyMatters.length > 0 && (
            <button
              type="button"
              onClick={() => setIsWeeklyModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Open Upcoming Weekly Matters Notification"
            >
              <Bell className="w-4 h-4 text-slate-950 animate-bounce" />
              <span>Weekly Matters ({weeklyMatters.length})</span>
            </button>
          )}

          {userPermissions.canCreateCases && (
            <button
              type="button"
              onClick={() => setIsNewCaseModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-950 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-900" />
              <span>New Case</span>
            </button>
          )}

          {userPermissions.canBulkImport && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-xs"
              title="Import Matters from Excel/CSV"
            >
              <Upload className="w-4 h-4 text-slate-300" />
              <span>Import</span>
            </button>
          )}
        </div>
      </section>

      {/* 1.5 UPCOMING MATTERS THIS WEEK ALERT BANNER */}
      {weeklyMatters.length > 0 && (
        <section className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Bell className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                  Upcoming Matters This Week
                </span>
                <span className="text-xs text-amber-900 font-semibold">
                  Next 7 Days
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1">
                <strong>{weeklyMatters.length} matter{weeklyMatters.length === 1 ? '' : 's'}</strong> scheduled in the next 7 days across court registries requiring advocate appearance or filing deadlines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsWeeklyModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              View Weekly Alert
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('causelist')}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Open Cause Diary
            </button>
          </div>
        </section>
      )}

      {/* 2. 5 KPI STAT CARDS ROW */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* TOTAL CASES */}
        <div
          onClick={() => {
            setSelectedBranchFilter('all');
            setActiveTab('catalogue');
          }}
          className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL CASES
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-slate-200 transition-colors">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
              {branchScopedCases.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Across all firm dockets
            </p>
          </div>
        </div>

        {/* ACTIVE */}
        <div
          onClick={() => {
            setSelectedBranchFilter('all');
            setActiveTab('catalogue');
          }}
          className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              ACTIVE
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950 tabular-nums tracking-tight">
              {activeCases.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ongoing &amp; in progress
            </p>
          </div>
        </div>

        {/* UPCOMING */}
        <div
          onClick={() => setActiveTab('causelist')}
          className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              UPCOMING
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-950 tabular-nums tracking-tight">
              {upcomingHearings.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Next 30 days scheduled
            </p>
          </div>
        </div>

        {/* CLOSED */}
        <div
          onClick={() => {
            setSelectedBranchFilter('all');
            setActiveTab('catalogue');
          }}
          className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              CLOSED
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-200 transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
              {closedCases.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Resolved &amp; concluded
            </p>
          </div>
        </div>

        {/* ARCHIVED */}
        <div
          onClick={() => {
            setSelectedBranchFilter('all');
            setActiveTab('catalogue');
          }}
          className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              ARCHIVED
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 group-hover:bg-zinc-200 transition-colors">
              <Archive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tabular-nums tracking-tight">
              {archivedCases.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              In registry archives
            </p>
          </div>
        </div>
      </section>

      {/* 3. BRANCH OVERVIEW SECTION */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Branch Overview
            </h2>
            <p className="text-xs text-slate-500">
              Live matter counts and operational status breakdown by regional circuit
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedBranchFilter('all');
              setActiveTab('catalogue');
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
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
                className={`bg-white border rounded-xl p-5 shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/20 shadow-sm'
                    : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Card Header: Branch Name + HQ Tag + View Action */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {b.name}
                        </h3>
                        {b.isHeadquarters && (
                          <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.2 rounded shrink-0">
                            HQ
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{b.city}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBranchFilter(b.id);
                        setActiveTab('catalogue');
                      }}
                      className="text-xs text-slate-400 group-hover:text-blue-600 transition-colors flex items-center font-medium shrink-0 pt-0.5"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Body: Large Total Case Count + Upcoming Hearings */}
                  <div className="mt-4 flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                        {stats.total}
                      </span>
                      <span className="text-xs text-slate-500 font-normal ml-1.5">
                        matters
                      </span>
                    </div>

                    {stats.upcoming > 0 ? (
                      <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-600" />
                        <span>{stats.upcoming} upcoming</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">
                        0 upcoming
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Breakdown Strip (Active, Inactive, Closed, Archived) */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="flex items-center justify-between px-2 py-1 bg-emerald-50/70 text-emerald-800 border border-emerald-200/60 rounded-md">
                    <span>Active:</span>
                    <strong className="font-mono tabular-nums">{stats.active}</strong>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 bg-amber-50/70 text-amber-800 border border-amber-200/60 rounded-md">
                    <span>Pending:</span>
                    <strong className="font-mono tabular-nums">{stats.inactive}</strong>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 bg-slate-100/70 text-slate-700 border border-slate-200/60 rounded-md">
                    <span>Closed:</span>
                    <strong className="font-mono tabular-nums">{stats.closed}</strong>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-md">
                    <span className="flex items-center gap-1">
                      <Archive className="w-2.5 h-2.5 text-zinc-500" />
                      Archived:
                    </span>
                    <strong className="font-mono tabular-nums">{stats.archived}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. BOTTOM SPLIT: RECENT CASES (LEFT) + UPCOMING HEARINGS (RIGHT) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Recent Cases (8 cols) */}
        <div className="lg:col-span-8 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Recent Cases
              </h2>
              <p className="text-xs text-slate-500">
                Latest filings and updated matters across selected docket
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('catalogue')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>All cases ({cases.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl divide-y divide-slate-100 shadow-xs overflow-hidden">
            {recentCases.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No cases found in this branch docket.
              </div>
            ) : (
              recentCases.map((c) => {
                const caseNo = c.case_number || c.suitNumber || 'Suit Pending';
                const branchName = c.branch || c.branchName || 'Fort Portal Office';
                const clientName = c.clientName || c.client || 'CENTENARY BANK';
                const status = c.status || 'Active';

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className="p-4 sm:p-4.5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {c.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-slate-700 font-medium">{caseNo}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-slate-600">{branchName}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-slate-500 uppercase">{clientName}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {renderStatusBadge(status)}
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors hidden sm:block" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Upcoming Hearings (4 cols) */}
        <div className="lg:col-span-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Upcoming Hearings</span>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                {upcomingHearings.length}
              </span>
            </h2>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs min-h-[220px] flex flex-col justify-between">
            {upcomingHearings.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-xs text-slate-400 text-center">
                <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                <p>No upcoming hearings scheduled.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingHearings.slice(0, 4).map((h) => (
                  <div
                    key={h.id}
                    onClick={() => {
                      if (h.caseItem) setSelectedCase(h.caseItem);
                    }}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/90 rounded-xl cursor-pointer transition-colors text-xs border border-slate-200/80 group"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                      <span className="text-amber-800 bg-amber-100/80 border border-amber-200 px-1.5 py-0.2 rounded font-mono">
                        {new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-slate-600 font-mono">{h.time}</span>
                    </div>
                    <div className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {h.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 truncate flex items-center gap-1">
                      <Scale className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{h.court}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 mt-3 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setActiveTab('causelist')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors flex items-center gap-1 ml-auto cursor-pointer"
              >
                <span>Open Cause Diary</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Weekly Matters Modal */}
      <WeeklyMattersNotificationModal
        isOpen={isWeeklyModalOpen}
        onClose={() => setIsWeeklyModalOpen(false)}
      />
    </div>
  );
};
