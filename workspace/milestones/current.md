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
      the remaining paths from Jason's video. Owner: ___
- [ ] Audit the remaining hard reloads: 36 `window.location.href` + 11 internal
      `<a href="/…">`. Convert any internal navigation that shouldn't reload to wouter;
      keep logout / external / post-payment. (Smaller now the main re-render is fixed.) Owner: ___
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

## Handoff to testing
- [ ] Flag each area to Jason's team as it goes live (desktop, mobile, browsers), using
      their bug format (screenshot, steps, expected vs actual). Owner: ___

---
**Net for M1:** navigation and back buttons are largely done. The real remaining M1 work
is the **settings consolidation into tabs** and the **app-wide theme pass**, plus
finishing the smaller nav cleanups.
