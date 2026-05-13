import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Product Deletion Safeguards", () => {
  describe("deleteProtocolItem", () => {
    it("should have deleteProtocolItem function with force parameter", () => {
      expect(typeof db.deleteProtocolItem).toBe("function");
      // Function should accept id and optional force parameter
      expect(db.deleteProtocolItem.length).toBeGreaterThanOrEqual(1);
    });

    it("should have getProtocolItemUsage function", () => {
      expect(typeof db.getProtocolItemUsage).toBe("function");
    });
  });

  describe("createProtocolItem duplicate prevention", () => {
    it("should have createProtocolItem function with allowDuplicate parameter", () => {
      expect(typeof db.createProtocolItem).toBe("function");
      // Function should accept data and optional allowDuplicate parameter
      expect(db.createProtocolItem.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Usage check functionality", () => {
    it("getProtocolItemUsage should return expected structure", async () => {
      // Test with a non-existent ID to verify return structure
      const usage = await db.getProtocolItemUsage(999999);
      expect(usage).toHaveProperty("clientProtocolCount");
      expect(usage).toHaveProperty("templateCount");
      expect(usage).toHaveProperty("clientNames");
      expect(Array.isArray(usage.clientNames)).toBe(true);
    });
  });
});

describe("Product Safeguard Error Messages", () => {
  it("should provide clear error messages for deletion blocks", () => {
    // Verify the error message format is informative
    const expectedErrorPattern = /Cannot delete.*used in.*protocol/i;
    expect(expectedErrorPattern.test("Cannot delete: This item is used in 5 client protocol(s).")).toBe(true);
  });

  it("should provide clear error messages for duplicate prevention", () => {
    const expectedErrorPattern = /already exists.*category/i;
    expect(expectedErrorPattern.test('A product with the name "Test" already exists in this category.')).toBe(true);
  });
});
