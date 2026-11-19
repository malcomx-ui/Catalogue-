import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
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
  cases: [] as any[],
  hearings: [] as any[],
  documents: [] as any[],
  mortgages: [] as any[],
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
      can_import_mortgages: true,
      canImportMortgages: true,
      isSuspended: false,
      suspendedReason: '',
      password: 'Admin@2026',
      temporaryPassword: '',
      mustChangePassword: false,
      advocateRollNo: '',
    },
  ] as Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    roleId: string;
    roleTitle: string;
    branchId: string;
    branchName: string;
    isSuperAdmin: boolean;
    isBranchAdmin: boolean;
    can_import_mortgages?: boolean;
    canImportMortgages?: boolean;
    isSuspended?: boolean;
    suspendedReason?: string;
    password?: string;
    temporaryPassword?: string;
    mustChangePassword?: boolean;
    advocateRollNo?: string;
  }>,
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
        can_import_mortgages: true,
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
        can_import_mortgages: false,
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
      id: 'role-admin-finance-assistant',
      name: 'Admin & Finance Assistant',
      description: 'Firm-wide read visibility across all branches with full create, edit, and delete authority strictly within their assigned branch station.',
      isSuperAdmin: false,
      isSystem: true,
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      permissions: {
        canViewAllBranches: true,
        canCreateCases: true,
        canEditCases: true,
        canDeleteCases: true,
        canBulkImport: false,
        can_import_mortgages: false,
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
      },
    },
    {
      id: 'role-team-lead',
      name: 'Regional Team Lead',
      description: 'Supervises branch advocates, reviews pleadings, conducts high-value trials, and assigns regional litigation briefs.',
      isSuperAdmin: false,
      isSystem: true,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      permissions: {
        canViewAllBranches: true,
        canCreateCases: true,
        canEditCases: true,
        canDeleteCases: true,
        canBulkImport: false,
        can_import_mortgages: false,
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
        can_import_mortgages: false,
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
        can_import_mortgages: false,
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
      const parsedRoles = Array.isArray(parsed.roles) && parsed.roles.length > 0 ? parsed.roles : DEFAULT_DATABASE.roles;
      const mergedRoles = parsedRoles.map((r: any) => {
        const sysRole = DEFAULT_DATABASE.roles.find((d) => d.id === r?.id);
        if (!sysRole) return r;
        if (sysRole.id === 'role-admin') {
          return {
            ...r,
            ...sysRole,
            isSuperAdmin: false,
            isSystem: true,
            permissions: {
              ...sysRole.permissions,
              ...(r.permissions || {}),
              canViewAllBranches: false,
              canBulkImport: false,
              can_import_mortgages: false,
              canBulkExport: false,
              canManageRoles: false,
              canManageUsers: false,
              canManageBranches: false,
            },
          };
        }
        return {
          ...r,
          ...sysRole,
          isSystem: true,
          permissions: {
            ...sysRole.permissions,
            ...(r.permissions || {}),
          },
        };
      });
      DEFAULT_DATABASE.roles.forEach((sysRole) => {
        if (!mergedRoles.some((r: any) => r.id === sysRole.id)) {
          mergedRoles.push(sysRole);
        }
      });

      return {
        ...DEFAULT_DATABASE,
        ...parsed,
        cases: Array.isArray(parsed.cases) ? parsed.cases : [],
        hearings: Array.isArray(parsed.hearings) ? parsed.hearings : [],
        documents: Array.isArray(parsed.documents) ? parsed.documents : [],
        mortgages: Array.isArray(parsed.mortgages) ? parsed.mortgages : [],
        branches: Array.isArray(parsed.branches) && parsed.branches.length > 0 ? parsed.branches : DEFAULT_DATABASE.branches,
        users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : DEFAULT_DATABASE.users,
        roles: mergedRoles,
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
  // Enforce zero-indexing, strict referrer privacy, and anti-AI training headers
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, notranslate, noimageindex');
  res.setHeader('X-AI-Training', 'prohibited');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Permissions-Policy', 'interest-cohort=(), browsing-topics=(), conversion-measurement=(), attribution-reporting=()');

  // Prevent caching of confidential client matters and database records
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Block unauthorized direct access to sensitive workspace files and databases
  const normalizedPath = req.path.toLowerCase();
  const restrictedPaths = ['/server_data', '/.env', '/.git', '/metadata.json', '/package.json', '/tsconfig.json'];
  if (restrictedPaths.some((p) => normalizedPath.startsWith(p))) {
    return res.status(403).json({
      error: 'Access Denied: Protected firm workspace boundary.',
    });
  }

  // Intercept and block AI Studio, AI scrapers, telemetry harvesters, and automated web crawlers
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const blockedAgents = [
    'gptbot',
    'chatgpt-user',
    'google-extended',
    'google-inspectiontool',
    'aistudio',
    'ai-studio',
    'claudebot',
    'claude-web',
    'anthropic',
    'ccbot',
    'bytespider',
    'diffbot',
    'perplexitybot',
    'applebot-extended',
    'omgilibot',
    'cohere-ai',
    'scrapy',
    'timpibot',
    'youbot',
    'headlesschrome',
    'puppeteer',
    'phantomjs',
    'selenium',
  ];

  if (blockedAgents.some((bot) => userAgent.includes(bot))) {
    return res.status(403).json({
      error: 'Access Forbidden: MK Advocates privacy perimeter blocks external AI indexing, telemetry, and automated data scraping.',
    });
  }

  next();
});

// CORS headers for local / cross-origin / cPanel proxy access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-user-email, x-user-role, x-user-branch-id'
  );
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
  const { cases, hearings, documents, mortgages, branches, users, roles, systemSettings } = req.body;
  const current = readDatabase();

  // Protect server-persisted staff records and credentials against stale client /api/database overwrites
  let mergedUsers: any[] = Array.isArray(current.users) ? [...current.users] : [];
  if (Array.isArray(users)) {
    const mergedByEmail = new Map<string, any>();
    (current.users || []).forEach((u: any) => {
      const em = String(u?.email || '').trim().toLowerCase();
      const key = em || (u?.id ? `id:${u.id}` : '');
      if (key) mergedByEmail.set(key, u);
    });
    users.forEach((incoming: any) => {
      const em = String(incoming?.email || '').trim().toLowerCase();
      const key = em || (incoming?.id ? `id:${incoming.id}` : '');
      if (!key) return;
      const existing = mergedByEmail.get(key);
      if (existing) {
        const exTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const inTime = incoming?.updatedAt ? new Date(incoming.updatedAt).getTime() : 0;
        if (exTime >= inTime) {
          mergedByEmail.set(key, {
            ...incoming,
            ...existing,
            password: existing.password || incoming.password,
            temporaryPassword: existing.temporaryPassword ?? incoming.temporaryPassword,
          });
        } else {
          mergedByEmail.set(key, {
            ...existing,
            ...incoming,
            password: incoming.password || existing.password,
          });
        }
      } else {
        mergedByEmail.set(key, incoming);
      }
    });
    mergedUsers = Array.from(mergedByEmail.values());
  }

  const updated = {
    ...current,
    cases: Array.isArray(cases) ? cases : current.cases,
    hearings: Array.isArray(hearings) ? hearings : current.hearings,
    documents: Array.isArray(documents) ? documents : current.documents,
    mortgages: Array.isArray(mortgages) ? mortgages : (current as any).mortgages || [],
    branches: Array.isArray(branches) ? branches : current.branches,
    users: mergedUsers,
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
      mortgageCount: ((updated as any).mortgages || []).length,
    });
  } else {
    res.status(500).json({ success: false, error: 'Failed to write central database file.' });
  }
});

// Proxy endpoint for live cases fetching to bridge browser restrictions/CORS if any
app.get('/api/cases', async (req: Request, res: Response) => {
  try {
    const db = readDatabase();
    const localCases: any[] = Array.isArray(db.cases) ? db.cases : [];

    // 1. Try querying remote Supabase directly via server-side client
    const { data, error } = await supabaseAdmin
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const localById = new Map<string, any>();
      localCases.forEach((lc: any) => {
        if (lc?.id) localById.set(String(lc.id), lc);
      });

      const remoteIds = new Set<string>(data.map((r: any) => String(r?.id || '')).filter(Boolean));

      // Preserve newer local progressiveNotes / fileMovementHistory / transferHistory if DB lacks those columns
      const mergedRemote = data.map((row: any) => {
        const local = row?.id ? localById.get(String(row.id)) : null;
        if (!local) return row;
        return {
          ...row,
          progressiveNotes: Array.isArray(row.progressive_notes) && row.progressive_notes.length > 0
            ? row.progressive_notes
            : (local.progressiveNotes || []),
          fileMovementHistory: Array.isArray(row.file_movement_history) && row.file_movement_history.length > 0
            ? row.file_movement_history
            : (local.fileMovementHistory || []),
          transferHistory: Array.isArray(row.transfer_history) && row.transfer_history.length > 0
            ? row.transfer_history
            : (local.transferHistory || []),
        };
      });

      // Retain unsynced workstation-only cases (e.g. saved locally when remote Supabase trigger blocked direct insert)
      const unsyncedLocal = localCases.filter(
        (lc: any) => lc?.id && String(lc.id).startsWith('case-') && !remoteIds.has(String(lc.id))
      );
      const merged = [...unsyncedLocal, ...mergedRemote];

      if (merged.length > 0) {
        (db as any).cases = merged;
        writeDatabase(db);
      }
      return res.json({ success: true, data: merged, source: 'supabase' });
    }

    // 2. Fallback to local workstation database
    res.json({ success: true, data: localCases, source: 'local_database' });
  } catch (err: any) {
    const db = readDatabase();
    res.json({ success: true, data: db.cases || [], source: 'local_database', warning: err.message });
  }
});

app.post('/api/cases', async (req: Request, res: Response) => {
  try {
    const db = readDatabase();
    const rawBody = { ...(req.body || {}) };
    const skipSupabaseSync = Boolean(rawBody._skipSupabaseSync);
    const callerUserId = String(rawBody._userId || '').trim();
    const callerEmail = String(rawBody._userEmail || '').trim().toLowerCase();
    delete rawBody._skipSupabaseSync;
    delete rawBody._userId;
    delete rawBody._userEmail;

    const id = rawBody.id || `case-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();
    const branchMeta = resolveCanonicalBranch(
      rawBody.branchId || rawBody.branch_id,
      rawBody.branchName || rawBody.branch_name || rawBody.branch
    );
    let record: any = {
      ...rawBody,
      id,
      branchId: branchMeta.id,
      branch_id: branchMeta.id,
      branchName: branchMeta.name,
      branch_name: branchMeta.name,
      branch: branchMeta.name,
      lastUpdated: rawBody.lastUpdated || nowIso,
    };

    let supabaseSynced = !skipSupabaseSync ? false : true;
    let supabaseError: string | null = null;

    if (!skipSupabaseSync) {
      try {
        const sbClient = getSupabaseClientForRequest(req);
        // Proactively ensure caller's profile branch_id is populated when possible
        if (callerUserId && isUuidString(callerUserId)) {
          await safeProfileMutation(
            'update-id',
            { branch_id: branchMeta.id, branch_name: branchMeta.name, branch: branchMeta.name, updated_at: nowIso },
            callerUserId,
            sbClient
          ).catch(() => {});
        } else if (callerEmail) {
          await safeProfileMutation(
            'update-email',
            { branch_id: branchMeta.id, branch_name: branchMeta.name, branch: branchMeta.name, updated_at: nowIso },
            callerEmail,
            sbClient
          ).catch(() => {});
        }

        const rawCaseNo = String(record.suitNumber || record.case_number || '').trim();
        const clientVal = String(record.clientName || record.client || record.client_name || '').trim();
        const summaryVal = String(record.subject_matter || record.briefSummary || '').trim();
        const instDate = record.date_of_instructions || record.filingDate || nowIso.split('T')[0];
        const hearDate = record.hearing_date || record.nextHearingDate || null;

        const sbRow: Record<string, any> = {
          case_number: rawCaseNo,
          suit_number: rawCaseNo,
          suit_no: record.suit_no || '',
          firm_ref_number: record.firmRefNumber || '',
          title: record.title || '',
          client_name: clientVal,
          client: clientVal,
          court: record.court || 'High Court of Uganda',
          division: record.division || (record.case_type ? `${record.case_type} Division` : 'High Court (Civil Division)'),
          presiding_judge: record.presidingJudge || '',
          court_station: record.courtStation || record.district || '',
          district: record.district || record.courtStation || '',
          stage: record.stage || 'Pleadings & Defense',
          priority: record.priority || 'Standard',
          branch_id: branchMeta.id,
          branch_name: branchMeta.name,
          branch: branchMeta.name,
          lead_advocate: record.leadAdvocate || record.person_in_conduct || '',
          person_in_conduct: record.person_in_conduct || record.leadAdvocate || '',
          persons_in_conduct: Array.isArray(record.persons_in_conduct) ? record.persons_in_conduct : [],
          assisting_advocates: Array.isArray(record.assistingAdvocates) ? record.assistingAdvocates : [],
          parties: Array.isArray(record.parties) ? record.parties : [],
          opposing_firm: record.opposingFirm || '',
          opposing_counsel: record.opposingCounsel || '',
          claim_value_ugx: Number(record.claimValueUGX) || 0,
          filing_date: instDate,
          date_of_instructions: instDate,
          hearing_date: hearDate || null,
          next_hearing_date: hearDate || null,
          next_hearing_purpose: record.nextHearingPurpose || '',
          status: record.status || 'Active',
          year_of_closure: record.year_of_closure || null,
          case_type: record.case_type || 'Civil',
          billing_status: record.billing_status || '',
          payment_status: record.payment_status || '',
          brief_summary: summaryVal,
          subject_matter: summaryVal,
          notes: record.notes || '',
          target: record.target || '',
          verdict: record.verdict || '',
          file_location: record.file_location || 'Central Registry Safe',
          progressive_notes: Array.isArray(record.progressiveNotes) ? record.progressiveNotes : [],
          file_movement_history: Array.isArray(record.fileMovementHistory) ? record.fileMovementHistory : [],
          transfer_history: Array.isArray(record.transferHistory) ? record.transferHistory : [],
          updated_at: nowIso,
        };

        for (let attempt = 0; attempt < 25; attempt++) {
          if (Object.keys(sbRow).length === 0) break;
          const { data: sbData, error: sbErr } = await sbClient.from('cases').insert([sbRow]).select('*');
          if (!sbErr && sbData && sbData.length > 0) {
            supabaseSynced = true;
            record = {
              ...record,
              ...sbData[0],
              id: sbData[0].id || record.id,
              progressiveNotes: record.progressiveNotes,
              fileMovementHistory: record.fileMovementHistory,
              transferHistory: record.transferHistory,
            };
            break;
          }
          const missingColMatch = String(sbErr?.message || sbErr?.details || '').match(
            /Could not find the '([^']+)' column|column "([^"]+)" of relation "[^"]+" does not exist/i
          );
          const missingCol = missingColMatch?.[1] || missingColMatch?.[2];
          if (missingCol && missingCol in sbRow) {
            delete sbRow[missingCol];
            continue;
          }
          if (sbErr) {
            supabaseError = sbErr.message || String(sbErr.code || 'Supabase insert error');
          }
          break;
        }
      } catch (sbEx: any) {
        supabaseError = sbEx?.message || 'Supabase cloud write exception';
      }
    }

    const list: any[] = Array.isArray(db.cases) ? db.cases : [];
    const idx = list.findIndex((c: any) => String(c.id) === String(record.id) || String(c.id) === String(id));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...record };
    } else {
      list.unshift(record);
    }
    (db as any).cases = list;
    writeDatabase(db);
    return res.json({ success: true, data: record, supabaseSynced, supabaseError });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to save case in workstation DB.' });
  }
});

app.post('/api/cases/batch', (req: Request, res: Response) => {
  try {
    const incoming = Array.isArray(req.body?.cases) ? req.body.cases : Array.isArray(req.body) ? req.body : [];
    if (incoming.length === 0) {
      return res.status(400).json({ success: false, error: 'Cases array is required.' });
    }
    const db = readDatabase();
    const existing: any[] = Array.isArray(db.cases) ? db.cases : [];
    const byId = new Map<string, number>();
    existing.forEach((c: any, idx: number) => {
      if (c?.id) byId.set(String(c.id), idx);
    });
    const nowIso = new Date().toISOString();
    const saved: any[] = [];
    const newItems: any[] = [];

    incoming.forEach((item: any, idx: number) => {
      const id = item?.id || `case-imp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
      const branchMeta = resolveCanonicalBranch(
        item?.branchId || item?.branch_id,
        item?.branchName || item?.branch_name || item?.branch
      );
      const normalized = {
        ...item,
        id,
        branchId: branchMeta.id,
        branch_id: branchMeta.id,
        branchName: branchMeta.name,
        branch_name: branchMeta.name,
        branch: branchMeta.name,
        lastUpdated: item?.lastUpdated || nowIso,
      };
      saved.push(normalized);
      const existingIdx = byId.get(String(id));
      if (existingIdx !== undefined) {
        existing[existingIdx] = { ...existing[existingIdx], ...normalized };
      } else {
        newItems.push(normalized);
      }
    });

    (db as any).cases = [...newItems, ...existing];
    writeDatabase(db);
    return res.json({ success: true, count: saved.length, data: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to batch save cases.' });
  }
});

app.put('/api/cases/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = { ...(req.body || {}), lastUpdated: new Date().toISOString() };
    const db = readDatabase();
    const list: any[] = Array.isArray(db.cases) ? db.cases : [];
    const idx = list.findIndex((c: any) => String(c.id) === String(id));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates, id };
    } else {
      list.unshift({ ...updates, id });
    }
    (db as any).cases = list;
    writeDatabase(db);
    return res.json({ success: true, data: list[idx >= 0 ? idx : 0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to update case in workstation DB.' });
  }
});

app.delete('/api/cases/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = readDatabase();
    db.cases = (db.cases || []).filter((c: any) => String(c.id) !== String(id));
    writeDatabase(db);
    return res.json({ success: true, deletedId: id });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to delete case from workstation DB.' });
  }
});

// ==============================================================================
// Mortgages Register API Endpoints (Local Workstation & Cloud Dual-Sync)
// ==============================================================================
function isSuperAdminOnlyBank(bank?: string | null): boolean {
  const clean = String(bank || '').trim().toLowerCase();
  if (!clean) return false;
  return (
    clean === 'i&m bank' ||
    clean === 'i & m bank' ||
    clean === 'im bank' ||
    clean.includes('i&m') ||
    clean.includes('i & m') ||
    clean === 'bank of baroda' ||
    clean === 'baroda' ||
    clean.includes('baroda') ||
    clean === 'kcb' ||
    clean === 'kcb bank' ||
    clean === 'kcb bank uganda' ||
    clean.startsWith('kcb ')
  );
}

app.get('/api/mortgages', (req: Request, res: Response) => {
  try {
    const db = readDatabase();
    const actor = resolveRequestActor(req, db);
    let records: any[] = (db as any).mortgages || [];

    if (actor.hasActor && !actor.isSuperAdmin) {
      records = records.filter(
        (m) => !isSuperAdminOnlyBank(m?.client_bank_name || m?.bank_name)
      );
    }

    const { record_year, client_bank_name } = req.query;
    if (record_year) {
      records = records.filter((m) => !m.record_year || String(m.record_year) === String(record_year));
    }
    if (client_bank_name) {
      const targetBank = String(client_bank_name).trim().toLowerCase();
      records = records.filter((m) => {
        const cb = String(m.client_bank_name || '').trim().toLowerCase();
        const bn = String(m.bank_name || '').trim().toLowerCase();
        return cb === targetBank || bn === targetBank || cb.includes(targetBank) || bn.includes(targetBank);
      });
    }

    res.json({
      success: true,
      data: records,
      total: records.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, data: [] });
  }
});

const IMPORT_MORTGAGES_AUTHORIZED_EMAILS = ['phionaadoch@mkadvocates.ug'];

function isExplicitMortgageImportEmail(email?: string | null): boolean {
  const clean = String(email || '').trim().toLowerCase();
  return IMPORT_MORTGAGES_AUTHORIZED_EMAILS.includes(clean);
}

function resolveRequestActor(req: Request, db: typeof DEFAULT_DATABASE) {
  let tokenPayload: any = null;
  const authHeader = String(req.headers.authorization || (req.headers as any)['Authorization'] || '');
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token && token.split('.').length === 3) {
    try {
      tokenPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
    } catch {}
  }

  const hdrId = String(req.headers['x-user-id'] || tokenPayload?.sub || '').trim();
  const hdrEmail = String(req.headers['x-user-email'] || tokenPayload?.email || '').trim().toLowerCase();
  const hdrRole = String(req.headers['x-user-role'] || tokenPayload?.user_metadata?.role_id || tokenPayload?.user_metadata?.role || '').trim();
  const hdrBranch = String(req.headers['x-user-branch-id'] || tokenPayload?.user_metadata?.branch_id || '').trim();

  const matchedDbUser = (db.users || []).find(
    (u: any) => (hdrId && u.id === hdrId) || (hdrEmail && String(u.email || '').trim().toLowerCase() === hdrEmail)
  );

  const hasActor = Boolean(hdrId || hdrEmail || hdrRole || hdrBranch || matchedDbUser);
  const actorEmail = hdrEmail || String(matchedDbUser?.email || '').toLowerCase();
  const roleMeta = resolveCanonicalRole(
    matchedDbUser?.roleId || matchedDbUser?.role || hdrRole,
    matchedDbUser?.roleTitle,
    matchedDbUser?.isSuperAdmin,
    actorEmail
  );
  const branchMeta = resolveCanonicalBranch(
    matchedDbUser?.branchId || hdrBranch,
    matchedDbUser?.branchName
  );
  const matchedRole = (db.roles || []).find((r: any) => r.id === roleMeta.roleId);
  const canImportMortgages = Boolean(
    roleMeta.isSuperAdmin ||
      isExplicitMortgageImportEmail(actorEmail) ||
      matchedDbUser?.can_import_mortgages ||
      matchedDbUser?.canImportMortgages ||
      matchedRole?.permissions?.can_import_mortgages ||
      (matchedRole?.permissions as any)?.canImportMortgages ||
      tokenPayload?.user_metadata?.can_import_mortgages ||
      tokenPayload?.user_metadata?.canImportMortgages
  );

  return {
    hasActor,
    id: hdrId || matchedDbUser?.id || '',
    email: actorEmail,
    roleId: roleMeta.roleId,
    role: roleMeta.role,
    isSuperAdmin: roleMeta.isSuperAdmin,
    canImportMortgages,
    hasMatchedDbUser: Boolean(matchedDbUser),
    branchId: branchMeta.id,
    branchName: branchMeta.name,
  };
}

function getRecordBranchId(record: any): string | null {
  if (!record) return null;
  const rawFirmId = String(record.branch_id || record.branchId || '').trim();
  const rawFirmName = String(
    record.firm_branch_station || record.firmBranchStation || record.branch_name || record.branchName || ''
  ).trim();
  if (rawFirmId || rawFirmName) {
    return resolveCanonicalBranch(rawFirmId, rawFirmName).id;
  }
  const bankLower = String(record.bank_name || record.client_bank_name || '').trim().toLowerCase();
  if (bankLower === 'centenary bank') {
    return null;
  }
  // Legacy fallback only when no firm branch columns exist
  const legacyName = String(record.branch || record.client_branch_location || '').trim();
  if (!legacyName) return null;
  return resolveCanonicalBranch('', legacyName).id;
}

function canActorModifyMortgage(actor: ReturnType<typeof resolveRequestActor>, record: any): boolean {
  if (!actor.hasActor || actor.isSuperAdmin) return true;
  const bankLower = String(record?.bank_name || record?.client_bank_name || '').trim().toLowerCase();
  const hasFirmBranch = Boolean(
    String(record?.branch_id || record?.branchId || record?.firm_branch_station || record?.firmBranchStation || record?.branch_name || record?.branchName || '').trim()
  );
  if (bankLower === 'centenary bank' && !hasFirmBranch) {
    return actor.roleId !== 'role-clerk' && actor.role !== 'clerk';
  }
  const recordBranchId = getRecordBranchId(record);
  if (!recordBranchId) return false;
  return recordBranchId === actor.branchId;
}

app.post('/api/mortgages', (req: Request, res: Response) => {
  try {
    const db = readDatabase();
    const actor = resolveRequestActor(req, db);
    const currentList: any[] = (db as any).mortgages || [];
    const payload = { ...(req.body || {}) };

    const targetBank = payload.client_bank_name || payload.bank_name || 'Centenary Bank';
    if (actor.hasActor && !actor.isSuperAdmin && isSuperAdminOnlyBank(targetBank)) {
      return res.status(403).json({
        success: false,
        error:
          'Restricted: This lending institution (I&M Bank, Bank of Baroda, KCB) is currently limited to Super Admin access.',
      });
    }
    const isCentenary = String(targetBank).trim().toLowerCase() === 'centenary bank';

    // 1. Firm Branch Station (MK Advocates Office) - omitted for Centenary Bank
    const rawFirmBranchId = isCentenary ? '' : String(payload.branch_id || payload.branchId || '').trim();
    const rawFirmBranchName = isCentenary
      ? ''
      : String(
          payload.firm_branch_station || payload.firmBranchStation || payload.branch_name || payload.branchName || ''
        ).trim();

    let resolvedFirmBranch: { id: string; name: string };
    if (isCentenary) {
      resolvedFirmBranch = { id: '', name: '' };
    } else if (!rawFirmBranchId && !rawFirmBranchName) {
      resolvedFirmBranch = actor.hasActor
        ? { id: actor.branchId, name: actor.branchName }
        : { id: 'kla-hq', name: 'Kampala Central (Head Office)' };
    } else {
      resolvedFirmBranch = resolveCanonicalBranch(rawFirmBranchId, rawFirmBranchName);
    }

    if (!isCentenary && actor.hasActor && !actor.isSuperAdmin && resolvedFirmBranch.id !== actor.branchId) {
      return res.status(403).json({
        success: false,
        error: `Branch restriction: You can only create mortgage files assigned to ${actor.branchName}.`,
      });
    }

    // 2. Bank Branch Station (Lending Bank Handling Branch, e.g. Centenary Bank Kamwenge Branch)
    const rawBankBranch = String(
      payload.bank_branch_station ??
        payload.bankBranchStation ??
        payload.bank_branch ??
        payload.client_branch_location ??
        payload.branch ??
        ''
    ).trim();

    const id = payload.id || `mort-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const clientName = payload.client_name || payload.mortgagor_name || payload.borrower_name || payload.name || '';
    const firmBranchLabel = isCentenary ? '' : rawFirmBranchName || resolvedFirmBranch.name;

    const newRecord = {
      ...payload,
      id,
      client_bank_name: targetBank,
      bank_name: targetBank,
      client_name: clientName,
      mortgagor_name: clientName,
      borrower_name: clientName,
      bank_branch_station: rawBankBranch,
      bank_branch: rawBankBranch,
      client_branch_location: rawBankBranch,
      branch: rawBankBranch,
      firm_branch_station: firmBranchLabel,
      branch_id: isCentenary ? '' : resolvedFirmBranch.id,
      branch_name: firmBranchLabel,
      created_at: payload.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Check if record already exists by ID
    const existingIndex = currentList.findIndex((m) => m.id === id);
    if (existingIndex >= 0) {
      if (!canActorModifyMortgage(actor, currentList[existingIndex])) {
        return res.status(403).json({
          success: false,
          error: `View-only access: This mortgage file belongs to another branch. You may only modify files assigned to ${actor.branchName}.`,
        });
      }
      currentList[existingIndex] = { ...currentList[existingIndex], ...newRecord };
    } else {
      currentList.unshift(newRecord);
    }

    (db as any).mortgages = currentList;
    writeDatabase(db);

    res.json({
      success: true,
      data: newRecord,
      message: 'Mortgage record saved successfully in workstation database.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/mortgages/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = { ...(req.body || {}) };
    const db = readDatabase();
    const actor = resolveRequestActor(req, db);
    const currentList: any[] = (db as any).mortgages || [];

    const index = currentList.findIndex((m) => String(m.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Mortgage file not found' });
    }

    const existing = currentList[index];
    if (
      actor.hasActor &&
      !actor.isSuperAdmin &&
      (isSuperAdminOnlyBank(existing?.client_bank_name || existing?.bank_name) ||
        isSuperAdminOnlyBank(updates.client_bank_name || updates.bank_name))
    ) {
      return res.status(403).json({
        success: false,
        error:
          'Restricted: This lending institution (I&M Bank, Bank of Baroda, KCB) is currently limited to Super Admin access.',
      });
    }
    if (!canActorModifyMortgage(actor, existing)) {
      return res.status(403).json({
        success: false,
        error: `View-only access: You can only edit mortgage files strictly belonging to ${actor.branchName}.`,
      });
    }

    // Bank Branch Station updates never overwrite firm_branch_station / branch_id / branch_name
    if (
      updates.bank_branch_station !== undefined ||
      updates.bankBranchStation !== undefined ||
      updates.bank_branch !== undefined ||
      updates.client_branch_location !== undefined ||
      updates.branch !== undefined
    ) {
      const bankBr = String(
        updates.bank_branch_station ??
          updates.bankBranchStation ??
          updates.bank_branch ??
          updates.client_branch_location ??
          updates.branch ??
          ''
      ).trim();
      updates.bank_branch_station = bankBr;
      updates.bank_branch = bankBr;
      updates.client_branch_location = bankBr;
      updates.branch = bankBr;
    }

    // Firm Branch Station updates only check/update firm branch fields
    const incomingFirmBranchId = String(updates.branch_id || updates.branchId || '').trim();
    const incomingFirmBranchName = String(
      updates.firm_branch_station || updates.firmBranchStation || updates.branch_name || updates.branchName || ''
    ).trim();
    if (incomingFirmBranchId || incomingFirmBranchName) {
      const targetFirmBranch = resolveCanonicalBranch(incomingFirmBranchId, incomingFirmBranchName);
      if (actor.hasActor && !actor.isSuperAdmin && targetFirmBranch.id !== actor.branchId) {
        return res.status(403).json({
          success: false,
          error: `Cross-branch transfer is restricted. You cannot reassign this file away from ${actor.branchName}.`,
        });
      }
      updates.branch_id = targetFirmBranch.id;
      updates.firm_branch_station = incomingFirmBranchName || targetFirmBranch.name;
      updates.branch_name = incomingFirmBranchName || targetFirmBranch.name;
    }

    currentList[index] = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    (db as any).mortgages = currentList;
    writeDatabase(db);

    res.json({
      success: true,
      data: currentList[index],
      message: 'Mortgage record updated successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/mortgages/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = readDatabase();
    const actor = resolveRequestActor(req, db);
    const currentList: any[] = (db as any).mortgages || [];

    const target = currentList.find((m) => String(m.id) === String(id));
    if (
      target &&
      actor.hasActor &&
      !actor.isSuperAdmin &&
      isSuperAdminOnlyBank(target?.client_bank_name || target?.bank_name)
    ) {
      return res.status(403).json({
        success: false,
        error:
          'Restricted: This lending institution (I&M Bank, Bank of Baroda, KCB) is currently limited to Super Admin access.',
      });
    }
    if (target && !canActorModifyMortgage(actor, target)) {
      return res.status(403).json({
        success: false,
        error: `View-only access: You can only delete mortgage files strictly belonging to ${actor.branchName}.`,
      });
    }

    const filtered = currentList.filter((m) => String(m.id) !== String(id));
    (db as any).mortgages = filtered;
    writeDatabase(db);

    res.json({
      success: true,
      message: 'Mortgage record deleted successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk batch insert endpoint for centenary_mortgage_cases / mortgages
app.post('/api/mortgages/batch', async (req: Request, res: Response) => {
  try {
    const db = readDatabase();
    const actor = resolveRequestActor(req, db);
    let isAuthorizedForImport = Boolean(actor.hasActor && (actor.isSuperAdmin || actor.canImportMortgages));

    // Verify authoritative Supabase profile when an actor identity is provided
    if (actor.hasActor && (actor.id || actor.email)) {
      try {
        const sbClient = getSupabaseClientForRequest(req);
        let prof: any = null;
        if (actor.id && /^[0-9a-f-]{36}$/i.test(actor.id)) {
          const { data } = await sbClient.from('profiles').select('*').eq('id', actor.id).maybeSingle();
          if (data) prof = data;
        }
        if (!prof && actor.email) {
          const { data } = await sbClient.from('profiles').select('*').ilike('email', actor.email).maybeSingle();
          if (data) prof = data;
        }
        if (prof) {
          const profRoleMeta = resolveCanonicalRole(
            prof.role_id || prof.role,
            prof.role_title,
            prof.is_super_admin,
            prof.email || actor.email
          );
          const matchedRole = (db.roles || []).find((r: any) => r.id === profRoleMeta.roleId);
          const matchedDbUser = (db.users || []).find(
            (u: any) =>
              (actor.id && u.id === actor.id) ||
              (actor.email && String(u.email || '').trim().toLowerCase() === actor.email)
          );
          isAuthorizedForImport = Boolean(
            profRoleMeta.isSuperAdmin ||
              isExplicitMortgageImportEmail(prof.email || actor.email) ||
              prof.can_import_mortgages === true ||
              matchedDbUser?.can_import_mortgages === true ||
              matchedDbUser?.canImportMortgages === true ||
              matchedRole?.permissions?.can_import_mortgages === true ||
              (matchedRole?.permissions as any)?.canImportMortgages === true
          );
        }
      } catch (authCheckErr) {
        console.warn('[POST /api/mortgages/batch] Profile RBAC verification notice:', authCheckErr);
      }
    }

    if (!actor.hasActor || !isAuthorizedForImport) {
      return res.status(403).json({
        success: false,
        error:
          'Forbidden: Bulk mortgage import requires a Super Admin role or explicit can_import_mortgages permission.',
      });
    }

    const { records, bank_name } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'Records array is required' });
    }
    if (
      !actor.isSuperAdmin &&
      (isSuperAdminOnlyBank(bank_name) ||
        records.some((r: any) => isSuperAdminOnlyBank(r?.bank_name || r?.client_bank_name)))
    ) {
      return res.status(403).json({
        success: false,
        error:
          'Restricted: Bulk importing into I&M Bank, Bank of Baroda, or KCB is currently limited to Super Admin users.',
      });
    }

    const currentMortgages: any[] = (db as any).mortgages || [];
    const centenaryCases: any[] = (db as any).centenary_mortgage_cases || [];

    const now = new Date().toISOString();
    const normalizedNewMortgages: any[] = [];
    const normalizedCentenary: any[] = [];

    records.forEach((r: any) => {
      const id = r.id || `mort-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const clientName = r.client_name || r.borrower_name || r.name || 'Unknown Client';
      const targetBank = r.bank_name || r.client_bank_name || bank_name || 'Centenary Bank';
      const isCentenary = String(targetBank).trim().toLowerCase() === 'centenary bank';
      const bankBranchName = String(
        r.bank_branch_station ?? r.bankBranchStation ?? r.bank_branch ?? r.client_branch_location ?? r.branch ?? ''
      ).trim();
      const rawFirmBranchName = isCentenary
        ? ''
        : String(
            r.firm_branch_station || r.firmBranchStation || r.branch_name || r.branchName || (actor.hasActor ? actor.branchName : 'Kampala Central (Head Office)')
          ).trim();
      const resolvedFirmBranch = isCentenary
        ? { id: '', name: '' }
        : resolveCanonicalBranch(r.branch_id || r.branchId, rawFirmBranchName);
      const loanAmount = Number(r.loan_amount) || 0;
      const grandTotal = Number(r.grand_total) || 0;
      const rimNo = String(r.rim_no || '');
      const propDesc = String(r.property_description || r.description || r.property || '');
      const comments = String(r.comments || '');
      const sourceSheet = String(r.source_sheet || 'Bulk Import');
      const monthSheet = String(r.month_sheet || '');
      const recordYear = Number(r.record_year) || new Date().getFullYear();
      const regVal = Number(r.registration_fee ?? r.registration ?? 0);
      const otherVal = Number(r.other_fees ?? r.other_disbursements ?? r.other ?? 0);

      normalizedCentenary.push({
        ...r,
        id,
        bank_name: targetBank,
        bank_branch_station: bankBranchName,
        branch: bankBranchName,
        firm_branch_station: isCentenary ? '' : rawFirmBranchName || resolvedFirmBranch.name,
        branch_id: isCentenary ? '' : resolvedFirmBranch.id,
        branch_name: isCentenary ? '' : rawFirmBranchName || resolvedFirmBranch.name,
        client_name: clientName,
        rim_no: rimNo,
        property_description: propDesc,
        loan_amount: loanAmount,
        grand_total: grandTotal,
        comments,
        source_sheet: sourceSheet,
        month_sheet: monthSheet,
        record_year: recordYear,
        status: r.status || 'Active / Processing',
        created_at: r.created_at || now,
      });

      // Also register into central mortgages table under the selected bank
      normalizedNewMortgages.push({
        ...r,
        id,
        client_bank_name: targetBank,
        bank_name: targetBank,
        record_year: recordYear,
        month_sheet: monthSheet,
        source_sheet: sourceSheet,
        date_of_receipt: r.date_of_receipt || null,
        bank_branch_station: bankBranchName,
        bank_branch: bankBranchName,
        branch: bankBranchName,
        client_branch_location: bankBranchName,
        firm_branch_station: isCentenary ? '' : rawFirmBranchName || resolvedFirmBranch.name,
        branch_id: isCentenary ? '' : resolvedFirmBranch.id,
        branch_name: isCentenary ? '' : rawFirmBranchName || resolvedFirmBranch.name,
        file_number: rimNo || `MORT-${Date.now().toString().slice(-5)}`,
        rim_no: rimNo,
        borrower_name: clientName,
        mortgagor_name: clientName,
        client_name: clientName,
        name: clientName,
        loan_amount: loanAmount,
        stamp_duty: Number(r.stamp_duty) || 0,
        extra_copies: Number(r.extra_copies) || 0,
        registration: regVal,
        registration_fee: regVal,
        other: otherVal,
        other_fees: otherVal,
        other_disbursements: otherVal,
        bank_charges: Number(r.bank_charges) || 0,
        transport: Number(r.transport) || 0,
        linkage_fees: Number(r.linkage_fees) || 0,
        total_disbursements: Number(r.total_disbursements) || 0,
        legal_fees: Number(r.legal_fees) || 0,
        vat_18: Number(r.vat_18) || 0,
        grand_total: grandTotal,
        date_of_payment: r.date_of_payment || null,
        date_of_return: r.date_of_return || null,
        property_description: propDesc,
        description: propDesc,
        department: r.department || 'Banking & Securities',
        status: r.status || (r.date_of_return ? 'Completed / Cleared' : 'Active / Processing'),
        comments,
        created_at: r.created_at || now,
      });
    });

    const mergeAdditiveById = (existing: any[], incoming: any[]) => {
      const merged = [...existing];
      const idIndexMap = new Map<string, number>();
      merged.forEach((item, idx) => {
        if (item?.id) idIndexMap.set(String(item.id), idx);
      });

      const newItems: any[] = [];
      incoming.forEach((item) => {
        const key = String(item.id);
        const existingIdx = idIndexMap.get(key);
        if (existingIdx !== undefined) {
          merged[existingIdx] = { ...merged[existingIdx], ...item };
        } else {
          newItems.push(item);
        }
      });

      return [...newItems, ...merged];
    };

    (db as any).mortgages = mergeAdditiveById(currentMortgages, normalizedNewMortgages);
    (db as any).centenary_mortgage_cases = mergeAdditiveById(centenaryCases, normalizedCentenary);
    writeDatabase(db);

    res.json({
      success: true,
      count: records.length,
      message: `Successfully batch inserted ${records.length} mortgage records into database.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// User Update API Route: Syncs BOTH Supabase Auth user_metadata AND public profiles table
// ==============================================================================
// Helper to resolve canonical branch station (preserves custom branches too)
function resolveCanonicalBranch(branchId?: string, branchName?: string) {
  const bId = (branchId || '').trim();
  const bName = (branchName || '').trim();
  const clean = `${bId} ${bName}`.toLowerCase();

  if (bId === 'ftp-reg' || clean.includes('fort') || clean.includes('portal') || clean.includes('ftp')) {
    return { id: 'ftp-reg', name: 'Fort Portal Regional Office' };
  }
  if (bId === 'mbr-reg' || clean.includes('mbarara') || clean.includes('mbr')) {
    return { id: 'mbr-reg', name: 'Mbarara Regional Office' };
  }
  if (bId === 'msk-reg' || clean.includes('masaka') || clean.includes('msk')) {
    return { id: 'msk-reg', name: 'Masaka Regional Office' };
  }
  if (bId === 'jnj-reg' || clean.includes('jinja') || clean.includes('jnj')) {
    return { id: 'jnj-reg', name: 'Jinja Regional Office' };
  }
  if (bId === 'glu-reg' || clean.includes('gulu') || clean.includes('glu')) {
    return { id: 'glu-reg', name: 'Gulu Regional Office' };
  }
  if (bId === 'msn-reg' || clean.includes('masindi') || clean.includes('msn')) {
    return { id: 'msn-reg', name: 'Masindi Regional Office' };
  }
  if (bId === 'kla-hq' || clean.includes('kampala') || clean.includes('head office') || clean.includes('kla')) {
    return { id: 'kla-hq', name: 'Kampala Central (Head Office)' };
  }
  // Support custom dynamically added branches
  if (bId && (bId.startsWith('br-') || bName)) {
    return { id: bId, name: bName || bId };
  }
  return { id: 'kla-hq', name: 'Kampala Central (Head Office)' };
}

// Helper to resolve canonical role and privileges
function resolveCanonicalRole(roleId?: string, roleTitle?: string, isSuper?: boolean, email?: string) {
  const rawId = (roleId || '').trim();
  const lowerId = rawId.toLowerCase();
  const cleanTitle = (roleTitle || '').trim();
  const clean = `${lowerId} ${cleanTitle.toLowerCase()}`;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (
    isSuper === true ||
    cleanEmail === 'infosightug@gmail.com' ||
    lowerId === 'role-super-admin' ||
    lowerId === 'super_admin' ||
    lowerId === 'superadmin' ||
    lowerId === 'partner' ||
    lowerId === 'managing_partner' ||
    lowerId === 'system_admin'
  ) {
    return {
      roleId: 'role-super-admin',
      role: 'partner',
      roleTitle: cleanTitle || 'Managing Partner (Super Admin)',
      isSuperAdmin: true,
      isBranchAdmin: false,
    };
  }
  if (
    lowerId === 'role-admin-finance-assistant' ||
    lowerId === 'admin_finance_assistant' ||
    lowerId === 'admin-finance-assistant' ||
    lowerId === 'finance_assistant' ||
    clean.includes('admin & finance assistant') ||
    clean.includes('admin and finance assistant')
  ) {
    return {
      roleId: 'role-admin-finance-assistant',
      role: 'admin_finance_assistant',
      roleTitle: cleanTitle || 'Admin & Finance Assistant',
      isSuperAdmin: false,
      isBranchAdmin: false,
    };
  }
  if (
    lowerId === 'role-admin' ||
    lowerId === 'admin' ||
    lowerId === 'branch_admin' ||
    lowerId === 'branch-admin' ||
    lowerId === 'office_admin' ||
    clean.includes('branch admin')
  ) {
    return {
      roleId: 'role-admin',
      role: 'branch_admin',
      roleTitle: cleanTitle || 'Branch Administrator',
      isSuperAdmin: false,
      isBranchAdmin: true,
    };
  }
  if (
    lowerId === 'role-team-lead' ||
    lowerId === 'role-lead' ||
    lowerId === 'team_lead' ||
    lowerId === 'lead' ||
    lowerId === 'litigation_lead'
  ) {
    return {
      roleId: 'role-team-lead',
      role: 'team_lead',
      roleTitle: cleanTitle || 'Regional Team Lead',
      isSuperAdmin: false,
      isBranchAdmin: false,
    };
  }
  if (
    lowerId === 'role-clerk' ||
    lowerId === 'clerk' ||
    lowerId === 'court_clerk' ||
    lowerId === 'registry_clerk'
  ) {
    return {
      roleId: 'role-clerk',
      role: 'clerk',
      roleTitle: cleanTitle || 'Court & Registry Clerk',
      isSuperAdmin: false,
      isBranchAdmin: false,
    };
  }
  if (rawId.startsWith('role-custom-')) {
    return {
      roleId: rawId,
      role: rawId,
      roleTitle: cleanTitle || 'Custom Firm Role',
      isSuperAdmin: false,
      isBranchAdmin: false,
    };
  }
  return {
    roleId: 'role-advocate',
    role: 'lawyer',
    roleTitle: cleanTitle || 'Litigation Lawyer / Associate',
    isSuperAdmin: false,
    isBranchAdmin: false,
  };
}

// Helper to extract column name from PostgREST schema cache error
function extractMissingColumn(errMsg?: string): string | null {
  if (!errMsg) return null;
  const pgrstMatch = errMsg.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch?.[1]) return pgrstMatch[1];
  const pgMatch = errMsg.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);
  if (pgMatch?.[1]) return pgMatch[1];
  return null;
}

function hasRealServiceRoleKey(): boolean {
  try {
    const parts = SUPABASE_SERVICE_ROLE_KEY.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

function getSupabaseClientForRequest(req?: Request) {
  if (hasRealServiceRoleKey()) return supabaseAdmin;
  const authHeader = String(req?.headers?.authorization || (req?.headers as any)?.['Authorization'] || '');
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return supabaseAdmin;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    accessToken: async () => token,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isUuidString(val?: string | null): boolean {
  return Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val).trim()));
}

// Schema-resilient profiles update/upsert helper
async function safeProfileMutation(
  mode: 'update-id' | 'update-email' | 'upsert',
  payload: Record<string, any>,
  matchValue?: string,
  sbClient: any = supabaseAdmin
): Promise<{ data: any; error: any }> {
  const workingPayload = { ...payload };
  // Public profiles table uses full_name (never 'name')
  delete workingPayload.name;
  delete workingPayload.password;
  delete workingPayload.temporaryPassword;
  Object.keys(workingPayload).forEach((k) => {
    if (workingPayload[k] === undefined) delete workingPayload[k];
  });

  if (mode === 'update-id' && (!matchValue || !isUuidString(matchValue))) {
    return { data: null, error: null };
  }

  if (mode === 'upsert' && workingPayload.id && !isUuidString(workingPayload.id)) {
    workingPayload.id = randomUUID();
  }

  let omitIdFallbackAttempted = false;
  let lastError: any = null;

  for (let attempt = 0; attempt < 25; attempt++) {
    if (Object.keys(workingPayload).length === 0) break;
    let res: any;
    if (mode === 'update-id' && matchValue) {
      res = await sbClient.from('profiles').update(workingPayload).eq('id', matchValue).select('*');
    } else if (mode === 'update-email' && matchValue) {
      res = await sbClient.from('profiles').update(workingPayload).ilike('email', matchValue).select('*');
    } else {
      const conflictCol = matchValue === 'id' && workingPayload.id ? 'id' : 'email';
      res = await sbClient
        .from('profiles')
        .upsert([workingPayload], { onConflict: conflictCol })
        .select('*');
    }

    if (!res.error) return res;
    lastError = res.error;

    const errCode = String(res.error?.code || '');
    const errMsg = String(res.error?.message || res.error?.details || '');

    // Handle invalid UUID syntax by assigning a valid UUID or omitting id
    if (errCode === '22P02') {
      if (mode === 'update-id') {
        return { data: null, error: null };
      }
      if (workingPayload.id && !isUuidString(workingPayload.id)) {
        workingPayload.id = randomUUID();
        continue;
      }
    }

    // Handle time-with-timezone column mismatch (e.g. updated_at defined as timetz in live schema)
    if (errCode === '22007' && 'updated_at' in workingPayload) {
      delete workingPayload.updated_at;
      continue;
    }

    // Handle foreign-key violation (profiles.id references auth.users.id) on email upsert if id can be auto-generated
    if (errCode === '23503' && mode === 'upsert' && workingPayload.id && !omitIdFallbackAttempted) {
      omitIdFallbackAttempted = true;
      delete workingPayload.id;
      continue;
    }

    const missingCol = extractMissingColumn(errMsg);
    if (missingCol && missingCol in workingPayload) {
      delete workingPayload[missingCol];
      continue;
    }

    const pgColMatch = errMsg.match(/column\s+(?:[a-z_]+\.)?([a-z0-9_]+)\s+does not exist/i);
    if (pgColMatch?.[1] && pgColMatch[1] in workingPayload) {
      delete workingPayload[pgColMatch[1]];
      continue;
    }

    // If upsert onConflict:'email' fails because profiles.email has no unique constraint (42P10), fall back to update-by-email then insert
    if (
      mode === 'upsert' &&
      (errCode === '42P10' || errMsg.toLowerCase().includes('no unique or exclusion constraint')) &&
      workingPayload.email
    ) {
      const updateFields = { ...workingPayload };
      delete updateFields.id;
      const updRes = await sbClient
        .from('profiles')
        .update(updateFields)
        .ilike('email', String(workingPayload.email))
        .select('*');
      if (!updRes.error && Array.isArray(updRes.data) && updRes.data.length > 0) {
        return updRes;
      }
      const insRes = await sbClient.from('profiles').insert([workingPayload]).select('*');
      if (!insRes.error) return insRes;
      return insRes;
    }

    return res;
  }
  return { data: null, error: lastError || { message: 'Max schema retry attempts reached' } };
}

async function safeFirmUsersUpsert(
  row: Record<string, any>,
  sbClient: any = supabaseAdmin
): Promise<{ data: any; error: any; tableMissing?: boolean }> {
  const workingPayload = { ...row };
  Object.keys(workingPayload).forEach((k) => {
    if (workingPayload[k] === undefined) delete workingPayload[k];
  });
  if (workingPayload.id && !isUuidString(workingPayload.id)) {
    workingPayload.id = randomUUID();
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await sbClient.from('firm_users').upsert([workingPayload], { onConflict: 'email' }).select('*');
    if (!res.error) return { data: res.data, error: null };
    if (String(res.error?.code || '') === 'PGRST205') {
      return { data: null, error: res.error, tableMissing: true };
    }
    const missingCol = extractMissingColumn(String(res.error?.message || ''));
    if (missingCol && missingCol in workingPayload) {
      delete workingPayload[missingCol];
      continue;
    }
    return { data: null, error: res.error };
  }
  return { data: null, error: { message: 'Max firm_users retry attempts reached' } };
}

function extractPasswordFromRollNo(rawRollNo?: string): { rollNo: string; password?: string } {
  const raw = String(rawRollNo || '');
  if (raw.includes(':::[PW]:')) {
    const parts = raw.split(':::[PW]:');
    return { rollNo: parts[0].trim(), password: parts[1]?.trim() || undefined };
  }
  return { rollNo: raw.trim() };
}

function defaultRolePassword(roleId: string): string {
  if (roleId === 'role-super-admin') return 'Admin@2026';
  if (roleId === 'role-admin') return 'Branch@2026';
  if (roleId === 'role-admin-finance-assistant') return 'Finance@2026';
  if (roleId === 'role-clerk') return 'Clerk@2026';
  return 'Lawyer@2026';
}

// ==============================================================================
// User Update API Route: Atomically updates Supabase Auth user_metadata,
// public profiles table, firm_users, and local workstation DB
// ==============================================================================
const handleUserUpdate = async (req: Request, res: Response) => {
  try {
    const rawParamId = req.params?.id;
    const validParamId = rawParamId && rawParamId !== 'update' && rawParamId !== 'create' ? rawParamId : '';
    const targetId = String(req.body.userId || req.body.id || validParamId || '');
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
      suspendedReason,
      suspended_reason,
      advocateRollNo,
      advocate_roll_no,
      password,
      mustChangePassword,
      must_change_password,
      can_import_mortgages,
      canImportMortgages,
    } = req.body;

    const resolvedEmail = (email || '').trim().toLowerCase();
    const prevEmail = String(req.body.previousEmail || req.body.previous_email || '').trim().toLowerCase();
    const resolvedName = (name || full_name || '').trim();
    const rawBranchId = (branchId || branch_id || '').trim();
    const rawBranchName = (branchName || branch_name || branch || '').trim();
    const rawRoleId = (roleId || role_id || role || '').trim();
    const rawRoleTitle = (roleTitle || role_title || '').trim();
    const isSuperInput =
      isSuperAdmin !== undefined
        ? Boolean(isSuperAdmin)
        : is_super_admin !== undefined
        ? Boolean(is_super_admin)
        : undefined;
    const isBranchInput =
      isBranchAdmin !== undefined
        ? Boolean(isBranchAdmin)
        : is_branch_admin !== undefined
        ? Boolean(is_branch_admin)
        : undefined;

    const db = readDatabase();
    const existingDbUser = (db.users || []).find(
      (u: any) =>
        (targetId && u.id === targetId) ||
        (resolvedEmail && u.email?.toLowerCase() === resolvedEmail) ||
        (prevEmail && u.email?.toLowerCase() === prevEmail)
    );

    const effectiveEmail = resolvedEmail || prevEmail || (existingDbUser?.email || '').trim().toLowerCase();
    const lookupPreviousEmail = prevEmail || (existingDbUser?.email || '').trim().toLowerCase();

    // Resolve canonical station and role (preserve existing values when partial update omits branch or role)
    const branchMeta =
      rawBranchId || rawBranchName
        ? resolveCanonicalBranch(rawBranchId, rawBranchName)
        : resolveCanonicalBranch(existingDbUser?.branchId, existingDbUser?.branchName);

    const roleMeta =
      rawRoleId || rawRoleTitle
        ? resolveCanonicalRole(rawRoleId, rawRoleTitle, isSuperInput, effectiveEmail)
        : resolveCanonicalRole(
            existingDbUser?.roleId || existingDbUser?.role,
            existingDbUser?.roleTitle,
            isSuperInput ?? existingDbUser?.isSuperAdmin,
            effectiveEmail
          );

    if (isBranchInput !== undefined && !roleMeta.isSuperAdmin && roleMeta.roleId !== 'role-admin') {
      roleMeta.isBranchAdmin = isBranchInput;
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
    const sbClient = getSupabaseClientForRequest(req);

    // 1. Resolve Auth UUID and existing profile
    let authUserId: string | null = isUUID ? targetId : null;
    let existingProfile: any = null;

    try {
      if (authUserId) {
        const { data: pById } = await sbClient.from('profiles').select('*').eq('id', authUserId).maybeSingle();
        if (pById) existingProfile = pById;
      }
      if (!existingProfile && effectiveEmail) {
        const { data: pByEmail } = await sbClient.from('profiles').select('*').ilike('email', effectiveEmail).maybeSingle();
        if (pByEmail) {
          existingProfile = pByEmail;
          if (pByEmail.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pByEmail.id)) {
            authUserId = pByEmail.id;
          }
        }
      }
      if (!existingProfile && lookupPreviousEmail && lookupPreviousEmail !== effectiveEmail) {
        const { data: pByPrevEmail } = await sbClient.from('profiles').select('*').ilike('email', lookupPreviousEmail).maybeSingle();
        if (pByPrevEmail) {
          existingProfile = pByPrevEmail;
          if (pByPrevEmail.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pByPrevEmail.id)) {
            authUserId = pByPrevEmail.id;
          }
        }
      }
    } catch (lookupErr) {
      console.warn('[User Update] Profile lookup notice:', lookupErr);
    }

    if (!authUserId && (effectiveEmail || lookupPreviousEmail) && hasRealServiceRoleKey()) {
      try {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const matched = userList?.users?.find(
          (u) =>
            (effectiveEmail && u.email?.toLowerCase() === effectiveEmail) ||
            (lookupPreviousEmail && u.email?.toLowerCase() === lookupPreviousEmail)
        );
        if (matched) authUserId = matched.id;
      } catch (authListErr) {
        console.warn('[User Update] Auth user list notice:', authListErr);
      }
    }

    const finalFullName = resolvedName || existingProfile?.full_name || existingDbUser?.name || '';
    const finalEmail = effectiveEmail || existingProfile?.email || '';
    const trimmedPassword = password && String(password).trim() ? String(password).trim() : undefined;
    const finalMustChange =
      mustChangePassword !== undefined
        ? Boolean(mustChangePassword)
        : must_change_password !== undefined
        ? Boolean(must_change_password)
        : existingDbUser?.mustChangePassword;

    const finalCanImportMortgages = roleMeta.isSuperAdmin || isExplicitMortgageImportEmail(finalEmail)
      ? true
      : can_import_mortgages !== undefined
      ? Boolean(can_import_mortgages)
      : canImportMortgages !== undefined
      ? Boolean(canImportMortgages)
      : existingProfile?.can_import_mortgages !== undefined
      ? Boolean(existingProfile.can_import_mortgages)
      : Boolean(existingDbUser?.can_import_mortgages ?? existingDbUser?.canImportMortgages ?? false);

    // 2. Prepare user_metadata for Supabase Auth
    const userMetadata: Record<string, any> = {
      role: roleMeta.role,
      role_id: roleMeta.roleId,
      role_title: roleMeta.roleTitle,
      branch_id: branchMeta.id,
      branch_name: branchMeta.name,
      branch: branchMeta.name,
      is_super_admin: roleMeta.isSuperAdmin,
      is_branch_admin: roleMeta.isBranchAdmin,
      can_import_mortgages: finalCanImportMortgages,
    };
    if (finalFullName) {
      userMetadata.full_name = finalFullName;
      userMetadata.name = finalFullName;
    }
    if (advocateRollNo || advocate_roll_no) {
      userMetadata.advocate_roll_no = advocateRollNo || advocate_roll_no;
    }
    if (finalMustChange !== undefined) {
      userMetadata.must_change_password = finalMustChange;
    }

    // 3. Update Supabase Auth user_metadata (when real service role key is configured)
    let authUpdated = false;
    let authError: string | null = null;

    if (authUserId && hasRealServiceRoleKey()) {
      try {
        const authPayload: any = { user_metadata: userMetadata };
        if (finalEmail) authPayload.email = finalEmail;
        if (trimmedPassword) authPayload.password = trimmedPassword;

        const { data: updatedAuthUser, error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
          authUserId,
          authPayload
        );
        if (!authErr && updatedAuthUser) {
          authUpdated = true;
        } else if (authErr) {
          authError = authErr.message;
        }
      } catch (authEx: any) {
        authError = authEx?.message || 'Auth admin update exception';
      }
    }

    // 4. Update public 'profiles' table atomically & schema-resiliently
    const nowIso = new Date().toISOString();
    const baseRollForProfile = (
      advocateRollNo ||
      advocate_roll_no ||
      extractPasswordFromRollNo(existingDbUser?.advocateRollNo).rollNo ||
      ''
    )
      .split(':::[PW]:')[0]
      .trim();
    const effectivePwForProfile = trimmedPassword || existingDbUser?.password;

    const profileRow: Record<string, any> = {
      role: roleMeta.role,
      role_id: roleMeta.roleId,
      role_title: roleMeta.roleTitle,
      branch_id: branchMeta.id,
      branch_name: branchMeta.name,
      branch: branchMeta.name,
      is_super_admin: roleMeta.isSuperAdmin,
      is_branch_admin: roleMeta.isBranchAdmin,
      can_import_mortgages: finalCanImportMortgages,
      updated_at: nowIso,
    };
    if (finalFullName) profileRow.full_name = finalFullName;
    if (finalEmail) profileRow.email = finalEmail;
    if (finalMustChange !== undefined) profileRow.must_change_password = finalMustChange;
    if (isSuspended !== undefined || is_suspended !== undefined) {
      profileRow.is_suspended = Boolean(isSuspended ?? is_suspended);
    }
    if (effectivePwForProfile) {
      profileRow.advocate_roll_no = `${baseRollForProfile}:::[PW]:${effectivePwForProfile}`;
    } else if (advocateRollNo !== undefined || advocate_roll_no !== undefined) {
      profileRow.advocate_roll_no = baseRollForProfile;
    }

    let profileUpdated = false;
    let profileError: string | null = null;
    let completeProfile: any = null;

    try {
      const idForProfile = authUserId || targetId;
      if (idForProfile && isUuidString(idForProfile)) {
        const { data: pData, error: pErr } = await safeProfileMutation('update-id', profileRow, idForProfile, sbClient);
        if (!pErr && pData && pData.length > 0) {
          profileUpdated = true;
          completeProfile = pData[0];
        } else if (pErr) {
          profileError = pErr.message;
        }
      }

      if (!profileUpdated && finalEmail) {
        const { data: pEmailData, error: peErr } = await safeProfileMutation('update-email', profileRow, finalEmail, sbClient);
        if (!peErr && pEmailData && pEmailData.length > 0) {
          profileUpdated = true;
          profileError = null;
          completeProfile = pEmailData[0];
        } else if (peErr && !profileError) {
          profileError = peErr.message;
        }
      }

      if (!profileUpdated && lookupPreviousEmail && lookupPreviousEmail !== finalEmail) {
        const { data: pPrevData, error: ppErr } = await safeProfileMutation('update-email', profileRow, lookupPreviousEmail, sbClient);
        if (!ppErr && pPrevData && pPrevData.length > 0) {
          profileUpdated = true;
          profileError = null;
          completeProfile = pPrevData[0];
        } else if (ppErr && !profileError) {
          profileError = ppErr.message;
        }
      }

      if (!profileUpdated && (authUserId || targetId || finalEmail)) {
        const validUpsertId = isUuidString(authUserId)
          ? authUserId
          : isUuidString(targetId)
          ? targetId
          : randomUUID();
        const upsertRow: any = {
          ...profileRow,
          id: validUpsertId,
          email: finalEmail || undefined,
        };
        const { data: insData, error: insErr } = await safeProfileMutation(
          'upsert',
          upsertRow,
          authUserId ? 'id' : 'email',
          sbClient
        );
        if (!insErr && insData && insData.length > 0) {
          profileUpdated = true;
          profileError = null;
          completeProfile = insData[0];
        } else if (insErr && !profileError) {
          profileError = insErr.message;
        }
      }
    } catch (profErr: any) {
      profileError = profErr?.message || 'Profiles update exception';
      console.warn('[User Update] Profiles update exception:', profErr);
    }

    // 5. Keep public 'firm_users' table synchronized (including embedded password if updated)
    try {
      const baseRoll = baseRollForProfile;
      const effectivePw = effectivePwForProfile;
      const firmUserUpdates: any = {
        role: roleMeta.role,
        role_title: roleMeta.roleTitle,
        branch_name: branchMeta.name,
        branch_id: branchMeta.id,
        is_super_admin: roleMeta.isSuperAdmin,
        is_branch_admin: roleMeta.isBranchAdmin,
      };
      if (finalFullName) firmUserUpdates.name = finalFullName;
      if (finalEmail) firmUserUpdates.email = finalEmail;
      if (isSuspended !== undefined || is_suspended !== undefined) {
        firmUserUpdates.is_suspended = Boolean(isSuspended ?? is_suspended);
      }
      if (effectivePw) {
        firmUserUpdates.advocate_roll_no = `${baseRoll}:::[PW]:${effectivePw}`;
      } else if (advocateRollNo !== undefined || advocate_roll_no !== undefined) {
        firmUserUpdates.advocate_roll_no = baseRoll;
      }

      let fuUpdated = false;
      if (authUserId) {
        const r1 = await sbClient.from('firm_users').update(firmUserUpdates).eq('id', authUserId).select('id');
        if (!r1.error && r1.data && r1.data.length > 0) fuUpdated = true;
      }
      if (!fuUpdated && targetId && targetId !== authUserId) {
        const r2 = await sbClient.from('firm_users').update(firmUserUpdates).eq('id', targetId).select('id');
        if (!r2.error && r2.data && r2.data.length > 0) fuUpdated = true;
      }
      if (!fuUpdated && finalEmail) {
        const r3 = await sbClient.from('firm_users').update(firmUserUpdates).ilike('email', finalEmail).select('id');
        if (!r3.error && r3.data && r3.data.length > 0) fuUpdated = true;
      }
      if (!fuUpdated && lookupPreviousEmail && lookupPreviousEmail !== finalEmail) {
        const r4 = await sbClient.from('firm_users').update(firmUserUpdates).ilike('email', lookupPreviousEmail).select('id');
        if (!r4.error && r4.data && r4.data.length > 0) fuUpdated = true;
      }
      if (!fuUpdated && finalEmail) {
        await safeFirmUsersUpsert(
          {
            id: isUuidString(authUserId) ? authUserId : isUuidString(targetId) ? targetId : randomUUID(),
            name: finalFullName || finalEmail.split('@')[0],
            email: finalEmail,
            ...firmUserUpdates,
          },
          sbClient
        );
      }
    } catch (fuErr) {
      console.warn('[User Update] firm_users update notice:', fuErr);
    }

    // 6. Update in-memory and server_data/firm_database.json
    const finalRecordId = completeProfile?.id || authUserId || (isUuidString(targetId) ? targetId : existingDbUser?.id) || randomUUID();
    let foundInDb = false;
    db.users = (db.users || []).map((u: any) => {
      if (
        (targetId && u.id === targetId) ||
        (authUserId && u.id === authUserId) ||
        (finalEmail && u.email?.toLowerCase() === finalEmail) ||
        (lookupPreviousEmail && u.email?.toLowerCase() === lookupPreviousEmail)
      ) {
        foundInDb = true;
        return {
          ...u,
          id: finalRecordId,
          name: finalFullName || u.name,
          email: finalEmail || u.email,
          role: roleMeta.role,
          roleId: roleMeta.roleId,
          roleTitle: roleMeta.roleTitle,
          branchName: branchMeta.name,
          branchId: branchMeta.id,
          isSuperAdmin: roleMeta.isSuperAdmin,
          isBranchAdmin: roleMeta.isBranchAdmin,
          can_import_mortgages: finalCanImportMortgages,
          canImportMortgages: finalCanImportMortgages,
          isSuspended: isSuspended !== undefined ? Boolean(isSuspended) : is_suspended !== undefined ? Boolean(is_suspended) : u.isSuspended,
          suspendedReason: suspendedReason !== undefined ? suspendedReason : suspended_reason !== undefined ? suspended_reason : u.suspendedReason,
          password: trimmedPassword || u.password,
          temporaryPassword: trimmedPassword ? undefined : u.temporaryPassword,
          mustChangePassword: finalMustChange !== undefined ? finalMustChange : u.mustChangePassword,
          advocateRollNo: advocateRollNo || advocate_roll_no || u.advocateRollNo,
          updatedAt: nowIso,
          profileSynced: profileUpdated,
        };
      }
      return u;
    });

    if (!foundInDb && finalEmail) {
      db.users.push({
        id: finalRecordId,
        name: finalFullName || finalEmail.split('@')[0],
        email: finalEmail,
        role: roleMeta.role,
        roleId: roleMeta.roleId,
        roleTitle: roleMeta.roleTitle,
        branchId: branchMeta.id,
        branchName: branchMeta.name,
        isSuperAdmin: roleMeta.isSuperAdmin,
        isBranchAdmin: roleMeta.isBranchAdmin,
        can_import_mortgages: finalCanImportMortgages,
        canImportMortgages: finalCanImportMortgages,
        isSuspended: Boolean(isSuspended ?? is_suspended),
        password: trimmedPassword || defaultRolePassword(roleMeta.roleId),
        mustChangePassword: Boolean(finalMustChange),
        advocateRollNo: advocateRollNo || advocate_roll_no || '',
        updatedAt: nowIso,
        profileSynced: profileUpdated,
      } as any);
    }
    writeDatabase(db);

    const returnedProfile = completeProfile || {
      id: finalRecordId,
      full_name: finalFullName,
      email: finalEmail,
      role: roleMeta.role,
      role_id: roleMeta.roleId,
      role_title: roleMeta.roleTitle,
      branch_id: branchMeta.id,
      branch_name: branchMeta.name,
      branch: branchMeta.name,
      is_super_admin: roleMeta.isSuperAdmin,
      is_branch_admin: roleMeta.isBranchAdmin,
      can_import_mortgages: finalCanImportMortgages,
      updated_at: nowIso,
    };

    const returnedUser = {
      id: finalRecordId,
      email: finalEmail,
      name: finalFullName,
      role: roleMeta.role,
      roleId: roleMeta.roleId,
      roleTitle: roleMeta.roleTitle,
      branchId: branchMeta.id,
      branchName: branchMeta.name,
      isSuperAdmin: roleMeta.isSuperAdmin,
      isBranchAdmin: roleMeta.isBranchAdmin,
      can_import_mortgages: finalCanImportMortgages,
      canImportMortgages: finalCanImportMortgages,
      isSuspended: Boolean(isSuspended ?? is_suspended ?? existingDbUser?.isSuspended),
      advocateRollNo: advocateRollNo || advocate_roll_no || existingDbUser?.advocateRollNo || '',
      updatedAt: nowIso,
    };

    return res.json({
      success: true,
      message: profileUpdated
        ? 'Staff updated successfully across profiles, firm_users, and central database'
        : 'Staff updated in central database (Supabase profiles RLS update was skipped or unauthorized)',
      authUpdated,
      authError,
      profileUpdated,
      profileError,
      profile: returnedProfile,
      user: returnedUser,
    });
  } catch (err: any) {
    console.error('Error in user update API route:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Internal user update failure' });
  }
};

// ==============================================================================
// User Provisioning API Route: Provisions credentials in Supabase Auth (with
// signUp fallback if service_role key is absent), public.profiles, firm_users & DB
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
      can_import_mortgages,
      canImportMortgages,
    } = req.body;

    const resolvedEmail = (email || '').trim().toLowerCase();
    const resolvedName = (name || full_name || '').trim();
    const rawPassword = (password || '').trim() || 'MK@Law2026';
    const rawRoleId = (roleId || role_id || role || 'role-advocate').trim();
    const rawRoleTitle = (roleTitle || role_title || '').trim();
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

    const branchMeta = resolveCanonicalBranch(resolvedBranchId, resolvedBranchName);
    const roleMeta = resolveCanonicalRole(
      rawRoleId,
      rawRoleTitle,
      isSuperAdmin ?? is_super_admin,
      resolvedEmail
    );
    if (isBranchAdmin !== undefined || is_branch_admin !== undefined) {
      if (!roleMeta.isSuperAdmin && roleMeta.roleId !== 'role-admin') {
        roleMeta.isBranchAdmin = Boolean(isBranchAdmin ?? is_branch_admin);
      }
    }

    const finalCanImportMortgages = Boolean(
      roleMeta.isSuperAdmin ||
      isExplicitMortgageImportEmail(resolvedEmail) ||
      can_import_mortgages ||
      canImportMortgages
    );

    const userMetadata: Record<string, any> = {
      full_name: resolvedName,
      name: resolvedName,
      role: roleMeta.role,
      role_id: roleMeta.roleId,
      role_title: roleMeta.roleTitle,
      branch: branchMeta.name,
      branch_name: branchMeta.name,
      branch_id: branchMeta.id,
      is_super_admin: roleMeta.isSuperAdmin,
      is_branch_admin: roleMeta.isBranchAdmin,
      can_import_mortgages: finalCanImportMortgages,
      must_change_password: Boolean(mustChangePassword ?? true),
      advocate_roll_no: advocateRollNo || advocate_roll_no || '',
    };

    // 1. Provision in Supabase Auth (use auth.admin if real service_role key exists, else attempt signUp)
    let authUserId: string | null = null;
    let authUserCreated = false;
    let authError: string | null = null;

    if (hasRealServiceRoleKey()) {
      try {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = userList?.users?.find(
          (u) => u.email?.toLowerCase() === resolvedEmail
        );

        if (existingUser) {
          authUserId = existingUser.id;
          const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password: rawPassword,
            user_metadata: userMetadata,
            email_confirm: true,
          });
          if (updErr) {
            authError = updErr.message;
          } else {
            authUserCreated = true;
          }
        } else {
          const { data: createdAuth, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: resolvedEmail,
            password: rawPassword,
            email_confirm: true,
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
    } else {
      // Attempt standard non-persisting signUp so auth.users receives the user when signups are open
      try {
        const tempClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: signUpData, error: signUpErr } = await tempClient.auth.signUp({
          email: resolvedEmail,
          password: rawPassword,
          options: { data: userMetadata },
        });
        if (!signUpErr && signUpData?.user?.id) {
          authUserId = signUpData.user.id;
          authUserCreated = Boolean(signUpData.session);
          if (!signUpData.session) {
            authError = 'Auth account awaiting confirmation; portal credential fallback active.';
          }
        } else if (signUpErr) {
          authError = signUpErr.message;
        }
      } catch (suErr: any) {
        authError = suErr?.message || 'Auth signUp fallback notice';
      }
    }

    const baseRoll = (advocateRollNo || advocate_roll_no || '').split(':::[PW]:')[0].trim();
    const targetUserId = authUserId || randomUUID();
    const sbClient = getSupabaseClientForRequest(req);
    const nowIso = new Date().toISOString();

    // 2. Prepare profileRow (with valid UUID and embedded credential for cross-device sign-in)
    const profileRow: Record<string, any> = {
      id: targetUserId,
      full_name: resolvedName,
      email: resolvedEmail,
      role: roleMeta.role,
      role_id: roleMeta.roleId,
      role_title: roleMeta.roleTitle,
      branch: branchMeta.name,
      branch_name: branchMeta.name,
      branch_id: branchMeta.id,
      is_super_admin: roleMeta.isSuperAdmin,
      is_branch_admin: roleMeta.isBranchAdmin,
      can_import_mortgages: finalCanImportMortgages,
      must_change_password: Boolean(mustChangePassword ?? true),
      is_suspended: false,
      advocate_roll_no: `${baseRoll}:::[PW]:${rawPassword}`,
      updated_at: nowIso,
    };

    let profileData: any = null;
    let profileSynced = false;
    let profileError: string | null = null;
    try {
      const { data: pData, error: pErr } = await safeProfileMutation('upsert', profileRow, 'email', sbClient);
      if (!pErr && pData && pData.length > 0) {
        profileData = pData[0];
        profileSynced = true;
      } else if (pErr) {
        profileError = pErr.message || String(pErr.code || 'Profiles table rejected write');
        console.warn('[handleUserCreate] Profiles table upsert error:', pErr.message, pErr.code);
      }
    } catch (pe: any) {
      profileError = pe?.message || 'Profiles table upsert exception';
      console.warn('[handleUserCreate] Profiles table upsert notice:', pe);
    }

    // 2b. Optional RPC fallback if admin_upsert_staff_profile SQL helper was deployed
    if (!profileSynced) {
      try {
        const { data: rpcData, error: rpcErr } = await sbClient.rpc('admin_upsert_staff_profile', {
          p_id: targetUserId,
          p_email: resolvedEmail,
          p_full_name: resolvedName,
          p_role: roleMeta.role,
          p_role_id: roleMeta.roleId,
          p_role_title: roleMeta.roleTitle,
          p_branch_id: branchMeta.id,
          p_branch_name: branchMeta.name,
          p_is_super_admin: roleMeta.isSuperAdmin,
          p_is_branch_admin: roleMeta.isBranchAdmin,
          p_can_import_mortgages: finalCanImportMortgages,
          p_must_change_password: Boolean(mustChangePassword ?? true),
          p_advocate_roll_no: `${baseRoll}:::[PW]:${rawPassword}`,
        });
        if (!rpcErr && rpcData) {
          profileData = Array.isArray(rpcData) ? rpcData[0] : rpcData;
          profileSynced = true;
          profileError = null;
        }
      } catch {}
    }

    // 3. Keep public.firm_users table synchronized if provisioned
    let firmUserSynced = false;
    let firmUserError: string | null = null;
    try {
      const firmUserRow: Record<string, any> = {
        id: profileData?.id || targetUserId,
        name: resolvedName,
        email: resolvedEmail,
        role: roleMeta.role,
        role_title: roleMeta.roleTitle,
        branch_id: branchMeta.id,
        branch_name: branchMeta.name,
        is_super_admin: roleMeta.isSuperAdmin,
        is_branch_admin: roleMeta.isBranchAdmin,
        is_suspended: false,
        advocate_roll_no: `${baseRoll}:::[PW]:${rawPassword}`,
      };
      const fuRes = await safeFirmUsersUpsert(firmUserRow, sbClient);
      if (!fuRes.error && fuRes.data && fuRes.data.length > 0) {
        firmUserSynced = true;
      } else if (fuRes.error && !fuRes.tableMissing) {
        firmUserError = fuRes.error.message;
      }
    } catch (fe: any) {
      firmUserError = fe?.message || null;
    }

    const finalRecordId = String(profileData?.id || targetUserId);
    const supabaseSynced = Boolean(authUserCreated || profileSynced || firmUserSynced);

    // 4. Update in-memory server database
    const db = readDatabase();
    const newUserRecord = {
      id: finalRecordId,
      name: resolvedName,
      email: resolvedEmail,
      role: roleMeta.role,
      roleId: roleMeta.roleId,
      roleTitle: roleMeta.roleTitle,
      branchId: branchMeta.id,
      branchName: branchMeta.name,
      isSuperAdmin: roleMeta.isSuperAdmin,
      isBranchAdmin: roleMeta.isBranchAdmin,
      can_import_mortgages: finalCanImportMortgages,
      canImportMortgages: finalCanImportMortgages,
      isSuspended: false,
      password: rawPassword,
      temporaryPassword: rawPassword,
      mustChangePassword: Boolean(mustChangePassword ?? true),
      advocateRollNo: baseRoll,
      updatedAt: nowIso,
      profileSynced,
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
      message: supabaseSynced
        ? 'Staff account provisioned successfully across Supabase and firm directory.'
        : 'Staff account provisioned in central firm database (Supabase cloud sync pending configuration).',
      user: {
        ...newUserRecord,
        id: finalRecordId,
      },
      authUserCreated,
      authUserId,
      authError,
      profileSynced,
      profileError,
      firmUserSynced,
      firmUserError,
      supabaseSynced,
      profile: profileData,
    });
  } catch (err: any) {
    console.error('Error in user create API route:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to provision staff account.' });
  }
};

// Server-side credential verification endpoint for newly provisioned/updated users
// when Supabase Auth email confirmation or missing service_role key blocks direct signInWithPassword
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
    const cleanPass = String(req.body?.password || '').trim();

    if (!cleanEmail || !cleanPass) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const db = readDatabase();
    const dbUser = (db.users || []).find((u: any) => String(u.email || '').trim().toLowerCase() === cleanEmail);

    let sbFirmUser: any = null;
    try {
      const { data } = await supabaseAdmin
        .from('firm_users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (data) sbFirmUser = data;
    } catch {}

    let sbProfile: any = null;
    try {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (data) sbProfile = data;
    } catch {}

    const sourceRecord = sbProfile || sbFirmUser || dbUser;
    if (!sourceRecord) {
      return res.status(401).json({
        success: false,
        accountNotFound: true,
        error: 'Invalid email or password. Account not found in firm directory.',
      });
    }

    if (Boolean(sbProfile?.is_suspended ?? sbFirmUser?.is_suspended ?? dbUser?.isSuspended)) {
      return res.status(403).json({
        success: false,
        isSuspended: true,
        error: `This account is SUSPENDED: ${sbProfile?.suspended_reason || dbUser?.suspendedReason || 'Access restricted by Super Admin. Contact Managing Partner.'}`,
      });
    }

    const { password: profilePw } = extractPasswordFromRollNo(sbProfile?.advocate_roll_no);
    const { password: firmPw } = extractPasswordFromRollNo(sbFirmUser?.advocate_roll_no);
    const roleMeta = resolveCanonicalRole(
      sbProfile?.role_id || sbProfile?.role || sbFirmUser?.role || dbUser?.roleId || dbUser?.role,
      sbProfile?.role_title || sbFirmUser?.role_title || dbUser?.roleTitle,
      Boolean(sbProfile?.is_super_admin ?? sbFirmUser?.is_super_admin ?? dbUser?.isSuperAdmin),
      cleanEmail
    );
    const branchMeta = resolveCanonicalBranch(
      sbProfile?.branch_id || sbFirmUser?.branch_id || dbUser?.branchId,
      sbProfile?.branch_name || sbProfile?.branch || sbFirmUser?.branch_name || dbUser?.branchName
    );

    const expectedPasswords = [
      dbUser?.password,
      dbUser?.temporaryPassword,
      profilePw,
      firmPw,
    ].filter((p): p is string => Boolean(p && String(p).trim()));

    // Fallback default password ONLY if no explicit password has been stored for the user
    if (expectedPasswords.length === 0) {
      expectedPasswords.push(defaultRolePassword(roleMeta.roleId));
    }

    const passwordMatched = expectedPasswords.some((p) => p === cleanPass);
    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        invalidCredentials: true,
        error: 'Invalid email or password. Please verify your credentials.',
      });
    }

    const resolvedId = String(sbProfile?.id || sbFirmUser?.id || dbUser?.id || randomUUID());
    const resolvedName = String(sbProfile?.full_name || sbFirmUser?.name || dbUser?.name || cleanEmail.split('@')[0]);

    const canImportMortgagesFlag = Boolean(
      roleMeta.isSuperAdmin ||
        isExplicitMortgageImportEmail(cleanEmail) ||
        sbProfile?.can_import_mortgages ||
        dbUser?.can_import_mortgages ||
        dbUser?.canImportMortgages
    );

    const userPayload = {
      id: resolvedId,
      email: cleanEmail,
      name: resolvedName,
      full_name: resolvedName,
      role: roleMeta.role,
      role_id: roleMeta.roleId,
      roleId: roleMeta.roleId,
      role_title: roleMeta.roleTitle,
      roleTitle: roleMeta.roleTitle,
      branch_id: branchMeta.id,
      branchId: branchMeta.id,
      branch_name: branchMeta.name,
      branchName: branchMeta.name,
      branch: branchMeta.name,
      is_super_admin: roleMeta.isSuperAdmin,
      isSuperAdmin: roleMeta.isSuperAdmin,
      is_branch_admin: roleMeta.isBranchAdmin,
      isBranchAdmin: roleMeta.isBranchAdmin,
      can_import_mortgages: canImportMortgagesFlag,
      canImportMortgages: canImportMortgagesFlag,
      must_change_password: Boolean(sbProfile?.must_change_password ?? dbUser?.mustChangePassword ?? false),
      mustChangePassword: Boolean(sbProfile?.must_change_password ?? dbUser?.mustChangePassword ?? false),
    };

    return res.json({
      success: true,
      user: userPayload,
      profile: userPayload,
    });
  } catch (err: any) {
    console.error('[/api/auth/login] Error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Portal authentication error' });
  }
});

// Password update endpoint that synchronizes DB + firm_users + profiles + Supabase Auth
app.post('/api/auth/update-password', async (req: Request, res: Response) => {
  try {
    const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
    const userId = String(req.body?.userId || '').trim();
    const newPassword = String(req.body?.password || req.body?.newPassword || '').trim();

    if (!cleanEmail && !userId) {
      return res.status(400).json({ success: false, error: 'User identifier is required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    const db = readDatabase();
    let targetEmail = cleanEmail;
    let existingRoll = '';
    db.users = (db.users || []).map((u: any) => {
      if ((userId && u.id === userId) || (cleanEmail && u.email?.toLowerCase() === cleanEmail)) {
        targetEmail = targetEmail || u.email?.toLowerCase();
        existingRoll = extractPasswordFromRollNo(u.advocateRollNo).rollNo;
        return {
          ...u,
          password: newPassword,
          temporaryPassword: undefined,
          mustChangePassword: false,
        };
      }
      return u;
    });
    writeDatabase(db);

    const sbClient = getSupabaseClientForRequest(req);
    if (targetEmail) {
      try {
        const { data: fu } = await sbClient.from('firm_users').select('*').ilike('email', targetEmail).maybeSingle();
        if (fu) {
          const { rollNo } = extractPasswordFromRollNo(fu.advocate_roll_no);
          await sbClient
            .from('firm_users')
            .update({ advocate_roll_no: `${rollNo || existingRoll}:::[PW]:${newPassword}` })
            .ilike('email', targetEmail);
        }
      } catch {}

      try {
        const { data: prof } = await sbClient.from('profiles').select('advocate_roll_no').ilike('email', targetEmail).maybeSingle();
        const { rollNo: profRoll } = extractPasswordFromRollNo(prof?.advocate_roll_no);
        await safeProfileMutation(
          'update-email',
          {
            must_change_password: false,
            advocate_roll_no: `${profRoll || existingRoll}:::[PW]:${newPassword}`,
            updated_at: new Date().toISOString(),
          },
          targetEmail,
          sbClient
        );
      } catch {}
    }

    if (hasRealServiceRoleKey() && isUuidString(userId)) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword,
          user_metadata: { must_change_password: false },
        });
      } catch {}
    }

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Password update failed.' });
  }
});

app.post(['/api/users/create', '/api/users', '/api/staff/create'], handleUserCreate);
app.post(['/api/users/:id', '/api/users/update', '/api/staff/:id', '/api/staff/update'], handleUserUpdate);
app.put(['/api/users/:id', '/api/users/update', '/api/staff/:id', '/api/staff/update'], handleUserUpdate);
app.patch(['/api/users/:id', '/api/users/update', '/api/staff/:id', '/api/staff/update'], handleUserUpdate);
app.delete(['/api/users/:id', '/api/staff/:id'], async (req: Request, res: Response) => {
  try {
    const targetId = String(req.params.id || '').trim();
    const rawEmail = String(req.query.email || req.body?.email || '').trim().toLowerCase();
    const db = readDatabase();
    const matched = (db.users || []).find(
      (u) => (targetId && u.id === targetId) || (rawEmail && u.email?.toLowerCase() === rawEmail)
    );
    const effectiveEmail = rawEmail || String(matched?.email || '').trim().toLowerCase();

    if (effectiveEmail === 'infosightug@gmail.com' || targetId === 'user-admin') {
      return res.status(403).json({ success: false, error: 'Primary Firm Owner account cannot be deleted.' });
    }

    const sbClient = getSupabaseClientForRequest(req);
    try {
      if (targetId) await sbClient.from('firm_users').delete().eq('id', targetId);
      if (effectiveEmail) await sbClient.from('firm_users').delete().ilike('email', effectiveEmail);
    } catch {}
    try {
      if (targetId) await sbClient.from('profiles').delete().eq('id', targetId);
      if (effectiveEmail) await sbClient.from('profiles').delete().ilike('email', effectiveEmail);
    } catch {}
    if (hasRealServiceRoleKey() && targetId && /^[0-9a-f-]{36}$/i.test(targetId)) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(targetId);
      } catch {}
    }

    db.users = (db.users || []).filter(
      (u) => !(
        (targetId && u.id === targetId) ||
        (effectiveEmail && u.email?.toLowerCase() === effectiveEmail)
      )
    );
    writeDatabase(db);
    return res.json({ success: true, deletedId: targetId, email: effectiveEmail || undefined });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to delete user.' });
  }
});

// Fresh profiles endpoint: queries public profiles + firm_users + local DB and returns normalized merged list
app.get(['/api/profiles', '/api/users/profiles'], async (req: Request, res: Response) => {
  try {
    const clientToUse = getSupabaseClientForRequest(req);

    const [{ data: profiles }, { data: firmUsers }] = await Promise.all([
      clientToUse.from('profiles').select('*').order('created_at', { ascending: false }),
      clientToUse.from('firm_users').select('*').order('created_at', { ascending: false }),
    ]);

    const db = readDatabase();
    const mergedByEmail = new Map<string, any>();

    // Seed with local DB users
    (db.users || []).forEach((u: any) => {
      const em = String(u.email || '').trim().toLowerCase();
      if (em) mergedByEmail.set(em, { ...u, full_name: u.name });
    });

    // Overlay firm_users
    if (Array.isArray(firmUsers)) {
      firmUsers.forEach((f: any) => {
        const em = String(f.email || '').trim().toLowerCase();
        if (!em) return;
        const prev = mergedByEmail.get(em) || {};
        mergedByEmail.set(em, {
          ...prev,
          ...f,
          full_name: f.name || prev.full_name || prev.name,
        });
      });
    }

    // Overlay authoritative profiles table (respecting newer unsynced admin edits in db.users)
    if (Array.isArray(profiles)) {
      profiles.forEach((p: any) => {
        const em = String(p.email || '').trim().toLowerCase();
        if (!em) return;
        const prev = mergedByEmail.get(em) || {};
        const prevTime = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
        const profTime = p.updated_at ? new Date(p.updated_at).getTime() : 0;
        const prevIsNewerUnsynced =
          prev.profileSynced === false && prevTime > 0 && (!profTime || prevTime >= profTime);

        if (prevIsNewerUnsynced) {
          const rMeta = resolveCanonicalRole(prev.roleId || prev.role, prev.roleTitle, prev.isSuperAdmin, em);
          const bMeta = resolveCanonicalBranch(prev.branchId, prev.branchName);
          mergedByEmail.set(em, {
            ...p,
            ...prev,
            id: p.id || prev.id,
            full_name: prev.name || prev.full_name || p.full_name,
            name: prev.name || prev.full_name || p.full_name,
            role: rMeta.role,
            role_id: rMeta.roleId,
            roleId: rMeta.roleId,
            role_title: prev.roleTitle || rMeta.roleTitle,
            roleTitle: prev.roleTitle || rMeta.roleTitle,
            branch_id: bMeta.id,
            branchId: bMeta.id,
            branch_name: bMeta.name,
            branchName: bMeta.name,
            branch: bMeta.name,
            is_super_admin: rMeta.isSuperAdmin,
            isSuperAdmin: rMeta.isSuperAdmin,
            is_branch_admin: rMeta.isBranchAdmin,
            isBranchAdmin: rMeta.isBranchAdmin,
            can_import_mortgages: Boolean(
              rMeta.isSuperAdmin || isExplicitMortgageImportEmail(em) || prev.can_import_mortgages || prev.canImportMortgages || p.can_import_mortgages
            ),
            canImportMortgages: Boolean(
              rMeta.isSuperAdmin || isExplicitMortgageImportEmail(em) || prev.can_import_mortgages || prev.canImportMortgages || p.can_import_mortgages
            ),
            is_suspended: prev.is_suspended ?? prev.isSuspended ?? false,
            advocate_roll_no: p.advocate_roll_no || prev.advocate_roll_no || prev.advocateRollNo,
          });
        } else {
          const rMeta = resolveCanonicalRole(p.role_id || p.role, p.role_title, p.is_super_admin, em);
          const bMeta = resolveCanonicalBranch(p.branch_id, p.branch_name || p.branch);
          mergedByEmail.set(em, {
            ...prev,
            ...p,
            full_name: p.full_name || prev.full_name || prev.name,
            name: p.full_name || prev.name || prev.full_name,
            role: rMeta.role,
            role_id: rMeta.roleId,
            roleId: rMeta.roleId,
            role_title: p.role_title || rMeta.roleTitle,
            roleTitle: p.role_title || rMeta.roleTitle,
            branch_id: bMeta.id,
            branchId: bMeta.id,
            branch_name: bMeta.name,
            branchName: bMeta.name,
            branch: bMeta.name,
            is_super_admin: rMeta.isSuperAdmin,
            isSuperAdmin: rMeta.isSuperAdmin,
            is_branch_admin: rMeta.isBranchAdmin,
            isBranchAdmin: rMeta.isBranchAdmin,
            can_import_mortgages: Boolean(
              rMeta.isSuperAdmin || isExplicitMortgageImportEmail(em) || p.can_import_mortgages || prev.can_import_mortgages || prev.canImportMortgages
            ),
            canImportMortgages: Boolean(
              rMeta.isSuperAdmin || isExplicitMortgageImportEmail(em) || p.can_import_mortgages || prev.can_import_mortgages || prev.canImportMortgages
            ),
            is_suspended: prev.is_suspended ?? prev.isSuspended ?? false,
            advocate_roll_no: p.advocate_roll_no || prev.advocate_roll_no || prev.advocateRollNo,
          });
        }
      });
    }

    return res.json({ success: true, data: Array.from(mergedByEmail.values()) });
  } catch (e: any) {
    const db = readDatabase();
    return res.json({ success: true, data: db.users || [] });
  }
});

// Sync all Supabase auth.users (enriched with public.profiles) into the HR module 'employees' table
app.post('/api/hr/sync-users', async (req: Request, res: Response) => {
  try {
    const clientToUse = getSupabaseClientForRequest(req);

    const splitUserName = (rawName?: string | null, email?: string | null) => {
      const cleaned = String(rawName || '').trim();
      if (cleaned) {
        const spaceParts = cleaned.split(/\s+/).filter(Boolean);
        if (spaceParts.length >= 2) {
          return {
            first_name: spaceParts[0],
            last_name: spaceParts.slice(1).join(' '),
          };
        }
        const dotParts = cleaned.split(/[._-]+/).filter(Boolean);
        if (dotParts.length >= 2) {
          const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
          return {
            first_name: cap(dotParts[0]),
            last_name: dotParts.slice(1).map(cap).join(' '),
          };
        }
        return { first_name: cleaned, last_name: 'Staff' };
      }
      const emailPrefix = String(email || '').split('@')[0] || 'Firm';
      const parts = emailPrefix.split(/[._-]+/).filter(Boolean);
      const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      return {
        first_name: cap(parts[0] || 'Firm'),
        last_name: parts.length > 1 ? parts.slice(1).map(cap).join(' ') : 'Member',
      };
    };

    const formatRoleTitle = (role?: string | null, roleTitle?: string | null) => {
      if (roleTitle && String(roleTitle).trim()) return String(roleTitle).trim();
      const r = String(role || '').trim().toLowerCase();
      if (r === 'partner' || r === 'managing_partner') return 'Managing Partner';
      if (r === 'super_admin' || r === 'superadmin') return 'Super Administrator';
      if (r === 'branch_admin') return 'Branch Administrator';
      if (r === 'admin_finance_assistant') return 'Admin & Finance Assistant';
      if (r === 'lawyer' || r === 'advocate') return 'Litigation Advocate';
      if (r === 'clerk') return 'Legal Clerk';
      return role ? String(role).charAt(0).toUpperCase() + String(role).slice(1) : 'Firm Staff';
    };

    // 1. Fetch all auth.users via Admin API when service_role key is available
    let authUsers: any[] = [];
    let source: 'auth.users' | 'profiles' = 'profiles';

    if (hasRealServiceRoleKey()) {
      let page = 1;
      const perPage = 1000;
      while (page <= 10) {
        const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });
        if (listErr) {
          console.warn('[HR Sync] auth.admin.listUsers notice:', listErr.message);
          break;
        }
        const batch = listData?.users || [];
        authUsers.push(...batch);
        if (batch.length < perPage) break;
        page += 1;
      }
      if (authUsers.length > 0) {
        source = 'auth.users';
      }
    }

    // 2. Fetch public.profiles and existing HR employees for enrichment and preservation of HR-specific fields
    const [{ data: profilesData }, { data: existingEmployeesData }] = await Promise.all([
      clientToUse.from('profiles').select('*'),
      clientToUse
        .from('employees')
        .select('id, first_name, last_name, email, phone_number, date_of_birth, job_title, department, status, created_at'),
    ]);

    const profileById = new Map<string, any>();
    const profileByEmail = new Map<string, any>();
    (profilesData || []).forEach((p: any) => {
      if (p?.id) profileById.set(String(p.id), p);
      if (p?.email) profileByEmail.set(String(p.email).trim().toLowerCase(), p);
    });

    const existingById = new Map<string, any>();
    const existingByEmail = new Map<string, any>();
    (existingEmployeesData || []).forEach((e: any) => {
      if (e?.id) existingById.set(String(e.id), e);
      if (e?.email) existingByEmail.set(String(e.email).trim().toLowerCase(), e);
    });

    // 3. Build unified list of firm user records (auth.users first, then any remaining public.profiles)
    const candidateUsers: Array<{
      id: string;
      email: string | null;
      full_name: string | null;
      phone: string | null;
      role: string | null;
      role_title: string | null;
      department: string | null;
      is_suspended: boolean;
    }> = [];
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();

    authUsers.forEach((au: any) => {
      const id = String(au?.id || '').trim();
      const email = au?.email ? String(au.email).trim() : null;
      const emailKey = email ? email.toLowerCase() : '';
      const prof = (id ? profileById.get(id) : null) || (emailKey ? profileByEmail.get(emailKey) : null);
      const meta = au?.user_metadata || {};

      if (id) seenIds.add(id);
      if (emailKey) seenEmails.add(emailKey);

      candidateUsers.push({
        id,
        email,
        full_name: prof?.full_name || meta.full_name || meta.name || null,
        phone: prof?.phone || au?.phone || meta.phone || null,
        role: prof?.role || meta.role || null,
        role_title: prof?.role_title || meta.role_title || null,
        department: prof?.branch_name || prof?.branch || meta.branch_name || meta.branch || 'Kampala Central (Head Office)',
        is_suspended: Boolean(prof?.is_suspended || au?.banned_until),
      });
    });

    (profilesData || []).forEach((prof: any) => {
      const id = String(prof?.id || '').trim();
      const email = prof?.email ? String(prof.email).trim() : null;
      const emailKey = email ? email.toLowerCase() : '';
      if ((id && seenIds.has(id)) || (emailKey && seenEmails.has(emailKey))) return;
      if (id) seenIds.add(id);
      if (emailKey) seenEmails.add(emailKey);

      candidateUsers.push({
        id,
        email,
        full_name: prof?.full_name || null,
        phone: prof?.phone || null,
        role: prof?.role || null,
        role_title: prof?.role_title || null,
        department: prof?.branch_name || prof?.branch || 'Kampala Central (Head Office)',
        is_suspended: Boolean(prof?.is_suspended),
      });
    });

    // 4. Prepare upsert payload for 'employees' table (preserving existing HR overrides like date_of_birth)
    const upsertRows = candidateUsers
      .filter((u) => isUuidString(u.id) || Boolean(u.email))
      .map((u) => {
        const emailKey = u.email ? u.email.toLowerCase() : '';
        const existing = existingById.get(u.id) || (emailKey ? existingByEmail.get(emailKey) : null);
        const { first_name, last_name } = splitUserName(u.full_name, u.email);

        const row: Record<string, any> = {
          first_name: existing?.first_name || first_name,
          last_name: existing?.last_name || last_name,
          email: u.email || existing?.email || null,
          phone_number: existing?.phone_number || u.phone || null,
          date_of_birth: existing?.date_of_birth || null,
          job_title: existing?.job_title || formatRoleTitle(u.role, u.role_title),
          department: existing?.department || u.department || 'Kampala Central (Head Office)',
          status: existing?.status || (u.is_suspended ? 'Inactive' : 'Active'),
        };

        if (isUuidString(existing?.id || u.id)) {
          row.id = existing?.id || u.id;
        }
        return row;
      });

    let upsertedCount = 0;
    let upsertError: string | null = null;

    if (upsertRows.length > 0) {
      const withId = upsertRows.filter((r) => Boolean(r.id));
      const withoutId = upsertRows.filter((r) => !r.id);

      if (withId.length > 0) {
        const { data: upsertedData, error: err } = await clientToUse
          .from('employees')
          .upsert(withId, { onConflict: 'id' })
          .select('id, first_name, last_name, email, phone_number, date_of_birth, job_title, department, status, created_at');
        if (err) {
          upsertError = err.message;
        } else {
          upsertedCount += Array.isArray(upsertedData) ? upsertedData.length : withId.length;
        }
      }

      if (withoutId.length > 0) {
        const { data: insertedData, error: insErr } = await clientToUse
          .from('employees')
          .insert(withoutId)
          .select('id, first_name, last_name, email, phone_number, date_of_birth, job_title, department, status, created_at');
        if (insErr && !upsertError) {
          upsertError = insErr.message;
        } else if (Array.isArray(insertedData)) {
          upsertedCount += insertedData.length;
        }
      }
    }

    // 5. Return freshly synced HR employees list
    const { data: refreshedEmployees } = await clientToUse
      .from('employees')
      .select('id, first_name, last_name, email, phone_number, date_of_birth, job_title, department, status, created_at')
      .order('first_name', { ascending: true });

    return res.json({
      success: !upsertError || (Array.isArray(refreshedEmployees) && refreshedEmployees.length > 0),
      source,
      totalFetched: candidateUsers.length,
      upsertedCount,
      employees: Array.isArray(refreshedEmployees) && refreshedEmployees.length > 0 ? refreshedEmployees : upsertRows,
      error: upsertError,
    });
  } catch (err: any) {
    console.error('[HR Sync] Error syncing firm users to employees:', err);
    return res.status(500).json({
      success: false,
      source: 'profiles',
      totalFetched: 0,
      upsertedCount: 0,
      employees: [],
      error: err?.message || 'Failed to sync firm users to HR employees table.',
    });
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
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    // Mount Vite middleware in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    // When DISABLE_HMR=true disables file watching (`watch: null`), Vite's in-memory
    // moduleGraph would otherwise keep serving stale transforms across page reloads.
    // On-demand mtime invalidation ensures every edited file reflects immediately on refresh.
    const seenMtimes = new Map<string, number>();
    app.use((req, res, next) => {
      const cleanUrl = (req.url || '').split('?')[0];
      if (cleanUrl === '/' || cleanUrl.endsWith('.html') || cleanUrl.startsWith('/src/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
      }

      if (cleanUrl.startsWith('/src/')) {
        const absFile = path.resolve(__dirname, cleanUrl.slice(1));
        try {
          if (fs.existsSync(absFile)) {
            const mtime = fs.statSync(absFile).mtimeMs;
            const prevMtime = seenMtimes.get(absFile);
            if (prevMtime !== mtime) {
              delete req.headers['if-none-match'];
              const mods = vite.moduleGraph.getModulesByFile(absFile);
              if (mods) {
                mods.forEach((mod) => vite.moduleGraph.invalidateModule(mod));
              }
              seenMtimes.set(absFile, mtime);
            }
          }
        } catch {
          // ignore stat errors for virtual modules
        }
      }
      next();
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
