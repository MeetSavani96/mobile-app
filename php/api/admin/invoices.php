<?php
/**
 * Invoices Management API.
 * Handles Invoice generation from Accepted Quotes, CRUD, and status checking.
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

function resolveCustomerId($pdo, $userId) {
    $stmt = $pdo->prepare('SELECT id FROM customers WHERE user_id = :uid LIMIT 1');
    $stmt->execute([':uid' => $userId]);
    return $stmt->fetchColumn() ?: null;
}

// ── GET INVOICES (LIST OR SINGLE DETAILS) ──────────────────────────────────
if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id > 0) {
        // Fetch Single Invoice
        $stmt = $pdo->prepare('
            SELECT i.*, c.full_name AS customer_name, c.phone AS customer_phone, c.address AS customer_address,
                   q.quotation_number
              FROM invoices i
              JOIN customers c ON c.id = i.customer_id
              LEFT JOIN quotation_master q ON q.id = i.quote_id
             WHERE i.id = :id LIMIT 1
        ');
        $stmt->execute([':id' => $id]);
        $inv = $stmt->fetch();

        if (!$inv) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Invoice not found.']);
            exit;
        }

        // Customer ownership check
        if ($user['role'] === 'customer') {
            $custIdx = resolveCustomerId($pdo, $user['id']);
            if (!$custIdx || (int)$inv['customer_id'] !== (int)$custIdx) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Forbidden.']);
                exit;
            }
        }

        // Fetch Quote items if set to get item specs
        $items = [];
        if ($inv['quote_id']) {
            $itemStmt = $pdo->prepare('
                SELECT qi.*, p.name AS product_name 
                  FROM quotation_items qi
                  JOIN products p ON p.id = qi.product_id
                 WHERE qi.quotation_id = :qid
            ');
            $itemStmt->execute([':qid' => $inv['quote_id']]);
            $items = $itemStmt->fetchAll();
        }
        $inv['items'] = $items;

        // Fetch Payments History
        $payStmt = $pdo->prepare('SELECT * FROM payments WHERE invoice_id = :iid ORDER BY id DESC');
        $payStmt->execute([':iid' => $id]);
        $inv['payments'] = $payStmt->fetchAll();

        echo json_encode(['success' => true, 'data' => $inv]);
        exit;
    }

    // List all invoices
    if ($user['role'] === 'admin') {
        $status = trim($_GET['status'] ?? '');
        $search = trim($_GET['search'] ?? '');

        $where = ['1=1'];
        $params = [];

        if ($status) {
            $where[] = 'i.status = :status';
            $params[':status'] = $status;
        }
        if ($search) {
            $where[] = '(c.full_name LIKE :s OR i.invoice_num LIKE :s)';
            $params[':s'] = "%{$search}%";
        }

        $whereStr = implode(' AND ', $where);

        $stmt = $pdo->prepare("
            SELECT i.id, i.invoice_num, i.grand_total, i.paid_amount, i.status, i.created_at, c.full_name AS customer_name
              FROM invoices i
              JOIN customers c ON c.id = i.customer_id
             WHERE {$whereStr}
             ORDER BY i.id DESC
        ");
        $stmt->execute($params);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } else {
        // Customer gets only their invoices
        $custIdx = resolveCustomerId($pdo, $user['id']);
        if (!$custIdx) {
            echo json_encode(['success' => true, 'data' => []]);
            exit;
        }

        $stmt = $pdo->prepare('
            SELECT i.id, i.invoice_num, i.grand_total, i.paid_amount, i.status, i.created_at
              FROM invoices i
             WHERE i.customer_id = :cid
             ORDER BY i.id DESC
        ');
        $stmt->execute([':cid' => $custIdx]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    }
    exit;
}

// ── POST GENERATE INVOICE FROM QUOTATION ──────────────────────────────────
if ($method === 'POST') {
    $admin = requireRole('admin');
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $quoteId = (int)($body['quote_id'] ?? 0);
    $dueDate = trim($body['due_date'] ?? '') ?: null;
    $status  = trim($body['status'] ?? 'generated');

    if ($quoteId <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid quote_id is required.']);
        exit;
    }

    // Fetch Quotation master details
    $qStmt = $pdo->prepare('SELECT * FROM quotation_master WHERE id = :qid LIMIT 1');
    $qStmt->execute([':qid' => $quoteId]);
    $quote = $qStmt->fetch();

    if (!$quote) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Quotation not found.']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // Check if invoice already exists for this quotation
        $chk = $pdo->prepare('SELECT id FROM invoices WHERE quote_id = :qid LIMIT 1');
        $chk->execute([':qid' => $quoteId]);
        if ($chk->fetchColumn()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'An invoice has already been generated from this quotation.']);
            $pdo->rollBack();
            exit;
        }

        // Generate Invoice number INV-YYYYMM-{rand}
        $invNum = 'INV-' . date('Ymd') . '-' . str_pad(rand(100, 999), 3, '0', STR_PAD_LEFT);

        $ins = $pdo->prepare('
            INSERT INTO invoices (quote_id, customer_id, invoice_num, subtotal, discount, gst, grand_total, paid_amount, status, due_date)
            VALUES (:qid, :cid, :inum, :sub, :disc, :gst, :tot, 0.00, :status, :due)
        ');
        $ins->execute([
            ':qid'    => $quoteId,
            ':cid'    => $quote['customer_id'],
            ':inum'   => $invNum,
            ':sub'    => $quote['subtotal'],
            ':disc'   => $quote['discount'],
            ':gst'    => $quote['gst'],
            ':tot'    => $quote['grand_total'],
            ':status' => $status,
            ':due'    => $dueDate
        ]);

        $invoiceId = (int)$pdo->lastInsertId();

        $pdo->commit();
        logActivity((int)$admin['id'], 'create_invoice', 'invoice', $invoiceId);
        echo json_encode(['success' => true, 'message' => 'Invoice generated successfully.', 'id' => $invoiceId]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to generate invoice.']);
    }
    exit;
}

// ── PUT UPDATE INVOICE DETAILS ────────────────────────────────────────────
if ($method === 'PUT') {
    $admin = requireRole('admin');
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $id      = (int)($body['id'] ?? 0);
    $status  = trim($body['status'] ?? '');
    $dueDate = trim($body['due_date'] ?? '') ?: null;

    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid Invoice ID is required.']);
        exit;
    }

    try {
        $upd = $pdo->prepare('UPDATE invoices SET status = :status, due_date = :due WHERE id = :id');
        $upd->execute([
            ':status' => $status,
            ':due'    => $dueDate,
            ':id'     => $id
        ]);
        logActivity((int)$admin['id'], 'update_invoice', 'invoice', $id);
        echo json_encode(['success' => true, 'message' => 'Invoice parameters saved.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save changes.']);
    }
    exit;
}

// ── DELETE INVOICE (OR CANCEL) ────────────────────────────────────────────
if ($method === 'DELETE') {
    $admin = requireRole('admin');
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid Invoice ID is required.']);
        exit;
    }

    try {
        // Safe delete or cancel
        $stmt = $pdo->prepare('DELETE FROM invoices WHERE id = :id');
        $stmt->execute([':id' => $id]);
        logActivity((int)$admin['id'], 'delete_invoice', 'invoice', $id);
        echo json_encode(['success' => true, 'message' => 'Invoice deleted successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to wipe invoice records.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
