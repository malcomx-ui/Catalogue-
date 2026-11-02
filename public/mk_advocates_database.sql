-- ==============================================================================
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
DROP TABLE IF EXISTS `branches`;
CREATE TABLE `branches` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `city` VARCHAR(100) NOT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(120) DEFAULT NULL,
  `is_headquarters` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABLE: roles
-- Role-based access control with granular permissions
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `permissions` LONGTEXT DEFAULT NULL COMMENT 'JSON array of permission keys',
  `is_system` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABLE: users
-- Authorized advocates, associates, clerks, and firm administrators
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `role_id` VARCHAR(64) DEFAULT NULL,
  `role_title` VARCHAR(100) DEFAULT NULL,
  `branch_id` VARCHAR(64) DEFAULT NULL,
  `branch_name` VARCHAR(150) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `is_super_admin` TINYINT(1) DEFAULT 0,
  `is_branch_admin` TINYINT(1) DEFAULT 0,
  `must_change_password` TINYINT(1) DEFAULT 0,
  `status` ENUM('active', 'suspended', 'inactive') DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABLE: cases
-- Legal case catalogue with Uganda court tiers, parties, and stages
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `cases`;
CREATE TABLE `cases` (
  `id` VARCHAR(64) NOT NULL,
  `case_number` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) DEFAULT NULL,
  `court` VARCHAR(150) NOT NULL,
  `division` VARCHAR(100) DEFAULT NULL,
  `judge` VARCHAR(150) DEFAULT NULL,
  `client_name` VARCHAR(200) NOT NULL,
  `client_role` VARCHAR(50) DEFAULT NULL COMMENT 'Plaintiff, Defendant, Appellant, Respondent',
  `client_contact` VARCHAR(100) DEFAULT NULL,
  `client_email` VARCHAR(150) DEFAULT NULL,
  `opposing_party` VARCHAR(200) DEFAULT NULL,
  `opposing_counsel` VARCHAR(200) DEFAULT NULL,
  `practice_area` VARCHAR(100) DEFAULT NULL,
  `branch_id` VARCHAR(64) DEFAULT NULL,
  `status` ENUM('Active', 'Pending', 'Closed', 'Archived', 'Stayed') DEFAULT 'Active',
  `stage` VARCHAR(100) DEFAULT NULL,
  `filing_date` DATE DEFAULT NULL,
  `summary` LONGTEXT DEFAULT NULL,
  `parties_json` LONGTEXT DEFAULT NULL,
  `assigned_lawyers_json` LONGTEXT DEFAULT NULL,
  `financial_json` LONGTEXT DEFAULT NULL,
  `filings_json` LONGTEXT DEFAULT NULL,
  `tags` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cases_number` (`case_number`),
  KEY `idx_cases_court` (`court`),
  KEY `idx_cases_branch` (`branch_id`),
  KEY `idx_cases_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABLE: hearings
-- Cause list & upcoming court appearances
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `hearings`;
CREATE TABLE `hearings` (
  `id` VARCHAR(64) NOT NULL,
  `case_id` VARCHAR(64) NOT NULL,
  `case_number` VARCHAR(100) NOT NULL,
  `court` VARCHAR(150) NOT NULL,
  `hearing_date` DATE NOT NULL,
  `hearing_time` VARCHAR(20) DEFAULT NULL,
  `hearing_type` VARCHAR(100) DEFAULT NULL COMMENT 'Mention, Hearing, Ruling, Judgment, Pre-Trial',
  `courtroom` VARCHAR(100) DEFAULT NULL,
  `presiding_officer` VARCHAR(150) DEFAULT NULL,
  `purpose` TEXT DEFAULT NULL,
  `outcome` TEXT DEFAULT NULL,
  `next_date` DATE DEFAULT NULL,
  `branch_id` VARCHAR(64) DEFAULT NULL,
  `assigned_counsel_json` LONGTEXT DEFAULT NULL,
  `status` ENUM('scheduled', 'completed', 'adjourned', 'cancelled') DEFAULT 'scheduled',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hearings_case` (`case_id`),
  KEY `idx_hearings_date` (`hearing_date`),
  KEY `idx_hearings_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABLE: documents
-- Pleadings, court filings, affidavits, submissions, and judgments
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `documents`;
CREATE TABLE `documents` (
  `id` VARCHAR(64) NOT NULL,
  `case_id` VARCHAR(64) NOT NULL,
  `case_number` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `document_type` VARCHAR(100) DEFAULT NULL,
  `filing_date` DATE DEFAULT NULL,
  `filed_by` VARCHAR(150) DEFAULT NULL,
  `file_size` VARCHAR(50) DEFAULT NULL,
  `storage_url` TEXT DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'Filed',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_documents_case` (`case_id`),
  KEY `idx_documents_type` (`document_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. TABLE: audit_logs
-- Immutable legal firm audit trail for security & compliance
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` VARCHAR(64) NOT NULL,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `user_name` VARCHAR(150) DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_type` VARCHAR(50) DEFAULT NULL,
  `target_id` VARCHAR(64) DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  `branch_id` VARCHAR(64) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_timestamp` (`timestamp`),
  KEY `idx_audit_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABLE: system_settings
-- Firm metadata, practice preferences, and branch configurations
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` LONGTEXT DEFAULT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- INITIAL FIRM SEED DATA
-- ==============================================================================

-- Seed Branches (Uganda Regional Presence)
INSERT INTO `branches` (`id`, `name`, `code`, `city`, `address`, `phone`, `email`, `is_headquarters`) VALUES
('kla-hq', 'Kampala Central (Head Office)', 'KLA-HQ', 'Kampala', 'Plot 14, Lumumba Avenue, Nakasero, Kampala', '+256 414 123 456', 'kla@mkadvocates.ug', 1),
('jja-br', 'Jinja Regional Office', 'JJA-01', 'Jinja', 'Plot 8, Main Street, Jinja City', '+256 434 234 567', 'jinja@mkadvocates.ug', 0),
('mbr-br', 'Mbarara Regional Office', 'MBR-02', 'Mbarara', 'High Street Plaza, Mbarara City', '+256 485 345 678', 'mbarara@mkadvocates.ug', 0),
('glu-br', 'Gulu Regional Office', 'GLU-03', 'Gulu', 'Gulu Commercial Court Road, Gulu City', '+256 471 456 789', 'gulu@mkadvocates.ug', 0);

-- Seed System Roles
INSERT INTO `roles` (`id`, `title`, `description`, `permissions`, `is_system`) VALUES
('role-super-admin', 'Sole Managing Partner & Super Admin', 'Complete control over entire firm operations, user provisioning, branch management, and audit logs', '["manage_users", "delete_records", "view_all_branches", "export_data", "view_audit_logs", "edit_cases", "financial_records"]', 1),
('role-partner', 'Partner', 'Full access to case management, client records, and branch legal operations', '["view_all_branches", "edit_cases", "export_data", "financial_records"]', 1),
('role-senior-advocate', 'Senior Legal Counsel', 'Manage litigation files, court cause lists, and client consultations', '["edit_cases", "export_data"]', 1),
('role-associate', 'Legal Associate', 'Draft pleadings, track case schedules, and update daily proceedings', '["edit_cases"]', 1),
('role-clerk', 'Court Registry Clerk', 'File court pleadings, register incoming suits, and monitor cause list', '["edit_cases"]', 1);

-- Seed Super Admin User (Clean setup, confidentiality preserved)
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `role_id`, `role_title`, `branch_id`, `branch_name`, `phone`, `is_super_admin`, `is_branch_admin`, `must_change_password`, `status`) VALUES
('user-admin-01', 'Firm Administrator', 'infosightug@gmail.com', 'Admin@2026', 'partner', 'role-super-admin', 'Sole Managing Partner & Super Admin', 'kla-hq', 'Kampala Central (Head Office)', '+256 700 000 000', 1, 1, 0, 'active');

-- Seed System Settings
INSERT INTO `system_settings` (`setting_key`, `setting_value`) VALUES
('firm_name', '\"MK Advocates & Solicitors\"'),
('jurisdiction', '\"Republic of Uganda\"'),
('version', '\"2.0\"'),
('deployed_at', 'NOW()');

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- DATABASE INITIALIZATION COMPLETE
-- Import via phpMyAdmin -> Import tab -> Select this file -> Click "Go"
-- ==============================================================================
