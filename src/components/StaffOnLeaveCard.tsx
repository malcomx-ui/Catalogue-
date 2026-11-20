import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { CalendarOff, ArrowRight, Loader2, RefreshCw, Plus } from 'lucide-react';
import { hrSupabase } from '../lib/hrSupabase';
import { getNextWorkingReturnDate } from '../utils/ugandaHolidays';
import { useApp } from '../context/AppContext';

export interface StaffOnLeaveRecord {
  id: string;
  employeeName: string;
  roleTitle: string;
  branchName: string;
  leaveType: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  returnDate: string | null; // YYYY-MM-DD (next working day)
  isCurrentlyAway: boolean;
  daysUntilReturn: number | null;
  daysUntilStart: number | null;
}

interface StaffOnLeaveCardProps {
  searchQuery?: string;
  refreshKey?: number;
  canOpenHrModule?: boolean;
  onOpenHrModule?: () => void;
  onRequestLeave?: () => void;
}

const LOCAL_LEAVES_STORAGE_KEYS = [
  'mk_staff_leave_requests_v1',
  'mk_clio_quick_leave_requests_v1',
];

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoToMidnight(iso?: string | null): Date | null {
  if (!iso) return null;
  const clean = String(iso).trim().slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function diffCalendarDays(fromIso: string, toIso: string): number | null {
  const from = parseIsoToMidnight(fromIso);
  const to = parseIsoToMidnight(toIso);
  if (!from || !to) return null;
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function formatReadableDate(iso?: string | null): string {
  const dt = parseIsoToMidnight(iso);
  if (!dt) return 'TBD';
  return dt.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function getInitials(name?: string | null): string {
  const cleaned = String(name || '').trim();
  if (!cleaned) return 'MK';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function isApprovedLeaveStatus(status?: string | null): boolean {
  const s = String(status || '').trim().toLowerCase();
  return s === 'approved' || s === 'active' || s === 'on leave';
}

export const StaffOnLeaveCard: React.FC<StaffOnLeaveCardProps> = ({
  searchQuery = '',
  refreshKey = 0,
  canOpenHrModule = false,
  onOpenHrModule,
  onRequestLeave,
}) => {
  const { availableUsers, branches } = useApp();
  const [records, setRecords] = useState<StaffOnLeaveRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadFirmWideLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const todayIso = getTodayIso();

      const [leavesRes, employeesRes, profilesRes] = await Promise.all([
        hrSupabase
          .from('leave_requests')
          .select('id, employee_id, leave_type, start_date, end_date, status, created_at')
          .order('end_date', { ascending: true }),
        hrSupabase
          .from('employees')
          .select('id, first_name, last_name, email, job_title, department, status'),
        hrSupabase
          .from('profiles')
          .select('id, full_name, email, role, role_title, branch, branch_name'),
      ]);

      // Build unified lookup maps for staff metadata (firm-wide across all branches)
      const branchMap = new Map<string, string>();
      (branches || []).forEach((b) => {
        if (b?.id && b?.name) branchMap.set(b.id.toLowerCase(), b.name);
      });

      const userById = new Map<string, { name: string; role: string; branch: string }>();
      const userByEmail = new Map<string, { name: string; role: string; branch: string }>();

      (availableUsers || []).forEach((u) => {
        const entry = {
          name: u.name || u.email || 'Firm Staff',
          role: u.roleTitle || u.role || 'Staff',
          branch:
            u.branchName ||
            (u.branchId ? branchMap.get(u.branchId.toLowerCase()) : '') ||
            'Firm-Wide',
        };
        if (u.id) userById.set(String(u.id).trim().toLowerCase(), entry);
        if (u.email) userByEmail.set(String(u.email).trim().toLowerCase(), entry);
      });

      (profilesRes.data || []).forEach((p: any) => {
        const branchRaw = String(p?.branch_name || p?.branch || '').trim();
        const resolvedBranch =
          branchMap.get(branchRaw.toLowerCase()) || branchRaw || 'Firm-Wide';
        const entry = {
          name: String(p?.full_name || p?.email || '').trim() || 'Firm Staff',
          role: String(p?.role_title || p?.role || 'Staff').trim(),
          branch: resolvedBranch,
        };
        if (p?.id) userById.set(String(p.id).trim().toLowerCase(), entry);
        if (p?.email) userByEmail.set(String(p.email).trim().toLowerCase(), entry);
      });

      const empById = new Map<
        string,
        { name: string; role: string; branch: string; status: string }
      >();

      (employeesRes.data || []).forEach((e: any) => {
        const fullName = `${e?.first_name || ''} ${e?.last_name || ''}`.trim();
        const em = String(e?.email || '').trim().toLowerCase();
        const prof =
          (e?.id ? userById.get(String(e.id).trim().toLowerCase()) : undefined) ||
          (em ? userByEmail.get(em) : undefined);

        const entry = {
          name: fullName || prof?.name || e?.email || 'Firm Staff',
          role: String(e?.job_title || prof?.role || e?.department || 'Legal Staff').trim(),
          branch: prof?.branch || String(e?.department || 'Firm-Wide').trim(),
          status: String(e?.status || '').trim(),
        };
        if (e?.id) empById.set(String(e.id).trim().toLowerCase(), entry);
      });

      const resolveStaffMeta = (
        employeeId?: string | null,
        fallbackName?: string | null,
        fallbackBranch?: string | null
      ) => {
        const key = String(employeeId || '').trim().toLowerCase();
        const fromEmp = key ? empById.get(key) : undefined;
        const fromUser = key ? userById.get(key) : undefined;
        const meta = fromEmp || fromUser;
        return {
          name: meta?.name || String(fallbackName || '').trim() || 'Firm Staff',
          role: meta?.role || 'Firm Staff',
          branch:
            (fallbackBranch && String(fallbackBranch).trim()) ||
            meta?.branch ||
            'Firm-Wide',
        };
      };

      const seenKeys = new Set<string>();
      const collected: StaffOnLeaveRecord[] = [];
      const activeEmployeeIds = new Set<string>();

      const ingestLeaveRow = (row: {
        id: string;
        employee_id?: string | null;
        employee_name?: string | null;
        branch_name?: string | null;
        leave_type?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        status?: string | null;
      }) => {
        if (!isApprovedLeaveStatus(row.status)) return;
        const startIso = String(row.start_date || '').trim().slice(0, 10);
        const endIso = String(row.end_date || '').trim().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso) || !/^\d{4}-\d{2}-\d{2}$/.test(endIso)) {
          return;
        }
        // Only include currently active leave OR upcoming approved leave starting within 14 days
        const isCurrentlyAway = startIso <= todayIso && endIso >= todayIso;
        const daysUntilStart = diffCalendarDays(todayIso, startIso);
        const isUpcomingSoon =
          !isCurrentlyAway &&
          daysUntilStart !== null &&
          daysUntilStart > 0 &&
          daysUntilStart <= 14;

        if (!isCurrentlyAway && !isUpcomingSoon) return;

        const meta = resolveStaffMeta(row.employee_id, row.employee_name, row.branch_name);
        const dedupeKey = `${String(row.employee_id || meta.name).toLowerCase()}|${startIso}|${endIso}`;
        if (seenKeys.has(dedupeKey)) return;
        seenKeys.add(dedupeKey);

        if (isCurrentlyAway && row.employee_id) {
          activeEmployeeIds.add(String(row.employee_id).trim().toLowerCase());
        }

        const returnDate = getNextWorkingReturnDate(endIso);
        const daysUntilReturn = returnDate ? diffCalendarDays(todayIso, returnDate) : null;

        collected.push({
          id: String(row.id || dedupeKey),
          employeeName: meta.name,
          roleTitle: meta.role,
          branchName: meta.branch,
          leaveType: String(row.leave_type || 'Leave').trim(),
          startDate: startIso,
          endDate: endIso,
          returnDate,
          isCurrentlyAway,
          daysUntilReturn,
          daysUntilStart,
        });
      };

      // 1. Live Supabase `leave_requests` (firm-wide)
      if (!leavesRes.error && Array.isArray(leavesRes.data)) {
        leavesRes.data.forEach((lr: any) => ingestLeaveRow(lr));
      }

      // 2. Merge any approved local records (fallback / offline sync)
      if (typeof window !== 'undefined') {
        LOCAL_LEAVES_STORAGE_KEYS.forEach((storageKey) => {
          try {
            const raw = window.localStorage.getItem(storageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;
            parsed.forEach((item: any) => ingestLeaveRow(item));
          } catch {
            // ignore storage parse issues
          }
        });
      }

      // 3. Also include HR `employees` explicitly marked status = 'On Leave' without an active leave_requests row
      empById.forEach((emp, empId) => {
        if (emp.status.toLowerCase() === 'on leave' && !activeEmployeeIds.has(empId)) {
          const alreadyByName = collected.some(
            (r) => r.isCurrentlyAway && r.employeeName.toLowerCase() === emp.name.toLowerCase()
          );
          if (!alreadyByName) {
            collected.push({
              id: `emp-on-leave-${empId}`,
              employeeName: emp.name,
              roleTitle: emp.role,
              branchName: emp.branch,
              leaveType: 'On Leave',
              startDate: todayIso,
              endDate: '',
              returnDate: null,
              isCurrentlyAway: true,
              daysUntilReturn: null,
              daysUntilStart: 0,
            });
          }
        }
      });

      // Sort: currently away first (soonest return date first), then upcoming (soonest start first)
      collected.sort((a, b) => {
        if (a.isCurrentlyAway !== b.isCurrentlyAway) {
          return a.isCurrentlyAway ? -1 : 1;
        }
        if (a.isCurrentlyAway) {
          return (a.returnDate || '9999-12-31').localeCompare(b.returnDate || '9999-12-31');
        }
        return a.startDate.localeCompare(b.startDate);
      });

      setRecords(collected);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [availableUsers, branches]);

  useEffect(() => {
    void loadFirmWideLeaves();
  }, [loadFirmWideLeaves, refreshKey]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      `${r.employeeName} ${r.roleTitle} ${r.branchName} ${r.leaveType}`
        .toLowerCase()
        .includes(q)
    );
  }, [records, searchQuery]);

  const currentlyAway = useMemo(
    () => filteredRecords.filter((r) => r.isCurrentlyAway),
    [filteredRecords]
  );

  const upcomingApproved = useMemo(
    () => filteredRecords.filter((r) => !r.isCurrentlyAway).slice(0, 3),
    [filteredRecords]
  );

  const renderReturnNote = (rec: StaffOnLeaveRecord) => {
    if (!rec.returnDate) return 'Return date TBD';
    const label = formatReadableDate(rec.returnDate);
    if (rec.daysUntilReturn === null) return `Returns ${label}`;
    if (rec.daysUntilReturn <= 0) return `Returns today (${label})`;
    if (rec.daysUntilReturn === 1) return `Returns tomorrow · ${label}`;
    return `Returns ${label}`;
  };

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#DFE5F2] dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,101,0.03)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#DFE5F2] dark:border-slate-800 bg-[#F8FAFE] dark:bg-slate-900 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarOff className="w-4 h-4 text-[#000065] dark:text-[#D99B26] shrink-0" />
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold text-[#000065] dark:text-white tracking-tight truncate">
              Staff on Leave
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
            Firm-Wide · {currentlyAway.length} away
          </span>
          <button
            type="button"
            onClick={() => void loadFirmWideLeaves()}
            disabled={loading}
            title="Refresh firm-wide leave status"
            aria-label="Refresh firm-wide leave status"
            className="p-1 rounded-md text-slate-400 hover:text-[#000065] hover:bg-[#EEF1FA] dark:hover:bg-slate-800 dark:hover:text-[#E8C06B] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      {loading && records.length === 0 ? (
        <div className="px-4 py-6 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#000065] dark:text-[#D99B26]" />
          <span>Checking firm-wide leave registry...</span>
        </div>
      ) : currentlyAway.length === 0 && upcomingApproved.length === 0 ? (
        <div className="px-4 py-5 text-center space-y-1">
          <p className="text-xs font-semibold text-[#000065] dark:text-slate-100">
            All firm staff are currently on duty
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            No approved staff leaves across branches right now or in the next 14 days.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#DFE5F2]/80 dark:divide-slate-800 max-h-80 overflow-y-auto">
          {currentlyAway.map((rec) => (
            <div
              key={rec.id}
              className="px-4 py-3 hover:bg-[#F1F4FC] dark:hover:bg-[#000065]/20 transition-colors duration-150 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#000065] to-[#121285] text-[#E8C06B] text-[11px] font-display font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {getInitials(rec.employeeName)}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-bold text-[#000065] dark:text-white truncate">
                    {rec.employeeName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {rec.branchName} · {rec.leaveType}
                  </p>
                  <p className="text-[11px] font-semibold text-[#B57E1A] dark:text-[#E8C06B] tabular-nums">
                    {renderReturnNote(rec)}
                  </p>
                </div>
              </div>

              {rec.daysUntilReturn !== null && rec.daysUntilReturn > 1 && (
                <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 tabular-nums shrink-0 mt-0.5">
                  {rec.daysUntilReturn}d left
                </span>
              )}
            </div>
          ))}

          {upcomingApproved.length > 0 && (
            <div className="bg-[#F8FAFE]/70 dark:bg-slate-800/30">
              <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Upcoming Approved Leave
              </div>
              <div className="divide-y divide-[#DFE5F2]/70 dark:divide-slate-800/80">
                {upcomingApproved.map((rec) => (
                  <div
                    key={rec.id}
                    className="px-4 py-2.5 hover:bg-[#F1F4FC] dark:hover:bg-[#000065]/20 transition-colors duration-150 flex items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#000065] dark:text-slate-100 truncate">
                        {rec.employeeName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {rec.branchName} · {rec.leaveType}
                      </p>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                        From {formatReadableDate(rec.startDate)}
                      </p>
                      <p className="text-[10px] font-semibold text-[#B57E1A] dark:text-[#E8C06B]">
                        Returns {formatReadableDate(rec.returnDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Action */}
      {canOpenHrModule && onOpenHrModule ? (
        <button
          type="button"
          onClick={onOpenHrModule}
          className="group w-full px-4 py-2.5 border-t border-[#DFE5F2] dark:border-slate-800 bg-[#F8FAFE] dark:bg-slate-800/40 hover:bg-[#000065] hover:text-white dark:hover:bg-[#000065] text-xs font-semibold text-[#000065] dark:text-[#D99B26] flex items-center justify-between transition-all duration-200 cursor-pointer"
        >
          <span>Open HR &amp; Leave Registry</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:text-[#E8C06B] transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      ) : onRequestLeave ? (
        <button
          type="button"
          onClick={onRequestLeave}
          className="group w-full px-4 py-2.5 border-t border-[#DFE5F2] dark:border-slate-800 bg-[#F8FAFE] dark:bg-slate-800/40 hover:bg-[#000065] hover:text-white dark:hover:bg-[#000065] text-xs font-semibold text-[#000065] dark:text-[#D99B26] flex items-center justify-between transition-all duration-200 cursor-pointer"
        >
          <span>Request Leave</span>
          <Plus className="w-3.5 h-3.5 group-hover:text-[#E8C06B] transition-colors duration-150" />
        </button>
      ) : null}
    </div>
  );
};

export default StaffOnLeaveCard;
