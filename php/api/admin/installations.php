<?php
/**
 * Installation Management API.
 * Handles Projects CRUD, tasks seed/updates, timeline tracking, and safe photos uploads.
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Helper to get Customer ID by user
function resolveCustomerId($pdo, $userId) {
    $stmt = $pdo->prepare('SELECT id FROM customers WHERE user_id = :uid LIMIT 1');
    $stmt->execute([':uid' => $userId]);
    return $stmt->fetchColumn() ?: null;
}

// ── GET INSTALLATIONS (LIST OR SINGLE) ────────────────────────────────────
if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id > 0) {
        // Fetch Single Project Details
        $stmt = $pdo->prepare('
            SELECT p.*, c.full_name AS customer_name, c.phone AS customer_phone, c.address AS customer_address,
                   (SELECT grand_total FROM quotation_master WHERE customer_id = p.customer_id ORDER BY id DESC LIMIT 1) AS quote_amount
              FROM installation_projects p
              JOIN customers c ON c.id = p.customer_id
             WHERE p.id = :id LIMIT 1
        ');
        $stmt->execute([':id' => $id]);
        $project = $stmt->fetch();

        if (!$project) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Project not found.']);
            exit;
        }

        // Check ownership if user is customer
        if ($user['role'] === 'customer') {
            $custIdx = resolveCustomerId($pdo, $user['id']);
            if (!$custIdx || (int)$project['customer_id'] !== (int)$custIdx) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Forbidden.']);
                exit;
            }
        }

        // Decode JSON arrays safely
        $project['site_photos'] = json_decode($project['site_photos'] ?? '[]', true) ?: [];
        $project['completion_photos'] = json_decode($project['completion_photos'] ?? '[]', true) ?: [];

        // Fetch Assigned Engineers
        $engStmt = $pdo->prepare('
            SELECT e.id, e.name, e.mobile, e.email
              FROM engineer_assignments ea
              JOIN engineers e ON e.id = ea.engineer_id
             WHERE ea.project_id = :pid
        ');
        $engStmt->execute([':pid' => $id]);
        $project['assigned_engineers'] = $engStmt->fetchAll();

        // Fetch Tasks list
        $taskStmt = $pdo->prepare('SELECT * FROM installation_tasks WHERE project_id = :pid ORDER BY id ASC');
        $taskStmt->execute([':pid' => $id]);
        $project['tasks'] = $taskStmt->fetchAll();

        echo json_encode(['success' => true, 'data' => $project]);
        exit;
    }

    // LIST PROJECTS
    if ($user['role'] === 'admin') {
        $status = trim($_GET['status'] ?? '');
        $search = trim($_GET['search'] ?? '');

        $where = ['1=1'];
        $params = [];

        if ($status) {
            $where[] = 'p.status = :status';
            $params[':status'] = $status;
        }
        if ($search) {
            $where[] = 'c.full_name LIKE :s';
            $params[':s'] = "%{$search}%";
        }

        $whereStr = implode(' AND ', $where);

        $stmt = $pdo->prepare("
            SELECT p.id, p.status, p.estimated_completion_date, p.created_at, c.full_name AS customer_name, c.phone AS customer_phone
              FROM installation_projects p
              JOIN customers c ON c.id = p.customer_id
             WHERE {$whereStr}
             ORDER BY p.id DESC
        ");
        $stmt->execute($params);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } else {
        // Customer gets only their active project
        $custIdx = resolveCustomerId($pdo, $user['id']);
        if (!$custIdx) {
            echo json_encode(['success' => true, 'data' => []]);
            exit;
        }

        $stmt = $pdo->prepare('
            SELECT p.id, p.status, p.estimated_completion_date, p.created_at, c.full_name AS customer_name
              FROM installation_projects p
              JOIN customers c ON c.id = p.customer_id
             WHERE p.customer_id = :cid
             ORDER BY p.id DESC
        ');
        $stmt->execute([':cid' => $custIdx]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    }
    exit;
}

// ── POST CREATE INSTALLATION PROJECT ──────────────────────────────────────
if ($method === 'POST' && ($action === 'create' || $action === 'create_installation' || $action === '')) {
    $admin = requireRole('admin');
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $customerId = (int)($body['customer_id'] ?? 0);
    $estDate    = trim($body['estimated_completion_date'] ?? '') ?: null;
    $status     = trim($body['status'] ?? 'lead_received');
    $notes      = trim($body['internal_notes'] ?? '') ?: null;

    if ($customerId <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid customer selection is required.']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        $ins = $pdo->prepare('
            INSERT INTO installation_projects (customer_id, status, estimated_completion_date, internal_notes)
            VALUES (:cid, :status, :est, :notes)
        ');
        $ins->execute([
            ':cid'    => $customerId,
            ':status' => $status,
            ':est'    => $estDate,
            ':notes'  => $notes
        ]);

        $projectId = (int)$pdo->lastInsertId();

        // Seed 9 Standard Installation Tasks
        $standardTasks = [
            'Site Survey',
            'Structure Installation',
            'Panel Installation',
            'Inverter Installation',
            'AC/DC Wiring',
            'Earthing',
            'Net Meter Application',
            'Testing & Commissioning',
            'Customer Handover'
        ];

        $insTask = $pdo->prepare('INSERT INTO installation_tasks (project_id, title, status) VALUES (:pid, :title, "pending")');
        foreach ($standardTasks as $title) {
            $insTask->execute([
                ':pid'   => $projectId,
                ':title' => $title
            ]);
        }

        $pdo->commit();
        logActivity((int)$admin['id'], 'create_project', 'project', $projectId);
        echo json_encode(['success' => true, 'message' => 'Project created & standard tasks seeded.', 'id' => $projectId]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create installation project.']);
    }
    exit;
}

// ── PUT UPDATE INSTALLATION PROJECT (OR TASKS) ────────────────────────────
if ($method === 'PUT') {
    $admin = requireRole('admin');
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $id       = (int)($body['id'] ?? 0);
    $status   = trim($body['status'] ?? '');
    $surveyDt = trim($body['scheduled_survey_date'] ?? '') ?: null;
    $instDt   = trim($body['scheduled_install_date'] ?? '') ?: null;
    $estDt    = trim($body['estimated_completion_date'] ?? '') ?: null;
    $notes    = trim($body['internal_notes'] ?? '') ?: null;
    
    // Arrays for photos
    $sitePhotos = isset($body['site_photos']) ? json_encode($body['site_photos']) : null;
    $compPhotos = isset($body['completion_photos']) ? json_encode($body['completion_photos']) : null;
    
    // Single inputs
    $sig  = trim($body['customer_signature'] ?? '') ?: null;
    $warr = trim($body['warranty_card_url'] ?? '') ?: null;

    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid project ID required.']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        $fields = [];
        $params = [':id' => $id];

        if ($status) { $fields[] = 'status = :status'; $params[':status'] = $status; }
        if ($surveyDt !== null) { $fields[] = 'scheduled_survey_date = :survey'; $params[':survey'] = $surveyDt; }
        if ($instDt !== null) { $fields[] = 'scheduled_install_date = :inst'; $params[':inst'] = $instDt; }
        if ($estDt !== null) { $fields[] = 'estimated_completion_date = :est'; $params[':est'] = $estDt; }
        if ($notes !== null) { $fields[] = 'internal_notes = :notes'; $params[':notes'] = $notes; }
        if ($sitePhotos !== null) { $fields[] = 'site_photos = :sp'; $params[':sp'] = $sitePhotos; }
        if ($compPhotos !== null) { $fields[] = 'completion_photos = :cp'; $params[':cp'] = $compPhotos; }
        if ($sig !== null) { $fields[] = 'customer_signature = :sig'; $params[':sig'] = $sig; }
        if ($warr !== null) { $fields[] = 'warranty_card_url = :warr'; $params[':warr'] = $warr; }

        if (!empty($fields)) {
            $sql = 'UPDATE installation_projects SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $pdo->prepare($sql)->execute($params);
        }

        // Update Tasks status if sent in payload
        if (isset($body['tasks']) && is_array($body['tasks'])) {
            $updTask = $pdo->prepare('UPDATE installation_tasks SET status = :status WHERE id = :id AND project_id = :pid');
            foreach ($body['tasks'] as $t) {
                $updTask->execute([
                    ':status' => $t['status'],
                    ':id'     => (int)$t['id'],
                    ':pid'    => $id
                ]);
            }
        }

        $pdo->commit();
        logActivity((int)$admin['id'], 'update_project', 'project', $id);
        echo json_encode(['success' => true, 'message' => 'Project configurations updated.']);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

// ── POST ASSIGN ENGINEER TO PROJECT ───────────────────────────────────────
if ($method === 'POST' && $action === 'assign_engineer') {
    $admin = requireRole('admin');
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $projectId  = (int)($body['project_id'] ?? 0);
    $engineerId = (int)($body['engineer_id'] ?? 0);

    if ($projectId <= 0 || $engineerId <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid project_id and engineer_id are required.']);
        exit;
    }

    try {
        // Check if duplicate assignment exists
        $chk = $pdo->prepare('SELECT COUNT(*) FROM engineer_assignments WHERE project_id = :pid AND engineer_id = :eid');
        $chk->execute([':pid' => $projectId, ':eid' => $engineerId]);
        
        if ((int)$chk->fetchColumn() === 0) {
            $ins = $pdo->prepare('INSERT INTO engineer_assignments (project_id, engineer_id) VALUES (:pid, :eid)');
            $ins->execute([':pid' => $projectId, ':eid' => $engineerId]);
            logActivity((int)$admin['id'], 'assign_engineer', 'project', $projectId, ['engineer_id' => $engineerId]);
        }
        echo json_encode(['success' => true, 'message' => 'Engineer assigned to project.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to assign engineer.']);
    }
    exit;
}

// ── DELETE INSTALLATION PROJECT ───────────────────────────────────────────
if ($method === 'DELETE') {
    $admin = requireRole('admin');
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid project ID required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare('DELETE FROM installation_projects WHERE id = :id');
        $stmt->execute([':id' => $id]);
        logActivity((int)$admin['id'], 'delete_project', 'project', $id);
        echo json_encode(['success' => true, 'message' => 'Project wiped from ledger.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete project.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
