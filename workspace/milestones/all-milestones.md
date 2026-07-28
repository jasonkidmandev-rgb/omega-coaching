# HumanEdge, Launch Milestones (v1, target ~Aug 12)

Four weekly milestones. Each is roughly 40h of Farjad's billed time, with Saboor
full-time alongside. Kept general on purpose so we can fold in what we find. When a new
task appears, add it under the relevant milestone here (and, if it's for the current
milestone, into `current.md`).

Status notes refreshed 2026-07-29. Legend: `[x]` done, `[~]` partial, `[ ]` open.
Saboor has already landed a lot, so several items are done or in progress.

## M1, Stabilize and polish the look (Week 1)  [ACTIVE]
- [x] Whole-app re-render on admin navigation fixed (5273297).
- [x] Back buttons app-wide (T4).
- [~] Dead links / 404 handling (404 restored; verify the rest).
- [ ] Remaining hard-reload spots (36 `window.location` + 11 `<a href>`).
- [ ] Consolidate scattered settings into a tabbed page (still ~15 separate). MAIN M1 WORK.
- [x] Tailwind Typography plugin enabled (prose fixed).
- [ ] App-wide theme alignment to Omega Longevity; desktop + mobile. MAIN M1 WORK.
- Full task list in `current.md`.

## M2, Declutter and chat (Week 2)
- [x] Removed AuditLogs, ContactAdmin, DataIntegrityAudit, EmailEngagement, OnboardingManager (5be7c4f).
- [x] Dropped 14 dead tables; archived 33 dead root `.mjs` scripts.
- [~] Team -> People rename + security fix (People view added; `Team.tsx` still present).
- [ ] Still to remove per keep/go: Programs, MasterclassVideos, AffiliatePartners; strip
      Launchpad; payment reminders. Peptide cheat-sheet export + link out.
- [ ] Kill redundant / duplicate views.
- [x] Chat formatting fixes (spacing + lists).
- [ ] To-do / action-item capability (`MyActionItems` exists but needs the new capability / optimizing).

## M3, Core workflows and accurate data (Week 3)
- [x] Client-buys vs we-ship handling (8a0d17a, a03358a, 8dee7b9, 9e1c234, 4c89ad6).
- [x] Protocol pricing / totals accuracy (5a209df, d23c346, 2b557a2, a03358a).
- [~] Custom-order client notes (script added, in progress).
- [~] Packing-slip insurance (script added, in progress).
- [ ] Check-ins (client name showing, faster path to protocol/messages).
- [ ] Protocol build 2/3/6-month lengths; remove Program dependencies.
- [ ] Sleep / stress 7/5 rating bug.
- [ ] Custom order: view/change address at checkout.
- [ ] Fulfillment-friendly packing slip for Kari; payment-ready notification; drop-ship breakdown.
- [ ] Inventory accuracy.

## M4, Data migration and go-live (Week 4)
- [ ] Migrate client history and records from Peptidecoach.pro.
- [ ] Final QA and fixes; switch fully off Manus.
- Note: test suite cleaned up, 148 failing -> 15, so a red run now means something (5df455d).

## Held for v2 (post-launch, NOT in this launch)
Consolidated single-screen check-in workspace, custom check-in templates per goal,
private chats, Twilio SMS, broadcast messages, super-admin switch, peptide calculator,
account credits at checkout, scheduling links/reminders, tagging in notes, Pirate Ship
integration, full granular role system.
Already built ahead of v2: Shannon acquisition/retention dashboard + lead-pipeline
consolidation (a90b1a9, deb6b59, 3b11311).
