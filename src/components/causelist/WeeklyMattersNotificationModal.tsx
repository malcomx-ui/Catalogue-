import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CaseItem, CourtHearing } from '../../types';
import {
  Bell,
  Calendar,
  Clock,
  Scale,
  Gavel,
  ChevronRight,
  X,
  AlertTriangle,
  Building2,
  UserCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export interface WeeklyMatterItem {
  id: string;
  date: string;
  time: string;
  type: 'hearing' | 'deadline' | 'milestone';
  typeLabel: string;
  title: string;
  caseNumber: string;
  suitNo?: string;
  court: string;
  judge?: string;
  counsel?: string;
  branchName?: string;
  purpose: string;
  daysRemaining: number;
  caseItem?: CaseItem;
  hearingItem?: CourtHearing;
}

interface WeeklyMattersNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToDiary?: () => void;
}

export const WeeklyMattersNotificationModal: React.FC<WeeklyMattersNotificationModalProps> = ({
  isOpen,
  onClose,
  onNavigateToDiary,
}) => {
  const { cases, hearings, branches, setSelectedCase, setActiveTab, selectedBranchFilter } = useApp();

  // Calculate upcoming matters happening within the current week (next 7 days)
  const weeklyMatters = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7);
    maxDate.setHours(23, 59, 59, 999);

    const todayStr = today.toISOString().split('T')[0];
    const maxDateStr = maxDate.toISOString().split('T')[0];

    const items: WeeklyMatterItem[] = [];
    const seenCaseIds = new Set<string>();

    // 1. Process explicit court hearings
    hearings.forEach((h) => {
      if (!h.hearingDate) return;
      if (h.hearingDate >= todayStr && h.hearingDate <= maxDateStr) {
        if (selectedBranchFilter !== 'all' && h.branchId && h.branchId !== selectedBranchFilter) return;

        const hDate = new Date(h.hearingDate + 'T00:00:00');
        const diffMs = hDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        const matchedCase = cases.find(
          (c) => c.id === h.caseId || (c.suitNumber && c.suitNumber === h.suitNumber)
        );

        if (matchedCase) {
          seenCaseIds.add(matchedCase.id);
        }

        const isMention = (h.hearingPurpose || '').toLowerCase().includes('mention');
        const isRuling = (h.hearingPurpose || '').toLowerCase().includes('ruling') || (h.hearingPurpose || '').toLowerCase().includes('judgment');

        items.push({
          id: h.id,
          date: h.hearingDate,
          time: h.hearingTime || '09:30 AM',
          type: isMention || isRuling ? 'milestone' : 'hearing',
          typeLabel: isRuling ? 'Ruling / Judgment' : isMention ? 'Court Mention' : 'Court Hearing',
          title: h.caseTitle || matchedCase?.title || 'Litigation Matter',
          caseNumber: h.suitNumber || matchedCase?.case_number || matchedCase?.suitNumber || 'MK File Pending',
          suitNo: matchedCase?.suit_no,
          court: h.courtName || matchedCase?.court || 'High Court of Uganda',
          judge: h.presidingJudge || matchedCase?.presidingJudge,
          counsel: h.leadCounsel || matchedCase?.leadAdvocate,
          branchName: branches.find((b) => b.id === h.branchId)?.name || matchedCase?.branchName,
          purpose: h.hearingPurpose || 'Court Appearance',
          daysRemaining: diffDays,
          caseItem: matchedCase,
          hearingItem: h,
        });
      }
    });

    // 2. Process cases with hearing_date or nextHearingDate not yet in hearings list
    cases.forEach((c) => {
      const hearingDate = c.hearing_date || c.nextHearingDate;
      if (!hearingDate) return;
      if (hearingDate >= todayStr && hearingDate <= maxDateStr) {
        if (selectedBranchFilter !== 'all' && c.branchId && c.branchId !== selectedBranchFilter) return;

        const refNo = c.case_number || c.suitNumber || '';
        const alreadyIncluded = items.some(
          (item) => item.date === hearingDate && (item.caseItem?.id === c.id || item.caseNumber === refNo)
        );

        if (!alreadyIncluded) {
          const hDate = new Date(hearingDate + 'T00:00:00');
          const diffMs = hDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          const purpose = c.nextHearingPurpose || 'Substantive Court Hearing';
          const isMention = purpose.toLowerCase().includes('mention') || (c.stage || '').toLowerCase().includes('mention');
          const isRuling = purpose.toLowerCase().includes('ruling') || purpose.toLowerCase().includes('judgment') || (c.stage || '').toLowerCase().includes('ruling');

          items.push({
            id: `case-hearing-${c.id}`,
            date: hearingDate,
            time: '09:30 AM',
            type: isRuling || isMention ? 'milestone' : 'hearing',
            typeLabel: isRuling ? 'Ruling / Judgment' : isMention ? 'Court Mention' : 'Court Hearing',
            title: c.title || 'Litigation Matter',
            caseNumber: refNo || 'MK File Pending',
            suitNo: c.suit_no,
            court: c.court || 'High Court of Uganda',
            judge: c.presidingJudge,
            counsel: c.leadAdvocate || c.person_in_conduct,
            branchName: c.branchName || c.branch,
            purpose,
            daysRemaining: diffDays,
            caseItem: c,
          });
        }
      }
    });

    // Sort chronologically (soonest first)
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [cases, hearings, branches, selectedBranchFilter]);

  if (!isOpen) return null;

  const handleOpenCase = (item: WeeklyMatterItem) => {
    if (item.caseItem) {
      setSelectedCase(item.caseItem);
      onClose();
    }
  };

  const handleGoToDiary = () => {
    setActiveTab('causelist');
    if (onNavigateToDiary) onNavigateToDiary();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Accent Header */}
        <div className="bg-gradient-to-r from-[#0b132b] via-[#1c2541] to-[#3a506b] text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5 shadow-inner">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  Upcoming Matters (Next 7 Days)
                </span>
                <span className="text-[11px] text-slate-300">
                  Real-Time Docket Notification
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                Weekly Court Fixtures &amp; Deadlines
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {weeklyMatters.length === 0
                  ? 'No court appearances or procedural deadlines scheduled this week.'
                  : `You have ${weeklyMatters.length} matter${weeklyMatters.length === 1 ? '' : 's'} requiring counsel attention in the next 7 days.`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Close Alert"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
          {weeklyMatters.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900">
                Clear Docket for the Next 7 Days
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active court hearings, mentions, or procedural milestones are flagged for this week.
              </p>
            </div>
          ) : (
            weeklyMatters.map((m) => {
              const isToday = m.daysRemaining === 0;
              const isTomorrow = m.daysRemaining === 1;

              const badgeColor = isToday
                ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-200 animate-pulse'
                : isTomorrow
                ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-200'
                : 'bg-blue-50 text-blue-700 border-blue-200';

              const timeLabel = isToday
                ? 'TODAY'
                : isTomorrow
                ? 'TOMORROW'
                : `In ${m.daysRemaining} days`;

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase border ${badgeColor}`}>
                        {timeLabel}
                      </span>

                      <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {new Date(m.date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>

                      <span className="text-slate-400">·</span>
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {m.time}
                      </span>

                      <span className="text-slate-400">·</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {m.typeLabel}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 leading-snug truncate">
                      {m.title}
                    </h4>

                    {/* Case and Registry Identifiers */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        MK: <strong>{m.caseNumber}</strong>
                      </span>
                      {m.suitNo ? (
                        <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                          Court Suit No: <strong>{m.suitNo}</strong>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic font-sans text-[10px]">
                          Suit No. unassigned
                        </span>
                      )}
                      {m.branchName && (
                        <span className="text-blue-700 font-sans font-medium">
                          {m.branchName}
                        </span>
                      )}
                    </div>

                    {/* Purpose in court */}
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-slate-700 text-xs">
                      <strong className="text-slate-900">Business in Court:</strong> {m.purpose}
                    </div>

                    {/* Court and Counsel details */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                      <span>Court: <strong className="text-slate-700">{m.court}</strong></span>
                      {m.judge && (
                        <span>Judge: <strong className="text-slate-700">{m.judge}</strong></span>
                      )}
                      {m.counsel && (
                        <span>Counsel: <strong className="text-slate-700">{m.counsel}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {m.caseItem && (
                      <button
                        type="button"
                        onClick={() => handleOpenCase(m)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <span>View Case</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Automatic firm-wide synchronization across all 7 regional branches</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleGoToDiary}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>Open Cause Diary</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors shadow-2xs"
            >
              Acknowledge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
