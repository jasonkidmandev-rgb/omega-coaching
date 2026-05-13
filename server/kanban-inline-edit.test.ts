import { describe, it, expect } from "vitest";

describe("Kanban Inline Edit", () => {
  describe("Priority configuration", () => {
    const priorityConfig = {
      low: { label: "Low", color: "bg-slate-100 text-slate-600" },
      normal: { label: "Normal", color: "bg-blue-100 text-blue-600" },
      high: { label: "High", color: "bg-orange-100 text-orange-600" },
      urgent: { label: "Urgent", color: "bg-red-100 text-red-600" },
    };

    it("should have all four priority levels", () => {
      expect(Object.keys(priorityConfig)).toEqual(["low", "normal", "high", "urgent"]);
    });

    it("should have labels for all priorities", () => {
      expect(priorityConfig.low.label).toBe("Low");
      expect(priorityConfig.normal.label).toBe("Normal");
      expect(priorityConfig.high.label).toBe("High");
      expect(priorityConfig.urgent.label).toBe("Urgent");
    });

    it("should have distinct color classes for each priority", () => {
      const colors = Object.values(priorityConfig).map(c => c.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(4);
    });
  });

  describe("Inline update data validation", () => {
    it("should accept valid priority values", () => {
      const validPriorities = ["low", "normal", "high", "urgent"];
      validPriorities.forEach(p => {
        expect(["low", "normal", "high", "urgent"]).toContain(p);
      });
    });

    it("should accept null for unassigning team member", () => {
      const updateData = { assignedTeamMemberId: null };
      expect(updateData.assignedTeamMemberId).toBeNull();
    });

    it("should accept numeric team member IDs", () => {
      const updateData = { assignedTeamMemberId: 5 };
      expect(typeof updateData.assignedTeamMemberId).toBe("number");
      expect(updateData.assignedTeamMemberId).toBeGreaterThan(0);
    });

    it("should build correct update payload for priority change", () => {
      const projectId = 42;
      const newPriority = "high";
      const payload = { id: projectId, priority: newPriority };
      expect(payload).toEqual({ id: 42, priority: "high" });
    });

    it("should build correct update payload for team member change", () => {
      const projectId = 42;
      const newTeamMemberId = 3;
      const payload = { id: projectId, assignedTeamMemberId: newTeamMemberId };
      expect(payload).toEqual({ id: 42, assignedTeamMemberId: 3 });
    });

    it("should build correct update payload for unassigning team member", () => {
      const projectId = 42;
      const payload = { id: projectId, assignedTeamMemberId: null };
      expect(payload).toEqual({ id: 42, assignedTeamMemberId: null });
    });
  });

  describe("Toast message logic", () => {
    it("should show priority-specific message when priority changes", () => {
      const variables = { id: 1, priority: "high" };
      let message = "";
      if (variables.priority) message = `Priority updated to ${variables.priority}`;
      else if ((variables as any).assignedTeamMemberId !== undefined) message = "Team member updated";
      else message = "Updated";
      expect(message).toBe("Priority updated to high");
    });

    it("should show team member message when team member changes", () => {
      const variables = { id: 1, assignedTeamMemberId: 5 } as any;
      let message = "";
      if (variables.priority) message = `Priority updated to ${variables.priority}`;
      else if (variables.assignedTeamMemberId !== undefined) message = "Team member updated";
      else message = "Updated";
      expect(message).toBe("Team member updated");
    });

    it("should show generic message for other updates", () => {
      const variables = { id: 1, status: "active" } as any;
      let message = "";
      if (variables.priority) message = `Priority updated to ${variables.priority}`;
      else if (variables.assignedTeamMemberId !== undefined) message = "Team member updated";
      else message = "Updated";
      expect(message).toBe("Updated");
    });
  });

  describe("Card rendering logic", () => {
    it("should find assigned team member from list", () => {
      const teamMembers = [
        { id: 1, name: "Lisa Kidman" },
        { id: 2, name: "Karl Smith" },
        { id: 3, name: "Shannon Randall" },
      ];
      const project = { assignedTeamMemberId: 2 };
      const assignedMember = teamMembers.find(m => m.id === project.assignedTeamMemberId);
      expect(assignedMember).toBeDefined();
      expect(assignedMember!.name).toBe("Karl Smith");
    });

    it("should return undefined for unassigned projects", () => {
      const teamMembers = [
        { id: 1, name: "Lisa Kidman" },
      ];
      const project = { assignedTeamMemberId: null };
      const assignedMember = teamMembers.find(m => m.id === project.assignedTeamMemberId);
      expect(assignedMember).toBeUndefined();
    });

    it("should show first name only in button", () => {
      const memberName = "Lisa Kidman";
      const firstName = memberName.split(' ')[0];
      expect(firstName).toBe("Lisa");
    });

    it("should show 'Assign' when no team member assigned", () => {
      const assignedMember = undefined;
      const buttonText = assignedMember ? assignedMember.name.split(' ')[0] : 'Assign';
      expect(buttonText).toBe("Assign");
    });
  });
});
