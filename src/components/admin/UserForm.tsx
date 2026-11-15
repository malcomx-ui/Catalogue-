import React, { useState } from 'react';
import { showCleanMessage } from '../../utils/notification';

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
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [roleId, setRoleId] = useState(initialData?.roleId || 'branch_admin');
  const [branchId, setBranchId] = useState(initialData?.branch_id || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Determine role flags based on the selected roleId
  const isSystemAdmin = roleId === 'system_admin' || roleId === 'super_admin' || roleId === 'role-super-admin';
  const isFinanceAssistant = roleId === 'admin_finance_assistant' || roleId === 'role-admin-finance-assistant';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const selectedBranch = branches.find((b) => b.id === branchId);

      const payload = {
        ...(initialData?.id ? { id: initialData.id } : {}),
        full_name: fullName,
        email: email,
        roleId: roleId,
        role: isSystemAdmin ? 'super_admin' : isFinanceAssistant ? 'admin_finance_assistant' : 'branch_admin',
        // System Admins don't need a specific branch restriction
        branch_id: isSystemAdmin ? null : branchId || null,
        branch_name: isSystemAdmin ? 'All Branches (Global)' : selectedBranch?.name || null,
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
            ? 'Grants global control over all branches, firm settings, and user management.'
            : isFinanceAssistant
            ? 'Allows viewing across all branches while restricting create, edit, and delete operations to the assigned branch.'
            : 'Restricts user operations strictly to their selected branch.'}
        </p>
      </div>

      {/* Branch Selector (Only shown for Branch Admins / Standard Staff) */}
      {!isSystemAdmin && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Assigned Branch</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            required={!isSystemAdmin}
            className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 shadow-xs focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">-- Select Branch --</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      )}

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
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : 'Save User'}
        </button>
      </div>
    </form>
  );
};

export default UserForm;
