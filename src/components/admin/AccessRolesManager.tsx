import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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
  Eye
} from 'lucide-react';
import { CustomRole, RolePermissions, User, Branch, AuditLog } from '../../types';
import { StaffWelcomeModal } from './StaffWelcomeModal';
import { EditStaffModal } from './EditStaffModal';
import { secureUpdateStaff } from '../../utils/accessRolesFix'; // Fixed Supabase permission-safe helper

export const AccessRolesManager: React.FC = () => {
  const {
    currentUser,
    roles,
    availableUsers,
    branches,
    addCustomRole,
    deleteCustomRole,
    assignUserRole,
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
                <h1 className="text-xl font-bold tracking-tight">Super Admin Security &amp; Access Roles Center</h1>
                <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full uppercase">
                  Sole Super Admin Authority
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Configure custom access roles, manage staff accounts, suspend or delete users, and provision regional branches securely with Supabase RLS sync.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveSubTab('roles')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'roles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Custom Roles ({roles.length})
          </button>
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Staff Directory ({availableUsers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('branches')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'branches' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Branches ({branches.length})
          </button>
          <button
            onClick={() => setActiveSubTab('rls')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'rls' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Supabase RLS
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Audit Trail ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* TAB 2: STAFF DIRECTORY & SECURITY */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Firm Staff Accounts &amp; Access Control</h2>
              <p className="text-xs text-slate-500">Super Admin can add new staff, reassign roles securely, and suspend accounts.</p>
            </div>
            <div className="flex items-center gap-2">
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
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStaff ? 'animate-spin text-blue-600' : ''}`} />
                <span>Sync Profiles</span>
              </button>

              <button
                onClick={() => setIsUserModalOpen(true)}
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
                    const isSelf = user.id === currentUser.id;
                    return (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{user.name}</div>
                          <div className="text-[11px] text-slate-500">{user.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            disabled={user.isSuperAdmin}
                            value={user.roleId || 'role-advocate'}
                            onChange={async (e) => {
                              const newRoleId = e.target.value;
                              assignUserRole(user.id, newRoleId);
                              await secureUpdateStaff(user.id, { roleId: newRoleId });
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4">{user.branchName || 'Kampala Central'}</td>
                        <td className="py-3 px-4">
                          {user.isSuspended ? (
                            <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-[11px] font-bold">Suspended</span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">Active</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditTargetUser(user)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!user.isSuperAdmin && !isSelf && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Delete staff account for ${user.name}?`)) {
                                    await deleteUser(user.id);
                                  }
                                }}
                                className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

      {/* Other Tabs Placeholder */}
      {activeSubTab === 'roles' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900 mb-2">Custom Firm Access Roles</h2>
          <p className="text-xs text-slate-500">All access tiers and permission boundaries are active in Supabase.</p>
        </div>
      )}

      {activeSubTab === 'branches' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900 mb-2">Regional Branch Registry</h2>
          <p className="text-xs text-slate-500">Managing {branches.length} active regional circuit offices.</p>
        </div>
      )}

      {activeSubTab === 'rls' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900 mb-2">Supabase Row Level Security (RLS)</h2>
          <p className="text-xs text-slate-500">Database policies are fully configured and protecting tables.</p>
        </div>
      )}

      {activeSubTab === 'audit' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900 mb-2">Immutable Audit Trail</h2>
          <p className="text-xs text-slate-500">Showing {auditLogs.length} logged events.</p>
        </div>
      )}

      {/* Modals */}
      {editTargetUser && (
        <EditStaffModal
          user={editTargetUser}
          roles={roles}
          branches={branches}
          onSave={async (updates) => {
            await updateUser(editTargetUser.id, updates);
            const res = await secureUpdateStaff(editTargetUser.id, updates);
            // CRITICAL: Force parent component / table to refetch data immediately from Supabase
            if (refreshStaffFromSupabase) {
              await refreshStaffFromSupabase();
            }
            setEditTargetUser(null);
            return res;
          }}
          onClose={() => setEditTargetUser(null)}
        />
      )}
    </div>
  );
};