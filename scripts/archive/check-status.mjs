import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });
  
  const [rows] = await connection.execute('SELECT id, status FROM transformation_enrollments WHERE id = 21');
  console.log('Enrollment 21 status:', rows);
  
  // Also check video progress
  const [progress] = await connection.execute('SELECT * FROM masterclass_video_progress WHERE enrollmentId = 21');
  console.log('Video progress for enrollment 21:', progress);
  
  await connection.end();
}

main().catch(console.error);
