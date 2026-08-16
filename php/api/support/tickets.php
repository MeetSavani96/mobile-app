<?php
/**
 * Customer Support Tickets (Complaints) API.
 * Requires: authenticated user (admin or customer).
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET Tickets ──────────────────────────────────────────────────────────
if ($method === 'GET') {
    try {
        if ($user['role'] === 'admin') {
            // Admins see all tickets
            $stmt = $pdo->query('
                SELECT cp.*, c.full_name AS customer_name, c.phone AS customer_phone
                  FROM complaints cp
                  JOIN customers c ON c.id = cp.customer_id
                 ORDER BY cp.id DESC
            ');
            $rows = $stmt->fetchAll();
        } else {
            // Customers see their own tickets
            $stmt = $pdo->prepare('
                SELECT cp.*, c.full_name AS customer_name
                  FROM complaints cp
                  JOIN customers c ON c.id = cp.customer_id
                 WHERE c.user_id = :uid
                 ORDER BY cp.id DESC
            ');
            $stmt->execute([':uid' => $user['id']]);
            $rows = $stmt->fetchAll();
        }

        foreach ($rows as &$r) {
            $r['id'] = (int)$r['id'];
            $r['customer_id'] = (int)$r['customer_id'];
        }
        echo json_encode($rows); // return directly as array matching React view expect
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load tickets.']);
    }
    exit;
}

// ── POST Submit Complaint ────────────────────────────────────────────────
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $title       = trim($body['title'] ?? $body['issue_type'] ?? '');
    $description = trim($body['description'] ?? '');
    $priority    = trim($body['priority'] ?? 'medium');

    if ($title === '' || $description === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Title and description are required.']);
        exit;
    }

    try {
        // Resolve customer_id
        $stmt = $pdo->prepare('SELECT id FROM customers WHERE user_id = :uid LIMIT 1');
        $stmt->execute([':uid' => $user['id']]);
        $customerId = $stmt->fetchColumn();

        if (!$customerId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'You must set up your solar profile before raising a ticket.']);
            exit;
        }

        $ins = $pdo->prepare('
            INSERT INTO complaints (customer_id, title, description, priority, status)
            VALUES (:cid, :t, :d, :p, "open")
        ');
        $ins->execute([
            ':cid' => $customerId,
            ':t'   => $title,
            ':d'   => $description,
            ':p'   => $priority,
        ]);

        $ticketId = (int)$pdo->lastInsertId();
        logActivity((int)$user['id'], 'submit_complaint', 'complaint', $ticketId);

        echo json_encode(['success' => true, 'message' => 'Ticket raised successfully.', 'id' => $ticketId]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to submit ticket.']);
    }
    exit;
}

// ── PUT Admin Status Update ──────────────────────────────────────────────
if ($method === 'PUT') {
    // Only administrators can edit ticket status
    $admin = requireRole('admin');
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id     = (int)($body['id'] ?? 0);
    $status = trim($body['status'] ?? 'open');

    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid ticket id is required.']);
        exit;
    }

    try {
        $upd = $pdo->prepare('UPDATE complaints SET status = :st WHERE id = :id');
        $upd->execute([':st' => $status, ':id' => $id]);

        logActivity((int)$admin['id'], 'update_complaint', 'complaint', $id);
        echo json_encode(['success' => true, 'message' => 'Ticket status updated successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update ticket.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
