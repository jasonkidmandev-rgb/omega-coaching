# Current Milestone — M1: Stabilize and Polish the Look

**Target:** Week 1 (~40h Farjad billed + Saboor full-time)
**Status refreshed:** 2026-07-30

**How to use this file:** pick a task, put your name in `Owner`, tick it when done. Keep
entries to one line — task only, no implementation notes. Technical detail belongs in
`workspace/claude/task-notes.md` (Claude-only reference, messy is fine there) or
`workspace/claude/context.md` (shared findings); link to it if a task needs one.
Decisions that need someone's judgment call go in `workspace/decisions.md`, not here.
`git pull --rebase` before editing.

**Legend:** `[x]` done · `[~]` in progress · `[ ]` open

---

## Claim board (before editing a god-file)
Add a line before touching `server/routers.ts`, `server/db.ts`, or `drizzle/schema.ts`:
`<name>, <file>, until <time>`.
- *(none right now)*

---

## A. Navigation & stability
- [x] Fix whole-app re-render on every admin navigation. `Owner: Saboor`
- [x] Add back buttons app-wide. `Owner: Saboor`
- [~] Audit remaining dead/broken links under `/admin/*`. `Owner: ___`
- [x] Convert internal hard-reload links to client-side navigation. `Owner: Saboor` (notes: `task-notes.md#hard-reloads`)
- [x] Remove Launchpad Settings — admin page, routers, DB tables (client page kept). `Owner: Farjad` (notes: `context.md`)
- [x] Remove redundant admin sidebar "Home" link. `Owner: Farjad`
- [ ] Verify the HumanEdge cover page resolves correctly from every entry point. `Owner: ___`

## B. UI & UX
- [x] Consolidate 13 settings pages into one tabbed Settings page. `Owner: Saboor` (notes: `task-notes.md#settings-tabs`)
- [x] Tidy spacing and tab-rail scrolling on the new Settings tabs. `Owner: Saboor`
- [ ] Browser-test the new Settings tabs page end to end. `Owner: ___` (checklist: `task-notes.md#settings-tabs-qa`)
- [ ] Layout tidy on the highest-traffic admin pages. `Owner: ___`
- [ ] Desktop + mobile consistency pass on recent nav/UI changes. `Owner: ___`
- [x] Restyle the admin sidebar to the HumanEdge brand. `Owner: Farjad`
- [~] Client dashboard overhaul (Jason: "needs an overhaul"). `Owner: Farjad` (notes: `task-notes.md#client-dashboard`)
- [ ] Show sender name in the universal chat. `Owner: ___`
- [x] Move chat to the top of the client dashboard. `Owner: Farjad`
- [ ] Move Web Traffic under Team & Settings. `Owner: ___`
- [ ] Fix the oversized progress-photo display on the check-in screen. `Owner: ___`
- [ ] Needs a browser pass with a real client login (not yet possible to verify locally, see `task-notes.md#client-dashboard`). `Owner: ___`

## C. Theme
- [x] Enable Tailwind Typography plugin (fixes `prose` app-wide). `Owner: Saboor`
- [x] Match sidebar/login/cover pages to the real Omega Longevity palette. `Owner: Farjad`
- [ ] Extend the brand palette to the rest of the admin app (178+ files still hardcode colors). `Owner: ___`

## D. Correctness / blockers found during app review
- [ ] **Security:** the Team page can mark a client account as admin. `Owner: ___`
- [x] Fix admin chat/inbox showing nothing. `Owner: Saboor`
- [x] Centralize old-domain (peptidecoach.pro) links. `Owner: Saboor`
- [x] Fix Stripe receipts showing a bare "Payment." `Owner: Saboor`
- [x] Stabilize the test suite (green, no flaky failures). `Owner: Saboor`
- [x] Close all 6 unauthenticated endpoints exposing client data. `Owner: Saboor` (notes: `context.md`)
- [x] Seal local dev so it can't fire prod crons/emails. `Owner: Saboor` (notes: `context.md`)
- [x] Extend the test-DB harness to cover the auth-related tables. `Owner: Saboor`
- [ ] Confirm `VITE_APP_URL` is actually set on the Railway service. `Owner: ___`
- [x] Fix Sleep Quality showing `/5` when it's stored out of 10. `Owner: Saboor`
- [ ] Fix `pnpm db:push` (blocked on Farjad's decision, see `decisions.md`). `Owner: Farjad`
- [ ] Fix `pnpm testdb:up` returning before the DB is ready. `Owner: ___`
- [ ] Browser-test the session-based auth paths (needs a real login, can't be done automated). `Owner: ___` (checklist: `task-notes.md#auth-browser-pass`)

---

## Handoff to testing
- [ ] Flag each area to Jason's team as it goes live, using their bug-report format. `Owner: ___`

---

**Net for M1:** navigation and back-buttons are mostly done. What's left: the app-wide
theme/brand extension, a few smaller nav/UI cleanups, and the two browser-verification
passes above.
