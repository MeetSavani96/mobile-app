-- ============================================================
-- AKV Energy — Solar ERP Migration v3
-- Creates new tables and relationships for Phase 4.
-- ============================================================

-- ── 1. quotation_master ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `quotation_master` (
  `id`                     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `customer_id`            INT UNSIGNED  NOT NULL,
  `subtotal`               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount`               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `gst`                    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `installation_charges`   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `transportation_charges` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `grand_total`            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `validity_date`          DATE          DEFAULT NULL,
  `status`                 ENUM('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired') NOT NULL DEFAULT 'draft',
  `notes`                  TEXT          DEFAULT NULL,
  `created_at`             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_quote_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. quotation_items ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `quotation_items` (
  `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `quotation_id` INT UNSIGNED  NOT NULL,
  `product_id`   INT UNSIGNED  NOT NULL,
  `quantity`     INT           NOT NULL DEFAULT 1,
  `price`        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_quotation` (`quotation_id`),
  KEY `idx_product` (`product_id`),
  CONSTRAINT `fk_item_quote`
    FOREIGN KEY (`quotation_id`) REFERENCES `quotation_master`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_item_product`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `payment_history`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `invoices`;

-- ── 3. invoices ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `invoices` (
  `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `quote_id`       INT UNSIGNED  DEFAULT NULL,
  `customer_id`    INT UNSIGNED  NOT NULL,
  `invoice_num`    VARCHAR(50)   NOT NULL,
  `subtotal`       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount`       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `gst`            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `grand_total`    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `paid_amount`    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status`         ENUM('pending', 'generated', 'paid', 'partially_paid', 'cancelled') NOT NULL DEFAULT 'pending',
  `due_date`       DATE          DEFAULT NULL,
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoice_num` (`invoice_num`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_quote` (`quote_id`),
  CONSTRAINT `fk_inv_quote`
    FOREIGN KEY (`quote_id`) REFERENCES `quotation_master`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inv_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. payments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payments` (
  `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `invoice_id`     INT UNSIGNED  NOT NULL,
  `amount`         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `method`         VARCHAR(50)   NOT NULL,
  `txn_id`         VARCHAR(100)  DEFAULT NULL,
  `ref_num`        VARCHAR(100)  DEFAULT NULL,
  `pay_date`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `remarks`        TEXT          DEFAULT NULL,
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invoice` (`invoice_id`),
  CONSTRAINT `fk_pay_invoice`
    FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. payment_history ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payment_history` (
  `id`               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `payment_id`       INT UNSIGNED  NOT NULL,
  `amount`           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_method`   VARCHAR(50)   NOT NULL,
  `reference_number` VARCHAR(100)  DEFAULT NULL,
  `received_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes`            TEXT          DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_payment` (`payment_id`),
  CONSTRAINT `fk_hist_pay`
    FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. engineers ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `engineers` (
  `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(120)  NOT NULL,
  `mobile`       VARCHAR(20)   NOT NULL,
  `email`        VARCHAR(160)  NOT NULL,
  `address`      TEXT          DEFAULT NULL,
  `skills`       TEXT          DEFAULT NULL,
  `availability` ENUM('available', 'busy', 'unavailable') NOT NULL DEFAULT 'available',
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_avail` (`availability`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7. installation_projects ────────────────────────────────
CREATE TABLE IF NOT EXISTS `installation_projects` (
  `id`                        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id`               INT UNSIGNED NOT NULL,
  `status`                    ENUM('lead_received', 'site_survey', 'quotation_approved', 'material_ready', 'started', 'completed', 'inspection', 'net_metering', 'closed') NOT NULL DEFAULT 'lead_received',
  `scheduled_survey_date`     DATETIME     DEFAULT NULL,
  `scheduled_install_date`    DATETIME     DEFAULT NULL,
  `estimated_completion_date` DATE         DEFAULT NULL,
  `site_photos`               JSON         DEFAULT NULL,
  `completion_photos`         JSON         DEFAULT NULL,
  `customer_signature`        VARCHAR(255) DEFAULT NULL,
  `warranty_card_url`         VARCHAR(255) DEFAULT NULL,
  `internal_notes`            TEXT         DEFAULT NULL,
  `created_at`                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_proj_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. engineer_assignments ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `engineer_assignments` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id`  INT UNSIGNED NOT NULL,
  `engineer_id` INT UNSIGNED NOT NULL,
  `assigned_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`),
  KEY `idx_engineer` (`engineer_id`),
  CONSTRAINT `fk_assign_proj`
    FOREIGN KEY (`project_id`) REFERENCES `installation_projects`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assign_eng`
    FOREIGN KEY (`engineer_id`) REFERENCES `engineers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. installation_tasks ───────────────────────────────────
CREATE TABLE IF NOT EXISTS `installation_tasks` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `title`      VARCHAR(180) NOT NULL,
  `status`     ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`),
  CONSTRAINT `fk_task_proj`
    FOREIGN KEY (`project_id`) REFERENCES `installation_projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10. documents ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `documents` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` INT UNSIGNED NOT NULL,
  `doc_type`    ENUM('aadhaar', 'pan', 'electricity_bill', 'property_docs', 'roof_images', 'installation_photos', 'warranty_certificate', 'invoice', 'quotation') NOT NULL,
  `file_name`   VARCHAR(255) NOT NULL,
  `file_url`    VARCHAR(500) NOT NULL,
  `uploaded_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_doc_type` (`doc_type`),
  CONSTRAINT `fk_doc_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 11. complaints ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `complaints` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` INT UNSIGNED NOT NULL,
  `title`       VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `priority`    ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  `status`      ENUM('open', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  CONSTRAINT `fk_complaint_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 12. maintenance ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `maintenance` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id`   INT UNSIGNED NOT NULL,
  `schedule_date` DATETIME NOT NULL,
  `notes`         TEXT DEFAULT NULL,
  `status`        ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  CONSTRAINT `fk_maintenance_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
