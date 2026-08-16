<?php
/**
 * POST /api/auth/logout.php
 * Invalidates the current token.
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

// In stateless JWT, the client discards the token.
echo json_encode(['success' => true, 'message' => 'Logged out successfully.']);
