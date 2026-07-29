import { defineConfig, configDefaults } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    // Raised from the 5s default because a large part of this suite does a heavy
    // `await import(...)` inside the test body — `./routers` alone is a ~9.6k-line
    // module graph, and several files re-import under `vi.resetModules()`. Cold, or
    // with the workers under load, those imports take ~4s and lose the race, so the
    // SAME tests pass in isolation and fail in a full run. That produced a suite whose
    // failure count moved between runs on byte-identical code — false red, which is
    // worse than a slow suite because it trains everyone to ignore the result.
    //
    // Deleting the offending tests one at a time was whack-a-mole: three more surfaced
    // after the first batch. This fixes the class. (It does NOT make those tests
    // valuable — most assert only that a name exists; see test-harness/README.md.)
    testTimeout: 30_000,
    // Integration tests (`*.integration.test.ts`) need the test-db container and
    // run via `pnpm test:integration` — keep the default unit run DB-free.
    //
    // Connectivity probes (`*.probe.test.ts`) are NOT tests — they call live
    // third-party APIs (Calendly, Google Places, SMTP, IMAP) with real
    // credentials and fail on any machine without production secrets. They are
    // useful for diagnosing an integration, so they are kept and runnable via
    // `pnpm test:probes`, but they must not make a normal test run red.
    exclude: [
      ...configDefaults.exclude,
      "server/**/*.integration.test.ts",
      "server/**/*.probe.test.ts",
    ],
  },
});
