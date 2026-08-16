<?php
/**
 * Customer Documents, Transactions, Queries, Notifications, Profile Stats Endpoints
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$user = requireAuth();
$action = $_GET['action'] ?? '';

// Find or ensure customer profile link
$customerId = ensureCustomerProfile($pdo, (int)$user['id']);

switch ($action) {
    case 'customer_documents':
        if (!$customerId) {
            echo json_encode(['success' => true, 'documents' => []]);
            exit;
        }
        $stmt = $pdo->prepare('SELECT * FROM documents WHERE customer_id = :cid ORDER BY uploaded_at DESC');
        $stmt->execute([':cid' => $customerId]);
        echo json_encode(['success' => true, 'documents' => $stmt->fetchAll()]);
        break;

    case 'customer_transactions':
        $stmt = $pdo->prepare('SELECT * FROM transactions WHERE user_id = :uid ORDER BY created_at DESC');
        $stmt->execute([':uid' => $user['id']]);
        echo json_encode(['success' => true, 'transactions' => $stmt->fetchAll()]);
        break;

    case 'customer_queries':
        $stmt = $pdo->prepare('SELECT * FROM queries WHERE user_id = :uid ORDER BY created_at DESC');
        $stmt->execute([':uid' => $user['id']]);
        echo json_encode(['success' => true, 'queries' => $stmt->fetchAll()]);
        break;

    case 'submit_query':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') exit;
        $body = json_decode(file_get_contents('php://input'), true);
        $subject     = trim($body['subject'] ?? '');
        $category    = trim($body['category'] ?? 'other');
        $description = trim($body['description'] ?? '');

        if (empty($subject) || empty($description)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Subject and description are required.']);
            exit;
        }

        $stmt = $pdo->prepare('INSERT INTO queries (user_id, subject, category, description, status) VALUES (:uid, :sub, :cat, :desc, "open")');
        $stmt->execute([':uid' => $user['id'], ':sub' => $subject, ':cat' => $category, ':desc' => $description]);
        $qid = $pdo->lastInsertId();

        logActivity($user['id'], 'query_created', 'queries', (int)$qid, ['subject' => $subject]);
        echo json_encode(['success' => true, 'message' => 'Support query created.']);
        break;

    case 'get_notifications':
        $stmt = $pdo->prepare('SELECT * FROM notifications WHERE (user_id = :uid OR user_id IS NULL) ORDER BY created_at DESC LIMIT 50');
        $stmt->execute([':uid' => $user['id']]);
        echo json_encode(['success' => true, 'notifications' => $stmt->fetchAll()]);
        break;

    case 'mark_notification_read':
        $body = json_decode(file_get_contents('php://input'), true);
        $nid = (int)($body['id'] ?? 0);
        if ($nid > 0) {
            $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE id = :id AND (user_id = :uid OR user_id IS NULL)');
            $stmt->execute([':id' => $nid, ':uid' => $user['id']]);
        }
        echo json_encode(['success' => true]);
        break;

    case 'customer_profile_stats':
        $bkCount = 0;
        $capacity = 0.0;

        $bkStmt = $pdo->prepare('SELECT COUNT(*) as cnt FROM bookings WHERE user_id = :uid');
        $bkStmt->execute([':uid' => $user['id']]);
        $bkRow = $bkStmt->fetch();
        if ($bkRow) $bkCount = (int)$bkRow['cnt'];

        if ($customerId) {
            $capStmt = $pdo->prepare('SELECT SUM(capacity_kw) as total_cap FROM inverters WHERE customer_id = :cid AND status = "active"');
            $capStmt->execute([':cid' => $customerId]);
            $capRow = $capStmt->fetch();
            if ($capRow && $capRow['total_cap']) $capacity = (float)$capRow['total_cap'];
        }

        echo json_encode([
            'success' => true,
            'total_bookings' => $bkCount,
            'solar_capacity' => $capacity
        ]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action.']);
        break;
}
