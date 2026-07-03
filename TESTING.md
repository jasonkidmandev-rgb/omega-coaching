# Testing — start here

This repo has **three** test tiers. Know which one you're touching.

| Tier | Command | Files | What it proves |
|---|---|---|---|
| **Unit** | `pnpm test` | `server/**/*.test.ts` | fast, **no DB**. ⚠️ Most existing ones are *source-text / wiring* assertions — see the warning below. |
| **Integration** | `pnpm test:integration` | `server/**/*.integration.test.ts` | REAL code vs a REAL MySQL. **The tier that proves behavior.** Needs the test DB. |
| **E2E** | `pnpm test:e2e` | Playwright | full browser flows. |

## ⚠️ Don't trust a green `pnpm test` for data-path changes

The large legacy unit suite is mostly **source-text assertions**
(`readFileSync(source)` + `toContain("…")`) and **wiring checks**
(`router._def.procedures.X.toBeDefined()`). They pass while logic breaks, and go
red on harmless renames. When you change anything that touches the DB or identity,
**write/keep an integration test** — and *replace* the relevant source-text tests
rather than nursing them. Full audit + rationale:
[test-harness/README.md](test-harness/README.md).

## Integration tests in 30 seconds

```bash
pnpm testdb:up            # throwaway MySQL 8 on :3307 (needs Docker)
pnpm test:integration
pnpm testdb:down          # wipe
```

Everything about the harness — architecture, adding a test, extending the schema,
env vars, troubleshooting — is documented in
**[test-harness/README.md](test-harness/README.md)**. First example to copy:
[server/contacts/contactService.integration.test.ts](server/contacts/contactService.integration.test.ts).

Why this matters right now: the identity / contactId-only refactor
([cutover/app-contactid-only-plan.md](cutover/app-contactid-only-plan.md)) rewrites
live paths that have no runtime coverage. We characterize each path with an
integration test **before** refactoring, then keep it green.
