import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export interface UpdatePasswordPageProps {
  onPasswordUpdated?: () => void;
  onCancel?: () => void;
  router?: { push: (path: string) => void };
}

export default function UpdatePasswordPage({ onPasswordUpdated, onCancel, router }: UpdatePasswordPageProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if URL hash indicates a password recovery token
    const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
    const search = typeof window !== 'undefined' ? window.location.search || '' : '';
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      setMessage('You can now enter your new password.');
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMessage('You can now enter your new password.');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('Password updated! Redirecting...');
      setTimeout(() => {
        if (router?.push) {
          router.push('/login');
        } else if (onPasswordUpdated) {
          onPasswordUpdated();
        } else if (typeof window !== 'undefined') {
          window.location.hash = '';
          window.location.pathname = '/';
        }
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-6 bg-white dark:bg-slate-900 p-6 shadow-xs border border-slate-200/80 dark:border-slate-800 rounded-2xl">
        {/* Compact Strictly Confidential Badge */}
        <div className="text-center">
          <span className="inline-block text-xs font-medium tracking-wide text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-800/80 uppercase">
            Strictly Confidential
          </span>
          <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">Set New Password</h2>
        </div>

        <form className="space-y-4" onSubmit={handleUpdatePassword}>
          <div>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {error && <p className="text-xs text-rose-600 dark:text-rose-400 text-center">{error}</p>}
          {message && <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
