import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Building2,
  Calendar,
} from 'lucide-react';
import { MortgageService, DEFAULT_BANKS, MONTHS } from '../../services/mortgageService';

export interface ImportMortgagesModalProps {
  defaultBank?: string;
  defaultMonth?: string;
  defaultYear?: number;
  onClose: () => void;
  onSuccess: (meta?: { count?: number; cloudSaved?: boolean; cloudError?: string }) => void;
}

export const ImportMortgagesModal: React.FC<ImportMortgagesModalProps> = ({
  defaultBank = 'Centenary Bank',
  defaultMonth,
  defaultYear,
  onClose,
  onSuccess,
}) => {
  const initialMonth =
    defaultMonth && MONTHS.includes(defaultMonth)
      ? defaultMonth
      : MONTHS[new Date().getMonth()];

  const [selectedBank, setSelectedBank] = useState<string>(defaultBank);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [recordYear, setRecordYear] = useState<number>(
    defaultYear || new Date().getFullYear()
  );

  const [fileName, setFileName] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetSelection, setSheetSelection] = useState<string>('ALL');
  const [workbookExtractor, setWorkbookExtractor] = useState<
    ((options: {
      bankName: string;
      monthSheet: string;
      recordYear: number;
      sheetSelection?: string;
    }) => any[]) | null
  >(null);

  const [importing, setImporting] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const bankOptions = useMemo(() => {
    const list = [...DEFAULT_BANKS];
    if (defaultBank && !list.includes(defaultBank)) {
      list.unshift(defaultBank);
    }
    return list;
  }, [defaultBank]);

  // Live parsed records whenever bank, month, year, or sheet changes
  const parsedRecords = useMemo(() => {
    if (!workbookExtractor) return [];
    return workbookExtractor({
      bankName: selectedBank,
      monthSheet: selectedMonth,
      recordYear: recordYear || new Date().getFullYear(),
      sheetSelection,
    });
  }, [workbookExtractor, selectedBank, selectedMonth, recordYear, sheetSelection]);

  const handleFileLoad = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setProgressMsg(null);
    setFileName(file.name);

    try {
      const wb = await MortgageService.readExcelWorkbook(file);
      setSheetNames(wb.sheetNames);
      setWorkbookExtractor(() => wb.extractRecords);

      // Auto-select sheet if one matches the currently selected month
      const shortMonth = selectedMonth.slice(0, 3).toLowerCase();
      const fullMonth = selectedMonth.toLowerCase();
      const matchingSheet = wb.sheetNames.find((s) => {
        const clean = s.trim().toLowerCase();
        return clean === fullMonth || clean === shortMonth || clean.includes(fullMonth);
      });

      if (wb.sheetNames.length === 1) {
        setSheetSelection(wb.sheetNames[0]);
      } else if (matchingSheet) {
        setSheetSelection(matchingSheet);
      } else {
        setSheetSelection('ALL');
      }
    } catch (err: any) {
      setWorkbookExtractor(null);
      setSheetNames([]);
      setErrorMsg(err?.message || 'Could not read Excel file. Please ensure it is a valid .xlsx, .xls, or .csv workbook.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileLoad(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileLoad(file);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!workbookExtractor) {
      setErrorMsg('Please select an Excel file (.xlsx, .xls, or .csv) first.');
      return;
    }

    if (parsedRecords.length === 0) {
      setErrorMsg('No valid mortgage rows with a Client Name were detected in the selected sheet.');
      return;
    }

    setImporting(true);
    setProgressMsg(`Importing ${parsedRecords.length} records into ${selectedBank} (${selectedMonth} ${recordYear})...`);

    const result = await MortgageService.importExcelMortgages(
      parsedRecords,
      selectedBank,
      (msg) => setProgressMsg(msg)
    );

    setImporting(false);
    setProgressMsg(null);

    if (result.success) {
      setSuccessMsg(
        result.cloudSaved
          ? `Successfully imported ${result.count} mortgage records to ${selectedBank} for ${selectedMonth} ${recordYear}.`
          : `Imported ${result.count} mortgage records to workstation register for ${selectedBank} (${selectedMonth} ${recordYear}).`
      );
      setTimeout(() => {
        onSuccess({
          count: result.count,
          cloudSaved: result.cloudSaved,
          cloudError: result.cloudError,
        });
        onClose();
      }, 850);
    } else {
      setErrorMsg(result.error || 'Import failed. Please check the Excel format and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Import Excel Mortgages Data
              </h2>
              <p className="text-[11px] text-emerald-200/90 mt-0.5">
                Upload an Excel register (.xlsx, .xls, .csv) directly into the selected Bank &amp; Month
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleImport} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Feedback Banners */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {progressMsg && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between text-blue-800">
              <span>{progressMsg}</span>
              <span className="animate-spin text-sm">⏳</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* Target Destination: Bank, Month, Year */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Target Bank &amp; Reporting Month</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Bank <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  disabled={importing}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {bankOptions.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Month <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  disabled={importing}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Record Year <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={recordYear}
                  onChange={(e) =>
                    setRecordYear(parseInt(e.target.value, 10) || new Date().getFullYear())
                  }
                  disabled={importing}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Excel File Upload Area */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>2. Select Excel Workbook (.xlsx, .xls, .csv)</span>
            </div>

            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/70'
                  : 'border-slate-300 bg-slate-50/60 hover:border-emerald-400 hover:bg-emerald-50/30'
              }`}
            >
              <Upload className="w-7 h-7 text-emerald-600 mb-2" />
              <span className="font-semibold text-slate-800 text-sm">
                {fileName ? fileName : 'Click to browse or drag & drop Excel file'}
              </span>
              <span className="text-[11px] text-slate-500 mt-1">
                Supports tracker sheets with Name, Branch, RIM NO., Description, Loan Amount, Disbursements, Legal Fees, VAT &amp; Grand Total
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>

          {/* Sheet Selector & Live Preview */}
          {sheetNames.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-800 block">
                    Workbook Preview ({parsedRecords.length} valid records)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Destination: <strong className="text-emerald-700">{selectedBank}</strong> ·{' '}
                    <strong className="text-blue-700">{selectedMonth} {recordYear}</strong>
                  </span>
                </div>

                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label className="font-semibold text-slate-600 whitespace-nowrap">
                      Excel Sheet:
                    </label>
                    <select
                      value={sheetSelection}
                      onChange={(e) => setSheetSelection(e.target.value)}
                      disabled={importing}
                      className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="ALL">All Sheets ({sheetNames.length})</option>
                      {sheetNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {parsedRecords.length > 0 ? (
                <div className="w-full max-w-full overflow-x-auto overscroll-x-contain border border-slate-200 rounded-lg">
                  <table className="w-full min-w-max text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 whitespace-nowrap">
                        <th className="py-2 px-3.5 font-semibold whitespace-nowrap">Client Name</th>
                        <th className="py-2 px-3.5 font-semibold whitespace-nowrap">Branch</th>
                        <th className="py-2 px-3.5 font-semibold whitespace-nowrap">RIM No.</th>
                        <th className="py-2 px-3.5 font-semibold whitespace-nowrap">Property Description</th>
                        <th className="py-2 px-3.5 font-semibold whitespace-nowrap text-right">Loan Amount</th>
                        <th className="py-2 px-3.5 font-semibold whitespace-nowrap text-right">Disbursements</th>
                        <th className="py-2 px-3.5 font-semibold whitespace-nowrap text-right">Legal Fees</th>
                        <th className="py-2 px-3.5 font-semibold whitespace-nowrap text-right">VAT 18%</th>
                        <th className="py-2 px-3.5 font-semibold whitespace-nowrap text-right">Grand Total</th>
                        <th className="py-2 px-3.5 font-semibold whitespace-nowrap">Comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {parsedRecords.slice(0, 5).map((rec, i) => (
                        <tr key={i} className="hover:bg-slate-50 whitespace-nowrap">
                          <td className="py-2 px-3.5 font-semibold text-slate-900 whitespace-nowrap">{rec.client_name}</td>
                          <td className="py-2 px-3.5 whitespace-nowrap">{rec.branch || '-'}</td>
                          <td className="py-2 px-3.5 font-mono whitespace-nowrap">{rec.rim_no || '-'}</td>
                          <td className="py-2 px-3.5 text-slate-700 whitespace-nowrap">
                            {rec.property_description || '-'}
                          </td>
                          <td className="py-2 px-3.5 font-mono text-right whitespace-nowrap">
                            UGX {Number(rec.loan_amount || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-3.5 font-mono text-right whitespace-nowrap">
                            UGX {Number(rec.total_disbursements || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-3.5 font-mono text-right whitespace-nowrap">
                            UGX {Number(rec.legal_fees || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-3.5 font-mono text-right whitespace-nowrap">
                            UGX {Number(rec.vat_18 || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-3.5 font-mono text-right font-semibold text-blue-700 whitespace-nowrap">
                            UGX {Number(rec.grand_total || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-3.5 text-slate-600 whitespace-nowrap">{rec.comments || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRecords.length > 5 && (
                    <div className="bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500 border-t border-slate-200">
                      + {parsedRecords.length - 5} more rows ready to import
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                  No rows with a valid Client Name column were found in this sheet selection.
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={importing || parsedRecords.length === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {importing
                  ? 'Importing Records...'
                  : parsedRecords.length > 0
                  ? `Import ${parsedRecords.length} Records to ${selectedMonth}`
                  : 'Import Excel Data'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportMortgagesModal;
