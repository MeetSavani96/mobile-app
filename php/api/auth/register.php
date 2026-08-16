<?php
/**
 * POST /api/auth/register.php
 * Body: { "name", "email", "password", "phone", "city", "address" }
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$body     = json_decode(file_get_contents('php://input'), true);
$name     = trim($body['name']     ?? '');
$email    = trim($body['email']    ?? '');
$password = trim($body['password'] ?? '');
$phone    = trim($body['phone']    ?? '') ?: null;
$city     = trim($body['city']     ?? '') ?: null;
$address  = trim($body['address']  ?? '') ?: null;

if ($name === '' || $email === '' || $password === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Name, email and password are required.']);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
    exit;
}
if (strlen($password) < 6) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters.']);
    exit;
}

// Check duplicate
$chk = $pdo->prepare('SELECT id FROM users WHERE email = :e LIMIT 1');
$chk->execute([':e' => $email]);
if ($chk->fetch()) {
    http_response_code(409);
    echo json_encode(['success' => false, 'message' => 'An account with this email already exists.']);
    exit;
}

$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

$pdo->beginTransaction();
try {
    $ins = $pdo->prepare('INSERT INTO users (name, email, password, phone, city, address, role, status) VALUES (:n, :e, :p, :ph, :c, :a, "customer", "registered")');
    $ins->execute([':n' => $name, ':e' => $email, ':p' => $hash, ':ph' => $phone, ':c' => $city, ':a' => $address]);
    $userId = (int)$pdo->lastInsertId();

    require_once __DIR__ . '/../_auth.php';
    $customerId = ensureCustomerProfile($pdo, $userId);

    logActivity($userId, 'customer_registered', 'users', $userId, ['name' => $name, 'email' => $email, 'customer_id' => $customerId]);

    // Admin Notification
    $notifStmt = $pdo->prepare('
        INSERT INTO notifications (user_id, title, body, type, reference_id, reference_type)
        VALUES (NULL, "New Customer Registered", :body, "registration", :refid, "users")
    ');
    $notifStmt->execute([
        ':body'  => "Customer $name ($email) created an account.",
        ':refid' => $userId
    ]);

    $pdo->commit();

    // Generate stateless JWT token
    require_once __DIR__ . '/jwt_helper.php';
    $token = JWTHelper::generate([
        'user_id' => $userId,
        'role'    => 'customer'
    ]);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'token'   => $token,
        'user'    => [
            'id'              => $userId,
            'name'            => $name,
            'email'           => $email,
            'role'            => 'customer',
            'phone'           => $phone,
            'city'            => $city,
            'address'         => $address,
            'status'          => 'akv_customer',
            'akv_customer_id' => $customerId > 0 ? $customerId : null,
            'is_akv_customer' => $customerId > 0,
        ],
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Registration failed. Please try again.']);
}
