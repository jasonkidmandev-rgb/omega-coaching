# Task notes (Claude-only reference)

Implementation detail behind `milestones/current.md` tasks — the stuff that makes
`current.md` unreadable if it lives inline. Nobody needs to read this file to know what's
left to do; `current.md` is for that. This is where the trail lives so the next Claude
session (or a human who wants the detail) can find it. Referenced from `current.md` as
`task-notes.md#<heading>`. No structure requirements — append under the relevant heading,
add a new one if a task needs it.

---

## brand-rollout
Rolling the real Omega Longevity palette (`--brand-*` tokens: navy `#141b2e`, gold
`#c9a869`) across the app, after the sidebar/login/cover pages established them.

**Scope decision (Farjad + Jason, 2026-08-02): client-facing surfaces only.** The ~178
files still hardcoding colors are mostly *internal admin tool* pages, which use orange/
amber consistently as their working accent. Staff don't judge the brand by the tools they
use all day, and re-theming all of them is a much bigger, riskier job than finishing the
surfaces clients and prospects actually see. Internal admin pages keep their orange accent.

**What was actually wrong** (from the inventory pass, worth knowing before batches 2-3):
it isn't random color drift, it's two consistent *fake* brand colors used in place of the
real tokens, so most of the work is two find-and-replace patterns per file, not
per-element design decisions:
1. **amber-500/orange-500** (usually as a gradient) standing in for gold, on buttons,
   CTAs, badges, icon tiles.
2. **Three different hardcoded navies** standing in for `--brand-dark` — `#1e3a5f`
   (LaunchpadHub, CommunityChoice), `#0a1628`/`#0f1f3d` (IntakeLanding, PaymentSuccess),
   and generic `slate-900/800` gradients (most other dark pages). None match `#141b2e`.

**Conventions used, follow these in batches 2-3:**
- Dark page shell: `bg-brand-dark` (drop the multi-stop gradients, the real brand is flat).
- Cards on a dark shell: `bg-white/5 border-brand-border` (matches the sidebar pattern).
- Primary button: `bg-brand-gold text-brand-gold-foreground hover:opacity-90` (from
  `Login.tsx`). Never `text-white` on gold — gold is light, foreground token is navy.
- Outline/secondary: `border-brand-gold text-brand-gold hover:bg-brand-gold/10`.
- Gold tints: `/10` fills, `/30` borders, `/15`-`/25` for decorative blur blobs.
- Gradient text (`from-x to-y bg-clip-text text-transparent`) → flat `text-brand-gold`.
- **Left alone on purpose:** semantic status colors (red error, green success, amber
  warning, blue info) and per-category/per-tier accent colors that carry meaning. Same
  call as the client-dashboard pass — brand the chrome, keep the color-coding.

**Batch 1 done (2026-08-02, this pass):** `LaunchpadHub` (heaviest — both fake palettes),
`PeptideCheatSheet`, `Protocol` (also gave it the navy header the Dashboard already had,
they're the two most-visited client pages and didn't match), `Checkin`, `CheckinLatest`,
`Documents`, `Sessions` (indigo/purple hero card → navy), `Account`, `CompareProtocols`,
`ClientPaymentPortal`. `Inventory` was on the list but needed **no** change — its orange/
blue are genuine stock-status indicators, not chrome.

**Batch 2 done (2026-08-02):** the enrollment/intake/protocol-build funnel —
`IntakeLanding`, `CommunityChoice`, `Masterclass`, `TransformationEntry`,
`TransformationCheckout`, `TransformationVerify`, `ProtocolBuildEntry`,
`ProtocolBuildJourney`, `Order`, `OrderConfirmation`, `OrderHistory`, `PaymentSuccess`,
`WaiverRenewal`, `CustomOrderPaymentCancelled`. Diff was 318 insertions / 318 deletions —
exactly balanced, i.e. every change was a class-string swap with no structural edit.

Judgment calls made in batch 2 (the point of "where they make sense"):
- **`ProtocolBuildJourney`'s amber is semantic, not brand** — it's the required/locked/
  alert system (`AlertCircle` "Required: Watch the Bioregulator Video", a "required"
  badge, a `Lock` icon). Left alone; only its two *buttons* went gold. Same for
  `CustomOrderPaymentCancelled` (amber alert icon kept, only the shell changed) and
  `PaymentFailure` (red, untouched).
- **Per-tier colours kept on `TransformationEntry`/`PaymentSuccess`.** Each tier card and
  its matching CTA share a colour (orange/yellow, amber, violet, cyan, rose, emerald…);
  that's differentiation, not decoration. Branded the shell/badges/section backgrounds
  and left the tier palette. A red urgency banner on each was also left.
- Everywhere else amber/orange genuinely *was* the gold stand-in (prices, VIP badges,
  hero gradient text, primary CTAs) and went to `brand-gold`.
- Cards sitting on the newly-navy shells went to `bg-white/5 border-brand-border`, the
  same surface convention the sidebar uses.

**Batch 3 done (2026-08-02):** the rarely-seen pages — `AgeRestricted`, `Terms`,
`Privacy`, `SetPassword`, `ForgotPassword`, `AcceptInvite`, `Partners`, `Promotions`,
`InstallApp`, `NotFound`. Judgment calls: `ForgotPassword`'s amber block is a real
"Don't have an account yet?" alert (`AlertTriangle`), so only its shell and button were
converted; `Partners`/`Promotions` per-category badge rainbow (purple/pink, green/emerald,
blue/cyan) was left as differentiation; `NotFound`'s stray blue button went gold.

### ⚠️ Read this before any future find-and-replace colour pass
Three distinct traps bit during batches 1-3. All were caught by grepping *after* the pass
rather than trusting it — do the same.
1. **Opacity-variant ordering.** `bg-orange-50/50` matched a `bg-orange-50` rule first and
   produced the malformed `bg-brand-gold/10/50`. List `/NN` variants *before* their base.
2. **Shade-name prefix collision — the nasty one.** `bg-amber-50` is a *prefix of*
   `bg-amber-500`, so a `bg-amber-50 → bg-brand-gold/10` rule rewrote `bg-amber-500` into
   `bg-brand-gold/100`. That is **valid Tailwind that renders correctly**, so it passes a
   malformed-class grep and looks fine in the browser — 23 of them accumulated silently
   across batches 2 *and* 3 before being spotted. Always order `-500` before `-50` and
   `-100`, and audit with `grep -rn "brand-gold/[0-9][0-9][0-9]"`.
3. **Blanket `text-white` replaces** eat deliberate white-on-colour (`data-[state=active]:
   text-white`). Check for `text-white` on *coloured* backgrounds first.

**Contrast rule this surfaced:** gold `#c9a869` is a *light* colour, so `text-white` on it
is unreadable. 20 such pairings existed across batches 2-3 (step circles, tab triggers,
badges, and two buttons where a stray `text-white` trailed the gold-button triplet and
overrode its foreground). All now use `text-brand-gold-foreground` (navy). Audit with
`grep -rn "bg-brand-gold[^/\"]*text-white"`.

**Client-facing brand rollout is complete** (batches 1-3, ~38 pages) and **browser-verified
on the deployed site by Farjad, 2026-08-04** — no contrast misses or broken layouts
reported. The earlier "not verified" caveat on batches 1-3 is now closed; treat the
conventions above as proven in a real browser, not just reasoned about.

Remaining and low priority: `Metrics` chart line colours are still the Recharts demo
palette (cosmetic, not really page chrome).

(Batch 1 was unverified when written; verified along with 2 and 3 on 2026-08-04, see the
end of this section.)

**Web Traffic page, dark-theme-in-a-light-app (Farjad, 2026-08-02, found by Farjad from a
prod screenshot).** Separate from the client-facing batches above — this is an *admin*
page, and the one exception to "internal admin tools keep their palette", because it
wasn't a palette preference, it was unreadable. `WebTrafficAnalytics.tsx` was written as a
dark-theme page (`bg-slate-800/50` cards, `text-white`, `text-slate-400` labels) but the
admin app is light. The `/50` opacity meant the cards composited to mid-grey over the
light page, and the mid-grey `text-slate-400` labels ("Total Page Views", "Unique
Visitors", the "All Pages" table headers) disappeared into them. White numbers stayed
readable, which is why it looked half-broken rather than obviously broken.
- Converted to the light admin theme: cards `bg-white border-gray-200`, nested panels
  `bg-gray-50`, `text-white`→`text-gray-900`, `text-slate-400`→`text-gray-500`,
  `text-slate-300/500/600`→`text-gray-600`, table/progress-track borders to `gray-200`.
- Also darkened the accent icons from `-300`/`-400` to `-500`/`-600`. Those shades were
  picked to glow on a dark card and go washed out on white.
- Gotcha: a blanket `text-white`→`text-gray-900` replace also hit the
  `data-[state=active]:text-white` on the tab triggers (white-on-orange, correct), which
  had to be put back. Check for intentional `text-white` on *coloured* backgrounds before
  bulk-replacing it.
- Swept the other admin pages for the same bug afterwards: none. The four hits for dark
  backgrounds are all legitimate (`dark:` variants in `PaymentHistory`/`Inventory`, an
  active filter pill in `Enrollments`, a video letterbox in `Chat`). This page was the
  only one, same as `NotificationTemplates` was the only outlier in the settings tabs.

---

## hard-reloads
Sweep of internal `window.location.href` / `<a href="/…">` navigations that should be
client-side (`Link` / `setLocation`) instead of a full page reload.

Converted: `AdminLayout` ×2 (Access Denied buttons), `Booking` → `/`, `CoachingPrograms`
×2, `CheckinHistoryTab`, `client-edit/DetailsTab`.

**Six left, and all six are deliberate — do not convert:**
- `AdminLayout:320`, `DashboardLayout:76` → `/login?returnTo=…`: auth boundary, session is
  changing, app must re-bootstrap.
- `AgeDisclaimer:22` → `/age-restricted`, `AgeRestricted:42` → `/`: age-gate boundary.
- `AcceptInvite:47` → `/admin`: the user's role just changed; a soft nav would render
  admin against stale auth state.
- `CustomOrderPaymentCancelled:25` → `/`: post-payment, per the original triage.

Correction on the way to this: an earlier note in `STATE.md` claimed `AdminLayout`
violated the rules of hooks (hooks after an early return). Wrong — those hooks belong to
`AdminLayoutContent`, a separate component in the same file. `AdminLayout` itself calls
four hooks, all before every return. That false finding blocked two conversions for a
day; retracted in `STATE.md`.

---

## settings-tabs
`client/src/pages/admin/SettingsHub.tsx` replaces 13 separate admin settings routes with
one tabbed page at `/admin/settings`, grouped General / Notifications / Email.

- **Container, not a rewrite.** Each tab renders the existing page component untouched —
  no page's behavior or data fetching changed.
- **Deep-linkable**: `/admin/settings/<slug>`; switching tabs updates the URL with
  `replace: true` so Back leaves Settings instead of walking every tab visited.
- **Lazy per-tab**: only the selected panel mounts, so opening Settings fetches one
  panel's data, not 14.
- **Role-filtered per tab** (`roles` on each `TabDef`, default admin-only). Collapsing 9
  sidebar links into one page would otherwise show a manager the admin-only panels the
  sidebar used to hide from them. `Team Email Preferences` stays a separate sidebar entry
  for managers, since the Settings page itself is admin-only.
- **Old routes still work**: `App.tsx` `<Redirect>`s each of the 13 old paths to its tab,
  client-side, so bookmarks survive without a hard reload.
- **`Templates` (protocol templates) deliberately excluded** despite being on the
  original consolidation list: it has `/new` and `/:id` sub-routes, so it's a CRUD area,
  not a settings panel — folding it in would mean nesting a router inside a tab.
- **Follow-up from the Launchpad Settings removal (Farjad):** `SettingsHub.tsx` originally
  had a 14th tab wrapping `LaunchpadSettings.tsx`. Removed that tab, its lazy import, and
  the now-pointless `/admin/launchpad-settings` redirect in `App.tsx`. 13 tabs remain.

**Panel wrapper cleanup (Saboor):** the 13 panels disagreed on their outer wrapper
(`space-y-6`, `container mx-auto py-6`, `p-6 max-w-4xl mx-auto`, etc.), so switching tabs
visibly shifted the content and double-padded inside the hub. All 13 now use `space-y-6`
(class-string-only edits, brace/paren balance checked against JSX damage). Tab rail
scrolls horizontally rather than wrapping — 13 tabs + 3 group labels stacked into 4-5 rows
on a phone and pushed the panel off-screen.

**Entry-point move + panel `<h1>` cleanup (Farjad, 2026-07-31):** reverses the "kept" call
above — with the hub now the only way in, every panel's own `<h1>` was a second, larger
duplicate of the hub's "Settings" title sitting a few pixels below it, not a normal section
heading. Removed the `<h1>`/icon-circle header block from all 12 live panels (13th,
`LaunchpadSettings`, was already removed), keeping each panel's descriptive subtitle as a
plain paragraph so the "what is this tab for" context isn't lost, just the duplicate title.
Class-only + JSX-block-only edits, one panel at a time, unused icon/hook imports (`ArrowLeft`,
`Settings2`, `Bell`, `History`, `Calendar`, `Webhook`, `useLocation`) removed per file where
they had no other use.
- Also removed 5 dead "back to /admin/settings" arrow buttons (`goBackTo()`) left over from
  when each panel was its own route — `IntegrationSettings`, `NotificationSettings`,
  `NotificationReport`, `EmailTemplatePreview`, `EmailReportSettings` — plus a 6th found
  during the sweep that used a different pattern (`NotificationAnalysis`'s `<Link
  href="/admin">Back</Link>`, not `goBackTo`).
- `NotificationTemplates.tsx` was the one dark-theme panel (`bg-gray-800`/`text-white`)
  against 12 light-theme panels; rewrote it to the same light `Card`/`text-gray-900`/
  `border-gray-200` pattern as the rest, orange accent kept but on light backgrounds
  (`bg-orange-500` active tab, `text-orange-600`/`bg-orange-50` outline buttons) instead of
  the dark-mode `/20`-`/50` opacity variants.
- **Settings entry point moved**: sidebar no longer has a "Settings" nav link under Team &
  Settings; a gear icon now sits in the sidebar footer next to the profile
  (`AdminLayout.tsx`, `SidebarFooter`), admin-only, `setLocation('/admin/settings')`,
  active-state highlight via `location.startsWith('/admin/settings')`. Hidden when the
  sidebar is collapsed to icon-only, same as the profile name/email already were.
- **Deliberately NOT done this pass** (scoped out, see chat): flattening the 7 panels that
  nest their own `Tabs` inside the hub tab (`Settings.tsx`, `NotificationSettings.tsx`,
  `NotificationTemplates.tsx`, `EmailBranding.tsx`, `EmailTemplatePreview.tsx`,
  `NotificationHistory.tsx`, `NotificationAnalysis.tsx`) — bigger restructuring, held for a
  separate pass if wanted.

---

## settings-tabs-qa
Browser checklist for the settings consolidation (needs a live admin session):

| # | Path | Expect |
|---|---|---|
| 1 | `/admin/settings` | Opens on the Site tab, grouped tab bar renders |
| 2 | Click through all 13 tabs | Each panel loads its own content; URL tracks the tab |
| 3 | `/admin/notification-settings` (old path) | Redirects to `/admin/settings/notifications` without a full page reload |
| 4 | `/admin/settings/bogus` | Falls back to the Site tab, not a blank page |
| 5 | Sidebar footer gear icon (admin login) | Opens `/admin/settings`; not shown to non-admins; hidden when sidebar is collapsed to icon-only |
| 6 | Each of the 12 tabs | No duplicate title under the hub's "Settings" heading, no leftover "back" arrow button |
| 7 | Notifications → Templates tab | Light theme, matches the other 11 tabs (was the dark-theme outlier) |

---

## auth-browser-pass
The token-based paths on the auth-hardening work are runtime-verified over HTTP. The
**session**-based paths are not — they need a real OAuth login, not available locally. If
one of these is wrong it breaks a screen rather than leaking anything, but check before
Jason's team sees it.

| # | Path | Expect |
|---|---|---|
| 1 | `/admin/enrollments` → open an enrollment → Intake Form panel | Intake renders (staff session path) |
| 2 | `/admin/clients/:id` → Intake tab | Intake renders; inline field edit saves |
| 3 | `/intake` → enter name + email → wizard | Wizard loads, autosaves, submits |
| 4 | `/transformation/checkout` → guest → pay → `/payment/success?enrollmentId=…` | Intake still authorizes after the Stripe round-trip (sessionStorage survives) |
| 5 | `/transformation/verify?token=…&enrollmentId=…&autoIntake=true` | Magic link opens intake |
| 6 | `/checkin/:id?token=…` (from a check-in email) | Check-in opens and submits |
| 7 | `/checkin/latest` → click a check-in (signed-in client, no token) | Opens via session — this is the owner path |
| 8 | `/checkin/:id` with no token, signed out | Clean "link invalid or expired", not a crash |

Status 2026-07-30: #1, #2 confirmed on the deployed build (intake panel renders + PDF
export works). #7 needs a **client-role** login — `jason@sossupport.net` owns protocol
930002 with 15 check-ins, use that account. #3–6, #8 still open.

---

## client-dashboard
`client/src/pages/client/Dashboard.tsx` (1769 lines). First pass (Farjad, 2026-07-30),
two things:

1. **Fixed a real, objective bug, not a style opinion.** Several cards (Sign In Required,
   Resources & Tools, My Favorite Peptides, the old Recent Messages) and all three dialogs
   (photo upload, journal entry, before/after comparison) were leftover dark-theme
   classes on a light background — `text-white` / `text-slate-400` / `text-slate-500`
   used where the container is `bg-white` / `bg-gray-100`. Worst case: the photo-caption,
   note-title, energy/sleep, and note-content inputs all had `text-white` on
   `bg-gray-100`, so **typed text was invisible while typing.** Replaced with
   `text-gray-900` (headings/values) / `text-gray-500` or `text-gray-400` (secondary) to
   match the rest of the page. Also fixed two dead-hover spots
   (`bg-gray-100 hover:bg-gray-100` — hover had zero visual effect).
2. **Moved the Messages/comments preview to the top of the page**, right under
   `WelcomeMessage`, matching the milestone task. It's a preview card (last 3 comments +
   unread badge + "View All" to `/protocol/:token#comments`), not a full inline chat —
   there's no embedded chat component on this page, comments live on the Protocol page.
   Dropped the redundant "Chat with Coach" tile from Client Corner since it pointed at the
   exact same destination as this card and the "Messages" quick-link tile.

**Not done / left open:**
- No local `.env` and no client-role login available to this session, so none of this
  could be visually verified in a browser — only reviewed as a diff. Needs a real
  browser pass before calling it done (see the QA line added in `current.md`).
- This is a targeted fix, not the "overhaul" Jason asked for. A real overhaul (layout,
  information architecture, what's actually useful vs noise on this page) needs either
  design direction or a scoping conversation — flagged back to `current.md` as `[~]` in
  progress, not `[x]`.
- Didn't touch: the still-present quickLinks "Messages" tile (kept, it's a legitimate
  quick action, not a duplicate of the new top card), the overall page density (still
  ~9 stacked Card sections), or any of the `bg-gray-100` "hover:bg-gray-100" pattern
  outside the two spots fixed here (worth a grep across the rest of the client-facing
  pages if the same dark-theme-leftover bug exists elsewhere).

### Second pass (Farjad, 2026-07-30) — real chat panel + layout
User explicitly asked for a redesign (cleaner/modern, less vertical scroll) plus a chat
panel "stuck to the right side," not just viewable. Decided via `AskUserQuestion` before
touching code: full inline chat (not a bigger preview), dashboard-scoped only (not a
global layout change), floating-button+drawer on mobile, and layout work now with the
redundant-section trims (recorded in `decisions.md`) held for later.

- **New `client/src/components/ClientChatPanel.tsx`.** Wraps the exact same data path as
  the "Discussion" card on `client/src/pages/client/Protocol.tsx`
  (`trpc.comments.list/create/markRead`, same `ChatRichTextEditor`, same
  `processMessageForDisplay` sanitizer, same Loom-embed support) — it's a second surface
  for the same conversation, not a parallel chat system. Polls every 15s
  (`refetchInterval`), matching the pattern already used in `admin/Chat.tsx`. Renders
  either the panel (desktop) or drawer content (mobile) depending on where it's mounted —
  same component, no `variant` prop needed since it's just flex-column CSS.
- **Dashboard layout**: `container` widened `max-w-6xl` → `max-w-7xl`, wrapped in
  `lg:flex lg:items-start lg:gap-6` with the existing content in a `flex-1 min-w-0
  max-w-6xl` column and a new `<aside className="hidden lg:block w-90 shrink-0 sticky
  top-20 ...">` holding the panel. `top-20` is an eyeballed offset under the sticky navy
  header (~64px) — not verified against the real rendered header height, worth a look in
  the browser pass.
- **Mobile**: `lg:hidden` floating button (bottom-right, unread-count badge reusing the
  same `unreadComments` the top preview card already computed) opens
  `components/ui/drawer` (vaul, bottom sheet by default) with the same `ClientChatPanel`
  inside, `h-[85vh]`.
- **Top "Messages" preview card is now `lg:hidden`.** On desktop the sticky panel is
  always visible, so leaving the preview card there too would mean the same unread
  message shown twice on one screen simultaneously — not a discretionary audit trim,
  a direct consequence of the panel existing. Its "Open Chat" / row clicks now open the
  drawer (`setShowChatDrawer(true)`) instead of navigating to the Protocol page, since
  the drawer *is* the full chat now on mobile too.
- **Cut one full card of vertical scroll without removing any content**: merged the
  standalone "My Progress" card (milestone stepper + peptide/supplement item breakdown)
  into the Progress Tracking card as a third tab ("Milestones"), alongside the existing
  Photos/Notes tabs. Same JSX moved verbatim into a `TabsContent value="progress"`, same
  guard condition (`myProtocol && includedItems.length > 0`). Not a candidate from the
  audit list above — that list is explicitly held; this was reorganization, not removal.

**Not done / left open:**
- Still no browser verification possible from this session (no `.env`, no client login).
  Specifically worth checking once someone can: the `top-20` sticky offset against the
  real header height, the drawer's `h-[85vh]` on small phones, and whether 360px
  (`w-90`) is a comfortable chat-panel width against the remaining `max-w-6xl` content
  column on common laptop widths (1280–1440px).
- Real-time delivery is still polling (15s), not push/websocket — same limitation the
  rest of the app's chat has, not something this pass tried to fix.

### Third pass (Farjad, 2026-07-30) — acted on the audit list, screenshot-verified
Jason confirmed the UI direction was good and gave explicit go-ahead ("if I don't like it
we can revert") to act on the audit list rather than leave it sitting in `decisions.md`.
He also supplied real client credentials (`f@gmail.com`) and a screenshot of the live
Railway deployment confirming the chat panel renders and works correctly — this session
still has no local DB access to verify that independently, so the screenshot from him is
the only real-browser confirmation this pass has.

- Removed the "Referral Program" tile (dead route) and fixed "Watch Masterclasses" to
  point at `/transformation/masterclass` (the real `Masterclass` component) instead of
  `/masterclass`, which now just redirects to `/transformation`.
- Merged "Quick Actions" + "Client Corner" into one `quickActions` array / one grid style.
- Merged the old `QuickStats` component + the Protocol Status Banner into a single hero:
  navy header (status + CTA) over a 4-up white stat strip (duration/items/peptides/
  investment). **Deleted `client/src/components/QuickStats.tsx`** — fully superseded,
  had no other callers.
- Removed the one-time welcome toast (`dashboard_welcome_${user.id}` in localStorage),
  kept the permanent `WelcomeMessage` card only.
- Removed the duplicate "Educational Resources" resource tile (same URL as the Peptide
  Cheat Sheet quick action).
- **Follow-up, caught by Farjad after reviewing the live result**: the "Quick Links" row
  (View My Protocol / Messages / Launchpad, `quickLinks` array) had quietly become 100%
  redundant as a side effect of the earlier passes — View My Protocol duplicates the new
  hero's CTA and every row in "My Protocols"; Messages duplicates the always-visible chat
  panel; Launchpad duplicates the button already in the sticky header. Removed the whole
  block and the `quickLinks` array. Worth grep'ing for this pattern (a card whose only
  job was linking somewhere another new element now also links) if more consolidation
  passes happen later.

**Still open**: the milestone progress bar in the Milestones tab is cosmetic (fixed
10/25/50/100% lookup by status, not real elapsed time) — tracked as its own item in
`decisions.md`, deliberately not changed since it's a product judgment call, not a bug.

## admin-sidebar-restyle
Sidebar was hardcoded navy (`#1e3a5f`/`#2d4a6f`), unrelated to the brand. Now reads
`bg-sidebar` / `hover:bg-sidebar-accent` / `text-sidebar-foreground` — all `--sidebar-*`
CSS variables defined once in `client/src/index.css`, so a future palette change is a
one-file edit. `AdminLayout.tsx` never reads a hex value directly.

## omega-palette
Real Omega Longevity brand, matched from a user-supplied screenshot (WebFetch can't
render the live JS-heavy site): deep navy `#141b2e` background, flat champagne gold
`#c9a869` accent (flat, not a gradient), dark-navy text on the gold CTA. Stored as
`--brand-dark` / `--brand-gold` in `index.css`, thin aliases over `--sidebar-*` so
sidebar/login/cover share one source of truth. Use these tokens (not new hex values) when
extending the brand to more of the app.

## layout-tidy

**Highest-traffic admin pages** — `page_views` has 9,449 rows but **zero `/admin` paths**
(the tracker only covers public/client pages), so traffic can't be measured. Used the app's
own signal instead: the pinned sidebar items (My Action Items, KPI Dashboard, Message Inbox,
Fulfillment Queue — the last carries a comment calling it "the actual daily work tool for
processing orders") plus the core-workflow pages (Clients, ClientEdit, Enrollments,
Check-ins, Prospects).

**Fixed: double page padding.** `AdminLayout` already wraps every admin page in
`<main className="flex-1 p-3 md:p-6">`. Five pages added their own padding on top, so their
content sat ~24px further in than the ~9 pages that use a bare `space-y-6`:
MyActionItems, FulfillmentQueue, KPIDashboard (`p-6 …`), Prospects (`space-y-6 p-6`),
Inbox (`p-3 sm:p-6`). Class strings only; each edit asserted a single unique match plus
unchanged brace/paren counts.

**Checked and NOT a problem: table overflow.** 18 admin pages appeared to have tables with no
`overflow-x` container. All false positives — the shadcn `Table` primitive already wraps
itself in `<div class="relative w-full overflow-x-auto">`. The only raw `<table>` without one
(Inventory) is inside a print/export HTML template string, not JSX. No fix needed; don't
re-investigate.

**Second pass (2026-08-02) — six more double-padded pages, and the width call made.**

- Fixed the same padding duplication on **AcquisitionDashboard, Backorders, CoachingSessions,
  ConversionTracking, MorningBriefing**, and **KPIDashboard's loading state**.
- ⚠️ **KPIDashboard is the lesson:** the first pass fixed its main render but not its early
  `if (isLoading)` return, so content visibly **jumped 24px** when data arrived. Fixing a page
  wrapper means fixing *every* return in that component, not just the last one.
- **Width standardised on `max-w-7xl mx-auto`** (Saboor's call, 2026-08-02): Backorders was
  `5xl` and AcquisitionDashboard `6xl`; both moved to `7xl`. All 10 clamp occurrences across
  8 pages now agree, and `7xl` is the only clamp form left in the admin area. The other ~54
  admin pages stay **full-width** deliberately — only pages that already clamped were touched.

⚠️ **Don't audit this with a regex over `return (`.** Two scripted attempts both produced
garbage: matching the *last* `return (` picks up nested returns inside `.map()` callbacks
(it reported MyActionItems as unclamped when it demonstrably is not), and a stricter pattern
resolved only 13 of 62 pages. Every candidate here was confirmed by reading its surrounding
code. Known false positives, do not re-raise: `Inbox` and `CalendlySettings` (nested cards),
`ClientEdit`/`MyActionItems` (Card/CardContent), `SettingsHub` (icon container),
`ShannonKanban`/`AcquisitionDashboard` sub-components.

## admin-dashboard-consistency

Applying what carried over from Farjad's client-dashboard overhaul to
`client/src/pages/admin/Dashboard.tsx`. Constraint: CSS/markup only — no data, links or
behaviour — and **the admin orange accent stays** (2026-08-02 brand-scope decision by
Farjad + Jason: internal admin pages keep their working palette). Where his design
decisions and mine collide, his win.

**Done:**
- The "Protocol Collaboration Center" card was moved here from the Launchpad page and
  brought `#1e3a5f` with it — one of the three *fake* navies listed in `#brand-rollout`,
  and the only hardcoded hex on the admin dashboard. Removed all 4 uses; the card now uses
  the plain `<Card>` treatment every other section on the page uses. Its amber/orange
  accent is untouched.
- Finished a half-done responsive pass inside that card: the first of its three boxes had
  `p-3 md:p-4`, `h-5 w-5 md:h-6 md:w-6` and `text-sm md:text-base`, the other two were
  left at desktop-only values. All three now match.

**Deliberately NOT done, and why** — most of the overhaul either doesn't apply or is
excluded by the constraints, so this was a much smaller job than it sounds:
- *Brand tokens (navy/gold)* — excluded, admin keeps orange per the scope decision.
- *Merging the two action grids* — "Protocol Collaboration Center" and "Quick Actions"
  both link to `/admin/clients/new`. That is the same duplication Farjad removed on the
  client side, but removing a button changes what an admin can click, which the brief
  ruled out. Left alone; worth raising separately.
- *Broken links* — none to fix, the `/admin/*` link audit already cleared this page.
- *Welcome card, chat-to-top* — no equivalent on the admin dashboard.

Section headings were already consistent (`text-lg font-semibold` on both `<h2>`s), and
the other custom-styled cards use semantic colours that carry meaning (red = alert), so
they were left alone.
