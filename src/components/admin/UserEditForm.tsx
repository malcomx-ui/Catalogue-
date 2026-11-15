import React, { useState } from 'react';
import { showCleanMessage } from '../../utils/notification';

export interface UserEditFormProps {
  initialData: {
    id: string;
    full_name: string;
    email: string;
    roleId?: string;
    branch_id?: string;
    can_manage_cases?: boolean;
    can_manage_clients?: boolean;
    can_manage_finances?: boolean;
    can_manage_users?: boolean;
    can_view_reports?: boolean;
    can_manage_settings?: boolean;
  };
  branches: Array<{ id: string; name: string }>;
  onSave: (updatedData: any) => Promise<void>;
  onCancel: () => void;
}

export const UserEditForm: React.FC<UserEditFormProps> = ({ initialData, branches, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    full_name: initialData.full_name || '',
    branch_id: initialData.branch_id || '',
    can_manage_cases: initialData.can_manage_cases ?? true,
    can_manage_clients: initialData.can_manage_clients ?? true,
    can_manage_finances: initialData.can_manage_finances ?? false,
    can_manage_users: initialData.can_manage_users ?? false,
    can_view_reports: initialData.can_view_reports ?? true,
    can_manage_settings: initialData.can_manage_settings ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCheckboxChange = (field: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await onSave({
        id: initialData.id,
        ...formData,
      });
      showCleanMessage('Staff permissions updated.', 'success');
    } catch (error: any) {
      console.error('Failed to update individual permissions:', error);
      const msg = error?.message || 'Failed to update individual permissions.';
      setErrorMsg(msg);
      showCleanMessage(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs max-w-xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Edit Individual Access & Permissions</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">User: {initialData.email} ({initialData.full_name})</p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Branch Assignment */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Assigned Branch</label>
        <select
          value={formData.branch_id}
          onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
          className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 shadow-xs focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="">-- Select Branch --</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Granular Permission Toggles */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Granular Access Permissions</h3>
        
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={formData.can_manage_cases}
              onChange={() => handleCheckboxChange('can_manage_cases')}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Manage Cases</span>
          </label>

          <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={formData.can_manage_clients}
              onChange={() => handleCheckboxChange('can_manage_clients')}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Manage Clients</span>
          </label>

          <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={formData.can_manage_finances}
              onChange={() => handleCheckboxChange('can_manage_finances')}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Manage Finances & Billing</span>
          </label>

          <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={formData.can_manage_users}
              onChange={() => handleCheckboxChange('can_manage_users')}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Manage Users & Staff</span>
          </label>

          <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={formData.can_view_reports}
              onChange={() => handleCheckboxChange('can_view_reports')}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">View Reports</span>
          </label>

          <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={formData.can_manage_settings}
              onChange={() => handleCheckboxChange('can_manage_settings')}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">System Settings</span>
          </label>
        </div>
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
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving Permissions...' : 'Save Permissions'}
        </button>
      </div>
    </form>
  );
};

export default UserEditForm;
