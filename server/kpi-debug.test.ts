import { describe, it, expect } from "vitest";
import { getDb } from "./db";
import { prospects, transformationEnrollments, projectTasks, teamMembers, packingSlips } from "../drizzle/schema";
import { count, eq, sql } from "drizzle-orm";

describe("KPI Dashboard Data Debug", () => {
  it("should check prospects data", async () => {
    const database = await getDb();
    expect(database).toBeTruthy();
    const result = await database!.select({ cnt: count() }).from(prospects);
    console.log("Prospects count:", result[0]?.cnt);
    // Just log, don't assert specific count
  });

  it("should check enrollments data", async () => {
    const database = await getDb();
    const result = await database!.select({ cnt: count() }).from(transformationEnrollments);
    console.log("Enrollments count:", result[0]?.cnt);
  });

  it("should check tasks data", async () => {
    const database = await getDb();
    const allTasks = await database!.select({
      id: projectTasks.id,
      status: projectTasks.status,
      assignedTeamMemberId: projectTasks.assignedTeamMemberId,
      title: projectTasks.title,
      dueDate: projectTasks.dueDate,
      completedAt: projectTasks.completedAt,
    }).from(projectTasks);
    console.log("Total tasks:", allTasks.length);
    
    const statusCounts: Record<string, number> = {};
    const assigneeCounts: Record<string, number> = {};
    allTasks.forEach(t => {
      statusCounts[t.status || 'null'] = (statusCounts[t.status || 'null'] || 0) + 1;
      assigneeCounts[String(t.assignedTeamMemberId || 'null')] = (assigneeCounts[String(t.assignedTeamMemberId || 'null')] || 0) + 1;
    });
    console.log("Tasks by status:", statusCounts);
    console.log("Tasks by assignee:", assigneeCounts);
    
    // Show first 5 tasks
    console.log("Sample tasks:", allTasks.slice(0, 5).map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      assignee: t.assignedTeamMemberId,
      due: t.dueDate,
    })));
  });

  it("should check team members", async () => {
    const database = await getDb();
    const members = await database!.select({
      id: teamMembers.id,
      name: teamMembers.name,
      isActive: teamMembers.isActive,
    }).from(teamMembers);
    console.log("Team members:", members);
  });

  it("should check packing slips", async () => {
    const database = await getDb();
    const result = await database!.select({ cnt: count() }).from(packingSlips);
    console.log("Packing slips count:", result[0]?.cnt);
  });

  it("should simulate KPI getDashboard query", async () => {
    const database = await getDb();
    if (!database) { console.log("No database"); return; }
    
    // Pipeline stats
    const allProspects = await database.select({ status: prospects.status }).from(prospects);
    console.log("Pipeline - total prospects:", allProspects.length);
    const prospectsByStage: Record<string, number> = {};
    allProspects.forEach((p: any) => { prospectsByStage[p.status || 'unknown'] = (prospectsByStage[p.status || 'unknown'] || 0) + 1; });
    console.log("Pipeline by stage:", prospectsByStage);
    
    // Tasks
    const allTasks = await database.select({ 
      id: projectTasks.id, 
      status: projectTasks.status, 
      dueDate: projectTasks.dueDate, 
      assignedTeamMemberId: projectTasks.assignedTeamMemberId, 
      completedAt: projectTasks.completedAt, 
      createdAt: projectTasks.createdAt 
    }).from(projectTasks);
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const pendingTasks = allTasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress');
    const overdueTasks = pendingTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < now);
    const completedThisWeek = allTasks.filter((t: any) => t.status === 'completed' && t.completedAt && new Date(t.completedAt) >= weekAgo);
    
    console.log("KPI Tasks - pending:", pendingTasks.length, "overdue:", overdueTasks.length, "completed this week:", completedThisWeek.length);
    
    // Team
    const allTeam = await database.select({ id: teamMembers.id, name: teamMembers.name }).from(teamMembers).where(eq(teamMembers.isActive, true));
    console.log("Active team members:", allTeam.length, allTeam.map((t: any) => `${t.name}(${t.id})`));
    
    const tasksByTeam = allTeam.map((tm: any) => {
      const assigned = pendingTasks.filter((t: any) => t.assignedTeamMemberId === tm.id);
      const overdueForMember = assigned.filter((t: any) => t.dueDate && new Date(t.dueDate) < now);
      return { name: tm.name, id: tm.id, pending: assigned.length, overdue: overdueForMember.length };
    });
    console.log("Tasks by team member:", tasksByTeam);
  });
});
