-- ============================================================
-- AKV Energy — customers table
-- Run once against your MySQL database in MAMP or production.
-- ============================================================

CREATE TABLE IF NOT EXISTS `customers` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `full_name`     VARCHAR(120)  NOT NULL,
  `phone`         VARCHAR(20)   NOT NULL,
  `email`         VARCHAR(160)  DEFAULT NULL,
  `address`       TEXT          DEFAULT NULL,
  `monthly_units` DECIMAL(8,2)  DEFAULT NULL  COMMENT 'Average monthly kWh usage',
  `property_type` VARCHAR(60)   DEFAULT NULL  COMMENT 'Residential / Commercial / Industrial',
  `roof_type`     VARCHAR(60)   DEFAULT NULL  COMMENT 'Flat RCC / Metal Sheet / Sloped Tile / Terrace',
  `roof_area`     DECIMAL(8,2)  DEFAULT NULL  COMMENT 'Available rooftop area in sq.ft',
  `system_type`   VARCHAR(30)   DEFAULT NULL  COMMENT 'on_grid / off_grid / hybrid',
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_phone`   (`phone`),
  KEY `idx_email`   (`email`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
