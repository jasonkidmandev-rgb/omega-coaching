# Investigation Audit — 4 Pending Pages

Conducted: 2026-06-07

---

## 1. Operations — `/admin/operations`

**File:** `client/src/pages/admin/projects/OperationsDashboard.tsx`

**What it is:**
A kanban-style project overview dashboard. Shows all client projects grouped by lifecycle stage in a drag-and-drop pipeline view. Also has tabs for Team Workload, Urgent Items, Calendar (deadline view), and Notifications.

**Is it the same as Client Projects?**
No — it is a *different view of the same data*. Client Projects is the list view; Operations is the pipeline/kanban view. Both read from `trpc.clientProject.list`, `trpc.lifecycleStage.list`, and `trpc.teamMember.list`. No unique endpoints.

**Dependencies:**
- Only reads data — no writes of its own
- Uses existing `clientProject.update` for drag-and-drop stage changes
- No other page links to it; it's entry-point only from the sidebar

**Verdict: SAFE TO REMOVE**
The kanban pipeline view in Operations overlaps heavily with the Lead Pipeline view (a separate feature). The underlying data is managed through Client Projects. Removing this sidebar entry and route eliminates a redundant view with no data loss.

**Action:** Remove route + sidebar entry + delete file. Keep `clientProject`, `lifecycleStage`, `teamMember` routers (used by Client Projects list page).

---

## 2. Data Quality — `/admin/data-quality`

**File:** `client/src/pages/admin/DataQuality.tsx`

**What it is:**
A contact data health dashboard. Shows how many contacts are missing email, missing phone, or missing both. Also shows "stale contacts" (no activity in 90 days) and legacy unlinked records. Each entry has a "Fix" button that navigates to `/admin/contact-admin`.

**Backend dependency:**
Calls `trpc.client360.dataQuality.useQuery()` — part of the `client360Router` on the server, which was intentionally kept when we removed the Client 360 page (because DataQuality and ContactAdmin still used it).

**Is it useful?**
It's a read-only diagnostic — it doesn't fix anything itself, it just points to Contact Admin. The real action lives in Contact Admin. The "unlinked records (legacy)" section shows leftover data from before the unified contacts system — this is historical noise.

**Verdict: SAFE TO REMOVE**
The "fix" action it surfaces is already accessible directly from Contact Admin. This is a bandaid dashboard that was built to surface issues that are better prevented at data entry (already tracked under the Data Integrity Audit task). Removing it does not lose any data and does not break any other page. The `client360.dataQuality` endpoint on the server can stay (it's small and harmless) or be cleaned up separately.

**Action:** Remove route + sidebar entry + delete file. Server endpoint stays for now — revisit during Data Integrity Audit cleanup.

---

## 3. Audit Logs — `/admin/audit-logs`

**File:** `client/src/pages/admin/AuditLogs.tsx`

**What it is:**
A security/compliance log viewer. Shows role changes, admin invitations sent/accepted/revoked, and user creation events — with timestamps, user emails, and details. Filter by action type.

**Backend dependency:**
- **Frontend page** calls `trpc.auditLog.list` to display events
- **`server/audit.ts`** is the logging engine — it writes to the `audit_logs` table and is called from multiple server files:
  - `server/routers.ts` — calls `logRoleChange`, `logAuditEvent`, `getRecentAuditLogs` for role changes and admin actions
  - `server/client/bulkProfileReminderRouter.ts` — calls audit functions

**Key distinction:**
The *logging system* (`audit.ts` + DB writes) is completely separate from the *viewer page* (`AuditLogs.tsx`). The page is just a UI window into logs that are already being written.

**Verdict: KEEP — DO NOT REMOVE**
This is a compliance/security feature. The logs track admin role changes and invitation flows — the kind of thing you'd want a record of if something goes wrong (unauthorized access, accidental role promotion, etc.). The page is the only way for the admin to review these events. Removing it doesn't break anything, but it eliminates security visibility for no good reason. Low cost to keep.

**Action:** No change. Leave in sidebar and codebase.

---

## 4. Launchpad Settings — `/admin/launchpad-settings`

**File:** `client/src/pages/admin/LaunchpadSettings.tsx`

**What it is:**
Admin interface to manage the Launchpad Hub — edit item names, descriptions, tooltips, link URLs, and embedded videos (Loom/YouTube/Vimeo) for each section of the client-facing Launchpad page.

**How deep does Launchpad go?**

The Launchpad is a *client onboarding entry point*, not just a settings page. The full scope:

| Component | Path | Description |
|-----------|------|-------------|
| Client hub page | `/launchpad` | `LaunchpadHub.tsx` — marketing/entry page for new clients. Public + authenticated views. |
| Admin settings | `/admin/launchpad-settings` | Edits descriptions and videos for hub items |
| Router | `launchpadRouter` in `routers.ts` | Full CRUD: items, videos, list, get by key/id |
| Email links | `server/routers.ts` lines 1160, 1251, 2084, 2168 | `/launchpad` URL embedded in welcome emails, signup confirmations, payment confirmations |
| DB tables | `launchpad_items`, `launchpad_item_videos` | Stores hub item config |

**The `/launchpad` URL is the entry point referenced in outgoing client emails.** New clients clicking links in their welcome/onboarding email land here. Removing the Launchpad would break those email links.

**Verdict: KEEP — DO NOT REMOVE (either page)**
The Launchpad Settings page is the only admin-facing control panel for client-facing hub content. The hub itself is live and linked from emails. If the concept is ever retired, it requires:
1. Updating all email templates to remove `/launchpad` links
2. Deciding what replaces it as the client entry point
3. Removing hub page, router, and DB tables together

This is a scoped project, not a quick removal.

**Action:** No change. Leave both `/launchpad` and `/admin/launchpad-settings` in place. Flag as "evaluate Launchpad retirement" as a separate initiative if desired.

---

## Summary

| Page | Verdict | Action |
|------|---------|--------|
| Operations Dashboard | ✅ Safe to remove | Remove route + sidebar + file |
| Data Quality | ✅ Safe to remove | Remove route + sidebar + file |
| Audit Logs | 🔴 Keep | Retain — security/compliance visibility |
| Launchpad Settings | 🔴 Keep | Retain — entry point for client onboarding emails |
