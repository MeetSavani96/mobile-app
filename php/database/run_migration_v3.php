<?php
/**
 * Run migration v3 erp SQL against PDO database connection.
 */
require_once __DIR__ . '/../api/_db.php';

$sqlFile = __DIR__ . '/migration_v3_erp.sql';
if (!file_exists($sqlFile)) {
    echo "SQL Migration file not found!\n";
    exit(1);
}

$sql = file_get_contents($sqlFile);

try {
    // Enable error reporting and execute multi-query block
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec($sql);
    echo "SUCCESS: ERP tables (migration v3) imported successfully.\n";
} catch (PDOException $e) {
    echo "ERROR executing migration: " . $e->getMessage() . "\n";
    exit(1);
}
