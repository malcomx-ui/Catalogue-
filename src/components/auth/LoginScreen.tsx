import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import LoginForm from './LoginForm';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Info,
  KeyRound,
  UserCheck,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, availableUsers, updateUserPassword, handleLoginSuccess } = useApp();

  const [useMinimalLoginForm, setUseMinimalLoginForm] = useState(false);
  const [identifier, setIdentifier] = useState('infosightug@gmail.com');
  const [password, setPassword] = useState('Admin@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // First-time login mandatory password change state
  const [isFirstTimePasswordChange, setIsFirstTimePasswordChange] = useState(false);
  const [targetUserToChangePass, setTargetUserToChangePass] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const superAdmin = availableUsers.find((u) => u.isSuperAdmin) || availableUsers[0];

  // Auto-detect invite or email query param from welcome email link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      if (emailParam) {
        setIdentifier(emailParam);
        setPassword('');
        setInfoMessage('Welcome to the firm litigation portal! Enter your temporary password from your onboarding email to set your permanent password.');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);

    try {
      const result = await login(identifier, password);
      setIsLoading(false);
      if (!result.success) {
        setErrorMessage(result.error || 'Authentication failed. Please verify your credentials or contact the Super Admin.');
      } else if (result.requirePasswordChange && result.user) {
        setTargetUserToChangePass(result.user);
        setIsFirstTimePasswordChange(true);
        setNewPassword('');
        setConfirmPassword('');
        setErrorMessage(null);
        setInfoMessage(null);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Authentication error.');
    }
  };

  const handleSetPermanentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-type your confirm password.');
      return;
    }

    if (targetUserToChangePass) {
      setIsLoading(true);
      const updateRes = await updateUserPassword(targetUserToChangePass.id, newPassword);
      if (updateRes.success) {
        // Log in with new permanent password
        await login(targetUserToChangePass.email, newPassword);
        setIsLoading(false);
      } else {
        setIsLoading(false);
        setErrorMessage(updateRes.error || 'Failed to update permanent password.');
      }
    }
  };

  const handleQuickLogin = async (email: string, pass: string) => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIdentifier(email);
    setPassword(pass);
    setIsLoading(true);

    try {
      await login(email, pass);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setErrorMessage(null);
    setInfoMessage(
      'Account credentials and access provisioning are managed exclusively by the Super Admin. Please contact the Firm Administrator at infosightug@gmail.com to request access or reset your credentials.'
    );
  };

  if (useMinimalLoginForm) {
    return (
      <div className="relative">
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setUseMinimalLoginForm(false)}
            className="text-xs font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
          >
            &larr; Switch to Firm Portal View
          </button>
        </div>
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Simple Brand Header */}
        <div className="text-center">
          <img
            src="/logo.png"
            alt="MK Advocates"
            className="w-12 h-12 object-contain mx-auto mb-3"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            MK Advocates
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Litigation Case Catalogue &amp; Branch Portal
          </p>
        </div>

        {/* Clean Light-Mode Card */}
        <div className="mt-6 bg-white border border-slate-200/90 rounded-xl shadow-xs p-5 sm:p-8">
          {/* Security Banner: Authorized Staff Only */}
          {!isFirstTimePasswordChange && (
            <div className="mb-5 p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold block text-amber-950">Authorized Personnel Only</span>
                User registration is restricted. Only the Super Admin can set up and authorize firm user accounts.
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{infoMessage}</span>
            </div>
          )}

          {/* VIEW A: First-Time Login Password Change */}
          {isFirstTimePasswordChange ? (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>First-Time Login: Set Your Permanent Password</span>
                </div>
                <p className="text-[11px] text-indigo-900 leading-relaxed">
                  Welcome, <strong>{targetUserToChangePass?.name}</strong> ({targetUserToChangePass?.email}). You logged in with a temporary password. As per firm security policy, please choose your personal permanent password to proceed.
                </p>
              </div>

              <form onSubmit={handleSetPermanentPassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Permanent Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new permanent password"
                      className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-10 py-2.5 text-sm sm:text-xs text-slate-900 focus:outline-none focus:border-slate-900 min-h-[42px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Permanent Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new permanent password"
                      className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm sm:text-xs text-slate-900 focus:outline-none focus:border-slate-900 min-h-[42px]"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm sm:text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px] shadow-xs"
                  >
                    <span>{isLoading ? 'Saving Password...' : 'Save Password & Enter Firm Portal'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFirstTimePasswordChange(false);
                      setTargetUserToChangePass(null);
                    }}
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* VIEW B: Standard Sign In */
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Authorised Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. counsel@firm.ug"
                      className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors min-h-[42px]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-700">
                      Password / Temporary Password
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-slate-500 hover:text-slate-800 transition-colors py-1"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password or temporary password"
                      className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-10 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors min-h-[42px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1.5"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>Remember this workstation</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm sm:text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
                </button>
              </form>

              {/* Fast Workstation Role Switcher for Testing */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  1-Click Role Testing (Permanent Supabase Staff)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('infosightug@gmail.com', 'Admin@2026')}
                    disabled={isLoading}
                    className="w-full text-left bg-purple-50 hover:bg-purple-100 text-purple-950 p-2 rounded-lg text-[11px] border border-purple-200 transition-colors"
                  >
                    <div className="font-semibold flex items-center justify-between">
                      <span>Managing Partner</span>
                      <span className="text-[9px] bg-purple-200 px-1 rounded font-mono">GLOBAL</span>
                    </div>
                    <div className="text-[10px] text-purple-700 font-mono truncate">infosightug@gmail.com</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('sarah.namatovu@mkadvocates.ug', 'Lawyer@2026')}
                    disabled={isLoading}
                    className="w-full text-left bg-emerald-50 hover:bg-emerald-100 text-emerald-950 p-2 rounded-lg text-[11px] border border-emerald-200 transition-colors"
                  >
                    <div className="font-semibold flex items-center justify-between">
                      <span>Trial Advocate (Lawyer)</span>
                      <span className="text-[9px] bg-emerald-200 px-1 rounded font-mono">GLOBAL</span>
                    </div>
                    <div className="text-[10px] text-emerald-700 font-mono truncate">sarah.namatovu@...</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin.fortportal@mkadvocates.ug', 'Branch@2026')}
                    disabled={isLoading}
                    className="w-full text-left bg-indigo-50 hover:bg-indigo-100 text-indigo-950 p-2 rounded-lg text-[11px] border border-indigo-200 transition-colors"
                  >
                    <div className="font-semibold flex items-center justify-between">
                      <span>Branch Administrator</span>
                      <span className="text-[9px] bg-indigo-200 px-1 rounded font-mono">BRANCH</span>
                    </div>
                    <div className="text-[10px] text-indigo-700 font-mono truncate">admin.fortportal@...</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('clerk.fortportal@mkadvocates.ug', 'Clerk@2026')}
                    disabled={isLoading}
                    className="w-full text-left bg-slate-100 hover:bg-slate-200 text-slate-900 p-2 rounded-lg text-[11px] border border-slate-200 transition-colors"
                  >
                    <div className="font-semibold flex items-center justify-between">
                      <span>Registry Clerk</span>
                      <span className="text-[9px] bg-slate-200 px-1 rounded font-mono">BRANCH</span>
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono truncate">clerk.fortportal@...</div>
                  </button>
                </div>

                <div className="text-center pt-2 text-[11px] text-slate-400">
                  Branch staff have full CRUD permissions specifically for their assigned branch.
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setUseMinimalLoginForm(true)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline transition-colors cursor-pointer"
          >
            Switch to Standalone Supabase LoginForm &rarr;
          </button>
        </div>

        {/* Clean, quiet footer */}
        <div className="mt-8 text-center text-xs text-slate-400 space-y-1">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Confidential Litigation System · Sole Super Admin Authority</span>
          </div>
          <p>&copy; {new Date().getFullYear()} MK Advocates &bull; Uganda National Circuit</p>
        </div>
      </div>
    </div>
  );
};
