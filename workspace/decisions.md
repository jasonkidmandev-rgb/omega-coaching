# Decisions log

Technical and coordination decisions only — compensation and business strategy stay out
of the code repo. When an open item is decided, move it down to "Decided" with the date
and the reason.

## Open — needs Farjad's call

- **Fix `pnpm db:push`, or stop using it?** Running it now fails with two errors, because
  the schema file (`drizzle/schema.ts`) is missing `.primaryKey()` on every table. Either
  add the missing primary keys, or officially declare "always extract the DB structure
  from a snapshot instead" as the supported path in `test-harness/README.md`. Not
  blocking — we already work around it by extracting from the prod snapshot. Found
  2026-07-29.
- **When do we run the People-rename migration** (`cutover/phase4-people-rename.sql`)?
  Until it runs, `personId` isn't a real database column, so any raw SQL referencing it
  is a silent bug — nothing catches it automatically. This is exactly what caused the
  chat outage. The longer we wait, the longer that risk sits there.

## Open — needs Jason's call
- **The "overdue intake" metric flags every enrollment we have.** It means: not
  completed/renewed/active/launched, and enrolled more than 10 days ago. Production has 28
  enrollments, all sitting in `coaching_paid`, `intake_complete` or `enrolled`, the newest
  from 2026-06-15 — so all 28 are "overdue" and always will be, because nothing moves them
  to a status that clears it. Either the statuses are not being advanced in real use, or
  the definition is wrong. A number that is always 100% tells nobody anything. (Saboor,
  2026-08-04 — the separate bug where it displayed 20 instead of 28 is fixed.)
- **Promotions page CTAs point at a redirect.** `Promotions.tsx` (routed at `/promotions`
  and `/offers`) has 3 buttons — "Order Now", "Start Your Journey", "View Bundle" —
  pointing at `/store`, which redirects to the homepage. The store is at `/order`, and the
  sidebar says the store is "hidden for compliance". Point them at `/order`, or remove?
  Not changed either way pending his answer. (Saboor, 2026-08-01)
- **Is `protocol_orders` a dead concept?** 0 rows in production; its only admin view
  (`/admin/order-history`) has now been removed. Recoverable from git if it was planned
  rather than abandoned. (Saboor, 2026-08-01)

- **Returning clients now reopen their intake form from their email link instead of
  resuming it in-browser** (changed 2026-07-29). We can't yet prove a returning client's
  typed-in email is really theirs, so we can't safely hand them a link straight into
  their medical history — that's why we chained this to the email link. Confirm you're
  OK with this trade-off, or we build email verification for that branch.
- **Does the `support@humanedge.health` inbox exist and get checked?** It's now shown to
  clients on the custom-order payment screen. If it's not real, client emails will
  bounce.
- **Keep the old coaching checkout, or retire it?** Purchases now run through the Omega
  Longevity funnel instead. Decides how much of the old payment flow is still worth
  building or maintaining.
- **The "discountable" flag on products doesn't do anything right now** — every item
  gets discounted regardless of the flag. Fixing it will raise some clients' totals, so
  it needs your sign-off before we touch it.
- **Which of these admin pages can we drop: Job Health, KPI Dashboard?** (Notification
  Analysis / History / Team Email Preferences resolved below, 2026-07-31.) Also still
  open: Email → Preview is likely redundant (Email → Templates already shows everything
  it does, plus more) — decide its fate alongside the email-branding simplification pass.
  Actually removing anything is M2 work, not now.
- **Kill the email-engagement tracking pipeline, or leave it running?** The admin UI for
  it was already removed (M2), but the backend (open/click tracking, `engagementRouter`,
  two test suites) is still live with nothing surfacing the data anywhere. Found
  2026-07-31 while auditing the admin nav for dead pages.
- **Does "Onboarding Wizard" on the go/keep list mean the client-facing one too?** The
  admin-side "Onboarding Manager" config page is already gone (M2). The thing still alive
  today under a similar name is `DashboardOnboardingWizard.tsx` — a goal-picker modal on
  the client's My Account page, unrelated to what was removed. Confirm whether that's also
  meant to go, since it's a different, currently-used feature. Found 2026-07-31.
- **Site Settings page: review what's actually needed and simplify it.**
- **Client dashboard milestone progress bar is cosmetic, not real.** The one remaining
  item from the 2026-07-30 dashboard audit (rest was actioned, see Decided below): the
  Milestones tab (Protocol Created → Approved → Active → Completed) is a fixed lookup
  table (10/25/50/100% by status), not time- or task-based — a protocol active 1 week
  and one active 11 months both show 50%. Keep as a simple status stepper, or make it
  reflect something real (e.g. weeks elapsed / weeks total)?
- **Which milestone do these belong in — M3 or v2?** Client-facing check-in
  consolidation, surfacing progress photos on the check-in screen, Lisa's project-task
  feature. (Client dashboard overhaul moved to M1; the progress-photo display-size bug
  moved to M1 too — both were UI fixes, not the bigger feature question below them.)
- **How do we migrate client history — everything at go-live, or backfill afterward?**
  Affects the ~1-week data-migration track in M4.

## Decided (append-only: date, decision, why)
- 2026-08-04 — **Five M2 removals, with three things deliberately kept** (Farjad).
  Removed: the Programs admin page and its write endpoints; the Masterclass Videos admin
  page; the Affiliate Partners admin page (and the now-empty Marketing & Outreach
  category); Daily Tools including both pages under it; and the payment-reminder UI inside
  the protocol build.
  **Kept, each for a reason:** the client-facing `/partners` page, because five email
  templates and the protocol PDF link to it and clients already hold those emails, so
  deleting it breaks live links (cost: partner rows are now editable only in the DB);
  the per-client "Opt Out of Payment Reminders" toggle, because it controls whether a real
  client receives automatic emails and the cron reads it, so removing the UI would leave
  the column unsettable; and the client masterclass page plus the Protocol Build
  masterclass tab, because sending people to GHL instead needs a URL nobody has, and that
  tab also gates the protocol builder behind watching one of the videos.
  **Not folded in:** the remaining Program dependencies (assignment panel on a client's
  record, program-phase template sync, phase journey on the client protocol page, which
  also feeds the PDF and the protocol email). Those change what live clients see, they are
  already the M3 "Remove Program dependencies from the protocol build" task, and the client
  protocol page is being overhauled in M2 regardless. Removing the page and the write
  endpoints freezes Programs without touching an existing client's protocol.
  Full audit trail in `claude/task-notes.md#m2-removals`.

- 2026-08-01 — **Dead/broken link cleanup under `/admin/*`** (Saboor). Payment History's
  two mistargeted row links **fixed**; the Promo Codes "Access Codes" back button
  **removed** (page gone, only an orphaned table remains); the two `/new` quick actions
  **repointed** at their list pages (Items and Programs create via a dialog, so no `/new`
  route ever existed); the Launchpad's always-404 "My Protocol" mobile item **removed**
  rather than rebuilt — `LaunchpadHub` makes no tRPC calls, so linking it properly would
  add a data dependency to an otherwise static page, and clients already reach their
  protocol from the Dashboard one item above. `/admin/order-history` and
  `/admin/intake-form-editor` **removed** (evidence in `context.md`: 0 rows in
  `protocol_orders`; strict-subset proof for the intake editor). `/admin/dashboard` kept
  as a **redirect** to `/admin` rather than deleted, so staff bookmarks don't 404 — same
  pattern as the `shannon-kanban` shim.

- 2026-08-01 — **Direct UI-based payments are being removed from humanedge.health**
  (Saboor). First consequence applied: deleted `server/planQuiz.test.ts`. The quiz's
  recommendation flow ends at `setLocation('/transformation/checkout?plan=…')`
  (`PlanQuiz.tsx:225`), so it is an entry point to exactly that funnel and goes with it.
  This also closes the stale 2026-07-28 flag asking Jason to confirm the quiz price list
  ($3,000 / $8,500 / $15,000 / $1,000) — no longer worth his time.
  ⚠️ Note the test was a **real** one (it imported `getRecommendation` and covered plan
  selection across all 45 goal/experience/support combinations); it was removed because
  the feature is going, not because the test was weak. `PlanQuiz.tsx` and
  `TransformationEntry.tsx:1777` are **still live and now uncovered** — the component
  removal itself is not yet scoped or tracked.

- 2026-07-31 — Jason ran a full go/keep/decide pass over every admin nav item (via
  Farjad). Result matched the existing M2 plan almost exactly (Programs, Masterclass
  Videos, Peptide Cheat Sheet, Team roles, email-branding simplification, and the
  "keep as-is" list were already tracked there unchanged) — logged as confirmation, no
  plan changes needed for those. Three items not yet tracked got a call: **Notification
  Analysis → remove** (it's a hardcoded developer reference page documenting crons/emails
  in code, not an admin tool — belongs in a repo doc, not a live page); **Notification
  History → keep** (real operational log of what actually sent, used for support
  questions); **Team Email Preferences → keep** (lets each staff member control their own
  notification noise). Actually removing Notification Analysis is still M2 work, not done
  yet.
- 2026-07-31 — Renamed the "Team & Settings" sidebar category to "Team & Content"; no
  items moved. Why: Settings itself already moved to the gear icon earlier the same day,
  so the old label was misleading; the remaining items (Team, Templates, Protocol Items,
  Categories, Programs, Coaching Promos, Masterclass Videos, Forms Editor, Peptide Cheat
  Sheet, Team Email Preferences, Workflow Templates) turned out to be real management
  pages staff use often, not simple config toggles, so none of them belonged behind the
  small gear icon — Jason confirmed daily-driver pages should stay visible in the sidebar.

- 2026-07-29 — Client-facing endpoints now check **staff role, OR the signed-in owner, OR
  a valid access token**, and give the same error whether a record doesn't exist or just
  isn't yours (so ids can't be probed for which is which). Why: these endpoints were
  wide open — a sequential integer id was the only thing standing between the internet
  and 36 clients' medical intakes.
- 2026-07-29 — Access tokens live in the browser's `sessionStorage`, never in a URL. Why:
  a URL-borne token gets written into browser history and sent to Stripe in the
  `Referer` header; sessionStorage is per-tab and dies with the tab.
- 2026-07-29 — Enrollment access tokens are only issued when we create the enrollment,
  never when a client resumes an existing one by typing their email. Why: on the resume
  path, the email is an unverified claim — handing out a token there would mean knowing
  someone's email is enough to read their medical intake. Cost: returning clients must
  reopen from their email link. **Flagged to Jason above.**
- 2026-07-29 — Before trusting any token-gated endpoint, check what else can mint that
  token. Why: `completePaymentPublic` was unauthenticated and handed out a fresh 30-day
  access token for any enrollment id, which quietly defeated a token gate we'd already
  shipped elsewhere.
- 2026-07-29 — The app's base URL is defined in exactly one place
  (`server/lib/appUrl.ts`); never hardcode a domain. Why: ~70 places had duplicated
  fallbacks that all pointed at the **old Manus site**, so a missing env var would
  silently mail clients back to peptidecoach.pro instead of failing loudly.
- 2026-07-29 — Delete tests that only assert "this function exists" / "this name exists."
  Why: they can't fail for any reason involving actual behavior, they were the cause of
  the suite's flaky timeouts, and one of them (`inbox.test.ts`) stayed green through a
  real chat outage — advertising coverage that didn't exist. Real behavioral coverage
  needs a DB-backed test harness (v2 project).
- 2026-07-29 — Anything that reaches a real person (crons, email, IMAP, live Stripe) must
  be gated behind `sideEffectsDisabled()` in `server/_core/appEnv.ts`, not a plain
  `NODE_ENV` check. Why: local dev used to default to the production environment, so
  running the app locally fired ~20 cron jobs and a live mailer against the real
  production database.
- 2026-07-29 — Both devs push straight to `main`; always `pull --rebase` before pushing.
  Why: Railway auto-deploys `main` for prod testing, so a branch would hide work from the
  live test site until merged.
- 2026-07-29 — Farjad owns DB / schema migrations. Why: avoids two conflicting migrations
  landing on prod at once.
- 2026-07-29 — Weekly work billed as separate Fiverr orders, one per milestone/week. Why:
  predictable payments, plus a natural review point per completed order.
- 2026-07-29 — v1 launch scope stays general when talking to Jason; milestones stay
  specific internally. Why: keeps room to fold in what we find along the way without
  moving the launch date in front of him.
- 2026-07-30 — Removed Launchpad Settings entirely: the admin page, both its API routers,
  and the three database tables behind it. Kept the live `/launchpad` client page as-is
  (separately trimmed to Jason's content list). Why: the admin settings page and the real
  client page were completely disconnected — admin edits never affected what clients
  saw, so the settings page was pure maintenance overhead with zero benefit. Full
  writeup in `claude/context.md`.
- 2026-07-30 — Acted on the client dashboard audit rather than leaving it as a list:
  fixed both broken buttons (dead `/referrals` route removed; "Watch Masterclasses" now
  points at the real masterclass content), merged the two navigation-tile grids into one,
  merged the three separate status/duration displays into one hero card, deduped the
  Peptide Cheat Sheet link and the welcome message, and removed a "Quick Links" row
  (View My Protocol / Messages / Launchpad) that had become fully redundant with the new
  hero CTA, the always-visible chat panel, and the header's existing Launchpad button.
  Why: Farjad reviewed the list with Jason and got the go-ahead to act, not just record
  it; low risk since the whole pass is one revertible commit range. Only the cosmetic
  milestone-progress-bar item was left open (see above).
