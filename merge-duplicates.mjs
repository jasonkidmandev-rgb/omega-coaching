import mysql from 'mysql2/promise';
const DATABASE_URL = process.env.DATABASE_URL;

async function run() {
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log('=== MERGING DUPLICATE PROSPECTS & ADDING CLIENT LINKAGE ===\n');

  // ============================================================
  // STEP 1: Add clientId column to prospects table if not exists
  // ============================================================
  console.log('--- Step 1: Add clientId column to prospects ---');
  try {
    await conn.execute(`ALTER TABLE prospects ADD COLUMN clientId INT NULL AFTER userId`);
    console.log('✅ Added clientId column');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('  clientId column already exists');
    } else {
      throw err;
    }
  }

  // ============================================================
  // STEP 2: Merge Patrick Sprague duplicates
  // ============================================================
  console.log('\n--- Step 2: Merge Patrick Sprague ---');
  
  // Keep #360001 (richer data: notes, SMS history, earlier creation)
  // Update email from typo to correct, copy enrollmentId from #420019
  await conn.execute(`
    UPDATE prospects SET 
      email = 'psprague@allstate.com',
      enrollmentId = 600001,
      status = 'enrolled',
      updatedAt = NOW()
    WHERE id = 360001
  `);
  console.log('  ✅ Updated prospect #360001: fixed email typo, added enrollmentId');

  // Delete the duplicate
  await conn.execute(`DELETE FROM prospects WHERE id = 420019`);
  console.log('  ✅ Deleted duplicate prospect #420019');

  // ============================================================
  // STEP 3: Merge Tim Sturdevant duplicates
  // ============================================================
  console.log('\n--- Step 3: Merge Tim Sturdevant ---');
  
  // Keep #270009 (earlier, has referral context)
  // Copy enrollmentId and enrolled status from #420021
  await conn.execute(`
    UPDATE prospects SET 
      enrollmentId = 660001,
      status = 'enrolled',
      notes = CONCAT(COALESCE(notes, ''), '\n\nEnrolled in essentials tier (enrollment #660001, $2500). Backfill merged.'),
      updatedAt = NOW()
    WHERE id = 270009
  `);
  console.log('  ✅ Updated prospect #270009: added enrollmentId, updated status to enrolled');

  // Delete the duplicate
  await conn.execute(`DELETE FROM prospects WHERE id = 420021`);
  console.log('  ✅ Deleted duplicate prospect #420021');

  // ============================================================
  // STEP 4: Fix "Masterclass Viewer" placeholder names
  // ============================================================
  console.log('\n--- Step 4: Fix Masterclass Viewer placeholders ---');
  
  // Try to match masterclass viewers to their actual names via email
  const [viewers] = await conn.execute(`
    SELECT p.id, p.email, u.name as userName, c.name as clientName
    FROM prospects p
    LEFT JOIN users u ON p.email = u.email
    LEFT JOIN clients c ON p.email = c.email
    WHERE p.name = 'Masterclass Viewer'
  `);
  
  let fixedNames = 0;
  for (const v of viewers) {
    const realName = v.userName || v.clientName;
    if (realName && realName !== 'Masterclass Viewer') {
      await conn.execute(`UPDATE prospects SET name = ?, updatedAt = NOW() WHERE id = ?`, [realName, v.id]);
      console.log(`  ✅ Renamed prospect #${v.id}: "Masterclass Viewer" → "${realName}" (matched by email ${v.email})`);
      fixedNames++;
    }
  }
  console.log(`  Fixed ${fixedNames} out of ${viewers.length} Masterclass Viewer records`);

  // ============================================================
  // STEP 5: Link ALL prospects to their client records by email
  // ============================================================
  console.log('\n--- Step 5: Link prospects to client records ---');
  
  const [linkResult] = await conn.execute(`
    UPDATE prospects p
    INNER JOIN clients c ON p.email = c.email
    SET p.clientId = c.id, p.updatedAt = NOW()
    WHERE p.clientId IS NULL AND p.email IS NOT NULL AND p.email != ''
  `);
  console.log(`  ✅ Linked ${linkResult.affectedRows} prospects to their client records`);

  // Also link by phone if email didn't match
  const [phoneLinkResult] = await conn.execute(`
    UPDATE prospects p
    INNER JOIN clients c ON p.phone = c.phone
    SET p.clientId = c.id, p.updatedAt = NOW()
    WHERE p.clientId IS NULL AND p.phone IS NOT NULL AND p.phone != '' AND p.phone != 'N/A' AND p.phone != 'not-provided'
  `);
  console.log(`  ✅ Linked ${phoneLinkResult.affectedRows} additional prospects by phone`);

  // ============================================================
  // STEP 6: Link prospects to their user accounts
  // ============================================================
  console.log('\n--- Step 6: Link prospects to user accounts ---');
  
  const [userLinkResult] = await conn.execute(`
    UPDATE prospects p
    INNER JOIN users u ON p.email = u.email
    SET p.userId = u.id, p.updatedAt = NOW()
    WHERE p.userId IS NULL AND p.email IS NOT NULL AND p.email != ''
  `);
  console.log(`  ✅ Linked ${userLinkResult.affectedRows} prospects to their user accounts`);

  // ============================================================
  // STEP 7: Verify — check for remaining duplicates
  // ============================================================
  console.log('\n--- Step 7: Verify — remaining duplicates ---');
  
  const [remainingDupes] = await conn.execute(`
    SELECT name, COUNT(*) as cnt, GROUP_CONCAT(id ORDER BY id) as ids
    FROM prospects
    WHERE name != 'Masterclass Viewer'
    GROUP BY name
    HAVING COUNT(*) > 1
    ORDER BY name
  `);
  
  if (remainingDupes.length === 0) {
    console.log('  ✅ No more duplicate prospects (excluding Masterclass Viewer placeholders)');
  } else {
    for (const d of remainingDupes) {
      console.log(`  ⚠️ Still duplicate: ${d.name} (IDs: ${d.ids})`);
    }
  }

  // Check email duplicates
  const [remainingEmailDupes] = await conn.execute(`
    SELECT email, COUNT(*) as cnt, GROUP_CONCAT(id ORDER BY id) as ids, GROUP_CONCAT(name ORDER BY id SEPARATOR ' | ') as names
    FROM prospects
    WHERE email IS NOT NULL AND email != ''
    GROUP BY email
    HAVING COUNT(*) > 1
    ORDER BY email
  `);
  
  if (remainingEmailDupes.length === 0) {
    console.log('  ✅ No duplicate emails in prospects');
  } else {
    for (const d of remainingEmailDupes) {
      console.log(`  ⚠️ Duplicate email: ${d.email} (IDs: ${d.ids}, Names: ${d.names})`);
    }
  }

  // ============================================================
  // STEP 8: Final stats
  // ============================================================
  console.log('\n--- Final Stats ---');
  const [stats] = await conn.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN clientId IS NOT NULL THEN 1 ELSE 0 END) as linkedToClient,
      SUM(CASE WHEN userId IS NOT NULL THEN 1 ELSE 0 END) as linkedToUser,
      SUM(CASE WHEN enrollmentId IS NOT NULL THEN 1 ELSE 0 END) as linkedToEnrollment,
      SUM(CASE WHEN name = 'Masterclass Viewer' THEN 1 ELSE 0 END) as stillPlaceholder
    FROM prospects
  `);
  console.log(`  Total prospects: ${stats[0].total}`);
  console.log(`  Linked to client: ${stats[0].linkedToClient}`);
  console.log(`  Linked to user: ${stats[0].linkedToUser}`);
  console.log(`  Linked to enrollment: ${stats[0].linkedToEnrollment}`);
  console.log(`  Still "Masterclass Viewer": ${stats[0].stillPlaceholder}`);

  await conn.end();
}

run().catch(err => { console.error('FATAL:', err); process.exit(1); });
