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
- **Which of these admin pages can we drop:** Notification Analysis, Notification
  History, Job Health, Team Email Preferences, KPI Dashboard? Two more candidates
  surfaced while building the new tabbed Settings page (Saboor, 2026-07-30): Email →
  Preview is likely redundant (Email → Templates already shows everything it does, plus
  more), and the three Notification views (Report / Analysis / History) could likely
  become one view with a filter. Actually removing anything is M2 work, not now.
- **Site Settings page: review what's actually needed and simplify it.**
- **Which milestone do these belong in — M3 or v2?** Client-facing check-in
  consolidation, progress photos, client dashboard overhaul, Lisa's project-task feature.
- **How do we migrate client history — everything at go-live, or backfill afterward?**
  Affects the ~1-week data-migration track in M4.

## Decided (append-only: date, decision, why)

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
