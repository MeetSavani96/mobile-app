<?php
/**
 * GET /api/auth/me.php (action=session)
 * Returns current authenticated user and customer link status.
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_auth.php';

$user = requireAuth();

// Check if user is linked to an AKV Customer record
$linkStmt = $pdo->prepare('
    SELECT cul.customer_id, c.full_name as akv_name 
    FROM customer_user_links cul 
    LEFT JOIN customers c ON cul.customer_id = c.id
    WHERE cul.user_id = :uid AND cul.status = "active" 
    LIMIT 1
');
$linkStmt->execute([':uid' => $user['id']]);
$link = $linkStmt->fetch();

$user['akv_customer_id'] = $link ? (int)$link['customer_id'] : null;
$user['is_akv_customer'] = $link ? true : false;
$user['customer_status'] = $user['status'] ?? ($link ? 'akv_customer' : 'registered');

echo json_encode(['success' => true, 'user' => $user]);
