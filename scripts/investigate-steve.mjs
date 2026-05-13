import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Find Steve Schmidt's records
const [protocols] = await conn.execute(
  `SELECT id, clientName, clientEmail, status, durationMonths, contactId, programId, version, isActiveVersion, createdAt, updatedAt
   FROM client_protocols 
   WHERE clientEmail = 'sisboi@yahoo.com' OR clientName LIKE '%Steve Schmidt%'
   ORDER BY id`
);
console.log("=== Steve Schmidt client_protocols ===");
protocols.forEach(p => console.log(JSON.stringify(p)));

// Check contacts
const [contacts] = await conn.execute(
  `SELECT id, firstName, lastName, email, createdAt, source
   FROM contacts 
   WHERE email = 'sisboi@yahoo.com' OR (firstName = 'Steve' AND lastName = 'Schmidt')
   ORDER BY id`
);
console.log("\n=== Steve Schmidt contacts ===");
contacts.forEach(c => console.log(JSON.stringify(c)));

// Check enrollments
const [enrollments] = await conn.execute(
  `SELECT id, firstName, lastName, email, status, createdAt, programId, protocolId
   FROM enrollments 
   WHERE email = 'sisboi@yahoo.com' OR (firstName = 'Steve' AND lastName = 'Schmidt')
   ORDER BY id`
);
console.log("\n=== Steve Schmidt enrollments ===");
enrollments.forEach(e => console.log(JSON.stringify(e)));

// Check for ALL duplicates in client_protocols (non-cancelled)
const [dupes] = await conn.execute(
  `SELECT clientEmail, clientName, COUNT(*) as cnt
   FROM client_protocols 
   WHERE status != 'cancelled' AND isActiveVersion = 1
   GROUP BY clientEmail, clientName
   HAVING cnt > 1
   ORDER BY cnt DESC`
);
console.log("\n=== All duplicate active client_protocols ===");
dupes.forEach(d => console.log(JSON.stringify(d)));

// Check projects for Steve
const [projects] = await conn.execute(
  `SELECT id, protocolId, name, status, createdAt
   FROM client_projects 
   WHERE protocolId IN (SELECT id FROM client_protocols WHERE clientEmail = 'sisboi@yahoo.com')
   ORDER BY id`
);
console.log("\n=== Steve Schmidt projects ===");
projects.forEach(p => console.log(JSON.stringify(p)));

// Check the exact timestamps to see if they were created at the same time (double-click / race condition)
const [timestamps] = await conn.execute(
  `SELECT id, createdAt, updatedAt, 
   TIMESTAMPDIFF(SECOND, LAG(createdAt) OVER (ORDER BY id), createdAt) as seconds_since_prev
   FROM client_protocols 
   WHERE clientEmail = 'sisboi@yahoo.com'
   ORDER BY id`
);
console.log("\n=== Timestamp analysis ===");
timestamps.forEach(t => console.log(JSON.stringify(t)));

await conn.end();
