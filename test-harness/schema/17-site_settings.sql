-- Test-DB schema — `site_settings`. Extracted from the prod snapshot, TiDB comments stripped.
-- Added 2026-07-29 to runtime-verify the intake-form and check-in authorization gates,
-- which could not be exercised against the previous 10-table harness.
-- Regenerate: see test-harness/README.md (Extending the schema).

CREATE TABLE `site_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(100) NOT NULL,
  `value` text DEFAULT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) ,
  UNIQUE KEY `site_settings_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
