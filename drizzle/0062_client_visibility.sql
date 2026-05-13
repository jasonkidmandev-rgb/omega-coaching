ALTER TABLE `client_protocols` ADD COLUMN `clientVisibility` enum('hidden','option','active','archived') NOT NULL DEFAULT 'active';
