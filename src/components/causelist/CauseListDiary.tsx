import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CourtHearing, CaseItem } from '../../types';
import { HearingOutcomeModal } from './HearingOutcomeModal';
import { ScheduleHearingModal } from './ScheduleHearingModal';
import { WeeklyMattersNotificationModal } from './WeeklyMattersNotificationModal';
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Printer,
  CheckCircle2,
  Clock,
  Video,
  Plus,
  Scale,
  Gavel,
  ChevronLeft,
  ChevronRight,
  Bell,
  Building2,
  List,
  Layers,
  Filter,
} from 'lucide-react';

export interface UnifiedDiaryEvent {
  id: string;
  source: 'hearing' | 'case';
  caseId?: string;
  hearingId?: string;
  date: string; // YYYY-MM-DD
  time: string;
  type: 'hearing' | 'milestone' | 'deadline';
  typeLabel: string;
  title: string;
  mkCaseNo: string;
  suitNo?: string;
  court: string;
  courtRoom?: string;
  judge?: string;
  counsel?: string;
  purpose: string;
  notes?: string;
  status: string;
  branchId?: string;
  branchName?: string;
  virtualCourtUrl?: string;
  caseItem?: CaseItem;
  hearingItem?: CourtHearing;
}

export const CauseListDiary: React.FC = () => {
  const {
    hearings,
    cases,
    setSelectedCase,
    selectedBranchFilter,
    branches,
    setPrintableCauseDate,
  } = useApp();

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'hearing' | 'milestone' | 'deadline'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedHearingForOutcome, setSelectedHearingForOutcome] = useState<CourtHearing | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isWeeklyAlertOpen, setIsWeeklyAlertOpen] = useState(false);

  // Calendar month state
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Current dynamic dates
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  const next7DaysStr = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, [today]);

  // Unified synchronized events list
  const unifiedEvents = useMemo(() => {
    const list: UnifiedDiaryEvent[] = [];
    const seenCaseAndDate = new Set<string>();

    // 1. Process explicit court hearings
    hearings.forEach((h) => {
      if (!h.hearingDate) return;
      const matchedCase = cases.find(
        (c) => c.id === h.caseId || (c.suitNumber && c.suitNumber === h.suitNumber)
      );
      const branchObj = branches.find((b) => b.id === h.branchId) ||
        (matchedCase ? branches.find((b) => b.id === matchedCase.branchId) : undefined);

      const isMention = (h.hearingPurpose || '').toLowerCase().includes('mention');
      const isRuling = (h.hearingPurpose || '').toLowerCase().includes('ruling') || (h.hearingPurpose || '').toLowerCase().includes('judgment');
      const isDeadline = (h.hearingPurpose || '').toLowerCase().includes('filing') || (h.hearingPurpose || '').toLowerCase().includes('deadline');

      const type: 'hearing' | 'milestone' | 'deadline' = isDeadline ? 'deadline' : (isMention || isRuling ? 'milestone' : 'hearing');
      const typeLabel = isDeadline ? 'Filing Deadline' : isRuling ? 'Ruling / Judgment' : isMention ? 'Court Mention' : 'Court Hearing';

      const key = `${h.caseId || matchedCase?.id || h.suitNumber}_${h.hearingDate}`;
      seenCaseAndDate.add(key);

      list.push({
        id: `hearing-${h.id}`,
        source: 'hearing',
        hearingId: h.id,
        caseId: h.caseId || matchedCase?.id,
        date: h.hearingDate,
        time: h.hearingTime || '09:30 AM',
        type,
        typeLabel,
        title: h.caseTitle || matchedCase?.title || 'Litigation Matter',
        mkCaseNo: h.suitNumber || matchedCase?.case_number || matchedCase?.suitNumber || 'MK File Pending',
        suitNo: matchedCase?.suit_no,
        court: h.courtName || matchedCase?.court || 'High Court of Uganda',
        courtRoom: h.courtRoom || 'Court Room 1',
        judge: h.presidingJudge || matchedCase?.presidingJudge || 'Court Registrar',
        counsel: h.leadCounsel || matchedCase?.leadAdvocate || 'Assigned Counsel',
        purpose: h.hearingPurpose || 'Court Appearance',
        notes: h.courtNotes,
        status: h.status || 'Scheduled',
        branchId: h.branchId || matchedCase?.branchId,
        branchName: branchObj?.name || matchedCase?.branchName || 'Fort Portal Office',
        virtualCourtUrl: h.virtualCourtUrl,
        caseItem: matchedCase,
        hearingItem: h,
      });
    });

    // 2. Synchronize hearing dates directly on case records
    cases.forEach((c) => {
      const hearingDate = c.hearing_date || c.nextHearingDate;
      if (!hearingDate) return;

      const key = `${c.id}_${hearingDate}`;
      if (seenCaseAndDate.has(key)) return;
      seenCaseAndDate.add(key);

      const branchObj = branches.find((b) => b.id === c.branchId);
      const purpose = c.nextHearingPurpose || 'Substantive Court Hearing';
      const isMention = purpose.toLowerCase().includes('mention') || (c.stage || '').toLowerCase().includes('mention');
      const isRuling = purpose.toLowerCase().includes('ruling') || purpose.toLowerCase().includes('judgment') || (c.stage || '').toLowerCase().includes('ruling');
      const isDeadline = purpose.toLowerCase().includes('filing') || purpose.toLowerCase().includes('deadline');

      const type: 'hearing' | 'milestone' | 'deadline' = isDeadline ? 'deadline' : (isMention || isRuling ? 'milestone' : 'hearing');
      const typeLabel = isDeadline ? 'Filing Deadline' : isRuling ? 'Ruling / Judgment' : isMention ? 'Court Mention' : 'Court Hearing';

      list.push({
        id: `case-hearing-${c.id}`,
        source: 'case',
        caseId: c.id,
        date: hearingDate,
        time: '09:30 AM',
        type,
        typeLabel,
        title: c.title || 'Litigation Matter',
        mkCaseNo: c.case_number || c.suitNumber || 'MK File Pending',
        suitNo: c.suit_no,
        court: c.court || 'High Court of Uganda',
        courtRoom: 'Main Registry / Chambers',
        judge: c.presidingJudge || 'Hon. Judge in Charge',
        counsel: c.leadAdvocate || c.person_in_conduct || 'Assigned Counsel',
        purpose,
        notes: c.notes,
        status: 'Scheduled',
        branchId: c.branchId,
        branchName: branchObj?.name || c.branchName || c.branch || 'Fort Portal Office',
        caseItem: c,
      });
    });

    return list.sort((a, b) => {
      const timeA = new Date(`${a.date} ${a.time || '09:30 AM'}`).getTime();
      const timeB = new Date(`${b.date} ${b.time || '09:30 AM'}`).getTime();
      return timeA - timeB;
    });
  }, [hearings, cases, branches]);

  // Filtered diary events
  const filteredEvents = useMemo(() => {
    return unifiedEvents.filter((ev) => {
      // Branch filter
      if (selectedBranchFilter !== 'all' && ev.branchId && ev.branchId !== selectedBranchFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && ev.status !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && ev.type !== typeFilter) {
        return false;
      }

      // Date filter
      if (dateFilter === 'today') {
        return ev.date === todayStr;
      }
      if (dateFilter === 'week') {
        return ev.date >= todayStr && ev.date <= next7DaysStr;
      }
      if (dateFilter === 'month') {
        const yearMonth = todayStr.slice(0, 7);
        return ev.date.startsWith(yearMonth);
      }

      return true;
    });
  }, [unifiedEvents, selectedBranchFilter, statusFilter, typeFilter, dateFilter, todayStr, next7DaysStr]);

  // Count matters happening this week (next 7 days)
  const weeklyCount = useMemo(() => {
    return unifiedEvents.filter((ev) => ev.date >= todayStr && ev.date <= next7DaysStr).length;
  }, [unifiedEvents, todayStr, next7DaysStr]);

  // Calendar calculations (Month View)
  const calendarYear = currentCalendarDate.getFullYear();
  const calendarMonth = currentCalendarDate.getMonth();

  const daysInMonth = useMemo(() => {
    return new Date(calendarYear, calendarMonth + 1, 0).getDate();
  }, [calendarYear, calendarMonth]);

  const firstDayIndex = useMemo(() => {
    return new Date(calendarYear, calendarMonth, 1).getDay();
  }, [calendarYear, calendarMonth]);

  const monthName = useMemo(() => {
    return currentCalendarDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }, [currentCalendarDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, UnifiedDiaryEvent[]>();
    unifiedEvents.forEach((ev) => {
      const arr = map.get(ev.date) || [];
      arr.push(ev);
      map.set(ev.date, arr);
    });
    return map;
  }, [unifiedEvents]);

  const selectedDayEvents = useMemo(() => {
    return eventsByDate.get(selectedDayStr) || [];
  }, [eventsByDate, selectedDayStr]);

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(calendarYear, calendarMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(calendarYear, calendarMonth + 1, 1));
  };

  const handleTodayClick = () => {
    const now = new Date();
    setCurrentCalendarDate(now);
    setSelectedDayStr(now.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-4">
      {/* Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Cause List &amp; Calendar Diary
            </h1>
            {weeklyCount > 0 && (
              <button
                type="button"
                onClick={() => setIsWeeklyAlertOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer animate-pulse"
                title="View Weekly Matters Alert"
              >
                <Bell className="w-3 h-3 text-amber-700" />
                <span>{weeklyCount} this week</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized hearing dates, filing deadlines, and procedural milestones across all 7 regional offices
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dual View Toggle: List vs Interactive Calendar */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Cause List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
              <span>Interactive Calendar</span>
            </button>
          </div>

          <button
            onClick={() => setIsScheduleOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs min-h-[34px]"
            title="Schedule a court hearing or filing fixture"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Fixture</span>
          </button>

          <button
            onClick={() => setPrintableCauseDate(todayStr)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors shadow-2xs min-h-[34px]"
            title="Print Daily Cause List"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Cause Sheet</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range filter buttons */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'week', label: 'This Week (7 Days)' },
              { id: 'today', label: 'Today' },
              { id: 'month', label: 'This Month' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  dateFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Matter Category Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 min-h-[34px] focus:outline-none focus:border-blue-600 font-medium"
          >
            <option value="all">All Matters &amp; Fixtures</option>
            <option value="hearing">Court Hearings Only</option>
            <option value="milestone">Mentions &amp; Rulings</option>
            <option value="deadline">Filing Deadlines</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 min-h-[34px] focus:outline-none focus:border-blue-600 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Adjourned">Adjourned</option>
            <option value="Part-Heard">Part-Heard</option>
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span>{filteredEvents.length} fixtures in view</span>
        </div>
      </div>

      {/* VIEW MODE 1: CAUSE LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-2.5">
          {filteredEvents.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-2">
              <CalendarDays className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-semibold text-sm text-slate-800">
                No fixtures found matching current criteria
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try switching the date filter to &ldquo;All Dates&rdquo; or click &ldquo;Schedule Fixture&rdquo; to add a new court appearance or procedural deadline.
              </p>
            </div>
          ) : (
            filteredEvents.map((ev) => {
              const isToday = ev.date === todayStr;
              const isUpcomingWeek = ev.date >= todayStr && ev.date <= next7DaysStr;

              const typeBadgeClass =
                ev.type === 'milestone'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : ev.type === 'deadline'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200';

              return (
                <div
                  key={ev.id}
                  className={`bg-white p-4 rounded-xl border transition-all shadow-2xs hover:border-slate-300 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs ${
                    isToday
                      ? 'border-l-4 border-l-rose-500 border-slate-200 bg-rose-50/10'
                      : isUpcomingWeek
                      ? 'border-l-4 border-l-amber-500 border-slate-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {new Date(ev.date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>

                      {isToday && (
                        <span className="bg-rose-500 text-white font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                          TODAY
                        </span>
                      )}

                      <span className="text-slate-400">·</span>
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {ev.time}
                      </span>

                      <span className="text-slate-400">·</span>
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] border ${typeBadgeClass}`}>
                        {ev.typeLabel}
                      </span>

                      <span className="text-slate-400">·</span>
                      <span className="text-blue-700 font-medium flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-blue-500" />
                        {ev.branchName}
                      </span>
                    </div>

                    <h3 className="font-semibold text-sm text-slate-900 leading-snug">
                      {ev.title}
                    </h3>

                    {/* Reference numbers */}
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        MK: <strong>{ev.mkCaseNo}</strong>
                      </span>
                      {ev.suitNo && (
                        <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200 font-mono">
                          Court Suit No: <strong>{ev.suitNo}</strong>
                        </span>
                      )}
                    </div>

                    <div className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <strong className="text-slate-900">Business in Court:</strong> {ev.purpose}
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Court: <strong className="text-slate-800">{ev.court} ({ev.courtRoom})</strong></span>
                      {ev.judge && (
                        <span>Judge: <strong className="text-slate-800">{ev.judge}</strong></span>
                      )}
                      {ev.counsel && (
                        <span>Counsel: <strong className="text-slate-800">{ev.counsel}</strong></span>
                      )}
                    </div>

                    {ev.notes && (
                      <div className="text-[11px] text-slate-600 bg-amber-50/60 border border-amber-200/60 p-2 rounded">
                        <strong>Directions / Notes:</strong> {ev.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                        ev.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ev.status === 'Adjourned'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {ev.status}
                    </span>

                    <div className="flex items-center gap-1.5 mt-2">
                      {ev.virtualCourtUrl && (
                        <a
                          href={ev.virtualCourtUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[11px] font-medium hover:bg-blue-100 flex items-center gap-1"
                        >
                          <Video className="w-3 h-3" />
                          <span>Link</span>
                        </a>
                      )}

                      {ev.hearingItem && (
                        <button
                          onClick={() => setSelectedHearingForOutcome(ev.hearingItem!)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium transition-colors"
                        >
                          Record Outcome
                        </button>
                      )}

                      {ev.caseItem && (
                        <button
                          onClick={() => setSelectedCase(ev.caseItem!)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-medium transition-colors border border-slate-200"
                        >
                          Case
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: INTERACTIVE MONTHLY CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar Grid (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            {/* Calendar Month Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  {monthName}
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleTodayClick}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Month Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Empty leading day slots */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-20 bg-slate-50/50 rounded-lg border border-transparent" />
              ))}

              {/* Month day cells */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = selectedDayStr === dateKey;
                const isToday = dateKey === todayStr;
                const dayEvents = eventsByDate.get(dateKey) || [];

                return (
                  <div
                    key={dateKey}
                    onClick={() => setSelectedDayStr(dateKey)}
                    className={`h-20 p-1.5 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : isToday
                        ? 'border-rose-400 bg-rose-50/20'
                        : dayEvents.length > 0
                        ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                        : 'border-slate-100 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-rose-600 text-white'
                            : isSelected
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-800'
                        }`}
                      >
                        {dayNum}
                      </span>

                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-900 text-white font-mono">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Event pills preview */}
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className="text-[9px] truncate px-1 py-0.5 rounded font-medium bg-slate-100 text-slate-800"
                        >
                          {ev.mkCaseNo || ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[8px] text-slate-400 font-medium pl-1">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Agenda (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-100 pb-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Day Agenda
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {new Date(selectedDayStr + 'T00:00:00').toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {selectedDayEvents.length} matter{selectedDayEvents.length === 1 ? '' : 's'} scheduled
                </div>
              </div>

              {/* Day events list */}
              <div className="mt-3 space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {selectedDayEvents.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No hearings or deadlines scheduled for this day.
                  </div>
                ) : (
                  selectedDayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-blue-700">{ev.time}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-700">
                          {ev.typeLabel}
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 leading-snug">
                        {ev.title}
                      </div>

                      <div className="font-mono text-[10px] text-slate-600">
                        MK: <strong>{ev.mkCaseNo}</strong>
                        {ev.suitNo && <span className="ml-1 text-blue-800">· Suit: {ev.suitNo}</span>}
                      </div>

                      <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100">
                        {ev.purpose}
                      </div>

                      <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                        <span>{ev.court}</span>
                        {ev.caseItem && (
                          <button
                            type="button"
                            onClick={() => setSelectedCase(ev.caseItem!)}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            View Case &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPrintableCauseDate(selectedDayStr)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Print Cause List for This Day</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outcome Recording Modal */}
      {selectedHearingForOutcome && (
        <HearingOutcomeModal
          hearing={selectedHearingForOutcome}
          onClose={() => setSelectedHearingForOutcome(null)}
        />
      )}

      {/* Schedule Fixture Modal */}
      <ScheduleHearingModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
      />

      {/* Weekly Alert Pop-up Modal */}
      <WeeklyMattersNotificationModal
        isOpen={isWeeklyAlertOpen}
        onClose={() => setIsWeeklyAlertOpen(false)}
        onNavigateToDiary={() => setDateFilter('week')}
      />
    </div>
  );
};
