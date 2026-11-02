import React from 'react';
import { useApp, NavigationTab } from '../../context/AppContext';
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

  const activeHearingsCount = hearings.filter((h) => h.status === 'Scheduled').length;

  const navItems: { id: NavigationTab; label: string; icon: any; count?: number; onClick?: () => void }[] = [
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
  ];

  if (systemSettings.features.enableDocuments) {
    navItems.push({
      id: 'documents',
      label: 'Pleading Documents',
      icon: FolderOpen,
      count: documents.length,
    });
  }

  if (systemSettings.features.enableBranchSync) {
    navItems.push({
      id: 'synchub',
      label: 'Sync Hub & Circuits',
      icon: Network,
      count: branches.length,
    });
  }

  if (systemSettings.features.enableConflicts) {
    navItems.push({
      id: 'conflicts',
      label: 'Conflict Clearance',
      icon: ShieldCheck,
    });
  }

  if (systemSettings.features.enableAnalytics) {
    navItems.push({
      id: 'analytics',
      label: 'Firm Analytics',
      icon: BarChart2,
    });
  }

  // If Super Admin, add Access Roles & Staff to navigation
  if (userPermissions.canManageRoles || currentUser.isSuperAdmin) {
    navItems.push({
      id: 'roles',
      label: 'Access Roles & Staff',
      icon: Shield,
    });
  }

  // If Super Admin, add System Settings & Intake
  if (userPermissions.canManageSettings || currentUser.isSuperAdmin) {
    navItems.push({
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

    // Scan all matters for counsel
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

  const renderSidebarBody = (isMobile = false) => (
    <div className="flex flex-col flex-1">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center p-0.5 border border-slate-200 shrink-0 shadow-2xs">
          <img
            src="/logo.png"
            alt="MK Logo"
            className="w-full h-full object-contain rounded-full"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div>
          <div className="font-bold text-sm text-slate-900 leading-tight">MK</div>
          <div className="text-[11px] text-slate-400">Case Catalogue</div>
        </div>
      </div>

      {/* Primary Navigation Section */}
      <div className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id && item.label !== 'Clients';
          const isRolesTab = item.id === 'roles';

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
              className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all min-h-[40px] ${
                isActive
                  ? 'bg-[#0f172a] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : isRolesTab ? 'text-amber-600' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.count !== undefined ? (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.count}
                </span>
              ) : isRolesTab ? (
                <span className="text-[9px] font-bold font-mono px-1 py-0.2 rounded bg-amber-200/70 text-amber-900">
                  ADMIN
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Regional Branches Section */}
      <div className="p-3 pt-1 border-t border-slate-100 space-y-1">
        <div className="flex items-center justify-between px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3 text-slate-400" />
            <span>Branches ({branches.length})</span>
          </div>
          {userPermissions.canManageBranches && (
            <button
              onClick={() => {
                setActiveTab('roles');
                if (isMobile) setIsMobileMenuOpen(false);
              }}
              title="Add or manage branches in Super Admin Center"
              className="text-[10px] text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-1 rounded flex items-center gap-0.5 font-sans lowercase"
            >
              <Plus className="w-2.5 h-2.5" /> add
            </button>
          )}
        </div>

        {/* All Branches Option */}
        <button
          onClick={() => handleBranchClick('all', isMobile)}
          className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-all min-h-[38px] ${
            selectedBranchFilter === 'all'
              ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200/80 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <span
              className={`w-2 h-2 rounded-full ${
                selectedBranchFilter === 'all' ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            />
            <span className="truncate">All Branches</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">{cases.length}</span>
        </button>

        {/* Individual Branches List */}
        <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
          {branches.map((branch) => {
            const isSelected = selectedBranchFilter === branch.id;
            return (
              <button
                key={branch.id}
                onClick={() => handleBranchClick(branch.id, isMobile)}
                className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all min-h-[36px] ${
                  isSelected
                    ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200/80 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
                      <span className="ml-1 text-[9px] text-blue-600 font-medium">HQ</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-slate-400">
                    {branch.caseCount ?? 0}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter by Counsel Section */}
      <div className="p-3 pt-1 border-t border-slate-100 space-y-1">
        <div className="flex items-center justify-between px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3 h-3 text-slate-400" />
            <span>Litigation Counsel</span>
          </div>
          {selectedLawyerFilter !== 'all' && (
            <button
              onClick={() => handleLawyerClick('all', isMobile)}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 lowercase font-sans font-medium"
            >
              clear
            </button>
          )}
        </div>

        {/* All Lawyers Option */}
        <button
          onClick={() => handleLawyerClick('all', isMobile)}
          className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all min-h-[36px] ${
            selectedLawyerFilter === 'all'
              ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200/80 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <span
              className={`w-2 h-2 rounded-full ${
                selectedLawyerFilter === 'all' ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            />
            <span className="truncate">All Counsel</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">{cases.length}</span>
        </button>

        {/* Dynamic Lawyers List from Matched Matters */}
        <div className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
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
                  className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all min-h-[36px] ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200/80 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
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

      {/* Cloud Deploy (Supabase & Vercel) Shortcut */}
      <div className="px-2 pt-2">
        <button
          onClick={() => {
            if (isMobile) setIsMobileMenuOpen(false);
            setIsCpanelMigrationModalOpen(true);
          }}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-900 hover:from-emerald-100 hover:to-teal-100 transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Cloud className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <div className="font-bold text-xs text-emerald-950">Supabase &amp; Vercel</div>
              <div className="text-[10px] text-emerald-700">Deploy &amp; Sync Hub</div>
            </div>
          </div>
          <span className="text-[9px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">
            Live
          </span>
        </button>
      </div>

      {/* User Session & Security Lockout Card */}
      <div className="mt-auto p-3 m-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Active Session
          </span>
          {currentUser.isSuperAdmin ? (
            <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
              Super Admin
            </span>
          ) : (
            <span className="text-[9px] font-mono text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded">
              {currentUser.branchName?.split(' ')[0]}
            </span>
          )}
        </div>

        <div className="font-semibold text-slate-900 truncate text-xs">
          {currentUser.name}
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-0.5">
          {currentUser.roleTitle || currentUser.email}
        </p>

        <button
          onClick={() => {
            if (isMobile) setIsMobileMenuOpen(false);
            logout();
          }}
          className="w-full mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 py-1.5 rounded transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-400" />
          <span>Lock / Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-slate-200 flex-col shrink-0 min-h-screen sticky top-0 h-screen overflow-y-auto">
        {renderSidebarBody(false)}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Slide-in drawer container */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo.png"
                  alt="MK Advocates"
                  className="w-7 h-7 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div>
                  <div className="font-bold text-sm text-slate-900 leading-tight">
                    MK Advocates
                  </div>
                  <div className="text-[10px] text-slate-500">Navigation &amp; Circuits</div>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
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
