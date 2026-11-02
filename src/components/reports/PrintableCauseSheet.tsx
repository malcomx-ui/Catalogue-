import React from 'react';
import { useApp } from '../../context/AppContext';
import { Printer, X, Scale } from 'lucide-react';

export const PrintableCauseSheet: React.FC = () => {
  const { printableCauseDate, setPrintableCauseDate, hearings, cases } = useApp();

  if (!printableCauseDate) return null;

  // Filter hearings for this date or surrounding dates
  const dayHearings = hearings.filter((h) => h.hearingDate === printableCauseDate);
  const displayHearings = dayHearings.length > 0 ? dayHearings : hearings.slice(0, 5);

  const formattedDate = new Date(printableCauseDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 print:p-0 print:bg-white print:fixed">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-300 p-8 text-slate-900 print:border-none print:shadow-none print:w-full print:max-w-none">
        {/* Print Toolbar (Hidden on actual print) */}
        <div className="no-print flex items-center justify-between pb-6 mb-6 border-b border-slate-200">
          <div className="text-xs text-slate-500">
            Document Ready for Courtroom Attendance & Bench Notes
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Cause Sheet</span>
            </button>
            <button
              onClick={() => setPrintableCauseDate(null)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* OFFICIAL LETTERHEAD */}
        <div className="text-center pb-5 border-b-2 border-slate-900">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Scale className="w-6 h-6 text-slate-900" />
            <span className="font-serif-legal text-2xl font-bold tracking-widest text-slate-900">
              MK ADVOCATES
            </span>
          </div>
          <div className="text-[11px] uppercase tracking-wider text-slate-600 font-semibold font-sans-legal">
            Advocates, Commissioners for Oaths & Legal Consultants
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Head Office: Millennium Plaza, 2nd Floor, Bugolobi, Kampala · Tel: +256 414 250 890 · Email: litigation@mkadvocates.ug
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">
            Regional Chambers: Fort Portal · Mbarara · Gulu · Masindi · Masaka · Jinja
          </div>
        </div>

        {/* SHEET TITLE */}
        <div className="my-5 text-center">
          <h2 className="font-serif-legal text-lg font-bold uppercase tracking-wider text-slate-900">
            Daily Court Cause List & Advocate Allocation Sheet
          </h2>
          <div className="text-xs font-semibold text-slate-700 font-mono-legal mt-0.5">
            FOR: {formattedDate.toUpperCase()}
          </div>
        </div>

        {/* CAUSE TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-300 divide-y divide-slate-300">
            <thead className="bg-slate-100 font-semibold text-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-2 border-r border-slate-300 w-10 text-center">No.</th>
                <th className="p-2 border-r border-slate-300 w-40">Suit No. & Ref</th>
                <th className="p-2 border-r border-slate-300">Parties to the Suit</th>
                <th className="p-2 border-r border-slate-300 w-44">Court & Judge</th>
                <th className="p-2 border-r border-slate-300 w-36">Purpose in Court</th>
                <th className="p-2 border-r border-slate-300 w-32">Counsel Assigned</th>
                <th className="p-2 w-36">Bench Directions / Next Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayHearings.map((h, idx) => {
                const c = cases.find((item) => item.id === h.caseId);

                return (
                  <tr key={h.id} className="align-top">
                    <td className="p-2 text-center font-mono-legal text-slate-500 border-r border-slate-300">
                      {idx + 1}
                    </td>
                    <td className="p-2 border-r border-slate-300 font-mono-legal">
                      <div className="font-bold text-slate-900">
                        {h.suitNumber ? h.suitNumber : <span className="text-slate-400 font-sans italic text-xs font-normal">None</span>}
                      </div>
                      {c?.firmRefNumber && c.firmRefNumber !== h.suitNumber && (
                        <div className="text-[10px] text-slate-500 mt-0.5">{c.firmRefNumber}</div>
                      )}
                      <div className="text-[10px] text-slate-600 font-semibold mt-1">
                        Time: {h.hearingTime}
                      </div>
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <div className="font-bold text-slate-900 leading-snug">{h.caseTitle}</div>
                      {c && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          Opposing: {c.opposingFirm} ({c.opposingCounsel})
                        </div>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-[11px]">
                      <div className="font-semibold text-slate-900">{h.courtName}</div>
                      <div className="text-slate-600">{h.courtRoom}</div>
                      <div className="text-slate-500 mt-0.5">{h.presidingJudge}</div>
                    </td>
                    <td className="p-2 border-r border-slate-300 text-[11px] font-medium text-slate-800">
                      {h.hearingPurpose}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-[11px]">
                      <div className="font-semibold text-slate-900">{h.leadCounsel}</div>
                      {c?.assistingAdvocates && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {c.assistingAdvocates.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-[10px] text-slate-400 italic">
                      {h.courtNotes ? (
                        <span className="text-slate-800 font-normal not-italic">{h.courtNotes}</span>
                      ) : (
                        <div className="h-10 border-b border-dashed border-slate-300"></div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* SIGN-OFF FOOTER */}
        <div className="mt-8 pt-4 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600">
          <div>
            <span>Verified by Registry Clerk: </span>
            <span className="inline-block border-b border-slate-400 w-36 ml-2"></span>
          </div>
          <div>
            <span>Partner / Advocate Sign-off: </span>
            <span className="inline-block border-b border-slate-400 w-36 ml-2"></span>
          </div>
        </div>
      </div>
    </div>
  );
};
