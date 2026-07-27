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
