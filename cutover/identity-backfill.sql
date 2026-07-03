-- =============================================================================
-- IDENTITY CONSOLIDATION — Phase 2 backfill  (generated 2026-07-02)
-- =============================================================================
-- Run this ONCE at cutover, on fresh data, BEFORE identity-constraints.sql STEP 3
-- (the NOT NULL / drop steps). Generated from the 2026-07-01 snapshot analysis;
-- re-run phase2_build.py against a fresh dump to regenerate if data changed.
--
-- Each UPDATE is email-deterministic and idempotent (guarded by contactId IS NULL).
-- Verified in an in-memory rehearsal: after this runs, UNIQUE(email) + the 10
-- contactId FKs + the 3 NOT NULL targets all apply with ZERO violations.
-- =============================================================================

-- 1) client_protocols.contactId  (NOT NULL target) — resolves 3 row(s)
UPDATE client_protocols cp
JOIN contacts c ON LOWER(TRIM(cp.clientEmail)) = LOWER(TRIM(c.email))
SET cp.contactId = c.id
WHERE cp.contactId IS NULL AND cp.clientEmail IS NOT NULL AND TRIM(cp.clientEmail) <> '';

-- fallback via legacy clientId -> clients.email (only if any remain)
UPDATE client_protocols cp
JOIN clients cl ON cl.id = cp.clientId
JOIN contacts c ON LOWER(TRIM(cl.email)) = LOWER(TRIM(c.email))
SET cp.contactId = c.id
WHERE cp.contactId IS NULL;

-- 2) protocol_orders.contactId  (NOT NULL target) — resolves the NULL orders
UPDATE protocol_orders po
JOIN contacts c ON LOWER(TRIM(po.clientEmail)) = LOWER(TRIM(c.email))
SET po.contactId = c.id
WHERE po.contactId IS NULL;

-- fallback via parent client_protocol (after step 1)
UPDATE protocol_orders po
JOIN client_protocols cp ON cp.id = po.clientProtocolId
SET po.contactId = cp.contactId
WHERE po.contactId IS NULL AND cp.contactId IS NOT NULL;

-- 3) custom_orders.contactId  (NOT NULL target) — 0 NULL in snapshot; guard anyway
UPDATE custom_orders co
JOIN contacts c ON LOWER(TRIM(co.clientEmail)) = LOWER(TRIM(c.email))
SET co.contactId = c.id
WHERE co.contactId IS NULL;

-- 4) users.contactId — link auth accounts to their contact by email
UPDATE users u
JOIN contacts c ON LOWER(TRIM(u.email)) = LOWER(TRIM(c.email))
SET u.contactId = c.id
WHERE u.contactId IS NULL AND u.email IS NOT NULL;

-- Any user whose email is NOT yet a contact: create one, then link.
INSERT INTO contacts (first_name, email, lifecycle_stage, source, created_at, updated_at)
SELECT COALESCE(NULLIF(SUBSTRING_INDEX(u.name,' ',1),''), 'Account'),
       u.email, 'active_client', 'phase2-user-backfill', NOW(), NOW()
FROM users u
WHERE u.contactId IS NULL AND u.email IS NOT NULL AND TRIM(u.email) <> ''
  AND NOT EXISTS (SELECT 1 FROM contacts c
                  WHERE LOWER(TRIM(c.email)) = LOWER(TRIM(u.email)));
UPDATE users u
JOIN contacts c ON LOWER(TRIM(u.email)) = LOWER(TRIM(c.email))
SET u.contactId = c.id
WHERE u.contactId IS NULL AND u.email IS NOT NULL;

-- =============================================================================
-- VERIFY (each must return 0) — then proceed to identity-constraints.sql
-- =============================================================================
-- SELECT COUNT(*) FROM client_protocols WHERE contactId IS NULL;
-- SELECT COUNT(*) FROM protocol_orders  WHERE contactId IS NULL;
-- SELECT COUNT(*) FROM custom_orders    WHERE contactId IS NULL;
-- SELECT LOWER(TRIM(email)) e, COUNT(*) c FROM contacts
--   WHERE email IS NOT NULL AND TRIM(email) <> '' GROUP BY e HAVING c > 1;
