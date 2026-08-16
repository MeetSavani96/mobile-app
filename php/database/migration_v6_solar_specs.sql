-- ============================================================
-- AKV Energy — Solar Specification & Complaints Enum Migration v6
-- Safe to run against the database.
-- ============================================================

-- 1. Add missing solar specification columns to customers table if not exists
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME  = 'customers'
    AND COLUMN_NAME = 'panel_count'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `customers`
     ADD COLUMN `panel_count` INT UNSIGNED DEFAULT NULL AFTER `system_type`,
     ADD COLUMN `panel_brand` VARCHAR(120) DEFAULT NULL AFTER `panel_count`,
     ADD COLUMN `inverter_brand` VARCHAR(120) DEFAULT NULL AFTER `panel_brand`,
     ADD COLUMN `inverter_capacity_kw` DECIMAL(8,2) DEFAULT NULL AFTER `inverter_brand`,
     ADD COLUMN `battery_capacity_kwh` DECIMAL(8,2) DEFAULT NULL AFTER `inverter_capacity_kw`,
     ADD COLUMN `install_date` DATE DEFAULT NULL AFTER `battery_capacity_kwh`,
     ADD COLUMN `panel_orientation` VARCHAR(60) DEFAULT NULL AFTER `install_date`,
     ADD COLUMN `panel_tilt_angle` DECIMAL(5,2) DEFAULT NULL AFTER `panel_orientation`,
     ADD COLUMN `electricity_provider` VARCHAR(120) DEFAULT NULL AFTER `panel_tilt_angle`,
     ADD COLUMN `consumer_number` VARCHAR(100) DEFAULT NULL AFTER `electricity_provider`,
     ADD COLUMN `latitude` DECIMAL(10,8) DEFAULT NULL AFTER `consumer_number`,
     ADD COLUMN `longitude` DECIMAL(11,8) DEFAULT NULL AFTER `latitude`,
     ADD COLUMN `state` VARCHAR(60) DEFAULT NULL AFTER `longitude`,
     ADD COLUMN `city` VARCHAR(80) DEFAULT NULL AFTER `state`,
     ADD COLUMN `pincode` VARCHAR(20) DEFAULT NULL AFTER `city`,
     ADD COLUMN `installation_cost` DECIMAL(12,2) DEFAULT NULL AFTER `pincode`,
     ADD COLUMN `monthly_bill` DECIMAL(12,2) DEFAULT NULL AFTER `installation_cost`,
     ADD COLUMN `tariff_rate` DECIMAL(6,2) DEFAULT NULL AFTER `monthly_bill`,
     ADD COLUMN `purchase_type` VARCHAR(50) DEFAULT NULL AFTER `tariff_rate`,
     ADD COLUMN `subsidy_status` VARCHAR(50) DEFAULT NULL AFTER `purchase_type`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Modify complaints.priority column to support 'critical' option
ALTER TABLE `complaints` MODIFY COLUMN `priority` ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium';
