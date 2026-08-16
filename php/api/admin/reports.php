<?php
/**
 * GET /api/admin/reports.php
 * Handles Reports & Business Intelligence endpoints.
 * Requires: role = admin
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

requireRole('admin');

$action = $_GET['action'] ?? '';

// Helper function to extract date filters
function parseDateFilter() {
    $filter = $_GET['date_filter'] ?? 'all';
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;

    $now = new DateTime();
    
    switch ($filter) {
        case 'today':
            $start = $now->format('Y-m-d 00:00:00');
            $end = $now->format('Y-m-d 23:59:59');
            break;
        case 'this_week':
            // Monday of this week
            $now->setISODate((int)$now->format('o'), (int)$now->format('W'));
            $start = $now->format('Y-m-d 00:00:00');
            $now->modify('+6 days');
            $end = $now->format('Y-m-d 23:59:59');
            break;
        case 'this_month':
            $start = $now->format('Y-m-01 00:00:00');
            $end = $now->format('Y-m-t 23:59:59');
            break;
        case 'this_year':
            $start = $now->format('Y-01-01 00:00:00');
            $end = $now->format('Y-12-31 23:59:59');
            break;
        case 'custom':
            $start = $startDate ? $startDate . ' 00:00:00' : '2000-01-01 00:00:00';
            $end = $endDate ? $endDate . ' 23:59:59' : '2099-12-31 23:59:59';
            break;
        default:
            $start = '2000-01-01 00:00:00';
            $end = '2099-12-31 23:59:59';
            break;
    }
    return ['start' => $start, 'end' => $end];
}

$dateRange = parseDateFilter();
$search = trim($_GET['search'] ?? '');

try {
    syncAllCustomerProfiles($pdo);
    switch ($action) {
        case 'dashboard_statistics':
            $stats = [];

            // 11 KPI Cards
            $stats['total_customers'] = (int)$pdo->query('SELECT COUNT(*) FROM customers')->fetchColumn();
            $stats['total_enquiries'] = (int)$pdo->query('SELECT COUNT(*) FROM enquiries')->fetchColumn();
            $stats['active_quotations'] = (int)$pdo->query("SELECT COUNT(*) FROM quotation_master WHERE status IN ('draft', 'sent', 'viewed')")->fetchColumn();
            $stats['accepted_quotations'] = (int)$pdo->query("SELECT COUNT(*) FROM quotation_master WHERE status = 'accepted'")->fetchColumn();
            
            $stats['running_installations'] = (int)$pdo->query("SELECT COUNT(*) FROM installation_projects WHERE status NOT IN ('completed', 'closed')")->fetchColumn();
            $stats['completed_projects'] = (int)$pdo->query("SELECT COUNT(*) FROM installation_projects WHERE status = 'completed'")->fetchColumn();
            
            $stats['pending_payments'] = (int)$pdo->query("SELECT COUNT(*) FROM invoices WHERE status = 'pending'")->fetchColumn();
            
            $totalRev = $pdo->query("SELECT SUM(amount) FROM payments")->fetchColumn();
            $stats['total_revenue'] = (float)($totalRev ?: 0.0);

            $monthlyRev = $pdo->query("SELECT SUM(amount) FROM payments WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())")->fetchColumn();
            $stats['monthly_revenue'] = (float)($monthlyRev ?: 0.0);

            $stats['engineers_available'] = (int)$pdo->query("SELECT COUNT(*) FROM engineers WHERE availability = 'available'")->fetchColumn();
            $stats['engineers_assigned'] = (int)$pdo->query("SELECT COUNT(*) FROM engineers WHERE availability = 'busy'")->fetchColumn();

            // Charts data:
            // 1. Monthly Revenue
            $revRows = $pdo->query("
                SELECT DATE_FORMAT(created_at, '%b') AS label, SUM(amount) AS value
                  FROM payments
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                 GROUP BY label ORDER BY MIN(created_at) ASC
            ")->fetchAll(PDO::FETCH_ASSOC);
            if (empty($revRows)) {
                $revRows = [];
            }
            $stats['chart_monthly_revenue'] = $revRows;

            // 2. Monthly Enquiries
            $enqRows = $pdo->query("
                SELECT DATE_FORMAT(created_at, '%b') AS label, COUNT(*) AS value
                  FROM enquiries
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                 GROUP BY label ORDER BY MIN(created_at) ASC
            ")->fetchAll(PDO::FETCH_ASSOC);
            if (empty($enqRows)) {
                $enqRows = [];
            }
            $stats['chart_monthly_enquiries'] = $enqRows;

            // 3. Customer Growth
            $growthRows = $pdo->query("
                SELECT DATE_FORMAT(created_at, '%b') AS label, COUNT(*) AS value
                  FROM customers
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                 GROUP BY label ORDER BY MIN(created_at) ASC
            ")->fetchAll(PDO::FETCH_ASSOC);
            if (empty($growthRows)) {
                $growthRows = [];
            }
            $stats['chart_customer_growth'] = $growthRows;

            // 4. Installation Progress
            $instRows = $pdo->query("
                SELECT status AS label, COUNT(*) AS value
                  FROM installation_projects
                 GROUP BY status
            ")->fetchAll(PDO::FETCH_ASSOC);
            if (empty($instRows)) {
                $instRows = [];
            }
            $stats['chart_installation_progress'] = $instRows;

            // 5. Payment Collection
            $collRows = $pdo->query("
                SELECT method AS label, COUNT(*) AS value
                  FROM payments
                 GROUP BY method
            ")->fetchAll(PDO::FETCH_ASSOC);
            if (empty($collRows)) {
                $collRows = [];
            }
            $stats['chart_payment_collection'] = $collRows;

            // 6. Engineer Workload
            $workRows = $pdo->query("
                SELECT name AS label, COUNT(*) AS value
                  FROM engineers
                 GROUP BY name
            ")->fetchAll(PDO::FETCH_ASSOC);
            if (empty($workRows)) {
                $workRows = [];
            }
            $stats['chart_engineer_workload'] = $workRows;

            // 7. Product Category Distribution
            $prodRows = $pdo->query("
                SELECT p.name AS label, COUNT(qi.id) AS value
                  FROM products p
                  LEFT JOIN quotation_items qi ON qi.product_id = p.id
                 GROUP BY p.name
            ")->fetchAll(PDO::FETCH_ASSOC);
            $stats['chart_product_distribution'] = $prodRows;

            echo json_encode(['success' => true, 'data' => $stats]);
            break;

        case 'sales_report':
            // Query enquiries / lead metrics
            $where = ['e.created_at BETWEEN :start AND :end'];
            $params = [':start' => $dateRange['start'], ':end' => $dateRange['end']];
            if ($search !== '') {
                $where[] = '(e.name LIKE :s OR e.email LIKE :s OR e.phone LIKE :s OR e.city LIKE :s)';
                $params[':s'] = "%$search%";
            }
            $whereStr = implode(' AND ', $where);

            $stmt = $pdo->prepare("
                SELECT e.id, e.name, e.email, e.phone, e.city, e.state, e.system_size_kw, e.status, e.created_at
                  FROM enquiries e
                 WHERE {$whereStr}
                 ORDER BY e.created_at DESC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($rows)) {
                $rows = [];
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        case 'revenue_report':
            // Query invoice values
            $where = ['i.created_at BETWEEN :start AND :end'];
            $params = [':start' => $dateRange['start'], ':end' => $dateRange['end']];
            if ($search !== '') {
                $where[] = '(c.full_name LIKE :s OR i.invoice_num LIKE :s)';
                $params[':s'] = "%$search%";
            }
            $whereStr = implode(' AND ', $where);

            $stmt = $pdo->prepare("
                SELECT i.id, i.invoice_num AS invoice_number, c.full_name AS customer_name, i.grand_total AS amount_due, i.gst AS gst_amount, i.status, i.created_at
                  FROM invoices i
                  JOIN customers c ON c.id = i.customer_id
                 WHERE {$whereStr}
                 ORDER BY i.created_at DESC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($rows)) {
                $rows = [];
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        case 'quotation_report':
            $where = ['q.created_at BETWEEN :start AND :end'];
            $params = [':start' => $dateRange['start'], ':end' => $dateRange['end']];
            if ($search !== '') {
                $where[] = '(c.full_name LIKE :s OR q.status LIKE :s)';
                $params[':s'] = "%$search%";
            }
            $whereStr = implode(' AND ', $where);

            $stmt = $pdo->prepare("
                SELECT q.id, c.full_name AS customer_name, q.subtotal, q.discount, q.gst, q.grand_total, q.validity_date, q.status, q.created_at
                  FROM quotation_master q
                  JOIN customers c ON c.id = q.customer_id
                 WHERE {$whereStr}
                 ORDER BY q.created_at DESC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($rows)) {
                $rows = [];
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        case 'installation_report':
            $where = ['p.created_at BETWEEN :start AND :end'];
            $params = [':start' => $dateRange['start'], ':end' => $dateRange['end']];
            if ($search !== '') {
                $where[] = '(c.full_name LIKE :s OR p.status LIKE :s)';
                $params[':s'] = "%$search%";
            }
            $whereStr = implode(' AND ', $where);

            $stmt = $pdo->prepare("
                SELECT p.id, c.full_name AS customer_name, p.status, p.scheduled_install_date, p.estimated_completion_date, p.created_at
                  FROM installation_projects p
                  JOIN customers c ON c.id = p.customer_id
                 WHERE {$whereStr}
                 ORDER BY p.created_at DESC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($rows)) {
                $rows = [];
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        case 'payment_report':
            $where = ['py.pay_date BETWEEN :start AND :end'];
            $params = [':start' => $dateRange['start'], ':end' => $dateRange['end']];
            if ($search !== '') {
                $where[] = '(c.full_name LIKE :s OR i.invoice_num LIKE :s)';
                $params[':s'] = "%$search%";
            }
            $whereStr = implode(' AND ', $where);

            $stmt = $pdo->prepare("
                SELECT py.id, c.full_name AS customer_name, i.invoice_num AS invoice_number, py.amount AS amount_paid,
                       i.status AS payment_status, py.pay_date AS created_at
                  FROM payments py
                  JOIN invoices i ON i.id = py.invoice_id
                  JOIN customers c ON c.id = i.customer_id
                 WHERE {$whereStr}
                 ORDER BY py.pay_date DESC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($rows)) {
                $rows = [];
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        case 'engineer_report':
            $where = ['e.created_at BETWEEN :start AND :end'];
            $params = [':start' => $dateRange['start'], ':end' => $dateRange['end']];
            if ($search !== '') {
                $where[] = '(e.name LIKE :s OR e.skills LIKE :s)';
                $params[':s'] = "%$search%";
            }
            $whereStr = implode(' AND ', $where);

            $stmt = $pdo->prepare("
                SELECT e.id, e.name, e.mobile, e.email, e.skills, e.availability, e.created_at
                  FROM engineers e
                 WHERE {$whereStr}
                 ORDER BY e.name ASC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($rows)) {
                $rows = [];
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        case 'customer_report':
            $where = ['c.created_at BETWEEN :start AND :end'];
            $params = [':start' => $dateRange['start'], ':end' => $dateRange['end']];
            if ($search !== '') {
                $where[] = '(c.full_name LIKE :s OR c.phone LIKE :s OR c.email LIKE :s)';
                $params[':s'] = "%$search%";
            }
            $whereStr = implode(' AND ', $where);

            $stmt = $pdo->prepare("
                SELECT c.id, c.full_name AS name, c.email, c.phone, c.created_at,
                       (SELECT COUNT(*) FROM enquiries WHERE email = c.email) AS enquiries_count,
                       (SELECT COUNT(*) FROM quotation_master WHERE customer_id = c.id) AS quotations_count,
                       (SELECT COUNT(*) FROM installation_projects WHERE customer_id = c.id AND status = 'completed') AS completed_projects_count
                  FROM customers c
                 WHERE {$whereStr}
                 ORDER BY c.created_at DESC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($rows)) {
                $rows = [];
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        case 'document_report':
            $where = ['d.uploaded_at BETWEEN :start AND :end'];
            $params = [':start' => $dateRange['start'], ':end' => $dateRange['end']];
            if ($search !== '') {
                $where[] = '(c.full_name LIKE :s OR d.file_name LIKE :s OR d.doc_type LIKE :s)';
                $params[':s'] = "%$search%";
            }
            $whereStr = implode(' AND ', $where);

            $stmt = $pdo->prepare("
                SELECT d.id, d.doc_type, c.full_name AS customer_name, d.file_name, d.uploaded_at, d.status, v.name AS verified_by, d.verified_at, d.notes
                  FROM documents d
                  JOIN customers c ON c.id = d.customer_id
                  LEFT JOIN users v ON v.id = d.verified_by
                 WHERE {$whereStr}
                 ORDER BY d.uploaded_at DESC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($rows)) {
                $rows = [];
            }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Reports action '$action' not resolved."]);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
