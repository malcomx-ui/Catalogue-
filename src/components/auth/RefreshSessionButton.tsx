import React, { useState } from 'react';
import { supabase, resolveUserRoleMeta } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export interface RefreshSessionButtonProps {
  compact?: boolean;
  autoReload?: boolean;
  onRefreshComplete?: (role: string) => void;
  className?: string;
}

export default function RefreshSessionButton({
  compact = false,
  autoReload = false,
  onRefreshComplete,
  className = '',
}: RefreshSessionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const { currentUser, setCurrentUser, refreshStaffFromSupabase } = useApp();

  const handleRefresh = async () => {
    setLoading(true);
    setMessage(null);
    setIsSuccess(null);

    try {
      // Forces Supabase to re-validate the token and grab the latest server-side metadata
      const { data, error } = await supabase.auth.refreshSession();

      if (error) throw error;

      const user = data.session?.user;
      let latestRole = user?.user_metadata?.role || user?.user_metadata?.role_id;

      // Simultaneously query public profiles table directly for authoritative fresh data
      let freshProfile: any = null;
      if (user?.id) {
        try {
          const { data: pData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          if (pData) {
            freshProfile = pData;
            if (pData.role) latestRole = pData.role;
          }
        } catch (pe) {}
      }

      const roleDisplay = latestRole || freshProfile?.role || 'Unknown';
      const successMsg = `Session refreshed successfully! Latest role: ${roleDisplay}`;
      setMessage(successMsg);
      setIsSuccess(true);

      // Keep AppContext & localStorage up to date immediately
      if (user) {
        const meta = resolveUserRoleMeta(
          freshProfile?.role || latestRole,
          user.user_metadata?.role_id,
          Boolean(user.user_metadata?.is_super_admin),
          user.email
        );

        const updatedUser = {
          ...currentUser,
          id: user.id,
          email: user.email || currentUser.email,
          name: freshProfile?.full_name || user.user_metadata?.full_name || currentUser.name,
          role: meta.role as any,
          roleId: meta.roleId,
          roleTitle: freshProfile?.role_title || meta.roleTitle,
          branchName: freshProfile?.branch || user.user_metadata?.branch_name || currentUser.branchName,
          isSuperAdmin: meta.isSuperAdmin,
          isBranchAdmin: meta.isBranchAdmin,
        };
        try {
          localStorage.setItem('mk_case_catalogue_user_v2', JSON.stringify(updatedUser));
          localStorage.setItem('mk_case_catalogue_auth_v2', 'true');
        } catch (e) {}
        setCurrentUser(updatedUser);
      }

      if (refreshStaffFromSupabase) {
        refreshStaffFromSupabase().catch(() => {});
      }

      if (onRefreshComplete) {
        onRefreshComplete(roleDisplay);
      }

      if (autoReload) {
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch (err: any) {
      setMessage(`Failed to refresh session: ${err.message || 'Unknown error'}`);
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-50"
          title="Force re-validate token and pull latest server metadata"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-indigo-500'}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh Session'}</span>
        </button>
        {message && (
          <div className={`text-[10px] px-2 py-1 rounded flex items-center gap-1 leading-tight ${
            isSuccess ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {isSuccess ? <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> : <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />}
            <span className="truncate">{message}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white rounded shadow max-w-sm border border-slate-200 ${className}`}>
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="w-full bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-xs"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        <span>{loading ? 'Refreshing Session...' : 'Refresh User Session'}</span>
      </button>
      {message && (
        <p className={`text-xs mt-2.5 flex items-center gap-1.5 ${
          isSuccess ? 'text-emerald-700 font-medium' : 'text-rose-600'
        }`}>
          {isSuccess ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}
