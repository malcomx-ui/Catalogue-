import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Download,
  Users,
} from 'lucide-react';
import { UgxCurrencyIcon } from '../common/UgxCurrencyIcon';
import { cleanCaseNumber } from '../../utils/caseNumber';

export const ImportExcelModal: React.FC = () => {
  const {
    isImportModalOpen,
    setIsImportModalOpen,
    importCasesFromExcel,
    clearAllCases,
    branches,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);

  if (!isImportModalOpen) return null;

  const normalizeKey = (key: string) => {
    return key
      .toLowerCase()
      .trim()
      .replace(/[\s\-_/.]+/g, '');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setImportSuccess(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = (fileToParse: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setError('The uploaded Excel spreadsheet appears to be empty or has no rows.');
          setIsProcessing(false);
          return;
        }

        // Map columns flexibly
        const mapped = rawJson.map((row) => {
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach((k) => {
            normalizedRow[normalizeKey(k)] = row[k];
          });

          const getValue = (...possibleKeys: string[]) => {
            for (const key of possibleKeys) {
              const norm = normalizeKey(key);
              if (normalizedRow[norm] !== undefined && normalizedRow[norm] !== '') {
                return String(normalizedRow[norm]).trim();
              }
            }
            return '';
          };

          const rawPersons = getValue(
            'person_in_conduct',
            'personinconduct',
            'persons_in_conduct',
            'personsinconduct',
            'lead_advocate',
            'leadadvocate',
            'counsel',
            'advocate',
            'assignedadvocates',
            'lawyer',
            'lawyers',
            'handlingadvocate',
            'conduct'
          );

          // Support multiple persons in conduct (separated by comma, semicolon, or newline)
          const personsList = rawPersons
            ? rawPersons.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
            : [];

          const rawCaseNumber = getValue(
            'case_number',
            'casenumber',
            'case_no',
            'caseno',
            'casenos',
            'suit_number',
            'suitnumber',
            'suit_no',
            'suitno',
            'suit',
            'case',
            'cause',
            'causeno',
            'causenumber',
            'civilsuit',
            'civilsuitno',
            'civilsuitnumber',
            'fileno',
            'filenumber',
            'file_no',
            'refno',
            'fileref',
            'reference',
            'courtfileno',
            'courtref',
            'hct',
            'hctno',
            'hctnumber',
            'hctcaseno',
            'matter_no',
            'matterno'
          );

          // Maintain exact case number verbatim if present, or clean empty string if absent
          const cleanCaseNum = cleanCaseNumber(rawCaseNumber);

          return {
            case_number: cleanCaseNum,
            title: getValue(
              'title',
              'casetitle',
              'matter',
              'parties',
              'suitname',
              'casename',
              'mattername',
              'cause',
              'plaintiffvsdefendant',
              'versus'
            ),
            branch: getValue('branch', 'branchname', 'office', 'station', 'circuit') || 'Kampala Central (Head Office)',
            client: getValue('client', 'clientname', 'party', 'plaintiff', 'applicant', 'appellant', 'claimant'),
            case_type: getValue('case_type', 'casetype', 'natureofcase', 'natureofsuit', 'type', 'division') || 'Civil',
            status: getValue('status', 'casestatus', 'state', 'currentstatus') || 'active',
            date_of_instructions: getValue('date_of_instructions', 'dateofinstructions', 'instructionsdate', 'doi', 'datefiled', 'date', 'instructiondate', 'filingdate'),
            court: getValue('court', 'courtname', 'station', 'division', 'forum') || 'High Court of Uganda',
            district: getValue('district', 'city', 'location') || 'Kampala',
            subject_matter: getValue('subject_matter', 'subjectmatter', 'summary', 'briefsummary', 'claim', 'matterdetails', 'brief', 'facts'),
            notes: getValue('notes', 'remarks', 'comments', 'internalnotes'),
            hearing_date: getValue('hearing_date', 'hearingdate', 'nexthearingdate', 'nextdate', 'courtdate', 'nexthearing'),
            target: getValue('target', 'objective', 'targetoutcome'),
            file_location: getValue('file_location', 'filelocation', 'locationofphysicalfile', 'physicalfile', 'cabinet', 'shelf'),
            year_of_closure: getValue('year_of_closure', 'yearofclosure', 'closureyear', 'closedyear'),
            billing_status: getValue('billing_status', 'billingstatus', 'billing'),
            payment_status: getValue('payment_status', 'paymentstatus', 'payment'),
            verdict: getValue('verdict', 'judgment', 'decree', 'outcome'),
            person_in_conduct: rawPersons,
            persons_in_conduct: personsList,
          };
        });

        // Filter out empty rows where neither title nor case_number exists
        const valid = mapped.filter((m) => m.title || m.case_number || m.client);

        if (valid.length === 0) {
          setError('Could not find recognizable case columns (such as Title, Case Number, or Client) in this file.');
          setIsProcessing(false);
          return;
        }

        setParsedRows(valid);
        setIsProcessing(false);
      } catch (err: any) {
        setError(`Failed to read Excel file: ${err.message || 'Invalid format'}`);
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading file from disk.');
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(fileToParse);
  };

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;
    importCasesFromExcel(parsedRows, replaceExisting);
    setImportSuccess(parsedRows.length);
    setTimeout(() => {
      setIsImportModalOpen(false);
      setParsedRows([]);
      setFile(null);
      setImportSuccess(null);
    }, 1200);
  };

  const handleDownloadSample = () => {
    const sampleHeaders = [
      'file_no',
      'title',
      'branch',
      'client',
      'case_type',
      'status',
      'date_of_instructions',
      'court',
      'district',
      'subject_matter',
      'notes',
      'hearing_date',
      'target',
      'file_location',
      'year_of_closure',
      'billing_status',
      'payment_status',
      'verdict',
      'person_in_conduct',
    ];

    const sampleRows = [
      [
        '', // File NO. (leave blank or enter your firm file number)
        'Matter of Commercial Client v. Debtor Ltd',
        branches[0]?.name || 'Kampala Central (Head Office)',
        'Stanbic Bank (U) Ltd',
        'Commercial',
        'Active',
        '2026-02-15',
        'High Court of Uganda (Commercial Division)',
        'Kampala',
        'Recovery of outstanding trade finance facility and interest',
        'Written statement of defense received; preparing witness statements',
        '2026-03-24',
        'Obtain summary judgment with costs',
        'KAMPALA OFFICE / CAB-3',
        '',
        'Retainer Billed',
        'Active / 50% Paid',
        '',
        'Counsel Lead Advocate, Assisting Advocate',
      ],
      [
        '', // Leave empty if unassigned
        'Pre-action Statutory Demand & Negotiations',
        branches[0]?.name || 'Kampala Central (Head Office)',
        'Victoria Sugar Works Ltd',
        'Civil',
        'Instructions',
        '2026-03-01',
        'High Court of Uganda',
        'Jinja',
        'Drafting demand letter and settlement reconciliation',
        'Awaiting response from opposing party',
        '',
        'Amicable settlement or institute suit',
        'JINJA OFFICE / INTAKE',
        '',
        'Unbilled',
        'Pending',
        '',
        'Counsel Lead Advocate',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cases');
    XLSX.writeFile(wb, 'Firm_Case_Catalogue_Template.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-2 sm:p-6">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-slate-900">Upload Excel Spreadsheet</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Import your litigation cases from .xlsx, .xls, or .csv files
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {importSuccess !== null ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Import Successful!</h3>
              <p className="text-sm text-slate-600">
                Successfully imported <strong>{importSuccess}</strong> cases into your catalogue.
              </p>
            </div>
          ) : (
            <>
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>

                <div className="text-sm font-semibold text-slate-800">
                  {file ? file.name : 'Click to select your Excel file, or drag and drop'}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)
                </p>

                {file && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>File loaded ({Math.round(file.size / 1024)} KB)</span>
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Options */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">
                      Clear existing demo data & replace completely (Recommended)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Purges demo dummy cases and populates the catalogue exclusively with your real firm records.
                    </span>
                  </div>
                </label>
              </div>

              {/* Preview */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span>Detected {parsedRows.length} Cases in File</span>
                    <span className="text-slate-500 font-normal">Previewing first 5 rows:</span>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-56">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0">
                        <tr>
                          <th className="p-2 border-b">Case No</th>
                          <th className="p-2 border-b">Title</th>
                          <th className="p-2 border-b">Branch</th>
                          <th className="p-2 border-b">District</th>
                          <th className="p-2 border-b">Status</th>
                          <th className="p-2 border-b">Person(s) in Conduct</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 font-mono text-slate-600">
                              {row.case_number ? (
                                row.case_number
                              ) : (
                                <span className="text-slate-400 italic font-sans font-normal">None</span>
                              )}
                            </td>
                            <td className="p-2 font-medium text-slate-900 truncate max-w-[200px]">{row.title || row.client}</td>
                            <td className="p-2 text-slate-600 truncate max-w-[120px]">{row.branch || 'Head Office'}</td>
                            <td className="p-2 text-slate-600">{row.district || 'Kampala'}</td>
                            <td className="p-2">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                                {row.status || 'Active'}
                              </span>
                            </td>
                            <td className="p-2 text-slate-700 truncate max-w-[160px]">
                              {row.persons_in_conduct?.length > 1
                                ? `${row.persons_in_conduct[0]} (+${row.persons_in_conduct.length - 1} more)`
                                : row.person_in_conduct || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Template Helper */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500">Need a sample Excel template?</span>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Excel Template (.xlsx)</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {importSuccess === null && (
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all demo cases from the catalogue right now?')) {
                  clearAllCases();
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Demo Cases</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedRows.length === 0 || isProcessing}
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import {parsedRows.length > 0 ? `${parsedRows.length} Cases` : 'Data'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportExcelModal;
