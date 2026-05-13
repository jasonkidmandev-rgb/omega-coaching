import mysql from 'mysql2/promise';

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });
  
  const [rows] = await conn.execute('SELECT id, status, tier, coachingFeePaid FROM transformation_enrollments WHERE id = 19');
  console.log('Enrollment 19:', JSON.stringify(rows, null, 2));
  
  const [progress] = await conn.execute('SELECT * FROM transformation_video_progress WHERE enrollmentId = 19');
  console.log('Video progress:', JSON.stringify(progress, null, 2));
  
  await conn.end();
}

check().catch(console.error);
