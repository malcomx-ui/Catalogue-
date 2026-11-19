/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import CashRequisitionModule from './components/CashRequisitionModule';
import {
  type ApprovalActionType,
  type CashRequisitionItem,
  type CreateCashRequisitionInput,
  type RequisitionNotification,
  loadLocalRequisitions,
  saveLocalRequisitions,
  loadLocalNotifications,
  saveLocalNotifications,
  buildNewCashRequisition,
  applyRequisitionDecision,
  formatRequisitionMoney,
  fetchCashRequisitionsFromSupabase,
  syncCashRequisitionToSupabase,
} from './lib/cashRequisitionStore';
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
import {
  isSuperAdminUser,
  isPilotTesterUser,
  canAccessRestrictedWorkflowNav,
} from './lib/hrSupabase';
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

  // Shared Approvals, Cash Requisitions, Decision Notifications & Team Messenger state
  const [approvals, setApprovals] = useState<ApprovalWorkflowItem[]>(INITIAL_APPROVAL_ITEMS);
  const [cashRequisitions, setCashRequisitions] = useState<CashRequisitionItem[]>(() =>
    loadLocalRequisitions()
  );
  const [cashNotifications, setCashNotifications] = useState<RequisitionNotification[]>(() =>
    loadLocalNotifications()
  );
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(2);

  useEffect(() => {
    saveLocalRequisitions(cashRequisitions);
  }, [cashRequisitions]);

  useEffect(() => {
    saveLocalNotifications(cashNotifications);
  }, [cashNotifications]);

  // Optional non-blocking sync with shared Supabase client once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    fetchCashRequisitionsFromSupabase().then((remote) => {
      if (active && remote && remote.length > 0) {
        setCashRequisitions((prev) => {
          const seen = new Set(remote.map((r) => r.id));
          const localOnly = prev.filter((p) => !seen.has(p.id));
          return [...remote, ...localOnly];
        });
      }
    });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const pendingCashRequisitionsCount = useMemo(
    () =>
      cashRequisitions.filter(
        (r) => r.stage === 'Pending Review' || r.stage === 'Level 1 Approved'
      ).length,
    [cashRequisitions]
  );

  const generalPendingApprovalsCount = useMemo(
    () => approvals.filter((a) => a.status === 'Pending').length,
    [approvals]
  );

  const pendingApprovalsCount = generalPendingApprovalsCount + pendingCashRequisitionsCount;

  // Unified approval items passed to Staff / Legal Team Member Workspaces
  const unifiedApprovalsForStaff = useMemo<ApprovalWorkflowItem[]>(() => {
    const mappedCash: ApprovalWorkflowItem[] = cashRequisitions.map((req) => {
      const latestLog = req.logs[req.logs.length - 1];
      const mappedStatus: ApprovalWorkflowItem['status'] =
        req.stage === 'Approved'
          ? 'Approved'
          : req.stage === 'Denied'
          ? 'Rejected'
          : 'Pending';
      return {
        id: `cash-${req.id}`,
        code: req.referenceCode,
        title: `${req.purpose} (${req.stage})`,
        category: 'Cash Requisition',
        requester: req.requesterName,
        branch: req.branch,
        submittedAt: req.createdAt,
        amountOrDetail: `${formatRequisitionMoney(req.amount, req.currency)}${
          req.caseRef ? ` · ${req.caseRef}` : ''
        }${latestLog ? ` · Note: ${latestLog.reason}` : ''}`,
        status: mappedStatus,
      };
    });
    return [...mappedCash, ...approvals];
  }, [cashRequisitions, approvals]);

  const handleApprovalDecision = useCallback(
    (id: string, decision: 'Approved' | 'Rejected') => {
      if (id.startsWith('cash-')) {
        setActiveTab('cash_requisitions');
        showCleanMessage(
          'Cash requisitions require a mandatory decision reason — complete Level 1 / Level 2 review in Cash Requisitions.',
          'info'
        );
        return;
      }
      setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status: decision } : a)));
      showCleanMessage(
        `Workflow item marked as ${decision}.`,
        decision === 'Approved' ? 'success' : 'warning'
      );
    },
    [setActiveTab]
  );

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

  const isSuperAdmin = isSuperAdminUser(effectiveUser);
  const canAccessRestrictedWorkflow = canAccessRestrictedWorkflowNav(effectiveUser);
  const effectiveUserName = effectiveUser?.name || 'Managing Partner';
  const effectiveUserRole = effectiveUser?.roleTitle || effectiveUser?.role || 'Senior Approver';
  const effectiveBranchName = effectiveUser?.branchName || 'Kampala Central (Head Office)';
  const isCashApprover = Boolean(
    isSuperAdmin ||
      isPilotTesterUser(effectiveUser) ||
      isPartnerOrSuperadmin ||
      effectiveUser?.role === 'team_lead' ||
      effectiveUser?.role === 'branch_admin' ||
      effectiveUser?.role === 'admin_finance_assistant'
  );

  const handleCreateCashRequisition = useCallback(
    (input: CreateCashRequisitionInput): CashRequisitionItem => {
      const created = buildNewCashRequisition(cashRequisitions, input);
      setCashRequisitions((prev) => [created, ...prev]);
      void syncCashRequisitionToSupabase(created);
      showCleanMessage(
        `Cash requisition ${created.referenceCode} submitted for Level 1 review.`,
        'success'
      );
      return created;
    },
    [cashRequisitions]
  );

  const handleDecideCashRequisition = useCallback(
    (req: CashRequisitionItem, action: ApprovalActionType, reason: string) => {
      const cleanReason = reason.trim();
      if (!cleanReason) return null;
      const result = applyRequisitionDecision(
        req,
        action,
        effectiveUserName,
        effectiveUserRole,
        cleanReason
      );
      setCashRequisitions((prev) =>
        prev.map((item) => (item.id === req.id ? result.updated : item))
      );
      setCashNotifications((prev) => [result.notification, ...prev]);
      void syncCashRequisitionToSupabase(result.updated);
      showCleanMessage(
        `${req.referenceCode} marked as ${action} by ${effectiveUserName}: "${cleanReason}"`,
        action === 'Denied' ? 'warning' : 'success'
      );
      return result;
    },
    [effectiveUserName, effectiveUserRole]
  );

  const handleMarkAllCashNotificationsRead = useCallback(() => {
    setCashNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const handleMarkCashNotificationRead = useCallback((id: string) => {
    setCashNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  }, []);

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
      onOpenApprovals={() => {
        if (canAccessRestrictedWorkflow) setActiveTab('approvals');
      }}
      onOpenDocuments={() => setActiveTab('documents')}
      onOpenCases={() => setActiveTab('catalogue')}
      onOpenWorkload={() => {
        if (canAccessRestrictedWorkflow) setActiveTab('legal_team');
      }}
      onOpenHearings={() => setActiveTab('causelist')}
      onOpenHrModule={() => {
        if (isSuperAdmin) setActiveTab('hr');
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
        cashRequisitionsBadgeCount={pendingCashRequisitionsCount}
        messengerBadgeCount={unreadMessagesCount}
        decisionNotifications={cashNotifications}
        onMarkAllDecisionNotificationsRead={handleMarkAllCashNotificationsRead}
        onMarkDecisionNotificationRead={handleMarkCashNotificationRead}
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
        {activeTab === 'legal_team' &&
          (canAccessRestrictedWorkflow ? (
            <LegalTeamDashboard
              searchQuery={globalSearchQuery}
              approvals={unifiedApprovalsForStaff}
              onDecideApproval={handleApprovalDecision}
            />
          ) : (
            renderStaffDashboard()
          ))}
        {activeTab === 'approvals' &&
          (canAccessRestrictedWorkflow ? (
            <ApprovalsQueueView
              approvals={approvals}
              onDecide={handleApprovalDecision}
              cashRequisitions={cashRequisitions}
              cashNotifications={cashNotifications}
              onCreateCashRequisition={handleCreateCashRequisition}
              onDecideCashRequisition={handleDecideCashRequisition}
              onMarkAllCashNotificationsRead={handleMarkAllCashNotificationsRead}
              onMarkCashNotificationRead={handleMarkCashNotificationRead}
              currentUserName={effectiveUserName}
              currentUserRole={effectiveUserRole}
              activeBranch={effectiveBranchName}
              isApprover={isCashApprover}
              searchQuery={globalSearchQuery}
            />
          ) : (
            renderStaffDashboard()
          ))}
        {activeTab === 'cash_requisitions' &&
          (canAccessRestrictedWorkflow ? (
            <CashRequisitionModule
              currentUserName={effectiveUserName}
              currentUserRole={effectiveUserRole}
              activeBranch={effectiveBranchName}
              isApprover={isCashApprover}
              searchQuery={globalSearchQuery}
              requisitions={cashRequisitions}
              notifications={cashNotifications}
              onCreateRequisition={handleCreateCashRequisition}
              onApplyDecision={handleDecideCashRequisition}
              onMarkAllNotificationsRead={handleMarkAllCashNotificationsRead}
              onMarkNotificationRead={handleMarkCashNotificationRead}
            />
          ) : (
            renderStaffDashboard()
          ))}
        {activeTab === 'messenger' && (
          <TeamMessengerView
            unreadCount={unreadMessagesCount}
            onMarkAllRead={() => setUnreadMessagesCount(0)}
          />
        )}
        {activeTab === 'audit_trail' &&
          (canAccessRestrictedWorkflow ? <AuditTrailSecurityView /> : renderStaffDashboard())}
        {activeTab === 'synchub' && (isAdmin ? <BranchSyncHub /> : renderStaffDashboard())}
        {activeTab === 'conflicts' && (isPartnerOrSuperadmin ? <ConflictChecker /> : renderStaffDashboard())}
        {activeTab === 'documents' && <DocumentRepository />}
        {activeTab === 'analytics' && (isPartnerOrSuperadmin ? <LitigationAnalytics /> : renderStaffDashboard())}
        {activeTab === 'hr' &&
          (isSuperAdmin ? (
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
