<?php
/**
 * Admin Customer Linking API
 * POST action=link_customer: Link user account to AKV customer record
 * POST action=unlink_customer: Disconnect customer
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$admin = requireRole('admin');
$action = $_GET['action'] ?? '';

if ($action === 'link_customer') {
    $body       = json_decode(file_get_contents('php://input'), true);
    $userId     = (int)($body['user_id'] ?? 0);
    $customerId = (int)($body['customer_id'] ?? 0);

    if ($userId <= 0 || $customerId <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'User ID and Customer ID are required.']);
        exit;
    }

    // Insert or update link
    $stmt = $pdo->prepare('
        INSERT INTO customer_user_links (user_id, customer_id, linked_by, status)
        VALUES (:uid, :cid, :admin_id, "active")
        ON DUPLICATE KEY UPDATE customer_id = VALUES(customer_id), linked_by = VALUES(linked_by), status = "active", linked_at = NOW()
    ');
    $stmt->execute([':uid' => $userId, ':cid' => $customerId, ':admin_id' => $admin['id']]);

    // Update user status to akv_customer
    $upUser = $pdo->prepare('UPDATE users SET status = "akv_customer" WHERE id = :uid');
    $upUser->execute([':uid' => $userId]);

    logActivity($admin['id'], 'customer_linked', 'customer_user_links', $userId, [
        'user_id' => $userId,
        'customer_id' => $customerId
    ]);

    echo json_encode(['success' => true, 'message' => 'Customer linked successfully.']);
    exit;
}

if ($action === 'unlink_customer') {
    $body   = json_decode(file_get_contents('php://input'), true);
    $userId = (int)($body['user_id'] ?? 0);

    if ($userId <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'User ID is required.']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE customer_user_links SET status = "inactive" WHERE user_id = :uid');
    $stmt->execute([':uid' => $userId]);

    $upUser = $pdo->prepare('UPDATE users SET status = "non_akv" WHERE id = :uid');
    $upUser->execute([':uid' => $userId]);

    logActivity($admin['id'], 'customer_unlinked', 'customer_user_links', $userId);

    echo json_encode(['success' => true, 'message' => 'Customer unlinked successfully.']);
    exit;
}
