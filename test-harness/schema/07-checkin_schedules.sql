-- Test-DB schema — `checkin_schedules`. Extracted from the prod snapshot, TiDB comments stripped.
-- Needed because createNewProtocolVersionFromProtocol disables the superseded
-- protocol's check-in schedule. Regenerate: see test-harness/README.md (Extending the schema).

CREATE TABLE `checkin_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clientProtocolId` int NOT NULL,
  `templateId` int NOT NULL,
  `isEnabled` tinyint(1) NOT NULL DEFAULT '0',
  `frequency` enum('weekly','biweekly','monthly') NOT NULL DEFAULT 'weekly',
  `dayOfWeek` int NOT NULL DEFAULT '4',
  `timeOfDay` varchar(5) NOT NULL DEFAULT '10:00',
  `timezone` varchar(50) NOT NULL DEFAULT 'America/Denver',
  `lastSentAt` timestamp NULL DEFAULT NULL,
  `nextScheduledAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_paused` tinyint(1) NOT NULL DEFAULT '0',
  `skip_until` timestamp NULL DEFAULT NULL,
  `paused_reason` varchar(255) DEFAULT NULL,
  `currentStreak` int NOT NULL DEFAULT '0',
  `longestStreak` int NOT NULL DEFAULT '0',
  `totalResponses` int NOT NULL DEFAULT '0',
  `totalSent` int NOT NULL DEFAULT '0',
  `lastResponseAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `checkin_schedules_client_protocol_idx` (`clientProtocolId`),
  KEY `checkin_schedules_enabled_idx` (`isEnabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=510001;
