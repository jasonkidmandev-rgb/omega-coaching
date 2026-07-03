# Lisa — HumanEdge Change Requests

Running list of UX/feature changes requested by Lisa Kidman (client team) for
HumanEdge. Source: email. Append new items as they arrive.

---

## Open

### CR-1 — Continuous client Chat thread (not separated by protocol version) · **RESOLVED 2026-07-02 (code) — go-live SQL apply pending**
**Reported:** 2026-06-25 (Lisa, email)

> **Resolved 2026-07-02:** delivered via the identity-consolidation Phase 3. The
> chat data (`protocol_comments`) now carries the canonical `contactId`, and every
> chat surface operates on the whole contact thread:
> - **Read** (`comments.list` → `getProtocolComments`) returns the client's entire
>   thread across all protocol versions (falls back to per-protocol for orphaned
>   comments whose parent protocol was deleted).
> - **Write** (`comments.create` → `createProtocolComment`) stamps `contactId`, and
>   the **email reply bridge** writes through the same helper, so emailed replies
>   join the unified thread automatically.
> - **Read-state** (`markCommentsAsRead`) and **unread counts** span the thread.
> - The **coach inbox** now shows one conversation per client (grouped by
>   `contactId`), not one per protocol version.
> - The old **Client 360** chat view (the other per-protocol reader) was removed (S1).
>
> The `contactId` backfill is already applied on the Railway staging DB (616/637
> comments; the rest are orphans with a deleted parent protocol). Remaining: the
> same one-time SQL runs at the production Manus→Railway cutover (`phase3-chat-rekey.sql`).

> **Original design note (2026-06-30):** chat was keyed per protocol *version*, and
> the protocol→client link ran through overlapping/unreliable keys. We fixed identity
> first (canonical `contactId`), which made CR-1 a read-time grouping by contact.
> Full plan: `docs/design/2026-06-30-identity-consolidation.md`.

**Current behavior:** Client Chat is scoped to a protocol version. When a new
protocol version is created, a brand-new chat thread starts and the previous one
is effectively archived (only reachable from Client 360 under the previous
protocol). Chat is stored in `protocol_comments`, keyed by `clientProtocolId`.

**Desired (HumanEdge):** One continuous chat thread per client, spanning all
protocol versions — not reset or archived when a new protocol version is made.

**Likely technical scope (to verify in a design pass):**
- Re-key/aggregate chat at the **client (contact)** level instead of per
  `clientProtocolId`. Chat lives in `protocol_comments`.
- The email reply bridge (`server/emailReplyBridge.ts`) writes client replies as
  protocol comments per protocol — must resolve to the unified client thread.
- Both chat surfaces (client-facing chat + the Client 360 chat view) read
  per-protocol today; both would read the unified thread.
- Historical chat across existing protocol versions must be merged/shown together
  (a query that aggregates by client, and/or a one-time backfill).
- Lisa noted several links are associated with this — confirm all chat entry points.

**Effort:** Medium. Touches the chat data keying, the email reply bridge, and both
chat UIs. Needs a short design pass before implementation (esp. the
historical-merge approach).

### Batch reported 2026-06-27 (Lisa, email) — diagnosed

> Key context: HumanEdge runs the **same source** as peptidecoach.pro (Manus) on
> Railway, against a **stale DB snapshot** and its own build/runtime config. So a
> thing that works on Manus but breaks on HumanEdge is almost always an
> environment/data/config delta, not a code defect. That holds for 4 of these 5.

#### CR-2 — Master template "not pulling" · **NOT REPRODUCED (live DB verified OK) — pending Lisa**
- Update 2026-06-27 (queried the live DB): the Master Template (id=1, `isDefault`)
  exists with 196 items, and they **are** copied into client protocols — Lisa's
  current protocol **1740011** has all 196. The `/admin/clients/1740009` in her link
  is a **deleted** protocol (she "started over"), which is why it looked empty.
- Caveat: 13 of the 196 master-template items are **orphaned** (reference products
  missing from the stale snapshot) — could break the item list if the UI doesn't
  null-check.
- Next: Lisa to confirm on her **current** protocol (1740011). If items still don't
  render there → harden item rendering to skip orphaned products (code fix, no data
  edit). Otherwise → no bug (stale link).
- **Hardening applied 2026-07-02:** audited both render paths for orphaned-item
  safety. The **client** protocol view was already safe (optional-chaining + an
  "Other Items" bucket + `snapshotName`/`Unknown Item #id` fallbacks — no crash).
  The **admin** editor had no crash risk either (all lookups guarded), but it
  *silently dropped* orphaned items from its category grouping while the client
  surfaced them. Added the same "Other Items" bucket to `ClientEdit.tsx`'s
  `itemsByCategory` so a deleted-catalog item never vanishes from the editor
  (ProtocolsTab already renders each orphan with a `snapshotName` fallback). Ratchet
  clean (745). This closes the "items not showing" risk defensively; still pending
  Lisa's confirmation on 1740011 for the original report.

#### CR-3 — Protocol Section templates not loading (Periodization / Training Split / Program Guide) · **RESOLVED 2026-06-27**
- Diagnosis (queried live DB): the 16 `protocol_section_templates` rows existed but
  their `content` was empty (`{}`) — the JSON content was lost in the original
  snapshot migration. Confirmed Manus still had it.
- Fix: exported the real content from Manus and loaded it into the 15 empty rows in
  the staging DB (1 row was empty on Manus too). Sections now load.
- Made permanent by the cutover re-sync. **Done (staging DB patch).**

#### CR-4 — Address auto-complete not working · **CONFIG (not code) — key set by Jason 2026-07-03, 2 caveats to verify**
- Diagnosis: `AddressAutocomplete` uses `VITE_GOOGLE_PLACES_API_KEY`, a
  **build-time** Vite var baked into the client bundle at `vite build`, and loads
  Google Places. Two likely causes: (a) the var isn't set in Railway's **build**
  env (bundle ships with an empty key), and/or (b) the Google Cloud key's
  HTTP-referrer allowlist doesn't include `humanedge.health` (key was restricted
  to peptidecoach.pro).
- Fix (not code): set `VITE_GOOGLE_PLACES_API_KEY` in Railway's build env **and**
  add `humanedge.health` to the key's allowed referrers in Google Cloud Console.
  **Owner: ops (Jason).**
- **Update 2026-07-03:** Jason set `VITE_GOOGLE_PLACES_API_KEY` in Railway variables.
  Two things to confirm before this is closed:
  1. **Rebuild required.** `VITE_` vars are baked in at *build* time — the app must be
     **redeployed/rebuilt** after adding the variable, or the shipped bundle still has
     the old/empty key. Setting it on a running service alone does nothing.
  2. **Referrer allowlist.** The Google Cloud key must list `humanedge.health` (and any
     preview subdomains) under HTTP-referrer restrictions, or Places returns
     `RefererNotAllowedMapError` even with the key present.
  After a redeploy, verify on the live address field (autocomplete suggestions appear)
  and check the browser console for Google Maps referrer/key errors.

#### CR-5 — Timezone inconsistency across pages · **RESOLVED 2026-07-03 (code) — all stored-timestamp displays now Mountain Time**
- Diagnosis: `client/src/lib/timezone.ts` normalizes everything to America/Denver
  and is meant to be used everywhere, but many pages call raw
  `toLocaleString/toLocaleDateString` which render in the browser's local time →
  mixed zones. Present on Manus too; Lisa just noticed it. (Current count: 264 raw
  `toLocale*` occurrences across 64 files — but most are already-migrated helper
  calls or must-NOT-touch cases; see below.)
- **Key nuance (why this isn't a blind find/replace):** there are THREE receiver
  kinds, not two.
  1. **Timestamps** (`createdAt`, `sentAt`, `signedAt`, `submittedAt`, …) — stored
     UTC → **convert** to `toLocaleDateStringMT` / `toLocaleTimeStringMT`.
  2. **Civil dates** (`dateOfBirth`, month labels like `YYYY-MM`, chart weekday
     axes) — **must NOT convert**: they're bare dates, and UTC→Denver shifts them a
     day (e.g. a DOB would display one day early). Left as-is.
  3. **Numbers** (`amount.toLocaleString()`, fees, counts) — never touch.
- **Done 2026-07-03 (ratchet clean, 745):** converted every raw stored-timestamp
  display across admin + client-facing + shared components (~20 call sites, 10 files):
  `Prospects`, `Enrollments` (email tracking + overdue alerts + intake submitted),
  `PackingSlips`, `PackingSlipDetail`, `CoachingSessions`, `EmailTemplatePreview`,
  client `Protocol` (phase-start), `DetailsTab` (phase-start), `ProjectDetail`
  (activity feed). These also fixed a latent bug where `new Date("YYYY-MM-DD HH:MM:SS")`
  (a bare MySQL string) was being parsed as *browser-local* time; the MT helper treats
  it as UTC first. **Verified** by an exhaustive sweep (`new Date(...).toLocale*`,
  `.toLocaleDateString(` / `.toLocaleTimeString(`, bare `.toLocaleString()`): every
  remaining raw call is an intentional leave (below). Most of the app was already on
  the MT helpers; these were the stragglers.
- **Deliberately left (correct as-is):** DOB fields (ClientEdit, Enrollments,
  IntakeFormPdfExport) and month/weekday chart labels (ConversionTracking, Dashboard)
  — **civil dates**; UTC→Denver would shift them a day. `new Date()` print-footer /
  "generated on" / today-header stamps (PackingSlips, PackingSlipDetail,
  FulfillmentQueue, Inventory, MyActionItems, MorningBriefing). Already-explicit
  America/Denver (IntakeFormWizard signature dates, JobHealth). The calendar UI
  primitive (`ui/calendar.tsx`). All number `.toLocaleString()` (prices/fees/counts —
  WebTrafficAnalytics, PromoCodes, TransformationPayments, Home marketing stats, etc.).

#### CR-6 — Remove admin "Client Corner" page · **RESOLVED 2026-06-27 (commit b665f7c)**
- Removed the admin route + nav item + dashboard component. The client-facing
  `/client-corner` (used by clients) is untouched.

---

## Resolved
*(none recorded here yet)*
