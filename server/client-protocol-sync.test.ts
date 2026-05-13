import { describe, it, expect } from "vitest";
import {
  getTemplateItems,
  getClientProtocolItems,
  updateClientProtocolItem,
  addClientProtocolItem,
  addTemplateItem,
} from "./db";

describe("Client Protocol Sync and Add Item Features", () => {
  describe("Database functions exist", () => {
    it("should have getTemplateItems function", () => {
      expect(typeof getTemplateItems).toBe("function");
    });

    it("should have getClientProtocolItems function", () => {
      expect(typeof getClientProtocolItems).toBe("function");
    });

    it("should have updateClientProtocolItem function", () => {
      expect(typeof updateClientProtocolItem).toBe("function");
    });

    it("should have addClientProtocolItem function", () => {
      expect(typeof addClientProtocolItem).toBe("function");
    });

    it("should have addTemplateItem function", () => {
      expect(typeof addTemplateItem).toBe("function");
    });
  });

  describe("Template getItems functionality", () => {
    it("should return an array when fetching template items", async () => {
      // Get template items for Master Template (ID: 1)
      const templateItems = await getTemplateItems(1);
      expect(Array.isArray(templateItems)).toBe(true);
    });
  });
});
