<?php
/**
 * Admin Products CRUD API.
 * Requires: role = admin.
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$admin = requireRole('admin');
$method = $_SERVER['REQUEST_METHOD'];

// ── GET List ─────────────────────────────────────────────────────────────
if ($method === 'GET') {
    try {
        $stmt = $pdo->query('SELECT * FROM products ORDER BY sort_order ASC, id DESC');
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['id'] = (int)$r['id'];
            $r['is_popular'] = (int)$r['is_popular'];
            $r['is_active'] = (int)$r['is_active'];
            $r['sort_order'] = (int)$r['sort_order'];
            if ($r['specs'] !== null) {
                $r['specs'] = json_decode($r['specs'], true);
            }
        }
        echo json_encode(['success' => true, 'data' => $rows]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load products.']);
    }
    exit;
}

// ── POST Create ──────────────────────────────────────────────────────────
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $category    = trim($body['category'] ?? 'panels');
    $name        = trim($body['name'] ?? '');
    $brand       = trim($body['brand'] ?? '') ?: null;
    $description = trim($body['description'] ?? '') ?: null;
    $priceLabel  = trim($body['price_label'] ?? '') ?: null;
    $warranty    = trim($body['warranty'] ?? '') ?: null;
    $imageUrl    = trim($body['image_url'] ?? '') ?: null;
    $specs       = isset($body['specs']) ? json_encode($body['specs']) : null;
    $isPopular   = (int)($body['is_popular'] ?? 0);
    $isActive    = (int)($body['is_active'] ?? 1);
    $sortOrder   = (int)($body['sort_order'] ?? 0);

    if ($name === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Product name is required.']);
        exit;
    }

    try {
        $ins = $pdo->prepare('
            INSERT INTO products 
                (category, name, brand, description, price_label, warranty, image_url, specs, is_popular, is_active, sort_order)
            VALUES 
                (:category, :name, :brand, :description, :price_label, :warranty, :image_url, :specs, :is_popular, :is_active, :sort_order)
        ');
        $ins->execute([
            ':category'    => $category,
            ':name'        => $name,
            ':brand'       => $brand,
            ':description' => $description,
            ':price_label' => $priceLabel,
            ':warranty'    => $warranty,
            ':image_url'   => $imageUrl,
            ':specs'       => $specs,
            ':is_popular'  => $isPopular,
            ':is_active'   => $isActive,
            ':sort_order'  => $sortOrder,
        ]);

        $productId = (int)$pdo->lastInsertId();
        logActivity((int)$admin['id'], 'create_product', 'product', $productId);

        echo json_encode(['success' => true, 'message' => 'Product created successfully.', 'id' => $productId]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create product.']);
    }
    exit;
}

// ── PUT Update ───────────────────────────────────────────────────────────
if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = (int)($body['id'] ?? 0);

    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid product id is required.']);
        exit;
    }

    $category    = trim($body['category'] ?? 'panels');
    $name        = trim($body['name'] ?? '');
    $brand       = trim($body['brand'] ?? '') ?: null;
    $description = trim($body['description'] ?? '') ?: null;
    $priceLabel  = trim($body['price_label'] ?? '') ?: null;
    $warranty    = trim($body['warranty'] ?? '') ?: null;
    $imageUrl    = trim($body['image_url'] ?? '') ?: null;
    $specs       = isset($body['specs']) ? json_encode($body['specs']) : null;
    $isPopular   = (int)($body['is_popular'] ?? 0);
    $isActive    = (int)($body['is_active'] ?? 1);
    $sortOrder   = (int)($body['sort_order'] ?? 0);

    if ($name === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Product name is required.']);
        exit;
    }

    try {
        $upd = $pdo->prepare('
            UPDATE products SET 
                category = :category, name = :name, brand = :brand, description = :description,
                price_label = :price_label, warranty = :warranty, image_url = :image_url,
                specs = :specs, is_popular = :is_popular, is_active = :is_active, sort_order = :sort_order
            WHERE id = :id
        ');
        $upd->execute([
            ':id'          => $id,
            ':category'    => $category,
            ':name'        => $name,
            ':brand'       => $brand,
            ':description' => $description,
            ':price_label' => $priceLabel,
            ':warranty'    => $warranty,
            ':image_url'   => $imageUrl,
            ':specs'       => $specs,
            ':is_popular'  => $isPopular,
            ':is_active'   => $isActive,
            ':sort_order'  => $sortOrder,
        ]);

        logActivity((int)$admin['id'], 'update_product', 'product', $id);
        echo json_encode(['success' => true, 'message' => 'Product updated successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update product.']);
    }
    exit;
}

// ── DELETE Delete ────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);

    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid product id is required.']);
        exit;
    }

    try {
        $del = $pdo->prepare('DELETE FROM products WHERE id = :id');
        $del->execute([':id' => $id]);

        logActivity((int)$admin['id'], 'delete_product', 'product', $id);
        echo json_encode(['success' => true, 'message' => 'Product deleted successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete product.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
