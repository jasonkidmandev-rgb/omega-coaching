// Script to enable check-ins for all active clients
import { db } from '../server/db.ts';
import { clientProtocols, checkinSchedules, checkinTemplates, checkinScheduleAuditLog } from '../drizzle/schema.ts';
import { eq, and } from 'drizzle-orm';

async function enableCheckins() {
  const database = await db();
  
  // Get all active clients
  const activeClients = await database
    .select({ id: clientProtocols.id, clientName: clientProtocols.clientName })
    .from(clientProtocols)
    .where(eq(clientProtocols.status, 'active'));
  
  console.log(`Found ${activeClients.length} active clients:`);
  activeClients.forEach(c => console.log(`  - ${c.clientName} (ID: ${c.id})`));
  
  // Get default template
  const [defaultTemplate] = await database
    .select()
    .from(checkinTemplates)
    .where(and(
      eq(checkinTemplates.isDefault, true),
      eq(checkinTemplates.isActive, true)
    ));
  
  if (!defaultTemplate) {
    console.error('No default template found!');
    process.exit(1);
  }
  
  console.log(`\nUsing template: ${defaultTemplate.name} (ID: ${defaultTemplate.id})`);
  
  // Calculate next Thursday at 10 AM
  const now = new Date();
  const nextThursday = new Date(now);
  const dayOfWeek = now.getDay();
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7;
  nextThursday.setDate(now.getDate() + daysUntilThursday);
  nextThursday.setHours(10, 0, 0, 0);
  
  console.log(`\nNext scheduled check-in: ${nextThursday.toISOString()}`);
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  for (const client of activeClients) {
    try {
      // Check if schedule exists
      const [existing] = await database
        .select()
        .from(checkinSchedules)
        .where(eq(checkinSchedules.clientProtocolId, client.id));
      
      if (existing) {
        // Update existing schedule
        await database
          .update(checkinSchedules)
          .set({
            isEnabled: true,
            templateId: defaultTemplate.id,
            nextScheduledAt: nextThursday,
          })
          .where(eq(checkinSchedules.id, existing.id));
        console.log(`  ✓ Updated: ${client.clientName}`);
        updated++;
      } else {
        // Create new schedule
        await database.insert(checkinSchedules).values({
          clientProtocolId: client.id,
          templateId: defaultTemplate.id,
          isEnabled: true,
          frequency: 'weekly',
          dayOfWeek: 4, // Thursday
          timeOfDay: '10:00',
          nextScheduledAt: nextThursday,
        });
        console.log(`  ✓ Created: ${client.clientName}`);
        created++;
      }
      
      // Log to audit
      await database.insert(checkinScheduleAuditLog).values({
        clientProtocolId: client.id,
        changedByName: 'System',
        changedByEmail: 'system@peptidecoach.pro',
        action: 'bulk_enabled',
        notes: 'Bulk enabled check-ins for all active clients',
      });
    } catch (error) {
      console.error(`  ✗ Error for ${client.clientName}: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${activeClients.length}`);
  
  process.exit(0);
}

enableCheckins().catch(console.error);
