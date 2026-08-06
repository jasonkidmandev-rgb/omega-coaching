# Farjad, daily log

Only Farjad edits this. Newest entry at top. Feeds the Fiverr delivery summary, the
report to Jason/Vilma, and the timesheet. Written as one natural list of the day's work
(planning/direction and build woven together).

## 2026-08-05
- Went through Jason's screen-by-screen review of the deployed app and cross-checked every
  claim against his original master brief. The cross-check was the useful part, because he
  keeps saying "I think I said this in the long doc" and he's only right about half the
  time. Correct for Launchpad, client-buys and Programs; wrong for the protocol PDFs and
  for My Documents, neither of which appear in the brief at all. That distinction decides
  whether something is already specified or still needs a spec from him.
- Found the two documents contradict each other on Programs. The brief says remove it in
  both places, flatly. The review, two weeks later, asks how it works because he can't
  decide. He almost certainly hadn't seen the client-facing roadmap when he wrote the
  original note, which is why holding that half back yesterday turned out right.
- Caught that the Launchpad trim was marked done in M1 too early. His brief says everything
  above "Your Ecosystem Platforms" goes; two sections above it are still live. He spotted
  it before we did.
- Also found the answer to the masterclass blocker sitting in his brief the whole time: it's
  hosted on GHL at omegalongevity. Only the exact URL is still missing.
- Ran down his two undelivered-email complaints far enough to know his own diagnosis is
  probably wrong. He assumes the SMTP settings; but the environment seal suppresses all
  outbound mail before SMTP is touched, and would do that if the Railway service is marked
  staging because the site isn't live. Saboor's seal didn't cause it, his log shows he
  verified Railway was unaffected. The Railway startup banner settles it in one line, so
  that's the first check rather than swapping credentials blind.
- Killed a parked decision by questioning its premise: the non-discountable pricing fix was
  waiting on Jason's sign-off because correcting it raises client totals. There are no real
  clients, the database is all test data, so there is nothing to sign off. It moves
  straight into M3 as ordinary work.
- Split the review into M2-sized and M3-sized items, created `m3.md` so the M3 ones had
  somewhere to go rather than swelling the active milestone, and put both of Jason's PDFs
  into `workspace/assets/` with text extractions. `docs/` is gitignored, so Saboor had
  neither document; whoever picks up one of these tasks now gets Jason's actual wording
  instead of a one-line summary, which matters because half his comments are annotations on
  screenshots and mean nothing on their own.

## 2026-08-04
- Started M2 with five removals off Jason's go list: Programs, Masterclass Videos,
  Affiliate Partners, Daily Tools, and payment reminders in the protocol build. The
  instruction was "make sure you remove the right thing", so the value here was in the
  audit rather than the deletion, and it paid off three times:
  - Two unrelated features are both called "affiliate". The partners directory is what
    Jason wanted gone; `affiliateUrl`/`affiliateCode` on protocol *items* is the "client
    buys it themselves" path and is load-bearing in protocol totals, the PDF and the
    packing slips. A careless sweep would have broken protocol pricing silently.
  - The `/partners` client page turned out to be linked from five email templates and the
    protocol PDF, so deleting it would break links in mail clients already have. Kept it
    and removed only the admin management page.
  - "Payment reminders in the protocol build" resolved to two different things: a dead
    per-protocol layer with zero callers that the cron never even read, and a real
    reminder card inside the protocol form. Removed both. Kept the per-client opt-out
    toggle deliberately, since that one decides whether a real client gets emails.
- Held the deeper Program dependencies (the assignment panel, the phase-template sync, the
  phase journey on the client protocol page) rather than pulling them into this pass. They
  change what live clients see on their protocol and PDF, they are already tracked as an
  M3 task, and the client protocol page is being overhauled in M2 anyway. Removing the
  page and its write endpoints freezes Programs without touching anyone's live protocol.
- Also decided Daily Tools should take both its pages with it rather than just losing the
  category grouping, and that Masterclass should lose only the admin page for now, since
  nobody has the GHL masterclass URL and the Protocol Build tab gates the builder behind
  watching one of the videos.
- Own mistake worth recording: deleted line ranges with PowerShell `Get-Content`/
  `Set-Content`, which round-trips through the ANSI codepage and turned every em dash in
  the touched files into mojibake. Spotted it because `git diff --stat` reported 515
  changed lines for a 300-line deletion. Reverted all five files and re-cut through .NET
  with explicit UTF-8. Wrote both that and a second trap (PowerShell flattening nested
  arrays, which silently skipped three files with no error) into `task-notes.md` so it
  doesn't happen again.
- Closed M1 and opened M2. Reviewed what was still unticked in M1 and decided deliberately
  **not** to carry it forward: one security item (`users.list` shipping all 79 user rows
  to the browser), two environment/tooling chores, a manual auth browser pass, and the
  testing handoff. They stay parked in `m1.md` to be picked up when there's room, rather
  than inflating M2's scope on day one with work that isn't this week's theme.
- Reorganised the milestone docs to match. `current.md` was a moving target that lost its
  history every week, so each milestone now gets its own permanent file (`m1.md`, `m2.md`,
  …) and `all-milestones.md` records which one is active. That way a closed milestone
  keeps its own record, including whatever was left open in it. Updated every pointer that
  referred to `current.md` (root `CLAUDE.md`, `workspace/README.md`, `task-notes.md`,
  `context.md`, plus a stale code comment in `SettingsHub.tsx`), phrasing them as "the
  active milestone file" so the next rollover is a one-line change instead of another
  sweep.
- Also corrected a stale note in `context.md` that still described the unauthenticated
  chat backend as unfixed; Saboor closed it and the milestone file already showed it done.
- Built `m2.md` out of the M2 section of the plan, grouped so the work is pickable:
  removals from Jason's go list, chat features, the client protocol overhaul, content and
  email, the People rename, and backend cleanup. Noted on the removals that each needs an
  "is anything still wired into this?" check first, since the protocol build reaches into
  Programs, Affiliate Partners and payment reminders.
- Browser-verified the whole client-facing brand rollout on the deployed site, all three
  batches, roughly 38 pages. No contrast misses or broken layouts. That closes the one
  caveat that had been carried on this work since batch 1, so the rollout is now confirmed
  rather than reasoned about, and the conventions recorded in `task-notes.md` are proven
  against a real browser.
- Hours: ~

## 2026-08-02 (continued, 4)
- Brand pass batch 3, the last of the client-facing rollout: age gate, terms, privacy,
  set/forgot password, accept invite, partners, promotions, install, 404. Kept the
  "don't have an account yet" alert on the forgot-password page amber, since it's a real
  alert rather than branding, and left the per-category badge colours on partners and
  promotions since those distinguish categories.
- The more useful part of this session was auditing my own previous work rather than just
  adding to it. Grepping after the pass instead of trusting it turned up two problems I'd
  introduced earlier and not noticed:
  - A shade-name prefix collision: because `amber-50` is the start of `amber-500`, an
    earlier rule had been quietly rewriting one into the other. The result was still valid
    and still rendered correctly, so it passed every check and looked fine in a browser,
    which is exactly why 23 of them had accumulated across two batches unnoticed.
  - Twenty places where white text sat on the gold, including two buttons where a leftover
    white overrode the button's own text colour. Gold is a light colour, so white on it is
    close to unreadable. All now use the navy foreground.
- Wrote all three find-and-replace traps hit across the three batches into `task-notes.md`
  as a short checklist, since the pattern (audit with a grep afterwards, don't trust the
  pass) is what caught every one of them.
- Client-facing rollout is now complete at roughly 38 pages. Flagged clearly that none of
  it has been browser-verified, and added that as its own tracked item rather than letting
  it sit as an assumption.
- Hours: ~

## 2026-08-02 (continued, 3)
- Brand pass batch 2: the whole enrollment/intake/protocol-build funnel, 14 pages. Surveyed
  every file's colour usage before editing rather than running the same replacements over
  all of them, which was the right call because the amber in these pages is not all the
  same thing.
- The judgment calls are the substance of this one. On the protocol-build journey page the
  amber turned out to be a genuine required/locked/alert system, not the brand colour, so
  only its buttons went gold and the alert boxes stayed; same for the payment-cancelled
  icon and the payment-failure page. On the two tier pages, each plan card and its matching
  button share a colour, which is real differentiation, so I branded the shells, badges and
  section backgrounds and left the tier palette alone. Everywhere else amber/orange really
  was standing in for the gold and was converted.
- Verified the pass was structurally safe by checking the diff came out exactly balanced,
  318 lines changed each way, meaning every edit was a class swap with no markup touched.
- Caught a bug I introduced partway through: ordered text replacement on Tailwind opacity
  variants produced a malformed class where a half-opacity background matched the base rule
  first. Found it by grepping for the pattern rather than trusting the pass, fixed both
  occurrences, and wrote the trap into `task-notes.md` so batch 3 doesn't repeat it.
- Hours: ~

## 2026-08-02 (continued, 2)
- Spotted from a production screenshot that the Web Traffic page was rendering with
  unreadable labels, and traced the cause rather than just darkening the text: the whole
  page had been built as a dark-theme page while the admin app is light. Because its cards
  were set at half opacity, they composited to mid-grey over the light background, and the
  mid-grey labels disappeared into them. The white numbers stayed readable, which is why it
  looked half-broken instead of obviously broken. Converted the page to the light admin
  theme and darkened the accent icons, which had been chosen to glow on a dark card.
- Swept every other admin page for the same problem afterwards rather than assuming it was
  a one-off. Found none: the handful of remaining dark-background hits are all legitimate
  (proper dark-mode variants, an active filter pill, a video letterbox). Worth noting this
  is the second time this exact bug class has turned up as a single isolated page, after
  the notification-templates tab earlier in the week.
- Noted the one real trap in the fix for future passes: a blanket white-to-dark text
  replacement also caught the deliberate white text on the orange active tab, which had to
  be restored. Recorded in `task-notes.md`.
- Hours: ~

## 2026-08-02 (continued)
- Scoped the Omega Longevity theme rollout before writing any code, and narrowed it
  deliberately: the ~178 files still hardcoding colors are mostly *internal admin tool*
  pages, where the existing orange accent is consistent and staff don't judge the brand by
  it. Decided client-facing surfaces only — much smaller, lower risk, and it's what
  actually affects how the product reads to clients and prospects.
- Ran an inventory of every client-facing page first rather than fixing them one at a time
  as I found them. That reframed the job: it isn't random color drift, it's two *fake*
  brand colors used consistently in place of the real ones — amber/orange gradients
  standing in for the gold, and three different hardcoded navies (none matching the real
  one) standing in for the brand navy. So most of it is two find-and-replace patterns per
  page, not per-element design work. Recorded the conventions in `task-notes.md` so
  batches 2-3 stay consistent with batch 1.
- Shipped batch 1, the ten client-facing pages seen most often. Two things worth noting:
  the Protocol page is the second-most-visited client page and still had a plain white
  header while the dashboard had the navy one, so those two now match; and one page on my
  own list (Inventory) turned out to need no change at all — its orange/blue are real
  stock-status indicators, not branding. Left all semantic status colors and per-category
  accent coding alone throughout, same call as the dashboard pass.
- Hours: ~3

## 2026-08-02
- Triaged the open M1 task list: verified the HumanEdge cover page and the Settings tabs
  QA pass, closing both out. Dropped three items that never had real substance behind
  them once traced back — a generic "desktop/mobile consistency" catch-all from the very
  first planning session with nothing concrete tied to it, and a progress-photo display
  bug that turned out to trace back to the same original punch list without ever being
  pinned to an actual screen. Pulled the chat-auto-refresh finding off the active list for
  now (kept in `context.md` so it isn't lost, just not being worked yet).
- Hours: ~1.5

## 2026-08-01 (continued)
- Vee flagged that the client dashboard's "Omega Elite" link went to the wrong site
  (`omegaelite.com`, an unrelated domain) instead of the real signup link. Traced it
  rather than just patching the one report: every other surface in the app (Launchpad,
  the public Home page, Community Choice, the onboarding emails) already used the correct
  FastPayDirect payment link — only the client dashboard had the stale wrong domain, in
  two places (the resources list and the "Join Omega Elite" CTA button). Fixed both to
  match. Left a similar-looking but different link alone (`app.omegaelite.com` on the
  protocol-build journey page, used for existing members accessing the community, not
  signing up) since it wasn't part of what was reported and may be intentionally
  different.
- Hours: ~0.5

## 2026-08-01
- Directed a fresh audit pass beyond the admin nav/settings work, choosing the
  chat/messaging system as the target rather than re-treading already-tracked ground.
- Found a real, previously undocumented security gap: the entire chat backend
  (`commentsRouter` — list/create/mark-read/unread-count) has no authentication at all,
  the same bug class as the "6 unauthenticated endpoints" fixed 2026-07-29, except this
  one was missed by that sweep. Concretely, anyone can read any client's full message
  history off a guessable id, or inject a fake coach/client message that triggers a real
  notification email. Logged as its own blocker in `current.md` (section D) rather than
  folding it into the older, already-closed item, so it doesn't get missed again.
- Also mapped the chat system's actual shape for the first time: confirmed "universal
  chat" isn't a separate feature, it's one shared table/router behind five different UI
  surfaces (client Protocol page, the new dashboard chat panel, admin Inbox, admin Chat,
  and the email-reply bridge) — useful context for any future chat work, since it means a
  fix in the shared backend covers all five surfaces at once. Found and logged three
  smaller gaps in the same pass: the client Protocol page's chat never auto-refreshes, the
  dashboard chat panel double-polls when the mobile drawer opens, and there's no way to
  delete a sent message anywhere.
- Hours: ~2

## 2026-07-31 (continued)
- Ran Jason's full go/keep/decide list over every admin nav item through me, expecting a
  bigger cleanup than what actually landed today. Investigated each unfamiliar name
  (Audit Logs, Contact Admin, Data Integrity, Email Engagement, Onboarding Wizard) before
  answering rather than guessing — found all five admin pages were already removed in an
  earlier milestone, with only a few loose backend ends left (an orphaned tRPC procedure,
  a still-running email-engagement tracking pipeline with no UI, audit *logging* itself
  which is compliance-critical and must stay regardless of the removed browsing page).
  Caught a naming collision before it caused a wrong deletion: the currently-alive
  "Onboarding Wizard" on the client's My Account page is a different, unrelated feature
  from the removed admin "Onboarding Manager" — flagged for Jason to confirm rather than
  assuming they meant the same thing.
- Cross-checked the rest of the list (Programs, Masterclass Videos, Peptide Cheat Sheet,
  Team roles, email-branding simplification, the full keep-list) against the existing
  milestone plan before doing any work — all of it was already tracked in M2, unchanged.
  Made the call on three items that weren't yet tracked: Notification Analysis (remove,
  it's developer documentation masquerading as an admin page), Notification History and
  Team Email Preferences (keep, both have real day-to-day use).
- Directed scope down to just the nav label for today: asked whether to bury daily-driver
  pages (Protocol Items, Categories, Templates, Team, Coaching Promos, Forms Editor) under
  the small footer gear icon as literally requested, or keep them visible and reserve the
  gear icon for true settings — chose visible, since none of these turned out to be simple
  config toggles once actually mapped. Held the security fix, feature removals, and dead
  code cleanup for a separate pass rather than doing everything at once.
- Renamed the sidebar's "Team & Settings" category to "Team & Content" (Settings already
  lives in the gear icon; nothing else moved, since everything left in that list turned
  out to be a real management page, not a settings toggle).
- Hours: ~2

## 2026-07-31
- Scoped the Settings redesign before touching code: found the "dropdown → single tabbed
  page" conversion was already done (Saboor's earlier work), so directed the actual gap —
  moving the entry point out of the ordinary sidebar nav list into a dedicated button near
  the profile, and a real UI/UX pass on the 12 tab pages themselves rather than assuming
  the description matched what the code already had. Chose a standalone gear icon over
  folding it into the existing profile dropdown, and scoped the cleanup to surface fixes
  (not the deeper nested-tabs restructuring) after weighing both against risk/traffic.
- Moved the Settings entry point: removed it from the "Team & Settings" nav list, added an
  admin-only gear icon in the sidebar footer next to the profile block, active-highlighted,
  hidden when the sidebar collapses to icon-only.
- UI/UX pass across all 12 settings tab pages: every panel still carried its own duplicate
  page title directly under the hub's "Settings" heading, a leftover from when they were
  separate routes; stripped all 12, kept each panel's descriptive subtitle so context isn't
  lost. Found and removed 6 dead "back to Settings" buttons in the same pass (5 sharing one
  pattern, a 6th on a different one that a plain grep for the first pattern would've
  missed). Rewrote the one panel still styled dark-theme (`NotificationTemplates`) to match
  the light theme every other panel uses.
- Left the deeper nested-tabs-within-tabs restructuring (7 panels render their own Tabs
  inside the hub tab) out of this pass on purpose — bigger surgery, flagged in `current.md`
  for a separate pass rather than silently expanding scope.
- Hours: ~3

## 2026-07-30 (continued, 5)
- Shrunk the welcome card on the client dashboard (was a full padded Card with an icon
  circle and a sentence of copy just to say hello, now a slim inline row) and applied
  the real Omega Longevity brand tokens to the page's chrome (header, status hero card,
  primary buttons, progress bar) instead of the old ad-hoc navy/amber mix, matching the
  sidebar/login/cover work from earlier this session. Left per-card accent colors alone.
- Hours: ~

## 2026-07-30 (continued, 4)
- Got sign-off to act on the dashboard audit list instead of leaving it as a proposal,
  plus real client credentials and a live screenshot to confirm the chat panel actually
  works in the browser (first real-browser confirmation this session has had, no local
  DB access otherwise). Fixed both broken buttons (dead referral route, misleading
  masterclass redirect), merged the two navigation grids into one, merged the three
  separate status/duration displays into one hero card, deduped the Peptide Cheat Sheet
  link and the welcome message, deleted the now-fully-superseded `QuickStats` component.
- Caught one more redundancy myself after reviewing the live result: a "Quick Links" row
  (View My Protocol / Messages / Launchpad) had quietly become 100% duplicate of the new
  hero button, the always-visible chat panel, and the header's existing Launchpad button.
  Removed it.
- Recorded what's still deliberately untouched (the cosmetic milestone-progress bar) as
  its own item in `decisions.md` rather than silently leaving it in code with no record.
- Hours: ~

## 2026-07-30 (continued, 3)
- Full audit of the client dashboard's functionality before touching anything:
  found two actually-broken links (a "Referral Program" button pointing at a route that
  no longer exists — referrals were removed elsewhere and this button never got cleaned
  up; a "Watch Masterclasses" button that now silently redirects to a coaching sales
  page), plus several redundant surfaces (two nav-tile grids linking to mostly the same
  places, protocol status shown three different ways, a cosmetic milestone bar that
  doesn't track real progress, Peptide Cheat Sheet linked twice, welcome said twice).
  Recorded the full list in `decisions.md` for sign-off rather than cutting anything
  unilaterally.
- Asked before building the redesign rather than guessing on a production client page:
  confirmed the chat panel should be a real inline chat (not just a bigger preview),
  scoped to the dashboard only, with a floating-button/drawer fallback on mobile; agreed
  to do the layout work now and hold the audit trims for a separate pass.
- Built a real chat panel (`ClientChatPanel.tsx`) reusing the same message data and send
  path as the Protocol page's Discussion thread, not a new parallel chat system. Sticky
  on the right on desktop, always visible; a floating button opens it as a bottom drawer
  on mobile. Restructured the dashboard into a two-column layout for this, and folded the
  separate "My Progress" milestone card into the existing Photos/Notes tabs as a third
  tab, cutting a full card's worth of scroll without removing any feature.
- Flagged clearly what still needs a real browser check (sticky-header offset, drawer
  height on small phones, panel width) since this session still has no client login to
  verify visually — noted in `task-notes.md` rather than claiming it's fully verified.
- Hours: ~

## 2026-07-30 (continued, 2)
- Restructured `workspace/` docs: `current.md`/`all-milestones.md` were unreadable walls
  of implementation detail. Split into three roles — clean one-line task lists,
  `decisions.md` reworded in plain language for judgment calls, and a new
  `claude/task-notes.md` for the implementation detail/QA checklists that used to bloat
  `current.md`. Also cross-checked Jason's punch list against the milestones: found one
  real gap (Team page can promote a client to admin, a security risk, not tracked
  anywhere before) and pulled several UI-only items (chat position, sender name, Web
  Traffic placement, the client dashboard overhaul Jason flagged) out of M2/v2-held into
  the active M1 list.
- Hands-on: audited the client dashboard (`client/src/pages/client/Dashboard.tsx`).
  Found a real bug, not a style opinion — several cards and all three dialogs (photo
  upload, journal entry, before/after comparison) were leftover dark-theme text classes
  on a light background; worst case, the note/photo-caption dialog inputs had white text
  on a light-gray field, so typed text was invisible while typing. Fixed throughout.
  Moved the Messages/comments preview from the bottom of the page to the top, under the
  welcome message, and dropped a redundant "Chat with Coach" tile that pointed at the
  same place. Flagged as a first pass, not the full overhaul Jason asked for; no client
  login available to this session to verify visually, needs a browser pass.

## 2026-07-30 (continued)
- Report #2 (brand alignment, Launchpad content trim, Launchpad Settings removal)
  approved; checkpointed at commit `40a003c`.
- Pulled Saboor's overnight work (settings-tab spacing polish, root-cause fix for the
  flaky test suite: 5s default timeout was too short for a ~9.6k-line router import,
  raised to 30s). Clean fast-forward, no conflicts.
- Noticed his `decisions.md` note about Launchpad settings being "worth checking" was
  written before my removal commit landed; updated it to point at `40a003c` instead of
  leaving it looking unresolved.
- Re-checked the app for any remaining admin-side Launchpad surface after that; found
  none, the only hits left are the live `/launchpad` links (nav shortcut, email
  templates), which are correct to keep.
- Caught a separate, smaller issue while checking: the admin sidebar's "Home" link
  didn't go to the admin home, it went to the public `/launchpad` marketing page — a
  leftover from the original build, and confusing next to the actual "Dashboard" link
  that does go to `/admin`. Removed it (and the now-unused `Home` icon import).
- Hours: ~

## 2026-07-30
- **Dug into "Launchpad Settings"** after Jason's doc flagged it ("get rid of this, clean
  up launchpad... but the clients have their own launchpad right? How would this work?").
  Traced the admin settings page end to end against the real client-facing `/launchpad`
  page: found they are **completely disconnected**. The admin page is a real, working
  form, but it writes to a `launchpad_items` table that the client page never reads —
  the client page is entirely hardcoded content. So every edit an admin ever made there
  changed nothing a client saw. Also found a second table (`hub_links`) fetched by the
  client page and then silently discarded, unused. A prior internal doc had incorrectly
  documented these as connected; the code says otherwise.
- Mapped the client page's actual content against Jason's list item by item (what to
  keep: Omega Elite, PeptidePro, Podcast; what to cut: Practitioner, duplicate Omega
  Free; what to send external: Trusted Partners, Coaching Plans -> omegalongevity.com)
  and flagged the one genuinely ambiguous line in his note before touching anything
  revenue-related (a paid $69/mo signup card), rather than guessing on it.
- Implemented the client-page content trim to match, leaving the Real Results /
  testimonials section untouched as instructed.
- Followed the investigation to its conclusion: removed Launchpad Settings entirely —
  the admin page, both its tRPC routers, all 15 related database functions, the sidebar
  nav entry, breadcrumb and search-index references, and the three underlying database
  tables (schema removed from code; physical `DROP TABLE` prepared but left for a
  deliberate manual step once row counts are confirmed, not run blind). Archived the
  now-dead seed script rather than deleting it outright, matching how the codebase
  already handles retired one-off scripts.
- Kept the live `/launchpad` URL itself untouched throughout, it's linked from 5 real
  transactional emails, so it had to keep working regardless of what happened to the
  admin side.
- Hours: ~

## 2026-07-29 (continued)
- Reviewed Saboor's incoming work (security fixes, chat fix, dead-code removal, env
  seal) and refreshed the milestone plan against it: reformatted `current.md` for
  readability, marked done/partial items, added the open unauthenticated-endpoints
  and env-seal findings under a new correctness section.
- Reviewed the app's styling architecture (Tailwind v4, token-based but only ~30% of
  the app actually uses the tokens) and, hands-on, restyled the admin sidebar: replaced
  hardcoded navy with a proper token set, added the real HumanEdge mark/wordmark to the
  header in place of a plain text label. Shipped `cfdf46a`.
- Compared the app's dark theme against the real Omega Longevity site (screenshot) and
  found it was noticeably darker and more saturated than the brand, hands-on, matched
  the sidebar, login, and cover pages to the actual navy + flat gold palette, and set
  it up as shared `--brand-*` tokens so the three surfaces stay in sync. Shipped `4cb2f75`.
- Kept `current.md`/`CLAUDE.md` current as I went (auto-tracked both pieces of work).
- Hours: ~

## 2026-07-29
- Working session with Saboor: aligned scope, sequencing, and ownership; split the work
  so we avoid collisions in the big shared files.
- Set up the shared `workspace/` (milestone plan, current task list, shared context,
  logs) and the two-dev workflow (straight-to-main, pull-rebase, god-file claim board,
  auto-updated milestones/context/logs).
- Full app + requirements review, turned into a specific 4-milestone plan (v1 vs v2 split).
- Found and directed fixes (traced the cause, handed a clear fix to Saboor):
  - Full-app re-render on every navigation: the admin shell was mounted inside each page
    instead of above the router; hoisted it above the router. Navigation is instant now.
  - Admin chat returning empty: raw SQL referenced a logical column name that doesn't
    exist physically (ORM alias doesn't apply in raw templates); corrected across sites.
  - ~70 legacy-domain (peptidecoach.pro) fallback links centralized into one source.
  - ~2,700-line unused/unrouted page removed; other dead code cleared.
  - Flaky test suite stabilized (low-value tests importing the whole router graph and
    timing out); suite back to fully green.
- Safety/security:
  - Local dev defaulted to the production environment and would fire ~20 crons + a live
    mailer against the prod DB; sealed so non-prod runs can't reach real data/jobs/email.
  - Found unauthenticated endpoints returning client data (incl. full intake by
    sequential ID); 3 of 6 closed, rest prioritized as launch blockers.
- Tracked open decisions (keep/drop settings pages, migration approach) and recorded the
  workspace/workflow decisions.
- Wrote and got approval on Report #1 for Jason/Vilma.
- Next: settings consolidation into a tabbed page, theme alignment to Omega Longevity,
  continue declutter, finish security hardening.
- Hours: ~8
