/**
 * Forensic investigation of the Trenary family (Bryan, Mark, Janis)
 */
import { createPool } from 'mysql2/promise';
const pool = createPool(process.env.DATABASE_URL);

async function investigate() {
  console.log("=== TRENARY FAMILY FORENSIC INVESTIGATION ===\n");

  // 1. All contacts
  console.log("--- 1. ALL CONTACTS WITH 'TRENARY' ---");
  const [contacts] = await pool.query(`
    SELECT id, first_name, last_name, full_name, email, phone, lifecycle_stage, created_at
    FROM contacts 
    WHERE full_name LIKE '%Trenary%' OR email LIKE '%trenary%' OR email LIKE '%financialreason%'
    ORDER BY id
  `);
  console.table(contacts);

  // 2. All users
  console.log("\n--- 2. ALL USERS WITH 'TRENARY' ---");
  const [users] = await pool.query(`
    SELECT id, name, email, role
    FROM users 
    WHERE name LIKE '%Trenary%' OR email LIKE '%trenary%' OR email LIKE '%financialreason%'
    ORDER BY id
  `);
  console.table(users);

  // 3. All client protocols (camelCase columns)
  console.log("\n--- 3. ALL CLIENT PROTOCOLS FOR TRENARY ---");
  const [protocols] = await pool.query(`
    SELECT id, clientName, clientEmail, clientPhone, contactId,
           status, accessToken, createdAt, deletedAt, archivedAt,
           version, versionName, isActiveVersion
    FROM client_protocols
    WHERE clientName LIKE '%Trenary%' 
       OR clientEmail LIKE '%trenary%' 
       OR clientEmail LIKE '%financialreason%'
       OR contactId IN (SELECT id FROM contacts WHERE full_name LIKE '%Trenary%' OR email LIKE '%trenary%' OR email LIKE '%financialreason%')
    ORDER BY id
  `);
  console.table(protocols);

  // 4. All client projects
  console.log("\n--- 4. ALL CLIENT PROJECTS FOR TRENARY ---");
  try {
    const [projects] = await pool.query(`
      SELECT id, clientName, clientEmail, clientPhone, contactId, projectName, status, createdAt
      FROM client_projects
      WHERE clientName LIKE '%Trenary%' 
         OR clientEmail LIKE '%trenary%' 
         OR clientEmail LIKE '%financialreason%'
         OR contactId IN (SELECT id FROM contacts WHERE full_name LIKE '%Trenary%' OR email LIKE '%trenary%' OR email LIKE '%financialreason%')
      ORDER BY id
    `);
    console.table(projects);
  } catch (e) { console.log('Projects query error:', e.message); }

  // 5. All prospects
  console.log("\n--- 5. ALL PROSPECTS FOR TRENARY ---");
  try {
    const [prospects] = await pool.query(`
      SELECT id, name, email, phone, contactId, stage, createdAt
      FROM prospects
      WHERE name LIKE '%Trenary%' OR email LIKE '%trenary%' OR email LIKE '%financialreason%'
         OR contactId IN (SELECT id FROM contacts WHERE full_name LIKE '%Trenary%' OR email LIKE '%trenary%' OR email LIKE '%financialreason%')
      ORDER BY id
    `);
    console.table(prospects);
  } catch (e) { console.log('Prospects query error:', e.message); }

  // 6. Protocol item counts
  console.log("\n--- 6. PROTOCOL ITEM COUNTS PER TRENARY PROTOCOL ---");
  const protocolIds = protocols.map(p => p.id);
  if (protocolIds.length > 0) {
    const [itemCounts] = await pool.query(`
      SELECT protocolId, COUNT(*) as itemCount
      FROM protocol_items
      WHERE protocolId IN (${protocolIds.join(',')})
      GROUP BY protocolId
      ORDER BY protocolId
    `);
    console.table(itemCounts);
  }

  // 7. Check-in status for Trenary protocols
  console.log("\n--- 7. CHECK-IN STATUS FOR TRENARY PROTOCOLS ---");
  try {
    const [checkIns] = await pool.query(`
      SELECT id, clientName, clientEmail, contactId,
             checkInEnabled, checkInFrequencyDays, lastCheckInSentAt, nextCheckInAt
      FROM client_protocols
      WHERE (clientName LIKE '%Trenary%' OR clientEmail LIKE '%trenary%' OR clientEmail LIKE '%financialreason%')
        AND deletedAt IS NULL
      ORDER BY id
    `);
    console.table(checkIns);
  } catch (e) { console.log('Check-in query error:', e.message); }

  // 8. Check-in email logs (check_in_emails table)
  console.log("\n--- 8. CHECK-IN EMAIL LOGS ---");
  try {
    const [logs] = await pool.query(`
      SELECT * FROM check_in_emails 
      WHERE recipientEmail LIKE '%trenary%' OR recipientEmail LIKE '%financialreason%'
         OR clientEmail LIKE '%trenary%' OR clientEmail LIKE '%financialreason%'
      ORDER BY sentAt DESC LIMIT 20
    `);
    console.table(logs);
  } catch (e) {
    console.log('check_in_emails table not found, trying email_logs...');
    try {
      const [logs2] = await pool.query(`
        SELECT * FROM email_logs 
        WHERE recipientEmail LIKE '%trenary%' OR recipientEmail LIKE '%financialreason%'
        ORDER BY sentAt DESC LIMIT 20
      `);
      console.table(logs2);
    } catch (e2) { console.log('No email log tables found:', e2.message); }
  }

  // 9. Bryan's contact record
  console.log("\n--- 9. BRYAN'S CONTACT RECORD ---");
  const [bryan] = await pool.query(`
    SELECT id, first_name, last_name, full_name, email, phone, lifecycle_stage
    FROM contacts 
    WHERE full_name LIKE '%Bryan%' AND (email LIKE '%financialreason%' OR full_name LIKE '%Trenary%')
    ORDER BY id
  `);
  console.table(bryan);

  // 10. Contacts sharing same email
  console.log("\n--- 10. CONTACTS SHARING SAME EMAIL ---");
  const [shared] = await pool.query(`
    SELECT email, COUNT(*) as cnt, GROUP_CONCAT(id ORDER BY id) as contact_ids, GROUP_CONCAT(full_name ORDER BY id) as names
    FROM contacts 
    WHERE email IN (
      SELECT email FROM contacts 
      WHERE (full_name LIKE '%Trenary%' OR email LIKE '%trenary%' OR email LIKE '%financialreason%')
      AND email IS NOT NULL AND email != ''
    )
    GROUP BY email
    ORDER BY cnt DESC
  `);
  console.table(shared);

  // 11. Check today's cron logs
  console.log("\n--- 11. TODAY'S CHECK-IN CRON STATUS ---");
  try {
    const [todayCron] = await pool.query(`
      SELECT id, clientName, clientEmail, lastCheckInSentAt, nextCheckInAt, checkInEnabled
      FROM client_protocols
      WHERE checkInEnabled = 1 AND deletedAt IS NULL
        AND (clientName LIKE '%Trenary%' OR clientEmail LIKE '%trenary%' OR clientEmail LIKE '%financialreason%')
    `);
    console.table(todayCron);
  } catch (e) { console.log('Cron query error:', e.message); }

  await pool.end();
}

investigate().catch(e => { console.error(e); process.exit(1); });
