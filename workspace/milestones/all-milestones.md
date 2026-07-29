# HumanEdge, Launch Milestones (v1, target ~Aug 12)

Specific deliverables per milestone. Each milestone is roughly one week; Farjad ~40h
billed + planning, Saboor full-time. When a new requirement appears, add it under the
most relevant milestone here (and, if current, into `current.md`).

Status refreshed 2026-07-29 against the code and the "Human Edge - To Farjad" doc.
Legend: `[x]` done, `[~]` partial / in progress, `[ ]` open.

## M1, Stabilize + UI + theme (Week 1)  [ACTIVE]
### Navigation & stability
- [x] Whole-app re-render on every admin navigation fixed (5273297).
- [x] Back buttons app-wide (T4 sweep 17f43d4 + 6607f58).
- [~] Dead links / 404: 404 restored for `/admin/*` (a43fb6f); verify remaining paths.
- [ ] Audit the 36 `window.location.href` + 11 internal `<a href="/…">` hard-reload
      spots; convert internal navs to wouter, keep logout/external/post-payment.
- [x] Launchpad Settings (admin page + `launchpadRouter`/`hubLinksRouter` + DB tables)
      removed entirely, was fully disconnected from the real client `/launchpad` page.
      Full detail in `current.md` / `claude/context.md`.
- [ ] Dashboard / launchpad dead-ends cleanup (remaining nav cleanup, unrelated to the
      settings removal above).
- [ ] Verify Home page (HumanEdge cover) resolved across entry points.
### UI / UX
- [ ] Consolidate ~14 settings pages into one tabbed Settings page (`Settings`,
      5x `Notification*`, 3x `Email*`, `Calendly`, `Integration`, `Templates`).
- [ ] Layout tidy on the highest-traffic admin pages.
- [ ] Desktop + mobile consistency for nav/UI changes.
### Theme
- [x] Tailwind Typography plugin enabled, `prose` works app-wide (57c3e00).
- [ ] Extend Omega Longevity brand (colours, fonts, buttons) across admin app.
- [ ] Shared theme tokens.

## M2, Declutter + chat (Week 2)
### Remove (keep/go "go")
- [x] AuditLogs, ContactAdmin, DataIntegrityAudit, EmailEngagement, OnboardingManager (5be7c4f).
- [x] 14 dead tables dropped; 33 dead root `.mjs` scripts archived.
- [ ] Programs, remove in settings + protocol build (remove dependencies too).
- [ ] MasterclassVideos, remove; link out to the GHL masterclass instead.
- [ ] AffiliatePartners, remove (first verify it is NOT wired into protocol building).
- [ ] Daily Tools, remove.
- [ ] Payment reminders, remove from protocol build.
### Simplify / reorganize
- [x] Launchpad Hub content trimmed to Jason's list (dd24c24, a74d986): keeps Omega Elite,
      PeptidePro, Podcast; Trusted Partners + Coaching Plans now link out to
      omegalongevity.com; removed Practitioner + the duplicate Omega Free card. Real
      Results / testimonials deliberately left untouched (explicit instruction, not
      relinked to the omegalongevity.com testimonial page). Admin settings for this page
      removed entirely, see the M1 entry above; the page itself was always hardcoded, not
      DB-driven, so removal was pure JSX edits.
- [ ] Peptide cheat sheet: export current as image + link out to Omega Elite.
- [ ] Email branding: keep but simplify.
- [ ] Email preview: link to Email Branding, or remove.
- [ ] Web Traffic: move under Team & Settings.
- [ ] Kill redundant / duplicate views.
### Team & roles
- [~] Team -> People rename + security fix (People view added; `Team.tsx` still present;
      finish rename and wire up per-person roles).
### Chat
- [x] Chat formatting (spacing + lists).
- [ ] Show sender name in the universal chat.
- [ ] Move chat to the top of the client dashboard.
- [ ] Edit messages in chat.
- [ ] Fix chat photo uploads (Lisa: broken).
- [ ] Basic to-do / action-item capability (review + optimize `MyActionItems`).

## M3, Core workflows + accurate data (Week 3)
### Protocol build
- [x] Client-buys vs we-ship handling (8a0d17a, a03358a, 8dee7b9, 9e1c234, 4c89ad6).
- [ ] 2 / 3 / 6-month protocol lengths.
- [ ] Remove Program dependencies from the build.
- [ ] Sleep & Stress 7/5 rating bug (should be x/10).
### Custom orders
- [~] Client-facing + internal notes (script started).
- [ ] View / change shipping address at checkout (this shipment or save to client record).
- [ ] Fix inaccurate product prices.
### Fulfillment / packing slips
- [~] Packing-slip insurance amount (script started).
- [ ] Fulfillment-friendly slip for Kari: address, instructions, only stocked items,
      exclude membership fee, insurance off-slip, invoice access.
- [ ] Drop-ship breakdown (Omega vs drop-ship, multi-vendor) + tracking.
- [ ] Payment-ready notification for custom orders (so team knows to ship).
### Money / data
- [x] Protocol pricing / totals accuracy (5a209df, d23c346, 2b557a2, a03358a).
- [ ] Payment history: verify; fix Payment Mode (Jason: doesn't work).
- [ ] Inventory accuracy (Kari: off at times).
### Check-ins (client-facing)
- [ ] Consolidate the client check-in from 8-10 screens into a few (keep required questions).
- [ ] Progress photos: notice/list on the check-in screen + fix the oversized display.
### Lisa project management
- [ ] Add/remove tasks & subtasks in an individual project from the Master template.

## M4, Data migration + go-live (Week 4)
- [ ] Migrate client history/records from Peptidecoach.pro (messages, protocols, results).
- [ ] Final QA + fixes.
- [ ] Switch fully off Manus.
- Note: test suite cleaned (148 failing -> 15, 5df455d), so a red run now means something.

## Held for v2 (post-launch, NOT in this launch)
- Consolidated single-screen check-in workspace (Jason's #1).
- Custom check-in templates per goal (energy vs weight-loss, etc.).
- Private 1:1 chats.
- Universal chat send-as / impersonate.
- Master delegation list + action-items-for-clients (during check-in/chats); Siri = far future.
- Twilio SMS (text <-> same message thread).
- Broadcast messages to everyone.
- Super-admin switch.
- Peptide calculator, linkable to chats.
- Account credits at checkout.
- At-a-glance call dates + scheduling reminders; separate scheduling links per session.
- Tag teammates in internal notes.
- Pirate Ship integration.
- Client dashboard overhaul (only necessary info).
- Workflow template simplify (needs Lisa + Shannon collaboration).
- Full granular role system + per-role landing pages.
- Already built ahead: Shannon acquisition/retention dashboard + lead-pipeline consolidation.

## Decisions to make (Farjad; record in decisions.md)
- Keep or drop: Notification Analysis, Notification History, Job Health, Team Email
  Preferences, KPI Dashboard.
- Site Settings: review, keep only what's needed.
- Email preview: link to branding vs remove.

## Keep as-is (no action)
Calendly, Categories, Coaching promos, Forms editor, Integrations, Protocol Items,
Templates (keep the ability to add future templates; only Master is used today).

## Pending input / reference
- Loom #2 (protocol-build issues) not yet watched; likely adds M3 items.
- Compare to Autotask, Jason to share an example.
- Alex / GHL work on Omega side, coordinate via Vee.
