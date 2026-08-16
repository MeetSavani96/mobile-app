<?php
/**
 * Customer Inverter API
 * GET: get customer's connected inverter and latest readings
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$user = requireAuth();

// Find customer link
$linkStmt = $pdo->prepare('
    SELECT cul.customer_id FROM customer_user_links cul 
    WHERE cul.user_id = :uid AND cul.status = "active" 
    LIMIT 1
');
$linkStmt->execute([':uid' => $user['id']]);
$link = $linkStmt->fetch();

if (!$link) {
    echo json_encode(['success' => true, 'inverter' => null, 'readings' => null]);
    exit;
}

// Get inverter
$invStmt = $pdo->prepare('
    SELECT * FROM inverters 
    WHERE customer_id = :cid AND status = "active" 
    ORDER BY created_at DESC LIMIT 1
');
$invStmt->execute([':cid' => $link['customer_id']]);
$inverter = $invStmt->fetch();

if (!$inverter) {
    echo json_encode(['success' => true, 'inverter' => null, 'readings' => null]);
    exit;
}

// Get latest readings
$readStmt = $pdo->prepare('
    SELECT * FROM inverter_readings 
    WHERE inverter_id = :iid 
    ORDER BY recorded_at DESC LIMIT 1
');
$readStmt->execute([':iid' => $inverter['id']]);
$readings = $readStmt->fetch();

echo json_encode([
    'success' => true,
    'inverter' => $inverter,
    'readings' => $readings ?: null,
]);
