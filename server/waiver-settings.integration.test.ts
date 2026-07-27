import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("waiver router", () => {
  describe("waiver.check", () => {
    it("should check waiver status for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const status = await caller.waiver.check();
      expect(typeof status.hasSignedWaiver).toBe("boolean");
    });
  });

  describe("waiver.sign", () => {
    it("should sign a waiver for authenticated user with all required fields", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.waiver.sign({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "555-1234",
        signatureData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.firstName).toBe("John");
      expect(result.lastName).toBe("Doe");
    });
  });

  describe("waiver.list", () => {
    it("should list waivers for admin user", async () => {
      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);

      const waivers = await caller.waiver.list();
      expect(Array.isArray(waivers)).toBe(true);
    });
  });
});

describe("settings router", () => {
  describe("settings.get", () => {
    it("should get a setting value", async () => {
      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);

      // First set a value
      await caller.settings.set({
        key: "test_setting",
        value: "test_value",
      });

      // Then get it
      const value = await caller.settings.get({ key: "test_setting" });
      expect(value).toBe("test_value");
    });

    it("should return null for non-existent setting", async () => {
      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);

      const value = await caller.settings.get({ key: "non_existent_setting_xyz_12345" });
      expect(value).toBeNull();
    });
  });

  describe("settings.set", () => {
    it("should set a setting value as admin", async () => {
      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.settings.set({
        key: "age_disclaimer_enabled",
        value: "true",
      });

      expect(result.success).toBe(true);
    });
  });
});

describe("ageDisclaimer router", () => {
  describe("ageDisclaimer.check", () => {
    it("should check age verification status with visitor ID", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const status = await caller.ageDisclaimer.check({ visitorId: "test-visitor-123" });
      expect(typeof status.hasAgreed).toBe("boolean");
    });
  });

  describe("ageDisclaimer.agree", () => {
    it("should record age agreement for visitor", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ageDisclaimer.agree({ visitorId: "test-visitor-456" });
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it("should show agreed status after agreement", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      const visitorId = "test-visitor-789";

      // Agree first
      await caller.ageDisclaimer.agree({ visitorId });

      // Check status
      const status = await caller.ageDisclaimer.check({ visitorId });
      expect(status.hasAgreed).toBe(true);
    });
  });
});
