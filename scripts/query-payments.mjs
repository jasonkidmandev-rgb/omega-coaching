import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const [payments] = await conn.execute("SELECT * FROM transformation_pending_payments ORDER BY createdAt DESC");
  console.log("All pending payments:", JSON.stringify(payments, null, 2));
  
  // Check PayPal payments for Richard
  const [enrollment] = await conn.execute(
    "SELECT id, email, clientName, status, coachingFeePaid, coachingFeeAmount, coachingFeePaidAt, coachingFeeStripePaymentId FROM transformation_enrollments WHERE id = 210005"
  );
  console.log("\nRichard enrollment details:", JSON.stringify(enrollment, null, 2));
  
  await conn.end();
}
main().catch(e => console.error(e));
