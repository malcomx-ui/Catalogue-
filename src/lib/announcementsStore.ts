import { supabase } from './supabase';

export type FirmAnnouncementCategory =
  | 'Practice Directive'
  | 'Court Registry'
  | 'Vault Custody'
  | 'HR & Admin'
  | 'Branch Update'
  | 'General';

export type FirmAnnouncementPriority = 'Normal' | 'Urgent';

export interface FirmAnnouncement {
  id: string;
  title: string;
  body: string;
  category: FirmAnnouncementCategory;
  priority: FirmAnnouncementPriority;
  pinned: boolean;
  issuer: string;
  issuerEmail?: string;
  issuerRole?: string;
  branchScope: string;
  date: string;
  createdAtIso: string;
  /** Seed notices populate the initial dashboard block without triggering unread popups */
  isSeed?: boolean;
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  category: FirmAnnouncementCategory;
  priority: FirmAnnouncementPriority;
  pinned: boolean;
  branchScope: string;
  issuer: string;
  issuerEmail?: string;
  issuerRole?: string;
}

export const ANNOUNCEMENT_CATEGORIES: FirmAnnouncementCategory[] = [
  'Practice Directive',
  'Court Registry',
  'Vault Custody',
  'HR & Admin',
  'Branch Update',
  'General',
];

const LOCAL_STORAGE_KEY = 'mk_firm_announcements_v1';
const CHANGE_EVENT = 'mk_firm_announcements_changed';

function makeRelativeSeedIso(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

export const SEED_ANNOUNCEMENTS: FirmAnnouncement[] = [
  {
    id: 'notice-1',
    pinned: true,
    priority: 'Normal',
    category: 'Practice Directive',
    title: 'High Court Commercial Division E-Filing & Bundle Index Protocol',
    body: 'All trial bundles, written submissions, and mortgage perfection affidavits must carry the standardized MK Case File code and Vault Custody reference prior to registry dispatch.',
    issuer: 'Managing Partner Chambers',
    issuerRole: 'Managing Partner',
    date: 'Today · 08:30 AM',
    createdAtIso: makeRelativeSeedIso(3),
    branchScope: 'All Branches',
    isSeed: true,
  },
  {
    id: 'notice-2',
    pinned: false,
    priority: 'Normal',
    category: 'Vault Custody',
    title: 'Weekly Original Title Deeds Audit — Centenary & Commercial Banks',
    body: 'Branch clerks must reconcile physical strongroom custody logs against digital custody entries before Friday 3:00 PM EAT.',
    issuer: 'Registry & Custody Desk',
    issuerRole: 'Registry Operations',
    date: 'Yesterday · 04:15 PM',
    createdAtIso: makeRelativeSeedIso(26),
    branchScope: 'Kampala Central (Head Office)',
    isSeed: true,
  },
  {
    id: 'notice-3',
    pinned: false,
    priority: 'Normal',
    category: 'Court Registry',
    title: 'Updated Regional Circuit Cause List Sync Window',
    body: 'Fort Portal, Mbarara, and Jinja chambers are advised to log adjournment orders and next hearing dates within 2 hours of court rising.',
    issuer: 'Litigation Operations',
    issuerRole: 'Litigation Desk',
    date: '2 days ago',
    createdAtIso: makeRelativeSeedIso(52),
    branchScope: 'All Branches',
    isSeed: true,
  },
];

export function formatAnnouncementTimestamp(iso?: string, fallback?: string): string {
  if (!iso) return fallback || 'Just now';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return fallback || 'Just now';

  const now = new Date();
  const timeStr = parsed.toLocaleTimeString('en-UG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24));

  if (dayDiff === 0) return `Today · ${timeStr}`;
  if (dayDiff === 1) return `Yesterday · ${timeStr}`;
  if (dayDiff > 1 && dayDiff <= 6) return `${dayDiff} days ago`;

  const dateStr = parsed.toLocaleDateString('en-UG', {
    day: '2-digit',
    month: 'short',
    year: parsed.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
  return `${dateStr} · ${timeStr}`;
}

export function sortAnnouncements(items: FirmAnnouncement[]): FirmAnnouncement[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const aMs = new Date(a.createdAtIso || 0).getTime() || 0;
    const bMs = new Date(b.createdAtIso || 0).getTime() || 0;
    return bMs - aMs;
  });
}

function emitAnnouncementsChanged(items: FirmAnnouncement[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: items }));
  } catch {
    // Ignore custom event errors
  }
}

export function loadLocalAnnouncements(): FirmAnnouncement[] {
  if (typeof window === 'undefined') return sortAnnouncements(SEED_ANNOUNCEMENTS);
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return sortAnnouncements(SEED_ANNOUNCEMENTS);
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return sortAnnouncements(SEED_ANNOUNCEMENTS);
    }
    return sortAnnouncements(parsed as FirmAnnouncement[]);
  } catch {
    return sortAnnouncements(SEED_ANNOUNCEMENTS);
  }
}

export function saveLocalAnnouncements(items: FirmAnnouncement[]): FirmAnnouncement[] {
  const sorted = sortAnnouncements(items);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
    } catch {
      // Ignore storage quota errors
    }
    emitAnnouncementsChanged(sorted);
  }
  return sorted;
}

export function subscribeToAnnouncements(
  callback: (items: FirmAnnouncement[]) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = (event: Event) => {
    const customEvent = event as CustomEvent<FirmAnnouncement[]>;
    if (Array.isArray(customEvent.detail)) {
      callback(sortAnnouncements(customEvent.detail));
    } else {
      callback(loadLocalAnnouncements());
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_STORAGE_KEY) {
      callback(loadLocalAnnouncements());
    }
  };

  window.addEventListener(CHANGE_EVENT, handleCustom);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}

function mapSupabaseRow(row: Record<string, any>): FirmAnnouncement {
  const createdAtIso = String(row.created_at || row.createdAtIso || new Date().toISOString());
  const categoryRaw = String(row.category || 'General');
  const category = ANNOUNCEMENT_CATEGORIES.includes(categoryRaw as FirmAnnouncementCategory)
    ? (categoryRaw as FirmAnnouncementCategory)
    : 'General';
  const priority: FirmAnnouncementPriority =
    String(row.priority || 'Normal').toLowerCase() === 'urgent' ? 'Urgent' : 'Normal';

  return {
    id: String(row.id),
    title: String(row.title || 'Firm Announcement'),
    body: String(row.body || row.message || ''),
    category,
    priority,
    pinned: Boolean(row.pinned),
    issuer: String(row.issuer || row.author_name || 'Firm Staff'),
    issuerEmail: row.issuer_email ? String(row.issuer_email) : undefined,
    issuerRole: row.issuer_role ? String(row.issuer_role) : undefined,
    branchScope: String(row.branch_scope || row.branchScope || 'All Branches'),
    createdAtIso,
    date: formatAnnouncementTimestamp(createdAtIso),
    isSeed: false,
  };
}

export async function fetchAnnouncementsFromSupabase(): Promise<FirmAnnouncement[]> {
  const local = loadLocalAnnouncements();
  try {
    const { data, error } = await supabase
      .from('firm_announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !Array.isArray(data) || data.length === 0) {
      return local;
    }

    const remoteMapped = data.map(mapSupabaseRow);
    const byId = new Map<string, FirmAnnouncement>();

    // Preserve local non-seed announcements that may not have synced yet, plus remote rows
    local.forEach((item) => {
      if (!item.isSeed) byId.set(item.id, item);
    });
    remoteMapped.forEach((item) => {
      byId.set(item.id, item);
    });

    // Keep seed notices only if no remote rows exist
    const merged = Array.from(byId.values());
    if (merged.length === 0) {
      return local;
    }

    return saveLocalAnnouncements(merged);
  } catch {
    return local;
  }
}

export async function publishAnnouncement(
  input: CreateAnnouncementInput
): Promise<FirmAnnouncement> {
  const nowIso = new Date().toISOString();
  const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const announcement: FirmAnnouncement = {
    id,
    title: input.title.trim(),
    body: input.body.trim(),
    category: input.category,
    priority: input.priority,
    pinned: input.pinned,
    issuer: input.issuer.trim() || 'Firm Staff',
    issuerEmail: input.issuerEmail,
    issuerRole: input.issuerRole,
    branchScope: input.branchScope || 'All Branches',
    createdAtIso: nowIso,
    date: formatAnnouncementTimestamp(nowIso),
    isSeed: false,
  };

  const current = loadLocalAnnouncements();
  saveLocalAnnouncements([announcement, ...current]);

  // Best-effort sync to Supabase if firm_announcements table exists
  try {
    await supabase.from('firm_announcements').insert({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      category: announcement.category,
      priority: announcement.priority,
      pinned: announcement.pinned,
      issuer: announcement.issuer,
      issuer_email: announcement.issuerEmail || null,
      issuer_role: announcement.issuerRole || null,
      branch_scope: announcement.branchScope,
      created_at: announcement.createdAtIso,
    });
  } catch {
    // Graceful local persistence fallback
  }

  return announcement;
}

export async function togglePinAnnouncement(id: string): Promise<FirmAnnouncement[]> {
  const current = loadLocalAnnouncements();
  let nextPinned = false;
  const updated = current.map((item) => {
    if (item.id === id) {
      nextPinned = !item.pinned;
      return { ...item, pinned: nextPinned };
    }
    return item;
  });

  const saved = saveLocalAnnouncements(updated);

  try {
    await supabase
      .from('firm_announcements')
      .update({ pinned: nextPinned })
      .eq('id', id);
  } catch {
    // Ignore if table not provisioned
  }

  return saved;
}

export async function deleteAnnouncement(id: string): Promise<FirmAnnouncement[]> {
  const current = loadLocalAnnouncements();
  const updated = current.filter((item) => item.id !== id);
  const saved = saveLocalAnnouncements(updated.length > 0 ? updated : SEED_ANNOUNCEMENTS);

  try {
    await supabase.from('firm_announcements').delete().eq('id', id);
  } catch {
    // Ignore if table not provisioned
  }

  return saved;
}
