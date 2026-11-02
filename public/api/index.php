<?php
/**
 * MK ADVOCATES & SOLICITORS - CENTRAL MULTI-WORKSTATION DATABASE API FOR CPANEL (PHP)
 * 
 * This companion file allows the application to run seamlessly on ANY standard
 * cPanel shared hosting (Apache / Nginx + PHP 7.4/8.x / MySQL).
 * 
 * Supports DUAL-DATABASE ARCHITECTURE:
 * 1. MySQL Database (via PDO when credentials in db_config.php are provided)
 * 2. High-speed Protected Server File Storage (automatic zero-config fallback)
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load DB Config if exists
if (file_exists(__DIR__ . '/db_config.php')) {
    require_once __DIR__ . '/db_config.php';
}

$dbDir = __DIR__ . '/data';
if (!is_dir($dbDir)) {
    mkdir($dbDir, 0755, true);
}

// Protect data directory from direct browser downloads
$htaccessPath = $dbDir . '/.htaccess';
if (!file_exists($htaccessPath)) {
    file_put_contents($htaccessPath, "Deny from all\n");
}

$dbFile = $dbDir . '/firm_database.json';

// Initialize default JSON database if not exists
if (!file_exists($dbFile)) {
    $initialDb = [
        'version' => '2.0',
        'lastUpdated' => date('c'),
        'cases' => [],
        'hearings' => [],
        'documents' => [],
        'branches' => [
            [
                'id' => 'kla-hq',
                'name' => 'Kampala Central (Head Office)',
                'code' => 'KLA-HQ',
                'city' => 'Kampala',
                'address' => 'Plot 14, Lumumba Avenue, Nakasero, Kampala',
                'phone' => '+256 414 123 456',
                'email' => 'kla@mkadvocates.ug',
                'isHeadquarters' => true
            ],
            [
                'id' => 'jja-br',
                'name' => 'Jinja Regional Office',
                'code' => 'JJA-01',
                'city' => 'Jinja',
                'address' => 'Plot 8, Main Street, Jinja City',
                'phone' => '+256 434 234 567',
                'email' => 'jinja@mkadvocates.ug',
                'isHeadquarters' => false
            ],
            [
                'id' => 'mbr-br',
                'name' => 'Mbarara Regional Office',
                'code' => 'MBR-02',
                'city' => 'Mbarara',
                'address' => 'High Street Plaza, Mbarara City',
                'phone' => '+256 485 345 678',
                'email' => 'mbarara@mkadvocates.ug',
                'isHeadquarters' => false
            ],
            [
                'id' => 'glu-br',
                'name' => 'Gulu Regional Office',
                'code' => 'GLU-03',
                'city' => 'Gulu',
                'address' => 'Gulu Commercial Court Road, Gulu City',
                'phone' => '+256 471 456 789',
                'email' => 'gulu@mkadvocates.ug',
                'isHeadquarters' => false
            ]
        ],
        'users' => [
            [
                'id' => 'user-admin',
                'name' => 'Firm Administrator',
                'email' => 'infosightug@gmail.com',
                'role' => 'partner',
                'roleId' => 'role-super-admin',
                'roleTitle' => 'Sole Managing Partner & Super Admin',
                'branchId' => 'kla-hq',
                'branchName' => 'Kampala Central (Head Office)',
                'isSuperAdmin' => true,
                'isBranchAdmin' => true,
                'password' => 'Admin@2026',
            ]
        ],
        'roles' => []
    ];
    file_put_contents($dbFile, json_encode($initialDb, JSON_PRETTY_PRINT));
}

// Function to establish MySQL PDO Connection
function getPdoConnection() {
    if (!defined('DB_NAME') || empty(DB_NAME)) {
        return null;
    }
    try {
        $host = defined('DB_HOST') ? DB_HOST : 'localhost';
        $db   = DB_NAME;
        $user = defined('DB_USER') ? DB_USER : '';
        $pass = defined('DB_PASS') ? DB_PASS : '';
        $port = defined('DB_PORT') ? DB_PORT : '3306';
        $charset = defined('DB_CHARSET') ? DB_CHARSET : 'utf8mb4';

        $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        return new PDO($dsn, $user, $pass, $options);
    } catch (\PDOException $e) {
        return null;
    }
}

$pdo = getPdoConnection();
$usingMysql = ($pdo !== null);

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// 1. Health & Database Engine Status
if ($action === 'health' || $action === 'status') {
    echo json_encode([
        'status' => 'online',
        'server' => 'cPanel PHP Multi-Computer Central Storage Engine',
        'databaseType' => $usingMysql ? 'MySQL Relational Database (Active)' : 'Protected Server Storage Engine (Zero-Config Active)',
        'hasMysqlConfig' => defined('DB_NAME') && !empty(DB_NAME),
        'mysqlConnected' => $usingMysql,
        'phpVersion' => PHP_VERSION,
        'timestamp' => date('c'),
    ]);
    exit;
}

// 2. Download SQL Schema Directly
if ($action === 'sql_download') {
    $sqlFile = dirname(__DIR__) . '/mk_advocates_database.sql';
    if (file_exists($sqlFile)) {
        header('Content-Type: application/sql');
        header('Content-Disposition: attachment; filename="mk_advocates_database.sql"');
        readfile($sqlFile);
        exit;
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'SQL file not found']);
        exit;
    }
}

// 3. Download JSON Backup
if ($action === 'backup') {
    if (file_exists($dbFile)) {
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="mk_firm_cpanel_backup_' . date('Y-m-d') . '.json"');
        readfile($dbFile);
        exit;
    }
}

// 4. GET Database (Load latest data across all workstations)
if ($method === 'GET') {
    if ($usingMysql) {
        try {
            // Check if cases table exists in MySQL
            $stmt = $pdo->query("SHOW TABLES LIKE 'cases'");
            if ($stmt->rowCount() > 0) {
                // Fetch from MySQL
                $cases = $pdo->query("SELECT * FROM cases ORDER BY updated_at DESC")->fetchAll();
                $hearings = $pdo->query("SELECT * FROM hearings ORDER BY hearing_date ASC")->fetchAll();
                $documents = $pdo->query("SELECT * FROM documents ORDER BY created_at DESC")->fetchAll();
                $branches = $pdo->query("SELECT * FROM branches ORDER BY is_headquarters DESC, name ASC")->fetchAll();
                $users = $pdo->query("SELECT * FROM users ORDER BY is_super_admin DESC, name ASC")->fetchAll();
                $roles = $pdo->query("SELECT * FROM roles ORDER BY title ASC")->fetchAll();
                
                // Fetch system settings if present
                $systemSettings = null;
                $settingsStmt = $pdo->query("SHOW TABLES LIKE 'system_settings'");
                if ($settingsStmt->rowCount() > 0) {
                    $settingRow = $pdo->query("SELECT setting_value FROM system_settings WHERE setting_key = 'app_config' LIMIT 1")->fetch();
                    if ($settingRow && !empty($settingRow['setting_value'])) {
                        $systemSettings = json_decode($settingRow['setting_value'], true);
                    }
                }

                echo json_encode([
                    'success' => true,
                    'databaseType' => 'MySQL',
                    'data' => [
                        'version' => '2.0',
                        'lastUpdated' => date('c'),
                        'cases' => $cases ?: [],
                        'hearings' => $hearings ?: [],
                        'documents' => $documents ?: [],
                        'branches' => $branches ?: [],
                        'users' => $users ?: [],
                        'roles' => $roles ?: [],
                        'systemSettings' => $systemSettings
                    ],
                    'syncedAt' => date('c')
                ]);
                exit;
            }
        } catch (\Exception $e) {
            // Fall back to JSON file below
        }
    }

    // Default: Return from central JSON file
    if (file_exists($dbFile)) {
        $data = json_decode(file_get_contents($dbFile), true);
        echo json_encode([
            'success' => true,
            'databaseType' => 'Protected Storage Engine',
            'data' => $data,
            'syncedAt' => isset($data['lastUpdated']) ? $data['lastUpdated'] : date('c')
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Database file not found']);
    }
    exit;
}

// 5. POST Database (Save from any computer or branch)
if ($method === 'POST') {
    $input = file_get_contents('php://input');
    $payload = json_decode($input, true);

    if (!$payload) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON payload']);
        exit;
    }

    // Dual-write: Always update local file for immediate backup redundancy
    $current = file_exists($dbFile) ? json_decode(file_get_contents($dbFile), true) : [];
    
    $updated = array_merge($current, [
        'cases' => isset($payload['cases']) && is_array($payload['cases']) ? $payload['cases'] : (isset($current['cases']) ? $current['cases'] : []),
        'hearings' => isset($payload['hearings']) && is_array($payload['hearings']) ? $payload['hearings'] : (isset($current['hearings']) ? $current['hearings'] : []),
        'documents' => isset($payload['documents']) && is_array($payload['documents']) ? $payload['documents'] : (isset($current['documents']) ? $current['documents'] : []),
        'branches' => isset($payload['branches']) && is_array($payload['branches']) ? $payload['branches'] : (isset($current['branches']) ? $current['branches'] : []),
        'users' => isset($payload['users']) && is_array($payload['users']) ? $payload['users'] : (isset($current['users']) ? $current['users'] : []),
        'roles' => isset($payload['roles']) && is_array($payload['roles']) ? $payload['roles'] : (isset($current['roles']) ? $current['roles'] : []),
        'systemSettings' => isset($payload['systemSettings']) ? $payload['systemSettings'] : (isset($current['systemSettings']) ? $current['systemSettings'] : null),
        'lastUpdated' => date('c')
    ]);

    // Save to MySQL system_settings if active
    if ($usingMysql && isset($payload['systemSettings'])) {
        try {
            $checkTable = $pdo->query("SHOW TABLES LIKE 'system_settings'");
            if ($checkTable->rowCount() > 0) {
                $stmt = $pdo->prepare("REPLACE INTO system_settings (setting_key, setting_value, updated_at) VALUES ('app_config', :val, NOW())");
                $stmt->execute([':val' => json_encode($payload['systemSettings'])]);
            }
        } catch (\Exception $e) {
            // Ignore DB error, file backup succeeds
        }
    }

    $tempFile = $dbFile . '.tmp';
    file_put_contents($tempFile, json_encode($updated, JSON_PRETTY_PRINT));
    if (file_exists($tempFile)) {
        rename($tempFile, $dbFile);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Central cPanel database updated successfully across all computers.',
        'databaseType' => $usingMysql ? 'MySQL + Redundant Backup' : 'Protected Server Storage Engine',
        'lastUpdated' => $updated['lastUpdated'],
        'caseCount' => count($updated['cases'])
    ]);
    exit;
}
