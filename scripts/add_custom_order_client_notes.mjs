import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [columns] = await connection.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'custom_orders' AND COLUMN_NAME = 'clientNotes'
  `);

  if (columns.length === 0) {
    console.log('Adding clientNotes column...');
    await connection.query(`
      ALTER TABLE custom_orders
      ADD COLUMN clientNotes TEXT NULL
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
