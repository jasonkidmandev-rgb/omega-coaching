/**
 * Contacts Single Source of Truth Migration
 * 
 * Step 1: Add contactId columns to tables that don't have them
 * Step 2: Backfill contactId for ALL records across ALL tables
 * Step 3: Create contact records for orphans (people not yet in contacts)
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log('Connected to database');

  // ============================================================
  // STEP 1: Add contactId columns where missing
  // ============================================================
  console.log('\n=== STEP 1: Adding contactId columns ===');

  const tablesToAdd = [
    'client_projects',
    'custom_orders',
    'packing_slips',
    'appointments',
    'protocol_orders',
    'client_packages',
  ];

  for (const table of tablesToAdd) {
    try {
      const [cols] = await conn.query(`SHOW COLUMNS FROM ${table} LIKE 'contactId'`);
      if (cols.length === 0) {
        await conn.query(`ALTER TABLE ${table} ADD COLUMN contactId INT NULL`);
        await conn.query(`CREATE INDEX idx_${table}_contact ON ${table} (contactId)`);
        console.log(`  ✅ Added contactId to ${table}`);
      } else {
        console.log(`  ⏭️  ${table} already has contactId`);
      }
    } catch (e) {
      console.log(`  ❌ Error on ${table}: ${e.message}`);
    }
  }

  // ============================================================
  // STEP 2: Load all contacts for matching
  // ============================================================
  console.log('\n=== STEP 2: Loading contacts for matching ===');
  const [allContacts] = await conn.query('SELECT * FROM contacts');
  console.log(`  Loaded ${allContacts.length} contacts`);

  // Build lookup indexes
  const emailIndex = new Map(); // email → contact
  const phoneIndex = new Map(); // normalized phone → contact
  const nameIndex = new Map();  // normalized name → contact

  const normalizePhone = (p) => {
    if (!p) return null;
    const digits = p.replace(/\D/g, '');
    return digits.length >= 7 ? digits : null;
  };
  const normalizeName = (n) => n?.toLowerCase().replace(/[^a-z ]/g, '').trim() || '';

  for (const c of allContacts) {
    if (c.email) emailIndex.set(c.email.toLowerCase(), c);
    const phone = normalizePhone(c.phone);
    if (phone) phoneIndex.set(phone, c);
    const name = normalizeName(c.fullName || `${c.firstName || ''} ${c.lastName || ''}`);
    if (name && name.includes(' ')) nameIndex.set(name, c);
  }

  // Helper: find or create a contact
  async function findOrCreateContact(name, email, phone) {
    // Try email match
    if (email) {
      const match = emailIndex.get(email.toLowerCase());
      if (match) return match.id;
    }
    // Try phone match
    const normPhone = normalizePhone(phone);
    if (normPhone) {
      const match = phoneIndex.get(normPhone);
      if (match) return match.id;
    }
    // Try name match
    const normName = normalizeName(name);
    if (normName && normName.includes(' ')) {
      const match = nameIndex.get(normName);
      if (match) return match.id;
    }

    // No match — create new contact
    if (!name && !email) return null; // can't create without any info

    const parts = (name || '').trim().split(/\s+/);
    const firstName = parts[0] || null;
    const lastName = parts.slice(1).join(' ') || null;
    const fullName = name || null;

    const [result] = await conn.query(
      `INSERT INTO contacts (first_name, last_name, email, phone, lifecycle_stage, source, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 'lead', 'migration-backfill', NOW(), NOW())`,
      [firstName, lastName, email || null, phone || null]
    );
    const newId = result.insertId;
    const newContact = { id: newId, firstName, lastName, fullName, email, phone };
    
    // Update indexes
    if (email) emailIndex.set(email.toLowerCase(), newContact);
    if (normPhone) phoneIndex.set(normPhone, newContact);
    if (normName && normName.includes(' ')) nameIndex.set(normName, newContact);
    
    console.log(`    📝 Created new contact #${newId}: ${fullName || email}`);
    return newId;
  }

  // ============================================================
  // STEP 3: Backfill client_protocols (already has contactId, fill gaps)
  // ============================================================
  console.log('\n=== STEP 3: Backfilling client_protocols ===');
  const [protocols] = await conn.query('SELECT id, clientName, clientEmail, clientPhone, contactId FROM client_protocols WHERE contactId IS NULL');
  console.log(`  ${protocols.length} records need contactId`);
  let cpFilled = 0;
  for (const p of protocols) {
    const contactId = await findOrCreateContact(p.clientName, p.clientEmail, p.clientPhone);
    if (contactId) {
      await conn.query('UPDATE client_protocols SET contactId = ? WHERE id = ?', [contactId, p.id]);
      cpFilled++;
    }
  }
  console.log(`  ✅ Filled ${cpFilled}/${protocols.length}`);

  // ============================================================
  // STEP 4: Backfill prospects (already has contactId, fill gaps)
  // ============================================================
  console.log('\n=== STEP 4: Backfilling prospects ===');
  const [prosp] = await conn.query('SELECT id, name, email, phone, contactId FROM prospects WHERE contactId IS NULL');
  console.log(`  ${prosp.length} records need contactId`);
  let prFilled = 0;
  for (const p of prosp) {
    const contactId = await findOrCreateContact(p.name, p.email, p.phone);
    if (contactId) {
      await conn.query('UPDATE prospects SET contactId = ? WHERE id = ?', [contactId, p.id]);
      prFilled++;
    }
  }
  console.log(`  ✅ Filled ${prFilled}/${prosp.length}`);

  // ============================================================
  // STEP 5: Backfill users (already has contactId, fill gaps)
  // ============================================================
  console.log('\n=== STEP 5: Backfilling users ===');
  const [usrs] = await conn.query('SELECT id, name, email, phone, contactId FROM users WHERE contactId IS NULL');
  console.log(`  ${usrs.length} records need contactId`);
  let usFilled = 0;
  for (const u of usrs) {
    const contactId = await findOrCreateContact(u.name, u.email, u.phone);
    if (contactId) {
      await conn.query('UPDATE users SET contactId = ? WHERE id = ?', [contactId, u.id]);
      usFilled++;
    }
  }
  console.log(`  ✅ Filled ${usFilled}/${usrs.length}`);

  // ============================================================
  // STEP 6: Backfill transformation_enrollments (already has contactId, fill gaps)
  // ============================================================
  console.log('\n=== STEP 6: Backfilling transformation_enrollments ===');
  const [enrolls] = await conn.query(`
    SELECT te.id, te.contactId, te.userId, te.clientId, u.name, u.email, u.phone
    FROM transformation_enrollments te
    LEFT JOIN users u ON te.userId = u.id
    WHERE te.contactId IS NULL
  `);
  console.log(`  ${enrolls.length} records need contactId`);
  let teFilled = 0;
  for (const e of enrolls) {
    const contactId = await findOrCreateContact(e.name, e.email, e.phone);
    if (contactId) {
      await conn.query('UPDATE transformation_enrollments SET contactId = ? WHERE id = ?', [contactId, e.id]);
      teFilled++;
    }
  }
  console.log(`  ✅ Filled ${teFilled}/${enrolls.length}`);

  // ============================================================
  // STEP 7: Backfill client_projects (NEW contactId column)
  // ============================================================
  console.log('\n=== STEP 7: Backfilling client_projects ===');
  const [projects] = await conn.query('SELECT id, clientName, clientEmail FROM client_projects WHERE contactId IS NULL');
  console.log(`  ${projects.length} records need contactId`);
  let cpjFilled = 0;
  for (const p of projects) {
    const contactId = await findOrCreateContact(p.clientName, p.clientEmail, null);
    if (contactId) {
      await conn.query('UPDATE client_projects SET contactId = ? WHERE id = ?', [contactId, p.id]);
      cpjFilled++;
    }
  }
  console.log(`  ✅ Filled ${cpjFilled}/${projects.length}`);

  // ============================================================
  // STEP 8: Backfill custom_orders (NEW contactId column)
  // ============================================================
  console.log('\n=== STEP 8: Backfilling custom_orders ===');
  const [orders] = await conn.query('SELECT id, clientName, clientEmail FROM custom_orders WHERE contactId IS NULL');
  console.log(`  ${orders.length} records need contactId`);
  let coFilled = 0;
  for (const o of orders) {
    const contactId = await findOrCreateContact(o.clientName, o.clientEmail, null);
    if (contactId) {
      await conn.query('UPDATE custom_orders SET contactId = ? WHERE id = ?', [contactId, o.id]);
      coFilled++;
    }
  }
  console.log(`  ✅ Filled ${coFilled}/${orders.length}`);

  // ============================================================
  // STEP 9: Backfill packing_slips (NEW contactId column)
  // ============================================================
  console.log('\n=== STEP 9: Backfilling packing_slips ===');
  const [slips] = await conn.query('SELECT id, clientName, clientEmail FROM packing_slips WHERE contactId IS NULL');
  console.log(`  ${slips.length} records need contactId`);
  let psFilled = 0;
  for (const s of slips) {
    const contactId = await findOrCreateContact(s.clientName, s.clientEmail, null);
    if (contactId) {
      await conn.query('UPDATE packing_slips SET contactId = ? WHERE id = ?', [contactId, s.id]);
      psFilled++;
    }
  }
  console.log(`  ✅ Filled ${psFilled}/${slips.length}`);

  // ============================================================
  // STEP 10: Backfill client_packages (NEW contactId column)
  // ============================================================
  console.log('\n=== STEP 10: Backfilling client_packages ===');
  try {
    const [pkgs] = await conn.query('SELECT id, clientEmail FROM client_packages WHERE contactId IS NULL');
    console.log(`  ${pkgs.length} records need contactId`);
    let pkFilled = 0;
    for (const p of pkgs) {
      const contactId = await findOrCreateContact(null, p.clientEmail, null);
      if (contactId) {
        await conn.query('UPDATE client_packages SET contactId = ? WHERE id = ?', [contactId, p.id]);
        pkFilled++;
      }
    }
    console.log(`  ✅ Filled ${pkFilled}/${pkgs.length}`);
  } catch (e) {
    console.log(`  ⏭️  Skipped: ${e.message}`);
  }

  // ============================================================
  // FINAL: Summary
  // ============================================================
  console.log('\n=== FINAL SUMMARY ===');
  const [finalContacts] = await conn.query('SELECT COUNT(*) as cnt FROM contacts');
  console.log(`Total contacts: ${finalContacts[0].cnt} (was ${allContacts.length})`);
  console.log(`New contacts created: ${finalContacts[0].cnt - allContacts.length}`);

  // Verify fill rates
  const verifyTables = [
    ['client_protocols', 'contactId'],
    ['prospects', 'contactId'],
    ['users', 'contactId'],
    ['transformation_enrollments', 'contactId'],
    ['client_projects', 'contactId'],
    ['custom_orders', 'contactId'],
    ['packing_slips', 'contactId'],
  ];
  for (const [table, col] of verifyTables) {
    try {
      const [r] = await conn.query(`SELECT COUNT(*) as total, SUM(CASE WHEN ${col} IS NOT NULL THEN 1 ELSE 0 END) as filled FROM ${table}`);
      const pct = r[0].total > 0 ? Math.round(r[0].filled / r[0].total * 100) : 100;
      console.log(`  ${table}: ${r[0].filled}/${r[0].total} (${pct}%)`);
    } catch (e) {
      console.log(`  ${table}: ERROR - ${e.message}`);
    }
  }

  await conn.end();
  console.log('\n✅ Migration complete!');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
