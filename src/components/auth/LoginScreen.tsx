import React, { useState, useEffect } from 'react';
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
  Scale,
} from 'lucide-react';

export interface LoginScreenProps {
  onLoginSuccess?: (data: { user: any; profile: any }) => void;
}

const REMEMBER_ME_KEY = 'mk_portal_remember_me';
const REMEMBERED_EMAIL_KEY = 'mk_portal_remembered_email';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { login } = useApp();

  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Never pre-fill passwords; only restore remembered email if the user explicitly opted in previously
  const [email, setEmail] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(REMEMBER_ME_KEY) === 'true') {
        return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
      }
    } catch {
      // ignore storage errors
    }
    return '';
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [logoErrorStep, setLogoErrorStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password request modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (!rememberMe) {
        localStorage.removeItem(REMEMBER_ME_KEY);
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      } else {
        localStorage.setItem(REMEMBER_ME_KEY, 'true');
      }
    } catch {
      // ignore storage errors
    }
  }, [rememberMe]);

  const logoSrc =
    logoErrorStep === 0
      ? '/logo.png'
      : logoErrorStep === 1
      ? '/mk_firm_logo.png'
      : logoErrorStep === 2
      ? '/assets/logo.png'
      : '';

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg(null);
    setResetError(null);
    const cleanReset = resetEmail.trim();
    if (!cleanReset) {
      setResetError('Please enter your registered professional email address.');
      return;
    }

    setResetLoading(true);
    try {
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/#type=recovery`
          : 'https://catalogue.mkadvocates.ug/#type=recovery';

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanReset, {
        redirectTo: redirectUrl,
      });

      if (resetErr) throw resetErr;

      setResetMsg(
        'A password recovery link has been dispatched. Please check your firm inbox and follow the verification instructions.'
      );
    } catch (err: any) {
      setResetError(
        err?.message || 'Unable to send recovery email. Please contact the Firm Administrator.'
      );
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both your professional email address and password.');
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
        try {
          if (rememberMe) {
            localStorage.setItem(REMEMBER_ME_KEY, 'true');
            localStorage.setItem(REMEMBERED_EMAIL_KEY, cleanEmail);
          } else {
            localStorage.removeItem(REMEMBER_ME_KEY);
            localStorage.removeItem(REMEMBERED_EMAIL_KEY);
          }
        } catch {
          // ignore storage errors
        }

        try {
          if (typeof window !== 'undefined' && window.history && window.history.pushState) {
            window.history.pushState(null, '', '/dashboard');
          }
        } catch {
          // ignore history errors
        }

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

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen w-full font-sans bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 lg:grid lg:grid-cols-12">
      {/* Left Panel: Corporate Law Firm Identity & Architectural Hero */}
      <aside className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between bg-slate-950 text-white px-12 py-12 xl:px-16 xl:py-14 overflow-hidden select-none">
        {/* Subtle Architectural Grid & Classical Columns Linework */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 18% 22%, rgba(30, 58, 138, 0.28) 0%, transparent 52%),
              radial-gradient(circle at 85% 82%, rgba(15, 23, 42, 0.9) 0%, transparent 60%),
              linear-gradient(to right, rgba(148, 163, 184, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148, 163, 184, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 100% 100%, 64px 64px, 64px 64px',
          }}
        />
        {/* Architectural Vertical Fluting Accent on Right Edge */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-slate-700/60 to-transparent"
        />

        {/* Top Firm Crest & Brand Lockup */}
        <header className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/95 p-1.5 flex items-center justify-center shrink-0 shadow-sm">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="Muhumuza - Kiiza Advocates & Legal Consultants crest"
                referrerPolicy="no-referrer"
                onError={() => setLogoErrorStep((s) => s + 1)}
                className="w-full h-full object-contain"
              />
            ) : (
              <Scale className="w-6 h-6 text-slate-900" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight text-white truncate">
              Muhumuza - Kiiza Advocates
            </p>
            <p className="text-xs text-slate-400 tracking-wide">
              Advocates &amp; Legal Consultants
            </p>
          </div>
        </header>

        {/* Center Editorial Brand Statement */}
        <div className="relative z-10 max-w-xl my-auto py-12 space-y-5">
          <div className="space-y-2">
            <h1
              className="text-3xl xl:text-4xl font-semibold tracking-tight text-white leading-[1.15]"
              style={{ textWrap: 'balance' }}
            >
              MK Case Catalogue
            </h1>
            <p className="text-base xl:text-lg font-medium text-amber-300/95 tracking-tight">
              Centralized Practice Management Hub
            </p>
          </div>

          <p className="text-sm xl:text-base text-slate-300 leading-relaxed max-w-lg">
            Secure, role-based workflow administration for modern legal practice management,
            litigation tracking, and mortgage portfolio registry.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          {/* Bottom Practice Pillars & Regional Chambers */}
          <div className="pt-8 border-t border-white/10">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-semibold text-white">Litigation &amp; Cause Lists</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Real-time court diaries, pleadings &amp; progressive matter trails
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Banking &amp; Securities</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Perfected mortgage custody, disbursements &amp; billing ledgers
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Regional Chambers</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Kampala HQ · Fort Portal · Mbarara · Masaka · Jinja
                </p>
              </div>
            </div>
          </div>

          {/* Footer Security Badge */}
          <footer className="pt-4 border-t border-white/10">
            <div className="flex items-center gap-2.5 text-xs text-slate-300 tracking-wide">
              <Lock className="w-3.5 h-3.5 text-amber-400/90 shrink-0" />
              <span>256-Bit Encrypted Portal — Authorized Personnel Only</span>
            </div>
          </footer>
        </div>
      </aside>

      {/* Right Panel: High-Contrast Authentication Form */}
      <main className="min-h-screen lg:col-span-6 xl:col-span-5 flex flex-col justify-between bg-slate-50/70 dark:bg-slate-950 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 xl:px-16">
        {/* Compact Mobile Brand Header (hidden on desktop where left panel renders) */}
        <div className="lg:hidden flex items-center gap-3 pb-6 border-b border-slate-200/80 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-1.5 flex items-center justify-center shrink-0">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="Muhumuza - Kiiza Advocates & Legal Consultants"
                referrerPolicy="no-referrer"
                onError={() => setLogoErrorStep((s) => s + 1)}
                className="w-full h-full object-contain"
              />
            ) : (
              <Scale className="w-5 h-5 text-slate-900 dark:text-slate-100" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              MK Case Catalogue
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Centralized Practice Management Hub
            </p>
          </div>
        </div>

        {/* Centered Sign-In Surface */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-8 lg:py-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="space-y-1.5 mb-7">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Welcome Back
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Please sign in to your branch workspace to continue.
              </p>
            </div>

            {/* Authentication Error Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Professional Email */}
              <div>
                <label
                  htmlFor="login-professional-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  Professional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-professional-email"
                    type="email"
                    required
                    autoFocus={!email}
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@mkadvocates.ug"
                    className="w-full bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300 focus:border-slate-900 dark:focus:border-slate-300 transition-shadow"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus={Boolean(email)}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-11 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300 focus:border-slate-900 dark:focus:border-slate-300 transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember this device & Forgot password? */}
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none min-h-[28px]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-slate-900 focus:ring-2 focus:ring-slate-900 focus:ring-offset-0 cursor-pointer accent-slate-900"
                  />
                  <span>Remember this device</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email.trim());
                    setResetMsg(null);
                    setResetError(null);
                    setIsResetModalOpen(true);
                  }}
                  className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded px-1 py-0.5 cursor-pointer whitespace-nowrap"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950 text-white font-semibold py-3 px-5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-55 cursor-pointer min-h-[46px] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Enterprise Security Assurance Line */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>256-Bit Encrypted Portal — Authorized Personnel Only</span>
              </div>
            </form>
          </div>
        </div>

        {/* Institutional Compliance & Copyright Footer */}
        <footer className="pt-6 border-t border-slate-200/70 dark:border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            &copy; {currentYear} MK Advocates. All rights reserved.
          </p>
        </footer>
      </main>

      {/* Forgot Password Reset Request Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200/90 dark:border-slate-800"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h3
                  id="reset-modal-title"
                  className="text-sm font-semibold text-slate-900 dark:text-slate-100"
                >
                  Recover Portal Access
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 cursor-pointer"
                aria-label="Close recovery modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3.5 leading-relaxed">
              Enter your registered professional email address to receive an encrypted password
              recovery link.
            </p>

            {resetMsg && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{resetMsg}</div>
              </div>
            )}

            {resetError && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{resetError}</div>
              </div>
            )}

            {!resetMsg ? (
              <form onSubmit={handleSendResetEmail} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="reset-professional-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Registered Professional Email
                  </label>
                  <input
                    id="reset-professional-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="counsel@mkadvocates.ug"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300 focus:border-slate-900"
                  />
                </div>

                <div className="pt-1 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {resetLoading ? 'Dispatching Link...' : 'Send Recovery Link'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Return to Sign In
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
