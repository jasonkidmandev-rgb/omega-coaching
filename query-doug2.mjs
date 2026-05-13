import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check both Doug Harris protocols and their access tokens
const [protocols] = await conn.execute(
  "SELECT id, clientName, clientEmail, status, paymentStatus, accessToken, sentAt, isActiveVersion, previousVersionId FROM client_protocols WHERE clientEmail = 'dougwharris@gmail.com' ORDER BY createdAt DESC"
);
console.log('Doug Harris protocols:', JSON.stringify(protocols, null, 2));

// Check the protocol items for the LATEST protocol to see what he's being charged for
const [items] = await conn.execute(
  "SELECT cpi.id, cpi.clientProtocolId, cpi.isIncluded, cpi.customPrice, pi.name, pi.price FROM client_protocol_items cpi LEFT JOIN protocol_items pi ON cpi.protocolItemId = pi.id WHERE cpi.clientProtocolId = 1020001 AND cpi.isIncluded = 1"
);
console.log('\nIncluded items in protocol 1020001:', JSON.stringify(items, null, 2));

// Check what the client page query returns - look at how protocol is fetched by access token
const [latestToken] = await conn.execute(
  "SELECT id, accessToken FROM client_protocols WHERE id = 1020001"
);
console.log('\nLatest protocol access token:', JSON.stringify(latestToken, null, 2));

await conn.end();
