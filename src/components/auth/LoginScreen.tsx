import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';

export interface LoginScreenProps {
  onLoginSuccess?: (data: { user: any; profile: any }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { login } = useApp();

  // Inputs strictly start completely blank with zero pre-fill or auto-signin bypass
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password request modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg(null);
    setResetError(null);
    const cleanReset = resetEmail.trim();
    if (!cleanReset) {
      setResetError('Please enter your registered staff email address.');
      return;
    }

    setResetLoading(true);
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/#type=recovery`
        : 'https://catalogue.mkadvocates.ug/#type=recovery';

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanReset, {
        redirectTo: redirectUrl,
      });

      if (resetErr) throw resetErr;

      setResetMsg('A password recovery email has been sent. Please check your inbox and click the recovery link.');
    } catch (err: any) {
      setResetError(err?.message || 'Failed to send recovery email. Please contact the Firm Administrator.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both your registered email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(cleanEmail, password);
      if (!result.success) {
        setErrorMessage(
          result.error ||
            'Authentication failed. Please verify your credentials or contact the Firm Administrator.'
        );
      } else {
        // Immediate redirect upon valid authentication response to the main dashboard route
        try {
          if (typeof window !== 'undefined' && window.history && window.history.pushState) {
            window.history.pushState(null, '', '/dashboard');
          }
        } catch (e) {}

        if (onLoginSuccess && result.user) {
          onLoginSuccess({ user: result.user, profile: result.user });
        }
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'An unexpected error occurred during sign-in. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans-legal">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Law Firm Executive Brand Logo & Centered Branding */}
        <div className="text-center">
          <img
            src="/logo.png"
            alt="Muhumuza - Kiiza Advocates & Legal Consultants"
            className="h-12 w-auto mx-auto mb-4 object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('/assets/logo.png')) {
                target.src = '/assets/logo.png';
              }
            }}
          />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Muhumuza - Kiiza Advocates &amp; Legal Consultants
          </h1>
        </div>

        {/* Login Container Card */}
        <div className="mt-8 bg-white py-8 px-6 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-200/80">
          <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Secure Legal Management Portal</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff Sign In &bull; Case Catalogue
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Canonical Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Authorised Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. counsel@mkadvocates.ug"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email.trim());
                    setResetMsg(null);
                    setResetError(null);
                    setIsResetModalOpen(true);
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer min-h-[42px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Firm Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Clean Footer */}
        <div className="mt-8 text-center text-xs text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>End-to-End Encrypted Session</span>
          </p>
          <p>&copy; {new Date().getFullYear()} Muhumuza - Kiiza Advocates &amp; Legal Consultants &bull; Kampala &bull; Fort Portal &bull; Mbarara &bull; Masaka &bull; Jinja</p>
        </div>
      </div>

      {/* Forgot Password Reset Request Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Reset Portal Password</h3>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Enter your registered firm email address to receive a secure password recovery link.
            </p>

            {resetMsg && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{resetMsg}</div>
              </div>
            )}

            {resetError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{resetError}</div>
              </div>
            )}

            {!resetMsg ? (
              <form onSubmit={handleSendResetEmail} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="counsel@mkadvocates.ug"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-3 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending link...' : 'Send Recovery Link'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
