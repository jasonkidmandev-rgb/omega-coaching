import { createPool } from 'mysql2/promise';

const pool = createPool(process.env.DATABASE_URL);

async function check() {
  // Find Shannon Randall's protocol
  const [protocols] = await pool.query(
    "SELECT id, clientName, clientEmail, status, engagementLevel, archivedAt, deletedAt FROM client_protocols WHERE clientName LIKE '%Shannon Randall%'"
  );
  console.log("=== Shannon Randall's Protocol(s) ===");
  console.log(JSON.stringify(protocols, null, 2));
  
  // Check her check-in schedules
  for (const p of protocols) {
    const [schedules] = await pool.query(
      "SELECT id, clientProtocolId, isEnabled, is_paused, frequency, dayOfWeek, timeOfDay, timezone, lastSentAt, nextScheduledAt FROM checkin_schedules WHERE clientProtocolId = ?",
      [p.id]
    );
    console.log(`\n=== Check-in Schedules for Protocol ${p.id} ===`);
    console.log(JSON.stringify(schedules, null, 2));
    
    // Check recent check-ins sent
    const [recentCheckins] = await pool.query(
      "SELECT id, status, sentAt, submittedAt, weekNumber FROM checkins WHERE clientProtocolId = ? ORDER BY sentAt DESC LIMIT 5",
      [p.id]
    );
    console.log(`\n=== Recent Check-ins for Protocol ${p.id} ===`);
    console.log(JSON.stringify(recentCheckins, null, 2));
  }
  
  await pool.end();
}
check();
