/**
 * Verify the people/personId rename still resolves against the real DB.
 * Drives the actual compiled Drizzle defs, not hand-written SQL, so it proves
 * the code<->DB column mapping (personId -> "contactId") is correct.
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, isNotNull } from 'drizzle-orm';
import {
  people, users, clientProtocols, customOrders, packingSlips,
  protocolComments, savedAddresses, prospects,
} from '../drizzle/schema.js';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

const check = async (label, fn) => {
  try {
    const rows = await fn();
    console.log(`✅ ${label}: ${rows.length} row(s)`);
    return rows;
  } catch (e) {
    console.log(`❌ ${label}: ${e.message}`);
    return null;
  }
};

// Whole-table selects — these expand every declared column, so they prove
// there is no schema/DB drift anywhere in these defs.
await check('select people', () => db.select().from(people).limit(5));
await check('select users', () => db.select().from(users).limit(5));
await check('select clientProtocols', () => db.select().from(clientProtocols).limit(5));
await check('select customOrders', () => db.select().from(customOrders).limit(5));
await check('select packingSlips', () => db.select().from(packingSlips).limit(5));
await check('select protocolComments', () => db.select().from(protocolComments).limit(5));
await check('select savedAddresses', () => db.select().from(savedAddresses).limit(5));
await check('select prospects', () => db.select().from(prospects).limit(5));

// personId must actually map to the physical contactId column
const joined = await check('join protocols -> people on personId', () =>
  db.select({ pid: clientProtocols.id, person: people.fullName, email: people.email })
    .from(clientProtocols)
    .innerJoin(people, eq(clientProtocols.personId, people.id))
    .limit(5));
if (joined) console.log('   sample:', JSON.stringify(joined[0]));

// saved_addresses must now resolve by person
const addr = await check('saved_addresses keyed by person', () =>
  db.select({ id: savedAddresses.id, person: savedAddresses.personId, label: savedAddresses.label })
    .from(savedAddresses).where(isNotNull(savedAddresses.personId)));
if (addr) console.log(`   ${addr.length}/9 addresses resolve to a person`);

// lifecycleStage must be nullable and staff must be NULL
const staffNull = await check('staff have NULL lifecycleStage', () =>
  db.select({ id: people.id, name: people.fullName, stage: people.lifecycleStage })
    .from(people).innerJoin(users, eq(users.personId, people.id))
    .where(eq(users.role, 'admin')));
if (staffNull) {
  const bad = staffNull.filter(r => r.stage !== null);
  console.log(bad.length ? `   ⚠️ ${bad.length} admin(s) still labelled: ${JSON.stringify(bad)}`
                         : '   ✅ all admins have no customer label');
}

await conn.end();
