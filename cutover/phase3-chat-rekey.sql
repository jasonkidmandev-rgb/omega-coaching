-- =============================================================================
-- IDENTITY CONSOLIDATION — Phase 3: continuous chat (protocol_comments re-key)
-- =============================================================================
-- Runs at cutover, AFTER Phase 2 (identity-backfill.sql + identity-constraints.sql).
-- Manual, once — NOT a Drizzle migration (not journaled).
--
-- WHY: protocol_comments is keyed on clientProtocolId (ONE protocol *version*). Each
-- new version is a new protocol row, so the chat thread fragments per version. Adding
-- contactId (the canonical identity, carried on every version) lets the app show ONE
-- continuous thread per client across all their protocol versions (CR-1).
--
-- STATE (2026-07-01 snapshot, re-verified on the MySQL-8 dress-rehearsal 2026-07-02):
--   976 comments total; 957 re-keyable (parent protocol has a contactId); 19 orphaned
--   (parent protocol deleted) — those stay contactId NULL, which the nullable FK allows.
-- =============================================================================

-- STEP 1 — add the column + index (additive, safe; can ship ahead of cutover).
ALTER TABLE protocol_comments
  ADD COLUMN contactId INT DEFAULT NULL AFTER clientProtocolId;
ALTER TABLE protocol_comments
  ADD INDEX protocol_comments_contact_idx (contactId);

-- STEP 2 — backfill contactId from each comment's parent protocol.
--          (957 rows; the 19 orphaned comments have no parent protocol → stay NULL.)
UPDATE protocol_comments pc
JOIN client_protocols cp ON cp.id = pc.clientProtocolId
SET pc.contactId = cp.contactId
WHERE pc.contactId IS NULL AND cp.contactId IS NOT NULL;

-- STEP 3 — enforce the FK (nullable; ON DELETE RESTRICT like the Phase 2 FKs).
ALTER TABLE protocol_comments
  ADD CONSTRAINT fk_protocol_comments_contact
  FOREIGN KEY (contactId) REFERENCES contacts(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- VERIFY:
--   SELECT COUNT(*) FROM protocol_comments WHERE contactId IS NOT NULL;  -- expect 957
--   SELECT COUNT(*) FROM protocol_comments pc LEFT JOIN client_protocols cp
--     ON cp.id=pc.clientProtocolId WHERE cp.id IS NULL;                  -- expect 19 (orphans)
-- After this + the Phase 3 code deploy, the chat thread is keyed on contactId and
-- carries across every protocol version.
-- =============================================================================
