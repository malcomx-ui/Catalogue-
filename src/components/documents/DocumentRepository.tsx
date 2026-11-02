import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PleadingDocument } from '../../types';
import {
  FileText,
  Upload,
  Download,
  Search,
  Filter,
  Eye,
  X,
  Plus,
} from 'lucide-react';

export const DocumentRepository: React.FC = () => {
  const {
    documents,
    cases,
    addDocument,
    currentUser,
    setSelectedCase,
  } = useApp();

  const [searchDocQuery, setSearchDocQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [targetCaseId, setTargetCaseId] = useState(cases[0]?.id || '');
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<any>('Plaint');
  const [docSummary, setDocSummary] = useState('');

  const filteredDocs = documents.filter((d) => {
    if (selectedType !== 'all' && d.documentType !== selectedType) return false;
    if (searchDocQuery.trim()) {
      const q = searchDocQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.suitNumber.toLowerCase().includes(q) ||
        d.filedBy.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCaseId || !docTitle.trim()) return;

    const matchedCase = cases.find((c) => c.id === targetCaseId);
    if (!matchedCase) return;

    addDocument({
      caseId: matchedCase.id,
      suitNumber: matchedCase.suitNumber,
      title: docTitle,
      documentType: docType,
      fileFormat: 'pdf',
      fileSize: '2.8 MB',
      filingDate: new Date().toISOString().split('T')[0],
      filedBy: currentUser.name,
      courtRegistryStamp: true,
      summary: docSummary || 'Court document filed in core vault.',
      version: 1,
    });

    setIsUploadOpen(false);
    setDocTitle('');
    setDocSummary('');
  };

  const handleDownload = (doc: PleadingDocument) => {
    const text = `MK CASE CATALOGUE - DOCUMENT VAULT\n\nTitle: ${doc.title}\nSuit No: ${doc.suitNumber}\nType: ${doc.documentType}\nFiling Date: ${doc.filingDate}\nFiled By: ${doc.filedBy}\n\nSummary:\n${doc.summary || ''}`;
    const file = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = `${doc.suitNumber}_${doc.title.replace(/\s+/g, '_')}.txt`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Case Documents & Pleadings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Central repository for court filings, submissions, and affidavits
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs min-h-[38px] sm:min-h-0"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 w-full sm:max-w-md">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchDocQuery}
              onChange={(e) => setSearchDocQuery(e.target.value)}
              placeholder="Search document title, suit no., or filing counsel..."
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-2 sm:py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white min-h-[38px] sm:min-h-0"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2 sm:py-1.5 text-xs text-slate-700 min-h-[38px] sm:min-h-0"
          >
            <option value="all">All Types</option>
            <option value="Plaint">Plaints</option>
            <option value="Written Statement of Defense">WSDs</option>
            <option value="Affidavit">Affidavits</option>
            <option value="Legal Submissions">Submissions</option>
            <option value="Court Order">Court Orders</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          {filteredDocs.length} documents
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Document Title</th>
              <th className="py-3 px-4">Suit No.</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Filing Date</th>
              <th className="py-3 px-4">Filed By</th>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No documents found.
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => {
                const matchedCase = cases.find((c) => c.id === doc.caseId);

                return (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate max-w-xs">{doc.title}</span>
                      </div>
                      {doc.summary && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5 pl-6">
                          {doc.summary}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {doc.suitNumber ? (
                        <span className="font-mono font-medium text-slate-800">{doc.suitNumber}</span>
                      ) : (
                        <span className="text-slate-400 italic text-xs font-sans font-normal">None</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                        {doc.documentType}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {doc.filingDate}
                    </td>

                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {doc.filedBy}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {doc.fileSize}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {matchedCase && (
                          <button
                            onClick={() => setSelectedCase(matchedCase)}
                            className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium"
                          >
                            Case
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 max-w-md w-full space-y-3 text-xs">
            <div className="flex items-center justify-between font-bold text-sm text-slate-900 pb-2 border-b">
              <span>Upload Document</span>
              <button onClick={() => setIsUploadOpen(false)}><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Select Case:</label>
                <select
                  value={targetCaseId}
                  onChange={(e) => setTargetCaseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.suitNumber} - {c.title.substring(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Document Title:</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Affidavit in Support of Chamber Summons"
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Type:</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5"
                  >
                    <option value="Plaint">Plaint</option>
                    <option value="Written Statement of Defense">WSD</option>
                    <option value="Affidavit">Affidavit</option>
                    <option value="Legal Submissions">Legal Submissions</option>
                    <option value="Court Order">Court Order</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Filing Counsel:</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.name}
                    className="w-full bg-slate-100 border border-slate-200 rounded p-1.5 text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Notes / Summary:</label>
                <textarea
                  rows={2}
                  value={docSummary}
                  onChange={(e) => setDocSummary(e.target.value)}
                  placeholder="Summary of document..."
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium"
                >
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
