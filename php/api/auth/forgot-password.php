<?php
/**
 * POST /api/auth/forgot-password.php
 * Body: { "email": "..." }
 * Responds with success message without leaking account existence.
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$body  = json_decode(file_get_contents('php://input'), true);
$email = trim($body['email'] ?? '');

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

// Check if user exists (silent verification)
$stmt = $pdo->prepare('SELECT id, name FROM users WHERE email = :e LIMIT 1');
$stmt->execute([':e' => $email]);
$user = $stmt->fetch();

if ($user) {
    require_once __DIR__ . '/../_auth.php';
    logActivity((int)$user['id'], 'password_reset_requested', 'users', (int)$user['id'], ['email' => $email]);
}

// Always return generic success message to prevent user enumeration
echo json_encode([
    'success' => true,
    'message' => 'If an account exists with this email address, password reset instructions have been sent.'
]);
