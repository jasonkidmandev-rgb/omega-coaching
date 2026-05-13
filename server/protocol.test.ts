import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getAllCategories: vi.fn().mockResolvedValue([
    { id: 1, name: "Wolverine Stack 2.0", description: "Healing and recovery peptides", sortOrder: 1 },
    { id: 2, name: "Cognition / Mental Energy / Sleep", description: "Nootropics and sleep support", sortOrder: 2 },
  ]),
  getAllProtocolItems: vi.fn().mockResolvedValue([
    { id: 1, categoryId: 1, name: "BPC157 Acetate 10MG", price: "95", defaultQty: 4, itemType: "peptide" },
    { id: 2, categoryId: 2, name: "Semax Amidate", price: "85", defaultQty: 0, itemType: "peptide" },
  ]),
  getAllTemplates: vi.fn().mockResolvedValue([
    { id: 1, name: "Master Template", description: "Default master template", durationMonths: 3, isDefault: true },
  ]),
  getAllClientProtocols: vi.fn().mockResolvedValue([
    { id: 1, clientName: "John Doe", clientEmail: "john@example.com", status: "draft", durationMonths: 3, accessToken: "abc123" },
  ]),
  getClientProtocolByToken: vi.fn().mockImplementation((token: string) => {
    if (token === "abc123") {
      return Promise.resolve({
        id: 1,
        clientName: "John Doe",
        clientEmail: "john@example.com",
        status: "pending_approval",
        durationMonths: 3,
        accessToken: "abc123",
      });
    }
    return Promise.resolve(null);
  }),
  updateClientProtocol: vi.fn().mockResolvedValue(undefined),
  getAllRequirements: vi.fn().mockResolvedValue([
    { id: 1, text: "Drink body weight in OZ of water per day minimum", isDefault: true, sortOrder: 1 },
    { id: 2, text: "Limit alcohol & sugar as much as possible", isDefault: true, sortOrder: 2 },
  ]),
  createNotificationsForEnabledUsers: vi.fn().mockResolvedValue(undefined),
  deductInventoryForProtocol: vi.fn().mockResolvedValue([]),
  getSiteSetting: vi.fn().mockResolvedValue(null),
  trackProtocolView: vi.fn().mockResolvedValue(undefined),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Category Router", () => {
  it("lists all categories (public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const categories = await caller.category.list();

    expect(categories).toHaveLength(2);
    expect(categories[0].name).toBe("Wolverine Stack 2.0");
  });
});

describe("Protocol Item Router", () => {
  it("lists all protocol items (public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const items = await caller.protocolItem.list();

    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("BPC157 Acetate 10MG");
    expect(items[0].price).toBe("95");
  });
});

describe("Template Router", () => {
  it("lists all templates (admin only)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const templates = await caller.template.list();

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe("Master Template");
    expect(templates[0].isDefault).toBe(true);
  });

  it("rejects template list for non-admin users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.template.list()).rejects.toThrow();
  });
});

describe("Client Protocol Router", () => {
  it("gets protocol by token (public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const protocol = await caller.clientProtocol.getByToken({ token: "abc123" });

    expect(protocol).not.toBeNull();
    expect(protocol?.clientName).toBe("John Doe");
    expect(protocol?.status).toBe("pending_approval");
  });

  it("returns null for invalid token", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const protocol = await caller.clientProtocol.getByToken({ token: "invalid" });

    expect(protocol).toBeNull();
  });

  it("lists all client protocols (admin only)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const protocols = await caller.clientProtocol.list();

    expect(protocols).toHaveLength(1);
    expect(protocols[0].clientName).toBe("John Doe");
  });

  it("rejects client list for non-admin users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.clientProtocol.list()).rejects.toThrow();
  });
});

describe("Requirements Router", () => {
  it("lists all requirements (public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const requirements = await caller.requirements.list();

    expect(requirements).toHaveLength(2);
    expect(requirements[0].text).toContain("water");
    expect(requirements[0].isDefault).toBe(true);
  });
});

describe("Protocol Approval", () => {
  it("approves a protocol by token", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.clientProtocol.approve({ token: "abc123" });

    expect(result.success).toBe(true);
  });

  it("fails to approve with invalid token", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.clientProtocol.approve({ token: "invalid" })).rejects.toThrow("Protocol not found");
  });
});
