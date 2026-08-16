<?php
/**
 * Admin Inverter Management API
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$admin = requireRole('admin');
$action = $_GET['action'] ?? '';

if ($action === 'add_inverter') {
    $body = json_decode(file_get_contents('php://input'), true);

    $customerId   = (int)($body['customer_id'] ?? 0);
    $inverterId   = trim($body['inverter_id'] ?? '');
    $serialNumber = trim($body['serial_number'] ?? '') ?: null;
    $manufacturer = trim($body['manufacturer'] ?? '') ?: null;
    $model        = trim($body['model'] ?? '') ?: null;
    $capacity     = isset($body['capacity_kw']) ? (float)$body['capacity_kw'] : null;
    $installDate  = trim($body['installation_date'] ?? '') ?: null;
    $apiDeviceId  = trim($body['api_device_id'] ?? '') ?: null;

    if ($customerId <= 0 || empty($inverterId)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Customer ID and Inverter ID are required.']);
        exit;
    }

    $stmt = $pdo->prepare('
        INSERT INTO inverters 
        (customer_id, inverter_id, serial_number, manufacturer, model, capacity_kw, installation_date, communication_status, api_device_id, status)
        VALUES (:cid, :iid, :sn, :mfr, :model, :cap, :idate, "online", :apid, "active")
        ON DUPLICATE KEY UPDATE 
        serial_number=VALUES(serial_number), manufacturer=VALUES(manufacturer), model=VALUES(model), capacity_kw=VALUES(capacity_kw), status="active"
    ');
    $stmt->execute([
        ':cid'   => $customerId,
        ':iid'   => $inverterId,
        ':sn'    => $serialNumber,
        ':mfr'   => $manufacturer,
        ':model' => $model,
        ':cap'   => $capacity,
        ':idate' => $installDate,
        ':apid'  => $apiDeviceId,
    ]);
    $invDbId = $pdo->lastInsertId();

    // Insert sample initial reading
    $readStmt = $pdo->prepare('
        INSERT INTO inverter_readings (inverter_id, current_power_w, today_kwh, month_kwh, total_kwh, grid_power_w, solar_power_w, consumption_w, co2_saved_kg)
        VALUES (:iid, 3800, 18.5, 450, 1250, 500, 4300, 3800, 1020)
    ');
    $readStmt->execute([':iid' => $invDbId ?: $customerId]);

    logActivity($admin['id'], 'inverter_connected', 'inverters', (int)$invDbId, [
        'inverter_id' => $inverterId,
        'customer_id' => $customerId
    ]);

    echo json_encode(['success' => true, 'message' => 'Inverter connected successfully.']);
    exit;
}

if ($action === 'list_inverters') {
    $stmt = $pdo->query('
        SELECT i.*, c.full_name as customer_name 
        FROM inverters i 
        JOIN customers c ON i.customer_id = c.id 
        ORDER BY i.created_at DESC
    ');
    echo json_encode(['success' => true, 'inverters' => $stmt->fetchAll()]);
    exit;
}
