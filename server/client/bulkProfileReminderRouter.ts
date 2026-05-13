import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import * as db from "../db";
import { getDb } from "../db";
import { logAuditEvent, type AuditAction } from "../audit";
import { clientNotificationHistory } from "../../drizzle/schema";

export const bulkProfileReminderRouter = router({
  // Send bulk profile completion reminders to all clients with incomplete profiles
  send: adminProcedure
    .mutation(async ({ ctx }) => {
      const allProtocols = await db.getAllClientProtocols('active');
      const origin = ctx.req?.headers?.origin || 'https://peptidecoach.pro';
      
      const { sendProfileCompletionReminderEmail } = await import('../emailService');
      
      // Filter to incomplete profiles
      const incompleteProtocols = allProtocols.filter(p => {
        return !p.shippingStreet || !p.shippingCity || !p.shippingState || !p.shippingZip;
      });
      
      let sent = 0;
      let failed = 0;
      const results: { clientName: string; email: string | null; success: boolean }[] = [];
      
      for (const protocol of incompleteProtocols) {
        if (!protocol.clientEmail) {
          results.push({ clientName: protocol.clientName || 'Unknown', email: 'No email', success: false });
          failed++;
          continue;
        }
        
        // Determine missing fields
        const missingFields: string[] = [];
        if (!protocol.shippingStreet) missingFields.push('Street Address');
        if (!protocol.shippingCity) missingFields.push('City');
        if (!protocol.shippingState) missingFields.push('State');
        if (!protocol.shippingZip) missingFields.push('ZIP Code');
        if (!protocol.shippingPhone) missingFields.push('Phone Number');
        
        const protocolUrl = `${origin}/protocol/${protocol.accessToken}`;
        
        try {
          const result = await sendProfileCompletionReminderEmail({
            to: protocol.clientEmail,
            clientName: protocol.clientName || 'Valued Client',
            protocolUrl,
            missingFields,
          });
          
          if (result.success) {
            sent++;
            results.push({ clientName: protocol.clientName || 'Unknown', email: protocol.clientEmail, success: true });
            
            // Log notification
            const database = await getDb();
            if (database) {
              await database.insert(clientNotificationHistory).values({
                clientProtocolId: protocol.id,
                recipientEmail: protocol.clientEmail,
                recipientName: protocol.clientName || 'Valued Client',
                notificationType: 'profile_reminder',
                category: 'welcome',
                subject: 'Complete Your Profile - Omega Longevity',
                status: 'sent',
                sentAt: new Date(),
              });
            }
          } else {
            failed++;
            results.push({ clientName: protocol.clientName || 'Unknown', email: protocol.clientEmail, success: false });
            
            // Log failed notification
            const database = await getDb();
            if (database) {
              await database.insert(clientNotificationHistory).values({
                clientProtocolId: protocol.id,
                recipientEmail: protocol.clientEmail,
                recipientName: protocol.clientName || 'Valued Client',
                notificationType: 'profile_reminder',
                category: 'welcome',
                subject: 'Complete Your Profile - Omega Longevity',
                status: 'failed',
                errorMessage: 'Email sending failed',
              });
            }
          }
        } catch (error) {
          failed++;
          results.push({ clientName: protocol.clientName || 'Unknown', email: protocol.clientEmail, success: false });
        }
      }
      
      // Log the bulk action
      if (ctx.user) {
        await logAuditEvent({
          userId: ctx.user.id,
          action: 'update' as AuditAction,
          resourceType: 'client_protocol',
          description: `Sent bulk profile completion reminders to ${sent} clients`,
          details: { sent, failed, total: incompleteProtocols.length },
        });
      }
      
      return { sent, failed, total: incompleteProtocols.length, results };
    }),
});
