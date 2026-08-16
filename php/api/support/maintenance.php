<?php
/**
 * Customer Support Maintenance scheduling API.
 * Requires: authenticated user (admin or customer).
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET Maintenance Logs ──────────────────────────────────────────────────
if ($method === 'GET') {
    try {
        if ($user['role'] === 'admin') {
            // Admins see all logs
            $stmt = $pdo->query('
                SELECT m.*, c.full_name AS customer_name, c.phone AS customer_phone
                  FROM maintenance m
                  JOIN customers c ON c.id = m.customer_id
                 ORDER BY m.schedule_date ASC
            ');
            $rows = $stmt->fetchAll();
        } else {
            // Customers see their own logs
            $stmt = $pdo->prepare('
                SELECT m.*, c.full_name AS customer_name
                  FROM maintenance m
                  JOIN customers c ON c.id = m.customer_id
                 WHERE c.user_id = :uid
                 ORDER BY m.schedule_date ASC
            ');
            $stmt->execute([':uid' => $user['id']]);
            $rows = $stmt->fetchAll();
        }

        foreach ($rows as &$r) {
            $r['id'] = (int)$r['id'];
            $r['customer_id'] = (int)$r['customer_id'];
        }
        echo json_encode($rows);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load maintenance logs.']);
    }
    exit;
}

// ── POST Admin Schedule Maintenance ──────────────────────────────────────
if ($method === 'POST') {
    $admin = requireRole('admin');
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $customerId   = (int)($body['customer_id'] ?? 0);
    $scheduleDate = trim($body['schedule_date'] ?? '');
    $notes        = trim($body['notes'] ?? '') ?: null;

    if ($customerId <= 0 || $scheduleDate === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Customer id and schedule date are required.']);
        exit;
    }

    try {
        $ins = $pdo->prepare('
            INSERT INTO maintenance (customer_id, schedule_date, notes, status)
            VALUES (:cid, :sd, :n, "scheduled")
        ');
        $ins->execute([
            ':cid' => $customerId,
            ':sd'  => $scheduleDate,
            ':n'   => $notes,
        ]);

        $maintenanceId = (int)$pdo->lastInsertId();
        logActivity((int)$admin['id'], 'schedule_maintenance', 'maintenance', $maintenanceId);

        echo json_encode(['success' => true, 'message' => 'Maintenance event scheduled successfully.', 'id' => $maintenanceId]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to schedule maintenance event.']);
    }
    exit;
}

// ── PUT Admin Status Update ──────────────────────────────────────────────
if ($method === 'PUT') {
    $admin = requireRole('admin');
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id     = (int)($body['id'] ?? 0);
    $status = trim($body['status'] ?? 'scheduled');

    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid event id is required.']);
        exit;
    }

    try {
        $upd = $pdo->prepare('UPDATE maintenance SET status = :st WHERE id = :id');
        $upd->execute([':st' => $status, ':id' => $id]);

        logActivity((int)$admin['id'], 'update_maintenance', 'maintenance', $id);
        echo json_encode(['success' => true, 'message' => 'Maintenance status updated successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update maintenance event.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
