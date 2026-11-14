import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  User,
  Branch,
  CaseItem,
  CourtHearing,
  PleadingDocument,
  SyncLog,
  ConflictCheckResult,
  FileMovementRecord,
  ProgressiveNote,
  CustomRole,
  RolePermissions,
  SystemSettings,
  AuditLog,
} from '../types';
import {
  INITIAL_BRANCHES,
  INITIAL_USERS,
  DEMO_USERS,
  INITIAL_CASES,
  INITIAL_HEARINGS,
  INITIAL_DOCUMENTS,
  INITIAL_SYNC_LOGS,
  DEFAULT_ROLES,
} from '../data/initialData';
import { DEFAULT_SYSTEM_SETTINGS } from '../data/defaultSettings';
import { cleanCaseNumber } from '../utils/caseNumber';
import {
  SupabaseService,
  isSupabaseConfigured,
  supabase,
  mapRowToCase,
  resolveBranchId,
  resolveBranchMeta,
  resolveUserRoleMeta,
  handleSaveStaff,
  isUserAdmin,
  isUserBranchAdmin,
  isAdminFinanceAssistant,
  isUserLawyer,
  isBranchStaff,
  canUserViewAllBranches,
  canUserModifyCase,
  cacheUserProfile,
  clearCachedUserProfile,
  getCachedUserProfile,
  getEffectiveUser,
} from '../lib/supabase';
import { showCleanMessage } from '../utils/notification';


export type NavigationTab = 
  | 'dashboard'
  | 'catalogue' 
  | 'causelist' 
  | 'synchub' 
  | 'conflicts' 
  | 'documents' 
  | 'analytics'
  | 'roles'
  | 'settings'
  | 'debt_recovery'
  | 'mortgages';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  availableUsers: User[];
  
  // Dynamic System Settings & Entry Requirements (Super Admin)
  systemSettings: SystemSettings;
  updateSystemSettings: (updates: Partial<SystemSettings> | ((prev: SystemSettings) => SystemSettings)) => void;
  resetSystemSettingsToDefault: () => void;
  
  // Security & Authentication
  isAuthenticated: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string; requirePasswordChange?: boolean; user?: User }>;
  handleLoginSuccess: (data: { user: any; profile: any }) => User;
  logout: () => void;
  
  // Custom Roles & Permissions
  roles: CustomRole[];
  userPermissions: RolePermissions;
  addCustomRole: (roleData: Omit<CustomRole, 'id' | 'isSystem'>) => void;
  updateCustomRole: (roleId: string, updates: Partial<CustomRole>) => void;
  deleteCustomRole: (roleId: string) => boolean;
  assignUserRole: (userId: string, roleId: string) => Promise<{ success: boolean; error?: string; warning?: string }>;
  
  // User Management (Super Admin)
  addUser: (userData: Partial<User>) => Promise<{ success: boolean; error?: string; user?: User }>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string; warning?: string }>;
  handleSaveStaff: (userId: string, newName: string, newRole: string, newBranchId?: string, options?: any) => Promise<{ success: boolean; error?: string }>;
  updateUserPassword: (userId: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  toggleSuspendUser: (userId: string, reason?: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<boolean>;
  refreshStaffFromSupabase: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchUserProfile: (targetUserId?: string) => Promise<User | null>;

  // Central Server & Multi-Device Sync
  isServerConnected: boolean;
  isCpanelMigrationModalOpen: boolean;
  setIsCpanelMigrationModalOpen: (open: boolean) => void;

  // Branch Management (Super Admin)
  branches: Branch[];
  selectedBranchFilter: string; // 'all' or branchId
  setSelectedBranchFilter: (branchId: string) => void;
  selectedLawyerFilter: string; // 'all' or lawyer name
  setSelectedLawyerFilter: (lawyer: string) => void;
  addBranch: (branchData: Partial<Branch>) => void;
  updateBranch: (branchId: string, updates: Partial<Branch>) => void;
  deleteBranch: (branchId: string) => boolean;
  
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  
  cases: CaseItem[];
  filteredCases: CaseItem[];
  selectedCase: CaseItem | null;
  setSelectedCase: (item: CaseItem | null) => void;
  
  hearings: CourtHearing[];
  documents: PleadingDocument[];
  syncLogs: SyncLog[];
  auditLogs: AuditLog[];
  refreshAuditLogs: () => Promise<void>;
  
  isSyncing: boolean;
  lastGlobalSync: string;
  
  // Modals & Panels
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isNewCaseModalOpen: boolean;
  setIsNewCaseModalOpen: (open: boolean) => void;
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authMode: 'login' | 'register' | 'forgot' | 'reset';
  setAuthMode: (mode: 'login' | 'register' | 'forgot' | 'reset') => void;
  
  // Actions
  triggerManualSync: (branchId?: string) => Promise<void>;
  refreshCasesFromSupabase: () => Promise<void>;
  fetchFreshDataFromSupabase: () => Promise<void>;
  addCase: (caseData: any) => Promise<CaseItem | null>;
  updateCase: (caseId: string, updatedData: Partial<CaseItem>) => Promise<CaseItem | null>;
  deleteCase: (caseId: string) => Promise<boolean>;
  updateCaseStage: (caseId: string, newStage: any) => void;
  transferCaseToBranch: (caseId: string, targetBranchId: string, reason: string) => void;
  addHearing: (hearingData: Omit<CourtHearing, 'id'>) => void;
  updateHearingOutcome: (hearingId: string, outcome: { status: 'Completed' | 'Adjourned' | 'Part-Heard'; courtNotes: string; nextHearingDate?: string; nextDirections?: string }) => void;
  addDocument: (docData: Omit<PleadingDocument, 'id'>) => void;
  runConflictCheck: (query: string) => ConflictCheckResult;
  exportCatalogueToCsv: () => void;
  importCasesFromExcel: (
    imported: any[], 
    onProgress?: (processed: number, total: number) => void
  ) => Promise<{ success: boolean; count: number; error?: string }>;
  addFileMovement: (caseId: string, movement: Omit<FileMovementRecord, 'id' | 'timestamp'>) => void;
  addProgressiveNote: (caseId: string, note: Omit<ProgressiveNote, 'id' | 'timestamp'>) => void;
  
  // Print Views
  printableCauseDate: string | null;
  setPrintableCauseDate: (date: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_CASES = 'mk_case_catalogue_cases_v2';
const LOCAL_STORAGE_KEY_HEARINGS = 'mk_case_catalogue_hearings_v2';
const LOCAL_STORAGE_KEY_DOCS = 'mk_case_catalogue_docs_v2';
const LOCAL_STORAGE_KEY_USER = 'mk_case_catalogue_user_v2';
const LOCAL_STORAGE_KEY_AUTH = 'mk_case_catalogue_auth_v4';
const LOCAL_STORAGE_KEY_ROLES = 'mk_case_catalogue_roles_v3';
const LOCAL_STORAGE_KEY_USERS = 'mk_case_catalogue_users_v3';
const LOCAL_STORAGE_KEY_BRANCHES = 'mk_case_catalogue_branches_v3';

const EMPTY_USER: User = {
  id: '',
  name: 'Authorised Staff',
  email: '',
  role: 'lawyer',
  roleId: '',
  roleTitle: 'Unauthenticated User',
  branchId: 'kla-hq',
  branchName: 'Kampala Central (Head Office)',
  isSuperAdmin: false,
  isBranchAdmin: false,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication & Security state - initialized from localStorage or sessionStorage for mobile/cross-tab compatibility
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      if (localStorage.getItem(LOCAL_STORAGE_KEY_AUTH) === 'true') return true;
    } catch (e) {}
    try {
      if (sessionStorage.getItem(LOCAL_STORAGE_KEY_AUTH) === 'true') return true;
    } catch (e) {}
    return Boolean(getCachedUserProfile()?.email);
  });

  // Custom Roles state - initialized with Super Admin, Branch Administrator, Admin & Finance Assistant, Team Lead, Advocate, Clerk
  const [roles, setRoles] = useState<CustomRole[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ROLES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map((r: CustomRole) => r.id));
          const mergedDefaults = parsed.map((r: CustomRole) => {
            const def = DEFAULT_ROLES.find((d) => d.id === r.id);
            if (!def) return r;
            const mergedPerms: RolePermissions = { ...def.permissions, ...(r.permissions || {}) };
            if (def.id === 'role-admin') {
              mergedPerms.canViewAllBranches = false;
              mergedPerms.canBulkImport = false;
              mergedPerms.canBulkExport = false;
              mergedPerms.canManageRoles = false;
              mergedPerms.canManageUsers = false;
              mergedPerms.canManageBranches = false;
              mergedPerms.canManageSettings = false;
            }
            return {
              ...r,
              ...def,
              isSystem: true,
              permissions: mergedPerms,
            };
          });
          DEFAULT_ROLES.forEach((def) => {
            if (!existingIds.has(def.id)) {
              mergedDefaults.push(def);
            }
          });
          return mergedDefaults;
        }
      }
    } catch (e) {}
    return DEFAULT_ROLES;
  });

  // Helper to identify obsolete mock names if any
  const isDemoLawyerName = (name: string | undefined | null) => {
    if (!name) return false;
    const clean = String(name).trim().toLowerCase();
    return clean.includes('albert') && clean.includes('mukasa');
  };

  // Available Users state - clean firm users loaded from storage & Supabase
  const [availableUsers, setAvailableUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validUsers = parsed.filter(
            (u: any) => u && u.id && u.email && !isDemoLawyerName(u.name)
          );
          if (validUsers.length > 0) return validUsers;
        }
      }
    } catch (e) {}
    return INITIAL_USERS;
  });

  // Current logged in user - pre-warmed from localStorage or sessionStorage, then refreshed from profiles table
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const cached = getCachedUserProfile();
      if (cached && cached.email) {
        return {
          ...EMPTY_USER,
          ...cached,
          branchId: cached.branchId || 'kla-hq',
          branchName: cached.branchName || 'Kampala Central (Head Office)',
        } as User;
      }
    } catch (e) {}
    return EMPTY_USER;
  });

  // Branches state - clean branches with 0 demo lawyers
  const [branches, setBranches] = useState<Branch[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_BRANCHES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((b: Branch) => ({
            ...b,
            teamLead: isDemoLawyerName(b.teamLead) ? '' : b.teamLead,
            leadAdvocate: isDemoLawyerName(b.leadAdvocate || '') ? '' : b.leadAdvocate,
            officeAdmin: isDemoLawyerName(b.officeAdmin || '') ? '' : b.officeAdmin,
            clerk: isDemoLawyerName(b.clerk || '') ? '' : b.clerk,
            lawyersCount: 0,
            activeAdvocates: 0,
            caseCount: 0,
            staff: (b.staff || []).filter((s) => !isDemoLawyerName(s.name)),
          }));
        }
      }
    } catch (e) {}
    return INITIAL_BRANCHES;
  });

  // Dynamic System Settings & Intake Requirements (Super Admin)
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('mk_advocates_system_settings_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_SYSTEM_SETTINGS,
            ...parsed,
            firm: { ...DEFAULT_SYSTEM_SETTINGS.firm, ...(parsed.firm || {}) },
            features: { ...DEFAULT_SYSTEM_SETTINGS.features, ...(parsed.features || {}) },
            intakeFields: { ...DEFAULT_SYSTEM_SETTINGS.intakeFields, ...(parsed.intakeFields || {}) },
            customFields: Array.isArray(parsed.customFields) ? parsed.customFields : [],
            courtList: Array.isArray(parsed.courtList) && parsed.courtList.length > 0 ? parsed.courtList : DEFAULT_SYSTEM_SETTINGS.courtList,
            practiceAreas: Array.isArray(parsed.practiceAreas) && parsed.practiceAreas.length > 0 ? parsed.practiceAreas : DEFAULT_SYSTEM_SETTINGS.practiceAreas,
          };
        }
      }
    } catch (e) {}
    return DEFAULT_SYSTEM_SETTINGS;
  });

  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [selectedLawyerFilter, setSelectedLawyerFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Effective role permissions calculation based on current user
  const userPermissions: RolePermissions = useMemo(() => {
    // 1. Managing Partner / Super Admin -> Global access across all branches + administrative authority
    if (isUserAdmin(currentUser)) {
      return {
        canViewAllBranches: true,
        canCreateCases: true,
        canEditCases: true,
        canDeleteCases: true,
        canBulkImport: true, // Only Super Admin
        canBulkExport: true, // Only Super Admin
        canPrintCauseList: true,
        canScheduleHearings: true,
        canRecordOutcomes: true,
        canLogFileMovement: true,
        canManageDocuments: true,
        canViewFinancials: true,
        canManageRoles: true, // Only Super Admin
        canManageUsers: true, // Only Super Admin
        canManageBranches: true, // Only Super Admin
        canManageSettings: true, // Only Super Admin
      };
    }

    // 2. Custom Roles created by Super Admin (strictly non-Super-Admin)
    const matchedCustomRole = roles.find(
      (r) => r.id === currentUser.roleId && !r.isSystem && !r.isSuperAdmin
    );
    if (matchedCustomRole) {
      return {
        ...matchedCustomRole.permissions,
        canBulkImport: false,
        canBulkExport: false,
        canManageRoles: false,
        canManageUsers: false,
        canManageBranches: false,
        canManageSettings: false,
      };
    }

    // 3. Admin & Finance Assistant -> View-all across branches; Add/Edit/Delete strictly limited to their assigned branch
    if (isAdminFinanceAssistant(currentUser)) {
      return {
        canViewAllBranches: true,
        canCreateCases: true,
        canEditCases: true,
        canDeleteCases: true,
        canBulkImport: false,
        canBulkExport: false,
        canPrintCauseList: false,
        canScheduleHearings: true,
        canRecordOutcomes: true,
        canLogFileMovement: true,
        canManageDocuments: true,
        canViewFinancials: true,
        canManageRoles: false,
        canManageUsers: false,
        canManageBranches: false,
        canManageSettings: false,
      };
    }

    // 4. Litigation Lawyers (Advocates, Regional Team Leads) -> Global read/litigation access across branches, no Admin panels
    if (isUserLawyer(currentUser)) {
      return {
        canViewAllBranches: true,
        canCreateCases: true,
        canEditCases: true,
        canDeleteCases: true,
        canBulkImport: false,
        canBulkExport: false,
        canPrintCauseList: true,
        canScheduleHearings: true,
        canRecordOutcomes: true,
        canLogFileMovement: true,
        canManageDocuments: true,
        canViewFinancials: true,
        canManageRoles: false,
        canManageUsers: false,
        canManageBranches: false,
        canManageSettings: false,
      };
    }

    // 5. Branch Staff (Branch Administrators and Court Registry Clerks)
    // -> Strictly isolated to their assigned branch; NO Super Admin or crucial system module access
    return {
      canViewAllBranches: false,
      canCreateCases: true,
      canEditCases: true,
      canDeleteCases: true,
      canBulkImport: false,
      canBulkExport: false,
      canPrintCauseList: true,
      canScheduleHearings: true,
      canRecordOutcomes: true,
      canLogFileMovement: true,
      canManageDocuments: true,
      canViewFinancials: false,
      canManageRoles: false,
      canManageUsers: false,
      canManageBranches: false,
      canManageSettings: false,
    };
  }, [currentUser, roles]);

  // Pass authenticated user and profile info back up to the main app state
  const handleLoginSuccess = ({ user, profile }: { user: any; profile: any }): User => {
    const email = (user?.email || profile?.email || '').trim().toLowerCase();
    const fullName = profile?.full_name || profile?.name || user?.user_metadata?.full_name || email.split('@')[0] || 'User';
    const roleMeta = resolveUserRoleMeta(
      profile?.role || user?.user_metadata?.role,
      profile?.role_id || profile?.roleId || user?.user_metadata?.role_id,
      Boolean(profile?.is_super_admin ?? profile?.isSuperAdmin ?? user?.user_metadata?.is_super_admin),
      email
    );
    const branchMeta = resolveBranchMeta(
      profile?.branch_id || profile?.branchId || user?.user_metadata?.branch_id,
      profile?.branch_name || profile?.branchName || profile?.branch || user?.user_metadata?.branch_name || user?.user_metadata?.branch
    );

    const mustChangePassword = Boolean(
      profile?.must_change_password ??
      profile?.mustChangePassword ??
      user?.mustChangePassword ??
      user?.user_metadata?.must_change_password ??
      false
    );

    const loggedInUser: User = {
      id: user?.id || String(profile?.id || 'user-auth'),
      email,
      name: fullName,
      role: roleMeta.role as any,
      roleId: roleMeta.roleId,
      roleTitle: profile?.role_title || profile?.roleTitle || roleMeta.roleTitle,
      branchId: branchMeta.id,
      branchName: branchMeta.name,
      isSuperAdmin: roleMeta.isSuperAdmin,
      isBranchAdmin: roleMeta.isBranchAdmin,
      mustChangePassword,
      advocateRollNo: profile?.advocate_roll_no || profile?.advocateRollNo || undefined,
    };

    setCurrentUser(loggedInUser);
    setIsAuthenticated(true);

    // Redirect immediately to dashboard and apply branch viewing scope
    setActiveTab('dashboard');
    if (canUserViewAllBranches(loggedInUser)) {
      setSelectedBranchFilter('all');
    } else {
      setSelectedBranchFilter(branchMeta.id);
    }

    try {
      if (typeof window !== 'undefined' && window.history && window.history.pushState) {
        window.history.pushState(null, '', '/dashboard');
      }
    } catch (e) {}

    cacheUserProfile(loggedInUser);

    return loggedInUser;
  };

  // Login action: authenticates via Supabase Auth first, then falls back cleanly to central backend auth (/api/auth/login) for newly provisioned staff
  const login = async (identifier: string, pass: string): Promise<{ success: boolean; error?: string; requirePasswordChange?: boolean; user?: User }> => {
    const cleanEmail = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Please enter both your email address and password.' };
    }

    try {
      let authUser: any = null;
      let resolvedProfile: any = null;

      // 1. Try Supabase Auth signInWithPassword
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (!authError && authData?.user) {
        authUser = authData.user;
      } else {
        // 2. Fallback: verify via backend /api/auth/login (handles newly added staff & password resets persisted across profiles/firm_users/server DB)
        try {
          const apiRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
          });
          const apiJson = await apiRes.json().catch(() => null);
          if (apiRes.ok && apiJson?.success && apiJson?.user) {
            if (apiJson.user.isSuspended) {
              return {
                success: false,
                error: `This account is SUSPENDED: ${apiJson.user.suspendedReason || 'Access restricted by Super Admin. Please contact Managing Partner.'}`,
              };
            }
            const loggedInUser = handleLoginSuccess({
              user: apiJson.user,
              profile: apiJson.profile || apiJson.user,
            });
            return {
              success: true,
              user: loggedInUser,
              requirePasswordChange: Boolean(loggedInUser.mustChangePassword),
            };
          } else if (apiRes.status === 401 || apiRes.status === 403) {
            return {
              success: false,
              error: apiJson?.error || 'Invalid email or password. Please verify your credentials.',
            };
          }
        } catch (apiErr) {
          console.warn('[Auth] Backend login endpoint unreachable, trying directory verification:', apiErr);
        }

        // 3. Offline / sandbox directory fallback if both Supabase Auth and backend endpoint didn't match
        let liveDirectory = availableUsers;
        try {
          const fetched = await SupabaseService.fetchStaff();
          if (Array.isArray(fetched) && fetched.length > 0) {
            liveDirectory = fetched;
          }
        } catch (e) {}

        const matchedUser = liveDirectory.find(
          (u) => u.email.toLowerCase() === cleanEmail || u.name.toLowerCase() === cleanEmail
        );
        if (matchedUser && (matchedUser.password === cleanPass || matchedUser.temporaryPassword === cleanPass)) {
          if (matchedUser.isSuspended) {
            return {
              success: false,
              error: `This account is SUSPENDED: ${matchedUser.suspendedReason || 'Access restricted by Super Admin. Please contact Managing Partner.'}`,
            };
          }
          const loggedInUser = handleLoginSuccess({
            user: matchedUser,
            profile: {
              id: matchedUser.id,
              full_name: matchedUser.name,
              email: matchedUser.email,
              role: matchedUser.role,
              role_id: matchedUser.roleId,
              role_title: matchedUser.roleTitle,
              branch_id: matchedUser.branchId,
              branch_name: matchedUser.branchName,
              is_super_admin: matchedUser.isSuperAdmin,
              is_branch_admin: matchedUser.isBranchAdmin,
              must_change_password: matchedUser.mustChangePassword,
            },
          });
          return {
            success: true,
            user: loggedInUser,
            requirePasswordChange: Boolean(loggedInUser.mustChangePassword),
          };
        }

        return {
          success: false,
          error: authError?.message || 'Invalid email or password. Please verify your credentials.',
        };
      }

      // Authenticated via Supabase Auth -> fetch latest authoritative profile
      if (authUser.id) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          if (profileData && !profileError) {
            resolvedProfile = profileData;
          }
        } catch (e) {}
      }

      if (!resolvedProfile && authUser.email) {
        try {
          const { data: emailProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', authUser.email.toLowerCase())
            .maybeSingle();

          if (emailProfile) resolvedProfile = emailProfile;
        } catch (e) {}
      }

      if (!resolvedProfile && authUser.email) {
        try {
          const { data: firmUser } = await supabase
            .from('firm_users')
            .select('*')
            .eq('email', authUser.email.toLowerCase())
            .maybeSingle();

          if (firmUser) {
            resolvedProfile = {
              role: firmUser.role,
              role_id: firmUser.role_id,
              role_title: firmUser.role_title,
              is_super_admin: firmUser.is_super_admin,
              is_branch_admin: firmUser.is_branch_admin,
              branch_id: firmUser.branch_id,
              branch_name: firmUser.branch_name,
              full_name: firmUser.name,
            };
          }
        } catch (e) {}
      }

      const matchedLocal = availableUsers.find(
        (u) => u.email.toLowerCase() === cleanEmail || u.id === authUser.id
      );
      if (matchedLocal?.isSuspended) {
        await supabase.auth.signOut().catch(() => {});
        return {
          success: false,
          error: `This account is SUSPENDED: ${matchedLocal.suspendedReason || 'Access restricted by Super Admin. Please contact Managing Partner.'}`,
        };
      }

      const fallbackRole =
        matchedLocal?.role ||
        (authUser.user_metadata as any)?.role ||
        (cleanEmail === 'infosightug@gmail.com' ? 'super_admin' : 'lawyer');
      const fallbackBranch =
        matchedLocal?.branchName ||
        (authUser.user_metadata as any)?.branch_name ||
        (authUser.user_metadata as any)?.branch ||
        'Kampala Central (Head Office)';

      const loggedInUser = handleLoginSuccess({
        user: authUser,
        profile: resolvedProfile || {
          role: fallbackRole,
          role_id: matchedLocal?.roleId || (authUser.user_metadata as any)?.role_id,
          is_super_admin: matchedLocal?.isSuperAdmin ?? (authUser.user_metadata as any)?.is_super_admin,
          is_branch_admin: matchedLocal?.isBranchAdmin ?? (authUser.user_metadata as any)?.is_branch_admin,
          branch_id: matchedLocal?.branchId || (authUser.user_metadata as any)?.branch_id || 'kla-hq',
          branch: fallbackBranch,
          full_name: matchedLocal?.name || (authUser.user_metadata as any)?.full_name || authUser.email?.split('@')[0] || 'User',
        },
      });

      return {
        success: true,
        user: loggedInUser,
        requirePasswordChange: Boolean(loggedInUser.mustChangePassword),
      };
    } catch (err: any) {
      console.error('[Supabase Auth Login Error]:', err);
      return {
        success: false,
        error: err?.message || 'Invalid email or password.',
      };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(EMPTY_USER);
    setActiveTab('dashboard');
    setSelectedBranchFilter('all');
    try {
      supabase.auth.signOut().catch(() => {});
      clearCachedUserProfile();
    } catch (e) {}
  };
  
  // Helper to detect and filter out any demo mock cases
  const isDemoCaseRecord = (c: any) => {
    if (!c) return true;
    const id = String(c.id || '');
    if (
      id === 'case-kla-01' ||
      id === 'case-kla-02' ||
      id === 'case-kla-03' ||
      id === 'case-kla-04' ||
      id.startsWith('case-demo') ||
      id.startsWith('case-0') ||
      id === 'case-kla-0726'
    ) {
      return true;
    }
    const suit = String(c.suitNumber || c.case_number || '').trim();
    if (
      suit === 'HCT-00-CC-CS-0726-2026' ||
      suit === 'HCT-00-CC-CS-0248-2026' ||
      suit === 'HCT-00-CC-CS-0248-2024'
    ) {
      return true;
    }
    const title = String(c.title || '');
    if (
      title.includes('Diamond Trust Bank') ||
      title.includes('Nansana Municipality') ||
      title.includes('Victoria Lake Minerals') ||
      title.includes('Kampala Commercial Properties') ||
      title.includes('Toro Kingdom') ||
      title.includes('Ankole Tea') ||
      title.includes('Acholi Grain') ||
      title.includes('Rwenzori Tea') ||
      title.includes('Mbarara Municipal') ||
      title.includes('Bunyoro-Kitara') ||
      title.includes('Buddu Coffee') ||
      title.includes('Busoga Commercial') ||
      title.includes('Matter of Commercial Recovery & Enforcement')
    ) {
      return true;
    }
    return false;
  };

  const isDemoHearingRecord = (h: any) => {
    if (!h) return true;
    const id = String(h.id || '');
    const caseId = String(h.caseId || '');
    const title = String(h.caseTitle || '');
    if (
      id.startsWith('hear-kla') ||
      id.startsWith('hear-0') ||
      caseId.startsWith('case-kla-0') ||
      caseId.startsWith('case-0') ||
      title.includes('Diamond Trust') ||
      title.includes('Victoria Lake') ||
      title.includes('Nansana') ||
      title.includes('Stanbic Bank')
    ) {
      return true;
    }
    return false;
  };

  const isDemoDocumentRecord = (d: any) => {
    if (!d) return true;
    const id = String(d.id || '');
    const caseId = String(d.caseId || '');
    if (
      id.startsWith('doc-kla') ||
      id.startsWith('doc-0') ||
      caseId.startsWith('case-kla-0') ||
      caseId.startsWith('case-0')
    ) {
      return true;
    }
    return false;
  };

  // Cases state - loaded from localStorage cache for instant persistence, then synced with live Supabase
  const [cases, setCases] = useState<CaseItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CASES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Mirror cases state into localStorage on every change so case statuses and updates survive reloads
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_CASES, JSON.stringify(cases));
    } catch (e) {}
  }, [cases]);

  // Hearings state - clean court appearances with 0 demo hearings
  const [hearings, setHearings] = useState<CourtHearing[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_HEARINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const userHearings = parsed.filter((h: any) => !isDemoHearingRecord(h));
          if (userHearings.length > 0) return userHearings;
        }
      }
    } catch (e) {}
    return [];
  });

  // Documents state - clean pleadings repository with 0 demo documents
  const [documents, setDocuments] = useState<PleadingDocument[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_DOCS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const userDocs = parsed.filter((d: any) => !isDemoDocumentRecord(d));
          if (userDocs.length > 0) return userDocs;
        }
      }
    } catch (e) {}
    return [];
  });

  // Central Server API & Multi-Computer Sync state
  const [isServerConnected, setIsServerConnected] = useState<boolean>(true);
  const [isCpanelMigrationModalOpen, setIsCpanelMigrationModalOpen] = useState<boolean>(false);

  // Dedicated Initial Session & Database Profile Loader:
  // On initial load or refresh, fetch the active user's record directly from the database
  // ('profiles' table joined with auth session) rather than relying on stale browser localStorage or session cache.
  // Ensures branch_id, branch_name, and role state variables are initialized from this fresh server fetch.
  useEffect(() => {
    let isMounted = true;

    async function syncActiveUserProfileFromDb() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const authUser = sessionData?.session?.user;

        if (!authUser) {
          const cached = getCachedUserProfile();
          const hasAuth = (() => {
            try {
              return (
                localStorage.getItem(LOCAL_STORAGE_KEY_AUTH) === 'true' ||
                sessionStorage.getItem(LOCAL_STORAGE_KEY_AUTH) === 'true'
              );
            } catch {
              return false;
            }
          })();
          if (!hasAuth && !cached?.email && isMounted) {
            setIsAuthenticated(false);
          } else if (cached?.email && isMounted) {
            setCurrentUser((prev) => ({
              ...EMPTY_USER,
              ...(prev.email ? prev : {}),
              ...cached,
            } as User));
          }
          return;
        }

        // Fetch fresh profile row (preferring merged /api/profiles when newer than stale RLS-locked profiles)
        let freshProfile: any = null;
        try {
          const token = sessionData?.session?.access_token;
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const apiRes = await fetch('/api/profiles', { headers });
          if (apiRes.ok) {
            const apiJson = await apiRes.json();
            const pList = apiJson.profiles || apiJson.data || [];
            freshProfile = pList.find(
              (p: any) => p.id === authUser.id || (p.email && p.email.toLowerCase() === authUser.email?.toLowerCase())
            );
          }
        } catch (e) {}

        if (!freshProfile) {
          try {
            const { data: pById, error: idErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authUser.id)
              .maybeSingle();
            if (pById && !idErr) freshProfile = pById;
          } catch (e) {}
        }

        if (!freshProfile && authUser.email) {
          try {
            const { data: pEmail, error: emErr } = await supabase
              .from('profiles')
              .select('*')
              .ilike('email', authUser.email.trim().toLowerCase())
              .maybeSingle();
            if (pEmail && !emErr) freshProfile = pEmail;
          } catch (e) {}
        }

        if (!freshProfile && authUser.email) {
          try {
            const { data: firmUser } = await supabase
              .from('firm_users')
              .select('*')
              .ilike('email', authUser.email.trim().toLowerCase())
              .maybeSingle();
            if (firmUser) {
              freshProfile = {
                role: firmUser.role,
                role_id: firmUser.role_id,
                is_super_admin: firmUser.is_super_admin,
                branch_id: firmUser.branch_id,
                branch_name: firmUser.branch_name,
                full_name: firmUser.name,
              };
            }
          } catch (e) {}
        }

        if (!isMounted) return;

        // Merge with cached profile so mobile/cross-device sessions never lose role/branch permissions
        const cachedUser = getCachedUserProfile();
        const email = (authUser.email || freshProfile?.email || cachedUser?.email || '').trim().toLowerCase();
        const fullName =
          freshProfile?.full_name ||
          freshProfile?.name ||
          authUser.user_metadata?.full_name ||
          cachedUser?.name ||
          email.split('@')[0] ||
          'User';

        const roleMeta = resolveUserRoleMeta(
          freshProfile?.role || authUser.user_metadata?.role || cachedUser?.role,
          freshProfile?.role_id || freshProfile?.roleId || authUser.user_metadata?.role_id || cachedUser?.roleId,
          Boolean(
            freshProfile?.is_super_admin ??
            authUser.user_metadata?.is_super_admin ??
            cachedUser?.isSuperAdmin
          ),
          email
        );

        const branchMeta = resolveBranchMeta(
          freshProfile?.branch_id || authUser.user_metadata?.branch_id || cachedUser?.branchId || 'kla-hq',
          freshProfile?.branch_name ||
          freshProfile?.branch ||
          authUser.user_metadata?.branch_name ||
          authUser.user_metadata?.branch ||
          cachedUser?.branchName ||
          'Kampala Central (Head Office)'
        );

        const mustChangePassword = Boolean(
          freshProfile?.must_change_password ??
          authUser.user_metadata?.must_change_password ??
          false
        );

        const freshUser: User = {
          id: authUser.id,
          email,
          name: fullName,
          role: roleMeta.role as any,
          roleId: roleMeta.roleId,
          roleTitle: freshProfile?.role_title || roleMeta.roleTitle,
          branchId: branchMeta.id,
          branchName: branchMeta.name,
          isSuperAdmin: roleMeta.isSuperAdmin,
          isBranchAdmin: roleMeta.isBranchAdmin,
          mustChangePassword,
        };

        setCurrentUser(freshUser);
        setIsAuthenticated(true);
        cacheUserProfile(freshUser);

        if (!canUserViewAllBranches(freshUser)) {
          setSelectedBranchFilter(branchMeta.id);
        }
      } catch (err) {
        console.warn('Direct database profile initialization error:', err);
      }
    }

    syncActiveUserProfileFromDb();

    return () => { isMounted = false; };
  }, []);

  // Initial Data Loader: Fetches live rows directly from Supabase tables (cases)
  useEffect(() => {
    let isMounted = true;
    async function loadCentralDatabase() {
      console.log("Page refreshed. Clearing stale local storage and fetching fresh data...");

      // 1. Clear out old cached case lists
      try {
        localStorage.removeItem('cached_cases');
        localStorage.removeItem(LOCAL_STORAGE_KEY_CASES);
      } catch (e) {}

      // 2. Clear IndexedDB local caches
      if (typeof window !== 'undefined' && window.indexedDB) {
        try {
          indexedDB.deleteDatabase('your-app-offline-db');
          indexedDB.deleteDatabase('mk_advocates_offline_db');
          indexedDB.deleteDatabase('cached_cases_db');
        } catch (e) {
          console.warn('IndexedDB deleteDatabase notice:', e);
        }
      }

      // 3. Force an immediate fetch of live data from Supabase (with resilient fallback to /api/cases)
      try {
        let liveCases: CaseItem[] | null = null;
        try {
          const { data, error } = await supabase.from('cases').select('*').order('created_at', { ascending: false });
          if (!error && Array.isArray(data)) {
            liveCases = data.map(mapRowToCase);
          } else if (error) {
            console.info('[Supabase Sync] Direct query note:', error.message);
          }
        } catch (e) {
          // Direct fetch failed (e.g. cross-origin/sandbox network block), will use SupabaseService fallback
        }

        if (!liveCases || liveCases.length === 0) {
          liveCases = await SupabaseService.fetchCases();
        }

        if (liveCases && isMounted) {
          setCases(liveCases);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY_CASES, JSON.stringify(liveCases));
          } catch (e) {}
          setIsServerConnected(true);
          setLastGlobalSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (err) {
        console.warn('Initial case fetch notice:', err);
      }

      // 2. Fetch supporting hearings, branches, and staff accounts from Supabase
      try {
        const [sbHearings, sbBranches, sbUsers] = await Promise.all([
          SupabaseService.fetchHearings(),
          SupabaseService.fetchBranches(),
          SupabaseService.fetchStaff(),
        ]);
        if (isMounted) {
          if (Array.isArray(sbHearings) && sbHearings.length > 0) setHearings(sbHearings);
          if (Array.isArray(sbBranches) && sbBranches.length > 0) setBranches(sbBranches);
          if (Array.isArray(sbUsers) && sbUsers.length > 0) {
            setAvailableUsers(sbUsers);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(sbUsers));

              // Query fresh data directly from the profiles database table on load rather than relying on stale session JWT metadata
              const { data: sessionData } = await supabase.auth.getSession();
              const authUser = sessionData?.session?.user;

              if (authUser && isMounted) {
                // Fetch fresh profile row directly from public profiles table
                let freshProfile: any = null;
                try {
                  const { data: pData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authUser.id)
                    .maybeSingle();
                  if (pData) freshProfile = pData;
                } catch (pe) {}

                if (!freshProfile && authUser.email) {
                  try {
                    const { data: pEmail } = await supabase
                      .from('profiles')
                      .select('*')
                      .eq('email', authUser.email.toLowerCase())
                      .maybeSingle();
                    if (pEmail) freshProfile = pEmail;
                  } catch (pe) {}
                }

                // If profiles row was found, directly use it
                if (freshProfile) {
                  const restored = handleLoginSuccess({
                    user: authUser,
                    profile: freshProfile,
                  });
                  setCurrentUser(restored);
                  setIsAuthenticated(true);
                } else {
                  // Check against freshly loaded sbUsers (which came from profiles table)
                  const matchedFresh = sbUsers.find(
                    (u) => u.id === authUser.id || (authUser.email && u.email.toLowerCase() === authUser.email.toLowerCase())
                  );
                  if (matchedFresh) {
                    setCurrentUser(matchedFresh);
                    setIsAuthenticated(true);
                    localStorage.setItem(LOCAL_STORAGE_KEY_AUTH, 'true');
                    localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(matchedFresh));
                  }
                }
              } else if (isMounted) {
                // If local storage has previous login session, verify against fresh sbUsers from profiles
                const savedUserStr = localStorage.getItem(LOCAL_STORAGE_KEY_USER);
                if (savedUserStr) {
                  const savedUser = JSON.parse(savedUserStr);
                  const fresh = sbUsers.find(
                    (u) => u.id === savedUser.id || (savedUser.email && u.email.toLowerCase() === savedUser.email.toLowerCase())
                  );
                  if (fresh) {
                    setCurrentUser(fresh);
                    setIsAuthenticated(true);
                    localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(fresh));
                  }
                }
              }
            } catch (e) {
              console.warn('Error synchronizing fresh profile on load:', e);
            }
          }
        }
      } catch (sbErr) {
        console.warn('Supabase secondary records load error:', sbErr);
      }
    }

    loadCentralDatabase();
    return () => { isMounted = false; };
  }, []);

  // Real-time synchronization for employee profiles, roles, and branch assignments across tabs and sessions
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // 1. Listen for PostgreSQL changes on public.profiles table
    const profileChannel = supabase
      .channel('realtime-profiles-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('[Supabase Realtime] profiles change detected:', payload.eventType);
          refreshStaffFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'firm_users' },
        (payload) => {
          console.log('[Supabase Realtime] firm_users change detected:', payload.eventType);
          refreshStaffFromSupabase();
        }
      )
      .subscribe();

    // 2. Auth change listener: re-sync profile whenever auth session or user updates
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        refreshStaffFromSupabase();
      }
    });

    // 3. Multi-tab synchronization: re-sync whenever localStorage user cache is updated in another tab
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY_USER || e.key === LOCAL_STORAGE_KEY_USERS) {
        refreshStaffFromSupabase();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      supabase.removeChannel(profileChannel);
      authSub.subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isSupabaseConfigured]);

  // Sync state
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(INITIAL_SYNC_LOGS);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastGlobalSync, setLastGlobalSync] = useState<string>('Just now');

  // Audit Trail state (Super Admin live compliance logs from Supabase audit_logs table)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const refreshAuditLogs = async () => {
    if (isSupabaseConfigured) {
      try {
        const logs = await SupabaseService.fetchAuditLogs();
        setAuditLogs(logs);
      } catch (e) {
        console.warn('refreshAuditLogs notice:', e);
      }
    }
  };

  useEffect(() => {
    refreshAuditLogs();
  }, [isAuthenticated]);

  // Modals & Panels
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [printableCauseDate, setPrintableCauseDate] = useState<string | null>(null);

  // Local user & interface persistence

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_HEARINGS, JSON.stringify(hearings));
    } catch (e) {}
  }, [hearings]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_DOCS, JSON.stringify(documents));
    } catch (e) {}
  }, [documents]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(currentUser));
    } catch (e) {}
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ROLES, JSON.stringify(roles));
    } catch (e) {}
  }, [roles]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(availableUsers));
    } catch (e) {}
  }, [availableUsers]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_BRANCHES, JSON.stringify(branches));
    } catch (e) {}
  }, [branches]);

  // Multi-Computer Sync: Automatically save state changes to Central Core API
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cases,
          hearings,
          documents,
          branches,
          users: availableUsers,
          roles,
          systemSettings,
        }),
      })
        .then((res) => {
          if (res.ok) {
            setIsServerConnected(true);
          }
        })
        .catch(() => {
          // offline mode / local storage cache active
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [cases, hearings, documents, branches, availableUsers, roles, systemSettings]);

  // System Settings Management Methods (Super Admin)
  const updateSystemSettings = (updates: Partial<SystemSettings> | ((prev: SystemSettings) => SystemSettings)) => {
    setSystemSettings((prev) => {
      const next = typeof updates === 'function' ? updates(prev) : {
        ...prev,
        ...updates,
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser.name || 'Firm Super Admin',
      };
      try {
        localStorage.setItem('mk_advocates_system_settings_v2', JSON.stringify(next));
      } catch (e) {}

      // Immediately push to backend so changes reflect on all machines
      fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cases,
          hearings,
          documents,
          branches,
          users: availableUsers,
          roles,
          systemSettings: next,
        }),
      }).catch(() => {});

      return next;
    });
  };

  const resetSystemSettingsToDefault = () => {
    updateSystemSettings(DEFAULT_SYSTEM_SETTINGS);
  };


  // Keep branch case counts in sync with cases
  useEffect(() => {
    setBranches((prev) =>
      prev.map((b) => {
        const isKampala = b.id === 'kla-hq' || b.city.toLowerCase() === 'kampala';
        const count = cases.filter((c) => {
          if (isKampala) {
            return (
              c.branchId === 'kla-hq' ||
              c.branchId === b.id ||
              c.branch?.toLowerCase().includes('kampala') ||
              c.branchName?.toLowerCase().includes('kampala') ||
              c.district?.toLowerCase() === 'kampala' ||
              c.courtStation?.toLowerCase() === 'kampala' ||
              !c.branchId
            );
          }
          // Non-Kampala branches: only cases explicitly uploaded or assigned to this branch
          return (
            c.branchId === b.id ||
            Boolean(c.branch && c.branch.toLowerCase().includes(b.city.toLowerCase())) ||
            Boolean(c.branchName && c.branchName.toLowerCase().includes(b.city.toLowerCase()))
          );
        }).length;

        return {
          ...b,
          caseCount: count,
        };
      })
    );
  }, [cases]);

  // Role Management Methods (Super Admin)
  const addCustomRole = (roleData: Omit<CustomRole, 'id' | 'isSystem'>) => {
    if (!userPermissions.canManageRoles) return;
    const newRole: CustomRole = {
      ...roleData,
      id: `role-custom-${Date.now()}`,
      isSystem: false,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
      assignedUsersCount: 0,
    };
    setRoles((prev) => [...prev, newRole]);
  };

  const updateCustomRole = (roleId: string, updates: Partial<CustomRole>) => {
    if (!userPermissions.canManageRoles) return;
    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, ...updates } : r))
    );
  };

  const deleteCustomRole = (roleId: string): boolean => {
    if (!userPermissions.canManageRoles) return false;
    const target = roles.find((r) => r.id === roleId);
    if (!target || target.isSystem || target.isSuperAdmin) return false;
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    return true;
  };

  const assignUserRole = async (userId: string, roleId: string): Promise<{ success: boolean; error?: string; warning?: string }> => {
    if (!userPermissions.canManageUsers && !userPermissions.canManageRoles) {
      return { success: false, error: 'Permission denied: Super Admin authorization required.' };
    }
    const role = roles.find((r) => r.id === roleId);
    if (!role) return { success: false, error: 'Selected role not found.' };

    return await updateUser(userId, {
      roleId: role.id,
      role: role.id as any,
      roleTitle: role.name,
      isSuperAdmin: Boolean(role.isSuperAdmin),
      isBranchAdmin: role.id === 'role-admin',
    });
  };

  // Refresh Staff directly from Supabase profiles database table & server endpoint
  const refreshStaffFromSupabase = async () => {
    try {
      const liveStaff = await SupabaseService.fetchStaff();
      if (Array.isArray(liveStaff) && liveStaff.length > 0) {
        setAvailableUsers(liveStaff);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(liveStaff));
        } catch (e) {}

        // Keep current logged-in user in sync with fresh database profile
        setCurrentUser((current) => {
          if (!current || !current.email) return current;
          const fresh = liveStaff.find(
            (u) => (current.id && u.id === current.id) || (current.email && u.email.toLowerCase() === current.email.toLowerCase())
          );
          if (fresh) {
            cacheUserProfile(fresh);
            if (!canUserViewAllBranches(fresh)) {
              setSelectedBranchFilter(fresh.branchId);
            }
            return fresh;
          }
          return current;
        });
      }
    } catch (err) {
      console.warn('Error refreshing staff from Supabase profiles:', err);
    }
  };

  // Explicitly fetch user profile directly from Supabase 'profiles' table
  const fetchUserProfile = async (targetUserId?: string): Promise<User | null> => {
    try {
      const targetId = targetUserId || currentUser?.id;
      const targetEmail = currentUser?.email;

      let freshProfile: any = null;
      if (targetId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetId)
          .maybeSingle();
        if (data && !error) freshProfile = data;
      }

      if (!freshProfile && targetEmail) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', targetEmail.trim().toLowerCase())
          .maybeSingle();
        if (data && !error) freshProfile = data;
      }

      if (freshProfile) {
        const bMeta = resolveBranchMeta(freshProfile.branch_id, freshProfile.branch_name || freshProfile.branch);
        const rMeta = resolveUserRoleMeta(freshProfile.role, freshProfile.role_id, Boolean(freshProfile.is_super_admin), freshProfile.email);

        const updatedUser: User = {
          id: freshProfile.id,
          name: freshProfile.full_name || freshProfile.name || currentUser.name,
          email: freshProfile.email || currentUser.email,
          role: rMeta.role as any,
          roleId: rMeta.roleId,
          roleTitle: freshProfile.role_title || rMeta.roleTitle,
          branchId: bMeta.id,
          branchName: bMeta.name,
          isSuperAdmin: rMeta.isSuperAdmin,
          isBranchAdmin: rMeta.isBranchAdmin,
          advocateRollNo: freshProfile.advocate_roll_no,
        };

        if (!targetUserId || targetUserId === currentUser.id) {
          setCurrentUser(updatedUser);
          cacheUserProfile(updatedUser);
        }

        await refreshStaffFromSupabase();
        return updatedUser;
      } else {
        await refreshStaffFromSupabase();
        return currentUser;
      }
    } catch (err) {
      console.warn('Error in fetchUserProfile from Supabase:', err);
      await refreshStaffFromSupabase();
      return currentUser;
    }
  };

  // User Management Methods (Super Admin: Add, Edit, Suspend, Delete)
  const addUser = async (userData: Partial<User>): Promise<{ success: boolean; error?: string; user?: User }> => {
    if (!userPermissions.canManageUsers && !isUserAdmin(currentUser)) {
      return { success: false, error: 'Permission denied: Super Admin authorization required.' };
    }
    if (!userData.name?.trim() || !userData.email?.trim()) {
      return { success: false, error: 'Full name and email address are required.' };
    }

    const cleanEmail = userData.email.trim().toLowerCase();
    const exists = availableUsers.some(
      (u) => u.email.toLowerCase() === cleanEmail
    );
    if (exists) {
      return { success: false, error: 'A staff member with this email address already exists.' };
    }

    const assignedRole =
      roles.find((r) => r.id === userData.roleId) ||
      roles.find((r) => r.id === 'role-advocate') ||
      roles[0];
    const selectedBranch = branches.find((b) => b.id === userData.branchId) || branches[0];
    const branchMeta = resolveBranchMeta(selectedBranch?.id || userData.branchId, selectedBranch?.name);
    const roleMeta = resolveUserRoleMeta(assignedRole.id, assignedRole.id, Boolean(assignedRole.isSuperAdmin), cleanEmail);
    const initialPass = userData.password?.trim() || 'MK@Law2026';

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: userData.name.trim(),
      email: cleanEmail,
      role: (assignedRole.id.startsWith('role-custom-') ? assignedRole.id : roleMeta.role) as any,
      roleId: assignedRole.id,
      roleTitle: assignedRole.name,
      branchId: branchMeta.id,
      branchName: branchMeta.name,
      isSuperAdmin: assignedRole.id.startsWith('role-custom-') ? false : roleMeta.isSuperAdmin,
      isBranchAdmin: assignedRole.id.startsWith('role-custom-') ? false : roleMeta.isBranchAdmin,
      isSuspended: false,
      password: initialPass,
      temporaryPassword: initialPass,
      mustChangePassword: userData.mustChangePassword !== false,
      advocateRollNo: userData.advocateRollNo?.trim() || undefined,
    };

    // 1. Provision via backend API (/api/users/create) -> handles Auth user, Supabase profiles/firm_users, & server DB
    let provisionedUser = newUser;
    try {
      const session = (await supabase.auth.getSession())?.data?.session;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const apiRes = await fetch('/api/users/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newUser.name,
          email: cleanEmail,
          password: initialPass,
          roleId: newUser.roleId,
          role: newUser.role,
          roleTitle: newUser.roleTitle,
          branchId: newUser.branchId,
          branchName: newUser.branchName,
          isSuperAdmin: newUser.isSuperAdmin,
          isBranchAdmin: newUser.isBranchAdmin,
          advocateRollNo: newUser.advocateRollNo,
          mustChangePassword: newUser.mustChangePassword,
        }),
      });

      const json = await apiRes.json().catch(() => null);
      if (apiRes.ok && json?.success && json.user) {
        provisionedUser = {
          ...newUser,
          ...json.user,
          id: json.user.id || newUser.id,
          password: initialPass,
          temporaryPassword: initialPass,
        };
      } else if (apiRes.status === 400 || apiRes.status === 409) {
        return { success: false, error: json?.error || 'Could not create staff user.' };
      }
    } catch (apiErr) {
      console.warn('[addUser] Backend createUser notice:', apiErr);
    }

    // 2. Ensure profiles & firm_users tables also receive the record directly from client if permitted
    try {
      await SupabaseService.insertStaff(provisionedUser);
    } catch (err: any) {
      console.warn('Direct Supabase insertStaff notice:', err);
    }

    // 3. Update local state & merge with live staff directory
    setAvailableUsers((prev) => {
      const filtered = prev.filter((u) => u.id !== provisionedUser.id && u.email.toLowerCase() !== cleanEmail);
      const updated = [provisionedUser, ...filtered];
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    await refreshStaffFromSupabase();

    // Guarantee newly provisioned user remains present if backend/Supabase haven't propagated yet
    setAvailableUsers((prev) => {
      if (prev.some((u) => u.email.toLowerCase() === cleanEmail)) return prev;
      const updated = [provisionedUser, ...prev];
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    return { success: true, user: provisionedUser };
  };

  // Super Admin can edit/change user details including name, email, password, role, branch
  const updateUser = async (userId: string, updates: Partial<User>): Promise<{ success: boolean; error?: string; warning?: string }> => {
    if (!userPermissions.canManageUsers && !isUserAdmin(currentUser)) {
      return { success: false, error: 'Permission denied: Super Admin authorization required.' };
    }

    const target = availableUsers.find((u) => u.id === userId);
    if (!target) {
      return { success: false, error: 'Staff account not found.' };
    }

    const cleanUpdatedEmail = updates.email !== undefined ? updates.email.trim().toLowerCase() : target.email.toLowerCase();

    if (updates.email && cleanUpdatedEmail !== target.email.toLowerCase()) {
      const emailTaken = availableUsers.some(
        (u) => u.id !== userId && u.email.toLowerCase() === cleanUpdatedEmail
      );
      if (emailTaken) {
        return { success: false, error: 'Another staff user already uses this email address.' };
      }
    }

    const hasBranchUpdate = updates.branchId !== undefined || updates.branchName !== undefined;
    const requestedBranchObj = hasBranchUpdate ? branches.find((b) => b.id === updates.branchId) : undefined;
    const branchMeta = hasBranchUpdate
      ? resolveBranchMeta(updates.branchId || target.branchId, updates.branchName || requestedBranchObj?.name || target.branchName)
      : resolveBranchMeta(target.branchId, target.branchName);

    const hasRoleUpdate = updates.roleId !== undefined || updates.role !== undefined;
    const resolvedRoleId = updates.roleId || (typeof updates.role === 'string' && updates.role.startsWith('role-') ? updates.role : undefined);
    const roleObj = resolvedRoleId ? roles.find((r) => r.id === resolvedRoleId) : undefined;
    const roleMeta = hasRoleUpdate
      ? (roleObj && roleObj.id.startsWith('role-custom-')
        ? {
            roleId: roleObj.id,
            role: roleObj.id,
            roleTitle: roleObj.name,
            isSuperAdmin: false,
            isBranchAdmin: false,
          }
        : resolveUserRoleMeta(
            updates.role,
            resolvedRoleId || updates.role,
            roleObj ? roleObj.isSuperAdmin : updates.isSuperAdmin,
            cleanUpdatedEmail
          ))
      : null;

    const newPassword = updates.password !== undefined && updates.password.trim() !== '' ? updates.password.trim() : target.password;
    const nowIso = new Date().toISOString();

    const mergedUpdates: Partial<User> & { previousEmail?: string; updatedAt?: string } = {
      ...updates,
      previousEmail: target.email,
      updatedAt: nowIso,
      name: updates.name !== undefined ? updates.name.trim() : target.name,
      email: cleanUpdatedEmail,
      roleId: roleMeta ? roleMeta.roleId : target.roleId,
      role: (roleMeta ? roleMeta.role : target.role) as any,
      roleTitle: updates.roleTitle || (roleObj ? roleObj.name : (roleMeta ? roleMeta.roleTitle : target.roleTitle)),
      branchId: branchMeta.id,
      branchName: branchMeta.name,
      isSuperAdmin: roleMeta ? roleMeta.isSuperAdmin : (updates.isSuperAdmin !== undefined ? Boolean(updates.isSuperAdmin) : Boolean(target.isSuperAdmin)),
      isBranchAdmin: roleMeta ? roleMeta.isBranchAdmin : (updates.isBranchAdmin !== undefined ? Boolean(updates.isBranchAdmin) : Boolean(target.isBranchAdmin)),
      password: updates.password !== undefined && updates.password.trim() !== '' ? updates.password.trim() : undefined,
      mustChangePassword: updates.mustChangePassword !== undefined ? updates.mustChangePassword : target.mustChangePassword,
      advocateRollNo: updates.advocateRollNo !== undefined ? updates.advocateRollNo.trim() : target.advocateRollNo,
    };

    const optimisticUpdatedUser: User & { updatedAt?: string } = {
      ...target,
      name: mergedUpdates.name || target.name,
      email: mergedUpdates.email || target.email,
      password: newPassword,
      temporaryPassword: updates.mustChangePassword ? newPassword : target.temporaryPassword,
      mustChangePassword: mergedUpdates.mustChangePassword,
      roleId: mergedUpdates.roleId,
      role: (mergedUpdates.role || target.role) as any,
      roleTitle: mergedUpdates.roleTitle || target.roleTitle,
      branchId: branchMeta.id,
      branchName: branchMeta.name,
      advocateRollNo: mergedUpdates.advocateRollNo,
      isSuperAdmin: mergedUpdates.isSuperAdmin,
      isBranchAdmin: mergedUpdates.isBranchAdmin,
      updatedAt: nowIso,
    };

    // 1. Optimistic local state update for instant UI and permission re-evaluation
    setAvailableUsers((prev) => {
      const updatedList = prev.map((u) => {
        if (u.id === userId || (u.email && target.email && u.email.toLowerCase() === target.email.toLowerCase())) {
          if (currentUser.id === userId || (currentUser.email && target.email && currentUser.email.toLowerCase() === target.email.toLowerCase())) {
            setCurrentUser(optimisticUpdatedUser);
            cacheUserProfile(optimisticUpdatedUser);
            if (!canUserViewAllBranches(optimisticUpdatedUser)) {
              setSelectedBranchFilter(optimisticUpdatedUser.branchId);
            }
          }
          return optimisticUpdatedUser;
        }
        return u;
      });
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(updatedList));
      } catch (e) {}
      return updatedList;
    });

    // 2. Perform real update across Supabase profiles, firm_users, and backend /api/users/:id
    try {
      const res = await SupabaseService.updateStaff(userId, mergedUpdates);
      if (res.data) {
        const p = res.data;
        const bMeta = resolveBranchMeta(p.branch_id || branchMeta.id, p.branch_name || p.branch || branchMeta.name);
        const rMeta = (p.role_id || '').startsWith('role-custom-')
          ? { roleId: p.role_id, role: p.role_id, roleTitle: p.role_title || mergedUpdates.roleTitle || 'Custom Role', isSuperAdmin: false, isBranchAdmin: false }
          : resolveUserRoleMeta(p.role, p.role_id || mergedUpdates.roleId, Boolean(p.is_super_admin), p.email || cleanUpdatedEmail);

        setCurrentUser((current) => {
          if (current.id === userId || (current.email && (p.email || cleanUpdatedEmail) && current.email.toLowerCase() === (p.email || cleanUpdatedEmail).toLowerCase())) {
            const updatedSelf: User = {
              ...current,
              name: p.full_name || p.name || current.name,
              email: p.email || current.email,
              role: rMeta.role as any,
              roleId: rMeta.roleId,
              roleTitle: p.role_title || rMeta.roleTitle,
              branchId: bMeta.id,
              branchName: bMeta.name,
              isSuperAdmin: rMeta.isSuperAdmin,
              isBranchAdmin: rMeta.isBranchAdmin,
            };
            cacheUserProfile(updatedSelf);
            if (!canUserViewAllBranches(updatedSelf)) {
              setSelectedBranchFilter(updatedSelf.branchId);
            }
            return updatedSelf;
          }
          return current;
        });
      }

      if (res.profileUpdated !== false) {
        await refreshStaffFromSupabase();
      } else {
        // Supabase profiles RLS blocked cloud write; keep authoritative local/server update intact instead of letting stale cloud rows revert UI
        await refreshStaffFromSupabase();
        if (res.success) {
          setAvailableUsers((prev) => {
            const pinned = prev.map((u) =>
              u.id === userId || (u.email && cleanUpdatedEmail && u.email.toLowerCase() === cleanUpdatedEmail)
                ? { ...u, ...optimisticUpdatedUser }
                : u
            );
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(pinned));
            } catch (e) {}
            return pinned;
          });
        }
      }

      if (!res.success && res.error) {
        return { success: false, error: res.error };
      }
      return { success: true, warning: res.warning };
    } catch (err: any) {
      console.error('Supabase staff update failed:', err);
      await refreshStaffFromSupabase();
      return { success: false, error: err?.message || 'Database update failed' };
    }
  };

  // User password change (e.g., during mandatory first-time login or profile update)
  const updateUserPassword = async (userId: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
    if (!newPass || newPass.trim().length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const target = availableUsers.find((u) => u.id === userId) || (currentUser.id === userId ? currentUser : undefined);

    setAvailableUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated: User = {
            ...u,
            password: newPass.trim(),
            mustChangePassword: false,
            temporaryPassword: undefined,
          };
          if (currentUser.id === userId) {
            setCurrentUser(updated);
            cacheUserProfile(updated);
          }
          return updated;
        }
        return u;
      })
    );

    try {
      await SupabaseService.updateStaff(userId, {
        email: target?.email,
        password: newPass.trim(),
        mustChangePassword: false,
      });
      await refreshStaffFromSupabase();
    } catch (e) {}

    return { success: true };
  };

  const toggleSuspendUser = async (userId: string, reason?: string) => {
    if (!userPermissions.canManageUsers) return;
    if (userId === currentUser.id) return; // Super admin cannot suspend own session

    const target = availableUsers.find((u) => u.id === userId);
    const willSuspend = target ? !target.isSuspended : true;

    setAvailableUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            isSuspended: willSuspend,
            suspendedReason: willSuspend ? (reason || 'Account suspended by Super Admin') : undefined,
          };
        }
        return u;
      })
    );

    try {
      await SupabaseService.updateStaff(userId, {
        email: target?.email,
        isSuspended: willSuspend,
        suspendedReason: willSuspend ? (reason || 'Account suspended by Super Admin') : undefined,
      });
      await refreshStaffFromSupabase();
    } catch (e) {}
  };

  // Real asynchronous staff delete query in Supabase
  const deleteUser = async (userId: string): Promise<boolean> => {
    if (!userPermissions.canManageUsers) return false;
    if (userId === currentUser.id) return false;

    const target = availableUsers.find((u) => u.id === userId);

    // 1. Optimistic removal from local state
    setAvailableUsers((prev) => prev.filter((u) => u.id !== userId));

    // 2. Perform real asynchronous delete from Supabase database tables
    try {
      await SupabaseService.deleteStaff(userId, target?.email);
      await refreshStaffFromSupabase();
      return true;
    } catch (err) {
      console.error('Supabase delete staff error:', err);
      await refreshStaffFromSupabase();
      return false;
    }
  };

  // Branch Management Methods (Super Admin: Add, Update, Delete)
  const addBranch = (branchData: Partial<Branch>) => {
    if (!userPermissions.canManageBranches) return;
    const city = branchData.city?.trim() || 'Regional';
    const newBranch: Branch = {
      id: `br-${Date.now()}-${city.toLowerCase().replace(/[\s\W]+/g, '')}`,
      name: branchData.name?.trim() || `${city} Regional Office`,
      city: city,
      address: branchData.address?.trim() || `Plot 14 Main Street, ${city}`,
      isHeadquarters: false,
      teamLead: branchData.teamLead?.trim() || `${city} Team Lead`,
      officeAdmin: branchData.officeAdmin?.trim() || 'Office Administrator',
      clerk: branchData.clerk?.trim() || 'Court Registry Clerk',
      lawyersCount: Number(branchData.lawyersCount) || 3,
      phone: branchData.phone?.trim() || '+256 414 000 000',
      caseCount: 0,
      syncStatus: 'synced',
      lastSyncTime: 'Just now',
      latencyMs: 22,
      staff: [],
    };
    setBranches((prev) => [...prev, newBranch]);
  };

  const updateBranch = (branchId: string, updates: Partial<Branch>) => {
    if (!userPermissions.canManageBranches) return;
    setBranches((prev) =>
      prev.map((b) => (b.id === branchId ? { ...b, ...updates } : b))
    );
  };

  const deleteBranch = (branchId: string): boolean => {
    if (!userPermissions.canManageBranches) return false;
    const target = branches.find((b) => b.id === branchId);
    if (!target || target.isHeadquarters) return false;
    setBranches((prev) => prev.filter((b) => b.id !== branchId));
    return true;
  };

  // Filtered cases calculation - strictly display only cases for the selected branch (or own branch for branch staff)
  const filteredCases = cases.filter((c) => {
    // Branch filter check: Branch staff are strictly locked to their own branch
    const filterBranchId = userPermissions.canViewAllBranches
      ? selectedBranchFilter
      : currentUser.branchId;

    if (filterBranchId !== 'all') {
      const caseResolvedBranchId = resolveBranchId(c.branchId, c.branchName || c.branch);
      if (caseResolvedBranchId !== filterBranchId) {
        return false;
      }
    }

    // Filter by Lawyer (matches lead counsel, assisting counsel, and persons in conduct)
    if (selectedLawyerFilter !== 'all') {
      const lawyerLower = selectedLawyerFilter.toLowerCase().trim();
      const leadMatch = (c.leadAdvocate || '').toLowerCase().includes(lawyerLower);
      const assistingMatch = (c.assistingAdvocates || []).some((a) => a.toLowerCase().includes(lawyerLower));
      const personConductMatch = (c.person_in_conduct || '').toLowerCase().includes(lawyerLower);
      const personsConductMatch = (c.persons_in_conduct || []).some((p) => p.toLowerCase().includes(lawyerLower));
      
      if (!leadMatch && !assistingMatch && !personConductMatch && !personsConductMatch) {
        return false;
      }
    }

    // Search query filter (matches File NO., client, lawyer, title, branch, status)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchFileNo = (c.case_number || c.suitNumber || '').toLowerCase().includes(q);
      const matchSuitNo = (c.suit_no || '').toLowerCase().includes(q);
      const matchFirmRef = (c.firmRefNumber || '').toLowerCase().includes(q);
      const matchTitle = (c.title || (c as any).case_title || '').toLowerCase().includes(q);
      const matchClient = (c.clientName || (c as any).client || (c as any).client_name || '').toLowerCase().includes(q);
      const matchLawyer = (c.leadAdvocate || (c as any).lawyer || (c as any).person_in_conduct || '').toLowerCase().includes(q) || (c.assistingAdvocates || []).some(a => a.toLowerCase().includes(q));
      const matchBranch = (c.branchName || (c as any).branch || '').toLowerCase().includes(q);
      const statusLower = (c.status || '').toLowerCase();
      const matchStatus =
        statusLower.includes(q) ||
        (q === 'closed' && (statusLower === 'archived' || statusLower.includes('concluded') || statusLower.includes('disposed') || !!c.year_of_closure));
      const matchCourt = (c.court || '').toLowerCase().includes(q) || (c.courtStation || '').toLowerCase().includes(q);
      const matchJudge = (c.presidingJudge || '').toLowerCase().includes(q);
      const matchParty = (c.parties || []).some(p => p.name.toLowerCase().includes(q));
      const matchOpposing = (c.opposingFirm || '').toLowerCase().includes(q) || (c.opposingCounsel || '').toLowerCase().includes(q);
      
      return matchFileNo || matchSuitNo || matchFirmRef || matchTitle || matchClient || matchLawyer || matchBranch || matchStatus || matchCourt || matchJudge || matchParty || matchOpposing;
    }
    return true;
  });

  // Manual Trigger Sync Simulation
  const triggerManualSync = async (targetBranchId?: string) => {
    setIsSyncing(true);
    const branchName = targetBranchId 
      ? branches.find(b => b.id === targetBranchId)?.name || 'Branch'
      : 'All Branches (Enterprise Replication)';

    await new Promise((res) => setTimeout(res, 1200));

    const newLog: SyncLog = {
      id: `sync-${Date.now()}`,
      timestamp: new Date().toISOString(),
      branchId: targetBranchId || 'all',
      branchName: branchName,
      action: targetBranchId ? `Manual Branch Sync: ${branchName}` : 'Enterprise Multi-Branch Database Replication',
      recordsSynced: cases.length + hearings.length + documents.length,
      status: 'SUCCESS',
      latencyMs: Math.floor(Math.random() * 20) + 12,
      details: `Replicated ${cases.length} case records and ${hearings.length} court cause items across Kampala HQ and 6 regional branch clusters without schema conflict.`,
    };

    setSyncLogs((prev) => [newLog, ...prev.slice(0, 30)]);
    setLastGlobalSync('Just now');
    setIsSyncing(false);

    // Update branch latency
    setBranches((prev) =>
      prev.map((b) => ({
        ...b,
        lastSyncTime: 'Just now',
        syncStatus: 'synced',
        latencyMs: Math.floor(Math.random() * 15) + 12,
      }))
    );
  };

  // Add Case - Permanently writes to Supabase
  const addCase = async (caseData: any): Promise<CaseItem | null> => {
    const effectiveUser = getEffectiveUser(currentUser);
    const isAdminOrLawyer = isUserAdmin(effectiveUser) || isUserLawyer(effectiveUser);
    const requestedBranchId = caseData.branchId || caseData.branch_id || '';
    const requestedBranchName = caseData.branch || caseData.branchName || caseData.branch_name || '';

    if (!isAdminOrLawyer && (requestedBranchId || requestedBranchName)) {
      const allowed = canUserModifyCase(effectiveUser, {
        branchId: requestedBranchId,
        branchName: requestedBranchName,
      });
      if (!allowed) {
        showCleanMessage(
          `Permission Denied: You can only add cases belonging to your assigned branch (${effectiveUser.branchName || 'your station'}).`,
          'warning'
        );
        return null;
      }
    }

    // Resolve branch: Super Admin & Admin can assign any branch or default to Kampala Central (Head Office)
    const targetBranchId = !isAdminOrLawyer
      ? (effectiveUser.branchId || 'kla-hq')
      : (requestedBranchId || effectiveUser.branchId || 'kla-hq');

    const branch =
      branches.find((b) => b.id === targetBranchId) ||
      branches.find(
        (b) =>
          b.id === caseData.branchId ||
          b.name === caseData.branch ||
          b.name === caseData.branchName ||
          b.city.toLowerCase() === (caseData.branch || '').toLowerCase()
      ) ||
      branches.find((b) => b.id === 'kla-hq' || b.isHeadquarters) ||
      branches[0];

    const branchCode = (branch.city || 'KLA').substring(0, 3).toUpperCase();
    const caseNumber = cleanCaseNumber(caseData.case_number || caseData.suitNumber || '');
    const clientTitle = caseData.client?.trim() || caseData.clientName?.trim() || 'Client';
    const caseTitle = caseData.title?.trim() || `${clientTitle} Matter`;
    const hearingDate = caseData.hearing_date || caseData.nextHearingDate || undefined;
    const initialLocation = caseData.file_location || `${branch.city.toUpperCase()} OFFICE / REGISTRY`;

    const initialMovement: FileMovementRecord = {
      id: `fmov-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromLocation: 'Client Instructions',
      toLocation: initialLocation,
      movedBy: currentUser.name,
      reason: 'Physical file created and registered in branch cabinet',
      status: 'At Registry',
    };

    const initialNotes: ProgressiveNote[] = caseData.notes?.trim()
      ? [
          {
            id: `pnote-${Date.now()}`,
            timestamp: new Date().toISOString(),
            author: currentUser.name,
            authorRole: currentUser.roleTitle,
            category: 'General',
            content: caseData.notes.trim(),
          },
        ]
      : [];

    const newCase: CaseItem = {
      id: `case-${Date.now()}`,
      suitNumber: caseNumber,
      case_number: caseNumber,
      firmRefNumber: cleanCaseNumber(caseData.firmRefNumber || ''),
      title: caseTitle,
      court: caseData.court?.trim() || 'High Court of Uganda',
      division: caseData.division || (caseData.case_type ? `${caseData.case_type} Division` : 'High Court (Civil Division)'),
      presidingJudge: caseData.presidingJudge || '',
      courtStation: caseData.courtStation || (caseData.district ? `${caseData.district} Court` : `${branch.city} Court`),
      district: caseData.district || branch.city,
      stage: caseData.stage || 'Pleadings & Defense',
      priority: caseData.priority || 'Standard',
      branchId: branch.id,
      branchName: branch.name,
      branch: branch.name,
      client: clientTitle,
      case_type: caseData.case_type || 'Civil',
      date_of_instructions: caseData.date_of_instructions || caseData.filingDate || new Date().toISOString().split('T')[0],
      subject_matter: caseData.subject_matter || caseData.briefSummary || '',
      notes: caseData.notes || '',
      hearing_date: hearingDate,
      target: caseData.target || '',
      file_location: initialLocation,
      year_of_closure: caseData.year_of_closure || null,
      billing_status: caseData.billing_status || '',
      payment_status: caseData.payment_status || '',
      verdict: caseData.verdict || '',
      person_in_conduct: caseData.person_in_conduct || caseData.leadAdvocate || currentUser.name,
      persons_in_conduct: caseData.persons_in_conduct?.length ? caseData.persons_in_conduct : [caseData.person_in_conduct || currentUser.name],
      leadAdvocate: caseData.person_in_conduct || caseData.leadAdvocate || currentUser.name,
      assistingAdvocates: caseData.assistingAdvocates?.length ? caseData.assistingAdvocates : [],
      parties: caseData.parties || [
        { name: clientTitle, type: 'Plaintiff / Claimant', representedByFirm: true },
        { name: caseData.opposingParty || 'Opposing Party', type: 'Defendant / Respondent', representedByFirm: false }
      ],
      opposingFirm: caseData.opposingFirm || '',
      opposingCounsel: caseData.opposingCounsel || '',
      claimValueUGX: Number(caseData.claimValueUGX) || 0,
      claimValueUSD: caseData.claimValueUSD ? Number(caseData.claimValueUSD) : 0,
      filingDate: caseData.date_of_instructions || caseData.filingDate || new Date().toISOString().split('T')[0],
      nextHearingDate: hearingDate,
      nextHearingPurpose: caseData.nextHearingPurpose || 'Hearing',
      syncedAcrossBranches: true,
      briefSummary: caseData.subject_matter || caseData.briefSummary || '',
      reliefsSought: caseData.reliefsSought?.length ? caseData.reliefsSought : [],
      documentsCount: 0,
      lastUpdated: new Date().toISOString(),
      status: (caseData.status || 'Active') as any,
      suit_no: caseData.suit_no || (caseData as any).suit_number || '',
      fileMovementHistory: caseData.fileMovementHistory || [initialMovement],
      progressiveNotes: caseData.progressiveNotes || initialNotes,
    };

    // 1. Permanently write to Supabase table 'cases' using insert (if not already persisted)
    let savedCase: CaseItem = newCase;
    if (caseData.id && !caseData.id.startsWith('case-')) {
      savedCase = { ...newCase, id: caseData.id };
    } else if (isSupabaseConfigured) {
      try {
        const persisted = await SupabaseService.insertCase(newCase);
        if (persisted) {
          savedCase = persisted;
        }
      } catch (err) {
        console.error('Supabase insertCase permanent write failed:', err);
      }
    }

    setCases((prev) => {
      const nextList = [savedCase, ...prev.filter((c) => c.id !== savedCase.id)];
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_CASES, JSON.stringify(nextList));
      } catch (e) {}
      return nextList;
    });

    // If hearing date was provided, auto-create hearing in diary
    if (hearingDate) {
      const hearing: CourtHearing = {
        id: `hear-${Date.now()}`,
        caseId: savedCase.id,
        suitNumber: savedCase.suitNumber,
        caseTitle: savedCase.title,
        hearingDate,
        hearingTime: caseData.nextHearingTime || '09:30 AM',
        courtName: savedCase.court,
        division: savedCase.division,
        courtRoom: 'Chamber / Court Hall',
        presidingJudge: savedCase.presidingJudge,
        hearingPurpose: caseData.nextHearingPurpose || 'Hearing / Scheduling',
        leadCounsel: savedCase.leadAdvocate,
        assignedAdvocates: [savedCase.leadAdvocate],
        status: 'Scheduled',
        branchId: savedCase.branchId,
      };
      setHearings((prev) => [hearing, ...prev]);
      if (isSupabaseConfigured) {
        SupabaseService.upsertHearing(hearing).catch(() => {});
      }
    }

    // Add sync log
    const syncLog: SyncLog = {
      id: `sync-${Date.now()}`,
      timestamp: new Date().toISOString(),
      branchId: branch.id,
      branchName: branch.name,
      action: `New Case Registered: ${savedCase.suitNumber}`,
      recordsSynced: 1,
      status: 'SUCCESS',
      latencyMs: 16,
      details: `Matter "${savedCase.title}" permanently written to Supabase cases table.`,
    };
    setSyncLogs((prev) => [syncLog, ...prev]);

    // Permanently record INSERT in dedicated 'audit_logs' table in Supabase
    if (isSupabaseConfigured) {
      SupabaseService.logAudit({
        case_id: savedCase.id,
        case_number: savedCase.suitNumber,
        action: 'INSERT',
        performed_by: currentUser.id,
        user_email: currentUser.email,
        user_role: currentUser.role,
        branch: savedCase.branchName || currentUser.branchName,
        changes: {
          title: savedCase.title,
          client: savedCase.client,
          court: savedCase.court,
          division: savedCase.division,
          stage: savedCase.stage,
          status: savedCase.status,
          leadAdvocate: savedCase.leadAdvocate,
        },
      }).then(() => refreshAuditLogs()).catch(() => {});
    }

    return savedCase;
  };

  // Update Case Details - Permanently writes to Supabase
  const updateCase = async (caseId: string, updatedData: Partial<CaseItem>): Promise<CaseItem | null> => {
    const effectiveUser = getEffectiveUser(currentUser);
    // Enforce strict branch-level isolation: Super Admins and Admins exempt; Finance Assistants & branch staff restricted to own branch
    const existing = cases.find((c) => c.id === caseId);
    if (existing && !canUserModifyCase(effectiveUser, existing)) {
      showCleanMessage(
        `View-Only Access: You can only edit cases belonging to your assigned branch (${effectiveUser.branchName || 'your station'}).`,
        'warning'
      );
      return null;
    }
    if (
      !isUserAdmin(effectiveUser) &&
      (updatedData.branchId || updatedData.branchName || (updatedData as any).branch) &&
      !canUserModifyCase(effectiveUser, {
        branchId: updatedData.branchId,
        branchName: updatedData.branch || updatedData.branchName,
      })
    ) {
      // Branch staff and Admin & Finance Assistants cannot reassign case to another branch
      showCleanMessage(
        `Permission Notice: Only Administrators can transfer or reassign a file outside ${effectiveUser.branchName || 'your assigned branch'}.`,
        'warning'
      );
      delete updatedData.branchId;
      delete updatedData.branchName;
      delete (updatedData as any).branch;
    }

    let updatedCaseObj: CaseItem | null = null;

    setCases((prev) => {
      const updatedList = prev.map((c) => {
        if (c.id === caseId) {
          const branchObj = updatedData.branchId
            ? branches.find((b) => b.id === updatedData.branchId)
            : updatedData.branch
            ? branches.find((b) => b.name === updatedData.branch)
            : undefined;

          const updatedSuitNo =
            updatedData.case_number !== undefined
              ? cleanCaseNumber(updatedData.case_number)
              : updatedData.suitNumber !== undefined
              ? cleanCaseNumber(updatedData.suitNumber)
              : cleanCaseNumber(c.suitNumber);

          const updatedFirmRef =
            updatedData.firmRefNumber !== undefined
              ? cleanCaseNumber(updatedData.firmRefNumber)
              : cleanCaseNumber(c.firmRefNumber);

          const updatedRegistrySuitNo =
            (updatedData as any).suit_no !== undefined
              ? (updatedData as any).suit_no
              : c.suit_no;

          const updated: CaseItem = {
            ...c,
            ...updatedData,
            branchId: branchObj ? branchObj.id : c.branchId,
            branchName: branchObj ? branchObj.name : (updatedData.branch || c.branchName),
            branch: branchObj ? branchObj.name : (updatedData.branch || c.branchName),
            suitNumber: updatedSuitNo,
            case_number: updatedSuitNo,
            suit_no: updatedRegistrySuitNo,
            firmRefNumber: updatedFirmRef,
            clientName: updatedData.client || updatedData.clientName || c.clientName,
            client: updatedData.client || updatedData.clientName || c.client,
            nextHearingDate: updatedData.hearing_date || updatedData.nextHearingDate || c.nextHearingDate,
            hearing_date: updatedData.hearing_date || updatedData.nextHearingDate || c.hearing_date,
            lastUpdated: new Date().toISOString(),
          };
          updatedCaseObj = updated;
          return updated;
        }
        return c;
      });
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_CASES, JSON.stringify(updatedList));
      } catch (e) {}
      return updatedList;
    });

    if (selectedCase && selectedCase.id === caseId) {
      setSelectedCase((prev) => {
        if (!prev) return null;
        const branchObj = updatedData.branchId
          ? branches.find((b) => b.id === updatedData.branchId)
          : updatedData.branch
          ? branches.find((b) => b.name === updatedData.branch)
          : undefined;

        const updatedSuitNo =
          updatedData.case_number !== undefined
            ? cleanCaseNumber(updatedData.case_number)
            : updatedData.suitNumber !== undefined
            ? cleanCaseNumber(updatedData.suitNumber)
            : cleanCaseNumber(prev.suitNumber);

        const updatedFirmRef =
          updatedData.firmRefNumber !== undefined
            ? cleanCaseNumber(updatedData.firmRefNumber)
            : cleanCaseNumber(prev.firmRefNumber);

        const updatedRegistrySuitNo =
          (updatedData as any).suit_no !== undefined
            ? (updatedData as any).suit_no
            : prev.suit_no;

        return {
          ...prev,
          ...updatedData,
          branchId: branchObj ? branchObj.id : prev.branchId,
          branchName: branchObj ? branchObj.name : (updatedData.branch || prev.branchName),
          branch: branchObj ? branchObj.name : (updatedData.branch || prev.branchName),
          suitNumber: updatedSuitNo,
          case_number: updatedSuitNo,
          suit_no: updatedRegistrySuitNo,
          firmRefNumber: updatedFirmRef,
          clientName: updatedData.client || updatedData.clientName || prev.clientName,
          client: updatedData.client || updatedData.clientName || prev.client,
          nextHearingDate: updatedData.hearing_date || updatedData.nextHearingDate || prev.nextHearingDate,
          hearing_date: updatedData.hearing_date || updatedData.nextHearingDate || prev.hearing_date,
          lastUpdated: new Date().toISOString(),
        };
      });
    }

    // Permanently write update to Supabase cases table
    if (isSupabaseConfigured) {
      try {
        const persisted = await SupabaseService.updateCase(caseId, updatedData);
        if (persisted) {
          updatedCaseObj = persisted;
          setCases((prev) => {
            const nextList = prev.map((c) => (c.id === caseId ? persisted : c));
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY_CASES, JSON.stringify(nextList));
            } catch (e) {}
            return nextList;
          });
          if (selectedCase && selectedCase.id === caseId) {
            setSelectedCase(persisted);
          }
        }
      } catch (err) {
        console.error('Supabase updateCase permanent write failed:', err);
      }

      // Record UPDATE in dedicated 'audit_logs' table in Supabase
      if (updatedCaseObj) {
        SupabaseService.logAudit({
          case_id: updatedCaseObj.id,
          case_number: updatedCaseObj.suitNumber,
          action: 'UPDATE',
          performed_by: currentUser.id,
          user_email: currentUser.email,
          user_role: currentUser.role,
          branch: updatedCaseObj.branchName || currentUser.branchName,
          changes: {
            updatedFields: Object.keys(updatedData),
            updates: updatedData,
          },
        }).then(() => refreshAuditLogs()).catch(() => {});
      }
    }

    return updatedCaseObj;
  };

  // Permanently delete case from Supabase
  const deleteCase = async (caseId: string): Promise<boolean> => {
    const effectiveUser = getEffectiveUser(currentUser);
    const existing = cases.find((c) => c.id === caseId);

    // Enforce strict branch-level isolation: Super Admins and Admins exempt; Finance Assistants & branch staff restricted to own branch
    if (existing && !canUserModifyCase(effectiveUser, existing)) {
      showCleanMessage(
        `View-Only Access: You can only delete cases belonging to your assigned branch (${effectiveUser.branchName || 'your station'}).`,
        'warning'
      );
      return false;
    }

    // 1. Optimistic removal from UI
    setCases((prev) => {
      const nextList = prev.filter((c) => c.id !== caseId);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_CASES, JSON.stringify(nextList));
      } catch (e) {}
      return nextList;
    });
    if (selectedCase && selectedCase.id === caseId) {
      setSelectedCase(null);
    }

    // 2. Permanently delete from Supabase table 'cases'
    if (isSupabaseConfigured) {
      try {
        await SupabaseService.deleteCase(caseId);

        // Record DELETE in dedicated 'audit_logs' table in Supabase
        SupabaseService.logAudit({
          case_id: caseId,
          case_number: existing?.suitNumber || caseId,
          action: 'DELETE',
          performed_by: currentUser.id,
          user_email: currentUser.email,
          user_role: currentUser.role,
          branch: existing?.branchName || currentUser.branchName,
          changes: {
            deletedTitle: existing?.title,
            deletedClient: existing?.client,
            deletedAt: new Date().toISOString(),
          },
        }).then(() => refreshAuditLogs()).catch(() => {});
      } catch (err) {
        console.error('Supabase permanent deleteCase failed:', err);
        return false;
      }
    }
    return true;
  };

  // Update Case Stage - Permanently persists stage to Supabase
  const updateCaseStage = (caseId: string, newStage: any) => {
    updateCase(caseId, { stage: newStage });
  };

  const fetchFreshDataFromSupabase = async () => {
    try {
      console.log('[Supabase Sync] Fetching fresh live case records from Supabase...');
      let liveCases: CaseItem[] | null = null;
      try {
        const { data, error } = await supabase.from('cases').select('*').order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          liveCases = data.map(mapRowToCase);
        } else if (error) {
          console.info('[Supabase Sync] Direct fetch note:', error.message);
        }
      } catch (e) {
        // Direct browser network error
      }

      if (!liveCases || liveCases.length === 0) {
        liveCases = await SupabaseService.fetchCases();
      }

      if (liveCases) {
        setCases(liveCases);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY_CASES, JSON.stringify(liveCases));
        } catch (e) {}
        setLastGlobalSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        console.log(`[Supabase Sync] Successfully loaded ${liveCases.length} fresh case records.`);
      }
    } catch (err) {
      console.warn('fetchFreshDataFromSupabase error:', err);
    }
  };

  const refreshCasesFromSupabase = fetchFreshDataFromSupabase;

  // Transfer Case to Branch
  const transferCaseToBranch = (caseId: string, targetBranchId: string, reason: string) => {
    const effectiveUser = getEffectiveUser(currentUser);
    if (!isUserAdmin(effectiveUser)) {
      showCleanMessage(
        'Permission Denied: Only Firm / Super Administrators can transfer case files between branches.',
        'warning'
      );
      return;
    }
    const targetBranch = branches.find((b) => b.id === targetBranchId);
    if (!targetBranch) return;

    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          const oldBranch = c.branchName;
          const transferEntry = {
            fromBranch: oldBranch,
            toBranch: targetBranch.name,
            transferDate: new Date().toISOString().split('T')[0],
            reason,
            approvedBy: currentUser.name,
          };
          return {
            ...c,
            branchId: targetBranch.id,
            branchName: targetBranch.name,
            courtStation: `${targetBranch.city} High Court Circuit`,
            lastUpdated: new Date().toISOString(),
            transferHistory: [...(c.transferHistory || []), transferEntry],
          };
        }
        return c;
      })
    );

    // Update selected case if open
    if (selectedCase && selectedCase.id === caseId) {
      setSelectedCase((prev) =>
        prev
          ? {
              ...prev,
              branchId: targetBranch.id,
              branchName: targetBranch.name,
              courtStation: `${targetBranch.city} High Court Circuit`,
            }
          : null
      );
    }

    // Log the transfer in sync logs
    const log: SyncLog = {
      id: `sync-xfer-${Date.now()}`,
      timestamp: new Date().toISOString(),
      branchId: targetBranch.id,
      branchName: targetBranch.name,
      action: `Cross-Branch Case Transfer Approved`,
      recordsSynced: 1,
      status: 'SUCCESS',
      latencyMs: 24,
      details: `Matter transferred to ${targetBranch.name} branch. Reason: ${reason} (Approved by ${currentUser.name})`,
    };
    setSyncLogs((prev) => [log, ...prev]);
  };

  // Add Court Hearing
  const addHearing = (hearingData: Omit<CourtHearing, 'id'>) => {
    const newHearing: CourtHearing = {
      ...hearingData,
      id: `hear-${Date.now()}`,
    };
    setHearings((prev) => [newHearing, ...prev]);

    // Update the hearing_date and nextHearingDate on the corresponding case
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === hearingData.caseId) {
          return {
            ...c,
            hearing_date: hearingData.hearingDate,
            nextHearingDate: hearingData.hearingDate,
            nextHearingPurpose: hearingData.hearingPurpose,
            nextHearingJudge: hearingData.presidingJudge,
            lastUpdated: new Date().toISOString(),
          };
        }
        return c;
      })
    );

    // Persist to Supabase if available
    if (isSupabaseConfigured) {
      SupabaseService.upsertHearing(newHearing).catch((err) =>
        console.warn('Supabase upsertHearing non-fatal error:', err)
      );
      if (hearingData.caseId) {
        SupabaseService.updateCase(hearingData.caseId, {
          hearing_date: hearingData.hearingDate,
          nextHearingDate: hearingData.hearingDate,
          nextHearingPurpose: hearingData.hearingPurpose,
          nextHearingJudge: hearingData.presidingJudge,
        }).catch((err) => console.warn('Supabase case sync hearing_date non-fatal error:', err));
      }
    }
  };

  // Update Hearing Outcome
  const updateHearingOutcome = (
    hearingId: string,
    outcome: {
      status: 'Completed' | 'Adjourned' | 'Part-Heard';
      courtNotes: string;
      nextHearingDate?: string;
      nextDirections?: string;
    }
  ) => {
    setHearings((prev) =>
      prev.map((h) => {
        if (h.id === hearingId) {
          const updatedHearing: CourtHearing = {
            ...h,
            status: outcome.status,
            courtNotes: outcome.courtNotes,
            nextHearingDate: outcome.nextHearingDate,
            nextDirections: outcome.nextDirections,
          };
          if (isSupabaseConfigured) {
            SupabaseService.upsertHearing(updatedHearing).catch((err) =>
              console.warn('Supabase update hearing outcome error:', err)
            );
          }
          return updatedHearing;
        }
        return h;
      })
    );

    // If an adjournment next hearing date was given, also update the case
    const currentHearing = hearings.find((h) => h.id === hearingId);
    if (currentHearing && outcome.nextHearingDate) {
      setCases((prev) =>
        prev.map((c) => {
          if (c.id === currentHearing.caseId) {
            return {
              ...c,
              hearing_date: outcome.nextHearingDate,
              nextHearingDate: outcome.nextHearingDate,
              nextHearingPurpose: outcome.nextDirections || 'Further Hearing',
              lastUpdated: new Date().toISOString(),
            };
          }
          return c;
        })
      );

      if (isSupabaseConfigured && currentHearing.caseId) {
        SupabaseService.updateCase(currentHearing.caseId, {
          hearing_date: outcome.nextHearingDate,
          nextHearingDate: outcome.nextHearingDate,
          nextHearingPurpose: outcome.nextDirections || 'Further Hearing',
        }).catch((err) => console.warn('Supabase case sync outcome error:', err));
      }
    }
  };

  // Add Document
  const addDocument = (docData: Omit<PleadingDocument, 'id'>) => {
    const newDoc: PleadingDocument = {
      ...docData,
      id: `doc-${Date.now()}`,
    };
    setDocuments((prev) => [newDoc, ...prev]);

    // Increment document count on the case
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === docData.caseId) {
          return {
            ...c,
            documentsCount: (c.documentsCount || 0) + 1,
            lastUpdated: new Date().toISOString(),
          };
        }
        return c;
      })
    );
  };

  // Enterprise Conflict Check Engine
  const runConflictCheck = (query: string): ConflictCheckResult => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return {
        searchQuery: query,
        timestamp: new Date().toISOString(),
        checkedBy: currentUser.name,
        hasConflict: false,
        matchedCases: [],
      };
    }

    const matchedCases: ConflictCheckResult['matchedCases'] = [];

    cases.forEach((c) => {
      // Check each party
      c.parties.forEach((p) => {
        if (p.name.toLowerCase().includes(q)) {
          matchedCases.push({
            caseId: c.id,
            suitNumber: c.suitNumber,
            caseTitle: c.title,
            partyName: p.name,
            partyType: p.type,
            representedByFirm: p.representedByFirm,
            branchName: c.branchName,
            leadAdvocate: c.leadAdvocate,
          });
        }
      });

      // Also check opposing counsel/firm if query matches
      if (c.opposingFirm.toLowerCase().includes(q) || c.opposingCounsel.toLowerCase().includes(q)) {
        matchedCases.push({
          caseId: c.id,
          suitNumber: c.suitNumber,
          caseTitle: c.title,
          partyName: `Opposing: ${c.opposingFirm} (${c.opposingCounsel})`,
          partyType: 'Adversary Counsel',
          representedByFirm: false,
          branchName: c.branchName,
          leadAdvocate: c.leadAdvocate,
        });
      }
    });

    return {
      searchQuery: query,
      timestamp: new Date().toISOString(),
      checkedBy: currentUser.name,
      hasConflict: matchedCases.length > 0,
      matchedCases,
    };
  };

  // Export Catalogue to CSV - Restricted strictly to Super Admin
  const exportCatalogueToCsv = () => {
    if (!userPermissions.canBulkExport) {
      console.warn('Access denied: Bulk export is restricted to Super Admin.');
      return;
    }
    const headers = [
      'MK File No.',
      'Court Suit No.',
      'Firm Ref',
      'Case Title',
      'Court Division',
      'Court Station',
      'Stage',
      'Priority',
      'Branch',
      'Lead Advocate',
      'Claim Value UGX',
      'Filing Date',
      'Next Hearing Date',
      'Next Hearing Purpose',
      'Opposing Firm',
    ];

    const rows = filteredCases.map((c) => [
      `"${c.case_number || c.suitNumber || ''}"`,
      `"${c.suit_no || ''}"`,
      `"${c.firmRefNumber}"`,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.division}"`,
      `"${c.courtStation}"`,
      `"${c.stage}"`,
      `"${c.priority}"`,
      `"${c.branchName}"`,
      `"${c.leadAdvocate}"`,
      c.claimValueUGX,
      `"${c.filingDate}"`,
      `"${c.nextHearingDate || 'N/A'}"`,
      `"${(c.nextHearingPurpose || 'N/A').replace(/"/g, '""')}"`,
      `"${c.opposingFirm.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MK_Case_Catalogue_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import cases from Excel (.xlsx, .xls, .csv) - Safely appends and permanently writes to Supabase
  const importCasesFromExcel = async (
    importedData: any[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    if (!userPermissions.canBulkImport) {
      console.warn('Access denied: Excel bulk import is restricted to Super Admin only.');
      return { success: false, count: 0, error: 'Access denied: Super Admin permission required for bulk import.' };
    }

    if (!importedData || importedData.length === 0) {
      return { success: true, count: 0 };
    }

    const currentBranchFilterObj = selectedBranchFilter !== 'all' ? branches.find((b) => b.id === selectedBranchFilter) : null;
    const defaultBranch = currentBranchFilterObj || branches.find((b) => b.id === 'kla-hq') || branches[0];

    const formattedCases: CaseItem[] = importedData.map((raw, idx) => {
      const rawBranchStr = String(raw.branch || raw.branchName || '').trim();
      let foundBranch = defaultBranch;

      if (rawBranchStr) {
        const matched = branches.find(
          (b) =>
            b.name.toLowerCase().includes(rawBranchStr.toLowerCase()) ||
            b.city.toLowerCase().includes(rawBranchStr.toLowerCase()) ||
            b.id.toLowerCase() === rawBranchStr.toLowerCase()
        );
        if (matched) foundBranch = matched;
      }

      // Parse persons in conduct
      let persons: string[] = [];
      if (Array.isArray(raw.persons_in_conduct) && raw.persons_in_conduct.length > 0) {
        persons = raw.persons_in_conduct.map((p: any) => String(p).trim()).filter(Boolean);
      } else if (raw.person_in_conduct) {
        persons = String(raw.person_in_conduct)
          .split(/[,;\n]+/)
          .map((s: string) => s.trim())
          .filter(Boolean);
      } else if (raw.leadAdvocate) {
        persons = [String(raw.leadAdvocate).trim()];
      }
      if (persons.length === 0) persons = [currentUser.name || 'Advocate In Conduct'];

      const leadAdvocate = persons[0];
      const assistingAdvocates = persons.slice(1);
      // Strictly maintain exact user File NO. as per uploaded Excel, or "" if original had no number
      const fileNumber = cleanCaseNumber(
        raw.file_no ||
        raw.file_number ||
        raw['File NO.'] ||
        raw['File No.'] ||
        raw['File No'] ||
        raw['FILE NO.'] ||
        raw['FILE NO'] ||
        raw['File Number'] ||
        raw.case_number ||
        raw.suitNumber ||
        ''
      );
      const clientName = raw.client || raw.clientName || 'Client';

      const statusStr = String(raw.status || '').toLowerCase();
      const normalizedStatus = statusStr.includes('inact')
        ? 'Inactive'
        : statusStr.includes('instruct')
        ? 'Instructions'
        : statusStr.includes('pend')
        ? 'Pending'
        : statusStr.includes('dorm')
        ? 'Dormant'
        : statusStr.includes('clos') || statusStr.includes('arch')
        ? 'Archived'
        : 'Active';

      const hearingDate = raw.hearing_date || raw.nextHearingDate || undefined;

      return {
        id: `case-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        suitNumber: fileNumber,
        firmRefNumber: cleanCaseNumber(raw.firmRefNumber || ''),
        title: raw.title || (clientName ? `Matter of ${clientName}` : 'Litigation Matter'),
        court: raw.court || 'High Court of Uganda',
        division: String(raw.case_type || '').includes('Commercial')
          ? 'High Court (Commercial Division)'
          : String(raw.case_type || '').includes('Land')
          ? 'High Court (Land Division)'
          : 'High Court (Civil Division)',
        presidingJudge: raw.presidingJudge || raw.judge || raw.court || '',
        courtStation: raw.district || foundBranch.city || 'Kampala',
        stage: 'Pleadings & Defense',
        priority: 'Standard',
        branchId: foundBranch.id,
        branchName: foundBranch.name,
        leadAdvocate,
        assistingAdvocates,
        parties: [
          { name: clientName, type: 'Plaintiff / Claimant', representedByFirm: true },
          { name: raw.opposingParty || 'Opposing Party', type: 'Defendant / Respondent', representedByFirm: false },
        ],
        opposingFirm: raw.opposingFirm || '',
        opposingCounsel: raw.opposingCounsel || '',
        claimValueUGX: Number(raw.claimValueUGX) || 0,
        filingDate: raw.date_of_instructions || new Date().toISOString().split('T')[0],
        nextHearingDate: hearingDate,
        syncedAcrossBranches: true,
        briefSummary: raw.subject_matter || 'Imported case record.',
        reliefsSought: ['Judgment and remedies as prayed.'],
        documentsCount: 0,
        lastUpdated: new Date().toISOString(),
        status: normalizedStatus as any,

        // Specific fields
        case_number: fileNumber,
        case_type: raw.case_type || 'Civil',
        client: clientName,
        clientName: clientName,
        branch: foundBranch.name,
        date_of_instructions: raw.date_of_instructions || '',
        district: raw.district || foundBranch.city || 'Kampala',
        subject_matter: raw.subject_matter || '',
        notes: raw.notes || '',
        hearing_date: hearingDate || '',
        target: raw.target || '',
        file_location: raw.file_location || `${foundBranch.city.toUpperCase()} OFFICE`,
        year_of_closure: raw.year_of_closure || null,
        billing_status: raw.billing_status || '',
        payment_status: raw.payment_status || '',
        verdict: raw.verdict || '',
        person_in_conduct: persons.join(', '),
        persons_in_conduct: persons,
        fileMovementHistory: raw.fileMovementHistory?.length
          ? raw.fileMovementHistory
          : [
              {
                id: `fmov-imp-${Date.now()}-${idx}`,
                timestamp: new Date().toISOString(),
                fromLocation: 'Intake / Registry Intake Desk',
                toLocation: raw.file_location || `${foundBranch.city.toUpperCase()} OFFICE - Cabinet`,
                movedBy: currentUser.name || 'Registry Clerk',
                reason: 'Initial file catalogued & assigned to branch archive',
                status: 'At Registry',
              },
            ],
        progressiveNotes: raw.progressiveNotes?.length
          ? raw.progressiveNotes
          : (raw.notes?.trim()
          ? [
              {
                id: `pnote-imp-${Date.now()}-${idx}`,
                timestamp: new Date().toISOString(),
                author: persons[0] || currentUser.name,
                authorRole: 'Counsel In Conduct',
                category: 'General',
                content: raw.notes.trim(),
              },
            ]
          : []),
      };
    });

    // Permanently insert into Supabase cases table in batches (Safe append, preserving existing cases)
    let insertedCount = 0;
    try {
      const result = await SupabaseService.bulkInsertCases(formattedCases, 50, onProgress);
      insertedCount = result.insertedCount;

      if (!result.success && insertedCount === 0 && result.errors.length > 0) {
        const errorMsg = result.errors[0]?.message || 'Failed to insert cases into Supabase';
        return { success: false, count: 0, error: errorMsg };
      }
    } catch (err: any) {
      console.error('Error during bulkInsertCases to Supabase:', err);
      return { success: false, count: 0, error: err.message || 'Supabase insertion failed' };
    }

    // 3. Immediately trigger a fresh database fetch from Supabase
    // ensuring the imported records persist permanently across page refreshes
    await refreshCasesFromSupabase();

    // Log the sync event
    const syncLog: SyncLog = {
      id: `sync-import-${Date.now()}`,
      timestamp: new Date().toISOString(),
      branchId: defaultBranch.id,
      branchName: defaultBranch.name,
      action: `Excel Import Completed: ${insertedCount} Cases`,
      recordsSynced: insertedCount,
      status: 'SUCCESS',
      latencyMs: 38,
      details: `Permanently wrote ${insertedCount} imported case records to Supabase 'cases' table.`,
    };
    setSyncLogs((prev) => [syncLog, ...prev]);

    return { success: true, count: insertedCount };
  };

  // Add physical file movement record
  const addFileMovement = (caseId: string, movement: Omit<FileMovementRecord, 'id' | 'timestamp'>) => {
    const newRecord: FileMovementRecord = {
      ...movement,
      id: `fmov-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          const updated = {
            ...c,
            file_location: movement.toLocation || c.file_location,
            fileMovementHistory: [newRecord, ...(c.fileMovementHistory || [])],
          };
          return updated;
        }
        return c;
      })
    );

    setSelectedCase((prev) => {
      if (!prev || prev.id !== caseId) return prev;
      return {
        ...prev,
        file_location: movement.toLocation || prev.file_location,
        fileMovementHistory: [newRecord, ...(prev.fileMovementHistory || [])],
      };
    });
  };

  // Add continuous progressive note
  const addProgressiveNote = (caseId: string, note: Omit<ProgressiveNote, 'id' | 'timestamp'>) => {
    const newNote: ProgressiveNote = {
      ...note,
      id: `pnote-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          const updated = {
            ...c,
            progressiveNotes: [newNote, ...(c.progressiveNotes || [])],
          };
          return updated;
        }
        return c;
      })
    );

    setSelectedCase((prev) => {
      if (!prev || prev.id !== caseId) return prev;
      return {
        ...prev,
        progressiveNotes: [newNote, ...(prev.progressiveNotes || [])],
      };
    });
  };

  const handleSetPrintableCauseDate = (date: string | null) => {
    if (date !== null && !userPermissions.canPrintCauseList) {
      console.warn('Unauthorized: Daily cause list printing is restricted to Branch Administrators and Super Admin.');
      return;
    }
    setPrintableCauseDate(date);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        availableUsers,
        isAuthenticated,
        login,
        handleLoginSuccess,
        logout,
        roles,
        userPermissions,
        addCustomRole,
        updateCustomRole,
        deleteCustomRole,
        assignUserRole,
        addUser,
        updateUser,
        handleSaveStaff,
        updateUserPassword,
        toggleSuspendUser,
        deleteUser,
        branches,
        selectedBranchFilter,
        setSelectedBranchFilter,
        systemSettings,
        updateSystemSettings,
        resetSystemSettingsToDefault,
        selectedLawyerFilter,
        setSelectedLawyerFilter,
        addBranch,
        updateBranch,
        deleteBranch,
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        cases,
        filteredCases,
        selectedCase,
        setSelectedCase,
        hearings,
        documents,
        syncLogs,
        isSyncing,
        lastGlobalSync,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        isNewCaseModalOpen,
        setIsNewCaseModalOpen,
        isImportModalOpen,
        setIsImportModalOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authMode,
        setAuthMode,
        triggerManualSync,
        addCase,
        updateCase,
        deleteCase,
        refreshCasesFromSupabase,
        fetchFreshDataFromSupabase,
        refreshStaffFromSupabase,
        fetchUsers: refreshStaffFromSupabase,
        fetchUserProfile,
        updateCaseStage,
        transferCaseToBranch,
        addHearing,
        updateHearingOutcome,
        addDocument,
        runConflictCheck,
        exportCatalogueToCsv,
        importCasesFromExcel,
        addFileMovement,
        addProgressiveNote,
        printableCauseDate,
        setPrintableCauseDate: handleSetPrintableCauseDate,
        isServerConnected,
        isCpanelMigrationModalOpen,
        setIsCpanelMigrationModalOpen,
        auditLogs,
        refreshAuditLogs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
