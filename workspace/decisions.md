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
- 2026-07-29, Client-facing endpoints authorize as **staff role | signed-in owner | token**,
  and return an identical error for "doesn't exist" and "not yours". Helpers:
  `authorizeEnrollmentAccess`, `authorizeCheckinAccess`. Why: `publicProcedure` is bare
  `t.procedure`, so a sequential integer id was the only thing standing between the internet
  and 36 clients' medical intakes. Client accounts are role `'user'`, so a staff-only check
  would lock clients out of their own records — the owner path is required, not optional.
- 2026-07-29, Access tokens live in `sessionStorage`, never in a URL. Why: the intake token
  opens a full medical history; a URL-borne one is written to browser history and sent to
  Stripe in the `Referer` header. sessionStorage is per-tab and dies with the tab, which
  matches the life of the checkout flow.
- 2026-07-29, `createDirectEnrollment` returns an access token **only for enrollments it
  creates**, never for one resumed by email. Why: on the resume branch `email` is an
  unverified claim, so returning a token would mean knowing a client's email address is
  enough to read their medical intake. Cost: returning clients must reopen from their email
  link rather than resuming in-browser. **Flag to Jason before launch.**
- 2026-07-29, A token gate is only as strong as the mint. Before trusting one, grep for
  anything that returns `authToken`/`accessToken` to its caller. Why: `completePaymentPublic`
  minted and returned a 30-day token for any enrollment id, unauthenticated — which silently
  defeated the token gate already shipped on `getEnrollmentPublic`.
- 2026-07-29, `server/lib/appUrl.ts` is the only place the app's base URL is defined; never
  write a domain literal. Why: ~70 duplicated fallbacks all named the **old Manus site**, so
  a missing `VITE_APP_URL` would silently mail clients back to peptidecoach.pro instead of
  failing loudly.
- 2026-07-29, Delete tests whose assertions are only "this name exists" / "this is a
  function". Why: they can't fail for any reason involving behaviour, they cost a full
  router-graph import each (the 5s timeouts that made the failure count swing 8-20 between
  runs), and `inbox.test.ts` passed green throughout a live chat outage — advertising
  coverage that didn't exist. Behavioural coverage needs a DB-backed harness (v2).
- 2026-07-29, `sideEffectsDisabled()` in `server/_core/appEnv.ts` is the single gate for
  anything that reaches a real person (crons, email, IMAP, live Stripe). Gate new work with
  it rather than a bare `NODE_ENV` check. Why: the environment is now derived, not assumed —
  `APP_ENV` defaulted to `'production'`, so `pnpm dev` ran ~20 crons against the production
  DB with a live mailer. One choke point means the next cron inherits the seal for free.
  (Supersedes the earlier "don't run the app locally" decision — you can run it again.)
- 2026-07-29, Both devs push straight to `main`, `pull --rebase` before push. Why:
  Railway auto-deploys main for prod testing; branches would hide work from the deployed
  test site until merge.
- 2026-07-29, Farjad owns DB / schema migrations. Why: avoid two conflicting migrations
  reaching prod.
- 2026-07-29, Weekly work billed as separate orders, one per milestone/week. Why:
  predictable payments plus a review per completed order.
- 2026-07-29, v1 launch scope kept general to Jason, milestones specific internally. Why:
  room to fold in what we find while protecting the launch date.
