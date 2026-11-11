import React, { useState } from 'react';
import { BankHubPage } from './BankHubPage';
import { BankWorkspace } from './BankWorkspace';

export const DashboardLayout: React.FC<{ currentUser?: any; children?: React.ReactNode }> = ({ currentUser, children }) => {
  // 1. State for active navigation tab and selected bank drill-down
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mortgages' | 'settings'>('dashboard');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  // Handle clicking Mortgages in sidebar
  const handleNavClick = (tab: 'dashboard' | 'mortgages' | 'settings') => {
    setActiveTab(tab);
    if (tab !== 'mortgages') {
      setSelectedBank(null); // Reset bank selection if leaving mortgages tab
    }
  };

  const activeNav = activeTab;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-6 font-bold text-xl text-gray-900 border-b border-gray-100">
          Infosight Portal
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          <button 
            onClick={() => handleNavClick('dashboard')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeNav === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📊 Dashboard
          </button>
          
          <button 
            onClick={() => handleNavClick('mortgages')}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeNav === 'mortgages' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            🏛️ Mortgages
          </button>
        </nav>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto w-full h-full min-h-[500px] flex flex-col">
        {/* VIEW A: General Dashboard */}
        {activeNav === 'dashboard' && (
          children ? (
            <div className="p-8 flex-1">{children}</div>
          ) : (
            <div className="p-8 flex-1">
              <h1 className="text-2xl font-bold text-gray-900">General Dashboard</h1>
              <p className="text-gray-500 mt-1">Welcome back, {currentUser?.name || 'Administrator'}</p>
            </div>
          )
        )}

        {/* VIEW B: Mortgages Module */}
        {activeNav === 'mortgages' && (
          <div className="w-full h-full min-h-[500px] flex flex-col flex-1">
            {!selectedBank ? (
              <BankHubPage 
                onSelectBank={(bankName) => {
                  console.log('Selected bank:', bankName);
                  setSelectedBank(bankName);
                }} 
              />
            ) : (
              <BankWorkspace 
                bankName={selectedBank} 
                currentUser={currentUser} 
                onBack={() => setSelectedBank(null)} 
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardLayout;
