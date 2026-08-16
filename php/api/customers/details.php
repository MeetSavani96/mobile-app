<?php
/**
 * GET /api/customers/details.php?id={id}
 *
 * Response:
 *   {"success":true,"data":{...customer}}
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

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'A valid customer id is required.']);
    exit;
}

try {
    $stmt = $pdo->prepare(
        'SELECT id, full_name, phone, email, address, city, state, pincode,
                monthly_units, property_type, roof_type, roof_area, system_type,
                created_at, updated_at
           FROM customers WHERE id = :id LIMIT 1'
    );
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Customer not found.']);
        exit;
    }

    $row['id']            = (int)$row['id'];
    $row['monthly_units'] = $row['monthly_units'] !== null ? (float)$row['monthly_units'] : null;
    $row['roof_area']     = $row['roof_area']     !== null ? (float)$row['roof_area']     : null;

    echo json_encode(['success' => true, 'data' => $row]);
} catch (PDOException $e) {
    error_log("Customer details error for ID {$id}: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to fetch customer.']);
}
