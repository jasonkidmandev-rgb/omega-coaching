-- Migration 0115: External integration tables (omegalongevity.com purchase webhook)
-- 1. external_webhook_events: inbound event log with idempotency + replay support
-- 2. external_product_mappings: their product ID -> our protocol template / tier

CREATE TABLE IF NOT EXISTS `external_webhook_events` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `source` VARCHAR(50) NOT NULL DEFAULT 'omegalongevity',
  `eventId` VARCHAR(255) NOT NULL,
  `eventType` VARCHAR(100) NOT NULL,
  `payload` JSON NOT NULL,
  `status` ENUM('received','processed','failed','skipped') NOT NULL DEFAULT 'received',
  `errorMessage` TEXT,
  `enrollmentId` INT NULL,
  `clientProtocolId` INT NULL,
  `processedAt` TIMESTAMP NULL,
  `receivedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `external_webhook_events_source_event_idx` (`source`, `eventId`),
  KEY `external_webhook_events_status_idx` (`status`),
  KEY `external_webhook_events_received_idx` (`receivedAt`)
);

CREATE TABLE IF NOT EXISTS `external_product_mappings` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `source` VARCHAR(50) NOT NULL DEFAULT 'omegalongevity',
  `externalProductId` VARCHAR(255) NOT NULL,
  `externalProductName` VARCHAR(255) NULL,
  `protocolTemplateId` INT NULL,
  `tier` VARCHAR(100) NULL,
  `programType` VARCHAR(50) NULL DEFAULT '90_day_transformation',
  `isActive` TINYINT NOT NULL DEFAULT 1,
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `external_product_mappings_source_product_idx` (`source`, `externalProductId`)
);
