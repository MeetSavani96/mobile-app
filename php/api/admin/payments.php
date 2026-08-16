<?php
/**
 * Payments Recording & Verification API.
 * Updates invoice calculations, registers transactions, and generates receipts.
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

// ── GET PAYMENTS HISTORY ──────────────────────────────────────────────────
if ($method === 'GET') {
    $invoiceId = isset($_GET['invoice_id']) ? (int)$_GET['invoice_id'] : 0;

    if ($user['role'] === 'admin') {
        if ($invoiceId > 0) {
            $stmt = $pdo->prepare('SELECT * FROM payments WHERE invoice_id = :iid ORDER BY id DESC');
            $stmt->execute([':iid' => $invoiceId]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            exit;
        }

        // List all payments
        $stmt = $pdo->query('
            SELECT p.*, i.invoice_num, c.full_name AS customer_name
              FROM payments p
              JOIN invoices i ON i.id = p.invoice_id
              JOIN customers c ON c.id = i.customer_id
             ORDER BY p.id DESC
        ');
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } else {
        // Customer gets their payments
        $custIdx = resolveCustomerId($pdo, $user['id']);
        if (!$custIdx) {
            echo json_encode(['success' => true, 'data' => []]);
            exit;
        }

        if ($invoiceId > 0) {
            // Verify invoice belongs to customer
            $chk = $pdo->prepare('SELECT customer_id FROM invoices WHERE id = :iid LIMIT 1');
            $chk->execute([':iid' => $invoiceId]);
            if ((int)$chk->fetchColumn() !== (int)$custIdx) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Forbidden.']);
                exit;
            }

            $stmt = $pdo->prepare('SELECT * FROM payments WHERE invoice_id = :iid ORDER BY id DESC');
            $stmt->execute([':iid' => $invoiceId]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            exit;
        }

        $stmt = $pdo->prepare('
            SELECT p.*, i.invoice_num
              FROM payments p
              JOIN invoices i ON i.id = p.invoice_id
             WHERE i.customer_id = :cid
             ORDER BY p.id DESC
        ');
        $stmt->execute([':cid' => $custIdx]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    }
    exit;
}

// ── POST RECORD PAYMENT ───────────────────────────────────────────────────
if ($method === 'POST') {
    $admin = requireRole('admin');
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $invoiceId = (int)($body['invoice_id'] ?? 0);
    $amount    = (float)($body['amount'] ?? 0);
    $method    = trim($body['method'] ?? 'cash');
    $txnId     = trim($body['txn_id'] ?? '') ?: null;
    $refNum    = trim($body['ref_num'] ?? '') ?: null;
    $payDate   = trim($body['pay_date'] ?? '') ?: date('Y-m-d H:i:s');
    $remarks   = trim($body['remarks'] ?? '') ?: null;

    if ($invoiceId <= 0 || $amount <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid invoice_id and amount greater than zero are required.']);
        exit;
    }

    // Fetch Invoice details
    $invStmt = $pdo->prepare('SELECT * FROM invoices WHERE id = :iid LIMIT 1');
    $invStmt->execute([':iid' => $invoiceId]);
    $invoice = $invStmt->fetch();

    if (!$invoice) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Invoice not found.']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // 1. Insert Payment record
        $ins = $pdo->prepare('
            INSERT INTO payments (invoice_id, amount, method, txn_id, ref_num, pay_date, remarks)
            VALUES (:iid, :amt, :meth, :txn, :ref, :pdate, :rem)
        ');
        $ins->execute([
            ':iid'   => $invoiceId,
            ':amt'   => $amount,
            ':meth'  => $method,
            ':txn'   => $txnId,
            ':ref'   => $refNum,
            ':pdate' => $payDate,
            ':rem'   => $remarks
        ]);

        $paymentId = (int)$pdo->lastInsertId();

        // 2. Recalculate Invoice Paid Amount
        $newPaidAmount = (float)$invoice['paid_amount'] + $amount;
        $grandTotal = (float)$invoice['grand_total'];

        // Determine new invoice status
        if ($newPaidAmount >= $grandTotal) {
            $newStatus = 'paid';
        } else if ($newPaidAmount > 0) {
            $newStatus = 'partially_paid';
        } else {
            $newStatus = $invoice['status'];
        }

        $upd = $pdo->prepare('UPDATE invoices SET paid_amount = :paid, status = :status WHERE id = :id');
        $upd->execute([
            ':paid'   => $newPaidAmount,
            ':status' => $newStatus,
            ':id'     => $invoiceId
        ]);

        $pdo->commit();
        logActivity((int)$admin['id'], 'create_payment', 'invoice', $invoiceId, ['amount' => $amount, 'payment_id' => $paymentId]);
        echo json_encode(['success' => true, 'message' => 'Payment registered successfully.', 'id' => $paymentId]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to record payment transaction.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
