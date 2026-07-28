# Current Milestone, M1: Stabilize and polish the look

Target: Week 1. Roughly 40h of Farjad's billed time; Saboor full-time alongside.

**How to use this file:** pick a task, put your name in its `Owner` slot, tick the box
when done. Add new items you find under the right area (mirror anything larger into
`all-milestones.md`). `git pull --rebase` before editing this file.

## Claim board (god-files)
Before editing `server/routers.ts` / `server/db.ts` / `drizzle/schema.ts`, add a line:
`<name>, <file>, until <time>`.
- (none right now)

## A. Navigation and stability
- [ ] Fix full-app reloads: audit the 36 `window.location.href` + 11 internal
      `<a href="/…">`; convert internal navigation to wouter (`Link` / `setLocation`);
      keep intentional reloads (logout, external URLs, post-payment). Owner: ___
- [ ] Back buttons: audit remaining pages, consistent behaviour via `useGoBack`. Owner: ___
- [ ] Broken / dead links across the admin navigation (from Jason's video). Owner: ___
- [ ] Dashboard / launchpad dead-ends: clean up confusing routes so each leads
      somewhere useful. Owner: ___
- [ ] Verify the Home page (HumanEdge cover) is fully resolved across entry points. Owner: ___

## B. UI and UX
- [ ] Consolidate the ~15 settings pages (incl. 6 notification pages) into one tabbed
      Settings page; move existing pages under tabs rather than rebuilding. Owner: ___
- [ ] Note any removable settings while consolidating (actual removal happens in M2). Owner: ___
- [ ] Layout tidy on the highest-traffic admin pages. Owner: ___
- [ ] Desktop + mobile consistency for the navigation and UI changes. Owner: ___

## C. Theme
- [ ] Extend the Omega Longevity / HumanEdge brand (colours, fonts, buttons) across the
      admin app, from the shared `HumanEdgeBrand` component. Owner: ___
- [ ] Set shared theme tokens so styling stays consistent and easy to maintain. Owner: ___

## Handoff to testing
- [ ] Flag each area to Jason's team as it goes live (desktop, mobile, browsers), using
      their bug format (screenshot, steps, expected vs actual). Owner: ___
