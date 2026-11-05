import React from 'react';
import { useApp, NavigationTab } from '../../context/AppContext';
import { isUserAdmin } from '../../lib/supabase';

export interface NavItemConfig {
  name: string;
  href: string;
  tabId?: NavigationTab;
  roles: string[]; // e.g. ['all'] or ['Partner', 'Superadmin']
}

// Navigation items list with role restrictions
export const navItems: NavItemConfig[] = [
  { name: 'Dashboard', href: '/dashboard', tabId: 'dashboard', roles: ['all'] },
  { name: 'Clients', href: '/clients', tabId: 'catalogue', roles: ['all'] },
  { 
    name: 'Firm Analytics', 
    href: '/analytics', 
    tabId: 'analytics',
    roles: ['Partner', 'Superadmin', 'super_admin', 'partner', 'admin'] // 🔒 Restricted
  },
  { 
    name: 'Conflict Clearance', 
    href: '/conflicts', 
    tabId: 'conflicts',
    roles: ['Partner', 'Superadmin', 'super_admin', 'partner', 'admin'] // 🔒 Restricted
  },
];

export interface NavbarProps {
  userRole?: string;
}

export default function Navbar({ userRole }: NavbarProps) {
  const { currentUser, activeTab, setActiveTab } = useApp();

  // Normalize user role from prop or current user context
  const effectiveRole = (userRole || currentUser?.role || 'lawyer').toLowerCase();
  const isSuperadmin = Boolean(currentUser?.isSuperAdmin || isUserAdmin(currentUser) || effectiveRole === 'superadmin' || effectiveRole === 'super_admin' || effectiveRole === 'admin');
  const isPartner = Boolean(effectiveRole === 'partner' || effectiveRole.includes('partner'));

  // Filter items based on whether the user's role is allowed
  const filteredNavItems = navItems.filter((item) => {
    if (item.roles.includes('all')) return true;
    if (isSuperadmin) return true;
    if (isPartner && (item.roles.includes('Partner') || item.roles.includes('partner'))) return true;
    return item.roles.some((r) => r.toLowerCase() === effectiveRole);
  });

  return (
    <nav className="space-y-1">
      {filteredNavItems.map((item) => {
        const isActive = item.tabId && activeTab === item.tabId;
        return (
          <a
            key={item.name}
            href={item.href}
            onClick={(e) => {
              if (item.tabId) {
                e.preventDefault();
                setActiveTab(item.tabId);
                try {
                  if (typeof window !== 'undefined' && window.history && window.history.pushState) {
                    window.history.pushState(null, '', item.href);
                  }
                } catch (err) {}
              }
            }}
            className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {item.name}
          </a>
        );
      })}
    </nav>
  );
}
