# Saboor, daily log

Only Saboor edits this. Newest entry at top. A short running list of what you worked on
each day, so Farjad and both Claude sessions can see progress.

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
