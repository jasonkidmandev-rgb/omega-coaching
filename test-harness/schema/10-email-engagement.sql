-- Tables needed by email-engagement.integration.test.ts.
-- Captured from production DDL; AUTO_INCREMENT stripped.

CREATE TABLE `email_engagement_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `notificationHistoryId` int DEFAULT NULL,
  `trackingId` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  `eventType` enum('open','click') COLLATE utf8mb4_bin NOT NULL,
  `linkUrl` text COLLATE utf8mb4_bin,
  `linkName` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `userAgent` text COLLATE utf8mb4_bin,
  `ipAddress` varchar(45) COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trackingId` (`trackingId`),
  KEY `email_engagement_tracking_idx` (`trackingId`),
  KEY `email_engagement_notification_idx` (`notificationHistoryId`),
  KEY `email_engagement_event_type_idx` (`eventType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `client_notification_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clientProtocolId` int DEFAULT NULL,
  `userId` int DEFAULT NULL,
  `recipientEmail` varchar(320) COLLATE utf8mb4_bin NOT NULL,
  `recipientName` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `category` enum('checkin','protocol','payment','shipping','inventory','document','welcome','announcement','digest','notification','message','other') COLLATE utf8mb4_bin NOT NULL,
  `notificationType` varchar(100) COLLATE utf8mb4_bin NOT NULL,
  `subject` varchar(500) COLLATE utf8mb4_bin NOT NULL,
  `previewText` text COLLATE utf8mb4_bin,
  `status` enum('sent','failed','pending','bounced') COLLATE utf8mb4_bin NOT NULL DEFAULT 'pending',
  `errorMessage` text COLLATE utf8mb4_bin,
  `relatedEntityType` varchar(50) COLLATE utf8mb4_bin DEFAULT NULL,
  `relatedEntityId` int DEFAULT NULL,
  `scheduledAt` timestamp NULL DEFAULT NULL,
  `sentAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `triggeredBy` enum('system','cron','admin','webhook') COLLATE utf8mb4_bin NOT NULL DEFAULT 'system',
  `triggeredByUserId` int DEFAULT NULL,
  `trackingId` varchar(64) COLLATE utf8mb4_bin DEFAULT NULL,
  `openedAt` timestamp NULL DEFAULT NULL,
  `openCount` int NOT NULL DEFAULT '0',
  `clickedAt` timestamp NULL DEFAULT NULL,
  `clickCount` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `client_notification_history_client_protocol_idx` (`clientProtocolId`),
  KEY `client_notification_history_user_idx` (`userId`),
  KEY `client_notification_history_category_idx` (`category`),
  KEY `client_notification_history_sent_at_idx` (`sentAt`),
  KEY `client_notification_history_status_idx` (`status`),
  KEY `client_notification_history_tracking_idx` (`trackingId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

