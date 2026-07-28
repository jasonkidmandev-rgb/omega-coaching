# Shared Claude Context, HumanEdge

For both Farjad's and Saboor's Claude sessions. Read at the start of work; append
findings here so the other's Claude doesn't re-investigate.

## Stack
React 19 SPA + wouter routing, Express / tRPC 11, Drizzle ORM + MySQL, Tailwind v4
(CSS-first; the Typography plugin is NOT loaded, so `prose` classes are inert, list and
spacing rendering comes from explicit `[&_ul]` / `[&_p]` utilities), TipTap rich text,
Vite. Deploys on Railway (auto-deploys `main`). Payment ledger runs in shadow mode.

## Migration context
Old prod on Manus (peptidecoach.pro); new prod on Railway (humanedge.health). Rebrand
PeptideCoach -> HumanEdge. The app is the source of truth; external funnels feed in.

## Structure warnings (conflict + navigation hotspots)
- God-files (announce before editing, see current.md claim board): `server/routers.ts`
  (~9.6k lines), `server/db.ts` (~9.2k, ~500 exported fns), `drizzle/schema.ts`
  (~169 tables), `server/emailService.ts` (~4.9k).
- Nav reload cause: 36 `window.location.href` + 11 internal `<a href="/…">` bypass
  wouter and force full-page reloads. Convert internal ones to `Link` / `setLocation`;
  keep logout, external URLs, and the post-payment redirect.
- Settings sprawl: ~15 admin settings pages, including 6 notification pages, to be
  consolidated into tabs.
- Back navigation: shared hook `client/src/hooks/useGoBack.ts` (`useGoBack` + `goBackTo`).
- Brand: shared `client/src/components/HumanEdgeBrand.tsx` (used by Cover + Login).

## Findings / gotchas (append as you discover)
- (add here)
