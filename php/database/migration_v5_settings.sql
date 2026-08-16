-- Migration v5: Create settings table
CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `setting_value` TEXT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default configurations
INSERT IGNORE INTO `system_settings` (`setting_key`, `setting_value`) VALUES
('company_name', 'AKV Energy Solutions'),
('company_address', '101 Solar Plaza, Science City Road, Ahmedabad, Gujarat'),
('company_phone', '+91 98765 43210'),
('company_email', 'info@akvenergy.com'),
('company_gstin', '24AAAAC1234A1Z1'),
('smtp_host', 'smtp.akvenergy.com'),
('smtp_port', '587'),
('smtp_user', 'smtp@akvenergy.com'),
('smtp_pass', 'smtpPass123'),
('smtp_encryption', 'tls'),
('google_maps_key', 'AIzaSyFakeKey123456789'),
('firebase_settings', '{}'),
('default_theme', 'dark'),
('default_language', 'en');
