# workspace/ , team coordination for Farjad + Saboor

This folder is our shared workspace for building HumanEdge. Farjad and Saboor both work
on `main`, so this is where we stay in sync without stepping on each other. It is
committed to the repo, so it travels through git: pull to get the latest, push to share.

**Keep it clean.** This is our (Farjad + Saboor) private repo; Jason doesn't browse it
(Railway only deploys the app, it never exposes these files). Still, keep genuinely
sensitive things like compensation and business strategy out of a code repo as good
hygiene. All coordination, planning, and technical notes belong here.

## What's where
- `milestones/all-milestones.md`, the full plan: all milestones and what can be done in
  each. When a new task appears, add it here under the right milestone.
- `milestones/m1.md`, `milestones/m2.md`, …, one file per milestone. **The active one is
  `m2.md`** — everything we can do this milestone lives there. **Pick a task, put your
  name in its Owner slot, tick it when done.** A closed milestone keeps its own file;
  anything still open in it stays there rather than moving forward.
- `claude/context.md`, shared context and findings for both Claude sessions. Read it
  when you start; add what you discover so the other's Claude doesn't repeat the work.
- `claude/task-notes.md`, implementation detail behind milestone tasks. Claude-only —
  the milestone file stays a clean one-line-per-task list; the technical trail
  (checklists, exact values, edge cases) lives here instead, linked by heading.
- `assets/`, Jason's own documents: his original master brief and his screen-by-screen
  app review, as PDFs plus text extractions. `docs/` is gitignored, so this is the only
  copy either of us has. Read his wording before starting a task that traces back to him;
  see `assets/README.md`.
- `log/farjad.md` and `log/saboor.md`, each person's daily log. **Edit only your own.**
- `decisions.md`, open questions that need Farjad's or Jason's judgment call, plus a
  dated record of what was decided and why. If it's a choice someone has to make, it
  belongs here, not in the milestone file.

## Rules that keep us conflict-free
- **Edit only your own log file.** Per-person files never conflict.
- **Always `git pull --rebase` before every push** (and before editing shared files like
  the active milestone file, `decisions.md`, `context.md`). Claude follows this
  automatically on every push, so conflicts are caught and resolved before they hit
  `main`.
- **Claim god-files before editing them.** Before touching `server/routers.ts`,
  `server/db.ts`, or `drizzle/schema.ts`, add a line to the claim board in the active
  milestone file.
- **Pick a task by putting your name on it** in the active milestone file so we don't
  both grab the same thing.
- New tasks go into the active milestone file (`m2.md`) or `all-milestones.md` (a later
  milestone) under the right area.

## Auto-updating
This folder is kept current automatically as we work, through the rule in the root
`CLAUDE.md`: when Claude finishes a task it ticks the active milestone file, records
discoveries in `claude/context.md` or `decisions.md`, and adds a line to the active
dev's `log/` file. So using Claude for the work keeps this folder up to date on its own,
no separate step. New tasks still get added by hand under the right milestone.

(Optional hands-off extra: a shared git hook can auto-append each commit message to your
daily log. Ask if you want it set up.)

## For Claude (either dev's session)
At the start of work, read this file, the active milestone file (`milestones/m2.md`), and
`claude/context.md`.
The collaboration rules are also in the root `CLAUDE.md`, which loads automatically.
Personal Claude memory does NOT sync between the two of us, so shared knowledge belongs
here.
