-- ============================================================================
-- Phase 4 — physical rename: contacts -> people, contactId -> personId
-- ============================================================================
-- Applied 2026-07-28 (code), physical rename DEFERRED to the cutover window.
--
-- CONTEXT
-- The application code was renamed on 2026-07-28: the Drizzle table is exported
-- as `people` and the FK column is `personId` everywhere. To avoid any deploy
-- coordination risk, the defs still POINT AT the old physical names:
--
--     export const people = mysqlTable("contacts", { ... })
--     personId: int("contactId")
--
-- So today: code says people/personId, the database still says contacts/contactId.
-- Both are correct and the app runs fine. This script closes that gap.
--
-- ⚠️  ORDERING — READ BEFORE RUNNING
-- This rename is NOT backward compatible with the deployed code. Renaming the
-- physical columns while the app still declares int("contactId") will cause
-- `Unknown column 'contactId'` on EVERY read of these tables (Drizzle expands
-- every declared column on a whole-table select).
--
-- Therefore run this ONLY as a paired operation, inside the maintenance window:
--   1. Apply this SQL.
--   2. IMMEDIATELY apply the companion code change (see bottom of this file).
--   3. Deploy.
-- Or skip it entirely — the mapping above is stable and can stay indefinitely.
-- There is no functional benefit to this script; it is purely so the physical
-- schema matches the vocabulary the code already uses.
--
-- Safe to run more than once? NO — RENAME/CHANGE fail if already applied.
-- Verify first with the check query at the bottom.
-- ============================================================================

-- 1. The person table itself
RENAME TABLE contacts TO people;

-- 2. The FK column on every table that references a person (13 tables)
ALTER TABLE appointments                CHANGE contactId personId INT NULL;
ALTER TABLE client_packages             CHANGE contactId personId INT NULL;
ALTER TABLE client_projects             CHANGE contactId personId INT NULL;
ALTER TABLE client_protocols            CHANGE contactId personId INT NOT NULL;
ALTER TABLE custom_orders               CHANGE contactId personId INT NOT NULL;
ALTER TABLE document_folders            CHANGE contactId personId INT NULL;
ALTER TABLE documents                   CHANGE contactId personId INT NULL;
ALTER TABLE packing_slips               CHANGE contactId personId INT NULL;
ALTER TABLE prospects                   CHANGE contactId personId INT NULL;
ALTER TABLE protocol_comments           CHANGE contactId personId INT NULL;
ALTER TABLE protocol_orders             CHANGE contactId personId INT NOT NULL;
ALTER TABLE saved_addresses             CHANGE contactId personId INT NULL;
ALTER TABLE transformation_enrollments  CHANGE contactId personId INT NULL;
ALTER TABLE users                       CHANGE contactId personId INT NULL;

-- 3. Companion CODE change to apply in the same window (drizzle/schema.ts):
--      mysqlTable("contacts", ...)  ->  mysqlTable("people", ...)
--      int("contactId")             ->  int()          (14 occurrences)
--    Also update the raw-SQL references that still name the physical table:
--      server/integrations/ghl/db.ts        (SELECT ... FROM contacts)
--      server/prospect/prospectRouter.ts    (SELECT ... FROM contacts)
--      server/transformation/transformationRouter.ts (LEFT JOIN contacts / UPDATE contacts)

-- ============================================================================
-- VERIFY (run BEFORE to confirm not yet applied, and AFTER to confirm success)
-- ============================================================================
-- SELECT TABLE_NAME, COLUMN_NAME
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND COLUMN_NAME IN ('contactId','personId')
-- ORDER BY TABLE_NAME;
--
-- Expect BEFORE: 14 rows, all contactId.  AFTER: 14 rows, all personId.
--
-- SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('contacts','people');
-- Expect BEFORE: contacts.  AFTER: people.
