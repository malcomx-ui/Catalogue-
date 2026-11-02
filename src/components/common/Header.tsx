import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Menu,
  ChevronDown,
  LogOut,
  Plus,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser,
    setIsNewCaseModalOpen,
    userPermissions,
    logout,
    setIsMobileMenuOpen,
    setActiveTab,
  } = useApp();

  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs lg:hidden">
      <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between">
        {/* Mobile Left: Menu Hamburger + Brand */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
            aria-label="Open mobile navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 cursor-pointer"
            role="button"
            tabIndex={0}
          >
            <img
              src="/logo.png"
              alt="MK Case Catalogue"
              className="w-7 h-7 object-contain rounded-full"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <div className="font-bold text-xs text-slate-900 leading-tight">
                MK Case Catalogue
              </div>
              <p className="text-[10px] text-slate-500">
                Muhumuza-Kiiza Advocates
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Right: + New Case & User Profile */}
        <div className="flex items-center gap-2">
          {userPermissions.canCreateCases && (
            <button
              onClick={() => setIsNewCaseModalOpen(true)}
              className="flex items-center gap-1 bg-[#0f172a] hover:bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setIsUserSwitcherOpen(!isUserSwitcherOpen)}
              className="flex items-center gap-1 p-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs transition-colors min-h-[34px]"
            >
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-[11px]">
                {currentUser.name.charAt(0)}
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isUserSwitcherOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserSwitcherOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 text-xs">
                  <div className="px-3 pb-2 border-b border-slate-100">
                    <div className="font-semibold text-slate-900">{currentUser.name}</div>
                    <div className="text-slate-500 text-[11px]">{currentUser.email}</div>
                    <div className="text-blue-600 text-[10px] font-semibold mt-0.5">{currentUser.roleTitle}</div>
                    <div className="text-slate-400 text-[10px]">{currentUser.branchName}</div>
                  </div>

                  <div className="pt-1.5 px-2">
                    <button
                      onClick={() => {
                        setIsUserSwitcherOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 text-left px-2 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Lock / Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
