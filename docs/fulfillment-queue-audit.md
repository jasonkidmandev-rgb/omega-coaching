# Fulfillment Queue — Audit Report

**Date:** 2026-06-08  
**Scope:** Full fulfillment queue workflow — `client/src/pages/admin/FulfillmentQueue.tsx`, `server/db.ts` (`getFulfillmentQueue`, `getBackorderedItems`, `recalculatePackingSlipTotals`, shipping helpers), `server/routers.ts` (`fulfillmentQueue.*`, `packingSlip.*`), `server/cron/backorderAndTrackingCron.ts`, `server/cron/archivedPackingSlipCleanup.ts`

---

## Summary

| Severity | Count |
|---|---|
| Critical | 3 |
| High | 5 |
| Medium | 4 |
| Low / Code Quality | 6 |
| UX / Accessibility | 10 |

---

## Critical

---

### C1. `getBackorderedItems` silently excludes items with `quantityBackordered > 0` but wrong status

**File:** `server/db.ts` — `getBackorderedItems()` (line ~9369)

`getBackorderedItems` filters exclusively on `packing_slip_items.status = 'backordered'`. However `getFulfillmentQueue` treats an item as backordered if **either** `status === 'backordered'` **or** `quantityBackordered > 0`. An item can be set to `status = 'partial'` with `quantityBackordered = 1` (e.g., partial fulfillment path) and will:

- Show up in the queue card's red "backordered" badge (correct — `getFulfillmentQueue` catches it)
- **Disappear from the Backorders tab entirely** (wrong — `getBackorderedItems` misses it)
- The Backorders tab badge on the tab trigger is also sourced from `queueData.totalBackordered` (queue-derived) while the tab _content_ is from `backorderData` (DB query), so the badge number and the list count can silently diverge

`backorderAndTrackingCron.ts` also uses `status = 'backordered' AND quantityBackordered > 0`, so it too will miss these items — meaning no reorder task is created for them.

**Fix:** Add `OR quantityBackordered > 0` to `getBackorderedItems`, or align all callers to use a single canonical definition of "backordered."

```ts
// db.ts — getBackorderedItems WHERE clause
.where(
  or(
    eq(packingSlipItems.status, "backordered"),
    gt(packingSlipItems.quantityBackordered, 0)
  )
)
```

---

### C2. `backorderAndTrackingCron` logs `backorder_task_created` even when no task was created

**File:** `server/cron/backorderAndTrackingCron.ts` (lines 172–189)

Task creation is gated on `clientProjectId` being non-null (line 104):

```ts
if (clientProjectId) {
  await db.createProjectTask({ ... assignedTeamMemberId: TEAM_KARI });
}
// automation_events logged regardless — inside the outer loop
await database.execute(sql`
  INSERT INTO automation_events ... 'backorder_task_created' ...
`);
```

Store orders, custom orders, and protocols that have no linked project (`clientProjectId = null`) will skip the task creation block entirely. The `automation_events` row is still written, marking the item as "handled." The deduplication check on line 74 (`NOT EXISTS ... backorder_task_created`) will then permanently block any future task creation attempt for that item — even if the project is later linked.

**Result:** Carrie never gets a reorder task for store-order backorders. The system believes it already handled them.

**Fix:** Only insert the `automation_events` row when a task was actually created, or use a separate `eventType` like `'backorder_detected_no_project'` for the no-project path.

---

### C3. N+1 query storm in `getFulfillmentQueue`

**File:** `server/db.ts` — `getFulfillmentQueue()` (line ~9290)

For N slips in the queue, this function fires:
- 1 query: fetch all matching packing slips  
- N queries: fetch items per slip (`packingSlipItems WHERE packingSlipId = ?`)  
- Up to N more queries: fetch shipping fallback from `clientProtocols` for each slip missing an address

With 30 slips in the queue: **up to 61 queries per load**, plus this runs on a 30-second refetch interval. As the queue grows the latency scales linearly.

**Fix:** Use a single JOIN query instead:

```ts
const slipsWithItems = await database
  .select()
  .from(packingSlips)
  .leftJoin(packingSlipItems, eq(packingSlipItems.packingSlipId, packingSlips.id))
  .leftJoin(clientProtocols, eq(clientProtocols.id, packingSlips.clientProtocolId))
  .where(and(
    isNull(packingSlips.archivedAt),
    or(
      eq(packingSlips.status, 'pending'),
      eq(packingSlips.status, 'in_progress'),
      eq(packingSlips.status, 'partial'),
    )
  ));
// then group rows by slip ID client-side
```

---

## High

---

### H1. `packingSlip.list` calls `getAllProtocolItems()` N times inside `.map()`

**File:** `server/routers.ts` — `packingSlip.list` (line ~5523)

The mismatch check calls `db.getAllProtocolItems()` once per slip inside the `Promise.all()` map. `getAllProtocolItems` returns the full master item catalog — identical data every time. With 50 slips this fires 50 redundant full-table reads for the same data.

**Fix:** Call `getAllProtocolItems()` once before the `.map()` and pass it in as a closure variable.

```ts
const allItems = await db.getAllProtocolItems(); // once
const slipsWithMismatchStatus = await Promise.all(
  slips.map(async (slip) => {
    // use allItems already fetched above
  })
);
```

---

### H2. `getBackorderedItems` doesn't filter out archived packing slips

**File:** `server/db.ts` — `getBackorderedItems()` (line ~9369)

The query joins `packingSlipItems` → `packingSlips` but has no `archivedAt IS NULL` filter on the join. Backordered items from archived (and soon-to-be-hard-deleted) slips will appear permanently in the Backorders tab. After `archivedPackingSlipCleanup` hard-deletes the parent slip, the join returns nulls for all `packingSlips.*` columns — so `slipClientName`, `slipStatus`, etc. show as null for those orphaned rows.

**Fix:**

```ts
.where(and(
  or(eq(packingSlipItems.status, "backordered"), gt(packingSlipItems.quantityBackordered, 0)),
  isNull(packingSlips.archivedAt)
))
```

---

### H3. Three status derivation functions that can disagree on the same data

**File:** `server/db.ts`

Three separate code paths compute packing slip status and their edge-case behavior differs:

| Function | "All items backordered, none fulfilled" result |
|---|---|
| `deriveSlipStatus(items)` | `'pending'` — no fulfilled items, returns pending |
| `deriveSlipStatusFromCounts(total, fulfilled, backordered)` | `'pending'` — `itemsFulfilled === 0`, falls through to default |
| `recalculatePackingSlipTotals` inline | `'partial'` — `itemsBackordered > 0` branch fires |

A slip where all items are backordered immediately after creation could show as `'pending'` in `getAllPackingSlips` (which uses `deriveSlipStatusFromCounts`) but `'partial'` in the queue (which reads the DB column set by `recalculatePackingSlipTotals`). The two views are inconsistent.

**Fix:** Delete `deriveSlipStatus` and `deriveSlipStatusFromCounts`. Use `recalculatePackingSlipTotals` as the single source of truth. Read the DB `status` column everywhere rather than recomputing it.

---

### H4. Hardcoded team member IDs in `backorderAndTrackingCron` with no validation

**File:** `server/cron/backorderAndTrackingCron.ts` (lines 20–22)

```ts
const TEAM_KARI = 30002;
const TEAM_LISA = 1;
const TEAM_SHANNON = 30001;
```

These IDs are baked in at the module level. If any team member is deleted, their `teamMembers` row removed, or IDs differ across environments:
- `createProjectTask({ assignedTeamMemberId: TEAM_KARI })` silently creates a task assigned to a non-existent user
- Notifications go to ghost IDs with no error surfaced
- No existence check before use; no fallback behavior

**Fix:** Load team member IDs from environment variables or a config table, validate they exist at cron init time, and log a warning if any are missing rather than proceeding silently.

---

### H5. Carrier tracking URL map is duplicated with different carrier sets

**File:** `server/routers.ts` — `packingSlip.updateItem` (line ~5687) and `packingSlip.sign` (line ~5727)

The same carrier → URL lookup object is written twice in two mutations. Worse, they have different carrier lists:

- `updateItem`: FedEx, UPS, USPS, DHL, **PirateShip** (5 carriers)
- `sign`: FedEx, UPS, USPS, DHL (4 carriers — PirateShip missing)

A slip signed via the `sign` flow with `trackingCarrier: 'PirateShip'` gets no auto-generated `trackingUrl`. Additionally, both lookups use case-sensitive exact string matching — `'fedex'`, `'FEDEX'`, or `'FedEx '` (trailing space) all silently produce no URL.

**Fix:** Extract to a single shared constant and normalize carrier input:

```ts
// server/lib/carrierUrls.ts
export function buildTrackingUrl(carrier: string, trackingNumber: string): string | undefined {
  const c = carrier.trim().toLowerCase();
  if (c === 'fedex') return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  if (c === 'ups') return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  if (c === 'usps' || c === 'pirateship') return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  if (c === 'dhl') return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}`;
  return undefined;
}
```

---

## Medium

---

### M1. `totalFulfilled` (row count) displayed against `totalItems` (quantity sum) — unit mismatch

**File:** `client/src/pages/admin/FulfillmentQueue.tsx` (line 235), `server/db.ts` — `getFulfillmentQueue`

`getFulfillmentQueue` returns:
```ts
totalFulfilled: fulfilledItems.length,  // count of fulfilled ROWS
// ...spread ...slip which includes:
totalItems: slip.totalItems             // sum of item QUANTITIES from DB
```

The UI renders: `Items: {slip.totalFulfilled}/{slip.totalItems} fulfilled`

For a slip with 3 item types each ordered at quantity 2:
- `totalItems` = 6 (sum of quantities: 2+2+2)
- `totalFulfilled` = 1 (one row with status='fulfilled')
- Display: **"1/6 fulfilled"** — misleading; conflates row-count with unit-count

Similarly, `totalBackordered` and `totalPending` are row-counts while `totalItems` is a quantity sum.

**Fix:** Use the DB columns (`slip.itemsFulfilled` / `slip.itemsBackordered`) consistently (these are quantity-based, set by `recalculatePackingSlipTotals`), or switch all three totals to row-counts.

---

### M2. Signed/locked partial slips remain permanently visible in the fulfillment queue

**File:** `server/db.ts` — `getFulfillmentQueue`

The queue query filters by `status IN ('pending', 'in_progress', 'partial')` with no check on `signedAt` or `isLocked`. A partially-fulfilled slip that was signed and locked (all shippable items shipped, some backordered) will stay in the queue indefinitely with no visual indicator that it's already been signed off.

Carrie sees it every day as "needing work" even though it's been signed and the backordered items have their own separate tasks.

**Fix:** Either filter out `signedAt IS NOT NULL` slips from the queue, or add a "Signed" badge to the queue card UI for slips where `slip.signedAt` is set, so Carrie knows action has already been taken.

---

### M3. `deleteOldArchivedPackingSlips` leaves orphaned audit log entries

**File:** `server/db.ts` — `deleteOldArchivedPackingSlips` (line ~8070), `server/cron/archivedPackingSlipCleanup.ts`

The hard-delete cascade is:
1. Delete `packing_slip_items` where `packingSlipId IN (ids)`
2. Delete `packing_slips` where `id IN (ids)`

`packing_slip_audit_log` entries are never deleted. After cleanup, audit rows with `packingSlipId` pointing to deleted slips remain indefinitely. These are orphaned references that will produce null/empty data if ever joined.

**Fix:** Add a third delete step:
```ts
await db.delete(packingSlipAuditLog)
  .where(inArray(packingSlipAuditLog.packingSlipId, idsToDelete));
```

---

### M4. `backorderAndTrackingCron` admin summary uses wrong notification event type

**File:** `server/cron/backorderAndTrackingCron.ts` (line 366)

```ts
await db.createNotificationsForEnabledUsers(
  "onboarding_automation",   // ← wrong
  `Fulfillment Update: ...`,
  ...
);
```

This is a copy-paste from the onboarding cron. Admins who have opted out of `onboarding_automation` notifications won't receive fulfillment backorder/tracking summaries. The event type should be `"fulfillment_alert"` (which maps to the `fulfillmentAlertEmail` preference column in `teamNotificationPreferences`).

**Fix:** Change to `"fulfillment_alert"`.

---

## Low / Code Quality

---

### L1. Shipping address fallback logic duplicated in three places

**File:** `server/db.ts` — `getPackingSlipById` (line ~4949), `getAllPackingSlips` (line ~4895), `getFulfillmentQueue` (line ~9326)

All three functions contain identical logic: if `shippingStreet` is null on the slip, query `clientProtocols` for the address and merge it. This is 30+ lines of code duplicated three times. If the fallback logic ever changes (e.g., add `shippingCountry` fallback), all three need to be updated simultaneously.

**Fix:** Extract to a shared helper:
```ts
async function resolveShippingAddress(slip: PackingSlip, database: DB): Promise<ShippingFields> {
  if (slip.shippingStreet || !slip.clientProtocolId) return extractShipping(slip);
  const [protocol] = await database.select({ ... }).from(clientProtocols).where(...);
  return protocol?.shippingStreet ? extractShipping(protocol) : extractShipping(slip);
}
```

---

### L2. `formatDate` / `formatDaysAgo` duplicated across 5+ admin pages

`formatDate` is independently defined in `FulfillmentQueue.tsx`, `MorningBriefing.tsx`, `PromoCodeAnalytics.tsx`, `StoreOrders.tsx`, `UpcomingAppointments.tsx` with slightly varying implementations. A shared `client/src/lib/dateUtils.ts` export would eliminate the drift.

---

### L3. Sort toggle button labels the next action, not the current state

**File:** `client/src/pages/admin/FulfillmentQueue.tsx` (lines 177–185)

```tsx
Sort by {sortBy === "date" ? "Status" : "Date"}
```

When sorting by date the button says "Sort by Status." Users must mentally invert the label to understand the current state. Standard convention: show the current sort with an indicator arrow, or use a `<Select>` with the active option visible.

---

### L4. Stats cards mix slip counts and item counts without labeling the distinction

Cards 1–3 (Pending, In Progress, Partial) count **slips**. Card 4 (Backordered Items) counts **items**. No label distinguishes these. "4 Backordered Items" could be mistaken for 4 slips. Add unit labels: "4 slips" vs "4 items."

---

### L5. Refresh button animation only tracks `queue.isFetching`, not `backorders.isFetching`

**File:** `client/src/pages/admin/FulfillmentQueue.tsx` (line 110)

```tsx
<RefreshCw className={`${queue.isFetching ? 'animate-spin' : ''}`} />
```

When on the Backorders tab and clicking Refresh, the icon doesn't animate even though `backorders.refetch()` is in-flight. Fix:

```tsx
const isFetching = queue.isFetching || backorders.isFetching;
```

---

### L6. Network error state is invisible — falls through to the "All fulfilled!" empty state

**File:** `client/src/pages/admin/FulfillmentQueue.tsx` (line 189)

```tsx
{queue.isLoading ? (
  <div>Loading...</div>
) : sortedQueue.length === 0 ? (
  <Card>✓ All Orders Fulfilled!</Card>  // ← also shown when query errored
) : (
  ...
)}
```

If `queue.isError` is true, `queueData` is `[]`, and the UI shows "All Orders Fulfilled!" as if the queue is genuinely empty. Carrie has no way to know the data failed to load.

**Fix:** Add an explicit error branch:
```tsx
} : queue.isError ? (
  <Card><CardContent>Failed to load fulfillment queue. <Button onClick={() => queue.refetch()}>Retry</Button></CardContent></Card>
) : sortedQueue.length === 0 ? (
```

---

## UX & Accessibility

---

### UX1. No urgency escalation for aging slips

A slip created 14 days ago is visually identical to one created today. There is no age-based priority signal. Suggested improvements:
- Add a colored age badge: green (0–3 days), yellow (4–7 days), red (8+ days)
- Sort-by-date should default to oldest-first (currently oldest first, which is correct — but consider adding it as the labeled default)

---

### UX2. No inline actions — every interaction requires full navigation

The only action available from the queue card is "Open Slip," which navigates to the full packing slip detail page. For high-volume fulfillment workflows, common actions should be available without leaving the queue:
- Quick status change dropdown (pending → in_progress)
- Inline tracking number entry field
- "Mark all fulfilled" quick action for simple slips

---

### UX3. Backorder cards show no indication of whether a reorder task exists

Carrie sees a backordered item in the Backorders tab but has no way to tell whether:
- A reorder task is already assigned to her
- The cron detected it and created a task
- Nothing has been done yet

Add a "Task created" indicator sourced from the `automation_events` table, or surface the task link directly.

---

### UX4. Backorder tab badge count can diverge from tab content count

The badge on the Backorders tab trigger is computed as:
```ts
const totalBackorderedItems = queueData.reduce((sum, s) => sum + (s.totalBackordered || 0), 0);
```
This uses queue-side data (which catches items by either `status === 'backordered'` OR `quantityBackordered > 0`). The tab content is rendered from `backorderData` (which only catches `status === 'backordered'`). Until C1 is fixed, the badge can show "5" while the tab content shows "3."

---

### UX5. Client email is display-only — no mailto or copy link

The client email appears below the name in each queue card but has no interaction:
```tsx
<p className="text-xs text-muted-foreground">{slip.clientEmail}</p>
```
Fulfillment staff often need to email clients about delays. Wrap in `<a href={`mailto:${slip.clientEmail}`}>` or add a copy-to-clipboard icon.

---

### UX6. Pending items truncated to 3 with no expand option

```tsx
{(slip.pendingItems || []).slice(0, 3).map(...)}
{(slip.pendingItems || []).length > 3 && (
  <p>+{slip.pendingItems.length - 3} more items</p>
)}
```

There's no way to expand the item list in-place — you must open the full packing slip page. For a slip with 10 items, staff can't see what they need to pack without navigating away. Add a toggle to reveal all items inline.

---

### UX7. Color-only status encoding is inaccessible

`StatusBadge` uses background colors to convey status (yellow=pending, orange=partial, red=backordered). There is no secondary encoding (icon, pattern, text prefix) for users with color vision deficiency. Add a 2-letter status prefix or a distinct icon alongside the color:

```tsx
const icons = { pending: <Clock />, in_progress: <Box />, partial: <Truck />, backordered: <AlertTriangle /> };
```

---

### UX8. External tracking links have no accessible label

```tsx
<a href={slip.trackingUrl} target="_blank" rel="noopener noreferrer">
  {slip.trackingNumber}
  <ExternalLink className="h-3 w-3" />
</a>
```

Screen readers will read the raw tracking number (e.g., "9400111899223397078172") with no context. Add `aria-label`:

```tsx
aria-label={`Track package ${slip.trackingNumber} via ${slip.trackingCarrier} (opens in new tab)`}
```

---

### UX9. "Open Slip" buttons have no context for screen readers

All "Open Slip" buttons read identically to a screen reader. A user tabbing through the page hears "Open Slip / Open Slip / Open Slip." Add descriptive `aria-label`:

```tsx
aria-label={`Open packing slip for ${slip.clientName} (PS-${slip.id})`}
```

---

### UX10. `AlertTriangle` icons lack `aria-hidden`

Decorative icons inside badge-like elements should be `aria-hidden="true"` so screen readers don't announce redundant icon names alongside the text label. Currently icons like `<AlertTriangle className="h-4 w-4 text-red-500" />` produce screen reader output like "alert triangle backordered."

---

## Redundancy Reduction — Summary

| Duplication | Current State | Recommended Fix |
|---|---|---|
| Carrier → tracking URL map | Written twice in `routers.ts` with different carrier sets | Single `buildTrackingUrl(carrier, number)` util in `server/lib/` |
| Shipping address protocol fallback | Written in `getPackingSlipById`, `getAllPackingSlips`, `getFulfillmentQueue` | Single `resolveShippingAddress(slip)` helper |
| Status derivation logic | `deriveSlipStatus`, `deriveSlipStatusFromCounts`, `recalculatePackingSlipTotals` inline | Delete first two; read DB `status` column everywhere |
| `formatDate` / `formatDaysAgo` | Independently defined in 5+ page files | `client/src/lib/dateUtils.ts` shared export |
| Tracking info JSX block | Identical JSX in queue card and backorder card | `<TrackingInfo carrier={} number={} url={} />` shared component |
| `ShipSourceBadge` component | Defined in `FulfillmentQueue.tsx` only | Move to `client/src/components/` for reuse in packing slip pages |

---

## Files Requiring Changes

| File | Issues |
|---|---|
| `server/db.ts` | C1 (backorder filter), C3 (N+1 join), H2 (archived filter), H3 (status duplication), L1 (shipping fallback), M3 (audit cleanup) |
| `server/routers.ts` | H1 (`getAllProtocolItems` once), H5 (carrier map) |
| `server/cron/backorderAndTrackingCron.ts` | C2 (automation_event guard), H4 (hardcoded IDs), M4 (wrong event type) |
| `server/cron/archivedPackingSlipCleanup.ts` | M3 (audit log cleanup) |
| `client/src/pages/admin/FulfillmentQueue.tsx` | M1 (unit mismatch), M2 (signed slips), L3–L6 (UX), UX1–UX10 |
| New: `server/lib/carrierUrls.ts` | H5 (shared carrier map) |
| New: `client/src/lib/dateUtils.ts` | L2 (shared date formatters) |
| New: `client/src/components/TrackingInfo.tsx` | Redundancy (tracking JSX duplication) |

---

## Deployment Notes

- **No schema changes required** — all issues are in query logic, cron logic, and UI
- **C1 fix changes the `getBackorderedItems` result set** — the Backorders tab may show more items after the fix (previously hidden items become visible)
- **C2 fix is safe** — only prevents false `automation_events` entries; existing entries are not modified
- **M3 (audit log cleanup) is irreversible** — audit entries for old archived slips will be permanently deleted; confirm this is acceptable before deploying
