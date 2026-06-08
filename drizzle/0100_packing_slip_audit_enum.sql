-- Extend packing_slip_audit_log.action enum to include the 4 missing values:
-- 'shipping_updated', 'dimensions_updated', 'archived', 'restored'
-- These were added to schema.ts but were never added to the DB column, causing
-- constraint violations whenever archive/restore/shipping/dimensions mutations ran.

ALTER TABLE `packing_slip_audit_log`
  MODIFY COLUMN `action` ENUM(
    'created',
    'item_added',
    'item_removed',
    'item_status_changed',
    'regenerated',
    'signed',
    'locked',
    'unlocked',
    'bulk_locked',
    'bulk_unlocked',
    'auto_locked',
    'status_changed',
    'tracking_updated',
    'delivery_marked',
    'shipping_updated',
    'dimensions_updated',
    'archived',
    'restored'
  ) NOT NULL;
