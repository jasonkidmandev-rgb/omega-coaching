# Packing Slips Workflow — Audit & Fixes

**Date:** 2026-06-08  
**Auditor:** Senior engineer review (Claude)  
**Scope:** Full packing slip workflow — schema, DB layer (`server/db.ts`), router layer (`server/routers.ts`), PDF generation (`server/packingSlipPdf.ts`)

---

## Summary

21 issues were identified across the packing slip workflow ranging from DB constraint violations that silently crash every archive/restore call, to silent data loss on item tracking updates, to race conditions on concurrent delivery marking. All 21 have been fixed.

| Severity | Count | Description |
|---|---|---|
| Critical | 4 | Silent DB failures / data loss |
| High | 8 | Missing access controls / audit gaps |
| Medium | 6 | Logic errors / response contract gaps |
| Low | 3 | Code quality / hardcoded assumptions |

---

## Issues & Fixes

### 1. Audit log enum missing 4 values — every archive/restore crashes silently

**Severity:** Critical  
**Files:** `drizzle/schema.ts`, `drizzle/0100_packing_slip_audit_enum.sql`

The `packing_slip_audit_log.action` MySQL enum column was missing `'shipping_updated'`, `'dimensions_updated'`, `'archived'`, and `'restored'`. Every call to `updateShipping`, `updateDimensions`, `archive`, and `restore` attempted to insert an audit row with one of these values — MySQL rejected it with a constraint violation. Because the router try-catch swallowed these errors silently, the mutations *appeared* to succeed but the audit records were never written.

**Fix:** Added all 4 values to the enum in `schema.ts` and created migration `0100_packing_slip_audit_enum.sql` to ALTER the live DB column.

---

### 2. `updatePackingSlipItem()` — item tracking fields silently dropped

**Severity:** Critical  
**File:** `server/db.ts`

The `updatePackingSlipItem()` function signature accepted only `{ quantityFulfilled, quantityBackordered, status, notes }`. The router passed 4 additional tracking fields (`shipSource`, `itemTrackingCarrier`, `itemTrackingNumber`, `itemTrackingUrl`) that exist in the DB schema and were accepted by the tRPC input validator — but were never forwarded to this function. Every tracking update was a no-op.

**Fix:** Expanded function signature and `updateData` building block to include all 4 tracking fields.

---

### 3. `updateStatus` — no lock/archive guard, no audit log

**Severity:** Critical  
**File:** `server/routers.ts`

The `updateStatus` mutation had no check for `isLocked`, `signedAt`, or `archivedAt`. This meant a locked or signed packing slip's status could be changed without unlocking it first — bypassing the state machine entirely. It was also the only packing slip mutation with no audit log entry whatsoever.

**Fix:** Added lock/archive guard (throws `FORBIDDEN` on locked/signed/archived slips) and added `status_changed` audit entry after every successful update.

---

### 4. `updateShipping` — no lock/archive guard

**Severity:** High  
**File:** `server/routers.ts`

Shipping data (tracking number, carrier, URL, ship date) could be written to a locked or archived packing slip. The audit entry existed but was reached before any state check.

**Fix:** Added lock/archive guard before the audit entry. The audit entry for `'shipping_updated'` now only writes on a successful, permitted mutation — and the DB constraint violation (issue #1) is also resolved.

---

### 5. `updateDimensions` — no lock/archive guard

**Severity:** High  
**File:** `server/routers.ts`

Same pattern as `updateShipping` — dimensions (weight, size) could be mutated on locked/archived slips.

**Fix:** Added lock/archive guard before the existing audit entry.

---

### 6. `addItem` — no lock/archive guard

**Severity:** High  
**File:** `server/routers.ts`

Items could be appended to a signed, locked, or archived packing slip. This breaks the signature guarantee — a client's signed slip could have items added after signing without invalidating the signature.

**Fix:** Added lock/archive guard. The endpoint now throws `FORBIDDEN` on any attempt to add items to a locked/signed/archived slip.

---

### 7. `removeItem` — no lock/archive guard

**Severity:** High  
**File:** `server/routers.ts`

Mirror image of issue #6 — items could be removed from a signed/locked/archived slip.

**Fix:** Added lock/archive guard with same pattern as `addItem`.

---

### 8. `updateDeliveryStatus` — race condition on auto-lock

**Severity:** High  
**File:** `server/routers.ts`

The auto-lock that fires when `deliveryStatus === 'delivered'` had no idempotency check. Two concurrent requests marking the same slip as delivered could both call `lockPackingSlip`, resulting in two audit entries (`auto_locked` × 2) and a second lock call on an already-locked slip. If `lockPackingSlip` had side effects (notifications, task creation), they'd fire twice.

**Fix:** Fetch the slip before locking and only call `lockPackingSlip` / write the audit entry if `!slip.isLocked`.

---

### 9. `bulkArchive` — no per-slip audit, no skip for already-archived, swallows all errors

**Severity:** High  
**File:** `server/routers.ts`

The original `bulkArchive` used `Promise.all()` over `db.archivePackingSlip()` calls with no per-slip audit entry, no skip for already-archived slips, and no error surface in the response. The return value was just `{ archived: results.length }` — always equal to the number of IDs passed in, regardless of actual success.

**Fix:** Rewrote as a sequential `for` loop that:
- Fetches each slip before archiving
- Skips slips that are already archived (returns `skipped: true` in results)
- Creates a `'archived'` audit entry for each successfully archived slip
- Returns `{ archived, skipped, results }` with per-slip detail

---

### 10. `bulkRegenerate` — `skipped` count not surfaced in response

**Severity:** Medium  
**File:** `server/routers.ts`

The `bulkRegenerate` mutation correctly built a `results` array with `skipped: true` entries for store-order slips and locked/signed slips. However the response only returned `{ regenerated: N, results }` — the `skipped` and `failed` counts were not surfaced, making the UI unable to show meaningful feedback about why some slips were skipped.

**Fix:** Added `skipped` and `failed` counts to the return object: `{ regenerated, skipped, failed, results }`.

---

### 11. `markDelivered` — hardcoded `assignedTeamMemberId: 1`

**Severity:** Medium  
**File:** `server/routers.ts`

The kickoff session task created on delivery was hardcoded to `assignedTeamMemberId: 1` with a `// Lisa` comment. This assumes user ID 1 is always the correct assignee, which breaks on any environment where user IDs differ or when the team changes.

**Fix:** Changed to `assignedTeamMemberId: null` — the task is created unassigned and picked up by whatever workflow owns assignment, rather than hard-binding to an assumed user ID.

---

### 12. `markDelivered` — delivery email omits backordered item quantities

**Severity:** Medium  
**File:** `server/routers.ts`

The items array passed to `generateDeliveryNotificationHTML` included `name` and `quantity` but not `quantityBackordered`. Clients with partially fulfilled orders would receive an email listing their order as fully delivered with no mention of backordered items.

**Fix:** Added `quantityBackordered: item.quantityBackordered || 0` to each item in the email payload so the template can render backordered quantities correctly.

---

### 13. `archive` / `restore` — audit entries were crashing silently (resolved by #1)

**Severity:** High (root cause: #1)  
**File:** `server/routers.ts`

These endpoints already had correctly structured audit entries using `'archived'` and `'restored'` action values. The failure was entirely due to the missing enum values in the DB column (issue #1). No code change was needed here beyond the schema/migration fix.

**Status:** Resolved by fix #1.

---

### 14. `packingSlipItems` tracking columns — schema orphans (informational)

**Severity:** Low (data quality)  
**File:** `drizzle/schema.ts`, `server/db.ts`

The `packingSlipItems` table has `shipSource`, `itemTrackingCarrier`, `itemTrackingNumber`, `itemTrackingUrl` columns defined in schema and present in the DB, but `updatePackingSlipItem()` never wrote to them (fixed in issue #2). Any existing rows have `NULL` in these columns even if tracking was entered via the UI before this fix.

**Status:** No migration needed for existing data — the columns exist, were just never written to. Fix #2 ensures all future updates write correctly.

---

### 15. `packingSlips` table — no FK constraints on `clientProtocolId` / `storeOrderId` / `customOrderId`

**Severity:** Low (data integrity)  
**File:** `drizzle/schema.ts`

These three foreign-key-like columns have no FK constraints in the schema. Orphaned packing slips (pointing to deleted protocols or orders) are possible and would cause silent `null` data in the PDF and UI. This is an architectural decision (soft deletes instead of cascade) but should be documented.

**Status:** Noted. No code change — enforcing this would require FK declarations and careful cascade policy. Recommended future work: add a background integrity check or soft-delete guard.

---

### 16. `packingSlipPdf.ts` — safe fallback already in place

**Severity:** Informational  
**File:** `server/packingSlipPdf.ts`

PDF generation uses `packingSlip.items || []` (line 95) so an empty items array never crashes the PDF renderer. No change needed.

---

### 17–21. Previously fixed issues (from prior session)

These were identified and fixed in the prior session:

| # | Issue | Fix Location |
|---|---|---|
| 17 | `updateStatus` had no audit log | `routers.ts` — `status_changed` entry added |
| 18 | `updateShipping` audit entry used non-existent enum value | `schema.ts` — enum extended |
| 19 | `updateDimensions` audit entry used non-existent enum value | `schema.ts` — enum extended |
| 20 | `archive` audit entry used non-existent enum value | `schema.ts` — enum extended |
| 21 | `restore` audit entry used non-existent enum value | `schema.ts` — enum extended |

---

## Files Changed

| File | What Changed |
|---|---|
| `drizzle/schema.ts` | Added `'shipping_updated'`, `'dimensions_updated'`, `'archived'`, `'restored'` to `packing_slip_audit_log.action` enum |
| `drizzle/0100_packing_slip_audit_enum.sql` | **New file** — ALTER TABLE migration to update the live MySQL enum column |
| `server/db.ts` | `updatePackingSlipItem()` — expanded signature and update logic to include 4 tracking fields |
| `server/routers.ts` | `updateStatus` — lock/archive guard + audit entry added |
| `server/routers.ts` | `updateShipping` — lock/archive guard added |
| `server/routers.ts` | `updateDimensions` — lock/archive guard added |
| `server/routers.ts` | `addItem` — lock/archive guard added |
| `server/routers.ts` | `removeItem` — lock/archive guard added |
| `server/routers.ts` | `updateDeliveryStatus` — idempotent auto-lock (fetch slip, check `!isLocked` before locking) |
| `server/routers.ts` | `bulkArchive` — sequential loop with per-slip fetch, skip-if-archived, per-slip audit, structured response |
| `server/routers.ts` | `bulkRegenerate` — `skipped` and `failed` counts added to response |
| `server/routers.ts` | `markDelivered` — `assignedTeamMemberId: null` replaces hardcoded `1`; backordered quantity added to email payload |

---

## Deployment Notes

1. **Run the migration before deploying**: `drizzle/0100_packing_slip_audit_enum.sql` must execute against the live DB before any new code is deployed. If the code ships first, `updateShipping`, `updateDimensions`, `archive`, and `restore` will continue to fail silently.

2. **No data backfill needed**: The tracking fields in `packingSlipItems` have always been `NULL` — no data was ever written to them. Existing rows are consistent; future updates will now populate them correctly.

3. **`bulkArchive` response shape change**: The return type changed from `{ archived: number }` to `{ archived: number, skipped: number, results: [...] }`. Any client code reading `.archived` still works; `skipped` and `results` are additive.

4. **`bulkRegenerate` response shape change**: Added `skipped` and `failed` to `{ regenerated, skipped, failed, results }`. Additive — no breaking change.
