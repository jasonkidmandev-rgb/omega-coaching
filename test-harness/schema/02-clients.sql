-- Test-DB schema — `clients`. Extracted from the prod snapshot, TiDB comments stripped.
-- Regenerate: see test-harness/README.md (Extending the schema).

CREATE TABLE `clients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(320) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `shippingName` varchar(255) DEFAULT NULL,
  `shippingStreet` varchar(500) DEFAULT NULL,
  `shippingCity` varchar(255) DEFAULT NULL,
  `shippingState` varchar(100) DEFAULT NULL,
  `shippingZip` varchar(20) DEFAULT NULL,
  `shippingCountry` varchar(100) DEFAULT 'USA',
  `shippingPhone` varchar(50) DEFAULT NULL,
  `ghlContactId` varchar(100) DEFAULT NULL,
  `referralSource` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `tags` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `archivedAt` timestamp NULL DEFAULT NULL,
  `deletedAt` timestamp NULL DEFAULT NULL,
  `isActiveInProjects` tinyint(1) NOT NULL DEFAULT '0',
  `clientProjectId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `clients_email_idx` (`email`),
  KEY `clients_name_idx` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=870001;
