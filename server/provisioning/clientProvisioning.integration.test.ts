/**
 * BEHAVIOR — autoCreateOrLinkClient after S2 (contactId-only).
 *
 * Post-refactor: no `clients` row is written and no `client_protocols.clientId` is
 * set. Identity is the `contacts` row (verified email); the protocol gets
 * `contactId`; the enrollment is linked by `contactId` + `clientProtocolId`; and
 * shipping lands on the protocol (the fulfillment record), not `clients`.
 * (Was previously the [REMOVED-BY-S2]/[INVARIANT] characterization of the legacy
 * behavior — flipped when S2 executed.)
 *
 * Run:  pnpm testdb:up   then   pnpm test:integration
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { autoCreateOrLinkClient } from "./clientProvisioning";
import { getDb } from "../db";
import { truncate, rawPool, closePool, seedContact } from "../../test-harness/dbHelpers";

async function seedEnrollment(email: string, name: string): Promise<number> {
  const [r] = await rawPool().query(
    "INSERT INTO transformation_enrollments (email, clientName) VALUES (?,?)",
    [email, name]
  );
  return (r as any).insertId;
}
async function seedProtocol(email: string, name: string): Promise<number> {
  const [r] = await rawPool().query(
    "INSERT INTO client_protocols (clientName, clientEmail, accessToken, status) VALUES (?,?,?,?)",
    [name, email, "tok-" + Math.random().toString(36).slice(2), "draft"]
  );
  return (r as any).insertId;
}
async function one(sql: string, params: any[] = []): Promise<any> {
  const [rows] = await rawPool().query(sql, params);
  return (rows as any[])[0] ?? null;
}
const count = async (t: string) => (await one(`SELECT COUNT(*) n FROM ${t}`)).n as number;

describe("autoCreateOrLinkClient — contactId-only (post-S2)", () => {
  beforeEach(async () => {
    await truncate("transformation_enrollments", "client_protocols", "clients", "contacts");
  });
  afterAll(async () => {
    await closePool();
  });

  it("creates a contact, sets the protocol's contactId, links the enrollment — writes NO clients row", async () => {
    const email = "foo@bar.com";
    const enrollmentId = await seedEnrollment(email, "Foo Bar");
    const protocolId = await seedProtocol(email, "Foo Bar");

    const db = await getDb();
    const res = await autoCreateOrLinkClient(db, enrollmentId, email, "Foo Bar");

    expect(res.action).toBe("created");
    expect(res.contactId).toBeGreaterThan(0);
    expect(res.clientProtocolId).toBe(protocolId);

    expect(await count("contacts")).toBe(1);
    expect(await count("clients")).toBe(0); // legacy table no longer written

    const proto = await one("SELECT contactId, clientId FROM client_protocols WHERE id=?", [protocolId]);
    expect(proto.contactId).toBe(res.contactId);
    expect(proto.clientId).toBeNull(); // clientId no longer set

    const enr = await one("SELECT contactId, clientProtocolId FROM transformation_enrollments WHERE id=?", [enrollmentId]);
    expect(enr.contactId).toBe(res.contactId);
    expect(enr.clientProtocolId).toBe(protocolId);
  });

  it("links an existing contact by email (action=linked), creates no new contact and no clients row", async () => {
    const email = "jane@ex.com";
    const existingContactId = await seedContact({ firstName: "Jane", lastName: "Doe", email });
    const enrollmentId = await seedEnrollment(email, "Jane Doe");
    await seedProtocol(email, "Jane Doe");

    const db = await getDb();
    const res = await autoCreateOrLinkClient(db, enrollmentId, email, "Jane Doe");

    expect(res.action).toBe("linked");
    expect(res.contactId).toBe(existingContactId);
    expect(await count("contacts")).toBe(1); // no duplicate contact
    expect(await count("clients")).toBe(0);
  });

  it("returns skipped and writes nothing when email is empty", async () => {
    const enrollmentId = await seedEnrollment("", "No Email");
    const db = await getDb();
    const res = await autoCreateOrLinkClient(db, enrollmentId, "", "No Email");
    expect(res.action).toBe("skipped");
    expect(await count("contacts")).toBe(0);
    expect(await count("clients")).toBe(0);
  });

  it("persists shipping/phone on the protocol (fulfillment record), not on clients", async () => {
    const email = "ship@x.com";
    const enrollmentId = await seedEnrollment(email, "Ship Person");
    const protocolId = await seedProtocol(email, "Ship Person");

    const db = await getDb();
    await autoCreateOrLinkClient(db, enrollmentId, email, "Ship Person", {
      phone: "5551112222",
      shippingStreet: "1 Main",
      shippingCity: "Town",
      shippingState: "CA",
      shippingZip: "90001",
    });

    const proto = await one(
      "SELECT clientPhone, shippingStreet, shippingCity, shippingState, shippingZip FROM client_protocols WHERE id=?",
      [protocolId]
    );
    expect(proto.shippingStreet).toBe("1 Main");
    expect(proto.shippingCity).toBe("Town");
    expect(proto.shippingState).toBe("CA");
    expect(proto.shippingZip).toBe("90001");
    expect(proto.clientPhone).toBe("5551112222");
    expect(await count("clients")).toBe(0);
  });
});
