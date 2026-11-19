import React, { useState, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as sharedSupabase } from '../../lib/supabase';
export { LoginScreen } from './LoginScreen';

// Reuse the single module-level client instance (never recreated on render)
function getSupabase(): SupabaseClient {
  return sharedSupabase;
}

export interface LoginFormProps {
  onSuccess?: (sessionUser: { id: string; email?: string | null }) => void;
  redirectTo?: string;
}

export default function LoginForm({ onSuccess, redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Guard against double-clicks / rapid duplicate submits
  const submittingRef = useRef(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current) return;

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMsg(error.message || 'Invalid email or password.');
        return;
      }

      if (data.user) {
        onSuccess?.({ id: data.user.id, email: data.user.email });
        if (redirectTo && typeof window !== 'undefined') {
          window.location.assign(redirectTo);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to sign in right now.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sign In</h1>
          <p className="text-xs text-gray-500 mt-1">
            Enter your account credentials to continue.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-gray-700 mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@firm.com"
              className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-gray-700 mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition cursor-pointer"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
