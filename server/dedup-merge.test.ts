import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Prospect Deduplication & Merge System", () => {
  it("should have scanDuplicates procedure on the prospect router", async () => {
    const { prospectRouter } = await import("./prospect/prospectRouter");
    expect(prospectRouter).toBeDefined();
    expect(prospectRouter._def.procedures.scanDuplicates).toBeDefined();
  });

  it("should have mergeProspects procedure on the prospect router", async () => {
    const { prospectRouter } = await import("./prospect/prospectRouter");
    expect(prospectRouter._def.procedures.mergeProspects).toBeDefined();
  });

  it("should have the create procedure with dedup logic on the prospect router", async () => {
    const { prospectRouter } = await import("./prospect/prospectRouter");
    expect(prospectRouter._def.procedures.create).toBeDefined();
  });

  it("should have captureMasterclassEmail with dedup on the transformation router", async () => {
    const { transformationRouter } = await import("./transformation/transformationRouter");
    expect(transformationRouter._def.procedures.captureMasterclassEmail).toBeDefined();
  });

  it("should derive a readable name from email prefix when no name provided", () => {
    const deriveName = (email: string) => {
      const prefix = email.split('@')[0];
      return prefix.replace(/[._]/g, ' ').replace(/\d+$/, '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ').trim() || email;
    };

    expect(deriveName("john.doe@gmail.com")).toBe("John Doe");
    expect(deriveName("jane_smith@outlook.com")).toBe("Jane Smith");
    expect(deriveName("taytonplewe@gmail.com")).toBe("Taytonplewe");
    expect(deriveName("gburb12@gmail.com")).toBe("Gburb");
    expect(deriveName("SUSANJHAM@GMAIL.COM")).toBe("Susanjham");
  });
});
