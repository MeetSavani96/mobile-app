<?php
/**
 * Public Leads and Enquiries Handler API.
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Requires a logged-in user session
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $userId = null;
    if (str_starts_with($authHeader, 'Bearer ')) {
        $raw = trim(substr($authHeader, 7));
        require_once __DIR__ . '/../auth/jwt_helper.php';
        $payload = JWTHelper::verify($raw);
        if ($payload && isset($payload['user_id'])) {
            $userId = (int)$payload['user_id'];
        }
    }

    if (!$userId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
        exit;
    }

    // Resolve phone from user profile
    $userRow = $pdo->query("SELECT phone, email FROM users WHERE id = $userId")->fetch();
    $phone = $userRow['phone'] ?? '';

    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id > 0) {
        // Fetch single enquiry details + timeline
        $stmt = $pdo->prepare('
            SELECT e.*, u.name AS engineer_name
              FROM enquiries e
              LEFT JOIN users u ON u.id = e.assigned_to
             WHERE e.id = :id AND (e.user_id = :uid OR e.phone = :ph)
             LIMIT 1
        ');
        $stmt->execute([':id' => $id, ':uid' => $userId, ':ph' => $phone]);
        $enq = $stmt->fetch();
        if (!$enq) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Enquiry not found.']);
            exit;
        }

        // Timeline
        $tl = $pdo->prepare('SELECT * FROM enquiry_timeline WHERE enquiry_id = :eid ORDER BY created_at ASC');
        $tl->execute([':eid' => $id]);
        $enq['timeline'] = $tl->fetchAll();

        echo json_encode(['success' => true, 'data' => $enq]);
        exit;
    }

    // Fetch list of customer's enquiries
    $stmt = $pdo->prepare('
        SELECT e.id, e.name, e.phone, e.email, e.system_size_kw, e.status, e.created_at, u.name AS engineer_name
          FROM enquiries e
          LEFT JOIN users u ON u.id = e.assigned_to
         WHERE e.user_id = :uid OR e.phone = :ph
         ORDER BY e.created_at DESC
    ');
    $stmt->execute([':uid' => $userId, ':ph' => $phone]);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$name   = trim($body['name'] ?? '');
$phone  = trim($body['phone'] ?? '');
$email  = trim($body['email'] ?? '') ?: null;
$state  = trim($body['state'] ?? '') ?: null;
$city   = trim($body['city'] ?? '') ?: null;
$size   = isset($body['system_size_kw']) ? (float)$body['system_size_kw'] : null;
$space  = isset($body['roof_space']) ? (float)$body['roof_space'] : null;
$notes  = trim($body['notes'] ?? $body['message'] ?? '') ?: null;
$source = trim($body['source'] ?? 'app') ?: 'app';

if ($name === '' || $phone === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Name and phone are required.']);
    exit;
}

try {
    // Check if there is an active session
    $userId = null;
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (str_starts_with($authHeader, 'Bearer ')) {
        $raw = trim(substr($authHeader, 7));
        require_once __DIR__ . '/../auth/jwt_helper.php';
        $payload = JWTHelper::verify($raw);
        if ($payload && isset($payload['user_id'])) {
            $userId = (int)$payload['user_id'];
        }
    }

    // Auto-create or resolve matching customer by phone
    $stmt = $pdo->prepare('SELECT id FROM customers WHERE phone = :ph LIMIT 1');
    $stmt->execute([':ph' => $phone]);
    $customerId = $stmt->fetchColumn() ?: null;

    if (!$customerId) {
        $insCust = $pdo->prepare('
            INSERT INTO customers (user_id, full_name, phone, email, address)
            VALUES (:uid, :n, :ph, :e, :addr)
        ');
        $insCust->execute([
            ':uid' => $userId,
            ':n' => $name,
            ':ph' => $phone,
            ':e' => $email,
            ':addr' => $city ? "$city, $state" : null
        ]);
        $customerId = (int)$pdo->lastInsertId();
    }

    // Insert lead enquiry
    $ins = $pdo->prepare('
        INSERT INTO enquiries 
            (customer_id, user_id, name, phone, email, state, city, system_size_kw, roof_space, notes, source, status)
        VALUES 
            (:cid, :uid, :n, :ph, :e, :st, :ct, :size, :space, :notes, :src, "new")
    ');
    $ins->execute([
        ':cid'   => $customerId,
        ':uid'   => $userId,
        ':n'     => $name,
        ':ph'    => $phone,
        ':e'     => $email,
        ':st'    => $state,
        ':ct'    => $city,
        ':size'  => $size,
        ':space' => $space,
        ':notes' => $notes,
        ':src'   => $source,
    ]);

    $enquiryId = (int)$pdo->lastInsertId();

    // Log to Timeline
    $insTimeline = $pdo->prepare('
        INSERT INTO enquiry_timeline (enquiry_id, actor_name, action, note)
        VALUES (:eid, "System", "Lead Created", :note)
    ');
    $insTimeline->execute([
        ':eid' => $enquiryId,
        ':note' => "Lead created via $source."
    ]);

    echo json_encode(['success' => true, 'message' => 'Enquiry submitted successfully.', 'id' => $enquiryId]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to submit enquiry.']);
}
