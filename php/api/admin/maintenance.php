<?php
/**
 * Admin Maintenance Requests API
 * Handles listing and status updates for customer maintenance requests.
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$admin = requireRole('admin');
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $limit  = min(max((int)($_GET['limit'] ?? 100), 1), 500);
    $offset = max((int)($_GET['offset'] ?? 0), 0);

    $where = ['1=1'];
    $params = [];

    if ($search !== '') {
        $where[] = '(mr.request_id LIKE :s OR mr.issue_category LIKE :s OR c.full_name LIKE :s OR u.name LIKE :s OR u.phone LIKE :s)';
        $params[':s'] = "%{$search}%";
    }

    if ($status !== '') {
        $mappedStatus = strtolower(str_replace(' ', '_', $status));
        if ($mappedStatus === 'in_progress') {
            $where[] = '(mr.status = "work_in_progress" OR mr.status = "in_progress")';
        } else {
            $where[] = 'mr.status = :st';
            $params[':st'] = $mappedStatus;
        }
    }

    $whereStr = implode(' AND ', $where);

    try {
        $cntStmt = $pdo->prepare("
            SELECT COUNT(*) 
              FROM maintenance_requests mr
              LEFT JOIN customers c ON c.id = mr.customer_id
              LEFT JOIN users u ON u.id = mr.user_id
             WHERE {$whereStr}
        ");
        $cntStmt->execute($params);
        $total = (int)$cntStmt->fetchColumn();

        $stmt = $pdo->prepare("
            SELECT mr.id, mr.request_id, mr.user_id, mr.customer_id, mr.issue_category,
                   mr.description, mr.preferred_date, mr.preferred_time, mr.status,
                   (SELECT note FROM maintenance_updates WHERE request_id = mr.id ORDER BY id DESC LIMIT 1) AS admin_notes,
                   mr.created_at, mr.updated_at,
                   COALESCE(c.full_name, u.name, 'Customer') AS customer_name,
                   COALESCE(c.phone, u.phone, '') AS customer_phone,
                   COALESCE(c.email, u.email, '') AS customer_email,
                   COALESCE(c.city, u.city, '') AS city
              FROM maintenance_requests mr
              LEFT JOIN customers c ON c.id = mr.customer_id
              LEFT JOIN users u ON u.id = mr.user_id
             WHERE {$whereStr}
             ORDER BY mr.created_at DESC
             LIMIT :lim OFFSET :off
        ");

        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $rows, 'total' => $total]);
    } catch (PDOException $e) {
        error_log("Fetch maintenance requests error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to fetch maintenance requests.']);
    }
    exit;
}

if ($method === 'PUT' || $method === 'POST') {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $id     = (int)($body['id'] ?? $body['ticket_id'] ?? 0);
    $reqId  = trim((string)($body['request_id'] ?? $body['ticket_id'] ?? ''));
    $status = trim((string)($body['status'] ?? ''));
    $notes  = trim((string)($body['admin_notes'] ?? $body['admin_remarks'] ?? $body['notes'] ?? ''));

    // Find the maintenance request by numeric id or string ticket_id (e.g. MT-4261)
    $ticket = null;
    if ($id > 0) {
        $stmt = $pdo->prepare('SELECT id, request_id, status FROM maintenance_requests WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $ticket = $stmt->fetch();
    }
    if (!$ticket && $reqId !== '') {
        $stmt = $pdo->prepare('SELECT id, request_id, status FROM maintenance_requests WHERE request_id = :rid OR id = :rid_num LIMIT 1');
        $stmt->execute([':rid' => $reqId, ':rid_num' => (int)$reqId]);
        $ticket = $stmt->fetch();
    }

    if (!$ticket) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Maintenance request ticket not found.']);
        exit;
    }

    $id = (int)$ticket['id'];

    // Map input status cleanly to valid DB column values
    $dbStatus = $status;
    $statusNormalized = strtolower(str_replace(' ', '_', $status));
    if ($statusNormalized === 'in_progress' || $statusNormalized === 'in progress') {
        $dbStatus = 'work_in_progress';
    } elseif ($statusNormalized === 'pending') {
        $dbStatus = 'submitted';
    } elseif (in_array($statusNormalized, ['submitted', 'assigned', 'technician_scheduled', 'technician_visit', 'work_in_progress', 'completed', 'cancelled'], true)) {
        $dbStatus = $statusNormalized;
    }

    try {
        if ($dbStatus !== '') {
            try {
                $sql = 'UPDATE maintenance_requests SET status = :st WHERE id = :id';
                $pdo->prepare($sql)->execute([':st' => $dbStatus, ':id' => $id]);
            } catch (PDOException $e) {
                // Fallback in case DB ENUM allows 'in_progress' instead of 'work_in_progress'
                $fallbackStatus = ($dbStatus === 'work_in_progress') ? 'in_progress' : 'submitted';
                $sql = 'UPDATE maintenance_requests SET status = :st WHERE id = :id';
                $pdo->prepare($sql)->execute([':st' => $fallbackStatus, ':id' => $id]);
                $dbStatus = $fallbackStatus;
            }
        }

        // Insert update note into maintenance_updates table if provided
        if ($notes !== '') {
            try {
                $upStmt = $pdo->prepare('
                    INSERT INTO maintenance_updates (request_id, status, note, updated_by)
                    VALUES (:rid, :st, :n, :uid)
                ');
                $upStmt->execute([':rid' => $id, ':st' => $dbStatus ?: 'updated', ':n' => $notes, ':uid' => (int)($admin['id'] ?? 0)]);
            } catch (PDOException $e) {
                error_log("Failed to insert maintenance update note: " . $e->getMessage());
            }
        }

        logActivity((int)$admin['id'], 'update_maintenance_request', 'maintenance_requests', $id, ['status' => $dbStatus, 'notes' => $notes]);

        echo json_encode([
            'success' => true,
            'message' => 'Maintenance request updated successfully.',
            'data' => [
                'id' => $id,
                'ticket_id' => $ticket['request_id'],
                'status' => $dbStatus,
                'admin_notes' => $notes
            ]
        ]);
    } catch (PDOException $e) {
        error_log("Maintenance update error for ticket #{$id}: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to update maintenance request. Please try again.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
