/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/common/Sidebar';
import { CaseList } from './components/catalogue/CaseList';
import { CaseDetailModal } from './components/catalogue/CaseDetailModal';
import { NewCaseModal } from './components/catalogue/NewCaseModal';
import { CauseListDiary } from './components/causelist/CauseListDiary';
import { BranchSyncHub } from './components/synchub/BranchSyncHub';
import { ConflictChecker } from './components/conflicts/ConflictChecker';
import { DocumentRepository } from './components/documents/DocumentRepository';
import { LitigationAnalytics } from './components/analytics/LitigationAnalytics';
import { AccessRolesManager } from './components/admin/AccessRolesManager';
import { SystemSettingsManager } from './components/admin/SystemSettingsManager';
import { FirmDashboard } from './components/dashboard/FirmDashboard';
import { LoginScreen } from './components/auth/LoginScreen';
import UpdatePasswordPage from './components/auth/UpdatePasswordPage';
import { PrintableCauseSheet } from './components/reports/PrintableCauseSheet';
import { ImportExcelModal } from './components/catalogue/ImportExcelModal';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { CpanelMigrationModal } from './components/common/CpanelMigrationModal';
import { DebtRecoveryPlaceholder } from './components/modules/DebtRecoveryPlaceholder';
import { MortgagesModule } from './components/modules/MortgagesModule';
import { FirstLoginPasswordModal } from './components/auth/FirstLoginPasswordModal';
import { isUserAdmin, supabase } from './lib/supabase';

const MainLayout: React.FC = () => {
  const { activeTab, isAuthenticated, isCpanelMigrationModalOpen, setIsCpanelMigrationModalOpen, currentUser, fetchFreshDataFromSupabase } = useApp();
  const [isFirstLoginModalOpen, setIsFirstLoginModalOpen] = React.useState(false);

  // Main app startup / mount routine
  React.useEffect(() => {
    console.log("Page refreshed. Clearing stale local storage and fetching fresh data...");

    // 1. Clear out old cached case lists
    try {
      localStorage.removeItem('cached_cases');
      localStorage.removeItem('mk_case_catalogue_cases_v2');
    } catch (e) {}

    // 2. Clear IndexedDB local caches
    if (typeof window !== 'undefined' && window.indexedDB) {
      try {
        indexedDB.deleteDatabase('your-app-offline-db');
        indexedDB.deleteDatabase('mk_advocates_offline_db');
      } catch (e) {
        console.warn('IndexedDB clear notice:', e);
      }
    }

    // 3. Force an immediate fetch of live data from Supabase
    fetchFreshDataFromSupabase();
  }, [fetchFreshDataFromSupabase]);

  React.useEffect(() => {
    if (isAuthenticated && currentUser.mustChangePassword) {
      setIsFirstLoginModalOpen(true);
    }
  }, [isAuthenticated, currentUser.mustChangePassword]);

  const [isPasswordRecovery, setIsPasswordRecovery] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const path = window.location.pathname || '';
      const search = window.location.search || '';
      return (
        hash.includes('type=recovery') ||
        path.includes('update-password') ||
        path.includes('reset-password') ||
        search.includes('type=recovery')
      );
    }
    return false;
  });

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const isAdmin = isUserAdmin(currentUser);
  const isPartnerOrSuperadmin = Boolean(
    currentUser?.isSuperAdmin ||
    isAdmin ||
    currentUser?.role === 'partner' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role?.toLowerCase().includes('partner') ||
    currentUser?.role?.toLowerCase().includes('admin')
  );

  // If password recovery link was opened, display the UpdatePasswordPage component
  if (isPasswordRecovery) {
    return (
      <UpdatePasswordPage
        onPasswordUpdated={() => setIsPasswordRecovery(false)}
        onCancel={() => setIsPasswordRecovery(false)}
      />
    );
  }

  // If user is not authenticated, display firm-branded secure portal login screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans-legal">
      {/* Main Body */}
      <div className="flex-1 w-full flex">
        {/* Left Navigation Sidebar with Branch Registries & Roles */}
        <Sidebar />

        {/* Center Content Viewport with mobile bottom bar clearance */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 min-w-0 pb-24 lg:pb-8">
          {activeTab === 'dashboard' && <FirmDashboard />}
          {activeTab === 'catalogue' && <CaseList />}
          {activeTab === 'causelist' && <CauseListDiary />}
          {activeTab === 'debt_recovery' && <DebtRecoveryPlaceholder />}
          {activeTab === 'mortgages' && (
            <div className="w-full h-full min-h-[500px]">
              <MortgagesModule />
            </div>
          )}
          {activeTab === 'synchub' && (isAdmin ? <BranchSyncHub /> : <FirmDashboard />)}
          {activeTab === 'conflicts' && (isPartnerOrSuperadmin ? <ConflictChecker /> : <FirmDashboard />)}
          {activeTab === 'documents' && <DocumentRepository />}
          {activeTab === 'analytics' && (isPartnerOrSuperadmin ? <LitigationAnalytics /> : <FirmDashboard />)}
          {activeTab === 'roles' && (isAdmin ? <AccessRolesManager /> : <FirmDashboard />)}
          {activeTab === 'settings' && (isAdmin ? <SystemSettingsManager /> : <FirmDashboard />)}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (app-like bottom bar on phones/tablets) */}
      <MobileBottomNav />

      {/* Interactive Global Modals */}
      <CaseDetailModal />
      <NewCaseModal />
      <ImportExcelModal />
      <PrintableCauseSheet />
      {isAdmin && (
        <CpanelMigrationModal
          isOpen={isCpanelMigrationModalOpen}
          onClose={() => setIsCpanelMigrationModalOpen(false)}
        />
      )}
      <FirstLoginPasswordModal
        isOpen={isFirstLoginModalOpen}
        onClose={() => setIsFirstLoginModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
