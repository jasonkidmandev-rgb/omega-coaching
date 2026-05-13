/**
 * One-time Data Reconciliation Script for Stalled Clients
 * 
 * Categorizes and fixes the 23+ stalled client projects:
 * - Group 1: Projects with no tasks (created before task templates) → Mark as needs_review
 * - Group 2: All tasks completed but project not marked done → Auto-complete project
 * - Group 3: Genuinely stalled (tasks exist, none completed, 48+ hours) → Flag for manual review
 * - Group 4: Recently created (within 48 hours, false positive) → No action needed
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env
dotenv.config({ path: join(__dirname, '.env') });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

async function main() {
  console.log('=== Stalled Client Data Reconciliation ===\n');
  
  const connection = await mysql.createConnection(DB_URL);
  
  try {
    // Get all potentially stalled projects (active/in_progress/pending with no recent activity)
    const [stalledProjects] = await connection.execute(`
      SELECT 
        cp.id,
        cp.clientName,
        cp.clientEmail,
        cp.status as projectStatus,
        cp.createdAt,
        (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id) as totalTasks,
        (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id AND pt.status = 'completed') as completedTasks,
        (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id AND pt.status IN ('pending', 'in_progress')) as pendingTasks,
        TIMESTAMPDIFF(HOUR, COALESCE(
          (SELECT MAX(pt.updatedAt) FROM project_tasks pt WHERE pt.clientProjectId = cp.id AND pt.status = 'completed'),
          cp.createdAt
        ), NOW()) as hoursSinceActivity,
        TIMESTAMPDIFF(HOUR, cp.createdAt, NOW()) as hoursOld
      FROM client_projects cp
      WHERE cp.status IN ('active', 'in_progress', 'pending')
      ORDER BY cp.createdAt ASC
    `);

    console.log(`Found ${stalledProjects.length} active/in_progress/pending projects\n`);

    // Categorize
    const group1 = []; // No tasks at all
    const group2 = []; // All tasks completed, project not done
    const group3 = []; // Genuinely stalled (48+ hours, tasks exist, not all done)
    const group4 = []; // Recently created (< 48 hours)
    const healthy = []; // Has tasks, some completed, within normal timeframe

    for (const p of stalledProjects) {
      const totalTasks = Number(p.totalTasks);
      const completedTasks = Number(p.completedTasks);
      const hoursOld = Number(p.hoursOld);
      const hoursSinceActivity = Number(p.hoursSinceActivity);

      if (totalTasks === 0) {
        group1.push(p);
      } else if (completedTasks === totalTasks) {
        group2.push(p);
      } else if (hoursOld < 48) {
        group4.push(p);
      } else if (hoursSinceActivity >= 48) {
        group3.push(p);
      } else {
        healthy.push(p);
      }
    }

    console.log('=== CATEGORIZATION ===');
    console.log(`Group 1 (No tasks): ${group1.length}`);
    console.log(`Group 2 (All tasks done, project not closed): ${group2.length}`);
    console.log(`Group 3 (Genuinely stalled 48+ hrs): ${group3.length}`);
    console.log(`Group 4 (Recently created < 48hrs): ${group4.length}`);
    console.log(`Healthy (normal progress): ${healthy.length}`);
    console.log('');

    // === GROUP 1: Projects with no tasks ===
    console.log('--- GROUP 1: Projects with NO tasks ---');
    for (const p of group1) {
      console.log(`  [${p.id}] ${p.clientName} (${p.projectStatus}) - created ${Math.round(Number(p.hoursOld) / 24)}d ago`);
    }
    if (group1.length > 0) {
      console.log(`  ACTION: Marking ${group1.length} projects as 'on_hold' status (needs review)...`);
      const ids = group1.map(p => p.id);
      await connection.execute(
        `UPDATE client_projects SET status = 'on_hold' WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      console.log(`  DONE: ${group1.length} projects marked as on_hold\n`);
    } else {
      console.log('  No action needed.\n');
    }

    // === GROUP 2: All tasks completed but project not marked done ===
    console.log('--- GROUP 2: All tasks COMPLETED but project still open ---');
    for (const p of group2) {
      console.log(`  [${p.id}] ${p.clientName} - ${p.completedTasks}/${p.totalTasks} tasks done (${p.projectStatus})`);
    }
    if (group2.length > 0) {
      console.log(`  ACTION: Auto-completing ${group2.length} projects...`);
      const ids = group2.map(p => p.id);
      await connection.execute(
        `UPDATE client_projects SET status = 'completed', completedAt = NOW() WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      console.log(`  DONE: ${group2.length} projects marked as completed\n`);
    } else {
      console.log('  No action needed.\n');
    }

    // === GROUP 3: Genuinely stalled ===
    console.log('--- GROUP 3: Genuinely STALLED (48+ hours, tasks incomplete) ---');
    for (const p of group3) {
      const days = Math.round(Number(p.hoursSinceActivity) / 24);
      console.log(`  [${p.id}] ${p.clientName} - ${p.completedTasks}/${p.totalTasks} tasks, stalled ${days}d`);
    }
    if (group3.length > 0) {
      console.log(`  ACTION: Creating admin notifications for ${group3.length} stalled clients...`);
      for (const p of group3) {
        const days = Math.round(Number(p.hoursSinceActivity) / 24);
        try {
          await connection.execute(
            `INSERT INTO notifications (userId, type, title, message, isRead, createdAt) 
             SELECT u.id, 'stalled_client_review', 
               CONCAT('Stalled Client: ', ?),
               CONCAT('Project for ', ?, ' has been stalled for ', ?, ' days with ', ?, '/', ?, ' tasks completed. Please review.'),
               0, NOW()
             FROM users u WHERE u.role = 'admin' LIMIT 1`,
            [p.clientName, p.clientName, days, Number(p.completedTasks), Number(p.totalTasks)]
          );
        } catch (err) {
          console.log(`  Warning: Could not create notification for ${p.clientName}: ${err.message}`);
        }
      }
      console.log(`  DONE: Notifications created for admin review\n`);
    } else {
      console.log('  No action needed.\n');
    }

    // === GROUP 4: Recently created (false positives) ===
    console.log('--- GROUP 4: Recently created (< 48 hours, false positives) ---');
    for (const p of group4) {
      const hours = Number(p.hoursOld);
      console.log(`  [${p.id}] ${p.clientName} - ${p.completedTasks}/${p.totalTasks} tasks, created ${hours}h ago`);
    }
    console.log('  ACTION: No action needed (these are normal).\n');

    // === HEALTHY ===
    console.log('--- HEALTHY (normal progress) ---');
    for (const p of healthy) {
      console.log(`  [${p.id}] ${p.clientName} - ${p.completedTasks}/${p.totalTasks} tasks`);
    }
    console.log('  No action needed.\n');

    // Log the reconciliation as an automation event
    try {
      await connection.execute(
        `INSERT INTO automation_events (eventType, status, sourceType, details, createdAt)
         VALUES ('data_reconciliation', 'completed', 'manual', ?, NOW())`,
        [JSON.stringify({
          group1_no_tasks_on_hold: group1.length,
          group2_auto_completed: group2.length,
          group3_flagged_for_review: group3.length,
          group4_false_positives: group4.length,
          healthy: healthy.length,
          total_processed: stalledProjects.length,
        })]
      );
    } catch (err) {
      console.log(`Warning: Could not log automation event: ${err.message}`);
    }

    console.log('=== RECONCILIATION SUMMARY ===');
    console.log(`Total projects processed: ${stalledProjects.length}`);
    console.log(`  Group 1 (no tasks → on_hold): ${group1.length}`);
    console.log(`  Group 2 (all done → auto-completed): ${group2.length}`);
    console.log(`  Group 3 (stalled → flagged for review): ${group3.length}`);
    console.log(`  Group 4 (recent → no action): ${group4.length}`);
    console.log(`  Healthy (normal): ${healthy.length}`);
    console.log('\nReconciliation complete!');

  } catch (err) {
    console.error('Error during reconciliation:', err);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
