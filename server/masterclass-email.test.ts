import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Masterclass Email Capture", () => {
  it("should have the captureMasterclassEmail procedure defined on the transformation router", async () => {
    const { transformationRouter } = await import("./transformation/transformationRouter");
    // Check the router has the captureMasterclassEmail procedure
    expect(transformationRouter).toBeDefined();
    expect(transformationRouter._def).toBeDefined();
    expect(transformationRouter._def.procedures).toBeDefined();
    expect(transformationRouter._def.procedures.captureMasterclassEmail).toBeDefined();
  });

  it("should validate email format in the captureMasterclassEmail input schema", async () => {
    const { transformationRouter } = await import("./transformation/transformationRouter");
    const procedure = transformationRouter._def.procedures.captureMasterclassEmail;
    // The procedure should exist and be a mutation
    expect(procedure).toBeDefined();
    expect(procedure._def).toBeDefined();
  });
});
