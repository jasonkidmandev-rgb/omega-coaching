import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Check existing metrics
const [metrics] = await connection.execute("SELECT * FROM client_metrics ORDER BY id DESC LIMIT 10");
console.log('Existing metrics:', JSON.stringify(metrics, null, 2));

// Check the schema of clientMetrics - does it have all required columns?
const [metricsCols] = await connection.execute("SHOW COLUMNS FROM client_metrics");
console.log('\nMetrics columns:');
for (const col of metricsCols) {
  console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default !== null ? 'DEFAULT ' + col.Default : ''}`);
}

// Check if the metricType column has an enum constraint
const metricTypeCol = metricsCols.find(c => c.Field === 'metricType');
console.log('\nmetricType column details:', JSON.stringify(metricTypeCol, null, 2));

// Try inserting a test metric to see if it works
try {
  const [result] = await connection.execute(
    "INSERT INTO client_metrics (clientProtocolId, userId, metricType, value, unit, notes, recordedAt, source) VALUES (930002, 1, 'weight', '181', 'lbs', 'test', NOW(), 'manual')"
  );
  console.log('\nTest insert result:', result);
  // Delete the test
  await connection.execute("DELETE FROM client_metrics WHERE notes = 'test' AND clientProtocolId = 930002");
  console.log('Test metric cleaned up');
} catch (e) {
  console.log('\nTest insert FAILED:', e.message);
}

await connection.end();
process.exit(0);
