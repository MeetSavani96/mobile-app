<?php
/**
 * GET / POST /api/admin/settings.php
 * Administrative endpoint for system configuration settings (company, maps, firebase, smtp).
 * Requires: role = admin
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

requireRole('admin');

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        // --- READ SETTINGS ---
        $stmt = $pdo->query('SELECT setting_key, setting_value FROM system_settings');
        $settings = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        echo json_encode(['success' => true, 'data' => $settings]);
        exit;
    }

    if ($method === 'POST') {
        // --- UPDATE SETTINGS ---
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('INSERT INTO system_settings (setting_key, setting_value) VALUES (:k, :v) ON DUPLICATE KEY UPDATE setting_value = :v');
        
        foreach ($body as $key => $val) {
            $stmt->execute([
                ':k' => $key,
                ':v' => is_array($val) ? json_encode($val) : (string)$val
            ]);
        }
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'System settings updated successfully!']);
        exit;
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Settings action failed: ' . $e->getMessage()]);
}
