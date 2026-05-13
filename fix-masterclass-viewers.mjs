import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== FIXING MASTERCLASS VIEWER RECORDS ===\n');

// Get all "Masterclass Viewer" prospects
const [viewers] = await conn.query(`
  SELECT id, name, email, phone, status, source, createdAt
  FROM prospects 
  WHERE name = 'Masterclass Viewer'
  ORDER BY id
`);

console.log(`Found ${viewers.length} "Masterclass Viewer" records\n`);

// For each one, try to find their real name from:
// 1. Users table (by email)
// 2. Clients table (by email)
// 3. Email prefix as fallback

for (const v of viewers) {
  console.log(`\nProcessing #${v.id} (${v.email}):`);
  
  // Check users table
  const [users] = await conn.query(`SELECT id, name, email FROM users WHERE email = ?`, [v.email]);
  if (users.length > 0 && users[0].name && users[0].name !== 'Masterclass Viewer') {
    console.log(`  Found in users: "${users[0].name}" — updating`);
    await conn.query(`UPDATE prospects SET name = ? WHERE id = ?`, [users[0].name, v.id]);
    continue;
  }
  
  // Check clients table (case-insensitive email match)
  const [clients] = await conn.query(`SELECT id, name, email FROM clients WHERE LOWER(email) = LOWER(?)`, [v.email]);
  if (clients.length > 0 && clients[0].name) {
    console.log(`  Found in clients: "${clients[0].name}" — updating and linking`);
    await conn.query(`UPDATE prospects SET name = ?, clientId = ? WHERE id = ?`, [clients[0].name, clients[0].id, v.id]);
    continue;
  }
  
  // Check transformation_enrollments (case-insensitive email)
  const [enrollments] = await conn.query(`SELECT id, clientName, email FROM transformation_enrollments WHERE LOWER(email) = LOWER(?)`, [v.email]);
  if (enrollments.length > 0 && enrollments[0].clientName) {
    console.log(`  Found in enrollments: "${enrollments[0].clientName}" — updating`);
    await conn.query(`UPDATE prospects SET name = ? WHERE id = ?`, [enrollments[0].clientName, v.id]);
    continue;
  }
  
  // Fallback: derive name from email prefix
  const emailPrefix = v.email.split('@')[0];
  // Try to make it look like a name: replace dots/underscores with spaces, title case
  const derivedName = emailPrefix
    .replace(/[._]/g, ' ')
    .replace(/\d+$/, '') // remove trailing numbers
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .trim();
  
  if (derivedName && derivedName.length > 1) {
    console.log(`  Derived from email: "${derivedName}" — updating`);
    await conn.query(`UPDATE prospects SET name = ? WHERE id = ?`, [derivedName, v.id]);
  } else {
    console.log(`  Could not derive name — keeping as "Masterclass Viewer"`);
  }
}

// Now check if any of these newly-named prospects are duplicates of existing named prospects
console.log('\n\n=== CHECKING FOR NEW DUPLICATES AFTER RENAME ===\n');

const [allProspects] = await conn.query(`SELECT id, name, email, phone, status, source, enrollmentId, clientId FROM prospects ORDER BY name`);

const nameMap = new Map();
for (const p of allProspects) {
  const normName = p.name.toLowerCase().trim();
  if (!nameMap.has(normName)) nameMap.set(normName, []);
  nameMap.get(normName).push(p);
}

for (const [name, group] of nameMap.entries()) {
  if (group.length > 1) {
    console.log(`DUPLICATE: "${name}" (${group.length} records)`);
    
    // Auto-merge: keep the one with more data (enrollmentId, clientId, better status)
    const sorted = group.sort((a, b) => {
      // Prefer enrolled > engaged > contacted > new > viewing
      const statusOrder = { enrolled: 5, engaged: 4, contacted: 3, new: 2, viewing: 1, lost: 0 };
      const aScore = (statusOrder[a.status] || 0) + (a.enrollmentId ? 10 : 0) + (a.clientId ? 10 : 0) + (a.email && a.email !== 'no-email' ? 5 : 0) + (a.phone && a.phone !== 'N/A' && a.phone !== 'not-provided' ? 5 : 0);
      const bScore = (statusOrder[b.status] || 0) + (b.enrollmentId ? 10 : 0) + (b.clientId ? 10 : 0) + (b.email && b.email !== 'no-email' ? 5 : 0) + (b.phone && b.phone !== 'N/A' && b.phone !== 'not-provided' ? 5 : 0);
      return bScore - aScore; // Higher score first
    });
    
    const keep = sorted[0];
    const toDelete = sorted.slice(1);
    
    console.log(`  KEEPING: #${keep.id} (email=${keep.email}, status=${keep.status}, enrollmentId=${keep.enrollmentId}, clientId=${keep.clientId})`);
    
    for (const del of toDelete) {
      console.log(`  MERGING & DELETING: #${del.id} (email=${del.email}, status=${del.status})`);
      
      // Fill missing fields on keep from del
      const updates = [];
      const values = [];
      
      if ((!keep.email || keep.email === 'no-email') && del.email && del.email !== 'no-email') {
        updates.push('email = ?');
        values.push(del.email);
      }
      if ((keep.phone === 'N/A' || keep.phone === 'not-provided') && del.phone && del.phone !== 'N/A' && del.phone !== 'not-provided') {
        updates.push('phone = ?');
        values.push(del.phone);
      }
      if (!keep.enrollmentId && del.enrollmentId) {
        updates.push('enrollmentId = ?');
        values.push(del.enrollmentId);
      }
      if (!keep.clientId && del.clientId) {
        updates.push('clientId = ?');
        values.push(del.clientId);
      }
      if (!keep.source && del.source) {
        updates.push('source = ?');
        values.push(del.source);
      }
      
      if (updates.length > 0) {
        values.push(keep.id);
        await conn.query(`UPDATE prospects SET ${updates.join(', ')} WHERE id = ?`, values);
        console.log(`    Merged fields: ${updates.map(u => u.split(' = ')[0]).join(', ')}`);
      }
      
      // Move engagement records
      await conn.query(`UPDATE prospect_engagement SET prospectId = ? WHERE prospectId = ?`, [keep.id, del.id]);
      
      // Move SMS messages
      await conn.query(`UPDATE sms_messages SET prospectId = ? WHERE prospectId = ?`, [keep.id, del.id]);
      
      // Delete the duplicate
      await conn.query(`DELETE FROM prospects WHERE id = ?`, [del.id]);
      console.log(`    Deleted #${del.id}`);
    }
  }
}

// Final count
const [finalCount] = await conn.query(`SELECT COUNT(*) as count FROM prospects`);
const [finalViewers] = await conn.query(`SELECT COUNT(*) as count FROM prospects WHERE name = 'Masterclass Viewer'`);
console.log(`\n=== FINAL STATE ===`);
console.log(`Total prospects: ${finalCount[0].count}`);
console.log(`Remaining "Masterclass Viewer": ${finalViewers[0].count}`);

// Show the final clean list
console.log('\n=== CLEAN PROSPECT LIST ===\n');
const [finalList] = await conn.query(`SELECT id, name, email, phone, status, source FROM prospects ORDER BY name`);
for (const p of finalList) {
  console.log(`  #${p.id} | ${p.name} | ${p.email || 'no-email'} | ${p.phone} | ${p.status} | ${p.source || 'none'}`);
}

await conn.end();
