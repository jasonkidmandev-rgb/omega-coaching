# Shared Claude Context, HumanEdge

For both Farjad's and Saboor's Claude sessions. Read at the start of work; append
findings here so the other's Claude doesn't re-investigate.

## Stack
React 19 SPA + wouter routing, Express / tRPC 11, Drizzle ORM + MySQL, Tailwind v4
(CSS-first; the Typography plugin is now ENABLED as of commit 57c3e00, so `prose`
classes work app-wide, the older explicit `[&_ul]` / `[&_p]` utilities still work too),
TipTap rich text, Vite. Deploys on Railway (auto-deploys `main`). Payment ledger runs in
shadow mode.

## Migration context
Old prod on Manus (peptidecoach.pro); new prod on Railway (humanedge.health). Rebrand
PeptideCoach -> HumanEdge. The app is the source of truth; external funnels feed in.

## Structure warnings (conflict + navigation hotspots)
- God-files (announce before editing, see current.md claim board): `server/routers.ts`
  (~9.6k lines), `server/db.ts` (~9.2k, ~500 exported fns), `drizzle/schema.ts`
  (~169 tables), `server/emailService.ts` (~4.9k).
- Nav: the whole-app re-render on every admin navigation is FIXED (commit 5273297).
  Still present: 36 `window.location.href` + 11 internal `<a href="/…">` that hard-reload;
  audit these and convert any internal navs that shouldn't reload to `Link` / `setLocation`
  (keep logout, external URLs, post-payment).
- Settings sprawl: ~15 admin settings pages, including 6 notification pages, to be
  consolidated into tabs.
- Back navigation: shared hook `client/src/hooks/useGoBack.ts` (`useGoBack` + `goBackTo`).
- Brand: shared `client/src/components/HumanEdgeBrand.tsx` (used by Cover + Login).

## Findings / gotchas (append as you discover)
- Data model is mid-rename from "team/clients" to **people / `personId`** (commits
  08dd789, 1e0c4eb). `People.tsx` is the new view; `Team.tsx` still exists. Watch for
  raw SQL or code still using old `team`/client-only naming.
- Test suite was cleaned up (148 failing -> 15, commit 5df455d), and slow external
  checks were renamed to `*.probe.test.ts`. A red test run now actually means something.
- Settings are still ~15 separate admin pages (no tabbed page yet); consolidating them
  is the main open M1 UI task.
