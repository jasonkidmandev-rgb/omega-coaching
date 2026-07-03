import mysql from "mysql2/promise";

// Raw mysql2 access for tests — used to reset/seed tables around each case,
// independent of the app's Drizzle layer (so a bug in app code can't hide a
// dirty-state test). Keep this thin: reset + tiny seed helpers only.

const url =
  process.env.TEST_DATABASE_URL ||
  "mysql://root:test@127.0.0.1:3307/peptidecoach_test";

let pool: mysql.Pool | null = null;
export function rawPool(): mysql.Pool {
  if (!pool) pool = mysql.createPool(url);
  return pool;
}

/** Empty the given tables (FK checks off so order doesn't matter). */
export async function truncate(...tables: string[]): Promise<void> {
  const p = rawPool();
  await p.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const t of tables) await p.query(`TRUNCATE TABLE \`${t}\``);
  await p.query("SET FOREIGN_KEY_CHECKS = 1");
}

/** Reset just the identity table used by the contact-service tests. */
export async function resetContacts(): Promise<void> {
  await truncate("contacts");
}

/** Insert a contact directly (bypasses app code) and return its id. */
export async function seedContact(c: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  lifecycleStage?: string;
  source?: string | null;
}): Promise<number> {
  const [res] = await rawPool().query(
    "INSERT INTO contacts (first_name, last_name, email, phone, lifecycle_stage, source) VALUES (?,?,?,?,?,?)",
    [
      c.firstName ?? null,
      c.lastName ?? null,
      c.email ?? null,
      c.phone ?? null,
      c.lifecycleStage ?? "lead",
      c.source ?? null,
    ]
  );
  return (res as mysql.ResultSetHeader).insertId;
}

/** Read a contact row back (snake_case columns as stored). */
export async function getContactRow(id: number): Promise<any | null> {
  const [rows] = await rawPool().query("SELECT * FROM contacts WHERE id = ?", [id]);
  return (rows as any[])[0] ?? null;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
