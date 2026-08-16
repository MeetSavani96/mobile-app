<?php
/**
 * Admin Enquiries API — single file, method-based routing.
 *
 * GET    /api/admin/enquiries.php          → list (search, filter, paginate)
 * GET    /api/admin/enquiries.php?id=5     → single with timeline
 * PUT    /api/admin/enquiries.php          → update status / remarks / assigned_to
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$admin = requireRole('admin');
$method = $_SERVER['REQUEST_METHOD'];

// ── GET list / single ─────────────────────────────────────────────────────
if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id > 0) {
        // Single enquiry + timeline
        $stmt = $pdo->prepare('
            SELECT e.*, c.full_name AS customer_name
              FROM enquiries e
              LEFT JOIN customers c ON c.id = e.customer_id
             WHERE e.id = :id LIMIT 1
        ');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        if (!$row) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Not found.']); exit; }

        $tl = $pdo->prepare('SELECT * FROM enquiry_timeline WHERE enquiry_id = :id ORDER BY created_at ASC');
        $tl->execute([':id' => $id]);
        $row['timeline'] = $tl->fetchAll();
        echo json_encode(['success' => true, 'data' => $row]);
        exit;
    }

    // List
    $search = trim($_GET['search'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $limit  = min((int)($_GET['limit'] ?? 50), 200);
    $offset = max((int)($_GET['offset'] ?? 0), 0);

    $where = ['1=1'];
    $params = [];
    if ($search) { $where[] = '(e.name LIKE :s OR e.phone LIKE :s OR e.email LIKE :s)'; $params[':s'] = "%{$search}%"; }
    if ($status) { $where[] = 'e.status = :st'; $params[':st'] = $status; }
    $whereStr = implode(' AND ', $where);

    $cnt = $pdo->prepare("SELECT COUNT(*) FROM enquiries e WHERE {$whereStr}");
    $cnt->execute($params);
    $total = (int)$cnt->fetchColumn();

    $stmt = $pdo->prepare("
        SELECT e.id, e.name, e.phone, e.email, e.city, e.state, e.system_size_kw,
               e.status, e.source, e.notes, e.created_at,
               COALESCE(c.full_name, u.name, e.name) AS customer_name,
               COALESCE(e.phone, c.phone, u.phone) AS phone,
               COALESCE(e.email, c.email, u.email) AS email
          FROM enquiries e
          LEFT JOIN customers c ON c.id = e.customer_id
          LEFT JOIN users u ON u.id = e.user_id
         WHERE {$whereStr}
         ORDER BY e.created_at DESC
         LIMIT :lim OFFSET :off
    ");
    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
    $stmt->execute();
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll(), 'total' => $total]);
    exit;
}

// ── PUT update ────────────────────────────────────────────────────────────
if ($method === 'PUT') {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $id     = (int)($body['id'] ?? 0);
    $status = trim($body['status'] ?? '');
    $remark = trim($body['admin_remarks'] ?? '');
    $assign = isset($body['assigned_to']) ? (int)$body['assigned_to'] : null;

    if ($id <= 0) { http_response_code(422); echo json_encode(['success'=>false,'message'=>'Valid id required.']); exit; }

    $validStatuses = ['new','contacted','site_visit_scheduled','quotation_sent','approved','rejected','installation_started','completed','cancelled'];
    if ($status && !in_array($status, $validStatuses, true)) {
        http_response_code(422); echo json_encode(['success'=>false,'message'=>'Invalid status.']); exit;
    }

    $fields = [];
    $params = [':id' => $id];
    if ($status) { $fields[] = 'status = :status'; $params[':status'] = $status; }
    if ($remark !== '') { $fields[] = 'admin_remarks = :remarks'; $params[':remarks'] = $remark; }
    if ($assign !== null) { $fields[] = 'assigned_to = :assign'; $params[':assign'] = $assign; }

    if (empty($fields)) { echo json_encode(['success'=>false,'message'=>'Nothing to update.']); exit; }

    $pdo->prepare('UPDATE enquiries SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);

    // Timeline entry
    $action = $status ? "Status changed to: {$status}" : 'Remarks updated';
    $tl = $pdo->prepare('INSERT INTO enquiry_timeline (enquiry_id, actor_id, actor_name, action, note) VALUES (:eid,:aid,:aname,:act,:note)');
    $tl->execute([':eid'=>$id,':aid'=>$admin['id'],':aname'=>$admin['name'],':act'=>$action,':note'=>$remark ?: null]);

    logActivity((int)$admin['id'], 'update_enquiry', 'enquiry', $id, ['status' => $status]);
    echo json_encode(['success' => true, 'message' => 'Enquiry updated.']);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
