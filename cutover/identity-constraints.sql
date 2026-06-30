-- =============================================================================
-- IDENTITY CONSOLIDATION — cutover constraints  (authored 2026-06-30, B5)
-- =============================================================================
--
-- DO NOT RUN THIS IN THE NORMAL DEPLOY FLOW.
--
-- This file is intentionally NOT a Drizzle migration: it is not listed in
-- drizzle/meta/_journal.json, so `drizzle-kit migrate` (the `db:push` script)
-- will never pick it up. It is applied MANUALLY, ONCE, at cutover — after the
-- one-time data dedup — on the fresh production database.
--
-- Why it can't run today: the current staging snapshot has duplicate normalized
-- emails (a 21-row phone-collision cluster, plus case/whitespace variants) and
-- NULL contactId gaps. UNIQUE(email) and the FKs below would fail immediately on
-- that dirty data. They are safe only after Phase 2 dedup + backfill.
--
-- Background / decisions: docs/design/2026-06-30-identity-consolidation.md
--
-- -----------------------------------------------------------------------------
-- PRECONDITIONS (verify each returns ZERO rows before running the matching step)
-- -----------------------------------------------------------------------------
-- 1. No duplicate non-null emails (case-insensitive):
--      SELECT LOWER(TRIM(email)) e, COUNT(*) c FROM contacts
--      WHERE email IS NOT NULL AND email <> ''
--      GROUP BY e HAVING c > 1;
--
-- 2. Every contactId value points at a real contact (run per table in STEP 2):
--      SELECT t.contactId FROM <table> t
--      LEFT JOIN contacts c ON c.id = t.contactId
--      WHERE t.contactId IS NOT NULL AND c.id IS NULL;
--
-- 3. For any column being set NOT NULL in STEP 3, no NULLs remain:
--      SELECT COUNT(*) FROM client_protocols WHERE contactId IS NULL;
--
-- Run each STEP only after its preconditions pass. Steps are ordered; do not
-- reorder. STEP 3 is destructive and gated on the app already being
-- contactId-only (clientId no longer read/written anywhere).
-- =============================================================================


-- =============================================================================
-- STEP 1 — Make verified email the unique identity key
-- -----------------------------------------------------------------------------
-- `contacts_email_unique` exists today but is a PLAIN index (misnamed). Replace
-- it with a real UNIQUE index. Email stays nullable on purpose: phone-only
-- records remain pre-client "leads" (multiple NULLs are allowed by MySQL UNIQUE)
-- until an email is captured at client conversion.
-- =============================================================================

ALTER TABLE contacts DROP INDEX contacts_email_unique;
ALTER TABLE contacts ADD UNIQUE INDEX contacts_email_unique (email);


-- =============================================================================
-- STEP 2 — Enforce contactId as a real foreign key to contacts(id)
-- -----------------------------------------------------------------------------
-- All 10 client-related tables that carry contactId. ON DELETE RESTRICT: a
-- contact that is still referenced cannot be deleted (the canonical identity is
-- never silently orphaned; dedup repoints references BEFORE deleting a secondary
-- contact, which is why this is safe only post-dedup). FKs allow NULL — STEP 3
-- adds NOT NULL only to the client-stage tables.
-- =============================================================================

ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_contact
  FOREIGN KEY (contactId) REFERENCES contacts(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE client_packages
  ADD CONSTRAINT fk_client_packages_contact
  FOREIGN KEY (contactId) REFERENCES contacts(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE client_projects
  ADD CONSTRAINT fk_client_projects_contact
  FOREIGN KEY (contactId) REFERENCES contacts(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE client_protocols
  ADD CONSTRAINT fk_client_protocols_contact
  FOREIGN KEY (contactId) REFERENCES contacts(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE custom_orders
  ADD CONSTRAINT fk_custom_orders_contact
  FOREIGN KEY (contactId) REFERENCES contacts(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE packing_slips
  ADD CONSTRAINT fk_packing_slips_contact
  FOREIGN KEY (contactId) REFERENCES contacts(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE prospects
  ADD CONSTRAINT fk_prospects_contact
  FOREIGN KEY (contactId) REFERENCES contacts(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE protocol_orders
  ADD CONSTRAINT fk_protocol_orders_contact
  FOREIGN KEY (contactId) REFERENCES contacts(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE transformation_enrollments
  ADD CONSTRAINT fk_transformation_enrollments_contact
  FOREIGN KEY (contactId) REFERENCES contacts(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE users
  ADD CONSTRAINT fk_users_contact
  FOREIGN KEY (contactId) REFERENCES contacts(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;


-- =============================================================================
-- STEP 3 — DESTRUCTIVE. Run ONLY after the app is confirmed contactId-only
--          (clientId no longer read or written) and STEP-3 preconditions pass.
-- -----------------------------------------------------------------------------
-- Tighten client-stage records to require a contact, then retire the legacy
-- `clients` identity. Keep this last so a rollback before this point is trivial
-- (just DROP the constraints from steps 1-2).
-- =============================================================================

-- 3a. Client-stage records must have a contact (verify zero NULLs first).
ALTER TABLE client_protocols MODIFY contactId INT NOT NULL;
ALTER TABLE protocol_orders  MODIFY contactId INT NOT NULL;
ALTER TABLE custom_orders    MODIFY contactId INT NOT NULL;

-- 3b. Retire the legacy clients-identity column on client_protocols.
--     (Drop dependent indexes first.)
ALTER TABLE client_protocols DROP INDEX client_protocols_client_id_idx;
ALTER TABLE client_protocols DROP INDEX client_protocols_client_active_idx;
ALTER TABLE client_protocols DROP COLUMN clientId;

-- 3c. Drop the legacy clients table entirely. Its identity has been collapsed
--     into contacts during Phase 2 dedup; nothing should reference it anymore.
DROP TABLE IF EXISTS clients;

-- =============================================================================
-- END. After this runs, contacts is the sole canonical identity, verified email
-- is unique, and every client-related row is FK-bound to a contact.
-- =============================================================================
