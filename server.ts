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

  // Protect newer server-persisted staff edits against stale client overwrites
  let mergedUsers = current.users;
  if (Array.isArray(users)) {
    const existingByKey = new Map<string, any>();
    (current.users || []).forEach((u: any) => {
      if (u?.id) existingByKey.set(`id:${u.id}`, u);
      if (u?.email) existingByKey.set(`email:${String(u.email).trim().toLowerCase()}`, u);
    });
    mergedUsers = users.map((incoming: any) => {
      const existing =
        (incoming?.id && existingByKey.get(`id:${incoming.id}`)) ||
        (incoming?.email && existingByKey.get(`email:${String(incoming.email).trim().toLowerCase()}`));
      if (existing) {
        const exTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const inTime = incoming?.updatedAt ? new Date(incoming.updatedAt).getTime() : 0;
        if (exTime > inTime) {
          return { ...incoming, ...existing };
        }
      }
      return incoming;
    });
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

      // Preserve newer local progressiveNotes / fileMovementHistory / transferHistory if DB lacks those columns
      const merged = data.map((row: any) => {
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

app.post('/api/cases', (req: Request, res: Response) => {
  try {
    const db = readDatabase();
    const payload = { ...(req.body || {}) };
    const id = payload.id || `case-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();
    const record = { ...payload, id, lastUpdated: payload.lastUpdated || nowIso };

    const list: any[] = Array.isArray(db.cases) ? db.cases : [];
    const idx = list.findIndex((c: any) => String(c.id) === String(id));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...record };
    } else {
      list.unshift(record);
    }
    (db as any).cases = list;
    writeDatabase(db);
    return res.json({ success: true, data: record });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to save case in workstation DB.' });
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
app.get('/api/mortgages', (req: Request, res: Response) => {
  try {
    const db = readDatabase();
    let records: any[] = (db as any).mortgages || [];

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
  const roleMeta = resolveCanonicalRole(
    matchedDbUser?.roleId || matchedDbUser?.role || hdrRole,
    matchedDbUser?.roleTitle,
    matchedDbUser?.isSuperAdmin,
    hdrEmail || matchedDbUser?.email
  );
  const branchMeta = resolveCanonicalBranch(
    matchedDbUser?.branchId || hdrBranch,
    matchedDbUser?.branchName
  );

  return {
    hasActor,
    email: hdrEmail || String(matchedDbUser?.email || '').toLowerCase(),
    roleId: roleMeta.roleId,
    role: roleMeta.role,
    isSuperAdmin: roleMeta.isSuperAdmin,
    branchId: branchMeta.id,
    branchName: branchMeta.name,
  };
}

function getRecordBranchId(record: any): string | null {
  if (!record) return null;
  const rawId = String(record.branch_id || record.branchId || '').trim();
  const rawName = String(record.branch || record.branch_name || record.branchName || record.bank_branch || record.client_branch_location || '').trim();
  if (!rawId && !rawName) return null;
  return resolveCanonicalBranch(rawId, rawName).id;
}

function canActorModifyMortgage(actor: ReturnType<typeof resolveRequestActor>, record: any): boolean {
  if (!actor.hasActor || actor.isSuperAdmin) return true;
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

    const rawBranchId = String(payload.branch_id || payload.branchId || '').trim();
    const rawBranchName = String(payload.branch || payload.bank_branch || payload.branch_name || payload.client_branch_location || '').trim();

    let resolvedBranch: { id: string; name: string };
    if (!rawBranchId && !rawBranchName) {
      resolvedBranch = actor.hasActor
        ? { id: actor.branchId, name: actor.branchName }
        : { id: 'kla-hq', name: 'Kampala Central (Head Office)' };
    } else {
      resolvedBranch = resolveCanonicalBranch(rawBranchId, rawBranchName);
    }

    if (actor.hasActor && !actor.isSuperAdmin && resolvedBranch.id !== actor.branchId) {
      return res.status(403).json({
        success: false,
        error: `Branch restriction: You can only create mortgage files assigned to ${actor.branchName}.`,
      });
    }

    const id = payload.id || `mort-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const targetBank = payload.client_bank_name || payload.bank_name || 'Centenary Bank';
    const clientName = payload.client_name || payload.mortgagor_name || payload.borrower_name || payload.name || '';
    const branchName = rawBranchName || resolvedBranch.name;

    const newRecord = {
      ...payload,
      id,
      client_bank_name: targetBank,
      bank_name: targetBank,
      client_name: clientName,
      mortgagor_name: clientName,
      borrower_name: clientName,
      branch_id: resolvedBranch.id,
      branch: branchName,
      branch_name: resolvedBranch.name,
      bank_branch: branchName,
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
    if (!canActorModifyMortgage(actor, existing)) {
      return res.status(403).json({
        success: false,
        error: `View-only access: You can only edit mortgage files strictly belonging to ${actor.branchName}.`,
      });
    }

    const incomingBranchId = String(updates.branch_id || updates.branchId || '').trim();
    const incomingBranchName = String(updates.branch || updates.branch_name || updates.bank_branch || updates.client_branch_location || '').trim();
    if (incomingBranchId || incomingBranchName) {
      const targetBranch = resolveCanonicalBranch(incomingBranchId, incomingBranchName);
      if (actor.hasActor && !actor.isSuperAdmin && targetBranch.id !== actor.branchId) {
        return res.status(403).json({
          success: false,
          error: `Cross-branch transfer is restricted. You cannot reassign this file away from ${actor.branchName}.`,
        });
      }
      updates.branch_id = targetBranch.id;
      updates.branch_name = targetBranch.name;
      if (!updates.branch) updates.branch = targetBranch.name;
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
app.post('/api/mortgages/batch', (req: Request, res: Response) => {
  try {
    const db = readDatabase();
    const actor = resolveRequestActor(req, db);
    if (actor.hasActor && !actor.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Bulk Excel mortgage import is restricted strictly to Managing Partners / Super Administrators.',
      });
    }

    const { records, bank_name } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'Records array is required' });
    }

    const currentMortgages: any[] = (db as any).mortgages || [];
    const centenaryCases: any[] = (db as any).centenary_mortgage_cases || [];

    const now = new Date().toISOString();
    const normalizedNewMortgages: any[] = [];
    const normalizedCentenary: any[] = [];

    records.forEach((r: any) => {
      const id = r.id || `mort-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const clientName = r.client_name || r.borrower_name || r.name || 'Unknown Client';
      const branchName = r.branch || r.client_branch_location || r.bank_branch || 'Head Office';
      const resolvedBranch = resolveCanonicalBranch(r.branch_id || r.branchId, branchName);
      const targetBank = r.bank_name || r.client_bank_name || bank_name || 'Centenary Bank';
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
        id,
        bank_name: targetBank,
        branch_id: resolvedBranch.id,
        branch: branchName,
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
        id,
        client_bank_name: targetBank,
        bank_name: targetBank,
        record_year: recordYear,
        month_sheet: monthSheet,
        source_sheet: sourceSheet,
        date_of_receipt: r.date_of_receipt || null,
        bank_branch: branchName,
        branch: branchName,
        client_branch_location: branchName,
        branch_id: resolvedBranch.id,
        branch_name: resolvedBranch.name,
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

  for (let attempt = 0; attempt < 6; attempt++) {
    let res: any;
    if (mode === 'update-id' && matchValue) {
      res = await sbClient.from('profiles').update(workingPayload).eq('id', matchValue).select('*');
    } else if (mode === 'update-email' && matchValue) {
      res = await sbClient.from('profiles').update(workingPayload).ilike('email', matchValue).select('*');
    } else {
      res = await sbClient
        .from('profiles')
        .upsert([workingPayload], { onConflict: matchValue === 'id' ? 'id' : 'email' })
        .select('*');
    }

    if (!res.error) return res;
    const missingCol = extractMissingColumn(res.error.message);
    if (missingCol && missingCol in workingPayload) {
      delete workingPayload[missingCol];
      continue;
    }
    return res;
  }
  return { data: null, error: { message: 'Max schema retry attempts reached' } };
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
    const profileRow: Record<string, any> = {
      role: roleMeta.role,
      role_id: roleMeta.roleId,
      role_title: roleMeta.roleTitle,
      branch_id: branchMeta.id,
      branch_name: branchMeta.name,
      branch: branchMeta.name,
      is_super_admin: roleMeta.isSuperAdmin,
      is_branch_admin: roleMeta.isBranchAdmin,
      updated_at: nowIso,
    };
    if (finalFullName) profileRow.full_name = finalFullName;
    if (finalEmail) profileRow.email = finalEmail;
    if (finalMustChange !== undefined) profileRow.must_change_password = finalMustChange;

    let profileUpdated = false;
    let profileError: string | null = null;
    let completeProfile: any = null;

    try {
      const idForProfile = authUserId || targetId;
      if (idForProfile) {
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
        const upsertRow: any = {
          ...profileRow,
          id: authUserId || targetId || `user-${Date.now()}`,
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
      const baseRoll = (
        advocateRollNo ||
        advocate_roll_no ||
        extractPasswordFromRollNo(existingDbUser?.advocateRollNo).rollNo ||
        ''
      )
        .split(':::[PW]:')[0]
        .trim();

      const effectivePw = trimmedPassword || existingDbUser?.password;
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
        await sbClient.from('firm_users').upsert(
          [
            {
              id: authUserId || targetId || `user-${Date.now()}`,
              name: finalFullName || finalEmail.split('@')[0],
              email: finalEmail,
              ...firmUserUpdates,
            },
          ],
          { onConflict: 'email' }
        );
      }
    } catch (fuErr) {
      console.warn('[User Update] firm_users update notice:', fuErr);
    }

    // 6. Update in-memory and server_data/firm_database.json
    const finalRecordId = authUserId || targetId || existingDbUser?.id || `user-${Date.now()}`;
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
          isSuspended: isSuspended !== undefined ? Boolean(isSuspended) : is_suspended !== undefined ? Boolean(is_suspended) : u.isSuspended,
          suspendedReason: suspendedReason !== undefined ? suspendedReason : suspended_reason !== undefined ? suspended_reason : u.suspendedReason,
          password: trimmedPassword || u.password,
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

    const targetUserId = authUserId || `user-${Date.now()}`;
    const sbClient = getSupabaseClientForRequest(req);
    const nowIso = new Date().toISOString();

    // 2. Prepare profileRow and upsert into public.profiles cleanly (no unsupported columns)
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
      must_change_password: Boolean(mustChangePassword ?? true),
      updated_at: nowIso,
    };

    let profileData: any = null;
    try {
      const { data: pData } = await safeProfileMutation('upsert', profileRow, 'email', sbClient);
      if (pData && pData.length > 0) {
        profileData = pData[0];
      }
    } catch (pe) {
      console.warn('[handleUserCreate] Profiles table upsert notice:', pe);
    }

    // 3. Keep public.firm_users table synchronized (with embedded credential for cross-device login fallback)
    const baseRoll = (advocateRollNo || advocate_roll_no || '').split(':::[PW]:')[0].trim();
    try {
      const firmUserRow: Record<string, any> = {
        id: targetUserId,
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
      await sbClient.from('firm_users').upsert([firmUserRow], { onConflict: 'email' });
    } catch (fe) {}

    // 4. Update in-memory server database
    const db = readDatabase();
    const newUserRecord = {
      id: targetUserId,
      name: resolvedName,
      email: resolvedEmail,
      role: roleMeta.role,
      roleId: roleMeta.roleId,
      roleTitle: roleMeta.roleTitle,
      branchId: branchMeta.id,
      branchName: branchMeta.name,
      isSuperAdmin: roleMeta.isSuperAdmin,
      isBranchAdmin: roleMeta.isBranchAdmin,
      isSuspended: false,
      password: rawPassword,
      temporaryPassword: rawPassword,
      mustChangePassword: Boolean(mustChangePassword ?? true),
      advocateRollNo: baseRoll,
      updatedAt: nowIso,
      profileSynced: Boolean(profileData),
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
      message: 'Staff account provisioned successfully across firm database and directory.',
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
        .eq('email', cleanEmail)
        .maybeSingle();
      if (data) sbFirmUser = data;
    } catch {}

    let sbProfile: any = null;
    try {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();
      if (data) sbProfile = data;
    } catch {}

    const sourceRecord = sbProfile || sbFirmUser || dbUser;
    if (!sourceRecord) {
      return res.status(401).json({ success: false, error: 'Invalid email or password. Account not found in firm directory.' });
    }

    if (Boolean(sbFirmUser?.is_suspended ?? dbUser?.isSuspended)) {
      return res.status(403).json({
        success: false,
        error: `This account is SUSPENDED: ${dbUser?.suspendedReason || 'Access restricted by Super Admin. Contact Managing Partner.'}`,
      });
    }

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
      firmPw,
    ].filter((p): p is string => Boolean(p && String(p).trim()));

    // Fallback default password ONLY if no explicit password has been stored for the user
    if (expectedPasswords.length === 0) {
      expectedPasswords.push(defaultRolePassword(roleMeta.roleId));
    }

    const passwordMatched = expectedPasswords.some((p) => p === cleanPass);
    if (!passwordMatched) {
      return res.status(401).json({ success: false, error: 'Invalid email or password. Please verify your credentials.' });
    }

    const resolvedId = String(sbProfile?.id || sbFirmUser?.id || dbUser?.id || `user-${Date.now()}`);
    const resolvedName = String(sbProfile?.full_name || sbFirmUser?.name || dbUser?.name || cleanEmail.split('@')[0]);

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
    const newPassword = String(req.body?.password || '').trim();

    if (!cleanEmail && !userId) {
      return res.status(400).json({ success: false, error: 'User identifier is required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    const db = readDatabase();
    let targetEmail = cleanEmail;
    db.users = (db.users || []).map((u: any) => {
      if ((userId && u.id === userId) || (cleanEmail && u.email?.toLowerCase() === cleanEmail)) {
        targetEmail = targetEmail || u.email?.toLowerCase();
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

    if (targetEmail) {
      try {
        const { data: fu } = await supabaseAdmin.from('firm_users').select('*').eq('email', targetEmail).maybeSingle();
        if (fu) {
          const { rollNo } = extractPasswordFromRollNo(fu.advocate_roll_no);
          await supabaseAdmin
            .from('firm_users')
            .update({ advocate_roll_no: `${rollNo}:::[PW]:${newPassword}` })
            .eq('email', targetEmail);
        }
      } catch {}

      try {
        await safeProfileMutation('update-email', {
          must_change_password: false,
          updated_at: new Date().toISOString(),
        }, targetEmail);
      } catch {}
    }

    if (hasRealServiceRoleKey() && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
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
