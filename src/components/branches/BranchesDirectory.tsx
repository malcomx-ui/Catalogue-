import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Branch } from '../../types';
import { getEffectiveUser, resolveBranchId } from '../../lib/supabase';
import { isCaseClosedOrArchived } from '../../utils/legalTeam';
import { showCleanMessage } from '../../utils/notification';
import {
  Building2,
  MapPin,
  Phone,
  Users,
  Briefcase,
  Plus,
  X,
  ArrowUpRight,
  Edit3,
  Check,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export const BranchesDirectory: React.FC = () => {
  const {
    branches,
    cases,
    availableUsers,
    currentUser,
    userPermissions,
    addBranch,
    updateBranch,
    setSelectedBranchFilter,
    navigateToRoute,
  } = useApp();

  const effectiveUser = getEffectiveUser(currentUser);
  const canManageBranches = Boolean(userPermissions.canManageBranches || effectiveUser?.isSuperAdmin);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    city: '',
    address: '',
    phone: '',
    teamLead: '',
    officeAdmin: '',
    clerk: '',
  });

  const visibleBranches = useMemo(() => {
    if (userPermissions.canViewAllBranches) return branches;
    return branches.filter((b) => b.id === (effectiveUser?.branchId || currentUser?.branchId));
  }, [branches, userPermissions.canViewAllBranches, effectiveUser?.branchId, currentUser?.branchId]);

  const branchMetrics = useMemo(() => {
    return visibleBranches.map((branch) => {
      const branchCases = cases.filter((c) => {
        const resolved = resolveBranchId(c.branchId, c.branchName || c.branch);
        return resolved === branch.id;
      });
      const activeCount = branchCases.filter((c) => !isCaseClosedOrArchived(c)).length;
      const closedCount = branchCases.length - activeCount;

      const assignedStaff = availableUsers.filter((u) => {
        const uBranch = resolveBranchId(u.branchId, u.branchName);
        return uBranch === branch.id;
      });

      const staffCount = Math.max(assignedStaff.length, branch.staff?.length || 0, branch.lawyersCount || 0);

      return {
        branch,
        totalCases: branchCases.length,
        activeCount,
        closedCount,
        staffCount,
        assignedStaff,
      };
    });
  }, [visibleBranches, cases, availableUsers]);

  const openAddModal = () => {
    setEditingBranchId(null);
    setFormState({
      name: '',
      city: '',
      address: '',
      phone: '+256 414 ',
      teamLead: '',
      officeAdmin: '',
      clerk: '',
    });
    setIsAddOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setFormState({
      name: branch.name,
      city: branch.city,
      address: branch.address,
      phone: branch.phone,
      teamLead: branch.teamLead,
      officeAdmin: branch.officeAdmin,
      clerk: branch.clerk,
    });
    setIsAddOpen(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageBranches) return;
    if (!formState.city.trim() || !formState.name.trim()) {
      showCleanMessage('Branch name and city are required.', 'warning');
      return;
    }

    if (editingBranchId) {
      updateBranch(editingBranchId, {
        name: formState.name.trim(),
        city: formState.city.trim(),
        address: formState.address.trim(),
        phone: formState.phone.trim(),
        teamLead: formState.teamLead.trim(),
        officeAdmin: formState.officeAdmin.trim(),
        clerk: formState.clerk.trim(),
      });
      showCleanMessage(`Updated branch details for ${formState.name.trim()}.`, 'success');
    } else {
      addBranch({
        name: formState.name.trim(),
        city: formState.city.trim(),
        address: formState.address.trim(),
        phone: formState.phone.trim(),
        teamLead: formState.teamLead.trim(),
        officeAdmin: formState.officeAdmin.trim(),
        clerk: formState.clerk.trim(),
      });
      showCleanMessage(`Added new regional branch: ${formState.name.trim()}.`, 'success');
    }

    setIsAddOpen(false);
    setEditingBranchId(null);
  };

  const handleOpenBranchDocket = (branchId: string) => {
    setSelectedBranchFilter(branchId);
    navigateToRoute('catalogue', { branchId });
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Branches</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">Locations &amp; Management</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            Regional Branch Offices
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Station leadership, registry contacts, active caseload distribution, and circuit administration.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {canManageBranches && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Branch Location</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Active Stations</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-1 block">
            {visibleBranches.length}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Total Case Files</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-1 block">
            {branchMetrics.reduce((acc, m) => acc + m.totalCases, 0)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Active Litigation</span>
          <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums mt-1 block">
            {branchMetrics.reduce((acc, m) => acc + m.activeCount, 0)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Assigned Staff</span>
          <span className="text-2xl font-bold text-blue-700 dark:text-blue-400 font-mono tabular-nums mt-1 block">
            {branchMetrics.reduce((acc, m) => acc + m.staffCount, 0)}
          </span>
        </div>
      </div>

      {/* Branch Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {branchMetrics.map(({ branch, totalCases, activeCount, closedCount, staffCount }) => (
          <div
            key={branch.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {branch.city}
                    </span>
                    {branch.isHeadquarters && (
                      <StatusBadge tone="emerald" label="HQ" showDot={false} size="xs" />
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">{branch.name}</h2>
                </div>

                {canManageBranches && (
                  <button
                    type="button"
                    onClick={() => openEditModal(branch)}
                    title="Edit branch details"
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{branch.address || 'Regional Chambers'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono tabular-nums">{branch.phone || '-'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Team Lead</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {branch.teamLead || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Office Admin</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {branch.officeAdmin || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Active / Total</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                    {activeCount} <span className="text-slate-400 font-normal">/ {totalCases}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Closed</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-600 dark:text-slate-300">
                    {closedCount}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Staff</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    {staffCount}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenBranchDocket(branch.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 hover:bg-slate-900 dark:hover:bg-blue-600 hover:text-white hover:border-slate-900 dark:hover:border-blue-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Open Docket</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Branch Modal */}
      {isAddOpen && canManageBranches && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingBranchId ? 'Edit Branch Location' : 'Register New Branch Location'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Branch Name *</label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                    placeholder="e.g. Lira Regional Office"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">City / Station *</label>
                  <input
                    type="text"
                    required
                    value={formState.city}
                    onChange={(e) => setFormState((s) => ({ ...s, city: e.target.value }))}
                    placeholder="e.g. Lira"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Office Address</label>
                  <input
                    type="text"
                    value={formState.address}
                    onChange={(e) => setFormState((s) => ({ ...s, address: e.target.value }))}
                    placeholder="Plot & Street"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Station Phone</label>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(e) => setFormState((s) => ({ ...s, phone: e.target.value }))}
                    placeholder="+256 414 ..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Team Lead</label>
                  <input
                    type="text"
                    value={formState.teamLead}
                    onChange={(e) => setFormState((s) => ({ ...s, teamLead: e.target.value }))}
                    placeholder="Advocate Name"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Office Admin</label>
                  <input
                    type="text"
                    value={formState.officeAdmin}
                    onChange={(e) => setFormState((s) => ({ ...s, officeAdmin: e.target.value }))}
                    placeholder="Admin Name"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Registry Clerk</label>
                  <input
                    type="text"
                    value={formState.clerk}
                    onChange={(e) => setFormState((s) => ({ ...s, clerk: e.target.value }))}
                    placeholder="Clerk Name"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-xl font-semibold cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingBranchId ? 'Save Changes' : 'Create Branch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchesDirectory;
