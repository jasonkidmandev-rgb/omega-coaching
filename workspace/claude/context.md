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

## ✅ Local dev is now sealed — you can run the app again (Saboor, 2026-07-29)
**This used to be dangerous and is now fixed. Please don't re-open it.**

Until today, `APP_ENV` defaulted to `'production'`. With a committed `.env` pointing
`DATABASE_URL` at the **live Railway prod DB** and `SMTP_HOST` at **smtp.resend.com**,
`pnpm dev` started ~20 cron jobs against production with a working mailer — check-in
dispatch every 5 min, low-score alerts every 15, payment reminders, a startup check-in
scan. No mistake required; starting the server was enough. (I hit it for ~35s and confirmed
via the DB that nothing went out.)

`server/_core/appEnv.ts` now derives the environment rather than assuming it. Production
and staging behave **exactly as before**; everything else resolves to `local` and gets the
same seal staging already had — no crons, no email, no IMAP polling, Stripe in test mode.
The gate is the existing choke point, renamed `isStaging()` → `sideEffectsDisabled()`
(6 call sites). The server prints its mode at startup.

- **Railway is unaffected**: `railway.toml` runs `pnpm run start`, which sets
  `NODE_ENV=production` explicitly. Verified across all 8 env combinations before shipping.
- **To deliberately exercise crons/email locally:** `ALLOW_LOCAL_SIDE_EFFECTS=true` — opt-in
  and loudly logged. Point `DATABASE_URL` at the Docker test DB (`pnpm testdb:up`) first;
  the seal stops sends, not reads, and `.env` still targets **production data**.
- **If you add a new cron or mailer,** gate it with `sideEffectsDisabled()` from
  `server/_core/appEnv.ts` — not a bare `NODE_ENV` check — so it inherits the same seal.

## Findings / gotchas (append as you discover)
- **⚠️ SECURITY: `commentsRouter` (the chat/messaging backend) is fully unauthenticated.**
  Found 2026-08-01 during a chat-system audit. All four procedures — `list`, `create`,
  `markRead`, `unreadCount` (`server/routers.ts:3272-3414`) — are `publicProcedure`
  (`server/_core/trpc.ts:12`, no session check at all), unlike the sibling `inboxRouter`
  which correctly uses `adminProcedure`/`protectedProcedure`. This is the same bug class
  as the "6 unauthenticated endpoints" fixed 2026-07-29 (`current.md` D) — this one is a
  7th that the earlier sweep missed.
  - `clientProtocolId` is a small sequential integer, visible in plain admin URLs
    (`/admin/chat/123`), and the messages it resolves to aren't even scoped to one
    protocol — `getProtocolComments` (`server/db.ts:2239-2249`) resolves through the
    shared `personId`/`contactId` thread, so one exposed id leaks a client's **entire**
    cross-protocol message history, not just one protocol's worth.
  - `comments.create` accepts an arbitrary `authorType`/`authorName` with no auth — an
    unauthenticated caller can inject a fake "coach" message into any client's real thread
    (which fires the real client notification email, `server/routers.ts:3309-3356`), or a
    fake "client" message to staff (fires the real internal alert email, line 3378).
  - Root cause pattern to check for elsewhere: client-facing pages (`Protocol.tsx`,
    `ClientChatPanel.tsx`) load `protocol.id` from a token-gated query
    (`clientProtocol.getByToken`) but then call the *separate* `comments.*` endpoints
    without re-passing/re-validating that token server-side — the token gate on one
    endpoint doesn't protect a different endpoint that trusts the id it returns.
  - Fix shape: swap `publicProcedure` → `protectedProcedure` (staff) is not enough alone,
    since clients (not just staff) legitimately call these — needs a token/ownership check
    on the client-facing call path specifically, mirroring how `clientProtocol.getByToken`
    already validates. Not yet fixed; flagged in `current.md` D, owner unassigned.
- **One shared chat system, five UI surfaces, not five separate chats.** "Universal chat"
  in the milestone docs isn't a distinct feature — it's the informal name for the one
  `protocolComments` table + `commentsRouter`, threaded by `personId`/`contactId` so a
  client's conversation survives across every protocol version. All five surfaces read/
  write the same table: `client/src/pages/client/Protocol.tsx` (Discussion card),
  `client/src/components/ClientChatPanel.tsx` (mounted twice in `Dashboard.tsx` — desktop
  aside + mobile drawer), `client/src/pages/admin/Inbox.tsx`, `client/src/pages/admin/
  Chat.tsx`, and `server/emailReplyBridge.ts` (client email replies become comment rows
  too). No duplicate/parallel messaging system exists. (`sms_messages` is a genuinely
  different channel, SMS, not in scope here.)
  - Copy-then-diverged code confirmed: `ClientChatPanel.tsx` and `admin/Chat.tsx` both
    gate `markRead` on "is there actually something unread from the other party";
    `Protocol.tsx`'s older Discussion card instead fires `markRead` on every change to
    `comments.length`, including the user's own outgoing messages — harmless but wasteful,
    and a sign the three surfaces aren't sharing logic, just a copy-pasted pattern.
  - `Protocol.tsx`'s Discussion card has no `refetchInterval` at all (the other two chat
    surfaces poll every 15s) — a client reading their protocol page won't see a new coach
    message without a manual reload.
  - Tailwind `hidden` (`display:none`) does not unmount React — the desktop
    `ClientChatPanel` in `Dashboard.tsx:1273` (`hidden lg:block`) keeps polling every 15s
    in the background below the `lg` breakpoint, and a second instance mounts (and also
    polls) if the mobile drawer is then opened — two redundant simultaneous polls for a
    panel the user can only see one of.
  - No delete mutation exists anywhere in `commentsRouter` — separate from the already-
    tracked "no editing" gap, there is no way to remove a sent message at all, either side.
  - `client/src/components/AIChatBox.tsx` is unrelated (a generic LLM-assistant chat UI),
    only referenced from `ComponentShowcase.tsx` (a dev/demo page) — effectively dead code
    if a dead-code sweep happens later, not part of the real messaging system.
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
- **✅ All six unauthenticated endpoints are now closed (2026-07-29, Saboor). Read this
  before touching any client-facing endpoint.** The pattern to copy is
  `authorizeEnrollmentAccess` in `transformationRouter.ts` and `authorizeCheckinAccess` in
  `checkinRouter.ts`: **staff role | signed-in owner | token**, throwing an *identical*
  error for "not found" and "not yours" so ids can't be probed.
  - **The lesson worth keeping:** `completePaymentPublic` was a **master key**. It was
    unauthenticated, took any `enrollmentId`, needed no proof of payment, and **returned a
    30-day `authToken`**. So the token gate on `getEnrollmentPublic` — which I'd already
    marked fixed — was bypassable. *Gating an endpoint on a token proves nothing until you
    also check what can mint that token.* Grep for anything that returns `authToken` or
    `accessToken` to its caller before trusting a token gate.
  - Client accounts have role `'user'`, which is NOT in `STAFF_ROLES`
    (`admin|manager|viewer|finance`). A staff-only check locks clients out of their own
    data — every gate needs the owner path too.
  - Tokens go in `sessionStorage`, never the URL: a URL token lands in browser history and
    in the `Referer` header sent to Stripe.
- **The suite's flaky failures were a timeout, not bad luck — fixed globally 2026-07-30.**
  `vitest.config.ts` now sets `testTimeout: 30_000` (was the 5s default). A large part of this
  suite does a heavy `await import(...)` *inside* the test body — `./routers` alone is a
  ~9.6k-line module graph, and some files re-import it under `vi.resetModules()`. Cold, or
  with workers under load, those take 4-10s, so the **same** tests passed in isolation and
  failed in a full run: `waiver-invite-welcome.test.ts` measures **10.1s** and could never
  have passed a 5s budget. That's why the failure count moved between runs on identical code.
  Deleting the offending tests was whack-a-mole (three more surfaced after the first batch);
  raising the budget fixes the class. **If you see a test "fail" only in a full run, suspect
  this before suspecting your change.** It does not make those tests valuable — most assert
  only that a name exists.
- **`pnpm db:push` is broken in this repo (relevant to Farjad as migration owner).**
  `drizzle-kit generate` produces invalid MySQL from `drizzle/schema.ts`: **zero**
  `PRIMARY KEY` clauses anywhere in the generated file (MySQL `ERROR 1075`), and
  `DEFAULT 'CURRENT_TIMESTAMP'` emitted as a quoted string (`ERROR 1067`). The schema
  definitions are missing `.primaryKey()`. To build a test DB, extract DDL from
  `cutover/local-data/peptidecoach_snapshot_20260701.sql` instead — that's what
  `test-harness/README.md` documents anyway.
- **`pnpm testdb:up` returns before the schema is loaded.** `--wait` satisfies the
  `mysqladmin ping` healthcheck while `docker-entrypoint-initdb.d` scripts are still
  running, so a query issued immediately after sees **zero tables** and looks like a broken
  harness. Poll for the tables, not the container. (Harness now covers 17 tables — the
  check-in and intake-form tables were added 2026-07-29 to make the auth work verifiable.)
- **(historical, now fixed) Six unauthenticated endpoints exposed client data.** `publicProcedure`
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
- Settings are still ~14 separate admin pages (no tabbed page yet); consolidating them
  is the main open M1 UI task. (Was ~15; `LaunchpadSettings` is gone, see below.)
- **Launchpad Settings was a fully disconnected admin page — now removed (Farjad, 2026-07-30).**
  Investigated because Jason's doc flagged it ("clean up launchpad or get rid of it...
  BUT the clients have their own launchpad right? How would this work?"). Traced it
  end-to-end: the admin `LaunchpadSettings.tsx` page was a real, working CRUD form that
  wrote to a `launchpad_items` table — but **nothing on the client side ever read that
  table**. The client-facing `/launchpad` page (`LaunchpadHub.tsx`) is 100% hardcoded
  JSX; every card, price, and link is baked into the file. It also fetched a second
  unused table (`hub_links`) and threw the result away without rendering it. So editing
  "Launchpad Settings" in admin did **nothing visible** to what clients saw, ever — the
  only way to change the real page was a code edit + redeploy. A prior doc
  (`docs/investigation-audit.md`) had incorrectly documented these as connected; that
  claim didn't match the code.
  - **Removed:** `LaunchpadSettings.tsx` (admin page) + its route, sidebar nav entry,
    breadcrumb label, and global-search entry; `launchpadRouter` and `hubLinksRouter`
    (`server/routers.ts`); all 15 related `server/db.ts` functions; the `hub_links` /
    `launchpad_items` / `launchpad_item_videos` table definitions (`drizzle/schema.ts`);
    the now-dead `scripts/seed-launchpad.mjs` (archived, not deleted, matching the
    existing `scripts/archive/` convention).
  - **Kept:** the live `/launchpad` page itself (`LaunchpadHub.tsx` + its route) — it's
    linked from 5 places in real transactional emails (welcome, signup, payment
    confirmation), so the URL has to keep working regardless of what happens to admin
    settings. Its content was separately trimmed to match Jason's explicit list
    (`dd24c24`, `a74d986`): kept Omega Elite / PeptidePro / Podcast, removed the
    Practitioner card and a duplicate Omega Free card, sent Trusted Partners and the
    "Coaching Plans" CTAs out to omegalongevity.com. Real Results / testimonials
    deliberately untouched per explicit instruction.
  - **Not yet done:** the physical `DROP TABLE` for the 3 orphaned tables. DDL is saved
    in `cutover/dropped-tables-ddl.sql` (schema-derived, row counts NOT verified — no DB
    access from this pass). Whoever has DB access should confirm 0 rows, then run
    `DROP TABLE hub_links, launchpad_items, launchpad_item_videos;`.
  - **Lesson for future "is X still used" questions:** an admin CRUD page existing and
    working is not evidence anything downstream reads it — grep the actual consumer
    (`trpc.<router>.*` in `client/src`) before trusting an admin settings page's premise.

## Dead/broken link audit — findings worth keeping (Saboor, 2026-08-01)
Full sweep of every navigation target in `client/src` against the routes defined in
`App.tsx`. 11 static targets matched no route; 6 were reachable by a real user.

- **How to re-run it.** Two throwaway scripts (not committed): extract
  `path={"..."}` from `App.tsx`, turn wouter patterns into regexes (`:x` -> one segment),
  then scan every `.tsx` for `href` / `to` / `setLocation(` / `navigate(` /
  `window.location` / `path:` targets and report the ones that match nothing. Worth
  rebuilding rather than eyeballing — the six real breaks were all in *secondary*
  navigation (row-click handlers, quick-action menus, back buttons). **All 41 sidebar
  entries were correct**, which is exactly why these survived so long.
- ⚠️ **Blind spot in that method:** it only flags targets matching *no* route. A link
  pointing at a route that is a **redirect shim** passes the check and still strands the
  user. Found only because Saboor asked where the store was: `Promotions.tsx` (routed at
  `/promotions` and `/offers`) has 3 CTAs — "Order Now", "Start Your Journey",
  "View Bundle" — pointing at `/store`, which `App.tsx` redirects to `/` (home). Left
  alone: the sidebar carries a "Store hidden for compliance" comment, so whether those
  should point at `/order` is Jason's call, not a bug fix.
- **The peptide store lives at `/order`** (`pages/Order.tsx`), not `/store`.
- **`/admin` pages have zero usage telemetry.** `page_views` has 9,541 rows and **not one**
  with an `/admin` path — only public/client pages are tracked. So "0 views" for an admin
  screen means *not tracked*, never *not used*. Do not use the Web Traffic page to justify
  removing an admin page.
- **Two different order concepts, easily confused.** `/admin/store-orders` reads
  `store_orders` (24 rows, live — the peptide store). The removed `/admin/order-history`
  read `protocol_orders` (**0 rows in prod**, never used). Not duplicates.
- **`transformation_access_codes` has 10 rows but no server code** — no router, no query.
  Real data behind a feature that no longer exists in the app. Jason is checking whether
  those codes were ever in use; **do not drop the table**.
- **Proving "page A supersedes page B"** (used to retire `IntakeFormEditor` in favour of
  `FormsEditor`): compare the `trpc.*` procedure sets — B's 3 were a strict subset of A's
  6, and both call `getIntakeFormContent`/`updateIntakeFormContent`, i.e. they edit the
  **same rows**. Then check reachability (`git log -S"<path>" -- AdminLayout.tsx`). That
  combination is what makes removal safe; page size or "looks newer" is not evidence.

## Chat sender names + a broken integration harness (Saboor, 2026-08-02)

- **Why coach messages all said "Coach".** `commentsRouter.create` took `authorName`
  straight from the caller, and the three admin surfaces (Inbox, Chat, ClientEdit) each
  hard-coded `authorName: "Coach"`. Production proof: of 673 messages, **316 of 362 coach
  messages** read the literal `"Coach"`; only 45 carried a person's name. Client messages
  were fine (real names throughout).
- **Fix is server-side on purpose.** The name is now taken from `ctx.user` when the caller
  is signed-in staff, inside `create`. One place covers all five chat surfaces (client
  Protocol page, dashboard panel, admin Inbox, admin Chat, email-reply bridge) plus any
  added later, and the name can no longer be chosen by the caller. Client messages keep the
  supplied name — a client may be posting from a token-authenticated page with no session.
  Note `ctx.user` is populated on `publicProcedure` too, which is what makes this possible.
- ⚠️ **History is not backfillable.** Those 316 rows stay "Coach" — nothing records which
  staff member wrote them. Only new messages carry a real name.
- ⚠️ **The integration harness was RED before this task, and the cause is the raw-SQL alias
  trap.** `personId` is a Drizzle alias; the physical column is `contactId`, and raw
  `` sql`` ``/`rawPool().query` does not get the alias. Three test files insert/select
  `personId` in raw SQL. Fixed the 3 sites in `protocol-comments.integration.test.ts`
  (4 pre-existing tests there were failing and now pass). **Still broken, same cause, not
  yet fixed:** `protocol-versions.integration.test.ts:48` and
  `provisioning/clientProvisioning.integration.test.ts:61,65`. The other red files
  (`waiver-settings`, `bulk-waiver-invite`, `waiver-renewal-invite`) fail for reasons not
  investigated.
- **Watch for multi-line SQL when grepping for this.** One of the three sites put the
  column list on the line *after* `INSERT INTO`, so a grep for `personId` on lines matching
  `INSERT` missed it and the first fix looked complete when it wasn't.
- **`pnpm testdb:up` says Healthy before the schema loads** (the init server answers the
  ping). Poll for a table before querying — the loop in `test-harness/README.md`.
