-- Test-DB schema — `checkin_responses`. Extracted from the prod snapshot, TiDB comments stripped.
-- Added 2026-07-29 to runtime-verify the intake-form and check-in authorization gates,
-- which could not be exercised against the previous 10-table harness.
-- Regenerate: see test-harness/README.md (Extending the schema).

CREATE TABLE `checkin_responses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `checkinId` int NOT NULL,
  `questionId` varchar(50) NOT NULL,
  `questionText` text NOT NULL,
  `questionType` varchar(20) NOT NULL,
  `scaleValue` int DEFAULT NULL,
  `textValue` text DEFAULT NULL,
  `booleanValue` tinyint(1) DEFAULT NULL,
  `selectValue` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) ,
  KEY `checkin_responses_checkin_idx` (`checkinId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
