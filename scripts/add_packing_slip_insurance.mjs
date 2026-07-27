import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [columns] = await connection.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'packing_slips' AND COLUMN_NAME = 'insuranceAmount'
  `);

  if (columns.length === 0) {
    console.log('Adding insuranceAmount column...');
    await connection.query(`
      ALTER TABLE packing_slips
      ADD COLUMN insuranceAmount DECIMAL(10,2) NULL
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
