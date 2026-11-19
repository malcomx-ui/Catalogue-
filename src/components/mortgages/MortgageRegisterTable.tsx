import React, { useState, useEffect } from 'react';
import { Eye, Edit3, Trash2, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchCentenaryMortgagesPage, CentenaryPageFilters } from '../../services/mortgages';
import { RowActionMenu } from '../common/RowActionMenu';

export interface MortgageRegisterTableProps {
  /** Optional externally managed records (when integrated in BankWorkspace). If omitted, component self-fetches via fetchCentenaryMortgagesPage. */
  records?: any[];
  loading?: boolean;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  filters?: CentenaryPageFilters;
  onPageChange?: (nextPage: number) => void;
  onPageSizeChange?: (nextSize: number) => void;
  onInspectRecord?: (record: any) => void;
  onEditRecord?: (record: any) => void;
  onDeleteRecord?: (record: any) => void;
  canModifyRecord?: (record: any) => boolean;
  viewOnlyBranchLabel?: string;
  showHeader?: boolean;
  title?: string;
  emptyState?: React.ReactNode;
  printTotals?: {
    loan: number;
    grandTotal: number;
  };
}

const formatAmount = (val: any): string => {
  const num = Number(val || 0);
  if (!val || isNaN(num) || num === 0) return '-';
  return num.toLocaleString();
};

const formatDate = (val: any): string => {
  if (!val) return '-';
  const str = String(val).trim();
  if (!str) return '-';
  return str.slice(0, 10);
};

export default function MortgageRegisterTable({
  records,
  loading: externalLoading,
  page: externalPage,
  pageSize: externalPageSize,
  totalCount: externalTotalCount,
  filters,
  onPageChange,
  onPageSizeChange,
  onInspectRecord,
  onEditRecord,
  onDeleteRecord,
  canModifyRecord,
  viewOnlyBranchLabel = 'your assigned branch',
  showHeader = false,
  title = 'Centenary Bank Mortgage Register',
  emptyState,
  printTotals,
}: MortgageRegisterTableProps) {
  const isControlled = records !== undefined;

  const [internalMortgages, setInternalMortgages] = useState<any[]>([]);
  const [internalLoading, setInternalLoading] = useState<boolean>(!isControlled);
  const [internalPage, setInternalPage] = useState<number>(1);
  const [internalPageSize, setInternalPageSize] = useState<number>(externalPageSize || 25);
  const [internalTotalCount, setInternalTotalCount] = useState<number>(0);

  const page = isControlled ? externalPage || 1 : internalPage;
  const pageSize = isControlled ? externalPageSize || 25 : internalPageSize;
  const mortgages = isControlled ? records : internalMortgages;
  const loading = isControlled ? Boolean(externalLoading) : internalLoading;
  const totalCount = isControlled ? externalTotalCount ?? records.length : internalTotalCount;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  useEffect(() => {
    if (isControlled) return;
    let isMounted = true;

    async function loadData() {
      setInternalLoading(true);
      const { data, count } = await fetchCentenaryMortgagesPage(internalPage, internalPageSize, filters);
      if (isMounted) {
        setInternalMortgages(data);
        setInternalTotalCount(count);
        setInternalLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isControlled, internalPage, internalPageSize, filters?.search, filters?.month, filters?.branch, filters?.status]);

  const handleSetPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    if (onPageChange) {
      onPageChange(clamped);
    } else {
      setInternalPage(clamped);
    }
  };

  const handleSetPageSize = (nextSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(nextSize);
    } else {
      setInternalPageSize(nextSize);
      setInternalPage(1);
    }
  };

  const hasActions = Boolean(onInspectRecord || onEditRecord || onDeleteRecord);
  const colSpanCount = hasActions ? 9 : 8;

  return (
    <div className="space-y-3 w-full min-w-0">
      {showHeader && (
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Total Records: {totalCount.toLocaleString()}
          </span>
        </div>
      )}

      {/* Lightweight Paginated Register Table */}
      <div className="mortgage-print-table-wrap w-full max-w-full overflow-x-auto overscroll-x-contain scroll-smooth">
        <table className="mortgage-print-table w-full min-w-[960px] text-left border-collapse">
          <thead className="bg-slate-50/90 dark:bg-slate-800/60 print:bg-slate-50 border-b border-slate-200/80 dark:border-slate-800">
            <tr className="divide-x divide-slate-200/60 dark:divide-slate-800 print:divide-x-0">
              <th className="w-12 py-3 px-3 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                No.
              </th>
              <th className="w-[120px] py-3 px-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Date Received
              </th>
              <th className="w-[165px] py-3 px-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Bank Branch
              </th>
              <th className="min-w-[200px] py-3 px-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Client Name
              </th>
              <th className="w-[120px] py-3 px-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                RIM No
              </th>
              <th className="print-col-num w-[140px] py-3 px-3.5 text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Loan Amount
              </th>
              <th className="print-col-num w-[140px] py-3 px-3.5 text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Grand Total
              </th>
              <th className="w-[120px] py-3 px-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Date Returned
              </th>
              {hasActions && (
                <th className="print:hidden w-[64px] py-3 px-3 text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 print:bg-white text-slate-800 dark:text-slate-200 print:text-slate-800">
            {loading ? (
              Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <td colSpan={colSpanCount} className="py-3 px-4">
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : mortgages.length === 0 ? (
              <tr>
                <td colSpan={colSpanCount} className="px-4 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  {emptyState || 'No records found.'}
                </td>
              </tr>
            ) : (
              mortgages.map((item, idx) => {
                const rowNo = (page - 1) * pageSize + idx + 1;
                const receiptText = formatDate(item.date_of_receipt);
                const returnText = formatDate(item.date_of_return);
                const branchText =
                  item.bank_branch_station ||
                  item.bank_branch ||
                  item.client_branch_location ||
                  item.branch ||
                  '-';
                const clientText =
                  item.client_name || item.mortgagor_name || item.borrower_name || item.name || 'N/A';
                const rimText = item.rim_no || item.file_number || '-';
                const canModifyRow = canModifyRecord ? canModifyRecord(item) : true;

                return (
                  <tr
                    key={item.id || rowNo}
                    onClick={() => onInspectRecord?.(item)}
                    className={`hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors divide-x divide-slate-100/70 dark:divide-slate-800 print:divide-x-0 ${
                      onInspectRecord ? 'cursor-pointer' : ''
                    }`}
                  >
                    <td className="py-3 px-3 text-center text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {rowNo}
                    </td>
                    <td className="print-col-text py-3 px-3.5 text-left text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {receiptText}
                    </td>
                    <td
                      className="print-col-text py-3 px-3.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]"
                      title={branchText}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="truncate">{branchText}</span>
                        {!canModifyRow && (
                          <span
                            className="print:hidden text-amber-600 dark:text-amber-400 inline-flex shrink-0"
                            title="View-only (external branch)"
                          >
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className="print-col-text py-3 px-3.5 text-left text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[260px]"
                      title={clientText}
                    >
                      {clientText}
                    </td>
                    <td className="print-col-text py-3 px-3.5 text-left text-xs font-mono tabular-nums font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {rimText}
                    </td>
                    <td className="print-col-num py-3 px-3.5 text-right text-xs font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatAmount(item.loan_amount)}
                    </td>
                    <td className="print-col-num py-3 px-3.5 text-right text-xs font-mono tabular-nums font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                      {formatAmount(item.grand_total)}
                    </td>
                    <td className="print-col-text py-3 px-3.5 text-left text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {returnText}
                    </td>
                    {hasActions && (
                      <td
                        className="print:hidden py-3 px-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RowActionMenu
                          ariaLabel={`Actions for ${clientText}`}
                          items={[
                            ...(onInspectRecord
                              ? [
                                  {
                                    id: 'view',
                                    label: 'Inspect Full Record',
                                    icon: <Eye className="w-3.5 h-3.5" />,
                                    onClick: () => onInspectRecord(item),
                                  },
                                ]
                              : []),
                            ...(onEditRecord
                              ? [
                                  {
                                    id: 'edit',
                                    label: canModifyRow ? 'Edit / Transfer File' : 'Edit (View Only)',
                                    icon: <Edit3 className="w-3.5 h-3.5" />,
                                    disabled: !canModifyRow,
                                    disabledReason: `View-Only: Editing disabled outside ${viewOnlyBranchLabel}`,
                                    onClick: () => onEditRecord(item),
                                  },
                                ]
                              : []),
                            ...(onDeleteRecord
                              ? [
                                  {
                                    id: 'delete',
                                    label: canModifyRow ? 'Delete Record' : 'Delete (View Only)',
                                    icon: <Trash2 className="w-3.5 h-3.5" />,
                                    danger: true,
                                    dividerBefore: true,
                                    disabled: !canModifyRow,
                                    disabledReason: `View-Only: Deleting disabled outside ${viewOnlyBranchLabel}`,
                                    onClick: () => onDeleteRecord(item),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    )}
                  </tr>
                );
              })
            )}

            {printTotals && mortgages.length > 0 && (
              <tr
                className="hidden print:table-row mortgage-print-totals-row bg-slate-50 border-t-2 border-[#1e3a8a] font-bold text-slate-900"
                style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
              >
                <td colSpan={5} className="print-col-text py-2.5 px-3.5 text-left text-xs uppercase tracking-wider">
                  TOTAL RECORDS: {totalCount} · TOTAL UGX
                </td>
                <td className="print-col-num py-2.5 px-3.5 text-right text-xs font-mono tabular-nums">
                  {printTotals.loan.toLocaleString()}
                </td>
                <td className="print-col-num py-2.5 px-3.5 text-right text-xs font-mono tabular-nums text-blue-800">
                  {printTotals.grandTotal.toLocaleString()}
                </td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="no-print px-4 sm:px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-400">
          <span className="font-mono tabular-nums">
            Showing <strong className="text-slate-900 dark:text-slate-100">{startIndex}–{endIndex}</strong> of{' '}
            <strong className="text-slate-900 dark:text-slate-100">{totalCount.toLocaleString()}</strong> records
          </span>

          <label className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span>Rows:</span>
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => handleSetPageSize(Number(e.target.value))}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono tabular-nums text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSetPage(page - 1)}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold disabled:opacity-45 disabled:cursor-not-allowed transition whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <span className="px-2 text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>

          <button
            type="button"
            onClick={() => handleSetPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold disabled:opacity-45 disabled:cursor-not-allowed transition whitespace-nowrap shrink-0"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
