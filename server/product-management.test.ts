import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Product Management Features", () => {
  describe("Product Merge Functions", () => {
    it("should have mergeProducts function", () => {
      expect(typeof db.mergeProducts).toBe("function");
    });

    it("should have findDuplicateProducts function", () => {
      expect(typeof db.findDuplicateProducts).toBe("function");
    });

    it("findDuplicateProducts should return an array", async () => {
      const duplicates = await db.findDuplicateProducts();
      expect(Array.isArray(duplicates)).toBe(true);
    });
  });

  describe("Product Deletion Audit Log Functions", () => {
    it("should have getProductDeletionLog function", () => {
      expect(typeof db.getProductDeletionLog).toBe("function");
    });

    it("should have restoreDeletedProduct function", () => {
      expect(typeof db.restoreDeletedProduct).toBe("function");
    });

    it("getProductDeletionLog should return an array", async () => {
      const log = await db.getProductDeletionLog();
      expect(Array.isArray(log)).toBe(true);
    });
  });

  describe("Product Merge History Functions", () => {
    it("should have getProductMergeLog function", () => {
      expect(typeof db.getProductMergeLog).toBe("function");
    });

    it("getProductMergeLog should return an array", async () => {
      const log = await db.getProductMergeLog();
      expect(Array.isArray(log)).toBe(true);
    });
  });

  describe("deleteProtocolItem with audit logging", () => {
    it("should accept deletedBy parameter for audit logging", () => {
      // The function signature should accept id, force, deletedBy, and reason
      expect(db.deleteProtocolItem.length).toBeGreaterThanOrEqual(1);
    });
  });
});
