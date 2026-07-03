# Test harness — how testing works here

**Read this before writing or trusting a test.** It explains the two kinds of
tests in this repo, why the integration harness exists, and how to use it.

---

## TL;DR

```bash
pnpm testdb:up            # start the throwaway MySQL 8 test DB (needs Docker)
pnpm test:integration     # run *.integration.test.ts against it
pnpm testdb:down          # stop + wipe the DB
```

- **Unit tests** — `pnpm test` — `server/**/*.test.ts`, no DB. Fast.
- **Integration tests** — `pnpm test:integration` — `server/**/*.integration.test.ts`,
  run REAL code against a REAL MySQL. This is the only tier that proves behavior.

---

## Why this exists (important context)

The pre-existing `*.test.ts` suite **looks** comprehensive but gives **near-zero
behavioral coverage** of data paths. Audited 2026-07-02, the assertions are mostly:

- **source-text**: `readFileSync(source)` then `toContain("some string")` — a grep
  in disguise (e.g. `unified-contacts.test.ts` has 115 of these);
- **wiring/existence**: `router._def.procedures.X.toBeDefined()` — proves a
  procedure is wired, not that it works;
- **shape-via-no-op**: calls a function with no DB so it hits an early
  `return {…zeros}` branch and never runs the real SQL;
- **re-implemented**: copies the function's logic into the test and tests the copy.

Consequences a new dev/agent must internalize:
1. **A green `pnpm test` does NOT mean a data-path change is correct.** Those tests
   pass while logic breaks (false green).
2. **Source-text tests fight refactors** — they go red when you rename a symbol or
   change a string even if behavior is identical (false red). When you rewrite a
   path, **replace** its source-text tests with integration tests here; don't nurse
   the old ones.

The integration harness is the real safety net. Prefer it for anything that
touches the DB or identity.

---

## What's in this folder

| File | Purpose |
|---|---|
| `docker-compose.yml` | throwaway **MySQL 8** test DB on host port **3307**, wiped on `down -v` |
| `schema/*.sql` | DDL loaded on first boot (in name order). Currently `contacts`, `clients`, `client_protocols`, `transformation_enrollments`, `client_projects`, `prospects` — faithful to the prod snapshot. Add more as tests need them (see Extending the schema) |
| `vitest.integration.config.ts` | runs only `*.integration.test.ts`; points the app's `DATABASE_URL` at the test DB; single-worker so tests can share/reset one DB |
| `globalSetup.ts` | waits for the DB and **fails fast** with an actionable message if it's not up / schema not loaded |
| `dbHelpers.ts` | raw mysql2 helpers for tests: `resetContacts()`, `truncate(...)`, `seedContact()`, `getContactRow()`, `closePool()` |

Fidelity note: prod is **TiDB v8.5 serverless** (MySQL-8 compatible). MySQL 8 is a
faithful-enough stand-in for the identity DDL/queries. The schema files are cleaned
copies of the real prod snapshot (`cutover/local-data/`), so column names,
`UNIQUE(email)`, and the generated `full_name` match production.

---

## Running

**Prereq: Docker running** (Docker Desktop on Windows). Then:

```bash
pnpm testdb:up          # first run pulls mysql:8.0; --wait blocks until healthy
pnpm test:integration   # or  pnpm test:integration:watch
pnpm testdb:down        # wipe when done
```

If a test seems to see stale data or a missing table, the schema only loads on a
**fresh volume** — do a full reset: `pnpm testdb:down && pnpm testdb:up`.

---

## Adding a new integration test

1. **Name it** `<thing>.integration.test.ts` and put it **next to the code** it
   tests (e.g. `server/contacts/contactService.integration.test.ts`). The name is
   what keeps it out of the DB-free `pnpm test` run.
2. **Reset state** in `beforeEach` with the `dbHelpers` (`resetContacts()`), so
   tests don't leak into each other. Close the pool in `afterAll` (`closePool()`).
3. **Call the real exported function** and assert on both its return value and the
   DB row (`getContactRow`) — never re-implement the logic in the test.
4. If your code touches a table not yet in the schema, **add it** (below).

### Characterization tests (what we're doing during the identity refactor)

Before changing a path, write a test that captures what it does **today** — a
*characterization* test — then refactor and keep it green. If a case must change,
change it deliberately and note why. See `contactService.integration.test.ts` for
the pattern (it locks in `findOrCreateContact`'s deterministic email-only linking).

---

## Extending the schema

The test DB starts with only the tables it needs. To add one:

1. Find the `CREATE TABLE` in the prod snapshot:
   `cutover/local-data/peptidecoach_snapshot_20260701.sql`.
2. Copy it into `schema/NN-<table>.sql` (next number). **Strip TiDB-isms**:
   remove `/*T![clustered_index] CLUSTERED */` and any `/*T!… */` comment markers
   (MySQL ignores them, but keep it clean). FK order doesn't matter — init runs
   with `FOREIGN_KEY_CHECKS=0`.
3. `pnpm testdb:down && pnpm testdb:up` to reload, then add your test.

Keep schema files **PII-free** (DDL only — no `INSERT`s). Test data comes from
`seedContact()` / your test, not the prod dump.

---

## Environment variables

| Var | Default | Meaning |
|---|---|---|
| `TEST_DATABASE_URL` | `mysql://root:test@127.0.0.1:3307/peptidecoach_test` | where the harness + tests connect |
| `DATABASE_URL` | set by the config to `TEST_DATABASE_URL` | what the app's `getDb()` reads — this is how real app code hits the test DB |

Override `TEST_DATABASE_URL` to point at a different DB (e.g. a shared CI MySQL).

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot reach the test DB … pnpm testdb:up` | start Docker, then `pnpm testdb:up` |
| `contacts` table missing | volume has stale state — `pnpm testdb:down && pnpm testdb:up` |
| port 3307 in use | change the host port in `docker-compose.yml` **and** `TEST_DATABASE_URL` |
| `pnpm test` tries to hit a DB | an integration test wasn't named `*.integration.test.ts` |

---

## How this fits the identity refactor

The contactId-only refactor (`cutover/app-contactid-only-plan.md`) rewrites live
onboarding paths that have no runtime coverage. The plan: **characterize each path
here first**, then refactor and keep the tests green. This harness is that net.
Where a real DB isn't practical for a set-based migration query, we also
"query-rehearse" against the local snapshot (see `cutover/local-data/`) — the two
techniques together are how we verify data changes without shipping blind.
