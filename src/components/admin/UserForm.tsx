import React, { useState } from 'react';

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

  // Determine role flags based on the selected roleId
  const isSystemAdmin = roleId === 'system_admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedBranch = branches.find((b) => b.id === branchId);

      const payload = {
        ...(initialData?.id ? { id: initialData.id } : {}),
        full_name: fullName,
        email: email,
        roleId: roleId,
        // System Admins don't need a specific branch restriction
        branch_id: isSystemAdmin ? null : branchId || null,
        branch_name: isSystemAdmin ? 'All Branches (Global)' : selectedBranch?.name || null,
        is_super_admin: isSystemAdmin,
        is_branch_admin: !isSystemAdmin,
      };

      await onSave(payload);
    } catch (error) {
      console.error('Failed to save user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-gray-900">
        {initialData?.id ? 'Edit User Profile' : 'Create New User'}
      </h2>

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Full Name</label>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
          placeholder="e.g. John Doe"
        />
      </div>

      {/* Email Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Email Address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
          placeholder="john@firm.com"
        />
      </div>

      {/* Role Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Administrative Role</label>
        <select
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none bg-white"
        >
          <option value="branch_admin">Branch Administrator (Restricted to Assigned Branch)</option>
          <option value="system_admin">System Administrator (Global Full Access)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {isSystemAdmin 
            ? '⚠️ Grants global control over all branches, firm settings, and user management.' 
            : '🔒 Restricts user operations strictly to their selected branch.'}
        </p>
      </div>

      {/* Branch Selector (Only shown for Branch Admins / Standard Staff) */}
      {!isSystemAdmin && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Assigned Branch</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            required={!isSystemAdmin}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none bg-white"
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
      <div className="flex justify-end space-x-3 pt-4">
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
          {loading ? 'Saving...' : 'Save User'}
        </button>
      </div>
    </form>
  );
};

export default UserForm;
