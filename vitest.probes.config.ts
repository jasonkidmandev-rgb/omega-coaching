import { defineConfig } from "vitest/config";
import path from "path";

// CONNECTIVITY PROBES — not unit tests.
//
// These call live third-party services (Calendly, Google Places, SMTP, IMAP)
// using real credentials from the environment. They exist to answer "is this
// integration configured and reachable right now?", which is an ops question,
// not a correctness one. They fail on any machine without production secrets,
// so they are excluded from `pnpm test` and run on demand:
//
//   pnpm test:probes
const projectRoot = path.resolve(import.meta.dirname);

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
    include: ["server/**/*.probe.test.ts"],
    testTimeout: 30_000,
  },
});
