import React, { useState, useEffect } from 'react';
import { supabase, mapRowToCase, canUserModifyCase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { Lock, CheckCircle2, Search, Eye, Edit3 } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { RowActionMenu } from '../common/RowActionMenu';

export interface CasesPageProps {
  userSession?: {
    user?: any;
    profile?: {
      role?: string;
      branch?: string;
      full_name?: string;
    };
  };
}

export default function CasesPage({ userSession }: CasesPageProps) {
  const { currentUser, setSelectedCase } = useApp();
  const [cases, setCases] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Fallback to active app context user session if prop not supplied
  const effectiveUser = userSession?.user || currentUser;

  useEffect(() => {
    fetchCases();
  }, [searchQuery]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      let query = supabase.from('cases').select('*');

      // Comprehensive search across all key case identifiers and fields
      if (searchQuery.trim() !== '') {
        const term = `%${searchQuery.trim()}%`;
        // Search across standard fields
        query = query.or(
          `case_number.ilike.${term},` +
          `suit_number.ilike.${term},` +
          `title.ilike.${term},` +
          `client_name.ilike.${term},` +
          `lead_advocate.ilike.${term},` +
          `branch_name.ilike.${term},` +
          `status.ilike.${term}`
        );
      }

      // NOTE: Rule 1 enforces cross-branch transparency on SELECT:
      // All authenticated staff are permitted to view cases from any branch.
      // Modification operations (INSERT, UPDATE, DELETE) remain strictly branch-isolated.
      let { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.warn('Initial search query fallback to generic select:', error.message);
        const fallbackRes = await supabase.from('cases').select('*').order('created_at', { ascending: false });
        if (!fallbackRes.error && fallbackRes.data) {
          data = fallbackRes.data;
          error = null;
        }
      }

      if (error) throw error;

      // Normalize row fields for table display
      const normalized = (data || []).map((c: any) => ({
        ...c,
        case_number: c.case_number || c.suit_number || 'Suit Pending',
        suit_no: c.suit_no || '',
        case_title: c.case_title || c.title || 'Litigation Matter',
        client_name: c.client_name || c.client || 'Client',
        lawyer: c.lawyer || c.lead_advocate || c.person_in_conduct || 'Counsel Assigned',
        branch: c.branch || c.branch_name || 'Fort Portal Office',
        branch_name: c.branch_name || c.branch || 'Fort Portal Office',
        branch_id: c.branch_id || c.branchId,
        status: c.status || 'Active',
      }));

      setCases(normalized);
    } catch (error: any) {
      console.error('Error searching cases:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cases Directory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Global firm transparency · Read access across all branches · Mutations strictly branch-isolated
          </p>
        </div>

        {/* Search Bar Container */}
        <div className="w-full md:w-[420px]">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client, MK case no, suit no, lawyer, title..."
              className="block w-full pl-10 pr-10 py-2.5 border border-slate-200/80 dark:border-slate-700 rounded-xl leading-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-slate-900 shadow-xs rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">Searching records...</div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            No cases match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/80 dark:divide-slate-800 border-collapse">
              <thead className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                <tr className="divide-x divide-slate-200/60 dark:divide-slate-800">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">MK Case No</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Case Title</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Client</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lead Counsel</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Branch</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Access</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-14">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                {cases.map((c) => {
                  const canModify = canUserModifyCase(effectiveUser, c);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => {
                        if (setSelectedCase) {
                          setSelectedCase(mapRowToCase(c));
                        }
                      }}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer divide-x divide-slate-100/70 dark:divide-slate-800/70"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                        <div className="font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400" title="MK Case No.">
                          {c.case_number}
                        </div>
                        {c.suit_no && (
                          <div className="text-[10px] text-blue-700 dark:text-blue-400 font-mono tabular-nums font-medium truncate" title="Court Registry Suit No.">
                            Suit: {c.suit_no}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-900 dark:text-slate-100 font-medium max-w-xs truncate">
                        {c.case_title}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                        {c.client_name}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                        {c.lawyer}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {c.branch}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                        <StatusBadge status={c.status || 'Active'} />
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                        {canModify ? (
                          <StatusBadge
                            tone="emerald"
                            showDot={false}
                            icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            label="Full Access"
                          />
                        ) : (
                          <StatusBadge
                            tone="amber"
                            showDot={false}
                            icon={<Lock className="w-3 h-3 text-amber-600" />}
                            label="View Only"
                          />
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs">
                        <RowActionMenu
                          ariaLabel={`Actions for ${c.case_number}`}
                          items={[
                            {
                              id: 'inspect',
                              label: 'Inspect Dossier',
                              icon: <Eye className="w-3.5 h-3.5" />,
                              onClick: () => setSelectedCase?.(mapRowToCase(c)),
                            },
                            {
                              id: 'edit',
                              label: canModify ? 'Edit Matter' : 'Edit (View Only)',
                              icon: <Edit3 className="w-3.5 h-3.5" />,
                              disabled: !canModify,
                              disabledReason: 'Branch custody isolation: View-only outside assigned branch.',
                              onClick: () => setSelectedCase?.(mapRowToCase(c)),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
