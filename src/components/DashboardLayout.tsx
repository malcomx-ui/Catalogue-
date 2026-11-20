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
  Plus,
  ChevronDown,
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
}

interface SidebarNavGroup {
  id: string;
  label: string;
  items: SidebarNavItem[];
}

const VIEW_TITLES: Record<NavigationTab, string> = {
  dashboard: 'Executive Workspace',
  catalogue: 'Cases & Matters',
  clients: 'Clients Directory',
  causelist: 'Calendar & Deadlines',
  documents: 'Documents & Custody',
  mortgages: 'Mortgages & Securities',
  debt_recovery: 'Debt Recovery',
  cash_requisitions: 'Cash Requisitions',
  approvals: 'Approvals Queue',
  messenger: 'Team Messenger',
  legal_team: 'Staff & Workflow',
  branches: 'Firm Branches',
  audit_trail: 'Audit Trail & Security',
  synchub: 'Branch Sync Hub',
  conflicts: 'Conflict Checker',
  analytics: 'Litigation Analytics',
  hr: 'HR Management',
  roles: 'Access Roles',
  settings: 'System Settings',
};

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
    hearings,
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
    () => (canAccessRestrictedWorkflow ? decisionNotifications.filter((n) => n.unread).length : 0),
    [decisionNotifications, canAccessRestrictedWorkflow]
  );

  const upcomingHearingAlertsCount = useMemo(
    () => hearings.filter((h) => h.status === 'Scheduled').length,
    [hearings]
  );

  const bellUnreadCount = canAccessRestrictedWorkflow
    ? unreadDecisionCount
    : Math.min(upcomingHearingAlertsCount, 9);

  useEffect(() => {
    if (!notifPopoverOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifPopoverOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifPopoverOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
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

  const activeBranchLabel = useMemo(() => {
    const found = branchOptions.find((b) => b.id === (selectedBranchFilter || 'all'));
    if (found) return found.name;
    return effectiveUser?.branchName || 'Kampala Central (Head Office)';
  }, [branchOptions, selectedBranchFilter, effectiveUser?.branchName]);

  const activeViewTitle = VIEW_TITLES[activeTab] || 'Executive Workspace';

  // Clio Manage Grouped Navigation: PRACTICE | FINANCE & SECURITIES | OPERATIONS & HR
  const navGroups: SidebarNavGroup[] = useMemo(() => {
    const practiceItems: SidebarNavItem[] = [
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
      { id: 'calendar', label: 'Calendar & Deadlines', icon: Calendar, tab: 'causelist' },
      { id: 'documents', label: 'Documents & Custody', icon: FolderLock, tab: 'documents' },
    ];

    const financeItems: SidebarNavItem[] = [
      { id: 'mortgages', label: 'Mortgages', icon: Landmark, tab: 'mortgages' },
    ];

    if (canAccessRestrictedWorkflow) {
      financeItems.push(
        {
          id: 'cash_requisitions',
          label: 'Cash Requisitions',
          icon: Banknote,
          tab: 'cash_requisitions',
          badge: cashRequisitionsBadgeCount > 0 ? cashRequisitionsBadgeCount : undefined,
        },
        {
          id: 'approvals',
          label: 'Approvals',
          icon: ClipboardCheck,
          tab: 'approvals',
          badge: approvalsBadgeCount > 0 ? approvalsBadgeCount : undefined,
        }
      );
    }

    const operationsItems: SidebarNavItem[] = [
      {
        id: 'messenger',
        label: 'Team Messenger',
        icon: MessageSquare,
        tab: 'messenger',
        badge: messengerBadgeCount > 0 ? messengerBadgeCount : undefined,
      },
    ];

    if (canAccessRestrictedWorkflow) {
      operationsItems.push({
        id: 'staff_workflow',
        label: 'Staff & Workflow',
        icon: Users,
        tab: 'legal_team',
      });
    }

    operationsItems.push({
      id: 'branches',
      label: 'Branches',
      icon: Building2,
      tab: 'branches',
    });

    if (canAccessRestrictedWorkflow) {
      operationsItems.push({
        id: 'audit',
        label: 'Audit Trail & Security',
        icon: ShieldCheck,
        tab: 'audit_trail',
      });
    }

    if (isSuperAdmin) {
      operationsItems.push({
        id: 'hr_admin',
        label: 'HR Management',
        icon: UserCog,
        tab: 'hr',
      });
    }

    if (isAdmin) {
      operationsItems.push({
        id: 'settings',
        label: 'System Settings',
        icon: Sliders,
        tab: 'settings',
      });
    }

    return [
      { id: 'practice', label: 'PRACTICE', items: practiceItems },
      { id: 'finance', label: 'FINANCE & SECURITIES', items: financeItems },
      { id: 'operations', label: 'OPERATIONS & HR', items: operationsItems },
    ];
  }, [
    canAccessRestrictedWorkflow,
    isSuperAdmin,
    isAdmin,
    approvalsBadgeCount,
    cashRequisitionsBadgeCount,
    messengerBadgeCount,
    setActiveTab,
    setIsNewCaseModalOpen,
  ]);

  const handleNavClick = (item: SidebarNavItem) => {
    if (item.action) {
      item.action();
    } else if (item.tab) {
      setActiveTab(item.tab);
    }
    setMobileDrawerOpen(false);
  };

  const renderSidebarContent = (compact: boolean) => (
    <div className="flex flex-col h-full bg-[#162238] text-slate-200 select-none">
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            setActiveTab('dashboard');
            setMobileDrawerOpen(false);
          }}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer text-left focus:outline-none"
        >
          <div className="w-9 h-9 rounded-lg bg-white p-1 border border-[#D99B26]/50 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
            {firmLogoSrc ? (
              <img
                src={firmLogoSrc}
                alt="Muhumuza - Kiiza Advocates"
                referrerPolicy="no-referrer"
                onError={() => setLogoErrorStep((s) => s + 1)}
                className="w-full h-full object-contain"
              />
            ) : (
              <Scale className="w-4.5 h-4.5 text-[#162238]" />
            )}
          </div>
          {!compact && (
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-white tracking-tight truncate leading-tight">
                MK Case Catalogue
              </p>
              <p className="text-[11px] text-[#D99B26] font-medium truncate leading-tight mt-0.5">
                Muhumuza - Kiiza Advocates
              </p>
            </div>
          )}
        </button>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {!compact ? (
              <p className="px-5 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400/90">
                {group.label}
              </p>
            ) : (
              <div className="mx-3 mb-2 border-t border-white/10 first:hidden" />
            )}

            <div className="space-y-0.5 px-2.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = Boolean(item.tab && activeTab === item.tab);
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={compact ? item.label : undefined}
                    onClick={() => handleNavClick(item)}
                    className={`relative w-full flex items-center ${
                      compact ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer group ${
                      isActive
                        ? 'bg-white/[0.10] text-white font-semibold'
                        : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {/* Warm Gold Active Left Indicator Bar */}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#D99B26]"
                      />
                    )}

                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-[#D99B26]'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      {!compact && <span className="truncate">{item.label}</span>}
                    </div>

                    {!compact && item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 min-w-[20px] text-center rounded text-[10px] font-bold tabular-nums shrink-0 ${
                          isActive
                            ? 'bg-[#D99B26] text-[#162238]'
                            : 'bg-white/10 text-slate-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Compact Anchored Staff Profile Card */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <div
          className={`flex items-center ${
            compact ? 'justify-center' : 'justify-between gap-2.5'
          } p-2 rounded-xl bg-white/[0.06] border border-white/10`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#D99B26]/20 border border-[#D99B26]/60 text-[#E8C06B] text-xs font-display font-bold flex items-center justify-center shrink-0">
              {getUserInitials(effectiveUser?.name)}
            </div>
            {!compact && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {effectiveUser?.name || 'Firm Staff'}
                </p>
                <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-white/10 transition cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex bg-[#F4F6F9] dark:bg-slate-950 text-[#162238] dark:text-slate-100 font-sans print:bg-white">
      {/* Desktop Fixed / Collapsible Left Sidebar (#162238 Deep Navy, w-64) */}
      <aside
        className={`no-print hidden lg:flex flex-col shrink-0 border-r border-[#162238] sticky top-0 h-screen transition-[width] duration-200 ${
          sidebarCollapsed ? 'w-[74px]' : 'w-64'
        }`}
      >
        {renderSidebarContent(sidebarCollapsed)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#162238]/60 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative z-10 w-64 max-w-[82vw] h-full shadow-2xl">
            {renderSidebarContent(false)}
          </div>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clio-Style Top Header Bar (h-16 bg-white border-b border-[#E2E8F0] px-6) */}
        <header className="no-print sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Left: Toggles + Active View Title & Branch/Staff Context */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-[#F4F6F9] dark:hover:bg-slate-800 cursor-pointer shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="hidden lg:inline-flex p-1.5 -ml-1 rounded-lg text-slate-400 hover:text-[#162238] dark:hover:text-white hover:bg-[#F4F6F9] dark:hover:bg-slate-800 cursor-pointer shrink-0 transition"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <h1 className="font-display text-[15px] sm:text-base font-bold text-[#162238] dark:text-white tracking-tight truncate">
                  {activeViewTitle}
                </h1>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 min-w-0">
                <div className="relative inline-flex items-center max-w-[190px]">
                  <select
                    aria-label="Select active branch"
                    value={selectedBranchFilter || 'all'}
                    onChange={(e) => setSelectedBranchFilter(e.target.value)}
                    className="appearance-none bg-transparent pr-4 font-medium text-slate-600 dark:text-slate-300 hover:text-[#162238] dark:hover:text-white focus:outline-none cursor-pointer truncate max-w-[180px]"
                  >
                    {branchOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none -ml-3.5 shrink-0" />
                </div>
                <span aria-hidden="true" className="hidden sm:inline text-slate-300 dark:text-slate-700">
                  /
                </span>
                <span className="hidden sm:inline truncate text-slate-500 dark:text-slate-400">
                  {effectiveUser?.name || 'Firm Staff'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Search Input, Notification Bell, and Primary + New Matter Button on one baseline */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative hidden sm:block w-44 md:w-56 lg:w-64 xl:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Search matter, suit #, client..."
                className="w-full h-9 pl-9 pr-7 text-xs bg-[#F4F6F9] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg text-[#162238] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#162238] dark:focus:border-[#D99B26] transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#162238] dark:hover:text-white p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Notification Bell with Unread Counter */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifPopoverOpen((o) => !o)}
                aria-label="Notifications"
                title="Notifications"
                className="relative w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#162238] dark:hover:text-white hover:bg-[#F4F6F9] dark:hover:bg-slate-700/80 transition flex items-center justify-center cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {bellUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[#D99B26] text-[#162238] text-[10px] font-bold flex items-center justify-center tabular-nums ring-2 ring-white dark:ring-slate-900">
                    {bellUnreadCount > 9 ? '9+' : bellUnreadCount}
                  </span>
                )}
              </button>

              {notifPopoverOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[90vw] bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-xs font-bold text-[#162238] dark:text-white">
                        {canAccessRestrictedWorkflow ? 'Decision & Workflow Alerts' : 'Court & Matter Alerts'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {canAccessRestrictedWorkflow
                          ? `${unreadDecisionCount} unread notice${unreadDecisionCount === 1 ? '' : 's'}`
                          : `${upcomingHearingAlertsCount} scheduled court appearance${upcomingHearingAlertsCount === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    {canAccessRestrictedWorkflow && unreadDecisionCount > 0 && onMarkAllDecisionNotificationsRead && (
                      <button
                        type="button"
                        onClick={onMarkAllDecisionNotificationsRead}
                        className="text-[11px] font-semibold text-[#162238] dark:text-[#D99B26] hover:underline cursor-pointer shrink-0"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {canAccessRestrictedWorkflow ? (
                    <>
                      <div className="max-h-80 overflow-y-auto divide-y divide-[#E2E8F0]/70 dark:divide-slate-800">
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
                              className={`w-full text-left px-4 py-3 hover:bg-[#F4F6F9] dark:hover:bg-slate-800/60 transition cursor-pointer space-y-1 ${
                                n.unread ? 'bg-[#FBF5E8]/60 dark:bg-[#162238]/40' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-mono font-semibold text-[#162238] dark:text-white inline-flex items-center gap-1.5">
                                  {n.unread && (
                                    <span className="w-2 h-2 rounded-full bg-[#D99B26] shrink-0" />
                                  )}
                                  {n.referenceCode}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
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

                      <div className="px-4 py-2.5 border-t border-[#E2E8F0] dark:border-slate-800 bg-[#F4F6F9] dark:bg-slate-800/40 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('approvals');
                            setNotifPopoverOpen(false);
                          }}
                          className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#162238] dark:hover:text-white cursor-pointer"
                        >
                          View Approvals
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('cash_requisitions');
                            setNotifPopoverOpen(false);
                          }}
                          className="text-xs font-semibold text-[#162238] dark:text-[#D99B26] hover:underline cursor-pointer"
                        >
                          Cash Requisitions →
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="max-h-72 overflow-y-auto divide-y divide-[#E2E8F0]/70 dark:divide-slate-800">
                        {hearings.filter((h) => h.status === 'Scheduled').length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                            No upcoming court notices for {activeBranchLabel}.
                          </div>
                        ) : (
                          hearings
                            .filter((h) => h.status === 'Scheduled')
                            .slice(0, 5)
                            .map((h) => (
                              <button
                                key={h.id}
                                type="button"
                                onClick={() => {
                                  setActiveTab('causelist');
                                  setNotifPopoverOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-[#F4F6F9] dark:hover:bg-slate-800/60 transition cursor-pointer space-y-0.5"
                              >
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <span className="font-mono font-semibold text-[#162238] dark:text-white">
                                    {h.suitNumber}
                                  </span>
                                  <span className="text-[11px] font-medium text-[#D99B26] tabular-nums">
                                    {h.hearingDate}
                                  </span>
                                </div>
                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {h.caseTitle}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {h.hearingPurpose} · {h.courtName}
                                </p>
                              </button>
                            ))
                        )}
                      </div>
                      <div className="px-4 py-2.5 border-t border-[#E2E8F0] dark:border-slate-800 bg-[#F4F6F9] dark:bg-slate-800/40 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('causelist');
                            setNotifPopoverOpen(false);
                          }}
                          className="text-xs font-semibold text-[#162238] dark:text-[#D99B26] hover:underline cursor-pointer"
                        >
                          Open Calendar &amp; Deadlines →
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Primary CTA: + New Matter */}
            <button
              type="button"
              onClick={() => setIsNewCaseModalOpen(true)}
              className="h-9 px-3.5 rounded-lg bg-[#162238] hover:bg-[#1E2F4D] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#D99B26] shrink-0" />
              <span>New Matter</span>
            </button>
          </div>
        </header>

        {/* Main Viewport Canvas (#F4F6F9, max-w-[1440px] mx-auto p-6 space-y-6) */}
        <main className="flex-1 min-w-0 bg-[#F4F6F9] dark:bg-slate-950 print:bg-white">
          <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 space-y-6 pb-24 lg:pb-8 print:p-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
