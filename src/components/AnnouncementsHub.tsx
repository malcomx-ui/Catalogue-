import React, { useEffect, useMemo, useState } from 'react';
import {
  Megaphone,
  Plus,
  Pin,
  PinOff,
  Trash2,
  Send,
  X,
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getEffectiveUser, isUserAdmin } from '../lib/supabase';
import { isSuperAdminUser } from '../lib/hrSupabase';
import { dedupeBranches } from '../utils/globalSearch';
import { showCleanMessage } from '../utils/notification';
import {
  ANNOUNCEMENT_CATEGORIES,
  deleteAnnouncement,
  fetchAnnouncementsFromSupabase,
  formatAnnouncementTimestamp,
  loadLocalAnnouncements,
  publishAnnouncement,
  subscribeToAnnouncements,
  togglePinAnnouncement,
  type FirmAnnouncement,
  type FirmAnnouncementCategory,
  type FirmAnnouncementPriority,
} from '../lib/announcementsStore';

export interface AnnouncementsHubProps {
  searchQuery?: string;
}

type FeedFilterTab = 'all' | 'pinned' | 'urgent';

function getInitials(name?: string | null): string {
  const parts = String(name || 'MK')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (parts[0] || 'MK').slice(0, 2).toUpperCase();
}

export const AnnouncementsHub: React.FC<AnnouncementsHubProps> = ({ searchQuery = '' }) => {
  const { currentUser, branches } = useApp();
  const effectiveUser = useMemo(() => getEffectiveUser(currentUser), [currentUser]);
  const canModerateAll = useMemo(
    () => isUserAdmin(effectiveUser) || isSuperAdminUser(effectiveUser),
    [effectiveUser]
  );

  const [announcements, setAnnouncements] = useState<FirmAnnouncement[]>(() =>
    loadLocalAnnouncements()
  );
  const [composerOpen, setComposerOpen] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<FeedFilterTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Compose form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<FirmAnnouncementCategory>('Practice Directive');
  const [priority, setPriority] = useState<FirmAnnouncementPriority>('Normal');
  const [branchScope, setBranchScope] = useState<string>('All Branches');
  const [pinned, setPinned] = useState<boolean>(false);
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAnnouncements((next) => {
      if (active) setAnnouncements(next);
    });
    fetchAnnouncementsFromSupabase().then((items) => {
      if (active) setAnnouncements(items);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const branchScopeOptions = useMemo(() => {
    const deduped = dedupeBranches(branches || []).map(({ primary }) => primary.name);
    const fallback = [
      'Kampala Central (Head Office)',
      'Fort Portal Branch',
      'Mbarara Branch',
      'Masaka Branch',
      'Jinja Branch',
      'Masindi Branch',
      'Gulu Branch',
    ];
    const list = deduped.length > 0 ? deduped : fallback;
    return ['All Branches', ...Array.from(new Set(list))];
  }, [branches]);

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return announcements.filter((item) => {
      if (filterTab === 'pinned' && !item.pinned) return false;
      if (filterTab === 'urgent' && item.priority !== 'Urgent') return false;
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (q) {
        const haystack = [
          item.title,
          item.body,
          item.category,
          item.issuer,
          item.issuerRole,
          item.branchScope,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [announcements, filterTab, selectedCategory, searchQuery]);

  const stats = useMemo(() => {
    const total = announcements.length;
    const pinnedCount = announcements.filter((a) => a.pinned).length;
    const urgentCount = announcements.filter((a) => a.priority === 'Urgent').length;
    return { total, pinnedCount, urgentCount };
  }, [announcements]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Please enter a clear headline for the announcement.');
      return;
    }
    if (!body.trim()) {
      setFormError('Please enter the announcement details for staff.');
      return;
    }

    setIsSubmitting(true);
    try {
      await publishAnnouncement({
        title: title.trim(),
        body: body.trim(),
        category,
        priority,
        pinned,
        branchScope,
        issuer: effectiveUser?.name || 'Firm Staff',
        issuerEmail: effectiveUser?.email,
        issuerRole: effectiveUser?.roleTitle || effectiveUser?.role || 'Legal Staff',
      });

      setTitle('');
      setBody('');
      setPriority('Normal');
      setPinned(false);
      setBranchScope('All Branches');
      showCleanMessage(
        'Announcement published — now live on the Dashboard and Notifications.',
        'success'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async (item: FirmAnnouncement) => {
    await togglePinAnnouncement(item.id);
    showCleanMessage(
      item.pinned ? 'Announcement unpinned.' : 'Announcement pinned to Dashboard top.',
      'info'
    );
  };

  const handleDelete = async (item: FirmAnnouncement) => {
    await deleteAnnouncement(item.id);
    showCleanMessage('Announcement removed.', 'info');
  };

  const canManageItem = (item: FirmAnnouncement): boolean => {
    if (canModerateAll) return true;
    const userEmail = String(effectiveUser?.email || '').toLowerCase();
    const userName = String(effectiveUser?.name || '').toLowerCase();
    if (userEmail && item.issuerEmail && item.issuerEmail.toLowerCase() === userEmail) {
      return true;
    }
    if (userName && item.issuer.toLowerCase() === userName) {
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,101,0.03)] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#000065] to-[#121285] text-[#E8C06B] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(0,0,101,0.2)]">
            <Megaphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold text-[#000065] dark:text-white tracking-tight">
              Firm Announcements
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              Post firm-wide directives, court notices, and branch updates. Published notices appear immediately in Notifications and the Dashboard announcements block.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setComposerOpen((prev) => !prev)}
          className={`h-9 px-4 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all duration-150 shrink-0 cursor-pointer ${
            composerOpen
              ? 'border border-[#DFE5F2] dark:border-slate-700 bg-[#F5F7FB] hover:bg-[#EEF1FA] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#000065] dark:text-slate-200'
              : 'bg-[#000065] hover:bg-[#121285] active:bg-[#00004A] text-white shadow-[0_2px_8px_rgba(0,0,101,0.22)] hover:shadow-[0_4px_14px_rgba(0,0,101,0.3)]'
          }`}
        >
          {composerOpen ? (
            <>
              <X className="w-3.5 h-3.5" />
              <span>Hide Composer</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 text-[#E8C06B]" />
              <span>New Announcement</span>
            </>
          )}
        </button>
      </div>

      {/* Main Two-Column Grid: Composer (or Top Full Form) + Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {composerOpen && (
          <section className="lg:col-span-5 rounded-xl bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,101,0.03)] overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#000065] to-[#121285] text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Send className="w-4 h-4 text-[#E8C06B] shrink-0" />
                <h2 className="font-display text-sm font-bold tracking-tight truncate">
                  Compose Announcement
                </h2>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#E8C06B]/90 shrink-0">
                Live Broadcast
              </span>
            </div>

            <form onSubmit={handlePublish} className="p-5 space-y-4">
              {formError && (
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="announcement-title"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  Headline <span className="text-rose-500">*</span>
                </label>
                <input
                  id="announcement-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Commercial Court Registry Hours Update"
                  maxLength={140}
                  className="w-full h-10 px-3 rounded-lg bg-[#F5F7FB] dark:bg-slate-800 border border-[#DFE5F2] dark:border-slate-700 text-xs font-medium text-[#0F1336] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#000065] focus:ring-2 focus:ring-[#000065]/12 transition-all duration-150"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="announcement-category"
                    className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                  >
                    Category
                  </label>
                  <select
                    id="announcement-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FirmAnnouncementCategory)}
                    className="w-full h-10 px-3 rounded-lg bg-[#F5F7FB] dark:bg-slate-800 border border-[#DFE5F2] dark:border-slate-700 text-xs font-medium text-[#0F1336] dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#000065] focus:ring-2 focus:ring-[#000065]/12 transition-all duration-150 cursor-pointer"
                  >
                    {ANNOUNCEMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="announcement-branch"
                    className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                  >
                    Audience Scope
                  </label>
                  <select
                    id="announcement-branch"
                    value={branchScope}
                    onChange={(e) => setBranchScope(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#F5F7FB] dark:bg-slate-800 border border-[#DFE5F2] dark:border-slate-700 text-xs font-medium text-[#0F1336] dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#000065] focus:ring-2 focus:ring-[#000065]/12 transition-all duration-150 cursor-pointer"
                  >
                    {branchScopeOptions.map((scope) => (
                      <option key={scope} value={scope}>
                        {scope}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Priority Level
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#F5F7FB] dark:bg-slate-800 border border-[#DFE5F2] dark:border-slate-700">
                    {(['Normal', 'Urgent'] as FirmAnnouncementPriority[]).map((level) => {
                      const active = priority === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setPriority(level)}
                          className={`h-8 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer ${
                            active
                              ? level === 'Urgent'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-[#000065] text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-[#EEF1FA] dark:hover:bg-slate-700/60'
                          }`}
                        >
                          {level === 'Normal' ? 'Standard' : 'Urgent'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Dashboard Placement
                  </span>
                  <button
                    type="button"
                    onClick={() => setPinned((p) => !p)}
                    className={`w-full h-10 px-3 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer ${
                      pinned
                        ? 'bg-[#FBF7EE] border-[#D99B26]/50 text-[#000065] dark:bg-[#D99B26]/15 dark:text-[#F5D28B]'
                        : 'bg-[#F5F7FB] hover:bg-[#EEF1FA] border-[#DFE5F2] text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${pinned ? 'text-[#D99B26]' : 'text-slate-400'}`} />
                    <span>{pinned ? 'Pinned to Top' : 'Pin to Top'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="announcement-body"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  Announcement Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="announcement-body"
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write clear instructions, deadlines, or updates for the team..."
                  className="w-full p-3 rounded-lg bg-[#F5F7FB] dark:bg-slate-800 border border-[#DFE5F2] dark:border-slate-700 text-xs text-[#0F1336] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#000065] focus:ring-2 focus:ring-[#000065]/12 transition-all duration-150 resize-y leading-relaxed"
                />
              </div>

              <div className="rounded-lg bg-[#F5F7FB] dark:bg-slate-800/70 border border-[#DFE5F2] dark:border-slate-700 px-3 py-2.5 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#000065] dark:text-[#E8C06B] shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Posting as{' '}
                  <span className="font-semibold text-[#000065] dark:text-white">
                    {effectiveUser?.name || 'Firm Staff'}
                  </span>
                  . This will immediately pop up in Notifications and update the Dashboard Firm Announcements block.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTitle('');
                    setBody('');
                    setFormError(null);
                  }}
                  className="h-9 px-3.5 rounded-lg border border-[#DFE5F2] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-[#EEF1FA] dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-lg bg-[#000065] hover:bg-[#121285] active:bg-[#00004A] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-[0_2px_8px_rgba(0,0,101,0.22)] hover:shadow-[0_4px_14px_rgba(0,0,101,0.3)] transition-all duration-150 cursor-pointer"
                >
                  <Megaphone className="w-3.5 h-3.5 text-[#E8C06B]" />
                  <span>{isSubmitting ? 'Publishing...' : 'Publish Announcement'}</span>
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Announcements Feed */}
        <section
          className={`${
            composerOpen ? 'lg:col-span-7' : 'lg:col-span-12'
          } rounded-xl bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,101,0.03)] overflow-hidden`}
        >
          {/* Feed Filter Header */}
          <div className="px-5 py-3.5 border-b border-[#DFE5F2] dark:border-slate-800 bg-[#F8FAFE] dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#EEF1FA] dark:bg-slate-800">
              {(
                [
                  { id: 'all', label: `All (${stats.total})` },
                  { id: 'pinned', label: `Pinned (${stats.pinnedCount})` },
                  { id: 'urgent', label: `Urgent (${stats.urgentCount})` },
                ] as { id: FeedFilterTab; label: string }[]
              ).map((tab) => {
                const active = filterTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterTab(tab.id)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold tabular-nums transition-all duration-150 cursor-pointer ${
                      active
                        ? 'bg-[#000065] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-[#000065] dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Filter announcements by category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-[#DFE5F2] dark:border-slate-700 text-xs font-medium text-[#000065] dark:text-slate-200 focus:outline-none focus:border-[#000065] cursor-pointer"
              >
                <option value="All">All Categories</option>
                {ANNOUNCEMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Feed Items */}
          <div className="divide-y divide-[#DFE5F2]/80 dark:divide-slate-800">
            {filteredAnnouncements.length === 0 ? (
              <div className="px-6 py-12 text-center space-y-2">
                <Megaphone className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="font-display text-sm font-bold text-[#000065] dark:text-white">
                  No announcements match this filter
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Adjust the category filter or publish a new firm announcement.
                </p>
              </div>
            ) : (
              filteredAnnouncements.map((item) => {
                const canManage = canManageItem(item);
                const timestamp = formatAnnouncementTimestamp(item.createdAtIso, item.date);

                return (
                  <article
                    key={item.id}
                    className={`p-5 transition-colors duration-150 ${
                      item.pinned
                        ? 'bg-[#FBF7EE]/85 hover:bg-[#F7F0DF]/90 dark:bg-[#D99B26]/[0.06] dark:hover:bg-[#D99B26]/[0.10]'
                        : 'hover:bg-[#F7F9FD] dark:hover:bg-slate-800/35'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.pinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#000065] text-[#E8C06B]">
                            <Pin className="w-2.5 h-2.5" />
                            Pinned
                          </span>
                        )}
                        {item.priority === 'Urgent' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Urgent
                          </span>
                        )}
                        <span className="text-[11px] font-semibold text-[#000065]/75 dark:text-slate-300">
                          {item.category}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {item.branchScope}
                        </span>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePin(item)}
                            title={item.pinned ? 'Unpin announcement' : 'Pin announcement'}
                            className="p-1.5 rounded-md text-slate-400 hover:text-[#000065] hover:bg-[#EEF1FA] dark:hover:text-[#E8C06B] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            {item.pinned ? (
                              <PinOff className="w-3.5 h-3.5" />
                            ) : (
                              <Pin className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            title="Delete announcement"
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="font-display text-sm font-bold text-[#000065] dark:text-white mt-2 leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed whitespace-pre-line">
                      {item.body}
                    </p>

                    <div className="mt-3.5 pt-3 border-t border-[#DFE5F2]/60 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#000065] to-[#121285] text-[#E8C06B] text-[10px] font-display font-bold flex items-center justify-center shrink-0">
                          {getInitials(item.issuer)}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                          <span className="font-semibold text-[#0F1336] dark:text-slate-200">
                            {item.issuer}
                          </span>
                          {item.issuerRole && (
                            <span className="text-slate-400 dark:text-slate-500">
                              {' '}
                              · {item.issuerRole}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 tabular-nums shrink-0">
                        <Clock className="w-3 h-3" />
                        {timestamp}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AnnouncementsHub;
