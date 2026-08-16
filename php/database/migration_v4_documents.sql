-- Migration v4: Extend documents table for full document management
-- Run once against your database.

-- Add missing columns to documents table
ALTER TABLE `documents`
  ADD COLUMN `status`      ENUM('pending','uploaded','verified','rejected','expired') NOT NULL DEFAULT 'uploaded' AFTER `file_url`,
  ADD COLUMN `uploaded_by` INT UNSIGNED NULL AFTER `status`,
  ADD COLUMN `verified_by` INT UNSIGNED NULL AFTER `uploaded_by`,
  ADD COLUMN `verified_at` DATETIME NULL AFTER `verified_by`,
  ADD COLUMN `notes`       VARCHAR(500) NULL AFTER `verified_at`;

-- Extend doc_type ENUM to include all required types
ALTER TABLE `documents`
  MODIFY COLUMN `doc_type` ENUM(
    'aadhaar',
    'pan',
    'electricity_bill',
    'property_docs',
    'roof_images',
    'site_survey',
    'installation_photos',
    'customer_signature',
    'quotation',
    'invoice',
    'payment_receipt',
    'warranty_certificate',
    'net_meter_certificate',
    'completion_certificate'
  ) NOT NULL;

-- Add index on status for fast filtering
ALTER TABLE `documents`
  ADD KEY `idx_doc_status` (`status`);
