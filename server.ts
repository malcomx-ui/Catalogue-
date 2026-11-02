import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
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

// One-click Central Database Backup Download
app.get('/api/database/backup', (req: Request, res: Response) => {
  const db = readDatabase();
  const dateStr = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=mk_firm_central_backup_${dateStr}.json`);
  res.send(JSON.stringify(db, null, 2));
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

// One-click Central Database Restore
app.post('/api/database/restore', (req: Request, res: Response) => {
  const backupData = req.body;
  if (!backupData || (!Array.isArray(backupData.cases) && !Array.isArray(backupData.users))) {
    return res.status(400).json({ success: false, error: 'Invalid backup file structure.' });
  }

  const ok = writeDatabase({
    version: '2.0',
    lastUpdated: new Date().toISOString(),
    cases: Array.isArray(backupData.cases) ? backupData.cases : [],
    hearings: Array.isArray(backupData.hearings) ? backupData.hearings : [],
    documents: Array.isArray(backupData.documents) ? backupData.documents : [],
    branches: Array.isArray(backupData.branches) ? backupData.branches : DEFAULT_DATABASE.branches,
    users: Array.isArray(backupData.users) ? backupData.users : DEFAULT_DATABASE.users,
    roles: Array.isArray(backupData.roles) ? backupData.roles : DEFAULT_DATABASE.roles,
  });

  if (ok) {
    res.json({ success: true, message: 'Database restored successfully to central server.' });
  } else {
    res.status(500).json({ success: false, error: 'Could not write restored database.' });
  }
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
