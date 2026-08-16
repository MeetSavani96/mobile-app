<?php
/**
 * GET /api/customers/list.php
 *
 * Query params (all optional):
 *   search=amit    LIKE filter on full_name / phone / email / ID / city / state
 *   limit=100      max rows (hard cap 500)
 *   offset=0       pagination
 *
 * Response:
 *   {"success":true,"data":[...],"total":42}
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$search = trim($_GET['search'] ?? '');
$limit  = min(max((int)($_GET['limit']  ?? 100), 1), 500);
$offset = max((int)($_GET['offset'] ?? 0), 0);

try {
    syncAllCustomerProfiles($pdo);

    if ($search !== '') {
        $like = '%' . $search . '%';

        $cntStmt = $pdo->prepare(
            'SELECT COUNT(*) FROM customers
              WHERE full_name LIKE :s OR phone LIKE :s OR email LIKE :s OR CAST(id AS CHAR) LIKE :s OR city LIKE :s OR state LIKE :s'
        );
        $cntStmt->execute([':s' => $like]);
        $total = (int)$cntStmt->fetchColumn();

        $stmt = $pdo->prepare(
            'SELECT id, full_name, phone, email, address, city, state, pincode,
                    monthly_units, property_type, roof_type, roof_area, system_type,
                    created_at, updated_at
               FROM customers
              WHERE full_name LIKE :s OR phone LIKE :s OR email LIKE :s OR CAST(id AS CHAR) LIKE :s OR city LIKE :s OR state LIKE :s
              ORDER BY created_at DESC
              LIMIT :lim OFFSET :off'
        );
        $stmt->bindValue(':s',   $like,   PDO::PARAM_STR);
        $stmt->bindValue(':lim', $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
    } else {
        $total = (int)$pdo->query('SELECT COUNT(*) FROM customers')->fetchColumn();

        $stmt = $pdo->prepare(
            'SELECT id, full_name, phone, email, address, city, state, pincode,
                    monthly_units, property_type, roof_type, roof_area, system_type,
                    created_at, updated_at
               FROM customers
              ORDER BY created_at DESC
              LIMIT :lim OFFSET :off'
        );
        $stmt->bindValue(':lim', $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
    }

    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['id']            = (int)$r['id'];
        $r['monthly_units'] = $r['monthly_units'] !== null ? (float)$r['monthly_units'] : null;
        $r['roof_area']     = $r['roof_area']     !== null ? (float)$r['roof_area']     : null;
    }
    unset($r);

    echo json_encode(['success' => true, 'data' => $rows, 'total' => $total]);
} catch (PDOException $e) {
    error_log("Customer list error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to fetch customers.']);
}
