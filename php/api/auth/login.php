<?php
/**
 * POST /api/auth/login.php
 * Body: { "email": "...", "password": "..." }
 * Returns: { "success": true, "token": "...", "user": { id, name, email, role, is_akv_customer, ... } }
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
$email    = trim($body['email']    ?? '');
$password = trim($body['password'] ?? '');

if ($email === '' || $password === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Email and password are required.']);
    exit;
}

// Fetch user
$stmt = $pdo->prepare('SELECT id, name, email, password, role, status, phone, city, address, is_active FROM users WHERE email = :e LIMIT 1');
$stmt->execute([':e' => $email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
    exit;
}

if (!(int)$user['is_active']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Account is deactivated. Contact support.']);
    exit;
}

// Update last login
$upd = $pdo->prepare('UPDATE users SET last_login = NOW() WHERE id = :id');
$upd->execute([':id' => $user['id']]);

// Ensure customer profile link for customers
$customerId = null;
if ($user['role'] === 'customer') {
    $customerId = ensureCustomerProfile($pdo, (int)$user['id']);
}

$linkStmt = $pdo->prepare('SELECT customer_id FROM customer_user_links WHERE user_id = :uid AND status = "active" LIMIT 1');
$linkStmt->execute([':uid' => $user['id']]);
$link = $linkStmt->fetch();
$activeCustId = $link ? (int)$link['customer_id'] : ($customerId > 0 ? $customerId : null);

// Generate stateless JWT token
require_once __DIR__ . '/jwt_helper.php';
$token = JWTHelper::generate([
    'user_id' => (int)$user['id'],
    'role'    => $user['role']
]);

// Log Activity
logActivity($user['id'], 'user_logged_in', 'users', (int)$user['id'], ['email' => $user['email']]);

echo json_encode([
    'success' => true,
    'token'   => $token,
    'user'    => [
        'id'              => (int)$user['id'],
        'name'            => $user['name'],
        'email'           => $user['email'],
        'role'            => $user['role'],
        'phone'           => $user['phone'],
        'city'            => $user['city'],
        'address'         => $user['address'],
        'status'          => $user['role'] === 'customer' ? 'akv_customer' : ($user['status'] ?? 'registered'),
        'akv_customer_id' => $activeCustId,
        'is_akv_customer' => $activeCustId !== null && $activeCustId > 0,
    ],
]);
