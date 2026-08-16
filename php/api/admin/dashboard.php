<?php
/**
 * GET /api/admin/dashboard.php
 * Returns KPI stats for the admin dashboard.
 * Requires: role = admin
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

requireRole('admin');

try {
    syncAllCustomerProfiles($pdo);
    $stats = [];

    // Total customers
    $stats['total_customers'] = (int)$pdo->query('SELECT COUNT(*) FROM customers')->fetchColumn();

    // Today's enquiries
    $stats['today_enquiries'] = (int)$pdo->query(
        "SELECT COUNT(*) FROM enquiries WHERE DATE(created_at) = CURDATE()"
    )->fetchColumn();

    // By status
    $statusRows = $pdo->query(
        "SELECT status, COUNT(*) AS cnt FROM enquiries GROUP BY status"
    )->fetchAll();
    $byStatus = [];
    foreach ($statusRows as $r) { $byStatus[$r['status']] = (int)$r['cnt']; }

    $stats['pending_enquiries']  = ($byStatus['new'] ?? 0) + ($byStatus['contacted'] ?? 0);
    $stats['approved_enquiries'] = $byStatus['approved'] ?? 0;
    $stats['rejected_enquiries'] = $byStatus['rejected'] ?? 0;
    $stats['site_visits']        = $byStatus['site_visit_scheduled'] ?? 0;
    $stats['completed_installs'] = $byStatus['completed'] ?? 0;
    $stats['total_enquiries']    = array_sum($byStatus);

    // Monthly enquiries chart (last 6 months)
    $monthly = $pdo->query("
        SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COUNT(*) AS total
          FROM enquiries
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY month ORDER BY month ASC
    ")->fetchAll();
    $stats['monthly_enquiries'] = $monthly;

    // Customer growth (last 6 months)
    $growth = $pdo->query("
        SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COUNT(*) AS total
          FROM customers
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY month ORDER BY month ASC
    ")->fetchAll();
    $stats['customer_growth'] = $growth;

    // Recent activity (last 10 logs)
    $activity = $pdo->query("
        SELECT a.action, a.entity, a.created_at, u.name AS actor
          FROM activity_logs a
          LEFT JOIN users u ON u.id = a.user_id
         ORDER BY a.created_at DESC LIMIT 10
    ")->fetchAll();
    $stats['recent_activity'] = $activity;

    echo json_encode(['success' => true, 'data' => $stats]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to load dashboard data.']);
}
