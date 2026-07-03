import mysql from "mysql2/promise";

// Runs ONCE before the integration suite. Confirms the test DB is reachable and
// fails with an actionable message if it isn't — so "connection refused" becomes
// "did you run `pnpm testdb:up`?".
export default async function setup() {
  const url =
    process.env.TEST_DATABASE_URL ||
    "mysql://root:test@127.0.0.1:3307/peptidecoach_test";

  const deadline = Date.now() + 20_000;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      const conn = await mysql.createConnection(url);
      await conn.query("SELECT 1");
      // sanity: the identity schema is present
      const [rows] = await conn.query(
        "SELECT COUNT(*) AS n FROM information_schema.tables " +
          "WHERE table_schema = DATABASE() AND table_name = 'contacts'"
      );
      await conn.end();
      if ((rows as any[])[0]?.n !== 1) {
        throw new Error(
          "test DB is up but the `contacts` table is missing. The schema only " +
            "loads on a FRESH volume — run `pnpm testdb:down && pnpm testdb:up`."
        );
      }
      return; // ready
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(
    `[integration] Cannot reach the test DB at ${url}.\n` +
      `Start it first:  pnpm testdb:up   (needs Docker running)\n` +
      `Last error: ${(lastErr as Error)?.message ?? lastErr}`
  );
}
