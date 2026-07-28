# Saboor, daily log

Only Saboor edits this. Newest entry at top. A short running list of what you worked on
each day, so Farjad and both Claude sessions can see progress.

## 2026-07-29
- **Fixed the whole-app re-render on every admin navigation** (`5273297`). Two causes, not
  one: the only Suspense boundary was App-level with a full-screen `bg-slate-900` fallback,
  and `AdminLayout` was rendered *inside* each of 64 pages instead of above the router — so
  every click unmounted the entire shell and flashed a dark screen. Hoisted the layout above
  the admin router and scoped the page-chunk boundary inside the chrome. Follow-ups:
  `85e72db` (my import-stripping regex ate a line break on 21 CRLF files) and `a43fb6f`
  (restored the 404 for unmatched `/admin/*`, which the nested Switch had dropped).
- **Found and fixed why admin chat showed nothing** (`1e0c4eb`). Raw `sql`` ` templates
  still used the code-only `personId`; MySQL threw `Unknown column 'c2.personId'` on every
  inbox call. Six sites. `contactsHelper`'s six UPDATEs sit in a log-only try/catch, so
  contact renames had been failing **silently**. Messages themselves were never affected.
- **Centralised the app URL and removed the old domain** (`7851dd8`). ~70 copies of
  `VITE_APP_URL || 'https://peptidecoach.pro'` -> `server/lib/appUrl.ts`. Also fixed the
  non-fallback ones: the admin email template **hotlinked its logo from peptidecoach.pro**,
  plus footer/brand links and the install instructions.
- **Test suite: 9 failing -> 0, stable across three runs.** Deleted 5 files + 14 tests whose
  every assertion was "this name exists"; moved 3 DB-dependent files to
  `*.integration.test.ts`. Kept `duplicate-prevention` and `coach-notes-email` — my first
  automated pass misclassified both as wiring-only and they hold real tests, so every
  deletion was confirmed by reading the file. Ratchet baseline 725 -> **723**.
- **Real bug surfaced by a failing test:** Stripe receipts said a bare "Payment" — the
  template's `paymentMethod` union omitted `'stripe'` while its callers default to it.
- **App review** -> `docs/risks/2026-07-28-launch-readiness-audit.md`. Headline: the four
  core workflows are in better shape than expected; the gap is **authorization**. Six
  `publicProcedure` endpoints take a sequential integer ID and return real client data —
  `getIntakeForm` exposes 36 clients' full health intake unauthenticated. Logged under
  section D in `current.md`.
- ⛔ Discovered `pnpm dev` starts ~20 crons against the **prod DB with a live mailer**. Ran
  it ~35s, killed it, confirmed via DB that nothing was sent. See the warning in
  `claude/context.md` — this blocks all local runtime verification until it's gated.
- Note: root `CLAUDE.md` said the ratchet baseline was 743; it was already lowered in
  `08dd789` and is **723** after today. Corrected in the file.
- Hours: ~
