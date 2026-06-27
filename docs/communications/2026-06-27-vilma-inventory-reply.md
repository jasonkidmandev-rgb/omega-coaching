# Reply to Vilma (Vee) — inventory behavior + posture confirmation (2026-06-27)

Vee confirmed the posture model and asked for (1) loud alerts on failed
subtraction and (2) flagging items not set up. Reply below. Intended behavior is
recorded in `docs/reference/inventory-behavior.md`.

---

Hi Vee,

You've understood it exactly right — and your read on the negative count is spot
on too. A few confirmations and a status update:

**On the count going negative:** you've actually described the two valid designs
perfectly, and the app already does your *second* one — it deducts past zero on
purpose, so a negative number is meant to signal "we're backordered / we owe
this." The only problem was that it did so **silently.** For a business that
dropships and backorders deliberately, keeping the negative is the right call —
better than hard-stopping at zero, which would block the order *and* throw away
the useful information that a customer is owed something. So we keep the negative
and add the loud flag. (For dropship items this never comes up — no count.)

**Your posture summary is exactly the model:**
- **Dropship** — no count; supplier ships.
- **Stocked** — a count treated as a best estimate, with "last confirmed X days
  ago / running low" and one-tap confirm.

**Your two asks — status:**
1. *Yell loudly when a subtraction fails* — **done.** Implemented today: when the
   app can't deduct an item, it now alerts admins directly instead of swallowing it.
2. *Flag any item not set up properly* — **in.** Items sold without an inventory
   link are now flagged, so you can see exactly which products need setup.

One more piece I added straight from your note: a distinct **loud flag the moment
an item crosses into negative** (oversold / backordered) — separate from the
general "running low" alert — so a real backorder is unmistakable.

Net: the system stops trusting its own number blindly and starts telling you when
something's off — which is the foundation both for the store and for clean counts
at switchover.

Thanks for the sharp thinking on this — it genuinely helps.

Warm regards,
Saboor
