import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { CaseItem, CourtHearing, StaffDiaryEntry } from '../../types';
import { isSupabaseConfigured, supabase, getEffectiveUser } from '../../lib/supabase';
import { HearingOutcomeModal } from './HearingOutcomeModal';
import { ScheduleHearingModal } from './ScheduleHearingModal';
import { WeeklyMattersNotificationModal } from './WeeklyMattersNotificationModal';
import { AddDiaryEntryModal, DiaryCategoryPreset } from './AddDiaryEntryModal';
import {
  Bell,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Printer,
  Search,
  Video,
  X,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export type ScheduleViewMode = 'agenda' | 'month' | 'week' | 'day';
export type CalendarCategoryKey = 'hearing' | 'deadline' | 'meeting';

export interface UnifiedCalendarEvent {
  id: string;
  source: 'supabase_reminder' | 'hearing' | 'case' | 'diary';
  category: CalendarCategoryKey;
  viewCategory: string;
  colorTag: string;
  date: string; // YYYY-MM-DD
  timeLabel: string;
  sortTimestamp: number;
  title: string;
  caseNumber: string;
  suitNo?: string;
  branchId?: string;
  branchName: string;
  court?: string;
  courtRoom?: string;
  judge?: string;
  counsel?: string;
  purpose?: string;
  notes?: string;
  status: string;
  completed?: boolean;
  virtualCourtUrl?: string;
  caseItem?: CaseItem;
  hearingItem?: CourtHearing;
  diaryItem?: StaffDiaryEntry;
}

interface SmartAlertItem {
  id: string;
  source: 'supabase' | 'derived';
  title: string;
  message: string;
  timestampLabel: string;
  colorTag: string;
  categoryLabel: string;
  caseId?: string;
  dateStr?: string;
  isRead?: boolean;
}

const CATEGORY_CONFIG: Record<
  CalendarCategoryKey,
  { label: string; shortLabel: string; colorTag: string; dotClass: string; textClass: string }
> = {
  hearing: {
    label: 'Court Appearances & Hearings',
    shortLabel: 'Court Hearing',
    colorTag: '#ef4444',
    dotClass: 'bg-red-500',
    textClass: 'text-red-700 dark:text-red-400',
  },
  deadline: {
    label: 'Statutory & Perfection Deadlines',
    shortLabel: 'Statutory Deadline',
    colorTag: '#3b82f6',
    dotClass: 'bg-blue-500',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  meeting: {
    label: 'Internal Reviews & Client Meetings',
    shortLabel: 'Review / Meeting',
    colorTag: '#22c55e',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700 dark:text-emerald-400',
  },
};

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseSortTime(dateStr: string, timeStr?: string): number {
  if (!dateStr) return 0;
  const cleanTime = (timeStr || '09:30 AM').trim();
  const parsed = new Date(`${dateStr} ${cleanTime}`);
  if (!isNaN(parsed.getTime())) return parsed.getTime();
  const fallback = new Date(`${dateStr}T09:30:00`);
  return isNaN(fallback.getTime()) ? 0 : fallback.getTime();
}

function classifyCategory(
  rawCategory?: string,
  rawColor?: string,
  purpose?: string,
  stage?: string
): CalendarCategoryKey {
  const cat = (rawCategory || '').toLowerCase();
  const col = (rawColor || '').toLowerCase();
  const text = `${purpose || ''} ${stage || ''}`.toLowerCase();

  if (
    cat.includes('internal') ||
    cat.includes('meeting') ||
    cat.includes('review') ||
    col === '#22c55e' ||
    col === '#16a34a' ||
    col === 'green'
  ) {
    return 'meeting';
  }
  if (
    cat.includes('statutory') ||
    cat.includes('perfection') ||
    cat.includes('deadline') ||
    cat.includes('sla') ||
    col === '#3b82f6' ||
    col === '#2563eb' ||
    col === 'blue' ||
    text.includes('filing') ||
    text.includes('deadline') ||
    text.includes('perfection') ||
    text.includes('statutory')
  ) {
    return 'deadline';
  }
  return 'hearing';
}

export const CauseListCalendar: React.FC = () => {
  const {
    hearings,
    cases,
    staffDiaryEntries,
    toggleStaffDiaryComplete,
    setSelectedCase,
    selectedBranchFilter,
    setSelectedBranchFilter,
    branches,
    currentUser,
    userPermissions,
    setPrintableCauseDate,
  } = useApp();

  const effectiveUser = useMemo(() => getEffectiveUser(currentUser), [currentUser]);
  const canViewAllBranches = Boolean(userPermissions.canViewAllBranches);
  const userAssignedBranchId = effectiveUser?.branchId || currentUser?.branchId || 'kla-hq';

  // Synced branch filter (defaults to 'all' for global users, locked to assigned branch for branch-scoped users)
  const [selectedBranch, setSelectedBranch] = useState<string>(() =>
    canViewAllBranches ? selectedBranchFilter || 'all' : userAssignedBranchId
  );

  useEffect(() => {
    if (!canViewAllBranches) {
      setSelectedBranch(userAssignedBranchId);
    } else if (selectedBranchFilter && selectedBranchFilter !== selectedBranch) {
      setSelectedBranch(selectedBranchFilter);
    }
  }, [canViewAllBranches, userAssignedBranchId, selectedBranchFilter]);

  const handleBranchChange = (nextBranch: string) => {
    if (!canViewAllBranches) return;
    setSelectedBranch(nextBranch);
    setSelectedBranchFilter(nextBranch);
  };

  const [viewMode, setViewMode] = useState<ScheduleViewMode>('agenda');
  const [categoryFilter, setCategoryFilter] = useState<'all' | CalendarCategoryKey>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [anchorDate, setAnchorDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => toLocalYmd(new Date()));

  // Modals
  const [selectedHearingForOutcome, setSelectedHearingForOutcome] = useState<CourtHearing | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
  const [isDiaryModalOpen, setIsDiaryModalOpen] = useState<boolean>(false);
  const [diaryModalPreset, setDiaryModalPreset] = useState<DiaryCategoryPreset>('deadline');
  const [isWeeklyAlertOpen, setIsWeeklyAlertOpen] = useState<boolean>(false);

  // Live Supabase reminder & notifications state
  const [supabaseReminderCases, setSupabaseReminderCases] = useState<any[]>([]);
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(() => new Set());
  const [loadingCloud, setLoadingCloud] = useState<boolean>(false);

  const fetchCloudScheduleAndAlerts = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoadingCloud(true);

    try {
      // 1. Query cases with reminder_at (gracefully handle if columns aren't migrated yet)
      let caseQuery = supabase
        .from('cases')
        .select(
          'id, title, case_number, suit_no, branch_id, branch, hearing_date, reminder_at, view_category, color_tag, court, status'
        )
        .not('reminder_at', 'is', null);

      const effectiveBranch = canViewAllBranches ? selectedBranch : userAssignedBranchId;
      if (effectiveBranch && effectiveBranch !== 'all') {
        caseQuery = caseQuery.eq('branch_id', effectiveBranch);
      }

      const { data: caseRows, error: caseErr } = await caseQuery;
      if (caseErr) {
        // Ignore missing column errors cleanly (42703 / PGRST204) until migration is executed
        if (caseErr.code !== '42703' && caseErr.code !== 'PGRST204') {
          console.warn('CauseListCalendar schedule query notice:', caseErr.message);
        }
        setSupabaseReminderCases([]);
      } else {
        setSupabaseReminderCases(caseRows || []);
      }

      // 2. Query dashboard_notifications (gracefully handle if table isn't created yet)
      let notifQuery = supabase
        .from('dashboard_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);

      if (effectiveBranch && effectiveBranch !== 'all') {
        notifQuery = notifQuery.or(`branch_id.eq.${effectiveBranch},branch_id.is.null`);
      }

      const { data: notifRows, error: notifErr } = await notifQuery;
      if (notifErr) {
        if (notifErr.code !== 'PGRST205' && notifErr.code !== '42P01') {
          console.warn('CauseListCalendar notifications query notice:', notifErr.message);
        }
        setDbNotifications([]);
      } else {
        setDbNotifications((notifRows || []).filter((n: any) => !n.is_read));
      }
    } catch {
      // Fail safely to AppContext records
    } finally {
      setLoadingCloud(false);
    }
  }, [canViewAllBranches, selectedBranch, userAssignedBranchId]);

  useEffect(() => {
    fetchCloudScheduleAndAlerts();
  }, [fetchCloudScheduleAndAlerts]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStr = useMemo(() => toLocalYmd(today), [today]);

  const next7DaysStr = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 7);
    return toLocalYmd(d);
  }, [today]);

  // Unified synchronized schedule events across Supabase reminders, court hearings, case dates, and diary entries
  const unifiedEvents = useMemo<UnifiedCalendarEvent[]>(() => {
    const list: UnifiedCalendarEvent[] = [];
    const seenCaseDateKeys = new Set<string>();

    const resolveBranchName = (branchId?: string, fallbackName?: string) => {
      if (branchId) {
        const b = branches.find((br) => br.id === branchId);
        if (b) return b.name;
      }
      return fallbackName || 'Kampala Central (Head Office)';
    };

    // 1. Live Supabase reminder_at rows
    supabaseReminderCases.forEach((row: any) => {
      if (!row?.reminder_at) return;
      const dt = new Date(row.reminder_at);
      if (isNaN(dt.getTime())) return;
      const dateStr = toLocalYmd(dt);
      const timeLabel = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const category = classifyCategory(row.view_category, row.color_tag, row.status);
      const cfg = CATEGORY_CONFIG[category];
      const matchedCase = cases.find((c) => c.id === row.id);

      seenCaseDateKeys.add(`${row.id}_${dateStr}`);

      list.push({
        id: `sb-reminder-${row.id}-${dateStr}`,
        source: 'supabase_reminder',
        category,
        viewCategory: row.view_category || cfg.label,
        colorTag: row.color_tag || cfg.colorTag,
        date: dateStr,
        timeLabel,
        sortTimestamp: dt.getTime(),
        title: row.title || matchedCase?.title || 'Scheduled Matter Reminder',
        caseNumber: row.case_number || matchedCase?.case_number || matchedCase?.suitNumber || 'Pending Ref',
        suitNo: row.suit_no || matchedCase?.suit_no,
        branchId: row.branch_id || matchedCase?.branchId,
        branchName: resolveBranchName(row.branch_id || matchedCase?.branchId, row.branch || matchedCase?.branchName),
        court: row.court || matchedCase?.court || 'High Court of Uganda',
        status: row.status || 'Scheduled',
        caseItem: matchedCase,
      });
    });

    // 2. Explicit court hearings
    hearings.forEach((h) => {
      if (!h.hearingDate) return;
      const matchedCase = cases.find(
        (c) => c.id === h.caseId || (c.suitNumber && c.suitNumber === h.suitNumber)
      );
      const category = classifyCategory(undefined, undefined, h.hearingPurpose);
      const cfg = CATEGORY_CONFIG[category];
      const key = `${h.caseId || matchedCase?.id || h.suitNumber}_${h.hearingDate}`;
      seenCaseDateKeys.add(key);

      const branchId = h.branchId || matchedCase?.branchId;
      list.push({
        id: `hearing-${h.id}`,
        source: 'hearing',
        category,
        viewCategory: cfg.label,
        colorTag: cfg.colorTag,
        date: h.hearingDate,
        timeLabel: h.hearingTime || '09:30 AM',
        sortTimestamp: parseSortTime(h.hearingDate, h.hearingTime),
        title: h.caseTitle || matchedCase?.title || 'Litigation Matter',
        caseNumber: h.suitNumber || matchedCase?.case_number || matchedCase?.suitNumber || 'MK File Pending',
        suitNo: matchedCase?.suit_no,
        branchId,
        branchName: resolveBranchName(branchId, matchedCase?.branchName),
        court: h.courtName || matchedCase?.court || 'High Court of Uganda',
        courtRoom: h.courtRoom || 'Court Room 1',
        judge: h.presidingJudge || matchedCase?.presidingJudge,
        counsel: h.leadCounsel || matchedCase?.leadAdvocate,
        purpose: h.hearingPurpose || 'Court Appearance',
        notes: h.courtNotes,
        status: h.status || 'Scheduled',
        virtualCourtUrl: h.virtualCourtUrl,
        caseItem: matchedCase,
        hearingItem: h,
      });
    });

    // 3. Direct case hearing dates not already duplicated in hearings
    cases.forEach((c) => {
      const hearingDate = c.hearing_date || c.nextHearingDate;
      if (!hearingDate) return;
      const key = `${c.id}_${hearingDate}`;
      if (seenCaseDateKeys.has(key)) return;
      seenCaseDateKeys.add(key);

      const purpose = c.nextHearingPurpose || 'Substantive Court Hearing';
      const category = classifyCategory(undefined, undefined, purpose, c.stage);
      const cfg = CATEGORY_CONFIG[category];

      list.push({
        id: `case-hearing-${c.id}`,
        source: 'case',
        category,
        viewCategory: cfg.label,
        colorTag: cfg.colorTag,
        date: hearingDate,
        timeLabel: '09:30 AM',
        sortTimestamp: parseSortTime(hearingDate, '09:30 AM'),
        title: c.title || 'Litigation Matter',
        caseNumber: c.case_number || c.suitNumber || 'MK File Pending',
        suitNo: c.suit_no,
        branchId: c.branchId,
        branchName: resolveBranchName(c.branchId, c.branchName || c.branch),
        court: c.court || 'High Court of Uganda',
        courtRoom: c.courtStation || 'Main Registry / Chambers',
        judge: c.presidingJudge || c.nextHearingJudge,
        counsel: c.leadAdvocate || c.person_in_conduct,
        purpose,
        notes: c.notes,
        status: c.status || 'Scheduled',
        caseItem: c,
      });
    });

    // 4. Staff diary entries (Deadlines -> Blue, Reviews/Client Meetings -> Green)
    staffDiaryEntries.forEach((entry) => {
      if (!entry.date) return;
      const matchedCase = entry.caseId ? cases.find((c) => c.id === entry.caseId) : undefined;
      const category: CalendarCategoryKey =
        entry.entryType === 'deadline' ? 'deadline' : 'meeting';
      const cfg = CATEGORY_CONFIG[category];
      const branchId = matchedCase?.branchId || userAssignedBranchId;

      list.push({
        id: `diary-${entry.id}`,
        source: 'diary',
        category,
        viewCategory: cfg.label,
        colorTag: cfg.colorTag,
        date: entry.date,
        timeLabel: entry.time || '10:00 AM',
        sortTimestamp: parseSortTime(entry.date, entry.time || '10:00 AM'),
        title: entry.title,
        caseNumber: entry.suitNumber || matchedCase?.case_number || matchedCase?.suitNumber || 'Internal Diary',
        suitNo: matchedCase?.suit_no,
        branchId,
        branchName: resolveBranchName(branchId, matchedCase?.branchName),
        counsel: entry.staffName,
        purpose: entry.notes || (category === 'deadline' ? 'Statutory / Perfection Deadline' : 'Internal Review / Client Meeting'),
        notes: entry.notes,
        status: entry.completed ? 'Completed' : 'Scheduled',
        completed: Boolean(entry.completed),
        caseItem: matchedCase,
        diaryItem: entry,
      });
    });

    return list.sort((a, b) => a.sortTimestamp - b.sortTimestamp);
  }, [supabaseReminderCases, hearings, cases, staffDiaryEntries, branches, userAssignedBranchId]);

  // Apply Branch, Category, Status, and Search filters
  const filteredEvents = useMemo(() => {
    const activeBranch = canViewAllBranches ? selectedBranch : userAssignedBranchId;
    const q = searchQuery.trim().toLowerCase();

    return unifiedEvents.filter((ev) => {
      if (activeBranch && activeBranch !== 'all' && ev.branchId && ev.branchId !== activeBranch) {
        return false;
      }
      if (categoryFilter !== 'all' && ev.category !== categoryFilter) {
        return false;
      }
      if (statusFilter !== 'all' && ev.status !== statusFilter) {
        return false;
      }
      if (q) {
        const hay = `${ev.title} ${ev.caseNumber} ${ev.suitNo || ''} ${ev.court || ''} ${ev.counsel || ''} ${ev.purpose || ''} ${ev.branchName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    unifiedEvents,
    canViewAllBranches,
    selectedBranch,
    userAssignedBranchId,
    categoryFilter,
    statusFilter,
    searchQuery,
  ]);

  // Index by YYYY-MM-DD for calendar views
  const eventsByDate = useMemo(() => {
    const map = new Map<string, UnifiedCalendarEvent[]>();
    filteredEvents.forEach((ev) => {
      const arr = map.get(ev.date) || [];
      arr.push(ev);
      map.set(ev.date, arr);
    });
    return map;
  }, [filteredEvents]);

  // Agenda items: upcoming from today forward first, falling back to recent if no future items
  const agendaEvents = useMemo(() => {
    const upcoming = filteredEvents.filter((ev) => ev.date >= todayStr);
    return upcoming.length > 0 ? upcoming : filteredEvents;
  }, [filteredEvents, todayStr]);

  // Weekly count for WeeklyMattersNotificationModal badge
  const weeklyCount = useMemo(() => {
    const activeBranch = canViewAllBranches ? selectedBranch : userAssignedBranchId;
    return unifiedEvents.filter((ev) => {
      if (activeBranch && activeBranch !== 'all' && ev.branchId && ev.branchId !== activeBranch) {
        return false;
      }
      return ev.date >= todayStr && ev.date <= next7DaysStr;
    }).length;
  }, [unifiedEvents, canViewAllBranches, selectedBranch, userAssignedBranchId, todayStr, next7DaysStr]);

  // Smart Alerts combining Supabase dashboard_notifications + upcoming/today derived matters
  const smartAlerts = useMemo<SmartAlertItem[]>(() => {
    const alerts: SmartAlertItem[] = [];

    // 1. Live Supabase dashboard_notifications
    dbNotifications.forEach((note: any) => {
      const id = `db-note-${note.id}`;
      if (dismissedAlertIds.has(id)) return;
      const cat = classifyCategory(note.category, note.color_tag, note.title);
      alerts.push({
        id,
        source: 'supabase',
        title: note.title || 'Docket Alert',
        message: note.message || '',
        timestampLabel: note.created_at
          ? new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Just now',
        colorTag: note.color_tag || CATEGORY_CONFIG[cat].colorTag,
        categoryLabel: note.category || CATEGORY_CONFIG[cat].shortLabel,
        caseId: note.case_id || undefined,
      });
    });

    // 2. Real-time derived alerts from unified branch-filtered events within 7 days
    const urgentEvents = filteredEvents
      .filter((ev) => ev.date >= todayStr && ev.date <= next7DaysStr && ev.status !== 'Completed')
      .slice(0, 6);

    urgentEvents.forEach((ev) => {
      const id = `derived-${ev.id}`;
      if (dismissedAlertIds.has(id)) return;
      const isToday = ev.date === todayStr;
      alerts.push({
        id,
        source: 'derived',
        title: isToday ? `Today · ${ev.timeLabel}` : `${new Date(ev.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${ev.timeLabel}`,
        message: `${ev.title}${ev.caseNumber ? ` (${ev.caseNumber})` : ''} — ${ev.purpose || ev.viewCategory}`,
        timestampLabel: ev.branchName,
        colorTag: ev.colorTag,
        categoryLabel: CATEGORY_CONFIG[ev.category].shortLabel,
        caseId: ev.caseItem?.id,
        dateStr: ev.date,
      });
    });

    return alerts;
  }, [dbNotifications, filteredEvents, todayStr, next7DaysStr, dismissedAlertIds]);

  const handleDismissAlert = async (alert: SmartAlertItem) => {
    setDismissedAlertIds((prev) => {
      const next = new Set(prev);
      next.add(alert.id);
      return next;
    });

    if (alert.source === 'supabase' && isSupabaseConfigured) {
      const rawId = alert.id.replace('db-note-', '');
      await supabase
        .from('dashboard_notifications')
        .update({ is_read: true })
        .eq('id', rawId);
    }
  };

  // Navigation calculations for Month / Week / Day
  const anchorYear = anchorDate.getFullYear();
  const anchorMonth = anchorDate.getMonth();
  const daysInMonth = useMemo(() => new Date(anchorYear, anchorMonth + 1, 0).getDate(), [anchorYear, anchorMonth]);
  const firstDayIndex = useMemo(() => new Date(anchorYear, anchorMonth, 1).getDay(), [anchorYear, anchorMonth]);

  const weekDates = useMemo(() => {
    const base = new Date(selectedDateStr + 'T00:00:00');
    const dayOfWeek = base.getDay(); // 0 = Sun
    const sunday = new Date(base);
    sunday.setDate(base.getDate() - dayOfWeek);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return {
        date: d,
        dateStr: toLocalYmd(d),
      };
    });
  }, [selectedDateStr]);

  const selectedDayEvents = useMemo(() => {
    return eventsByDate.get(selectedDateStr) || [];
  }, [eventsByDate, selectedDateStr]);

  const handleToday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setAnchorDate(now);
    setSelectedDateStr(toLocalYmd(now));
  };

  const handleStep = (direction: -1 | 1) => {
    if (viewMode === 'month') {
      const next = new Date(anchorYear, anchorMonth + direction, 1);
      setAnchorDate(next);
      setSelectedDateStr(toLocalYmd(next));
    } else if (viewMode === 'week') {
      const base = new Date(selectedDateStr + 'T00:00:00');
      base.setDate(base.getDate() + direction * 7);
      setAnchorDate(base);
      setSelectedDateStr(toLocalYmd(base));
    } else {
      const base = new Date(selectedDateStr + 'T00:00:00');
      base.setDate(base.getDate() + direction);
      setAnchorDate(base);
      setSelectedDateStr(toLocalYmd(base));
    }
  };

  const activePeriodLabel = useMemo(() => {
    if (viewMode === 'month') {
      return anchorDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const start = weekDates[0].date;
      const end = weekDates[6].date;
      return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    if (viewMode === 'day') {
      return new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    return 'Chronological Schedule';
  }, [viewMode, anchorDate, weekDates, selectedDateStr]);

  const renderEventRow = (ev: UnifiedCalendarEvent) => {
    const isToday = ev.date === todayStr;
    const isPast = ev.date < todayStr && ev.status !== 'Completed';

    return (
      <div
        key={ev.id}
        className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
      >
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: ev.colorTag }}
            />
            <span className={`font-semibold ${CATEGORY_CONFIG[ev.category].textClass}`}>
              {ev.viewCategory}
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
              {ev.caseNumber}
            </span>
            {ev.suitNo && (
              <>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="font-mono tabular-nums text-blue-700 dark:text-blue-400">
                  Suit: {ev.suitNo}
                </span>
              </>
            )}
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {ev.branchName}
            </span>
          </div>

          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug">
            {ev.title}
          </h3>

          {ev.purpose && (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {ev.purpose}
            </p>
          )}

          {(ev.court || ev.judge || ev.counsel) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              {ev.court && (
                <span>
                  Court: <strong className="text-slate-700 dark:text-slate-200">{ev.court}</strong>
                  {ev.courtRoom ? ` (${ev.courtRoom})` : ''}
                </span>
              )}
              {ev.judge && (
                <span>
                  Judge: <strong className="text-slate-700 dark:text-slate-200">{ev.judge}</strong>
                </span>
              )}
              {ev.counsel && (
                <span>
                  Counsel: <strong className="text-slate-700 dark:text-slate-200">{ev.counsel}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
          <div className="text-right space-y-1">
            <div
              className={`text-xs font-semibold tabular-nums px-2.5 py-1 rounded-lg border ${
                isToday
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/60'
                  : isPast
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/60'
              }`}
            >
              {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}{' '}
              · {ev.timeLabel}
            </div>
            <div className="flex justify-end">
              <StatusBadge status={ev.status} size="xs" />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {ev.virtualCourtUrl && (
              <a
                href={ev.virtualCourtUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg text-[11px] font-medium hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Video className="w-3 h-3" />
                <span>Join</span>
              </a>
            )}

            {ev.diaryItem && (
              <button
                type="button"
                onClick={() => toggleStaffDiaryComplete(ev.diaryItem!.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 border ${
                  ev.completed
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>{ev.completed ? 'Done' : 'Mark Done'}</span>
              </button>
            )}

            {ev.hearingItem && userPermissions.canRecordOutcomes && (
              <button
                type="button"
                onClick={() => setSelectedHearingForOutcome(ev.hearingItem!)}
                className="px-2.5 py-1 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Record Outcome
              </button>
            )}

            {ev.caseItem && (
              <button
                type="button"
                onClick={() => setSelectedCase(ev.caseItem!)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-medium transition-colors border border-slate-200/80 dark:border-slate-700 whitespace-nowrap shrink-0"
              >
                Case
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header & Primary Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Cause List &amp; Court Diary
            </h1>
            {weeklyCount > 0 && (
              <button
                type="button"
                onClick={() => setIsWeeklyAlertOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/90 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors tabular-nums whitespace-nowrap shrink-0"
                title="View Next 7 Days Matters Alert"
              >
                <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{weeklyCount} due this week</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage hearings, statutory deadlines, and bank SLAs across branches.
          </p>
        </div>

        {/* View Switcher & Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
          {/* Branch Selector (Super Admin / Partner vs Branch-Scoped) */}
          {canViewAllBranches ? (
            <select
              aria-label="Filter by Branch"
              value={selectedBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="px-3 py-1.5 min-h-[34px] border rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600"
            >
              <option value="all">All Branches (Super Admin)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-1.5 min-h-[34px] border rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                {branches.find((b) => b.id === userAssignedBranchId)?.name ||
                  effectiveUser?.branchName ||
                  'Assigned Branch'}
              </span>
            </div>
          )}

          {/* 4-Mode View Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
            {(['agenda', 'month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all whitespace-nowrap shrink-0 ${
                  viewMode === mode
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {userPermissions.canScheduleHearings && (
            <button
              type="button"
              onClick={() => setIsScheduleOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors min-h-[34px] whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Hearing</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setDiaryModalPreset('deadline');
              setIsDiaryModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold transition-colors min-h-[34px] whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Deadline / Review</span>
          </button>

          {userPermissions.canPrintCauseList && (
            <button
              type="button"
              onClick={() => setPrintableCauseDate(selectedDateStr || todayStr)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition-colors min-h-[34px] whitespace-nowrap shrink-0"
              title="Print Daily Cause List"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Print Cause Sheet</span>
            </button>
          )}
        </div>
      </div>

      {/* Color Legend & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-medium text-slate-700 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-2 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              categoryFilter === 'all'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All Categories
          </button>

          {(['hearing', 'deadline', 'meeting'] as const).map((catKey) => {
            const cfg = CATEGORY_CONFIG[catKey];
            const active = categoryFilter === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setCategoryFilter(active ? 'all' : catKey)}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold ring-1 ring-slate-300 dark:ring-slate-600'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dotClass} shrink-0`} />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search case, court, counsel..."
              className="pl-8 pr-3 py-1.5 min-h-[32px] bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 w-48 sm:w-56"
            />
          </div>

          <select
            aria-label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-2.5 py-1.5 min-h-[32px] text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Adjourned">Adjourned</option>
            <option value="Part-Heard">Part-Heard</option>
          </select>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums pl-1 whitespace-nowrap">
            {filteredEvents.length} entries
          </span>
        </div>
      </div>

      {/* Main Content Grid: Schedule Overview (2 cols) + Smart Alerts Sidebar (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Schedule View Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 capitalize tabular-nums">
                {viewMode} · {activePeriodLabel}
              </h2>
            </div>

            {viewMode !== 'agenda' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleStep(-1)}
                  className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStep(1)}
                  className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* VIEW 1: AGENDA */}
          {viewMode === 'agenda' && (
            <>
              {loadingCloud && agendaEvents.length === 0 ? (
                <div className="space-y-3 py-2">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
                    />
                  ))}
                </div>
              ) : agendaEvents.length === 0 ? (
                <div className="text-center py-12 px-4 text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                  <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    No upcoming events scheduled for this view.
                  </p>
                  <p className="text-xs max-w-sm mx-auto">
                    Schedule a court hearing, statutory perfection deadline, or client review to populate the cause diary.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">{agendaEvents.map((ev) => renderEventRow(ev))}</div>
              )}
            </>
          )}

          {/* VIEW 2: MONTH */}
          {viewMode === 'month' && (
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[11px] text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="h-20 sm:h-24 bg-slate-50/60 dark:bg-slate-800/20 rounded-xl"
                  />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateKey = `${anchorYear}-${String(anchorMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isSelected = selectedDateStr === dateKey;
                  const isToday = dateKey === todayStr;
                  const dayEvents = eventsByDate.get(dateKey) || [];

                  return (
                    <button
                      type="button"
                      key={dateKey}
                      onClick={() => setSelectedDateStr(dateKey)}
                      className={`h-20 sm:h-24 p-1.5 rounded-xl border text-left transition-all flex flex-col justify-between overflow-hidden ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                          : isToday
                          ? 'border-red-400 bg-red-50/30 dark:bg-red-950/20'
                          : 'border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-bold tabular-nums w-6 h-6 rounded-full flex items-center justify-center ${
                            isToday
                              ? 'bg-red-600 text-white'
                              : isSelected
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {dayNum}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5 w-full overflow-hidden">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-center gap-1 text-[10px] truncate px-1 py-0.5 rounded bg-slate-100/90 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: ev.colorTag }}
                            />
                            <span className="truncate">{ev.caseNumber !== 'MK File Pending' ? ev.caseNumber : ev.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] text-slate-400 font-medium pl-1 tabular-nums">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Preview Drawer below Month Grid */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                    Selected Day:{' '}
                    {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    <span className="text-slate-400 font-normal">({selectedDayEvents.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode('day')}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                  >
                    Open Full Day View &rarr;
                  </button>
                </div>

                {selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">
                    No hearings, deadlines, or reviews on this date.
                  </p>
                ) : (
                  <div className="space-y-2">{selectedDayEvents.map((ev) => renderEventRow(ev))}</div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: WEEK */}
          {viewMode === 'week' && (
            <div className="space-y-3">
              {weekDates.map(({ date, dateStr }) => {
                const dayEvents = eventsByDate.get(dateStr) || [];
                const isToday = dateStr === todayStr;
                return (
                  <div
                    key={dateStr}
                    className={`rounded-xl border p-3.5 space-y-2.5 ${
                      isToday
                        ? 'border-blue-300 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/20'
                        : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDateStr(dateStr);
                          setViewMode('day');
                        }}
                        className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 tabular-nums flex items-center gap-2"
                      >
                        <span>
                          {date.toLocaleDateString('en-GB', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                            Today
                          </span>
                        )}
                      </button>

                      <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                        {dayEvents.length} {dayEvents.length === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>

                    {dayEvents.length === 0 ? (
                      <p className="text-xs text-slate-400">Clear docket</p>
                    ) : (
                      <div className="space-y-2">{dayEvents.map((ev) => renderEventRow(ev))}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 4: DAY */}
          {viewMode === 'day' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {selectedDayEvents.length} scheduled item{selectedDayEvents.length === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDiaryModalPreset('meeting');
                      setIsDiaryModalOpen(true);
                    }}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    + Add Entry on This Day
                  </button>
                  {userPermissions.canPrintCauseList && (
                    <button
                      type="button"
                      onClick={() => setPrintableCauseDate(selectedDateStr)}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Day Sheet</span>
                    </button>
                  )}
                </div>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-12 px-4 text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    No hearings or deadlines on this date
                  </p>
                  <p className="text-xs">
                    Use &ldquo;Schedule Hearing&rdquo; or &ldquo;Deadline / Review&rdquo; to add a fixture for this day.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">{selectedDayEvents.map((ev) => renderEventRow(ev))}</div>
              )}
            </div>
          )}
        </div>

        {/* Dashboard Notifications / Smart Alerts Sidebar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Smart Alerts
              </h2>
            </div>
            <span className="text-xs font-bold text-red-600 dark:text-red-400 font-mono tabular-nums">
              {smartAlerts.length} Active
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-0.5">
            {smartAlerts.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8 space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-500/70 mx-auto" />
                <p>No pending alerts for this branch filter.</p>
              </div>
            ) : (
              smartAlerts.map((note) => {
                const matchedCase = note.caseId
                  ? cases.find((c) => c.id === note.caseId)
                  : undefined;

                return (
                  <div
                    key={note.id}
                    className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 rounded-xl space-y-1.5 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: note.colorTag }}
                        />
                        <h4 className="text-xs font-semibold text-amber-950 dark:text-amber-200 truncate">
                          {note.title}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDismissAlert(note)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded opacity-75 group-hover:opacity-100 transition-opacity"
                        title="Acknowledge alert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-snug">
                      {note.message}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="truncate tabular-nums">
                        {note.categoryLabel} · {note.timestampLabel}
                      </span>

                      {matchedCase ? (
                        <button
                          type="button"
                          onClick={() => setSelectedCase(matchedCase)}
                          className="text-blue-600 dark:text-blue-400 font-semibold hover:underline whitespace-nowrap shrink-0"
                        >
                          Open Case &rarr;
                        </button>
                      ) : note.dateStr ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDateStr(note.dateStr!);
                            setViewMode('day');
                          }}
                          className="text-blue-600 dark:text-blue-400 font-semibold hover:underline whitespace-nowrap shrink-0"
                        >
                          View Day &rarr;
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Outcome Recording Modal */}
      {selectedHearingForOutcome && (
        <HearingOutcomeModal
          hearing={selectedHearingForOutcome}
          onClose={() => setSelectedHearingForOutcome(null)}
        />
      )}

      {/* Schedule Court Hearing Modal */}
      <ScheduleHearingModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
      />

      {/* Add Statutory Deadline / Review Modal */}
      <AddDiaryEntryModal
        isOpen={isDiaryModalOpen}
        initialDate={selectedDateStr}
        initialCategory={diaryModalPreset}
        onClose={() => setIsDiaryModalOpen(false)}
        onSaved={fetchCloudScheduleAndAlerts}
      />

      {/* Weekly Alert Pop-up Modal */}
      <WeeklyMattersNotificationModal
        isOpen={isWeeklyAlertOpen}
        onClose={() => setIsWeeklyAlertOpen(false)}
        onNavigateToDiary={() => setViewMode('week')}
      />
    </div>
  );
};

export default CauseListCalendar;
