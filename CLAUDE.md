# HumanEdge / omega-coaching, working notes for Claude

Two developers, **Farjad** and **Saboor**, build this app together, both pushing to
`main`. Read this every session; it keeps both of us consistent.

## Team workflow (every session)
- **Push straight to `main`** (Railway auto-deploys it for prod testing). No feature
  branches, no PRs.
- **Always `git pull --rebase` before every push, and at the start of work,
  automatically.** Claude must do this as part of any push without being asked, so
  conflicts are caught and resolved before they reach `main`. If a conflict surfaces,
  resolve it, run `git rebase --continue`, then push. This keeps history clean and stops
  either of us falling behind.
- **Farjad owns DB/schema migrations.** Route schema changes through him so two
  conflicting migrations never hit prod.
- **Announce before editing a god-file.** The big shared files are
  `server/routers.ts` (~9.6k lines), `server/db.ts` (~9.2k), `drizzle/schema.ts`
  (~169 tables), `server/emailService.ts` (~4.9k). Add a claim line in
  `workspace/milestones/current.md` first. Two people in these at once means merge pain.
- **main is always deployable.** Hide half-done work behind a flag (`shared/flags.ts`)
  rather than leaving main broken.
- **Type safety:** the build skips type-checking. A GitHub Action runs
  `typecheck:ratchet` against the baseline in `tsc-error-baseline.txt` (currently **723**;
  it was 743 until `08dd789`, then 723 as of `7851dd8`). Read the file rather than trusting
  a number written here. Don't increase it; if you add a new error, fix it.
  Note the ratchet is the **only** CI gate — it cannot catch anything inside a `` sql`` ``
  template or any other string, which is how the chat outage shipped. See the raw-SQL
  gotcha in `workspace/claude/context.md`.
- Small, frequent commits with clear messages (they double as our code review).
- Neither of us sees the other's work until it's on `main`, so pull and push often; the
  more frequently we sync, the smaller any overlap.

## Coordination lives in `workspace/`
- `workspace/README.md`, how the folder works (read this).
- `workspace/milestones/all-milestones.md`, the whole plan.
- `workspace/milestones/current.md`, the active milestone's tasks. Pick one, mark it
  with your name.
- `workspace/claude/context.md`, shared project context + findings for both Claude
  sessions. Read it at the start; add discoveries there.
- `workspace/log/<name>.md`, each dev's daily log (edit only your own).
- `workspace/decisions.md`, why we did things.

## Keeping the workspace current (do this automatically)
As you work, keep `workspace/` up to date without being asked:
- At the start of work, read `workspace/milestones/current.md` and
  `workspace/claude/context.md`.
- When you finish a task, tick its box in `current.md`.
- **If the dev starts on something not already listed in `current.md`, add it** (under
  the right section, marked done/in-progress with their name as Owner) rather than
  leaving it untracked. This applies to both devs, automatically, without being asked.
- When you discover something reusable (a root cause, a gotcha, a decision), append it
  to `workspace/claude/context.md` (Findings) or `workspace/decisions.md`.
- Log the day's work in the active dev's `workspace/log/<name>.md`, including any
  decision made or issue fixed that day.
- When a pending decision is resolved, move it from the "Open" section of
  `workspace/decisions.md` down to "Decided" with the date and the reason.
Stage these workspace edits alongside the related code change so they travel together.

## Note
Personal Claude memory (`~/.claude`) does NOT sync between the two devs. Anything both
of us should know goes in this file or in `workspace/`.
