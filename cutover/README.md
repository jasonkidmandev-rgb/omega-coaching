# Cutover runbook — identity consolidation (Phase 2)

Single reference for the identity cutover: the state of the production data, the
files, the exact run order, and what still gates the live run.

_Data state as of the 2026-07-01 production snapshot (TiDB v8.5 serverless).
Full analysis: `local-data/phase2_analysis_report.txt` (gitignored, local-only)._

---

## State of the data (what we actually have)

| Table | Rows | Note |
|---|---:|---|
| contacts | 128 | **canonical**; `email` is already a real `UNIQUE KEY` |
| clients | 52 | legacy — to be dropped |
| users | 79 | auth — kept, FK'd to contacts |
| client_protocols | 118 | carries `contactId` (canonical) + legacy `clientId` |
| protocol_orders | 5 | |
| custom_orders | 42 | |
| transformation_enrollments | 39 | |
| prospects | 57 | |
| packing_slips | 78 | |
| client_projects | 25 | |
| appointments / client_packages | 0 / 0 | empty |
| protocol_comments | 976 | chat thread — Phase 3 re-key target |

**Identity health (the numbers that matter):**
- Duplicate normalized emails in `contacts`: **0** (UNIQUE already enforced).
- Blank `''` emails: **0**. NULL emails: 11 (phone-only leads — allowed).
- Orphaned `contactId` on all 10 FK tables: **0**.
- `contactId` backfill needed before NOT NULL: **8 rows** — 3 `client_protocols`,
  5 `protocol_orders`, 0 `custom_orders`. All resolved to an existing contact by
  email; **0 new contacts required, 0 unresolved.**
- Auth users with NULL `contactId`: **1** (`hayhaymonkey@icloud.com` → contact
  30002); links cleanly.
- `client_protocols.clientId` split: null 30 / clients 85 / users 3 / neither 0 →
  redundant, safe to drop.
- Emails that are both a client and a user: 34 (collapse targets).
- Chat (Phase 3): **957 / 976** comments re-keyable to a contact; 19 orphaned
  (parent protocol deleted).

**Rehearsal:** in-memory simulation applied the backfill then re-checked every
constraint precondition → **PASS** (0 dup emails, 0 FK orphans, 0 NULL on the 3
NOT NULL targets). See `local-data/phase2_backfill_resolution.txt`.

---

## Files & run order

Apply **once, manually, at cutover**, on fresh production data, in this order:

1. **`identity-backfill.sql`** — sets the 8 NULL `contactId`s + links the 1 auth
   user, all by deterministic email match. Idempotent (guarded by `IS NULL`).
2. **`identity-constraints.sql`**
   - STEP 1 — verify `contacts_email_unique` exists (no-op; already enforced).
   - STEP 2 — add the 10 `contactId` foreign keys (`ON DELETE RESTRICT`).
   - STEP 3 — **DESTRUCTIVE, gated:** `NOT NULL` on the 3 target tables, drop
     `client_protocols.clientId` + its two indexes, `DROP TABLE clients`. Run
     **only after** the app no longer reads/writes `clientId` (code change).

Regenerate the backfill from a newer dump: `python local-data/phase2_build.py`
(re-parses the snapshot, re-rehearses, rewrites `identity-backfill.sql`).

---

## What still gates the live run

**Ordered go-live steps are in [CUTOVER-RUNBOOK.md](CUTOVER-RUNBOOK.md).** Gate status:

1. ~~**App code must go `contactId`-only**~~ ✅ **DONE 2026-07-02** — definition-of-done
   grep gate MET (zero `clients` / `client_protocols.clientId` reads/writes).
2. **Client 360 removal (S1)** — relocate its `list`/`updateContact` to a contacts
   router; `mergeContacts` dies with it. Still to do (Jason directive).
3. **The live apply** — run the SQL against the Railway DB at the Manus→Railway switch,
   after a fresh Manus sync. Jason's sign-off is only for this real-data step (staging
   is ours). Not a separate outage — it's a step in the cutover.
4. ~~**Physical dress-rehearsal**~~ ✅ **DONE 2026-07-02** — the full sequence
   (backfill → constraints incl. STEP 3 → phase3) ran end-to-end on **MySQL 8.0.46 +
   the real snapshot**; all verify queries passed. Found + fixed the TiDB→MySQL FK-name
   collision (see runbook §1).

**Phase 3** (`protocol_comments` on `contactId`, 957/976 reconnect) — **DONE + verified**
(`phase3-chat-rekey.sql` rehearsed; chat code re-keyed incl. the coach inbox grouping —
one row per client; 4 integration tests + real-data validation). Only the go-live SQL
apply remains.

---

## local-data/ (gitignored — production PII, never committed)

- `peptidecoach_snapshot_20260701.sql` — the 86 MB mysqldump.
- `analyze_snapshot.py` → `phase2_analysis_report.txt` — the diagnostics.
- `phase2_build.py` → `phase2_backfill_resolution.txt` — resolver + rehearsal;
  generates `../identity-backfill.sql`.
