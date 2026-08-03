# Saboor, daily log

Only Saboor edits this. Newest entry at top. A short running list of what you worked on
each day, so Farjad and both Claude sessions can see progress.

## 2026-08-02
- **Layout tidy on the admin pages — finished.** Six more pages were double-padding
  themselves (`AdminLayout` already wraps every page in `p-3 md:p-6`): Acquisition &
  Retention, Backorders, Coaching Sessions, Conversion Tracking, Lisa's Morning Briefing,
  and KPI Dashboard's loading state.
- ⚠️ **KPI Dashboard was my own leftover.** The first pass fixed its main render but not its
  `if (isLoading)` early return, so the page visibly **jumped 24px** the moment data
  arrived. Lesson recorded in `task-notes.md`: fixing a page wrapper means fixing *every*
  return in the component, not just the last one.
- **Page width standardised on `max-w-7xl`.** Backorders was `5xl`, Acquisition `6xl`;
  both moved. All 10 clamp occurrences across 8 pages now agree and `7xl` is the only clamp
  form left. The ~54 unclamped pages stay full-width — only pages that already clamped were
  touched, so this is a consistency fix rather than a redesign.
- ⚠️ **Two scripted audits produced garbage and were thrown away.** Matching the last
  `return (` picks up nested returns inside `.map()` callbacks — it reported MyActionItems
  as unclamped when I had set the clamp myself — and a stricter pattern resolved only 13 of
  62 pages. Every finding was confirmed by reading the surrounding code instead; 7 candidates
  turned out to be cards or sub-components. Same false-positive trap as the table-overflow
  check in the first pass.
- Verified: ratchet 712, clean build, 769 tests green.
- **Sender name now shows in the universal chat.** Root cause was not a display bug: the
  three admin surfaces (Inbox, Chat, ClientEdit) each hard-coded `authorName: "Coach"`, so
  **316 of the 362 coach messages in production literally read "Coach"**. Client messages
  always had real names.
  - Fixed **server-side** in `commentsRouter.create`: the name comes from `ctx.user` when
    the caller is signed-in staff. One place covers all five chat surfaces and the name can
    no longer be set by the caller. Client messages keep the supplied name (they may post
    from a token page with no session).
  - Display side: admin **Chat** showed no name at all on coach messages (only client ones
    got a label); admin **Inbox** showed a blanket "You" for every coach message regardless
    of who sent it — wrong in a shared inbox. Both now show the actual sender, with "You"
    reserved for your own messages.
- ⚠️ **History can't be backfilled** — those 316 rows stay "Coach"; nothing records who
  wrote them. Only new messages carry a name.
- ⚠️ **Found the integration harness was already RED, from the raw-SQL alias trap.** Test
  files insert `personId` in raw SQL, but that's a Drizzle alias — the physical column is
  `contactId`. Fixed the 3 sites in `protocol-comments.integration.test.ts`; 4 pre-existing
  tests there now pass alongside my 6 new ones. **Left broken (same cause, flagged in
  `context.md`):** `protocol-versions` and `provisioning/clientProvisioning`.
- Verified properly rather than assuming: temporarily reverted the server change and
  confirmed the new test fails with `expected 'Coach' to be 'Lisa Bennett'` — the exact
  production bug — then restored it. A test that has never been seen to fail proves nothing.
- ⚠️ Started extracting the name logic into a new module so it could be tested without a
  DB; dropped that once Docker was up. Testing the real router against a real MySQL beats
  adding a file to make a copy testable.
- Verified: ratchet 712, clean build, 769 unit tests + 10 integration tests green.
- **Dashboard chat panel: stopped the hidden/double polling** (Farjad's finding). The panel
  was mounted twice — sticky aside for desktop (`hidden lg:block`) and a drawer for mobile.
  Tailwind `hidden` is `display:none`, which hides a component but leaves it **mounted and
  running**, so on a phone the invisible aside polled every 15s and a second copy started
  polling as soon as the drawer opened. Now only the panel actually in use is mounted.
  - Worth knowing: React Query dedupes *concurrent* fetches on one key, but two observers
    keep their own `refetchInterval` timers, so staggered polls genuinely double the
    requests. Hiding one with CSS would have fixed nothing.
  - `useIsMobile` gained an optional breakpoint (default still 768). The chat flips at `lg`
    (1024) and the 768 default would have left a band where the wrong panel renders.
- ⚠️ **I changed a shared hook's initialisation**, not just added a parameter: it now reads
  `window` on first render instead of starting `undefined`. Previously the first render
  always said "not mobile", so a mobile visitor briefly mounted the desktop branch — which
  would have fired exactly the query I was removing. `AdminLayout` and `ui/sidebar` call it
  with no argument; they only lose that same flash. Flagged because it touches the sidebar.
- Checked rather than assumed: `ui/drawer.tsx` uses a Radix portal with no `forceMount`, so
  drawer content really does unmount when closed.
- **Admin dashboard styling consistency** (`client/src/pages/admin/Dashboard.tsx`). Brief was
  to carry over Farjad's client-dashboard overhaul as design/structure only — no data, links
  or behaviour.
  - The "Protocol Collaboration Center" card was moved here from the Launchpad page and
    brought `#1e3a5f` with it. That's one of the three *fake* navies Farjad catalogued, and
    it was the only hardcoded hex on the whole admin dashboard. Removed all 4 uses; the card
    now looks like every other card on the page. Its amber accent is untouched.
  - Finished a half-done responsive pass in the same card — one of its three boxes had
    responsive padding/icon/text sizes, the other two didn't.
  - 5 class-string edits, nothing else. Asserted bracket counts unchanged so no JSX moved.
- ⚠️ **I flagged a conflict before starting and was overruled, correctly.** Farjad + Jason
  decided on 2026-08-02 that internal admin pages keep their orange accent; "make admin match
  the client dashboard" would have reversed that. Saboor's call: follow Farjad on
  design/theme where we collide. So no brand navy/gold went near admin.
- Once theme changes and functional changes are both excluded, most of the overhaul doesn't
  transfer: brand tokens (excluded), merging duplicate action grids (that removes a button —
  "Protocol Collaboration Center" and "Quick Actions" both link to `/admin/clients/new`,
  worth raising separately), broken links (already none), welcome card and chat-to-top (no
  admin equivalent). Recorded in `task-notes.md#admin-dashboard-consistency`.
- **Deleted the orphaned `dataIntegrityAudit` procedure** (M2 item). It lived in
  `server/contacts/router.ts` and was left behind when the Data Integrity Audit admin page
  was removed. 270 lines. Nothing called it — the whole UI uses only `trpc.contacts.list`.
  Also dropped 10 schema imports that became unused, and corrected the file's header
  comment, which still described the audit.
- Ratchet **712 -> 702**: the dead code was carrying 10 tolerated type errors.
- ⚠️ **Three more orphans in the same file, left alone and logged:** `updateContact`,
  `fixMismatch`, `fixAllMismatches`. No UI calls them either. Two are write endpoints that
  re-sync a contact's data across linked tables, so deleting them is a decision rather than
  a tidy-up — added to `all-milestones.md` unowned.
- Watch out when grepping for these: `PricingTab.tsx` has a `fixMismatchMutation`, but it
  calls `trpc.payment.fixPaymentMismatch` — a different procedure in the payment router.
  Only the local variable name looks similar.
- **Moved the Web Traffic sidebar link.** It was under "Marketing & Outreach"; it now sits
  under "Team & Content" in the "Data & Admin Tools" group next to Workflow Templates.
  One line moved in `client/src/components/AdminLayout.tsx` — the page itself and its route
  (`/admin/web-traffic`) are untouched, so any bookmark still works.
- Side effect: **"Marketing & Outreach" is now a category with one item** (Affiliate
  Partners). Store Promos is still in the file but commented out for compliance. Whether to
  keep a one-item category or fold Affiliate Partners elsewhere is a call for Jason/Farjad —
  not doing it unasked.
- Checked the empty-category case: `AdminLayout.tsx` hides a category when the signed-in
  role can see none of its items, so finance users don't get an empty header. That was
  already true before the move.
- **Closed both remaining security blockers in section D.**
  - **Chat backend (the 7th unauthenticated endpoint).** All four `commentsRouter`
    procedures took a bare sequential protocol id with no check — anyone counting integers
    could read a client's whole message history or post a message that sent a real
    notification email. Gated on staff session | protocol token | signed-in owner, matching
    the three real callers. Non-existent and not-yours give an identical error so ids can't
    be probed.
  - ⚠️ Also blocked coach **impersonation**: a protocol token proves you're the client, not
    their coach, so `create` now refuses `authorType: 'coach'` unless the caller is staff.
  - **Team page client-to-admin.** `updateRole` was already manager-gated, so this was never
    an auth hole — the defect was the "Add Admin" box, which searched *every* user (clients
    included) and promoted whoever matched the typed email, no confirmation. Promoting a
    client account stays possible (new staff sign in first, so they start as role 'user')
    but now needs an explicit confirmation, enforced server-side and prompted in the UI.
- **Why my earlier "6 endpoints" sweep missed chat:** I audited routers reachable from the
  pages under review; chat sits in `routers.ts` behind five UI surfaces. Enumerate by
  `publicProcedure`, not by walking the UI. Recorded in `context.md`.
- ⚠️ **A test I've been dismissive of caught a real ordering bug.** I put the promotion
  guard before the manager restrictions, so a manager promoting to admin got the wrong
  refusal. `role-permissions.test.ts` failed on exactly that. Both paths refused, so it
  wasn't a hole, but the specific rule has to win — guard moved after.
- ⚠️ I added 5 type errors (712 -> 717) with a `deny()` helper TypeScript can't narrow
  through; caught by diffing the ratchet per-file and fixed with `return deny()`. Back to 712.
- Two of my own naming tests failed *correctly* after the gate went in — they posted with no
  session, which is now refused. One asserted behaviour that is deliberately impossible now
  (session-less coach post), so it was rewritten rather than patched.
- **Still open, logged not fixed:** `users.list` is `viewerProcedure` and ships all 79 user
  rows to the browser; the Team page filters to staff in React. Any viewer-role account can
  read every client's email and phone from the network tab.
- Verified: ratchet 712, clean build, 59 unit files + 20 integration tests green, including
  10 new authorization tests driving the real router against real MySQL.
- Verified: ratchet 712, clean build, 769 tests green. The visible behaviour is browser-only
  and still needs the deferred pass — what I can assert from code is that one panel mounts.

## 2026-08-01
- **Removed the plan-quiz test** (`9752f66`). Direct UI-based payments are coming out of
  humanedge.health and the quiz routes into that funnel. Flagged clearly that this one was
  a *real* test (45 combinations against the actual `getRecommendation`) — it went because
  the feature is going, not because it was weak. `PlanQuiz.tsx` is still live and now
  uncovered; removing the component isn't scoped.
- **Backfilled this log for 27-31 July.** The workspace didn't exist until 07-29, and after
  that I was ticking `current.md` and updating `context.md`/`decisions.md` but skipping the
  log. Noted here so the gap isn't mistaken for idle days.
- **Dead/broken link audit under `/admin/*` — done, and fixed.** Scanned every navigation
  target in `client/src` against the routes in `App.tsx`. 11 matched no route; 6 were
  reachable by a real user. **All 41 sidebar entries were correct** — every real break was
  in secondary navigation, which is why they lasted this long.
  - **Payment History was the worst:** the row eye-button sent `coaching_fee` to
    `/admin/transformation` and `store_order` to `/admin/store/orders`, neither of which
    exists. Two of the three payment types dead-ended; the page looked fine until you
    clicked the wrong row. Retargeted to `/admin/transformation-payments` and
    `/admin/store-orders`.
  - **Widest reach:** `QuickActionsButton` and `GlobalSearch` both render in `AdminLayout`,
    so their broken "New Protocol Item" / "New Program" entries were on *every* admin page
    (and in Ctrl+K). Neither page has a `/new` route — both create through a dialog on the
    list page — so they now point at the list.
  - Removed the "Access Codes" back button on Promo Codes (page long gone) and, per Jason's
    A-option call, the always-404 "My Protocol" item in the Launchpad mobile menu.
  - Deleted 2,991 lines of unreachable code: `DashboardLayout` (no referrers),
    `ComponentShowcase` (unrouted), `CoachingPrograms` (imported, never routed),
    `admin/OrderHistory` and `admin/IntakeFormEditor`.
- ⚠️ **My audit method had a blind spot, found only because Saboor asked where the store
  was.** It flags targets matching *no* route — so a link pointing at a **redirect shim**
  passes and still strands the user. `Promotions.tsx` has 3 CTAs aimed at `/store`, which
  redirects to the homepage. Left for Jason (the sidebar says the store is hidden for
  compliance). The store itself is at **`/order`**.
- Evidence gathered before removing anything: `protocol_orders` is **0 rows** in prod (so
  `/admin/order-history` was always empty, and is *not* a duplicate of Store Orders, which
  reads the live 24-row `store_orders`); `IntakeFormEditor`'s 3 tRPC procedures are a
  strict subset of `FormsEditor`'s 6 and both edit the same rows.
- ⚠️ **`transformation_access_codes` has 10 rows and no server code at all.** Real data,
  no feature. Jason is checking it in Railway — **table not touched.**
- Also learned: `page_views` tracks **no** `/admin` paths (9,541 rows, zero admin), so
  there is no usage telemetry to justify admin-page removals. Don't reach for Web Traffic
  to answer "is this screen used".
- ⚠️ Corrected myself twice: I referred to a "Sales & Marketing" sidebar section that does
  not exist (Coaching Promos is under **Team & Content**) — I inferred a plausible group
  name instead of reading the file. And `/admin/dashboard` I'd said to delete; made it a
  redirect to `/admin` instead so staff bookmarks don't 404.
- Verified: ratchet **712**, clean build, **59 files / 769 tests** green; both audit scripts
  re-run clean afterwards.

## 2026-07-31
- **Pulled and reviewed Farjad's 8 commits** (`be8bd2a` -> `872acc4`, 23 files, +532/-770).
  He worked directly on top of the settings hub, so I checked rather than assumed: 13 tabs
  intact, role filtering intact, all 13 panel wrappers still normalised, all 5
  double-padding fixes still in place. Merged state verified — ratchet **712** (baseline
  723), clean build, 60/60 test files green.
- Note for the record: he **reversed my call** on the duplicate per-tab `<h1>`s. I kept them
  as section headings; he removed them. His is the better call now that Settings sits behind
  a gear icon in the sidebar footer — the page title is no longer ambiguous.
- Two knock-ons for our task list: the *"Move Web Traffic under Team & Settings"* task text
  is stale (that category is now **Team & Content**), and my consolidation left **7 settings
  tabs nesting their own `Tabs` inside the hub tab** — that's my mess to clean, now an open
  task in section B.
- Wrote the client-facing 29–30 July work report for Jason.

## 2026-07-30
- **Consolidated 13 separate settings pages into one tabbed Settings hub**
  (`b5f3e7d`, `601f380`). New `SettingsHub.tsx` is a *container*, not a rewrite — each page
  is mounted unchanged as a tab, so there was nothing to re-test at the panel level. The 13
  old routes now redirect to `/admin/settings/<slug>` so existing links and bookmarks keep
  working. Tab rail scrolls horizontally rather than wrapping into 4–5 rows on mobile, and
  tabs are filtered by role.
- **Test suite cleanup, done once and properly** (`48ff6c6`, `7e95858`, `168cd33`,
  `fcddb02`). **61 files / ~10,400 lines deleted; 1622 tests -> 829, with zero coverage
  lost** — because there was none to lose. Not one of the deleted files imported a line of
  product code: they defined their own copy of the logic and tested the copy, asserted a
  literal against itself, or grepped source text.
  - The case that settles the argument: `client-edit-tabs.test.ts` asserted the **correct**
    discountable-item rule and passed green, while `ClientEdit.tsx` used
    `isDiscountable !== false` against a MySQL tinyint `0` — so production discounted
    everything. The test never saw real data, so it could never catch it.
  - Rather than throw the knowledge away, I harvested **23 real business rules** out of them
    into `test-harness/RULES-TO-COVER.md` as an integration-test backlog (discount maths,
    $10 flat shipping, 3.5% card fee, payment-reminder eligibility, the double-deduct
    inventory guard, merge rules).
  - **2 files were repaired instead of deleted** — `linkifyMessage` and `timezone-fix` now
    import the real functions. 27 tests went from zero coverage to real coverage with no
    product change. `linkifyMessage`'s copy had already **drifted** from the real one.
  - Fixed the flakiness at the root instead of per-test: `testTimeout` 5s -> 30s. Several
    tests do a heavy `await import()` and passed alone but failed in a full run, which is
    why the suite's failure count used to wander on identical code.
  - Wrote the reasoning into `test-harness/README.md` so this doesn't re-accumulate. The
    one-line test for a new test: *could this go red because of a change to the application?*
- **Converted the last internal hard reloads to client-side navigation** (`729cd04`) — the
  remaining `window.location` jumps that threw away app state and re-downloaded the bundle.
- **Layout tidy: five high-traffic admin pages were double-padding themselves** (`be8bd2a`).
  `AdminLayout` already wraps every page in `p-3 md:p-6`; these added their own `p-6` on top,
  so their content sat 24px in from every other admin page. Class strings only.
  - Audited the rest and found **18 apparent table-overflow problems were all false
    positives** — the shared `Table` primitive already wraps in an `overflow-x-auto` div.
    Worth knowing before someone "fixes" it again.
- **Sleep Quality was showing `/5` when it's stored out of 10** (`bda822d`).
- ⚠️ **Log discipline:** this entry and 07-31 were written on 08-01, not on the day. The
  workspace rule is a log line per finished task and I was ticking `current.md` and
  updating `context.md`/`decisions.md` but skipping the log. Back to per-day from here.

## 2026-07-29 (late)
- **All 6 unauthenticated endpoints now closed, and runtime-verified.**
- ⚠️ **Correction to my earlier entry:** I reported `getEnrollmentPublic` as fixed. It was —
  but the fix was **bypassable**, because `completePaymentPublic` would mint and *return* a
  30-day `authToken` for any `enrollmentId`, unauthenticated, with no proof of payment
  (`paymentId` was optional). Gating an endpoint on a token is worthless while anyone can
  mint the token. It also overwrote the enrollment's `email`/`clientName` from the request
  body, so the verification email went wherever the caller asked — takeover, not just
  disclosure. **Deleted**; only caller in repo history was the unrouted
  `TransformationJourney.tsx` (already gone in `4a15cc3`).
- Gated the intake family (`getIntakeForm`/`saveIntakeForm`/`submitIntakeForm`) on
  **staff role | signed-in owner | enrollment token**, and the check-in pair
  (`getForClient`/`submit`) on **protocol token | signed-in owner**. The **write** siblings
  were as open as the reads — anyone could overwrite a client's medical intake or post
  responses onto their check-in. Check-in emails now carry `?token=`.
- Token rides in `sessionStorage` (reusing the keys `TransformationVerify.tsx` already wrote
  and nothing read), never the URL — a URL token lands in history and in the `Referer` sent
  to Stripe, and this one opens a medical file.
- **Deliberate UX change, needs Jason's nod:** `createDirectEnrollment` returns a token only
  for enrollments it *creates*. The resume-by-email branch gets none: `email` there is an
  unverified claim, so issuing one would make knowing a client's address enough to read
  their intake. Returning clients must reopen from their email link.
- **Actually verified this time.** Real server + real MySQL + 14 HTTP cases: no token, wrong
  token, cross-client token, expired token, non-existent id (identical error — no id
  probing), plus the positive paths. Inspected the DB afterwards to confirm rejected writes
  didn't land and accepted ones did. One case (`checkin.submit`) came back "rejected" for the
  **wrong reason** — the global check-in kill switch fired before my gate — so I enabled
  check-ins and re-ran it properly. A pass for the wrong reason is not a pass.
- **Still unverified:** staff-session and signed-in-owner paths (need real OAuth) and guest
  checkout through Stripe in a browser. Typecheck/tests/build all pass on code where the
  client funnel is broken, so those aren't evidence.
- Extended the integration harness 10 → 17 tables (check-ins, intake form, notifications,
  site settings) from the prod snapshot; verified they load on a fresh volume.
- **Two harness/tooling findings, both Farjad's territory:** `pnpm db:push` **cannot work** —
  `drizzle-kit generate` emits **zero** `PRIMARY KEY` clauses and a quoted
  `DEFAULT 'CURRENT_TIMESTAMP'`, both rejected by MySQL. And `pnpm testdb:up` returns healthy
  while init scripts are still running, so an immediate query sees an empty schema.
- Deleted `phone-collection.test.ts` + `enrollment-notifications-csv.test.ts` (363 lines,
  every assertion a literal compared to itself, all about the deleted endpoint) and the same
  junk block inside `intakeFormFlow.test.ts` — kept that file, it genuinely exercises the
  mailer. Also fixed a latent cold-cache flake there: each test re-imports `emailService`
  under `vi.resetModules()` (~4s) against a 5s default, so it passed warm and failed cold.
- Suite: **1623 passing / 121 files** (was 1661/123 — exactly the 38 junk tests removed).
  Ratchet 720 vs baseline 723. Build clean.

## 2026-07-29 (evening)
- **Sealed local dev.** `APP_ENV` defaulted to `'production'`, so with the committed `.env`
  (prod DB + real Resend sender) simply running `pnpm dev` started ~20 crons mailing real
  clients. `server/_core/appEnv.ts` now *derives* the environment; anything that isn't a real
  deployment resolves to `local` and inherits the seal staging already had. Reused the existing
  choke point rather than inventing a new flag: `isStaging()` → `sideEffectsDisabled()`, 6 call
  sites. Verified the truth table across all 8 env combinations — **Railway and staging behave
  exactly as before**, which was the thing that had to not break. Override for deliberate local
  testing: `ALLOW_LOCAL_SIDE_EFFECTS=true`.
- **Security, 3 of 6 unauthenticated endpoints closed.** `getEnrollmentPublic` was handing the
  `authToken` magic-link column to anyone counting integers — now requires that token and
  returns an explicit allow-list. `refund.getByClient` admin-gated (zero callers).
  `capturePaymentPublic` **deleted**: it marked custom orders paid with no Stripe check *and*
  had no legitimate caller — every `success_url` points at `/payment/success` and the signed
  webhook was always the real path.
- Two bugs found in passing: cancelling a custom-order payment hit a **404** (`cancel_url`
  emitted `/custom-order/payment-cancelled/<id>`, route was `/custom-order/:id/payment-cancelled`);
  and `AdminLayout` calls hooks after its early returns — a real rules-of-hooks violation,
  recorded in `STATE.md`, not fixed because it restructures the shell.
- Removed dead code: `TransformationJourney.tsx` (2,706 lines, unrouted) + the orphaned
  custom-order success page. Converted the two hard reloads that actually cost staff work.
- Fixed the last flaky test: `inventory-category-enhancements` imported the 9.6k-line router
  graph inline at ~4.9s against a 5s timeout, so the suite's pass count was a coin flip.
  Hoisted to a `beforeAll`. (Got it wrong first — hoisted into the inner `describe`, putting
  `appRouter` out of scope for a sibling block. **Typecheck did not catch it**; only running
  the tests did.)
- Added **`STATE.md`** at the repo root: a dated record of what the code actually does and how
  each claim was verified. `docs/` is gitignored, so everything written there is local-only and
  never reaches the repo — this is the committed replacement.
- Verified throughout: ratchet 723, clean build, **1661 tests green**.

## 2026-07-29
- **Fixed the whole-app re-render on every admin navigation** (`5273297`). Two causes, not
  one: the only Suspense boundary was App-level with a full-screen `bg-slate-900` fallback,
  and `AdminLayout` was rendered *inside* each of 64 pages instead of above the router — so
  every click unmounted the entire shell and flashed a dark screen. Hoisted the layout above
  the admin router and scoped the page-chunk boundary inside the chrome. Follow-ups:
  `85e72db` (my import-stripping regex ate a line break on 21 CRLF files) and `a43fb6f`
  (restored the 404 for unmatched `/admin/*`, which the nested Switch had dropped).
- **Found and fixed why admin chat showed nothing** (`1e0c4eb`). Raw `sql`` ` templates
  still used the code-only `personId`; MySQL threw `Unknown column 'c2.personId'` on every
  inbox call. Six sites. `contactsHelper`'s six UPDATEs sit in a log-only try/catch, so
  contact renames had been failing **silently**. Messages themselves were never affected.
- **Centralised the app URL and removed the old domain** (`7851dd8`). ~70 copies of
  `VITE_APP_URL || 'https://peptidecoach.pro'` -> `server/lib/appUrl.ts`. Also fixed the
  non-fallback ones: the admin email template **hotlinked its logo from peptidecoach.pro**,
  plus footer/brand links and the install instructions.
- **Test suite: 9 failing -> 0, stable across three runs.** Deleted 5 files + 14 tests whose
  every assertion was "this name exists"; moved 3 DB-dependent files to
  `*.integration.test.ts`. Kept `duplicate-prevention` and `coach-notes-email` — my first
  automated pass misclassified both as wiring-only and they hold real tests, so every
  deletion was confirmed by reading the file. Ratchet baseline 725 -> **723**.
- **Real bug surfaced by a failing test:** Stripe receipts said a bare "Payment" — the
  template's `paymentMethod` union omitted `'stripe'` while its callers default to it.
- **App review** -> `docs/risks/2026-07-28-launch-readiness-audit.md`. Headline: the four
  core workflows are in better shape than expected; the gap is **authorization**. Six
  `publicProcedure` endpoints take a sequential integer ID and return real client data —
  `getIntakeForm` exposes 36 clients' full health intake unauthenticated. Logged under
  section D in `current.md`.
- ⛔ Discovered `pnpm dev` starts ~20 crons against the **prod DB with a live mailer**. Ran
  it ~35s, killed it, confirmed via DB that nothing was sent. See the warning in
  `claude/context.md` — this blocks all local runtime verification until it's gated.
- Note: root `CLAUDE.md` said the ratchet baseline was 743; it was already lowered in
  `08dd789` and is **723** after today. Corrected in the file.
- Hours: ~

## 2026-07-27 / 28 — backfilled
*This log did not exist yet — `workspace/` was created on 07-29 (`c1de54f`). Written up
on 08-01 from the commits. All four landed 03:47–04:55 on the 28th, so it was one session
across the two dates, not two days' work.*

- **Data model cleanup** (`08dd789`, 41 files). Several related problems in how the app
  records *who someone is*:
  - `contacts` is the canonical record of a **human** — staff, clients, leads and
    prospects alike — so the CRM-flavoured name was actively misleading. Renamed in code
    to `people`/`personId` across 25 files. The Drizzle defs still **point at the existing
    physical table names**, so this carries **zero deploy risk**: there's no window where a
    renamed DB meets un-renamed code. The physical rename is written and waiting in
    `cutover/phase4-people-rename.sql` for a maintenance window.
  - `lifecycle_stage` was `NOT NULL DEFAULT 'lead'`, so "not applicable" was
    unrepresentable and **6 admins were labelled leads, 2 as active clients**. Made
    nullable and cleared for staff. NULL matches no `= 'lead'` filter, so 167 existing
    reads stop counting staff **without being edited**.
  - **Saved addresses were keyed to a login, not a person** — only 79 of 122 people have
    one, so ~43 people (including everyone imported from peptidecoach.pro) could not own
    an address at all. Re-keyed to the person; new `requirePersonId()` fails loudly rather
    than falling back to `userId`, which would quietly resurrect the bug.
  - **Removed coupons (closes R7).** The feature was *not* already gone as believed — the
    admin surface had been removed but the **client-facing coupon box was still live** on
    the protocol page. Protocol discounts are unaffected; they use a different field.
  - **Dropped 14 dead tables** (170 -> 156), each verified at drop time as 0 rows, no
    inbound FK, no reference by either Drizzle identifier **or** raw SQL. DDL saved so any
    is recreatable. Deliberately **kept 4 empty tables** that live code writes to — empty
    is not the same as dead, and a camelCase grep alone would have missed all four.
  - Ratchet 738 -> **725** (dead code was carrying 13 tolerated errors).
- **Removed 5 unused admin pages** (`5be7c4f`, all on Jason's "Go" list). Kept the
  underlying `logAudit()` record-keeping — only the viewer is gone; whether to stop
  *writing* audit records is the open R19 compliance question, not something to decide by
  deleting code. Also settled the "Fulfillment Queue vs Packing Slips are redundant"
  report: **they aren't duplicates**, one is the daily work tool and one is the admin
  surface. Fixed at the information-architecture level (naming, purpose statements,
  cross-links) rather than by deleting either.
- ⚠️ **Fixed a gap I had just introduced** (`d91a994`). Two individually-correct removals
  combined badly: I filtered the Team page to staff only (it had been listing 71 clients,
  one dropdown from being granted admin) and deleted Contact Admin — which turned out to
  be the de-facto "browse everyone" screen. Between them, **22 people were left with no
  admin surface at all**, including two real store customers. Added an "All People" view
  where every badge is **derived from which relationship rows exist**, never from a stored
  label — so it can't drift the way `lifecycle_stage` had.
- **Test suite: 148 failing -> 15** (`5df459d`). The suite *looked* comprehensive (169
  files, 2296 tests) but had been broadly red for a long time, so nobody could read it as
  a signal. Deleted 29 files (~4,800 lines): 5 had **hardcoded Manus paths**
  (`/home/ubuntu/...`, unpassable on any machine — 109 of the errors on their own), 22
  were source-text greps, 2 were debug scripts. Classified by **assertion ratio, not by
  name**. Recategorised rather than deleted: 7 connectivity probes that call live
  Calendly/Google/SMTP with real credentials (an ops question, not a test), and 2
  integration tests — one of which was **running against PRODUCTION on every `pnpm test`**.
  Fixed `planQuiz` by removing price assertions rather than editing them to match the code;
  silently updating an expectation to match cements whatever the truth happens to be.
- Flagged to Jason at the time: the quiz quotes $3,000 flagship / $8,500 Functional Health
  Elite / $15,000 / $1,000. **Moot as of 08-01** — direct UI-based payments are being
  removed from humanedge.health, so the quiz funnel goes with them. See `decisions.md`.
