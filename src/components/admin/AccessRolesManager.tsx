import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Plus,
  Trash2,
  Edit2,
  Building2,
  Users,
  Lock,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  MapPin,
  Phone,
  Mail,
  UserPlus,
  Loader2,
  Copy,
  Check,
  Download,
  Code,
  History,
  Search,
  Filter,
  Eye,
  RefreshCw,
  FileText,
  Database,
} from 'lucide-react';
import { CustomRole, RolePermissions, User, Branch, AuditLog } from '../../types';
import { StaffWelcomeModal } from './StaffWelcomeModal';
import { EditStaffModal } from './EditStaffModal';

export const AccessRolesManager: React.FC = () => {
  const {
    currentUser,
    roles,
    availableUsers,
    branches,
    addCustomRole,
    updateCustomRole,
    deleteCustomRole,
    assignUserRole,
    addUser,
    updateUser,
    handleSaveStaff,
    toggleSuspendUser,
    deleteUser,
    addBranch,
    updateBranch,
    deleteBranch,
    userPermissions,
    auditLogs = [],
    refreshAuditLogs,
    refreshStaffFromSupabase,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'roles' | 'users' | 'branches' | 'rls' | 'audit'>('roles');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedAuditSql, setCopiedAuditSql] = useState(false);
  const [isRefreshingStaff, setIsRefreshingStaff] = useState(false);

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
    canBulkImport: false, // Permanently locked to Super Admin
    canBulkExport: false, // Permanently locked to Super Admin
    canPrintCauseList: false, // Only Branch Admin & Super Admin
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
  const [userRoleId, setUserRoleId] = useState(roles[3]?.id || 'role-advocate');
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

  // Suspend Reason Prompt Modal State
  const [suspendTargetUser, setSuspendTargetUser] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState('Administrative hold applied by Managing Partner.');

  // Staff Welcome & Edit Modals State
  const [welcomeUser, setWelcomeUser] = useState<User | null>(null);
  const [editTargetUser, setEditTargetUser] = useState<User | null>(null);

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
        canBulkImport: false, // Super Admin only
        canBulkExport: false, // Super Admin only
        canManageRoles: false,
        canManageUsers: false,
        canManageBranches: false,
      },
    });

    setIsRoleModalOpen(false);
    setRoleFormName('');
    setRoleFormDesc('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingUser) return;
    setUserError(null);
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
        if (result.user) {
          setWelcomeUser(result.user);
        }
      } else {
        setUserError(result.error || 'Failed to permanently create staff account in database.');
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
  };

  const handleConfirmSuspend = () => {
    if (!suspendTargetUser) return;
    toggleSuspendUser(suspendTargetUser.id, suspendReason);
    setSuspendTargetUser(null);
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
    const headers = ['ID', 'Timestamp (UTC)', 'Action', 'Case Number', 'Case ID', 'User Email', 'User Role', 'Branch', 'Changes'];
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
      const matchCase = log.case_number?.toLowerCase().includes(q) || log.case_id?.toLowerCase().includes(q);
      const matchEmail = log.user_email?.toLowerCase().includes(q);
      const matchRole = log.user_role?.toLowerCase().includes(q);
      const matchBranch = log.branch?.toLowerCase().includes(q);
      const matchAction = log.action?.toLowerCase().includes(q);
      const matchChanges = JSON.stringify(log.changes || {}).toLowerCase().includes(q);
      return matchCase || matchEmail || matchRole || matchBranch || matchAction || matchChanges;
    }
    return true;
  });

  const auditStats = {
    total: auditLogs.length,
    inserts: auditLogs.filter((l) => l.action === 'INSERT').length,
    updates: auditLogs.filter((l) => l.action === 'UPDATE').length,
    deletes: auditLogs.filter((l) => l.action === 'DELETE').length,
  };

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
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">
                  Super Admin Security &amp; Access Roles Center
                </h1>
                <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full uppercase">
                  Sole Super Admin Authority
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Configure custom access roles, manage staff accounts, suspend or delete users, and provision regional branches. As per firm policy, only the Super Admin can perform bulk imports/exports, and only Branch Administrators can print daily cause sheets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400">Active session:</span>
            <span className="text-xs font-semibold text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              {currentUser.name} ({currentUser.roleTitle})
            </span>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveSubTab('roles')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'roles'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <span>Custom Roles &amp; Permissions ({roles.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'users'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500" />
            <span>Staff Directory &amp; Security ({availableUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('branches')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'branches'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-500" />
            <span>Branch Registries ({branches.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('rls')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'rls'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Lock className="w-4 h-4 text-purple-400" />
            <span>Supabase RLS Policies</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'audit'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4 text-cyan-400" />
            <span>Audit Trail &amp; Compliance ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CUSTOM ROLES & PERMISSIONS */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Custom Firm Access Roles</h2>
              <p className="text-xs text-slate-500">
                Grant or restrict permissions across branch catalogues, manual case typing, and document archives.
              </p>
            </div>
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Role</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => {
              const assignedCount = availableUsers.filter((u) => u.roleId === role.id).length;
              return (
                <div
                  key={role.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${role.badgeColor}`}>
                        {role.name}
                      </span>
                      {role.isSuperAdmin ? (
                        <span className="text-[10px] font-mono text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          SUPER ADMIN
                        </span>
                      ) : role.isSystem ? (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          System Default
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          Custom Role
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                      {role.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Key Capabilities &amp; Restrictions
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-700">
                          <span>Bulk Excel Import / Export:</span>
                          {role.permissions.canBulkImport ? (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Full Authority
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                              <XCircle className="w-3.5 h-3.5 text-slate-300" /> Hidden / Locked
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-slate-700">
                          <span>Daily Cause List Print:</span>
                          {role.permissions.canPrintCauseList ? (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Allowed
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                              <XCircle className="w-3.5 h-3.5 text-slate-300" /> Restricted
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-slate-700">
                          <span>Manual Typing &amp; Editing:</span>
                          {role.permissions.canCreateCases ? (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Enabled
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                              <XCircle className="w-3.5 h-3.5 text-slate-300" /> Read Only
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-slate-700">
                          <span>Cross-Branch Visibility:</span>
                          <span className={`text-[11px] font-medium ${role.permissions.canViewAllBranches ? 'text-blue-700' : 'text-slate-500'}`}>
                            {role.permissions.canViewAllBranches ? 'All 7 Branches' : 'Assigned Circuit Only'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-mono text-[11px]">
                      {assignedCount} staff member{assignedCount === 1 ? '' : 's'} assigned
                    </span>

                    {!role.isSystem && !role.isSuperAdmin && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete custom role "${role.name}"?`)) {
                            deleteCustomRole(role.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                        title="Delete custom role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: STAFF DIRECTORY & SECURITY */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Firm Staff Accounts &amp; Access Control</h2>
              <p className="text-xs text-slate-500">
                Super Admin can add new staff, reassign roles, suspend accounts immediately, or delete staff members.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isRefreshingStaff}
                onClick={async () => {
                  setIsRefreshingStaff(true);
                  try {
                    await refreshStaffFromSupabase();
                  } finally {
                    setTimeout(() => setIsRefreshingStaff(false), 400);
                  }
                }}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 shadow-2xs transition-colors disabled:opacity-60"
                title="Fetch authoritative profiles directly from Supabase database table"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStaff ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                <span>{isRefreshingStaff ? 'Syncing...' : 'Sync Profiles'}</span>
              </button>

              <button
                onClick={() => setIsUserModalOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Staff User</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Staff Name &amp; Contact</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Branch Station</th>
                    <th className="py-3 px-4">Roll / Ref No.</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {availableUsers.map((user) => {
                    const isSelf = user.id === currentUser.id;
                    const matchedRole = roles.find((r) => r.id === user.roleId);

                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          user.isSuspended ? 'bg-red-50/40 text-red-900' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {user.isSuperAdmin && (
                              <span className="text-[9px] font-mono bg-amber-100 text-amber-800 border border-amber-200 px-1 rounded font-bold">
                                Super Admin
                              </span>
                            )}
                            {isSelf && (
                              <span className="text-[9px] font-mono bg-blue-100 text-blue-800 px-1 rounded">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{user.email}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <select
                            disabled={user.isSuperAdmin}
                            value={user.roleId || 'role-advocate'}
                            onChange={(e) => assignUserRole(user.id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600 disabled:opacity-60"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-slate-700 font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {user.branchName || 'Kampala Central'}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {user.advocateRollNo || '—'}
                        </td>

                        <td className="py-3 px-4">
                          {user.isSuspended ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                                <XCircle className="w-3 h-3" /> Suspended
                              </span>
                              {user.suspendedReason && (
                                <p className="text-[10px] text-red-500 mt-0.5 max-w-xs truncate" title={user.suspendedReason}>
                                  {user.suspendedReason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Active Access
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View / Send Welcome Email & Link */}
                            <button
                              type="button"
                              onClick={() => setWelcomeUser(user)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-colors"
                              title={`View / Send Welcome Email & Onboarding Link for ${user.name}`}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit User Name, Password, Station & Role */}
                            {userPermissions.canManageUsers && (
                              <button
                                type="button"
                                onClick={() => setEditTargetUser(user)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-300 transition-colors"
                                title={`Edit Name, Password & Station for ${user.name}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {!user.isSuperAdmin && !isSelf && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (user.isSuspended) {
                                      toggleSuspendUser(user.id);
                                    } else {
                                      setSuspendTargetUser(user);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                    user.isSuspended
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  }`}
                                >
                                  {user.isSuspended ? 'Reactivate' : 'Suspend'}
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (window.confirm(`Permanently remove staff account for ${user.name}? This will delete the record from Supabase.`)) {
                                      await deleteUser(user.id);
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                                  title="Delete staff account from Supabase"
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

      {/* TAB 3: BRANCH REGISTRIES */}
      {activeSubTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Regional Branch Registry</h2>
              <p className="text-xs text-slate-500">
                Super Admin can add new regional offices, assign lead partners, and manage circuit stations.
              </p>
            </div>
            <button
              onClick={() => setIsBranchModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Branch</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span>{b.name}</span>
                      </h3>
                      <span className="text-xs text-slate-500">{b.city} Circuit</span>
                    </div>
                    {b.isHeadquarters ? (
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                        Head Office
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Regional Circuit
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{b.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Lead: <strong>{b.teamLead}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded text-[11px] font-semibold">
                      {b.caseCount || 0} active matters
                    </span>
                    <span className="text-slate-400 text-[11px]">{b.lawyersCount || 2} resident advocates</span>
                  </div>

                  {!b.isHeadquarters && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete branch registry for "${b.name}"?`)) {
                          deleteBranch(b.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      title="Delete branch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SUPABASE ROW LEVEL SECURITY (RLS) POLICIES */}
      {activeSubTab === 'rls' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Supabase Row Level Security (RLS) &amp; Branch Permissions
                </h2>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  ACTIVE IN CORE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                PostgreSQL database policies enforcing branch-specific CRUD for branch staff and global access for Admins and Lawyers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/api/supabase_rls_policies.sql"
                download="supabase_rls_policies.sql"
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
                title="Download Supabase SQL migration file"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Download .SQL</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  const sql = `-- MK Advocates RLS Policies
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_users ENABLE ROW LEVEL SECURITY;

-- 1. Helper function to check if user is Admin or Lawyer
CREATE OR REPLACE FUNCTION public.is_admin_or_lawyer()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_role TEXT;
  v_is_super BOOLEAN;
BEGIN
  SELECT role, is_super_admin INTO v_role, v_is_super 
  FROM public.firm_users WHERE LOWER(email) = LOWER(auth.jwt()->>'email') LIMIT 1;
  IF v_is_super IS TRUE OR v_role IN ('partner', 'team_lead', 'lawyer', 'advocate') THEN
    RETURN TRUE;
  END IF;
  RETURN auth.role() = 'service_role' OR auth.jwt() IS NULL;
END;
$$;

-- 2. Helper function to get caller's assigned branch_id
CREATE OR REPLACE FUNCTION public.get_user_branch_id()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
  SELECT branch_id FROM public.firm_users WHERE LOWER(email) = LOWER(auth.jwt()->>'email') LIMIT 1;
$$;

-- 3. Cases RLS: Global Access for Admins & Lawyers
CREATE POLICY "Global users full access to cases" ON public.cases
FOR ALL TO authenticated, anon
USING (public.is_admin_or_lawyer() OR public.get_user_branch_id() IS NULL)
WITH CHECK (public.is_admin_or_lawyer() OR public.get_user_branch_id() IS NULL);

-- 4. Cases RLS: Branch Staff CRUD restricted to own branch
CREATE POLICY "Branch staff view branch cases" ON public.cases
FOR SELECT TO authenticated, anon USING (branch_id = public.get_user_branch_id());

CREATE POLICY "Branch staff insert branch cases" ON public.cases
FOR INSERT TO authenticated, anon WITH CHECK (branch_id = public.get_user_branch_id());

CREATE POLICY "Branch staff update branch cases" ON public.cases
FOR UPDATE TO authenticated, anon
USING (branch_id = public.get_user_branch_id())
WITH CHECK (branch_id = public.get_user_branch_id());

CREATE POLICY "Branch staff delete branch cases" ON public.cases
FOR DELETE TO authenticated, anon USING (branch_id = public.get_user_branch_id());`;

                  navigator.clipboard?.writeText(sql);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Script'}</span>
              </button>
            </div>
          </div>

          {/* Cards summarizing the 2 policy boundaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>1. Branch Staff Rules (Branch Restricted)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Applies to: <strong>Branch Administrator</strong>, <strong>Court Registry Clerk</strong>, and branch personnel.
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                <li><strong>SELECT:</strong> Only cases matching user's branch (<code className="font-mono text-[11px] bg-slate-100 px-1">branch_id = get_user_branch_id()</code>).</li>
                <li><strong>INSERT:</strong> New cases are automatically locked to user's branch.</li>
                <li><strong>UPDATE:</strong> Can update all matter fields, but cannot reassign case to another branch.</li>
                <li><strong>DELETE:</strong> Full management deletion rights restricted specifically to cases belonging to their assigned branch.</li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>2. Admins &amp; Lawyers Rules (Global Access)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Applies to: <strong>Managing Partner (Super Admin)</strong>, <strong>Litigation Advocates</strong>, and <strong>Regional Team Leads</strong>.
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                <li><strong>GLOBAL SELECT:</strong> Full cross-branch access across Kampala, Fort Portal, Mbarara, Masaka, Jinja, etc.</li>
                <li><strong>GLOBAL INSERT:</strong> Can create cases for any branch.</li>
                <li><strong>GLOBAL UPDATE:</strong> Can edit and reassign cases across all branches.</li>
                <li><strong>GLOBAL DELETE:</strong> Supreme authority to delete or archive matters in any branch.</li>
              </ul>
            </div>

            {/* Card 3: Restrict Delete Access Policy */}
            <div className="bg-white border border-rose-200 rounded-xl p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>3. Restrict Delete Access (Strict Multi-Branch Authority)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cases can only be deleted by <strong>Super Admins</strong> globally or by <strong>Branch Admins</strong> exclusively for their assigned branch:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-[11px] text-slate-800 leading-relaxed">
                <code>{`profiles.role = 'super_admin' OR (profiles.role = 'branch_admin' AND profiles.branch = cases.branch)`}</code>
              </div>
              <p className="text-[11px] text-slate-500">
                Prevents accidental cross-branch deletions while empowering regional managing clerks.
              </p>
            </div>

            {/* Card 4: Dedicated audit_logs Security */}
            <div className="bg-white border border-cyan-200 rounded-xl p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-cyan-900 font-bold text-xs">
                <Shield className="w-4 h-4 text-cyan-600" />
                <span>4. Dedicated Audit Logs Table &amp; RLS Protection</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Immutable <code className="font-mono text-[11px] bg-slate-100 px-1">public.audit_logs</code> table tracking every <code className="font-mono text-[11px] text-emerald-700">INSERT</code>, <code className="font-mono text-[11px] text-blue-700">UPDATE</code>, and <code className="font-mono text-[11px] text-rose-700">DELETE</code>:
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                <li><strong>SuperAdmin View Audit Logs:</strong> Only <code className="font-mono text-[11px] bg-slate-100 px-1">super_admin</code> can SELECT or view full logs.</li>
                <li><strong>Users Insert Audit Logs:</strong> Authenticated users write event logs matching their <code className="font-mono text-[11px] bg-slate-100 px-1">auth.uid()</code>.</li>
              </ul>
            </div>
          </div>

          {/* SQL Preview Block */}
          <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs overflow-x-auto border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-blue-400" />
                <span>PostgreSQL RLS Definition &bull; supabase/migrations/20261104_audit_logs.sql</span>
              </span>
              <button
                onClick={() => {
                  const sql = `-- 1. Restrict Delete Access on cases
create policy "Restrict Delete Access" on public.cases
  for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and (
        profiles.role = 'super_admin'
        or (profiles.role = 'branch_admin' and profiles.branch = cases.branch)
      )
    )
  );

-- 2. Create audit_logs table
create table if not exists public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    case_id text,
    case_number text,
    action text not null,
    performed_by uuid references auth.users(id),
    user_email text,
    user_role text,
    branch text,
    changes jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS on audit_logs
alter table public.audit_logs enable row level security;

-- 4. Policy: Only Super Admins can view audit logs
create policy "SuperAdmin View Audit Logs" on public.audit_logs
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

-- 5. Policy: Authenticated users can insert logs
create policy "Users Insert Audit Logs" on public.audit_logs
  for insert
  with check (auth.uid() = performed_by);`;

                  navigator.clipboard?.writeText(sql);
                  setCopiedAuditSql(true);
                  setTimeout(() => setCopiedAuditSql(false), 2000);
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                {copiedAuditSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedAuditSql ? 'Copied Audit SQL!' : 'Copy Audit SQL'}</span>
              </button>
            </div>
            <pre className="text-[11px] leading-relaxed text-slate-300">
{`-- 1. Restrict Delete Access Policy
create policy "Restrict Delete Access" on public.cases
  for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and (
        profiles.role = 'super_admin'
        or (profiles.role = 'branch_admin' and profiles.branch = cases.branch)
      )
    )
  );

-- 2. Create audit_logs table
create table public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    case_id text,
    case_number text,
    action text not null, -- 'INSERT', 'UPDATE', 'DELETE'
    performed_by uuid references auth.users(id),
    user_email text,
    user_role text,
    branch text,
    changes jsonb, -- Stores old/new details & modifications
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS on audit_logs
alter table public.audit_logs enable row level security;

-- 4. Policy: Only Super Admins can view full audit logs
create policy "SuperAdmin View Audit Logs" on public.audit_logs
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

-- 5. Policy: Authenticated users can insert logs for actions
create policy "Users Insert Audit Logs" on public.audit_logs
  for insert
  with check (auth.uid() = performed_by);`}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT TRAIL & COMPLIANCE (SUPER ADMIN ONLY) */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          {/* Header & Stats Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Immutable Case Audit Trail</span>
                      <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full uppercase">
                        Super Admin Eyes Only
                      </span>
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Real-time ledger recording every matter insertion, edit, and deletion across all branches with exact user identity, branch context, and JSON payload diffs.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshAuditLogs}
                  disabled={isRefreshingLogs}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>{isRefreshingLogs ? 'Refreshing...' : 'Refresh Logs'}</span>
                </button>

                <button
                  onClick={exportAuditLogsToCsv}
                  disabled={auditLogs.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 font-medium">Total Audit Events</span>
                <p className="text-xl font-bold text-white mt-0.5">{auditStats.total}</p>
              </div>
              <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3">
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  <span>Matter Insertions</span>
                </span>
                <p className="text-xl font-bold text-emerald-300 mt-0.5">{auditStats.inserts}</p>
              </div>
              <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-3">
                <span className="text-[11px] text-blue-400 font-medium flex items-center gap-1">
                  <Edit2 className="w-3 h-3" />
                  <span>Matter Modifications</span>
                </span>
                <p className="text-xl font-bold text-blue-300 mt-0.5">{auditStats.updates}</p>
              </div>
              <div className="bg-rose-950/40 border border-rose-800/50 rounded-xl p-3">
                <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />
                  <span>Case Deletions</span>
                </span>
                <p className="text-xl font-bold text-rose-300 mt-0.5">{auditStats.deletes}</p>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search audit trail by case, user, branch..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
              {auditSearch && (
                <button
                  onClick={() => setAuditSearch('')}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Action Filter Pills */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                {(['ALL', 'INSERT', 'UPDATE', 'DELETE'] as const).map((act) => (
                  <button
                    key={act}
                    onClick={() => setAuditActionFilter(act)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      auditActionFilter === act
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {act === 'ALL' ? 'All Actions' : act}
                  </button>
                ))}
              </div>

              {/* Branch Filter */}
              <select
                value={auditBranchFilter}
                onChange={(e) => setAuditBranchFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Matter / Suit No</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Performed By</th>
                    <th className="py-3 px-4">Audit Payload Preview</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <History className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-slate-600">No audit records match your query.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Audit logs will automatically appear whenever matters are created, updated, or deleted.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const isInsert = log.action === 'INSERT';
                      const isUpdate = log.action === 'UPDATE';
                      const isDelete = log.action === 'DELETE';

                      const dateStr = new Date(log.created_at).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {dateStr}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isInsert && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Plus className="w-3 h-3" />
                                <span>INSERT</span>
                              </span>
                            )}
                            {isUpdate && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                <Edit2 className="w-3 h-3" />
                                <span>UPDATE</span>
                              </span>
                            )}
                            {isDelete && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <Trash2 className="w-3 h-3" />
                                <span>DELETE</span>
                              </span>
                            )}
                            {!isInsert && !isUpdate && !isDelete && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                {log.action}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono text-xs">{log.case_number || log.case_id || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 border border-slate-200 text-slate-700">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{log.branch || 'Global'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-semibold text-slate-800 text-[11px]">
                                {log.user_email || 'System Operation'}
                              </p>
                              {log.user_role && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Role: {log.user_role}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-[11px] font-mono text-slate-500">
                            {log.changes ? (
                              <span title={JSON.stringify(log.changes)}>
                                {JSON.stringify(log.changes).slice(0, 70)}...
                              </span>
                            ) : (
                              <span className="italic text-slate-400">None</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setInspectLog(log)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100 rounded-lg border border-cyan-200 transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Payload</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing <strong>{filteredAuditLogs.length}</strong> of <strong>{auditLogs.length}</strong> recorded audit events
              </span>
              <span className="text-[11px] flex items-center gap-1 text-slate-400 font-mono">
                <Database className="w-3 h-3" />
                <span>Supabase RLS Protected</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AUDIT LOG PAYLOAD INSPECTOR */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Audit Event Details</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        inspectLog.action === 'INSERT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inspectLog.action === 'UPDATE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {inspectLog.action}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">Event ID: {inspectLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Event Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Case / Suit No</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">
                    {inspectLog.case_number || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Branch</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{inspectLog.branch || 'Global'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Timestamp</span>
                  <p className="font-mono text-[11px] text-slate-700 mt-0.5">
                    {new Date(inspectLog.created_at).toISOString()}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Performed By</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{inspectLog.user_email || 'System'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">User Role</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{inspectLog.user_role || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">User ID</span>
                  <p className="font-mono text-[10px] text-slate-500 truncate mt-0.5">
                    {inspectLog.performed_by || 'N/A'}
                  </p>
                </div>
              </div>

              {/* JSON Changes Object */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Payload Changes JSON (PostgreSQL jsonb)</span>
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(JSON.stringify(inspectLog.changes, null, 2));
                    }}
                    className="text-[11px] text-cyan-600 hover:text-cyan-700 font-semibold flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy JSON</span>
                  </button>
                </div>

                <div className="bg-slate-900 rounded-xl p-3.5 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-64 border border-slate-800">
                  <pre>{JSON.stringify(inspectLog.changes, null, 2)}</pre>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-3">
              <button
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE CUSTOM ROLE */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span>Create Custom Access Role</span>
              </h3>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Role Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Associate / Retainer Counsel"
                  value={roleFormName}
                  onChange={(e) => setRoleFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Role Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Specify role remit, branch scope, and responsibilities..."
                  value={roleFormDesc}
                  onChange={(e) => setRoleFormDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Badge Styling
                </label>
                <select
                  value={roleFormColor}
                  onChange={(e) => setRoleFormColor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="bg-blue-100 text-blue-800 border-blue-200">Blue Tag</option>
                  <option value="bg-emerald-100 text-emerald-800 border-emerald-200">Emerald Tag</option>
                  <option value="bg-purple-100 text-purple-800 border-purple-200">Purple Tag</option>
                  <option value="bg-amber-100 text-amber-800 border-amber-200">Amber Tag</option>
                  <option value="bg-slate-100 text-slate-800 border-slate-200">Slate Tag</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="font-semibold text-slate-800 mb-2">
                  Granular Permissions:
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={roleFormPerms.canViewAllBranches}
                      onChange={(e) =>
                        setRoleFormPerms((p) => ({ ...p, canViewAllBranches: e.target.checked }))
                      }
                      className="rounded text-blue-600"
                    />
                    <span>View all branches (vs only assigned branch)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={roleFormPerms.canCreateCases}
                      onChange={(e) =>
                        setRoleFormPerms((p) => ({ ...p, canCreateCases: e.target.checked }))
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Manually type and add single cases</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={roleFormPerms.canEditCases}
                      onChange={(e) =>
                        setRoleFormPerms((p) => ({ ...p, canEditCases: e.target.checked }))
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Edit case pleadings &amp; stages</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={roleFormPerms.canScheduleHearings}
                      onChange={(e) =>
                        setRoleFormPerms((p) => ({ ...p, canScheduleHearings: e.target.checked }))
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Schedule court hearings in diary</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={roleFormPerms.canRecordOutcomes}
                      onChange={(e) =>
                        setRoleFormPerms((p) => ({ ...p, canRecordOutcomes: e.target.checked }))
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Record judge rulings &amp; adjournment directions</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={roleFormPerms.canLogFileMovement}
                      onChange={(e) =>
                        setRoleFormPerms((p) => ({ ...p, canLogFileMovement: e.target.checked }))
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Log physical file custody &amp; registry movement</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={roleFormPerms.canManageDocuments}
                      onChange={(e) =>
                        setRoleFormPerms((p) => ({ ...p, canManageDocuments: e.target.checked }))
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Attach &amp; upload pleading documents</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={roleFormPerms.canViewFinancials}
                      onChange={(e) =>
                        setRoleFormPerms((p) => ({ ...p, canViewFinancials: e.target.checked }))
                      }
                      className="rounded text-blue-600"
                    />
                    <span>View claim values &amp; billing status</span>
                  </label>

                  {/* Permanently Locked Notice */}
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-snug">
                    <strong>Locked System Policies:</strong>
                    <br />
                    &bull; Bulk Excel Import &amp; CSV Export are reserved strictly for Super Admin.
                    <br />
                    &bull; Daily Cause List printing is reserved strictly for Branch Administrators.
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs"
                >
                  Save Custom Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD STAFF USER */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>Create Staff User Account</span>
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {userError && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {userError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Staff Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Counsel Sarah Namaganda"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Firm Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. s.namaganda@mkadvocates.ug"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Security Password
                </label>
                <input
                  type="text"
                  required
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={userRoleId}
                    onChange={(e) => setUserRoleId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Branch Station
                  </label>
                  <select
                    value={userBranchId}
                    onChange={(e) => setUserBranchId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Advocate Roll Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ULS/ADV/2021/089"
                  value={userRollNo}
                  onChange={(e) => setUserRollNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmittingUser}
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs shadow-xs flex items-center gap-1.5"
                >
                  {isSubmittingUser ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <span>Create Staff Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD NEW BRANCH */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-800" />
                <span>Register New Branch Office</span>
              </h3>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Circuit City / Town
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masaka, Soroti, Kabale"
                  value={branchCity}
                  onChange={(e) => setBranchCity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Branch Office Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Masaka Regional Office"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Physical Office Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 12 High Court Road"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Branch Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="+256 414 000 000"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Resident Lead Partner
                </label>
                <input
                  type="text"
                  placeholder="e.g. Masaka Lead Partner"
                  value={branchTeamLead}
                  onChange={(e) => setBranchTeamLead(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs shadow-xs"
                >
                  Add Branch to Network
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: SUSPEND USER PROMPT */}
      {suspendTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-red-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-center text-slate-900 text-base">
              Suspend Staff Account?
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1">
              Suspending <strong>{suspendTargetUser.name}</strong> will immediately revoke access and block login.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Suspension:
              </label>
              <textarea
                rows={2}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSuspendTargetUser(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg shadow-xs"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Welcome & Onboarding Package Modal */}
      {welcomeUser && (
        <StaffWelcomeModal
          user={welcomeUser}
          branch={branches.find((b) => b.id === welcomeUser.branchId)}
          role={roles.find((r) => r.id === welcomeUser.roleId)}
          onClose={() => setWelcomeUser(null)}
        />
      )}

      {/* Super Admin Edit Staff User & Password Modal */}
      {editTargetUser && (
        <EditStaffModal
          user={editTargetUser}
          roles={roles}
          branches={branches}
          onSave={(updates) => updateUser(editTargetUser.id, updates)}
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
