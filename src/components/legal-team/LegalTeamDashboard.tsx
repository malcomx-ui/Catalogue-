import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CaseItem, CourtHearing, StaffDiaryEntry, StaffDiaryEntryType, getUserRoleBadge } from '../../types';
import { getEffectiveUser } from '../../lib/supabase';
import {
  LegalTeamMember,
  buildLegalTeamDirectory,
  doesCaseMatchMember,
  findLegalTeamMemberByKey,
  isCaseClosedOrArchived,
  normalizePersonName,
} from '../../utils/legalTeam';
import { showCleanMessage } from '../../utils/notification';
import {
  Users,
  Search,
  ArrowLeft,
  CalendarDays,
  Briefcase,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  FileText,
  Scale,
  Building2,
  Mail,
  Award,
  NotebookPen,
  TrendingUp,
} from 'lucide-react';

interface DayScheduleHearing {
  id: string;
  date: string;
  time: string;
  title: string;
  suitNumber: string;
  court: string;
  purpose: string;
  status: string;
  caseItem?: CaseItem;
}

const ENTRY_TYPE_META: Record<
  StaffDiaryEntryType,
  { label: string; short: string; badgeClass: string; dotClass: string }
> = {
  meeting: {
    label: 'Client Meeting',
    short: 'Meeting',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-600',
  },
  deadline: {
    label: 'Task Deadline',
    short: 'Deadline',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-600',
  },
  milestone: {
    label: 'Milestone',
    short: 'Milestone',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-600',
  },
  diary: {
    label: 'Daily Diary / Note',
    short: 'Diary',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-600',
  },
};

function getLocalDateIso(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const LegalTeamDashboard: React.FC = () => {
  const {
    availableUsers,
    cases,
    hearings,
    branches,
    currentUser,
    userPermissions,
    selectedStaffKey,
    setSelectedStaffKey,
    setSelectedCase,
    staffDiaryEntries,
    addStaffDiaryEntry,
    updateStaffDiaryEntry,
    deleteStaffDiaryEntry,
    toggleStaffDiaryComplete,
  } = useApp();

  const effectiveUser = getEffectiveUser(currentUser);

  // Directory filters
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryBranchFilter, setDirectoryBranchFilter] = useState<string>('all');
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState<string>('all');

  // Individual Staff Dashboard view state
  const [dashboardTab, setDashboardTab] = useState<'schedule' | 'cases' | 'logs'>('schedule');
  const [calendarMonthDate, setCalendarMonthDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getLocalDateIso());
  const [caseStatusScope, setCaseStatusScope] = useState<'all' | 'active' | 'closed'>('all');
  const [caseSearch, setCaseSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | StaffDiaryEntryType | 'pending' | 'completed'>('all');

  // Diary / Task Composer state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState<{
    entryType: StaffDiaryEntryType;
    date: string;
    time: string;
    title: string;
    notes: string;
    caseId: string;
  }>({
    entryType: 'diary',
    date: getLocalDateIso(),
    time: '09:30',
    title: '',
    notes: '',
    caseId: '',
  });

  // Build unified directory
  const members = useMemo(
    () =>
      buildLegalTeamDirectory({
        availableUsers,
        cases,
        hearings,
        branches,
        canViewAllBranches: Boolean(userPermissions.canViewAllBranches),
        userBranchId: effectiveUser?.branchId || currentUser?.branchId,
        userBranchName: effectiveUser?.branchName || currentUser?.branchName,
      }),
    [
      availableUsers,
      cases,
      hearings,
      branches,
      userPermissions.canViewAllBranches,
      effectiveUser?.branchId,
      effectiveUser?.branchName,
      currentUser?.branchId,
      currentUser?.branchName,
    ]
  );

  const selectedMember: LegalTeamMember | null = useMemo(
    () => findLegalTeamMemberByKey(members, selectedStaffKey),
    [members, selectedStaffKey]
  );

  const filteredDirectory = useMemo(() => {
    const q = directorySearch.trim().toLowerCase();
    return members.filter((m) => {
      if (directoryBranchFilter !== 'all' && m.branchId !== directoryBranchFilter) return false;
      if (directoryRoleFilter !== 'all') {
        const r = m.role.toLowerCase();
        if (directoryRoleFilter === 'advocate' && !r.includes('lawyer') && !r.includes('advocate') && !r.includes('lead') && !r.includes('partner')) {
          return false;
        }
        if (directoryRoleFilter === 'admin' && !r.includes('admin') && !r.includes('partner')) {
          return false;
        }
        if (directoryRoleFilter === 'support' && !r.includes('clerk') && !r.includes('finance')) {
          return false;
        }
      }
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        m.roleTitle.toLowerCase().includes(q) ||
        m.branchName.toLowerCase().includes(q)
      );
    });
  }, [members, directorySearch, directoryBranchFilter, directoryRoleFilter]);

  // Cases assigned to the selected staff member
  const memberCases = useMemo(() => {
    if (!selectedMember) return [];
    return cases.filter((c) => doesCaseMatchMember(c, selectedMember));
  }, [cases, selectedMember]);

  const memberActiveCases = useMemo(
    () => memberCases.filter((c) => !isCaseClosedOrArchived(c)),
    [memberCases]
  );

  const memberClosedCases = useMemo(
    () => memberCases.filter((c) => isCaseClosedOrArchived(c)),
    [memberCases]
  );

  // Hearings & court dates for the selected staff member
  const memberCourtSchedule = useMemo<DayScheduleHearing[]>(() => {
    if (!selectedMember) return [];
    const targetNorm = normalizePersonName(selectedMember.name);
    const list: DayScheduleHearing[] = [];
    const seen = new Set<string>();

    hearings.forEach((h: CourtHearing) => {
      if (!h.hearingDate) return;
      const matchedCase = cases.find(
        (c) => c.id === h.caseId || (c.suitNumber && c.suitNumber === h.suitNumber)
      );
      const leadNorm = normalizePersonName(h.leadCounsel);
      const assignedMatch = (h.assignedAdvocates || []).some((a) => {
        const an = normalizePersonName(a);
        return an === targetNorm || an.includes(targetNorm) || targetNorm.includes(an);
      });
      const caseMatch = matchedCase ? doesCaseMatchMember(matchedCase, selectedMember) : false;

      if (
        (leadNorm && (leadNorm === targetNorm || leadNorm.includes(targetNorm) || targetNorm.includes(leadNorm))) ||
        assignedMatch ||
        caseMatch
      ) {
        const dedupeKey = `${h.caseId || h.suitNumber}-${h.hearingDate}`;
        seen.add(dedupeKey);
        list.push({
          id: h.id,
          date: h.hearingDate.slice(0, 10),
          time: h.hearingTime || '09:00',
          title: h.caseTitle || matchedCase?.title || h.suitNumber,
          suitNumber: h.suitNumber || matchedCase?.suitNumber || '-',
          court: `${h.courtName}${h.courtRoom ? ` · ${h.courtRoom}` : ''}`,
          purpose: h.hearingPurpose || 'Court Appearance',
          status: h.status || 'Scheduled',
          caseItem: matchedCase,
        });
      }
    });

    // Also include cases with nextHearingDate not yet in hearings
    memberCases.forEach((c) => {
      const nextDate = (c.nextHearingDate || c.hearing_date || '').slice(0, 10);
      if (!nextDate || !/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return;
      const dedupeKey = `${c.id}-${nextDate}`;
      if (seen.has(dedupeKey)) return;
      list.push({
        id: `case-hearing-${c.id}`,
        date: nextDate,
        time: '09:00',
        title: c.title,
        suitNumber: c.suitNumber || c.firmRefNumber,
        court: c.court || c.courtStation || 'Court Session',
        purpose: c.nextHearingPurpose || 'Scheduled Court Date',
        status: isCaseClosedOrArchived(c) ? 'Completed' : 'Scheduled',
        caseItem: c,
      });
    });

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedMember, hearings, cases, memberCases]);

  // Diary entries for selected staff member
  const memberDiaryEntries = useMemo(() => {
    if (!selectedMember) return [];
    const targetNorm = normalizePersonName(selectedMember.name);
    return staffDiaryEntries
      .filter((e) => {
        if (e.staffKey === selectedMember.key) return true;
        return normalizePersonName(e.staffName) === targetNorm;
      })
      .sort((a, b) => {
        const cmp = b.date.localeCompare(a.date);
        if (cmp !== 0) return cmp;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [staffDiaryEntries, selectedMember]);

  // Progressive case notes authored by this staff member
  const memberCaseNotes = useMemo(() => {
    if (!selectedMember) return [];
    const targetNorm = normalizePersonName(selectedMember.name);
    const notes: Array<{
      id: string;
      date: string;
      timestamp: string;
      category: string;
      content: string;
      caseItem: CaseItem;
    }> = [];

    memberCases.forEach((c) => {
      (c.progressiveNotes || []).forEach((n) => {
        const authorNorm = normalizePersonName(n.author);
        if (!authorNorm || authorNorm === targetNorm || authorNorm.includes(targetNorm)) {
          notes.push({
            id: n.id,
            date: (n.timestamp || '').slice(0, 10) || getLocalDateIso(),
            timestamp: n.timestamp,
            category: n.category,
            content: n.content,
            caseItem: c,
          });
        }
      });
    });

    return notes.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }, [selectedMember, memberCases]);

  // Personalized Metrics
  const todayIso = getLocalDateIso();
  const upcomingCourtDatesCount = useMemo(
    () =>
      memberCourtSchedule.filter(
        (h) => h.date >= todayIso && h.status !== 'Completed'
      ).length,
    [memberCourtSchedule, todayIso]
  );

  const completedDiaryMilestonesCount = useMemo(
    () => memberDiaryEntries.filter((e) => e.completed).length,
    [memberDiaryEntries]
  );

  const totalCompletedMilestones = memberClosedCases.length + completedDiaryMilestonesCount;
  const totalTrackedCommitments = memberCases.length + memberDiaryEntries.filter((e) => e.entryType !== 'diary').length;
  const completionRatePct =
    totalTrackedCommitments > 0
      ? Math.round((totalCompletedMilestones / totalTrackedCommitments) * 100)
      : 0;

  // Calendar grid generation for calendarMonthDate
  const calendarDays = useMemo(() => {
    const year = calendarMonthDate.getFullYear();
    const month = calendarMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ dateStr: string; dayNum: number; inMonth: boolean }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      cells.push({
        dateStr: getLocalDateIso(d),
        dayNum: d.getDate(),
        inMonth: false,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({
        dateStr: getLocalDateIso(d),
        dayNum: day,
        inMonth: true,
      });
    }

    // Trailing days to complete 35 or 42 grid
    const totalCells = cells.length <= 35 ? 35 : 42;
    let nextDay = 1;
    while (cells.length < totalCells) {
      const d = new Date(year, month + 1, nextDay++);
      cells.push({
        dateStr: getLocalDateIso(d),
        dayNum: d.getDate(),
        inMonth: false,
      });
    }

    return cells;
  }, [calendarMonthDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<
      string,
      { hearings: DayScheduleHearing[]; entries: StaffDiaryEntry[] }
    >();

    const ensure = (d: string) => {
      let bucket = map.get(d);
      if (!bucket) {
        bucket = { hearings: [], entries: [] };
        map.set(d, bucket);
      }
      return bucket;
    };

    memberCourtSchedule.forEach((h) => {
      ensure(h.date).hearings.push(h);
    });
    memberDiaryEntries.forEach((e) => {
      ensure(e.date).entries.push(e);
    });

    return map;
  }, [memberCourtSchedule, memberDiaryEntries]);

  const selectedDayAgenda = eventsByDate.get(selectedDateStr) || {
    hearings: [],
    entries: [],
  };

  const openNewEntryComposer = (type: StaffDiaryEntryType = 'diary') => {
    setEditingEntryId(null);
    setEntryForm({
      entryType: type,
      date: selectedDateStr,
      time: '09:30',
      title: '',
      notes: '',
      caseId: '',
    });
    setIsComposerOpen(true);
  };

  const openEditEntryComposer = (entry: StaffDiaryEntry) => {
    setEditingEntryId(entry.id);
    setEntryForm({
      entryType: entry.entryType,
      date: entry.date,
      time: entry.time || '09:30',
      title: entry.title,
      notes: entry.notes,
      caseId: entry.caseId || '',
    });
    setIsComposerOpen(true);
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    if (!entryForm.title.trim()) {
      showCleanMessage('Please provide a title for the diary/schedule entry.', 'warning');
      return;
    }

    const linkedCase = memberCases.find((c) => c.id === entryForm.caseId);

    if (editingEntryId) {
      updateStaffDiaryEntry(editingEntryId, {
        entryType: entryForm.entryType,
        date: entryForm.date,
        time: entryForm.time,
        title: entryForm.title.trim(),
        notes: entryForm.notes.trim(),
        caseId: linkedCase?.id,
        suitNumber: linkedCase?.suitNumber,
      });
      showCleanMessage('Diary entry updated.', 'success');
    } else {
      addStaffDiaryEntry({
        staffKey: selectedMember.key,
        staffName: selectedMember.name,
        entryType: entryForm.entryType,
        date: entryForm.date,
        time: entryForm.time,
        title: entryForm.title.trim(),
        notes: entryForm.notes.trim(),
        caseId: linkedCase?.id,
        suitNumber: linkedCase?.suitNumber,
        completed: false,
      });
      showCleanMessage('Entry added to staff diary & calendar.', 'success');
    }

    setSelectedDateStr(entryForm.date);
    setIsComposerOpen(false);
    setEditingEntryId(null);
  };

  const displayedMemberCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase();
    return memberCases.filter((c) => {
      const closed = isCaseClosedOrArchived(c);
      if (caseStatusScope === 'active' && closed) return false;
      if (caseStatusScope === 'closed' && !closed) return false;
      if (!q) return true;
      return (
        (c.suitNumber || '').toLowerCase().includes(q) ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.court || '').toLowerCase().includes(q) ||
        (c.stage || '').toLowerCase().includes(q)
      );
    });
  }, [memberCases, caseStatusScope, caseSearch]);

  const displayedLogs = useMemo(() => {
    return memberDiaryEntries.filter((e) => {
      if (logFilter === 'all') return true;
      if (logFilter === 'pending') return !e.completed;
      if (logFilter === 'completed') return Boolean(e.completed);
      return e.entryType === logFilter;
    });
  }, [memberDiaryEntries, logFilter]);

  // =========================================================================
  // VIEW A: LEGAL TEAM SEARCHABLE DIRECTORY (NO SPECIFIC STAFF SELECTED)
  // =========================================================================
  if (!selectedMember) {
    return (
      <div className="space-y-5 max-w-7xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>Legal Team</span>
              <span>/</span>
              <span className="text-slate-900 font-semibold">Staff Directory</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
              Legal Team &amp; Counsel Workstations
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any advocate or staff member to inspect their personalized caseload metrics, interactive calendar, and daily diary.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right pr-4 border-r border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 block">Firm Staff</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">{members.length}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium text-slate-500 block">Upcoming Hearings</span>
              <span className="text-lg font-bold text-blue-700 font-mono tabular-nums">
                {members.reduce((sum, m) => sum + m.upcomingHearingsCount, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={directorySearch}
              onChange={(e) => setDirectorySearch(e.target.value)}
              placeholder="Search legal team by name, email, role, or branch..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/15"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {userPermissions.canViewAllBranches && (
              <select
                value={directoryBranchFilter}
                onChange={(e) => setDirectoryBranchFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
                aria-label="Filter team by branch"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.city} {b.isHeadquarters ? '(HQ)' : ''}
                  </option>
                ))}
              </select>
            )}

            <select
              value={directoryRoleFilter}
              onChange={(e) => setDirectoryRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
              aria-label="Filter team by role"
            >
              <option value="all">All Roles</option>
              <option value="advocate">Partners &amp; Advocates</option>
              <option value="admin">Administrators</option>
              <option value="support">Finance &amp; Registry</option>
            </select>
          </div>
        </div>

        {/* Staff Directory Grid */}
        {filteredDirectory.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-14 px-6 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-900">No Staff Members Match Your Filter</h3>
            <p className="text-xs text-slate-500 mt-1">
              Clear your search criteria or switch branch filters to view all legal team members.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDirectory.map((member) => {
              const initials = member.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() || '')
                .join('');

              return (
                <button
                  key={member.key}
                  type="button"
                  onClick={() => setSelectedStaffKey(member.key)}
                  className="text-left bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-4 transition-colors flex flex-col justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {initials || 'MK'}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                          {member.name}
                        </h2>
                        <p className="text-xs text-slate-500 truncate">{member.roleTitle}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap shrink-0 ${getUserRoleBadge(
                        member.role
                      )}`}
                    >
                      {member.roleTitle.split('(')[0].trim()}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{member.branchName}</span>
                    </div>
                    {member.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Active Cases</span>
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {member.activeCasesCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Closed</span>
                      <span className="font-mono tabular-nums font-semibold text-emerald-700">
                        {member.closedCasesCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Court Dates</span>
                      <span className="font-mono tabular-nums font-semibold text-blue-700">
                        {member.upcomingHearingsCount}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW B: INDIVIDUAL STAFF DASHBOARD
  // =========================================================================
  const memberInitials = selectedMember.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  const monthHeading = calendarMonthDate.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Bar: Breadcrumb + Staff Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => setSelectedStaffKey(null)}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shrink-0 cursor-pointer"
            title="Back to Legal Team directory"
            aria-label="Back to Legal Team directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
            {memberInitials || 'MK'}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Legal Team</span>
              <span>/</span>
              <span className="font-semibold text-slate-900 truncate">{selectedMember.name}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate mt-0.5">
              {selectedMember.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
              <span className="font-medium text-slate-700">{selectedMember.roleTitle}</span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {selectedMember.branchName}
              </span>
              {selectedMember.advocateRollNo && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                  <Award className="w-3.5 h-3.5 text-slate-400" />
                  {selectedMember.advocateRollNo}
                </span>
              )}
              {selectedMember.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {selectedMember.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Staff Switcher & Primary Action */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <select
            value={selectedMember.key}
            onChange={(e) => setSelectedStaffKey(e.target.value)}
            aria-label="Switch staff member dashboard"
            className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 cursor-pointer max-w-[230px]"
          >
            {members.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name} ({m.activeCasesCount} active)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => openNewEntryComposer('diary')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Diary / Task</span>
          </button>
        </div>
      </div>

      {/* Personalized Stats & Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Active Case Load</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {memberActiveCases.length}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              / {memberCases.length} total
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Completed Milestones</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
              {totalCompletedMilestones}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {memberClosedCases.length} closed · {completedDiaryMilestonesCount} tasks
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Upcoming Court Dates</span>
            <CalendarDays className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700 font-mono tabular-nums">
              {upcomingCourtDatesCount}
            </span>
            <span className="text-xs text-slate-500">Scheduled</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Resolution &amp; Task Rate</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {completionRatePct}%
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {memberDiaryEntries.filter((e) => !e.completed && e.entryType !== 'diary').length} pending tasks
            </span>
          </div>
        </div>
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 inline-flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setDashboardTab('schedule')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
            dashboardTab === 'schedule'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Interactive Calendar &amp; Diary</span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardTab('cases')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
            dashboardTab === 'cases'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Active Cases</span>
          <span className="font-mono tabular-nums text-[10px] px-1.5 py-0.2 rounded bg-white/15">
            {memberCases.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardTab('logs')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
            dashboardTab === 'logs'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <NotebookPen className="w-3.5 h-3.5" />
          <span>Diary &amp; Activity Logs</span>
          <span className="font-mono tabular-nums text-[10px] px-1.5 py-0.2 rounded bg-white/15">
            {memberDiaryEntries.length + memberCaseNotes.length}
          </span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: SPLIT INTERACTIVE CALENDAR & DAILY DIARY                     */}
      {/* =================================================================== */}
      {dashboardTab === 'schedule' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 7 Columns: Monthly Interactive Calendar */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">{monthHeading}</h2>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonthDate(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                    )
                  }
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCalendarMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
                    setSelectedDateStr(getLocalDateIso(now));
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap shrink-0"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonthDate(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                    )
                  }
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600" /> Court Date
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" /> Client Meeting
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600" /> Task Deadline
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-600" /> Diary Note
              </span>
            </div>

            {/* Weekday Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 text-center">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {calendarDays.map((cell) => {
                const bucket = eventsByDate.get(cell.dateStr);
                const hearingsCount = bucket?.hearings.length || 0;
                const meetingsCount = bucket?.entries.filter((e) => e.entryType === 'meeting').length || 0;
                const deadlinesCount =
                  bucket?.entries.filter((e) => e.entryType === 'deadline' || e.entryType === 'milestone')
                    .length || 0;
                const diaryCount = bucket?.entries.filter((e) => e.entryType === 'diary').length || 0;

                const isSelected = cell.dateStr === selectedDateStr;
                const isToday = cell.dateStr === todayIso;

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={`min-h-[76px] p-1.5 text-left flex flex-col justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white'
                        : cell.inMonth
                        ? 'bg-white hover:bg-slate-50 text-slate-900'
                        : 'bg-slate-50/50 text-slate-400 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-mono tabular-nums font-semibold ${
                          isToday && !isSelected
                            ? 'text-blue-700 underline underline-offset-4'
                            : ''
                        }`}
                      >
                        {cell.dayNum}
                      </span>
                      {hearingsCount + (bucket?.entries.length || 0) > 0 && (
                        <span
                          className={`text-[10px] font-mono tabular-nums px-1 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {hearingsCount + (bucket?.entries.length || 0)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1">
                      {hearingsCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-rose-500" title={`${hearingsCount} court date(s)`} />
                      )}
                      {meetingsCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" title={`${meetingsCount} meeting(s)`} />
                      )}
                      {deadlinesCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-amber-500" title={`${deadlinesCount} deadline(s)`} />
                      )}
                      {diaryCount > 0 && (
                        <span
                          className={`w-2 h-2 rounded-full ${isSelected ? 'bg-slate-300' : 'bg-slate-500'}`}
                          title={`${diaryCount} diary note(s)`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 5 Columns: Selected Day Agenda & Diary Composer */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Selected Date Agenda
                </span>
                <h3 className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                  {new Date(`${selectedDateStr}T00:00:00`).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openNewEntryComposer('meeting')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  + Meeting
                </button>
                <button
                  type="button"
                  onClick={() => openNewEntryComposer('deadline')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  + Task
                </button>
                <button
                  type="button"
                  onClick={() => openNewEntryComposer('diary')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  + Note
                </button>
              </div>
            </div>

            {/* Inline Composer Form */}
            {isComposerOpen && (
              <form
                onSubmit={handleSaveEntry}
                className="p-4 border-b border-slate-200 bg-slate-50 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    {editingEntryId ? 'Edit Diary / Schedule Entry' : 'Log New Diary / Schedule Entry'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsComposerOpen(false);
                      setEditingEntryId(null);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label="Close entry form"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={entryForm.entryType}
                    onChange={(e) =>
                      setEntryForm((s) => ({ ...s, entryType: e.target.value as StaffDiaryEntryType }))
                    }
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:outline-none"
                  >
                    <option value="diary">Daily Diary / Note</option>
                    <option value="meeting">Client Meeting</option>
                    <option value="deadline">Task Deadline</option>
                    <option value="milestone">Milestone</option>
                  </select>

                  <input
                    type="date"
                    required
                    value={entryForm.date}
                    onChange={(e) => setEntryForm((s) => ({ ...s, date: e.target.value }))}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 font-mono tabular-nums focus:outline-none"
                  />

                  <input
                    type="time"
                    value={entryForm.time}
                    onChange={(e) => setEntryForm((s) => ({ ...s, time: e.target.value }))}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 font-mono tabular-nums focus:outline-none"
                  />
                </div>

                <input
                  type="text"
                  required
                  value={entryForm.title}
                  onChange={(e) => setEntryForm((s) => ({ ...s, title: e.target.value }))}
                  placeholder="Entry title (e.g., Client briefing on affidavit, File submissions)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                />

                {memberCases.length > 0 && (
                  <select
                    value={entryForm.caseId}
                    onChange={(e) => setEntryForm((s) => ({ ...s, caseId: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none"
                  >
                    <option value="">Optional: Link to assigned case...</option>
                    {memberCases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.suitNumber || c.firmRefNumber} — {c.title}
                      </option>
                    ))}
                  </select>
                )}

                <textarea
                  rows={3}
                  value={entryForm.notes}
                  onChange={(e) => setEntryForm((s) => ({ ...s, notes: e.target.value }))}
                  placeholder="Detailed notes, client instructions, or milestone checklist..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsComposerOpen(false);
                      setEditingEntryId(null);
                    }}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingEntryId ? 'Save Update' : 'Save Entry'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Day Items List */}
            <div className="p-4 space-y-4 max-h-[520px] overflow-y-auto">
              {selectedDayAgenda.hearings.length === 0 && selectedDayAgenda.entries.length === 0 ? (
                <div className="py-10 text-center">
                  <CalendarDays className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No Scheduled Events or Diary Notes</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Add a client meeting, task deadline, or daily diary entry for this date.
                  </p>
                </div>
              ) : (
                <>
                  {/* Court Hearings */}
                  {selectedDayAgenda.hearings.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                        Scheduled Court Dates ({selectedDayAgenda.hearings.length})
                      </div>
                      {selectedDayAgenda.hearings.map((h) => (
                        <div
                          key={h.id}
                          onClick={() => h.caseItem && setSelectedCase(h.caseItem)}
                          className={`p-3 rounded-lg border border-rose-200 bg-rose-50/40 text-xs space-y-1 ${
                            h.caseItem ? 'cursor-pointer hover:bg-rose-50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-rose-900">{h.suitNumber}</span>
                            <span className="font-mono tabular-nums text-[11px] text-rose-700">
                              {h.time}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-900">{h.title}</div>
                          <div className="text-[11px] text-slate-600">
                            {h.purpose} &middot; {h.court}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Staff Diary, Meetings & Task Deadlines */}
                  {selectedDayAgenda.entries.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Diary, Meetings &amp; Tasks ({selectedDayAgenda.entries.length})
                      </div>
                      {selectedDayAgenda.entries.map((entry) => {
                        const meta = ENTRY_TYPE_META[entry.entryType] || ENTRY_TYPE_META.diary;
                        return (
                          <div
                            key={entry.id}
                            className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {entry.entryType !== 'diary' && (
                                  <button
                                    type="button"
                                    onClick={() => toggleStaffDiaryComplete(entry.id)}
                                    title={entry.completed ? 'Mark as pending' : 'Mark completed'}
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                                      entry.completed
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'border-slate-300 hover:border-slate-500'
                                    }`}
                                  >
                                    {entry.completed && <Check className="w-3 h-3" />}
                                  </button>
                                )}
                                <span
                                  className={`font-semibold truncate ${
                                    entry.completed ? 'line-through text-slate-400' : 'text-slate-900'
                                  }`}
                                >
                                  {entry.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${meta.badgeClass}`}
                                >
                                  {meta.short}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openEditEntryComposer(entry)}
                                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                  aria-label="Edit entry"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteStaffDiaryEntry(entry.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                  aria-label="Delete entry"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {entry.notes && (
                              <p className="text-[11px] text-slate-600 whitespace-pre-line">
                                {entry.notes}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono tabular-nums">
                              {entry.time && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {entry.time}
                                </span>
                              )}
                              {entry.suitNumber && (
                                <span className="inline-flex items-center gap-1 text-slate-600">
                                  <Scale className="w-3 h-3" />
                                  {entry.suitNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: ASSIGNED CASES & MILESTONES                                  */}
      {/* =================================================================== */}
      {dashboardTab === 'cases' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={caseSearch}
                onChange={(e) => setCaseSearch(e.target.value)}
                placeholder="Search assigned suit number, title, court, or stage..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
              />
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 shrink-0">
              {(['all', 'active', 'closed'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCaseStatusScope(mode)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap shrink-0 cursor-pointer ${
                    caseStatusScope === mode
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'all'
                    ? `All (${memberCases.length})`
                    : mode === 'active'
                    ? `Active (${memberActiveCases.length})`
                    : `Closed (${memberClosedCases.length})`}
                </button>
              ))}
            </div>
          </div>

          {displayedMemberCases.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Briefcase className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No Matching Matters</p>
              <p className="text-[11px] text-slate-500 mt-1">
                No cases match this filter for {selectedMember.name}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Suit No.</th>
                    <th className="py-3 px-4">Matter Title</th>
                    <th className="py-3 px-4">Court / Station</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4">Next Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {displayedMemberCases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {c.suitNumber || c.firmRefNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{c.title}</td>
                      <td className="py-3 px-4 text-slate-600">{c.court || c.branchName}</td>
                      <td className="py-3 px-4 text-slate-600">{c.stage}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {c.nextHearingDate || c.hearing_date || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                          {c.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: DIARY & ACTIVITY LOGS                                        */}
      {/* =================================================================== */}
      {dashboardTab === 'logs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Diary & Task Logs */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
              <h2 className="text-sm font-bold text-slate-900">
                Personal Diary, Meetings &amp; Task Log
              </h2>
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value as any)}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
              >
                <option value="all">All Entries</option>
                <option value="pending">Pending Tasks</option>
                <option value="completed">Completed</option>
                <option value="meeting">Client Meetings</option>
                <option value="deadline">Task Deadlines</option>
                <option value="milestone">Milestones</option>
                <option value="diary">Diary Notes</option>
              </select>
            </div>

            {displayedLogs.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <NotebookPen className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No Diary Entries Recorded Yet</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Use &ldquo;New Diary / Task&rdquo; to log daily notes, meetings, and milestones.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayedLogs.map((entry) => {
                  const meta = ENTRY_TYPE_META[entry.entryType] || ENTRY_TYPE_META.diary;
                  return (
                    <div key={entry.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                          <span className="font-mono tabular-nums text-[11px] text-slate-500">
                            {entry.date} {entry.time ? `· ${entry.time}` : ''}
                          </span>
                          {entry.suitNumber && (
                            <span className="font-mono text-[11px] text-slate-600">
                              [{entry.suitNumber}]
                            </span>
                          )}
                        </div>
                        <div
                          className={`font-semibold text-sm ${
                            entry.completed ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {entry.title}
                        </div>
                        {entry.notes && (
                          <p className="text-slate-600 whitespace-pre-line">{entry.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {entry.entryType !== 'diary' && (
                          <button
                            type="button"
                            onClick={() => toggleStaffDiaryComplete(entry.id)}
                            className={`px-2 py-1 rounded border text-[11px] font-semibold cursor-pointer ${
                              entry.completed
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {entry.completed ? 'Done' : 'Complete'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteStaffDiaryEntry(entry.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                          aria-label="Delete diary log"
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

          {/* Case Progressive Notes */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70">
              <h2 className="text-sm font-bold text-slate-900">Case Progressive Notes</h2>
            </div>

            {memberCaseNotes.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <FileText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No Progressive Case Notes</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Court milestone and strategy notes logged on assigned matters appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                {memberCaseNotes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => setSelectedCase(n.caseItem)}
                    className="p-3.5 hover:bg-slate-50 cursor-pointer space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-slate-900">
                        {n.caseItem.suitNumber || n.caseItem.firmRefNumber}
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-slate-400">
                        {n.date}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-blue-700">{n.category}</div>
                    <p className="text-slate-600">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalTeamDashboard;
