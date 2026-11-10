import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';

export interface HeaderProps {
  date?: string;
  station?: string;
}

export default function Header({ date, station }: HeaderProps) {
  let userBranch = 'Masaka Regional Office';
  try {
    const { currentUser } = useApp();
    if (currentUser?.branchName) {
      userBranch = currentUser.branchName;
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

  const displayDate = date || formattedToday || 'Tue, 10 Nov 2026';
  const displayStation = station || userBranch || 'Masaka Regional Office';

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 py-4 bg-white border-b border-gray-200">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          Muhumuza-Kiiza
        </h1>
        <p className="text-sm font-medium text-gray-600">
          ADVOCATES &amp; LEGAL CONSULTANTS
        </p>
      </div>

      <div className="mt-2 md:mt-0 text-sm text-gray-500 flex items-center gap-2">
        <span>{displayDate}</span>
        <span>·</span>
        <span>Station: {displayStation}</span>
      </div>
    </header>
  );
}

export { Header };
