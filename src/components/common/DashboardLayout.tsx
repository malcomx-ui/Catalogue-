import React from 'react';

/**
 * DashboardLayout with the header block completely removed.
 * Main content starts immediately below.
 */
export default function DashboardLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content starts immediately below */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}

export { DashboardLayout };
