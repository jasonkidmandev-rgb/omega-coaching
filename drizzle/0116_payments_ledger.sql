-- Migration 0116: Unified payments ledger (resilient payment layer)
-- A "logbook" recording one row per payment, pointing at the entity it settles
-- (protocol / coaching_plan / custom_order / store_order). Existing entities keep
-- their own paymentStatus; this table is the single cross-funnel money record and
-- the basis for Stripe<->manual failover.
-- See docs/design/2026-06-25-payment-layer-architecture.md

CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `entityType` ENUM('protocol','coaching_plan','custom_order','store_order') NOT NULL,
  `entityId` INT NOT NULL,
  `customerId` INT NULL,
  `customerEmail` VARCHAR(320) NULL,
  `customerName` VARCHAR(255) NULL,
  `amountCents` INT NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'usd',
  `processorLabel` VARCHAR(255) NULL,
  `status` ENUM('open','awaiting_confirmation','paid','failed','refunded','void') NOT NULL DEFAULT 'open',
  `method` VARCHAR(50) NULL,
  `externalRef` VARCHAR(255) NULL,
  `settledAt` TIMESTAMP NULL,
  `settledBy` INT NULL,
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payments_externalRef_unique` (`externalRef`),
  KEY `payments_entity_idx` (`entityType`, `entityId`),
  KEY `payments_status_idx` (`status`)
);
