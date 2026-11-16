import React, { useState, useEffect } from 'react';
import { BankHubPage } from './BankHubPage';
import { BankWorkspace } from './BankWorkspace';
import { getEffectiveUser, isStrictSuperAdmin } from '../lib/supabase';
import { isSuperAdminOnlyBank } from './mortgages/banks/bankConfigs';

export const DashboardLayout: React.FC<{ currentUser?: any; children?: React.ReactNode }> = ({ currentUser, children }) => {
  // 1. State for active navigation tab and selected bank drill-down
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mortgages' | 'settings'>('dashboard');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const canSeeRestrictedBanks = isStrictSuperAdmin(getEffectiveUser(currentUser));

  useEffect(() => {
    if (selectedBank && isSuperAdminOnlyBank(selectedBank) && !canSeeRestrictedBanks) {
      setSelectedBank(null);
    }
  }, [selectedBank, canSeeRestrictedBanks]);

  // Handle clicking Mortgages in sidebar
  const handleNavClick = (tab: 'dashboard' | 'mortgages' | 'settings') => {
    setActiveTab(tab);
    if (tab !== 'mortgages') {
      setSelectedBank(null); // Reset bank selection if leaving mortgages tab
    }
  };

  const activeNav = activeTab;

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      {/* Sidebar Navigation */}
      <aside className="no-print w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        <div className="p-6 font-bold text-xl text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800">
          Infosight Portal
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          <button 
            onClick={() => handleNavClick('dashboard')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              activeNav === 'dashboard' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            📊 Dashboard
          </button>
          
          <button 
            onClick={() => handleNavClick('mortgages')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              activeNav === 'mortgages' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            🏛️ Mortgages
          </button>
        </nav>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 overflow-y-auto w-full h-full min-h-[500px] flex flex-col">
        {/* VIEW A: General Dashboard */}
        {activeNav === 'dashboard' && (
          children ? (
            <div className="p-8 flex-1">{children}</div>
          ) : (
            <div className="p-8 flex-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">General Dashboard</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, {currentUser?.name || 'Administrator'}</p>
            </div>
          )
        )}

        {/* VIEW B: Mortgages Module */}
        {activeNav === 'mortgages' && (
          <div className="w-full min-w-0 h-full min-h-[500px] flex flex-col flex-1">
            {!selectedBank ? (
              <BankHubPage 
                onSelectBank={(bankName) => {
                  if (isSuperAdminOnlyBank(bankName) && !canSeeRestrictedBanks) return;
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
