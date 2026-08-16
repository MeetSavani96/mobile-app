<?php
/**
 * POST / GET /api/admin/backup.php
 * Administrative utility for exporting, importing, and restoring SQL database backups.
 * Requires: role = admin
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

requireRole('admin');

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        // --- EXPORT DATABASE BACKUP ---
        $tables = [];
        $stmt = $pdo->query('SHOW TABLES');
        while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
            $tables[] = $row[0];
        }

        $sqlDump = "-- AKV Energy Solutions Database Backup\n";
        $sqlDump .= "-- Generated: " . date('Y-m-d H:i:s') . "\n\n";
        $sqlDump .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

        foreach ($tables as $t) {
            // Drop Table
            $sqlDump .= "DROP TABLE IF EXISTS `$t`;\n";
            
            // Create Table
            $createStmt = $pdo->query("SHOW CREATE TABLE `$t`")->fetch(PDO::FETCH_ASSOC);
            $sqlDump .= $createStmt['Create Table'] . ";\n\n";

            // Table Data Inserts
            $rows = $pdo->query("SELECT * FROM `$t`")->fetchAll(PDO::FETCH_ASSOC);
            if (!empty($rows)) {
                $sqlDump .= "INSERT INTO `$t` VALUES \n";
                $valLines = [];
                foreach ($rows as $row) {
                    $escapedVals = array_map(function($val) use ($pdo) {
                        if ($val === null) return 'NULL';
                        return $pdo->quote($val);
                    }, $row);
                    $valLines[] = "(" . implode(', ', $escapedVals) . ")";
                }
                $sqlDump .= implode(",\n", $valLines) . ";\n\n";
            }
        }

        $sqlDump .= "SET FOREIGN_KEY_CHECKS=1;\n";

        // Download attachment headers
        header('Content-Type: application/sql');
        header('Content-Disposition: attachment; filename="akvenergy_backup_' . date('Ymd_His') . '.sql"');
        echo $sqlDump;
        exit;
    }

    if ($method === 'POST') {
        // --- RESTORE DATABASE BACKUP ---
        $action = $_GET['action'] ?? '';

        if ($action === 'restore') {
            if (empty($_FILES['backup']) || $_FILES['backup']['error'] !== UPLOAD_ERR_OK) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Valid SQL backup file required.']);
                exit;
            }
            $sql = file_get_contents($_FILES['backup']['tmp_name']);
        } else {
            // Import raw text body
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
            $sql = $body['sql'] ?? '';
        }

        if (trim($sql) === '') {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'No SQL statement to restore.']);
            exit;
        }

        // Execute multiple queries using PDO multi-queries attribute or simple parsing
        $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, 1);
        $pdo->exec($sql);
        
        echo json_encode(['success' => true, 'message' => 'Database backup restored successfully!']);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Backup operation failed: ' . $e->getMessage()]);
}
