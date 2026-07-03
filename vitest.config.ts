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
    exclude: [...configDefaults.exclude, "server/**/*.integration.test.ts"],
  },
});
