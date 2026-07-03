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
7. **SMS/Push cleanup (T9/R16):** run `drop-sms-push.sql`. Independent of the identity
   steps — drops the retired `sms_*`/`push_*` tables + orphaned columns. **Keeps
   `prospects.smsOptOut`** (still a do-not-contact filter). See manifest §C.
8. **Deploy** the app pointed at this DB (contactId-only + Phase 3 chat + T9 removal).
   **In the same deploy, delete the drizzle defs** for every object dropped in steps 5 & 7
   (see the manifest's "drizzle def to remove" column) so schema.ts matches the DB.
9. **Smoke test** (§4).
10. **Unfreeze.**

> **Order matters — Phase 3 code needs the column.** The app now reads/writes
> `protocol_comments.contactId`, so `phase3-chat-rekey.sql` (at least STEP 1, the
> additive `ADD COLUMN`) must run **before** the Phase 3 code is deployed to *any* DB —
> including **staging**. The column is nullable and safe to add ahead of time; the
> backfill (STEP 2) and FK (STEP 3) can follow. If you deploy the code against a DB
> without the column, comment reads/writes will error on the unknown column.

---

## 2·5 Complete schema-change manifest — every DROP / ADD, and why

**This is the exhaustive list of DDL the cutover applies.** If a step here surprises you
at the window, read the reason column first. Nothing below runs in the normal deploy flow —
all of it is manual, once, at the window, on the freshly-synced DB.

**Why these are deferred to the window (and not done in code / on a live deploy):**
- **Destructive / irreversible.** Drops, `NOT NULL`, and FKs can't be undone in place — a
  mistake means restoring the whole DB from the pre-cutover dump.
- **The DB is refreshed from a fresh Manus dump at go-live.** Manus is still the live
  system and **still has every legacy table/column** — we only removed the app *code*, never
  touched Manus's schema. So all of this legacy schema **returns** after the sync and must be
  dropped *after* it. That is the core reason these live in SQL files, not in the codebase.
- **Drizzle defs are kept on purpose until this runs.** The table/column definitions in
  `drizzle/schema.ts` + `drizzle/relations.ts` for everything being dropped are left in place
  so the ORM schema **matches the live DB** (which still has them until this runs). Removing a
  def while its table still exists risks `drizzle-kit generate/push` emitting a **surprise
  `DROP`** outside this window. Rule: **delete each def in the same deploy that runs its drop**
  (step 8). This is the same approach used for the legacy `clients` table.

### A. Identity consolidation — files: `identity-backfill.sql` → `identity-constraints.sql`

| Change | Object | Reason | Drizzle def to remove |
|---|---|---|---|
| **backfill** | `contactId` on `client_protocols`, `protocol_orders`, `custom_orders`, `users` (fill NULLs) | app is contactId-only; must be non-null before the FK / NOT NULL below | — (already canonical) |
| **backfill** | insert `contacts` rows for orphan auth users | every identity needs one canonical contact | — |
| **ADD FK** | 10 tables `contactId → contacts(id)` ON DELETE RESTRICT (`appointments, client_packages, client_projects, client_protocols, custom_orders, packing_slips, prospects, protocol_orders, transformation_enrollments, users`) | make contact the enforced canonical identity; never silently orphaned | — |
| **NOT NULL** | `client_protocols.contactId`, `protocol_orders.contactId`, `custom_orders.contactId` | client-stage rows must have a contact | — |
| **DROP INDEX** | `client_protocols_client_id_idx`, `client_protocols_client_active_idx` | depend on `clientId`, which is being dropped | — |
| **DROP COLUMN** | `client_protocols.clientId` | retire the legacy overloaded (40%-null, colliding) identity key | remove `clientId` field from `clientProtocols` |
| **DROP TABLE** | `clients` | legacy identity fully collapsed into `contacts`; app no longer reads it | remove `clients` table + its relations |

### B. Continuous chat / CR-1 — file: `phase3-chat-rekey.sql`

| Change | Object | Reason | Drizzle def |
|---|---|---|---|
| **ADD COLUMN + INDEX** | `protocol_comments.contactId` (+ `protocol_comments_contact_idx`) | thread follows the contact across all protocol versions (CR-1). **Additive — already in `schema.ts`; must exist before Phase 3 code runs on any DB, incl. staging** | already present (keep) |
| **backfill** | `protocol_comments.contactId` from each comment's parent protocol | existing comments join the unified thread (~957/976; 19 orphans stay NULL) | — |
| **ADD FK** | `fk_protocol_comments_contact` (nullable, ON DELETE RESTRICT) | enforce the new key | — |

### C. SMS + Push removal / T9 + R16 — file: `drop-sms-push.sql`

| Change | Object | Reason | Drizzle def to remove |
|---|---|---|---|
| **DROP TABLE** | `push_notification_logs` **then** `push_subscriptions` (FK order) | web-push never shipped; tables fully orphaned | remove both defs |
| **DROP TABLE** | `sms_messages`, `sms_conversations`, `sms_message_log`, `sms_settings`, `sms_templates`, `incoming_sms` | Twilio SMS sender removed earlier; T9 removed the last readers | remove all defs + relations |
| **DROP COLUMN** | `appointments.sms24hSent`, `appointments.sms1hSent`, `appointments.smsOptIn` | dead SMS-reminder cadence columns (0 code refs) | remove those fields |
| **DROP COLUMN** | `prospects.totalSmsSent` | SMS-sent counter; CRM display removed in T9 | remove field |
| **DROP COLUMN** | `users.receiveSmsNotifications`, `users.pushSubscription`, `users.pushEnabledTypes`, `users.enabledSmsNotificationTypes` | orphaned SMS/Push preference columns | remove those fields |
| **⚠️ KEEP** | `prospects.smsOptOut` | **do NOT drop** — still a do-not-contact compliance filter in `routers.ts` + `shannonDailyPipelineCron.ts`. Outlives SMS as a general "do not contact" flag | keep |
| **optional** | strip `'sms'`/`'push'` values from enums (`preferredContactMethod`, automation `action_type`, notifications `channel`, `event_type`) | tidiness only — harmless to leave; no code writes them | left commented in the SQL |

### D. Other feature removals — noted, SQL not yet written (see docs OPEN-ITEMS §4)

Sequence these into the same window when their owning change lands; each is destructive.

| Object | Reason | Status |
|---|---|---|
| `revenue_goals` (table) | feature removed | ready to drop |
| `consultation_notes` (table) | feature removed | ready to drop |
| `coupons` + `coupon_usage` (tables) | Coupons removal (R7) | **blocked — pending Jason's R7 decision**; client checkout box still live |

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
| `drop-sms-push.sql` | drop retired `sms_*`/`push_*` tables + orphaned columns (T9/R16); keeps `prospects.smsOptOut` |
| `local-data/phase2_build.py` | regenerate `identity-backfill.sql` from a fresh dump |

_Dress-rehearsal DB (local, disposable): `docker rm -f pc-cutover-rehearsal` to tear
down. The renamed dump `local-data/snapshot_mysql8.sql` is gitignored (PII)._
