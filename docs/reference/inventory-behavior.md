# Inventory — intended behavior (reference)

**Purpose:** the source of intent for how inventory is *supposed* to behave, so we
don't lose track as pieces land incrementally. This is the behavior contract; the
rationale/proposal lives in `docs/design/2026-06-26-inventory-posture-model.md`.

Last updated: 2026-06-27.

## Core principle
The on-hand count is the app's **least-reliable value**, so the app must never
trust it blindly. Two rules follow:
1. **Never block fulfillment on the count.** It deducts regardless of the number.
2. **Always speak up when something is off** — loudly, never silently.

## Deduction (on protocol payment / order approval)
- Deducts the mapped inventory for each *included, coach-fulfilled* item.
- **Allows the count to go negative on purpose.** A negative means **backorder /
  "we owe this."** The app does NOT hard-stop at 0 — stopping would block the
  order *and* discard the useful signal that a customer is owed an item.
- Deduction is idempotent per protocol (guarded by `inventoryDeductedAt`).

## Alerts — the "loud" behavior (implemented 2026-06-27)
Three distinct admin/owner notifications, sent directly (not preference-gated) so
they can't be silently missed:

| Signal | When | Notification |
|---|---|---|
| **Deduction failure** | item not found, sell throws, or deduction crashes entirely | ⚠️ "Inventory not fully deducted" |
| **Not set up** | coach-fulfilled *physical* item (peptide/supplement/adjunct/supply) with **no inventory mapping** | included in the ⚠️ failure alert, labelled "No inventory mapping" |
| **Backorder** | stock deliberately went **negative** (oversold / owed) | 📦 "Backorder — stock went negative" (shows prev→new qty) |

Key distinctions:
- **Backorder is NOT a failure.** The deduction *worked*; the shelf is just short.
  It gets its own alert, separate from failures and separate from "running low."
- **Negative stock is intentional**, so it never appears in the failure alert.
- **Noise control on "not set up":** services / `other` types and **client-sourced**
  items are excluded — they legitimately have no inventory and must not raise alarms.
- The existing **low-stock / restock** alert (`quantity ≤ lowStockThreshold`) is a
  separate, softer signal and remains as-is.

## Fulfillment posture (target model — not yet built)
- Each item carries a posture: **stocked** / **dropship** / **vendor**.
- Only **stocked** items have a meaningful count; **dropship** items are untracked.
- Deduction will be **posture-gated** (only stocked lines deduct) once the posture
  field exists — today it deducts any mapped item.
- Stocked counts are shown as a **best estimate**: "last confirmed N days ago /
  running low," with one-tap confirm.

## At cutover (planned)
- **Opening-balance reset:** keep catalog + mappings + archived history; do NOT
  trust-migrate old quantities; set fresh counts from a one-time physical count of
  the hero stocked SKUs only; mine old negatives for owed backorders first.
  (Feasibility is an open question — see the 2026-06-26 progress/backlog doc.)

## Status
- **Implemented (protocol payment path):** fail-loud failure alert, unmapped-item
  flag, backorder (negative-stock) alert.
- **Planned:** posture field + dropship-gated deduction; advisory-count UI; the same
  fail-loud/backorder alerts on the **custom-order / store-order** deduction paths.

## Scope note
Alerts are currently wired on the protocol payment path
(`processProtocolPaymentReceived` → `deductInventoryForProtocol`). The
custom-order and store-order deduction paths do not yet have parity.
