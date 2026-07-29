-- Test-DB schema — `checkin_templates`. Extracted from the prod snapshot, TiDB comments stripped.
-- Added 2026-07-29 to runtime-verify the intake-form and check-in authorization gates,
-- which could not be exercised against the previous 10-table harness.
-- Regenerate: see test-harness/README.md (Extending the schema).

CREATE TABLE `checkin_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `isDefault` tinyint(1) NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `questions` json NOT NULL,
  `createdBy` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
