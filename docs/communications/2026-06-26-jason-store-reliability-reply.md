# Reply to Jason (+ Vilma) — web store reliability in humanedge.health (2026-06-26)

Record of the reply to Jason's question: given their inventory struggles, how
reliable would a web store be? Grounded in a read of the actual deduction code.
Design detail: `docs/design/2026-06-26-inventory-posture-model.md`.

---

Hi Jason — and good to have you on this, Vilma.

**Short version:** you're right not to trust the current inventory numbers. But
the choice isn't "get counts perfect" vs. "give up and dropship everything" —
there's a third option that fits your team, and the good news is it's mostly
already in the app, just wired the wrong way. A store can be reliable, and it
doesn't have to wait on inventory being solved first.

**Why your distrust is justified (I went through the code, not guessing):**
The app decides what to deduct based on whether an item is "mapped," *not* on
whether it'll actually ship from your shelf — and it does this at protocol
approval, before anyone decides ship-from-stock vs. dropship. So today an item
you fully intend to **dropship still gets subtracted from your shelf**, while
something you **do stock but isn't mapped never moves at all.** On top of that,
if a deduction errors out the app just continues silently, and anything sold
outside the app (manual/Venmo, a hand-dropship) never deducts. So the count
drifts in both directions, invisibly. That's the real problem — not that the math
is slightly off, but that the system fails quietly and trusts its least-reliable
number.

**The better fix — track "how we fulfill it," not "how many we have":**
For each product, the app should know its *posture* — do we **stock** it (ship
from our shelf), or **dropship** it? You actually already have this concept in the
app; it's just applied too late to help.

- **Dropship items:** no count to get wrong. The store just takes the order.
  Nothing to drift, nothing to maintain.
- **The handful you stock** (Magnesium Breakthrough, intestinal formula, the
  starter/syringe kit, your top peptides): the app tracks these, but treats the
  number as *advisory* — it shows "last confirmed X days ago," flags low/out, and
  anyone can confirm a count in one tap. A system that honestly says "not sure,
  last checked a week ago" is more trustworthy than one confidently showing a
  wrong number. This is what takes Kari out of the critical path — you're not
  chasing exact counts, you're keeping ~10 items roughly honest.
- **The store** shows your stocked items (with the low/out flag) plus dropship
  items (always orderable), behind a **passcode**, like you asked.

**Two fixes I'd make no matter what we decide** (these help protocols and custom
orders too, not just a store):
- Make a failed inventory deduction raise a **visible alert** instead of silently
  passing. This one change buys back the most trust for the least effort.
- Stop deducting items that are headed for dropship, and flag items sold with no
  mapping — so the count stops drifting in both directions.

**On dropshipping by default:** I'd gently push back on making it the default
*because the app can't be trusted to subtract* — that's a few-hours fix, and
dropshipping has real costs (thinner margins, slower/less-controlled shipping, and
for peptides a chain-of-custody question worth checking given everything else
we're managing on compliance). Dropship the long tail by all means — but as a
deliberate per-product choice, not a workaround. The posture approach makes that
choice explicit and per-item.

**Net:** a store is reliable if it's built on *posture* (stock vs. dropship)
rather than on a count you can't keep current. It fits your team, it's mostly
re-using what's already in the app, and it doesn't block on fixing inventory
first.

Vilma — does this match how fulfillment actually works on your side? The whole
point is to stop depending on exact counts from Kari; if there's a wrinkle in how
you ship that this misses, I'd rather hear it now.

Happy to spec it out once we've aligned — I've already sketched the design on my
end.

Saboor
