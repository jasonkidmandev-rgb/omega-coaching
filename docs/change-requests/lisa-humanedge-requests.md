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

---

## Resolved
*(none recorded here yet)*
