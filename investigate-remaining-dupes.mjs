import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== FULL PROSPECT TABLE DUMP ===\n');

const [allProspects] = await conn.query(`
  SELECT id, name, email, phone, status, source, enrollmentId, clientId, createdAt
  FROM prospects 
  ORDER BY name, id
`);

console.log(`Total prospects: ${allProspects.length}\n`);

// Print all prospects
for (const p of allProspects) {
  console.log(`  #${p.id} | ${p.name} | ${p.email || 'no-email'} | ${p.phone || 'no-phone'} | status=${p.status} | source=${p.source || 'none'} | enrollmentId=${p.enrollmentId || 'none'} | clientId=${p.clientId || 'none'}`);
}

// Find duplicates by name
console.log('\n=== DUPLICATE DETECTION BY NAME ===\n');
const nameMap = new Map();
for (const p of allProspects) {
  const normName = p.name.toLowerCase().trim();
  if (!nameMap.has(normName)) nameMap.set(normName, []);
  nameMap.get(normName).push(p);
}

let dupeCount = 0;
for (const [name, group] of nameMap.entries()) {
  if (group.length > 1) {
    dupeCount++;
    console.log(`DUPLICATE NAME: "${name}" (${group.length} records)`);
    for (const p of group) {
      console.log(`  #${p.id} | email=${p.email || 'none'} | phone=${p.phone} | status=${p.status} | source=${p.source || 'none'} | enrollmentId=${p.enrollmentId || 'none'} | clientId=${p.clientId || 'none'} | created=${p.createdAt}`);
    }
    console.log('');
  }
}
if (dupeCount === 0) console.log('No name duplicates found.');

// Find duplicates by email
console.log('\n=== DUPLICATE DETECTION BY EMAIL ===\n');
const emailMap = new Map();
for (const p of allProspects) {
  if (p.email) {
    const normEmail = p.email.toLowerCase().trim();
    if (!emailMap.has(normEmail)) emailMap.set(normEmail, []);
    emailMap.get(normEmail).push(p);
  }
}

let emailDupeCount = 0;
for (const [email, group] of emailMap.entries()) {
  if (group.length > 1) {
    emailDupeCount++;
    console.log(`DUPLICATE EMAIL: "${email}" (${group.length} records)`);
    for (const p of group) {
      console.log(`  #${p.id} | name=${p.name} | phone=${p.phone} | status=${p.status} | source=${p.source || 'none'}`);
    }
    console.log('');
  }
}
if (emailDupeCount === 0) console.log('No email duplicates found.');

// Find duplicates by phone
console.log('\n=== DUPLICATE DETECTION BY PHONE ===\n');
const phoneMap = new Map();
for (const p of allProspects) {
  if (p.phone && p.phone !== 'N/A' && p.phone !== 'not-provided') {
    const normPhone = p.phone.replace(/[^\d+]/g, '');
    if (!phoneMap.has(normPhone)) phoneMap.set(normPhone, []);
    phoneMap.get(normPhone).push(p);
  }
}

let phoneDupeCount = 0;
for (const [phone, group] of phoneMap.entries()) {
  if (group.length > 1) {
    phoneDupeCount++;
    console.log(`DUPLICATE PHONE: "${phone}" (${group.length} records)`);
    for (const p of group) {
      console.log(`  #${p.id} | name=${p.name} | email=${p.email || 'none'} | status=${p.status}`);
    }
    console.log('');
  }
}
if (phoneDupeCount === 0) console.log('No phone duplicates found.');

// Check Tim specifically
console.log('\n=== TIM RECORDS SPECIFICALLY ===\n');
const [tims] = await conn.query(`SELECT * FROM prospects WHERE name LIKE '%Tim%' OR name LIKE '%tim%'`);
for (const t of tims) {
  console.log(`  #${t.id} | name=${t.name} | email=${t.email || 'none'} | phone=${t.phone} | status=${t.status} | source=${t.source || 'none'} | enrollmentId=${t.enrollmentId || 'none'} | clientId=${t.clientId || 'none'}`);
}

// Also check clients table for Tim
console.log('\n=== TIM IN CLIENTS TABLE ===\n');
const [timClients] = await conn.query(`SELECT id, name, email, phone FROM clients WHERE name LIKE '%Tim%' OR name LIKE '%tim%'`);
for (const t of timClients) {
  console.log(`  Client #${t.id} | name=${t.name} | email=${t.email || 'none'} | phone=${t.phone || 'none'}`);
}

await conn.end();
