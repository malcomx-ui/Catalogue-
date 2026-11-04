/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
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
import { PrintableCauseSheet } from './components/reports/PrintableCauseSheet';
import { ImportExcelModal } from './components/catalogue/ImportExcelModal';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { CpanelMigrationModal } from './components/common/CpanelMigrationModal';
import { isUserAdmin } from './lib/supabase';

const MainLayout: React.FC = () => {
  const { activeTab, isAuthenticated, isCpanelMigrationModalOpen, setIsCpanelMigrationModalOpen, currentUser } = useApp();

  const isAdmin = isUserAdmin(currentUser);

  // If user is not authenticated, display firm-branded secure portal login screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans-legal">
      {/* Mobile Top Header (Hidden on Desktop 'lg:hidden' to strictly match m-law-sync-hub.base44.app) */}
      <Header />

      {/* Main Body */}
      <div className="flex-1 w-full flex">
        {/* Left Navigation Sidebar with Branch Registries & Roles */}
        <Sidebar />

        {/* Center Content Viewport with mobile bottom bar clearance */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 min-w-0 pb-24 lg:pb-8">
          {activeTab === 'dashboard' && <FirmDashboard />}
          {activeTab === 'catalogue' && <CaseList />}
          {activeTab === 'causelist' && <CauseListDiary />}
          {activeTab === 'synchub' && (isAdmin ? <BranchSyncHub /> : <FirmDashboard />)}
          {activeTab === 'conflicts' && <ConflictChecker />}
          {activeTab === 'documents' && <DocumentRepository />}
          {activeTab === 'analytics' && <LitigationAnalytics />}
          {activeTab === 'roles' && <AccessRolesManager />}
          {activeTab === 'settings' && <SystemSettingsManager />}
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
