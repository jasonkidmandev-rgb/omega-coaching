# Lisa — HumanEdge Change Requests

Running list of UX/feature changes requested by Lisa Kidman (client team) for
HumanEdge. Source: email. Append new items as they arrive.

---

## Open

### CR-1 — Continuous client Chat thread (not separated by protocol version)
**Reported:** 2026-06-25 (Lisa, email) · **Status:** Open — backlog (not started)

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

#### CR-3 — Protocol Section templates not loading (Periodization / Training Split / Program Guide) · **RESOLVED 2026-06-27**
- Diagnosis (queried live DB): the 16 `protocol_section_templates` rows existed but
  their `content` was empty (`{}`) — the JSON content was lost in the original
  snapshot migration. Confirmed Manus still had it.
- Fix: exported the real content from Manus and loaded it into the 15 empty rows in
  the staging DB (1 row was empty on Manus too). Sections now load.
- Made permanent by the cutover re-sync. **Done (staging DB patch).**

#### CR-4 — Address auto-complete not working · **CONFIG (not code)**
- Diagnosis: `AddressAutocomplete` uses `VITE_GOOGLE_PLACES_API_KEY`, a
  **build-time** Vite var baked into the client bundle at `vite build`, and loads
  Google Places. Two likely causes: (a) the var isn't set in Railway's **build**
  env (bundle ships with an empty key), and/or (b) the Google Cloud key's
  HTTP-referrer allowlist doesn't include `humanedge.health` (key was restricted
  to peptidecoach.pro).
- Fix (not code): set `VITE_GOOGLE_PLACES_API_KEY` in Railway's build env **and**
  add `humanedge.health` to the key's allowed referrers in Google Cloud Console.
  **Owner: ops (Jason).**

#### CR-5 — Timezone inconsistency across pages · **CODE (pre-existing, not migration-specific)**
- Diagnosis: `client/src/lib/timezone.ts` normalizes everything to America/Denver
  and is meant to be used everywhere, but many admin pages call raw
  `toLocaleString/toLocaleDateString` (~93 raw occurrences across ~30 files; a
  subset are dates) which render in the browser's local time → mixed zones.
  Present on Manus too; Lisa just noticed it.
- Fix (code): replace raw **date** `toLocale*` calls with the timezone helpers.
  Medium effort (must separate date vs number usages); needs a visual/runtime check.

#### CR-6 — Remove admin "Client Corner" page · **RESOLVED 2026-06-27 (commit b665f7c)**
- Removed the admin route + nav item + dashboard component. The client-facing
  `/client-corner` (used by clients) is untouched.

---

## Resolved
*(none recorded here yet)*
