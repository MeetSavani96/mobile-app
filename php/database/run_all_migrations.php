<?php
require_once __DIR__ . '/../api/_db.php';

$migrations = [
    'migration_v2_rbac.sql',
    'migration_v3_erp.sql',
    'migration_v4_documents.sql',
    'migration_v5_settings.sql',
    'migration_v6_solar_specs.sql',
    'migration_v7_complete.sql',
];

echo "Starting database migrations...\n";

foreach ($migrations as $file) {
    $path = __DIR__ . '/' . $file;
    if (!file_exists($path)) {
        echo "Skipping missing migration: {$file}\n";
        continue;
    }
    echo "Running migration: {$file}... ";
    $sql = file_get_contents($path);
    try {
        $pdo->exec($sql);
        echo "SUCCESS!\n";
    } catch (PDOException $e) {
        echo "WARNING: " . $e->getMessage() . "\n";
    }
}

echo "Database migrations complete!\n";
