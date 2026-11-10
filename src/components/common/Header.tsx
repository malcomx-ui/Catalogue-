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

  const displayTitle = title || 'Muhumuza-Kiiza (UGANDA)';
  const displaySubtitle = subtitle || 'ADVOCATES & LEGAL CONSULTANTS';
  const displayDate = date || formattedToday || 'Tue, 10 Nov 2026';
  const displayStation = station || userBranch || 'Kampala Central (Head Office)';
  const displayFiltered = showFilteredScope !== undefined ? showFilteredScope : true;

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 py-4 bg-white border-b border-gray-200">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          {displayTitle}
        </h1>
        <p className="text-sm font-medium text-gray-600">
          {displaySubtitle}
        </p>
      </div>

      <div className="mt-2 md:mt-0 text-sm text-gray-500 flex items-center gap-2">
        <span>{displayDate}</span>
        <span>·</span>
        <span>Station: {displayStation}</span>
        {displayFiltered && (
          <>
            <span>·</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              Filtered Scope
            </span>
          </>
        )}
      </div>
    </header>
  );
}

export { Header };
