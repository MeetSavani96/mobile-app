<?php
require_once __DIR__ . '/../api/auth/jwt_helper.php';

// Test case 1: Successful token flow
$payload = ['user_id' => 123, 'role' => 'admin'];
$token = JWTHelper::generate($payload);
echo "Generated token: $token\n";

$verified = JWTHelper::verify($token);
if ($verified && $verified['user_id'] === 123 && $verified['role'] === 'admin') {
    echo "✓ Test case 1 passed: Valid token successfully verified.\n";
} else {
    echo "✗ Test case 1 failed.\n";
    exit(1);
}

// Test case 2: Expired token
$expiredToken = JWTHelper::generate($payload, -10); // expired 10 seconds ago
$verifiedExpired = JWTHelper::verify($expiredToken);
if ($verifiedExpired === null) {
    echo "✓ Test case 2 passed: Expired token rejected.\n";
} else {
    echo "✗ Test case 2 failed: Expired token was accepted!\n";
    exit(1);
}

// Test case 3: Tampered signature
$parts = explode('.', $token);
$parts[2] = 'invalidSignatureHash123';
$tamperedToken = implode('.', $parts);
$verifiedTampered = JWTHelper::verify($tamperedToken);
if ($verifiedTampered === null) {
    echo "✓ Test case 3 passed: Tampered token rejected.\n";
} else {
    echo "✗ Test case 3 failed: Tampered token was accepted!\n";
    exit(1);
}

echo "All JWT helper tests passed successfully!\n";
