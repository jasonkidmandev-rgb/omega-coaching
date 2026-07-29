-- Test-DB schema — `intake_form_signatures`. Extracted from the prod snapshot, TiDB comments stripped.
-- Added 2026-07-29 to runtime-verify the intake-form and check-in authorization gates,
-- which could not be exercised against the previous 10-table harness.
-- Regenerate: see test-harness/README.md (Extending the schema).

CREATE TABLE `intake_form_signatures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `intakeFormId` int NOT NULL,
  `enrollmentId` int NOT NULL,
  `sectionKey` varchar(100) NOT NULL,
  `signatureType` enum('drawn','typed') NOT NULL,
  `signatureData` text NOT NULL,
  `signedName` varchar(255) DEFAULT NULL,
  `ipAddress` varchar(45) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `signedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) ,
  KEY `intake_sig_form_idx` (`intakeFormId`),
  KEY `intake_sig_enrollment_idx` (`enrollmentId`),
  KEY `intake_sig_section_idx` (`sectionKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
