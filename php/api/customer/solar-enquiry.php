<?php
/**
 * Customer Solar Enquiry Submission API
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

$category = trim($body['category'] ?? 'residential');
$location = trim($body['location'] ?? '');
$propertyType = trim($body['property_type'] ?? '') ?: null;
$monthlyBill  = isset($body['monthly_bill']) ? (float)$body['monthly_bill'] : null;
$reqCapacity  = isset($body['required_capacity']) ? (float)$body['required_capacity'] : null;
$roofType     = trim($body['roof_type'] ?? '') ?: null;
$roofArea     = isset($body['roof_area']) ? (float)$body['roof_area'] : null;
$elecDetails  = trim($body['electricity_details'] ?? '') ?: null;
$prefDate     = trim($body['preferred_date'] ?? '') ?: null;
$notes        = trim($body['additional_notes'] ?? '') ?: null;

if (empty($location)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Location is required.']);
    exit;
}

// Auto-ensure customer profile exists
$customerId = ensureCustomerProfile($pdo, (int)$user['id']);

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare('
        INSERT INTO solar_enquiries 
        (user_id, category, location, property_type, monthly_bill, required_capacity, roof_type, roof_area, electricity_details, preferred_date, additional_notes, status)
        VALUES (:uid, :cat, :loc, :ptype, :mbill, :rcap, :rtype, :rarea, :edet, :pdate, :notes, "pending")
    ');
    $stmt->execute([
        ':uid'   => $user['id'],
        ':cat'   => $category,
        ':loc'   => $location,
        ':ptype' => $propertyType,
        ':mbill' => $monthlyBill,
        ':rcap'  => $reqCapacity,
        ':rtype' => $roofType,
        ':rarea' => $roofArea,
        ':edet'  => $elecDetails,
        ':pdate' => $prefDate,
        ':notes' => $notes,
    ]);
    $enquiryId = $pdo->lastInsertId();

    // Insert into main enquiries table for Admin sync
    $mainStmt = $pdo->prepare('
        INSERT INTO enquiries 
        (customer_id, user_id, name, phone, email, city, system_size_kw, roof_space, notes, source, status)
        VALUES (:cid, :uid, :n, :ph, :e, :c, :size, :space, :notes, "app", "new")
    ');
    $mainStmt->execute([
        ':cid'   => $customerId > 0 ? $customerId : null,
        ':uid'   => $user['id'],
        ':n'     => $user['name'],
        ':ph'    => $user['phone'] ?: '0000000000',
        ':e'     => $user['email'],
        ':c'     => $user['city'] ?: $location,
        ':size'  => $reqCapacity,
        ':space' => $roofArea,
        ':notes' => "Solar Enquiry ($category): " . ($notes ?: 'Quote requested'),
    ]);
    $mainEnquiryId = $pdo->lastInsertId();

    $tl = $pdo->prepare('INSERT INTO enquiry_timeline (enquiry_id, actor_name, action, note) VALUES (:eid, "System", "Enquiry Submitted", :note)');
    $tl->execute([':eid' => $mainEnquiryId, ':note' => "New solar enquiry ($category) submitted."]);

    // Create booking record
    $bkId = 'BK-' . rand(1000, 9999);
    $bkStmt = $pdo->prepare('
        INSERT INTO bookings (booking_id, user_id, customer_id, service_type, location, preferred_date, notes, status)
        VALUES (:bkid, :uid, :cid, "new_solar", :loc, :pdate, :notes, "pending")
    ');
    $bkStmt->execute([
        ':bkid'  => $bkId,
        ':uid'   => $user['id'],
        ':cid'   => $customerId > 0 ? $customerId : null,
        ':loc'   => $location,
        ':pdate' => $prefDate,
        ':notes' => "New Solar Enquiry ($category) - " . ($reqCapacity ? "$reqCapacity kW" : 'Quote requested'),
    ]);

    logActivity($user['id'], 'solar_enquiry_created', 'solar_enquiries', (int)$enquiryId, [
        'category' => $category,
        'location' => $location
    ]);

    // Admin notification
    $notifStmt = $pdo->prepare('
        INSERT INTO notifications (user_id, title, body, type, reference_id, reference_type)
        VALUES (NULL, "New Solar Enquiry", :body, "enquiry", :refid, "solar_enquiries")
    ');
    $notifStmt->execute([
        ':body'  => "Customer {$user['name']} requested a new $category solar installation quote.",
        ':refid' => $enquiryId
    ]);

    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'Solar enquiry submitted successfully.']);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to save enquiry.']);
}
