-- =============================================================================
-- T9 — Retire SMS + Push notification storage  (authored 2026-07-03)
-- =============================================================================
--
-- DO NOT RUN THIS IN THE NORMAL DEPLOY FLOW.
--
-- Like cutover/identity-constraints.sql, this is a MANUAL, un-journaled script
-- (not in drizzle/meta/_journal.json, so `drizzle-kit migrate` never picks it up).
-- Run it ONCE, at the cutover maintenance window, AFTER the T9 code removal is
-- deployed (the app no longer reads or writes any of these tables/columns).
--
-- BACKGROUND: the Twilio SMS sender + web-push were removed earlier; T9 (2026-07-03)
-- removed the last app code that touched the SMS storage (prospect SMS history, the
-- "SMS Sent" CRM stats, the dead "Send SMS" toggles). These tables/columns are now
-- orphaned. Drop them here. The drizzle table/column DEFINITIONS in drizzle/schema.ts
-- and drizzle/relations.ts are intentionally kept until this runs (same approach as
-- the legacy `clients` table) — remove them from the schema in the same change.
--
-- KEPT ON PURPOSE (do NOT drop):
--   * prospects.smsOptOut — still used as a do-not-contact compliance filter in the
--     follow-up queries (server/routers.ts, server/cron/shannonDailyPipelineCron.ts).
--     It outlives SMS as a general "do not contact this prospect" flag.
--
-- Column names are camelCase in this DB (e.g. `totalSmsSent`); table names are
-- snake_case (e.g. `sms_messages`). MySQL has no DROP COLUMN IF EXISTS, so run once.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Drop the SMS + Push tables.
--    push_notification_logs has an FK to push_subscriptions → drop it first.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS push_notification_logs;
DROP TABLE IF EXISTS push_subscriptions;

DROP TABLE IF EXISTS sms_messages;
DROP TABLE IF EXISTS sms_conversations;
DROP TABLE IF EXISTS sms_message_log;
DROP TABLE IF EXISTS sms_settings;
DROP TABLE IF EXISTS sms_templates;
DROP TABLE IF EXISTS incoming_sms;


-- -----------------------------------------------------------------------------
-- 2. Drop the orphaned SMS/Push columns (verified zero code references at T9).
-- -----------------------------------------------------------------------------
-- appointments — dead SMS-reminder cadence columns
ALTER TABLE appointments DROP COLUMN sms24hSent;
ALTER TABLE appointments DROP COLUMN sms1hSent;
ALTER TABLE appointments DROP COLUMN smsOptIn;

-- prospects — SMS-sent counter (smsOptOut is intentionally KEPT, see header)
ALTER TABLE prospects DROP COLUMN totalSmsSent;

-- users — SMS/Push notification preference columns
ALTER TABLE users DROP COLUMN receiveSmsNotifications;
ALTER TABLE users DROP COLUMN pushSubscription;
ALTER TABLE users DROP COLUMN pushEnabledTypes;
ALTER TABLE users DROP COLUMN enabledSmsNotificationTypes;


-- -----------------------------------------------------------------------------
-- 3. OPTIONAL — remove the now-unused 'sms'/'push' values from enums.
--    Harmless to leave (no code writes them). Only worth doing for tidiness; each
--    is an ALTER ... MODIFY of the full enum. Left commented — enable if desired.
-- -----------------------------------------------------------------------------
--   * contacts/leads.preferredContactMethod  enum('email','phone','sms')  → drop 'sms'
--   * automation action_type                 enum(...,'sms')              → drop 'sms'
--   * notifications channel                  enum('in_app','email','sms','push') → drop 'sms','push'
--   * prospect_engagement event_type         enum(...,'sms_link_click',...) → drop 'sms_link_click'

-- =============================================================================
-- END. After this runs, no SMS/Push storage remains except prospects.smsOptOut
-- (kept as a do-not-contact flag). Also delete the matching table/column defs from
-- drizzle/schema.ts + drizzle/relations.ts in the same change.
-- =============================================================================
