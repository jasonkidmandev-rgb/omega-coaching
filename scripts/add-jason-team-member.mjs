/**
 * Add Jason Kidman as a team member so tasks can be assigned to him.
 * Jason is the coach/owner — he needs a team_members record for task assignment.
 * We'll use ID 30004 to follow the existing pattern (Lisa=1, Shannon=30001, Kari=30002, Vee=30003).
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function main() {
  // Parse DATABASE_URL
  const url = new URL(DATABASE_URL);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Check if Jason already exists as a team member
    const [existing] = await connection.execute(
      "SELECT id, name, email, userId FROM team_members WHERE name LIKE '%Jason%' OR id = 30004"
    );
    
    if (existing.length > 0) {
      console.log("Jason already exists as a team member:", existing[0]);
      // Make sure he's active
      await connection.execute(
        "UPDATE team_members SET isActive = 1 WHERE id = ?",
        [existing[0].id]
      );
      console.log("Ensured Jason is active. ID:", existing[0].id);
    } else {
      // Find Jason's user account (the owner)
      const [users] = await connection.execute(
        "SELECT id, email, name FROM users WHERE name LIKE '%Jason%' OR email LIKE '%jason%' LIMIT 5"
      );
      console.log("Found users matching Jason:", users);
      
      // Also check OWNER_OPEN_ID or just look for the admin
      const [admins] = await connection.execute(
        "SELECT id, email, name, role FROM users WHERE role = 'admin' LIMIT 5"
      );
      console.log("Admin users:", admins);
      
      // Insert Jason as team member with ID 30004
      // We'll link to the owner's user account if we find it
      const ownerUser = admins.find(u => u.name?.toLowerCase().includes('jason')) || admins[0];
      const userId = ownerUser?.id || null;
      
      await connection.execute(
        "INSERT INTO team_members (id, userId, name, email, roleId, isActive) VALUES (30004, ?, 'Jason', ?, NULL, 1)",
        [userId, ownerUser?.email || 'jason@peptidecoach.pro']
      );
      console.log(`Inserted Jason as team member ID 30004, linked to user ID ${userId}`);
    }
    
    // Verify all team members
    const [allMembers] = await connection.execute(
      "SELECT id, name, email, userId, isActive FROM team_members ORDER BY id"
    );
    console.log("\nAll team members:");
    allMembers.forEach(m => console.log(`  ID ${m.id}: ${m.name} (email: ${m.email}, userId: ${m.userId}, active: ${m.isActive})`));
    
  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
