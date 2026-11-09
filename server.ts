import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://kidaxoubrzbvnrtuinff.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGF4b3Vicnpidm5ydHVpbmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODE0NjAsImV4cCI6MjEwOTE1NzQ2MH0.eDf8euIyXDj5CEzZbW3Dy8irKqGWC-0scvftzfwMS5g';

// Supabase Admin Client for user_metadata and server-side profile updates
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function resolveServerPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const val = Number(process.argv[portArgIndex + 1]);
    if (!isNaN(val) && val > 0) return val;
  }
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  return Number(process.env.PORT) || 3000;
}

const PORT = resolveServerPort();
const DB_DIR = path.resolve(__dirname, 'server_data');
const DB_FILE = path.resolve(DB_DIR, 'firm_database.json');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initial Clean Database structure (Zero demo records for client file safety)
const DEFAULT_DATABASE = {
  version: '2.0',
  lastUpdated: new Date().toISOString(),
  cases: [],
  hearings: [],
  documents: [],
  branches: [
    {
      id: 'kla-hq',
      name: 'Kampala Central (Head Office)',
      city: 'Kampala',
      address: 'Millennium Plaza, 2nd Floor, Plot 69 Spring Road, Bugolobi',
      isHeadquarters: true,
      teamLead: '',
      officeAdmin: '',
      clerk: '',
      lawyersCount: 0,
      leadAdvocate: '',
      activeAdvocates: 0,
      phone: '+256 414 250 890',
      caseCount: 0,
      syncStatus: 'synced',
      lastSyncTime: 'Just now',
      latencyMs: 14,
      staff: [],
    },
    {
      id: 'ftp-reg',
      name: 'Fort Portal Regional Office',
      city: 'Fort Portal',
      address: 'Plot 12 Lugard Road, Rwenzori Commercial Chambers',
      isHeadquarters: false,
      teamLead: '',
      officeAdmin: '',
      clerk: '',
      lawyersCount: 0,
      leadAdvocate: '',
      activeAdvocates: 0,
      phone: '+256 483 422 150',
      caseCount: 0,
      syncStatus: 'synced',
      lastSyncTime: 'Just now',
      latencyMs: 28,
      staff: [],
    },
    {
      id: 'mbr-reg',
      name: 'Mbarara Regional Office',
      city: 'Mbarara',
      address: 'Plot 4 High Street, Ankole Kingdom Plaza',
      isHeadquarters: false,
      teamLead: '',
      officeAdmin: '',
      clerk: '',
      lawyersCount: 0,
      leadAdvocate: '',
      activeAdvocates: 0,
      phone: '+256 485 420 310',
      caseCount: 0,
      syncStatus: 'synced',
      lastSyncTime: 'Just now',
      latencyMs: 32,
      staff: [],
    },
    {
      id: 'msk-reg',
      name: 'Masaka Regional Office',
      city: 'Masaka',
      address: 'Plot 24 Elgin Road, Greater Masaka Arcade',
      isHeadquarters: false,
      teamLead: '',
      officeAdmin: '',
      clerk: '',
      lawyersCount: 0,
      leadAdvocate: '',
      activeAdvocates: 0,
      phone: '+256 481 421 990',
      caseCount: 0,
      syncStatus: 'synced',
      lastSyncTime: 'Just now',
      latencyMs: 25,
      staff: [],
    },
    {
      id: 'jnj-reg',
      name: 'Jinja Regional Office',
      city: 'Jinja',
      address: 'Plot 32 Main Street, Nile Crescent Building',
      isHeadquarters: false,
      teamLead: '',
      officeAdmin: '',
      clerk: '',
      lawyersCount: 0,
      leadAdvocate: '',
      activeAdvocates: 0,
      phone: '+256 434 120 750',
      caseCount: 0,
      syncStatus: 'synced',
      lastSyncTime: 'Just now',
      latencyMs: 22,
      staff: [],
    },
  ],
  users: [
    {
      id: 'user-admin',
      name: 'Firm Administrator',
      email: 'infosightug@gmail.com',
      role: 'partner',
      roleId: 'role-super-admin',
      roleTitle: 'Sole Managing Partner & Super Admin',
      branchId: 'kla-hq',
      branchName: 'Kampala Central (Head Office)',
      isSuperAdmin: true,
      isBranchAdmin: true,
      password: 'Admin@2026',
      advocateRollNo: '',
    },
  ],
  roles: [
    {
      id: 'role-super-admin',
      name: 'Managing Partner (Super Admin)',
      description: 'Supreme firm authority: full access to update system, add branches, add/suspend/delete users, create custom roles, and exclusively perform bulk import/export.',
      isSuperAdmin: true,
      isSystem: true,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      permissions: {
        canViewAllBranches: true,
        canCreateCases: true,
        canEditCases: true,
        canDeleteCases: true,
        canBulkImport: true,
        canBulkExport: true,
        canPrintCauseList: true,
        canScheduleHearings: true,
        canRecordOutcomes: true,
        canLogFileMovement: true,
        canManageDocuments: true,
        canViewFinancials: true,
        canManageRoles: true,
        canManageUsers: true,
        canManageBranches: true,
      },
    },
    {
      id: 'role-admin',
      name: 'Branch Administrator',
      description: 'Branch administrative custody: authorized to print daily cause sheets, manage physical file registries, verify intake, and coordinate branch operations.',
      isSuperAdmin: false,
      isSystem: true,
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      permissions: {
        canViewAllBranches: false,
        canCreateCases: true,
        canEditCases: true,
        canDeleteCases: false,
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
      },
    },
    {
      id: 'role-lead',
      name: 'Regional Litigation Team Lead',
      description: 'Supervises branch advocates, reviews pleadings, conducts high-value trials, and assigns regional litigation briefs.',
      isSuperAdmin: false,
      isSystem: true,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      permissions: {
        canViewAllBranches: false,
        canCreateCases: true,
        canEditCases: true,
        canDeleteCases: false,
        canBulkImport: false,
        canBulkExport: false,
        canPrintCauseList: false,
        canScheduleHearings: true,
        canRecordOutcomes: true,
        canLogFileMovement: true,
        canManageDocuments: true,
        canViewFinancials: false,
        canManageRoles: false,
        canManageUsers: false,
        canManageBranches: false,
      },
    },
    {
      id: 'role-advocate',
      name: 'Litigation Lawyer / Associate',
      description: 'Enters daily case notes, registers court appearances, drafts pleadings, and attends scheduled division hearings.',
      isSuperAdmin: false,
      isSystem: true,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      permissions: {
        canViewAllBranches: false,
        canCreateCases: true,
        canEditCases: true,
        canDeleteCases: false,
        canBulkImport: false,
        canBulkExport: false,
        canPrintCauseList: false,
        canScheduleHearings: true,
        canRecordOutcomes: true,
        canLogFileMovement: true,
        canManageDocuments: true,
        canViewFinancials: false,
        canManageRoles: false,
        canManageUsers: false,
        canManageBranches: false,
      },
    },
    {
      id: 'role-clerk',
      name: 'Court & Registry Clerk',
      description: 'Manages physical file custody, logs cabinet movements, delivers court pleadings, and registers cause diary fixtures.',
      isSuperAdmin: false,
      isSystem: true,
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
      permissions: {
        canViewAllBranches: false,
        canCreateCases: false,
        canEditCases: false,
        canDeleteCases: false,
        canBulkImport: false,
        canBulkExport: false,
        canPrintCauseList: true,
        canScheduleHearings: false,
        canRecordOutcomes: false,
        canLogFileMovement: true,
        canManageDocuments: true,
        canViewFinancials: false,
        canManageRoles: false,
        canManageUsers: false,
        canManageBranches: false,
      },
    },
  ],
  systemSettings: null as any,
};

// Initialize file if not present
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATABASE, null, 2), 'utf-8');
}

function readDatabase(): typeof DEFAULT_DATABASE {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_DATABASE,
        ...parsed,
        cases: Array.isArray(parsed.cases) ? parsed.cases : [],
        hearings: Array.isArray(parsed.hearings) ? parsed.hearings : [],
        documents: Array.isArray(parsed.documents) ? parsed.documents : [],
        branches: Array.isArray(parsed.branches) && parsed.branches.length > 0 ? parsed.branches : DEFAULT_DATABASE.branches,
        users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : DEFAULT_DATABASE.users,
        roles: Array.isArray(parsed.roles) && parsed.roles.length > 0 ? parsed.roles : DEFAULT_DATABASE.roles,
        systemSettings: parsed.systemSettings || null,
      };
    }
  } catch (err) {
    console.error('Failed reading database file:', err);
  }
  return DEFAULT_DATABASE;
}

function writeDatabase(data: any): boolean {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    const payload = {
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('Failed writing database file:', err);
    return false;
  }
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Strict Privacy & Anti-Scraping / AI Crawler Block Middleware
app.use((req, res, next) => {
  // Enforce zero-indexing and strict referrer privacy
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, notranslate, noimageindex');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Permissions-Policy', 'interest-cohort=(), browsing-topics=(), conversion-measurement=(), attribution-reporting=()');

  // Prevent caching of confidential client matters and database records
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Intercept and block known AI scrapers, telemetry harvesters, and automated web crawlers
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const blockedAgents = [
    'gptbot',
    'chatgpt-user',
    'google-extended',
    'claudebot',
    'anthropic',
    'ccbot',
    'bytespider',
    'diffbot',
    'perplexitybot',
    'applebot-extended',
    'omgilibot',
    'cohere-ai',
    'scrapy',
  ];

  if (blockedAgents.some((bot) => userAgent.includes(bot))) {
    return res.status(403).json({
      error: 'Access Forbidden: MK Advocates privacy perimeter blocks external AI indexing and data scraping.',
    });
  }

  next();
});

// CORS headers for local / cross-origin / cPanel proxy access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Central Multi-Computer Database API Endpoints
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    server: 'MK Central Litigation Backend (Multi-Workstation Sync)',
    databaseFile: DB_FILE,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/database', (req: Request, res: Response) => {
  const db = readDatabase();
  res.json({
    success: true,
    data: db,
    syncedAt: db.lastUpdated,
  });
});

app.post('/api/database', (req: Request, res: Response) => {
  const { cases, hearings, documents, branches, users, roles, systemSettings } = req.body;
  const current = readDatabase();

  const updated = {
    ...current,
    cases: Array.isArray(cases) ? cases : current.cases,
    hearings: Array.isArray(hearings) ? hearings : current.hearings,
    documents: Array.isArray(documents) ? documents : current.documents,
    branches: Array.isArray(branches) ? branches : current.branches,
    users: Array.isArray(users) ? users : current.users,
    roles: Array.isArray(roles) ? roles : current.roles,
    systemSettings: systemSettings !== undefined ? systemSettings : current.systemSettings,
  };

  const ok = writeDatabase(updated);
  if (ok) {
    res.json({
      success: true,
      message: 'Central database updated successfully across all workstations.',
      lastUpdated: updated.lastUpdated,
      caseCount: updated.cases.length,
    });
  } else {
    res.status(500).json({ success: false, error: 'Failed to write central database file.' });
  }
});

// ==============================================================================
// User Update API Route: Syncs BOTH Supabase Auth user_metadata AND public profiles table
// ==============================================================================
const handleUserUpdate = async (req: Request, res: Response) => {
  try {
    const targetId = String(req.params.id || req.body.userId || req.body.id || '');
    const {
      name,
      full_name,
      email,
      role,
      roleId,
      role_id,
      roleTitle,
      role_title,
      branch,
      branchName,
      branch_name,
      branchId,
      branch_id,
      isSuperAdmin,
      is_super_admin,
      isBranchAdmin,
      is_branch_admin,
      isSuspended,
      is_suspended,
      advocateRollNo,
      advocate_roll_no,
      password,
    } = req.body;

    const resolvedName = (name || full_name || '').trim();
    const resolvedRole = (roleId || role_id || role || '').trim();
    const resolvedRoleTitle = (roleTitle || role_title || '').trim();
    const resolvedBranch = (branchName || branch_name || branch || '').trim();
    const resolvedBranchId = (branchId || branch_id || '').trim();
    const resolvedEmail = (email || '').trim().toLowerCase();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);

    // Initialize authenticated Supabase client if Authorization header is provided
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    const clientToUse = token
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          accessToken: async () => token,
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabaseAdmin;

    // 1. Prepare user_metadata for Supabase Auth
    const userMetadata: Record<string, any> = {};
    if (resolvedName) {
      userMetadata.full_name = resolvedName;
      userMetadata.name = resolvedName;
    }
    if (resolvedRole) {
      userMetadata.role = resolvedRole;
      userMetadata.role_id = resolvedRole;
    }
    if (resolvedRoleTitle) userMetadata.role_title = resolvedRoleTitle;
    if (resolvedBranch) {
      userMetadata.branch = resolvedBranch;
      userMetadata.branch_name = resolvedBranch;
    }
    if (resolvedBranchId) userMetadata.branch_id = resolvedBranchId;
    if (isSuperAdmin !== undefined || is_super_admin !== undefined) {
      userMetadata.is_super_admin = Boolean(isSuperAdmin ?? is_super_admin);
    }
    if (isBranchAdmin !== undefined || is_branch_admin !== undefined) {
      userMetadata.is_branch_admin = Boolean(isBranchAdmin ?? is_branch_admin);
    }

    // 1a. Update Supabase Auth user_metadata using supabaseAdmin.auth.admin.updateUserById
    let authUpdated = false;
    let authError: string | null = null;
    let authUserId: string | null = isUUID ? targetId : null;

    try {
      // If targetId is not a UUID, attempt to resolve auth UUID via profiles table or Auth user list
      if (!authUserId && resolvedEmail) {
        try {
          const { data: pLookup } = await clientToUse
            .from('profiles')
            .select('id')
            .eq('email', resolvedEmail)
            .maybeSingle();
          if (pLookup?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pLookup.id)) {
            authUserId = pLookup.id;
          }
        } catch (pe) {}
      }

      if (!authUserId && resolvedEmail) {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const matched = userList?.users?.find(
          (u) => u.email?.toLowerCase() === resolvedEmail
        );
        if (matched) {
          authUserId = matched.id;
        }
      }

      if (authUserId) {
        const authPayload: any = {
          user_metadata: userMetadata,
        };
        if (resolvedEmail) authPayload.email = resolvedEmail;
        if (password && password.trim()) authPayload.password = password.trim();

        const { data: updatedAuthUser, error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
          authUserId,
          authPayload
        );
        if (!authErr && updatedAuthUser) {
          authUpdated = true;
        } else if (authErr) {
          authError = authErr.message;
          console.warn('[User Update API] supabaseAdmin.auth.admin.updateUserById notice:', authErr.message);
        }
      }
    } catch (authEx: any) {
      authError = authEx?.message || 'Auth admin update exception';
      console.warn('[User Update API] Auth update exception:', authEx);
    }

    // 2. Simultaneously sync to public 'profiles' table using clean schema columns (full_name, role, branch_id, branch_name, branch, email)
    const profileRow: Record<string, any> = {};
    if (resolvedName) profileRow.full_name = resolvedName;
    if (resolvedRole) {
      profileRow.role = resolvedRole;
      profileRow.role_id = resolvedRole;
    }
    if (resolvedRoleTitle) profileRow.role_title = resolvedRoleTitle;
    if (resolvedBranch) {
      profileRow.branch = resolvedBranch;
      profileRow.branch_name = resolvedBranch;
    }
    if (resolvedBranchId) {
      profileRow.branch_id = resolvedBranchId;
    }
    if (resolvedEmail) profileRow.email = resolvedEmail;
    if (isSuperAdmin !== undefined || is_super_admin !== undefined) {
      profileRow.is_super_admin = Boolean(isSuperAdmin ?? is_super_admin);
    }
    if (isBranchAdmin !== undefined || is_branch_admin !== undefined) {
      profileRow.is_branch_admin = Boolean(isBranchAdmin ?? is_branch_admin);
    }
    profileRow.updated_at = new Date().toISOString();

    let profileUpdated = false;
    let profileData: any = null;

    // Try update by auth UUID if known
    if (authUserId && Object.keys(profileRow).length > 0) {
      const { data: pData, error: pErr } = await clientToUse
        .from('profiles')
        .update(profileRow)
        .eq('id', authUserId)
        .select('*');
      if (!pErr && pData && pData.length > 0) {
        profileUpdated = true;
        profileData = pData[0];
      }
    }

    // If targetId is UUID and not already updated
    if (!profileUpdated && isUUID && Object.keys(profileRow).length > 0) {
      const { data: pData, error: pErr } = await clientToUse
        .from('profiles')
        .update(profileRow)
        .eq('id', targetId)
        .select('*');
      if (!pErr && pData && pData.length > 0) {
        profileUpdated = true;
        profileData = pData[0];
      }
    }

    // Try update by email in profiles
    if (!profileUpdated && resolvedEmail && Object.keys(profileRow).length > 0) {
      const { data: pEmailData, error: peErr } = await clientToUse
        .from('profiles')
        .update(profileRow)
        .eq('email', resolvedEmail)
        .select('*');
      if (!peErr && pEmailData && pEmailData.length > 0) {
        profileUpdated = true;
        profileData = pEmailData[0];
      }
    }

    // If still not updated, upsert into profiles
    if (!profileUpdated && (authUserId || resolvedEmail)) {
      const insertRow: any = {
        ...profileRow,
        id: authUserId || (isUUID ? targetId : undefined),
        email: resolvedEmail || undefined,
      };
      if (!insertRow.id) delete insertRow.id;
      const { data: insData } = await clientToUse
        .from('profiles')
        .upsert([insertRow])
        .select('*');
      if (insData && insData.length > 0) {
        profileUpdated = true;
        profileData = insData[0];
      }
    }

    // 3. Keep firm_users table synchronized
    try {
      const firmUserUpdates: any = {
        name: resolvedName || undefined,
        role: resolvedRole || undefined,
        role_title: resolvedRoleTitle || undefined,
        branch_name: resolvedBranch || undefined,
        branch_id: resolvedBranchId || undefined,
      };
      if (advocateRollNo || advocate_roll_no) {
        firmUserUpdates.advocate_roll_no = advocateRollNo || advocate_roll_no;
      }
      if (isSuperAdmin !== undefined || is_super_admin !== undefined) {
        firmUserUpdates.is_super_admin = Boolean(isSuperAdmin ?? is_super_admin);
      }
      if (isBranchAdmin !== undefined || is_branch_admin !== undefined) {
        firmUserUpdates.is_branch_admin = Boolean(isBranchAdmin ?? is_branch_admin);
      }

      await clientToUse.from('firm_users').update(firmUserUpdates).eq('id', targetId);
      if (resolvedEmail) {
        await clientToUse.from('firm_users').update(firmUserUpdates).eq('email', resolvedEmail);
      }
    } catch (fuErr) {}

    // 4. Update in-memory server database
    const db = readDatabase();
    db.users = (db.users || []).map((u: any) => {
      if (u.id === targetId || (resolvedEmail && u.email?.toLowerCase() === resolvedEmail)) {
        return {
          ...u,
          name: resolvedName || u.name,
          email: resolvedEmail || u.email,
          role: resolvedRole || u.role,
          roleId: roleId || role_id || u.roleId,
          roleTitle: resolvedRoleTitle || u.roleTitle,
          branchName: resolvedBranch || u.branchName,
          branchId: resolvedBranchId || u.branchId,
          isSuperAdmin: isSuperAdmin !== undefined ? Boolean(isSuperAdmin) : u.isSuperAdmin,
          isBranchAdmin: isBranchAdmin !== undefined ? Boolean(isBranchAdmin) : u.isBranchAdmin,
          advocateRollNo: advocateRollNo || advocate_roll_no || u.advocateRollNo,
        };
      }
      return u;
    });
    writeDatabase(db);

    return res.json({
      success: true,
      message: 'Staff updated successfully across Auth user_metadata and profiles table',
      authUpdated,
      authError,
      profileUpdated,
      profile: profileData,
    });
  } catch (err: any) {
    console.error('Error in user update API route:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Internal user update failure' });
  }
};

// ==============================================================================
// User Provisioning API Route: Uses supabaseAdmin.auth.admin.createUser
// to securely provision credentials in Supabase Auth & public profiles
// ==============================================================================
const handleUserCreate = async (req: Request, res: Response) => {
  try {
    const {
      name,
      full_name,
      email,
      password,
      role,
      roleId,
      role_id,
      roleTitle,
      role_title,
      branch,
      branchName,
      branch_name,
      branchId,
      branch_id,
      isSuperAdmin,
      is_super_admin,
      isBranchAdmin,
      is_branch_admin,
      advocateRollNo,
      advocate_roll_no,
      mustChangePassword,
    } = req.body;

    const resolvedEmail = (email || '').trim().toLowerCase();
    const resolvedName = (name || full_name || '').trim();
    const rawPassword = (password || '').trim() || 'MK@Law2026';
    const resolvedRoleId = (roleId || role_id || role || 'role-advocate').trim();
    const resolvedRoleTitle = (roleTitle || role_title || '').trim();
    const resolvedBranchId = (branchId || branch_id || '').trim();
    const resolvedBranchName = (branchName || branch_name || branch || '').trim();

    if (!resolvedEmail) {
      return res.status(400).json({ success: false, error: 'Staff email address is required.' });
    }
    if (!resolvedName) {
      return res.status(400).json({ success: false, error: 'Staff full name is required.' });
    }
    if (rawPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    // Branch resolution helper inside server
    let finalBranchId = 'kla-hq';
    let finalBranchName = 'Kampala Central (Head Office)';
    const cleanB = (resolvedBranchName || resolvedBranchId || '').toLowerCase();
    if (resolvedBranchId === 'ftp-reg' || cleanB.includes('fort') || cleanB.includes('portal') || cleanB.includes('ftp')) {
      finalBranchId = 'ftp-reg';
      finalBranchName = 'Fort Portal Regional Office';
    } else if (resolvedBranchId === 'mbr-reg' || cleanB.includes('mbarara') || cleanB.includes('mbr')) {
      finalBranchId = 'mbr-reg';
      finalBranchName = 'Mbarara Regional Office';
    } else if (resolvedBranchId === 'msk-reg' || cleanB.includes('masaka') || cleanB.includes('msk')) {
      finalBranchId = 'msk-reg';
      finalBranchName = 'Masaka Regional Office';
    } else if (resolvedBranchId === 'jnj-reg' || cleanB.includes('jinja') || cleanB.includes('jnj')) {
      finalBranchId = 'jnj-reg';
      finalBranchName = 'Jinja Regional Office';
    } else if (resolvedBranchId === 'glu-reg' || cleanB.includes('gulu') || cleanB.includes('glu')) {
      finalBranchId = 'glu-reg';
      finalBranchName = 'Gulu Regional Office';
    } else if (resolvedBranchId === 'msn-reg' || cleanB.includes('masindi') || cleanB.includes('msn')) {
      finalBranchId = 'msn-reg';
      finalBranchName = 'Masindi Regional Office';
    } else {
      finalBranchId = 'kla-hq';
      finalBranchName = 'Kampala Central (Head Office)';
    }

    const isSuper = Boolean(isSuperAdmin ?? is_super_admin ?? resolvedRoleId === 'role-super-admin');
    const isBranch = Boolean(isBranchAdmin ?? is_branch_admin ?? resolvedRoleId === 'role-admin');

    const userMetadata: Record<string, any> = {
      full_name: resolvedName,
      name: resolvedName,
      role: resolvedRoleId,
      role_id: resolvedRoleId,
      role_title: resolvedRoleTitle || (isSuper ? 'Managing Partner (Super Admin)' : 'Litigation Lawyer / Associate'),
      branch: finalBranchName,
      branch_name: finalBranchName,
      branch_id: finalBranchId,
      is_super_admin: isSuper,
      is_branch_admin: isBranch,
      must_change_password: Boolean(mustChangePassword ?? true),
      advocate_roll_no: advocateRollNo || advocate_roll_no || '',
    };

    // 1. Invoke Supabase Auth admin API to create or update auth user
    let authUserId: string | null = null;
    let authUserCreated = false;
    let authError: string | null = null;

    try {
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = userList?.users?.find(
        (u) => u.email?.toLowerCase() === resolvedEmail
      );

      if (existingUser) {
        authUserId = existingUser.id;
        const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            password: rawPassword,
            user_metadata: userMetadata,
            email_confirm: true,
          }
        );
        if (updErr) {
          authError = updErr.message;
        } else {
          authUserCreated = true;
        }
      } else {
        const { data: createdAuth, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: resolvedEmail,
          password: rawPassword,
          email_confirm: true, // Mark confirmed so staff member can immediately log in
          user_metadata: userMetadata,
        });

        if (createErr) {
          authError = createErr.message;
          console.warn('[handleUserCreate] createUser notice:', createErr.message);
        } else if (createdAuth?.user) {
          authUserId = createdAuth.user.id;
          authUserCreated = true;
        }
      }
    } catch (authEx: any) {
      authError = authEx?.message || 'Supabase Auth admin createUser exception';
      console.warn('[handleUserCreate] Auth exception:', authEx);
    }

    const targetUserId = authUserId || `user-${Date.now()}`;

    // 2. Prepare profileRow and upsert into public profiles table
    const profileRow: Record<string, any> = {
      id: targetUserId,
      full_name: resolvedName,
      name: resolvedName,
      email: resolvedEmail,
      role: resolvedRoleId,
      role_id: resolvedRoleId,
      role_title: resolvedRoleTitle || userMetadata.role_title,
      branch: finalBranchName,
      branch_name: finalBranchName,
      branch_id: finalBranchId,
      is_super_admin: isSuper,
      is_branch_admin: isBranch,
      must_change_password: Boolean(mustChangePassword ?? true),
      updated_at: new Date().toISOString(),
    };

    let profileData: any = null;
    try {
      const { data: pData } = await supabaseAdmin
        .from('profiles')
        .upsert([profileRow], { onConflict: 'email' })
        .select('*');
      if (pData && pData.length > 0) {
        profileData = pData[0];
      }
    } catch (pe) {
      console.warn('[handleUserCreate] Profiles table upsert notice:', pe);
    }

    // 3. Keep public.firm_users table synchronized
    try {
      const firmUserRow: Record<string, any> = {
        id: targetUserId,
        name: resolvedName,
        email: resolvedEmail,
        role: resolvedRoleId,
        role_title: resolvedRoleTitle || userMetadata.role_title,
        branch_id: finalBranchId,
        branch_name: finalBranchName,
        is_super_admin: isSuper,
        is_branch_admin: isBranch,
        advocate_roll_no: advocateRollNo || advocate_roll_no || '',
      };
      await supabaseAdmin.from('firm_users').upsert([firmUserRow], { onConflict: 'email' });
    } catch (fe) {}

    // 4. Update in-memory server database
    const db = readDatabase();
    const newUserRecord = {
      id: targetUserId,
      name: resolvedName,
      email: resolvedEmail,
      role: (resolvedRoleId.replace('role-', '') || 'lawyer'),
      roleId: resolvedRoleId,
      roleTitle: resolvedRoleTitle || userMetadata.role_title,
      branchId: finalBranchId,
      branchName: finalBranchName,
      isSuperAdmin: isSuper,
      isBranchAdmin: isBranch,
      password: rawPassword,
      temporaryPassword: rawPassword,
      mustChangePassword: Boolean(mustChangePassword ?? true),
      advocateRollNo: advocateRollNo || advocate_roll_no || '',
    };

    const existingIdx = (db.users || []).findIndex((u: any) => u.email?.toLowerCase() === resolvedEmail);
    if (existingIdx >= 0) {
      db.users[existingIdx] = { ...db.users[existingIdx], ...newUserRecord };
    } else {
      db.users = [newUserRecord, ...(db.users || [])];
    }
    writeDatabase(db);

    return res.json({
      success: true,
      message: 'Staff account provisioned successfully in Supabase Auth & profiles table.',
      user: {
        ...newUserRecord,
        id: targetUserId,
      },
      authUserCreated,
      authUserId,
      authError,
      profile: profileData,
    });
  } catch (err: any) {
    console.error('Error in user create API route:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to provision staff account.' });
  }
};

app.post(['/api/users/create', '/api/users', '/api/staff/create'], handleUserCreate);
app.post(['/api/users/:id', '/api/users/update', '/api/staff/:id'], handleUserUpdate);
app.put(['/api/users/:id', '/api/staff/:id'], handleUserUpdate);

// Fresh profiles endpoint: queries public profiles table directly
app.get(['/api/profiles', '/api/users/profiles'], async (req: Request, res: Response) => {
  try {
    const authHeader = (req.headers.authorization || (req.headers as any)['Authorization'] || '') as string;
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const clientToUse = token
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          accessToken: async () => token,
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabaseAdmin;

    const { data: profiles, error } = await clientToUse
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && profiles && profiles.length > 0) {
      console.log(`[/api/profiles] Successfully returned ${profiles.length} fresh profiles from database.`);
      return res.json({ success: true, data: profiles });
    }

    if (error) {
      console.warn('[/api/profiles] Database query notice:', error.message);
    }

    // Fallback: query from local persistent database if profiles table is restricted by RLS
    const db = readDatabase();
    return res.json({ success: true, data: db.users || [] });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// One-click Central Database Backup Download
app.get('/api/database/backup', (req: Request, res: Response) => {
  const db = readDatabase();
  const dateStr = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=mk_firm_central_backup_${dateStr}.json`);
  res.send(JSON.stringify(db, null, 2));
});

// Download Supabase RLS Policies Migration Script
app.get(['/supabase_rls_policies.sql', '/api/supabase_rls_policies.sql'], (req: Request, res: Response) => {
  const filePath = path.resolve(__dirname, 'public/supabase_rls_policies.sql');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="supabase_rls_policies.sql"');
    res.sendFile(filePath);
  } else {
    res.status(404).send('RLS SQL file not found');
  }
});

// Download MySQL Database Schema Dump
app.get(['/mk_advocates_database.sql', '/api/mk_advocates_database.sql'], (req: Request, res: Response) => {
  const filePath = path.resolve(__dirname, 'public/mk_advocates_database.sql');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mk_advocates_database.sql"');
    res.sendFile(filePath);
  } else {
    res.status(404).send('SQL file not found');
  }
});

// Download/view cPanel db_config.php
app.get(['/api/db_config.php', '/db_config.php'], (req: Request, res: Response) => {
  const filePath = path.resolve(__dirname, 'public/api/db_config.php');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="db_config.php"');
    res.sendFile(filePath);
  } else {
    res.status(404).send('db_config.php not found');
  }
});

// Download/view cPanel index.php API router
app.get('/api/cpanel_index.php', (req: Request, res: Response) => {
  const filePath = path.resolve(__dirname, 'public/api/index.php');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="index.php"');
    res.sendFile(filePath);
  } else {
    res.status(404).send('index.php not found');
  }
});

// Search engine & AI crawler indexing disallow (Disallow: /)
app.get('/robots.txt', (_req: Request, res: Response) => {
  const robotsTxt = [
    'User-agent: *',
    'Disallow: /',
    '',
    'User-agent: Google-Extended',
    'Disallow: /',
    '',
    'User-agent: GPTBot',
    'Disallow: /',
    '',
    'User-agent: ChatGPT-User',
    'Disallow: /',
    '',
    'User-agent: ClaudeBot',
    'Disallow: /',
    '',
    'User-agent: anthropic-ai',
    'Disallow: /',
    '',
    'User-agent: CCBot',
    'Disallow: /',
    '',
    'User-agent: Bytespider',
    'Disallow: /',
    '',
    'User-agent: PerplexityBot',
    'Disallow: /',
    '',
    'User-agent: Applebot-Extended',
    'Disallow: /',
    '',
    'User-agent: Diffbot',
    'Disallow: /',
    '',
    'User-agent: FacebookBot',
    'Disallow: /',
    '',
    'User-agent: Scrapy',
    'Disallow: /',
    '',
    'User-agent: omgilibot',
    'Disallow: /',
    '',
    'User-agent: cohere-ai',
    'Disallow: /',
  ].join('\n');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.send(robotsTxt);
});

// Dev vs Prod Vite Integration
async function start() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    // Mount Vite middleware in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MK Central Core] Server running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Fatal server boot failure:', err);
});
