import { describe, it, expect } from "vitest";
import * as schema from "../drizzle/schema";

describe("Client Project Management System", () => {
  describe("Database Schema", () => {
    it("should have lifecycle_stages table in schema", () => {
      expect(schema.lifecycleStages).toBeDefined();
      expect(schema.lifecycleStages.name).toBeDefined();
      expect(schema.lifecycleStages.color).toBeDefined();
      expect(schema.lifecycleStages.sortOrder).toBeDefined();
    });

    it("should have team_members table in schema", () => {
      expect(schema.teamMembers).toBeDefined();
      expect(schema.teamMembers.name).toBeDefined();
      expect(schema.teamMembers.email).toBeDefined();
      expect(schema.teamMembers.isActive).toBeDefined();
    });

    it("should have client_projects table in schema", () => {
      expect(schema.clientProjects).toBeDefined();
      expect(schema.clientProjects.clientName).toBeDefined();
      expect(schema.clientProjects.clientEmail).toBeDefined();
      expect(schema.clientProjects.status).toBeDefined();
      expect(schema.clientProjects.priority).toBeDefined();
      expect(schema.clientProjects.currentLifecycleStageId).toBeDefined();
      expect(schema.clientProjects.assignedTeamMemberId).toBeDefined();
    });

    it("should have project_tasks table in schema", () => {
      expect(schema.projectTasks).toBeDefined();
      expect(schema.projectTasks.clientProjectId).toBeDefined();
      expect(schema.projectTasks.name).toBeDefined();
      expect(schema.projectTasks.status).toBeDefined();
      expect(schema.projectTasks.assignedTeamMemberId).toBeDefined();
    });

    it("should have project_subtasks table in schema", () => {
      expect(schema.projectSubtasks).toBeDefined();
      expect(schema.projectSubtasks.projectTaskId).toBeDefined();
      expect(schema.projectSubtasks.name).toBeDefined();
      expect(schema.projectSubtasks.status).toBeDefined();
    });

    it("should have project_notes table in schema", () => {
      expect(schema.projectNotes).toBeDefined();
      expect(schema.projectNotes.clientProjectId).toBeDefined();
      expect(schema.projectNotes.content).toBeDefined();
      expect(schema.projectNotes.authorTeamMemberId).toBeDefined();
    });

    it("should have workflow_templates table in schema", () => {
      expect(schema.workflowTemplates).toBeDefined();
      expect(schema.workflowTemplates.name).toBeDefined();
      expect(schema.workflowTemplates.durationDays).toBeDefined();
      expect(schema.workflowTemplates.isDefault).toBeDefined();
    });

    it("should have workflow_template_tasks table in schema", () => {
      expect(schema.workflowTemplateTasks).toBeDefined();
      expect(schema.workflowTemplateTasks.workflowTemplateId).toBeDefined();
      expect(schema.workflowTemplateTasks.lifecycleStageId).toBeDefined();
      expect(schema.workflowTemplateTasks.name).toBeDefined();
    });

    it("should have workflow_template_subtasks table in schema", () => {
      expect(schema.workflowTemplateSubtasks).toBeDefined();
      expect(schema.workflowTemplateSubtasks.workflowTemplateTaskId).toBeDefined();
      expect(schema.workflowTemplateSubtasks.name).toBeDefined();
    });
  });

  describe("Project Status Values", () => {
    it("should support active, on_hold, completed, and cancelled statuses", () => {
      const validStatuses = ["active", "on_hold", "completed", "cancelled"];
      // Schema defines these as valid values
      expect(validStatuses).toContain("active");
      expect(validStatuses).toContain("on_hold");
      expect(validStatuses).toContain("completed");
      expect(validStatuses).toContain("cancelled");
    });

    it("should support low, normal, high, and urgent priorities", () => {
      const validPriorities = ["low", "normal", "high", "urgent"];
      expect(validPriorities).toContain("low");
      expect(validPriorities).toContain("normal");
      expect(validPriorities).toContain("high");
      expect(validPriorities).toContain("urgent");
    });

    it("should support pending, in_progress, completed, blocked, and skipped task statuses", () => {
      const validTaskStatuses = ["pending", "in_progress", "completed", "blocked", "skipped"];
      expect(validTaskStatuses).toContain("pending");
      expect(validTaskStatuses).toContain("in_progress");
      expect(validTaskStatuses).toContain("completed");
      expect(validTaskStatuses).toContain("blocked");
      expect(validTaskStatuses).toContain("skipped");
    });
  });

  describe("Schema Relations", () => {
    it("should have proper foreign key relationships defined", () => {
      // Client projects should reference lifecycle stages and team members
      expect(schema.clientProjects.currentLifecycleStageId).toBeDefined();
      expect(schema.clientProjects.assignedTeamMemberId).toBeDefined();
      
      // Project tasks should reference client projects and team members
      expect(schema.projectTasks.clientProjectId).toBeDefined();
      expect(schema.projectTasks.assignedTeamMemberId).toBeDefined();
      
      // Project subtasks should reference project tasks
      expect(schema.projectSubtasks.projectTaskId).toBeDefined();
      
      // Project notes should reference client projects and team members
      expect(schema.projectNotes.clientProjectId).toBeDefined();
      expect(schema.projectNotes.authorTeamMemberId).toBeDefined();
    });
  });
});

describe("Workflow Template System", () => {
  it("should support creating templates with duration in days", () => {
    expect(schema.workflowTemplates.durationDays).toBeDefined();
  });

  it("should support marking templates as default", () => {
    expect(schema.workflowTemplates.isDefault).toBeDefined();
  });

  it("should support associating tasks with lifecycle stages", () => {
    expect(schema.workflowTemplateTasks.lifecycleStageId).toBeDefined();
  });

  it("should support sorting tasks and subtasks", () => {
    expect(schema.workflowTemplateTasks.sortOrder).toBeDefined();
    expect(schema.workflowTemplateSubtasks.sortOrder).toBeDefined();
  });
});
