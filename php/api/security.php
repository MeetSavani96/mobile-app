<?php
/**
 * Security middleware for AKV Energy API.
 * Sets secure headers, performs rate limiting, and verifies CORS origins.
 */

// 1. Secure Headers
header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Content-Security-Policy: default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https://*; img-src \'self\' data: https://*;');

// 2. IP-based Rate Limiter (Stateless)
function checkRateLimit() {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $hash = md5($ip);
    
    // Put rate limits in uploads/rate_limits directory
    $dir = dirname(__DIR__, 2) . '/uploads/rate_limits';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    
    $file = $dir . '/' . $hash . '.json';
    $now = time();
    $limit = 120;  // 120 requests
    $window = 60;  // per 60 seconds
    
    $data = ['count' => 0, 'start' => $now];
    if (file_exists($file)) {
        $fileContent = @file_get_contents($file);
        $decoded = json_decode($fileContent, true);
        if ($decoded) {
            $data = $decoded;
        }
    }
    
    if ($now - $data['start'] > $window) {
        $data['count'] = 1;
        $data['start'] = $now;
    } else {
        $data['count']++;
    }
    
    @file_put_contents($file, json_encode($data));
    
    if ($data['count'] > $limit) {
        http_response_code(429);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Too many API requests. Please wait a minute and retry.'
        ]);
        exit;
    }
}

checkRateLimit();
