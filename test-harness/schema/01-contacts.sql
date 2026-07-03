-- Test-DB schema — `contacts` (canonical identity table).
-- Faithful to the 2026-07-01 production snapshot (TiDB), cleaned for MySQL 8:
-- snake_case columns, generated `full_name`, and the real UNIQUE(email) key.
--
-- Add more tables as tests need them: drop a `02-<table>.sql`, `03-…` here
-- (extract the CREATE TABLE from the snapshot, strip TiDB `/*T![...] */` comments).
-- Files run once, in name order, on a fresh volume (see docker-compose.yml).

CREATE TABLE IF NOT EXISTS `contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `full_name` varchar(500) GENERATED ALWAYS AS
      (trim(concat(coalesce(`first_name`, ''), ' ', coalesce(`last_name`, '')))) STORED,
  `email` varchar(320) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `secondary_email` varchar(320) DEFAULT NULL,
  `secondary_phone` varchar(50) DEFAULT NULL,
  `preferred_contact_method` enum('email','phone','sms') DEFAULT 'email',
  `lifecycle_stage` enum('lead','prospect','enrolled','active_client','past_client','store_customer')
      NOT NULL DEFAULT 'lead',
  `source` varchar(100) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contacts_email_unique` (`email`),
  KEY `contacts_phone_idx` (`phone`),
  KEY `contacts_lifecycle_idx` (`lifecycle_stage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
