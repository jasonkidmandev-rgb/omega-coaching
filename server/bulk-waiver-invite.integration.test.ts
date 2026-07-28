import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Bulk Waiver Management Functions", () => {
  it("should have getAllWaiversWithRenewalCount function", async () => {
    const waivers = await db.getAllWaiversWithRenewalCount();
    expect(Array.isArray(waivers)).toBe(true);
    
    // Check that waivers have renewalCount property
    if (waivers.length > 0) {
      expect(waivers[0]).toHaveProperty("renewalCount");
      expect(typeof waivers[0].renewalCount).toBe("number");
    }
  });

  it("should have getWaiverRenewalHistory function", async () => {
    // Test with a non-existent waiver ID
    const history = await db.getWaiverRenewalHistory(999999);
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(0);
  });

  it("should have updateStoreWaiver function", async () => {
    expect(typeof db.updateStoreWaiver).toBe("function");
  });

  it("should have deleteStoreWaiver function", async () => {
    expect(typeof db.deleteStoreWaiver).toBe("function");
  });
});

describe("Invite Tracking Functions", () => {
  it("should have getClientProtocolByEmail function", async () => {
    // Test with non-existent email
    const client = await db.getClientProtocolByEmail("nonexistent@example.com");
    expect(client).toBeNull();
  });

  it("should have updateClientProtocol function", async () => {
    expect(typeof db.updateClientProtocol).toBe("function");
  });
});

describe("Waiver Expiration Settings", () => {
  it("should get and set waiver expiration months setting", async () => {
    // Get current setting
    const originalSetting = await db.getSiteSetting("waiver_expiration_months");
    
    // Set custom expiration
    await db.setSiteSetting("waiver_expiration_months", "18");
    
    const setting = await db.getSiteSetting("waiver_expiration_months");
    expect(setting).toBe("18");
    
    // Reset to original or default
    await db.setSiteSetting("waiver_expiration_months", originalSetting || "12");
  });
});

describe("Renewal History Functions", () => {
  it("should have renewStoreWaiver function", async () => {
    expect(typeof db.renewStoreWaiver).toBe("function");
  });
});
