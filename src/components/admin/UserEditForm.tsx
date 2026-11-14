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
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Edit Individual Access & Permissions</h2>
        <p className="text-sm text-gray-500">User: {initialData.email} ({initialData.full_name})</p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Branch Assignment */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Assigned Branch</label>
        <select
          value={formData.branch_id}
          onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none bg-white"
        >
          <option value="">-- Select Branch --</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Granular Permission Toggles */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Granular Access Permissions</h3>
        
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={formData.can_manage_cases}
              onChange={() => handleCheckboxChange('can_manage_cases')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Manage Cases</span>
          </label>

          <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={formData.can_manage_clients}
              onChange={() => handleCheckboxChange('can_manage_clients')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Manage Clients</span>
          </label>

          <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={formData.can_manage_finances}
              onChange={() => handleCheckboxChange('can_manage_finances')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Manage Finances & Billing</span>
          </label>

          <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={formData.can_manage_users}
              onChange={() => handleCheckboxChange('can_manage_users')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Manage Users & Staff</span>
          </label>

          <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={formData.can_view_reports}
              onChange={() => handleCheckboxChange('can_view_reports')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">View Reports</span>
          </label>

          <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={formData.can_manage_settings}
              onChange={() => handleCheckboxChange('can_manage_settings')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">System Settings</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving Permissions...' : 'Save Permissions'}
        </button>
      </div>
    </form>
  );
};

export default UserEditForm;
