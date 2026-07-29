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

## ⛔ Waiting on someone else
*Open questions for Farjad and Jason live in `workspace/decisions.md` under "Open / to decide",
not here — this file is tasks. Only the follow-up actions sit below.*

- [ ] **Confirm `VITE_APP_URL` is set on the Railway service** (needs Railway access). The
      fallback is correct now (`https://www.humanedge.health`), so nothing breaks if it's
      missing — but we should know rather than assume. `Owner: ___`
- [ ] **Act on the `pnpm db:push` decision** once Farjad makes it (see decisions.md): either
      add `.primaryKey()` across `drizzle/schema.ts` or document snapshot-extraction as the
      only supported path in `test-harness/README.md`. `Owner: ___`

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

Status 2026-07-30: 1, 2 ✅ confirmed on the deployed build (intake panel renders + PDF export
works). 7 needs a **client-role** login — `jason@sossupport.net` owns protocol 930002 with 15
check-ins, so that account can test it. 3–6, 8 still open.

### Settings consolidation
| # | Path | Expect |
|---|---|---|
| 9 | `/admin/settings` | Opens on the Site tab, grouped tab bar renders |
| 10 | Click through all 14 tabs | Each panel loads its own content; URL tracks the tab |
| 11 | `/admin/notification-settings` (old path) | Redirects to `/admin/settings/notifications` **without a full page reload** |
| 12 | `/admin/settings/bogus` | Falls back to the Site tab, not a blank page |
| 13 | Sidebar → Team & Settings | One "Settings" entry, not nine |

`Owner: ___`

---

## A. Navigation and stability
*Mostly done.*

- [x] **Whole-app re-render on every admin navigation.** Fixed, commit `5273297`.
- [x] **Back buttons app-wide.** Fixed, T4 sweep `17f43d4` + check-in review fix `6607f58`. Spot-verify only.
- [~] **Broken / dead links.** 404 page restored for unmatched `/admin/*` (`a43fb6f`).
      Verify the remaining paths identified in the app review.
      `Owner: ___`
- [x] **Remaining hard reloads — done.** `Owner: Saboor`
      Every internal `window.location.href` that shouldn't reload is now a wouter navigation.
      `AdminLayout` ×2 (Access Denied buttons), `Booking` → `/`, `CoachingPrograms` ×2.
      `CheckinHistoryTab` and `client-edit/DetailsTab` were converted in yesterday's sweep.
      **Six remain and all six are deliberate** — leave them:
      - `AdminLayout:320`, `DashboardLayout:76` → `/login?returnTo=…`: auth boundary, the
        session is changing, so the app must re-bootstrap.
      - `AgeDisclaimer:22` → `/age-restricted`, `AgeRestricted:42` → `/`: age-gate boundary.
      - `AcceptInvite:47` → `/admin`: the user's role changed a moment ago; a soft nav would
        render admin against stale auth state.
      - `CustomOrderPaymentCancelled:25` → `/`: post-payment, per the original triage.
      ⚠️ **Correction:** `STATE.md` previously claimed `AdminLayout` violated the rules of
      hooks, and that was **wrong** — the hooks I saw "after the early returns" belong to
      `AdminLayoutContent`, a separate component in the same file. `AdminLayout` itself calls
      four hooks, all before every return. That false finding is what blocked these two
      conversions for a day. Retracted in STATE.md.
- [x] **Launchpad Settings removed (admin page, DB tables, routers).** Dug into it first:
      the admin "Launchpad Settings" page and the real client-facing `/launchpad` page
      (`LaunchpadHub.tsx`) were **completely disconnected** — admin edited a `launchpad_items`
      table that the client page never read at all; the client page is 100% hardcoded JSX.
      Full writeup in `workspace/claude/context.md`. Removed: `LaunchpadSettings.tsx` (admin
      page), its route + sidebar nav entry + breadcrumb/search-index entries, `launchpadRouter`
      + `hubLinksRouter` (the second was orphaned as a side effect, its only caller was a dead
      fetch already removed from `LaunchpadHub.tsx` in `dd24c24`), all 15 related `server/db.ts`
      functions, and the `hub_links` / `launchpad_items` / `launchpad_item_videos` schema
      definitions. Archived the now-dead `scripts/seed-launchpad.mjs`. DDL for the 3 tables
      saved to `cutover/dropped-tables-ddl.sql` for recovery, **actual `DROP TABLE` not run
      yet** (no DB access from this pass, and row counts weren't verified) — run manually
      after checking for rows: `DROP TABLE hub_links, launchpad_items, launchpad_item_videos;`
      The live `/launchpad` page itself is untouched by this and stays (linked from 5 email
      templates); its content was separately trimmed to Jason's list in `dd24c24`/`a74d986`.
      Commit `d0c2488`. `Owner: Farjad`
- [ ] **Dashboard / launchpad dead-ends.** Remaining nav cleanup unrelated to the settings
      removal above.
      `Owner: ___`
- [ ] **Home page verification.** Confirm the HumanEdge cover is fully resolved across all entry points.
      `Owner: ___`

## B. UI and UX
*The main remaining M1 work.*

- [x] **Consolidate the settings pages into one tabbed Settings page.** `Owner: Saboor`
      `client/src/pages/admin/SettingsHub.tsx` — 13 routes are now tabs of `/admin/settings`,
      grouped General / Notifications / Email. A *container*, not a rewrite: each tab renders
      the existing page component untouched, so no page's behaviour or data fetching changed.
      - Deep-linkable: `/admin/settings/<slug>`; switching tabs updates the URL with
        `replace: true`, so Back leaves Settings instead of walking every tab visited.
      - All 13 old paths still work — App.tsx `<Redirect>`s each to its tab, **client-side**,
        so bookmarks survive without reintroducing a hard reload.
      - Only the selected panel mounts, so opening Settings fetches one panel's data, not 14.
      - **Tabs are role-filtered** (`roles` on each tab, default admin-only). Collapsing 9
        sidebar links into one page would otherwise have shown managers the admin-only panels
        the sidebar used to hide. `Team Email Preferences` stays a separate sidebar entry for
        managers, since Settings itself is admin-only.
      - Sidebar: 9 entries → 1 "Settings".
      - **`Templates` deliberately excluded** despite being on the original list: it has
        `/new` and `/:id` sub-routes, so it's a CRUD area, not a settings panel — folding it
        in would mean nesting a router inside a tab.
      - **Needs a browser pass** (below): typecheck/build/tests can't see a tab that renders
        blank, and the panels need an admin session I can't get locally.
      - **Follow-up (Farjad, same pass as the Launchpad Settings removal above):** this was
        built with a "Launchpad" tab (13th route) wrapping the now-deleted
        `LaunchpadSettings.tsx`. Removed that tab + its lazy import from `SettingsHub.tsx`
        and the now-pointless `/admin/launchpad-settings` redirect from `App.tsx`, so it's
        12 tabs now. Nothing else about the consolidation changed.
- [ ] **Tidy the panels now they're tabs.** Each still renders its own `<h1>` and its own page
      padding, so there's a duplicate heading under the Settings title and inconsistent
      spacing between tabs. Cosmetic only; deliberately left out of the move so the
      consolidation stayed behaviour-neutral. `Owner: ___`
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
