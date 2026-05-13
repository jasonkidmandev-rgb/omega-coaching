import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Jason task assignment investigation', () => {
  it('should check enrollments with discovery sessions scheduled', async () => {
    const database = await db.getDb();
    if (!database) return;
    const { transformationEnrollments } = await import('../drizzle/schema');
    const { isNotNull } = await import('drizzle-orm');
    
    const enrollmentsWithSessions = await database.select({
      id: transformationEnrollments.id,
      clientName: transformationEnrollments.clientName,
      status: transformationEnrollments.status,
      discoverySessionScheduledAt: transformationEnrollments.discoverySessionScheduledAt,
      discoverySessionCompletedAt: transformationEnrollments.discoverySessionCompletedAt,
    }).from(transformationEnrollments)
      .where(isNotNull(transformationEnrollments.discoverySessionScheduledAt));
    
    console.log('Enrollments with discovery sessions:', JSON.stringify(enrollmentsWithSessions, null, 2));
    console.log('Count:', enrollmentsWithSessions.length);
  });

  it('should check all tasks assigned to Jason (team member 30004)', async () => {
    const database = await db.getDb();
    if (!database) return;
    const { projectTasks } = await import('../drizzle/schema');
    const { eq } = await import('drizzle-orm');
    
    const jasonTasks = await database.select({
      id: projectTasks.id,
      name: projectTasks.name,
      status: projectTasks.status,
      assignedTeamMemberId: projectTasks.assignedTeamMemberId,
    }).from(projectTasks)
      .where(eq(projectTasks.assignedTeamMemberId, 30004));
    
    console.log('Jason tasks:', JSON.stringify(jasonTasks, null, 2));
    console.log('Count:', jasonTasks.length);
  });

  it('should check all tasks with "strategy" or "conduct" in the name', async () => {
    const database = await db.getDb();
    if (!database) return;
    const { projectTasks } = await import('../drizzle/schema');
    const { like, or } = await import('drizzle-orm');
    
    const strategyTasks = await database.select({
      id: projectTasks.id,
      name: projectTasks.name,
      status: projectTasks.status,
      assignedTeamMemberId: projectTasks.assignedTeamMemberId,
    }).from(projectTasks)
      .where(or(
        like(projectTasks.name, '%strategy%'),
        like(projectTasks.name, '%conduct%'),
        like(projectTasks.name, '%kickoff%'),
      ));
    
    console.log('Strategy/conduct/kickoff tasks:', JSON.stringify(strategyTasks, null, 2));
    console.log('Count:', strategyTasks.length);
  });

  it('should check all unique assignedTeamMemberIds in tasks', async () => {
    const database = await db.getDb();
    if (!database) return;
    const { projectTasks, teamMembers } = await import('../drizzle/schema');
    const { sql } = await import('drizzle-orm');
    
    const result = await database.execute(sql`
      SELECT pt.assignedTeamMemberId, tm.name, COUNT(*) as taskCount, 
             SUM(CASE WHEN pt.status = 'pending' THEN 1 ELSE 0 END) as pendingCount
      FROM project_tasks pt
      LEFT JOIN team_members tm ON pt.assignedTeamMemberId = tm.id
      GROUP BY pt.assignedTeamMemberId, tm.name
      ORDER BY taskCount DESC
    `);
    
    console.log('Task distribution by team member:', JSON.stringify(result[0], null, 2));
  });
});
