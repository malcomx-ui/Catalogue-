import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CourtHearing } from '../../types';
import { HearingOutcomeModal } from './HearingOutcomeModal';
import { ScheduleHearingModal } from './ScheduleHearingModal';
import {
  CalendarDays,
  Calendar,
  Printer,
  CheckCircle2,
  Clock,
  Video,
  Plus,
} from 'lucide-react';

export const CauseListDiary: React.FC = () => {
  const {
    hearings,
    cases,
    setSelectedCase,
    selectedBranchFilter,
    branches,
    setPrintableCauseDate,
  } = useApp();

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedHearingForOutcome, setSelectedHearingForOutcome] = useState<CourtHearing | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const todayStr = '2026-10-21';

  const filteredHearings = hearings.filter((h) => {
    if (selectedBranchFilter !== 'all' && h.branchId !== selectedBranchFilter) return false;
    if (statusFilter !== 'all' && h.status !== statusFilter) return false;
    if (dateFilter === 'today') return h.hearingDate === todayStr;
    if (dateFilter === 'week') return h.hearingDate >= '2026-10-19' && h.hearingDate <= '2026-10-26';
    return true;
  });

  const sortedHearings = [...filteredHearings].sort((a, b) => {
    return new Date(`${a.hearingDate} ${a.hearingTime}`).getTime() - new Date(`${b.hearingDate} ${b.hearingTime}`).getTime();
  });

  return (
    <div className="space-y-4">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Cause List & Court Diary
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Scheduled appearances, mentions, and rulings across courts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsScheduleOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs min-h-[38px] sm:min-h-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Hearing</span>
          </button>

          <button
            onClick={() => setPrintableCauseDate(todayStr)}
            className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors shadow-2xs min-h-[38px] sm:min-h-0"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Daily Cause List</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'week', label: 'This Week' },
              { id: 'today', label: 'Today' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id as any)}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  dateFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 min-h-[36px] sm:min-h-0"
          >
            <option value="all">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Adjourned">Adjourned</option>
            <option value="Part-Heard">Part-Heard</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          {sortedHearings.length} court appearances
        </div>
      </div>

      {/* Hearings List */}
      <div className="space-y-2.5">
        {sortedHearings.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-xs text-slate-500">
            No hearings found matching current filter.
          </div>
        ) : (
          sortedHearings.map((h) => {
            const correspondingCase = cases.find((c) => c.id === h.caseId);
            const branchObj = branches.find((b) => b.id === h.branchId);

            return (
              <div
                key={h.id}
                className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                      {h.hearingDate}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-medium text-slate-700">{h.hearingTime}</span>
                    {h.suitNumber && (
                      <>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600 font-mono">{h.suitNumber}</span>
                      </>
                    )}
                    <span className="text-slate-400">·</span>
                    <span className="text-blue-700 font-medium">{branchObj?.name}</span>
                  </div>

                  <h3 className="font-semibold text-sm text-slate-900 leading-snug">
                    {h.caseTitle}
                  </h3>

                  <div className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                    <strong>Business in Court:</strong> {h.hearingPurpose}
                  </div>

                  <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3">
                    <span>Court: <strong>{h.courtName} ({h.courtRoom})</strong></span>
                    <span>Judge: <strong>{h.presidingJudge}</strong></span>
                    <span>Counsel: <strong>{h.leadCounsel}</strong></span>
                  </div>

                  {h.courtNotes && (
                    <div className="text-[11px] text-slate-600">
                      <strong>Notes:</strong> {h.courtNotes}
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      h.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : h.status === 'Adjourned'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {h.status}
                  </span>

                  <div className="flex items-center gap-1.5 mt-2">
                    {h.virtualCourtUrl && (
                      <a
                        href={h.virtualCourtUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[11px] font-medium hover:bg-blue-100 flex items-center gap-1"
                      >
                        <Video className="w-3 h-3" />
                        <span>Link</span>
                      </a>
                    )}

                    <button
                      onClick={() => setSelectedHearingForOutcome(h)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium"
                    >
                      Record Outcome
                    </button>

                    {correspondingCase && (
                      <button
                        onClick={() => setSelectedCase(correspondingCase)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
                      >
                        Case
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedHearingForOutcome && (
        <HearingOutcomeModal
          hearing={selectedHearingForOutcome}
          onClose={() => setSelectedHearingForOutcome(null)}
        />
      )}

      <ScheduleHearingModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
      />
    </div>
  );
};
