# assets — Jason's own words

`docs/` is gitignored, so these never reached the other dev. They live here instead,
because when you pick up a task that traces back to Jason, his exact wording usually
carries context the one-line task summary loses.

| File | What it is |
|---|---|
| `jason-master-doc.pdf` / `.txt` | **"the long doc"** / "the big document" / "the master doc". Written 2026-07-24. The original brief: Jason's asks, then Lisa's, Kari's and Shannon's, then a go/keep/decide pass over every admin nav item. Most of the milestone plan comes from this. |
| `jason-review-2026-08-05.pdf` / `.txt` | **"the review doc"**. Jason walking through the deployed app screen by screen, writing comments next to screenshots. |
| `jason-review-2-reply.pdf` / `.txt` | His reply after we answered the review doc. Numbered 1-6. Settles Programs (kill it), keeps Reset Protocol Approval, and introduces the "Client Journey Notes" idea, which is the largest new ask in any of these documents. ⚠️ His screenshot for point 6 is from the **old** peptidecoach.pro app, not ours. |

The `.txt` files are `pdftotext -layout` extractions, kept so the content is greppable and
readable without a PDF tool. **Read the PDF, not the txt, when a comment says "this" or
"these"** — the review doc is annotations on screenshots, so about half of it is
meaningless without the image next to it. The txt is for searching; the PDF is for
understanding.

Rendering the PDF pages if you have no viewer:
```
pip install --user pymupdf
python -c "import fitz; d=fitz.open('workspace/assets/jason-review-2026-08-05.pdf'); [p.get_pixmap(dpi=110).save(f'page{i+1:02d}.png') for i,p in enumerate(d)]"
```

## Two things to know before trusting either document

**They disagree with each other in places.** The master doc says to remove Programs in
both the admin and the protocol build, flatly. The review doc, two weeks later, asks how
Programs works because he can't decide. When they conflict, the review doc is newer, but
raise it rather than picking one.

**"I think I said this in the long doc" is often wrong.** Jason says it about six times in
the review doc. He is right about Launchpad, client-buys defaults and Programs. He is
wrong about the protocol PDFs and about My Documents / My Inventory, which appear nowhere
in the master doc. Check before assuming the requirement is already specified somewhere.

## Where the tasks from these live
- Items sized for this milestone: `milestones/m2.md`, section H "Next from Jason".
- Items sized for M3: `milestones/m3.md`, section E "Next from Jason".
- The full mapping of every review-doc comment to a screen, with the master-doc
  cross-check: `claude/task-notes.md#jason-review-2026-08-05`.
