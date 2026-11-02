<?php
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
