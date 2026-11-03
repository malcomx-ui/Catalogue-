import React, { useState } from 'react';
import { User, Branch, CustomRole } from '../../types';
import {
  UserCheck,
  Building2,
  Mail,
  Key,
  Shield,
  X,
  Check,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  FileBadge,
} from 'lucide-react';

interface EditStaffModalProps {
  user: User;
  roles: CustomRole[];
  branches: Branch[];
  onSave: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onClose: () => void;
  onOpenWelcomePackage?: (updatedUser: User) => void;
}

export const EditStaffModal: React.FC<EditStaffModalProps> = ({
  user,
  roles,
  branches,
  onSave,
  onClose,
  onOpenWelcomePackage,
}) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState(user.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [roleId, setRoleId] = useState(user.roleId || roles[3]?.id || 'role-advocate');
  const [branchId, setBranchId] = useState(user.branchId || branches[0]?.id || 'kla-hq');
  const [rollNo, setRollNo] = useState(user.advocateRollNo || '');
  const [mustChangePassword, setMustChangePassword] = useState(user.mustChangePassword ?? false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError('Staff name and email address are required.');
      return;
    }

    const updates: Partial<User> = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      roleId,
      branchId,
      advocateRollNo: rollNo.trim() || undefined,
      mustChangePassword,
    };

    if (password.trim() !== '') {
      if (password.trim().length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      updates.password = password.trim();
    }

    setIsSaving(true);
    try {
      const result = await onSave(updates);
      if (result.success) {
        setSavedSuccess(true);
        setTimeout(() => {
          if (onOpenWelcomePackage) {
            const updatedUserObj: User = {
              ...user,
              ...updates,
              name: name.trim(),
              email: email.trim().toLowerCase(),
              password: password.trim() || user.password,
            };
            onOpenWelcomePackage(updatedUserObj);
          } else {
            onClose();
          }
        }, 350);
      } else {
        setError(result.error || 'Failed to update staff user in Supabase.');
      }
    } catch (err: any) {
      setError(err?.message || 'Database update failed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Edit Staff Account</h2>
                {user.isSuperAdmin && (
                  <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-400/30 px-2 py-0.5 rounded-full font-bold">
                    Super Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Update credentials, name, password, and station assignment for {user.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Staff account details updated and synchronized to central database!</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Staff Full Name & Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Counsel Brenda Kyomugisha"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Authorised Login Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="counsel@firm.ug"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>
          </div>

          {/* Password (Editable / Reset) */}
          <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-900 font-bold flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-600" />
                <span>Account Password (Change / Reset)</span>
              </label>
              <span className="text-[10px] text-amber-800 font-mono">Min. 6 chars</span>
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave as-is or enter new password"
                className="w-full bg-white border border-amber-300 rounded-lg pl-9 pr-10 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-700 pt-1">
              <input
                type="checkbox"
                checked={mustChangePassword}
                onChange={(e) => setMustChangePassword(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Require user to set a new password on their next login</span>
            </label>
          </div>

          {/* Assigned Role & Station Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Assigned Access Role
              </label>
              <select
                disabled={user.isSuperAdmin}
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 disabled:opacity-60 focus:outline-none focus:border-slate-900"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Branch / Circuit Station
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Advocate Roll / Bar No */}
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
              <span>Advocate Roll / Bar No. (Optional)</span>
              <span className="text-[10px] text-slate-400 font-normal">ULS Practicing Roll</span>
            </label>
            <div className="relative">
              <FileBadge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="e.g. ULS/ADV/2026/089"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white font-mono"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Saving to Supabase...</span>
                </>
              ) : (
                <span>Save Changes &amp; Sync</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
