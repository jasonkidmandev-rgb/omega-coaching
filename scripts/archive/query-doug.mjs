import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get Doug Harris's latest protocol (id=1020001)
const [items] = await conn.execute(
  "SELECT * FROM client_protocol_items WHERE clientProtocolId = 1020001"
);
console.log('Protocol 1020001 items:', JSON.stringify(items, null, 2));

// Check PayPal orders for Doug's protocols
const [paypalOrders] = await conn.execute(
  "SELECT * FROM paypal_orders WHERE clientProtocolId IN (1020001, 720009) ORDER BY createdAt DESC"
);
console.log('\nPayPal orders:', JSON.stringify(paypalOrders, null, 2));

// Check the protocol payment link / invoice info
const [invoices] = await conn.execute(
  "SELECT * FROM protocol_invoices WHERE clientProtocolId IN (1020001, 720009) ORDER BY createdAt DESC"
);
console.log('\nProtocol invoices:', JSON.stringify(invoices, null, 2));

await conn.end();
