import React, { useState, useMemo } from 'react';
import { Download, Printer, Search, RotateCcw } from 'lucide-react';
import {
  MONTHS,
  KCB_FACILITY_TYPES,
  KCB_PERFECTION_STAGES,
} from './bankConfigs';
import {
  formatUGX,
  formatDate,
  computeTurnaroundDays,
  extractYearsFromRecords,
  exportRecordsToCsv,
} from './bankReportUtils';
import { StatusBadge } from '../../common/StatusBadge';
import type { BankReportModuleProps } from './IMBankReportModule';

type SlaFilter = 'ALL' | 'ON_TRACK' | 'OVERDUE' | 'COMPLETED';

const evaluateSla = (r: any): { state: Exclude<SlaFilter, 'ALL'> | 'UNSET'; days: number | null } => {
  const bsd = r.bank_specific_data || {};
  const receipt = r.date_of_receipt;
  const target = r.sla_target_date || bsd.sla_target_date;
  const completedDate = r.date_of_return || r.date_registered;
  const stage = String(r.perfection_stage || bsd.perfection_stage || '').toLowerCase();
  const st = String(r.status || '').toLowerCase();
  const isCompleted =
    Boolean(completedDate) ||
    stage.includes('returned') ||
    st.includes('completed') ||
    st.includes('cleared') ||
    st === 'registered';

  const days =
    Number(r.turnaround_days ?? bsd.turnaround_days ?? 0) ||
    computeTurnaroundDays(receipt, completedDate || new Date().toISOString().slice(0, 10));

  if (isCompleted) return { state: 'COMPLETED', days };
  if (!target) return { state: 'UNSET', days };
  const today = new Date().toISOString().slice(0, 10);
  return { state: String(target).slice(0, 10) < today ? 'OVERDUE' : 'ON_TRACK', days };
};

export const KCBReportModule: React.FC<BankReportModuleProps> = ({
  records,
  onInspectRecord,
}) => {
  const years = useMemo(() => extractYearsFromRecords(records), [records]);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedFacility, setSelectedFacility] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [slaFilter, setSlaFilter] = useState<SlaFilter>('ALL');
  const [search, setSearch] = useState<string>('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const bsd = r.bank_specific_data || {};
      const facType = String(r.facility_type || bsd.facility_type || '').trim();
      const stage = String(r.perfection_stage || bsd.perfection_stage || '').trim();
      const sla = evaluateSla(r);

      if (selectedYear !== 'ALL' && String(r.record_year || '') !== selectedYear) return false;
      if (
        selectedMonth !== 'ALL' &&
        String(r.month_sheet || '').trim().toLowerCase() !== selectedMonth.toLowerCase()
      ) {
        return false;
      }
      if (selectedFacility !== 'ALL' && facType !== selectedFacility) return false;
      if (selectedStage !== 'ALL' && stage !== selectedStage) return false;
      if (slaFilter !== 'ALL' && sla.state !== slaFilter) return false;

      if (q) {
        const haystack = [
          r.client_name,
          r.mortgagor_name,
          r.kcb_customer_id || bsd.kcb_customer_id || r.rim_no,
          r.panel_instruction_no || bsd.panel_instruction_no || r.file_number,
          r.instrument_number || bsd.instrument_number,
          facType,
          stage,
          r.bank_branch_station || r.branch,
          r.property_description,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [records, selectedYear, selectedMonth, selectedFacility, selectedStage, slaFilter, search]);

  const metrics = useMemo(() => {
    let loanTotal = 0;
    let totalBilled = 0;
    let legalAndVat = 0;
    let onTrackCount = 0;
    let overdueCount = 0;
    let completedCount = 0;
    let turnaroundSum = 0;
    let turnaroundCount = 0;

    filtered.forEach((r) => {
      loanTotal += Number(r.loan_amount || 0);
      totalBilled += Number(r.grand_total || 0);
      legalAndVat += Number(r.legal_fees || 0) + Number(r.vat_18 ?? r.vat ?? 0);
      const sla = evaluateSla(r);
      if (sla.state === 'COMPLETED') completedCount += 1;
      else if (sla.state === 'OVERDUE') overdueCount += 1;
      else if (sla.state === 'ON_TRACK') onTrackCount += 1;
      if (sla.days !== null) {
        turnaroundSum += sla.days;
        turnaroundCount += 1;
      }
    });

    const avgTurnaround = turnaroundCount > 0 ? (turnaroundSum / turnaroundCount).toFixed(1) : '-';
    return {
      loanTotal,
      totalBilled,
      legalAndVat,
      onTrackCount,
      overdueCount,
      completedCount,
      avgTurnaround,
    };
  }, [filtered]);

  const stageBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; loan: number }>();
    KCB_PERFECTION_STAGES.forEach((s) => map.set(s, { count: 0, loan: 0 }));
    filtered.forEach((r) => {
      const key =
        String(r.perfection_stage || r.bank_specific_data?.perfection_stage || '').trim() ||
        'Instruction Received';
      const cur = map.get(key) || { count: 0, loan: 0 };
      cur.count += 1;
      cur.loan += Number(r.loan_amount || 0);
      map.set(key, cur);
    });
    return Array.from(map.entries()).filter(([, v]) => v.count > 0);
  }, [filtered]);

  const facilityBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; loan: number; daysSum: number; daysCount: number }>();
    KCB_FACILITY_TYPES.forEach((f) => map.set(f, { count: 0, loan: 0, daysSum: 0, daysCount: 0 }));
    filtered.forEach((r) => {
      const key =
        String(r.facility_type || r.bank_specific_data?.facility_type || '').trim() ||
        'Unclassified';
      const cur = map.get(key) || { count: 0, loan: 0, daysSum: 0, daysCount: 0 };
      cur.count += 1;
      cur.loan += Number(r.loan_amount || 0);
      const sla = evaluateSla(r);
      if (sla.days !== null) {
        cur.daysSum += sla.days;
        cur.daysCount += 1;
      }
      map.set(key, cur);
    });
    return Array.from(map.entries()).filter(([, v]) => v.count > 0);
  }, [filtered]);

  const handleExportCsv = () => {
    const headers = [
      'No.',
      'Month',
      'Year',
      'KCB Customer ID',
      'Panel Instruction No.',
      'Facility Type',
      'Borrower Name',
      'KCB Branch',
      'Perfection Stage',
      'Instrument Number',
      'Date Received',
      'SLA Target Date',
      'Turnaround Days',
      'SLA State',
      'Property Description',
      'Facility Value (UGX)',
      'Disbursements (UGX)',
      'Legal Fees (UGX)',
      'VAT 18% (UGX)',
      'Grand Total (UGX)',
      'Status',
    ];
    const rows = filtered.map((r, idx) => {
      const bsd = r.bank_specific_data || {};
      const sla = evaluateSla(r);
      return [
        idx + 1,
        r.month_sheet || '',
        r.record_year || '',
        r.kcb_customer_id || bsd.kcb_customer_id || r.rim_no || '',
        r.panel_instruction_no || bsd.panel_instruction_no || r.file_number || '',
        r.facility_type || bsd.facility_type || '',
        r.client_name || r.mortgagor_name || '',
        r.bank_branch_station || r.branch || '',
        r.perfection_stage || bsd.perfection_stage || '',
        r.instrument_number || bsd.instrument_number || '',
        formatDate(r.date_of_receipt),
        formatDate(r.sla_target_date || bsd.sla_target_date),
        sla.days ?? '',
        sla.state,
        r.property_description || '',
        Number(r.loan_amount || 0),
        Number(r.total_disbursements || 0),
        Number(r.legal_fees || 0),
        Number(r.vat_18 ?? r.vat ?? 0),
        Number(r.grand_total || 0),
        r.status || 'Active / Processing',
      ];
    });
    const suffix = `${selectedMonth}_${selectedYear}`.toLowerCase();
    exportRecordsToCsv(`kcb_panel_perfection_report_${suffix}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="no-print bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              KCB Panel SLA, Perfection Stage &amp; Fee Report
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Independent tracking of panel instructions, turnaround SLAs, instrument numbers, and facility mix.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export KCB CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Customer ID, panel ref, instrument no..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 font-medium tabular-nums"
          >
            <option value="ALL">All Years</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 font-medium"
          >
            <option value="ALL">All Months</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 font-medium"
          >
            <option value="ALL">All Facility Types</option>
            {KCB_FACILITY_TYPES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value as SlaFilter)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 font-medium"
            >
              <option value="ALL">All SLA States</option>
              <option value="ON_TRACK">On Track</option>
              <option value="OVERDUE">Overdue SLA</option>
              <option value="COMPLETED">Perfected / Returned</option>
            </select>
            {(search || selectedYear !== 'ALL' || selectedMonth !== 'ALL' || selectedFacility !== 'ALL' || selectedStage !== 'ALL' || slaFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedYear('ALL');
                  setSelectedMonth('ALL');
                  setSelectedFacility('ALL');
                  setSelectedStage('ALL');
                  setSlaFilter('ALL');
                }}
                title="Reset filters"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Panel Instructions
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-1 block">
            {filtered.length}
          </span>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
            {metrics.completedCount} perfected &amp; returned
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            SLA Compliance
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-1 block">
            {metrics.onTrackCount + metrics.completedCount} <span className="text-xs font-normal text-slate-400">on track</span>
          </span>
          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-mono tabular-nums">
            {metrics.overdueCount} overdue target
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Avg. Turnaround
          </span>
          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums mt-1 block">
            {metrics.avgTurnaround === '-' ? '-' : `${metrics.avgTurnaround} days`}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Facility Portfolio Value
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-1 block truncate">
            {formatUGX(metrics.loanTotal)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Total Billed (KCB Panel)
          </span>
          <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 font-mono tabular-nums mt-1 block truncate">
            {formatUGX(metrics.totalBilled)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Legal+VAT: {formatUGX(metrics.legalAndVat)}
          </span>
        </div>
      </div>

      {/* Breakdowns */}
      {filtered.length > 0 && (
        <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Perfection Stage Pipeline
              </h3>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="text-[11px] rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">All Stages</option>
                {KCB_PERFECTION_STAGES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-2 font-semibold">Perfection Stage</th>
                  <th className="py-2 font-semibold text-right">Files</th>
                  <th className="py-2 font-semibold text-right">Facility Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stageBreakdown.map(([label, stats]) => (
                  <tr key={label}>
                    <td className="py-2 font-medium text-slate-800 dark:text-slate-200">{label}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{stats.count}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{formatUGX(stats.loan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
              Facility Product Mix &amp; Turnaround
            </h3>
            <table className="w-full text-xs text-left">
              <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-2 font-semibold">Facility Product</th>
                  <th className="py-2 font-semibold text-right">Files</th>
                  <th className="py-2 font-semibold text-right">Avg Days</th>
                  <th className="py-2 font-semibold text-right">Facility Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {facilityBreakdown.map(([label, stats]) => (
                  <tr key={label}>
                    <td className="py-2 font-medium text-slate-800 dark:text-slate-200">{label}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{stats.count}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                      {stats.daysCount > 0 ? `${(stats.daysSum / stats.daysCount).toFixed(0)}d` : '-'}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{formatUGX(stats.loan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 dark:text-slate-400">
            No KCB records match the active report filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left border-collapse text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="w-12 py-3 px-3 text-center font-semibold">No.</th>
                  <th className="py-3 px-3 font-semibold">Panel Ref &amp; Cust ID</th>
                  <th className="py-3 px-3 font-semibold">Borrower &amp; Facility</th>
                  <th className="py-3 px-3 font-semibold">Perfection Stage</th>
                  <th className="py-3 px-3 font-semibold">Instrument No.</th>
                  <th className="py-3 px-3 font-semibold">SLA Target &amp; Days</th>
                  <th className="py-3 px-3 font-semibold text-right">Facility Value</th>
                  <th className="py-3 px-3 font-semibold text-right">Grand Total</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filtered.map((r, idx) => {
                  const bsd = r.bank_specific_data || {};
                  const cid = r.kcb_customer_id || bsd.kcb_customer_id || r.rim_no || '-';
                  const panelRef =
                    r.panel_instruction_no || bsd.panel_instruction_no || r.file_number || '-';
                  const facType = r.facility_type || bsd.facility_type || 'Home Loan';
                  const stage = r.perfection_stage || bsd.perfection_stage || 'Instruction Received';
                  const instNo = r.instrument_number || bsd.instrument_number || '-';
                  const slaTarget = formatDate(r.sla_target_date || bsd.sla_target_date);
                  const sla = evaluateSla(r);

                  return (
                    <tr
                      key={r.id || idx}
                      onClick={() => onInspectRecord?.(r)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400">{panelRef}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{cid}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {r.client_name || r.mortgagor_name || 'N/A'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {facType} · {r.bank_branch_station || r.branch || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {stage}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {instNo}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-[11px]">
                        <div
                          className={
                            sla.state === 'OVERDUE'
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : sla.state === 'COMPLETED'
                              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                              : 'text-slate-700 dark:text-slate-300'
                          }
                        >
                          {slaTarget} {sla.days !== null ? `(${sla.days}d)` : ''}
                        </div>
                        <div className="text-slate-400">
                          {sla.state === 'OVERDUE'
                            ? 'Overdue SLA'
                            : sla.state === 'COMPLETED'
                            ? 'Completed'
                            : sla.state === 'ON_TRACK'
                            ? 'On Track'
                            : 'No SLA date'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                        {formatUGX(r.loan_amount, true)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-indigo-700 dark:text-indigo-400">
                        {formatUGX(r.grand_total, true)}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge size="xs" status={r.status || 'Active / Processing'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800/70 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">
                <tr>
                  <td colSpan={6} className="py-3 px-3 uppercase tracking-wider text-[11px]">
                    Totals ({filtered.length} KCB Panel Instructions)
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {formatUGX(metrics.loanTotal)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-indigo-700 dark:text-indigo-400">
                    {formatUGX(metrics.totalBilled)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default KCBReportModule;
