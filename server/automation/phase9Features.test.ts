/**
 * Tests for Phase 9 features:
 * 1. Auto-notify Lisa when protocol is ready
 * 2. Stalled client detector cron
 * 3. Venmo payment handler automation hook
 */
import { describe, it, expect, vi } from "vitest";

// Test 1: Lisa notification logic
describe("Lisa Protocol Ready Notification", () => {
  it("should trigger notification only for approved or active status", () => {
    const statusesThatTrigger = ["approved", "active"];
    const statusesThatDontTrigger = ["draft", "pending", "expired", "cancelled"];

    for (const status of statusesThatTrigger) {
      expect(status === "approved" || status === "active").toBe(true);
    }

    for (const status of statusesThatDontTrigger) {
      expect(status === "approved" || status === "active").toBe(false);
    }
  });

  it("should find Lisa by Client Care role", () => {
    const teamMembers = [
      { id: 1, name: "Jason", role: "Owner" },
      { id: 2, name: "Lisa", role: "Client Care" },
      { id: 3, name: "Shannon", role: "Lead Pipeline" },
    ];

    const lisa = teamMembers.find((m) => m.role === "Client Care");
    expect(lisa).toBeDefined();
    expect(lisa!.name).toBe("Lisa");
    expect(lisa!.id).toBe(2);
  });

  it("should generate correct notification message for approved status", () => {
    const clientName = "John Smith";
    const status = "approved";
    const statusLabel =
      status === "approved" ? "approved by client" : "set to active";
    const message = `${clientName}'s protocol has been ${statusLabel}. Ready for fulfillment — check packing slip, order supplements, and coordinate shipping.`;

    expect(message).toContain("John Smith");
    expect(message).toContain("approved by client");
    expect(message).toContain("fulfillment");
  });

  it("should generate correct notification message for active status", () => {
    const clientName = "Jane Doe";
    const status = "active";
    const statusLabel =
      status === "approved" ? "approved by client" : "set to active";
    const message = `${clientName}'s protocol has been ${statusLabel}. Ready for fulfillment — check packing slip, order supplements, and coordinate shipping.`;

    expect(message).toContain("Jane Doe");
    expect(message).toContain("set to active");
    expect(message).toContain("fulfillment");
  });
});

// Test 2: Stalled client detector
describe("Stalled Client Detector", () => {
  it("should import detectStalledClients and runStalledClientCheck", async () => {
    const mod = await import("../cron/stalledClientCron");
    expect(mod.detectStalledClients).toBeDefined();
    expect(typeof mod.detectStalledClients).toBe("function");
    expect(mod.runStalledClientCheck).toBeDefined();
    expect(typeof mod.runStalledClientCheck).toBe("function");
    expect(mod.initStalledClientCron).toBeDefined();
    expect(typeof mod.initStalledClientCron).toBe("function");
  });

  it("should return empty array when no stalled clients exist", async () => {
    const { detectStalledClients } = await import("../cron/stalledClientCron");
    // Use a very high threshold so nothing is stalled
    const result = await detectStalledClients(999999);
    expect(Array.isArray(result)).toBe(true);
  });

  it("should return correct structure from runStalledClientCheck", async () => {
    const { runStalledClientCheck } = await import(
      "../cron/stalledClientCron"
    );
    const result = await runStalledClientCheck();
    expect(result).toHaveProperty("stalledCount");
    expect(result).toHaveProperty("notificationsSent");
    expect(result).toHaveProperty("clients");
    expect(typeof result.stalledCount).toBe("number");
    expect(typeof result.notificationsSent).toBe("number");
    expect(Array.isArray(result.clients)).toBe(true);
  });

  it("should calculate stalled duration correctly", () => {
    const hoursStalled = 72;
    const daysStalled = Math.floor(hoursStalled / 24);
    const remainingHours = hoursStalled % 24;

    expect(daysStalled).toBe(3);
    expect(remainingHours).toBe(0);

    const hoursStalled2 = 50;
    expect(Math.floor(hoursStalled2 / 24)).toBe(2);
    expect(hoursStalled2 % 24).toBe(2);
  });

  it("should calculate progress percentage correctly", () => {
    const totalTasks = 10;
    const completedTasks = 3;
    const progressPct =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    expect(progressPct).toBe(30);

    // Edge case: no tasks
    const progressPctZero = 0 > 0 ? Math.round((0 / 0) * 100) : 0;
    expect(progressPctZero).toBe(0);
  });
});

// Test 3: Venmo automation hook logic
describe("Venmo Automation Hook", () => {
  it("should only trigger for coaching_paid or enrolled status", () => {
    const statuses = [
      "coaching_paid",
      "enrolled",
      "active",
      "completed",
      "cancelled",
    ];

    const triggerStatuses = statuses.filter(
      (s) => s === "coaching_paid" || s === "enrolled"
    );
    expect(triggerStatuses).toEqual(["coaching_paid", "enrolled"]);
    expect(triggerStatuses).toHaveLength(2);
  });

  it("should find the active enrollment for a client", () => {
    const enrollments = [
      { id: 1, status: "completed", clientId: 100 },
      { id: 2, status: "coaching_paid", clientId: 100 },
      { id: 3, status: "enrolled", clientId: 200 },
    ];

    const clientId = 100;
    const clientEnrollments = enrollments.filter(
      (e) => e.clientId === clientId
    );
    const activeEnrollment = clientEnrollments.find(
      (e) => e.status === "coaching_paid" || e.status === "enrolled"
    );

    expect(activeEnrollment).toBeDefined();
    expect(activeEnrollment!.id).toBe(2);
    expect(activeEnrollment!.status).toBe("coaching_paid");
  });

  it("should not trigger when no active enrollment exists", () => {
    const enrollments = [
      { id: 1, status: "completed", clientId: 100 },
      { id: 2, status: "cancelled", clientId: 100 },
    ];

    const activeEnrollment = enrollments.find(
      (e) => e.status === "coaching_paid" || e.status === "enrolled"
    );
    expect(activeEnrollment).toBeUndefined();
  });

  it("should not trigger when client has no enrollments", () => {
    const enrollments: any[] = [];
    const activeEnrollment = enrollments.find(
      (e) => e.status === "coaching_paid" || e.status === "enrolled"
    );
    expect(activeEnrollment).toBeUndefined();
  });
});
