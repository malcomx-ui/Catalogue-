/**
 * Uganda Public Holidays & Working-Day Leave Calculator
 * Reads the configurable Public Holidays list from System Settings (defaulting to
 * Uganda's gazetted holidays) and excludes both weekends (Sat/Sun) and configured
 * recurring or one-off public holidays when computing leave durations.
 */

export interface PublicHolidayConfig {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  recurring: boolean; // true for fixed annual dates, false for movable/one-off dates
  category: 'Statutory' | 'Religious' | 'Custom';
}

export const DEFAULT_UGANDA_HOLIDAYS: PublicHolidayConfig[] = [
  { id: 'ug-01-01', date: '2026-01-01', name: "New Year's Day", recurring: true, category: 'Statutory' },
  { id: 'ug-01-26', date: '2026-01-26', name: 'NRM Liberation Day', recurring: true, category: 'Statutory' },
  { id: 'ug-02-16', date: '2026-02-16', name: 'Archbishop Janani Luwum Day', recurring: true, category: 'Statutory' },
  { id: 'ug-03-08', date: '2026-03-08', name: "International Women's Day", recurring: true, category: 'Statutory' },
  { id: 'ug-03-20', date: '2026-03-20', name: 'Eid al-Fitr (Tentative / Gazetted)', recurring: false, category: 'Religious' },
  { id: 'ug-04-03', date: '2026-04-03', name: 'Good Friday', recurring: false, category: 'Religious' },
  { id: 'ug-04-06', date: '2026-04-06', name: 'Easter Monday', recurring: false, category: 'Religious' },
  { id: 'ug-05-01', date: '2026-05-01', name: 'Labour Day', recurring: true, category: 'Statutory' },
  { id: 'ug-05-27', date: '2026-05-27', name: 'Eid al-Adha (Tentative / Gazetted)', recurring: false, category: 'Religious' },
  { id: 'ug-06-03', date: '2026-06-03', name: "Uganda Martyrs' Day", recurring: true, category: 'Statutory' },
  { id: 'ug-06-09', date: '2026-06-09', name: "National Heroes' Day", recurring: true, category: 'Statutory' },
  { id: 'ug-10-09', date: '2026-10-09', name: 'Independence Day', recurring: true, category: 'Statutory' },
  { id: 'ug-12-25', date: '2026-12-25', name: 'Christmas Day', recurring: true, category: 'Statutory' },
  { id: 'ug-12-26', date: '2026-12-26', name: 'Boxing Day', recurring: true, category: 'Statutory' },
];

export interface UgandaPublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  category?: PublicHolidayConfig['category'];
}

export interface UgandaLeaveBreakdown {
  isValidRange: boolean;
  totalCalendarDays: number;
  workingDays: number;
  weekendDays: number;
  excludedHolidays: UgandaPublicHoliday[];
}

const SYSTEM_SETTINGS_STORAGE_KEY = 'mk_advocates_system_settings_v2';

function sanitizeHolidayList(raw: unknown): PublicHolidayConfig[] | null {
  if (!Array.isArray(raw)) return null;
  const cleaned: PublicHolidayConfig[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Partial<PublicHolidayConfig>;
    const date = String(rec.date || '').trim().slice(0, 10);
    const name = String(rec.name || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !name) continue;
    const category: PublicHolidayConfig['category'] =
      rec.category === 'Religious' || rec.category === 'Custom' ? rec.category : 'Statutory';
    cleaned.push({
      id: String(rec.id || `hol-${date}-${cleaned.length}`),
      date,
      name,
      recurring: Boolean(rec.recurring),
      category,
    });
  }
  return cleaned;
}

function readStoredPublicHolidays(): PublicHolidayConfig[] {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(SYSTEM_SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.publicHolidays)) {
          const valid = sanitizeHolidayList(parsed.publicHolidays);
          if (valid !== null) return valid;
        }
      }
    } catch {
      // fallback to defaults
    }
  }
  return DEFAULT_UGANDA_HOLIDAYS;
}

let activeConfiguredHolidays: PublicHolidayConfig[] | null = null;
const holidayListeners = new Set<() => void>();

/**
 * Returns the currently active Public Holidays list configured in System Settings
 * (defaults to DEFAULT_UGANDA_HOLIDAYS).
 */
export function getConfiguredPublicHolidays(): PublicHolidayConfig[] {
  if (activeConfiguredHolidays === null) {
    activeConfiguredHolidays = readStoredPublicHolidays();
  }
  return activeConfiguredHolidays;
}

/**
 * Updates the runtime Public Holidays list (called by AppContext when settings hydrate or save).
 */
export function setConfiguredPublicHolidays(holidays?: PublicHolidayConfig[] | null): void {
  const valid = sanitizeHolidayList(holidays);
  activeConfiguredHolidays = valid !== null ? valid : DEFAULT_UGANDA_HOLIDAYS;
  holidayListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore subscriber errors
    }
  });
}

export function subscribeToPublicHolidays(listener: () => void): () => void {
  holidayListeners.add(listener);
  return () => {
    holidayListeners.delete(listener);
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(year: number, month1Based: number, day: number): string {
  return `${year}-${pad2(month1Based)}-${pad2(day)}`;
}

/**
 * Parse a YYYY-MM-DD string (or ISO timestamp) into a local midnight Date
 * without timezone drift.
 */
function parseLocalDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const isoPrefix = String(raw).trim().slice(0, 10);
  const parts = isoPrefix.split('-').map(Number);
  if (parts.length === 3 && !parts.some((n) => Number.isNaN(n))) {
    const [y, m, d] = parts;
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
      return dt;
    }
  }
  const fallback = new Date(raw);
  if (Number.isNaN(fallback.getTime())) return null;
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
}

function addDays(base: Date, offset: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
}

function formatDateIso(d: Date): string {
  return toIsoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Builds a Map of YYYY-MM-DD -> Holiday entry for `year` using the configured
 * Public Holidays list (supports both recurring MM-DD annual holidays and
 * exact YYYY-MM-DD movable/one-off dates).
 */
export function getUgandaHolidayMap(
  year: number,
  configuredHolidays?: PublicHolidayConfig[]
): Map<string, string> {
  const source = Array.isArray(configuredHolidays)
    ? configuredHolidays
    : getConfiguredPublicHolidays();
  const map = new Map<string, string>();

  for (const h of source) {
    const dt = parseLocalDate(h.date);
    if (!dt) continue;

    if (h.recurring) {
      const m = dt.getMonth() + 1;
      const d = dt.getDate();
      // Guard leap-day recurring entries on non-leap years
      const candidate = new Date(year, m - 1, d);
      if (candidate.getFullYear() === year && candidate.getMonth() === m - 1 && candidate.getDate() === d) {
        map.set(toIsoDate(year, m, d), h.name);
      }
    } else if (dt.getFullYear() === year) {
      map.set(formatDateIso(dt), h.name);
    }
  }

  return map;
}

export function getUgandaPublicHolidays(
  year: number,
  configuredHolidays?: PublicHolidayConfig[]
): UgandaPublicHoliday[] {
  const map = getUgandaHolidayMap(year, configuredHolidays);
  return Array.from(map.entries())
    .map(([date, name]) => ({ date, name }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function isUgandaPublicHoliday(
  dateStr: string,
  configuredHolidays?: PublicHolidayConfig[]
): string | null {
  const dt = parseLocalDate(dateStr);
  if (!dt) return null;
  return getUgandaHolidayMap(dt.getFullYear(), configuredHolidays).get(formatDateIso(dt)) || null;
}

/**
 * Calculates working leave days between `startDate` and `endDate` (inclusive),
 * excluding Saturdays, Sundays, and all configured Public Holidays from System Settings.
 */
export function calculateUgandaLeaveBreakdown(
  startDate?: string | null,
  endDate?: string | null,
  configuredHolidays?: PublicHolidayConfig[]
): UgandaLeaveBreakdown {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (!start || !end || end < start) {
    return {
      isValidRange: false,
      totalCalendarDays: 0,
      workingDays: 0,
      weekendDays: 0,
      excludedHolidays: [],
    };
  }

  let totalCalendarDays = 0;
  let workingDays = 0;
  let weekendDays = 0;
  const excludedHolidays: UgandaPublicHoliday[] = [];

  // Cache year maps per calculation call to keep multi-month ranges fast
  const yearMapCache = new Map<number, Map<string, string>>();
  const getYearMap = (y: number) => {
    let m = yearMapCache.get(y);
    if (!m) {
      m = getUgandaHolidayMap(y, configuredHolidays);
      yearMapCache.set(y, m);
    }
    return m;
  };

  // Safety cap at 400 days so pathological date ranges never lock the UI
  const maxIterations = 400;
  let current = start;
  while (current <= end && totalCalendarDays < maxIterations) {
    totalCalendarDays += 1;
    const dow = current.getDay(); // 0 = Sun, 6 = Sat
    const iso = formatDateIso(current);
    const holidayName = getYearMap(current.getFullYear()).get(iso);

    if (dow === 0 || dow === 6) {
      weekendDays += 1;
    } else if (holidayName) {
      excludedHolidays.push({ date: iso, name: holidayName });
    } else {
      workingDays += 1;
    }

    current = addDays(current, 1);
  }

  return {
    isValidRange: true,
    totalCalendarDays,
    workingDays,
    weekendDays,
    excludedHolidays,
  };
}

/**
 * Convenience helper returning the net deductible working leave days
 * (excludes weekends and configured Public Holidays).
 */
export function calculateUgandaWorkingDays(
  startDate?: string | null,
  endDate?: string | null,
  configuredHolidays?: PublicHolidayConfig[]
): number {
  return calculateUgandaLeaveBreakdown(startDate, endDate, configuredHolidays).workingDays;
}

/**
 * Formats YYYY-MM-DD into a compact readable label like "9 Oct".
 */
export function formatHolidayShortDate(isoDate: string): string {
  const dt = parseLocalDate(isoDate);
  if (!dt) return isoDate;
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * Computes the next working business day (YYYY-MM-DD) after a leave `endDate`,
 * skipping Saturdays, Sundays, and any configured Uganda Public Holidays.
 */
export function getNextWorkingReturnDate(
  endDate?: string | null,
  configuredHolidays?: PublicHolidayConfig[]
): string | null {
  const end = parseLocalDate(endDate);
  if (!end) return null;

  const yearMapCache = new Map<number, Map<string, string>>();
  const getYearMap = (y: number) => {
    let m = yearMapCache.get(y);
    if (!m) {
      m = getUgandaHolidayMap(y, configuredHolidays);
      yearMapCache.set(y, m);
    }
    return m;
  };

  let candidate = addDays(end, 1);
  for (let i = 0; i < 30; i++) {
    const dow = candidate.getDay();
    const iso = formatDateIso(candidate);
    const isHoliday = getYearMap(candidate.getFullYear()).has(iso);
    if (dow !== 0 && dow !== 6 && !isHoliday) {
      return iso;
    }
    candidate = addDays(candidate, 1);
  }
  return formatDateIso(addDays(end, 1));
}

