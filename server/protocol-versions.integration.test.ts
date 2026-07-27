/**
 * SPEC — personId-keyed protocol version grouping (S5 versioning repoint).
 *
 * These lock in the behavior of the new `getClientProtocolsByContactId` /
 * `getActiveProtocolForContact` (db.ts) so the ~15 caller repoints from the legacy
 * `clientId` grouping can be verified. Grouping by personId is required because S2
 * stopped writing `client_protocols.clientId` — history keyed on clientId would be
 * empty for new protocols. personId is carried forward on every version.
 *
 * Run:  pnpm testdb:up   then   pnpm test:integration
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  getClientProtocolsByContactId,
  getActiveProtocolForContact,
  getClientProtocolById,
  createNewProtocolVersionFromProtocol,
} from "./db";
import { truncate, rawPool, closePool, seedContact } from "../test-harness/dbHelpers";

let tok = 0;
async function seedVersion(opts: {
  personId: number | null;
  version: number;
  active: boolean;
  deleted?: boolean;
  name?: string;
}): Promise<number> {
  const [r] = await rawPool().query(
    `INSERT INTO client_protocols
       (clientName, accessToken, status, personId, version, isActiveVersion, deletedAt)
     VALUES (?,?,?,?,?,?,?)`,
    [
      opts.name ?? "Client",
      "tok-" + ++tok + Math.random().toString(36).slice(2),
      "draft",
      opts.personId,
      opts.version,
      opts.active ? 1 : 0,
      opts.deleted ? new Date() : null,
    ]
  );
  return (r as any).insertId;
}

async function activeVersionIds(personId: number): Promise<number[]> {
  const [rows] = await rawPool().query(
    "SELECT id FROM client_protocols WHERE personId = ? AND isActiveVersion = 1 AND deletedAt IS NULL ORDER BY id",
    [personId]
  );
  return (rows as any[]).map((r) => r.id);
}

describe("personId-keyed protocol version grouping", () => {
  beforeEach(async () => {
    await truncate("client_protocols", "contacts", "checkin_schedules");
  });
  afterAll(async () => {
    await closePool();
  });

  it("returns all a contact's versions, newest version first, excluding deleted", async () => {
    const personId = await seedContact({ firstName: "Ver", lastName: "Sion", email: "v@x.com" });
    await seedVersion({ personId, version: 1, active: false });
    await seedVersion({ personId, version: 2, active: false });
    const v3 = await seedVersion({ personId, version: 3, active: true });
    await seedVersion({ personId, version: 4, active: false, deleted: true }); // excluded
    // a different contact's protocol must not leak in
    const other = await seedContact({ firstName: "Other", email: "o@x.com" });
    await seedVersion({ personId: other, version: 1, active: true });

    const versions = await getClientProtocolsByContactId(personId);
    expect(versions.map((v: any) => v.version)).toEqual([3, 2, 1]); // desc, no deleted, no other
    expect(versions.every((v: any) => v.personId === personId)).toBe(true);

    const active = await getActiveProtocolForContact(personId);
    expect(active?.id).toBe(v3);
    expect(active?.version).toBe(3);
  });

  it("returns empty / null for a contact with no protocols", async () => {
    const personId = await seedContact({ firstName: "None", email: "none@x.com" });
    expect(await getClientProtocolsByContactId(personId)).toEqual([]);
    expect(await getActiveProtocolForContact(personId)).toBeNull();
  });

  // S5 repoint: createNewProtocolVersionFromProtocol must supersede the contact's
  // OTHER active versions keyed on personId (was clientId, now null) and must NOT
  // write clientId on the new version.
  it("createNewProtocolVersionFromProtocol supersedes the contact's active versions by personId, without writing clientId", async () => {
    const personId = await seedContact({ firstName: "Roll", lastName: "Fwd", email: "roll@x.com" });
    const source = await seedVersion({ personId, version: 1, active: true, name: "Roll Fwd" });
    // a second stray active version for the SAME contact — must also be deactivated
    const sibling = await seedVersion({ personId, version: 1, active: true, name: "Roll Fwd" });
    // a DIFFERENT contact's active version — must be left untouched
    const other = await seedContact({ firstName: "Keep", email: "keep@x.com" });
    const otherActive = await seedVersion({ personId: other, version: 1, active: true });

    // pre-condition: both of this contact's versions are active
    expect(await activeVersionIds(personId)).toEqual([source, sibling].sort((a, b) => a - b));

    const current = await getClientProtocolById(source);
    const newId = await createNewProtocolVersionFromProtocol(current, { versionName: "v2" });

    // new version: personId carried, clientId NOT written, chained to the source
    const created = await getClientProtocolById(newId);
    expect(created?.personId).toBe(personId);
    expect(created?.clientId).toBeNull();
    expect(created?.previousVersionId).toBe(source);
    expect(created?.version).toBe(2);

    // exactly one active version remains for this contact: the new one
    expect(await activeVersionIds(personId)).toEqual([newId]);
    expect((await getActiveProtocolForContact(personId))?.id).toBe(newId);

    // the other contact's active version is untouched
    expect(await activeVersionIds(other)).toEqual([otherActive]);
  });
});
