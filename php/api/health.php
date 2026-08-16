<?php
/**
 * GET /api/health.php (or ?action=health)
 * Health check endpoint verifying PHP server and MySQL DB connectivity.
 */
require_once __DIR__ . '/_cors.php';
require_once __DIR__ . '/_db.php';

$dbStatus = false;
try {
    $stmt = $pdo->query('SELECT 1');
    if ($stmt->fetch()) {
        $dbStatus = true;
    }
} catch (Exception $e) {
    $dbStatus = false;
}

echo json_encode([
    'success'  => true,
    'database' => $dbStatus,
    'message'  => 'AKV Energy API is working'
]);
