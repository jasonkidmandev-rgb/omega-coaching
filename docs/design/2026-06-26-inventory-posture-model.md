# Design note — posture-first inventory

**Status:** Proposal (2026-06-26). Prompted by Jason's question on web-store
reliability given inventory distrust. Not yet scheduled.
Related comms: `docs/communications/2026-06-26-jason-store-reliability-reply.md`.

## Problem
The team does not trust the app's inventory counts, and they're right not to.
The root cause is not imprecision — it's **silent failure** plus **treating the
least-reliable value (the count) as the master signal**. A web store bolted onto
these counts inherits the distrust; "dropship everything" sidesteps the symptom
but entrenches the cause and trades away margin/control.

## Current behavior (verified in code)
- **Deduction fires on "is it mapped," not "will it ship from our shelf."**
  `deductInventoryForProtocol` (server/db.ts) decrements every protocol item that
  has a `protocol_inventory_mappings` row — and it runs at protocol approval,
  *before* a `shipSource` is chosen at packing-slip time. Result: an item you
  intend to **dropship still decrements your shelf**, while an **unmapped item you
  actually stock never moves.** Drift in both directions.
- **Deduction failure is non-fatal.** `paymentService.ts` wraps the deduction in
  try/catch and continues on error ("non-fatal") — the sale completes, stock
  silently doesn't move.
- **Out-of-band sales never deduct** (manual/Venmo, hand-dropships, omegalongevity).
- **Negative stock is allowed by design** (backorder safety net) and the store
  marks items at ≤0 as out of stock — so a wrong count hides/shows the wrong items.

## What we already have (the design leans on existing schema)
- `inventory_items.quantity` — the count.
- `packing_slip_items.shipSource` enum `omega | dropship | vendor | client_sourced`
  (default `omega`) — fulfillment posture, but only at **shipment** layer, decided
  too late to gate deduction.
- `inventory_transactions` — append-only ledger (`sale|restock|adjustment|return`
  with previous/new qty). The bones of a real source of truth already exist.

## Design: make fulfillment posture the primary abstraction
1. **Promote posture to the item.** Add a default `fulfillmentPosture`
   (`stocked` / `dropship` / `vendor`) on `inventory_items` (or a per-item default
   that seeds `packing_slip_items.shipSource`). Posture, not quantity, is the
   master signal.
2. **Deduct only `stocked` lines.** Dropship/vendor lines never touch the count —
   correct by construction. This removes the single largest drift source and makes
   "dropship the long tail" an automatic per-item default, not a blanket choice.
3. **Quantity becomes advisory for stocked items, and the system gets honest about
   staleness.** Surface "confirmed N days ago · M sales since," a low/out flag, and
   a one-tap "confirm count." A system that admits "last confirmed 9 days ago"
   earns more trust than one confidently showing a wrong number.
4. **Fail loud.** Convert the non-fatal deduction swallow into a visible admin
   alert (we already have the cron/admin notification path). Highest trust-per-hour
   change available.
5. **One "record a sale" path.** Let manual/out-of-band sales nudge the stocked
   count (even roughly) so the ledger reflects reality across channels.

## Effect on each surface
- **Store:** lists `stocked` items (gated on posture + an advisory low/out flag,
  not a raw integer) and `dropship` items (always orderable — nothing to drift).
  Behind a passcode/access gate, per Jason.
- **Protocols / custom orders:** deduction respects posture, fails loud, and stops
  decrementing items destined for dropship.
- **Fulfillment queue / packing slips:** `shipSource` defaults from item posture;
  override per shipment still allowed.

## Why this over the alternatives
- **vs. a manual on/off toggle bolt-on:** posture is the same concept the
  fulfillment queue already speaks — coherent across store + protocols + packing
  slips, and it auto-excludes dropship from deduction instead of relying on a human
  to remember.
- **vs. textbook "route every channel + cycle-count":** technically optimal but
  assumes ops discipline the team has said it lacks (can't get counts from the
  part-time fulfiller). Best-fit beats best-in-theory.
- **vs. a 3PL/fulfillment provider (the true ceiling):** the right move only if
  product volume justifies the cost + onboarding; revisit later.

## Rollout (incremental, low-risk)
1. **Fail-loud + unmapped-item surfacing** (hours; helps protocols/custom orders
   today, independent of any store or posture work).
2. Add item `fulfillmentPosture`; backfill (hero SKUs = `stocked`, rest = `dropship`).
3. Posture-gate deduction; seed `shipSource` from posture.
4. Advisory-count UI (staleness + confirm) for stocked items.
5. Store reads posture; passcode gate.

## Needs from the business
- The hero stocked list (Magnesium Breakthrough, intestinal formula, starter/syringe
  kit, top peptides) → seed `stocked`; everything else `dropship`.
- Confirmation that peptide dropshipping is acceptable on the
  compliance/chain-of-custody axis (ties to the receipt-naming risk theme).
