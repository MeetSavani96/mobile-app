<?php
/**
 * AKV Energy — shared PDO database connection.
 * Supports environment variables, MAMP, and standard Homebrew MySQL.
 */
$dbHost = getenv('DB_HOST') ?: '127.0.0.1';
$dbPort = getenv('DB_PORT') ?: '3306';
$dbName = getenv('DB_NAME') ?: 'akvenergy';
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';

$pdo = null;
$connectionError = null;

// Ports & credentials to try dynamically if default fails
$hosts = [$dbHost, '127.0.0.1', 'localhost'];
$ports = [$dbPort, '3306', '8889'];
$passes = [$dbPass, '', 'root'];

foreach ($hosts as $h) {
    foreach ($ports as $p) {
        foreach ($passes as $pass) {
            try {
                $dsn = "mysql:host={$h};port={$p};dbname={$dbName};charset=utf8mb4";
                $pdo = new PDO($dsn, $dbUser, $pass, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
                break 3;
            } catch (PDOException $e) {
                $connectionError = $e->getMessage();
            }
        }
    }
}

if (!$pdo) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . ($connectionError ?: 'Could not connect to MySQL server.')]);
    exit;
}
