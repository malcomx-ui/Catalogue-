import React, { useState, useMemo } from 'react';
import { Download, Printer, Search, RotateCcw } from 'lucide-react';
import {
  MONTHS,
  IM_SECURITY_TYPES,
  IM_TITLE_TYPES,
} from './bankConfigs';
import {
  formatUGX,
  formatDate,
  extractYearsFromRecords,
  exportRecordsToCsv,
} from './bankReportUtils';
import { StatusBadge } from '../../common/StatusBadge';

export interface BankReportModuleProps {
  records: any[];
  onInspectRecord?: (record: any) => void;
}

export const IMBankReportModule: React.FC<BankReportModuleProps> = ({
  records,
  onInspectRecord,
}) => {
  const years = useMemo(() => extractYearsFromRecords(records), [records]);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedSecurityType, setSelectedSecurityType] = useState<string>('ALL');
  const [selectedRm, setSelectedRm] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const rmOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const rm = String(
        r.relationship_manager || r.bank_specific_data?.relationship_manager || ''
      ).trim();
      if (rm) set.add(rm);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const bsd = r.bank_specific_data || {};
      const rm = String(r.relationship_manager || bsd.relationship_manager || '').trim();
      const secType = String(r.security_type || bsd.security_type || '').trim();
      const cif = String(r.customer_cif || bsd.customer_cif || r.rim_no || '').trim();
      const facRef = String(r.facility_reference || bsd.facility_reference || r.file_number || '').trim();

      if (selectedYear !== 'ALL' && String(r.record_year || '') !== selectedYear) return false;
      if (
        selectedMonth !== 'ALL' &&
        String(r.month_sheet || '').trim().toLowerCase() !== selectedMonth.toLowerCase()
      ) {
        return false;
      }
      if (selectedSecurityType !== 'ALL' && secType !== selectedSecurityType) return false;
      if (selectedRm !== 'ALL' && rm !== selectedRm) return false;
      if (q) {
        const haystack = [
          r.client_name,
          r.mortgagor_name,
          cif,
          facRef,
          rm,
          secType,
          r.title_type || bsd.title_type,
          r.bank_branch_station || r.branch,
          r.property_description,
          r.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [records, selectedYear, selectedMonth, selectedSecurityType, selectedRm, search]);

  const metrics = useMemo(() => {
    let loanTotal = 0;
    let fsvTotal = 0;
    let totalBilled = 0;
    let totalDisb = 0;
    let perfectedCount = 0;

    filtered.forEach((r) => {
      const bsd = r.bank_specific_data || {};
      const loan = Number(r.loan_amount || 0);
      const fsv = Number(r.forced_sale_value ?? bsd.forced_sale_value ?? 0);
      loanTotal += loan;
      fsvTotal += fsv;
      totalBilled += Number(r.grand_total || 0);
      totalDisb += Number(r.total_disbursements || 0);

      const st = String(r.status || '').toLowerCase();
      if (
        st.includes('registered') ||
        st.includes('completed') ||
        st.includes('cleared') ||
        Boolean(r.date_registered || bsd.date_registered || r.date_of_return)
      ) {
        perfectedCount += 1;
      }
    });

    const coverageRatio = loanTotal > 0 && fsvTotal > 0 ? (fsvTotal / loanTotal) * 100 : null;
    return { loanTotal, fsvTotal, totalBilled, totalDisb, perfectedCount, coverageRatio };
  }, [filtered]);

  const securityBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; loan: number; billed: number }>();
    IM_SECURITY_TYPES.forEach((t) => map.set(t, { count: 0, loan: 0, billed: 0 }));
    filtered.forEach((r) => {
      const key =
        String(r.security_type || r.bank_specific_data?.security_type || '').trim() ||
        'Unclassified';
      const cur = map.get(key) || { count: 0, loan: 0, billed: 0 };
      cur.count += 1;
      cur.loan += Number(r.loan_amount || 0);
      cur.billed += Number(r.grand_total || 0);
      map.set(key, cur);
    });
    return Array.from(map.entries()).filter(([, v]) => v.count > 0);
  }, [filtered]);

  const tenureBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; fsv: number; loan: number }>();
    IM_TITLE_TYPES.forEach((t) => map.set(t, { count: 0, fsv: 0, loan: 0 }));
    filtered.forEach((r) => {
      const key =
        String(r.title_type || r.bank_specific_data?.title_type || '').trim() || 'Unspecified';
      const cur = map.get(key) || { count: 0, fsv: 0, loan: 0 };
      cur.count += 1;
      cur.loan += Number(r.loan_amount || 0);
      cur.fsv += Number(r.forced_sale_value ?? r.bank_specific_data?.forced_sale_value ?? 0);
      map.set(key, cur);
    });
    return Array.from(map.entries()).filter(([, v]) => v.count > 0);
  }, [filtered]);

  const handleExportCsv = () => {
    const headers = [
      'No.',
      'Month',
      'Year',
      'CIF Number',
      'Facility Reference',
      'Borrower Name',
      'Relationship Manager',
      'I&M Branch',
      'Security Type',
      'Title Tenure',
      'Property Description',
      'Loan Exposure (UGX)',
      'Forced Sale Value (UGX)',
      'LTV (%)',
      'Date Instructed',
      'Sent to Registry',
      'Date Registered',
      'Disbursements (UGX)',
      'Legal Fees (UGX)',
      'VAT 18% (UGX)',
      'Grand Total (UGX)',
      'Status',
    ];
    const rows = filtered.map((r, idx) => {
      const bsd = r.bank_specific_data || {};
      const loan = Number(r.loan_amount || 0);
      const fsv = Number(r.forced_sale_value ?? bsd.forced_sale_value ?? 0);
      const ltv = loan > 0 && fsv > 0 ? ((loan / fsv) * 100).toFixed(1) : '';
      return [
        idx + 1,
        r.month_sheet || '',
        r.record_year || '',
        r.customer_cif || bsd.customer_cif || r.rim_no || '',
        r.facility_reference || bsd.facility_reference || r.file_number || '',
        r.client_name || r.mortgagor_name || '',
        r.relationship_manager || bsd.relationship_manager || '',
        r.bank_branch_station || r.branch || '',
        r.security_type || bsd.security_type || '',
        r.title_type || bsd.title_type || '',
        r.property_description || '',
        loan,
        fsv,
        ltv,
        formatDate(r.date_instructed || bsd.date_instructed),
        formatDate(r.date_sent_registration || bsd.date_sent_registration),
        formatDate(r.date_registered || bsd.date_registered),
        Number(r.total_disbursements || 0),
        Number(r.legal_fees || 0),
        Number(r.vat_18 ?? r.vat ?? 0),
        Number(r.grand_total || 0),
        r.status || 'Active / Processing',
      ];
    });
    const suffix = `${selectedMonth}_${selectedYear}`.toLowerCase();
    exportRecordsToCsv(`im_bank_security_report_${suffix}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Dedicated Filter & Export Toolbar */}
      <div className="no-print bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              I&amp;M Bank Dedicated Collateral &amp; Valuation Report
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Independent CIF exposure, Forced Sale Value coverage, security mix, and registry billing.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export I&amp;M CSV</span>
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
              placeholder="Search CIF, facility ref, borrower, RM..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
            value={selectedSecurityType}
            onChange={(e) => setSelectedSecurityType(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 font-medium"
          >
            <option value="ALL">All Security Types</option>
            {IM_SECURITY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <select
              value={selectedRm}
              onChange={(e) => setSelectedRm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 font-medium"
            >
              <option value="ALL">All Relationship Mgrs</option>
              {rmOptions.map((rm) => (
                <option key={rm} value={rm}>{rm}</option>
              ))}
            </select>
            {(search || selectedYear !== 'ALL' || selectedMonth !== 'ALL' || selectedSecurityType !== 'ALL' || selectedRm !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedYear('ALL');
                  setSelectedMonth('ALL');
                  setSelectedSecurityType('ALL');
                  setSelectedRm('ALL');
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

      {/* KPI Summary Strip */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            I&amp;M Facilities
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-1 block">
            {filtered.length}
          </span>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
            {metrics.perfectedCount} perfected / registered
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Loan Exposure
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-1 block truncate">
            {formatUGX(metrics.loanTotal)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Forced Sale Value (FSV)
          </span>
          <span className="text-sm font-bold text-sky-700 dark:text-sky-400 font-mono tabular-nums mt-1 block truncate">
            {formatUGX(metrics.fsvTotal)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Collateral Coverage
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-1 block">
            {metrics.coverageRatio !== null ? `${metrics.coverageRatio.toFixed(1)}%` : 'N/A'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Total Billed (incl. Disb.)
          </span>
          <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 font-mono tabular-nums mt-1 block truncate">
            {formatUGX(metrics.totalBilled)}
          </span>
          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-mono tabular-nums">
            Disb: {formatUGX(metrics.totalDisb)}
          </span>
        </div>
      </div>

      {/* Breakdown Grids */}
      {filtered.length > 0 && (
        <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
              Exposure by Security Type
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-2 font-semibold">Security Type</th>
                    <th className="py-2 font-semibold text-right">Files</th>
                    <th className="py-2 font-semibold text-right">Loan Exposure</th>
                    <th className="py-2 font-semibold text-right">Grand Billed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {securityBreakdown.map(([label, stats]) => (
                    <tr key={label}>
                      <td className="py-2 font-medium text-slate-800 dark:text-slate-200">{label}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">{stats.count}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">{formatUGX(stats.loan)}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-sky-700 dark:text-sky-400">{formatUGX(stats.billed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
              Collateral Tenure Mix &amp; Valuation
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-2 font-semibold">Title Tenure</th>
                    <th className="py-2 font-semibold text-right">Titles</th>
                    <th className="py-2 font-semibold text-right">Loan Exposure</th>
                    <th className="py-2 font-semibold text-right">Forced Sale Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tenureBreakdown.map(([label, stats]) => (
                    <tr key={label}>
                      <td className="py-2 font-medium text-slate-800 dark:text-slate-200">{label}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">{stats.count}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">{formatUGX(stats.loan)}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">{formatUGX(stats.fsv)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Main Dedicated Report Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 dark:text-slate-400">
            No I&amp;M Bank records match the active report filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1160px] text-left border-collapse text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="w-12 py-3 px-3 text-center font-semibold">No.</th>
                  <th className="py-3 px-3 font-semibold">CIF / Facility Ref</th>
                  <th className="py-3 px-3 font-semibold">Borrower &amp; RM</th>
                  <th className="py-3 px-3 font-semibold">Security &amp; Tenure</th>
                  <th className="py-3 px-3 font-semibold">I&amp;M Branch</th>
                  <th className="py-3 px-3 font-semibold text-right">Loan Exposure</th>
                  <th className="py-3 px-3 font-semibold text-right">FSV &amp; LTV</th>
                  <th className="py-3 px-3 font-semibold">Registry Dates</th>
                  <th className="py-3 px-3 font-semibold text-right">Grand Total</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filtered.map((r, idx) => {
                  const bsd = r.bank_specific_data || {};
                  const cif = r.customer_cif || bsd.customer_cif || r.rim_no || '-';
                  const facRef = r.facility_reference || bsd.facility_reference || r.file_number || '-';
                  const rm = r.relationship_manager || bsd.relationship_manager || '';
                  const secType = r.security_type || bsd.security_type || 'Legal Mortgage';
                  const titleType = r.title_type || bsd.title_type || '-';
                  const loan = Number(r.loan_amount || 0);
                  const fsv = Number(r.forced_sale_value ?? bsd.forced_sale_value ?? 0);
                  const ltv = loan > 0 && fsv > 0 ? ((loan / fsv) * 100).toFixed(1) : null;

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
                        <div className="font-semibold text-sky-700 dark:text-sky-400">{cif}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{facRef}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {r.client_name || r.mortgagor_name || 'N/A'}
                        </div>
                        {rm && <div className="text-[11px] text-slate-500 dark:text-slate-400">RM: {rm}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{secType}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Tenure: {titleType}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {r.bank_branch_station || r.branch || '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                        {formatUGX(loan, true)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <div>{fsv > 0 ? formatUGX(fsv) : '-'}</div>
                        {ltv && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            LTV {ltv}%
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-400">
                        <div>Instr: {formatDate(r.date_instructed || bsd.date_instructed)}</div>
                        <div>Reg: {formatDate(r.date_registered || bsd.date_registered)}</div>
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
                  <td colSpan={5} className="py-3 px-3 uppercase tracking-wider text-[11px]">
                    Totals ({filtered.length} I&amp;M Facilities)
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {formatUGX(metrics.loanTotal)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-sky-700 dark:text-sky-400">
                    {formatUGX(metrics.fsvTotal)}
                  </td>
                  <td />
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

export default IMBankReportModule;
