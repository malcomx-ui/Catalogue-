/**
 * MK Advocates & Solicitors
 * Migration Assets: MySQL database schema and cPanel db_config.php template
 */

export const DB_CONFIG_PHP_CONTENT = `<?php
/**
 * MK ADVOCATES & SOLICITORS - CPANEL DATABASE CONFIGURATION
 * 
 * Instructions for cPanel Migration:
 * 1. Log into your cPanel dashboard -> Click "MySQL Databases" or "MySQL Database Wizard".
 * 2. Create a new database (e.g., yourcpanel_mklegal).
 * 3. Create a new user (e.g., yourcpanel_admin) and set a secure password.
 * 4. Add the user to the database and tick "ALL PRIVILEGES".
 * 5. In phpMyAdmin, click the new database, click "Import", select "mk_advocates_database.sql" and click "Go".
 * 6. Enter the database name, username, and password below:
 */

// MySQL Hostname (Almost always 'localhost' on standard cPanel)
define('DB_HOST', 'localhost');

// Your cPanel Database Name (Leave empty to use automatic zero-config file database)
define('DB_NAME', '');

// Your cPanel Database Username
define('DB_USER', '');

// Your cPanel Database Password
define('DB_PASS', '');

// Port & Character Encoding
define('DB_PORT', '3306');
define('DB_CHARSET', 'utf8mb4');

/**
 * AUTO-FALLBACK SAFETY:
 * If DB_NAME is left empty, or if MySQL server is unreachable, the system
 * automatically and safely uses the encrypted server JSON storage in /api/data/firm_database.json.
 * This guarantees 100% uptime and immediate usability even before MySQL is set up.
 */
`;

export const MK_ADVOCATES_SQL_CONTENT = `-- ==============================================================================
-- MK ADVOCATES & SOLICITORS - CENTRAL LEGAL CASE CATALOGUE DATABASE
-- ==============================================================================
-- Target Engine: MySQL 5.7+ / MariaDB 10.3+ (Standard cPanel Hosting)
-- Character Set: utf8mb4 / utf8mb4_unicode_ci
-- Description: Fully relational, production-grade schema for multi-branch Ugandan law firm.
-- Compatible with phpMyAdmin 1-Click Import.
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+03:00"; -- East Africa Time (Uganda)

-- ------------------------------------------------------------------------------
-- 1. TABLE: branches
-- Regional branch network across Uganda
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`branches\`;
CREATE TABLE \`branches\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`code\` VARCHAR(20) NOT NULL UNIQUE,
  \`city\` VARCHAR(100) NOT NULL,
  \`address\` VARCHAR(255) DEFAULT NULL,
  \`phone\` VARCHAR(50) DEFAULT NULL,
  \`email\` VARCHAR(120) DEFAULT NULL,
  \`is_headquarters\` TINYINT(1) DEFAULT 0,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABLE: roles
-- Role-based access control with granular permissions
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`roles\`;
CREATE TABLE \`roles\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`title\` VARCHAR(100) NOT NULL,
  \`description\` TEXT DEFAULT NULL,
  \`permissions\` LONGTEXT DEFAULT NULL COMMENT 'JSON array of permission keys',
  \`is_system\` TINYINT(1) DEFAULT 0,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABLE: users
-- Authorized advocates, associates, clerks, and firm administrators
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(150) NOT NULL,
  \`email\` VARCHAR(150) NOT NULL UNIQUE,
  \`password\` VARCHAR(255) NOT NULL,
  \`role\` VARCHAR(50) NOT NULL,
  \`role_id\` VARCHAR(64) DEFAULT NULL,
  \`role_title\` VARCHAR(100) DEFAULT NULL,
  \`branch_id\` VARCHAR(64) DEFAULT NULL,
  \`branch_name\` VARCHAR(150) DEFAULT NULL,
  \`phone\` VARCHAR(50) DEFAULT NULL,
  \`is_super_admin\` TINYINT(1) DEFAULT 0,
  \`is_branch_admin\` TINYINT(1) DEFAULT 0,
  \`must_change_password\` TINYINT(1) DEFAULT 0,
  \`status\` ENUM('active', 'suspended', 'inactive') DEFAULT 'active',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_users_email\` (\`email\`),
  KEY \`idx_users_branch\` (\`branch_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABLE: cases
-- Legal case catalogue with Uganda court tiers, parties, and stages
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`cases\`;
CREATE TABLE \`cases\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`case_number\` VARCHAR(100) NOT NULL,
  \`title\` VARCHAR(255) DEFAULT NULL,
  \`court\` VARCHAR(150) NOT NULL,
  \`division\` VARCHAR(100) DEFAULT NULL,
  \`judge\` VARCHAR(150) DEFAULT NULL,
  \`client_name\` VARCHAR(200) NOT NULL,
  \`client_role\` VARCHAR(50) DEFAULT NULL COMMENT 'Plaintiff, Defendant, Appellant, Respondent',
  \`client_contact\` VARCHAR(100) DEFAULT NULL,
  \`client_email\` VARCHAR(150) DEFAULT NULL,
  \`opposing_party\` VARCHAR(200) DEFAULT NULL,
  \`opposing_counsel\` VARCHAR(200) DEFAULT NULL,
  \`practice_area\` VARCHAR(100) DEFAULT NULL,
  \`branch_id\` VARCHAR(64) DEFAULT NULL,
  \`status\` ENUM('Active', 'Pending', 'Closed', 'Archived', 'Stayed') DEFAULT 'Active',
  \`stage\` VARCHAR(100) DEFAULT NULL,
  \`filing_date\` DATE DEFAULT NULL,
  \`summary\` LONGTEXT DEFAULT NULL,
  \`parties_json\` LONGTEXT DEFAULT NULL,
  \`assigned_lawyers_json\` LONGTEXT DEFAULT NULL,
  \`financial_json\` LONGTEXT DEFAULT NULL,
  \`filings_json\` LONGTEXT DEFAULT NULL,
  \`tags\` VARCHAR(255) DEFAULT NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_cases_number\` (\`case_number\`),
  KEY \`idx_cases_court\` (\`court\`),
  KEY \`idx_cases_branch\` (\`branch_id\`),
  KEY \`idx_cases_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABLE: hearings
-- Cause list & upcoming court appearances
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`hearings\`;
CREATE TABLE \`hearings\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`case_id\` VARCHAR(64) NOT NULL,
  \`case_number\` VARCHAR(100) NOT NULL,
  \`court\` VARCHAR(150) NOT NULL,
  \`hearing_date\` DATE NOT NULL,
  \`hearing_time\` VARCHAR(20) DEFAULT NULL,
  \`hearing_type\` VARCHAR(100) DEFAULT NULL COMMENT 'Mention, Hearing, Ruling, Judgment, Pre-Trial',
  \`courtroom\` VARCHAR(100) DEFAULT NULL,
  \`presiding_officer\` VARCHAR(150) DEFAULT NULL,
  \`purpose\` TEXT DEFAULT NULL,
  \`outcome\` TEXT DEFAULT NULL,
  \`next_date\` DATE DEFAULT NULL,
  \`branch_id\` VARCHAR(64) DEFAULT NULL,
  \`assigned_counsel_json\` LONGTEXT DEFAULT NULL,
  \`status\` ENUM('scheduled', 'completed', 'adjourned', 'cancelled') DEFAULT 'scheduled',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_hearings_case\` (\`case_id\`),
  KEY \`idx_hearings_date\` (\`hearing_date\`),
  KEY \`idx_hearings_branch\` (\`branch_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABLE: documents
-- Pleadings, court filings, affidavits, submissions, and judgments
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`documents\`;
CREATE TABLE \`documents\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`case_id\` VARCHAR(64) NOT NULL,
  \`case_number\` VARCHAR(100) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`document_type\` VARCHAR(100) DEFAULT NULL,
  \`filing_date\` DATE DEFAULT NULL,
  \`filed_by\` VARCHAR(150) DEFAULT NULL,
  \`file_size\` VARCHAR(50) DEFAULT NULL,
  \`storage_url\` TEXT DEFAULT NULL,
  \`status\` VARCHAR(50) DEFAULT 'Filed',
  \`notes\` TEXT DEFAULT NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_documents_case\` (\`case_id\`),
  KEY \`idx_documents_type\` (\`document_type\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. TABLE: audit_logs
-- Immutable legal firm audit trail for security & compliance
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`audit_logs\`;
CREATE TABLE \`audit_logs\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`timestamp\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`user_id\` VARCHAR(64) DEFAULT NULL,
  \`user_name\` VARCHAR(150) DEFAULT NULL,
  \`action\` VARCHAR(100) NOT NULL,
  \`target_type\` VARCHAR(50) DEFAULT NULL,
  \`target_id\` VARCHAR(64) DEFAULT NULL,
  \`details\` TEXT DEFAULT NULL,
  \`branch_id\` VARCHAR(64) DEFAULT NULL,
  \`ip_address\` VARCHAR(45) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_audit_timestamp\` (\`timestamp\`),
  KEY \`idx_audit_user\` (\`user_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABLE: system_settings
-- Firm metadata, practice preferences, and branch configurations
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`system_settings\`;
CREATE TABLE \`system_settings\` (
  \`setting_key\` VARCHAR(100) NOT NULL,
  \`setting_value\` LONGTEXT DEFAULT NULL,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`setting_key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- INITIAL FIRM SEED DATA
-- ==============================================================================

-- Seed Branches (Uganda Regional Presence)
INSERT INTO \`branches\` (\`id\`, \`name\`, \`code\`, \`city\`, \`address\`, \`phone\`, \`email\`, \`is_headquarters\`) VALUES
('kla-hq', 'Kampala Central (Head Office)', 'KLA-HQ', 'Kampala', 'Plot 14, Lumumba Avenue, Nakasero, Kampala', '+256 414 123 456', 'kla@mkadvocates.ug', 1),
('jja-br', 'Jinja Regional Office', 'JJA-01', 'Jinja', 'Plot 8, Main Street, Jinja City', '+256 434 234 567', 'jinja@mkadvocates.ug', 0),
('mbr-br', 'Mbarara Regional Office', 'MBR-02', 'Mbarara', 'High Street Plaza, Mbarara City', '+256 485 345 678', 'mbarara@mkadvocates.ug', 0),
('glu-br', 'Gulu Regional Office', 'GLU-03', 'Gulu', 'Gulu Commercial Court Road, Gulu City', '+256 471 456 789', 'gulu@mkadvocates.ug', 0);

-- Seed System Roles
INSERT INTO \`roles\` (\`id\`, \`title\`, \`description\`, \`permissions\`, \`is_system\`) VALUES
('role-super-admin', 'Sole Managing Partner & Super Admin', 'Complete control over entire firm operations, user provisioning, branch management, and audit logs', '["manage_users", "delete_records", "view_all_branches", "export_data", "view_audit_logs", "edit_cases", "financial_records"]', 1),
('role-partner', 'Partner', 'Full access to case management, client records, and branch legal operations', '["view_all_branches", "edit_cases", "export_data", "financial_records"]', 1),
('role-senior-advocate', 'Senior Legal Counsel', 'Manage litigation files, court cause lists, and client consultations', '["edit_cases", "export_data"]', 1),
('role-associate', 'Legal Associate', 'Draft pleadings, track case schedules, and update daily proceedings', '["edit_cases"]', 1),
('role-clerk', 'Court Registry Clerk', 'File court pleadings, register incoming suits, and monitor cause list', '["edit_cases"]', 1);

-- Seed Super Admin User (Clean setup, confidentiality preserved)
INSERT INTO \`users\` (\`id\`, \`name\`, \`email\`, \`password\`, \`role\`, \`role_id\`, \`role_title\`, \`branch_id\`, \`branch_name\`, \`phone\`, \`is_super_admin\`, \`is_branch_admin\`, \`must_change_password\`, \`status\`) VALUES
('user-admin-01', 'Firm Administrator', 'infosightug@gmail.com', 'Admin@2026', 'partner', 'role-super-admin', 'Sole Managing Partner & Super Admin', 'kla-hq', 'Kampala Central (Head Office)', '+256 700 000 000', 1, 1, 0, 'active');

-- Seed System Settings
INSERT INTO \`system_settings\` (\`setting_key\`, \`setting_value\`) VALUES
('firm_name', '"MK Advocates & Solicitors"'),
('jurisdiction', '"Republic of Uganda"'),
('version', '"2.0"'),
('deployed_at', 'NOW()');

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- DATABASE INITIALIZATION COMPLETE
-- Import via phpMyAdmin -> Import tab -> Select this file -> Click "Go"
-- ==============================================================================
`;

/**
 * Robust in-browser file downloader using Blob and object URLs.
 * Never performs browser page navigation, avoiding Cloud Run / iframe proxy access errors.
 */
export function downloadFileContent(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1500);
    return true;
  } catch (err) {
    console.error('Blob download failed:', err);
    return false;
  }
}

export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- MUHUMUZA-KIIZA ADVOCATES & LEGAL CONSULTANTS (MK ADVOCATES)
-- Complete Supabase PostgreSQL Schema & Initial Seed
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. BRANCHES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    is_headquarters BOOLEAN DEFAULT false,
    team_lead TEXT DEFAULT '',
    office_admin TEXT DEFAULT '',
    clerk TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    case_count INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'synced',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. FIRM USERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.firm_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'lawyer',
    role_title TEXT NOT NULL DEFAULT 'Advocate',
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    branch_name TEXT DEFAULT '',
    is_super_admin BOOLEAN DEFAULT false,
    is_branch_admin BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    advocate_roll_no TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. LITIGATION CASES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cases (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    case_number TEXT NOT NULL,
    suit_number TEXT NOT NULL,
    firm_ref_number TEXT DEFAULT '',
    title TEXT NOT NULL,
    client_name TEXT NOT NULL,
    court TEXT NOT NULL,
    division TEXT NOT NULL,
    presiding_judge TEXT DEFAULT '',
    court_station TEXT DEFAULT '',
    stage TEXT DEFAULT 'Trial (Plaintiff Stage)',
    priority TEXT DEFAULT 'Standard',
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    branch_name TEXT DEFAULT '',
    lead_advocate TEXT DEFAULT '',
    assisting_advocates TEXT[] DEFAULT '{}',
    parties JSONB DEFAULT '[]'::jsonb,
    opposing_firm TEXT DEFAULT '',
    opposing_counsel TEXT DEFAULT '',
    claim_value_ugx NUMERIC DEFAULT 0,
    filing_date DATE DEFAULT CURRENT_DATE,
    hearing_date DATE,
    next_hearing_date DATE,
    next_hearing_purpose TEXT DEFAULT '',
    status TEXT DEFAULT 'Active',
    brief_summary TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    file_location TEXT DEFAULT 'Central Registry Safe',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 4. COURT HEARINGS / CAUSE LIST TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.court_hearings (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    suit_number TEXT NOT NULL,
    case_title TEXT NOT NULL,
    hearing_date DATE NOT NULL,
    hearing_time TEXT DEFAULT '09:30 AM',
    court_name TEXT NOT NULL,
    division TEXT NOT NULL,
    court_room TEXT DEFAULT '',
    presiding_judge TEXT DEFAULT '',
    hearing_purpose TEXT DEFAULT 'Mention / Hearing',
    lead_counsel TEXT DEFAULT '',
    assigned_advocates TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'Scheduled',
    court_notes TEXT DEFAULT '',
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. PLEADING DOCUMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pleading_documents (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    suit_number TEXT NOT NULL,
    title TEXT NOT NULL,
    document_type TEXT NOT NULL,
    file_format TEXT NOT NULL DEFAULT 'pdf',
    file_size TEXT DEFAULT '1.2 MB',
    filing_date DATE DEFAULT CURRENT_DATE,
    filed_by TEXT DEFAULT '',
    court_registry_stamp BOOLEAN DEFAULT true,
    download_url TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 6. SYSTEM SETTINGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'current_settings',
    firm_name TEXT DEFAULT 'Muhumuza-Kiiza Advocates & Legal Consultants',
    features JSONB DEFAULT '{}'::jsonb,
    entry_fields JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pleading_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Allow public write on branches" ON public.branches FOR ALL USING (true);

CREATE POLICY "Allow public read on firm_users" ON public.firm_users FOR SELECT USING (true);
CREATE POLICY "Allow public write on firm_users" ON public.firm_users FOR ALL USING (true);

CREATE POLICY "Allow public read on cases" ON public.cases FOR SELECT USING (true);
CREATE POLICY "Allow public write on cases" ON public.cases FOR ALL USING (true);

CREATE POLICY "Allow public read on court_hearings" ON public.court_hearings FOR SELECT USING (true);
CREATE POLICY "Allow public write on court_hearings" ON public.court_hearings FOR ALL USING (true);

CREATE POLICY "Allow public read on pleading_documents" ON public.pleading_documents FOR SELECT USING (true);
CREATE POLICY "Allow public write on pleading_documents" ON public.pleading_documents FOR ALL USING (true);

CREATE POLICY "Allow public read on system_settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Allow public write on system_settings" ON public.system_settings FOR ALL USING (true);

-- ------------------------------------------------------------------------------
-- 8. INITIAL SEED DATA: REGIONAL BRANCHES
-- ------------------------------------------------------------------------------
INSERT INTO public.branches (id, name, city, address, is_headquarters, team_lead, phone, case_count) VALUES
('ftp-reg', 'Fort Portal Office', 'Fort Portal', 'Plot 12 Lugard Road, Rwenzori Commercial Chambers', false, 'Adv. Sarah Namatovu', '+256 483 422 150', 30),
('glu-reg', 'Gulu Office', 'Gulu', 'Plot 18 Awere Road, Northern Circuit Towers', false, '', '+256 471 432 890', 0),
('jnj-reg', 'Jinja Office', 'Jinja', 'Plot 32 Main Street, Nile Crescent Building', false, '', '+256 434 120 750', 0),
('kla-hq', 'Kampala Office', 'Kampala', 'Millennium Plaza, 2nd Floor, Plot 69 Spring Road, Bugolobi', true, 'Managing Partner', '+256 414 250 890', 0),
('msk-reg', 'Masaka Office', 'Masaka', 'Plot 24 Elgin Road, Greater Masaka Arcade', false, '', '+256 481 421 990', 0),
('msn-reg', 'Masindi Office', 'Masindi', 'Plot 8 Commercial Street, Bunyoro Commercial Chambers', false, '', '+256 465 420 180', 0),
('mbr-reg', 'Mbarara Office', 'Mbarara', 'Plot 4 High Street, Ankole Kingdom Plaza', false, '', '+256 485 420 310', 0)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 9. INITIAL SEED DATA: FIRM USERS
-- ------------------------------------------------------------------------------
INSERT INTO public.firm_users (id, name, email, role, role_title, branch_id, branch_name, is_super_admin, is_branch_admin, advocate_roll_no) VALUES
('user-admin', 'Firm Administrator', 'infosightug@gmail.com', 'partner', 'Sole Managing Partner & Super Admin', 'kla-hq', 'Kampala Office', true, true, 'MK/ADV/001'),
('user-advocate-ftp', 'Adv. Sarah Namatovu', 'sarah.namatovu@mkadvocates.ug', 'lawyer', 'Regional Trial Advocate', 'ftp-reg', 'Fort Portal Office', false, false, 'MK/ADV/022')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 10. INITIAL SEED DATA: FORT PORTAL MATTERS (30 CASES)
-- ------------------------------------------------------------------------------
INSERT INTO public.cases (id, case_number, suit_number, title, client_name, court, division, status, branch_id, branch_name, lead_advocate) VALUES
('ftp-case-001', 'MK-0017-2020', 'MK-0017-2020', 'BRIGHTH EMMANUEL VS CENTENARY BANK', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-002', 'MK-005-2020', 'MK-005-2020', 'CENTENARY BANK VS MASEREKA ABDUL', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-003', 'MK-006-2020', 'MK-006-2020', 'CENTENARY BANK VS TUGUME JOHN', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-004', 'MK-008-2020', 'MK-008-2020', 'CENTENARY BANK VS KABASINGUZI ALICE', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-005', 'MK-011-2020', 'MK-011-2020', 'CENTENARY BANK VS MUGISA PETER', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-006', 'MK-012-2020', 'MK-012-2020', 'CENTENARY BANK VS KYOMUHENDO GRACE', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-007', 'MK-014-2020', 'MK-014-2020', 'CENTENARY BANK VS BIRUNGI MOSES', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-008', 'MK-015-2020', 'MK-015-2020', 'CENTENARY BANK VS ASIIMWE PATRICK', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-009', 'MK-019-2020', 'MK-019-2020', 'CENTENARY BANK VS TWINOMUJUNI ENID', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-010', 'MK-021-2020', 'MK-021-2020', 'CENTENARY BANK VS BYAMUKAMA JOSEPH', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-011', 'MK-022-2020', 'MK-022-2020', 'CENTENARY BANK VS TUSIIME RICHARD', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-012', 'MK-025-2020', 'MK-025-2020', 'CENTENARY BANK VS MUGAMBWA FRED', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-013', 'MK-027-2020', 'MK-027-2020', 'CENTENARY BANK VS NYANGOMA ROSE', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-014', 'MK-029-2020', 'MK-029-2020', 'CENTENARY BANK VS KIIZA EMMANUEL', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-015', 'MK-031-2020', 'MK-031-2020', 'CENTENARY BANK VS AHEEBWA DAVID', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-016', 'MK-033-2020', 'MK-033-2020', 'CENTENARY BANK VS KAKURU FRANCIS', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-017', 'MK-035-2020', 'MK-035-2020', 'CENTENARY BANK VS TINDYEBWA STEPHEN', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-018', 'MK-036-2020', 'MK-036-2020', 'CENTENARY BANK VS KEMIGISA BEATRICE', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-019', 'MK-038-2020', 'MK-038-2020', 'CENTENARY BANK VS MBABAZI CHARLES', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-020', 'MK-040-2020', 'MK-040-2020', 'CENTENARY BANK VS ATUHEIRE JANET', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-021', 'MK-042-2020', 'MK-042-2020', 'CENTENARY BANK VS RWAKAIKARA PAUL', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Active', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-022', 'MK-044-2020', 'MK-044-2020', 'CENTENARY BANK VS BAZARABUSA SIMON', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Inactive', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-023', 'MK-045-2020', 'MK-045-2020', 'CENTENARY BANK VS KASAIJA RONALD', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Inactive', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-024', 'MK-001-2020', 'MK-001-2020', 'CENTENARY BANK VS TUMWESIGE EDWARD', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Closed', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-025', 'MK-002-2020', 'MK-002-2020', 'CENTENARY BANK VS KOMUNTALE MARY', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Closed', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-026', 'MK-003-2020', 'MK-003-2020', 'CENTENARY BANK VS BUSINGE ROBERT', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Closed', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-027', 'MK-004-2020', 'MK-004-2020', 'CENTENARY BANK VS MUHUMUZA GEOFFREY', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Closed', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-028', 'MK-007-2020', 'MK-007-2020', 'CENTENARY BANK VS KAHWA JULIUS', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Closed', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-029', 'MK-009-2020', 'MK-009-2020', 'CENTENARY BANK VS BAGUMA KENNETH', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Closed', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu'),
('ftp-case-030', 'MK-010-2020', 'MK-010-2020', 'CENTENARY BANK VS NYAKAANA DANIEL', 'CENTENARY BANK', 'High Court of Uganda (Fort Portal Circuit)', 'High Court (Civil Division)', 'Closed', 'ftp-reg', 'Fort Portal Office', 'Adv. Sarah Namatovu')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  updated_at = timezone('utc'::text, now());
`;
