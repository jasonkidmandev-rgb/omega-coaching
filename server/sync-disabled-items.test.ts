import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Tests for Sync Now behavior: newly synced items should be added as disabled.
 * 
 * When a client protocol is out of sync with the master template,
 * clicking "Sync Now" should add missing items with isIncluded=false
 * and isRecommended=false so they don't disrupt existing protocol work.
 */

describe("Sync With Master Template - Items Added as Disabled", () => {
  const routersPath = path.join(process.cwd(), "server/routers.ts");
  let routersContent: string;

  it("should have the routers file", () => {
    routersContent = fs.readFileSync(routersPath, "utf-8");
    expect(routersContent).toBeTruthy();
  });

  it("should have syncWithMasterTemplate mutation", () => {
    expect(routersContent).toContain("syncWithMasterTemplate");
  });

  it("should add new items with isIncluded: false", () => {
    // Find the syncWithMasterTemplate section
    const syncStart = routersContent.indexOf("syncWithMasterTemplate:");
    const syncSection = routersContent.substring(syncStart, syncStart + 2000);
    
    // The addClientProtocolItem call within sync should use isIncluded: false
    expect(syncSection).toContain("isIncluded: false");
  });

  it("should add new items with isRecommended: false", () => {
    const syncStart = routersContent.indexOf("syncWithMasterTemplate:");
    const syncSection = routersContent.substring(syncStart, syncStart + 2000);
    
    // The addClientProtocolItem call within sync should use isRecommended: false
    expect(syncSection).toContain("isRecommended: false");
  });

  it("should NOT add items with isIncluded: true in sync", () => {
    const syncStart = routersContent.indexOf("syncWithMasterTemplate:");
    const syncEnd = routersContent.indexOf("return { success: true, addedCount", syncStart);
    const syncSection = routersContent.substring(syncStart, syncEnd);
    
    // Should not have isIncluded: true in the sync section
    expect(syncSection).not.toContain("isIncluded: true");
  });

  it("should only add items that are missing (not modify existing)", () => {
    const syncStart = routersContent.indexOf("syncWithMasterTemplate:");
    const syncSection = routersContent.substring(syncStart, syncStart + 2000);
    
    // Should check existingItemIds before adding
    expect(syncSection).toContain("existingItemIds.has");
    // Should skip items that already exist
    expect(syncSection).toContain("!existingItemIds.has(templateItem.protocolItemId)");
  });

  it("should preserve template quantity and sortOrder for new items", () => {
    const syncStart = routersContent.indexOf("syncWithMasterTemplate:");
    const syncSection = routersContent.substring(syncStart, syncStart + 2000);
    
    expect(syncSection).toContain("quantity: templateItem.quantity");
    expect(syncSection).toContain("sortOrder: templateItem.sortOrder");
  });

  it("should log the sync action for audit", () => {
    const syncStart = routersContent.indexOf("syncWithMasterTemplate:");
    const syncSection = routersContent.substring(syncStart, syncStart + 2000);
    
    expect(syncSection).toContain("protocol_sync");
    expect(syncSection).toContain("logAuditEvent");
  });
});
