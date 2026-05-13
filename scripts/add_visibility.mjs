import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // Check if column already exists
  const [columns] = await connection.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'client_protocols' AND COLUMN_NAME = 'clientVisibility'
  `);
  
  if (columns.length === 0) {
    console.log('Adding clientVisibility column...');
    await connection.query(`
      ALTER TABLE client_protocols 
      ADD COLUMN clientVisibility ENUM('hidden', 'option', 'active', 'archived') NOT NULL DEFAULT 'active'
    `);
    console.log('Column added successfully!');
  } else {
    console.log('Column already exists');
  }
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
