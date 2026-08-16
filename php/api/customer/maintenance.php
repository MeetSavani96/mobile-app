<?php
/**
 * Customer Maintenance Request API
 * POST: Submit new maintenance request (Requires linked AKV Customer)
 * GET: List customer's maintenance requests
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$user = requireAuth();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    
    // Auto-ensure customer profile exists
    $customerId = ensureCustomerProfile($pdo, (int)$user['id']);

    $issueCategory = trim($body['issue_category'] ?? '');
    $description   = trim($body['description'] ?? '');
    $prefDate      = trim($body['preferred_date'] ?? '') ?: null;
    $prefTime      = trim($body['preferred_time'] ?? '') ?: null;

    if (empty($issueCategory) || empty($description)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Issue category and description are required.']);
        exit;
    }

    $categoryMap = [
        'inverter_fault' => 'inverter_problem',
        'panel_cleaning' => 'cleaning_required',
        'panel_damage'   => 'panel_problem',
        'wiring'         => 'electrical_issue',
    ];
    if (isset($categoryMap[$issueCategory])) {
        $issueCategory = $categoryMap[$issueCategory];
    }
    $validCategories = ['panel_problem','inverter_problem','low_generation','electrical_issue','physical_damage','cleaning_required','monitoring_problem','other'];
    if (!in_array($issueCategory, $validCategories, true)) {
        $issueCategory = 'other';
    }

    $reqId = 'MT-' . rand(1000, 9999);

    $pdo->beginTransaction();
    try {
        // Insert maintenance request
        $stmt = $pdo->prepare('
            INSERT INTO maintenance_requests 
            (request_id, user_id, customer_id, issue_category, description, preferred_date, preferred_time, status) 
            VALUES (:req_id, :uid, :cid, :cat, :desc, :pdate, :ptime, "submitted")
        ');
        $stmt->execute([
            ':req_id' => $reqId,
            ':uid'    => $user['id'],
            ':cid'    => $customerId > 0 ? $customerId : null,
            ':cat'    => $issueCategory,
            ':desc'   => $description,
            ':pdate'  => $prefDate,
            ':ptime'  => $prefTime,
        ]);
        $maintenanceId = $pdo->lastInsertId();

        // Insert into main enquiries table for Admin sync
        $mainStmt = $pdo->prepare('
            INSERT INTO enquiries 
            (customer_id, user_id, name, phone, email, city, notes, source, status)
            VALUES (:cid, :uid, :n, :ph, :e, :c, :notes, "maintenance_request", "new")
        ');
        $mainStmt->execute([
            ':cid'   => $customerId > 0 ? $customerId : null,
            ':uid'   => $user['id'],
            ':n'     => $user['name'],
            ':ph'    => $user['phone'] ?: '0000000000',
            ':e'     => $user['email'],
            ':c'     => $user['city'],
            ':notes' => "Maintenance Request (#$reqId - $issueCategory): $description",
        ]);
        $mainEnquiryId = $pdo->lastInsertId();

        $tl = $pdo->prepare('INSERT INTO enquiry_timeline (enquiry_id, actor_name, action, note) VALUES (:eid, "System", "Maintenance Request Created", :note)');
        $tl->execute([':eid' => $mainEnquiryId, ':note' => "Maintenance request #$reqId ($issueCategory) created."]);

        // Also create a booking entry for tracking
        $bkId = 'BK-' . rand(1000, 9999);
        $bkStmt = $pdo->prepare('
            INSERT INTO bookings (booking_id, user_id, customer_id, service_type, preferred_date, preferred_time, notes, status)
            VALUES (:bkid, :uid, :cid, "maintenance", :pdate, :ptime, :notes, "pending")
        ');
        $bkStmt->execute([
            ':bkid'  => $bkId,
            ':uid'   => $user['id'],
            ':cid'   => $customerId > 0 ? $customerId : null,
            ':pdate' => $prefDate,
            ':ptime' => $prefTime,
            ':notes' => "Maintenance request #$reqId: $issueCategory",
        ]);

        // Insert timeline update
        $upStmt = $pdo->prepare('
            INSERT INTO maintenance_updates (request_id, status, note, updated_by)
            VALUES (:rid, "submitted", "Maintenance request created by customer", :uid)
        ');
        $upStmt->execute([':rid' => $maintenanceId, ':uid' => $user['id']]);

        // Log Activity
        logActivity($user['id'], 'maintenance_requested', 'maintenance_requests', (int)$maintenanceId, [
            'request_id' => $reqId,
            'category'   => $issueCategory
        ]);

        // Create Admin Notification
        $notifStmt = $pdo->prepare('
            INSERT INTO notifications (user_id, title, body, type, reference_id, reference_type)
            VALUES (NULL, "New Maintenance Request", :body, "maintenance", :refid, "maintenance_requests")
        ');
        $notifStmt->execute([
            ':body'  => "Customer {$user['name']} requested maintenance for: $issueCategory",
            ':refid' => $maintenanceId
        ]);

        $pdo->commit();

        echo json_encode([
            'success'    => true,
            'message'    => 'Maintenance request submitted successfully.',
            'request_id' => $reqId
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save maintenance request: ' . $e->getMessage()]);
    }
    exit;
}

// GET: Return customer's requests
$stmt = $pdo->prepare('
    SELECT * FROM maintenance_requests 
    WHERE user_id = :uid 
    ORDER BY created_at DESC
');
$stmt->execute([':uid' => $user['id']]);
$requests = $stmt->fetchAll();

echo json_encode(['success' => true, 'requests' => $requests]);
