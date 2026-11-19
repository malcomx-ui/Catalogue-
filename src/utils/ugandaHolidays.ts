/**
 * Uganda Public Holidays & Working-Day Leave Calculator
 * Excludes Saturdays, Sundays, and gazetted Uganda Public Holidays
 * (fixed statutory dates, movable Easter dates, and Eid al-Fitr / Eid al-Adha).
 */

export interface UgandaPublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

export interface UgandaLeaveBreakdown {
  isValidRange: boolean;
  totalCalendarDays: number;
  workingDays: number;
  weekendDays: number;
  excludedHolidays: UgandaPublicHoliday[];
}

// Explicit gazetted / astronomical Uganda Islamic public holiday dates (Eid al-Fitr & Eid al-Adha)
const UGANDA_ISLAMIC_HOLIDAYS_BY_YEAR: Record<number, Array<{ month: number; day: number; name: string }>> = {
  2024: [
    { month: 4, day: 10, name: 'Eid al-Fitr' },
    { month: 6, day: 16, name: 'Eid al-Adha' },
  ],
  2025: [
    { month: 3, day: 31, name: 'Eid al-Fitr' },
    { month: 6, day: 6, name: 'Eid al-Adha' },
  ],
  2026: [
    { month: 3, day: 20, name: 'Eid al-Fitr' },
    { month: 5, day: 27, name: 'Eid al-Adha' },
  ],
  2027: [
    { month: 3, day: 9, name: 'Eid al-Fitr' },
    { month: 5, day: 16, name: 'Eid al-Adha' },
  ],
  2028: [
    { month: 2, day: 26, name: 'Eid al-Fitr' },
    { month: 5, day: 5, name: 'Eid al-Adha' },
  ],
  2029: [
    { month: 2, day: 14, name: 'Eid al-Fitr' },
    { month: 4, day: 24, name: 'Eid al-Adha' },
  ],
  2030: [
    { month: 2, day: 4, name: 'Eid al-Fitr' },
    { month: 4, day: 13, name: 'Eid al-Adha' },
  ],
};

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

/**
 * Anonymous Gregorian algorithm (Meeus/Jones/Butcher) for Easter Sunday.
 */
function computeEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(base: Date, offset: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
}

function formatDateIso(d: Date): string {
  return toIsoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

const holidayCache = new Map<number, Map<string, string>>();

/**
 * Returns a Map of YYYY-MM-DD -> Holiday Name for all official Uganda public holidays in `year`.
 */
export function getUgandaHolidayMap(year: number): Map<string, string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const map = new Map<string, string>();

  // 1. Fixed statutory Uganda public holidays
  const fixed: Array<[number, number, string]> = [
    [1, 1, "New Year's Day"],
    [1, 26, 'NRM Liberation Day'],
    [2, 16, 'Archbishop Janani Luwum Day'],
    [3, 8, "International Women's Day"],
    [5, 1, 'Labour Day'],
    [6, 3, "Uganda Martyrs' Day"],
    [6, 9, "National Heroes' Day"],
    [10, 9, 'Independence Day'],
    [12, 25, 'Christmas Day'],
    [12, 26, 'Boxing Day'],
  ];
  fixed.forEach(([m, d, name]) => {
    map.set(toIsoDate(year, m, d), name);
  });

  // 2. Movable Christian public holidays (Good Friday, Easter Sunday, Easter Monday)
  const easterSunday = computeEasterSunday(year);
  map.set(formatDateIso(addDays(easterSunday, -2)), 'Good Friday');
  map.set(formatDateIso(easterSunday), 'Easter Sunday');
  map.set(formatDateIso(addDays(easterSunday, 1)), 'Easter Monday');

  // 3. Movable Islamic public holidays (Eid al-Fitr & Eid al-Adha)
  const knownIslamic = UGANDA_ISLAMIC_HOLIDAYS_BY_YEAR[year];
  if (knownIslamic) {
    knownIslamic.forEach(({ month, day, name }) => {
      map.set(toIsoDate(year, month, day), name);
    });
  } else {
    // Dynamic fallback via Intl Islamic Umm al-Qura calendar for years beyond 2030
    try {
      const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        month: 'numeric',
        day: 'numeric',
      });
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      for (let dt = start; dt <= end; dt = addDays(dt, 1)) {
        const parts = fmt.formatToParts(dt);
        const mPart = Number(parts.find((p) => p.type === 'month')?.value);
        const dPart = Number(parts.find((p) => p.type === 'day')?.value);
        if (mPart === 10 && dPart === 1) {
          map.set(formatDateIso(dt), 'Eid al-Fitr');
        } else if (mPart === 12 && dPart === 10) {
          map.set(formatDateIso(dt), 'Eid al-Adha');
        }
      }
    } catch {
      // ignore if environment lacks islamic calendar ICU data
    }
  }

  holidayCache.set(year, map);
  return map;
}

export function getUgandaPublicHolidays(year: number): UgandaPublicHoliday[] {
  const map = getUgandaHolidayMap(year);
  return Array.from(map.entries())
    .map(([date, name]) => ({ date, name }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function isUgandaPublicHoliday(dateStr: string): string | null {
  const dt = parseLocalDate(dateStr);
  if (!dt) return null;
  return getUgandaHolidayMap(dt.getFullYear()).get(formatDateIso(dt)) || null;
}

/**
 * Calculates working leave days between `startDate` and `endDate` (inclusive),
 * excluding Saturdays, Sundays, and Uganda Public Holidays.
 */
export function calculateUgandaLeaveBreakdown(
  startDate?: string | null,
  endDate?: string | null
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

  // Safety cap at 400 days so pathological date ranges never lock the UI
  const maxIterations = 400;
  let current = start;
  while (current <= end && totalCalendarDays < maxIterations) {
    totalCalendarDays += 1;
    const dow = current.getDay(); // 0 = Sun, 6 = Sat
    const iso = formatDateIso(current);
    const holidayName = getUgandaHolidayMap(current.getFullYear()).get(iso);

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
 * Convenience helper returning the net billable/deductible Uganda working leave days
 * (excludes weekends and Uganda public holidays).
 */
export function calculateUgandaWorkingDays(
  startDate?: string | null,
  endDate?: string | null
): number {
  return calculateUgandaLeaveBreakdown(startDate, endDate).workingDays;
}

/**
 * Formats YYYY-MM-DD into a compact readable label like "9 Oct".
 */
export function formatHolidayShortDate(isoDate: string): string {
  const dt = parseLocalDate(isoDate);
  if (!dt) return isoDate;
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
