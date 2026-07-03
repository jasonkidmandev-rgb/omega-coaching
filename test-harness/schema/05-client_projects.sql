-- Test-DB schema — `client_projects`. Extracted from the prod snapshot, TiDB comments stripped.

CREATE TABLE `client_projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clientProtocolId` int DEFAULT NULL,
  `clientName` varchar(255) NOT NULL,
  `clientEmail` varchar(320) DEFAULT NULL,
  `workflowTemplateId` int DEFAULT NULL,
  `currentLifecycleStageId` int DEFAULT NULL,
  `status` enum('active','on_hold','completed','cancelled') NOT NULL DEFAULT 'active',
  `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  `startDate` timestamp NULL DEFAULT NULL,
  `targetEndDate` timestamp NULL DEFAULT NULL,
  `actualEndDate` timestamp NULL DEFAULT NULL,
  `assignedTeamMemberId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `contactId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_client_projects_contact` (`contactId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=690001;
