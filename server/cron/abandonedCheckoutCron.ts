/**
 * Abandoned Checkout Recovery Cron Job
 * 
 * Detects checkouts that were started but not completed within 24 hours,
 * then sends a recovery email nudging the user to come back and finish.
 * 
 * Schedule: Runs every 6 hours (6 AM, 12 PM, 6 PM, 12 AM)
 * 
 * Rules:
 * - Only sends ONE recovery email per abandoned checkout
 * - Only targets checkouts older than 24 hours with no completion
 * - Skips checkouts that already received a recovery email
 * - Logs all activity for admin visibility
 */
import { getDb } from '../db';
import { sql } from 'drizzle-orm';
import { sendTrackedEmail } from '../emailService';
import { generateAbandonedCheckoutEmail } from '../emailTemplates/abandonedCheckoutRecovery';

// Configuration
const ABANDONMENT_THRESHOLD_HOURS = 24;
const MAX_RECOVERY_EMAILS_PER_RUN = 50;
const CRON_INTERVAL_HOURS = 6;
const CRON_HOURS = [6, 12, 18, 0]; // Run at 6 AM, 12 PM, 6 PM, 12 AM

let cronInterval: NodeJS.Timeout | null = null;
let lastRunDate: string | null = null;
let lastRunHour: number | null = null;
let lastCronRunData: { timestamp: string; sent: number; failed: number; skipped: number } | null = null;

/**
 * Check if the cron job should run based on current time
 */
function shouldRunCron(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const runKey = `${now.toISOString().split('T')[0]}-${currentHour}`;

  // Only run during target hours, within the first 5 minutes
  if (CRON_HOURS.includes(currentHour) && currentMinute < 5) {
    if (lastRunDate !== runKey) {
      lastRunDate = runKey;
      return true;
    }
  }

  return false;
}

/**
 * Find and process abandoned checkouts
 */
async function runAbandonedCheckoutRecovery(): Promise<{ sent: number; failed: number; skipped: number }> {
  console.log('[Abandoned Checkout Cron] Starting recovery email job...');

  const database = await getDb();
  if (!database) {
    console.error('[Abandoned Checkout Cron] Database not available');
    return { sent: 0, failed: 0, skipped: 0 };
  }
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Find abandoned checkouts: started > 24h ago, not completed, no recovery email sent yet
    const result = await database.execute(sql`
      SELECT id, userId, email, clientName, planKey, planName, planPrice, startedAt, sessionId
      FROM abandoned_checkouts
      WHERE completedAt IS NULL
        AND recoveryEmailSentAt IS NULL
        AND startedAt < DATE_SUB(NOW(), INTERVAL ${ABANDONMENT_THRESHOLD_HOURS} HOUR)
        AND startedAt > DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY startedAt ASC
      LIMIT ${MAX_RECOVERY_EMAILS_PER_RUN}
    `);

    const abandonedCheckouts = (result[0] as unknown) as any[];

    if (abandonedCheckouts.length === 0) {
      console.log('[Abandoned Checkout Cron] No abandoned checkouts found');
      return { sent: 0, failed: 0, skipped: 0 };
    }

    console.log(`[Abandoned Checkout Cron] Found ${abandonedCheckouts.length} abandoned checkouts to process`);

    const origin = process.env.VITE_APP_URL || 'https://peptidecoach.pro';

    for (const checkout of abandonedCheckouts) {
      try {
        // Skip if no email
        if (!checkout.email) {
          console.log(`[Abandoned Checkout Cron] Skipping checkout ${checkout.id} - no email`);
          skipped++;
          continue;
        }

        // Double-check this checkout hasn't been completed in the meantime
        const checkResult = await database.execute(sql`
          SELECT completedAt FROM abandoned_checkouts WHERE id = ${checkout.id}
        `);
        const checkRow = ((checkResult[0] as unknown) as any[])[0];
        if (checkRow?.completedAt) {
          console.log(`[Abandoned Checkout Cron] Skipping checkout ${checkout.id} - already completed`);
          skipped++;
          continue;
        }

        // Generate checkout URL that takes them back to the exact plan
        const checkoutUrl = `${origin}/transformation/checkout?plan=${checkout.planKey}`;

        // Generate the email HTML
        const emailHtml = generateAbandonedCheckoutEmail({
          clientName: checkout.clientName || 'there',
          planName: checkout.planName,
          planPrice: Number(checkout.planPrice),
          planKey: checkout.planKey,
          checkoutUrl,
        });

        // Send the recovery email using tracked email for analytics
        const emailResult = await sendTrackedEmail({
          to: checkout.email,
          subject: `Your ${checkout.planName} is still waiting for you`,
          html: emailHtml,
          userId: checkout.userId || undefined,
          emailType: 'abandoned_checkout_recovery',
          category: 'payment',
          notificationType: 'abandoned_checkout_recovery',
          triggeredBy: 'cron',
        });

        if (emailResult.success) {
          // Mark recovery email as sent
          await database.execute(sql`
            UPDATE abandoned_checkouts
            SET recoveryEmailSentAt = NOW()
            WHERE id = ${checkout.id}
          `);
          sent++;
          console.log(`[Abandoned Checkout Cron] Recovery email sent to ${checkout.email} for ${checkout.planName} (checkout ID: ${checkout.id})`);
        } else {
          failed++;
          console.error(`[Abandoned Checkout Cron] Failed to send recovery email to ${checkout.email}: ${emailResult.message}`);
        }

        // Rate limit: wait 2 seconds between emails
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        failed++;
        console.error(`[Abandoned Checkout Cron] Error processing checkout ${checkout.id}:`, error);
      }
    }

  } catch (error) {
    console.error('[Abandoned Checkout Cron] Fatal error during recovery job:', error);
  }

  // Log the run
  lastCronRunData = {
    timestamp: new Date().toISOString(),
    sent,
    failed,
    skipped,
  };

  console.log(`[Abandoned Checkout Cron] Job complete: ${sent} sent, ${failed} failed, ${skipped} skipped`);
  return { sent, failed, skipped };
}

/**
 * Start the abandoned checkout recovery cron
 */
export function startAbandonedCheckoutCron(): void {
  console.log('[Abandoned Checkout Cron] Initializing abandoned checkout recovery scheduler...');
  console.log(`[Abandoned Checkout Cron] Scheduled to run at hours: ${CRON_HOURS.join(', ')}`);

  // Check every 5 minutes
  cronInterval = setInterval(() => {
    if (shouldRunCron()) {
      runAbandonedCheckoutRecovery();
    }
  }, 5 * 60 * 1000);

  // Also check immediately on startup
  if (shouldRunCron()) {
    runAbandonedCheckoutRecovery();
  }
}

/**
 * Stop the cron job
 */
export function stopAbandonedCheckoutCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('[Abandoned Checkout Cron] Stopped');
  }
}

/**
 * Get the last cron run status
 */
export function getLastAbandonedCheckoutCronRun() {
  return lastCronRunData;
}

/**
 * Manually trigger the recovery job (for admin use)
 */
export async function triggerAbandonedCheckoutRecovery() {
  return runAbandonedCheckoutRecovery();
}
