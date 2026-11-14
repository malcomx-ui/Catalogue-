import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  date?: string;
  station?: string;
  showFilteredScope?: boolean;
}

export default function Header({
  title,
  subtitle,
  date,
  station,
  showFilteredScope,
}: HeaderProps) {
  let userBranch = 'Kampala Central (Head Office)';
  let isFiltered = true;

  try {
    const { currentUser, selectedBranchFilter } = useApp();
    if (currentUser?.branchName) {
      userBranch = currentUser.branchName;
    }
    if (selectedBranchFilter !== undefined) {
      isFiltered = selectedBranchFilter !== 'all';
    }
  } catch (e) {
    // Graceful fallback if outside provider
  }

  const formattedToday = useMemo(() => {
    try {
      return new Date().toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return 'Tue, 10 Nov 2026';
    }
  }, []);

  const displayTitle = title || 'Muhumuza-Kiiza';
  const displaySubtitle = subtitle || 'ADVOCATES & LEGAL CONSULTANTS';
  const displayDate = date || formattedToday || 'Tue, 10 Nov 2026';
  const displayStation = station || userBranch || 'Kampala Central (Head Office)';
  const displayFiltered = showFilteredScope !== undefined ? showFilteredScope : true;

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
      <div className="flex items-center space-x-3">
        <img src="/seal.png" alt="Muhumuza-Kiiza Seal" className="h-10 w-10" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {displayTitle}
          </h1>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {displaySubtitle}
          </p>
        </div>
      </div>

      <div className="mt-2 md:mt-0 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
        <span className="tabular-nums">{displayDate}</span>
        <span>·</span>
        <span>Station: {displayStation}</span>
        {displayFiltered && (
          <>
            <span>·</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80">
              Filtered Scope
            </span>
          </>
        )}
      </div>
    </header>
  );
}

export { Header };
