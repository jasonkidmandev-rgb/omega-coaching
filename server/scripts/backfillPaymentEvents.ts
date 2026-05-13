/**
 * Backfill Payment Events Script
 * 
 * This script creates historical payment events from existing client_protocols data.
 * It should be run once to populate the payment_events table with historical data.
 */

import { getDb } from '../db';
import { clientProtocols, paymentEvents } from '../../drizzle/schema';
import { desc, isNotNull, eq } from 'drizzle-orm';

export async function backfillPaymentEvents() {
  const db = await getDb();
  if (!db) {
    console.error('[BackfillPaymentEvents] Database not available');
    return { success: false, error: 'Database not available' };
  }

  console.log('[BackfillPaymentEvents] Starting backfill...');
  
  try {
    // Get all protocols with payment data
    const protocols = await db.select().from(clientProtocols).orderBy(desc(clientProtocols.createdAt));
    
    let createdEvents = 0;
    let skippedEvents = 0;
    
    for (const protocol of protocols) {
      // Check if events already exist for this protocol
      const existingEvents = await db.select()
        .from(paymentEvents)
        .where(eq(paymentEvents.clientProtocolId, protocol.id));
      
      if (existingEvents.length > 0) {
        skippedEvents++;
        continue;
      }
      
      // Create payment_due event when protocol was approved/sent
      if (protocol.status === 'active' || protocol.status === 'completed' || protocol.status === 'pending_approval') {
        // Calculate total amount from protocol
        const totalAmount = protocol.coachingPrice ? parseFloat(protocol.coachingPrice) : 0;
        
        await db.insert(paymentEvents).values({
          clientProtocolId: protocol.id,
          eventType: 'payment_due',
          amount: totalAmount > 0 ? totalAmount.toFixed(2) : null,
          notes: `Protocol ${protocol.status} - payment became due`,
          createdAt: protocol.approvedAt || protocol.sentAt || protocol.createdAt || new Date(),
        });
        createdEvents++;
        
        // Create payment_received event if payment was received
        if (protocol.paymentStatus === 'paid' && protocol.paymentReceivedAt) {
          await db.insert(paymentEvents).values({
            clientProtocolId: protocol.id,
            eventType: 'payment_received',
            amount: totalAmount > 0 ? totalAmount.toFixed(2) : null,
            paymentMethod: protocol.paymentMethod || null,
            notes: `Payment received via ${protocol.paymentMethod || 'unknown method'}`,
            createdAt: protocol.paymentReceivedAt,
          });
          createdEvents++;
        }
      }
    }
    
    console.log(`[BackfillPaymentEvents] Complete: ${createdEvents} events created, ${skippedEvents} protocols skipped (already had events)`);
    
    return {
      success: true,
      createdEvents,
      skippedEvents,
      totalProtocols: protocols.length,
    };
  } catch (error) {
    console.error('[BackfillPaymentEvents] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Run if called directly
if (require.main === module) {
  backfillPaymentEvents().then((result) => {
    console.log('Backfill result:', result);
    process.exit(result.success ? 0 : 1);
  });
}
