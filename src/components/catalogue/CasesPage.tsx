import React, { useState, useEffect } from 'react';
import { supabase, mapRowToCase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

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
  const effectiveSession = userSession || {
    user: currentUser,
    profile: {
      role: currentUser?.role,
      branch: currentUser?.branchName,
      full_name: currentUser?.name,
    },
  };

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
        // Try exact ilike query with user-requested fields
        query = query.or(
          `case_number.ilike.${term},` +
          `case_title.ilike.${term},` +
          `client_name.ilike.${term},` +
          `lawyer.ilike.${term},` +
          `branch.ilike.${term},` +
          `status.ilike.${term}`
        );
      }

      // Automatically scope branch staff to their own branch
      const role = effectiveSession?.profile?.role;
      const isBranchStaff = role === 'branch_staff' || role === 'clerk' || role === 'office_admin' || !effectiveSession?.user?.isSuperAdmin && role !== 'admin' && role !== 'partner' && role !== 'lawyer' && role !== 'team_lead';

      if (isBranchStaff && effectiveSession?.profile?.branch) {
        query = query.eq('branch', effectiveSession.profile.branch);
      }

      let { data, error } = await query.order('created_at', { ascending: false });

      // If initial search threw an error (e.g. if column names are title/lead_advocate instead of case_title/lawyer)
      if (error) {
        console.warn('Initial search query fallback to schema fields:', error.message);
        let fallbackQuery = supabase.from('cases').select('*');

        if (searchQuery.trim() !== '') {
          const term = `%${searchQuery.trim()}%`;
          fallbackQuery = fallbackQuery.or(
            `case_number.ilike.${term},` +
            `suit_number.ilike.${term},` +
            `title.ilike.${term},` +
            `client_name.ilike.${term},` +
            `lead_advocate.ilike.${term},` +
            `branch_name.ilike.${term},` +
            `status.ilike.${term}`
          );
        }

        if (isBranchStaff && effectiveSession?.profile?.branch) {
          const b = effectiveSession.profile.branch;
          fallbackQuery = fallbackQuery.or(`branch.eq.${b},branch_name.ilike.%${b}%`);
        }

        const fallbackRes = await fallbackQuery.order('created_at', { ascending: false });
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cases Directory</h1>
          <p className="text-sm text-gray-500">
            Search by client, case number, lawyer, title, branch, or status.
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="w-full md:w-[420px]">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all fields (Client, No., Lawyer, Title)..."
              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-sm font-medium text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Searching records...</div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No cases match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Case No</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Case Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lawyer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => {
                      if (setSelectedCase) {
                        setSelectedCase(mapRowToCase(c));
                      }
                    }}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-indigo-600">{c.case_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.case_title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.client_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.lawyer}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {c.branch}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        {c.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
