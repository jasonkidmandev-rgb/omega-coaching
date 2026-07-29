# Current Milestone, M1: Stabilize and polish the look

**Target:** Week 1 · ~40h Farjad billed + Saboor full-time alongside
**Status refreshed:** 2026-07-29

**How to use this file:** pick a task, put your name in its `Owner` slot, tick the box
when done. Add new items you find under the right area. `git pull --rebase` before editing.

**Legend:** `[x]` done · `[~]` partial / in progress · `[ ]` open

---

## Claim board (god-files)
Before editing `server/routers.ts` / `server/db.ts` / `drizzle/schema.ts`, add a line:
`<name>, <file>, until <time>`.
- *(none right now)*

---

## ⛔ Blocked on someone else
*Nobody working in this repo can close these alone. Raised 2026-07-29 by Saboor.*

### For Farjad (owns DB / schema migrations)
- [ ] **`pnpm db:push` cannot work on this repo — don't rely on it for the cutover.**
      `drizzle-kit generate` emits invalid MySQL from `drizzle/schema.ts`:
      - **zero** `PRIMARY KEY` clauses in the entire generated file → MySQL
        `ERROR 1075: there can be only one auto column and it must be defined as a key`;
      - `DEFAULT 'CURRENT_TIMESTAMP'` emitted **quoted**, so it's a string literal →
        `ERROR 1067: Invalid default value`.
      Root cause: the table definitions are missing `.primaryKey()`. Found while trying to
      build a test DB from the schema; worked around by extracting DDL from
      `cutover/local-data/peptidecoach_snapshot_20260701.sql` instead (which is what
      `test-harness/README.md` documents anyway). **Decide:** fix `drizzle/schema.ts`, or
      declare snapshot-extraction the only supported path and say so in the README.
      `Owner: Farjad`
- [ ] **Confirm the raw-SQL `personId` trap is retired by your migration.**
      `cutover/phase4-people-rename.sql` is supposed to make `personId` physical. Until it
      runs, every `` sql`` `` template using `personId` is a live bug that **nothing**
      catches — not tsc, not the ratchet, not the unit suite. Confirm timing.
      `Owner: Farjad`

### For Jason (product decisions)
- [ ] **Returning clients can no longer resume the intake form in-browser.**
      `createDirectEnrollment` now issues an access token only for enrollments it *creates*.
      On the "you already have an enrollment" branch it issues none, because there the email
      address is an **unverified claim** — handing out a token would mean knowing a client's
      email is enough to read their full medical intake. Effect: a returning client must
      reopen from their enrollment email instead of re-entering name + email. **Confirm this
      trade is acceptable, or we need email verification on that branch.**
      `Owner: Jason`
- [ ] **Does `support@humanedge.health` exist and is it monitored?** It is now printed on the
      custom-order payment screens; client mail bounces if the alias isn't real.
      `Owner: Jason`
- [ ] **Coaching checkout: keep or retire?** Now that purchases run through the Omega
      Longevity funnel, decide whether the app still sells coaching plans directly. Governs
      how much of the payment surface we build vs remove.
      `Owner: Jason`
- [ ] **`isDiscountable` currently does nothing** — every item is discounted regardless of
      the flag. Correcting it **raises some client totals**, so it needs his sign-off.
      `Owner: Jason`

### Needs Railway access
- [ ] **Confirm `VITE_APP_URL` is set on the Railway service.** The fallback is correct now
      (`https://www.humanedge.health`), so nothing breaks if it's missing — but we should
      know rather than assume.
      `Owner: ___`

---

## 🔍 Browser pass still owed on the auth work
*The token paths are runtime-verified over HTTP. The **session** paths are not — they need a
real OAuth login, which isn't available locally. If one of these is wrong it **breaks a screen**
rather than leaking anything, but it must be checked before Jason's team sees it.*

| # | Path | Expect |
|---|---|---|
| 1 | `/admin/enrollments` → open an enrollment → Intake Form panel | Intake renders (staff session path) |
| 2 | `/admin/clients/:id` → Intake tab | Intake renders; inline field edit saves |
| 3 | `/intake` → enter name + email → wizard | Wizard loads, autosaves, submits |
| 4 | `/transformation/checkout` → guest → pay → `/payment/success?enrollmentId=…` | Intake still authorizes **after the Stripe round-trip** (sessionStorage survives) |
| 5 | `/transformation/verify?token=…&enrollmentId=…&autoIntake=true` | Magic link opens intake |
| 6 | `/checkin/:id?token=…` (from a check-in email) | Check-in opens and submits |
| 7 | `/checkin/latest` → click a check-in (signed-in client, **no token**) | Opens via session — this is the owner path |
| 8 | `/checkin/:id` with **no** token, signed out | Clean "link invalid or expired", not a crash |

`Owner: ___`

---

## A. Navigation and stability
*Mostly done.*

- [x] **Whole-app re-render on every admin navigation.** Fixed, commit `5273297`.
- [x] **Back buttons app-wide.** Fixed, T4 sweep `17f43d4` + check-in review fix `6607f58`. Spot-verify only.
- [~] **Broken / dead links.** 404 page restored for unmatched `/admin/*` (`a43fb6f`).
      Verify the remaining paths identified in the app review.
      `Owner: ___`
- [ ] **Remaining hard reloads.** 36x `window.location.href` + 11x internal `<a href="/…">`.
      Convert internal navigation that shouldn't reload to wouter; keep logout / external / post-payment.
      Smaller job now the main re-render is fixed. Triage already done, see
      `docs/risks/2026-07-29-navigation-rerender-trace.md`:
      - 4 of the `window.location.href` are auth-boundary redirects and **should stay** a hard reload.
      - `/terms` + `/privacy` anchors from public pages are fine as plain `<a>`.
      - The ones that actually bite staff: `CheckinHistoryTab.tsx:369` (check-in detail, daily use),
        `AdminLayout.tsx:359,368`, `client-edit/DetailsTab.tsx:550` → `/admin/programs`.
      `Owner: ___`
- [ ] **Dashboard / launchpad dead-ends.** Clean up (LaunchpadSettings still present;
      the full launchpad strip also sits in M2).
      `Owner: ___`
- [ ] **Home page verification.** Confirm the HumanEdge cover is fully resolved across all entry points.
      `Owner: ___`

## B. UI and UX
*The main remaining M1 work.*

- [ ] **Consolidate ~15 settings pages into one tabbed Settings page.** Still separate:
      `Settings`, 5x `Notification*`, 3x `Email*`, `CalendlySettings`, `IntegrationSettings`,
      `LaunchpadSettings`, `Templates`. Move existing pages under tabs, don't rebuild.
      `Owner: ___`
- [ ] **Flag removable settings** while consolidating (actual removal happens in M2).
      `Owner: ___`
- [ ] **Layout tidy** on the highest-traffic admin pages.
      `Owner: ___`
- [ ] **Desktop + mobile consistency** for the navigation and UI changes.
      `Owner: ___`
- [x] **Restyle the admin sidebar to the HumanEdge brand.** Was a hardcoded generic
      navy (`#1e3a5f`/`#2d4a6f`), unrelated to the brand. Now a token-driven dark chrome:
      `slate-950` background, amber-to-orange gradient on the active nav item, and the
      real `HumanEdgeMark` + `Wordmark` in the header instead of a plain "Protocol Manager"
      label. All values are `--sidebar-*` CSS variables in `index.css`, so future palette
      changes are a one-file edit, `AdminLayout.tsx` only reads semantic classes.
      Commit `cfdf46a`. `Owner: Farjad`

## C. Theme
*Mostly open.*

- [x] **Tailwind Typography plugin enabled**, fixes inert `prose` app-wide. Commit `57c3e00`.
- [x] **Match sidebar/login/cover to the real Omega Longevity palette.** Was a neutral
      near-black (`slate-950`) + amber-to-orange gradient, noticeably darker/more
      saturated than the brand. Matched against `docs/OmegaLongevity.png`: deep navy
      `#141b2e` background, flat champagne gold `#c9a869` accent (not a gradient),
      dark-navy text on the gold CTA (matches the real button). Values are
      `--brand-dark`/`--brand-gold` tokens in `index.css` (thin aliases over
      `--sidebar-*`, one source of truth for all three surfaces). Commit `4cb2f75`.
      `Owner: Farjad`
- [ ] **Extend the Omega Longevity / HumanEdge brand further** (fonts, remaining admin
      pages/buttons outside the sidebar) using the same `--brand-*` tokens.
      `Owner: ___`
- [x] **Set shared theme tokens** so styling stays consistent and easy to maintain.
      Done for the dark chrome (sidebar/login/cover) via `--sidebar-*`/`--brand-*`;
      the wider app-page token sweep (178+ files on hardcoded Tailwind colors) is
      still open, see the sidebar-restyle note above for the same pattern to reuse.
      `Owner: ___`

## D. Correctness / blockers found during the M1 app review
*Not originally in M1, but these outrank polish. Found by Saboor, 2026-07-29. Full detail in
`docs/risks/2026-07-28-launch-readiness-audit.md`.*

- [x] **Admin chat/inbox showed nothing.** Raw SQL used the code-only `personId`; 6 sites
      fixed (`1e0c4eb`). Contact renames had also been failing **silently** for weeks.
      `Owner: Saboor`
- [x] **Hardcoded old-domain (`peptidecoach.pro`) links**, ~70 places, all client-facing.
      Centralised in `server/lib/appUrl.ts` (`7851dd8`).
      `Owner: Saboor`
- [x] **Stripe receipts said a bare "Payment."** The template's `paymentMethod` union
      omitted `'stripe'` while its callers default to it (`7851dd8`).
      `Owner: Saboor`
- [x] **Test suite green + stable**, no-value tests removed (`7851dd8`).
      `Owner: Saboor`
- [x] **LAUNCH BLOCKER — unauthenticated endpoints, all 6 closed.** `Owner: Saboor`
      - ✅ `getEnrollmentPublic`: was handing out the `authToken` magic-link column to anyone
        counting integers, now requires that token and returns an explicit allow-list.
      - ✅ `capturePaymentPublic`: **deleted**. Marked orders paid with no Stripe check and had
        no caller, every `success_url` goes to `/payment/success`, the signed webhook was
        always the real path.
      - ✅ `refund.getByClient`: admin-gated (zero callers).
      - ✅ `completePaymentPublic`: **deleted.** ⚠️ This one was the *master key*: unauthenticated,
        took any `enrollmentId`, required no proof of payment (`paymentId` was optional), and
        **returned a freshly minted 30-day `authToken`** — so the token gate added to
        `getEnrollmentPublic` was bypassable while it existed. It also overwrote the
        enrollment's `email`/`clientName` with caller-supplied values, sending the
        verification email wherever the caller asked (takeover, not just disclosure).
        Its only caller in repo history was the unrouted `TransformationJourney.tsx`,
        deleted in `4a15cc3`.
      - ✅ `getIntakeForm` + `saveIntakeForm` + `submitIntakeForm`: gated on
        **staff role | signed-in owner | enrollment `authToken`**. The two write siblings were
        as open as the read — anyone could overwrite a client's medical intake.
      - ✅ `checkin.getForClient` + `checkin.submit`: gated on
        **protocol `accessToken` | signed-in owner**. `submit` was equally open (anyone could
        post responses onto any client's check-in). Check-in emails now carry
        `?token=<protocol accessToken>`.
      - Tokens ride in `sessionStorage`, never the URL (a URL-borne token lands in browser
        history and in the `Referer` sent to Stripe). Reuses the keys
        `TransformationVerify.tsx` already wrote and nothing read.
      - ⚠️ **Behaviour change to confirm with Jason:** `createDirectEnrollment` issues a token
        only for enrollments it *creates*. The "resuming your existing journey" branch gets
        none, because there `email` is an unverified claim — issuing one would make knowing a
        client's email enough to read their medical history. Returning clients must reopen
        from their email link.
      - **Verified at runtime**, not just typechecked: real server, real MySQL, 14 HTTP cases
        including cross-client tokens, expired tokens, and non-existent ids (which return an
        identical error, so ids can't be probed). DB inspected afterwards to confirm the
        rejected writes really didn't land. See `workspace/log/saboor.md`.
      - **Still unverified:** the staff-session and signed-in-owner paths (need a real OAuth
        login) and guest checkout through Stripe in a browser. Worth a pass before handoff.
- [x] **Gate cron init so local dev can't mail real clients.** `Owner: Saboor`
      `server/_core/appEnv.ts` now derives the environment instead of defaulting to
      `'production'`. Railway and staging behave exactly as before; `pnpm dev` / vitest
      resolve to `local` and inherit staging's existing seal, no crons, no email, no IMAP
      polling, Stripe test mode. Gate is `sideEffectsDisabled()` (was `isStaging()`), 6 call sites.
      - **If you add a cron or a mailer, gate it with `sideEffectsDisabled()`**, not a bare `NODE_ENV` check.
      - Override for deliberate local testing: `ALLOW_LOCAL_SIDE_EFFECTS=true`
        (point `DATABASE_URL` at `pnpm testdb:up` first, `.env` still targets prod data).
      - This unblocks local runtime verification, which the three remaining auth holes above need.
- [ ] **Confirm `VITE_APP_URL` is actually set on the Railway service** (needs Railway access).
      `Owner: ___`
- [ ] **Verify `support@humanedge.health` mailbox exists.** It now appears on the custom-order
      payment screens; client mail will bounce if the alias isn't set up.
      `Owner: ___`
- [ ] **Sleep Quality shows `/5` but is stored 1-10** (slider + server both `max 10`). 4-line fix.
      Surfaces: `ClientEdit.tsx:2448,2542`, `Enrollments.tsx:1252,1360`.
      `Owner: ___`
- [x] **Integration harness extended, 10 → 17 tables.** `Owner: Saboor`
      The auth work couldn't be runtime-verified because the harness only had the identity
      tables. Added `checkin_templates`, `checkins`, `checkin_responses`,
      `intake_form_responses`, `intake_form_signatures`, `notifications`, `site_settings`,
      extracted from the prod snapshot per the documented method and confirmed to load on a
      fresh volume.
- [ ] **⚠️ FARJAD (migration owner): `pnpm db:push` cannot work on this repo.**
      `drizzle-kit generate` emits invalid MySQL from `drizzle/schema.ts` — **zero**
      `PRIMARY KEY` clauses in the entire generated file, and `DEFAULT 'CURRENT_TIMESTAMP'`
      quoted as a string literal. MySQL rejects both (`ERROR 1075`, then `ERROR 1067`).
      Found while trying to build a test DB from the schema; worked around by extracting DDL
      from the prod snapshot instead. The schema definitions are missing `.primaryKey()`.
      `Owner: ___`
- [ ] **`pnpm testdb:up` returns before the DB is ready.** `--wait` passes the `mysqladmin
      ping` healthcheck while the `docker-entrypoint-initdb.d` scripts are still running, so
      querying immediately after shows an empty schema and looks like a broken harness.
      Wait for the tables, not the container. Worth a note in `test-harness/README.md`.
      `Owner: ___`

---

## Handoff to testing
- [ ] Flag each area to Jason's team as it goes live (desktop, mobile, browsers), using
      their bug format (screenshot, steps, expected vs actual).
      `Owner: ___`

---

**Net for M1:** navigation and back buttons are largely done. The real remaining M1 work
is the **settings consolidation into tabs** and the **app-wide theme pass**, plus
finishing the smaller nav cleanups and the three open auth holes in section D.
