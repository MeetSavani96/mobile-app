<?php
/**
 * Customer Cleaning Request API
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$user = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);

$cleaningType  = trim($body['cleaning_type'] ?? 'manual');
$plantCapacity = isset($body['plant_capacity']) ? (float)$body['plant_capacity'] : null;
$location      = trim($body['location'] ?? '');
$prefDate      = trim($body['preferred_date'] ?? '') ?: null;
$prefTime      = trim($body['preferred_time'] ?? '') ?: null;
$notes         = trim($body['notes'] ?? '') ?: null;

if (empty($location) || empty($prefDate)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Location and preferred date are required.']);
    exit;
}

// Auto-ensure customer profile exists
$customerId = ensureCustomerProfile($pdo, (int)$user['id']);

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare('
        INSERT INTO cleaning_requests
        (user_id, customer_id, cleaning_type, plant_capacity, location, preferred_date, preferred_time, notes, status)
        VALUES (:uid, :cid, :ctype, :pcap, :loc, :pdate, :ptime, :notes, "pending")
    ');
    $stmt->execute([
        ':uid'   => $user['id'],
        ':cid'   => $customerId > 0 ? $customerId : null,
        ':ctype' => $cleaningType,
        ':pcap'  => $plantCapacity,
        ':loc'   => $location,
        ':pdate' => $prefDate,
        ':ptime' => $prefTime,
        ':notes' => $notes,
    ]);
    $cleaningId = $pdo->lastInsertId();

    // Insert into main enquiries table for Admin sync
    $mainStmt = $pdo->prepare('
        INSERT INTO enquiries 
        (customer_id, user_id, name, phone, email, city, system_size_kw, notes, source, status)
        VALUES (:cid, :uid, :n, :ph, :e, :c, :size, :notes, "cleaning_request", "new")
    ');
    $mainStmt->execute([
        ':cid'   => $customerId > 0 ? $customerId : null,
        ':uid'   => $user['id'],
        ':n'     => $user['name'],
        ':ph'    => $user['phone'] ?: '0000000000',
        ':e'     => $user['email'],
        ':c'     => $user['city'] ?: $location,
        ':size'  => $plantCapacity,
        ':notes' => "Cleaning Request ($cleaningType): " . ($notes ?: 'Service requested'),
    ]);
    $mainEnquiryId = $pdo->lastInsertId();

    $tl = $pdo->prepare('INSERT INTO enquiry_timeline (enquiry_id, actor_name, action, note) VALUES (:eid, "System", "Cleaning Request Submitted", :note)');
    $tl->execute([':eid' => $mainEnquiryId, ':note' => "Cleaning request ($cleaningType) submitted."]);

    // Create booking record
    $bkId = 'BK-' . rand(1000, 9999);
    $bkStmt = $pdo->prepare('
        INSERT INTO bookings (booking_id, user_id, customer_id, service_type, location, preferred_date, preferred_time, notes, status)
        VALUES (:bkid, :uid, :cid, "cleaning", :loc, :pdate, :ptime, :notes, "pending")
    ');
    $bkStmt->execute([
        ':bkid'  => $bkId,
        ':uid'   => $user['id'],
        ':cid'   => $customerId > 0 ? $customerId : null,
        ':loc'   => $location,
        ':pdate' => $prefDate,
        ':ptime' => $prefTime,
        ':notes' => "Cleaning Request ($cleaningType)",
    ]);

    logActivity($user['id'], 'cleaning_requested', 'cleaning_requests', (int)$cleaningId, [
        'type' => $cleaningType,
        'location' => $location
    ]);

    // Admin Notification
    $notifStmt = $pdo->prepare('
        INSERT INTO notifications (user_id, title, body, type, reference_id, reference_type)
        VALUES (NULL, "New Cleaning Service Request", :body, "cleaning", :refid, "cleaning_requests")
    ');
    $notifStmt->execute([
        ':body'  => "Customer {$user['name']} requested $cleaningType cleaning.",
        ':refid' => $cleaningId
    ]);

    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'Cleaning request submitted successfully.']);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to save cleaning request.']);
}
