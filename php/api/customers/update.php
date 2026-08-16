<?php
/**
 * PUT or POST /api/customers/update.php
 * Updates an existing customer profile and syncs linked user records.
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

requireRole('admin');

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'PUT' && $method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON body.']);
    exit;
}

$id       = (int)($body['id'] ?? 0);
$fullName = trim($body['full_name'] ?? '');
$phone    = trim($body['phone'] ?? '');

if ($id <= 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'A valid customer ID is required.']);
    exit;
}
if ($fullName === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Full name is required.']);
    exit;
}
if ($phone === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Phone number is required.']);
    exit;
}

$email        = trim($body['email'] ?? '') ?: null;
$address      = trim($body['address'] ?? '') ?: null;
$city         = trim($body['city'] ?? '') ?: null;
$state        = trim($body['state'] ?? '') ?: null;
$pincode      = trim($body['pincode'] ?? '') ?: null;
$monthlyUnits = isset($body['monthly_units']) ? (float)$body['monthly_units'] : null;
$propertyType = trim($body['property_type'] ?? '') ?: null;
$roofType     = trim($body['roof_type'] ?? '') ?: null;
$roofArea     = isset($body['roof_area']) ? (float)$body['roof_area'] : null;
$systemType   = trim($body['system_type'] ?? '') ?: null;

if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
    exit;
}

try {
    // Check if customer exists first
    $checkStmt = $pdo->prepare('SELECT id, user_id FROM customers WHERE id = :id LIMIT 1');
    $checkStmt->execute([':id' => $id]);
    $existing = $checkStmt->fetch();

    if (!$existing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Customer record not found.']);
        exit;
    }

    $stmt = $pdo->prepare('
        UPDATE customers SET
            full_name = :full_name,
            phone = :phone,
            email = :email,
            address = :address,
            city = :city,
            state = :state,
            pincode = :pincode,
            monthly_units = :monthly_units,
            property_type = :property_type,
            roof_type = :roof_type,
            roof_area = :roof_area,
            system_type = :system_type,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
    ');
    $stmt->execute([
        ':id'            => $id,
        ':full_name'     => $fullName,
        ':phone'         => $phone,
        ':email'         => $email,
        ':address'       => $address,
        ':city'          => $city,
        ':state'         => $state,
        ':pincode'       => $pincode,
        ':monthly_units' => $monthlyUnits,
        ':property_type' => $propertyType,
        ':roof_type'     => $roofType,
        ':roof_area'     => $roofArea,
        ':system_type'   => $systemType,
    ]);

    // Sync updated customer information to linked user record if user_id is linked
    if (!empty($existing['user_id'])) {
        $uSync = $pdo->prepare('
            UPDATE users SET
                name = COALESCE(:n, name),
                phone = COALESCE(:ph, phone),
                email = COALESCE(:e, email),
                address = COALESCE(:addr, address),
                city = COALESCE(:c, city)
             WHERE id = :uid
        ');
        $uSync->execute([
            ':n'    => $fullName,
            ':ph'   => $phone,
            ':e'    => $email,
            ':addr' => $address,
            ':c'    => $city,
            ':uid'  => (int)$existing['user_id'],
        ]);
    }

    echo json_encode(['success' => true, 'message' => 'Customer updated successfully.']);
} catch (PDOException $e) {
    error_log("Customer update error for ID {$id}: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to update customer.']);
}
