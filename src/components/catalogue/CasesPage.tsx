import React, { useState, useEffect } from 'react';
import { supabase, mapRowToCase, canUserModifyCase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { Lock, CheckCircle2, Search, Building2, UserCheck } from 'lucide-react';

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
          <h1 className="text-2xl font-bold text-gray-900">Cases Directory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Global firm transparency · Read access across all branches · Mutations strictly branch-isolated
          </p>
        </div>

        {/* Search Bar Container */}
        <div className="w-full md:w-[420px]">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client, case no, lawyer, title..."
              className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-medium text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white shadow-2xs rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Searching records...</div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No cases match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Case No</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Case Title</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead Counsel</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Access & Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
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
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono font-bold text-indigo-600">
                        {c.case_number}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-900 font-medium max-w-xs truncate">
                        {c.case_title}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-600">
                        {c.client_name}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-600">
                        {c.lawyer}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {c.branch}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {c.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs">
                        {canModify ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Full Access
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200">
                            <Lock className="w-3 h-3 text-amber-600" />
                            View Only
                          </span>
                        )}
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
