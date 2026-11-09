import React from 'react';
import { useApp, NavigationTab } from '../../context/AppContext';
import { isUserAdmin } from '../../lib/supabase';
import RefreshSessionButton from '../auth/RefreshSessionButton';
import {
  Briefcase,
  CalendarDays,
  Network,
  ShieldCheck,
  FolderOpen,
  BarChart2,
  Building2,
  MapPin,
  Shield,
  LogOut,
  Plus,
  UserCheck,
  X,
  Sliders,
  LayoutDashboard,
  Users,
  Cloud,
  ChevronDown,
  Banknote,
  Landmark,
  Scale,
  Sparkles,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    cases,
    hearings,
    documents,
    branches,
    selectedBranchFilter,
    setSelectedBranchFilter,
    selectedLawyerFilter,
    setSelectedLawyerFilter,
    userPermissions,
    currentUser,
    logout,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    setIsCpanelMigrationModalOpen,
    systemSettings,
  } = useApp();

  // Collapsible navigation state
  const [isBranchesOpen, setIsBranchesOpen] = React.useState<boolean>(false);
  const [isCounselHovered, setIsCounselHovered] = React.useState<boolean>(false);
  const [isCounselClicked, setIsCounselClicked] = React.useState<boolean>(false);

  const isCounselExpanded = isCounselHovered || isCounselClicked;

  const activeHearingsCount = hearings.filter((h) => h.status === 'Scheduled').length;
  const isAdmin = isUserAdmin(currentUser);

  // Group 1: Core Operational Modules
  const operationalNavItems: { id: NavigationTab; label: string; icon: any; count?: number; onClick?: () => void }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'catalogue',
      label: 'Cases',
      icon: Briefcase,
      count: cases.length,
    },
    {
      id: 'catalogue',
      label: 'Clients',
      icon: Users,
      onClick: () => {
        setSelectedBranchFilter('all');
        setActiveTab('catalogue');
      },
    },
    {
      id: 'causelist',
      label: 'Deadlines',
      icon: CalendarDays,
      count: activeHearingsCount > 0 ? activeHearingsCount : undefined,
    },
    {
      id: 'debt_recovery',
      label: 'Debt Recovery',
      icon: Banknote,
    },
    {
      id: 'mortgages',
      label: 'Mortgages',
      icon: Landmark,
    },
  ];

  if (systemSettings.features.enableDocuments) {
    operationalNavItems.push({
      id: 'documents',
      label: 'Pleading Documents',
      icon: FolderOpen,
      count: documents.length,
    });
  }

  const isPartnerOrSuperadmin = Boolean(
    currentUser.isSuperAdmin ||
    isAdmin ||
    currentUser.role === 'partner' ||
    currentUser.role === 'super_admin' ||
    currentUser.role?.toLowerCase().includes('partner') ||
    currentUser.role?.toLowerCase().includes('admin')
  );

  // Group 2: Intelligence & Risk Management
  const intelligenceNavItems: { id: NavigationTab; label: string; icon: any; count?: number; onClick?: () => void }[] = [];
  if (isPartnerOrSuperadmin && systemSettings.features.enableConflicts) {
    intelligenceNavItems.push({
      id: 'conflicts',
      label: 'Conflict Clearance',
      icon: ShieldCheck,
    });
  }

  if (isPartnerOrSuperadmin && systemSettings.features.enableAnalytics) {
    intelligenceNavItems.push({
      id: 'analytics',
      label: 'Firm Analytics',
      icon: BarChart2,
    });
  }

  // Group 3: Administrative & Multi-Circuit Control
  const administrativeNavItems: { id: NavigationTab; label: string; icon: any; count?: number; badge?: string }[] = [];
  if (isAdmin && systemSettings.features.enableBranchSync) {
    administrativeNavItems.push({
      id: 'synchub',
      label: 'Sync Hub & Circuits',
      icon: Network,
      count: branches.length,
    });
  }

  if (userPermissions.canManageRoles || currentUser.isSuperAdmin) {
    administrativeNavItems.push({
      id: 'roles',
      label: 'Access Roles & Staff',
      icon: Shield,
      badge: 'ADMIN',
    });
  }

  if (userPermissions.canManageSettings || currentUser.isSuperAdmin) {
    administrativeNavItems.push({
      id: 'settings',
      label: 'System Settings & Intake',
      icon: Sliders,
    });
  }

  const handleBranchClick = (branchId: string, isMobile = false) => {
    setSelectedBranchFilter(branchId);
    if (activeTab !== 'catalogue') {
      setActiveTab('catalogue');
    }
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleLawyerClick = (lawyerName: string, isMobile = false) => {
    setSelectedLawyerFilter(lawyerName);
    if (activeTab !== 'catalogue') {
      setActiveTab('catalogue');
    }
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const activeLawyers = React.useMemo(() => {
    const map = new Map<string, number>();

    cases.forEach((c) => {
      const counselSet = new Set<string>();

      if (c.leadAdvocate) {
        c.leadAdvocate.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).forEach((l) => counselSet.add(l));
      }
      (c.assistingAdvocates || []).forEach((l) => {
        if (l && l.trim()) counselSet.add(l.trim());
      });
      if (c.person_in_conduct) {
        c.person_in_conduct.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).forEach((l) => counselSet.add(l));
      }
      (c.persons_in_conduct || []).forEach((l) => {
        if (l && l.trim()) counselSet.add(l.trim());
      });

      counselSet.forEach((lawyer) => {
        map.set(lawyer, (map.get(lawyer) || 0) + 1);
      });
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });
  }, [cases]);

  const renderNavButton = (
    item: { id: NavigationTab; label: string; icon: any; count?: number; badge?: string; onClick?: () => void },
    isMobile = false
  ) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id && item.label !== 'Clients';

    return (
      <button
        key={item.label}
        onClick={() => {
          if (item.onClick) {
            item.onClick();
          } else {
            setActiveTab(item.id);
          }
          if (isMobile) setIsMobileMenuOpen(false);
        }}
        className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs font-medium transition-all duration-150 min-h-[38px] group cursor-pointer ${
          isActive
            ? 'bg-slate-900 text-white shadow-xs font-semibold'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive
                ? 'text-white'
                : 'text-slate-400 group-hover:text-slate-700'
            }`}
          />
          <span className="truncate">{item.label}</span>
        </div>

        {item.count !== undefined ? (
          <span
            className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded transition-colors ${
              isActive
                ? 'bg-slate-800 text-slate-200'
                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-700'
            }`}
          >
            {item.count}
          </span>
        ) : item.badge ? (
          <span className="text-[9px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
            {item.badge}
          </span>
        ) : null}
      </button>
    );
  };

  const renderSidebarBody = (isMobile = false) => (
    <div className="flex flex-col flex-1 h-full select-none">
      {/* Brand Header */}
      <div className="px-4 py-4 border-b border-slate-200/80 flex items-center gap-3 bg-white">
        <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center p-1.5 border border-slate-800 shrink-0 shadow-xs">
          <img
            src="/logo.png"
            alt="MK Logo"
            className="w-full h-full object-contain rounded-full"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm text-slate-900 leading-none tracking-tight flex items-center gap-1.5">
            <span>MK Firm</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200/60">
              ERP
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate mt-1">
            Central Case Catalogue
          </p>
        </div>
      </div>

      {/* Scrollable Navigation Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Group 1: Operations */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Operations
          </div>
          {operationalNavItems.map((item) => renderNavButton(item, isMobile))}
        </div>

        {/* Group 2: Intelligence & Risk Management (If Allowed) */}
        {intelligenceNavItems.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Intelligence &amp; Risk
            </div>
            {intelligenceNavItems.map((item) => renderNavButton(item, isMobile))}
          </div>
        )}

        {/* Regional Branches Section (Collapsible) */}
        <div className="pt-1 border-t border-slate-100 space-y-1">
          <button
            type="button"
            onClick={() => setIsBranchesOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase hover:text-slate-900 hover:bg-slate-100/70 rounded-lg transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
              <span className="truncate">Branches ({branches.length})</span>
              {selectedBranchFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" title="Filtered by branch" />
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {userPermissions.canManageBranches && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('roles');
                    if (isMobile) setIsMobileMenuOpen(false);
                  }}
                  title="Add or manage branches in Super Admin Center"
                  className="text-[10px] text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-1 py-0.5 rounded flex items-center gap-0.5 font-sans lowercase mr-0.5 font-semibold"
                >
                  <Plus className="w-2.5 h-2.5" /> add
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                  isBranchesOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {/* Expanded Branches List */}
          {isBranchesOpen && (
            <div className="space-y-0.5 pt-1 pl-1">
              {userPermissions.canViewAllBranches && (
                <button
                  onClick={() => handleBranchClick('all', isMobile)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all min-h-[32px] cursor-pointer ${
                    selectedBranchFilter === 'all'
                      ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200/80 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedBranchFilter === 'all' ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    />
                    <span className="truncate">All Branches</span>
                  </div>
                  <span className="text-[10px] font-mono tabular-nums text-slate-400">{cases.length}</span>
                </button>
              )}

              <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                {branches
                  .filter((branch) => userPermissions.canViewAllBranches || branch.id === currentUser.branchId)
                  .map((branch) => {
                    const isSelected = selectedBranchFilter === branch.id || (!userPermissions.canViewAllBranches && branch.id === currentUser.branchId);
                    return (
                      <button
                        key={branch.id}
                        onClick={() => handleBranchClick(branch.id, isMobile)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all min-h-[32px] cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200/80 shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <MapPin
                            className={`w-3 h-3 shrink-0 ${
                              isSelected ? 'text-blue-600' : 'text-slate-400'
                            }`}
                          />
                          <div className="truncate">
                            <span className="truncate">{branch.city}</span>
                            {branch.isHeadquarters && (
                              <span className="ml-1 text-[9px] font-mono font-bold text-blue-700 bg-blue-100/80 px-1 py-0.2 rounded">HQ</span>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
                          {branch.caseCount ?? 0}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Filter by Counsel Section (Hover / Click Expandable) */}
        <div
          className="pt-1 border-t border-slate-100 space-y-1 transition-all"
          onMouseEnter={() => setIsCounselHovered(true)}
          onMouseLeave={() => {
            setIsCounselHovered(false);
            setIsCounselClicked(false);
          }}
        >
          <button
            type="button"
            onClick={() => setIsCounselClicked((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase hover:text-slate-900 hover:bg-slate-100/70 rounded-lg transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
              <span className="truncate">Litigation Counsel ({activeLawyers.length})</span>
              {selectedLawyerFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" title="Counsel filter active" />
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {selectedLawyerFilter !== 'all' && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLawyerClick('all', isMobile);
                  }}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 lowercase font-sans font-semibold px-1 hover:bg-indigo-50 rounded mr-0.5"
                  title="Clear counsel filter"
                >
                  clear
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                  isCounselExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {isCounselExpanded && (
            <div className="space-y-0.5 pt-1 pl-1">
              <button
                onClick={() => handleLawyerClick('all', isMobile)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all min-h-[32px] cursor-pointer ${
                  selectedLawyerFilter === 'all'
                    ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200/80 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedLawyerFilter === 'all' ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  />
                  <span className="truncate">All Counsel</span>
                </div>
                <span className="text-[10px] font-mono tabular-nums text-slate-400">{cases.length}</span>
              </button>

              <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
                {activeLawyers.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-slate-400 italic">
                    No counsel assigned yet
                  </div>
                ) : (
                  activeLawyers.map((lawyer) => {
                    const isSelected =
                      selectedLawyerFilter.toLowerCase() === lawyer.name.toLowerCase();
                    return (
                      <button
                        key={lawyer.name}
                        onClick={() => handleLawyerClick(lawyer.name, isMobile)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all min-h-[32px] cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200/80 shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                        title={lawyer.name}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <UserCheck
                            className={`w-3 h-3 shrink-0 ${
                              isSelected ? 'text-indigo-600' : 'text-slate-400'
                            }`}
                          />
                          <span className="truncate font-medium">{lawyer.name}</span>
                        </div>

                        <span
                          className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded ${
                            isSelected
                              ? 'bg-indigo-200 text-indigo-900 font-bold'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {lawyer.count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Group 4: Administrative Section (Separated cleanly) */}
        {administrativeNavItems.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Administration &amp; Registry
            </div>
            {administrativeNavItems.map((item) => renderNavButton(item, isMobile))}
          </div>
        )}

        {/* Cloud Deploy (Supabase & Vercel) Shortcut */}
        {isAdmin && (
          <div className="pt-1">
            <button
              onClick={() => {
                if (isMobile) setIsMobileMenuOpen(false);
                setIsCpanelMigrationModalOpen(true);
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 text-emerald-950 hover:from-emerald-100 hover:to-teal-100 transition-all shadow-xs group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                  <Cloud className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-xs text-emerald-950">Supabase &amp; Vercel</div>
                  <div className="text-[10px] text-emerald-700">Deploy &amp; Sync Hub</div>
                </div>
              </div>
              <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">
                Live
              </span>
            </button>
          </div>
        )}
      </div>

      {/* User Session & Security Lockout Card */}
      <div className="p-3 m-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs shadow-2xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Active Session
          </span>
          {currentUser.isSuperAdmin ? (
            <span className="text-[9px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
              Super Admin
            </span>
          ) : (
            <span className="text-[9px] font-mono text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded">
              {currentUser.branchName?.split(' ')[0] || 'Station'}
            </span>
          )}
        </div>

        <div className="font-semibold text-slate-900 truncate text-xs">
          {currentUser.name}
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-0.5">
          {currentUser.roleTitle || currentUser.email}
        </p>

        <div className="mt-2.5 space-y-1.5 pt-2 border-t border-slate-200/80">
          <RefreshSessionButton compact />

          <button
            onClick={() => {
              if (isMobile) setIsMobileMenuOpen(false);
              logout();
            }}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Lock / Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col shrink-0 min-h-screen sticky top-0 h-screen overflow-hidden shadow-2xs z-30">
        {renderSidebarBody(false)}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Slide-in drawer container */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden">
            {/* Drawer Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo.png"
                  alt="MK Advocates"
                  className="w-7 h-7 object-contain rounded-full"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div>
                  <div className="font-bold text-xs text-slate-900 leading-tight">
                    MK Advocates
                  </div>
                  <div className="text-[10px] text-slate-500">Navigation &amp; Circuits</div>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                aria-label="Close navigation drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            {renderSidebarBody(true)}
          </div>
        </div>
      )}
    </>
  );
};
