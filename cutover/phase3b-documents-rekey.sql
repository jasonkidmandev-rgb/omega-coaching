-- =============================================================================
-- IDENTITY CONSOLIDATION — Phase 3b: continuous documents (documents re-key)
-- =============================================================================
-- Runs at cutover, AFTER Phase 2 (identity-backfill.sql + identity-constraints.sql).
-- Manual, once — NOT a Drizzle migration (not journaled). Mirrors phase3-chat-rekey.sql.
--
-- WHY: documents is keyed on clientProtocolId (ONE protocol *version*). On renewal a
-- new version is a new protocol row, so a client's uploaded files (labs, waivers,
-- paperwork) stay stranded on the archived version and vanish from their active
-- protocol — Jason's "all the Documents were reset to zero". This is the exact bug
-- Phase 3 fixed for chat. Adding contactId (the canonical identity, carried on every
-- version) lets the app show ONE document library per client across all versions, and
-- automatically reunites already-stranded files — no separate repair pass.
--
-- STATE (2026-07-19 snapshot against Railway prod):
--   16 documents total; 15 re-keyable (parent protocol has a contactId); 1 orphaned
--   (parent protocol deleted) — stays contactId NULL, which the nullable FK allows.
--   4 of the 15 currently sit on an archived version and will reunite with the
--   contact's active version the moment reads key on contactId.
-- NOTE: re-verify these counts against the FRESH Manus sync at cutover before running.
-- =============================================================================

-- STEP 1 — add the column + index (additive, safe; can ship ahead of cutover).
ALTER TABLE documents
  ADD COLUMN contactId INT DEFAULT NULL AFTER clientProtocolId;
ALTER TABLE documents
  ADD INDEX documents_contact_idx (contactId);

-- STEP 2 — backfill contactId from each document's parent protocol.
--          (15 rows; the 1 orphaned document has no parent protocol → stays NULL.)
UPDATE documents d
JOIN client_protocols cp ON cp.id = d.clientProtocolId
SET d.contactId = cp.contactId
WHERE d.contactId IS NULL AND cp.contactId IS NOT NULL;

-- STEP 3 — enforce the FK (nullable; ON DELETE RESTRICT like the Phase 2/3 FKs).
ALTER TABLE documents
  ADD CONSTRAINT fk_documents_contact
  FOREIGN KEY (contactId) REFERENCES contacts(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- VERIFY:
--   SELECT COUNT(*) FROM documents WHERE contactId IS NOT NULL;            -- expect 15
--   SELECT COUNT(*) FROM documents d LEFT JOIN client_protocols cp
--     ON cp.id=d.clientProtocolId WHERE cp.id IS NULL;                     -- expect 1 (orphan)
-- After this + the Phase 3b code deploy, a client's document library is keyed on
-- contactId and carries across every protocol version (labs/waivers no longer vanish
-- on renewal).
-- =============================================================================
