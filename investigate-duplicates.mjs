import mysql from 'mysql2/promise';
const DATABASE_URL = process.env.DATABASE_URL;

async function run() {
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log('=== INVESTIGATING DUPLICATE PROSPECTS ===\n');

  // 1. Find all prospects with duplicate names
  console.log('--- Duplicate Names in Prospects ---');
  const [dupeNames] = await conn.execute(`
    SELECT name, COUNT(*) as cnt, GROUP_CONCAT(id ORDER BY id) as ids,
           GROUP_CONCAT(email ORDER BY id SEPARATOR ' | ') as emails,
           GROUP_CONCAT(phone ORDER BY id SEPARATOR ' | ') as phones,
           GROUP_CONCAT(status ORDER BY id SEPARATOR ' | ') as statuses,
           GROUP_CONCAT(source ORDER BY id SEPARATOR ' | ') as sources,
           GROUP_CONCAT(COALESCE(enrollmentId, 'NULL') ORDER BY id SEPARATOR ' | ') as enrollmentIds,
           GROUP_CONCAT(COALESCE(userId, 'NULL') ORDER BY id SEPARATOR ' | ') as userIds
    FROM prospects
    GROUP BY name
    HAVING COUNT(*) > 1
    ORDER BY name
  `);
  for (const d of dupeNames) {
    console.log(`\n  NAME: ${d.name} (${d.cnt} records, IDs: ${d.ids})`);
    console.log(`    Emails: ${d.emails}`);
    console.log(`    Phones: ${d.phones}`);
    console.log(`    Statuses: ${d.statuses}`);
    console.log(`    Sources: ${d.sources}`);
    console.log(`    EnrollmentIds: ${d.enrollmentIds}`);
    console.log(`    UserIds: ${d.userIds}`);
  }

  // 2. Find all prospects with duplicate emails
  console.log('\n\n--- Duplicate Emails in Prospects ---');
  const [dupeEmails] = await conn.execute(`
    SELECT email, COUNT(*) as cnt, GROUP_CONCAT(id ORDER BY id) as ids,
           GROUP_CONCAT(name ORDER BY id SEPARATOR ' | ') as names,
           GROUP_CONCAT(status ORDER BY id SEPARATOR ' | ') as statuses,
           GROUP_CONCAT(source ORDER BY id SEPARATOR ' | ') as sources
    FROM prospects
    WHERE email IS NOT NULL AND email != ''
    GROUP BY email
    HAVING COUNT(*) > 1
    ORDER BY email
  `);
  for (const d of dupeEmails) {
    console.log(`\n  EMAIL: ${d.email} (${d.cnt} records, IDs: ${d.ids})`);
    console.log(`    Names: ${d.names}`);
    console.log(`    Statuses: ${d.statuses}`);
    console.log(`    Sources: ${d.sources}`);
  }

  // 3. Specifically look at Patrick Sprague
  console.log('\n\n--- Patrick Sprague: Full Details ---');
  const [patricks] = await conn.execute(`SELECT * FROM prospects WHERE name LIKE '%Patrick%' OR name LIKE '%Sprague%'`);
  for (const p of patricks) {
    console.log(`\n  Prospect #${p.id}:`, JSON.stringify(p, null, 4));
  }

  // 4. Check Patrick in clients table
  console.log('\n--- Patrick Sprague: Client Records ---');
  const [patrickClients] = await conn.execute(`SELECT * FROM clients WHERE name LIKE '%Patrick%' OR name LIKE '%Sprague%'`);
  for (const c of patrickClients) {
    console.log(`  Client #${c.id}: ${c.name}, email=${c.email}, phone=${c.phone}`);
  }

  // 5. Check Patrick in enrollments
  console.log('\n--- Patrick Sprague: Enrollments ---');
  const [patrickEnroll] = await conn.execute(`SELECT id, name, email, tier, coachingFeeAmount, coachingFeePaid FROM transformation_enrollments WHERE name LIKE '%Patrick%' OR name LIKE '%Sprague%'`);
  for (const e of patrickEnroll) {
    console.log(`  Enrollment #${e.id}: ${e.name}, email=${e.email}, tier=${e.tier}, paid=${e.coachingFeePaid}, amount=$${e.coachingFeeAmount}`);
  }

  // 6. Specifically look at Tim Sturdevant
  console.log('\n\n--- Tim Sturdevant: Full Details ---');
  const [tims] = await conn.execute(`SELECT * FROM prospects WHERE name LIKE '%Tim%' OR name LIKE '%Sturdevant%'`);
  for (const t of tims) {
    console.log(`\n  Prospect #${t.id}:`, JSON.stringify(t, null, 4));
  }

  // 7. Check Tim in clients table
  console.log('\n--- Tim Sturdevant: Client Records ---');
  const [timClients] = await conn.execute(`SELECT * FROM clients WHERE name LIKE '%Tim%' OR name LIKE '%Sturdevant%'`);
  for (const c of timClients) {
    console.log(`  Client #${c.id}: ${c.name}, email=${c.email}, phone=${c.phone}`);
  }

  // 8. Check Tim in enrollments
  console.log('\n--- Tim Sturdevant: Enrollments ---');
  const [timEnroll] = await conn.execute(`SELECT id, name, email, tier, coachingFeeAmount, coachingFeePaid FROM transformation_enrollments WHERE name LIKE '%Tim%' OR name LIKE '%Sturdevant%'`);
  for (const e of timEnroll) {
    console.log(`  Enrollment #${e.id}: ${e.name}, email=${e.email}, tier=${e.tier}, paid=${e.coachingFeePaid}, amount=$${e.coachingFeeAmount}`);
  }

  // 9. Check how many prospects have NULL clientId or enrollmentId
  console.log('\n\n--- Prospect Linkage Stats ---');
  const [linkStats] = await conn.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN enrollmentId IS NOT NULL THEN 1 ELSE 0 END) as hasEnrollment,
      SUM(CASE WHEN userId IS NOT NULL THEN 1 ELSE 0 END) as hasUserId,
      SUM(CASE WHEN enrollmentId IS NULL AND userId IS NULL THEN 1 ELSE 0 END) as orphaned
    FROM prospects
  `);
  console.log('  Total prospects:', linkStats[0].total);
  console.log('  Has enrollmentId:', linkStats[0].hasEnrollment);
  console.log('  Has userId:', linkStats[0].hasUserId);
  console.log('  Orphaned (no enrollment, no user):', linkStats[0].orphaned);

  // 10. Check if prospects table has a clientId column
  console.log('\n--- Prospects Table Columns ---');
  const [cols] = await conn.execute(`SHOW COLUMNS FROM prospects`);
  console.log(cols.map(c => c.Field).join(', '));

  await conn.end();
}

run().catch(err => { console.error('FATAL:', err); process.exit(1); });
