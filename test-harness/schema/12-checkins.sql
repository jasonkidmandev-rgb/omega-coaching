-- Test-DB schema — `checkins`. Extracted from the prod snapshot, TiDB comments stripped.
-- Added 2026-07-29 to runtime-verify the intake-form and check-in authorization gates,
-- which could not be exercised against the previous 10-table harness.
-- Regenerate: see test-harness/README.md (Extending the schema).

CREATE TABLE `checkins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clientProtocolId` int NOT NULL,
  `templateId` int NOT NULL,
  `scheduleId` int DEFAULT NULL,
  `status` enum('pending','submitted','reviewed','incomplete') NOT NULL DEFAULT 'pending',
  `overallScore` int DEFAULT NULL,
  `hasLowScore` tinyint(1) NOT NULL DEFAULT '0',
  `lowestScore` int DEFAULT NULL,
  `sentAt` timestamp NULL DEFAULT NULL,
  `reminder1SentAt` timestamp NULL DEFAULT NULL,
  `reminder2SentAt` timestamp NULL DEFAULT NULL,
  `submittedAt` timestamp NULL DEFAULT NULL,
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `reviewedBy` int DEFAULT NULL,
  `dueAt` timestamp NULL DEFAULT NULL,
  `weekNumber` int DEFAULT NULL,
  `periodStart` timestamp NULL DEFAULT NULL,
  `periodEnd` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `alert_processed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) ,
  KEY `checkins_client_protocol_idx` (`clientProtocolId`),
  KEY `checkins_status_idx` (`status`),
  KEY `checkins_submitted_at_idx` (`submittedAt`),
  KEY `checkins_has_low_score_idx` (`hasLowScore`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
