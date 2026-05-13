import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Soft-delete protocol #1530001 (the bare one without programId or project)
await conn.execute('UPDATE client_protocols SET deletedAt = NOW(), isActiveVersion = 0 WHERE id = 1530001');
console.log('Soft-deleted protocol #1530001');

// 2. Update enrollment to point to protocol #1530002 (the one with programId and project)
await conn.execute('UPDATE transformation_enrollments SET clientProtocolId = 1530002 WHERE clientProtocolId = 1530001');
console.log('Updated enrollment to point to protocol #1530002');

// 3. Ensure protocol #1530002 has clientId set
const [proto] = await conn.execute('SELECT id, clientId, clientEmail FROM client_protocols WHERE id = 1530002');
console.log('Protocol #1530002:', JSON.stringify(proto[0]));

const clientId = proto[0].clientId;
if (clientId === null || clientId === undefined) {
  const [client] = await conn.execute("SELECT id FROM clients WHERE email = 'slsboi@yahoo.com' LIMIT 1");
  if (client.length > 0) {
    await conn.execute('UPDATE client_protocols SET clientId = ? WHERE id = 1530002', [client[0].id]);
    console.log('Linked protocol #1530002 to client #' + client[0].id);
  }
}

// 4. Verify final state
const [finalProtos] = await conn.execute("SELECT id, clientName, isActiveVersion, deletedAt, programId FROM client_protocols WHERE clientEmail = 'slsboi@yahoo.com' ORDER BY id");
console.log('\n=== Final state ===');
finalProtos.forEach(p => console.log(JSON.stringify(p)));

// 5. Also check for any other duplicate protocols across all clients
const [dupes] = await conn.execute(`
  SELECT clientEmail, COUNT(*) as cnt 
  FROM client_protocols 
  WHERE deletedAt IS NULL AND isActiveVersion = 1 
  GROUP BY clientEmail 
  HAVING cnt > 1
`);
console.log('\n=== Other duplicate active protocols ===');
if (dupes.length === 0) {
  console.log('None found!');
} else {
  dupes.forEach(d => console.log(JSON.stringify(d)));
}

await conn.end();
