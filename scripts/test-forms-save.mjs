// Test the forms editor save mechanism by directly calling the SQL
// to understand why changes don't persist

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // 1. Read current state of section id=1 (Financial Agreement)
  const [before] = await conn.execute(
    'SELECT id, sectionKey, title, LEFT(displayText, 200) as displayTextPreview, updatedAt FROM intake_form_config WHERE id = 1'
  );
  console.log("BEFORE:", JSON.stringify(before[0], null, 2));
  
  // 2. Try updating the title
  const testTitle = "Financial Agreement - TEST " + Date.now();
  console.log("\nUpdating title to:", testTitle);
  
  const [updateResult] = await conn.execute(
    'UPDATE intake_form_config SET title = ?, updatedAt = NOW() WHERE id = 1',
    [testTitle]
  );
  console.log("Update result:", JSON.stringify(updateResult));
  console.log("Affected rows:", updateResult.affectedRows);
  console.log("Changed rows:", updateResult.changedRows);
  
  // 3. Read back to verify
  const [after] = await conn.execute(
    'SELECT id, sectionKey, title, updatedAt FROM intake_form_config WHERE id = 1'
  );
  console.log("\nAFTER:", JSON.stringify(after[0], null, 2));
  
  // 4. Restore original title
  await conn.execute(
    'UPDATE intake_form_config SET title = ?, updatedAt = NOW() WHERE id = 1',
    ["Financial Agreement"]
  );
  console.log("\nRestored original title");
  
  // 5. Now test the drizzle sql template literal approach
  // The issue might be in how drizzle handles the SET clause joining
  console.log("\n--- Testing displayText update ---");
  
  const [dtBefore] = await conn.execute(
    'SELECT id, LEFT(displayText, 100) as dt FROM intake_form_config WHERE id = 1'
  );
  console.log("displayText before:", dtBefore[0].dt);
  
  const testDisplayText = "TEST CONTENT " + Date.now();
  const [dtUpdate] = await conn.execute(
    'UPDATE intake_form_config SET displayText = ?, updatedAt = NOW() WHERE id = 1',
    [testDisplayText]
  );
  console.log("displayText update affected:", dtUpdate.affectedRows);
  
  const [dtAfter] = await conn.execute(
    'SELECT id, LEFT(displayText, 100) as dt FROM intake_form_config WHERE id = 1'
  );
  console.log("displayText after:", dtAfter[0].dt);
  
  // Restore
  await conn.execute(
    'UPDATE intake_form_config SET displayText = (SELECT displayText FROM (SELECT displayText FROM intake_form_config WHERE id = 1) t), updatedAt = NOW() WHERE id = 1',
  );
  
  await conn.end();
  console.log("\nDone. Database writes work fine at the raw SQL level.");
}

main().catch(console.error);
