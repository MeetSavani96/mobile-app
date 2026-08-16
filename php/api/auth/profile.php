<?php
/**
 * User Profile & Solar Settings Configuration API.
 * Requires: authenticated user (admin or customer).
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET Profile ──────────────────────────────────────────────────────────
if ($method === 'GET') {
    try {
        if ($user['role'] === 'admin') {
            // Admin only reads users record
            echo json_encode([
                'success' => true,
                'data' => [
                    'id' => (int)$user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                ]
            ]);
        } else {
            // Customer reads users joined with customers details
            $stmt = $pdo->prepare('
                SELECT u.id AS user_id, u.name, u.email, u.phone, 
                       c.id AS customer_id, c.address, c.monthly_units, c.property_type,
                       c.roof_type, c.roof_area, c.system_type, c.panel_count, c.panel_brand,
                       c.inverter_brand, c.inverter_capacity_kw, c.battery_capacity_kwh,
                       c.install_date, c.panel_orientation, c.panel_tilt_angle,
                       c.electricity_provider, c.consumer_number, c.latitude, c.longitude,
                       c.state, c.city, c.pincode, c.installation_cost, c.monthly_bill,
                       c.tariff_rate, c.purchase_type, c.subsidy_status
                  FROM users u
                  LEFT JOIN customers c ON c.user_id = u.id
                 WHERE u.id = :id
                 LIMIT 1
            ');
            $stmt->execute([':id' => $user['id']]);
            $row = $stmt->fetch();

            if (!$row) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Profile details not found.']);
                exit;
            }

            // Clean numerical fields
            $row['user_id'] = (int)$row['user_id'];
            $row['customer_id'] = $row['customer_id'] !== null ? (int)$row['customer_id'] : null;
            $row['system_size_kw'] = $row['customer_id'] !== null ? (float)$pdo->query("SELECT system_size_kw FROM enquiries WHERE customer_id = {$row['customer_id']} AND status = 'completed' LIMIT 1")->fetchColumn() : null; 
            if (!$row['system_size_kw'] && $row['customer_id'] !== null) {
                // Check if user set system size directly on solar settings
                $stmt2 = $pdo->prepare('SELECT system_size_kw FROM enquiries WHERE customer_id = :cid ORDER BY id DESC LIMIT 1');
                $stmt2->execute([':cid' => $row['customer_id']]);
                $row['system_size_kw'] = (float)$stmt2->fetchColumn() ?: 0.0;
            }
            $row['panel_count'] = $row['panel_count'] !== null ? (int)$row['panel_count'] : null;
            $row['inverter_capacity_kw'] = $row['inverter_capacity_kw'] !== null ? (float)$row['inverter_capacity_kw'] : null;
            $row['battery_capacity_kwh'] = $row['battery_capacity_kwh'] !== null ? (float)$row['battery_capacity_kwh'] : null;
            $row['panel_tilt_angle'] = $row['panel_tilt_angle'] !== null ? (float)$row['panel_tilt_angle'] : null;
            $row['latitude'] = $row['latitude'] !== null ? (float)$row['latitude'] : null;
            $row['longitude'] = $row['longitude'] !== null ? (float)$row['longitude'] : null;
            $row['installation_cost'] = $row['installation_cost'] !== null ? (float)$row['installation_cost'] : null;
            $row['monthly_bill'] = $row['monthly_bill'] !== null ? (float)$row['monthly_bill'] : null;
            $row['tariff_rate'] = $row['tariff_rate'] !== null ? (float)$row['tariff_rate'] : null;

            echo json_encode(['success' => true, 'data' => $row]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to retrieve profile details.']);
    }
    exit;
}

// ── POST Save Profile / Save Solar Settings ──────────────────────────────
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    if ($user['role'] === 'admin') {
        // Admin Profile Settings Update
        $name = trim($body['name'] ?? '');
        $email = trim($body['email'] ?? '');

        if ($name === '' || $email === '') {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Name and email are required.']);
            exit;
        }

        try {
            $upd = $pdo->prepare('UPDATE users SET name = :n, email = :e WHERE id = :id');
            $upd->execute([':n' => $name, ':e' => $email, ':id' => $user['id']]);

            echo json_encode(['success' => true, 'message' => 'Admin profile updated successfully.', 'data' => [
                'id' => (int)$user['id'],
                'name' => $name,
                'email' => $email,
                'role' => 'admin'
            ]]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to save admin profile.']);
        }
        exit;
    } else {
        // Customer Solar Settings update
        // We will ensure a customer record exists matching this user
        try {
            $stmt = $pdo->prepare('SELECT id FROM customers WHERE user_id = :uid LIMIT 1');
            $stmt->execute([':uid' => $user['id']]);
            $customerId = $stmt->fetchColumn();

            if (!$customerId) {
                // Auto create customer record for this user if missing
                $ins = $pdo->prepare('INSERT INTO customers (user_id, full_name, phone, email) VALUES (:uid, :n, :ph, :e)');
                $ins->execute([
                    ':uid' => $user['id'],
                    ':n' => $user['name'],
                    ':ph' => $body['phone'] ?? $user['phone'] ?? '',
                    ':e' => $user['email']
                ]);
                $customerId = $pdo->lastInsertId();
            }

            // Update user record first
            if (isset($body['phone'])) {
                $updUser = $pdo->prepare('UPDATE users SET phone = :ph WHERE id = :id');
                $updUser->execute([':ph' => trim($body['phone']), ':id' => $user['id']]);
            }

            // Update customers table setup fields
            $upd = $pdo->prepare('
                UPDATE customers SET
                    address = :address,
                    monthly_units = :monthly_units,
                    system_type = :system_type,
                    panel_count = :panel_count,
                    panel_brand = :panel_brand,
                    inverter_brand = :inverter_brand,
                    inverter_capacity_kw = :inverter_capacity_kw,
                    battery_capacity_kwh = :battery_capacity_kwh,
                    install_date = :install_date,
                    panel_orientation = :panel_orientation,
                    panel_tilt_angle = :panel_tilt_angle,
                    electricity_provider = :electricity_provider,
                    consumer_number = :consumer_number,
                    latitude = :latitude,
                    longitude = :longitude,
                    state = :state,
                    city = :city,
                    pincode = :pincode,
                    installation_cost = :installation_cost,
                    monthly_bill = :monthly_bill,
                    tariff_rate = :tariff_rate,
                    purchase_type = :purchase_type,
                    subsidy_status = :subsidy_status,
                    phone = :phone
                WHERE id = :cid
            ');

            $upd->execute([
                ':cid'                  => $customerId,
                ':address'              => trim($body['address'] ?? '') ?: null,
                ':monthly_units'        => isset($body['monthly_bill']) ? (float)($body['monthly_bill'] / 8.0) : null, // estimated units if not set
                ':system_type'          => trim($body['system_type'] ?? 'on_grid'),
                ':panel_count'          => isset($body['panel_count']) ? (int)$body['panel_count'] : null,
                ':panel_brand'          => trim($body['panel_brand'] ?? '') ?: null,
                ':inverter_brand'       => trim($body['inverter_brand'] ?? '') ?: null,
                ':inverter_capacity_kw' => isset($body['inverter_capacity_kw']) ? (float)$body['inverter_capacity_kw'] : null,
                ':battery_capacity_kwh' => isset($body['battery_capacity_kwh']) ? (float)$body['battery_capacity_kwh'] : null,
                ':install_date'         => trim($body['install_date'] ?? '') ?: null,
                ':panel_orientation'    => trim($body['panel_orientation'] ?? 'South'),
                ':panel_tilt_angle'     => isset($body['panel_tilt_angle']) ? (float)$body['panel_tilt_angle'] : null,
                ':electricity_provider' => trim($body['electricity_provider'] ?? '') ?: null,
                ':consumer_number'      => trim($body['consumer_number'] ?? '') ?: null,
                ':latitude'             => isset($body['latitude']) ? (float)$body['latitude'] : null,
                ':longitude'            => isset($body['longitude']) ? (float)$body['longitude'] : null,
                ':state'                => trim($body['state'] ?? 'Gujarat'),
                ':city'                 => trim($body['city'] ?? '') ?: null,
                ':pincode'              => trim($body['pincode'] ?? '') ?: null,
                ':installation_cost'    => isset($body['installation_cost']) ? (float)$body['installation_cost'] : null,
                ':monthly_bill'         => isset($body['monthly_bill']) ? (float)$body['monthly_bill'] : null,
                ':tariff_rate'          => isset($body['tariff_rate']) ? (float)$body['tariff_rate'] : null,
                ':purchase_type'        => trim($body['purchase_type'] ?? 'cash'),
                ':subsidy_status'       => trim($body['subsidy_status'] ?? 'pending'),
                ':phone'                => trim($body['phone'] ?? '') ?: '',
            ]);

            // Re-fetch and return the complete updated profile info
            $stmt = $pdo->prepare('
                SELECT u.id AS user_id, u.name, u.email, u.phone, 
                       c.id AS customer_id, c.address, c.monthly_units, c.property_type,
                       c.roof_type, c.roof_area, c.system_type, c.panel_count, c.panel_brand,
                       c.inverter_brand, c.inverter_capacity_kw, c.battery_capacity_kwh,
                       c.install_date, c.panel_orientation, c.panel_tilt_angle,
                       c.electricity_provider, c.consumer_number, c.latitude, c.longitude,
                       c.state, c.city, c.pincode, c.installation_cost, c.monthly_bill,
                       c.tariff_rate, c.purchase_type, c.subsidy_status
                  FROM users u
                  LEFT JOIN customers c ON c.user_id = u.id
                 WHERE u.id = :id
                 LIMIT 1
            ');
            $stmt->execute([':id' => $user['id']]);
            $updated = $stmt->fetch();
            $updated['user_id'] = (int)$updated['user_id'];
            $updated['customer_id'] = (int)$updated['customer_id'];
            $updated['system_size_kw'] = isset($body['system_size_kw']) ? (float)$body['system_size_kw'] : 0.0;

            echo json_encode(['success' => true, 'message' => 'Solar specs saved successfully.', 'data' => $updated]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to save solar specs.']);
        }
        exit;
    }
}

// ── PUT Change Password ──────────────────────────────────────────────────
if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $currentPass = trim($body['current_password'] ?? '');
    $newPass     = trim($body['new_password'] ?? '');

    if ($currentPass === '' || $newPass === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Current and new password are required.']);
        exit;
    }

    if (strlen($newPass) < 6) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'New password must be at least 6 characters.']);
        exit;
    }

    try {
        // Fetch user password hash
        $stmt = $pdo->prepare('SELECT password FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $user['id']]);
        $hash = $stmt->fetchColumn();

        if (!$hash || !password_verify($currentPass, $hash)) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid current password.']);
            exit;
        }

        // Write new password
        $newHash = password_hash($newPass, PASSWORD_BCRYPT, ['cost' => 12]);
        $upd = $pdo->prepare('UPDATE users SET password = :p WHERE id = :id');
        $upd->execute([':p' => $newHash, ':id' => $user['id']]);

        logActivity((int)$user['id'], 'change_password', 'user', (int)$user['id']);
        echo json_encode(['success' => true, 'message' => 'Password updated successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update password.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
