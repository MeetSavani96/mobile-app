<?php
/**
 * DELETE /api/customers/delete.php?id={id}
 *
 * Response:
 *   {"success":true,"message":"Customer deleted successfully."}
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
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
    $stmt = $pdo->prepare('DELETE FROM customers WHERE id = :id');
    $stmt->execute([':id' => $id]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Customer not found.']);
        exit;
    }
    echo json_encode(['success' => true, 'message' => 'Customer deleted successfully.']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to delete customer.']);
}
