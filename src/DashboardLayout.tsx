import React, { useState } from 'react';
import { BankHubPage } from './components/BankHubPage';
import { BankWorkspace } from './components/BankWorkspace';

export const DashboardLayout: React.FC<{ currentUser?: any; children?: React.ReactNode }> = ({ currentUser, children }) => {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 font-bold text-xl text-gray-900">Infosight Portal</div>
        <nav className="flex-1 px-4 space-y-1">
          <button 
            onClick={() => { setActiveNav('dashboard'); setSelectedBank(null); }}
            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium ${activeNav === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => { setActiveNav('mortgages'); setSelectedBank(null); }}
            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium ${activeNav === 'mortgages' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Mortgages
          </button>
          {/* Other nav items... */}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {activeNav === 'mortgages' && !selectedBank && (
          <BankHubPage onSelectBank={(bankName) => setSelectedBank(bankName)} />
        )}

        {activeNav === 'mortgages' && selectedBank && (
          <BankWorkspace 
            bankName={selectedBank} 
            currentUser={currentUser} 
            onBack={() => setSelectedBank(null)} 
          />
        )}

        {activeNav === 'dashboard' && (
          children ? (
            <div className="p-6">{children}</div>
          ) : (
            <div className="p-6">
              <h1 className="text-2xl font-bold">General Dashboard</h1>
              <p className="text-gray-500">Welcome back, {currentUser?.name || 'User'}</p>
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default DashboardLayout;
