-- ============================================================
-- AKV Energy — RBAC Migration v2  (safe to re-run)
-- Run this against your MySQL database in MAMP or production.
-- Uses ALTER TABLE … IF NOT EXISTS so it never destroys data.
-- ============================================================

-- ── 1. users ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(120)  NOT NULL,
  `email`      VARCHAR(160)  NOT NULL,
  `password`   VARCHAR(255)  NOT NULL  COMMENT 'bcrypt hash',
  `phone`      VARCHAR(20)   DEFAULT NULL,
  `role`       ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  `is_active`  TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. auth_tokens ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `auth_tokens` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED  NOT NULL,
  `token`      VARCHAR(64)   NOT NULL COMMENT 'SHA-256 hex of the raw bearer token',
  `expires_at` DATETIME      NOT NULL,
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_token`  (`token`),
  KEY `idx_user`    (`user_id`),
  KEY `idx_expires` (`expires_at`),
  CONSTRAINT `fk_token_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. customers (create if missing, then safely add columns) ────────────
CREATE TABLE IF NOT EXISTS `customers` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `full_name`     VARCHAR(120)  NOT NULL,
  `phone`         VARCHAR(20)   NOT NULL,
  `email`         VARCHAR(160)  DEFAULT NULL,
  `address`       TEXT          DEFAULT NULL,
  `monthly_units` DECIMAL(8,2)  DEFAULT NULL,
  `property_type` VARCHAR(60)   DEFAULT NULL,
  `roof_type`     VARCHAR(60)   DEFAULT NULL,
  `roof_area`     DECIMAL(8,2)  DEFAULT NULL,
  `system_type`   VARCHAR(30)   DEFAULT NULL,
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_phone`   (`phone`),
  KEY `idx_email`   (`email`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add user_id FK column to customers if it does not already exist
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME  = 'customers'
    AND COLUMN_NAME = 'user_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `customers`
     ADD COLUMN `user_id` INT UNSIGNED DEFAULT NULL
       COMMENT "NULL = admin-created without portal account"
       AFTER `id`,
     ADD KEY `idx_user_id` (`user_id`),
     ADD CONSTRAINT `fk_customer_user`
       FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL',
  'SELECT 1'  -- no-op
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 4. enquiries ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `enquiries` (
  `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `customer_id`    INT UNSIGNED  DEFAULT NULL,
  `user_id`        INT UNSIGNED  DEFAULT NULL COMMENT 'portal user who submitted',
  `name`           VARCHAR(120)  NOT NULL,
  `phone`          VARCHAR(20)   NOT NULL,
  `email`          VARCHAR(160)  DEFAULT NULL,
  `state`          VARCHAR(60)   DEFAULT NULL,
  `city`           VARCHAR(80)   DEFAULT NULL,
  `system_size_kw` DECIMAL(6,2)  DEFAULT NULL,
  `roof_space`     DECIMAL(8,2)  DEFAULT NULL,
  `notes`          TEXT          DEFAULT NULL,
  `source`         VARCHAR(60)   DEFAULT 'app',
  `status`         ENUM(
    'new','contacted','site_visit_scheduled','quotation_sent',
    'approved','rejected','installation_started','completed','cancelled'
  ) NOT NULL DEFAULT 'new',
  `assigned_to`    INT UNSIGNED  DEFAULT NULL COMMENT 'admin user id',
  `admin_remarks`  TEXT          DEFAULT NULL,
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_user`     (`user_id`),
  KEY `idx_status`   (`status`),
  KEY `idx_created`  (`created_at`),
  CONSTRAINT `fk_enq_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_enq_user`
    FOREIGN KEY (`user_id`)     REFERENCES `users`(`id`)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. enquiry_timeline ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `enquiry_timeline` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `enquiry_id`  INT UNSIGNED NOT NULL,
  `actor_id`    INT UNSIGNED DEFAULT NULL,
  `actor_name`  VARCHAR(120) DEFAULT NULL,
  `action`      VARCHAR(120) NOT NULL,
  `note`        TEXT         DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_enq` (`enquiry_id`),
  CONSTRAINT `fk_timeline_enq`
    FOREIGN KEY (`enquiry_id`) REFERENCES `enquiries`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. products ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `products` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `category`    VARCHAR(60)   NOT NULL DEFAULT 'panels',
  `name`        VARCHAR(180)  NOT NULL,
  `brand`       VARCHAR(120)  DEFAULT NULL,
  `description` TEXT          DEFAULT NULL,
  `price_label` VARCHAR(80)   DEFAULT NULL,
  `warranty`    VARCHAR(80)   DEFAULT NULL,
  `image_url`   VARCHAR(500)  DEFAULT NULL,
  `specs`       JSON          DEFAULT NULL,
  `is_popular`  TINYINT(1)    NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1)    NOT NULL DEFAULT 1,
  `sort_order`  INT           NOT NULL DEFAULT 0,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_active`   (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7. notifications ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED DEFAULT NULL COMMENT 'NULL = broadcast to all',
  `title`      VARCHAR(180) NOT NULL,
  `body`       TEXT         NOT NULL,
  `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user`    (`user_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. activity_logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED DEFAULT NULL,
  `action`     VARCHAR(120) NOT NULL,
  `entity`     VARCHAR(60)  DEFAULT NULL,
  `entity_id`  INT UNSIGNED DEFAULT NULL,
  `meta`       JSON         DEFAULT NULL,
  `ip`         VARCHAR(45)  DEFAULT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user`    (`user_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. Seed default admin ────────────────────────────────────────────────
-- Password = Admin@123  (bcrypt 12 rounds)
-- CHANGE THIS PASSWORD after first login.
INSERT IGNORE INTO `users` (`name`, `email`, `password`, `role`)
VALUES (
  'AKV Admin',
  'admin@akvenergy.com',
  '$2y$12$iPg7tRk9X4uNovEZbq7IJu53e4Yk507kk5r8zPGI3m3tEvRVACRrq',
  'admin'
);
