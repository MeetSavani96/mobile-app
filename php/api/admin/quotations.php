<?php
/**
 * Quotation Management API.
 * Handles CRUD operations, customer actions (accept/reject), and calculations.
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Helper to format Quotation Number
function formatQuoteNum($id) {
    return 'QT-' . str_pad($id, 6, '0', STR_PAD_LEFT);
}

// Helper to resolve Customer ID from logged-in user
function resolveCustomerId($pdo, $userId) {
    $stmt = $pdo->prepare('SELECT id FROM customers WHERE user_id = :uid LIMIT 1');
    $stmt->execute([':uid' => $userId]);
    return $stmt->fetchColumn() ?: null;
}

// ── GET QUOTATIONS (LIST OR SINGLE) ──────────────────────────────────────
if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id > 0) {
        // Fetch Single Detail
        $stmt = $pdo->prepare('
            SELECT q.*, c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.address AS customer_address
              FROM quotation_master q
              JOIN customers c ON c.id = q.customer_id
             WHERE q.id = :id LIMIT 1
        ');
        $stmt->execute([':id' => $id]);
        $quote = $stmt->fetch();

        if (!$quote) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Quotation not found.']);
            exit;
        }

        // Check ownership if user is customer
        if ($user['role'] === 'customer') {
            $custIdx = resolveCustomerId($pdo, $user['id']);
            if (!$custIdx || (int)$quote['customer_id'] !== (int)$custIdx) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Forbidden access.']);
                exit;
            }
        }

        // Add auto generated quote number
        $quote['quotation_number'] = formatQuoteNum($quote['id']);

        // Fetch Items
        $itStmt = $pdo->prepare('
            SELECT qi.*, p.name AS product_name, p.brand AS product_brand
              FROM quotation_items qi
              JOIN products p ON p.id = qi.product_id
             WHERE qi.quotation_id = :qid
        ');
        $itStmt->execute([':qid' => $id]);
        $quote['items'] = $itStmt->fetchAll();

        echo json_encode(['success' => true, 'data' => $quote]);
        exit;
    }

    // LIST VIEW
    if ($user['role'] === 'admin') {
        // Admin gets all quotations (supports filter, search, pagination)
        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $limit  = min((int)($_GET['limit'] ?? 50), 200);
        $offset = max((int)($_GET['offset'] ?? 0), 0);

        $where = ['1=1'];
        $params = [];

        if ($search) {
            $where[] = '(c.full_name LIKE :s OR q.id LIKE :idSearch)';
            $params[':s'] = "%{$search}%";
            $params[':idSearch'] = "%" . str_replace('QT-', '', $search) . "%";
        }
        if ($status) {
            $where[] = 'q.status = :status';
            $params[':status'] = $status;
        }

        $whereStr = implode(' AND ', $where);

        // Count total
        $cnt = $pdo->prepare("SELECT COUNT(*) FROM quotation_master q JOIN customers c ON c.id = q.customer_id WHERE {$whereStr}");
        $cnt->execute($params);
        $total = (int)$cnt->fetchColumn();

        // Fetch records
        $stmt = $pdo->prepare("
            SELECT q.*, c.full_name AS customer_name
              FROM quotation_master q
              JOIN customers c ON c.id = q.customer_id
             WHERE {$whereStr}
             ORDER BY q.id DESC
             LIMIT :lim OFFSET :off
        ");
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['quotation_number'] = formatQuoteNum($r['id']);
        }

        echo json_encode(['success' => true, 'data' => $rows, 'total' => $total]);
    } else {
        // Customer gets only their own quotations
        $custIdx = resolveCustomerId($pdo, $user['id']);
        if (!$custIdx) {
            echo json_encode(['success' => true, 'data' => [], 'total' => 0]);
            exit;
        }

        $stmt = $pdo->prepare('
            SELECT q.*, c.full_name AS customer_name
              FROM quotation_master q
              JOIN customers c ON c.id = q.customer_id
             WHERE q.customer_id = :cid
             ORDER BY q.id DESC
        ');
        $stmt->execute([':cid' => $custIdx]);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['quotation_number'] = formatQuoteNum($r['id']);
        }

        echo json_encode(['success' => true, 'data' => $rows, 'total' => count($rows)]);
    }
    exit;
}

// ── ADMIN POST CREATE QUOTATION ───────────────────────────────────────────
if ($method === 'POST' && ($action === 'create' || $action === 'create_quotation' || $action === '')) {
    $admin = requireRole('admin');
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $customerId = (int)($body['customer_id'] ?? 0);
    $items      = $body['items'] ?? [];
    $discount   = (float)($body['discount'] ?? 0.00);
    $installChg = (float)($body['installation_charges'] ?? 0.00);
    $transChg   = (float)($body['transportation_charges'] ?? 0.00);
    $valDate    = trim($body['validity_date'] ?? '') ?: null;
    $notes      = trim($body['notes'] ?? '') ?: null;
    $status     = trim($body['status'] ?? 'draft');

    if ($customerId <= 0 || empty($items)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Customer selection and quotation items are required.']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // Calculate Totals dynamically to secure database records
        $subtotal = 0.00;
        $gstTotal = 0.00;
        $resolvedItems = [];

        foreach ($items as $item) {
            $prodId = (int)($item['product_id'] ?? 0);
            $qty = max((int)($item['quantity'] ?? 1), 1);
            $itDisc = (float)($item['discount'] ?? 0.00);

            // Fetch product default details to prevent client spoofing
            $pStmt = $pdo->prepare('SELECT name, price_label FROM products WHERE id = :pid LIMIT 1');
            $pStmt->execute([':pid' => $prodId]);
            $prod = $pStmt->fetch();
            if (!$prod) {
                throw new Exception("Product ID {$prodId} not found in catalog.");
            }

            // Extract numeric price from price_label (e.g. "$450" -> 450.00)
            $rawPrice = preg_replace('/[^\d.]/', '', $prod['price_label']) ?: '0';
            $unitPrice = (float)$rawPrice;

            $rowSub = ($unitPrice * $qty) - $itDisc;
            $rowGst = $rowSub * 0.18; // standard default 18% GST

            $subtotal += $rowSub;
            $gstTotal += $rowGst;

            $resolvedItems[] = [
                'product_id' => $prodId,
                'quantity' => $qty,
                'price' => $unitPrice
            ];
        }

        $grandTotal = $subtotal - $discount + $gstTotal + $installChg + $transChg;

        // Insert quote
        $ins = $pdo->prepare('
            INSERT INTO quotation_master 
                (customer_id, subtotal, discount, gst, installation_charges, transportation_charges, grand_total, validity_date, status, notes)
            VALUES 
                (:cid, :sub, :disc, :gst, :inst, :trans, :gt, :vdate, :status, :notes)
        ');
        $ins->execute([
            ':cid'   => $customerId,
            ':sub'   => $subtotal,
            ':disc'  => $discount,
            ':gst'   => $gstTotal,
            ':inst'  => $installChg,
            ':trans' => $transChg,
            ':gt'    => $grandTotal,
            ':vdate' => $valDate,
            ':status'=> $status,
            ':notes' => $notes
        ]);

        $quoteId = (int)$pdo->lastInsertId();

        // Insert items
        $insIt = $pdo->prepare('
            INSERT INTO quotation_items (quotation_id, product_id, quantity, price)
            VALUES (:qid, :pid, :qty, :price)
        ');
        foreach ($resolvedItems as $rit) {
            $insIt->execute([
                ':qid'   => $quoteId,
                ':pid'   => $rit['product_id'],
                ':qty'   => $rit['quantity'],
                ':price' => $rit['price']
            ]);
        }

        $pdo->commit();
        logActivity((int)$admin['id'], 'create_quotation', 'quotation', $quoteId);
        echo json_encode(['success' => true, 'message' => 'Quotation created.', 'id' => $quoteId, 'quotation_number' => formatQuoteNum($quoteId)]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

// ── ADMIN PUT UPDATE QUOTATION ────────────────────────────────────────────
if ($method === 'PUT') {
    $admin = requireRole('admin');
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $id         = (int)($body['id'] ?? 0);
    $customerId = (int)($body['customer_id'] ?? 0);
    $items      = $body['items'] ?? [];
    $discount   = (float)($body['discount'] ?? 0.00);
    $installChg = (float)($body['installation_charges'] ?? 0.00);
    $transChg   = (float)($body['transportation_charges'] ?? 0.00);
    $valDate    = trim($body['validity_date'] ?? '') ?: null;
    $notes      = trim($body['notes'] ?? '') ?: null;
    $status     = trim($body['status'] ?? 'draft');

    if ($id <= 0 || $customerId <= 0 || empty($items)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid quote id, customer selection and items are required.']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        $subtotal = 0.00;
        $gstTotal = 0.00;
        $resolvedItems = [];

        foreach ($items as $item) {
            $prodId = (int)($item['product_id'] ?? 0);
            $qty = max((int)($item['quantity'] ?? 1), 1);
            $itDisc = (float)($item['discount'] ?? 0.00);

            $pStmt = $pdo->prepare('SELECT price_label FROM products WHERE id = :pid LIMIT 1');
            $pStmt->execute([':pid' => $prodId]);
            $unitPrice = (float)preg_replace('/[^\d.]/', '', $pStmt->fetchColumn() ?: '0');

            $rowSub = ($unitPrice * $qty) - $itDisc;
            $rowGst = $rowSub * 0.18;

            $subtotal += $rowSub;
            $gstTotal += $rowGst;

            $resolvedItems[] = [
                'product_id' => $prodId,
                'quantity' => $qty,
                'price' => $unitPrice
            ];
        }

        $grandTotal = $subtotal - $discount + $gstTotal + $installChg + $transChg;

        // Update Master
        $upd = $pdo->prepare('
            UPDATE quotation_master SET
                   customer_id = :cid, subtotal = :sub, discount = :disc, gst = :gst, 
                   installation_charges = :inst, transportation_charges = :trans, 
                   grand_total = :gt, validity_date = :vdate, status = :status, notes = :notes
             WHERE id = :id
        ');
        $upd->execute([
            ':cid'   => $customerId,
            ':sub'   => $subtotal,
            ':disc'  => $discount,
            ':gst'   => $gstTotal,
            ':inst'  => $installChg,
            ':trans' => $transChg,
            ':gt'    => $grandTotal,
            ':vdate' => $valDate,
            ':status'=> $status,
            ':notes' => $notes,
            ':id'    => $id
        ]);

        // Wipe old items and insert updated ones
        $pdo->prepare('DELETE FROM quotation_items WHERE quotation_id = :qid')->execute([':qid' => $id]);

        $insIt = $pdo->prepare('
            INSERT INTO quotation_items (quotation_id, product_id, quantity, price)
            VALUES (:qid, :pid, :qty, :price)
        ');
        foreach ($resolvedItems as $rit) {
            $insIt->execute([
                ':qid'   => $id,
                ':pid'   => $rit['product_id'],
                ':qty'   => $rit['quantity'],
                ':price' => $rit['price']
            ]);
        }

        $pdo->commit();
        logActivity((int)$admin['id'], 'update_quotation', 'quotation', $id);
        echo json_encode(['success' => true, 'message' => 'Quotation updated successfully.']);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

// ── ADMIN DELETE QUOTATION ────────────────────────────────────────────────
if ($method === 'DELETE') {
    $admin = requireRole('admin');
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid quotation id is required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare('DELETE FROM quotation_master WHERE id = :id');
        $stmt->execute([':id' => $id]);
        logActivity((int)$admin['id'], 'delete_quotation', 'quotation', $id);
        echo json_encode(['success' => true, 'message' => 'Quotation deleted successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete quotation.']);
    }
    exit;
}

// ── CUSTOMER ACCEPT/REJECT ACTIONS ────────────────────────────────────────
if ($method === 'POST' && ($action === 'accept' || $action === 'accept_quotation' || $action === 'reject' || $action === 'reject_quotation')) {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = (int)($body['id'] ?? 0);

    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid quotation id required.']);
        exit;
    }

    // Resolve ownership
    $custIdx = resolveCustomerId($pdo, $user['id']);
    if (!$custIdx) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access forbidden.']);
        exit;
    }

    $chk = $pdo->prepare('SELECT customer_id FROM quotation_master WHERE id = :id LIMIT 1');
    $chk->execute([':id' => $id]);
    $owner = $chk->fetchColumn();

    if ((int)$owner !== (int)$custIdx) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access forbidden.']);
        exit;
    }

    $newStatus = ($action === 'accept' || $action === 'accept_quotation') ? 'accepted' : 'rejected';

    try {
        $upd = $pdo->prepare('UPDATE quotation_master SET status = :st WHERE id = :id');
        $upd->execute([':st' => $newStatus, ':id' => $id]);

        logActivity((int)$user['id'], $action . '_quotation', 'quotation', $id);
        echo json_encode(['success' => true, 'message' => "Quotation marked as {$newStatus}."]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update quotation state.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not resolved by router.']);
