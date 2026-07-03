/**
 * CHARACTERIZATION test — findOrCreateContact (the REAL, wired identity function).
 *
 * Runs the actual code against the real `contacts` table in the test-db container.
 * It documents CURRENT behavior so the contactId-only refactor (which collapses the
 * two findOrCreateContact impls into one service) can prove it didn't change what we
 * meant to keep. If a case here changes, that's a behavior change — decide on purpose.
 *
 * Run:  pnpm testdb:up   (once)   then   pnpm test:integration
 * See test-harness/README.md.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { findOrCreateContact } from "./contactService";
import {
  resetContacts,
  seedContact,
  getContactRow,
  rawPool,
  closePool,
} from "../../test-harness/dbHelpers";

async function contactCount(): Promise<number> {
  const [rows] = await rawPool().query("SELECT COUNT(*) AS n FROM contacts");
  return (rows as any[])[0].n as number;
}

describe("findOrCreateContact (contactService) — current behavior", () => {
  beforeEach(async () => {
    await resetContacts();
  });
  afterAll(async () => {
    await closePool();
  });

  it("creates a new contact for a new email; normalizes email; defaults lifecycle=lead", async () => {
    const r = await findOrCreateContact({
      firstName: "New",
      lastName: "Person",
      email: "  New.Person@Example.COM ",
      source: "test",
    });
    expect(r.isNew).toBe(true);
    expect(r.email).toBe("new.person@example.com");
    expect(r.lifecycleStage).toBe("lead");

    const row = await getContactRow(r.id);
    expect(row.email).toBe("new.person@example.com"); // stored lowercased + trimmed
    expect(row.source).toBe("test");
    expect(await contactCount()).toBe(1);
  });

  it("auto-links on an exact email match (case-insensitive, trimmed) — no new row", async () => {
    const id = await seedContact({ firstName: "Existing", email: "existing@example.com" });
    const r = await findOrCreateContact({ firstName: "Existing", email: "  EXISTING@Example.com " });
    expect(r.isNew).toBe(false);
    expect(r.id).toBe(id);
    expect(await contactCount()).toBe(1);
  });

  it("does NOT auto-link on phone-only match — creates a distinct contact", async () => {
    await seedContact({ firstName: "A", email: "a@b.com", phone: "555-111-2222" });
    const r = await findOrCreateContact({
      firstName: "Other",
      email: "different@x.com",
      phone: "5551112222", // same number, different person
    });
    expect(r.isNew).toBe(true);
    expect(await contactCount()).toBe(2);
  });

  it("does NOT auto-link on name-only match — creates a distinct contact", async () => {
    await seedContact({ firstName: "John", lastName: "Smith", email: "john@a.com" });
    const r = await findOrCreateContact({ fullName: "John Smith", email: "john2@b.com" });
    expect(r.isNew).toBe(true);
    expect(await contactCount()).toBe(2);
  });

  it("fills a missing field on the matched contact (phone was null → set)", async () => {
    const id = await seedContact({ firstName: "Jane", email: "jane@a.com" }); // no phone
    const r = await findOrCreateContact({
      firstName: "Jane",
      email: "jane@a.com",
      phone: "5551234567",
    });
    expect(r.isNew).toBe(false);
    expect(r.id).toBe(id);
    expect(r.phone).toBe("5551234567");
    expect((await getContactRow(id)).phone).toBe("5551234567");
  });

  it("upgrades lifecycle stage upward only — never downgrades", async () => {
    const id = await seedContact({ email: "up@a.com", lifecycleStage: "lead" });

    const up = await findOrCreateContact({ email: "up@a.com", lifecycleStage: "active_client" });
    expect(up.id).toBe(id);
    expect(up.lifecycleStage).toBe("active_client"); // lead(1) -> active_client(4)

    const down = await findOrCreateContact({ email: "up@a.com", lifecycleStage: "lead" });
    expect(down.lifecycleStage).toBe("active_client"); // no downgrade
    expect((await getContactRow(id)).lifecycle_stage).toBe("active_client");
  });

  it("splits fullName into first/last when firstName is not given", async () => {
    const r = await findOrCreateContact({ fullName: "Ada Lovelace", email: "ada@x.com" });
    const row = await getContactRow(r.id);
    expect(row.first_name).toBe("Ada");
    expect(row.last_name).toBe("Lovelace");
    expect(row.full_name).toBe("Ada Lovelace"); // generated column
  });
});
