# Shared Claude Context, HumanEdge

For both Farjad's and Saboor's Claude sessions. Read at the start of work; append
findings here so the other's Claude doesn't re-investigate.

## Stack
React 19 SPA + wouter routing, Express / tRPC 11, Drizzle ORM + MySQL, Tailwind v4
(CSS-first; the Typography plugin is now ENABLED as of commit 57c3e00, so `prose`
classes work app-wide, the older explicit `[&_ul]` / `[&_p]` utilities still work too),
TipTap rich text, Vite. Deploys on Railway (auto-deploys `main`). Payment ledger runs in
shadow mode.

## Migration context
Old prod on Manus (peptidecoach.pro); new prod on Railway (humanedge.health). Rebrand
PeptideCoach -> HumanEdge. The app is the source of truth; external funnels feed in.

## Structure warnings (conflict + navigation hotspots)
- God-files (announce before editing, see current.md claim board): `server/routers.ts`
  (~9.6k lines), `server/db.ts` (~9.2k, ~500 exported fns), `drizzle/schema.ts`
  (~169 tables), `server/emailService.ts` (~4.9k).
- Nav: the whole-app re-render on every admin navigation is FIXED (commit 5273297).
  Still present: 36 `window.location.href` + 11 internal `<a href="/…">` that hard-reload;
  audit these and convert any internal navs that shouldn't reload to `Link` / `setLocation`
  (keep logout, external URLs, post-payment).
- Settings sprawl: ~15 admin settings pages, including 6 notification pages, to be
  consolidated into tabs.
- Back navigation: shared hook `client/src/hooks/useGoBack.ts` (`useGoBack` + `goBackTo`).
- Brand: shared `client/src/components/HumanEdgeBrand.tsx` (used by Cover + Login).

## ⛔ Do NOT start the dev server locally (Saboor, 2026-07-29)
The committed `.env` points `DATABASE_URL` at the **live Railway prod DB** and
`SMTP_HOST` at **smtp.resend.com** (a real sender). `startServer()`
(`server/_core/index.ts:552-576`) initializes **~20 cron jobs unconditionally** — there is
no `DISABLE_CRONS` gate. So `pnpm dev` immediately begins check-in dispatch (every 5 min),
low-score alerts (15 min), payment reminders and a startup check-in scan **against real
clients with a working mailer**.

I started it for ~35s while verifying the navigation fix, then killed it and confirmed via
the DB that nothing was sent (0 notifications / 0 engagement events / 0 check-ins in the
hour). Verify with typecheck + `vite build` + unit tests instead; for anything needing a
running app, deploy and click through on Railway.

**Worth fixing properly:** gate cron init behind an env flag defaulting off outside
production, and point local `.env` at the Docker test DB (`pnpm testdb:up`). Small job,
unblocks all local verification. Added to `current.md`.

## Findings / gotchas (append as you discover)
- **⚠️ Raw SQL does NOT get Drizzle's column aliases — this broke admin chat.** The schema
  says `personId: int("contactId")`, but that alias applies **only to query-builder calls**.
  Inside a `` sql`` `` template MySQL sees the literal text, so `personId` is an unknown
  column — even though the SQL sits in a `.ts` file. `getInboxConversations` threw
  `Unknown column 'c2.personId'` on every call, so the admin inbox returned empty and chat
  looked dead while the messages were completely intact. Fixed across 6 sites in `1e0c4eb`
  (`db.ts` inbox, `contactsHelper.ts` ×6 UPDATEs, `prospectRouter`, `retentionWatch`,
  `transformationRouter` ×3).
  **Nothing catches this class automatically** — TypeScript, the ratchet, the build and the
  unit suite all pass, because the SQL is an opaque string. Grep before shipping anything
  identity-adjacent:
  ```bash
  grep -rn "personId" server/ --include=*.ts | grep -v "\.test\." \
    | grep -E "SELECT |FROM |WHERE |JOIN |GROUP BY|VALUES|COALESCE|SET " \
    | grep -vE "\$\{[^}]*personId[^}]*\}" | grep -vE "AS personId"
  ```
  Alias rather than rename when downstream JS reads `.personId`: `SELECT contactId AS personId`.
  ~20 other columns share the trap (`lifecycleStage`→`lifecycle_stage`, `fullName`→`full_name`,
  `isPinned`→`is_pinned`, …) — but some camelCase names genuinely *are* physical on other
  tables (`payment_events.grossAmount`), so check the specific table before "fixing" it.
  **This disappears once `cutover/phase4-people-rename.sql` runs.** Relevant to Farjad as
  migration owner.
- **App URL: use `getAppBaseUrl()` (`server/lib/appUrl.ts`), never a literal.** There were
  ~70 copies of `process.env.VITE_APP_URL || 'https://peptidecoach.pro'` across 26 server
  files, each in a client-facing link. The fallback named the **old Manus site**, so a
  missing/misspelled `VITE_APP_URL` in Railway wouldn't error — it would quietly mail
  clients back to the system we're migrating off. Now one helper
  (`getAppBaseUrl()` / `getRequestBaseUrl(origin)`), fallback `https://www.humanedge.health`.
  **Action for whoever has Railway access: confirm `VITE_APP_URL` is actually set on the
  service.**
- **Six unauthenticated endpoints expose client data (launch blockers).** `publicProcedure`
  is bare `t.procedure` — no middleware, only a 3000-req/15-min IP limit. Worst is
  `transformation.getIntakeForm({enrollmentId})`: no token, returns the full health intake
  (DOB, address, medications, diagnoses, mental-health history, substance use, emergency
  contacts) for sequential integer IDs — **36 live forms in prod**.
  `getEnrollmentPublic` does `SELECT *` and spreads the row, leaking the `authToken`
  magic-link column. `customOrders.capturePaymentPublic({id})` marks an order **paid with no
  Stripe verification**, deducting inventory and creating a packing slip. Full writeup:
  `docs/risks/2026-07-28-launch-readiness-audit.md`. The correct pattern already exists in
  the same codebase (`checkin.getClientHistory` resolves a protocol from an access token) —
  copy it, don't rearchitect.
- Data model is mid-rename from "team/clients" to **people / `personId`** (commits
  08dd789, 1e0c4eb). `People.tsx` is the new view; `Team.tsx` still exists. Watch for
  raw SQL or code still using old `team`/client-only naming.
- Test suite: **now fully green and stable — 1661 tests / 123 files, three consecutive
  clean runs** (was 148 failing -> 15 -> 0, commits 5df455d then 7851dd8). Slow external
  checks are `*.probe.test.ts` (excluded from the normal run).
  Two caveats before trusting green:
  (a) The count used to swing 8-20 between runs with no code change. That was ~24 "wiring"
      tests importing the whole 9.6k-line router graph just to assert a procedure *name*
      existed, regularly blowing the 5s timeout. Deleted.
  (b) **Green does not mean covered.** `inbox.test.ts` called `getInboxConversations()` and
      asserted the result was an array — but that function opens `if (!db) return []`, so
      with no DB it returned `[]` before reaching its SQL and **passed the whole time the
      admin inbox was throwing in production**. Deleted: a test that cannot fail is worse
      than no test, it advertises coverage that isn't there. The suite is still mostly
      unit-level with a DB-free harness; real behavioural coverage is a v2 project.
- Settings are still ~15 separate admin pages (no tabbed page yet); consolidating them
  is the main open M1 UI task.
