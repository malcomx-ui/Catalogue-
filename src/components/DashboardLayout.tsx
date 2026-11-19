import React, { useState, useMemo } from 'react';
import { useApp, NavigationTab } from '../context/AppContext';
import { getEffectiveUser, isUserAdmin } from '../lib/supabase';
import { isSuperAdminUser } from '../lib/hrSupabase';
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
} from 'lucide-react';

export interface DashboardLayoutProps {
  currentUser?: any;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  approvalsBadgeCount?: number;
  cashRequisitionsBadgeCount?: number;
  messengerBadgeCount?: number;
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [logoErrorStep, setLogoErrorStep] = useState(0);

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

  const primaryNavItems: SidebarNavItem[] = useMemo(
    () => [
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
      },
      {
        id: 'messenger',
        label: 'Team Messenger',
        icon: MessageSquare,
        tab: 'messenger',
        badge: messengerBadgeCount > 0 ? messengerBadgeCount : undefined,
      },
      { id: 'mortgages', label: 'Mortgages', icon: Landmark, tab: 'mortgages' },
      { id: 'staff_workflow', label: 'Staff & Workflow', icon: Users, tab: 'legal_team' },
      { id: 'calendar', label: 'Calendar & Deadlines', icon: Calendar, tab: 'causelist' },
      { id: 'branches', label: 'Branches', icon: Building2, tab: 'branches' },
      { id: 'audit', label: 'Audit Trail & Security', icon: ShieldCheck, tab: 'audit_trail' },
    ],
    [
      approvalsBadgeCount,
      cashRequisitionsBadgeCount,
      messengerBadgeCount,
      setActiveTab,
      setIsNewCaseModalOpen,
    ]
  );

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
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
            {firmLogoSrc ? (
              <img
                src={firmLogoSrc}
                alt="Muhumuza - Kiiza Advocates Firm Logo"
                referrerPolicy="no-referrer"
                onError={() => setLogoErrorStep((s) => s + 1)}
                className="w-full h-full object-contain"
              />
            ) : (
              <Scale className="w-5 h-5 text-blue-600" />
            )}
          </div>
          {!compact && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
                MK Case Catalogue
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
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
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                  }`}
                />
                {!compact && <span className="truncate">{item.label}</span>}
              </div>

              {!compact && item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
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
              <p className="px-3 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
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
                      ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-blue-300'
                          : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
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
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
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
                className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
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

          {/* Right: Branch selector dropdown */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="relative flex items-center">
              <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
              <select
                aria-label="Select active branch"
                value={selectedBranchFilter || 'all'}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="pl-8 pr-7 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer max-w-[210px] truncate"
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
