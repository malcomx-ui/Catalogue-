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
} from 'lucide-react';
import { CustomRole, RolePermissions, User, Branch } from '../../types';
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
    toggleSuspendUser,
    deleteUser,
    addBranch,
    updateBranch,
    deleteBranch,
    userPermissions,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'roles' | 'users' | 'branches'>('roles');

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
    setUserError(null);

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
      setUserError(result.error || 'Failed to create staff account.');
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
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff User</span>
            </button>
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
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-xs"
                >
                  Create Staff Account
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
