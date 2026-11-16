import React, { useState, useMemo } from 'react';
import { Download, Printer, Search, RotateCcw } from 'lucide-react';
import {
  MONTHS,
  BARODA_SECURITY_NATURES,
  BARODA_CUSTODY_STATUSES,
} from './bankConfigs';
import {
  formatUGX,
  formatDate,
  extractYearsFromRecords,
  exportRecordsToCsv,
} from './bankReportUtils';
import { StatusBadge } from '../../common/StatusBadge';
import type { BankReportModuleProps } from './IMBankReportModule';

export const BarodaReportModule: React.FC<BankReportModuleProps> = ({
  records,
  onInspectRecord,
}) => {
  const years = useMemo(() => extractYearsFromRecords(records), [records]);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedCustody, setSelectedCustody] = useState<string>('ALL');
  const [selectedNature, setSelectedNature] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const bsd = r.bank_specific_data || {};
      const custody = String(r.title_custody_status || bsd.title_custody_status || '').trim();
      const nature = String(r.security_nature || bsd.security_nature || '').trim();
      const accNo = String(r.baroda_account_no || bsd.baroda_account_no || r.rim_no || '').trim();
      const sanctionRef = String(
        r.sanction_letter_ref || bsd.sanction_letter_ref || r.file_number || ''
      ).trim();

      if (selectedYear !== 'ALL' && String(r.record_year || '') !== selectedYear) return false;
      if (
        selectedMonth !== 'ALL' &&
        String(r.month_sheet || '').trim().toLowerCase() !== selectedMonth.toLowerCase()
      ) {
        return false;
      }
      if (selectedCustody !== 'ALL' && custody !== selectedCustody) return false;
      if (selectedNature !== 'ALL' && nature !== selectedNature) return false;
      if (q) {
        const haystack = [
          r.client_name,
          r.mortgagor_name,
          accNo,
          sanctionRef,
          r.scheme_code || bsd.scheme_code,
          r.ura_prn || bsd.ura_prn,
          r.baroda_branch_code || bsd.baroda_branch_code,
          r.bank_branch_station || r.branch,
          r.property_description,
          custody,
          nature,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [records, selectedYear, selectedMonth, selectedCustody, selectedNature, search]);

  const metrics = useMemo(() => {
    let loanTotal = 0;
    let stampDutyTotal = 0;
    let totalBilled = 0;
    let prnCount = 0;
    let returnedCount = 0;

    filtered.forEach((r) => {
      const bsd = r.bank_specific_data || {};
      loanTotal += Number(r.loan_amount || 0);
      stampDutyTotal += Number(r.stamp_duty || 0);
      totalBilled += Number(r.grand_total || 0);
      if (String(r.ura_prn || bsd.ura_prn || '').trim()) {
        prnCount += 1;
      }
      const custody = String(r.title_custody_status || bsd.title_custody_status || '').toLowerCase();
      const st = String(r.status || '').toLowerCase();
      if (
        custody.includes('returned') ||
        st.includes('completed') ||
        st.includes('cleared') ||
        Boolean(r.date_of_return)
      ) {
        returnedCount += 1;
      }
    });

    return { loanTotal, stampDutyTotal, totalBilled, prnCount, returnedCount };
  }, [filtered]);

  const custodyBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; loan: number }>();
    BARODA_CUSTODY_STATUSES.forEach((c) => map.set(c, { count: 0, loan: 0 }));
    filtered.forEach((r) => {
      const key =
        String(r.title_custody_status || r.bank_specific_data?.title_custody_status || '').trim() ||
        'Pending Tracking';
      const cur = map.get(key) || { count: 0, loan: 0 };
      cur.count += 1;
      cur.loan += Number(r.loan_amount || 0);
      map.set(key, cur);
    });
    return Array.from(map.entries()).filter(([, v]) => v.count > 0);
  }, [filtered]);

  const natureBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; loan: number; stampDuty: number }>();
    BARODA_SECURITY_NATURES.forEach((n) => map.set(n, { count: 0, loan: 0, stampDuty: 0 }));
    filtered.forEach((r) => {
      const key =
        String(r.security_nature || r.bank_specific_data?.security_nature || '').trim() ||
        'Unclassified';
      const cur = map.get(key) || { count: 0, loan: 0, stampDuty: 0 };
      cur.count += 1;
      cur.loan += Number(r.loan_amount || 0);
      cur.stampDuty += Number(r.stamp_duty || 0);
      map.set(key, cur);
    });
    return Array.from(map.entries()).filter(([, v]) => v.count > 0);
  }, [filtered]);

  const handleExportCsv = () => {
    const headers = [
      'No.',
      'Month',
      'Year',
      'Baroda Account No.',
      'Scheme Code',
      'Sanction Letter Ref',
      'Sanction Date',
      'SOL Code',
      'Baroda Branch',
      'Mortgagor Name',
      'Security Nature',
      'Title Custody Status',
      'URA PRN',
      'Property Description',
      'Sanctioned Loan (UGX)',
      'Stamp Duty (UGX)',
      'Total Disbursements (UGX)',
      'Legal Fees (UGX)',
      'VAT 18% (UGX)',
      'Grand Total (UGX)',
      'Date Returned',
      'Status',
    ];
    const rows = filtered.map((r, idx) => {
      const bsd = r.bank_specific_data || {};
      return [
        idx + 1,
        r.month_sheet || '',
        r.record_year || '',
        r.baroda_account_no || bsd.baroda_account_no || r.rim_no || '',
        r.scheme_code || bsd.scheme_code || '',
        r.sanction_letter_ref || bsd.sanction_letter_ref || r.file_number || '',
        formatDate(r.sanction_date || bsd.sanction_date),
        r.baroda_branch_code || bsd.baroda_branch_code || '',
        r.bank_branch_station || r.branch || '',
        r.client_name || r.mortgagor_name || '',
        r.security_nature || bsd.security_nature || '',
        r.title_custody_status || bsd.title_custody_status || '',
        r.ura_prn || bsd.ura_prn || '',
        r.property_description || '',
        Number(r.loan_amount || 0),
        Number(r.stamp_duty || 0),
        Number(r.total_disbursements || 0),
        Number(r.legal_fees || 0),
        Number(r.vat_18 ?? r.vat ?? 0),
        Number(r.grand_total || 0),
        formatDate(r.date_of_return),
        r.status || 'Active / Processing',
      ];
    });
    const suffix = `${selectedMonth}_${selectedYear}`.toLowerCase();
    exportRecordsToCsv(`bank_of_baroda_report_${suffix}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="no-print bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Bank of Baroda Sanction, URA PRN &amp; Title Custody Report
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tracks sanction letters, scheme codes, URA Stamp Duty PRN compliance, and title custody return dates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Baroda CSV</span>
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
              placeholder="Search Baroda A/C, sanction ref, URA PRN, scheme..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
            value={selectedCustody}
            onChange={(e) => setSelectedCustody(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 font-medium"
          >
            <option value="ALL">All Custody Stages</option>
            {BARODA_CUSTODY_STATUSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <select
              value={selectedNature}
              onChange={(e) => setSelectedNature(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 font-medium"
            >
              <option value="ALL">All Security Natures</option>
              {BARODA_SECURITY_NATURES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            {(search || selectedYear !== 'ALL' || selectedMonth !== 'ALL' || selectedCustody !== 'ALL' || selectedNature !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedYear('ALL');
                  setSelectedMonth('ALL');
                  setSelectedCustody('ALL');
                  setSelectedNature('ALL');
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

      {/* KPI Cards */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Sanctioned Accounts
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-1 block">
            {filtered.length}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            URA PRNs Issued
          </span>
          <span className="text-lg font-bold text-orange-700 dark:text-orange-400 font-mono tabular-nums mt-1 block">
            {metrics.prnCount} <span className="text-xs font-normal text-slate-400">/ {filtered.length}</span>
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Returned to Baroda
          </span>
          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums mt-1 block">
            {metrics.returnedCount}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Sanctioned Exposure
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-1 block truncate">
            {formatUGX(metrics.loanTotal)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Total Billed (Stamp + Fees)
          </span>
          <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 font-mono tabular-nums mt-1 block truncate">
            {formatUGX(metrics.totalBilled)}
          </span>
          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-mono tabular-nums">
            Stamp Duty: {formatUGX(metrics.stampDutyTotal)}
          </span>
        </div>
      </div>

      {/* Breakdowns */}
      {filtered.length > 0 && (
        <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
              Title Custody Pipeline
            </h3>
            <table className="w-full text-xs text-left">
              <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-2 font-semibold">Custody Stage</th>
                  <th className="py-2 font-semibold text-right">Files</th>
                  <th className="py-2 font-semibold text-right">Exposure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {custodyBreakdown.map(([label, stats]) => (
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
              Security Nature &amp; Stamp Duty
            </h3>
            <table className="w-full text-xs text-left">
              <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-2 font-semibold">Security Nature</th>
                  <th className="py-2 font-semibold text-right">Files</th>
                  <th className="py-2 font-semibold text-right">Stamp Duty</th>
                  <th className="py-2 font-semibold text-right">Exposure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {natureBreakdown.map(([label, stats]) => (
                  <tr key={label}>
                    <td className="py-2 font-medium text-slate-800 dark:text-slate-200">{label}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{stats.count}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400">{formatUGX(stats.stampDuty)}</td>
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
            No Bank of Baroda records match the active report filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1160px] text-left border-collapse text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="w-12 py-3 px-3 text-center font-semibold">No.</th>
                  <th className="py-3 px-3 font-semibold">Baroda A/C &amp; Scheme</th>
                  <th className="py-3 px-3 font-semibold">Sanction Ref &amp; Date</th>
                  <th className="py-3 px-3 font-semibold">Mortgagor</th>
                  <th className="py-3 px-3 font-semibold">Security &amp; Custody</th>
                  <th className="py-3 px-3 font-semibold">URA PRN</th>
                  <th className="py-3 px-3 font-semibold text-right">Sanctioned Loan</th>
                  <th className="py-3 px-3 font-semibold text-right">Stamp Duty</th>
                  <th className="py-3 px-3 font-semibold text-right">Grand Total</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filtered.map((r, idx) => {
                  const bsd = r.bank_specific_data || {};
                  const acc = r.baroda_account_no || bsd.baroda_account_no || r.rim_no || '-';
                  const scheme = r.scheme_code || bsd.scheme_code || '';
                  const sanctionRef = r.sanction_letter_ref || bsd.sanction_letter_ref || r.file_number || '-';
                  const sanctionDate = formatDate(r.sanction_date || bsd.sanction_date);
                  const nature = r.security_nature || bsd.security_nature || 'Registered Mortgage';
                  const custody = r.title_custody_status || bsd.title_custody_status || '-';
                  const prn = r.ura_prn || bsd.ura_prn || '-';

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
                        <div className="font-semibold text-orange-700 dark:text-orange-400">{acc}</div>
                        {scheme && <div className="text-[11px] text-slate-500 dark:text-slate-400">Scheme: {scheme}</div>}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{sanctionRef}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{sanctionDate}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {r.client_name || r.mortgagor_name || 'N/A'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {r.bank_branch_station || r.branch || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium">{nature}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{custody}</div>
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {prn}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                        {formatUGX(r.loan_amount, true)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400">
                        {formatUGX(r.stamp_duty, true)}
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
                    Totals ({filtered.length} Baroda Accounts)
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {formatUGX(metrics.loanTotal)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400">
                    {formatUGX(metrics.stampDutyTotal)}
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

export default BarodaReportModule;
