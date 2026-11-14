import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CaseItem } from '../../types';
import { getEffectiveUser } from '../../lib/supabase';
import { isCaseClosedOrArchived } from '../../utils/legalTeam';
import {
  Users,
  Search,
  Building2,
  Briefcase,
  ChevronRight,
  Scale,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

interface ClientSummary {
  name: string;
  normalizedKey: string;
  partyTypes: string[];
  branches: string[];
  leadCounsel: string[];
  totalMatters: number;
  activeMatters: number;
  closedMatters: number;
  totalClaimUGX: number;
  cases: CaseItem[];
}

export const ClientsDirectory: React.FC = () => {
  const {
    cases,
    branches,
    selectedBranchFilter,
    setSelectedBranchFilter,
    userPermissions,
    currentUser,
    setSelectedCase,
    setSearchQuery,
    navigateToRoute,
  } = useApp();

  const [clientSearch, setClientSearch] = useState('');
  const [statusScope, setStatusScope] = useState<'all' | 'active' | 'closed'>('all');
  const [expandedClientKey, setExpandedClientKey] = useState<string | null>(null);

  const effectiveUser = getEffectiveUser(currentUser);

  const branchScopedCases = useMemo(() => {
    const activeBranchId = userPermissions.canViewAllBranches
      ? selectedBranchFilter
      : (effectiveUser?.branchId || currentUser?.branchId || 'all');

    if (activeBranchId === 'all') return cases;

    const targetBranch = branches.find((b) => b.id === activeBranchId);
    const targetCity = (targetBranch?.city || '').toLowerCase();
    const targetName = (targetBranch?.name || effectiveUser?.branchName || '').toLowerCase();

    return cases.filter((c) => {
      const bId = c.branchId;
      const bName = (c.branch || c.branchName || '').toLowerCase();
      return (
        (activeBranchId && bId === activeBranchId) ||
        (targetCity && bName.includes(targetCity)) ||
        (targetName && bName.includes(targetName))
      );
    });
  }, [cases, branches, selectedBranchFilter, userPermissions.canViewAllBranches, effectiveUser?.branchId, effectiveUser?.branchName, currentUser?.branchId]);

  const clients = useMemo(() => {
    const map = new Map<string, ClientSummary>();

    const registerClient = (rawName: string, partyType: string, c: CaseItem) => {
      const cleanName = rawName.trim();
      if (!cleanName || cleanName === '-' || cleanName.toLowerCase() === 'unknown') return;
      const key = cleanName.toLowerCase().replace(/\s+/g, ' ');

      let summary = map.get(key);
      if (!summary) {
        summary = {
          name: cleanName,
          normalizedKey: key,
          partyTypes: [],
          branches: [],
          leadCounsel: [],
          totalMatters: 0,
          activeMatters: 0,
          closedMatters: 0,
          totalClaimUGX: 0,
          cases: [],
        };
        map.set(key, summary);
      }

      if (!summary.cases.some((existing) => existing.id === c.id)) {
        summary.cases.push(c);
        summary.totalMatters += 1;
        if (isCaseClosedOrArchived(c)) {
          summary.closedMatters += 1;
        } else {
          summary.activeMatters += 1;
        }
        summary.totalClaimUGX += Number(c.claimValueUGX || 0);
      }

      if (partyType && !summary.partyTypes.includes(partyType)) {
        summary.partyTypes.push(partyType);
      }
      const br = (c.branchName || c.branch || '').trim();
      if (br && !summary.branches.includes(br)) {
        summary.branches.push(br);
      }
      const lead = (c.leadAdvocate || '').trim();
      if (lead && !summary.leadCounsel.includes(lead)) {
        summary.leadCounsel.push(lead);
      }
    };

    branchScopedCases.forEach((c) => {
      const representedParties = (c.parties || []).filter((p) => p.representedByFirm && p.name);
      if (representedParties.length > 0) {
        representedParties.forEach((p) => registerClient(p.name, p.type, c));
      } else if (c.clientName || c.client) {
        registerClient(String(c.clientName || c.client), 'Firm Client', c);
      } else if (c.title) {
        const vsSplit = c.title.split(/\s+v\.?\s+|\s+vs\.?\s+/i);
        if (vsSplit[0]) {
          registerClient(vsSplit[0], 'Party on Record', c);
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.activeMatters !== a.activeMatters) return b.activeMatters - a.activeMatters;
      if (b.totalMatters !== a.totalMatters) return b.totalMatters - a.totalMatters;
      return a.name.localeCompare(b.name);
    });
  }, [branchScopedCases]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    return clients.filter((cl) => {
      if (statusScope === 'active' && cl.activeMatters === 0) return false;
      if (statusScope === 'closed' && cl.closedMatters === 0) return false;
      if (!q) return true;
      return (
        cl.name.toLowerCase().includes(q) ||
        cl.branches.some((b) => b.toLowerCase().includes(q)) ||
        cl.leadCounsel.some((l) => l.toLowerCase().includes(q)) ||
        cl.cases.some((c) => (c.suitNumber || '').toLowerCase().includes(q))
      );
    });
  }, [clients, clientSearch, statusScope]);

  const totalActiveClients = useMemo(
    () => clients.filter((c) => c.activeMatters > 0).length,
    [clients]
  );

  const handleFilterCasesForClient = (clientName: string) => {
    setSearchQuery(clientName);
    navigateToRoute('catalogue');
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Litigation</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Clients</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Client Registry &amp; Represented Parties
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidated directory of represented litigants, institutional clients, and linked court files.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right pr-3 border-r border-slate-200">
            <span className="text-[11px] font-medium text-slate-500 block">Registered Clients</span>
            <span className="text-lg font-bold text-slate-900 tabular-nums font-mono">{clients.length}</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-500 block">With Active Suits</span>
            <span className="text-lg font-bold text-emerald-700 tabular-nums font-mono">{totalActiveClients}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="Search client name, suit number, lead advocate, or station..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {userPermissions.canViewAllBranches && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="text-xs font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                aria-label="Filter clients by branch"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.city} {b.isHeadquarters ? '(HQ)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(['all', 'active', 'closed'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setStatusScope(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition whitespace-nowrap shrink-0 cursor-pointer ${
                  statusScope === mode
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'all' ? 'All Clients' : mode === 'active' ? 'Active Matters' : 'Closed Matters'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2.5" />
            <h3 className="text-sm font-semibold text-slate-900">No Matching Clients Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Adjust your branch or search filter, or register a new litigation matter to populate client records.
            </p>
            <button
              type="button"
              onClick={() => navigateToRoute('catalogue')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Go to Cases</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Client / Represented Party</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Branch Station</th>
                  <th className="py-3 px-4">Lead Counsel</th>
                  <th className="py-3 px-4 text-right">Active</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Claim Value (UGX)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredClients.map((cl) => {
                  const isExpanded = expandedClientKey === cl.normalizedKey;
                  return (
                    <React.Fragment key={cl.normalizedKey}>
                      <tr
                        onClick={() => setExpandedClientKey(isExpanded ? null : cl.normalizedKey)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <ChevronRight
                              className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${
                                isExpanded ? 'rotate-90 text-slate-700' : ''
                              }`}
                            />
                            <span>{cl.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {cl.partyTypes.slice(0, 2).join(', ') || 'Client'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {cl.branches.slice(0, 2).join(', ') || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {cl.leadCounsel.slice(0, 2).join(', ') || 'Unassigned'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                          {cl.activeMatters}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {cl.totalMatters}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                          {cl.totalClaimUGX > 0 ? cl.totalClaimUGX.toLocaleString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleFilterCasesForClient(cl.name)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <span>View Matters</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={8} className="px-6 py-3 border-t border-slate-100">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                              Linked Court Files ({cl.cases.length})
                            </div>
                            <div className="divide-y divide-slate-200/70 border border-slate-200 rounded-lg bg-white overflow-hidden">
                              {cl.cases.map((c) => (
                                <div
                                  key={c.id}
                                  onClick={() => setSelectedCase(c)}
                                  className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <Scale className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-mono text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                                      {c.suitNumber || c.firmRefNumber}
                                    </span>
                                    <span className="text-xs font-medium text-slate-900 truncate">
                                      {c.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-[11px] text-slate-500 shrink-0">
                                    <span>{c.branchName || c.branch}</span>
                                    <span className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 font-medium text-slate-700">
                                      {c.status || 'Active'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsDirectory;
