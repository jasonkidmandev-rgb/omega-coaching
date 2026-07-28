# Current Milestone, M1: Stabilize and polish the look

Target: Week 1. Roughly 40h of Farjad's billed time; Saboor full-time alongside.

**How to use this file:** pick a task, put your name in its `Owner` slot, tick the box
when done. Add new items you find under the right area. `git pull --rebase` before editing.

Status refreshed 2026-07-29 against the current code. Legend: `[x]` done, `[~]` partial,
`[ ]` open.

## Claim board (god-files)
Before editing `server/routers.ts` / `server/db.ts` / `drizzle/schema.ts`, add a line:
`<name>, <file>, until <time>`.
- (none right now)

## A. Navigation and stability  (mostly done)
- [x] Whole-app re-render on every admin navigation. DONE (commit 5273297).
- [x] Back buttons app-wide. DONE (T4 sweep 17f43d4 + check-in review fix 6607f58).
      Spot-verify only.
- [~] Broken / dead links: 404 page restored for unmatched `/admin/*` (a43fb6f). Verify
      the remaining paths identified in the app review. Owner: ___
- [ ] Audit the remaining hard reloads: 36 `window.location.href` + 11 internal
      `<a href="/…">`. Convert any internal navigation that shouldn't reload to wouter;
      keep logout / external / post-payment. (Smaller now the main re-render is fixed.) Owner: ___
      Triage already done, see `docs/risks/2026-07-29-navigation-rerender-trace.md`:
      4 of the `window.location.href` are auth-boundary redirects and **should stay** a
      hard reload; the `/terms` + `/privacy` anchors from public pages are fine as plain
      `<a>`. The ones that actually bite staff are `CheckinHistoryTab.tsx:369`
      (check-in detail, daily use), `AdminLayout.tsx:359,368`, and
      `client-edit/DetailsTab.tsx:550` -> `/admin/programs`.
- [ ] Dashboard / launchpad dead-ends: clean up (LaunchpadSettings still present; the
      full launchpad strip also sits in M2). Owner: ___
- [ ] Verify the Home page (HumanEdge cover) is fully resolved across entry points. Owner: ___

## B. UI and UX  (the main remaining M1 work)
- [ ] Consolidate the ~15 settings pages into one tabbed Settings page. Still separate:
      `Settings`, 5x `Notification*`, 3x `Email*`, `CalendlySettings`, `IntegrationSettings`,
      `LaunchpadSettings`, `Templates`. Move existing pages under tabs, don't rebuild. Owner: ___
- [ ] Note any removable settings while consolidating (actual removal in M2). Owner: ___
- [ ] Layout tidy on the highest-traffic admin pages. Owner: ___
- [ ] Desktop + mobile consistency for the navigation and UI changes. Owner: ___

## C. Theme  (mostly open)
- [x] Tailwind Typography plugin enabled, fixes inert `prose` app-wide (57c3e00).
- [ ] Extend the Omega Longevity / HumanEdge brand (colours, fonts, buttons) across the
      admin app, from the shared `HumanEdgeBrand` component. Owner: ___
- [ ] Set shared theme tokens so styling stays consistent and easy to maintain. Owner: ___

## D. Correctness / blockers found during the M1 app review (Saboor, 2026-07-29)
Not originally in M1, but these outrank polish. Full detail in
`docs/risks/2026-07-28-launch-readiness-audit.md`.
- [x] Admin chat/inbox showed nothing. Raw SQL used the code-only `personId`; 6 sites
      fixed (1e0c4eb). Contact renames had also been failing **silently** for weeks.
      Owner: Saboor
- [x] Hardcoded old-domain (`peptidecoach.pro`) links in ~70 places, all client-facing.
      Centralised in `server/lib/appUrl.ts` (7851dd8). Owner: Saboor
- [x] Stripe receipts said a bare "Payment" — the template's `paymentMethod` union omitted
      `'stripe'` while its callers default to it (7851dd8). Owner: Saboor
- [x] Test suite green + stable, no-value tests removed (7851dd8). Owner: Saboor
- [ ] **LAUNCH BLOCKER, 6 unauthenticated endpoints.** `getIntakeForm` exposes 36 clients'
      full health intake by sequential ID; `getEnrollmentPublic` leaks the `authToken`
      magic-link column; `capturePaymentPublic` marks orders paid with no Stripe check.
      Small local fixes, the correct token pattern already exists in the codebase. Owner: ___
- [ ] Gate cron init behind an env flag (default off outside prod) + point local `.env` at
      the Docker test DB. Currently `pnpm dev` mails real clients, so **nothing can be
      verified locally** — see the warning at the top of `claude/context.md`. Owner: ___
- [ ] Confirm `VITE_APP_URL` is actually set on the Railway service (needs Railway access).
      Owner: ___
- [ ] `support@humanedge.health` now appears on the custom-order payment screens — confirm
      that mailbox/alias exists or client mail will bounce. Owner: ___
- [ ] Sleep Quality shows `/5` but is stored 1-10 (slider + server both `max 10`). 4 admin
      surfaces: `ClientEdit.tsx:2448,2542`, `Enrollments.tsx:1252,1360`. 4-line fix. Owner: ___

## Handoff to testing
- [ ] Flag each area to Jason's team as it goes live (desktop, mobile, browsers), using
      their bug format (screenshot, steps, expected vs actual). Owner: ___

---
**Net for M1:** navigation and back buttons are largely done. The real remaining M1 work
is the **settings consolidation into tabs** and the **app-wide theme pass**, plus
finishing the smaller nav cleanups.
