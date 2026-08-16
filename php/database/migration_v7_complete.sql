-- ============================================================
-- AKV Energy — Complete Solar Management Migration v7
-- Adds all missing tables for Customer + Admin platform.
-- Safe to run (uses IF NOT EXISTS).
-- ============================================================

-- ── 1. Extend users table ──────────────────────────────────
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='status');
SET @s = IF(@col=0, 'ALTER TABLE `users` ADD COLUMN `status` ENUM("registered","akv_customer","non_akv","active","inactive","blocked") NOT NULL DEFAULT "registered" AFTER `role`, ADD COLUMN `city` VARCHAR(80) DEFAULT NULL AFTER `phone`, ADD COLUMN `address` TEXT DEFAULT NULL AFTER `city`, ADD COLUMN `profile_photo` VARCHAR(500) DEFAULT NULL AFTER `address`, ADD COLUMN `last_login` DATETIME DEFAULT NULL AFTER `profile_photo`', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 2. customer_user_links ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `customer_user_links` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED NOT NULL,
  `customer_id` INT UNSIGNED NOT NULL,
  `linked_by`   INT UNSIGNED DEFAULT NULL COMMENT 'admin user who created the link',
  `linked_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status`      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_customer` (`user_id`, `customer_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_customer` (`customer_id`),
  CONSTRAINT `fk_link_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_link_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. projects ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `projects` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id`     INT UNSIGNED NOT NULL,
  `project_name`    VARCHAR(200) NOT NULL,
  `project_type`    ENUM('residential','commercial','industrial','solar_park') NOT NULL DEFAULT 'residential',
  `capacity_kw`     DECIMAL(8,2) DEFAULT NULL,
  `location`        VARCHAR(300) DEFAULT NULL,
  `status`          ENUM('enquiry','quotation','approved','site_survey','installation_scheduled','installation','completed','inverter_connected','active','cancelled') NOT NULL DEFAULT 'enquiry',
  `start_date`      DATE DEFAULT NULL,
  `completion_date` DATE DEFAULT NULL,
  `notes`           TEXT DEFAULT NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_proj_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. project_sites ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS `project_sites` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id`      INT UNSIGNED NOT NULL,
  `address`         TEXT NOT NULL,
  `city`            VARCHAR(80) DEFAULT NULL,
  `state`           VARCHAR(60) DEFAULT NULL,
  `pincode`         VARCHAR(20) DEFAULT NULL,
  `roof_type`       VARCHAR(60) DEFAULT NULL,
  `roof_area_sqft`  DECIMAL(10,2) DEFAULT NULL,
  `latitude`        DECIMAL(10,8) DEFAULT NULL,
  `longitude`       DECIMAL(11,8) DEFAULT NULL,
  `property_type`   ENUM('residential','commercial','industrial') DEFAULT 'residential',
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`),
  CONSTRAINT `fk_site_proj` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. inverters ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `inverters` (
  `id`                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id`         INT UNSIGNED NOT NULL,
  `project_id`          INT UNSIGNED DEFAULT NULL,
  `inverter_id`         VARCHAR(100) NOT NULL COMMENT 'unique device identifier',
  `serial_number`       VARCHAR(100) DEFAULT NULL,
  `manufacturer`        VARCHAR(120) DEFAULT NULL,
  `model`               VARCHAR(120) DEFAULT NULL,
  `capacity_kw`         DECIMAL(8,2) DEFAULT NULL,
  `installation_date`   DATE DEFAULT NULL,
  `communication_status` ENUM('online','offline','warning','fault') NOT NULL DEFAULT 'offline',
  `api_device_id`       VARCHAR(200) DEFAULT NULL COMMENT 'third-party monitoring API device ID',
  `last_seen`           DATETIME DEFAULT NULL,
  `status`              ENUM('active','inactive','maintenance','disconnected') NOT NULL DEFAULT 'active',
  `created_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inverter_id` (`inverter_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_project` (`project_id`),
  CONSTRAINT `fk_inv_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inv_proj` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. inverter_readings ───────────────────────────────────
CREATE TABLE IF NOT EXISTS `inverter_readings` (
  `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `inverter_id`       INT UNSIGNED NOT NULL,
  `current_power_w`   DECIMAL(10,2) DEFAULT 0,
  `today_kwh`         DECIMAL(10,2) DEFAULT 0,
  `month_kwh`         DECIMAL(12,2) DEFAULT 0,
  `total_kwh`         DECIMAL(14,2) DEFAULT 0,
  `grid_power_w`      DECIMAL(10,2) DEFAULT 0,
  `solar_power_w`     DECIMAL(10,2) DEFAULT 0,
  `consumption_w`     DECIMAL(10,2) DEFAULT 0,
  `co2_saved_kg`      DECIMAL(10,2) DEFAULT 0,
  `recorded_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inverter` (`inverter_id`),
  KEY `idx_recorded` (`recorded_at`),
  CONSTRAINT `fk_reading_inv` FOREIGN KEY (`inverter_id`) REFERENCES `inverters`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7. bookings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `bookings` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id`      VARCHAR(20) NOT NULL COMMENT 'display ID like BK-1001',
  `user_id`         INT UNSIGNED NOT NULL,
  `customer_id`     INT UNSIGNED DEFAULT NULL,
  `service_type`    ENUM('new_solar','cleaning','maintenance','loan','other') NOT NULL,
  `location`        VARCHAR(300) DEFAULT NULL,
  `preferred_date`  DATE DEFAULT NULL,
  `preferred_time`  VARCHAR(50) DEFAULT NULL,
  `status`          ENUM('pending','confirmed','assigned','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  `assigned_to`     INT UNSIGNED DEFAULT NULL,
  `notes`           TEXT DEFAULT NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_booking_id` (`booking_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_bk_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. maintenance_requests ────────────────────────────────
CREATE TABLE IF NOT EXISTS `maintenance_requests` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_id`      VARCHAR(20) NOT NULL COMMENT 'display ID like MT-1025',
  `user_id`         INT UNSIGNED NOT NULL,
  `customer_id`     INT UNSIGNED NOT NULL,
  `project_id`      INT UNSIGNED DEFAULT NULL,
  `inverter_id`     INT UNSIGNED DEFAULT NULL,
  `issue_category`  ENUM('panel_problem','inverter_problem','low_generation','electrical_issue','physical_damage','cleaning_required','monitoring_problem','other') NOT NULL,
  `description`     TEXT DEFAULT NULL,
  `photos`          JSON DEFAULT NULL,
  `preferred_date`  DATE DEFAULT NULL,
  `preferred_time`  VARCHAR(50) DEFAULT NULL,
  `priority`        ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `status`          ENUM('submitted','assigned','technician_scheduled','technician_visit','work_in_progress','completed','cancelled') NOT NULL DEFAULT 'submitted',
  `assigned_to`     INT UNSIGNED DEFAULT NULL COMMENT 'technician/engineer id',
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_request_id` (`request_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_maint_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_maint_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. maintenance_updates ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `maintenance_updates` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_id`    INT UNSIGNED NOT NULL,
  `status`        VARCHAR(60) NOT NULL,
  `note`          TEXT DEFAULT NULL,
  `updated_by`    INT UNSIGNED DEFAULT NULL,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_request` (`request_id`),
  CONSTRAINT `fk_mu_req` FOREIGN KEY (`request_id`) REFERENCES `maintenance_requests`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10. solar_enquiries ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `solar_enquiries` (
  `id`                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`             INT UNSIGNED NOT NULL,
  `category`            ENUM('residential','commercial','industrial','solar_park') NOT NULL,
  `location`            VARCHAR(300) DEFAULT NULL,
  `property_type`       VARCHAR(60) DEFAULT NULL,
  `monthly_bill`        DECIMAL(12,2) DEFAULT NULL,
  `required_capacity`   DECIMAL(8,2) DEFAULT NULL,
  `roof_type`           VARCHAR(60) DEFAULT NULL,
  `roof_area`           DECIMAL(10,2) DEFAULT NULL,
  `electricity_details` TEXT DEFAULT NULL,
  `preferred_date`      DATE DEFAULT NULL,
  `additional_notes`    TEXT DEFAULT NULL,
  `status`              ENUM('pending','under_review','quotation_generated','approved','rejected','completed') NOT NULL DEFAULT 'pending',
  `assigned_to`         INT UNSIGNED DEFAULT NULL,
  `admin_notes`         TEXT DEFAULT NULL,
  `created_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_senq_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 11. cleaning_requests ──────────────────────────────────
CREATE TABLE IF NOT EXISTS `cleaning_requests` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         INT UNSIGNED NOT NULL,
  `customer_id`     INT UNSIGNED DEFAULT NULL,
  `project_id`      INT UNSIGNED DEFAULT NULL,
  `cleaning_type`   ENUM('manual','sprinkler') NOT NULL DEFAULT 'manual',
  `plant_capacity`  DECIMAL(8,2) DEFAULT NULL,
  `location`        VARCHAR(300) DEFAULT NULL,
  `preferred_date`  DATE DEFAULT NULL,
  `preferred_time`  VARCHAR(50) DEFAULT NULL,
  `notes`           TEXT DEFAULT NULL,
  `status`          ENUM('pending','confirmed','assigned','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  `assigned_to`     INT UNSIGNED DEFAULT NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_clean_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 12. loan_banks ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `loan_banks` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `bank_name`       VARCHAR(200) NOT NULL,
  `interest_rate`   DECIMAL(5,2) NOT NULL,
  `min_amount`      DECIMAL(12,2) NOT NULL DEFAULT 50000,
  `max_amount`      DECIMAL(12,2) NOT NULL DEFAULT 500000,
  `max_tenure_years` INT NOT NULL DEFAULT 6,
  `processing_fee`  DECIMAL(5,2) DEFAULT 1.00 COMMENT 'percentage',
  `is_active`       TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed some banks
INSERT IGNORE INTO `loan_banks` (`id`, `bank_name`, `interest_rate`, `min_amount`, `max_amount`, `max_tenure_years`, `processing_fee`) VALUES
(1, 'State Bank of India', 8.50, 50000, 500000, 6, 1.00),
(2, 'HDFC Bank', 9.00, 50000, 500000, 5, 1.50),
(3, 'ICICI Bank', 9.25, 100000, 500000, 5, 1.25),
(4, 'Bank of Baroda', 8.75, 50000, 400000, 6, 1.00),
(5, 'Punjab National Bank', 8.65, 50000, 500000, 6, 0.75);

-- ── 13. loan_enquiries ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `loan_enquiries` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         INT UNSIGNED NOT NULL,
  `loan_amount`     DECIMAL(12,2) NOT NULL,
  `tenure_years`    INT NOT NULL,
  `interest_rate`   DECIMAL(5,2) DEFAULT NULL,
  `estimated_emi`   DECIMAL(12,2) DEFAULT NULL,
  `bank_id`         INT UNSIGNED DEFAULT NULL,
  `status`          ENUM('pending','under_review','approved','rejected','disbursed') NOT NULL DEFAULT 'pending',
  `admin_notes`     TEXT DEFAULT NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_loan_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 14. queries (support tickets) ──────────────────────────
CREATE TABLE IF NOT EXISTS `queries` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED NOT NULL,
  `subject`     VARCHAR(255) NOT NULL,
  `category`    ENUM('solar','inverter','maintenance','payment','booking','loan','account','other') NOT NULL DEFAULT 'other',
  `description` TEXT NOT NULL,
  `attachment`  VARCHAR(500) DEFAULT NULL,
  `status`      ENUM('open','assigned','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  `assigned_to` INT UNSIGNED DEFAULT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_query_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 15. query_messages ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `query_messages` (
  `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `query_id`  INT UNSIGNED NOT NULL,
  `sender_id` INT UNSIGNED NOT NULL,
  `message`   TEXT NOT NULL,
  `attachment` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_query` (`query_id`),
  CONSTRAINT `fk_qm_query` FOREIGN KEY (`query_id`) REFERENCES `queries`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 16. transactions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS `transactions` (
  `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `transaction_id`    VARCHAR(30) NOT NULL COMMENT 'display ID like TXN-10001',
  `customer_id`       INT UNSIGNED DEFAULT NULL,
  `user_id`           INT UNSIGNED NOT NULL,
  `booking_id`        INT UNSIGNED DEFAULT NULL,
  `project_id`        INT UNSIGNED DEFAULT NULL,
  `amount`            DECIMAL(12,2) NOT NULL,
  `payment_method`    VARCHAR(50) DEFAULT NULL,
  `payment_status`    ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `gateway_reference` VARCHAR(200) DEFAULT NULL,
  `description`       VARCHAR(255) DEFAULT NULL,
  `created_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_txn_id` (`transaction_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`payment_status`),
  CONSTRAINT `fk_txn_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 17. Extend activity_logs ───────────────────────────────
SET @col2 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_logs' AND COLUMN_NAME='module');
SET @s2 = IF(@col2=0, 'ALTER TABLE `activity_logs` ADD COLUMN `module` VARCHAR(60) DEFAULT NULL AFTER `action`, ADD COLUMN `description` TEXT DEFAULT NULL AFTER `entity_id`, ADD COLUMN `device` VARCHAR(200) DEFAULT NULL AFTER `ip`', 'SELECT 1');
PREPARE st2 FROM @s2; EXECUTE st2; DEALLOCATE PREPARE st2;

-- ── 18. Extend notifications ───────────────────────────────
SET @col3 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notifications' AND COLUMN_NAME='type');
SET @s3 = IF(@col3=0, 'ALTER TABLE `notifications` ADD COLUMN `type` VARCHAR(60) DEFAULT NULL AFTER `body`, ADD COLUMN `reference_id` INT UNSIGNED DEFAULT NULL AFTER `type`, ADD COLUMN `reference_type` VARCHAR(60) DEFAULT NULL AFTER `reference_id`', 'SELECT 1');
PREPARE st3 FROM @s3; EXECUTE st3; DEALLOCATE PREPARE st3;
