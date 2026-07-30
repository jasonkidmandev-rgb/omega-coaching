# Task notes (Claude-only reference)

Implementation detail behind `milestones/current.md` tasks — the stuff that makes
`current.md` unreadable if it lives inline. Nobody needs to read this file to know what's
left to do; `current.md` is for that. This is where the trail lives so the next Claude
session (or a human who wants the detail) can find it. Referenced from `current.md` as
`task-notes.md#<heading>`. No structure requirements — append under the relevant heading,
add a new one if a task needs it.

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
on a phone and pushed the panel off-screen. Panel `<h1>`s deliberately kept (reads as a
normal section heading under "Settings"; stripping all 13 would be real JSX surgery for
no functional gain).

---

## settings-tabs-qa
Browser checklist for the settings consolidation (needs a live admin session):

| # | Path | Expect |
|---|---|---|
| 1 | `/admin/settings` | Opens on the Site tab, grouped tab bar renders |
| 2 | Click through all 13 tabs | Each panel loads its own content; URL tracks the tab |
| 3 | `/admin/notification-settings` (old path) | Redirects to `/admin/settings/notifications` without a full page reload |
| 4 | `/admin/settings/bogus` | Falls back to the Site tab, not a blank page |
| 5 | Sidebar → Team & Settings | One "Settings" entry, not nine |

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
- The audit-list trims (broken links, duplicate nav grids, triple status display, etc.)
  are deliberately NOT done — tracked in `decisions.md` pending sign-off, not silently
  applied.
- Real-time delivery is still polling (15s), not push/websocket — same limitation the
  rest of the app's chat has, not something this pass tried to fix.

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

**Open design question (needs the browser pass, not a code decision):** MyActionItems,
FulfillmentQueue and KPIDashboard clamp to `max-w-7xl mx-auto`; the other ~9 admin pages are
full-width. Left as-is deliberately — picking one is a design call, and it's a visible change
best made while looking at the screens.
