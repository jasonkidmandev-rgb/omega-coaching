# Decisions log (technical / coordination only)

As hygiene, keep compensation and business strategy out of the code repo; technical and
coordination decisions go here. When an open decision is made, move it down to "Decided"
with the date and the reason.

## Open / to decide
- Keep or drop each of: Notification Analysis, Notification History, Job Health,
  Team Email Preferences, KPI Dashboard.
- Site Settings: review and decide what stays (keep it simple).
- Email preview: link it to Email Branding, or remove it.
- Milestone placement to confirm: client-facing check-in consolidation (M3 vs v2),
  progress photos (M3 vs v2), client dashboard overhaul (v2 vs a small M3 trim),
  Lisa project tasks (M3 vs v2).
- Data migration approach: full history at go-live vs backfill afterward (the ~1 week track).

## Decided (append-only: date, decision, why)
- 2026-07-29, `server/lib/appUrl.ts` is the only place the app's base URL is defined; never
  write a domain literal. Why: ~70 duplicated fallbacks all named the **old Manus site**, so
  a missing `VITE_APP_URL` would silently mail clients back to peptidecoach.pro instead of
  failing loudly.
- 2026-07-29, Delete tests whose assertions are only "this name exists" / "this is a
  function". Why: they can't fail for any reason involving behaviour, they cost a full
  router-graph import each (the 5s timeouts that made the failure count swing 8-20 between
  runs), and `inbox.test.ts` passed green throughout a live chat outage — advertising
  coverage that didn't exist. Behavioural coverage needs a DB-backed harness (v2).
- 2026-07-29, Don't run the app locally; verify with typecheck + build + unit tests, and do
  runtime checks on the Railway deploy. Why: `.env` targets the prod DB with a live mailer
  and crons start unconditionally. Revisit once cron init is env-gated.
- 2026-07-29, Both devs push straight to `main`, `pull --rebase` before push. Why:
  Railway auto-deploys main for prod testing; branches would hide work from the deployed
  test site until merge.
- 2026-07-29, Farjad owns DB / schema migrations. Why: avoid two conflicting migrations
  reaching prod.
- 2026-07-29, Weekly work billed as separate orders, one per milestone/week. Why:
  predictable payments plus a review per completed order.
- 2026-07-29, v1 launch scope kept general to Jason, milestones specific internally. Why:
  room to fold in what we find while protecting the launch date.
