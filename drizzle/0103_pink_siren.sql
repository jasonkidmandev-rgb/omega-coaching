ALTER TABLE `protocol_comments` ADD `emailUid` varchar(100);--> statement-breakpoint
CREATE INDEX `protocol_comments_email_uid_idx` ON `protocol_comments` (`emailUid`);