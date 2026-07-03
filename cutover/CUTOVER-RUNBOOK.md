# Identity cutover — go-live runbook

The ordered, do-this-at-cutover checklist for the identity consolidation (Phases 2 + 3).
Companion to [README.md](README.md) (data state) and
[app-contactid-only-plan.md](app-contactid-only-plan.md) (the code work).

**Status of the prerequisites:**
- ✅ **App is `contactId`-only** — zero `clients` / `client_protocols.clientId`
  reads/writes (definition-of-done grep gate MET, 2026-07-02).
- ✅ **Physical dress-rehearsal PASSED** — the full sequence below was run end-to-end
  against a **real MySQL 8.0.46** loaded with the 2026-07-01 production snapshot
  (2026-07-02). Every verify query returned the expected value (see §5).
- ✅ **APPLIED TO THE RAILWAY STAGING DB 2026-07-02** — the full sequence (backfill →
  constraints STEP 2+3 → phase3) was run against the actual live-bound Railway staging
  database (`yamanote.proxy.rlwy.net:23584/railway`, **MySQL 9.4.0**), not just the local
  MySQL-8 copy. All §5 verify queries passed: `clients` dropped, `clientId`+2 indexes
  dropped, 11 contact FKs, email UNIQUE intact, 0 FK orphans; Phase 3 backfilled
  616/637 (21 NULL == 21 orphans exactly). Backfill was a **no-op** (staging was already
  fully contactId-populated). Targeted pre-backup of the destroyed objects:
  `local-data/railway_step3_backup_clients_and_protocols.sql` (gitignored).
  **⚠️ Staging is now schema-consolidated — any app pointed at it must be on the
  contactId-only code.** Full-DB dumps truncate over the Railway proxy; use per-table dumps.
- ⬜ **Only remaining gate:** run this against the **production**-bound database during the
  Manus → Railway cutover on a **fresh Manus sync**. **No separate approval needed for
  staging/dev** (done) — Jason's sign-off is only for applying it to real customer data at
  go-live.

---

## 0. Where this runs

Against the database HumanEdge/Railway will run on — **not** the live Manus TiDB
(division of labor: we don't apply destructive DDL to Jason's live system). At the
real cutover the Railway DB must first be refreshed from a **fresh Manus dump**
(Manus keeps adding customers, so the stale Railway snapshot is not enough).

---

## 1. The TiDB → MySQL gotcha (only if you re-import a dump)

The Manus dump is from **TiDB**. Loading a TiDB `mysqldump` into **MySQL 8** fails with:

```
ERROR 1826 (HY000): Duplicate foreign key constraint name 'fk_1'
```

TiDB names foreign keys `fk_1`, `fk_2`… **per table**; MySQL requires them unique
**per schema**. Fix before import (renames them globally unique; proven 2026-07-02):

```bash
awk '{ while (match($0, /CONSTRAINT `fk_[0-9]+`/)) { n++; \
  $0 = substr($0,1,RSTART-1) "CONSTRAINT `gfk_" n "`" substr($0,RSTART+RLENGTH) } print }' \
  dump.sql > dump_mysql8.sql
```

(The `/*T![clustered_index] CLUSTERED */` hints are harmless — MySQL ignores them. No
`AUTO_RANDOM` in this schema.) If Railway is kept in sync some other way, skip this.

---

## 2. Cutover steps (in order)

1. **Freeze writes.** Put the app in maintenance / stop accepting new
   orders/enrollments. (Brief — the data is small; the window is dominated by the
   sync + smoke test, not the migration.)
2. **Refresh the target DB** from a fresh Manus dump (apply §1 fix if TiDB→MySQL).
3. **Regenerate the backfill** against the fresh data — the "8 rows" figure drifts:
   ```bash
   python cutover/local-data/phase2_build.py   # re-parses dump, re-rehearses, rewrites identity-backfill.sql
   ```
4. **Backfill:** run `identity-backfill.sql` → **verify §5.A returns all zeros.**
5. **Constraints:** run `identity-constraints.sql` (STEP 1 verify → STEP 2 FKs →
   STEP 3 destructive) → **verify §5.B.**
6. **Phase 3 chat:** run `phase3-chat-rekey.sql` → **verify §5.C** (~957/976 backfilled).
7. **Deploy** the contactId-only app + Phase 3 code pointed at this DB.
8. **Smoke test** (§4).
9. **Unfreeze.**

> **Order matters — Phase 3 code needs the column.** The app now reads/writes
> `protocol_comments.contactId`, so `phase3-chat-rekey.sql` (at least STEP 1, the
> additive `ADD COLUMN`) must run **before** the Phase 3 code is deployed to *any* DB —
> including **staging**. The column is nullable and safe to add ahead of time; the
> backfill (STEP 2) and FK (STEP 3) can follow. If you deploy the code against a DB
> without the column, comment reads/writes will error on the unknown column.

---

## 3. Rollback

- **Before STEP 3 (steps 4–5 STEP 2):** trivial — `DROP` the 10 FK constraints; the
  backfill is idempotent and harmless (only filled NULLs).
- **After STEP 3 (clientId/clients dropped):** not reversible in place — restore the
  target DB from the pre-cutover dump taken in step 2. (Keep that dump until the new
  system is confirmed healthy.)

---

## 4. Smoke test after deploy

- Admin: create a protocol for a new email → contact + protocol created, no error.
- Onboarding: run a coaching enrollment through → contact linked, project created.
- **Chat continuity (Phase 3):** open a client who has ≥2 protocol versions → the
  chat shows one continuous thread across versions; send a message → it appears;
  mark-read clears the unread badge.
- **Coach inbox:** shows one row per client (not per protocol version); the preview =
  their latest message, the badge = unread across the whole thread.

---

## 5. Verify queries (each proven on the 2026-07-02 rehearsal)

**A. After backfill — all zero:**
```sql
SELECT COUNT(*) FROM client_protocols WHERE contactId IS NULL;   -- 0
SELECT COUNT(*) FROM protocol_orders  WHERE contactId IS NULL;   -- 0
SELECT COUNT(*) FROM custom_orders    WHERE contactId IS NULL;   -- 0
SELECT COUNT(*) FROM users            WHERE contactId IS NULL;   -- 0
SELECT LOWER(TRIM(email)) e, COUNT(*) c FROM contacts
  WHERE email IS NOT NULL AND TRIM(email)<>'' GROUP BY e HAVING c>1;  -- 0 rows
```

**B. After constraints (STEP 3) — expected values:**
```sql
-- clients table gone (0), clientId column gone (0), both indexes gone (0),
-- 10 contact FKs present, email UNIQUE intact (1), contactId NOT NULL on 3 tables.
SELECT COUNT(*) FROM information_schema.tables  WHERE table_schema=DATABASE() AND table_name='clients';                  -- 0
SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='client_protocols' AND column_name='clientId'; -- 0
SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND constraint_type='FOREIGN KEY' AND constraint_name LIKE 'fk_%_contact'; -- 10
```

**C. After Phase 3:**
```sql
SELECT COUNT(*) FROM protocol_comments WHERE contactId IS NOT NULL;   -- ~957 (re-keyable)
SELECT COUNT(*) FROM protocol_comments pc LEFT JOIN client_protocols cp
  ON cp.id=pc.clientProtocolId WHERE cp.id IS NULL;                   -- ~19 (orphans, stay NULL)
```

---

## 6. Files

| File | Purpose |
|---|---|
| `identity-backfill.sql` | fill the 8 NULL contactIds + link the 1 orphan user |
| `identity-constraints.sql` | STEP 1 verify · STEP 2 add 10 FKs · STEP 3 destructive (NOT NULL, drop clientId, DROP TABLE clients) |
| `phase3-chat-rekey.sql` | add `protocol_comments.contactId` + backfill + FK (continuous chat) |
| `local-data/phase2_build.py` | regenerate `identity-backfill.sql` from a fresh dump |

_Dress-rehearsal DB (local, disposable): `docker rm -f pc-cutover-rehearsal` to tear
down. The renamed dump `local-data/snapshot_mysql8.sql` is gitignored (PII)._
