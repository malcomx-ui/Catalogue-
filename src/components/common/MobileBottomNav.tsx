import React from 'react';
import { useApp, NavigationTab } from '../../context/AppContext';
import { isUserAdmin } from '../../lib/supabase';
import {
  Briefcase,
  CalendarDays,
  FolderOpen,
  Network,
  Menu,
  LayoutDashboard,
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    cases,
    hearings,
    documents,
    branches,
    setIsMobileMenuOpen,
    currentUser,
    userPermissions,
  } = useApp();

  const isAdmin = isUserAdmin(currentUser);
  const scheduledHearingsCount = hearings.filter((h) => h.status === 'Scheduled').length;
  const branchScopedCasesCount = React.useMemo(() => {
    if (userPermissions.canViewAllBranches) return cases.length;
    const targetBranch = branches.find((b) => b.id === currentUser.branchId);
    const targetCity = targetBranch?.city?.toLowerCase() || '';
    const targetName = (targetBranch?.name || currentUser.branchName || '').toLowerCase();
    return cases.filter((c) => {
      const bId = c.branchId;
      const bName = (c.branch || c.branchName || '').toLowerCase();
      return (
        (currentUser.branchId && bId === currentUser.branchId) ||
        (targetCity && bName.includes(targetCity)) ||
        (targetName && bName.includes(targetName))
      );
    }).length;
  }, [cases, branches, currentUser.branchId, currentUser.branchName, userPermissions.canViewAllBranches]);

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 flex items-center justify-around shadow-lg lg:hidden no-print"
    >
      {/* Dashboard Tab */}
      <button
        onClick={() => setActiveTab('dashboard')}
        className={`flex-1 py-1 px-1 flex flex-col items-center justify-center min-h-[44px] rounded-lg transition-colors ${
          activeTab === 'dashboard'
            ? 'text-slate-900 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">Dashboard</span>
      </button>

      {/* Cases Tab */}
      <button
        onClick={() => setActiveTab('catalogue')}
        className={`flex-1 py-1 px-1 flex flex-col items-center justify-center min-h-[44px] rounded-lg transition-colors relative ${
          activeTab === 'catalogue'
            ? 'text-slate-900 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Briefcase className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">Cases</span>
        {branchScopedCasesCount > 0 && (
          <span className="absolute top-1 right-1/4 translate-x-2 text-[9px] font-mono bg-slate-900 text-white rounded-full px-1 min-w-[14px] text-center">
            {branchScopedCasesCount}
          </span>
        )}
      </button>

      {/* Cause List / Diary Tab */}
      <button
        onClick={() => setActiveTab('causelist')}
        className={`flex-1 py-1 px-1 flex flex-col items-center justify-center min-h-[44px] rounded-lg transition-colors relative ${
          activeTab === 'causelist'
            ? 'text-slate-900 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <CalendarDays className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">Diary</span>
        {scheduledHearingsCount > 0 && (
          <span className="absolute top-1 right-1/4 translate-x-2 text-[9px] font-mono bg-blue-600 text-white rounded-full px-1 min-w-[14px] text-center">
            {scheduledHearingsCount}
          </span>
        )}
      </button>

      {/* Pleadings / Documents Tab */}
      <button
        onClick={() => setActiveTab('documents')}
        className={`flex-1 py-1 px-1 flex flex-col items-center justify-center min-h-[44px] rounded-lg transition-colors relative ${
          activeTab === 'documents'
            ? 'text-slate-900 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <FolderOpen className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">Docs</span>
        {documents.length > 0 && (
          <span className="absolute top-1 right-1/4 translate-x-2 text-[9px] font-mono bg-emerald-600 text-white rounded-full px-1 min-w-[14px] text-center">
            {documents.length}
          </span>
        )}
      </button>

      {/* Branch Circuits Tab - Strictly restricted to Super Admins / Admins only */}
      {isAdmin && (
        <button
          onClick={() => setActiveTab('synchub')}
          className={`hidden sm:flex flex-1 py-1 px-1 flex-col items-center justify-center min-h-[44px] rounded-lg transition-colors ${
            activeTab === 'synchub'
              ? 'text-slate-900 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Network className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Circuits</span>
        </button>
      )}

      {/* Full Menu Drawer Trigger */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="flex-1 py-1 px-1 flex flex-col items-center justify-center min-h-[44px] rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
      >
        <Menu className="w-5 h-5 mb-0.5 text-slate-700" />
        <span className="text-[10px] leading-tight font-medium">Menu</span>
      </button>
    </nav>
  );
};
