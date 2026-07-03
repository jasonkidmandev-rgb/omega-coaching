-- Test-DB schema — `protocol_comments` (the chat thread). Extracted from the prod
-- snapshot, TiDB comments stripped, plus the identity-consolidation Phase 3 `contactId`
-- column (so the continuous-thread code can be characterized). Regenerate: see
-- test-harness/README.md (Extending the schema).

CREATE TABLE `protocol_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clientProtocolId` int NOT NULL,
  `contactId` int DEFAULT NULL,
  `authorType` enum('coach','client') NOT NULL,
  `authorName` varchar(255) DEFAULT NULL,
  `message` text NOT NULL,
  `loomUrl` text,
  `isRead` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `emailUid` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `protocol_comments_protocol_idx` (`clientProtocolId`),
  KEY `protocol_comments_contact_idx` (`contactId`),
  KEY `protocol_comments_email_uid_idx` (`emailUid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=5040001;
