import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== FULL CROSS-SYSTEM AUDIT ===\n');

// 1. Get all prospects
const [prospects] = await conn.execute('SELECT id, name, email, phone, status, source, clientId FROM prospects ORDER BY name');
console.log(`PROSPECTS TABLE: ${prospects.length} records`);

// 2. Get all clients
const [clients] = await conn.execute('SELECT id, name, email, phone FROM clients ORDER BY name');
console.log(`CLIENTS TABLE: ${clients.length} records`);

// 3. Get all client_projects
const [projects] = await conn.execute('SELECT id, clientProtocolId, clientName, clientEmail, status, currentLifecycleStageId, assignedTeamMemberId FROM client_projects ORDER BY clientName');
console.log(`CLIENT_PROJECTS TABLE: ${projects.length} records`);

// 4. Get all transformation_enrollments
const [enrollments] = await conn.execute('SELECT id, clientId, clientName, email, tier, status FROM transformation_enrollments ORDER BY clientName');
console.log(`TRANSFORMATION_ENROLLMENTS TABLE: ${enrollments.length} records`);

// 5. Get all users
const [users] = await conn.execute('SELECT id, name, email FROM users ORDER BY name');
console.log(`USERS TABLE: ${users.length} records\n`);

// --- CROSS-REFERENCE ANALYSIS ---

console.log('=== ORPHAN ANALYSIS ===\n');

// Prospects without a linked client
const prospectsNoClient = prospects.filter(p => !p.clientId);
console.log(`Prospects WITHOUT clientId link: ${prospectsNoClient.length}`);
prospectsNoClient.forEach(p => console.log(`  - ${p.name} (${p.email}) [prospect #${p.id}, status: ${p.status}]`));

// Clients without a prospect record
const prospectEmails = new Set(prospects.map(p => p.email?.toLowerCase()).filter(Boolean));
const prospectClientIds = new Set(prospects.map(p => p.clientId).filter(Boolean));
const clientsNoProspect = clients.filter(c => !prospectClientIds.has(c.id) && !prospectEmails.has(c.email?.toLowerCase()));
console.log(`\nClients WITHOUT a prospect record: ${clientsNoProspect.length}`);
clientsNoProspect.forEach(c => console.log(`  - ${c.name} (${c.email}) [client #${c.id}]`));

// Client projects without a matching client
const clientIds = new Set(clients.map(c => c.id));
// Match projects to clients by clientProtocolId -> client_protocols -> clients
const [clientProtocols] = await conn.execute('SELECT id, clientName, clientEmail FROM client_protocols');
const cpMap = {};
clientProtocols.forEach(cp => { cpMap[cp.id] = cp; });
const projectsNoClient = projects.filter(p => !cpMap[p.clientProtocolId]);
console.log(`\nClient Projects WITHOUT a matching client: ${projectsNoClient.length}`);
projectsNoClient.forEach(p => console.log(`  - ${p.clientName} [project #${p.id}, clientProtocolId: ${p.clientProtocolId}]`));

// Enrollments without a matching client
const enrollmentsNoClient = enrollments.filter(e => e.clientId && !clientIds.has(e.clientId));
console.log(`\nEnrollments WITHOUT a matching client: ${enrollmentsNoClient.length}`);
enrollmentsNoClient.forEach(e => console.log(`  - ${e.clientName} (${e.email}) [enrollment #${e.id}, clientId: ${e.clientId}]`));

console.log('\n=== DUPLICATE ANALYSIS ===\n');

// Duplicate prospects by email
const emailMap = {};
prospects.forEach(p => {
  const key = p.email?.toLowerCase();
  if (key && key !== 'no-email') {
    if (!emailMap[key]) emailMap[key] = [];
    emailMap[key].push(p);
  }
});
const dupEmails = Object.entries(emailMap).filter(([k, v]) => v.length > 1);
console.log(`Duplicate prospects by email: ${dupEmails.length} groups`);
dupEmails.forEach(([email, recs]) => {
  console.log(`  Email: ${email}`);
  recs.forEach(r => console.log(`    - #${r.id} ${r.name} (status: ${r.status}, clientId: ${r.clientId})`));
});

// Duplicate prospects by name (fuzzy)
const nameMap = {};
prospects.forEach(p => {
  const key = p.name?.toLowerCase().trim();
  if (key) {
    if (!nameMap[key]) nameMap[key] = [];
    nameMap[key].push(p);
  }
});
const dupNames = Object.entries(nameMap).filter(([k, v]) => v.length > 1);
console.log(`\nDuplicate prospects by exact name: ${dupNames.length} groups`);
dupNames.forEach(([name, recs]) => {
  console.log(`  Name: ${name}`);
  recs.forEach(r => console.log(`    - #${r.id} ${r.email} (status: ${r.status}, clientId: ${r.clientId})`));
});

// Duplicate clients by email
const clientEmailMap = {};
clients.forEach(c => {
  const key = c.email?.toLowerCase();
  if (key) {
    if (!clientEmailMap[key]) clientEmailMap[key] = [];
    clientEmailMap[key].push(c);
  }
});
const dupClientEmails = Object.entries(clientEmailMap).filter(([k, v]) => v.length > 1);
console.log(`\nDuplicate clients by email: ${dupClientEmails.length} groups`);
dupClientEmails.forEach(([email, recs]) => {
  console.log(`  Email: ${email}`);
  recs.forEach(r => console.log(`    - #${r.id} ${r.name}`));
});

// Duplicate client_projects by clientId
const projectClientMap = {};
projects.forEach(p => {
  const key = p.clientName?.toLowerCase().trim();
  if (!projectClientMap[key]) projectClientMap[key] = [];
  projectClientMap[key].push(p);
});
const dupProjects = Object.entries(projectClientMap).filter(([k, v]) => v.length > 1);
console.log(`\nClients with MULTIPLE projects: ${dupProjects.length}`);
dupProjects.forEach(([name, recs]) => {
  console.log(`  ${recs[0].clientName}:`);
  recs.forEach(r => console.log(`    - Project #${r.id} (status: ${r.status}, stage: ${r.currentLifecycleStageId}, assignedTo: ${r.assignedTeamMemberId})`));
});

console.log('\n=== LINKAGE SUMMARY ===\n');

// For each person, show their full chain
const allPeople = {};
prospects.forEach(p => {
  const key = p.email?.toLowerCase() || p.name?.toLowerCase();
  if (!allPeople[key]) allPeople[key] = { name: p.name, email: p.email };
  allPeople[key].prospect = p;
});
clients.forEach(c => {
  const key = c.email?.toLowerCase() || c.name?.toLowerCase();
  if (!allPeople[key]) allPeople[key] = { name: c.name, email: c.email };
  allPeople[key].client = c;
});

let fullyLinked = 0;
let partiallyLinked = 0;
let unlinked = 0;

Object.values(allPeople).forEach(person => {
  const hasProspect = !!person.prospect;
  const hasClient = !!person.client;
  const prospectLinked = person.prospect?.clientId && clientIds.has(person.prospect.clientId);
  
  if (hasProspect && hasClient && prospectLinked) fullyLinked++;
  else if (hasProspect && hasClient && !prospectLinked) partiallyLinked++;
  else unlinked++;
});

console.log(`Fully linked (prospect → client): ${fullyLinked}`);
console.log(`Partially linked (both exist but no clientId link): ${partiallyLinked}`);
console.log(`Unlinked (only in one table): ${unlinked}`);

await conn.end();
