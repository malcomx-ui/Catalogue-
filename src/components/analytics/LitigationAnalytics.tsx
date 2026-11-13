import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { loadCaseReport, CaseReportSummary } from '../../services/reportService';
import {
  BarChart3,
  TrendingUp,
  Building2,
  Scale,
  Briefcase,
  DollarSign,
  Gavel,
  ShieldAlert,
  PieChart,
  RefreshCw,
  Database,
  CheckCircle2,
} from 'lucide-react';

import { isUserAdmin } from '../../lib/supabase';
import { Lock } from 'lucide-react';

export const LitigationAnalytics: React.FC = () => {
  const { cases, branches, currentUser, setActiveTab } = useApp();

  // Strictly restricted to Super Admins / Managing Partners / Finance Officers (NOT Branch Admins)
  const isAdminOrFinance =
    isUserAdmin(currentUser) ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'superadmin' ||
    currentUser?.role === 'branch_admin_finance' ||
    currentUser?.role === 'partner' ||
    currentUser?.role === 'managing_partner' ||
    Boolean(currentUser?.isSuperAdmin);

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [reportData, setReportData] = useState<CaseReportSummary | null>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);

  // Fetch report via Supabase RPC get_case_summary
  const handleFetchReport = async (branchId: string) => {
    setLoadingReport(true);
    try {
      const summary = await loadCaseReport(branchId, cases);
      setReportData(summary);
    } catch (err) {
      console.error('Error in handleFetchReport:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (!isAdminOrFinance) return;
    handleFetchReport(selectedBranchId);
  }, [selectedBranchId, cases, isAdminOrFinance]);

  if (!isAdminOrFinance) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl text-center shadow-xs">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">Access Restricted</h2>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Firm Analytics &amp; Valuation Reports are reserved exclusively for the Managing Partner and Super Administrators. Branch Administrators can manage operational registers only within their assigned branch.
        </p>
        <button
          onClick={() => setActiveTab('dashboard')}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Fallback / active calculations
  const totalCasesCount = reportData?.total_cases ?? cases.length;
  const activeCasesCount = reportData?.active_cases ?? cases.filter(c => !c.status?.toLowerCase().includes('closed')).length;
  const pendingCasesCount = reportData?.pending_cases ?? cases.filter(c => c.status?.toLowerCase().includes('pending')).length;
  const closedCasesCount = reportData?.closed_cases ?? cases.filter(c => c.status?.toLowerCase().includes('closed')).length;
  const urgentCount = reportData?.urgent_cases ?? cases.filter(c => c.priority.includes('Urgent')).length;
  const totalValueUGX = reportData?.total_claim_value ?? cases.reduce((acc, c) => acc + c.claimValueUGX, 0);
  const totalValueUSD = Math.round(totalValueUGX / 3700);

  // Divisions map
  const divisionCounts: Record<string, { count: number; value: number }> = {};
  if (reportData?.divisions && Object.keys(reportData.divisions).length > 0) {
    Object.entries(reportData.divisions).forEach(([div, count]) => {
      divisionCounts[div] = { count: Number(count), value: 0 };
    });
    // Calculate values from matching cases
    cases.forEach((c) => {
      const key = c.division.replace('High Court ', '').replace('Court of Appeal / ', '');
      if (divisionCounts[key]) {
        divisionCounts[key].value += c.claimValueUGX;
      }
    });
  } else {
    cases.forEach((c) => {
      const key = c.division.replace('High Court ', '').replace('Court of Appeal / ', '');
      if (!divisionCounts[key]) {
        divisionCounts[key] = { count: 0, value: 0 };
      }
      divisionCounts[key].count += 1;
      divisionCounts[key].value += c.claimValueUGX;
    });
  }

  // Stages map
  const stageCounts: Record<string, number> = reportData?.stages || {};
  if (Object.keys(stageCounts).length === 0) {
    cases.forEach((c) => {
      stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
    });
  }

  const selectedBranchName = selectedBranchId === 'all'
    ? 'All Regional Circuits'
    : branches.find(b => b.id === selectedBranchId)?.name || 'Selected Branch';

  // Export report to CSV
  const exportReportToCSV = () => {
    if (!isAdminOrFinance) {
      console.warn('Access denied: Export is restricted to Administrators and Finance Officers.');
      return;
    }

    const reportHeaders = [
      'Report Metric / Dimension',
      'Value / Count',
      'Additional Notes',
    ];

    const reportRows = [
      ['Report Name', 'Case Summary Report', `Branch: ${selectedBranchName}`],
      ['Generated At', new Date().toLocaleString(), `User: ${currentUser?.name || currentUser?.email || 'Staff'}`],
      ['Total Matters', String(totalCasesCount), 'All docketed cases in scope'],
      ['Active Matters', String(activeCasesCount), 'Ongoing trials and hearings'],
      ['Pending & Reserved Matters', String(pendingCasesCount), 'Awaiting rulings or scheduled'],
      ['Closed & Concluded Matters', String(closedCasesCount), 'Decrees and concluded files'],
      ['Urgent / Injunction Matters', String(urgentCount), 'Expedited applications'],
      ['Total Claim Valuation (UGX)', String(totalValueUGX), `Approx USD $${(totalValueUSD / 1000000).toFixed(2)}M`],
    ];

    // Add Division Breakdown
    Object.entries(divisionCounts).forEach(([div, data]) => {
      reportRows.push([`Division: ${div}`, `${data.count} suits`, `UGX ${data.value.toLocaleString()}`]);
    });

    // Add Stage Funnel
    Object.entries(stageCounts).forEach(([stage, count]) => {
      reportRows.push([`Stage: ${stage}`, `${count} suits`, 'Procedural stage count']);
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [reportHeaders.join(','), ...reportRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const branchSlug = selectedBranchId === 'all' ? 'firm_wide' : selectedBranchId;
    link.setAttribute('download', `Case_Summary_Report_${branchSlug}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download report directly as a formatted printable PDF
  const downloadReportAsPDF = () => {
    if (!isAdminOrFinance) {
      console.warn('Access denied: PDF downloads are restricted to Administrators and Finance Officers.');
      return;
    }

    // Direct, pristine PDF generation via print-to-PDF / specialized iframe print
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      // Fallback to window.print if popup blocked
      window.print();
      return;
    }

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Case Summary Report - ${selectedBranchName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #0f172a; margin: 0; }
            h1 { font-size: 24px; color: #0f172a; margin: 0 0 6px 0; border-bottom: 2px solid #b45309; padding-bottom: 8px; }
            .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
            .kpi-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .kpi-val { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 4px; }
            .section-title { font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
            th { background-color: #f1f5f9; color: #475569; text-transform: uppercase; font-size: 10px; }
            .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; }
            @media print {
              body { padding: 15mm; }
            }
          </style>
        </head>
        <body>
          <h1>Case Summary Report</h1>
          <div class="meta">
            Scope: <strong>${selectedBranchName}</strong> &nbsp;|&nbsp; 
            Generated: <strong>${new Date().toLocaleString()}</strong> &nbsp;|&nbsp; 
            Generated By: <strong>${currentUser?.name || currentUser?.email || 'Authorized Officer'}</strong>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Total Claim Valuation</div>
              <div class="kpi-val">UGX ${(totalValueUGX / 1000000000).toFixed(2)}B</div>
              <small style="color: #64748b;">≈ USD $${(totalValueUSD / 1000000).toFixed(2)}M</small>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Case Docket Summary</div>
              <div class="kpi-val">${totalCasesCount} Matters</div>
              <small style="color: #059669;">${activeCasesCount} Active</small>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Pending & Reserved</div>
              <div class="kpi-val">${pendingCasesCount} Suits</div>
              <small style="color: #4338ca;">${closedCasesCount} Closed</small>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Injunctions & Expedited</div>
              <div class="kpi-val" style="color: #be123c;">${urgentCount} Urgent</div>
              <small style="color: #64748b;">Interim Relief</small>
            </div>
          </div>

          <div class="section-title">Judicial Division Distribution</div>
          <table>
            <thead>
              <tr>
                <th>Judicial Division</th>
                <th>Suits Count</th>
                <th>Estimated Claim Valuation</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(divisionCounts).map(([div, data]) => `
                <tr>
                  <td><strong>${div}</strong></td>
                  <td>${data.count} suits</td>
                  <td>${data.value > 0 ? `UGX ${data.value.toLocaleString()}` : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">Procedural Stage Funnel</div>
          <table>
            <thead>
              <tr>
                <th>Procedural Stage</th>
                <th>Caseload Count</th>
                <th>Pipeline Share</th>
              </tr>
            </thead>
            <tbody>
              ${[
                'Pleadings & Defense',
                'Mediation & Scheduling',
                'Trial (Plaintiff Stage)',
                'Trial (Defense Stage)',
                'Final Legal Submissions',
                'Judgment / Ruling Reserved',
                'Decree & Execution',
              ].map(stg => {
                const count = stageCounts[stg] || 0;
                const pct = totalCasesCount > 0 ? Math.round((count / totalCasesCount) * 100) : 0;
                return `
                  <tr>
                    <td>${stg}</td>
                    <td><strong>${count}</strong> suits</td>
                    <td>${pct}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            CONFIDENTIAL LEGAL WORK PRODUCT · SUPABASE RPC DATA INTEGRATION (get_case_summary) · GENERATED FOR LAW FIRM PRACTICE RECORD
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };

  // Expose on window for convenience and console testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).exportReportToCSV = exportReportToCSV;
      (window as any).downloadReportAsPDF = downloadReportAsPDF;
    }
  }, [selectedBranchName, totalCasesCount, activeCasesCount, pendingCasesCount, closedCasesCount, urgentCount, totalValueUGX, divisionCounts, stageCounts, isAdminOrFinance]);

  // Render Report Actions function matching the exact user specification
  const renderReportActions = (user: typeof currentUser) => {
    const isAllowed = isUserAdmin(user) || user?.role === 'super_admin' || user?.role === 'superadmin' || user?.role === 'branch_admin_finance' || user?.role === 'partner' || user?.role === 'managing_partner' || Boolean(user?.isSuperAdmin);

    if (!isAllowed) {
      return (
        <p className="text-muted text-xs text-slate-500 italic">
          Printing and PDF downloads are restricted to Administrators and Finance Officers.
        </p>
      );
    }

    return (
      <div className="admin-report-actions flex flex-wrap items-center gap-2">
        {/* 1. Print directly using browser print stylesheet */}
        <button
          onClick={() => window.print()}
          className="btn-print px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-medium transition-colors shadow-2xs flex items-center gap-1.5"
        >
          🖨️ Print Report
        </button>

        {/* 2. Download directly as a PDF */}
        <button
          onClick={downloadReportAsPDF}
          className="btn-pdf px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-md text-xs font-medium transition-colors shadow-2xs flex items-center gap-1.5"
        >
          📄 Download PDF
        </button>

        {/* 3. Export CSV */}
        <button
          onClick={exportReportToCSV}
          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-medium transition-colors shadow-2xs flex items-center gap-1.5"
        >
          Export CSV
        </button>
      </div>
    );
  };

  return (
    <div className="report-container space-y-5">
      {/* Top Banner with Branch Report Filter and Admin Actions */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
            <BarChart3 className="w-4 h-4" />
            <span>Practice Intelligence &amp; Case Report Summary</span>
            <span className="text-slate-300">·</span>
            <span>Managing Partner Overview</span>
          </div>
          <h2 className="font-serif-legal text-2xl font-bold text-slate-900 mt-1">
            Case Summary Report
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time practice performance metrics, claim valuation, and branch caseload summary generated via <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">get_case_summary</code>.
          </p>
        </div>

        {/* Branch Report Filter & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-2"
            >
              <option value="all">Firm-Wide (All 7 Circuits)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleFetchReport(selectedBranchId)}
            disabled={loadingReport}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs disabled:opacity-50"
            title="Execute Supabase RPC get_case_summary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingReport ? 'animate-spin' : ''}`} />
            <span>{loadingReport ? 'Querying...' : 'Run RPC'}</span>
          </button>

          {reportData?.source === 'supabase_rpc' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>RPC Live</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              <Database className="w-3 h-3 text-blue-600" />
              <span>Practice Data</span>
            </span>
          )}
        </div>
      </div>

      {/* Role-based Export / Print Action Header */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Current Scope:</span> {selectedBranchName} · <span className="font-mono-legal text-slate-700">{totalCasesCount} matters</span>
        </div>

        {renderReportActions(currentUser)}
      </div>

      {/* Report charts and tables display here for everyone */}
      <div id="report-content" className="space-y-5">

      {/* KPI Metric Cards Loaded from Case Report */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Claim Valuation */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Total Claim Valuation</span>
            <DollarSign className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="font-mono-legal text-2xl font-bold text-slate-900 mt-1">
            UGX {(totalValueUGX / 1000000000).toFixed(2)}B
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono-legal">
            ≈ USD ${(totalValueUSD / 1000000).toFixed(2)}M in dispute / recovery
          </div>
        </div>

        {/* Card 2: Active vs Total Files */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Case Docket Summary</span>
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="font-mono-legal text-2xl font-bold text-slate-900 mt-1">
            {totalCasesCount} <span className="text-sm font-normal text-slate-500">total matters</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>{activeCasesCount} active</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 font-normal">{selectedBranchName}</span>
          </div>
        </div>

        {/* Card 3: Upcoming & Reserved */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Pending &amp; Reserved Rulings</span>
            <Gavel className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="font-mono-legal text-2xl font-bold text-indigo-700 mt-1">
            {pendingCasesCount} <span className="text-sm font-normal text-slate-500">pending</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {closedCasesCount} decrees &amp; concluded files
          </div>
        </div>

        {/* Card 4: Injunctions & Expedited */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Injunctions &amp; Expedited</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="font-mono-legal text-2xl font-bold text-rose-700 mt-1">
            {urgentCount} <span className="text-sm font-normal text-slate-500">urgent</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Restraining orders &amp; interim applications
          </div>
        </div>
      </div>

      {/* Grid: Division Breakdown & Stage Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Division Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-legal text-lg font-bold text-slate-900">
              Judicial Division Distribution
            </h3>
            <span className="text-xs text-slate-500 font-mono-legal">Suits ({selectedBranchName})</span>
          </div>

          <div className="space-y-3">
            {Object.keys(divisionCounts).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No suits recorded for this division.</p>
            ) : (
              Object.entries(divisionCounts).map(([division, data]) => {
                const pct = totalCasesCount > 0 ? Math.round((data.count / totalCasesCount) * 100) : 0;

                return (
                  <div key={division} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-800 font-medium">
                      <span>{division} ({data.count} suits)</span>
                      <span className="font-mono-legal">
                        {data.value > 0 ? `UGX ${(data.value / 1000000000).toFixed(2)}B ` : ''}({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Procedural Stage Funnel */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <h3 className="font-serif-legal text-lg font-bold text-slate-900">
            Procedural Stage Funnel ({selectedBranchName})
          </h3>

          <div className="space-y-2.5">
            {[
              'Pleadings & Defense',
              'Mediation & Scheduling',
              'Trial (Plaintiff Stage)',
              'Trial (Defense Stage)',
              'Final Legal Submissions',
              'Judgment / Ruling Reserved',
              'Decree & Execution',
            ].map((stg) => {
              const count = stageCounts[stg] || 0;
              const pct = totalCasesCount > 0 ? Math.round((count / totalCasesCount) * 100) : 0;

              return (
                <div key={stg} className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                    <span className="font-medium text-slate-800">{stg}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono-legal">
                    <span className="font-bold text-slate-900">{count} suits</span>
                    <span className="text-slate-400 text-[11px]">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Regional Branch Caseload Matrix */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <h3 className="font-serif-legal text-lg font-bold text-slate-900 mb-3">
          Branch Caseload &amp; Resident Advocate Deployment
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="pb-2 font-semibold">Branch Office</th>
                <th className="pb-2 font-semibold">City Circuit</th>
                <th className="pb-2 font-semibold">Team Lead / Partner</th>
                <th className="pb-2 font-semibold">Office Admin</th>
                <th className="pb-2 font-semibold">Clerk</th>
                <th className="pb-2 font-semibold text-center">Lawyers</th>
                <th className="pb-2 font-semibold text-center">Active</th>
                <th className="pb-2 font-semibold text-center">Closed</th>
                <th className="pb-2 font-semibold text-center">Archived</th>
                <th className="pb-2 font-semibold text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((b) => {
                const targetCity = (b.city || '').toLowerCase();
                const targetName = (b.name || '').toLowerCase();
                const branchCases = cases.filter((c) => {
                  const bId = c.branchId;
                  const bName = (c.branch || c.branchName || '').toLowerCase();
                  return bId === b.id || bName.includes(targetCity) || bName.includes(targetName);
                });
                const activeCount = branchCases.filter((c) => {
                  const s = (c.status || 'Active').toLowerCase();
                  const isClosedOrArchived = s === 'closed' || s === 'archived' || s.includes('closed') || s.includes('concluded') || Boolean(c.year_of_closure);
                  return !isClosedOrArchived && (s.includes('active') || s.includes('ongoing') || s.includes('mention') || s.includes('instructions'));
                }).length;
                const closedCount = branchCases.filter((c) => {
                  const s = (c.status || '').toLowerCase();
                  return (
                    (s === 'closed' ||
                    s.includes('closed') ||
                    s === 'concluded' ||
                    s === 'resolved' ||
                    Boolean(c.year_of_closure)) &&
                    s !== 'archived' &&
                    !s.includes('archived')
                  );
                }).length;
                const archivedCount = branchCases.filter((c) => {
                  const s = (c.status || '').toLowerCase();
                  return s === 'archived' || s.includes('archived') || (c.file_location || '').toLowerCase().includes('archive');
                }).length;

                const isSelected = selectedBranchId === b.id;

                return (
                  <tr
                    key={b.id}
                    onClick={() => setSelectedBranchId(b.id)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-amber-50/80' : 'hover:bg-slate-50/70'}`}
                  >
                    <td className="py-2.5 font-medium text-slate-900 flex items-center gap-2">
                      <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span>{b.name}</span>
                    </td>
                    <td className="py-2.5 text-slate-600">{b.city}</td>
                    <td className="py-2.5 text-slate-800 font-medium">
                      {b.teamLead}
                    </td>
                    <td className="py-2.5 text-slate-600">{b.officeAdmin}</td>
                    <td className="py-2.5 text-slate-600">{b.clerk}</td>
                    <td className="py-2.5 text-center font-mono text-slate-800">{b.lawyersCount}</td>
                    <td className="py-2.5 text-center font-mono font-semibold text-emerald-700">{activeCount}</td>
                    <td className="py-2.5 text-center font-mono font-medium text-slate-700">{closedCount}</td>
                    <td className="py-2.5 text-center font-mono font-semibold text-zinc-700">{archivedCount}</td>
                    <td className="py-2.5 text-center font-mono font-bold text-slate-900">{branchCases.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
};

export default LitigationAnalytics;
