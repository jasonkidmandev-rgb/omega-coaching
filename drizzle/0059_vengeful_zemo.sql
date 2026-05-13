CREATE INDEX `client_protocol_items_protocol_idx` ON `client_protocol_items` (`clientProtocolId`);--> statement-breakpoint
CREATE INDEX `client_protocol_items_item_idx` ON `client_protocol_items` (`protocolItemId`);--> statement-breakpoint
CREATE INDEX `client_protocols_email_idx` ON `client_protocols` (`clientEmail`);--> statement-breakpoint
CREATE INDEX `client_protocols_status_idx` ON `client_protocols` (`status`);--> statement-breakpoint
CREATE INDEX `client_protocols_template_idx` ON `client_protocols` (`templateId`);--> statement-breakpoint
CREATE INDEX `client_protocols_program_idx` ON `client_protocols` (`programId`);--> statement-breakpoint
CREATE INDEX `email_events_protocol_idx` ON `email_events` (`clientProtocolId`);--> statement-breakpoint
CREATE INDEX `email_events_type_idx` ON `email_events` (`eventType`);--> statement-breakpoint
CREATE INDEX `email_events_recipient_idx` ON `email_events` (`recipientEmail`);--> statement-breakpoint
CREATE INDEX `inventory_transactions_item_idx` ON `inventory_transactions` (`inventoryItemId`);--> statement-breakpoint
CREATE INDEX `inventory_transactions_type_idx` ON `inventory_transactions` (`type`);--> statement-breakpoint
CREATE INDEX `inventory_transactions_created_idx` ON `inventory_transactions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`userId`,`isRead`);--> statement-breakpoint
CREATE INDEX `protocol_comments_protocol_idx` ON `protocol_comments` (`clientProtocolId`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_referral_code_idx` ON `users` (`referralCode`);