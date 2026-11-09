import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase, handleSaveStaff } from '../../lib/supabase';
import {
  Lock,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Building2,
  Shield,
  ArrowRight,
  X,
} from 'lucide-react';

interface FirstLoginPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirstLoginPasswordModal: React.FC<FirstLoginPasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, setCurrentUser, updateUser } = useApp();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPass = password.trim();
    if (!cleanPass) {
      setError('Please enter a new password.');
      return;
    }
    if (cleanPass.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (cleanPass !== confirmPassword.trim()) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);
    try {
      // 1. Update Supabase Auth user password
      const { error: authErr } = await supabase.auth.updateUser({
        password: cleanPass,
        data: {
          must_change_password: false,
        },
      });

      if (authErr) throw authErr;

      // 2. Clear must_change_password flag in profiles table
      try {
        await supabase
          .from('profiles')
          .update({
            must_change_password: false,
            updated_at: new Date().toISOString(),
          })
          .eq('email', currentUser.email.toLowerCase());
      } catch (pe) {}

      // 3. Clear mustChangePassword in currentUser state while preserving branch and role
      const updatedUser = {
        ...currentUser,
        mustChangePassword: false,
        password: cleanPass,
      };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem('mk_advocates_current_user', JSON.stringify(updatedUser));
      } catch (e) {}

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Optionally skip for now, preserving full navigation and permissions
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans-legal animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 text-white relative">
          <button
            type="button"
            onClick={handleSkip}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            title="Skip for now"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/20">
                Security Notice
              </span>
              <h2 className="text-base sm:text-lg font-bold mt-1">First-Time Login Setup</h2>
            </div>
          </div>

          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Welcome, <strong>{currentUser.name}</strong>. Your account was provisioned with temporary credentials. You can set a private, permanent password now or continue to your dashboard.
          </p>
        </div>

        {/* Assigned Access Profile Card (Demonstrating Preserved Role & Branch) */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate font-semibold text-slate-900">
              {currentUser.roleTitle || currentUser.role}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">{currentUser.branchName}</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5">
          {success ? (
            <div className="text-center py-4 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Password Updated Successfully</h3>
              <p className="text-xs text-slate-500">
                Your credentials are secure. Launching your workstation workspace...
              </p>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new private password (min. 6 characters)"
                    className="w-full pl-3 pr-9 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type your new password"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  required
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{loading ? 'Securing Password...' : 'Save & Secure Account'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Continue to Portal
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
