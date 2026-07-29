# Saboor, daily log

Only Saboor edits this. Newest entry at top. A short running list of what you worked on
each day, so Farjad and both Claude sessions can see progress.

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
