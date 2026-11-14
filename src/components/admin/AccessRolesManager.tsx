import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { isUserAdmin, resolveUserRoleMeta } from '../../lib/supabase';
import {
  Shield,
  ShieldCheck,
  Users,
  Building2,
  Lock,
  History,
  Plus,
  Trash2,
  Edit2,
  Check,
  Download,
  RefreshCw,
  FileText,
  Search,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Code,
  Eye,
  Key,
  X,
  Copy,
  Ban,
} from 'lucide-react';
import { CustomRole, RolePermissions, User, Branch, AuditLog, getUserRoleLabel, getUserRoleBadge } from '../../types';
import { StaffWelcomeModal } from './StaffWelcomeModal';
import { EditStaffModal } from './EditStaffModal';

export const AccessRolesManager: React.FC = () => {
  const {
    currentUser,
    roles,
    availableUsers,
    branches,
    addCustomRole,
    deleteCustomRole,
    addUser,
    updateUser,
    toggleSuspendUser,
    deleteUser,
    addBranch,
    deleteBranch,
    userPermissions,
    auditLogs = [],
    refreshAuditLogs,
    refreshStaffFromSupabase,
    setActiveTab,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles' | 'branches' | 'rls' | 'audit'>('users');
  const [copiedSql, setCopiedSql] = useState(false);
  const [isRefreshingStaff, setIsRefreshingStaff] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Audit Logs Filter State
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<'ALL' | 'INSERT' | 'UPDATE' | 'DELETE'>('ALL');
  const [auditBranchFilter, setAuditBranchFilter] = useState<string>('ALL');
  const [inspectLog, setInspectLog] = useState<AuditLog | null>(null);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  // New Custom Role Form State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDesc, setRoleFormDesc] = useState('');
  const [roleFormColor, setRoleFormColor] = useState('bg-blue-100 text-blue-800 border-blue-200');
  const [roleFormPerms, setRoleFormPerms] = useState<RolePermissions>({
    canViewAllBranches: false,
    canCreateCases: true,
    canEditCases: true,
    canDeleteCases: false,
    canBulkImport: false,
    canBulkExport: false,
    canPrintCauseList: false,
    canScheduleHearings: true,
    canRecordOutcomes: true,
    canLogFileMovement: true,
    canManageDocuments: true,
    canViewFinancials: false,
    canManageRoles: false,
    canManageUsers: false,
    canManageBranches: false,
  });

  // New User Form State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('MK@Law2026');
  const [userRoleId, setUserRoleId] = useState(
    roles.find((r) => r.id === 'role-advocate')?.id || 'role-advocate'
  );
  const [userBranchId, setUserBranchId] = useState(branches[0]?.id || 'kla-hq');
  const [userRollNo, setUserRollNo] = useState('');
  const [userError, setUserError] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // New Branch Form State
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('+256 414 ');
  const [branchTeamLead, setBranchTeamLead] = useState('');

  // Suspend / Delete Confirmation Modals State
  const [suspendTargetUser, setSuspendTargetUser] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState('Administrative hold applied by Managing Partner.');
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);

  // Staff Welcome & Edit Modals State
  const [welcomeUser, setWelcomeUser] = useState<User | null>(null);
  const [editTargetUser, setEditTargetUser] = useState<User | null>(null);

  const isSuperAdmin = isUserAdmin(currentUser) || userPermissions.canManageRoles;

  if (!isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl text-center shadow-xs">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">Super Admin Access Required</h2>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Access Roles, Staff Provisioning, and Security Governance are strictly reserved for the Managing Partner / Super Admin. Branch Administrators manage operations within their assigned branch only.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const showToast = (type: 'success' | 'warning' | 'error', message: string) => {
    setStatusBanner({ type, message });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.message === message ? null : prev));
    }, 5500);
  };

  const handleInlineRoleChange = async (user: User, newRoleId: string) => {
    if (updatingUserId) return;
    setUpdatingUserId(user.id);
    try {
      const selectedRole = roles.find((r) => r.id === newRoleId);
      const res = await updateUser(user.id, {
        roleId: newRoleId,
        role: newRoleId as any,
        roleTitle: selectedRole?.name,
        isSuperAdmin: Boolean(selectedRole?.isSuperAdmin),
        isBranchAdmin: newRoleId === 'role-admin',
      });
      if (res.success) {
        if (res.warning) {
          showToast('warning', `${user.name} set to ${selectedRole?.name || newRoleId}. ${res.warning}`);
        } else {
          showToast('success', `${user.name} updated to ${selectedRole?.name || newRoleId}.`);
        }
      } else {
        showToast('error', res.error || 'Could not update role.');
      }
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleInlineBranchChange = async (user: User, newBranchId: string) => {
    if (updatingUserId) return;
    setUpdatingUserId(user.id);
    try {
      const selectedBranch = branches.find((b) => b.id === newBranchId);
      const res = await updateUser(user.id, {
        branchId: newBranchId,
        branchName: selectedBranch?.name,
      });
      if (res.success) {
        showToast('success', `${user.name} reassigned to ${selectedBranch?.name || newBranchId}.`);
      } else {
        showToast('error', res.error || 'Could not update branch station.');
      }
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormName.trim()) return;

    addCustomRole({
      name: roleFormName.trim(),
      description: roleFormDesc.trim() || 'Custom firm access tier created by Super Admin.',
      badgeColor: roleFormColor,
      isSuperAdmin: false,
      permissions: {
        ...roleFormPerms,
        canBulkImport: false,
        canBulkExport: false,
        canManageRoles: false,
        canManageUsers: false,
        canManageBranches: false,
      },
    });

    setIsRoleModalOpen(false);
    setRoleFormName('');
    setRoleFormDesc('');
    showToast('success', `Custom role "${roleFormName.trim()}" created.`);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingUser) return;
    setUserError(null);
    if (!userPassword.trim() || userPassword.trim().length < 6) {
      setUserError('Initial password must be at least 6 characters long.');
      return;
    }

    setIsSubmittingUser(true);
    try {
      const result = await addUser({
        name: userName.trim(),
        email: userEmail.trim(),
        password: userPassword.trim(),
        roleId: userRoleId,
        branchId: userBranchId,
        advocateRollNo: userRollNo.trim() || undefined,
      });

      if (result.success) {
        setIsUserModalOpen(false);
        setUserName('');
        setUserEmail('');
        setUserRollNo('');
        setUserPassword('MK@Law2026');
        showToast('success', `Staff account created for ${result.user?.name || userEmail}. They can now log in immediately.`);
        if (result.user) {
          setWelcomeUser(result.user);
        }
      } else {
        setUserError(result.error || 'Failed to create staff account in database.');
      }
    } catch (err: any) {
      setUserError(err?.message || 'An unexpected error occurred while creating staff member.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchCity.trim()) return;

    addBranch({
      name: branchName.trim() || `${branchCity.trim()} Regional Office`,
      city: branchCity.trim(),
      address: branchAddress.trim() || `Plot 10 Court Road, ${branchCity.trim()}`,
      phone: branchPhone.trim() || '+256 414 000 000',
      teamLead: branchTeamLead.trim() || `${branchCity.trim()} Lead Advocate`,
      lawyersCount: 3,
    });

    setIsBranchModalOpen(false);
    setBranchName('');
    setBranchCity('');
    setBranchAddress('');
    setBranchTeamLead('');
    showToast('success', `Branch station provisioned successfully.`);
  };

  const handleConfirmSuspend = async () => {
    if (!suspendTargetUser) return;
    await toggleSuspendUser(suspendTargetUser.id, suspendReason);
    showToast('success', `${suspendTargetUser.name} access hold updated.`);
    setSuspendTargetUser(null);
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteTargetUser) return;
    const target = deleteTargetUser;
    setDeleteTargetUser(null);
    const ok = await deleteUser(target.id);
    if (ok) {
      showToast('success', `${target.name} removed from active directory.`);
    } else {
      showToast('error', `Could not delete ${target.name}.`);
    }
  };

  const handleRefreshAuditLogs = async () => {
    setIsRefreshingLogs(true);
    try {
      await refreshAuditLogs();
    } finally {
      setIsRefreshingLogs(false);
    }
  };

  const exportAuditLogsToCsv = () => {
    if (!auditLogs || auditLogs.length === 0) return;
    const headers = ['ID', 'Timestamp (UTC)', 'Action', 'MK Case No.', 'Case ID', 'User Email', 'User Role', 'Branch', 'Changes'];
    const rows = auditLogs.map((log) => [
      log.id,
      log.created_at,
      log.action,
      log.case_number || '',
      log.case_id || '',
      log.user_email || '',
      log.user_role || '',
      log.branch || '',
      JSON.stringify(log.changes || {}).replace(/"/g, '""'),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((f) => `"${f}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `firm_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditActionFilter !== 'ALL' && log.action !== auditActionFilter) return false;
    if (auditBranchFilter !== 'ALL' && log.branch !== auditBranchFilter) return false;
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      return (
        log.case_number?.toLowerCase().includes(q) ||
        log.user_email?.toLowerCase().includes(q) ||
        log.branch?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const auditStats = {
    total: auditLogs.length,
    inserts: auditLogs.filter((l) => l.action === 'INSERT').length,
    updates: auditLogs.filter((l) => l.action === 'UPDATE').length,
    deletes: auditLogs.filter((l) => l.action === 'DELETE').length,
  };

  const rlsSqlSnippet = `-- Branch Administrator Strict Isolation & Super Admin Governance Policy
CREATE OR REPLACE FUNCTION public.is_partner_or_superadmin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_email TEXT;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN TRUE; END IF;
  v_email := LOWER(COALESCE(auth.jwt()->>'email', ''));
  IF v_email = 'infosightug@gmail.com' THEN RETURN TRUE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (id::text = auth.uid()::text OR (v_email <> '' AND LOWER(email) = v_email))
      AND (is_super_admin IS TRUE OR LOWER(COALESCE(role, '')) IN ('partner', 'super_admin', 'superadmin', 'managing_partner'))
  );
END;
$$;`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Super Admin Center Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Super Admin Security &amp; Access Roles Center</h1>
                <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full uppercase">
                  Sole Super Admin Authority
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Provision staff credentials, assign access roles and regional stations, restrict Branch Administrators to their local branch, and audit system security.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Directory ({availableUsers.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('roles')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'roles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Access Roles ({roles.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('branches')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'branches' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Branches ({branches.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('rls')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'rls' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Supabase RLS</span>
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {statusBanner && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusBanner.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : statusBanner.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: STAFF DIRECTORY & SECURITY */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Firm Staff Accounts &amp; Access Control</h2>
              <p className="text-xs text-slate-500">
                Create staff accounts with login credentials, reassign roles or regional stations directly, and manage account status.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isRefreshingStaff}
                onClick={async () => {
                  setIsRefreshingStaff(true);
                  try {
                    await refreshStaffFromSupabase();
                    showToast('success', 'Synchronized staff profiles from database.');
                  } finally {
                    setTimeout(() => setIsRefreshingStaff(false), 300);
                  }
                }}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStaff ? 'animate-spin text-blue-600' : ''}`} />
                <span>Sync Profiles</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserError(null);
                  setIsUserModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Staff User</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Staff Name &amp; Contact</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Branch Station</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {availableUsers.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    const isPrimaryOwner = user.email.toLowerCase() === 'infosightug@gmail.com';
                    const isRowUpdating = updatingUserId === user.id;
                    const normalizedMeta = resolveUserRoleMeta(
                      user.role,
                      user.roleId,
                      user.isSuperAdmin,
                      user.email
                    );
                    const resolvedRoleValue =
                      user.roleId?.startsWith('role-custom-') && roles.some((r) => r.id === user.roleId)
                        ? user.roleId
                        : roles.some((r) => r.id === normalizedMeta.roleId)
                        ? normalizedMeta.roleId
                        : roles.some((r) => r.id === user.roleId)
                        ? user.roleId!
                        : 'role-advocate';
                    const resolvedBranchValue =
                      branches.some((b) => b.id === user.branchId)
                        ? user.branchId
                        : branches[0]?.id || 'kla-hq';

                    return (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                            <span>{user.name}</span>
                            {isRowUpdating && <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />}
                          </div>
                          <div className="text-[11px] text-slate-500">{user.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <select
                              disabled={isPrimaryOwner || isSelf || isRowUpdating}
                              value={resolvedRoleValue}
                              onChange={(e) => handleInlineRoleChange(user, e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium disabled:opacity-60 focus:outline-none focus:border-slate-900"
                            >
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                            <div>
                              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${getUserRoleBadge(resolvedRoleValue)}`}>
                                {getUserRoleLabel(resolvedRoleValue)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            disabled={isRowUpdating}
                            value={resolvedBranchValue}
                            onChange={(e) => handleInlineBranchChange(user, e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium disabled:opacity-60 focus:outline-none focus:border-slate-900"
                          >
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          {user.isSuspended ? (
                            <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-[11px] font-bold">Suspended</span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px] font-medium">Active</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setWelcomeUser(user)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"
                              title="View Login Credentials & Welcome Package"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditTargetUser(user)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                              title="Edit Account, Password, Role & Branch"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isPrimaryOwner && !isSelf && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (user.isSuspended) {
                                      toggleSuspendUser(user.id);
                                      showToast('success', `${user.name} reactivated.`);
                                    } else {
                                      setSuspendTargetUser(user);
                                    }
                                  }}
                                  className={`p-1.5 rounded-lg ${
                                    user.isSuspended
                                      ? 'text-emerald-600 hover:bg-emerald-50'
                                      : 'text-amber-600 hover:bg-amber-50'
                                  }`}
                                  title={user.isSuspended ? 'Reactivate User' : 'Suspend User'}
                                >
                                  {user.isSuspended ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTargetUser(user)}
                                  className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACCESS ROLES */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Firm Access Roles &amp; Permission Tiers</h2>
              <p className="text-xs text-slate-500">
                Branch Administrators are strictly isolated to their own branch and cannot access firm-wide analytics, roles, or system configuration.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Role</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((role) => {
              const assignedCount = availableUsers.filter((u) => {
                const effectiveRoleId =
                  u.roleId?.startsWith('role-custom-') && roles.some((r) => r.id === u.roleId)
                    ? u.roleId
                    : resolveUserRoleMeta(u.role, u.roleId, u.isSuperAdmin, u.email).roleId;
                return effectiveRoleId === role.id;
              }).length;
              return (
                <div key={role.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${role.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {role.isSuperAdmin ? 'SUPER ADMIN' : role.isSystem ? 'SYSTEM ROLE' : 'CUSTOM ROLE'}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-1.5">{role.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {assignedCount} staff
                        </span>
                        {!role.isSystem && !role.isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => deleteCustomRole(role.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                            title="Delete Custom Role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{role.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 text-[10px]">
                    <span className={`px-2 py-0.5 rounded font-medium ${role.permissions.canViewAllBranches ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                      {role.permissions.canViewAllBranches ? 'All Branches' : 'Own Branch Only'}
                    </span>
                    {role.permissions.canCreateCases && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">Create Cases</span>}
                    {role.permissions.canEditCases && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">Edit Cases</span>}
                    {role.permissions.canDeleteCases && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">Delete Cases</span>}
                    {role.permissions.canManageUsers && <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">Manage Users &amp; Roles</span>}
                    {role.permissions.canManageSettings && <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">System Settings</span>}
                    {role.permissions.canBulkImport && <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">Bulk Import/Export</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: BRANCHES */}
      {activeSubTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Regional Branch Registry</h2>
              <p className="text-xs text-slate-500">Managing {branches.length} active regional circuit offices across Uganda.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsBranchModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Branch Office</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((branch) => {
              const staffCount = availableUsers.filter((u) => u.branchId === branch.id).length;
              return (
                <div key={branch.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                        <h3 className="text-sm font-bold text-slate-900">{branch.name}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{branch.address}</p>
                    </div>
                    {!branch.isHeadquarters ? (
                      <button
                        type="button"
                        onClick={() => deleteBranch(branch.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        title="Remove Branch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">HQ</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                    <span>{staffCount} assigned staff</span>
                    <span className="font-mono font-semibold">{branch.caseCount || 0} matters</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SUPABASE RLS */}
      {activeSubTab === 'rls' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Supabase Row Level Security (RLS)</h2>
              <p className="text-xs text-slate-500">
                Branch Administrators are strictly scoped to rows matching their assigned <code className="bg-slate-100 px-1 rounded">branch_id</code>. Only Managing Partners / Super Admins have cross-branch privileges.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(rlsSqlSnippet);
                setCopiedSql(true);
                setTimeout(() => setCopiedSql(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shrink-0"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copied SQL' : 'Copy Isolation SQL'}</span>
            </button>
          </div>
          <pre className="bg-slate-950 text-slate-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed">
            {rlsSqlSnippet}
          </pre>
        </div>
      )}

      {/* TAB 5: AUDIT TRAIL */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-400">Total Logged Events</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{auditStats.total}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-emerald-600">Inserts</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">{auditStats.inserts}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-blue-600">Updates</div>
              <div className="text-xl font-bold text-blue-700 mt-1">{auditStats.updates}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-rose-600">Deletes</div>
              <div className="text-xl font-bold text-rose-700 mt-1">{auditStats.deletes}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search suit no, user email, branch..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value as any)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50"
              >
                <option value="ALL">All Actions</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
              <select
                value={auditBranchFilter}
                onChange={(e) => setAuditBranchFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshAuditLogs}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={exportAuditLogsToCsv}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Matter No.</th>
                    <th className="py-2.5 px-4">Actor</th>
                    <th className="py-2.5 px-4">Branch</th>
                    <th className="py-2.5 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">No audit events match current filters.</td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="py-2.5 px-4 font-bold">{log.action}</td>
                        <td className="py-2.5 px-4 font-mono">{log.case_number || log.case_id || '—'}</td>
                        <td className="py-2.5 px-4">{log.user_email || 'System'}</td>
                        <td className="py-2.5 px-4">{log.branch || '—'}</td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setInspectLog(log)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW STAFF USER */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Add New Staff Account</h2>
                  <p className="text-xs text-slate-300">Provision active portal login credentials, role, and station assignment.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4 text-xs">
              {userError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{userError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name &amp; Title *</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Counsel Brenda Kyomugisha"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Authorised Login Email *</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="staff@mkadvocates.ug"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Temporary Initial Password *</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Access Role *</label>
                  <select
                    value={userRoleId}
                    onChange={(e) => setUserRoleId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Branch Station *</label>
                  <select
                    value={userBranchId}
                    onChange={(e) => setUserBranchId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Advocate Roll / Practicing No. (Optional)</label>
                <input
                  type="text"
                  value={userRollNo}
                  onChange={(e) => setUserRollNo(e.target.value)}
                  placeholder="e.g. ULS/ADV/2026/089"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-semibold flex items-center gap-1.5"
                >
                  {isSubmittingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{isSubmittingUser ? 'Provisioning Account...' : 'Create Staff Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CUSTOM ROLE */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <h2 className="text-base font-bold">Create Custom Access Role</h2>
              <button type="button" onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRole} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Role Title *</label>
                <input
                  type="text"
                  required
                  value={roleFormName}
                  onChange={(e) => setRoleFormName(e.target.value)}
                  placeholder="e.g. Senior Legal Associate"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={roleFormDesc}
                  onChange={(e) => setRoleFormDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  ['canViewAllBranches', 'View All Branches'],
                  ['canCreateCases', 'Create Cases'],
                  ['canEditCases', 'Edit Cases'],
                  ['canDeleteCases', 'Delete Cases'],
                  ['canPrintCauseList', 'Print Cause List'],
                  ['canScheduleHearings', 'Schedule Hearings'],
                  ['canManageDocuments', 'Manage Documents'],
                  ['canViewFinancials', 'View Financials'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean((roleFormPerms as any)[key])}
                      onChange={(e) =>
                        setRoleFormPerms((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                      className="rounded border-slate-300"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={() => setIsRoleModalOpen(false)} className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold">Save Custom Role</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BRANCH */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <h2 className="text-base font-bold">Provision New Branch Station</h2>
              <button type="button" onClick={() => setIsBranchModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateBranch} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">City / Circuit *</label>
                <input
                  type="text"
                  required
                  value={branchCity}
                  onChange={(e) => setBranchCity(e.target.value)}
                  placeholder="e.g. Mbale"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Office Name</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Mbale Regional Office"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="Plot & Street"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={() => setIsBranchModalOpen(false)} className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold">Add Branch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUSPEND CONFIRMATION */}
      {suspendTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">Suspend {suspendTargetUser.name}?</h3>
            <p className="text-slate-600">Suspended staff users are immediately blocked from signing into any terminal or mobile device.</p>
            <input
              type="text"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSuspendTargetUser(null)} className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="button" onClick={handleConfirmSuspend} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold">Confirm Suspension</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">Delete Staff Account?</h3>
            <p className="text-slate-600">
              Are you sure you want to permanently remove <strong>{deleteTargetUser.name}</strong> ({deleteTargetUser.email}) from the firm directory?
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTargetUser(null)} className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="button" onClick={handleConfirmDeleteUser} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold">Delete Account</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AUDIT INSPECT */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Audit Event Payload</h3>
              <button type="button" onClick={() => setInspectLog(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="bg-slate-950 text-slate-100 p-3 rounded-xl font-mono text-[11px] overflow-auto max-h-80">
              {JSON.stringify(inspectLog, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL: WELCOME PACKAGE */}
      {welcomeUser && (
        <StaffWelcomeModal
          user={welcomeUser}
          branch={branches.find((b) => b.id === welcomeUser.branchId)}
          role={roles.find((r) => r.id === welcomeUser.roleId)}
          onClose={() => setWelcomeUser(null)}
        />
      )}

      {/* MODAL: EDIT STAFF ACCOUNT */}
      {editTargetUser && (
        <EditStaffModal
          user={editTargetUser}
          roles={roles}
          branches={branches}
          onSave={async (updates) => {
            const res = await updateUser(editTargetUser.id, updates);
            if (res.success) {
              if (res.warning) {
                showToast('warning', `${updates.name || editTargetUser.name} updated. ${res.warning}`);
              } else {
                showToast('success', `${updates.name || editTargetUser.name} updated and synced.`);
              }
              setEditTargetUser(null);
            }
            return res;
          }}
          onClose={() => setEditTargetUser(null)}
          onOpenWelcomePackage={(updatedUser) => {
            setEditTargetUser(null);
            setWelcomeUser(updatedUser);
          }}
        />
      )}
    </div>
  );
};