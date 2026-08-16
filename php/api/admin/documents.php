<?php
/**
 * Document Management API
 *
 * Handles upload, list, detail, verify, reject, download, and delete for
 * customer and admin document workflows.
 *
 * File storage: /uploads/{type}/{unique_name}
 * Never stores binary data in MySQL.
 *
 * Supported MIME types: PDF, JPG, JPEG, PNG, WEBP (max 20 MB)
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

// ── CONSTANTS ─────────────────────────────────────────────────────────────
define('DOC_MAX_BYTES', 20 * 1024 * 1024); // 20 MB
define('ALLOWED_MIMES', [
    'application/pdf' => 'pdf',
    'image/jpeg'      => 'jpg',
    'image/jpg'       => 'jpg',
    'image/png'       => 'png',
    'image/webp'      => 'webp',
]);
define('VALID_DOC_TYPES', [
    'aadhaar', 'pan', 'electricity_bill', 'property_docs',
    'roof_images', 'site_survey', 'installation_photos',
    'customer_signature', 'quotation', 'invoice', 'payment_receipt',
    'warranty_certificate', 'net_meter_certificate', 'completion_certificate',
]);

// Base uploads directory — two levels above php/api/admin/ → project root /uploads/
define('UPLOAD_BASE', dirname(__DIR__, 2) . '/uploads');

/**
 * Resolve the logged-in customer's customers.id (or null for admins).
 */
function resolveCustomerId(PDO $pdo, int $userId): ?int {
    $s = $pdo->prepare('SELECT id FROM customers WHERE user_id = :uid LIMIT 1');
    $s->execute([':uid' => $userId]);
    $r = $s->fetchColumn();
    return $r !== false ? (int)$r : null;
}

/**
 * Build the WHERE clause and param map based on the authenticated user.
 * Admins see all; customers see only their own rows.
 */
function buildOwnerFilter(array $user, PDO $pdo): array {
    if ($user['role'] === 'admin') {
        return ['where' => '1=1', 'params' => []];
    }
    $custId = resolveCustomerId($pdo, (int)$user['id']);
    if (!$custId) {
        return ['where' => '0=1', 'params' => []]; // no customer record → empty result
    }
    return ['where' => 'd.customer_id = :own_cid', 'params' => [':own_cid' => $custId]];
}

// ── GET ───────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    // Single document detail
    if ($id > 0) {
        $ownerF = buildOwnerFilter($user, $pdo);
        $stmt = $pdo->prepare("
            SELECT d.*, c.full_name AS customer_name,
                   u.name AS uploader_name, v.name AS verifier_name
              FROM documents d
              JOIN customers c ON c.id = d.customer_id
              LEFT JOIN users u ON u.id = d.uploaded_by
              LEFT JOIN users v ON v.id = d.verified_by
             WHERE d.id = :id AND ({$ownerF['where']})
             LIMIT 1
        ");
        $stmt->execute(array_merge([':id' => $id], $ownerF['params']));
        $doc = $stmt->fetch();

        if (!$doc) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Document not found or access denied.']);
            exit;
        }
        echo json_encode(['success' => true, 'data' => $doc]);
        exit;
    }

    // List with optional filters
    $ownerF   = buildOwnerFilter($user, $pdo);
    $docType  = trim($_GET['doc_type'] ?? '');
    $status   = trim($_GET['status'] ?? '');
    $custId   = isset($_GET['customer_id']) ? (int)$_GET['customer_id'] : 0;
    $search   = trim($_GET['search'] ?? '');

    $where  = [$ownerF['where']];
    $params = $ownerF['params'];

    if ($docType && in_array($docType, VALID_DOC_TYPES, true)) {
        $where[] = 'd.doc_type = :dt';
        $params[':dt'] = $docType;
    }
    if ($status) {
        $where[] = 'd.status = :st';
        $params[':st'] = $status;
    }
    if ($custId > 0 && $user['role'] === 'admin') {
        $where[] = 'd.customer_id = :cid';
        $params[':cid'] = $custId;
    }
    if ($search) {
        $where[] = '(c.full_name LIKE :s OR d.file_name LIKE :s OR d.doc_type LIKE :s)';
        $params[':s'] = "%{$search}%";
    }

    $whereStr = implode(' AND ', $where);
    $stmt = $pdo->prepare("
        SELECT d.id, d.customer_id, d.doc_type, d.file_name, d.file_url,
               d.status, d.uploaded_at, d.verified_at, d.notes,
               c.full_name AS customer_name
          FROM documents d
          JOIN customers c ON c.id = d.customer_id
         WHERE {$whereStr}
         ORDER BY d.id DESC
    ");
    $stmt->execute($params);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    exit;
}

// ── POST – Upload or action (verify/reject) ───────────────────────────────
if ($method === 'POST') {
    $action = trim($_GET['action'] ?? '');

    // ── VERIFY ──
    if ($action === 'verify_document') {
        $admin = requireRole('admin');
        $body  = json_decode(file_get_contents('php://input'), true) ?? [];
        $id    = (int)($body['id'] ?? 0);
        $notes = trim($body['notes'] ?? '') ?: null;

        if (!$id) { http_response_code(422); echo json_encode(['success' => false, 'message' => 'Document ID required.']); exit; }

        $stmt = $pdo->prepare('UPDATE documents SET status = "verified", verified_by = :vid, verified_at = NOW(), notes = :notes WHERE id = :id');
        $stmt->execute([':vid' => (int)$admin['id'], ':notes' => $notes, ':id' => $id]);
        logActivity((int)$admin['id'], 'verify_document', 'document', $id);
        echo json_encode(['success' => true, 'message' => 'Document verified successfully.']);
        exit;
    }

    // ── REJECT ──
    if ($action === 'reject_document') {
        $admin = requireRole('admin');
        $body  = json_decode(file_get_contents('php://input'), true) ?? [];
        $id    = (int)($body['id'] ?? 0);
        $notes = trim($body['notes'] ?? '') ?: null;

        if (!$id) { http_response_code(422); echo json_encode(['success' => false, 'message' => 'Document ID required.']); exit; }

        $stmt = $pdo->prepare('UPDATE documents SET status = "rejected", verified_by = :vid, verified_at = NOW(), notes = :notes WHERE id = :id');
        $stmt->execute([':vid' => (int)$admin['id'], ':notes' => $notes, ':id' => $id]);
        logActivity((int)$admin['id'], 'reject_document', 'document', $id);
        echo json_encode(['success' => true, 'message' => 'Document rejected. Customer will be notified.']);
        exit;
    }

    // ── UPLOAD ──
    // Requires multipart/form-data
    $docType   = trim($_POST['doc_type'] ?? '');
    $custIdRaw = isset($_POST['customer_id']) ? (int)$_POST['customer_id'] : 0;

    // Resolve customer_id
    if ($user['role'] === 'customer') {
        $custId = resolveCustomerId($pdo, (int)$user['id']);
        if (!$custId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'No customer profile found.']);
            exit;
        }
    } else {
        $custId = $custIdRaw;
        if (!$custId) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'customer_id is required for admin uploads.']);
            exit;
        }
    }

    // Validate doc_type
    if (!in_array($docType, VALID_DOC_TYPES, true)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Invalid document type.']);
        exit;
    }

    // File presence check
    if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $errCode = $_FILES['file']['error'] ?? -1;
        $errMsg  = match($errCode) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'File exceeds maximum allowed size (20 MB).',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded.',
            default => 'Upload failed. Please try again.',
        };
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => $errMsg]);
        exit;
    }

    $file = $_FILES['file'];

    // Size check
    if ($file['size'] > DOC_MAX_BYTES) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'File size exceeds 20 MB limit.']);
        exit;
    }

    // MIME check using finfo (not Content-Type header — that can be spoofed)
    $finfo    = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!array_key_exists($mimeType, ALLOWED_MIMES)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'File type not allowed. Only PDF, JPG, PNG, WEBP accepted.']);
        exit;
    }

    // Reject executables even if they have an image extension
    $dangerousMimes = ['application/x-php', 'application/x-httpd-php', 'text/x-php', 'application/x-executable'];
    if (in_array($mimeType, $dangerousMimes, true)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Executable files are not allowed.']);
        exit;
    }

    // Build safe destination path — prevent directory traversal
    $ext        = ALLOWED_MIMES[$mimeType];
    $subDir     = str_replace('_', '/', $docType);   // e.g. roof_images → roof/images would be wrong; keep flat
    $subDir     = $docType;                            // keep flat subdirectory per type
    $destDir    = UPLOAD_BASE . '/' . $subDir;

    if (!is_dir($destDir)) {
        mkdir($destDir, 0755, true);
    }

    $uniqueName = sprintf('%s_%d_%s.%s', $docType, $custId, bin2hex(random_bytes(8)), $ext);
    // Sanitise: ensure no path separator in uniqueName
    $uniqueName = basename($uniqueName);
    $destPath   = $destDir . '/' . $uniqueName;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save uploaded file on server.']);
        exit;
    }

    // Relative URL for storing in DB
    $fileUrl = '/uploads/' . $subDir . '/' . $uniqueName;

    try {
        $ins = $pdo->prepare('
            INSERT INTO documents (customer_id, doc_type, file_name, file_url, status, uploaded_by)
            VALUES (:cid, :dtype, :fname, :furl, "uploaded", :uid)
        ');
        $ins->execute([
            ':cid'   => $custId,
            ':dtype' => $docType,
            ':fname' => $file['name'],
            ':furl'  => $fileUrl,
            ':uid'   => (int)$user['id'],
        ]);
        $newId = (int)$pdo->lastInsertId();
        logActivity((int)$user['id'], 'upload_document', 'document', $newId, ['type' => $docType]);
        echo json_encode(['success' => true, 'message' => 'Document uploaded successfully.', 'id' => $newId, 'file_url' => $fileUrl]);
    } catch (PDOException $e) {
        // Cleanup orphaned file if DB insert fails
        @unlink($destPath);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save document metadata.']);
    }
    exit;
}

// ── DELETE ────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if (!$id) { http_response_code(422); echo json_encode(['success' => false, 'message' => 'Document ID required.']); exit; }

    // Fetch document first
    $ownerF = buildOwnerFilter($user, $pdo);
    $stmt   = $pdo->prepare("SELECT * FROM documents d WHERE d.id = :id AND ({$ownerF['where']}) LIMIT 1");
    $stmt->execute(array_merge([':id' => $id], $ownerF['params']));
    $doc = $stmt->fetch();

    if (!$doc) { http_response_code(404); echo json_encode(['success' => false, 'message' => 'Document not found.']); exit; }

    // Customers cannot delete verified documents
    if ($user['role'] === 'customer' && $doc['status'] === 'verified') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Verified documents cannot be deleted.']);
        exit;
    }

    // Delete physical file
    $absPath = UPLOAD_BASE . str_replace('/uploads', '', $doc['file_url']);
    if (file_exists($absPath)) {
        @unlink($absPath);
    }

    // Remove DB record
    $del = $pdo->prepare('DELETE FROM documents WHERE id = :id');
    $del->execute([':id' => $id]);
    logActivity((int)$user['id'], 'delete_document', 'document', $id);
    echo json_encode(['success' => true, 'message' => 'Document deleted successfully.']);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
