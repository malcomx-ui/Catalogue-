import { hrSupabase, isSuperAdminUser, type ActiveUser } from '../lib/hrSupabase';
import { showCleanMessage } from './notification';

export const BIRTHDAY_ALERT_WINDOW_DAYS = 3;
export const STAFF_BIRTHDAYS_UPDATED_EVENT = 'mk_staff_birthdays_updated';
const LOCAL_HR_OVERRIDES_KEY = 'mk_hr_employee_overrides_v1';

export interface BirthdayProximity {
  label: string;
  formattedDate: string;
  isToday: boolean;
  isWithinWindow: boolean;
  daysUntil: number;
}

export interface UpcomingBirthdayRecord {
  id: string;
  name: string;
  email?: string | null;
  role: string;
  dob: string;
  proximity: BirthdayProximity;
}

function getLocalTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Computes exact days until a staff member's next birthday (0 = today, 1 = tomorrow, etc.).
 * Handles leap-day birthdays (Feb 29) cleanly in non-leap years.
 */
export function computeBirthdayProximity(
  dob?: string | null,
  windowDays: number = BIRTHDAY_ALERT_WINDOW_DAYS
): BirthdayProximity {
  if (!dob) {
    return {
      label: 'Upcoming',
      formattedDate: 'Upcoming',
      isToday: false,
      isWithinWindow: false,
      daysUntil: 365,
    };
  }

  const parts = String(dob).trim().slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return {
      label: String(dob),
      formattedDate: String(dob),
      isToday: false,
      isWithinWindow: false,
      daysUntil: 365,
    };
  }

  const [, month, day] = parts;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const makeBirthdayDate = (year: number) => {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const safeDay = month === 2 && day === 29 && !isLeap ? 28 : day;
    return new Date(year, month - 1, safeDay);
  };

  let next = makeBirthdayDate(now.getFullYear());
  if (next < today) {
    next = makeBirthdayDate(now.getFullYear() + 1);
  }

  const daysUntil = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const formattedDate = next.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  let label = formattedDate;
  if (daysUntil === 0) {
    label = `${formattedDate} (Today)`;
  } else if (daysUntil === 1) {
    label = `${formattedDate} (Tomorrow)`;
  } else if (daysUntil > 1 && daysUntil <= windowDays) {
    label = `${formattedDate} (In ${daysUntil} days)`;
  }

  return {
    label,
    formattedDate,
    isToday: daysUntil === 0,
    isWithinWindow: daysUntil >= 0 && daysUntil <= windowDays,
    daysUntil,
  };
}

/**
 * Returns true if the current user is an HR Manager (explicit HR role/title/department
 * or Super Admin overseeing HR Management).
 */
export function isHrManagerUser(
  user?: (ActiveUser & { roleTitle?: string | null; jobTitle?: string | null; department?: string | null }) | null
): boolean {
  if (!user) return false;
  if (isSuperAdminUser(user)) return true;

  const combined = [
    user.role,
    user.roleId,
    user.role_id,
    user.roleTitle,
    user.jobTitle,
    user.department,
    user.email,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    /\bhr\b/.test(combined) ||
    combined.includes('human_resource') ||
    combined.includes('human resource') ||
    combined.includes('hr_manager') ||
    combined.includes('hr manager') ||
    combined.includes('hr_admin') ||
    combined.includes('people_ops')
  );
}

/**
 * Returns true if the current user matches the staff member celebrating their birthday.
 */
export function isBirthdayCelebrantUser(
  user: ActiveUser | null | undefined,
  celebrant: { id?: string | null; email?: string | null; name?: string | null }
): boolean {
  if (!user) return false;

  const userId = String(user.id || '').trim().toLowerCase();
  const celebId = String(celebrant.id || '').trim().toLowerCase();
  if (userId && celebId && userId === celebId) return true;

  const userEmail = String(user.email || '').trim().toLowerCase();
  const celebEmail = String(celebrant.email || '').trim().toLowerCase();
  if (userEmail && celebEmail && userEmail === celebEmail) return true;

  const userName = String(user.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const celebName = String(celebrant.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (userName && celebName && userName === celebName) return true;

  return false;
}

export function emitStaffBirthdaysUpdated(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(STAFF_BIRTHDAYS_UPDATED_EVENT));
  } catch {
    // Ignore custom event errors
  }
}

function wasBirthdayToastAlreadyShown(storageKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(storageKey) === '1';
  } catch {
    return false;
  }
}

function markBirthdayToastShown(storageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(storageKey, '1');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Fetches firm staff birthdays from HR records (Supabase `employees` + local overrides + directory),
 * identifies birthdays within 3 days (0–3 days), and fires system-wide notification toasts
 * specifically alerting the HR Manager and the birthday person.
 */
export async function checkAndTriggerUpcomingBirthdayToasts(params: {
  currentUser?: (ActiveUser & { roleTitle?: string | null; jobTitle?: string | null; department?: string | null }) | null;
  availableUsers?: Array<any>;
}): Promise<UpcomingBirthdayRecord[]> {
  const { currentUser, availableUsers = [] } = params;
  if (!currentUser) return [];

  const isHrManager = isHrManagerUser(currentUser);

  // Collect all active staff with a date_of_birth
  const rawMap = new Map<
    string,
    { id: string; name: string; email?: string | null; role: string; dob: string }
  >();

  let localOverrides: Record<string, any> = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(LOCAL_HR_OVERRIDES_KEY);
      if (raw) localOverrides = JSON.parse(raw);
    } catch {
      // Ignore parse errors
    }
  }

  try {
    const empRes = await hrSupabase
      .from('employees')
      .select('id, first_name, last_name, email, job_title, department, date_of_birth, status')
      .neq('status', 'Terminated');

    if (!empRes.error && Array.isArray(empRes.data)) {
      empRes.data.forEach((e: any) => {
        const idKey = String(e.id || '').trim().toLowerCase();
        const emailKey = String(e.email || '').trim().toLowerCase();
        const ov = localOverrides[idKey] || (emailKey ? localOverrides[emailKey] : undefined) || {};
        const dob = ov.date_of_birth || e.date_of_birth || null;
        if (!dob) return;

        const name =
          `${ov.first_name || e.first_name || ''} ${ov.last_name || e.last_name || ''}`.trim() ||
          e.email ||
          'Firm Staff';

        rawMap.set(idKey || emailKey || name.toLowerCase(), {
          id: String(e.id || emailKey || name),
          name,
          email: ov.email || e.email || null,
          role: ov.job_title || e.job_title || e.department || 'Legal Staff',
          dob: String(dob),
        });
      });
    }
  } catch {
    // Graceful fallback to local overrides & availableUsers
  }

  // Merge local HR overrides
  Object.entries(localOverrides).forEach(([key, ov]) => {
    if (!ov?.date_of_birth) return;
    const idKey = String(ov.id || key).trim().toLowerCase();
    const emailKey = String(ov.email || '').trim().toLowerCase();
    const lookupKey = idKey || emailKey;
    if (rawMap.has(lookupKey)) return;

    const name = `${ov.first_name || ''} ${ov.last_name || ''}`.trim() || ov.email || 'Firm Staff';
    rawMap.set(lookupKey, {
      id: String(ov.id || key),
      name,
      email: ov.email || null,
      role: ov.job_title || ov.department || 'Firm Staff',
      dob: String(ov.date_of_birth),
    });
  });

  // Merge any directory users that include date_of_birth / dateOfBirth
  availableUsers.forEach((u) => {
    const dob = u?.date_of_birth || u?.dateOfBirth || null;
    if (!dob) return;
    const idKey = String(u.id || '').trim().toLowerCase();
    const emailKey = String(u.email || '').trim().toLowerCase();
    const lookupKey = idKey || emailKey;
    if (!lookupKey || rawMap.has(lookupKey)) return;
    rawMap.set(lookupKey, {
      id: String(u.id || emailKey),
      name: String(u.name || u.email || 'Firm Staff').trim(),
      email: u.email || null,
      role: u.roleTitle || u.role || 'Firm Staff',
      dob: String(dob),
    });
  });

  const upcomingWithin3Days: UpcomingBirthdayRecord[] = [];
  rawMap.forEach((entry) => {
    const proximity = computeBirthdayProximity(entry.dob, BIRTHDAY_ALERT_WINDOW_DAYS);
    if (proximity.isWithinWindow) {
      upcomingWithin3Days.push({
        ...entry,
        proximity,
      });
    }
  });

  upcomingWithin3Days.sort((a, b) => a.proximity.daysUntil - b.proximity.daysUntil);

  if (upcomingWithin3Days.length === 0) return [];

  const todayIso = getLocalTodayIso();
  const userKey = String(currentUser.id || currentUser.email || 'staff').trim().toLowerCase();

  upcomingWithin3Days.forEach((celebrant) => {
    const isSelf = isBirthdayCelebrantUser(currentUser, celebrant);

    // Only alert the birthday person and the HR Manager
    if (!isSelf && !isHrManager) return;

    const audienceTag = isSelf ? 'self' : 'hr';
    const dedupeKey = `mk_birthday_toast_v1_${todayIso}_${userKey}_${audienceTag}_${celebrant.id.toLowerCase()}_${celebrant.proximity.daysUntil}`;
    if (wasBirthdayToastAlreadyShown(dedupeKey)) return;

    const firstName = celebrant.name.split(/\s+/)[0] || celebrant.name;
    const { daysUntil, formattedDate } = celebrant.proximity;

    let message = '';
    if (isSelf) {
      if (daysUntil === 0) {
        message = `Happy Birthday, ${firstName}! Wishing you a wonderful celebration from Muhumuza - Kiiza Advocates.`;
      } else if (daysUntil === 1) {
        message = `Early Birthday Wishes, ${firstName}! Your birthday is tomorrow (${formattedDate}).`;
      } else {
        message = `Upcoming Birthday Reminder: Your birthday is in ${daysUntil} days (${formattedDate}), ${firstName}!`;
      }
    } else {
      // HR Manager alert
      if (daysUntil === 0) {
        message = `HR Birthday Alert: ${celebrant.name}'s birthday is today (${formattedDate}).`;
      } else if (daysUntil === 1) {
        message = `HR Birthday Alert: ${celebrant.name}'s birthday is tomorrow (${formattedDate}) — 1 day away.`;
      } else {
        message = `HR Birthday Alert: ${celebrant.name}'s birthday is in ${daysUntil} days (${formattedDate}).`;
      }
    }

    markBirthdayToastShown(dedupeKey);
    showCleanMessage(message, 'birthday', { durationMs: 8000 });
  });

  return upcomingWithin3Days;
}
