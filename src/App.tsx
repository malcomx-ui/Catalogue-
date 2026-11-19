/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { DashboardLayout } from './components/DashboardLayout';
import { StaffDashboard } from './components/StaffDashboard';
import {
  ApprovalsQueueView,
  TeamMessengerView,
  AuditTrailSecurityView,
  INITIAL_APPROVAL_ITEMS,
  ApprovalWorkflowItem,
} from './components/ErpWorkspaceViews';
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
import { LoginScreen } from './components/auth/LoginScreen';
import UpdatePasswordPage from './components/auth/UpdatePasswordPage';
import { PrintableCauseSheet } from './components/reports/PrintableCauseSheet';
import { ImportExcelModal } from './components/catalogue/ImportExcelModal';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { CpanelMigrationModal } from './components/common/CpanelMigrationModal';
import { DebtRecoveryPlaceholder } from './components/modules/DebtRecoveryPlaceholder';
import { MortgagesModule } from './components/modules/MortgagesModule';
import { ClientsDirectory } from './components/litigation/ClientsDirectory';
import { BranchesDirectory } from './components/branches/BranchesDirectory';
import { LegalTeamDashboard } from './components/legal-team/LegalTeamDashboard';
import { FirstLoginPasswordModal } from './components/auth/FirstLoginPasswordModal';
import { NotificationToast } from './components/common/NotificationToast';
import { isUserAdmin, getEffectiveUser, supabase } from './lib/supabase';
import { isSuperAdminUser } from './lib/hrSupabase';
import { LockedHrModule } from './components/LockedHrComponents';
import { showCleanMessage } from './utils/notification';
import './utils/testRls';
import './services/caseService';
import './services/reportService';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isAuthenticated,
    isCpanelMigrationModalOpen,
    setIsCpanelMigrationModalOpen,
    setIsNewCaseModalOpen,
    currentUser,
    fetchFreshDataFromSupabase,
  } = useApp();

  const [isFirstLoginModalOpen, setIsFirstLoginModalOpen] = useState(false);

  // Shared top header search state (live-filters StaffDashboard tasks, hearings, and matters)
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Shared Approvals & Team Messenger badge state
  const [approvals, setApprovals] = useState<ApprovalWorkflowItem[]>(INITIAL_APPROVAL_ITEMS);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(2);

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'Pending').length;

  const handleApprovalDecision = useCallback((id: string, decision: 'Approved' | 'Rejected') => {
    setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status: decision } : a)));
    showCleanMessage(`Workflow item marked as ${decision}.`, decision === 'Approved' ? 'success' : 'warning');
  }, []);

  // Main app startup / mount routine (runs only when authenticated so login mount stays fast)
  React.useEffect(() => {
    if (!isAuthenticated) return;

    try {
      localStorage.removeItem('cached_cases');
      localStorage.removeItem('mk_case_catalogue_cases_v2');
    } catch (e) {}

    if (typeof window !== 'undefined' && window.indexedDB) {
      try {
        indexedDB.deleteDatabase('your-app-offline-db');
        indexedDB.deleteDatabase('mk_advocates_offline_db');
      } catch (e) {
        console.warn('IndexedDB clear notice:', e);
      }
    }

    fetchFreshDataFromSupabase();
  }, [isAuthenticated, fetchFreshDataFromSupabase]);

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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const effectiveUser = getEffectiveUser(currentUser);
  const isAdmin = isUserAdmin(effectiveUser);
  const isPartnerOrSuperadmin = Boolean(
    isAdmin ||
      effectiveUser?.isSuperAdmin ||
      effectiveUser?.role === 'partner' ||
      effectiveUser?.role === 'super_admin' ||
      effectiveUser?.role === 'superadmin' ||
      effectiveUser?.role === 'managing_partner' ||
      effectiveUser?.role?.toLowerCase().includes('partner')
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

  const renderStaffDashboard = () => (
    <StaffDashboard
      currentUser={effectiveUser}
      hideTopHeader={true}
      searchQuery={globalSearchQuery}
      onSearchChange={setGlobalSearchQuery}
      pendingApprovalsCount={pendingApprovalsCount}
      onOpenNewCase={() => setIsNewCaseModalOpen(true)}
      onOpenLitigationForm={() => {
        setActiveTab('catalogue');
        setIsNewCaseModalOpen(true);
      }}
      onOpenApprovals={() => setActiveTab('approvals')}
      onOpenDocuments={() => setActiveTab('documents')}
      onOpenCases={() => setActiveTab('catalogue')}
      onOpenWorkload={() => setActiveTab('legal_team')}
      onOpenHearings={() => setActiveTab('causelist')}
      onOpenHrModule={() => {
        if (isSuperAdminUser(effectiveUser)) setActiveTab('hr');
      }}
    />
  );

  return (
    <>
      <DashboardLayout
        currentUser={effectiveUser}
        searchQuery={globalSearchQuery}
        onSearchChange={setGlobalSearchQuery}
        approvalsBadgeCount={pendingApprovalsCount}
        messengerBadgeCount={unreadMessagesCount}
      >
        {activeTab === 'dashboard' && renderStaffDashboard()}
        {activeTab === 'catalogue' && <CaseList />}
        {activeTab === 'clients' && <ClientsDirectory />}
        {activeTab === 'causelist' && <CauseListDiary />}
        {activeTab === 'debt_recovery' && <DebtRecoveryPlaceholder />}
        {activeTab === 'mortgages' && (
          <div className="w-full min-w-0 h-full min-h-[500px]">
            <MortgagesModule />
          </div>
        )}
        {activeTab === 'branches' && <BranchesDirectory />}
        {activeTab === 'legal_team' && <LegalTeamDashboard searchQuery={globalSearchQuery} />}
        {activeTab === 'approvals' && (
          <ApprovalsQueueView approvals={approvals} onDecide={handleApprovalDecision} />
        )}
        {activeTab === 'messenger' && (
          <TeamMessengerView
            unreadCount={unreadMessagesCount}
            onMarkAllRead={() => setUnreadMessagesCount(0)}
          />
        )}
        {activeTab === 'audit_trail' && <AuditTrailSecurityView />}
        {activeTab === 'synchub' && (isAdmin ? <BranchSyncHub /> : renderStaffDashboard())}
        {activeTab === 'conflicts' && (isPartnerOrSuperadmin ? <ConflictChecker /> : renderStaffDashboard())}
        {activeTab === 'documents' && <DocumentRepository />}
        {activeTab === 'analytics' && (isPartnerOrSuperadmin ? <LitigationAnalytics /> : renderStaffDashboard())}
        {activeTab === 'hr' &&
          (isSuperAdminUser(effectiveUser) ? (
            <LockedHrModule currentUser={effectiveUser} />
          ) : (
            renderStaffDashboard()
          ))}
        {activeTab === 'roles' && (isAdmin ? <AccessRolesManager /> : renderStaffDashboard())}
        {activeTab === 'settings' && (isAdmin ? <SystemSettingsManager /> : renderStaffDashboard())}
      </DashboardLayout>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav />

      {/* Interactive Global Modals & Notifications */}
      <NotificationToast />
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
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
