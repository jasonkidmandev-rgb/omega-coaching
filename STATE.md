# STATE.md — verified state of this codebase

**Maintained by Saboor (development/execution owner).** This file records what has been
**measured**, not what is planned or believed. Every claim below says how it was checked
and when, so it can be re-checked rather than trusted.

**Why this file exists:** planning documents describe intent; they drift from the code and
nobody notices. A worked example from this repo — the root `CLAUDE.md` stated the typecheck
baseline was `743` when it had already been lowered twice and was `723`. Not anyone's fault;
copied numbers rot. So: **the code and the database are the source of truth, this file
records what they actually said, and anything here that isn't dated + evidenced should be
treated as unverified.**

Relationship to `workspace/`: that folder is Farjad + Saboor coordination (milestones, plans,
logs). This file is the measured baseline underneath it. When they disagree, re-measure.

> ⚠️ **`docs/` is gitignored** (see `.gitignore`). The long-form audits referenced below live
> only on Saboor's machine and do **not** travel with the repo. Anything that must survive is
> summarised here.

---

## How to verify anything (and what each check does NOT prove)

| Check | Command | Proves | Does **not** prove |
|---|---|---|---|
| Types | `node scripts/typecheck-ratchet.mjs` | No new type errors vs `tsc-error-baseline.txt` | Anything inside a string — SQL, URLs, template literals |
| Build | `npx vite build` | It compiles and chunks | Any runtime behaviour |
| Unit tests | `npx vitest run` | Pure logic still behaves | Almost nothing DB- or HTTP-shaped; the harness has no database |
| Integration | `pnpm testdb:up && pnpm test:integration` | Real queries against a real MySQL | Only covers the few files named `*.integration.test.ts` |
| Live schema | read-only query against the Railway DB | Ground truth for column names | — |

✅ **Running the app locally is now safe (fixed 2026-07-29).** It previously was not: `APP_ENV`
defaulted to `'production'`, and with a committed `.env` pointing `DATABASE_URL` at the live
Railway DB and `SMTP_HOST` at a real sender, `pnpm dev` started ~20 cron jobs against production
with a working mailer — check-in dispatch every 5 min, low-score alerts every 15, payment
reminders, a startup check-in scan. Nobody had to do anything wrong.

`server/_core/appEnv.ts` now **derives** the environment instead of assuming it:

| Environment | Resolves to | Side effects |
|---|---|---|
| Railway (`pnpm start` sets `NODE_ENV=production`) | `production` | **active** — unchanged |
| Staging (`APP_ENV=staging`) | `staging` | suppressed — unchanged |
| `pnpm dev`, vitest, or nothing set | **`local`** | **suppressed** |
| `ALLOW_LOCAL_SIDE_EFFECTS=true` | `local` | active — opt-in, logged loudly |

"Suppressed" means the same seal staging already had, via the same choke point (`isStaging()` →
`sideEffectsDisabled()`, 6 call sites): no cron jobs, no outbound email, no IMAP reply polling,
Stripe forced to test mode. The server prints its mode at startup, so what it can reach is never
a guess.

The truth table above was verified against all 8 env combinations before shipping; production
resolving to `production` rests on `railway.toml` running `pnpm run start`, which sets
`NODE_ENV=production` explicitly.

⚠️ Still true: **`.env` targets the production database.** The seal stops writes that *reach a
person*, not reads. Before enabling `ALLOW_LOCAL_SIDE_EFFECTS`, point `DATABASE_URL` at the
Docker test DB (`pnpm testdb:up`).

---

## Measured facts

### Type checking — verified 2026-07-29
- Baseline is whatever `tsc-error-baseline.txt` says. **Read the file; do not trust a number
  quoted elsewhere.** It was 743, then 725, and is **723** as of `7851dd8`.
- The ratchet (`.github/workflows/typecheck.yml`) is the **only** CI gate. It blocks
  *increases* only.
- ⚠️ A parse error makes `tsc` bail early and report *fewer* errors. A sudden large drop is a
  red flag, not a win — that happened on 2026-07-29 (725 → "2") from a stray backtick inside a
  template literal.

### Test suite — verified 2026-07-29, three consecutive runs
- **1661 tests / 123 files, all passing, stable.**
- `*.integration.test.ts` (DB-backed) and `*.probe.test.ts` (live third-party APIs) are
  excluded from the default run by `vitest.config.ts`.
- **Green does not mean covered.** `inbox.test.ts` called `getInboxConversations()` and
  asserted the result was an array — that function opens `if (!db) return []`, so with no DB it
  returned `[]` before reaching its SQL and **passed for the entire time the admin inbox was
  throwing in production**. Deleted, along with ~24 other tests that only asserted a name
  existed. Real behavioural coverage does not exist yet; that needs a DB-backed harness.

### Admin navigation architecture — changed 2026-07-29 (`5273297`, `a43fb6f`). **Do not regress this.**
`AdminLayout` is mounted **once, above** the admin router, in `client/src/App.tsx`:

```
Router()  ->  location.startsWith("/admin")  ->  <AdminRoutes/>
                 <Suspense fallback={<LoadingSpinner/>}>   // shell chunk, once per session
                   <AdminLayout>                            // persists across navigation
                     <Suspense fallback={<PageSkeleton/>}>  // page chunks, INSIDE the chrome
                       <Switch> …73 admin routes… <Route component={NotFound}/> </Switch>
```

Three rules that keep it working:
1. **Admin pages must NOT render `<AdminLayout>` themselves.** All 64 were stripped to bare
   fragments. Re-adding one renders a sidebar inside a sidebar.
2. **The page-chunk Suspense fallback must stay a content-area skeleton**, never the
   full-screen `LoadingSpinner` (`min-h-screen bg-slate-900`) — that just relocates the flash
   the fix removed.
3. **The `/admin` branch is chosen by a location check, not two `<Route>` entries.** Two
   routes (`/admin` and `/admin/:rest*`) make the Switch swap elements on the
   `/admin → /admin/clients` transition, remounting the shell and reintroducing the bug.

Before this, every admin click unmounted the whole shell and flashed a full-screen dark
spinner, because the only Suspense boundary was app-level and the layout lived inside each
lazy page.

### Identity / data model — ⚠️ live trap, verified 2026-07-29
Code says `people` / `personId`; the database still says `contacts` / `contactId`. Drizzle
bridges them via `personId: int("contactId")`.

**That alias applies ONLY to query-builder calls.** Inside a `` sql`` `` template MySQL sees the
literal text, so `personId` is an unknown column — even though the SQL sits in a `.ts` file.
This threw `Unknown column 'c2.personId'` on every admin-inbox call, so **chat appeared dead
while the messages were completely intact**. Fixed across 6 sites in `1e0c4eb`. Six more UPDATEs
in `contactsHelper.ts` sat in a log-only `try/catch`, so contact renames had been failing
**silently**.

Nothing automated catches this — types, ratchet, build and tests all pass on an opaque string.
Grep before shipping anything identity-adjacent:

```bash
grep -rn "personId" server/ --include=*.ts | grep -v "\.test\." \
  | grep -E "SELECT |FROM |WHERE |JOIN |GROUP BY|VALUES|COALESCE|SET " \
  | grep -vE "\$\{[^}]*personId[^}]*\}" | grep -vE "AS personId"
```

Alias rather than rename where downstream JS reads `.personId`: `SELECT contactId AS personId`.
~20 other columns share the trap (`lifecycleStage`→`lifecycle_stage`, `fullName`→`full_name`,
…), but some camelCase names genuinely *are* physical elsewhere (`payment_events.grossAmount`) —
check the specific table. **All of this disappears once `cutover/phase4-people-rename.sql` runs.**

### App URLs — changed 2026-07-29 (`7851dd8`)
`server/lib/appUrl.ts` is the only definition. Use `getAppBaseUrl()`, or
`getRequestBaseUrl(origin)` in request-scoped code. **Never write a domain literal.**
Previously ~70 copies of `process.env.VITE_APP_URL || 'https://peptidecoach.pro'` across 26
files, each in a client-facing link, all defaulting to the **old Manus site** — so a missing
`VITE_APP_URL` would silently mail clients back to the system being migrated away from.

---

## Open, verified problems

### ✅ Unauthenticated endpoints — all 6 closed 2026-07-29 (+3 write holes found alongside)
`publicProcedure` is bare `t.procedure`, no middleware; only a 3000-req/15-min IP limit sits in
front. Each took a **sequential integer ID** and returned real client data.

| Endpoint | Exposure | Status |
|---|---|---|
| `transformation.getIntakeForm` | Full health intake — DOB, address, medications, diagnoses, mental-health history, substance use, emergency contacts. **36 live forms in prod.** | ✅ staff \| owner \| token |
| `transformation.saveIntakeForm` | **Write.** Overwrite any client's intake | ✅ same gate |
| `transformation.submitIntakeForm` | **Write.** Submit any client's intake | ✅ same gate |
| `checkin.getForClient` | Any check-in by id (397 in prod) | ✅ token \| owner |
| `checkin.submit` | **Write.** Post responses onto any client's check-in | ✅ token \| owner |
| `transformation.completePaymentPublic` | Marked paid with no payment proof **and returned a 30-day `authToken` for any enrollment** | ✅ **deleted** — see below |
| `transformation.getEnrollmentPublic` | `SELECT *` + spread leaked the `authToken` magic-link column | ✅ requires the token, returns an explicit allow-list |
| `customOrders.capturePaymentPublic` | Marked an order **paid with no Stripe verification** | ✅ **deleted** |
| `refund.getByClient` | Refund history by id | ✅ `adminProcedure` (it had no caller at all) |

**The gate:** `authorizeEnrollmentAccess` (`transformationRouter.ts`) and
`authorizeCheckinAccess` (`checkinRouter.ts`). Both accept **staff role | signed-in owner |
token**, and both throw an *identical* error for "doesn't exist" and "not yours" so ids can't
be probed. Client accounts are role `'user'` — not in `STAFF_ROLES` — so the owner path is
required, not a nicety.

> **⚠️ The correction worth remembering.** `getEnrollmentPublic` was marked fixed earlier the
> same day, and that fix was **bypassable**. `completePaymentPublic` minted and *returned* a
> 30-day `authToken` for any `enrollmentId`, unauthenticated, with `paymentId` optional — so
> anyone could mint the very token the gate demanded. It also overwrote the enrollment's
> `email`/`clientName` from the request body, sending the verification email wherever the
> caller asked: account takeover, not just disclosure.
> **A token gate proves nothing until you check what can mint the token.**
> Its only caller in repo history was the unrouted `TransformationJourney.tsx` (deleted in
> `4a15cc3`), so it was removed rather than secured.

**How the token reaches clients:** `sessionStorage`, under the keys
`TransformationVerify.tsx` already wrote and nothing read — never the URL, because a URL-borne
token is written to browser history and sent to Stripe in the `Referer` header. Check-in emails
now carry `?token=<protocol accessToken>`; `createDirectEnrollment` returns one **only for
enrollments it creates**, never for one resumed by email (there, `email` is an unverified
claim, so a token would make knowing an address enough to read a medical file). Returning
clients must reopen from their email link — **a funnel change to confirm with Jason.**

**Verification status — read before trusting this row.**
Verified at runtime: real server, real MySQL (17-table harness), 14 HTTP cases — no token,
wrong token, cross-client token, expired token, non-existent id, plus the positive paths; the
DB was inspected afterwards to confirm rejected writes did not land and accepted ones did.
**Not verified:** the staff-session and signed-in-owner paths (need a real OAuth login) and
guest checkout through Stripe in a browser. Note that typecheck, the unit suite and the build
*all passed* on an intermediate state where the entire client intake funnel was broken — they
are not evidence for this area.

**`capturePaymentPublic` was deleted rather than secured.** Every Stripe `success_url` in the
codebase points at `/payment/success`; nothing linked to `/custom-order/:id/payment-success`.
So the endpoint that marked orders paid without verification had **no legitimate caller** — the
signed webhook `handleCustomOrderCompleted` is and was the real path. The orphaned page and
route went with it, along with the dead, unrouted `TransformationJourney.tsx` (2,706 lines).

### 🟡 Found while doing the above (2026-07-29)
- **Cancelling a custom-order payment landed on a 404.** Stripe was sent
  `cancel_url = /custom-order/payment-cancelled/<id>` but the route was
  `/custom-order/:id/payment-cancelled` — the two never matched. Both shapes now route.
- ~~**`AdminLayout` violates the rules of hooks.**~~ **RETRACTED 2026-07-30 — this was wrong.**
  I read `useLocation`/`useState`/`useMemo` as running after `AdminLayout`'s early returns.
  They don't: they belong to **`AdminLayoutContent`**, a *separate* component declared further
  down the same file. Hooks in a different component say nothing about this one's hook order.
  `AdminLayout` itself calls exactly four hooks (`useState` ×2, `useAuth`, `useEffect`, lines
  285-292) and every `return` comes after all of them, so the hook count is stable.
  Lesson: "hooks after an early return" has to be checked **within one function body**, not by
  scanning a file. The false finding blocked the two `window.location.href` conversions in that
  file for a day; both are now plain client-side navigations.

### 🟡 Smaller, confirmed
- **Sleep Quality renders `/5` but is stored 1–10** (slider and server both `max 10`). Four admin
  surfaces: `ClientEdit.tsx:2448,2542`, `Enrollments.tsx:1252,1360`.
- **`isDiscountable` is inert** — `0 !== false` is always true, so everything discounts. 123 of
  185 items and 10 of 18 categories are marked non-discountable and ignored (~$3,207 across 9
  clients). Deliberately mirrored in `server/lib/protocolTotal.ts` so the shown total matches
  the charged total. **Needs Jason's pricing decision, not a code fix.**
- **Coaching plan pricing is stale** — the checkout can still charge for retired plans and has
  no key for the current 6-Month Elite; the advertised loyalty/partner discounts have no
  implementation. **Blocked on whether this app keeps its coaching checkout at all now that
  omegalongevity.com is the funnel.**
- **`VITE_APP_URL` must be set on the Railway service** — unverified, needs Railway access.
- **`support@humanedge.health`** now appears on the custom-order payment screens; that mailbox
  or alias must exist or client mail bounces.

---

## Changelog of this file
- 2026-07-29 — created. Baseline recorded after the navigation fix, the raw-SQL/chat fix, the
  app-URL centralisation and the test cleanup.
