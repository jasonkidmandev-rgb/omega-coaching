import mysql from 'mysql2/promise';
const DATABASE_URL = process.env.DATABASE_URL;

async function run() {
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log('=== FIXING PATRICK SPRAGUE + RECONCILING ALL PROJECTS ===\n');

  // 1. Fix Patrick's project: advance to stage 3 (Protocol Build), set active, assign Lisa
  console.log('--- Step 1: Fix Patrick Sprague project #480003 ---');
  await conn.execute(
    `UPDATE client_projects SET 
      currentLifecycleStageId = 3, 
      status = 'active', 
      assignedTeamMemberId = 1,
      workflowTemplateId = 3,
      priority = 'high',
      startDate = '2026-04-10',
      targetEndDate = DATE_ADD('2026-04-10', INTERVAL 3 MONTH),
      updatedAt = NOW()
    WHERE id = 480003`
  );
  console.log('✅ Patrick project: stage → 3 (Protocol Build), status → active, assigned → Lisa (#1)');

  // 2. Create tasks for Patrick's project (since it had none)
  console.log('\n--- Step 2: Create tasks for Patrick ---');
  
  const patrickTasks = [
    {
      name: 'Build protocol for Patrick Sprague',
      description: 'Strategy session complete. Build the 90 Day Transformation protocol for Patrick Sprague (advanced tier, $4,500). Deadline: 4 days from enrollment.',
      lifecycleStageId: 3, // Protocol Build
      assignedTeamMemberId: null, // Jason
      dueDate: '2026-04-17', // 4 days from now
      sortOrder: 0,
      isRequired: 1,
    },
    {
      name: 'Send Peptide Pro signup link to Patrick Sprague',
      description: 'Send the Peptide Pro app signup link to psprague@allstate.com. Client needs this for daily protocol tracking.',
      lifecycleStageId: 6, // Onboarding
      assignedTeamMemberId: 1, // Lisa
      dueDate: '2026-04-14',
      sortOrder: 100,
      isRequired: 1,
    },
    {
      name: 'Send Omega Elite community access to Patrick Sprague',
      description: 'Send the Omega Elite signup link with promo code 4MONTHINVITEONLY. Access: 4 months.',
      lifecycleStageId: 6, // Onboarding
      assignedTeamMemberId: 1, // Lisa
      dueDate: '2026-04-14',
      sortOrder: 101,
      isRequired: 1,
    },
    {
      name: 'Prepare onboarding materials for Patrick Sprague',
      description: 'Client has completed consult and paid $4,500. Prepare community access links, Peptide Pro signup, and onboarding welcome package.',
      lifecycleStageId: 6, // Onboarding
      assignedTeamMemberId: 1, // Lisa
      dueDate: '2026-04-15',
      sortOrder: 50,
      isRequired: 1,
    },
    {
      name: 'Cancel Peptide Pro subscription for Patrick Sprague',
      description: "Patrick Sprague's 4-month Peptide Pro access expires. Cancel their subscription unless they've renewed.",
      lifecycleStageId: 8, // Completion
      assignedTeamMemberId: 1, // Lisa
      dueDate: '2026-08-10',
      sortOrder: 200,
      isRequired: 1,
    },
    {
      name: 'Schedule end-of-protocol wrap-up for Patrick Sprague',
      description: "Patrick Sprague's 90 Day Transformation ends in 2 weeks. Schedule a wrap-up session with Jason.",
      lifecycleStageId: 8, // Completion
      assignedTeamMemberId: 1, // Lisa
      dueDate: '2026-06-26',
      sortOrder: 300,
      isRequired: 1,
    },
    {
      name: 'Follow up with Patrick Sprague - renewal + video testimonial',
      description: "Patrick Sprague's program is ending. Follow up about renewal options, video testimonial, and referrals.",
      lifecycleStageId: 8, // Completion
      assignedTeamMemberId: 30001, // Shannon
      dueDate: '2026-06-26',
      sortOrder: 301,
      isRequired: 1,
    },
  ];

  for (const task of patrickTasks) {
    await conn.execute(
      `INSERT INTO project_tasks (clientProjectId, lifecycleStageId, name, description, assignedTeamMemberId, dueDate, sortOrder, isRequired, status, createdAt, updatedAt)
       VALUES (480003, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [task.lifecycleStageId, task.name, task.description, task.assignedTeamMemberId, task.dueDate, task.sortOrder, task.isRequired]
    );
    console.log(`  ✅ Created task: ${task.name}`);
  }

  // 3. Link Patrick's protocol to his project
  console.log('\n--- Step 3: Link protocol to project ---');
  await conn.execute(
    `UPDATE client_projects SET clientProtocolId = 1380001 WHERE id = 480003`
  );
  console.log('✅ Linked protocol #1380001 to project #480003');

  // 4. Create notification for Lisa
  console.log('\n--- Step 4: Create notification for Lisa ---');
  await conn.execute(
    `INSERT INTO notifications (userId, type, title, message, isRead, createdAt)
     SELECT u.id, 'onboarding_automation', 
       'Patrick Sprague — Consult Complete, Protocol Build Ready',
       'Patrick Sprague has completed his consultation and paid $4,500 for the Advanced tier (90 Day Transformation). His project has been advanced to Protocol Build stage. You have been assigned onboarding tasks:\n\n1. Send Peptide Pro signup link\n2. Send Omega Elite community access\n3. Prepare onboarding materials\n\nJason has a 4-day deadline to build the protocol.',
       0, NOW()
     FROM users u WHERE u.role IN ('admin', 'team')
     LIMIT 10`
  );
  console.log('✅ Created notification for team about Patrick Sprague');

  // 5. Now reconcile ALL other projects
  console.log('\n--- Step 5: Reconcile all other projects ---');
  
  // Get all active/on_hold projects
  const [projects] = await conn.execute(
    `SELECT cp.id, cp.clientName, cp.clientEmail, cp.currentLifecycleStageId, cp.status, cp.assignedTeamMemberId,
            (SELECT COUNT(*) FROM project_tasks pt WHERE pt.clientProjectId = cp.id) as taskCount
     FROM client_projects cp
     WHERE cp.status IN ('active', 'on_hold')
     ORDER BY cp.id`
  );

  let fixedCount = 0;
  for (const project of projects) {
    // Find enrollment for this project
    const [enrollments] = await conn.execute(
      `SELECT * FROM transformation_enrollments WHERE email = ? LIMIT 1`,
      [project.clientEmail]
    );
    const enrollment = enrollments[0];
    if (!enrollment) continue;

    let shouldBeAtStage = project.currentLifecycleStageId;
    let needsFix = false;
    let reason = '';

    // If intake complete → at least stage 2
    if (enrollment.intakeFormCompleted && project.currentLifecycleStageId < 2) {
      shouldBeAtStage = 2;
      reason = 'Intake form completed';
      needsFix = true;
    }

    // If coaching fee paid → at least stage 3
    if (enrollment.coachingFeePaid && project.currentLifecycleStageId < 3) {
      shouldBeAtStage = 3;
      reason = `Coaching fee paid ($${enrollment.coachingFeeAmount})`;
      needsFix = true;
    }

    // If on_hold but has paid enrollment → should be active
    if (project.status === 'on_hold' && enrollment.coachingFeePaid) {
      needsFix = true;
      reason += (reason ? ' + ' : '') + 'Status should be active (paid enrollment)';
    }

    // If no team member assigned → assign Lisa
    if (!project.assignedTeamMemberId && enrollment.coachingFeePaid) {
      needsFix = true;
      reason += (reason ? ' + ' : '') + 'No team member assigned';
    }

    // If no tasks → flag it
    if (project.taskCount === 0 || Number(project.taskCount) === 0) {
      needsFix = true;
      reason += (reason ? ' + ' : '') + 'No tasks created';
    }

    if (needsFix && project.id !== 480003) { // Skip Patrick, already fixed
      console.log(`  🔧 ${project.clientName} (project #${project.id}): ${reason}`);
      
      // Update project
      await conn.execute(
        `UPDATE client_projects SET 
          currentLifecycleStageId = GREATEST(currentLifecycleStageId, ?),
          status = CASE WHEN status = 'on_hold' AND ? = 1 THEN 'active' ELSE status END,
          assignedTeamMemberId = COALESCE(assignedTeamMemberId, 1),
          updatedAt = NOW()
        WHERE id = ?`,
        [shouldBeAtStage, enrollment.coachingFeePaid ? 1 : 0, project.id]
      );
      fixedCount++;
    }
  }

  console.log(`\n✅ Reconciliation complete: fixed ${fixedCount} additional projects`);

  // 6. Verify Patrick's fix
  console.log('\n--- Verification: Patrick Sprague ---');
  const [verifyProject] = await conn.execute(
    `SELECT id, clientName, currentLifecycleStageId, status, assignedTeamMemberId, workflowTemplateId, clientProtocolId
     FROM client_projects WHERE id = 480003`
  );
  console.log('Project:', JSON.stringify(verifyProject[0], null, 2));

  const [verifyTasks] = await conn.execute(
    `SELECT id, name, lifecycleStageId, assignedTeamMemberId, dueDate, status
     FROM project_tasks WHERE clientProjectId = 480003 ORDER BY sortOrder`
  );
  console.log(`Tasks (${verifyTasks.length}):`, JSON.stringify(verifyTasks, null, 2));

  await conn.end();
}

run().catch(err => { console.error('FATAL:', err); process.exit(1); });
