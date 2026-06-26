# Reply to Jason (+ Vilma) — store: whether to build, and public vs. hidden (2026-06-26)

Follow-up to the reliability note (`2026-06-26-jason-store-reliability-reply.md`,
already sent). This one answers the actual decision Jason asked for: is a store
worth having, and should it be hidden.

---

**Subject:** Re: web store — whether it's worth it, and public vs. hidden

Hi Jason, Vilma —

My last note was about *how* to make a store reliable. This one's the part you
actually asked: is it worth having, and should it be hidden? Here's my straight
recommendation.

**Should we have a store? Yes — but as one specific thing: a private reorder
portal for existing clients, not a public shop.**

The value of a store here isn't selling to new people — it's killing the manual
back-and-forth when a current client wants more syringes, magnesium, a refill.
That's the stuff eating Vilma's and Kari's time today, and automating it is where
a store pays for itself. New-customer acquisition is what GHL/Omega is for; if the
app's store tries to do that too, we've just built another funnel to maintain and
made the "too many systems" problem worse. Cleaner to let GHL bring people in and
let the app serve the people who are already clients.

One honest caveat so we don't build something that doesn't earn its keep: it's
only worth it if reorders are frequent enough to be a real burden. If you're
processing a steady stream of reorders by hand, a store is a clear win. If it's a
few a week, we're better off skipping the storefront and just sending a payment
link per reorder. So the real question for you and Vilma: roughly how many
reorders a week are you handling manually right now? That number decides it more
than anything technical.

**Hidden or public? Hidden — and I'd go a step further than a passcode: gate it
behind client login.**

Three reasons, and they're the same reasons a public version would be a mistake:
1. A public catalog listing peptides by name is exactly the kind of page that gets
   a payment processor to shut you down — the thing we've been working to keep off
   receipts. Gated, it isn't indexed or anonymously purchasable.
2. Peptides belong inside a coaching relationship, not retail to anonymous buyers.
   A login gate enforces "you're already a client," which is the defensible frame.
   (Worth a sanity check with whoever knows the compliance side.)
3. There's no upside to it being public — it's a reorder tool, so discoverability
   adds nothing and risk adds everything.

A shared passcode leaks and ties orders to nobody; gating behind the client login
you already have ties every order to a client and enforces "existing clients only"
for free. Same effort, much better.

**Net:** worth building if reorder volume justifies it, as a login-gated client
reorder portal for the staples + dropship — with new-customer acquisition left to
GHL. A public retail peptide store I'd advise against.

Happy to hold here until you and Vilma weigh in — no rush to decide.

Saboor
