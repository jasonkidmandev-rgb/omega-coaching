/**
 * SPEC — continuous chat thread (identity-consolidation Phase 3 / CR-1).
 *
 * protocol_comments used to be keyed on clientProtocolId (ONE protocol version), so a
 * client's chat fragmented every time they got a new protocol version. These lock in
 * the new behavior: a thread follows the CONTACT across all their versions. Reads,
 * unread counts, and mark-read all operate on the whole contact thread; they fall back
 * to per-protocol when a protocol has no contact (legacy / orphaned comments).
 *
 * Run:  pnpm testdb:up   then   pnpm test:integration
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  createProtocolComment,
  getProtocolComments,
  markCommentsAsRead,
  getUnreadCommentCount,
  getInboxConversations,
} from "./db";
import { truncate, rawPool, closePool, seedContact } from "../test-harness/dbHelpers";

let tok = 0;
async function seedProtocol(personId: number | null, version: number): Promise<number> {
  const [r] = await rawPool().query(
    `INSERT INTO client_protocols (clientName, accessToken, status, contactId, version, isActiveVersion)
     VALUES (?,?,?,?,?,?)`,
    ["Client", "tok-" + ++tok + Math.random().toString(36).slice(2), "active", personId, version, version]
  );
  return (r as any).insertId;
}

describe("continuous chat thread (Phase 3 — keyed on personId)", () => {
  beforeEach(async () => {
    await truncate("protocol_comments", "client_protocols", "contacts");
  });
  afterAll(async () => {
    await closePool();
  });

  it("a thread carries across protocol versions for the same contact", async () => {
    const personId = await seedContact({ firstName: "Chat", lastName: "Client", email: "chat@x.com" });
    const v1 = await seedProtocol(personId, 1);
    const v2 = await seedProtocol(personId, 2);

    // comment on v1, then v2 — createProtocolComment must stamp the same personId
    await createProtocolComment({ clientProtocolId: v1, authorType: "client", message: "msg on v1" } as any);
    await createProtocolComment({ clientProtocolId: v2, authorType: "coach", message: "reply on v2" } as any);

    // viewing EITHER version returns the whole thread, oldest-first
    const fromV1 = await getProtocolComments(v1);
    const fromV2 = await getProtocolComments(v2);
    expect(fromV1.map((c: any) => c.message)).toEqual(["msg on v1", "reply on v2"]);
    expect(fromV2.map((c: any) => c.message)).toEqual(["msg on v1", "reply on v2"]);
    expect(fromV1.every((c: any) => c.personId === personId)).toBe(true);

    // a different contact's message must not leak in
    const other = await seedContact({ firstName: "Other", email: "other@x.com" });
    const ov1 = await seedProtocol(other, 1);
    await createProtocolComment({ clientProtocolId: ov1, authorType: "client", message: "someone else" } as any);
    expect((await getProtocolComments(v1)).map((c: any) => c.message)).toEqual(["msg on v1", "reply on v2"]);
  });

  it("unread count + mark-read span the whole contact thread, not one version", async () => {
    const personId = await seedContact({ firstName: "Unread", email: "unread@x.com" });
    const v1 = await seedProtocol(personId, 1);
    const v2 = await seedProtocol(personId, 2);
    await createProtocolComment({ clientProtocolId: v1, authorType: "client", message: "old unread" } as any);
    await createProtocolComment({ clientProtocolId: v2, authorType: "client", message: "new unread" } as any);

    // the coach's unread count, asked from v2, includes v1's message too
    expect(await getUnreadCommentCount(v2, "coach")).toBe(2);

    // marking read from v2 clears BOTH versions' client messages
    await markCommentsAsRead(v2, "coach");
    expect(await getUnreadCommentCount(v1, "coach")).toBe(0);
    expect(await getUnreadCommentCount(v2, "coach")).toBe(0);
  });

  it("falls back to per-protocol when the protocol has no contact (legacy/orphan)", async () => {
    const orphanProto = await seedProtocol(null, 1);
    await createProtocolComment({ clientProtocolId: orphanProto, authorType: "client", message: "orphan msg" } as any);
    const comments = await getProtocolComments(orphanProto);
    expect(comments.map((c: any) => c.message)).toEqual(["orphan msg"]);
    expect(comments[0].personId).toBeNull();
  });
});

async function seedProtocolFull(opts: {
  personId: number | null; version: number; name?: string; email?: string; deleted?: boolean;
}): Promise<number> {
  const [r] = await rawPool().query(
    `INSERT INTO client_protocols
       (clientName, clientEmail, accessToken, status, contactId, version, isActiveVersion, deletedAt)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      opts.name ?? "Client", opts.email ?? null,
      "tok-" + ++tok + Math.random().toString(36).slice(2), "active",
      opts.personId, opts.version, 1, opts.deleted ? new Date() : null,
    ]
  );
  return (r as any).insertId;
}
async function seedComment(protocolId: number, personId: number | null, authorType: "coach" | "client", message: string, isRead = false) {
  await rawPool().query(
    `INSERT INTO protocol_comments (clientProtocolId, contactId, authorType, authorName, message, isRead)
     VALUES (?,?,?,?,?,?)`,
    [protocolId, personId, authorType, authorType === "coach" ? "Coach" : "Client", message, isRead ? 1 : 0]
  );
}
async function seedUser(email: string) {
  await rawPool().query(
    `INSERT INTO users (openId, name, email, lastSeenAt) VALUES (?,?,?,?)`,
    ["oid-" + ++tok + Math.random().toString(36).slice(2), "User", email, new Date()]
  );
}

describe("coach inbox — one row per contact (Phase 3 grouping)", () => {
  beforeEach(async () => {
    await truncate("protocol_comments", "client_protocols", "users", "contacts");
  });
  afterAll(async () => {
    await closePool();
  });

  it("collapses a contact's protocol versions into one row; latest message + unread span the thread; deleted-protocol messages excluded", async () => {
    // Contact A: two live versions (v1, v2) + a DELETED v3 with the newest message.
    const a = await seedContact({ firstName: "Aaa", lastName: "Client", email: "a@x.com" });
    await seedUser("a@x.com");
    const av1 = await seedProtocolFull({ personId: a, version: 1, name: "Aaa Client", email: "a@x.com" });
    const av2 = await seedProtocolFull({ personId: a, version: 2, name: "Aaa Client", email: "a@x.com" });
    const av3 = await seedProtocolFull({ personId: a, version: 3, name: "Aaa Client", email: "a@x.com", deleted: true });
    await seedComment(av1, a, "client", "a-old");
    await seedComment(av2, a, "client", "a-new");          // newest LIVE message
    await seedComment(av3, a, "client", "a-deleted-newest"); // on a deleted protocol → ignored

    // Contact B: one version, a coach message (not a client-unread).
    const b = await seedContact({ firstName: "Bbb", email: "b@x.com" });
    const bv1 = await seedProtocolFull({ personId: b, version: 1, name: "Bbb", email: "b@x.com" });
    await seedComment(bv1, b, "coach", "b-hi");

    const rows = (await getInboxConversations()) as any[];

    // one row per contact (A's 3 protocols collapse to 1; B is 1) — NOT 4
    expect(rows.length).toBe(2);

    const rowA = rows.find((r) => r.clientName === "Aaa Client");
    expect(rowA.clientProtocolId).toBe(av2);        // links to the protocol with the latest LIVE msg
    expect(rowA.lastMessage).toBe("a-new");         // deleted v3's newer message is ignored
    expect(Number(rowA.unreadCount)).toBe(2);       // both live client msgs; deleted one excluded
    expect(rowA.clientLastSeenAt).toBeTruthy();      // users join populated

    const rowB = rows.find((r) => r.clientName === "Bbb");
    expect(Number(rowB.unreadCount)).toBe(0);       // a coach message is not a client-unread
  });
});

/**
 * SPEC — a coach message is stamped with the signed-in staff member's real name.
 *
 * The three admin surfaces (Inbox, Chat, ClientEdit) each used to send a hard-coded
 * `authorName: "Coach"`, which is why 316 of the 362 coach messages in production read
 * "Coach" instead of a person. The name now comes from the session inside
 * `commentsRouter.create`, so it covers every surface and cannot be set by the caller.
 *
 * These drive the REAL router (not the db helper) because that is where the rule lives.
 * Protocols are seeded WITHOUT a clientEmail so the notification/email branch
 * short-circuits — this asserts the naming rule, nothing else.
 */
describe("coach messages carry the sender's name (commentsRouter.create)", () => {
  let caller: (user: any) => any;

  beforeEach(async () => {
    await truncate("protocol_comments", "client_protocols", "contacts");
    const { appRouter } = await import("./routers");
    caller = (user: any) => appRouter.createCaller({ req: {}, res: {}, user } as any);
  });
  afterAll(async () => {
    await closePool();
  });

  const staff = (over: any = {}) => ({ id: 1, name: "Lisa Bennett", email: "lisa@x.com", role: "admin", ...over });

  async function post(user: any, input: any) {
    const protocolId = await seedProtocol(null, 1);
    await caller(user).comments.create({ clientProtocolId: protocolId, message: "hello", ...input });
    const [rows] = await rawPool().query(
      "SELECT authorType, authorName FROM protocol_comments WHERE clientProtocolId = ?",
      [protocolId]
    );
    return (rows as any[])[0];
  }

  it("uses the signed-in staff member's name, ignoring what the caller sent", async () => {
    const row = await post(staff(), { authorType: "coach", authorName: "Coach" });
    expect(row.authorName).toBe("Lisa Bennett");
  });

  it("falls back to the account email when a staff user has no name", async () => {
    const row = await post(staff({ name: null }), { authorType: "coach", authorName: "Coach" });
    expect(row.authorName).toBe("lisa@x.com");
  });

  it("every staff role is treated as a coach, not just admin", async () => {
    for (const role of ["admin", "manager", "viewer", "finance"]) {
      const row = await post(staff({ role, name: `${role} person` }), { authorType: "coach", authorName: "Coach" });
      expect(row.authorName).toBe(`${role} person`);
    }
  });

  it("keeps the supplied name when there is no session (token-authenticated client page)", async () => {
    const row = await post(null, { authorType: "coach", authorName: "Jason Kidman" });
    expect(row.authorName).toBe("Jason Kidman");
  });

  it("does not let a signed-in CLIENT account be renamed to their own account name", async () => {
    // role 'user' is a client, not staff — their supplied name stands.
    const row = await post(staff({ role: "user", name: "Client Person" }), {
      authorType: "client",
      authorName: "Richard Feyh",
    });
    expect(row.authorName).toBe("Richard Feyh");
  });

  it("does not rewrite a CLIENT message even when staff are signed in", async () => {
    const row = await post(staff(), { authorType: "client", authorName: "Richard Feyh" });
    expect(row.authorName).toBe("Richard Feyh");
  });
});
