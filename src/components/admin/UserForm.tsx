import React, { useState, useEffect } from 'react';
import { showCleanMessage } from '../../utils/notification';
import { resolveBranchMeta } from '../../lib/supabase';

export interface UserFormProps {
  initialData?: {
    id?: string;
    full_name?: string;
    email?: string;
    roleId?: string;
    branch_id?: string;
    branch_name?: string;
  };
  branches: Array<{ id: string; name: string }>;
  onSave: (userData: any) => Promise<void>;
  onCancel: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({ initialData, branches, onSave, onCancel }) => {
  const defaultBranch =
    branches.find((b) => b.id === initialData?.branch_id) ||
    branches.find((b) => b.id === 'kla-hq') ||
    branches[0];
  const defaultBranchMeta = resolveBranchMeta(
    defaultBranch?.id || initialData?.branch_id || 'kla-hq',
    defaultBranch?.name || initialData?.branch_name
  );

  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [roleId, setRoleId] = useState(initialData?.roleId || 'branch_admin');
  const [branchId, setBranchId] = useState(defaultBranchMeta.id);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId || (branches.length > 0 && !branches.some((b) => b.id === branchId))) {
      const nextDefault =
        branches.find((b) => b.id === initialData?.branch_id) ||
        branches.find((b) => b.id === 'kla-hq') ||
        branches[0];
      if (nextDefault?.id) {
        setBranchId(nextDefault.id);
      }
    }
  }, [branches, branchId, initialData?.branch_id]);

  // Determine role flags based on the selected roleId
  const isSystemAdmin = roleId === 'system_admin' || roleId === 'super_admin' || roleId === 'role-super-admin';
  const isFinanceAssistant = roleId === 'admin_finance_assistant' || roleId === 'role-admin-finance-assistant';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const selectedBranch =
      branches.find((b) => b.id === branchId) ||
      branches.find((b) => b.id === 'kla-hq') ||
      branches[0];
    const resolvedBranch = resolveBranchMeta(
      selectedBranch?.id || branchId || 'kla-hq',
      selectedBranch?.name
    );

    if (!resolvedBranch.id || !resolvedBranch.name) {
      const msg = 'Active Branch Required: Please select a valid branch station before saving this user.';
      setErrorMsg(msg);
      showCleanMessage(msg, 'error');
      return;
    }

    setLoading(true);

    try {
      const canonicalBranchName = selectedBranch?.name || resolvedBranch.name;
      const payload = {
        ...(initialData?.id ? { id: initialData.id } : {}),
        full_name: fullName.trim(),
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        roleId: roleId,
        role: isSystemAdmin ? 'super_admin' : isFinanceAssistant ? 'admin_finance_assistant' : 'branch_admin',
        // Always assign a valid branch_id & matching branch_name from the mandatory branch selector
        branch_id: resolvedBranch.id,
        branch_name: canonicalBranchName,
        branchId: resolvedBranch.id,
        branchName: canonicalBranchName,
        branch: canonicalBranchName,
        is_super_admin: isSystemAdmin,
        is_branch_admin: !isSystemAdmin && !isFinanceAssistant,
      };

      await onSave(payload);
      showCleanMessage('User profile saved.', 'success');
    } catch (error: any) {
      console.error('Failed to save user:', error);
      const msg = error?.message || 'Failed to save user profile.';
      setErrorMsg(msg);
      showCleanMessage(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {initialData?.id ? 'Edit User Profile' : 'Create New User'}
      </h2>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 shadow-xs focus:border-blue-500 focus:outline-none"
          placeholder="e.g. John Doe"
        />
      </div>

      {/* Email Address */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 shadow-xs focus:border-blue-500 focus:outline-none"
          placeholder="john@firm.com"
        />
      </div>

      {/* Role Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Administrative Role</label>
        <select
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 shadow-xs focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="branch_admin">Branch Administrator (Restricted to Assigned Branch)</option>
          <option value="admin_finance_assistant">Admin &amp; Finance Assistant (View All, Edit Own Branch)</option>
          <option value="system_admin">System Administrator (Global Full Access)</option>
        </select>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isSystemAdmin
            ? 'Grants global control over all branches while assigning a home station branch_id for database integrity.'
            : isFinanceAssistant
            ? 'Allows viewing across all branches while restricting create, edit, and delete operations to the assigned branch.'
            : 'Restricts user operations strictly to their selected branch.'}
        </p>
      </div>

      {/* Mandatory Branch Selector (always active & defaulted so profile branch_id is never null) */}
      <div>
        <label htmlFor="user-form-branch" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Assigned Branch *
        </label>
        <select
          id="user-form-branch"
          name="branch"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          required
          className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 shadow-xs focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          {branches.length === 0 ? (
            <option value="kla-hq">Kampala Central (Head Office)</option>
          ) : (
            branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))
          )}
        </select>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Required home branch station written directly to the Supabase user profile.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-[#0B132B] rounded-xl hover:bg-[#000065] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : 'Save User'}
        </button>
      </div>
    </form>
  );
};

export default UserForm;
