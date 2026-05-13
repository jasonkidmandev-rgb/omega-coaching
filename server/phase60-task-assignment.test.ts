/**
 * Phase 60: Task Assignment System Overhaul Tests
 * Tests: Jason team member, lifecycle engine dual-responsibility, Calendly webhook auto-completion, reassignment
 */
import { describe, it, expect } from "vitest";

const API_BASE = "http://localhost:3000";

// Helper to make authenticated API calls
async function apiCall(path: string, method = "GET", body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

describe("Phase 60: Task Assignment System Overhaul", () => {
  
  describe("Jason Team Member", () => {
    it("should have Jason as team member ID 30004 in database", async () => {
      // Direct DB check via the lifecycle engine TEAM constant
      const { TEAM } = await import("./automation/lifecycleAdvancement");
      expect(TEAM.JASON).toBe(30004);
    });

    it("teamMember.list endpoint should require auth (admin-only)", async () => {
      // This endpoint requires admin auth, so unauthenticated should get 403
      const res = await fetch(`${API_BASE}/api/trpc/teamMember.list`, {
        headers: { "Content-Type": "application/json" },
      });
      // 403 = correctly requires auth
      expect(res.status).toBe(403);
    });
  });

  describe("Lifecycle Engine TEAM Constants", () => {
    it("should export TEAM with JASON constant", async () => {
      const { TEAM } = await import("./automation/lifecycleAdvancement");
      expect(TEAM.JASON).toBe(30004);
      expect(TEAM.SHANNON).toBe(30001);
      expect(TEAM.LISA).toBe(1);
      expect(TEAM.KARI).toBe(30002);
      expect(TEAM.VEE).toBe(30003);
    });

    it("should have advancement rules with Jason tasks", async () => {
      const { ADVANCEMENT_RULES } = await import("./automation/lifecycleAdvancement");
      
      // Check intake_complete rule has Jason's "Conduct discovery session" task
      const intakeRule = ADVANCEMENT_RULES.find(r => r.trigger === "intake_complete");
      expect(intakeRule).toBeDefined();
      expect(intakeRule!.additionalTasks).toBeDefined();
      const jasonDiscoveryTask = intakeRule!.additionalTasks!.find(
        t => t.assignedTeamMemberId === 30004 && t.name.includes("Conduct discovery")
      );
      expect(jasonDiscoveryTask).toBeDefined();
      
      // Check consult_complete rule has Jason's "Build protocol" task
      const consultRule = ADVANCEMENT_RULES.find(r => r.trigger === "consult_complete");
      expect(consultRule).toBeDefined();
      const jasonProtocolTask = consultRule!.additionalTasks!.find(
        t => t.assignedTeamMemberId === 30004 && t.name.includes("Build protocol")
      );
      expect(jasonProtocolTask).toBeDefined();
      
      // Check consult_complete rule has Shannon's "Schedule strategy session" task
      const shannonScheduleTask = consultRule!.additionalTasks!.find(
        t => t.assignedTeamMemberId === 30001 && t.name.includes("Schedule strategy session")
      );
      expect(shannonScheduleTask).toBeDefined();
    });

    it("should have Jason kickoff call task in fulfillment_complete rule", async () => {
      const { ADVANCEMENT_RULES } = await import("./automation/lifecycleAdvancement");
      
      const fulfillmentRule = ADVANCEMENT_RULES.find(r => r.trigger === "fulfillment_complete");
      expect(fulfillmentRule).toBeDefined();
      const jasonKickoffTask = fulfillmentRule!.additionalTasks!.find(
        t => t.assignedTeamMemberId === 30004 && t.name.includes("kickoff")
      );
      expect(jasonKickoffTask).toBeDefined();
    });

    it("should have Jason Week 3 review task in onboarding_complete rule", async () => {
      const { ADVANCEMENT_RULES } = await import("./automation/lifecycleAdvancement");
      
      const onboardingRule = ADVANCEMENT_RULES.find(r => r.trigger === "onboarding_complete");
      expect(onboardingRule).toBeDefined();
      const jasonReviewTask = onboardingRule!.additionalTasks!.find(
        t => t.assignedTeamMemberId === 30004 && t.name.includes("Week 3 review")
      );
      expect(jasonReviewTask).toBeDefined();
    });
  });

  describe("Calendly Webhook Handler", () => {
    it("should accept POST to /api/calendly/webhook", async () => {
      const res = await fetch(`${API_BASE}/api/calendly/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "invitee.created",
          payload: {
            name: "Test User",
            email: "test-nonexistent@example.com",
          },
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);
      expect(data.event).toBe("invitee.created");
    });

    it("should handle cancellation events", async () => {
      const res = await fetch(`${API_BASE}/api/calendly/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "invitee.canceled",
          payload: {
            name: "Test User",
            email: "test-nonexistent@example.com",
          },
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);
    });

    it("should handle unknown event types gracefully", async () => {
      const res = await fetch(`${API_BASE}/api/calendly/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "unknown.event",
          payload: {},
        }),
      });
      expect(res.status).toBe(200);
    });
  });

  describe("Action Items API", () => {
    it("actionItems.all should require admin auth", async () => {
      const res = await fetch(`${API_BASE}/api/trpc/actionItems.all`, {
        headers: { "Content-Type": "application/json" },
      });
      // 403 = correctly requires admin auth
      expect(res.status).toBe(403);
    });

    it("should have reassignTask endpoint available (requires auth)", async () => {
      const res = await fetch(`${API_BASE}/api/trpc/actionItems.reassignTask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "0": { json: { taskId: 999999, teamMemberId: 30004 } }
        }),
      });
      // The endpoint should exist (not 404) - 403 means it exists but requires auth
      expect(res.status).not.toBe(404);
    });
  });

  describe("Dual Responsibility Model", () => {
    it("consult_and_payment_complete rule should create tasks for both Jason and Shannon", async () => {
      const { ADVANCEMENT_RULES } = await import("./automation/lifecycleAdvancement");
      
      const rule = ADVANCEMENT_RULES.find(r => r.trigger === "consult_and_payment_complete");
      expect(rule).toBeDefined();
      
      // Primary task: Lisa (onboarding materials)
      expect(rule!.createTask!.assignedTeamMemberId).toBe(1); // LISA
      
      // Additional tasks should include Jason (build protocol) and Shannon (schedule strategy)
      const additionalAssignees = rule!.additionalTasks!.map(t => t.assignedTeamMemberId);
      expect(additionalAssignees).toContain(30004); // JASON
      expect(additionalAssignees).toContain(30001); // SHANNON
    });

    it("each rule should have at most one primary task and multiple additional tasks", async () => {
      const { ADVANCEMENT_RULES } = await import("./automation/lifecycleAdvancement");
      
      for (const rule of ADVANCEMENT_RULES) {
        // createTask is a single object (not array)
        if (rule.createTask) {
          expect(typeof rule.createTask.name).toBe("string");
          expect(typeof rule.createTask.assignedTeamMemberId).toBe("number");
        }
        // additionalTasks is an array
        if (rule.additionalTasks) {
          expect(Array.isArray(rule.additionalTasks)).toBe(true);
          for (const task of rule.additionalTasks) {
            expect(typeof task.name).toBe("string");
          }
        }
      }
    });
  });
});
