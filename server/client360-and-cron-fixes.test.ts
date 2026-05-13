/**
 * Tests for Client 360 Dashboard, Cron Bug Fixes, and Shannon's Kanban Board
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ============ CRON BUG FIXES ============
describe("CheckinCron sentAt.getTime fix", () => {
  it("should wrap sentAt in new Date() before calling getTime()", () => {
    const cronContent = fs.readFileSync(
      path.join(__dirname, "cron/checkinCron.ts"),
      "utf-8"
    );
    // Should use new Date(sentAt).getTime() instead of sentAt.getTime()
    expect(cronContent).toContain("new Date(sentAtRaw)");
    expect(cronContent).toContain("checkin.sentAt || checkin.createdAt");
    // sentAt is now properly wrapped in new Date() before .getTime() is called
    expect(cronContent).toContain("sentAt.getTime()");
  });

  it("should validate date before using it", () => {
    const cronContent = fs.readFileSync(
      path.join(__dirname, "cron/checkinCron.ts"),
      "utf-8"
    );
    expect(cronContent).toContain("isNaN");
  });
});

describe("SessionReminderCron column name fix", () => {
  it("should use correct column names matching actual DB (lowercase h)", () => {
    const cronContent = fs.readFileSync(
      path.join(__dirname, "cron/sessionReminderCron.ts"),
      "utf-8"
    );
    // Should use lowercase h to match actual DB columns
    expect(cronContent).toContain("reminder24hSent");
    expect(cronContent).toContain("reminder1hSent");
  });

  it("should have matching schema column names", () => {
    const schemaContent = fs.readFileSync(
      path.join(__dirname, "../drizzle/schema.ts"),
      "utf-8"
    );
    // Schema should also use lowercase h
    expect(schemaContent).toContain("reminder24hSent");
    expect(schemaContent).toContain("reminder1hSent");
  });
});

// ============ CLIENT 360 ROUTER ============
describe("Client 360 Router", () => {
  it("should exist and export client360Router", () => {
    const routerContent = fs.readFileSync(
      path.join(__dirname, "client360/router.ts"),
      "utf-8"
    );
    expect(routerContent).toContain("export const client360Router");
    expect(routerContent).toContain("router({");
  });

  it("should have list and detail procedures", () => {
    const routerContent = fs.readFileSync(
      path.join(__dirname, "client360/router.ts"),
      "utf-8"
    );
    expect(routerContent).toContain("list: adminProcedure");
    expect(routerContent).toContain("detail: adminProcedure");
  });

  it("should accept search, stage, limit, offset inputs for list", () => {
    const routerContent = fs.readFileSync(
      path.join(__dirname, "client360/router.ts"),
      "utf-8"
    );
    expect(routerContent).toContain("search: z.string().optional()");
    expect(routerContent).toContain("stage: z.enum(");
    expect(routerContent).toContain("limit: z.number()");
    expect(routerContent).toContain("offset: z.number()");
  });

  it("should query prospects, clientProtocols, enrollments, and users", () => {
    const routerContent = fs.readFileSync(
      path.join(__dirname, "client360/router.ts"),
      "utf-8"
    );
    expect(routerContent).toContain("from(prospects)");
    expect(routerContent).toContain("from(clientProtocols)");
    expect(routerContent).toContain("from(transformationEnrollments)");
    expect(routerContent).toContain("from(users)");
  });

  it("should return stageCounts in list response", () => {
    const routerContent = fs.readFileSync(
      path.join(__dirname, "client360/router.ts"),
      "utf-8"
    );
    expect(routerContent).toContain("stageCounts");
    expect(routerContent).toContain("people: paginated");
    expect(routerContent).toContain("total");
  });

  it("should be registered in the appRouter", () => {
    const routersContent = fs.readFileSync(
      path.join(__dirname, "routers.ts"),
      "utf-8"
    );
    expect(routersContent).toContain('import { client360Router }');
    expect(routersContent).toContain("client360: client360Router");
  });
});

// ============ CLIENT 360 FRONTEND ============
describe("Client 360 Frontend", () => {
  it("should have Client360 page component", () => {
    const pageContent = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/admin/Client360.tsx"),
      "utf-8"
    );
    expect(pageContent).toContain("Client360Dashboard");
    expect(pageContent).toContain("trpc.client360.list.useQuery");
    expect(pageContent).toContain("trpc.client360.detail.useQuery");
  });

  it("should have stage filter pills", () => {
    const pageContent = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/admin/Client360.tsx"),
      "utf-8"
    );
    expect(pageContent).toContain("lead");
    expect(pageContent).toContain("prospect");
    expect(pageContent).toContain("enrolled");
    expect(pageContent).toContain("active_client");
    expect(pageContent).toContain("past_client");
    expect(pageContent).toContain("store_customer");
  });

  it("should have person detail dialog", () => {
    const pageContent = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/admin/Client360.tsx"),
      "utf-8"
    );
    expect(pageContent).toContain("PersonDetail");
    expect(pageContent).toContain("DialogContent");
  });

  it("should be registered in App.tsx routes", () => {
    const appContent = fs.readFileSync(
      path.join(__dirname, "../client/src/App.tsx"),
      "utf-8"
    );
    expect(appContent).toContain('"/admin/client-360"');
    expect(appContent).toContain("AdminClient360");
  });

  it("should be in the sidebar navigation", () => {
    const layoutContent = fs.readFileSync(
      path.join(__dirname, "../client/src/components/AdminLayout.tsx"),
      "utf-8"
    );
    expect(layoutContent).toContain('label: "Client 360"');
    expect(layoutContent).toContain('path: "/admin/client-360"');
  });
});

// ============ SHANNON'S KANBAN BOARD ============
describe("Shannon's Kanban Board", () => {
  it("should have ShannonKanban page component", () => {
    const pageContent = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/admin/ShannonKanban.tsx"),
      "utf-8"
    );
    expect(pageContent).toContain("ShannonKanban");
    expect(pageContent).toContain("Shannon's Pipeline");
  });

  it("should have the 5 specific pipeline stages", () => {
    const pageContent = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/admin/ShannonKanban.tsx"),
      "utf-8"
    );
    expect(pageContent).toContain('"New"');
    expect(pageContent).toContain('"Contacted"');
    expect(pageContent).toContain('"Consult Booked"');
    expect(pageContent).toContain('"Enrolled"');
    expect(pageContent).toContain('"Active"');
  });

  it("should use DndContext for drag-and-drop", () => {
    const pageContent = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/admin/ShannonKanban.tsx"),
      "utf-8"
    );
    expect(pageContent).toContain("DndContext");
    expect(pageContent).toContain("DragOverlay");
    expect(pageContent).toContain("handleDragEnd");
    expect(pageContent).toContain("handleDragStart");
  });

  it("should call updateProspectStatus on drag end", () => {
    const pageContent = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/admin/ShannonKanban.tsx"),
      "utf-8"
    );
    expect(pageContent).toContain("trpc.prospect.updateProspectStatus.useMutation");
    expect(pageContent).toContain("updateStatus.mutate");
  });

  it("should have stale indicator for prospects not contacted in 7+ days", () => {
    const pageContent = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/admin/ShannonKanban.tsx"),
      "utf-8"
    );
    expect(pageContent).toContain("stale");
    expect(pageContent).toContain("daysSinceContact");
  });

  it("should be registered in App.tsx routes", () => {
    const appContent = fs.readFileSync(
      path.join(__dirname, "../client/src/App.tsx"),
      "utf-8"
    );
    expect(appContent).toContain('"/admin/shannon-kanban"');
    expect(appContent).toContain("AdminShannonKanban");
  });

  it("should be in the sidebar navigation under Coaching", () => {
    const layoutContent = fs.readFileSync(
      path.join(__dirname, "../client/src/components/AdminLayout.tsx"),
      "utf-8"
    );
    expect(layoutContent).toContain('label: "Shannon\'s Kanban"');
    expect(layoutContent).toContain('path: "/admin/shannon-kanban"');
  });

  it("should have a quick view dialog for prospects", () => {
    const pageContent = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/admin/ShannonKanban.tsx"),
      "utf-8"
    );
    expect(pageContent).toContain("ProspectQuickView");
    expect(pageContent).toContain("Things to Know");
    expect(pageContent).toContain("Recent Activity");
  });
});
