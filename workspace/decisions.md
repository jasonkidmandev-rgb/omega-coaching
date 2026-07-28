# Decisions log (technical / coordination only)

Append-only. Keep each entry short: date, decision, why. As hygiene, keep compensation
and business strategy out of the code repo; technical and coordination decisions go here.

- 2026-07-29, Both devs push straight to `main`, `pull --rebase` before push. Why:
  Railway auto-deploys main for prod testing; branches would hide work from the deployed
  test site until merge.
- 2026-07-29, Farjad owns DB / schema migrations. Why: avoid two conflicting migrations
  reaching prod.
- 2026-07-29, Weekly work billed as separate orders, one per milestone/week. Why:
  predictable payments plus a review per completed order.
- 2026-07-29, v1 launch scope kept general (outcome-based), net-new builds deferred to
  v2. Why: room to fold in what we find while protecting the launch date.
