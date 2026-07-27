-- DDL of tables dropped 2026-07-27T22:27:06.830Z
-- All were empty (0 rows) with no code or FK references.
-- Kept so any of these can be recreated if a feature is revived.

CREATE TABLE `automated_follow_up_sequences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `description` text COLLATE utf8mb4_bin,
  `trigger_event` enum('checkin_submitted','checkin_missed','low_score','payment_received','protocol_sent','onboarding_complete','inventory_low','custom') COLLATE utf8mb4_bin NOT NULL,
  `trigger_conditions` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `follow_up_executions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sequence_id` int NOT NULL,
  `client_protocol_id` int NOT NULL,
  `trigger_event` varchar(100) COLLATE utf8mb4_bin NOT NULL,
  `current_step` int NOT NULL DEFAULT '1',
  `status` enum('pending','in_progress','completed','cancelled','failed') COLLATE utf8mb4_bin NOT NULL DEFAULT 'pending',
  `started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `next_step_at` timestamp NULL DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_bin,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sequence_id` (`sequence_id`),
  KEY `client_protocol_id` (`client_protocol_id`),
  KEY `status` (`status`),
  KEY `next_step_at` (`next_step_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `follow_up_sequence_steps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sequence_id` int NOT NULL,
  `step_order` int NOT NULL,
  `delay_hours` int NOT NULL DEFAULT '0',
  `action_type` enum('email','task','notification','sms') COLLATE utf8mb4_bin NOT NULL,
  `email_subject` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL,
  `email_template` text COLLATE utf8mb4_bin,
  `task_title` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `task_description` text COLLATE utf8mb4_bin,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sequence_id` (`sequence_id`),
  KEY `step_order` (`step_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `client_activity_scores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_protocol_id` int NOT NULL,
  `checkin_score` int NOT NULL DEFAULT '0',
  `document_score` int NOT NULL DEFAULT '0',
  `purchase_score` int NOT NULL DEFAULT '0',
  `engagement_score` int NOT NULL DEFAULT '0',
  `total_score` int NOT NULL DEFAULT '0',
  `last_activity_at` timestamp NULL DEFAULT NULL,
  `checkins_completed` int NOT NULL DEFAULT '0',
  `checkins_missed` int NOT NULL DEFAULT '0',
  `documents_uploaded` int NOT NULL DEFAULT '0',
  `purchases_made` int NOT NULL DEFAULT '0',
  `comments_made` int NOT NULL DEFAULT '0',
  `calculated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_protocol_id_2` (`client_protocol_id`),
  KEY `client_protocol_id` (`client_protocol_id`),
  KEY `total_score` (`total_score`),
  KEY `last_activity_at` (`last_activity_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `client_onboarding_checklist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_protocol_id` int NOT NULL,
  `step_key` varchar(50) COLLATE utf8mb4_bin NOT NULL,
  `step_name` varchar(100) COLLATE utf8mb4_bin NOT NULL,
  `step_description` text COLLATE utf8mb4_bin,
  `is_completed` tinyint(1) NOT NULL DEFAULT '0',
  `completed_at` timestamp NULL DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_client_step` (`client_protocol_id`,`step_key`),
  KEY `idx_client_protocol` (`client_protocol_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `incoming_sms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversationId` int NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_bin NOT NULL,
  `message` text COLLATE utf8mb4_bin NOT NULL,
  `ghlMessageId` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL,
  `ghlContactId` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL,
  `ghlConversationId` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL,
  `direction` enum('inbound','outbound') COLLATE utf8mb4_bin NOT NULL,
  `status` enum('received','read') COLLATE utf8mb4_bin NOT NULL DEFAULT 'received',
  `clientName` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `receivedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `readAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `incoming_sms_conv_idx` (`conversationId`),
  KEY `incoming_sms_phone_idx` (`phone`),
  KEY `incoming_sms_direction_idx` (`direction`),
  KEY `incoming_sms_received_idx` (`receivedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `sms_conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone` varchar(20) COLLATE utf8mb4_bin NOT NULL,
  `ghlContactId` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL,
  `ghlConversationId` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL,
  `clientName` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `clientEmail` varchar(320) COLLATE utf8mb4_bin DEFAULT NULL,
  `lastMessageAt` timestamp NULL DEFAULT NULL,
  `lastMessagePreview` varchar(160) COLLATE utf8mb4_bin DEFAULT NULL,
  `unreadCount` int NOT NULL DEFAULT '0',
  `isArchived` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sms_conversations_phone_unique` (`phone`),
  KEY `sms_conv_phone_idx` (`phone`),
  KEY `sms_conv_last_msg_idx` (`lastMessageAt`),
  KEY `sms_conv_unread_idx` (`unreadCount`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `sms_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `settingKey` varchar(100) COLLATE utf8mb4_bin NOT NULL,
  `settingValue` text COLLATE utf8mb4_bin NOT NULL,
  `description` text COLLATE utf8mb4_bin,
  `updatedBy` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sms_settings_settingKey_unique` (`settingKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `push_notification_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subscriptionId` int DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `body` text COLLATE utf8mb4_bin,
  `icon` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL,
  `url` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL,
  `notificationType` enum('protocol_updated','payment_due','payment_received','checkin_available','checkin_reminder','announcement','custom') COLLATE utf8mb4_bin NOT NULL,
  `clientProtocolId` int DEFAULT NULL,
  `userId` int DEFAULT NULL,
  `status` enum('pending','sent','delivered','failed','clicked') COLLATE utf8mb4_bin NOT NULL DEFAULT 'pending',
  `errorMessage` text COLLATE utf8mb4_bin,
  `sentAt` timestamp NULL DEFAULT NULL,
  `deliveredAt` timestamp NULL DEFAULT NULL,
  `clickedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `push_logs_subscription_idx` (`subscriptionId`),
  KEY `push_logs_type_idx` (`notificationType`),
  KEY `push_logs_status_idx` (`status`),
  KEY `push_logs_created_at_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `push_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `endpoint` text COLLATE utf8mb4_bin NOT NULL,
  `p256dh` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `auth` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `clientId` int DEFAULT NULL,
  `userAgent` text COLLATE utf8mb4_bin,
  `deviceType` enum('mobile','tablet','desktop') COLLATE utf8mb4_bin DEFAULT 'desktop',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `lastUsedAt` timestamp NULL DEFAULT NULL,
  `failureCount` int NOT NULL DEFAULT '0',
  `notifyProtocolUpdates` tinyint(1) NOT NULL DEFAULT '1',
  `notifyPaymentDue` tinyint(1) NOT NULL DEFAULT '1',
  `notifyPaymentReceived` tinyint(1) NOT NULL DEFAULT '1',
  `notifyCheckins` tinyint(1) NOT NULL DEFAULT '1',
  `notifyAnnouncements` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `push_sub_user_idx` (`userId`),
  KEY `push_subscriptions_client_idx` (`clientId`),
  KEY `push_subscriptions_active_idx` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `embed_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  `userId` int DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `source` varchar(50) COLLATE utf8mb4_bin DEFAULT 'ghl',
  `permissions` json DEFAULT NULL,
  `expiresAt` timestamp NULL DEFAULT NULL,
  `lastUsedAt` timestamp NULL DEFAULT NULL,
  `usageCount` int NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `embed_tokens_token_unique` (`token`)
) ENGINE=InnoDB AUTO_INCREMENT=30001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `revenue_goals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `year` int NOT NULL,
  `month` int NOT NULL,
  `targetAmount` decimal(10,2) NOT NULL,
  `notes` text COLLATE utf8mb4_bin,
  `createdBy` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `revenue_goals_year_month_idx` (`year`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;


-- Dropped 2026-07-27T22:42:04.231Z — coupons feature removed (client UI, router, db fns, schema defs all removed first)
CREATE TABLE `coupon_usage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `couponId` int NOT NULL,
  `clientProtocolId` int NOT NULL,
  `discountApplied` decimal(5,2) NOT NULL,
  `usedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `coupons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_bin NOT NULL,
  `discountPercent` decimal(5,2) NOT NULL,
  `usageType` enum('one_time','unlimited') COLLATE utf8mb4_bin NOT NULL DEFAULT 'unlimited',
  `scope` enum('universal','client_specific') COLLATE utf8mb4_bin NOT NULL DEFAULT 'universal',
  `clientProtocolId` int DEFAULT NULL,
  `expiresAt` timestamp NULL DEFAULT NULL,
  `maxUses` int DEFAULT NULL,
  `currentUses` int NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `isFlagged` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_bin,
  `createdBy` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `category` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL,
  `deactivationReason` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupons_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=30001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

