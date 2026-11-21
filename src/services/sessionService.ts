import { supabase } from '../lib/supabase';

export interface UserLoginSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  branch: string;
  ipAddress: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
  browser: string;
  os: string;
  deviceLabel: string;
  userAgent: string;
  loginAt: string;
  lastActiveAt: string;
  status: 'Active' | 'Ended' | 'Revoked';
  source: string;
  isCurrentSession?: boolean;
}

const CURRENT_SESSION_ID_KEY = 'mk_active_login_session_id_v1';

export function getStoredBrowserSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let existing = window.sessionStorage.getItem(CURRENT_SESSION_ID_KEY);
    if (!existing) {
      existing = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      window.sessionStorage.setItem(CURRENT_SESSION_ID_KEY, existing);
    }
    return existing;
  } catch {
    return `sess_${Date.now()}`;
  }
}

async function buildAuthHeaders(user?: {
  id?: string | null;
  email?: string | null;
  role?: string | null;
  branchId?: string | null;
} | null): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Proceed with identity headers for server-side directory verification
  }

  if (user?.id) headers['x-user-id'] = String(user.id);
  if (user?.email) headers['x-user-email'] = String(user.email);
  if (user?.role) headers['x-user-role'] = String(user.role);
  if (user?.branchId) headers['x-user-branch-id'] = String(user.branchId);

  return headers;
}

/**
 * Records the current authenticated user's login session metadata (IP address, timestamp,
 * and device/browser info resolved server-side) into the database.
 */
export async function recordCurrentUserSession(
  user: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    roleTitle?: string | null;
    branchId?: string | null;
    branchName?: string | null;
  },
  options?: { force?: boolean }
): Promise<UserLoginSession | null> {
  if (!user?.email && !user?.id) return null;

  const sessionId = getStoredBrowserSessionId();
  const dedupeKey = `mk_session_recorded_v1_${sessionId}_${String(user.email || user.id).toLowerCase()}`;

  if (!options?.force && typeof window !== 'undefined') {
    try {
      if (window.sessionStorage.getItem(dedupeKey) === '1') {
        return null;
      }
    } catch {
      // Ignore storage access issues
    }
  }

  try {
    const headers = await buildAuthHeaders(user);
    const response = await fetch('/api/security/sessions/record', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sessionId,
        userId: user.id || null,
        userName: user.name || null,
        userEmail: user.email || null,
        userRole: user.roleTitle || user.role || null,
        branch: user.branchName || null,
      }),
    });

    if (response.ok) {
      const json = await response.json().catch(() => null);
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(dedupeKey, '1');
        } catch {
          // Ignore storage issues
        }
      }
      return json?.session || null;
    }
  } catch {
    // Non-blocking session telemetry fallback
  }

  return null;
}

/**
 * Fetches structured user login session metadata from the backend database & Supabase audit/session tables.
 */
export async function fetchLoginSessions(currentUser?: {
  id?: string | null;
  email?: string | null;
  role?: string | null;
  branchId?: string | null;
} | null): Promise<{
  sessions: UserLoginSession[];
  sourcesChecked: string[];
  error?: string;
}> {
  const currentSessionId = getStoredBrowserSessionId();

  try {
    const headers = await buildAuthHeaders(currentUser);
    const response = await fetch('/api/security/sessions', {
      method: 'GET',
      headers,
    });

    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      return {
        sessions: [],
        sourcesChecked: [],
        error: json?.error || 'Unable to load login session metadata.',
      };
    }

    const sessions: UserLoginSession[] = Array.isArray(json.sessions)
      ? json.sessions.map((s: UserLoginSession) => ({
          ...s,
          isCurrentSession: Boolean(currentSessionId && s.id === currentSessionId),
        }))
      : [];

    return {
      sessions,
      sourcesChecked: Array.isArray(json.sourcesChecked) ? json.sourcesChecked : [],
    };
  } catch (err: any) {
    return {
      sessions: [],
      sourcesChecked: [],
      error: err?.message || 'Network error while querying session records.',
    };
  }
}

/**
 * Revokes an active user session record and writes a SESSION_REVOKED audit log entry.
 */
export async function revokeUserSession(
  sessionId: string,
  currentUser?: {
    id?: string | null;
    email?: string | null;
    role?: string | null;
    branchId?: string | null;
  } | null
): Promise<{ success: boolean; error?: string }> {
  if (!sessionId) return { success: false, error: 'Missing session ID.' };

  try {
    const headers = await buildAuthHeaders(currentUser);
    const response = await fetch(`/api/security/sessions/${encodeURIComponent(sessionId)}/revoke`, {
      method: 'POST',
      headers,
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      return { success: false, error: json?.error || 'Failed to revoke session.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error while revoking session.' };
  }
}
