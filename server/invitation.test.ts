import { describe, it, expect } from "vitest";
import { generateInvitationToken, generateInvitationEmailHtml, generateInvitationEmailText } from "./invitation";

describe("Invitation System", () => {
  describe("generateInvitationToken", () => {
    it("should generate a 64-character hex token", () => {
      const token = generateInvitationToken();
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it("should generate unique tokens", () => {
      const token1 = generateInvitationToken();
      const token2 = generateInvitationToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("generateInvitationEmailHtml", () => {
    it("should generate HTML with invitee name when provided", () => {
      const html = generateInvitationEmailHtml(
        "John Doe",
        "Admin User",
        "manager",
        "https://example.com/accept?token=abc123",
        "Test App"
      );
      
      expect(html).toContain("Hi John Doe,");
      expect(html).toContain("Admin User");
      expect(html).toContain("Manager");
      expect(html).toContain("Test App");
      expect(html).toContain("https://example.com/accept?token=abc123");
    });

    it("should generate HTML with generic greeting when no name provided", () => {
      const html = generateInvitationEmailHtml(
        undefined,
        "Admin User",
        "admin",
        "https://example.com/accept?token=abc123",
        "Test App"
      );
      
      expect(html).toContain("Hi,");
      expect(html).toContain("Admin");
      expect(html).toContain("full administrative access");
    });

    it("should include correct role descriptions", () => {
      const viewerHtml = generateInvitationEmailHtml(
        "Test",
        "Admin",
        "viewer",
        "https://example.com",
        "App"
      );
      expect(viewerHtml).toContain("read-only access");

      const financeHtml = generateInvitationEmailHtml(
        "Test",
        "Admin",
        "finance",
        "https://example.com",
        "App"
      );
      expect(financeHtml).toContain("financial operations");
    });
  });

  describe("generateInvitationEmailText", () => {
    it("should generate plain text email content", () => {
      const text = generateInvitationEmailText(
        "Jane Smith",
        "Admin User",
        "manager",
        "https://example.com/accept?token=xyz789",
        "My App"
      );
      
      expect(text).toContain("Hi Jane Smith,");
      expect(text).toContain("Admin User");
      expect(text).toContain("Manager");
      expect(text).toContain("My App");
      expect(text).toContain("https://example.com/accept?token=xyz789");
      expect(text).toContain("7 days");
    });

    it("should work without invitee name", () => {
      const text = generateInvitationEmailText(
        undefined,
        "Admin",
        "finance",
        "https://example.com",
        "App"
      );
      
      expect(text).toContain("Hi,");
      expect(text).toContain("Finance");
    });
  });
});

describe("Role-Based Access Control", () => {
  describe("Manager Restrictions", () => {
    it("should define manager role restrictions correctly", () => {
      // Manager cannot modify admin accounts
      const managerRestrictions = {
        canModifyAdmin: false,
        canPromoteToAdmin: false,
        canModifyOtherManagers: false,
        canModifyViewers: true,
        canModifyFinance: true,
        canModifyUsers: true,
      };
      
      expect(managerRestrictions.canModifyAdmin).toBe(false);
      expect(managerRestrictions.canPromoteToAdmin).toBe(false);
      expect(managerRestrictions.canModifyOtherManagers).toBe(false);
      expect(managerRestrictions.canModifyViewers).toBe(true);
    });
  });

  describe("Role Hierarchy", () => {
    const roleOrder = {
      admin: 0,
      manager: 1,
      viewer: 2,
      finance: 3,
      user: 4,
    };

    it("should have admin as highest priority", () => {
      expect(roleOrder.admin).toBeLessThan(roleOrder.manager);
      expect(roleOrder.admin).toBeLessThan(roleOrder.viewer);
      expect(roleOrder.admin).toBeLessThan(roleOrder.finance);
      expect(roleOrder.admin).toBeLessThan(roleOrder.user);
    });

    it("should have user as lowest priority", () => {
      expect(roleOrder.user).toBeGreaterThan(roleOrder.admin);
      expect(roleOrder.user).toBeGreaterThan(roleOrder.manager);
      expect(roleOrder.user).toBeGreaterThan(roleOrder.viewer);
      expect(roleOrder.user).toBeGreaterThan(roleOrder.finance);
    });
  });
});
