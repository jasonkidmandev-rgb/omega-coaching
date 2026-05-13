// Trenary Family Contact Fix - Approved by user
import { createPool } from 'mysql2/promise';

const pool = createPool(process.env.DATABASE_URL);

async function run() {
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();
    
    console.log("=== TRENARY FAMILY CONTACT FIX ===\n");
    
    // STEP 0: Verify current state
    console.log("--- BEFORE STATE ---");
    const [contact27] = await conn.query('SELECT id, first_name, last_name, email FROM contacts WHERE id = 27');
    const [contact30013] = await conn.query('SELECT id, first_name, last_name, email FROM contacts WHERE id = 30013');
    console.log("Contact #27:", contact27[0]);
    console.log("Contact #30013:", contact30013[0]);
    
    const [protocols] = await conn.query('SELECT id, clientName, clientEmail, contactId FROM client_protocols WHERE id IN (210001, 930003, 1200002)');
    console.log("Protocols:", protocols);
    
    const [prospect] = await conn.query('SELECT id, name, email, contactId FROM prospects WHERE id = 420002');
    console.log("Prospect #420002:", prospect[0]);
    
    // STEP 1: Fix contact #27 - rename to Bryan Trenary
    console.log("\n--- STEP 1: Fix contact #27 → Bryan Trenary ---");
    await conn.query(
      'UPDATE contacts SET first_name = ?, last_name = ? WHERE id = 27',
      ['Bryan', 'Trenary']
    );
    console.log("✅ Contact #27 renamed to Bryan Trenary (email stays bryan@financialreason.com)");
    
    // STEP 2: Re-link Janis's protocols to contact #30013
    console.log("\n--- STEP 2: Re-link Janis protocols to contact #30013 ---");
    const [result1] = await conn.query(
      'UPDATE client_protocols SET contactId = 30013 WHERE id = 930003'
    );
    console.log(`✅ Protocol #930003 (Janis v2 archived): contactId → 30013 (rows: ${result1.affectedRows})`);
    
    const [result2] = await conn.query(
      'UPDATE client_protocols SET contactId = 30013 WHERE id = 1200002'
    );
    console.log(`✅ Protocol #1200002 (Janis v3 active): contactId → 30013 (rows: ${result2.affectedRows})`);
    
    // STEP 3: Re-link prospect #420002 to contact #30013
    console.log("\n--- STEP 3: Re-link prospect #420002 to contact #30013 ---");
    const [result3] = await conn.query(
      'UPDATE prospects SET contactId = 30013 WHERE id = 420002'
    );
    console.log(`✅ Prospect #420002 (Janis): contactId → 30013 (rows: ${result3.affectedRows})`);
    
    // STEP 4: Verify final state
    console.log("\n--- AFTER STATE ---");
    const [c27After] = await conn.query('SELECT id, first_name, last_name, email FROM contacts WHERE id = 27');
    const [c30013After] = await conn.query('SELECT id, first_name, last_name, email FROM contacts WHERE id = 30013');
    console.log("Contact #27:", c27After[0]);
    console.log("Contact #30013:", c30013After[0]);
    
    const [protocolsAfter] = await conn.query('SELECT id, clientName, clientEmail, contactId FROM client_protocols WHERE id IN (210001, 930003, 1200002)');
    console.log("Protocols:", protocolsAfter);
    
    const [prospectAfter] = await conn.query('SELECT id, name, email, contactId FROM prospects WHERE id = 420002');
    console.log("Prospect #420002:", prospectAfter[0]);
    
    // Verify protocol items are intact
    for (const pid of [180003, 210001, 930003, 1200002]) {
      const [items] = await conn.query('SELECT COUNT(*) as cnt FROM client_protocol_items WHERE clientProtocolId = ?', [pid]);
      console.log(`Protocol #${pid} items: ${items[0].cnt}`);
    }
    
    await conn.commit();
    console.log("\n✅ ALL CHANGES COMMITTED SUCCESSFULLY");
    
  } catch (error) {
    await conn.rollback();
    console.error("\n❌ ERROR - ALL CHANGES ROLLED BACK:", error.message);
    throw error;
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
