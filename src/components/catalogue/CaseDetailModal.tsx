import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CaseItem, CaseStage, CASE_TYPES, CASE_STATUSES, UGANDA_DISTRICTS, FileMovementRecord, ProgressiveNote } from '../../types';
import {
  X,
  Calendar,
  Building2,
  Briefcase,
  FileText,
  Clock,
  ArrowRightLeft,
  Upload,
  Download,
  Gavel,
  DollarSign,
  Edit3,
  Save,
  CheckCircle2,
  FolderOpen,
  Scale,
  User,
  Users,
  MapPin,
  History,
  Plus,
  Send,
  MessageSquare,
  Search,
  Filter,
  Copy,
  Check,
  Tag,
  ArrowRight,
  StickyNote,
  ShieldCheck,
  FileCheck,
  FileClock,
  Trash2,
} from 'lucide-react';
import { PersonsInConductField } from './PersonsInConductField';
import { UgxCurrencyIcon } from '../common/UgxCurrencyIcon';
import { supabase, mapRowToCase } from '../../lib/supabase';

export const CaseDetailModal: React.FC = () => {
  const {
    selectedCase: rawSelectedCase,
    setSelectedCase,
    updateCase,
    deleteCase,
    updateCaseStage,
    transferCaseToBranch,
    branches,
    documents,
    hearings,
    addHearing,
    addDocument,
    currentUser,
    addFileMovement,
    addProgressiveNote,
    systemSettings,
  } = useApp();

  const intake = systemSettings?.intakeFields || {};
  const getField = (id: string, fallbackLabel: string) => {
    const cfg = intake[id];
    return {
      label: cfg?.label || fallbackLabel,
      isMandatory: cfg?.requirement === 'mandatory',
      isHidden: cfg?.requirement === 'hidden',
    };
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'movement' | 'hearings' | 'documents' | 'transfer'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [targetBranchId, setTargetBranchId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Delete & Edit submission state (declared unconditionally at top level)
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Live Supabase detail record & loading state
  const [fetchedRecord, setFetchedRecord] = useState<any>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);

  // Physical file movement recording state
  const [isRecordingMovement, setIsRecordingMovement] = useState(false);
  const [fromLoc, setFromLoc] = useState('');
  const [toLoc, setToLoc] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [movedBy, setMovedBy] = useState(currentUser.name);
  const [receivedBy, setReceivedBy] = useState('');
  const [movementStatus, setMovementStatus] = useState<FileMovementRecord['status']>('At Registry');

  // Continuous progressive notes state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<ProgressiveNote['category']>('Court Milestone');
  const [selectedNoteFilter, setSelectedNoteFilter] = useState<string>('all');
  const [noteSearch, setNoteSearch] = useState('');
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // Quick note composer in overview
  const [quickNoteContent, setQuickNoteContent] = useState('');
  const [quickNoteCategory, setQuickNoteCategory] = useState<ProgressiveNote['category']>('General');

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    case_number: '',
    client: '',
    branch: '',
    case_type: 'Civil',
    status: 'active',
    date_of_instructions: '',
    hearing_date: '',
    court: '',
    district: '',
    person_in_conduct: '',
    file_location: '',
    target: '',
    subject_matter: '',
    notes: '',
    year_of_closure: '',
    billing_status: '',
    payment_status: '',
    verdict: '',
    persons_in_conduct: [] as string[],
  });

  // Schedule hearing state
  const [isSchedulingHearing, setIsSchedulingHearing] = useState(false);
  const [newHearingDate, setNewHearingDate] = useState('');
  const [newHearingTime, setNewHearingTime] = useState('09:30 AM');
  const [newHearingPurpose, setNewHearingPurpose] = useState('');
  const [newHearingJudge, setNewHearingJudge] = useState('');

  // Upload document state
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<any>('Affidavit');
  const [docSummary, setDocSummary] = useState('');

  // Fetch fresh case from Supabase on mount / rawSelectedCase change (by id or file_no/case_number)
  useEffect(() => {
    if (!rawSelectedCase) {
      setFetchedRecord(null);
      return;
    }

    let isMounted = true;
    const caseId = rawSelectedCase.id;
    const fileNo = rawSelectedCase.case_number || rawSelectedCase.suitNumber || (rawSelectedCase as any).file_no;

    async function fetchCaseDetail() {
      setIsLoadingRecord(true);
      try {
        let data: any[] | null = null;
        if (caseId) {
          const res = await supabase.from('cases').select('*').eq('id', caseId).limit(1);
          if (!res.error && res.data && res.data.length > 0) {
            data = res.data;
          }
        }
        if ((!data || data.length === 0) && fileNo) {
          const res1 = await supabase.from('cases').select('*').eq('case_number', fileNo).limit(1);
          if (!res1.error && res1.data && res1.data.length > 0) {
            data = res1.data;
          } else {
            const res2 = await supabase.from('cases').select('*').eq('suit_number', fileNo).limit(1);
            if (!res2.error && res2.data && res2.data.length > 0) {
              data = res2.data;
            }
          }
        }
        if (data && data.length > 0 && isMounted) {
          setFetchedRecord(mapRowToCase(data[0]));
        }
      } catch (err) {
        console.warn('Error fetching case detail from Supabase:', err);
      } finally {
        if (isMounted) setIsLoadingRecord(false);
      }
    }

    fetchCaseDetail();
    return () => { isMounted = false; };
  }, [rawSelectedCase?.id, rawSelectedCase?.case_number, rawSelectedCase?.suitNumber]);

  // Combined active case record guaranteeing all Supabase and frontend fields are present
  const activeCase: any = rawSelectedCase
    ? {
        ...rawSelectedCase,
        ...(fetchedRecord || {}),
        suitNumber: fetchedRecord?.suit_number || fetchedRecord?.case_number || rawSelectedCase.suitNumber || rawSelectedCase.case_number || '',
        case_number: fetchedRecord?.case_number || fetchedRecord?.suit_number || rawSelectedCase.case_number || rawSelectedCase.suitNumber || '',
        clientName: fetchedRecord?.client_name || rawSelectedCase.clientName || (rawSelectedCase as any).client || '',
        client: fetchedRecord?.client_name || (rawSelectedCase as any).client || rawSelectedCase.clientName || '',
        branchName: fetchedRecord?.branch_name || rawSelectedCase.branchName || (rawSelectedCase as any).branch || '',
        branch: fetchedRecord?.branch_name || (rawSelectedCase as any).branch || rawSelectedCase.branchName || '',
        leadAdvocate: fetchedRecord?.lead_advocate || rawSelectedCase.leadAdvocate || (rawSelectedCase as any).person_in_conduct || '',
        courtStation: fetchedRecord?.court_station || rawSelectedCase.courtStation || (rawSelectedCase as any).district || '',
        district: fetchedRecord?.court_station || (rawSelectedCase as any).district || rawSelectedCase.courtStation || '',
        briefSummary: fetchedRecord?.brief_summary || rawSelectedCase.briefSummary || (rawSelectedCase as any).subject_matter || '',
        subject_matter: fetchedRecord?.brief_summary || (rawSelectedCase as any).subject_matter || rawSelectedCase.briefSummary || '',
        filingDate: fetchedRecord?.filing_date || rawSelectedCase.filingDate || (rawSelectedCase as any).date_of_instructions || '',
        date_of_instructions: fetchedRecord?.filing_date || (rawSelectedCase as any).date_of_instructions || rawSelectedCase.filingDate || '',
        hearing_date: fetchedRecord?.hearing_date || fetchedRecord?.next_hearing_date || (rawSelectedCase as any).hearing_date || rawSelectedCase.nextHearingDate || '',
        nextHearingDate: fetchedRecord?.next_hearing_date || fetchedRecord?.hearing_date || rawSelectedCase.nextHearingDate || (rawSelectedCase as any).hearing_date || '',
        file_location: fetchedRecord?.file_location || (rawSelectedCase as any).file_location || (rawSelectedCase as any).fileLocation || '',
        progressiveNotes: rawSelectedCase.progressiveNotes || fetchedRecord?.progressiveNotes || [],
        fileMovementHistory: rawSelectedCase.fileMovementHistory || fetchedRecord?.fileMovementHistory || [],
        parties: rawSelectedCase.parties || fetchedRecord?.parties || [],
      }
    : null;

  // Single authoritative reference for both Supabase fields and camelCase frontend props
  const selectedCase: any = activeCase;

  // Initialize edit form when activeCase changes
  useEffect(() => {
    if (activeCase) {
      let initialPersons: string[] = [];
      if (activeCase.persons_in_conduct && activeCase.persons_in_conduct.length > 0) {
        initialPersons = [...activeCase.persons_in_conduct];
      } else if (activeCase.person_in_conduct) {
        initialPersons = String(activeCase.person_in_conduct).split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean);
      } else if (activeCase.lead_advocate || activeCase.leadAdvocate) {
        const lead = activeCase.lead_advocate || activeCase.leadAdvocate;
        const assisting = activeCase.assisting_advocates || activeCase.assistingAdvocates || [];
        initialPersons = [lead, ...assisting].filter(Boolean);
      }
      if (initialPersons.length === 0) initialPersons = [''];

      const rawStatus = activeCase.status || 'Active';
      const mappedStatus = 
        rawStatus === 'Archived' ? 'closed' :
        rawStatus === 'Dormant' ? 'dormant' :
        rawStatus === 'Inactive' ? 'inactive' :
        rawStatus === 'Instructions' ? 'instructions' :
        rawStatus.toLowerCase();

      setEditForm({
        title: activeCase.title || '',
        case_number: activeCase.case_number || activeCase.suit_number || activeCase.suitNumber || activeCase.file_no || '',
        client: activeCase.client_name || activeCase.clientName || activeCase.client || '',
        branch: activeCase.branch_name || activeCase.branchName || activeCase.branch || '',
        case_type: activeCase.case_type || activeCase.division || 'Civil',
        status: mappedStatus,
        date_of_instructions: activeCase.filing_date || activeCase.date_of_instructions || activeCase.filingDate || '',
        hearing_date: activeCase.hearing_date || activeCase.next_hearing_date || activeCase.nextHearingDate || '',
        court: activeCase.court || 'High Court of Uganda',
        district: activeCase.court_station || activeCase.courtStation || activeCase.district || '',
        person_in_conduct: activeCase.lead_advocate || activeCase.leadAdvocate || activeCase.person_in_conduct || '',
        persons_in_conduct: initialPersons,
        file_location: activeCase.file_location || activeCase.fileLocation || '',
        target: activeCase.target || '',
        subject_matter: activeCase.brief_summary || activeCase.briefSummary || activeCase.subject_matter || '',
        notes: activeCase.notes || '',
        year_of_closure: activeCase.year_of_closure != null ? String(activeCase.year_of_closure) : (activeCase.yearOfClosure != null ? String(activeCase.yearOfClosure) : ''),
        billing_status: activeCase.billing_status || activeCase.billingStatus || '',
        payment_status: activeCase.payment_status || activeCase.paymentStatus || '',
        verdict: activeCase.verdict || '',
      });
      setTargetBranchId(branches.find((b) => b.id !== (activeCase.branch_id || activeCase.branchId))?.id || branches[0]?.id || '');
      setNewHearingJudge(activeCase.presiding_judge || activeCase.presidingJudge || '');
      setFromLoc(activeCase.file_location || `${activeCase.branch_name || activeCase.branchName || 'Kampala Central'} Registry Cabinet`);
      setMovedBy(currentUser.name);
      setIsRecordingMovement(false);
      setIsAddingNote(false);
      setIsEditing(false);
    }
  }, [rawSelectedCase?.id, fetchedRecord?.id, branches, currentUser]);

  const currentBranchObj = activeCase
    ? branches.find((b) => b.name === editForm.branch || b.id === (activeCase.branch_id || activeCase.branchId)) || branches[0]
    : branches[0];

  const handlePersonsChange = (newPersons: string[]) => {
    setEditForm((prev) => ({
      ...prev,
      persons_in_conduct: newPersons,
      person_in_conduct: newPersons.filter((p) => p.trim()).join(', '),
    }));
  };

  const caseDocs = activeCase ? documents.filter((d) => d.caseId === activeCase.id) : [];
  const caseHearings = activeCase ? hearings.filter((h) => h.caseId === activeCase.id) : [];

  const STAGES: CaseStage[] = [
    'Pleadings & Defense',
    'Mediation & Scheduling',
    'Trial (Plaintiff Stage)',
    'Trial (Defense Stage)',
    'Final Legal Submissions',
    'Judgment / Ruling Reserved',
    'Decree & Execution',
    'Disposed & Closed',
  ];

  const handleStageChange = (newStage: CaseStage) => {
    if (activeCase) updateCaseStage(activeCase.id, newStage);
  };

  const handleDeleteCase = async () => {
    if (!activeCase) return;
    const caseDisplay = activeCase.case_number || activeCase.suit_number || activeCase.suitNumber || activeCase.file_no || activeCase.title;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete case "${caseDisplay}" from Supabase?\n\nThis will remove it from the database and cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const ok = await deleteCase(activeCase.id);
      if (ok) {
        setSelectedCase(null);
        setFetchedRecord(null);
      } else {
        alert('Could not delete case from Supabase. Please check your connection.');
      }
    } catch (err: any) {
      alert(`Delete failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title.trim()) return;

    const validPersons = editForm.persons_in_conduct.map((p) => p.trim()).filter(Boolean);
    const primaryLead = validPersons[0] || editForm.person_in_conduct.trim() || selectedCase.leadAdvocate;
    const assistingAdvocates = validPersons.slice(1);
    const combinedPersons = validPersons.length > 0 ? validPersons.join(', ') : primaryLead;

    const resolvedStatus = 
      editForm.status === 'closed' ? 'Archived' :
      editForm.status === 'dormant' ? 'Dormant' :
      editForm.status === 'inactive' ? 'Inactive' :
      editForm.status === 'instructions' ? 'Instructions' :
      editForm.status === 'pending' ? 'Pending' : 'Active';

    setIsSavingEdit(true);
    try {
      await updateCase(selectedCase.id, {
        title: editForm.title.trim(),
        case_number: editForm.case_number.trim(),
        suitNumber: editForm.case_number.trim(),
        client: editForm.client.trim(),
        clientName: editForm.client.trim(),
        branch: editForm.branch,
        case_type: editForm.case_type,
        status: resolvedStatus as any,
        date_of_instructions: editForm.date_of_instructions,
        filingDate: editForm.date_of_instructions || selectedCase.filingDate,
        hearing_date: editForm.hearing_date,
        nextHearingDate: editForm.hearing_date,
        court: editForm.court.trim(),
        district: editForm.district.trim(),
        person_in_conduct: combinedPersons,
        persons_in_conduct: validPersons.length > 0 ? validPersons : [primaryLead],
        leadAdvocate: primaryLead,
        assistingAdvocates: assistingAdvocates,
        file_location: editForm.file_location.trim(),
        target: editForm.target.trim(),
        subject_matter: editForm.subject_matter.trim(),
        briefSummary: editForm.subject_matter.trim() || selectedCase.briefSummary,
        notes: editForm.notes.trim(),
        year_of_closure: editForm.year_of_closure ? Number(editForm.year_of_closure) : null,
        billing_status: editForm.billing_status.trim(),
        payment_status: editForm.payment_status.trim(),
        verdict: editForm.verdict.trim(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Update case error:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBranchId || !transferReason.trim()) return;
    transferCaseToBranch(selectedCase.id, targetBranchId, transferReason);
    setIsTransferring(false);
    setTransferReason('');
  };

  const handleScheduleHearing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHearingDate || !newHearingPurpose.trim()) return;

    addHearing({
      caseId: selectedCase.id,
      suitNumber: selectedCase.suitNumber,
      caseTitle: selectedCase.title,
      hearingDate: newHearingDate,
      hearingTime: newHearingTime,
      courtName: selectedCase.court,
      division: selectedCase.division,
      courtRoom: 'Courtroom / Chamber',
      presidingJudge: newHearingJudge || selectedCase.presidingJudge,
      hearingPurpose: newHearingPurpose,
      leadCounsel: selectedCase.leadAdvocate,
      assignedAdvocates: [selectedCase.leadAdvocate],
      status: 'Scheduled',
      branchId: selectedCase.branchId,
    });

    setIsSchedulingHearing(false);
    setNewHearingPurpose('');
    setNewHearingDate('');
  };

  const handleDocumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    addDocument({
      caseId: selectedCase.id,
      suitNumber: selectedCase.suitNumber,
      title: docTitle,
      documentType: docType,
      fileFormat: 'pdf',
      fileSize: '2.4 MB',
      filingDate: new Date().toISOString().split('T')[0],
      filedBy: currentUser.name,
      courtRegistryStamp: true,
      summary: docSummary || 'Pleading indexed in centralized registry.',
      version: 1,
    });

    setIsUploadingDoc(false);
    setDocTitle('');
    setDocSummary('');
  };

  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toLoc.trim() || !movementReason.trim()) return;

    addFileMovement(selectedCase.id, {
      fromLocation: fromLoc.trim() || selectedCase.file_location || 'Registry Intake',
      toLocation: toLoc.trim(),
      movedBy: movedBy.trim() || currentUser.name,
      receivedBy: receivedBy.trim() || undefined,
      reason: movementReason.trim(),
      status: movementStatus,
    });

    setIsRecordingMovement(false);
    setToLoc('');
    setMovementReason('');
    setReceivedBy('');
  };

  const handleProgressiveNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    addProgressiveNote(selectedCase.id, {
      author: currentUser.name,
      authorRole: currentUser.roleTitle || 'Advocate',
      category: noteCategory,
      content: noteContent.trim(),
    });

    setNoteContent('');
    setIsAddingNote(false);
  };

  const handleQuickNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteContent.trim()) return;

    addProgressiveNote(selectedCase.id, {
      author: currentUser.name,
      authorRole: currentUser.roleTitle || 'Advocate',
      category: quickNoteCategory,
      content: quickNoteContent.trim(),
    });

    setQuickNoteContent('');
  };

  const handleCopyNote = (id: string, text: string) => {
    try {
      navigator.clipboard?.writeText(text);
      setCopiedNoteId(id);
      setTimeout(() => setCopiedNoteId(null), 2000);
    } catch (e) {}
  };

  const setEdit = (k: string, v: any) => {
    setEditForm((prev) => ({ ...prev, [k]: v }));
  };

  // If no case is selected (modal closed), return null so nothing renders and no null properties are accessed
  if (!rawSelectedCase || !selectedCase) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-2 sm:p-6">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              {selectedCase.case_number || selectedCase.suitNumber ? (
                <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedCase.case_number || selectedCase.suitNumber}
                </span>
              ) : (
                <span className="text-[11px] italic text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  No file number assigned
                </span>
              )}
              {selectedCase.firmRefNumber && selectedCase.firmRefNumber !== (selectedCase.case_number || selectedCase.suitNumber) && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500 font-mono">{selectedCase.firmRefNumber}</span>
                </>
              )}
              <span className="text-slate-300">·</span>
              <span className="text-blue-700 font-medium">{selectedCase.branchName || selectedCase.branch}</span>
              {isLoadingRecord && (
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium animate-pulse border border-blue-200">
                  Syncing Supabase...
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {selectedCase.title || 'Untitled Matter'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteCase}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
              title="Permanently delete case from Supabase"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                isEditing
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Form'}</span>
            </button>
            <button
              onClick={() => setSelectedCase(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Edit Form Mode */}
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-900 text-sm">Edit Case Record</span>
              <span className="text-slate-400 text-[11px]">Update fields as per firm structure</span>
            </div>

            {/* Card 1: Case details */}
            <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2 text-sm">
                <Scale className="w-4 h-4 text-blue-600" />
                <span>Case details</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* 1. Branch */}
                <div className="space-y-1.5">
                  <label className="block font-medium text-slate-700">
                    {getField('branch', 'Branch').label} *
                  </label>
                  <select
                    value={editForm.branch}
                    onChange={(e) => setEdit('branch', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Case No. */}
                <div className="space-y-1.5">
                  <label htmlFor="edit_case_number" className="block font-medium text-slate-700">
                    {getField('caseNumber', 'Case No.').label}
                    {getField('caseNumber', 'Case No.').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <input
                    id="edit_case_number"
                    type="text"
                    value={editForm.case_number}
                    onChange={(e) => setEdit('case_number', e.target.value)}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* 3. Client Full Name/Entity */}
                <div className="space-y-1.5">
                  <label htmlFor="edit_client" className="block font-medium text-slate-700">
                    {getField('clientName', 'Client Full Name / Entity').label}
                    {getField('clientName', 'Client Full Name / Entity').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <input
                    id="edit_client"
                    type="text"
                    value={editForm.client}
                    onChange={(e) => setEdit('client', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* 4. Case Title */}
                <div className="space-y-1.5">
                  <label htmlFor="edit_title" className="block font-medium text-slate-700">
                    {getField('title', 'Case Title').label}
                    {getField('title', 'Case Title').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <input
                    id="edit_title"
                    type="text"
                    required={getField('title', 'Case Title').isMandatory}
                    value={editForm.title}
                    onChange={(e) => setEdit('title', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                {/* 5. Nature of case */}
                <div className="space-y-1.5">
                  <label className="block font-medium text-slate-700">
                    {getField('caseType', 'Nature of case').label}
                    {getField('caseType', 'Nature of case').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <select
                    value={editForm.case_type}
                    onChange={(e) => setEdit('case_type', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  >
                    {CASE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Status */}
                <div className="space-y-1.5">
                  <label className="block font-medium text-slate-700">
                    {getField('status', 'Status').label}
                    {getField('status', 'Status').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEdit('status', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  >
                    {CASE_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 7. Date of instructions */}
                <div className="space-y-1.5">
                  <label htmlFor="edit_doi" className="block font-medium text-slate-700">
                    {getField('dateOfInstructions', 'Date of instructions').label}
                    {getField('dateOfInstructions', 'Date of instructions').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <input
                    id="edit_doi"
                    type="date"
                    value={editForm.date_of_instructions}
                    onChange={(e) => setEdit('date_of_instructions', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* 8. Hearing date */}
                <div className="space-y-1.5">
                  <label htmlFor="edit_hearing" className="block font-medium text-slate-700">
                    {getField('nextHearingDate', 'Hearing date').label}
                    {getField('nextHearingDate', 'Hearing date').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <input
                    id="edit_hearing"
                    type="date"
                    value={editForm.hearing_date}
                    onChange={(e) => setEdit('hearing_date', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* 9. Court */}
                <div className="space-y-1.5">
                  <label htmlFor="edit_court" className="block font-medium text-slate-700">
                    {getField('court', 'Court').label}
                    {getField('court', 'Court').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <input
                    id="edit_court"
                    type="text"
                    value={editForm.court}
                    onChange={(e) => setEdit('court', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* 10. District */}
                <div className="space-y-1.5">
                  <label htmlFor="edit_district" className="block font-medium text-slate-700">
                    {getField('district', 'District').label}
                    {getField('district', 'District').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <select
                    id="edit_district"
                    value={editForm.district}
                    onChange={(e) => setEdit('district', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select district...</option>
                    {UGANDA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Card 2: Client & file */}
            <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2 text-sm">
                <FolderOpen className="w-4 h-4 text-amber-600" />
                <span>Client & file</span>
              </div>

              <div className="space-y-4">
                <PersonsInConductField
                  persons={editForm.persons_in_conduct}
                  onChange={handlePersonsChange}
                  staffOptions={currentBranchObj?.staff || []}
                  idPrefix="edit-case-person"
                />

                <div className="grid gap-4 md:grid-cols-2 pt-3 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label htmlFor="edit_file_loc" className="block font-medium text-slate-700">
                      {getField('fileLocation', 'Location of physical file').label}
                      {getField('fileLocation', 'Location of physical file').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                    </label>
                    <input
                      id="edit_file_loc"
                      type="text"
                      value={editForm.file_location}
                      onChange={(e) => setEdit('file_location', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="edit_target" className="block font-medium text-slate-700">
                      {getField('target', 'Target').label}
                      {getField('target', 'Target').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                    </label>
                    <input
                      id="edit_target"
                      type="text"
                      value={editForm.target}
                      onChange={(e) => setEdit('target', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Matter details */}
            <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2 text-sm">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Matter details</span>
              </div>

              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="edit_subject" className="block font-medium text-slate-700">
                    {getField('subjectMatter', 'Subject matter').label}
                    {getField('subjectMatter', 'Subject matter').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <textarea
                    id="edit_subject"
                    rows={3}
                    value={editForm.subject_matter}
                    onChange={(e) => setEdit('subject_matter', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit_notes" className="block font-medium text-slate-700">
                    {getField('notes', 'Notes').label}
                    {getField('notes', 'Notes').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <textarea
                    id="edit_notes"
                    rows={3}
                    value={editForm.notes}
                    onChange={(e) => setEdit('notes', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Closure & billing */}
            <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-2xs space-y-4">
              <div className="text-slate-900 font-bold border-b border-slate-100 pb-2 text-sm">
                <span>Closure & billing</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="edit_yoc" className="block font-medium text-slate-700">
                    {getField('yearOfClosure', 'Year of closure').label}
                    {getField('yearOfClosure', 'Year of closure').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <input
                    id="edit_yoc"
                    type="number"
                    value={editForm.year_of_closure}
                    onChange={(e) => setEdit('year_of_closure', e.target.value)}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit_billing" className="block font-medium text-slate-700">
                    {getField('billingStatus', 'Billing status').label}
                    {getField('billingStatus', 'Billing status').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <input
                    id="edit_billing"
                    type="text"
                    value={editForm.billing_status}
                    onChange={(e) => setEdit('billing_status', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit_payment" className="block font-medium text-slate-700">
                    {getField('paymentStatus', 'Payment status').label}
                    {getField('paymentStatus', 'Payment status').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <input
                    id="edit_payment"
                    type="text"
                    value={editForm.payment_status}
                    onChange={(e) => setEdit('payment_status', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="edit_verdict" className="block font-medium text-slate-700">
                    {getField('verdict', 'Verdict').label}
                    {getField('verdict', 'Verdict').isMandatory && <span className="text-rose-600 font-bold ml-1">*</span>}
                  </label>
                  <textarea
                    id="edit_verdict"
                    rows={2}
                    value={editForm.verdict}
                    onChange={(e) => setEdit('verdict', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDeleteCase}
                disabled={isDeleting}
                className="px-3 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Case'}</span>
              </button>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium shadow-xs transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>{isSavingEdit ? 'Saving to Supabase...' : 'Save changes'}</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="px-5 pt-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 sm:gap-4 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Matter Overview' },
                  { id: 'notes', label: `Progressive Trail (${(selectedCase.progressiveNotes || []).length})` },
                  { id: 'movement', label: `File Movement (${(selectedCase.fileMovementHistory || []).length})` },
                  { id: 'hearings', label: `Hearings (${caseHearings.length})` },
                  { id: 'documents', label: `Documents (${caseDocs.length})` },
                  { id: 'transfer', label: 'Branch Transfer' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-2.5 px-1 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-slate-900 text-slate-900 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('notes');
                    setIsAddingNote(true);
                  }}
                  className="text-xs px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-medium transition-colors flex items-center gap-1"
                  title="Add progressive note to continuous case trail"
                >
                  <StickyNote className="w-3.5 h-3.5 text-indigo-600" />
                  <span>+ Note</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('movement');
                    setIsRecordingMovement(true);
                  }}
                  className="text-xs px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-medium transition-colors flex items-center gap-1"
                  title="Record physical file transfer / movement"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-700" />
                  <span>+ Move File</span>
                </button>
                <button
                  onClick={() => setIsSchedulingHearing(true)}
                  className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition-colors flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-600" />
                  <span>Schedule Hearing</span>
                </button>
                <button
                  onClick={() => setIsUploadingDoc(true)}
                  className="text-xs px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium transition-colors flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Card 1: Case details */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                        <Scale className="w-4 h-4 text-blue-600" />
                        <span>Case details</span>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                        {selectedCase.case_type || selectedCase.division}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                      {/* 1. Branch */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">{getField('branch', 'Branch').label}</span>
                        <span className="font-medium text-blue-700">{selectedCase.branch || selectedCase.branchName}</span>
                      </div>

                      {/* 2. Case No. */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">{getField('caseNumber', 'Case No.').label}</span>
                        {selectedCase.case_number || selectedCase.suitNumber ? (
                          <span className="font-mono font-medium text-slate-800">
                            {selectedCase.case_number || selectedCase.suitNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs font-sans">No file number</span>
                        )}
                      </div>

                      {/* 3. Client Full Name/Entity */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">{getField('clientName', 'Client Full Name / Entity').label}</span>
                        <span className="font-medium text-slate-900">{selectedCase.client || selectedCase.clientName}</span>
                      </div>

                      {/* 4. Case Title */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">{getField('title', 'Case Title').label}</span>
                        <span className="font-semibold text-slate-900">{selectedCase.title}</span>
                      </div>

                      {/* 5. Nature of case */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">{getField('caseType', 'Nature of case').label}</span>
                        <span className="font-medium text-slate-800">{selectedCase.case_type || selectedCase.division || 'General'}</span>
                      </div>

                      {/* 6. Status */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">{getField('status', 'Status').label}</span>
                        <span className={`inline-block px-2 py-0.5 rounded font-medium text-[10px] ${
                          selectedCase.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {selectedCase.status}
                        </span>
                      </div>

                      {/* 7. Date of instructions */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">{getField('dateOfInstructions', 'Date of instructions').label}</span>
                        <span className="text-slate-800">{selectedCase.date_of_instructions || selectedCase.filingDate || '—'}</span>
                      </div>

                      {/* 8. Hearing date */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">{getField('nextHearingDate', 'Hearing date').label}</span>
                        <span className="font-semibold text-slate-900">{selectedCase.hearing_date || selectedCase.nextHearingDate || 'Not set'}</span>
                      </div>

                      {/* 9. Court */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">{getField('court', 'Court').label}</span>
                        <span className="text-slate-800">{selectedCase.court || '—'}</span>
                      </div>

                      {/* 10. District */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">{getField('district', 'District').label}</span>
                        <span className="text-slate-800">{selectedCase.district || selectedCase.courtStation || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Client & file */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2 text-xs uppercase tracking-wider">
                      <FolderOpen className="w-4 h-4 text-amber-600" />
                      <span>Client & file</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase mb-1">{getField('personInConduct', 'Person(s) in conduct').label}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(() => {
                            const persons = selectedCase.persons_in_conduct && selectedCase.persons_in_conduct.length > 0
                              ? selectedCase.persons_in_conduct
                              : (selectedCase.person_in_conduct || selectedCase.leadAdvocate || '')
                                  .split(/[,;\n]+/)
                                  .map((s: string) => s.trim())
                                  .filter(Boolean);
                            if (persons.length === 0) {
                              return <span className="font-semibold text-slate-900">—</span>;
                            }
                            return persons.map((p: string, idx: number) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                                  idx === 0
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                <User className={`w-3 h-3 ${idx === 0 ? 'text-blue-600' : 'text-slate-500'}`} />
                                <span>{p}</span>
                                {idx === 0 && (
                                  <span className="text-[9px] bg-blue-200 text-blue-900 font-bold px-1 rounded ml-0.5">
                                    Lead
                                  </span>
                                )}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Enriched Physical File Custody block */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-semibold text-[10px] uppercase flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-blue-600" />
                            {getField('fileLocation', 'Location of physical file').label}
                          </span>
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200">
                            {selectedCase.fileMovementHistory?.[0]?.status || 'At Registry'}
                          </span>
                        </div>
                        <div className="font-mono font-medium text-slate-900 text-xs">
                          {selectedCase.file_location || `${selectedCase.branchName?.split(' ')[0]?.toUpperCase() || 'KAMPALA'} OFFICE - Central Cabinet`}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {selectedCase.fileMovementHistory?.[0]
                            ? `Last moved: ${new Date(selectedCase.fileMovementHistory[0].timestamp).toLocaleDateString()} (${selectedCase.fileMovementHistory[0].movedBy})`
                            : 'Registry catalogued'}
                        </div>
                        <div className="pt-1.5 border-t border-slate-200 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('movement');
                              setIsRecordingMovement(true);
                            }}
                            className="text-[10px] px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors flex items-center gap-1"
                          >
                            <ArrowRightLeft className="w-2.5 h-2.5" />
                            <span>Log Movement</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('movement')}
                            className="text-[10px] px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium transition-colors flex items-center gap-1"
                          >
                            <History className="w-2.5 h-2.5 text-slate-500" />
                            <span>History ({(selectedCase.fileMovementHistory || []).length})</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">{getField('target', 'Target').label}</span>
                        <span className="text-slate-800">{selectedCase.target || 'Obtain final decree with costs.'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Matter details & Continuous Notes Trail */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2 text-xs uppercase tracking-wider">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Matter details & Progressive Tracking</span>
                    </div>

                    <div className="space-y-3 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase mb-0.5">{getField('subjectMatter', 'Subject matter').label}</span>
                        <p className="text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                          {selectedCase.subject_matter || selectedCase.briefSummary}
                        </p>
                      </div>

                      {selectedCase.notes && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase mb-0.5">{getField('notes', 'Notes').label}</span>
                          <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                            {selectedCase.notes}
                          </p>
                        </div>
                      )}

                      {/* Continuous Progressive Notes Trail Snapshot */}
                      <div className="pt-2 border-t border-slate-200/80">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <StickyNote className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-slate-900 font-bold text-xs uppercase tracking-wider">
                              Continuous Progressive Notes Trail
                            </span>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono font-bold px-1.5 py-0.2 rounded border border-indigo-200">
                              {(selectedCase.progressiveNotes || []).length} recorded
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab('notes')}
                            className="text-[11px] text-blue-700 hover:text-blue-900 font-medium hover:underline flex items-center gap-1"
                          >
                            <span>Open Full Notes Trail</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Quick Add Note Form */}
                        <form onSubmit={handleQuickNoteSubmit} className="mb-3 bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-600 font-medium">Quick progressive update:</span>
                            <select
                              value={quickNoteCategory}
                              onChange={(e) => setQuickNoteCategory(e.target.value as any)}
                              className="bg-white border border-slate-300 rounded text-[11px] px-2 py-0.5 font-medium text-slate-700"
                            >
                              <option value="Court Milestone">Court Milestone</option>
                              <option value="Client Communication">Client Communication</option>
                              <option value="Strategy">Strategy</option>
                              <option value="Registry & Filing">Registry & Filing</option>
                              <option value="Settlement / Recovery">Settlement / Recovery</option>
                              <option value="General">General</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={quickNoteContent}
                              onChange={(e) => setQuickNoteContent(e.target.value)}
                              placeholder="Type brief progressive tracking note (e.g. Ruling delivered, witness summoned, client deposited fee)..."
                              className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                            />
                            <button
                              type="submit"
                              disabled={!quickNoteContent.trim()}
                              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded text-xs font-medium flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                          </div>
                        </form>

                        {/* Recent Notes Preview */}
                        {(!selectedCase.progressiveNotes || selectedCase.progressiveNotes.length === 0) ? (
                          <div className="text-slate-400 italic text-[11px] py-1">
                            No progressive notes added yet. Use the quick entry above or open the notes trail.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedCase.progressiveNotes.slice(0, 3).map((note: ProgressiveNote) => (
                              <div key={note.id} className="bg-slate-50/80 p-2.5 rounded border border-slate-100 space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                      note.category === 'Court Milestone' ? 'bg-amber-100 text-amber-800' :
                                      note.category === 'Client Communication' ? 'bg-purple-100 text-purple-800' :
                                      note.category === 'Strategy' ? 'bg-indigo-100 text-indigo-800' :
                                      note.category === 'Settlement / Recovery' ? 'bg-emerald-100 text-emerald-800' :
                                      'bg-slate-200 text-slate-700'
                                    }`}>
                                      {note.category}
                                    </span>
                                    <span className="font-medium text-slate-800">{note.author}</span>
                                    {note.authorRole && <span className="text-slate-400 text-[10px]">({note.authorRole})</span>}
                                  </div>
                                  <span className="text-slate-400 text-[10px]">{new Date(note.timestamp).toLocaleDateString()}</span>
                                </div>
                                <p className="text-slate-700 text-xs line-clamp-2 leading-relaxed">
                                  {note.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Closure & billing */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-2xs space-y-3">
                    <div className="text-slate-900 font-bold border-b border-slate-100 pb-2 text-xs uppercase tracking-wider">
                      <span>Closure & billing</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">{getField('yearOfClosure', 'Year of closure').label}</span>
                        <span className="font-mono text-slate-800">{selectedCase.year_of_closure || '— (Active)'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">{getField('billingStatus', 'Billing status').label}</span>
                        <span className="text-slate-800">{selectedCase.billing_status || 'Retainer Account'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">{getField('paymentStatus', 'Payment status').label}</span>
                        <span className="text-slate-800">{selectedCase.payment_status || 'Regular / Active'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Claim UGX</span>
                        <span className="font-mono font-medium text-slate-800">UGX {selectedCase.claimValueUGX ? selectedCase.claimValueUGX.toLocaleString() : '—'}</span>
                      </div>
                    </div>

                    {selectedCase.verdict && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-slate-400 block text-[10px] uppercase mb-0.5">{getField('verdict', 'Verdict').label}</span>
                        <p className="text-slate-800 bg-emerald-50/50 p-2.5 rounded border border-emerald-100">
                          {selectedCase.verdict}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Continuous Notes Trail Tab */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  {/* Top Header / Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/70 p-3.5 rounded-lg border border-indigo-100">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <StickyNote className="w-4 h-4 text-indigo-700" />
                        <span className="font-bold text-indigo-950 text-sm">Continuous Notes Trail</span>
                        <span className="bg-indigo-200/80 text-indigo-900 font-mono font-bold text-[10px] px-2 py-0.5 rounded-full">
                          {(selectedCase.progressiveNotes || []).length} Progressive Entries
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-800">
                        Centralized progressive tracking trail for court milestones, client instructions, legal strategies, and case developments.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddingNote(!isAddingNote)}
                      className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg font-medium text-xs shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingNote ? 'Close Form' : 'Add Progressive Note'}</span>
                    </button>
                  </div>

                  {/* Add Progressive Note Form */}
                  {isAddingNote && (
                    <form onSubmit={handleProgressiveNoteSubmit} className="p-4 bg-white border border-indigo-200 rounded-lg shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-indigo-600" />
                          Record New Progressive Note
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Posting as: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.roleTitle || 'Advocate'})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-medium mb-1 text-[11px]">Note Category *</label>
                          <select
                            value={noteCategory}
                            onChange={(e) => setNoteCategory(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
                          >
                            <option value="Court Milestone">Court Milestone (Rulings, Mentions, Hearings)</option>
                            <option value="Client Communication">Client Communication (Calls, Instructions, Meetings)</option>
                            <option value="Strategy">Strategy (Pleadings, Evidence, Trial Tactics)</option>
                            <option value="Registry & Filing">Registry & Filing (Service of Process, Chamber Filings)</option>
                            <option value="Settlement / Recovery">Settlement / Recovery (Negotiations, Partial Payments)</option>
                            <option value="General">General Note / Case File Diary</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-medium mb-1 text-[11px]">Author Stamp</label>
                          <input
                            type="text"
                            disabled
                            value={`${currentUser.name} — ${currentUser.branchName || 'MK Advocates'}`}
                            className="w-full bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-600 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-medium mb-1 text-[11px]">Continuous Note Content *</label>
                        <textarea
                          required
                          rows={4}
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Document continuous progressive update e.g.: Presiding Judge delivered ruling on preliminary objection; directed plaintiff to file witness statements within 14 days. Client advised via email..."
                          className="w-full bg-slate-50 border border-slate-300 rounded-md p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 leading-relaxed"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNote(false);
                            setNoteContent('');
                          }}
                          className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded text-xs transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!noteContent.trim()}
                          className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Note to Progressive Trail</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-1">
                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                      {[
                        { id: 'all', label: 'All Categories' },
                        { id: 'Court Milestone', label: 'Milestones' },
                        { id: 'Client Communication', label: 'Client' },
                        { id: 'Strategy', label: 'Strategy' },
                        { id: 'Registry & Filing', label: 'Registry' },
                        { id: 'Settlement / Recovery', label: 'Settlement' },
                        { id: 'General', label: 'General' },
                      ].map((chip) => (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => setSelectedNoteFilter(chip.id)}
                          className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors border ${
                            selectedNoteFilter === chip.id
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={noteSearch}
                        onChange={(e) => setNoteSearch(e.target.value)}
                        placeholder="Search notes trail..."
                        className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Notes Feed */}
                  {(() => {
                    const allNotes: ProgressiveNote[] = selectedCase.progressiveNotes || [];
                    const filtered = allNotes.filter((note: ProgressiveNote) => {
                      const matchesCategory = selectedNoteFilter === 'all' || note.category === selectedNoteFilter;
                      const matchesSearch =
                        !noteSearch.trim() ||
                        note.content.toLowerCase().includes(noteSearch.toLowerCase()) ||
                        note.author.toLowerCase().includes(noteSearch.toLowerCase()) ||
                        note.category.toLowerCase().includes(noteSearch.toLowerCase());
                      return matchesCategory && matchesSearch;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg space-y-2">
                          <StickyNote className="w-8 h-8 text-slate-300 mx-auto" />
                          <div className="font-medium text-slate-600 text-xs">
                            {noteSearch || selectedNoteFilter !== 'all'
                              ? 'No progressive notes match your filter or search query.'
                              : 'No continuous progressive notes recorded yet for this matter.'}
                          </div>
                          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                            Progressive tracking lets advocates capture quick updates, client instructions, witness briefings, or court rulings on the go.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNoteFilter('all');
                              setNoteSearch('');
                              setIsAddingNote(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add First Progressive Note</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {filtered.map((note: ProgressiveNote) => {
                          const categoryStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
                            'Court Milestone': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
                            'Client Communication': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500' },
                            'Strategy': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
                            'Registry & Filing': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300', dot: 'bg-slate-600' },
                            'Settlement / Recovery': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
                            'General': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
                          };
                          const style = categoryStyles[note.category] || categoryStyles['General'];

                          return (
                            <div key={note.id} className="relative group">
                              {/* Dot on timeline */}
                              <div
                                className={`absolute -left-6 top-3 w-3 h-3 rounded-full border-2 border-white shadow-xs ${style.dot}`}
                              />

                              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs hover:border-slate-300 transition-colors space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}>
                                      {note.category}
                                    </span>
                                    <span className="font-semibold text-slate-900">{note.author}</span>
                                    {note.authorRole && (
                                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                        {note.authorRole}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {new Date(note.timestamp).toLocaleString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyNote(note.id, note.content)}
                                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                      title="Copy note text"
                                    >
                                      {copiedNoteId === note.id ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                                  {note.content}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* File Movement History Tab */}
              {activeTab === 'movement' && (
                <div className="space-y-4">
                  {/* Top Custody Summary Card */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-amber-700" />
                          <span className="font-bold text-amber-950 text-sm">Physical File Custody & Movement History</span>
                        </div>
                        <p className="text-[11px] text-amber-800">
                          Complete chain-of-custody tracking for this physical matter folder across firm registries, advocate chambers, and court halls.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsRecordingMovement(!isRecordingMovement)}
                        className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-medium text-xs shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>{isRecordingMovement ? 'Close Form' : 'Record File Movement'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/60 text-xs">
                      <div className="bg-white/80 p-2.5 rounded border border-amber-200/80">
                        <span className="text-[10px] uppercase text-amber-700 font-bold block">Current Location</span>
                        <span className="font-mono font-bold text-slate-900 truncate block mt-0.5">
                          {selectedCase.file_location || `${selectedCase.branchName || 'Kampala Central'} Registry`}
                        </span>
                      </div>

                      <div className="bg-white/80 p-2.5 rounded border border-amber-200/80">
                        <span className="text-[10px] uppercase text-amber-700 font-bold block">Status</span>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                          {selectedCase.fileMovementHistory?.[0]?.status || 'At Registry'}
                        </span>
                      </div>

                      <div className="bg-white/80 p-2.5 rounded border border-amber-200/80">
                        <span className="text-[10px] uppercase text-amber-700 font-bold block">Total Movements</span>
                        <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">
                          {(selectedCase.fileMovementHistory || []).length} Recorded
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Record File Movement Form */}
                  {isRecordingMovement && (
                    <form onSubmit={handleMovementSubmit} className="p-4 bg-white border border-amber-300 rounded-lg shadow-xs space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                          Log Physical File Movement
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Logged by: <strong className="text-slate-800">{currentUser.name}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-medium mb-1 text-[11px]">From Location *</label>
                          <input
                            type="text"
                            required
                            value={fromLoc}
                            onChange={(e) => setFromLoc(e.target.value)}
                            placeholder="e.g. Central Registry - Cabinet 4"
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-medium mb-1 text-[11px]">To Destination Location *</label>
                          <input
                            type="text"
                            required
                            value={toLoc}
                            onChange={(e) => setToLoc(e.target.value)}
                            placeholder="e.g. Counsel Office Desk / Court Registry"
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                          />
                        </div>
                      </div>

                      {/* Quick Location Suggestion Chips */}
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Quick destination suggestions:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            `${selectedCase.branchName || 'Central'} Registry - Central Cabinet`,
                            `Counsel ${selectedCase.leadAdvocate || 'In Conduct'}'s Desk`,
                            `Court Registry / Chambers`,
                            `Managing Partner Chambers`,
                            `Branch Associate Review Desk`,
                            `Secure Archival Depository`,
                          ].map((loc) => (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => setToLoc(loc)}
                              className="text-[10px] bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 px-2 py-0.5 rounded transition-colors"
                            >
                              {loc}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-700 font-medium mb-1 text-[11px]">Movement Status *</label>
                          <select
                            value={movementStatus}
                            onChange={(e) => setMovementStatus(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600 font-medium"
                          >
                            <option value="At Registry">At Registry (In Cabinet/Shelf)</option>
                            <option value="With Advocate">With Advocate (Chambers/Study)</option>
                            <option value="In Court">In Court (Hearing/Trial Dispatch)</option>
                            <option value="In Transit">In Transit (Courier/Inter-Branch)</option>
                            <option value="Archived">Archived (Closed Matter Vault)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-medium mb-1 text-[11px]">Moved / Dispatched By</label>
                          <input
                            type="text"
                            value={movedBy}
                            onChange={(e) => setMovedBy(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-medium mb-1 text-[11px]">Received By</label>
                          <input
                            type="text"
                            value={receivedBy}
                            onChange={(e) => setReceivedBy(e.target.value)}
                            placeholder="e.g. Assigned Counsel / Clerk"
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-medium mb-1 text-[11px]">Reason / Purpose of Movement *</label>
                        <input
                          type="text"
                          required
                          value={movementReason}
                          onChange={(e) => setMovementReason(e.target.value)}
                          placeholder="e.g. Retrieved for trial preparation and witness cross-examination outline..."
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRecordingMovement(false);
                            setToLoc('');
                            setMovementReason('');
                          }}
                          className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded text-xs transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!toLoc.trim() || !movementReason.trim()}
                          className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm & Log Movement</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Movement History Ledger Timeline */}
                  {(() => {
                    const history: FileMovementRecord[] = selectedCase.fileMovementHistory || [];
                    if (history.length === 0) {
                      return (
                        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg space-y-2">
                          <History className="w-8 h-8 text-slate-300 mx-auto" />
                          <div className="font-medium text-slate-600 text-xs">No physical file movement recorded yet.</div>
                          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                            Log file checkouts, transfers to advocate desks, court hearing dispatches, or inter-branch couriers to maintain a full chain-of-custody.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setToLoc(`${selectedCase.branchName || 'Central'} Registry Cabinet`);
                              setMovementReason('Initial file indexing and intake into registry');
                              setIsRecordingMovement(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-medium transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Record First Movement</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-1.5">
                            <History className="w-4 h-4 text-slate-600" />
                            <span>Chain of Custody Ledger</span>
                          </div>
                          <span className="text-[11px] font-normal text-slate-500">
                            Showing all {history.length} physical transfers
                          </span>
                        </div>

                        <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-amber-200">
                          {history.map((record: FileMovementRecord, idx: number) => {
                            const statusColor =
                              record.status === 'At Registry'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : record.status === 'With Advocate'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : record.status === 'In Court'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : record.status === 'In Transit'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-slate-100 text-slate-800 border-slate-200';

                            return (
                              <div key={record.id} className="relative group">
                                {/* Dot on timeline */}
                                <div
                                  className={`absolute -left-6 top-3 w-3 h-3 rounded-full border-2 border-white shadow-xs ${
                                    idx === 0 ? 'bg-amber-600 ring-2 ring-amber-300' : 'bg-slate-400'
                                  }`}
                                />

                                <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs hover:border-slate-300 transition-colors space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusColor}`}>
                                        {record.status || 'Movement'}
                                      </span>
                                      {idx === 0 && (
                                        <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                                          Current Custody
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {new Date(record.timestamp).toLocaleString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>

                                  {/* Route */}
                                  <div className="flex items-center gap-2 py-1 text-xs">
                                    <div className="bg-slate-100 px-2 py-1 rounded text-slate-700 font-mono truncate max-w-[45%]">
                                      {record.fromLocation}
                                    </div>
                                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <div className="bg-amber-50 border border-amber-200 px-2 py-1 rounded text-amber-950 font-mono font-medium truncate max-w-[45%]">
                                      {record.toLocation}
                                    </div>
                                  </div>

                                  {/* Reason */}
                                  <p className="text-slate-700 text-xs leading-relaxed bg-slate-50/80 p-2 rounded border border-slate-100">
                                    <strong className="text-slate-800">Reason: </strong>
                                    {record.reason}
                                  </p>

                                  {/* Handlers */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3 text-slate-400" />
                                      <span>Dispatched by: <strong className="text-slate-700">{record.movedBy}</strong></span>
                                    </div>
                                    {record.receivedBy && (
                                      <div className="flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                        <span>Received by: <strong className="text-slate-700">{record.receivedBy}</strong></span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Hearings Tab */}
              {activeTab === 'hearings' && (
                <div className="space-y-4">
                  {isSchedulingHearing && (
                    <form onSubmit={handleScheduleHearing} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                      <div className="font-bold text-slate-800 text-xs">Schedule New Court Hearing</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-600 mb-1">Hearing Date *</label>
                          <input
                            type="date"
                            required
                            value={newHearingDate}
                            onChange={(e) => setNewHearingDate(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-1">Time</label>
                          <input
                            type="text"
                            value={newHearingTime}
                            onChange={(e) => setNewHearingTime(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-1">Judge / Registrar</label>
                          <input
                            type="text"
                            value={newHearingJudge}
                            onChange={(e) => setNewHearingJudge(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Hearing Purpose *</label>
                        <input
                          type="text"
                          required
                          value={newHearingPurpose}
                          onChange={(e) => setNewHearingPurpose(e.target.value)}
                          placeholder="e.g. Cross-examination of PW1"
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsSchedulingHearing(false)}
                          className="px-3 py-1 text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-slate-900 text-white rounded font-medium"
                        >
                          Save Hearing
                        </button>
                      </div>
                    </form>
                  )}

                  {caseHearings.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      No hearings scheduled yet for this matter.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                      {caseHearings.map((h) => (
                        <div key={h.id} className="p-3.5 bg-white flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{h.hearingDate}</span>
                              <span className="text-slate-400">at {h.hearingTime}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                                {h.status}
                              </span>
                            </div>
                            <div className="font-medium text-slate-800">{h.hearingPurpose}</div>
                            <div className="text-[11px] text-slate-500">{h.courtName} · {h.presidingJudge}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  {isUploadingDoc && (
                    <form onSubmit={handleDocumentSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                      <div className="font-bold text-slate-800 text-xs">Index New Court Document</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-600 mb-1">Document Title *</label>
                          <input
                            type="text"
                            required
                            value={docTitle}
                            onChange={(e) => setDocTitle(e.target.value)}
                            placeholder="e.g. Plaint / Witness Statement of DW1"
                            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-1">Document Type</label>
                          <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value as any)}
                            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                          >
                            <option value="Plaint">Plaint</option>
                            <option value="Written Statement of Defense">Written Statement of Defense</option>
                            <option value="Affidavit">Affidavit</option>
                            <option value="Legal Submissions">Legal Submissions</option>
                            <option value="Court Order">Court Order</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsUploadingDoc(false)}
                          className="px-3 py-1 text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-slate-900 text-white rounded font-medium"
                        >
                          Upload Document
                        </button>
                      </div>
                    </form>
                  )}

                  {caseDocs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      No documents indexed for this case yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                      {caseDocs.map((d) => (
                        <div key={d.id} className="p-3.5 bg-white flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-900">{d.title}</div>
                            <div className="text-[11px] text-slate-500">
                              {d.documentType} · Filed {d.filingDate} by {d.filedBy}
                            </div>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">{d.fileSize}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Branch Transfer Tab */}
              {activeTab === 'transfer' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-2">
                    <div className="font-bold text-amber-900">Inter-Branch Case Reallocation</div>
                    <p className="text-amber-800 text-xs">
                      Reallocate this matter between Kampala Head Office and regional branch offices (Fort Portal, Mbarara, Gulu, Masindi, Masaka, Jinja).
                    </p>
                  </div>

                  <form onSubmit={handleTransferSubmit} className="space-y-3 bg-white p-4 border border-slate-200 rounded-lg">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Select Destination Branch Office *
                      </label>
                      <select
                        value={targetBranchId}
                        onChange={(e) => setTargetBranchId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                      >
                        {branches
                          .filter((b) => b.id !== selectedCase.branchId)
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.city}) — Lead: {b.teamLead}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Reason for Transfer / Registry Directive *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={transferReason}
                        onChange={(e) => setTransferReason(e.target.value)}
                        placeholder="e.g. Venue of trial moved to Fort Portal High Court Circuit for on-site locus visit..."
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center gap-1.5"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Transfer Matter</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
