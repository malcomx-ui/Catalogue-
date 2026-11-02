import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole } from '../../types';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Building2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authMode,
    setAuthMode,
    currentUser,
    setCurrentUser,
    availableUsers,
    branches,
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('lawyer');
  const [rollNo, setRollNo] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0].id);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = availableUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    );

    if (matched) {
      setCurrentUser(matched);
      setIsAuthModalOpen(false);
    } else {
      const customUser: User = {
        id: `user-${Date.now()}`,
        name: email.split('@')[0].toUpperCase(),
        email,
        role: 'lawyer',
        roleTitle: 'Litigation Lawyer',
        branchId: branches[0].id,
        branchName: branches[0].name,
        advocateRollNo: 'ULS/ADV/PENDING',
      };
      setCurrentUser(customUser);
      setIsAuthModalOpen(false);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const branch = branches.find((b) => b.id === selectedBranchId) || branches[0];
    
    let roleTitle = 'Litigation Lawyer';
    if (selectedRole === 'team_lead') roleTitle = `${branch.city} Team Lead`;
    if (selectedRole === 'office_admin') roleTitle = `${branch.city} Office Admin`;
    if (selectedRole === 'clerk') roleTitle = `${branch.city} Court & Registry Clerk`;

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: fullName,
      email,
      role: selectedRole,
      roleTitle,
      branchId: branch.id,
      branchName: branch.name,
      advocateRollNo: rollNo || undefined,
    };
    setCurrentUser(newUser);
    setIsAuthModalOpen(false);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(`Password reset instructions dispatched to ${email}.`);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('Master credentials successfully updated. You may now log in.');
    setTimeout(() => {
      setAuthMode('login');
      setStatusMsg(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="MK" className="w-7 h-7 object-contain" />
            <div>
              <span className="font-bold text-sm text-slate-900 block leading-tight">
                MK Case Catalogue
              </span>
              <span className="text-[10px] text-slate-500 block leading-tight">
                M-Law Sync Hub
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="p-5">
          {/* LOGIN VIEW */}
          {authMode === 'login' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Advocate Portal Sign In
                </h3>
                <p className="text-xs text-slate-500">
                  Access cases, cause lists, and regional dockets.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Firm Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. counsel@firm.ug or your email"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
                >
                  Sign In
                </button>
              </form>

              {/* Instant Quick Login by Exact Firm Role */}
              <div className="pt-3 border-t border-slate-100">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Test / Quick Switch by Role:
                </div>

                <div className="space-y-1.5">
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setCurrentUser(u);
                        setIsAuthModalOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-[10px] text-slate-500">{u.branchName}</div>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                        {u.roleTitle}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 text-center text-xs text-slate-500 border-t border-slate-100">
                <span className="text-slate-400">Account provisioning is restricted to the Super Admin.</span>
              </div>
            </div>
          )}

          {/* REGISTER VIEW - Strictly Restricted */}
          {authMode === 'register' && (
            <div className="space-y-4 text-xs text-center py-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  User Registration Restricted
                </h3>
                <p className="text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Only the Super Admin (Managing Partner) is authorized to set up and provision staff accounts in the Security &amp; Access Roles Center.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}

          {/* FORGOT & RESET */}
          {authMode === 'forgot' && (
            <div className="space-y-3 text-xs">
              <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Firm Email"
                  className="w-full border rounded p-2"
                />
                <button type="submit" className="w-full py-2 bg-slate-900 text-white rounded font-medium">
                  Send Reset Link
                </button>
              </form>
              <button onClick={() => setAuthMode('login')} className="text-blue-600">
                ← Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
