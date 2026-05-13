/**
 * Workflow Phase 2 Crons - Unit Tests
 * 
 * Tests the 4 new cron jobs:
 * 1. Post-Discovery Follow-Up Cron
 * 2. Strategy Session Monitor Cron
 * 3. Backorder & Tracking Cron
 * 4. Task Escalation Cron
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => {
  const mockDb = {
    execute: vi.fn().mockResolvedValue([[]]),
  };
  return {
    getDb: vi.fn().mockResolvedValue(mockDb),
    createProjectTask: vi.fn().mockResolvedValue(1),
    notifyTaskAssignment: vi.fn().mockResolvedValue(undefined),
    createTeamNotification: vi.fn().mockResolvedValue(undefined),
    createNotificationsForEnabledUsers: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray, ...values: any[]) => ({
    strings,
    values,
    queryChunks: [],
  }),
}));

// Mock schema
vi.mock("../drizzle/schema", () => ({
  projectTasks: {},
  clientProjects: {},
  teamNotifications: {},
}));

describe("Post-Discovery Follow-Up Cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export runPostDiscoveryCheck function", async () => {
    const mod = await import("./cron/postDiscoveryFollowUpCron");
    expect(typeof mod.runPostDiscoveryCheck).toBe("function");
  });

  it("should export initPostDiscoveryFollowUpCron function", async () => {
    const mod = await import("./cron/postDiscoveryFollowUpCron");
    expect(typeof mod.initPostDiscoveryFollowUpCron).toBe("function");
  });

  it("should return { found: 0, tasksCreated: 0 } when no unconverted sessions found", async () => {
    const { runPostDiscoveryCheck } = await import("./cron/postDiscoveryFollowUpCron");
    const result = await runPostDiscoveryCheck();
    expect(result).toEqual({ found: 0, tasksCreated: 0 });
  });

  it("should create tasks and notifications when unconverted sessions found", async () => {
    const db = await import("./db");
    const mockDatabase = await (db.getDb as any)();
    
    // Mock finding unconverted sessions
    mockDatabase.execute
      .mockResolvedValueOnce([[{
        enrollmentId: 1,
        clientName: "Test Client",
        email: "test@example.com",
        phone: "555-1234",
        tier: "flagship",
        discoveryCompletedAt: "2026-04-15 10:00:00",
        hoursSinceDiscovery: 72,
        clientProjectId: 100,
      }]])
      .mockResolvedValue([[]]); // For automation_events insert

    const { runPostDiscoveryCheck } = await import("./cron/postDiscoveryFollowUpCron");
    const result = await runPostDiscoveryCheck();
    
    expect(result.found).toBe(1);
    expect(result.tasksCreated).toBe(1);
    expect(db.createProjectTask).toHaveBeenCalledWith(
      expect.objectContaining({
        clientProjectId: 100,
        assignedTeamMemberId: 30001, // Shannon
        isRequired: true,
      })
    );
    expect(db.notifyTaskAssignment).toHaveBeenCalled();
    expect(db.createTeamNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        teamMemberId: 30001, // Shannon
        type: "task_assigned",
      })
    );
  });
});

describe("Strategy Session Monitor Cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export runStrategySessionCheck function", async () => {
    const mod = await import("./cron/strategySessionMonitorCron");
    expect(typeof mod.runStrategySessionCheck).toBe("function");
  });

  it("should export initStrategySessionMonitorCron function", async () => {
    const mod = await import("./cron/strategySessionMonitorCron");
    expect(typeof mod.initStrategySessionMonitorCron).toBe("function");
  });

  it("should return zeros when no unscheduled or stuck clients found", async () => {
    const { runStrategySessionCheck } = await import("./cron/strategySessionMonitorCron");
    const result = await runStrategySessionCheck();
    expect(result).toEqual({ unscheduled: 0, stuck: 0, tasksCreated: 0 });
  });

  it("should create tasks for paid clients without scheduled sessions", async () => {
    const db = await import("./db");
    const mockDatabase = await (db.getDb as any)();
    
    // First call: unscheduled clients
    mockDatabase.execute
      .mockResolvedValueOnce([[{
        enrollmentId: 2,
        clientName: "Paid Client",
        email: "paid@example.com",
        phone: "555-5678",
        tier: "elite",
        coachingFeePaidAt: "2026-04-14 10:00:00",
        hoursSincePayment: 96,
        clientProjectId: 200,
        status: "coaching_paid",
      }]])
      .mockResolvedValue([[]]); // For automation_events and stuck check

    const { runStrategySessionCheck } = await import("./cron/strategySessionMonitorCron");
    const result = await runStrategySessionCheck();
    
    expect(result.unscheduled).toBe(1);
    expect(db.createProjectTask).toHaveBeenCalledWith(
      expect.objectContaining({
        clientProjectId: 200,
        assignedTeamMemberId: 30001, // Shannon
      })
    );
  });
});

describe("Backorder & Tracking Cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export runBackorderAndTrackingCheck function", async () => {
    const mod = await import("./cron/backorderAndTrackingCron");
    expect(typeof mod.runBackorderAndTrackingCheck).toBe("function");
  });

  it("should export initBackorderAndTrackingCron function", async () => {
    const mod = await import("./cron/backorderAndTrackingCron");
    expect(typeof mod.initBackorderAndTrackingCron).toBe("function");
  });

  it("should return zeros when no backorders or tracking updates found", async () => {
    const { runBackorderAndTrackingCheck } = await import("./cron/backorderAndTrackingCron");
    const result = await runBackorderAndTrackingCheck();
    expect(result).toEqual({ backordersFound: 0, backorderTasksCreated: 0, trackingNotifications: 0 });
  });

  it("should create tasks for backordered items", async () => {
    const db = await import("./db");
    const mockDatabase = await (db.getDb as any)();
    
    // First call: backorder items
    mockDatabase.execute
      .mockResolvedValueOnce([[{
        itemId: 10,
        itemName: "BPC-157",
        quantity: 2,
        quantityBackordered: 1,
        shipSource: "vendor",
        packingSlipId: 50,
        clientName: "Backorder Client",
        clientEmail: "backorder@example.com",
        slipId: 50,
        slipStatus: "partial",
        clientProjectId: 300,
        clientProtocolId: 400,
      }]])
      .mockResolvedValue([[]]); // For automation_events and tracking checks

    const { runBackorderAndTrackingCheck } = await import("./cron/backorderAndTrackingCron");
    const result = await runBackorderAndTrackingCheck();
    
    expect(result.backordersFound).toBe(1);
    expect(result.backorderTasksCreated).toBe(2); // One for Carrie, one for Lisa
    expect(db.createProjectTask).toHaveBeenCalledTimes(2);
    // Carrie's reorder task
    expect(db.createProjectTask).toHaveBeenCalledWith(
      expect.objectContaining({
        assignedTeamMemberId: 30002, // Carrie
        clientProjectId: 300,
      })
    );
    // Lisa's notification task
    expect(db.createProjectTask).toHaveBeenCalledWith(
      expect.objectContaining({
        assignedTeamMemberId: 1, // Lisa
        clientProjectId: 300,
      })
    );
  });

  it("should notify team about new tracking numbers", async () => {
    const db = await import("./db");
    const mockDatabase = await (db.getDb as any)();
    
    // No backorders, but tracking updates
    mockDatabase.execute
      .mockResolvedValueOnce([[]]) // No backorders
      .mockResolvedValueOnce([[{
        slipId: 60,
        clientName: "Tracking Client",
        clientEmail: "tracking@example.com",
        trackingNumber: "1Z999AA10123456784",
        trackingCarrier: "UPS",
        trackingUrl: "https://ups.com/track/1Z999AA10123456784",
        deliveryStatus: "shipped",
        clientProjectId: 500,
      }]])
      .mockResolvedValue([[]]); // For automation_events and item tracking

    const { runBackorderAndTrackingCheck } = await import("./cron/backorderAndTrackingCron");
    const result = await runBackorderAndTrackingCheck();
    
    expect(result.trackingNotifications).toBe(1);
    // Should notify Lisa and Shannon
    expect(db.createTeamNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        teamMemberId: 1, // Lisa
        title: expect.stringContaining("Tracking Added"),
      })
    );
    expect(db.createTeamNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        teamMemberId: 30001, // Shannon
        title: expect.stringContaining("Order Shipped"),
      })
    );
  });
});

describe("Task Escalation Cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export runTaskEscalation function", async () => {
    const mod = await import("./cron/taskEscalationCron");
    expect(typeof mod.runTaskEscalation).toBe("function");
  });

  it("should export initTaskEscalationCron function", async () => {
    const mod = await import("./cron/taskEscalationCron");
    expect(typeof mod.initTaskEscalationCron).toBe("function");
  });

  it("should return zeros when no overdue tasks found", async () => {
    const { runTaskEscalation } = await import("./cron/taskEscalationCron");
    const result = await runTaskEscalation();
    expect(result).toEqual({ overdueFound: 0, escalationsCreated: 0 });
  });

  it("should escalate Shannon's overdue tasks to Lisa", async () => {
    const db = await import("./db");
    const mockDatabase = await (db.getDb as any)();
    
    mockDatabase.execute
      .mockResolvedValueOnce([[{
        taskId: 100,
        taskName: "Follow up with client",
        description: "Test task",
        status: "pending",
        dueDate: "2026-04-15 10:00:00",
        assignedTeamMemberId: 30001, // Shannon
        clientProjectId: 600,
        hoursOverdue: 72,
        assigneeName: "Shannon",
        clientName: "Test Client",
      }]])
      .mockResolvedValue([[]]); // For automation_events

    const { runTaskEscalation } = await import("./cron/taskEscalationCron");
    const result = await runTaskEscalation();
    
    expect(result.overdueFound).toBe(1);
    expect(result.escalationsCreated).toBe(1);
    // Should notify Lisa (escalation target for Shannon)
    expect(db.createTeamNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        teamMemberId: 1, // Lisa
        type: "task_assigned",
        title: expect.stringContaining("Escalation"),
      })
    );
    // Should also remind Shannon
    expect(db.createTeamNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        teamMemberId: 30001, // Shannon
        type: "task_assigned",
        title: expect.stringContaining("Reminder"),
      })
    );
  });

  it("should escalate Lisa's overdue tasks to admin (Jason)", async () => {
    const db = await import("./db");
    const mockDatabase = await (db.getDb as any)();
    
    mockDatabase.execute
      .mockResolvedValueOnce([[{
        taskId: 200,
        taskName: "Update enrollment status",
        description: "Test task",
        status: "in_progress",
        dueDate: "2026-04-14 10:00:00",
        assignedTeamMemberId: 1, // Lisa
        clientProjectId: 700,
        hoursOverdue: 96,
        assigneeName: "Lisa",
        clientName: "Another Client",
      }]])
      .mockResolvedValue([[]]); // For automation_events

    const { runTaskEscalation } = await import("./cron/taskEscalationCron");
    const result = await runTaskEscalation();
    
    expect(result.overdueFound).toBe(1);
    expect(result.escalationsCreated).toBe(1);
    // Should notify admin (Jason) via createNotificationsForEnabledUsers
    expect(db.createNotificationsForEnabledUsers).toHaveBeenCalledWith(
      "onboarding_automation",
      expect.stringContaining("Lisa's tasks are overdue"),
      expect.any(String),
    );
  });
});
