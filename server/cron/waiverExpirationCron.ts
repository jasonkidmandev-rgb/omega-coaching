import cron from 'node-cron';
import { getDb } from '../db';
import { storeWaivers, users, siteSettings } from '../../drizzle/schema';
import { eq, and, lt, isNotNull } from 'drizzle-orm';
import { sendEmail } from '../emailService';
import crypto from 'crypto';

const ENV = {
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@example.com',
  VITE_APP_TITLE: process.env.VITE_APP_TITLE || 'Omega Longevity',
  VITE_APP_URL: process.env.VITE_APP_URL || 'https://peptidecoach.pro',
};

// Days before expiration to send reminder
const REMINDER_DAYS_BEFORE = 7;

/**
 * Generate a secure renewal token
 */
function generateRenewalToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get waiver expiration months from settings
 */
async function getWaiverExpirationMonths(db: any): Promise<number> {
  const result = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, 'waiver_expiration_months'));
  
  if (result.length > 0 && result[0].value) {
    return parseInt(result[0].value, 10);
  }
  return 12; // Default to 12 months
}

/**
 * Check for expiring waivers and send renewal reminders
 * Runs daily at 8:00 AM
 */
export function initWaiverExpirationCron() {
  console.log('[Waiver Expiration Cron] Initializing waiver expiration checker...');
  
  // Run daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[Waiver Expiration Cron] Checking for expiring waivers...');
    
    try {
      // Calculate the date that is REMINDER_DAYS_BEFORE days from now
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + REMINDER_DAYS_BEFORE);
      
      // Find waivers that:
      // 1. Have an expiration date
      // 2. Expire within the next REMINDER_DAYS_BEFORE days
      // 3. Haven't had a reminder sent yet
      const db = await getDb();
      if (!db) {
        console.error('[Waiver Expiration Cron] Database not available');
        return;
      }
      const expiringWaivers = await db
        .select()
        .from(storeWaivers)
        .where(
          and(
            isNotNull(storeWaivers.expiresAt),
            lt(storeWaivers.expiresAt, reminderDate),
            eq(storeWaivers.renewalReminderSent, false)
          )
        );
      
      console.log(`[Waiver Expiration Cron] Found ${expiringWaivers.length} expiring waivers`);
      
      for (const waiver of expiringWaivers) {
        try {
          // Get user info
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, waiver.userId));
          
          if (!user || !user.email) {
            console.log(`[Waiver Expiration Cron] Skipping waiver ${waiver.id} - no user email`);
            continue;
          }
          
          const expiresAt = waiver.expiresAt ? new Date(waiver.expiresAt) : null;
          const daysUntilExpiry = expiresAt 
            ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 0;
          
          // Generate renewal token
          const renewalToken = generateRenewalToken();
          
          // Update waiver with renewal token
          await db
            .update(storeWaivers)
            .set({ 
              renewalReminderSent: true,
              renewalToken,
            })
            .where(eq(storeWaivers.id, waiver.id));
          
          // Generate renewal URL
          const renewalUrl = `${ENV.VITE_APP_URL}/waiver/renew/${renewalToken}`;
          
          // Send renewal reminder email
          await sendEmail({
            to: user.email,
            subject: `Your ${ENV.VITE_APP_TITLE} Store Waiver Expires Soon`,
            html: generateWaiverRenewalEmail(waiver.firstName, daysUntilExpiry, expiresAt, renewalUrl),
          });
          
          console.log(`[Waiver Expiration Cron] Sent renewal reminder to ${user.email}`);
        } catch (err) {
          console.error(`[Waiver Expiration Cron] Error processing waiver ${waiver.id}:`, err);
        }
      }
      
      console.log('[Waiver Expiration Cron] Completed waiver expiration check');
    } catch (error) {
      console.error('[Waiver Expiration Cron] Error checking expiring waivers:', error);
    }
  });
  
  console.log('[Waiver Expiration Cron] Scheduled to run daily at 8:00 AM');
}

/**
 * Generate the waiver renewal reminder email HTML
 */
function generateWaiverRenewalEmail(firstName: string, daysUntilExpiry: number, expiresAt: Date | null, renewalUrl: string): string {
  const expiryDateStr = expiresAt 
    ? expiresAt.toLocaleDateString('en-US', { timeZone: 'America/Denver', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'soon';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; border: 1px solid #334155;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 28px;">⚠️</span>
            </div>
            <h1 style="color: #f97316; margin: 0; font-size: 24px; font-weight: 600;">
              Waiver Renewal Required
            </h1>
          </div>
          
          <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi ${firstName},
          </p>
          
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Your ${ENV.VITE_APP_TITLE} Store waiver will expire in <strong style="color: #f97316;">${daysUntilExpiry} days</strong> (${expiryDateStr}).
          </p>
          
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
            To continue accessing the Omega Store and placing orders, please renew your waiver before it expires.
          </p>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${renewalUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Renew Waiver Now
            </a>
          </div>
          
          <div style="background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="color: #f97316; font-size: 14px; margin: 0;">
              <strong>Why is this required?</strong><br>
              <span style="color: #94a3b8;">Annual waiver renewal ensures you have reviewed and agreed to our current terms, liability waiver, and collaboration agreement.</span>
            </p>
          </div>
          
          <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
            If you have any questions, please contact us at support@omegalongevity.com
          </p>
          
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Calculate expiration date for a new waiver based on settings
 */
export async function calculateWaiverExpirationDate(): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  
  const expirationMonths = await getWaiverExpirationMonths(db);
  if (expirationMonths === 0) return null; // No expiration
  
  const expirationDate = new Date();
  expirationDate.setMonth(expirationDate.getMonth() + expirationMonths);
  return expirationDate;
}
