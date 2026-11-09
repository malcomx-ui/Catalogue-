import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Calendar, Clock, MapPin, User, FileText } from 'lucide-react';
import { CourtDivision } from '../../types';

interface ScheduleHearingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduleHearingModal: React.FC<ScheduleHearingModalProps> = ({ isOpen, onClose }) => {
  const { cases, addHearing, currentUser, branches } = useApp();

  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || '');
  const [hearingDate, setHearingDate] = useState('2026-10-22');
  const [hearingTime, setHearingTime] = useState('09:30 AM');
  const [courtName, setCourtName] = useState('High Court of Uganda');
  const [division, setDivision] = useState<CourtDivision>('High Court (Commercial Division)');
  const [courtRoom, setCourtRoom] = useState('Court Room 3');
  const [presidingJudge, setPresidingJudge] = useState('');
  const [hearingPurpose, setHearingPurpose] = useState('Scheduling Conference');
  const [leadCounsel, setLeadCounsel] = useState(currentUser.name);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedCase = cases.find((c) => c.id === selectedCaseId);
    if (!matchedCase) return;

    addHearing({
      caseId: matchedCase.id,
      suitNumber: matchedCase.suitNumber,
      caseTitle: matchedCase.title,
      hearingDate,
      hearingTime,
      courtName: courtName || matchedCase.court,
      division: division || matchedCase.division,
      courtRoom: courtRoom || 'Court Room 1',
      presidingJudge: presidingJudge || matchedCase.presidingJudge,
      hearingPurpose: hearingPurpose || 'Court Appearance',
      leadCounsel: leadCounsel || currentUser.name,
      assignedAdvocates: [leadCounsel || currentUser.name],
      status: 'Scheduled',
      courtNotes: notes,
      branchId: matchedCase.branchId,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div>
            <h2 className="text-base font-bold text-white">
              Schedule Court Hearing / Fixture
            </h2>
            <p className="text-xs text-slate-300">
              Enter court appearance details into the firm-wide cause diary
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs text-slate-700">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Select Litigation Matter / Case *
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => {
                const cId = e.target.value;
                setSelectedCaseId(cId);
                const c = cases.find((item) => item.id === cId);
                if (c) {
                  setCourtName(c.court);
                  setDivision(c.division);
                  setPresidingJudge(c.presidingJudge);
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number || c.suitNumber ? `[MK: ${c.case_number || c.suitNumber}] ` : ''}{c.suit_no ? `[Suit: ${c.suit_no}] ` : ''}{c.title} ({c.branchName})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Hearing Date *
              </label>
              <input
                type="date"
                value={hearingDate}
                onChange={(e) => setHearingDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Appearance Time *
              </label>
              <input
                type="text"
                value={hearingTime}
                onChange={(e) => setHearingTime(e.target.value)}
                placeholder="09:30 AM"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Court & Division
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              >
                <option value="High Court (Commercial Division)">Commercial Division</option>
                <option value="High Court (Land Division)">Land Division</option>
                <option value="High Court (Civil Division)">Civil Division</option>
                <option value="High Court (Execution & Bailiffs)">Execution & Bailiffs</option>
                <option value="Court of Appeal / Constitutional Court">Court of Appeal</option>
                <option value="Supreme Court of Uganda">Supreme Court</option>
                <option value="Chief Magistrate Court">Chief Magistrate Court</option>
                <option value="Tax Appeals Tribunal">Tax Appeals Tribunal</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Courtroom / Station
              </label>
              <input
                type="text"
                value={courtRoom}
                onChange={(e) => setCourtRoom(e.target.value)}
                placeholder="Court Room 2"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Presiding Judicial Officer
              </label>
              <input
                type="text"
                value={presidingJudge}
                onChange={(e) => setPresidingJudge(e.target.value)}
                placeholder="Hon. Justice..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Hearing Purpose *
              </label>
              <input
                type="text"
                value={hearingPurpose}
                onChange={(e) => setHearingPurpose(e.target.value)}
                placeholder="Mention / Scheduling / Cross-Examination / Ruling"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Lead Counsel Appearing
            </label>
            <input
              type="text"
              value={leadCounsel}
              onChange={(e) => setLeadCounsel(e.target.value)}
              placeholder="Advocate Name"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Registry Notes / Preparation Checklist
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ensure trial bundle is lodged, witness summons extracted, authorities served on opposing counsel..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium shadow-xs transition-colors"
            >
              Fixture Hearing
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
