# HumanEdge — Launch Milestones (target ~Aug 12)

Roughly one milestone per week. Farjad ~40h billed + planning, Saboor full-time. When a
new requirement appears, add it under the most relevant milestone here (and into
`current.md` too if it belongs in the active one).

Status refreshed 2026-07-30. Legend: `[x]` done · `[~]` partial/in progress · `[ ]` open.

## M1 — Stabilize, declutter nav, align theme (Week 1) [ACTIVE]
Full task list lives in `current.md`. Summary: navigation stability and back-buttons are
mostly done; what's left is the settings-tabs QA pass, extending the brand/theme across
the rest of the admin app, and a handful of correctness fixes found during the initial
app review.

## M2 — Declutter + chat (Week 2)
- [x] Remove unused admin pages (AuditLogs, ContactAdmin, DataIntegrityAudit,
      EmailEngagement, OnboardingManager).
- [x] Delete the now-orphaned `dataIntegrityAudit` tRPC procedure (dead code, zero
      frontend callers, left behind by the page removal above). `Saboor`
- [ ] Three more orphans in the same `server/contacts/router.ts`: `updateContact`,
      `fixMismatch`, `fixAllMismatches` — no UI calls any of them (`trpc.contacts.list`
      is the only one used). Two are write endpoints, so removing them is a decision,
      not a tidy-up. `Owner: ___`
- [ ] Remove Notification Analysis (Jason, 2026-07-31: it's developer reference
      documentation, not an admin tool — see `decisions.md`).
- [x] Drop 14 dead database tables; archive 33 dead scripts.
- [x] Trim the Launchpad hub page to Jason's keep list; send Trusted Partners and
      Coaching Plans out to omegalongevity.com.
- [ ] Remove Programs (from settings and the protocol build).
- [ ] Remove Masterclass Videos; link out to the GHL masterclass instead.
- [ ] Remove Affiliate Partners (verify first it isn't wired into protocol building).
- [ ] Remove Daily Tools.
- [ ] Remove payment reminders from the protocol build.
- [ ] Export the peptide cheat sheet as an image; link out to Omega Elite.
- [ ] Simplify email branding; decide the fate of Email Preview (see `decisions.md`).
- [ ] Remove redundant/duplicate views.
- [~] Finish the Team → People rename and per-person roles.
- [x] Fix chat formatting (spacing and lists).
- [ ] Support editing messages in chat.
- [ ] Support deleting a sent chat message, coach or client side (moved from M1,
      2026-08-01 — not urgent enough for the active milestone).
- [ ] Fix chat photo uploads.
- [ ] Basic to-do / action-item capability.
- [ ] Client protocol page overhaul, same treatment the client dashboard got in M1:
      audit the whole page, cut what's redundant or unused, tidy the layout. It's the
      second most-visited client page. Added 2026-08-04. `Owner: Farjad`

## M3 — Core workflows and accurate data (Week 3)
- [x] Handle client-buys vs we-ship correctly in the protocol build.
- [ ] Support 2 / 3 / 6-month protocol lengths.
- [ ] Remove Program dependencies from the protocol build.
- [~] Client-facing and internal notes on custom orders.
- [ ] Custom-order Internal Notes should also surface outside the Custom Orders view
      (e.g. on the client record), not just there.
- [ ] Let staff view/change the shipping address at checkout.
- [ ] Fix inaccurate product prices.
- [~] Packing-slip insurance amount.
- [ ] Build a fulfillment-friendly packing slip: address, instructions, stocked items
      only, no membership fee, insurance kept off the slip, invoice access.
- [ ] Break down drop-ship vs Omega-stocked items, with tracking.
- [ ] Notify the team when a custom order is paid and ready to ship.
- [x] Fix protocol pricing/totals accuracy.
- [ ] Verify payment history is accurate; fix Payment Mode.
- [ ] Fix inventory accuracy.
- [ ] Consolidate the client check-in from 8-10 screens down to a few.
- [ ] Surface progress photos on the check-in screen (display-size fix moved to M1).
- [ ] Let a project's tasks/subtasks be added or removed from the Master template.

## M4 — Data migration and go-live (Week 4)
- [ ] Migrate client history from Peptidecoach.pro (messages, protocols, results).
- [ ] Final QA pass.
- [ ] Fully switch off Manus.

## Held for v2 (not part of this launch)
Single-screen check-in workspace, custom check-in templates per goal, private 1:1 chats,
send-as/impersonate in the universal chat, delegation list + client-facing action items,
Twilio SMS, broadcast messages, a super-admin switch, a peptide calculator linked to
chats, account credits at checkout, call-date/scheduling reminders, tagging teammates in
notes, Pirate Ship integration, workflow template simplification, and a full role system
with per-role landing pages.

## Keep as-is (no action planned)
Calendly, Categories, Coaching promos, Forms editor, Integrations, Protocol Items,
Templates, Notification History, Team Email Preferences.

## Open decisions
Tracked in `decisions.md`, not duplicated here.

## Pending input
- Loom #2 (protocol-build issues) — not yet watched, likely adds M3 items.
- Compare to Autotask — Jason to share an example.
- Alex / GHL work on the Omega side — coordinate via Vee.
