# App → contactId-only — staged execution plan

**Goal:** make the app stop reading/writing `client_protocols.clientId` and the
`clients` table, so the destructive STEP 3 of `identity-constraints.sql` (drop
`clientId`, `DROP TABLE clients`) is safe to run.

**Build on:** typed helpers that already exist —
`server/contacts/contactsHelper.ts` (`getContactById`, `getContactByEmail`,
`findOrCreateContact`) and `server/contacts/contactService.ts`
(`findOrCreateContact`, `upgradeContactLifecycle`, `updateContactInfo`). The
rewrite routes identity through these instead of `clients`.

---

## Status (2026-07-02) — executed so far

**Integration net:** `pnpm test:integration` → **19 tests / 4 files, green** on real
MySQL 8:
- `contactService.integration.test.ts` (7) — the target `findOrCreateContact`.
- `clientProvisioning.integration.test.ts` (4) — **S2** `autoCreateOrLinkClient`
  (contactId-only behavior + shipping-on-protocol).
- `clients-crud.integration.test.ts` (5) — the `clients` write contract (case-
  sensitive email quirk vs contacts).
- `protocol-versions.integration.test.ts` (3) — contactId-keyed version grouping +
  `createNewProtocolVersionFromProtocol` supersedes by contactId (no clientId written).

**Ratchet re-baselined 755 → 750** after the version-fn removals (fewer type errors).

**✅ APP IS NOW `contactId`-ONLY — definition-of-done gate MET (2026-07-02).** The
grep gate returns zero production hits for both families (clients-table access +
`client_protocols.clientId` reads/writes); the only matches are doc comments and
test assertions. **The destructive cutover STEP 3 (drop `clientId`, `DROP TABLE
clients`) is now safe to run.**

**Executed (integration green throughout):** S4 (cron removed) · S2
(autoCreateOrLinkClient) · S3 (dead project block removed) · **S5 (all of it)** ·
**S6 (clients CRUD deleted + grep gate)**. Details in S5/S6 below.

**Not separately characterized, by design:** S1 (mergeContacts/Client 360 — being
removed), the S3/S5 orchestration wiring (typed → tsc-guarded), rows G/I (low-risk
typed reads). The nightly-cron characterization test was deleted along with the cron.

See each stage below for detail; **▶ what's left is in S5 (version callers + dupes)
and S6.**

## Architectural north star (what every stage refactors toward)

The stack already has the right tools — tRPC = controllers, Zod = validation,
Drizzle = the ORM that keeps the DB safe. The debt is that logic leaked out of
them into raw SQL and identity has no owner. So each stage moves code toward:

1. **One canonical contact service.** Collapse the two `findOrCreateContact`
   implementations (`contactService.ts` + `contactsHelper.ts`) into a single
   module that is the *only* place a person is found/created/linked. Everything
   else calls it — no ad-hoc identity resolution.
2. **ORM, not raw SQL.** Replace `database.execute(sql\`...\`)` and **name-based
   joins** (`JOIN clients ON name`) with typed Drizzle queries keyed on
   `contactId`. Raw SQL stays only for genuinely set-based ops that Drizzle can't
   express, and even then keyed on ids, never display strings.
3. **Validated at the edge.** Identity inputs (email/phone/name) validated by Zod
   in the procedure, normalized once (trim+lower email) before they reach the
   service — so the DB's UNIQUE(email) is a backstop, not the first line.
4. **A behavioral test per rewritten path** (see audit below) — the net that lets
   this happen safely and stays green through future change.

This is consolidation onto tools you already have, done *inside* S1–S6 — **not** a
separate big-bang rewrite (which would carry the same risk over more surface).

---

## ⚠️ Verification reality (read first)

Most of the coupling lives in **raw `database.execute(sql\`...\`)`** on the **live
client-onboarding path**, often joined by **name** (`JOIN clients c ON c.name =
cp.clientName`). The tsc ratchet only covers typed code — it will **not** catch a
broken raw-SQL rewrite. There is no runtime harness in this workspace (needs the
app + a TiDB/MySQL DB).

**RESOLVED (2026-07-02):** an integration harness now runs real code against a real
MySQL 8 (see `test-harness/` + `TESTING.md`). Verification approach per stage =
**characterize the path with an integration test first, then refactor and keep it
green**, backed by the tsc ratchet and (for set-based migration queries)
query-rehearsal on the snapshot. Harness proven: 10/10 green including S2's
characterization. So the rewrites are no longer "blind."

---

## Test-coverage audit of the identity paths (2026-07-02)

Audited every `.test.ts` touching identity. **Behavioral/runtime coverage of the
identity paths is effectively ZERO.** The suite is real files with real assertions
— but of the wrong kind:

| Style | What it asserts | Example | Coverage |
|---|---|---|---|
| **Source-text** | source file *contains* a substring | `unified-contacts.test.ts` (115 `toContain`), `phase24-features` (74), `client360-dedup` (31) — `readFileSync(source)` then `toContain("export const contacts…")` | none — grep in disguise |
| **Wiring/existence** | a tRPC procedure is defined | `dedup-merge.test.ts`: `router._def.procedures.mergeProspects.toBeDefined()` | confirms wired, not correct |
| **Shape via no-op path** | return object shape | `nightly-reconciliation.test.ts` calls `runNightlyReconciliation()` but with no DB it hits the `if(!database) return {zeros}` branch — validates shape, never runs the SQL | none of the logic |
| **Re-implemented logic** | a copy of the fn inside the test | `dedup-merge.test.ts` redefines `deriveName` inline and tests the copy | tests the copy, not the code |

**No test creates a contact, links a client, runs the reconciliation queries
against data, or merges records and checks the outcome.** Two consequences:

1. **"Extend the existing suite" gives little** — there's no behavioral base to
   extend; real integration tests must be written from scratch.
2. **These tests will _fight_ the refactor.** Source-text tests fail on any
   rename/string change even when behavior is preserved (false red), and pass when
   logic breaks (false green). Part of each stage is **replacing the relevant
   source-text tests with behavioral ones**, not appending to them.

**Implication for verification:** the durable fix is a **test DB / integration
harness** (containerized MySQL, or the snapshot loaded locally) so vitest can
execute identity code against data. Absent that, **query-rehearsal on the snapshot**
(the Phase-2 Python approach) is the pragmatic net for the SQL logic — it's what
proved the backfill.

---

## Coupling inventory (every clients / clientId touchpoint)

| # | Location | What it does | Risk | Verifiable by |
|---|---|---|---|---|
| A | `provisioning/clientProvisioning.ts:36` `autoCreateOrLinkClient` | INSERT/UPDATE `clients`; set `client_protocols.clientId` + `transformation_enrollments.clientId`; ensure protocol | **High** (live onboarding, raw SQL) | runtime / query-rehearsal |
| B | `provisioning/provisionClient.ts:133` + `transformation/transformationRouter.ts:322,378,404,487,2330,4007` | call (A), consume returned `clientId` | High | tsc (return-type change) + runtime |
| C | `routers.ts:1186,1202,1275,1287` protocol-create | read `createdProtocol.clientId` to back-link Client Project on `clients` | Med (typed) | tsc + runtime |
| D | `db.ts:1144–1198` clients CRUD (`getAllClients`,`getClientById`,`getClientByEmail`,`createClient`,`updateClient`) | typed clients-table access | Med | tsc |
| E | `automation/onboardingAutomation.ts:193,199,300` | parallel onboarding: `getClientByEmail`/`createClient`/`updateClient` | High (live) | runtime |
| F | `cron/nightlyReconciliationCron.ts` | name-joins `clients`; sets `prospects.clientId`; uses `te.clientId` | Med (nightly, not user-facing) | query-rehearsal |
| G | `integrations/ghl/db.ts:102` | GHL reads `clients` | Med | runtime |
| H | `client360/router.ts` `mergeContacts` (+ 360-only reads) | the band-aid; dies with Client 360 removal | Low (feature being removed) | tsc |
| I | `refund/router.ts`, `refund/db.ts`, `prospect/prospectRouter.ts`, `cron/stalledClientCron.ts` | misc `clientId` reads | Low–Med | tsc + read-through |

---

## Stages (ordered; each ends tsc-clean + ratchet-green)

**S1 — Retire `mergeContacts` + Client 360 (row H). ✅ EXECUTED 2026-07-02.** The
Client 360 dashboard page was already gone; the router lingered serving two pages.
Rebuilt it as a lean `server/contacts/router.ts` keeping only the 5 live procedures
(`list`, `updateContact`, `dataIntegrityAudit`, `fixMismatch`, `fixAllMismatches`) and
**removed the 6 dead ones — `mergeContacts` (the band-aid), `detail`, `deleteContact`,
`bulkUpdateStage`, `dataQuality`, `journeyTimeline`** (none had any caller). Renamed
the mount `client360` → `contacts`, repointed the two consumer pages (`ContactAdmin`,
`DataIntegrityAudit`), deleted the `server/client360/` dir + 3 obsolete source-text
tests. Ratchet 750 → **745** (re-baselined); integration 18/18. `mergeContacts` and
`client360` are gone from all non-test code. _Verified by: tsc ratchet (wiring) +
integration green._

**S2 — `autoCreateOrLinkClient` → ensure-contact-only (rows A, B). ✅ EXECUTED
2026-07-02.** Now writes NO `clients` row and NO `client_protocols.clientId`;
routes identity through `findOrCreateContact` (contacts), sets the protocol's
`contactId`, links the enrollment by `contactId`, and persists shipping on the
protocol (fulfillment record) instead of `clients`. Return changed `{clientId…}`→
`{contactId…}`; fixed all consumers (provisionClient + its `ProvisionPurchaseResult`
type, transformationRouter :2330 and :4007 `syncSingleEnrollmentClient`); the 4
ignore-return callers unchanged. Ratchet 755, integration 16/16 (S2 test flipped to
the new behavior). Was characterized first: (`server/provisioning/clientProvisioning.integration.test.ts`,
3 tests green) — assertions tagged `[REMOVED-BY-S2]` vs `[INVARIANT]`. Now: drop
the `clients` INSERT/UPDATE and the `client_protocols.clientId` / enrollment
`clientId` sets; keep contact + protocol + `enrollment.clientProtocolId`. Change
the return from `{clientId,…}` to `{contactId,…}` so **tsc flags every caller** —
then fix the 7 call sites; flip the `[REMOVED-BY-S2]` assertions. Note found while
characterizing: the `clients` name-fill `COALESCE(NULLIF(name,''),NULLIF(name,
'Unknown'),?)` is effectively dead — it never overwrites a non-null name.
_Verified by: the integration test above._

**S3 — Protocol-create Client-Project link (row C).** ⚠️ **FINDING (2026-07-02):**
the auto-create-project block in `clientProtocols.create` (routers.ts ~1182 &
~1271, both paths) is gated on `if (createdProtocol?.clientId)`, but
`createClientProtocol` only ever sets `contactId` — so on admin protocol-create
`clientId` is null and **the block is dead (no project is created)**, despite the
"ALWAYS create a client project" comment. Same shape as the cron. **Decision
needed:** repoint the guard to `contactId` and ACTIVATE project creation (matches
the intent, but activates dormant behavior — projects start appearing on every
admin create), or REMOVE the block (keep current no-project behavior, drop the
`clients` coupling). Either way the `getClientById`/`updateClient` back-link on
`clients` goes. _Must be resolved before S6 drops the `clientId` column._
**✅ EXECUTED 2026-07-02 — REMOVED** both dead blocks (template + fallback paths),
each replaced with a note pointing to the pending Jason question (added to
`note-to-jason-remaining-removals.md`: "should admin-built protocols auto-create a
workflow project?"). Ratchet 755. Preserves current behavior (no auto-project on
admin create). If Jason wants it, re-add deliberately keyed on `contactId`.

**S4 — Nightly reconciliation (row F). ✅ EXECUTED 2026-07-02 — cron REMOVED**
(deleted `nightlyReconciliationCron.ts`, its boot registration in `_core/index.ts`,
the admin `runNightlyReconciliation` trigger in `routers.ts`, and both its tests;
ratchet 755, integration 15/15 green). Was characterized first:**
(`server/cron/nightlyReconciliationCron.integration.test.ts`, 3 tests green).
⚠️ **BUG FOUND & CONFIRMED:** the cron aborts in step 1 every run and changes
nothing — the loops do `for (row of db.execute(...))` where `execute` returns
`[rows, fields]`, so `row.id` is `undefined` and mysql2 throws on the bind; the
outer try/catch swallows it, so steps 2–5 never run. It has been a silent no-op
in prod. **DECIDED 2026-07-02: REMOVE the cron** (it's been dead with no harm; the
identity work is the real upstream fix — cf. T11). Execution: delete
`nightlyReconciliationCron.ts`, its scheduler registration, and the
characterization test (which documents why it's removed). If any of its intents
(stage advancement, Lisa/Shannon assignment) are actually wanted, fold them into
explicit flows — confirm with Jason. _Verified dead by: the integration test._

**S5 — onboardingAutomation + versioning + GHL + misc (rows E, G, I).** 🟡 **MOSTLY
DONE.**
✅ `onboardingAutomation` repointed to `contactId` (findOrCreateContact; dropped the
clients create/update + the `client_protocols.clientId` set + the clients
back-link; project now carries `contactId`; `OnboardingResult.clientId`→`contactId`).

**✅ Protocol VERSIONING repoint — DONE 2026-07-02.** Grouping is now keyed on the
canonical contactId. What was discovered + done:
- The "UI contract that ripples to the client" (`getVersionHistory` by clientId) is
  actually **dead** — the live version-history UI uses `getVersionHistoryByProtocolId`
  (which is clientId-agnostic; its Method-1 clientId grouping was also repointed to
  contactId, fixing a post-drop `undefined===undefined` matching bug).
- **Two live bugs S2 had silently introduced, now fixed:** `setActiveVersion` and
  `rollbackToVersion` both required `protocol.clientId` (null since S2) → threw for
  every new protocol. `setActiveVersion` now deactivates siblings by contactId;
  `rollbackToVersion` uses the clientId-agnostic `createNewProtocolVersionFromProtocol`.
- `createNewVersion` simplified to resolve off the protocol being viewed (protocolId),
  dropping the clients-table Path A; the frontend (`ClientEdit.tsx`) now always passes
  `protocolId`.
- `createNewProtocolVersionFromProtocol` (db.ts) now deactivates siblings by
  **contactId** and no longer writes `clientId`. Characterized:
  `protocol-versions.integration.test.ts` (+1 test — supersede-by-contactId, no
  clientId written, other contacts untouched). Needed a `checkin_schedules` table
  added to the harness (`07-checkin_schedules.sql`).
- **Deleted 3 now-dead clientId functions** (`getClientProtocolsByClientId`,
  `getActiveProtocolForClient`, `createNewProtocolVersion`) — this dropped the ratchet
  755 → 750.

**✅ Other protocol-`clientId` reads repointed:** the "already has active protocol →
new version" create path (routers.ts:1091, carries contactId now) · the post-delivery
kickoff-task lookup (`getClientProjects` → new `getClientProjectsByContactId`) · the
coach inbox raw SQL (dropped the unused `cp.clientId` select + its `Conversation` type
field).

**✅ transformationRouter duplicate client-create block (was 4066–4099) — DONE.**
Collapsed onto the shared `autoCreateOrLinkClient` (contactId), same path as
`syncSingleEnrollmentClient`; the `syncEnrollmentClients` filter now keys on
`contactId IS NULL` (the old `clientId IS NULL` would match every post-S2 enrollment).
**✅ name-joins (792, 806)** repointed `LEFT JOIN clients … ON e.clientId` →
`LEFT JOIN contacts ct ON e.contactId` (`ct.full_name`).

**✅ S5 tail — DONE 2026-07-02 (all `clients`-table access removed):**
- The 3 secondary "sync to linked client record" blocks repointed: `saveIntakeForm`
  syncs phone to the **contact** (snake_case `contacts.phone`, `updated_at` auto);
  `submitIntakeForm` (public) + `saveProspectProfile` sync name/email/phone/shipping
  to the **protocol** (fulfillment record). `submitIntakeForm`'s else-branch was
  already the correct `autoCreateOrLinkClient` path.
- **GHL `resolveClient`** → contacts-by-email (raw SQL). `contacts` has no
  `ghlContactId` column and the integration is a parked scaffold (result only used
  for a log note), so email-only is fine; noted for when GHL goes live.
- **prospect enrichment** (prospectRouter) → reads `contacts` via `prospects.contactId`
  (has the column); enrollment fallback re-keyed to `contactId`; merge carries
  `contactId` forward; the redundant clientId/name project branches collapsed.
- **admin bulk `syncClientsToProjects` REMOVED** (procedure + the "Sync Clients" UI
  button) — a legacy one-time backfill that iterated the `clients` table; superseded
  by per-protocol project creation at onboarding. Added to Jason's note (offer to
  rebuild a protocol-keyed "backfill missing projects" tool if wanted).

**S6 — Remove clients CRUD (row D) + grep gate. ✅ EXECUTED 2026-07-02.** Deleted the
5 `db.ts` clients helpers (`getAllClients`, `getClientById`, `getClientByEmail`,
`createClient`, `updateClient`) — they had zero production callers after the S5 tail.
Deleted the two now-obsolete tests: `clients-crud.integration.test.ts` (characterized
the deleted CRUD contract) and `auto-project-creation.test.ts` (re-implemented the
S3-removed auto-project + the removed `syncClientsToProjects` inline, asserting on
mocks). Updated `onboardingAutomation.test.ts` (`clientId`→`contactId` shape). The
Definition-of-Done grep now returns zero production hits (below). The `clients` drizzle
table definition stays until the physical `DROP TABLE` at cutover. Ratchet 750,
integration 14/14 green.

---

## Definition of done (the gate for STEP 3) — ✅ MET 2026-07-02

Verified via grep: zero production hits for both families (only doc comments + test
assertions remain). `emailReplyBridge.ts` has a `// … replies FROM clients` comment
(not table access). STEP 3 is unblocked — schedule the Jason maintenance window.

Zero results (outside `cutover/` and tests) for:
- direct `clients`-table access: `from(clients)`, `insert(clients)`,
  `update(clients)`, `delete(clients)`, ``FROM clients``, ``INTO clients``,
  ``UPDATE clients``.
- `client_protocols.clientId` reads/writes: ``SET clientId``, ``.clientId`` off a
  protocol, `clientId` in client_protocols selects/updates.

Then: run `identity-backfill.sql` → `identity-constraints.sql` (incl. STEP 3) in
the Jason maintenance window. Phase 3 (chat re-key on contactId) follows.
