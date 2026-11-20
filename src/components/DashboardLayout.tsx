import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp, NavigationTab } from '../context/AppContext';
import { getEffectiveUser, isUserAdmin } from '../lib/supabase';
import { isSuperAdminUser, canAccessRestrictedWorkflowNav } from '../lib/hrSupabase';
import type { RequisitionNotification } from '../lib/cashRequisitionStore';
import {
  LayoutGrid,
  Briefcase,
  FilePlus2,
  FolderLock,
  ClipboardCheck,
  MessageSquare,
  Landmark,
  Users,
  Calendar,
  Building2,
  ShieldCheck,
  UserCog,
  Search,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Scale,
  Sliders,
  Banknote,
  Bell,
} from 'lucide-react';

export interface DashboardLayoutProps {
  currentUser?: any;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  approvalsBadgeCount?: number;
  cashRequisitionsBadgeCount?: number;
  messengerBadgeCount?: number;
  decisionNotifications?: RequisitionNotification[];
  onMarkAllDecisionNotificationsRead?: () => void;
  onMarkDecisionNotificationRead?: (id: string) => void;
  children?: React.ReactNode;
}

interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tab?: NavigationTab;
  badge?: number;
  action?: () => void;
  superAdminOnly?: boolean;
}

function getUserInitials(name?: string | null): string {
  const parts = String(name || 'MK')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (parts[0] || 'MK').slice(0, 2).toUpperCase();
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentUser: propUser,
  searchQuery = '',
  onSearchChange,
  approvalsBadgeCount = 3,
  cashRequisitionsBadgeCount = 2,
  messengerBadgeCount = 2,
  decisionNotifications = [],
  onMarkAllDecisionNotificationsRead,
  onMarkDecisionNotificationRead,
  children,
}) => {
  const {
    activeTab,
    setActiveTab,
    setIsNewCaseModalOpen,
    branches,
    selectedBranchFilter,
    setSelectedBranchFilter,
    currentUser: ctxUser,
    logout,
  } = useApp();

  const effectiveUser = useMemo(() => getEffectiveUser(propUser || ctxUser), [propUser, ctxUser]);
  const isSuperAdmin = isSuperAdminUser(effectiveUser);
  const isAdmin = isUserAdmin(effectiveUser);
  const canAccessRestrictedWorkflow = canAccessRestrictedWorkflowNav(effectiveUser);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [logoErrorStep, setLogoErrorStep] = useState(0);
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const unreadDecisionCount = useMemo(
    () => decisionNotifications.filter((n) => n.unread).length,
    [decisionNotifications]
  );

  useEffect(() => {
    if (!notifPopoverOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [notifPopoverOpen]);

  const firmLogoSrc =
    logoErrorStep === 0
      ? '/logo.png'
      : logoErrorStep === 1
      ? '/mk_firm_logo.png'
      : logoErrorStep === 2
      ? '/seal.png'
      : null;

  const branchOptions = useMemo(() => {
    if (Array.isArray(branches) && branches.length > 0) {
      return [
        { id: 'all', name: 'All Firm Branches' },
        ...branches.map((b) => ({ id: b.id, name: b.name })),
      ];
    }
    return [
      { id: 'all', name: 'All Firm Branches' },
      { id: 'kla-hq', name: 'Kampala Central (Head Office)' },
      { id: 'fpt', name: 'Fort Portal Branch' },
      { id: 'mbr', name: 'Mbarara Branch' },
      { id: 'msk', name: 'Masaka Branch' },
      { id: 'jnj', name: 'Jinja Branch' },
      { id: 'msd', name: 'Masindi Branch' },
      { id: 'glu', name: 'Gulu Branch' },
    ];
  }, [branches]);

  const primaryNavItems: SidebarNavItem[] = useMemo(() => {
    const items: SidebarNavItem[] = [
      { id: 'workspace', label: 'Workspace', icon: LayoutGrid, tab: 'dashboard' },
      { id: 'cases', label: 'Cases & Matters', icon: Briefcase, tab: 'catalogue' },
      {
        id: 'litigation_form',
        label: 'Litigation Form',
        icon: FilePlus2,
        action: () => {
          setActiveTab('catalogue');
          setIsNewCaseModalOpen(true);
        },
      },
      { id: 'documents', label: 'Documents & Custody', icon: FolderLock, tab: 'documents' },
    ];

    if (canAccessRestrictedWorkflow) {
      items.push(
        {
          id: 'approvals',
          label: 'Approvals',
          icon: ClipboardCheck,
          tab: 'approvals',
          badge: approvalsBadgeCount > 0 ? approvalsBadgeCount : undefined,
        },
        {
          id: 'cash_requisitions',
          label: 'Cash Requisitions',
          icon: Banknote,
          tab: 'cash_requisitions',
          badge: cashRequisitionsBadgeCount > 0 ? cashRequisitionsBadgeCount : undefined,
        }
      );
    }

    items.push(
      {
        id: 'messenger',
        label: 'Team Messenger',
        icon: MessageSquare,
        tab: 'messenger',
        badge: messengerBadgeCount > 0 ? messengerBadgeCount : undefined,
      },
      { id: 'mortgages', label: 'Mortgages', icon: Landmark, tab: 'mortgages' }
    );

    if (canAccessRestrictedWorkflow) {
      items.push({ id: 'staff_workflow', label: 'Staff & Workflow', icon: Users, tab: 'legal_team' });
    }

    items.push(
      { id: 'calendar', label: 'Calendar & Deadlines', icon: Calendar, tab: 'causelist' },
      { id: 'branches', label: 'Branches', icon: Building2, tab: 'branches' }
    );

    if (canAccessRestrictedWorkflow) {
      items.push({
        id: 'audit',
        label: 'Audit Trail & Security',
        icon: ShieldCheck,
        tab: 'audit_trail',
      });
    }

    return items;
  }, [
    canAccessRestrictedWorkflow,
    approvalsBadgeCount,
    cashRequisitionsBadgeCount,
    messengerBadgeCount,
    setActiveTab,
    setIsNewCaseModalOpen,
  ]);

  const adminNavItems: SidebarNavItem[] = useMemo(() => {
    const list: SidebarNavItem[] = [];
    // Strictly gated by isSuperAdminUser so non-Super Admin staff never see HR Management until rollout
    if (isSuperAdmin) {
      list.push({
        id: 'hr_admin',
        label: 'HR Management (Admin Only)',
        icon: UserCog,
        tab: 'hr',
        superAdminOnly: true,
      });
    }
    if (isAdmin) {
      list.push({
        id: 'settings',
        label: 'System Settings',
        icon: Sliders,
        tab: 'settings',
      });
    }
    return list;
  }, [isSuperAdmin, isAdmin]);

  const handleNavClick = (item: SidebarNavItem) => {
    if (item.action) {
      item.action();
    } else if (item.tab) {
      setActiveTab(item.tab);
    }
    setMobileDrawerOpen(false);
  };

  const renderSidebarContent = (compact: boolean) => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 select-none">
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            setActiveTab('dashboard');
            setMobileDrawerOpen(false);
          }}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-950 p-1 border border-[#C5A880]/60 dark:border-[#C5A880]/40 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
            {firmLogoSrc ? (
              <img
                src={firmLogoSrc}
                alt="Muhumuza - Kiiza Advocates Firm Logo"
                referrerPolicy="no-referrer"
                onError={() => setLogoErrorStep((s) => s + 1)}
                className="w-full h-full object-contain"
              />
            ) : (
              <Scale className="w-5 h-5 text-[#000065] dark:text-[#C5A880]" />
            )}
          </div>
          {!compact && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0B132B] dark:text-white tracking-tight truncate">
                MK Case Catalogue
              </p>
              <p className="text-[11px] text-[#9E7B46] dark:text-[#C5A880] font-medium truncate">
                Muhumuza - Kiiza Advocates
              </p>
            </div>
          )}
        </button>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = Boolean(item.tab && activeTab === item.tab);
          return (
            <button
              key={item.id}
              type="button"
              title={compact ? item.label : undefined}
              onClick={() => handleNavClick(item)}
              className={`w-full flex items-center ${
                compact ? 'justify-center px-2' : 'justify-between px-3'
              } py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer group ${
                isActive
                  ? 'bg-[#0B132B] dark:bg-[#000065] text-white shadow-xs ring-1 ring-[#C5A880]/40'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#0B132B] dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-[#C5A880]'
                      : 'text-slate-400 group-hover:text-[#000065] dark:group-hover:text-[#C5A880]'
                  }`}
                />
                {!compact && <span className="truncate">{item.label}</span>}
              </div>

              {!compact && item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums shrink-0 ${
                    isActive
                      ? 'bg-[#C5A880]/20 text-[#E2CFAF]'
                      : 'bg-[#000065]/8 dark:bg-[#C5A880]/15 text-[#000065] dark:text-[#E2CFAF]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {adminNavItems.length > 0 && (
          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
            {!compact && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9E7B46] dark:text-[#C5A880]/80">
                Administration
              </p>
            )}
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = Boolean(item.tab && activeTab === item.tab);
              return (
                <button
                  key={item.id}
                  type="button"
                  title={compact ? item.label : undefined}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center ${
                    compact ? 'justify-center px-2' : 'justify-between px-3'
                  } py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer group ${
                    isActive
                      ? 'bg-[#0B132B] dark:bg-[#000065] text-white shadow-xs ring-1 ring-[#C5A880]/40'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#0B132B] dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-[#C5A880]'
                          : 'text-slate-400 group-hover:text-[#000065] dark:group-hover:text-[#C5A880]'
                      }`}
                    />
                    {!compact && <span className="truncate">{item.label}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Bottom User Card */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 shrink-0">
        <div
          className={`flex items-center ${
            compact ? 'justify-center' : 'justify-between gap-2.5'
          } p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0B132B] to-[#000065] ring-1 ring-[#C5A880]/50 text-[#E2CFAF] text-xs font-bold flex items-center justify-center shrink-0">
              {getUserInitials(effectiveUser?.name)}
            </div>
            {!compact && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {effectiveUser?.name || 'Firm Staff'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {effectiveUser?.roleTitle || effectiveUser?.role || 'Advocate'}
                </p>
              </div>
            )}
          </div>

          {!compact && (
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans print:bg-white">
      {/* Desktop Fixed / Collapsible Sidebar */}
      <aside
        className={`no-print hidden lg:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen transition-[width] duration-200 ${
          sidebarCollapsed ? 'w-[74px]' : 'w-64'
        }`}
      >
        {renderSidebarContent(sidebarCollapsed)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative z-10 w-64 max-w-[82vw] h-full shadow-2xl">
            {renderSidebarContent(false)}
          </div>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Top Header Bar */}
        <header className="no-print sticky top-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-3">
          {/* Left: Sidebar toggles + Live Global Search */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="hidden lg:inline-flex p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            <div className="relative flex-1 max-w-xl min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Search Case File # (e.g. LF-2026), Doc Code (e.g. DOC-PLD), or Client..."
                className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000065] dark:focus:ring-[#C5A880] transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Decision Notifications Bell (restricted workflow users only) + Branch selector dropdown */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {canAccessRestrictedWorkflow && (
              <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifPopoverOpen((o) => !o)}
                aria-label="Decision notifications"
                title="Cash Requisition Decision Notifications"
                className="relative p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadDecisionCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#000065] text-[#E2CFAF] ring-1 ring-[#C5A880]/60 text-[10px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                    {unreadDecisionCount > 9 ? '9+' : unreadDecisionCount}
                  </span>
                )}
              </button>

              {notifPopoverOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[90vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Decision Notifications
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {unreadDecisionCount} unread notice{unreadDecisionCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    {unreadDecisionCount > 0 && onMarkAllDecisionNotificationsRead && (
                      <button
                        type="button"
                        onClick={onMarkAllDecisionNotificationsRead}
                        className="text-[11px] font-semibold text-[#000065] dark:text-[#C5A880] hover:underline cursor-pointer shrink-0"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {decisionNotifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        No cash requisition decision notices yet.
                      </div>
                    ) : (
                      decisionNotifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            onMarkDecisionNotificationRead?.(n.id);
                            setActiveTab('cash_requisitions');
                            setNotifPopoverOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer space-y-1 ${
                            n.unread ? 'bg-[#F7F1E7]/50 dark:bg-[#000065]/25' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-mono font-bold text-slate-900 dark:text-white inline-flex items-center gap-1.5">
                              {n.unread && (
                                <span className="w-2 h-2 rounded-full bg-[#000065] dark:bg-[#C5A880] shrink-0" />
                              )}
                              {n.referenceCode}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                n.status === 'Denied'
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                  : n.status === 'Approved'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {n.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            For <strong className="text-slate-700 dark:text-slate-200">{n.recipientName}</strong> · By{' '}
                            <strong className="text-slate-700 dark:text-slate-200">{n.actorName}</strong>
                          </p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                            Reason: &ldquo;{n.reason}&rdquo;
                          </p>
                          <p className="text-[10px] text-slate-400 tabular-nums">{n.createdAt}</p>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('approvals');
                        setNotifPopoverOpen(false);
                      }}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      View Approvals
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('cash_requisitions');
                        setNotifPopoverOpen(false);
                      }}
                      className="text-xs font-semibold text-[#000065] dark:text-[#C5A880] hover:underline cursor-pointer"
                    >
                      Open Cash Requisitions →
                    </button>
                  </div>
                </div>
              )}
              </div>
            )}

            <div className="relative flex items-center">
              <Building2 className="w-3.5 h-3.5 text-[#000065] dark:text-[#C5A880] absolute left-3 pointer-events-none" />
              <select
                aria-label="Select active branch"
                value={selectedBranchFilter || 'all'}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="pl-8 pr-7 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#000065] dark:focus:ring-[#C5A880] cursor-pointer max-w-[210px] truncate"
              >
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 pb-24 lg:pb-8 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
