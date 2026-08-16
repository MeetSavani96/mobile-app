<?php
/**
 * POST /api/customers/create.php
 *
 * Body (JSON):
 *   full_name*  phone*  email  address  city  state  pincode  monthly_units
 *   property_type  roof_type  roof_area  system_type
 *
 * Success response:
 *   {"success":true,"message":"Customer created successfully.","customer_id":15}
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

// ── Required fields ───────────────────────────────────────────────────────
$fullName = trim($body['full_name'] ?? '');
$phone    = trim($body['phone']     ?? '');

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

// ── Optional fields ───────────────────────────────────────────────────────
$email        = trim($body['email']         ?? '') ?: null;
$address      = trim($body['address']       ?? '') ?: null;
$city         = trim($body['city']          ?? '') ?: null;
$state        = trim($body['state']         ?? '') ?: null;
$pincode      = trim($body['pincode']       ?? '') ?: null;
$monthlyUnits = isset($body['monthly_units'])  ? (float)$body['monthly_units']  : null;
$propertyType = trim($body['property_type'] ?? '') ?: null;
$roofType     = trim($body['roof_type']     ?? '') ?: null;
$roofArea     = isset($body['roof_area'])    ? (float)$body['roof_area']    : null;
$systemType   = trim($body['system_type']   ?? '') ?: null;

if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
    exit;
}

// ── Insert ────────────────────────────────────────────────────────────────
try {
    $stmt = $pdo->prepare('
        INSERT INTO customers
            (full_name, phone, email, address, city, state, pincode, monthly_units,
             property_type, roof_type, roof_area, system_type)
        VALUES
            (:full_name, :phone, :email, :address, :city, :state, :pincode, :monthly_units,
             :property_type, :roof_type, :roof_area, :system_type)
    ');
    $stmt->execute([
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
    http_response_code(201);
    echo json_encode([
        'success'     => true,
        'message'     => 'Customer created successfully.',
        'customer_id' => (int)$pdo->lastInsertId(),
    ]);
} catch (PDOException $e) {
    error_log("Customer create error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to create customer.']);
}
