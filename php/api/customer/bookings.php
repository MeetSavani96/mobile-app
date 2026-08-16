<?php
/**
 * Customer Bookings API
 * GET: list customer bookings
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$user = requireAuth();

$status = $_GET['status'] ?? 'in_progress';

if ($user['role'] === 'admin') {
    if ($status === 'in_progress') {
        $stmt = $pdo->prepare('
            SELECT b.*, COALESCE(c.full_name, u.name) AS customer_name, COALESCE(c.phone, u.phone) AS customer_phone
              FROM bookings b
              LEFT JOIN customers c ON c.id = b.customer_id
              LEFT JOIN users u ON u.id = b.user_id
             WHERE b.status NOT IN ("completed", "cancelled")
             ORDER BY b.created_at DESC
        ');
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare('
            SELECT b.*, COALESCE(c.full_name, u.name) AS customer_name, COALESCE(c.phone, u.phone) AS customer_phone
              FROM bookings b
              LEFT JOIN customers c ON c.id = b.customer_id
              LEFT JOIN users u ON u.id = b.user_id
             WHERE b.status IN ("completed", "cancelled")
             ORDER BY b.created_at DESC
        ');
        $stmt->execute();
    }
} else {
    if ($status === 'in_progress') {
        $stmt = $pdo->prepare('
            SELECT * FROM bookings 
            WHERE user_id = :uid AND status NOT IN ("completed", "cancelled") 
            ORDER BY created_at DESC
        ');
    } else {
        $stmt = $pdo->prepare('
            SELECT * FROM bookings 
            WHERE user_id = :uid AND status IN ("completed", "cancelled") 
            ORDER BY created_at DESC
        ');
    }
    $stmt->execute([':uid' => $user['id']]);
}

$bookings = $stmt->fetchAll();

echo json_encode(['success' => true, 'bookings' => $bookings]);
