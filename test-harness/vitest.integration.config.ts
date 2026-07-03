import { defineConfig } from "vitest/config";
import path from "path";

// Integration tests run REAL code against a REAL MySQL (the test-db container).
// They are file-named `*.integration.test.ts` and excluded from the default
// `pnpm test` run (see ../vitest.config.ts) so unit runs stay DB-free.
//
// Prereq: the test DB must be up — `pnpm testdb:up`. globalSetup fails fast with
// a clear message if it isn't.

const projectRoot = path.resolve(import.meta.dirname, "..");

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "mysql://root:test@127.0.0.1:3307/peptidecoach_test";

export default defineConfig({
  root: projectRoot,
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "client", "src"),
      "@shared": path.resolve(projectRoot, "shared"),
      "@assets": path.resolve(projectRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.integration.test.ts"],
    globalSetup: [path.resolve(import.meta.dirname, "globalSetup.ts")],
    // The app's getDb() reads DATABASE_URL — point it at the test container.
    env: { DATABASE_URL: TEST_DATABASE_URL, TEST_DATABASE_URL },
    hookTimeout: 30_000,
    testTimeout: 30_000,
    // one worker: these tests share one DB and reset tables between cases
    fileParallelism: false,
  },
});
