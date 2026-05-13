import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.log('No DATABASE_URL'); process.exit(1); }

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

const [prospects] = await db.execute(sql`SELECT COUNT(*) as cnt FROM prospects`);
console.log('Prospects:', prospects[0]?.cnt);

const [enrollments] = await db.execute(sql`SELECT COUNT(*) as cnt FROM transformation_enrollments`);
console.log('Enrollments:', enrollments[0]?.cnt);

const [tasks] = await db.execute(sql`SELECT COUNT(*) as cnt FROM project_tasks`);
console.log('Tasks:', tasks[0]?.cnt);

const [tasksByStatus] = await db.execute(sql`SELECT status, COUNT(*) as cnt FROM project_tasks GROUP BY status`);
console.log('Tasks by status:', tasksByStatus);

const [tasksByAssignee] = await db.execute(sql`SELECT assigned_team_member_id, COUNT(*) as cnt FROM project_tasks GROUP BY assigned_team_member_id`);
console.log('Tasks by assignee:', tasksByAssignee);

const [teamMembers] = await db.execute(sql`SELECT id, name, is_active FROM team_members`);
console.log('Team members:', teamMembers);

const [packingSlips] = await db.execute(sql`SELECT COUNT(*) as cnt FROM packing_slips`);
console.log('Packing slips:', packingSlips[0]?.cnt);

// Check Jason's team member ID
const [jason] = await db.execute(sql`SELECT id, name, user_id FROM team_members WHERE name LIKE '%Jason%'`);
console.log('Jason team member:', jason);

await connection.end();
