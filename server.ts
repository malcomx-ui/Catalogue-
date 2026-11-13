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
  mortgages: [],
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
        mortgages: Array.isArray(parsed.mortgages) ? parsed.mortgages : [],
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
  const { cases, hearings, documents, mortgages, branches, users, roles, systemSettings } = req.body;
  const current = readDatabase();

  const updated = {
    ...current,
    cases: Array.isArray(cases) ? cases : current.cases,
    hearings: Array.isArray(hearings) ? hearings : current.hearings,
    documents: Array.isArray(documents) ? documents : current.documents,
    mortgages: Array.isArray(mortgages) ? mortgages : (current as any).mortgages || [],
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
      mortgageCount: ((updated as any).mortgages || []).length,
    });
  } else {
    res.status(500).json({ success: false, error: 'Failed to write central database file.' });
  }
});

// Proxy endpoint for live cases fetching to bridge browser restrictions/CORS if any
app.get('/api/cases', async (req: Request, res: Response) => {
  try {
    // 1. Try querying remote Supabase directly via server-side client
    const { data, error } = await supabaseAdmin
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      // Also cache in local database
      const db = readDatabase();
      if (data.length > 0) {
        (db as any).cases = data;
        writeDatabase(db);
      }
      return res.json({ success: true, data, source: 'supabase' });
    }

    // 2. Fallback to local workstation database
    const db = readDatabase();
    res.json({ success: true, data: db.cases || [], source: 'local_database' });
  } catch (err: any) {
    const db = readDatabase();
    res.json({ success: true, data: db.cases || [], source: 'local_database', warning: err.message });
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

app.post('/api/mortgages', (req: Request, res: Response) => {
  try {
    const db = readDatabase();
    const currentList: any[] = (db as any).mortgages || [];
    const payload = req.body;

    const id = payload.id || `mort-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const targetBank = payload.client_bank_name || payload.bank_name || 'Centenary Bank';
    const clientName = payload.client_name || payload.mortgagor_name || payload.borrower_name || payload.name || '';
    const branchName = payload.branch || payload.bank_branch || payload.branch_name || '';

    const newRecord = {
      ...payload,
      id,
      client_bank_name: targetBank,
      bank_name: targetBank,
      client_name: clientName,
      mortgagor_name: clientName,
      borrower_name: clientName,
      branch: branchName,
      bank_branch: branchName,
      created_at: payload.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Check if record already exists by ID
    const existingIndex = currentList.findIndex((m) => m.id === id);
    if (existingIndex >= 0) {
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
    const updates = req.body;
    const db = readDatabase();
    const currentList: any[] = (db as any).mortgages || [];

    const index = currentList.findIndex((m) => String(m.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Mortgage file not found' });
    }

    currentList[index] = {
      ...currentList[index],
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
    const currentList: any[] = (db as any).mortgages || [];

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
    const { records, bank_name } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'Records array is required' });
    }

    const db = readDatabase();
    const currentMortgages: any[] = (db as any).mortgages || [];
    const centenaryCases: any[] = (db as any).centenary_mortgage_cases || [];

    const now = new Date().toISOString();
    const normalizedNewMortgages: any[] = [];
    const normalizedCentenary: any[] = [];

    records.forEach((r: any) => {
      const id = r.id || `mort-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const clientName = r.client_name || r.borrower_name || r.name || 'Unknown Client';
      const branchName = r.branch || r.bank_branch || 'Head Office';
      const targetBank = r.bank_name || bank_name || 'Centenary Bank';
      const loanAmount = Number(r.loan_amount) || 0;
      const grandTotal = Number(r.grand_total) || loanAmount;
      const rimNo = String(r.rim_no || '');
      const propDesc = String(r.property_description || r.description || '');
      const comments = String(r.comments || '');
      const sourceSheet = String(r.source_sheet || 'Bulk Import');
      const monthSheet = String(r.month_sheet || '');
      const recordYear = Number(r.record_year) || new Date().getFullYear();

      normalizedCentenary.push({
        id,
        bank_name: targetBank,
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
        branch_name: branchName,
        file_number: rimNo || `MORT-${Date.now().toString().slice(-5)}`,
        rim_no: rimNo,
        borrower_name: clientName,
        mortgagor_name: clientName,
        client_name: clientName,
        name: clientName,
        loan_amount: loanAmount,
        stamp_duty: Number(r.stamp_duty) || 0,
        extra_copies: Number(r.extra_copies) || 0,
        registration: Number(r.registration) || 0,
        other: Number(r.other) || 0,
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

    (db as any).mortgages = [...normalizedNewMortgages, ...currentMortgages];
    (db as any).centenary_mortgage_cases = [...normalizedCentenary, ...centenaryCases];
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
// Helper to resolve canonical branch station
function resolveCanonicalBranch(branchId?: string, branchName?: string) {
  const clean = `${branchId || ''} ${branchName || ''}`.toLowerCase();
  if (branchId === 'ftp-reg' || clean.includes('fort') || clean.includes('portal') || clean.includes('ftp')) {
    return { id: 'ftp-reg', name: 'Fort Portal Regional Office' };
  }
  if (branchId === 'mbr-reg' || clean.includes('mbarara') || clean.includes('mbr')) {
    return { id: 'mbr-reg', name: 'Mbarara Regional Office' };
  }
  if (branchId === 'msk-reg' || clean.includes('masaka') || clean.includes('msk')) {
    return { id: 'msk-reg', name: 'Masaka Regional Office' };
  }
  if (branchId === 'jnj-reg' || clean.includes('jinja') || clean.includes('jnj')) {
    return { id: 'jnj-reg', name: 'Jinja Regional Office' };
  }
  if (branchId === 'glu-reg' || clean.includes('gulu') || clean.includes('glu')) {
    return { id: 'glu-reg', name: 'Gulu Regional Office' };
  }
  if (branchId === 'msn-reg' || clean.includes('masindi') || clean.includes('msn')) {
    return { id: 'msn-reg', name: 'Masindi Regional Office' };
  }
  return { id: 'kla-hq', name: 'Kampala Central (Head Office)' };
}

// Helper to resolve canonical role and privileges
function resolveCanonicalRole(roleId?: string, roleTitle?: string, isSuper?: boolean) {
  const clean = `${roleId || ''} ${roleTitle || ''}`.toLowerCase();
  if (isSuper || clean.includes('super') || clean.includes('partner') || clean.includes('managing')) {
    return {
      roleId: 'role-super-admin',
      role: 'partner',
      roleTitle: 'Managing Partner (Super Admin)',
      isSuperAdmin: true,
      isBranchAdmin: false,
    };
  }
  if (clean.includes('admin') || clean.includes('branch_admin') || clean.includes('branch-admin')) {
    return {
      roleId: 'role-admin',
      role: 'admin',
      roleTitle: 'Branch Administrator',
      isSuperAdmin: false,
      isBranchAdmin: true,
    };
  }
  if (clean.includes('team') || clean.includes('lead')) {
    return {
      roleId: 'role-team-lead',
      role: 'lawyer',
      roleTitle: 'Litigation Team Lead',
      isSuperAdmin: false,
      isBranchAdmin: false,
    };
  }
  if (clean.includes('clerk')) {
    return {
      roleId: 'role-clerk',
      role: 'clerk',
      roleTitle: 'Court Registry Clerk',
      isSuperAdmin: false,
      isBranchAdmin: false,
    };
  }
  return {
    roleId: 'role-advocate',
    role: 'lawyer',
    roleTitle: roleTitle || 'Litigation Lawyer / Associate',
    isSuperAdmin: false,
    isBranchAdmin: false,
  };
}

// ==============================================================================
// User Update API Route: Atomically updates Supabase Auth user_metadata,
// public profiles table, and firm_users, returning complete updated record
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
      advocateRollNo,
      advocate_roll_no,
      password,
    } = req.body;

    const resolvedEmail = (email || '').trim().toLowerCase();
    const resolvedName = (name || full_name || '').trim();
    const rawBranchId = (branchId || branch_id || '').trim();
    const rawBranchName = (branchName || branch_name || branch || '').trim();
    const rawRoleId = (roleId || role_id || role || '').trim();
    const rawRoleTitle = (roleTitle || role_title || '').trim();
    const isSuperInput = isSuperAdmin !== undefined ? Boolean(isSuperAdmin) : (is_super_admin !== undefined ? Boolean(is_super_admin) : undefined);
    const isBranchInput = isBranchAdmin !== undefined ? Boolean(isBranchAdmin) : (is_branch_admin !== undefined ? Boolean(is_branch_admin) : undefined);

    // Resolve canonical station and role
    const branchMeta = resolveCanonicalBranch(rawBranchId, rawBranchName);
    const roleMeta = resolveCanonicalRole(rawRoleId, rawRoleTitle, isSuperInput);
    if (isBranchInput !== undefined) {
      roleMeta.isBranchAdmin = isBranchInput;
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);

    // 1. Resolve Auth UUID
    let authUserId: string | null = isUUID ? targetId : null;
    let existingProfile: any = null;

    // Check profiles table for target
    try {
      if (authUserId) {
        const { data: pById } = await supabaseAdmin.from('profiles').select('*').eq('id', authUserId).maybeSingle();
        if (pById) existingProfile = pById;
      }
      if (!existingProfile && resolvedEmail) {
        const { data: pByEmail } = await supabaseAdmin.from('profiles').select('*').eq('email', resolvedEmail).maybeSingle();
        if (pByEmail) {
          existingProfile = pByEmail;
          if (pByEmail.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pByEmail.id)) {
            authUserId = pByEmail.id;
          }
        }
      }
    } catch (lookupErr) {
      console.warn('[User Update] Profile lookup notice:', lookupErr);
    }

    // Check Supabase Auth user list if authUserId not resolved
    if (!authUserId && resolvedEmail) {
      try {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const matched = userList?.users?.find(
          (u) => u.email?.toLowerCase() === resolvedEmail
        );
        if (matched) {
          authUserId = matched.id;
        }
      } catch (authListErr) {
        console.warn('[User Update] Auth user list notice:', authListErr);
      }
    }

    const finalFullName = resolvedName || existingProfile?.full_name || existingProfile?.name || '';
    const finalEmail = resolvedEmail || existingProfile?.email || '';

    // 2. Prepare user_metadata for Supabase Auth
    const userMetadata: Record<string, any> = {
      role: roleMeta.roleId,
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

    // 3. Update Supabase Auth user_metadata (via supabaseAdmin.auth.admin.updateUserById)
    let authUpdated = false;
    let authError: string | null = null;

    if (authUserId) {
      try {
        const authPayload: any = {
          user_metadata: userMetadata,
        };
        if (finalEmail) authPayload.email = finalEmail;
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
      } catch (authEx: any) {
        authError = authEx?.message || 'Auth admin update exception';
        console.warn('[User Update API] Auth update exception:', authEx);
      }
    }

    // 4. Update public 'profiles' table atomically
    const profileRow: Record<string, any> = {
      role: roleMeta.roleId,
      role_id: roleMeta.roleId,
      role_title: roleMeta.roleTitle,
      branch_id: branchMeta.id,
      branch_name: branchMeta.name,
      branch: branchMeta.name,
      is_super_admin: roleMeta.isSuperAdmin,
      is_branch_admin: roleMeta.isBranchAdmin,
      updated_at: new Date().toISOString(),
    };
    if (finalFullName) profileRow.full_name = finalFullName;
    if (finalEmail) profileRow.email = finalEmail;
    if (authUserId) profileRow.id = authUserId;

    let profileUpdated = false;
    let completeProfile: any = null;

    try {
      // 4a. Update by authUserId if available
      if (authUserId) {
        const { data: pData, error: pErr } = await supabaseAdmin
          .from('profiles')
          .update(profileRow)
          .eq('id', authUserId)
          .select('*');

        if (!pErr && pData && pData.length > 0) {
          profileUpdated = true;
          completeProfile = pData[0];
        }
      }

      // 4b. Update by email if not updated
      if (!profileUpdated && finalEmail) {
        const { data: pEmailData, error: peErr } = await supabaseAdmin
          .from('profiles')
          .update(profileRow)
          .eq('email', finalEmail)
          .select('*');

        if (!peErr && pEmailData && pEmailData.length > 0) {
          profileUpdated = true;
          completeProfile = pEmailData[0];
        }
      }

      // 4c. Upsert into profiles to ensure record exists
      if (!profileUpdated && (authUserId || finalEmail)) {
        const upsertRow: any = {
          ...profileRow,
          id: authUserId || (isUUID ? targetId : undefined),
          email: finalEmail || undefined,
        };
        if (!upsertRow.id) delete upsertRow.id;

        const { data: insData, error: insErr } = await supabaseAdmin
          .from('profiles')
          .upsert([upsertRow], { onConflict: authUserId ? 'id' : 'email' })
          .select('*');

        if (!insErr && insData && insData.length > 0) {
          profileUpdated = true;
          completeProfile = insData[0];
        }
      }
    } catch (profErr) {
      console.warn('[User Update] Profiles update exception:', profErr);
    }

    // 5. Keep public 'firm_users' table synchronized
    try {
      const firmUserUpdates: any = {
        name: finalFullName || undefined,
        role: roleMeta.roleId,
        role_title: roleMeta.roleTitle,
        branch_name: branchMeta.name,
        branch_id: branchMeta.id,
        is_super_admin: roleMeta.isSuperAdmin,
        is_branch_admin: roleMeta.isBranchAdmin,
        updated_at: new Date().toISOString(),
      };
      if (finalEmail) firmUserUpdates.email = finalEmail;
      if (advocateRollNo || advocate_roll_no) {
        firmUserUpdates.advocate_roll_no = advocateRollNo || advocate_roll_no;
      }

      if (authUserId) {
        await supabaseAdmin.from('firm_users').update(firmUserUpdates).eq('id', authUserId);
      }
      if (targetId && targetId !== authUserId) {
        await supabaseAdmin.from('firm_users').update(firmUserUpdates).eq('id', targetId);
      }
      if (finalEmail) {
        await supabaseAdmin.from('firm_users').update(firmUserUpdates).eq('email', finalEmail);
      }
    } catch (fuErr) {
      console.warn('[User Update] firm_users update notice:', fuErr);
    }

    // 6. Update in-memory and server_data/firm_database.json
    const db = readDatabase();
    db.users = (db.users || []).map((u: any) => {
      if (u.id === targetId || u.id === authUserId || (finalEmail && u.email?.toLowerCase() === finalEmail)) {
        return {
          ...u,
          name: finalFullName || u.name,
          email: finalEmail || u.email,
          role: roleMeta.role,
          roleId: roleMeta.roleId,
          roleTitle: roleMeta.roleTitle,
          branchName: branchMeta.name,
          branchId: branchMeta.id,
          isSuperAdmin: roleMeta.isSuperAdmin,
          isBranchAdmin: roleMeta.isBranchAdmin,
          advocateRollNo: advocateRollNo || advocate_roll_no || u.advocateRollNo,
        };
      }
      return u;
    });
    writeDatabase(db);

    // 7. Ensure complete, populated profile record is constructed
    const returnedProfile = completeProfile || {
      id: authUserId || targetId,
      full_name: finalFullName,
      name: finalFullName,
      email: finalEmail,
      role: roleMeta.roleId,
      role_id: roleMeta.roleId,
      role_title: roleMeta.roleTitle,
      branch_id: branchMeta.id,
      branch_name: branchMeta.name,
      branch: branchMeta.name,
      is_super_admin: roleMeta.isSuperAdmin,
      is_branch_admin: roleMeta.isBranchAdmin,
      updated_at: new Date().toISOString(),
    };

    const returnedUser = {
      id: authUserId || targetId,
      email: finalEmail,
      name: finalFullName,
      role: roleMeta.role,
      roleId: roleMeta.roleId,
      roleTitle: roleMeta.roleTitle,
      branchId: branchMeta.id,
      branchName: branchMeta.name,
      isSuperAdmin: roleMeta.isSuperAdmin,
      isBranchAdmin: roleMeta.isBranchAdmin,
      advocateRollNo: advocateRollNo || advocate_roll_no || '',
    };

    return res.json({
      success: true,
      message: 'Staff updated successfully across Auth user_metadata, profiles, and firm_users',
      authUpdated,
      authError,
      profileUpdated,
      profile: returnedProfile,
      user: returnedUser,
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
app.post(['/api/users/:id', '/api/users/update', '/api/staff/:id', '/api/staff/update'], handleUserUpdate);
app.put(['/api/users/:id', '/api/users/update', '/api/staff/:id', '/api/staff/update'], handleUserUpdate);
app.patch(['/api/users/:id', '/api/users/update', '/api/staff/:id', '/api/staff/update'], handleUserUpdate);

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
