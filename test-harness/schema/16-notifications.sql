-- Test-DB schema — `notifications`. Extracted from the prod snapshot, TiDB comments stripped.
-- Added 2026-07-29 to runtime-verify the intake-form and check-in authorization gates,
-- which could not be exercised against the previous 10-table harness.
-- Regenerate: see test-harness/README.md (Extending the schema).

CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `type` enum('protocol_approved','protocol_viewed','payment_received','payment_failed','payment_refunded','profile_completed','packing_slip_created','protocol_option_selected','protocol_expiring','enrollment_onboarding','consultation_notes_added','consultation_note_reminder','onboarding_automation','low_checkin_score','checkin_submitted','new_store_order','waiver_signed','intake_completed','appointment_booked','appointment_cancelled','client_comment','inventory_out_of_stock','venmo_pending','new_user_registered','referral_submitted','new_enrollment','other') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `clientProtocolId` int DEFAULT NULL,
  `isRead` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) ,
  KEY `notifications_user_idx` (`userId`),
  KEY `notifications_user_read_idx` (`userId`,`isRead`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
