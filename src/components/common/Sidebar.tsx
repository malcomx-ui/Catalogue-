import React, { useMemo, useState, useEffect } from 'react';
import { useApp, NavigationTab } from '../../context/AppContext';
import { isUserAdmin, isAdminFinanceAssistant, getEffectiveUser } from '../../lib/supabase';
import { getUserRoleLabel, getUserRoleBadge } from '../../types';
import { buildLegalTeamDirectory } from '../../utils/legalTeam';
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
  X,
  Sliders,
  LayoutDashboard,
  Users,
  Cloud,
  ChevronDown,
  Banknote,
  Landmark,
  Scale,
  Search,
  FileSpreadsheet,
  UserCircle2,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    navigateToRoute,
    mortgageAction,
    triggerMortgageAction,
    selectedStaffKey,
    setSelectedStaffKey,
    cases,
    hearings,
    documents,
    branches,
    availableUsers,
    selectedBranchFilter,
    setSelectedBranchFilter,
    userPermissions,
    currentUser,
    logout,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    setIsCpanelMigrationModalOpen,
    systemSettings,
  } = useApp();

  const effectiveUser = getEffectiveUser(currentUser);
  const isAdmin = isUserAdmin(effectiveUser);
  const canBulkImportMortgages = isAdmin || Boolean(userPermissions.canBulkImport);

  // Collapsible dropdown states (auto-expand when current route is inside that section)
  const [isLitigationOpen, setIsLitigationOpen] = useState<boolean>(
    activeTab === 'catalogue' || activeTab === 'clients' || activeTab === 'causelist'
  );
  const [isMortgagesOpen, setIsMortgagesOpen] = useState<boolean>(activeTab === 'mortgages');
  const [isBranchesOpen, setIsBranchesOpen] = useState<boolean>(activeTab === 'branches');
  const [isLegalTeamOpen, setIsLegalTeamOpen] = useState<boolean>(activeTab === 'legal_team');
  const [teamSearch, setTeamSearch] = useState<string>('');

  useEffect(() => {
    if (activeTab === 'catalogue' || activeTab === 'clients' || activeTab === 'causelist') {
      setIsLitigationOpen(true);
    } else if (activeTab === 'mortgages') {
      setIsMortgagesOpen(true);
    } else if (activeTab === 'branches') {
      setIsBranchesOpen(true);
    } else if (activeTab === 'legal_team') {
      setIsLegalTeamOpen(true);
    }
  }, [activeTab]);

  const activeHearingsCount = hearings.filter((h) => h.status === 'Scheduled').length;

  const branchScopedCases = useMemo(() => {
    if (userPermissions?.canViewAllBranches) return cases;
    const targetBranch = branches.find((b) => b.id === effectiveUser?.branchId);
    const targetCity = targetBranch?.city?.toLowerCase() || '';
    const targetName = (targetBranch?.name || effectiveUser?.branchName || '').toLowerCase();
    return cases.filter((c) => {
      const bId = c.branchId;
      const bName = (c.branch || c.branchName || '').toLowerCase();
      return (
        (effectiveUser?.branchId && bId === effectiveUser?.branchId) ||
        (targetCity && bName.includes(targetCity)) ||
        (targetName && bName.includes(targetName))
      );
    });
  }, [cases, branches, effectiveUser?.branchId, effectiveUser?.branchName, userPermissions?.canViewAllBranches]);

  const legalTeamMembers = useMemo(
    () =>
      buildLegalTeamDirectory({
        availableUsers,
        cases,
        hearings,
        branches,
        canViewAllBranches: Boolean(userPermissions?.canViewAllBranches),
        userBranchId: effectiveUser?.branchId,
        userBranchName: effectiveUser?.branchName,
      }),
    [
      availableUsers,
      cases,
      hearings,
      branches,
      userPermissions?.canViewAllBranches,
      effectiveUser?.branchId,
      effectiveUser?.branchName,
    ]
  );

  const filteredTeamMembers = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return legalTeamMembers;
    return legalTeamMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.roleTitle.toLowerCase().includes(q) ||
        m.branchName.toLowerCase().includes(q)
    );
  }, [legalTeamMembers, teamSearch]);

  const isPartnerOrSuperadmin = Boolean(
    effectiveUser?.isSuperAdmin ||
      isAdmin ||
      effectiveUser?.role === 'partner' ||
      effectiveUser?.role === 'super_admin' ||
      effectiveUser?.role === 'superadmin' ||
      effectiveUser?.role === 'managing_partner' ||
      effectiveUser?.role?.toLowerCase().includes('partner')
  );

  // Secondary modules (Intelligence & Administration)
  const intelligenceNavItems: { id: NavigationTab; label: string; icon: any }[] = [];
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

  const administrativeNavItems: { id: NavigationTab; label: string; icon: any; count?: number; badge?: string }[] = [];
  if (isAdmin && systemSettings.features.enableBranchSync) {
    administrativeNavItems.push({
      id: 'synchub',
      label: 'Sync Hub & Circuits',
      icon: Network,
      count: branches.length,
    });
  }
  if (userPermissions?.canManageRoles || effectiveUser?.isSuperAdmin) {
    administrativeNavItems.push({
      id: 'roles',
      label: 'Access Roles & Staff',
      icon: Shield,
      badge: 'ADMIN',
    });
  }
  if (userPermissions?.canManageSettings || effectiveUser?.isSuperAdmin) {
    administrativeNavItems.push({
      id: 'settings',
      label: 'System Settings & Intake',
      icon: Sliders,
    });
  }

  const closeMobileIfOpen = (isMobile: boolean) => {
    if (isMobile) setIsMobileMenuOpen(false);
  };

  const renderSecondaryNavButton = (
    item: { id: NavigationTab; label: string; icon: any; count?: number; badge?: string },
    isMobile = false
  ) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          setActiveTab(item.id);
          closeMobileIfOpen(isMobile);
        }}
        className={`w-full text-left px-3 py-2 rounded-xl border-l-[3px] flex items-center justify-between text-xs font-medium transition-all duration-150 min-h-[38px] group cursor-pointer ${
          isActive
            ? 'border-l-blue-500 bg-slate-900 text-white font-semibold shadow-xs'
            : 'border-l-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 hover:border-l-slate-300'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 ${
              isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-700'
            }`}
          />
          <span className="truncate">{item.label}</span>
        </div>

        {item.count !== undefined ? (
          <span
            className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full ${
              isActive
                ? 'bg-slate-800 text-slate-200'
                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/80'
            }`}
          >
            {item.count}
          </span>
        ) : item.badge ? (
          <span className="text-[9px] font-bold font-mono tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            {item.badge}
          </span>
        ) : null}
      </button>
    );
  };

  const isLitigationParentActive =
    activeTab === 'catalogue' || activeTab === 'clients' || activeTab === 'causelist';

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
          <p className="text-[11px] text-slate-500 truncate mt-1">Central Case Catalogue</p>
        </div>
      </div>

      {/* Scrollable Navigation Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-1.5">
        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Core Workspace
        </div>

        {/* =============================================================== */}
        {/* 1. DASHBOARD (Top-Level Navigation Item)                        */}
        {/* =============================================================== */}
        <button
          type="button"
          onClick={() => {
            navigateToRoute('dashboard');
            closeMobileIfOpen(isMobile);
          }}
          className={`w-full text-left px-3 py-2 rounded-xl border-l-[3px] flex items-center justify-between text-xs font-medium transition-all duration-150 min-h-[38px] group cursor-pointer ${
            activeTab === 'dashboard'
              ? 'border-l-blue-500 bg-slate-900 text-white font-semibold shadow-xs'
              : 'border-l-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 hover:border-l-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <LayoutDashboard
              className={`w-4 h-4 shrink-0 ${
                activeTab === 'dashboard' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-700'
              }`}
            />
            <span className="truncate">Dashboard</span>
          </div>
        </button>

        {/* =============================================================== */}
        {/* 2. LITIGATION (Collapsible Dropdown: Cases, Clients, Deadlines) */}
        {/* =============================================================== */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => setIsLitigationOpen((prev) => !prev)}
            className={`w-full text-left px-3 py-2 rounded-xl border-l-[3px] flex items-center justify-between text-xs font-medium transition-all duration-150 min-h-[38px] group cursor-pointer ${
              isLitigationParentActive
                ? 'border-l-slate-900 bg-slate-100/90 text-slate-900 font-semibold'
                : 'border-l-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 hover:border-l-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Scale
                className={`w-4 h-4 shrink-0 ${
                  isLitigationParentActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-700'
                }`}
              />
              <span className="truncate">Litigation</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono tabular-nums text-slate-400">
                {branchScopedCases.length}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ease-out ${
                  isLitigationOpen ? 'rotate-180 text-slate-700' : ''
                }`}
              />
            </div>
          </button>

          {isLitigationOpen && (
            <div className="pl-3.5 ml-3 border-l border-slate-200 space-y-0.5 py-0.5">
              {/* Cases (/litigation/cases) */}
              <button
                type="button"
                onClick={() => {
                  navigateToRoute('catalogue');
                  closeMobileIfOpen(isMobile);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg border-l-[3px] flex items-center justify-between text-xs transition-all duration-150 min-h-[34px] cursor-pointer ${
                  activeTab === 'catalogue'
                    ? 'border-l-blue-500 bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'border-l-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Briefcase className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span className="truncate">Cases</span>
                </div>
                <span
                  className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full ${
                    activeTab === 'catalogue'
                      ? 'bg-slate-800 text-slate-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {branchScopedCases.length}
                </span>
              </button>

              {/* Clients (/litigation/clients) */}
              <button
                type="button"
                onClick={() => {
                  navigateToRoute('clients');
                  closeMobileIfOpen(isMobile);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg border-l-[3px] flex items-center justify-between text-xs transition-all duration-150 min-h-[34px] cursor-pointer ${
                  activeTab === 'clients'
                    ? 'border-l-blue-500 bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'border-l-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Users className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span className="truncate">Clients</span>
                </div>
              </button>

              {/* Deadlines (/litigation/deadlines) */}
              <button
                type="button"
                onClick={() => {
                  navigateToRoute('causelist');
                  closeMobileIfOpen(isMobile);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg border-l-[3px] flex items-center justify-between text-xs transition-all duration-150 min-h-[34px] cursor-pointer ${
                  activeTab === 'causelist'
                    ? 'border-l-blue-500 bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'border-l-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span className="truncate">Deadlines</span>
                </div>
                {activeHearingsCount > 0 && (
                  <span
                    className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full ${
                      activeTab === 'causelist'
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {activeHearingsCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* =============================================================== */}
        {/* 3. MORTGAGES (Collapsible Dropdown: Workspace, Add, Import)     */}
        {/* =============================================================== */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => setIsMortgagesOpen((prev) => !prev)}
            className={`w-full text-left px-3 py-2 rounded-xl border-l-[3px] flex items-center justify-between text-xs font-medium transition-all duration-150 min-h-[38px] group cursor-pointer ${
              activeTab === 'mortgages'
                ? 'border-l-slate-900 bg-slate-100/90 text-slate-900 font-semibold'
                : 'border-l-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 hover:border-l-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Landmark
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'mortgages' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-700'
                }`}
              />
              <span className="truncate">Mortgages</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ease-out shrink-0 ${
                isMortgagesOpen ? 'rotate-180 text-slate-700' : ''
              }`}
            />
          </button>

          {isMortgagesOpen && (
            <div className="pl-3.5 ml-3 border-l border-slate-200 space-y-0.5 py-0.5">
              {/* Bank Workspace (/mortgages/bank-workspace) */}
              <button
                type="button"
                onClick={() => {
                  triggerMortgageAction('workspace');
                  closeMobileIfOpen(isMobile);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg border-l-[3px] flex items-center gap-2 text-xs transition-all duration-150 min-h-[34px] cursor-pointer ${
                  activeTab === 'mortgages' && mortgageAction === 'workspace'
                    ? 'border-l-blue-500 bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'border-l-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span className="truncate">Bank Workspace</span>
              </button>

              {/* Add New Mortgage (/mortgages/add) */}
              <button
                type="button"
                onClick={() => {
                  triggerMortgageAction('add');
                  closeMobileIfOpen(isMobile);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg border-l-[3px] flex items-center gap-2 text-xs transition-all duration-150 min-h-[34px] cursor-pointer ${
                  activeTab === 'mortgages' && mortgageAction === 'add'
                    ? 'border-l-blue-500 bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'border-l-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Plus className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span className="truncate">Add New Mortgage</span>
              </button>

              {/* Import Mortgages (/mortgages/import) */}
              {canBulkImportMortgages && (
                <button
                  type="button"
                  onClick={() => {
                    triggerMortgageAction('import');
                    closeMobileIfOpen(isMobile);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg border-l-[3px] flex items-center gap-2 text-xs transition-all duration-150 min-h-[34px] cursor-pointer ${
                    activeTab === 'mortgages' && mortgageAction === 'import'
                      ? 'border-l-blue-500 bg-slate-900 text-white font-semibold shadow-2xs'
                      : 'border-l-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span className="truncate">Import Mortgages</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* =============================================================== */}
        {/* 4. DEBT RECOVERY (Top-Level Navigation Item)                    */}
        {/* =============================================================== */}
        <button
          type="button"
          onClick={() => {
            navigateToRoute('debt_recovery');
            closeMobileIfOpen(isMobile);
          }}
          className={`w-full text-left px-3 py-2 rounded-xl border-l-[3px] flex items-center justify-between text-xs font-medium transition-all duration-150 min-h-[38px] group cursor-pointer ${
            activeTab === 'debt_recovery'
              ? 'border-l-blue-500 bg-slate-900 text-white font-semibold shadow-xs'
              : 'border-l-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 hover:border-l-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Banknote
              className={`w-4 h-4 shrink-0 ${
                activeTab === 'debt_recovery' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-700'
              }`}
            />
            <span className="truncate">Debt Recovery</span>
          </div>
        </button>

        {/* =============================================================== */}
        {/* 5. BRANCHES (Collapsible Dropdown: /branches & Stations)        */}
        {/* =============================================================== */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => setIsBranchesOpen((prev) => !prev)}
            className={`w-full text-left px-3 py-2 rounded-xl border-l-[3px] flex items-center justify-between text-xs font-medium transition-all duration-150 min-h-[38px] group cursor-pointer ${
              activeTab === 'branches'
                ? 'border-l-slate-900 bg-slate-100/90 text-slate-900 font-semibold'
                : 'border-l-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 hover:border-l-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Building2
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'branches' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-700'
                }`}
              />
              <span className="truncate tabular-nums">
                Branches ({userPermissions.canViewAllBranches ? branches.length : 1})
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ease-out shrink-0 ${
                isBranchesOpen ? 'rotate-180 text-slate-700' : ''
              }`}
            />
          </button>

          {isBranchesOpen && (
            <div className="pl-3.5 ml-3 border-l border-slate-200 space-y-0.5 py-0.5">
              {/* Branch Locations / Management Overview (/branches) */}
              <button
                type="button"
                onClick={() => {
                  navigateToRoute('branches');
                  closeMobileIfOpen(isMobile);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg border-l-[3px] flex items-center justify-between text-xs transition-all duration-150 min-h-[32px] cursor-pointer ${
                  activeTab === 'branches'
                    ? 'border-l-blue-500 bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'border-l-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <span className="truncate">Branch Management</span>
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    activeTab === 'branches' ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {userPermissions.canViewAllBranches ? branches.length : 1}
                </span>
              </button>

              {userPermissions.canViewAllBranches && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBranchFilter('all');
                    navigateToRoute('catalogue', { branchId: 'all' });
                    closeMobileIfOpen(isMobile);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg border-l-[3px] flex items-center justify-between text-xs transition-all duration-150 min-h-[30px] cursor-pointer ${
                    activeTab === 'catalogue' && selectedBranchFilter === 'all'
                      ? 'border-l-blue-600 bg-blue-50 text-blue-900 font-semibold'
                      : 'border-l-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate">All Stations</span>
                  <span className="text-[10px] font-mono tabular-nums text-slate-400">{cases.length}</span>
                </button>
              )}

              <div className="space-y-0.5 max-h-44 overflow-y-auto pr-0.5">
                {branches
                  .filter(
                    (branch) =>
                      userPermissions?.canViewAllBranches || branch.id === effectiveUser?.branchId
                  )
                  .map((branch) => {
                    const isSelected =
                      activeTab === 'catalogue' && selectedBranchFilter === branch.id;
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => {
                          setSelectedBranchFilter(branch.id);
                          navigateToRoute('catalogue', { branchId: branch.id });
                          closeMobileIfOpen(isMobile);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg border-l-[3px] flex items-center justify-between text-xs transition-all duration-150 min-h-[30px] cursor-pointer ${
                          isSelected
                            ? 'border-l-blue-600 bg-blue-50 text-blue-900 font-semibold'
                            : 'border-l-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0">
                          <MapPin
                            className={`w-3 h-3 shrink-0 ${
                              isSelected ? 'text-blue-600' : 'text-slate-400'
                            }`}
                          />
                          <span className="truncate">{branch.city}</span>
                          {branch.isHeadquarters && (
                            <span className="text-[9px] font-mono font-bold text-slate-600 bg-slate-100 px-1 rounded">
                              HQ
                            </span>
                          )}
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

        {/* =============================================================== */}
        {/* 6. LEGAL TEAM (Renamed from Litigation Counsel; Staff Dropdown) */}
        {/* =============================================================== */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => setIsLegalTeamOpen((prev) => !prev)}
            className={`w-full text-left px-3 py-2 rounded-xl border-l-[3px] flex items-center justify-between text-xs font-medium transition-all duration-150 min-h-[38px] group cursor-pointer ${
              activeTab === 'legal_team'
                ? 'border-l-slate-900 bg-slate-100/90 text-slate-900 font-semibold'
                : 'border-l-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 hover:border-l-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Users
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'legal_team' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-700'
                }`}
              />
              <span className="truncate">Legal Team</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono tabular-nums text-slate-400">
                {legalTeamMembers.length}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ease-out ${
                  isLegalTeamOpen ? 'rotate-180 text-slate-700' : ''
                }`}
              />
            </div>
          </button>

          {isLegalTeamOpen && (
            <div className="pl-3.5 ml-3 border-l border-slate-200 space-y-1.5 py-1">
              {/* Directory Link */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStaffKey(null);
                  closeMobileIfOpen(isMobile);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg border-l-[3px] flex items-center justify-between text-xs transition-all duration-150 min-h-[32px] cursor-pointer ${
                  activeTab === 'legal_team' && !selectedStaffKey
                    ? 'border-l-blue-500 bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'border-l-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <span className="truncate">Team Directory</span>
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    activeTab === 'legal_team' && !selectedStaffKey ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {legalTeamMembers.length}
                </span>
              </button>

              {/* Inline Search inside Legal Team Dropdown */}
              <div className="relative pr-0.5">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Find staff member..."
                  className="w-full pl-7 pr-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Staff Member List -> Opens Individual Staff Dashboard */}
              <div className="space-y-0.5 max-h-52 overflow-y-auto pr-0.5">
                {filteredTeamMembers.length === 0 ? (
                  <div className="px-2.5 py-2 text-[11px] text-slate-400 italic">
                    No matching staff
                  </div>
                ) : (
                  filteredTeamMembers.map((member) => {
                    const isMemberSelected =
                      activeTab === 'legal_team' &&
                      selectedStaffKey?.toLowerCase() === member.key.toLowerCase();
                    return (
                      <button
                        key={member.key}
                        type="button"
                        onClick={() => {
                          setSelectedStaffKey(member.key);
                          closeMobileIfOpen(isMobile);
                        }}
                        title={`${member.name} — ${member.roleTitle}`}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg border-l-[3px] flex items-center justify-between text-xs transition-all duration-150 min-h-[32px] cursor-pointer ${
                          isMemberSelected
                            ? 'border-l-blue-500 bg-slate-900 text-white font-semibold shadow-2xs'
                            : 'border-l-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <UserCircle2
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isMemberSelected ? 'text-blue-400' : 'text-slate-400'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-[11.5px] leading-tight">
                              {member.name}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full shrink-0 ${
                            isMemberSelected
                              ? 'bg-slate-800 text-slate-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {member.activeCasesCount}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* =============================================================== */}
        {/* SECONDARY SECTIONS (Documents, Intelligence, Administration)    */}
        {/* =============================================================== */}
        {systemSettings.features.enableDocuments && (
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 space-y-1">
            <div className="px-3 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Registry Files
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('documents');
                closeMobileIfOpen(isMobile);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl border-l-[3px] flex items-center justify-between text-xs font-medium transition-all duration-150 min-h-[38px] group cursor-pointer ${
                activeTab === 'documents'
                  ? 'border-l-blue-500 bg-slate-900 text-white font-semibold shadow-xs'
                  : 'border-l-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 hover:border-l-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FolderOpen
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'documents' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                />
                <span className="truncate">Pleading Documents</span>
              </div>
              <span
                className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full ${
                  activeTab === 'documents' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {documents.length}
              </span>
            </button>
          </div>
        )}

        {intelligenceNavItems.length > 0 && (
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 space-y-1">
            <div className="px-3 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Intelligence &amp; Risk
            </div>
            {intelligenceNavItems.map((item) => renderSecondaryNavButton(item, isMobile))}
          </div>
        )}

        {administrativeNavItems.length > 0 && (
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 space-y-1">
            <div className="px-3 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Administration &amp; Registry
            </div>
            {administrativeNavItems.map((item) => renderSecondaryNavButton(item, isMobile))}
          </div>
        )}

        {isAdmin && (
          <div className="pt-2.5">
            <button
              type="button"
              onClick={() => {
                closeMobileIfOpen(isMobile);
                setIsCpanelMigrationModalOpen(true);
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 hover:bg-emerald-100/80 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-700 text-white flex items-center justify-center">
                  <Cloud className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-xs text-emerald-950">Supabase &amp; Vercel</div>
                  <div className="text-[10px] text-emerald-700">Deploy &amp; Sync Hub</div>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                Live
              </span>
            </button>
          </div>
        )}
      </div>

      {/* User Session & Security Lockout Card */}
      <div className="p-3.5 m-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs shadow-2xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Active Session
          </span>
          {isAdmin ? (
            <span className="text-[9px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
              {effectiveUser?.isSuperAdmin ? 'Super Admin' : 'Admin'}
            </span>
          ) : isAdminFinanceAssistant(effectiveUser) ? (
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${getUserRoleBadge(
                'admin_finance_assistant'
              )}`}
            >
              Finance Asst
            </span>
          ) : (
            <span className="text-[9px] font-mono text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded">
              {effectiveUser?.branchName?.split(' ')[0] || 'Station'}
            </span>
          )}
        </div>

        <div className="font-semibold text-slate-900 truncate text-xs">
          {effectiveUser?.name || currentUser?.name || 'Legal Counsel'}
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-0.5">
          {effectiveUser?.roleTitle ||
            getUserRoleLabel(effectiveUser?.roleId || effectiveUser?.role) ||
            effectiveUser?.email}
        </p>

        <div className="mt-2.5 space-y-1.5 pt-2 border-t border-slate-200/80">
          <RefreshSessionButton compact />

          <button
            type="button"
            onClick={() => {
              closeMobileIfOpen(isMobile);
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
      <aside className="no-print hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col shrink-0 min-h-screen sticky top-0 h-screen overflow-hidden z-30">
        {renderSidebarBody(false)}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden">
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
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                aria-label="Close navigation drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderSidebarBody(true)}
          </div>
        </div>
      )}
    </>
  );
};
