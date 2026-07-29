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

## C. Theme
*Mostly open.*

- [x] **Tailwind Typography plugin enabled**, fixes inert `prose` app-wide. Commit `57c3e00`.
- [ ] **Extend the Omega Longevity / HumanEdge brand** (colours, fonts, buttons) across the
      admin app, from the shared `HumanEdgeBrand` component.
      `Owner: ___`
- [ ] **Set shared theme tokens** so styling stays consistent and easy to maintain.
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
- [~] **LAUNCH BLOCKER — unauthenticated endpoints, 3 of 6 closed.**
      `Owner: Saboor` (open items unassigned)
      - ✅ `getEnrollmentPublic`: was handing out the `authToken` magic-link column to anyone
        counting integers, now requires that token and returns an explicit allow-list.
      - ✅ `capturePaymentPublic`: **deleted**. Marked orders paid with no Stripe check and had
        no caller, every `success_url` goes to `/payment/success`, the signed webhook was
        always the real path.
      - ✅ `refund.getByClient`: admin-gated (zero callers).
      - ⛔ **Still open, and these are the hard ones:**
        - `getIntakeForm`, 36 clients' full health intake by sequential id (the worst of the six).
        - `checkin.getForClient`, 397 check-ins.
        - `completePaymentPublic`, trusts client-supplied amount/tier.
      - Each needs a token threaded through a client-facing flow that carries none today.
        **Cannot be verified locally until the cron/`.env` item below is fixed**, so that's the real unblocker.
      `Owner: ___`
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

---

## Handoff to testing
- [ ] Flag each area to Jason's team as it goes live (desktop, mobile, browsers), using
      their bug format (screenshot, steps, expected vs actual).
      `Owner: ___`

---

**Net for M1:** navigation and back buttons are largely done. The real remaining M1 work
is the **settings consolidation into tabs** and the **app-wide theme pass**, plus
finishing the smaller nav cleanups and the three open auth holes in section D.
