<?php
/**
 * Engineers Management API.
 * Handles CRUD operations, roster lists, and workload details.
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET Engineers (Roster and Workload) ───────────────────────────────────
if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id > 0) {
        // Fetch Single Profile
        $stmt = $pdo->prepare('SELECT * FROM engineers WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $eng = $stmt->fetch();
        if (!$eng) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Engineer not found.']);
            exit;
        }

        // Fetch assigned projects
        $pjStmt = $pdo->prepare('
            SELECT p.id AS project_id, p.status, c.full_name AS customer_name, c.phone AS customer_phone
              FROM engineer_assignments ea
              JOIN installation_projects p ON p.id = ea.project_id
              JOIN customers c ON c.id = p.customer_id
             WHERE ea.engineer_id = :eid
        ');
        $pjStmt->execute([':eid' => $id]);
        $eng['assigned_projects'] = $pjStmt->fetchAll();

        echo json_encode(['success' => true, 'data' => $eng]);
        exit;
    }

    // List all engineers + count of active projects
    $stmt = $pdo->query('
        SELECT e.*, 
               (SELECT COUNT(*) 
                  FROM engineer_assignments ea 
                  JOIN installation_projects ip ON ip.id = ea.project_id 
                 WHERE ea.engineer_id = e.id AND ip.status != "closed"
               ) AS active_projects_count
          FROM engineers e
         ORDER BY e.name ASC
    ');
    $rows = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $rows]);
    exit;
}

// ── POST Create Engineer ──────────────────────────────────────────────────
if ($method === 'POST') {
    $admin = requireRole('admin');
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $name    = trim($body['name'] ?? '');
    $mobile  = trim($body['mobile'] ?? '');
    $email   = trim($body['email'] ?? '');
    $address = trim($body['address'] ?? '') ?: null;
    $skills  = trim($body['skills'] ?? '') ?: null;
    $avail   = trim($body['availability'] ?? 'available');

    if ($name === '' || $mobile === '' || $email === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Name, mobile and email are required.']);
        exit;
    }

    try {
        $ins = $pdo->prepare('
            INSERT INTO engineers (name, mobile, email, address, skills, availability)
            VALUES (:name, :mob, :email, :addr, :skills, :avail)
        ');
        $ins->execute([
            ':name'   => $name,
            ':mob'    => $mobile,
            ':email'  => $email,
            ':addr'   => $address,
            ':skills' => $skills,
            ':avail'  => $avail
        ]);

        $eid = (int)$pdo->lastInsertId();
        logActivity((int)$admin['id'], 'create_engineer', 'engineer', $eid);
        echo json_encode(['success' => true, 'message' => 'Engineer profile added.', 'id' => $eid]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to add engineer.']);
    }
    exit;
}

// ── PUT Update Engineer ───────────────────────────────────────────────────
if ($method === 'PUT') {
    $admin = requireRole('admin');
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $id      = (int)($body['id'] ?? 0);
    $name    = trim($body['name'] ?? '');
    $mobile  = trim($body['mobile'] ?? '');
    $email   = trim($body['email'] ?? '');
    $address = trim($body['address'] ?? '') ?: null;
    $skills  = trim($body['skills'] ?? '') ?: null;
    $avail   = trim($body['availability'] ?? 'available');

    if ($id <= 0 || $name === '' || $mobile === '' || $email === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid ID, name, mobile and email are required.']);
        exit;
    }

    try {
        $upd = $pdo->prepare('
            UPDATE engineers 
               SET name = :name, mobile = :mob, email = :email, address = :addr, skills = :skills, availability = :avail
             WHERE id = :id
        ');
        $upd->execute([
            ':name'   => $name,
            ':mob'    => $mobile,
            ':email'  => $email,
            ':addr'   => $address,
            ':skills' => $skills,
            ':avail'  => $avail,
            ':id'     => $id
        ]);

        logActivity((int)$admin['id'], 'update_engineer', 'engineer', $id);
        echo json_encode(['success' => true, 'message' => 'Engineer profile updated.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update engineer profile.']);
    }
    exit;
}

// ── DELETE Engineer ───────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $admin = requireRole('admin');
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid engineer ID required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare('DELETE FROM engineers WHERE id = :id');
        $stmt->execute([':id' => $id]);
        logActivity((int)$admin['id'], 'delete_engineer', 'engineer', $id);
        echo json_encode(['success' => true, 'message' => 'Engineer deleted successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete engineer record.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
