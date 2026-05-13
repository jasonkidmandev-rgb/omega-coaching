import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type UserRole = "admin" | "manager" | "viewer" | "finance" | "user";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContextWithRole(role: UserRole): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: `test-${role}-user`,
    email: `${role}@example.com`,
    name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)} User`,
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
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Role-Based Access Control", () => {
  // Note: category.list is a publicProcedure, so we test category.create which is adminProcedure
  describe("Admin Procedure Access (category.create)", () => {
    it("allows admin to access admin procedures", async () => {
      const ctx = createContextWithRole("admin");
      const caller = appRouter.createCaller(ctx);
      
      // Admin should be able to create categories (admin procedure)
      // We test that it doesn't throw a permission error
      try {
        await caller.category.create({ name: "Test Category" });
      } catch (e: unknown) {
        const error = e as Error;
        // Should not be a permission error - may fail for other reasons (duplicate, etc)
        expect(error.message).not.toContain("You do not have required permission");
      }
    });

    it("denies manager access to admin procedures", async () => {
      const ctx = createContextWithRole("manager");
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.category.create({ name: "Test Category" })
      ).rejects.toThrow("You do not have required permission");
    });

    it("denies viewer access to admin procedures", async () => {
      const ctx = createContextWithRole("viewer");
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.category.create({ name: "Test Category" })
      ).rejects.toThrow("You do not have required permission");
    });

    it("denies finance access to admin procedures", async () => {
      const ctx = createContextWithRole("finance");
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.category.create({ name: "Test Category" })
      ).rejects.toThrow("You do not have required permission");
    });

    it("denies regular user access to admin procedures", async () => {
      const ctx = createContextWithRole("user");
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.category.create({ name: "Test Category" })
      ).rejects.toThrow("You do not have required permission");
    });

    it("denies unauthenticated access to admin procedures", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.category.create({ name: "Test Category" })
      ).rejects.toThrow("You do not have required permission");
    });
  });

  describe("Viewer Procedure Access (users.list)", () => {
    it("allows admin to access viewer procedures", async () => {
      const ctx = createContextWithRole("admin");
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.users.list()).resolves.toBeDefined();
    });

    it("allows manager to access viewer procedures", async () => {
      const ctx = createContextWithRole("manager");
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.users.list()).resolves.toBeDefined();
    });

    it("allows viewer to access viewer procedures", async () => {
      const ctx = createContextWithRole("viewer");
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.users.list()).resolves.toBeDefined();
    });

    it("denies finance access to viewer procedures", async () => {
      const ctx = createContextWithRole("finance");
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.users.list()).rejects.toThrow("Viewer access required");
    });

    it("denies regular user access to viewer procedures", async () => {
      const ctx = createContextWithRole("user");
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.users.list()).rejects.toThrow("Viewer access required");
    });

    it("denies unauthenticated access to viewer procedures", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.users.list()).rejects.toThrow("Viewer access required");
    });
  });

  describe("Manager Procedure Access (users.updateRole)", () => {
    it("allows admin to access manager procedures", async () => {
      const ctx = createContextWithRole("admin");
      const caller = appRouter.createCaller(ctx);
      
      // Admin should be able to access manager procedures
      // We just test that it doesn't throw a permission error
      try {
        await caller.users.updateRole({ userId: 999999, role: "viewer" });
      } catch (e: unknown) {
        const error = e as Error;
        // Should not be a permission error
        expect(error.message).not.toContain("Manager access required");
      }
    });

    it("allows manager to access manager procedures", async () => {
      const ctx = createContextWithRole("manager");
      const caller = appRouter.createCaller(ctx);
      
      try {
        await caller.users.updateRole({ userId: 999999, role: "viewer" });
      } catch (e: unknown) {
        const error = e as Error;
        // Should not be a permission error
        expect(error.message).not.toContain("Manager access required");
      }
    });

    it("denies viewer access to manager procedures", async () => {
      const ctx = createContextWithRole("viewer");
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.users.updateRole({ userId: 1, role: "viewer" })
      ).rejects.toThrow("Manager access required");
    });

    it("denies finance access to manager procedures", async () => {
      const ctx = createContextWithRole("finance");
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.users.updateRole({ userId: 1, role: "viewer" })
      ).rejects.toThrow("Manager access required");
    });

    it("denies regular user access to manager procedures", async () => {
      const ctx = createContextWithRole("user");
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.users.updateRole({ userId: 1, role: "viewer" })
      ).rejects.toThrow("Manager access required");
    });

    it("denies unauthenticated access to manager procedures", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.users.updateRole({ userId: 1, role: "viewer" })
      ).rejects.toThrow("Manager access required");
    });
  });

  describe("Public Procedure Access", () => {
    it("allows any authenticated user to access auth.me", async () => {
      const roles: UserRole[] = ["admin", "manager", "viewer", "finance", "user"];
      
      for (const role of roles) {
        const ctx = createContextWithRole(role);
        const caller = appRouter.createCaller(ctx);
        
        const result = await caller.auth.me();
        expect(result).toBeDefined();
        expect(result?.role).toBe(role);
      }
    });

    it("returns null for unauthenticated auth.me (public procedure)", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.auth.me();
      expect(result).toBeNull();
    });

    it("allows any user to access category.list (public procedure)", async () => {
      const roles: UserRole[] = ["admin", "manager", "viewer", "finance", "user"];
      
      for (const role of roles) {
        const ctx = createContextWithRole(role);
        const caller = appRouter.createCaller(ctx);
        
        await expect(caller.category.list()).resolves.toBeDefined();
      }
    });

    it("allows unauthenticated access to category.list (public procedure)", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.category.list()).resolves.toBeDefined();
    });
  });

  describe("Role Hierarchy", () => {
    it("admin has access to all procedure types", async () => {
      const ctx = createContextWithRole("admin");
      const caller = appRouter.createCaller(ctx);
      
      // Public procedures
      await expect(caller.category.list()).resolves.toBeDefined();
      // Viewer procedures
      await expect(caller.users.list()).resolves.toBeDefined();
      // Auth
      const me = await caller.auth.me();
      expect(me?.role).toBe("admin");
    });

    it("manager has limited access compared to admin", async () => {
      const ctx = createContextWithRole("manager");
      const caller = appRouter.createCaller(ctx);
      
      // Public procedures - allowed
      await expect(caller.category.list()).resolves.toBeDefined();
      // Viewer procedures - allowed
      await expect(caller.users.list()).resolves.toBeDefined();
      // Auth - allowed
      const me = await caller.auth.me();
      expect(me?.role).toBe("manager");
      
      // Admin procedures - denied
      await expect(
        caller.category.create({ name: "Test" })
      ).rejects.toThrow("You do not have required permission");
    });

    it("viewer has read-only access", async () => {
      const ctx = createContextWithRole("viewer");
      const caller = appRouter.createCaller(ctx);
      
      // Public procedures - allowed
      await expect(caller.category.list()).resolves.toBeDefined();
      // Viewer procedures - allowed
      await expect(caller.users.list()).resolves.toBeDefined();
      // Auth - allowed
      const me = await caller.auth.me();
      expect(me?.role).toBe("viewer");
      
      // Admin procedures - denied
      await expect(
        caller.category.create({ name: "Test" })
      ).rejects.toThrow("You do not have required permission");
      // Manager procedures - denied
      await expect(
        caller.users.updateRole({ userId: 1, role: "viewer" })
      ).rejects.toThrow("Manager access required");
    });

    it("finance has specialized access", async () => {
      const ctx = createContextWithRole("finance");
      const caller = appRouter.createCaller(ctx);
      
      // Public procedures - allowed
      await expect(caller.category.list()).resolves.toBeDefined();
      // Auth - allowed
      const me = await caller.auth.me();
      expect(me?.role).toBe("finance");
      
      // Admin procedures - denied
      await expect(
        caller.category.create({ name: "Test" })
      ).rejects.toThrow("You do not have required permission");
      // Manager procedures - denied
      await expect(
        caller.users.updateRole({ userId: 1, role: "viewer" })
      ).rejects.toThrow("Manager access required");
      // Viewer procedures - denied (finance is not in viewer hierarchy)
      await expect(caller.users.list()).rejects.toThrow("Viewer access required");
    });

    it("regular user has minimal access", async () => {
      const ctx = createContextWithRole("user");
      const caller = appRouter.createCaller(ctx);
      
      // Public procedures - allowed
      await expect(caller.category.list()).resolves.toBeDefined();
      // Auth - allowed
      const me = await caller.auth.me();
      expect(me?.role).toBe("user");
      
      // All elevated procedures - denied
      await expect(
        caller.category.create({ name: "Test" })
      ).rejects.toThrow("You do not have required permission");
      await expect(
        caller.users.updateRole({ userId: 1, role: "viewer" })
      ).rejects.toThrow("Manager access required");
      await expect(caller.users.list()).rejects.toThrow("Viewer access required");
    });
  });

  describe("Manager Role Restrictions", () => {
    it("manager cannot promote user to admin", async () => {
      const ctx = createContextWithRole("manager");
      const caller = appRouter.createCaller(ctx);
      
      // This should fail with a business logic error, not permission error
      await expect(
        caller.users.updateRole({ userId: 2, role: "admin" })
      ).rejects.toThrow("Managers cannot promote users to admin");
    });
  });
});
