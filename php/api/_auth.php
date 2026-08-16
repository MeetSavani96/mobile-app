<?php
/**
 * AKV Energy — Authentication + Role Middleware
 *
 * Usage:
 *   require_once __DIR__ . '/../_auth.php';
 *   $authUser = requireAuth();           // any authenticated user
 *   $authUser = requireRole('admin');    // admin only
 *   $authUser = requireRole('customer'); // customer only
 *
 * Token format: Bearer <64-char hex random token>
 * Token is stored hashed (SHA-256) in auth_tokens table.
 */

if (!isset($pdo)) {
    require_once __DIR__ . '/_db.php';
}

/**
 * Extract the raw Bearer token from the Authorization header.
 * Falls back to X-Auth-Token header for Capacitor environments.
 */
function getBearerToken(): ?string {
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? $_SERVER['HTTP_X_AUTH_TOKEN']
        ?? $_GET['token']
        ?? $_POST['token']
        ?? '';

    if (!$header && function_exists('getallheaders')) {
        $headers = getallheaders();
        $header = $headers['Authorization']
            ?? $headers['authorization']
            ?? $headers['X-Auth-Token']
            ?? $headers['x-auth-token']
            ?? $headers['Token']
            ?? $headers['token']
            ?? '';
    }

    if (!$header) {
        $rawInput = file_get_contents('php://input');
        if ($rawInput) {
            $json = json_decode($rawInput, true);
            if (is_array($json)) {
                $header = $json['token'] ?? $json['auth_token'] ?? '';
            }
        }
    }

    $header = trim((string)$header);
    if (stripos($header, 'Bearer ') === 0) {
        return trim(substr($header, 7));
    }
    if (substr_count($header, '.') === 2) {
        return $header;
    }
    return $header !== '' ? $header : null;
}

/**
 * Validate token and return the user row, or send 401 and exit.
 */
function requireAuth(): array {
    global $pdo;

    $raw = getBearerToken();
    if (!$raw) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required.']);
        exit;
    }

    require_once __DIR__ . '/auth/jwt_helper.php';
    $payload = JWTHelper::verify($raw);

    if (!$payload || !isset($payload['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Session expired. Please log in again.']);
        exit;
    }

    $stmt = $pdo->prepare('
        SELECT id, name, email, phone, city, address, role, is_active
          FROM users
         WHERE id = :id
         LIMIT 1
    ');
    $stmt->execute([':id' => $payload['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'User not found.']);
        exit;
    }

    if (!(int)$user['is_active']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Your account has been deactivated.']);
        exit;
    }

    return $user;
}

/**
 * Require a specific role. Calls requireAuth() first, then checks role.
 */
function requireRole(string $role): array {
    $user = requireAuth();
    if ($user['role'] !== $role) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access denied. Insufficient permissions.']);
        exit;
    }
    return $user;
}

/**
 * Log an admin/user action to activity_logs (best-effort, never fatal).
 */
function logActivity(int $userId, string $action, ?string $entity = null, ?int $entityId = null, ?array $meta = null): void {
    global $pdo;
    try {
        $stmt = $pdo->prepare('
            INSERT INTO activity_logs (user_id, action, entity, entity_id, meta, ip)
            VALUES (:uid, :action, :entity, :eid, :meta, :ip)
        ');
        $stmt->execute([
            ':uid'    => $userId,
            ':action' => $action,
            ':entity' => $entity,
            ':eid'    => $entityId,
            ':meta'   => $meta ? json_encode($meta) : null,
            ':ip'     => $_SERVER['REMOTE_ADDR'] ?? null,
        ]);
    } catch (PDOException $e) {
        // Non-fatal
    }
}

/**
 * Ensure every registered user with role = 'customer' has a corresponding
 * record in `customers` table and an active link in `customer_user_links`.
 * Returns the customer_id.
 */
function ensureCustomerProfile(PDO $pdo, int $userId): int {
    $uStmt = $pdo->prepare('SELECT id, name, email, phone, city, address, role FROM users WHERE id = :uid LIMIT 1');
    $uStmt->execute([':uid' => $userId]);
    $u = $uStmt->fetch();
    if (!$u || $u['role'] !== 'customer') return 0;

    // Check if customer record exists for user_id
    $cStmt = $pdo->prepare('SELECT id FROM customers WHERE user_id = :uid LIMIT 1');
    $cStmt->execute([':uid' => $userId]);
    $custId = (int)($cStmt->fetchColumn() ?: 0);

    if ($custId <= 0) {
        // Try matching by email or phone if user_id is unlinked
        $matchStmt = $pdo->prepare('
            SELECT id FROM customers
             WHERE (user_id IS NULL OR user_id = 0)
               AND ((email IS NOT NULL AND email != "" AND email = :em)
                 OR (phone IS NOT NULL AND phone != "" AND phone = :ph))
             LIMIT 1
        ');
        $matchStmt->execute([':em' => $u['email'] ?? '', ':ph' => $u['phone'] ?? '']);
        $matchedId = (int)($matchStmt->fetchColumn() ?: 0);

        if ($matchedId > 0) {
            $custId = $matchedId;
            $up = $pdo->prepare('UPDATE customers SET user_id = :uid, full_name = COALESCE(full_name, :n), phone = COALESCE(phone, :ph), email = COALESCE(email, :e) WHERE id = :cid');
            $up->execute([':uid' => $userId, ':n' => $u['name'], ':ph' => $u['phone'], ':e' => $u['email'], ':cid' => $custId]);
        } else {
            $ins = $pdo->prepare('
                INSERT INTO customers (user_id, full_name, phone, email, address, city)
                VALUES (:uid, :n, :ph, :e, :addr, :c)
            ');
            $ins->execute([
                ':uid'  => $userId,
                ':n'    => $u['name'],
                ':ph'   => $u['phone'] ?: '0000000000',
                ':e'    => $u['email'],
                ':addr' => $u['address'],
                ':c'    => $u['city'],
            ]);
            $custId = (int)$pdo->lastInsertId();
        }
    }

    $linkStmt = $pdo->prepare('
        INSERT INTO customer_user_links (user_id, customer_id, status)
        VALUES (:uid, :cid, "active")
        ON DUPLICATE KEY UPDATE customer_id = VALUES(customer_id), status = "active"
    ');
    $linkStmt->execute([':uid' => $userId, ':cid' => $custId]);

    $upUser = $pdo->prepare('UPDATE users SET status = "akv_customer" WHERE id = :uid');
    $upUser->execute([':uid' => $userId]);

    return $custId;
}

/**
 * Backfill & sync all registered customer users to customers table
 */
function syncAllCustomerProfiles(PDO $pdo): void {
    try {
        $users = $pdo->query('SELECT id FROM users WHERE role = "customer"')->fetchAll();
        foreach ($users as $u) {
            ensureCustomerProfile($pdo, (int)$u['id']);
        }
    } catch (Exception $e) {
        // Best effort
    }
}

