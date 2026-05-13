import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Find Richard specifically
  const [richard] = await conn.execute(
    "SELECT id, email, clientName, status, coachingFeePaid, coachingFeeAmount, coachingFeePaidAt, coachingFeeStripePaymentId, intakeFormCompleted FROM transformation_enrollments WHERE id = 210005"
  );
  console.log("Richard (id=210005):", JSON.stringify(richard, null, 2));
  
  // All paid enrollments
  const [paid] = await conn.execute(
    "SELECT id, email, clientName, status, coachingFeePaid, coachingFeeAmount FROM transformation_enrollments WHERE coachingFeePaid = 1"
  );
  console.log("\nAll paid enrollments:", JSON.stringify(paid, null, 2));
  
  // Get users table for Richard
  const [users] = await conn.execute(
    "SELECT id, name, email FROM users WHERE name LIKE '%feyh%' OR email LIKE '%feyh%' OR name LIKE '%richard%'"
  );
  console.log("\nRichard in users table:", JSON.stringify(users, null, 2));
  
  // Get enrollments that have userId set
  const [withUser] = await conn.execute(
    "SELECT e.id, e.userId, e.email, e.clientName, e.status, e.coachingFeePaid, u.name as userName, u.email as userEmail FROM transformation_enrollments e LEFT JOIN users u ON e.userId = u.id WHERE e.userId IS NOT NULL"
  );
  console.log("\nEnrollments with userId:", JSON.stringify(withUser, null, 2));
  
  await conn.end();
}
main().catch(e => console.error(e));
