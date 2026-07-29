# Farjad, daily log

Only Farjad edits this. Newest entry at top. Feeds the Fiverr delivery summary, the
report to Jason/Vilma, and the timesheet. Written as one natural list of the day's work
(planning/direction and build woven together).

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
