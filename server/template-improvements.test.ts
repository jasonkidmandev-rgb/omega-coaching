import { describe, it, expect, vi } from "vitest";
import * as db from "./db";

describe("Template Improvements", () => {
  describe("Auto-add to templates", () => {
    it("should have addTemplateItem function available", () => {
      expect(typeof db.addTemplateItem).toBe("function");
    });
  });

  describe("Template item recommended status", () => {
    it("should have getTemplateItems function available", () => {
      expect(typeof db.getTemplateItems).toBe("function");
    });
  });

  describe("Protocol item creation", () => {
    it("should have createProtocolItem function available", () => {
      expect(typeof db.createProtocolItem).toBe("function");
    });
  });
});
