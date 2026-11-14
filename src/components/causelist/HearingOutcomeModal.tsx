import React, { useState } from 'react';
import { CourtHearing } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Gavel, Calendar, CheckCircle2, Clock } from 'lucide-react';

interface HearingOutcomeModalProps {
  hearing: CourtHearing;
  onClose: () => void;
}

export const HearingOutcomeModal: React.FC<HearingOutcomeModalProps> = ({
  hearing,
  onClose,
}) => {
  const { updateHearingOutcome, currentUser } = useApp();

  const [status, setStatus] = useState<'Completed' | 'Adjourned' | 'Part-Heard'>(
    hearing.status === 'Scheduled' ? 'Completed' : (hearing.status as any)
  );
  const [courtNotes, setCourtNotes] = useState(hearing.courtNotes || '');
  const [nextHearingDate, setNextHearingDate] = useState(hearing.nextHearingDate || '');
  const [nextDirections, setNextDirections] = useState(hearing.nextDirections || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateHearingOutcome(hearing.id, {
      status,
      courtNotes: `${courtNotes} [Logged by ${currentUser?.name || 'System User'} on ${new Date().toLocaleDateString()}]`,
      nextHearingDate: nextHearingDate || undefined,
      nextDirections: nextDirections || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-[#0B132B] text-slate-100 p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
              Court Outcome Log
            </div>
            <h3 className="font-serif-legal text-lg font-bold text-white">
              Record Proceedings: {hearing.suitNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Hearing Status Outcome</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Completed', label: 'Concluded / Done', color: 'border-emerald-500 text-emerald-800 bg-emerald-50' },
                { id: 'Adjourned', label: 'Adjourned', color: 'border-amber-500 text-amber-800 bg-amber-50' },
                { id: 'Part-Heard', label: 'Part-Heard', color: 'border-blue-500 text-blue-800 bg-blue-50' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatus(opt.id as any)}
                  className={`py-2 px-2.5 rounded-lg border text-center font-medium transition-all ${
                    status === opt.id
                      ? `${opt.color} ring-2 ring-amber-400 font-bold`
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Court Notes & Bench Remarks:
            </label>
            <textarea
              required
              rows={3}
              value={courtNotes}
              onChange={(e) => setCourtNotes(e.target.value)}
              placeholder="e.g. PW1 concluded cross-examination. Exhibit P4 admitted without objection. Defendant counsel requested 14 days to prepare defense witnesses..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          {status !== 'Completed' && (
            <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
                Adjournment & Next Court Date
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1">Next Appearance Date:</label>
                  <input
                    type="date"
                    required={status === 'Adjourned' || status === 'Part-Heard'}
                    value={nextHearingDate}
                    onChange={(e) => setNextHearingDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Court Order / Direction:</label>
                  <input
                    type="text"
                    value={nextDirections}
                    onChange={(e) => setNextDirections(e.target.value)}
                    placeholder="e.g. For Defense Case / DW1"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg shadow-xs"
            >
              Update Docket Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
