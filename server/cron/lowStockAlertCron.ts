/**
 * Automated Low Stock Alert Cron Job
 * 
 * This module runs a daily cron job to automatically send low stock alert emails
 * to administrators when inventory items fall below their threshold.
 * 
 * Schedule: Runs once daily at 8:00 AM server time
 * 
 * IMPORTANT: Respects the `inventory_excluded_categories` site setting
 * to filter out categories the admin doesn't track (e.g., "Limitless Non-Stock",
 * "B Grade UW Branded Products", "Additional Inventory - Non Store").
 */

import * as db from '../db';
import { sendEmail } from '../emailService';
import { generateLowStockAlertEmail, LowStockAlertData } from '../emailTemplates/lowStockAlert';

// Configuration
const CRON_HOUR = 8;       // Run at 8 AM
const CRON_MINUTE = 0;     // Run at the start of the hour

// Default excluded categories (used if no setting is configured)
const DEFAULT_EXCLUDED_CATEGORIES = [
  'limitless non-stock',
  'b grade uw branded products',
  'additional inventory - non store',
];

let cronInterval: NodeJS.Timeout | null = null;
let lastRunDate: string | null = null;

/**
 * Check if the cron job should run based on current time
 * Runs once per day at the specified hour
 */
function shouldRunCron(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const today = now.toISOString().split('T')[0];
  
  // Only run if we're within the target hour and haven't run today
  if (currentHour === CRON_HOUR && currentMinute >= CRON_MINUTE && currentMinute < CRON_MINUTE + 5) {
    if (lastRunDate !== today) {
      lastRunDate = today;
      return true;
    }
  }
  
  return false;
}

// Store last cron run in memory
let lastCronRunData: { timestamp: string; alertsSent: number; itemsAlerted: number; excludedCount: number } | null = null;

/**
 * Log cron job execution
 */
function logCronRun(alertsSent: number, itemsAlerted: number, excludedCount: number = 0): void {
  lastCronRunData = {
    timestamp: new Date().toISOString(),
    alertsSent,
    itemsAlerted,
    excludedCount,
  };
  console.log(`[Low Stock Cron] Run logged: ${JSON.stringify(lastCronRunData)}`);
}

/**
 * Get the list of excluded categories from site settings
 */
async function getExcludedCategories(): Promise<string[]> {
  try {
    const excludedSetting = await db.getSiteSetting('inventory_excluded_categories');
    if (excludedSetting) {
      try {
        const parsed = JSON.parse(excludedSetting);
        return parsed.map((c: string) => c.toLowerCase());
      } catch {
        // Invalid JSON, fall through to defaults
      }
    }
  } catch (error) {
    console.error('[Low Stock Cron] Failed to read excluded categories setting:', error);
  }
  return DEFAULT_EXCLUDED_CATEGORIES;
}

/**
 * Execute the low stock alert job
 */
async function runLowStockAlertJob(): Promise<{ alertsSent: number; itemsAlerted: number }> {
  console.log('[Low Stock Cron] Starting automated low stock alert job...');
  
  try {
    // Get low stock items
    const allLowStockItems = await db.getLowStockItemsForAlert();
    
    if (allLowStockItems.length === 0) {
      console.log('[Low Stock Cron] No low stock items found');
      logCronRun(0, 0, 0);
      return { alertsSent: 0, itemsAlerted: 0 };
    }
    
    // Get excluded categories from settings
    const excludedCategories = await getExcludedCategories();
    console.log(`[Low Stock Cron] Excluded categories: ${excludedCategories.join(', ') || '(none)'}`);
    
    // Get all inventory categories to map categoryId -> name
    const allCategories = await db.getAllInventoryCategories();
    const categoryMap = new Map(allCategories.map(c => [c.id, c.name]));
    
    // Filter out items from excluded categories
    const lowStockItems = allLowStockItems.filter(item => {
      const catName = (categoryMap.get(item.categoryId) || 'Uncategorized').toLowerCase();
      return !excludedCategories.includes(catName);
    });
    
    const excludedCount = allLowStockItems.length - lowStockItems.length;
    if (excludedCount > 0) {
      console.log(`[Low Stock Cron] Filtered out ${excludedCount} items from excluded categories`);
    }
    
    if (lowStockItems.length === 0) {
      console.log('[Low Stock Cron] No low stock items after filtering excluded categories');
      logCronRun(0, 0, excludedCount);
      return { alertsSent: 0, itemsAlerted: 0 };
    }
    
    console.log(`[Low Stock Cron] Found ${lowStockItems.length} low stock items (${excludedCount} excluded)`);
    
    // Get admin emails
    const adminEmails = await db.getAdminEmails();
    
    if (adminEmails.length === 0) {
      console.log('[Low Stock Cron] No admin emails found');
      logCronRun(0, lowStockItems.length, excludedCount);
      return { alertsSent: 0, itemsAlerted: lowStockItems.length };
    }
    
    // Prepare email data with actual category names
    const emailData: LowStockAlertData = {
      items: lowStockItems.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
        categoryName: categoryMap.get(item.categoryId) || 'Uncategorized',
      })),
      adminName: 'Admin',
    };
    
    let alertsSent = 0;
    
    // Send email to each admin
    for (const adminEmail of adminEmails) {
      try {
        // Update admin name in email data
        emailData.adminName = 'Admin';
        
        // Generate email content
        const { subject, html } = await generateLowStockAlertEmail(emailData);
        
        const result = await sendEmail({
          to: adminEmail,
          subject,
          html,
        });
        
        if (result.success) {
          alertsSent++;
          console.log(`[Low Stock Cron] Alert sent to ${adminEmail}`);
        }
      } catch (error) {
        console.error(`[Low Stock Cron] Failed to send alert to ${adminEmail}:`, error);
      }
      
      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Check for out-of-stock items and create in-app notifications
    // (only for tracked categories, not excluded ones)
    const outOfStockItems = lowStockItems.filter(item => item.quantity === 0);
    if (outOfStockItems.length > 0) {
      try {
        const itemNames = outOfStockItems.map(i => i.name).slice(0, 3).join(', ');
        const moreText = outOfStockItems.length > 3 ? ` and ${outOfStockItems.length - 3} more` : '';
        await db.createNotificationsForEnabledUsers(
          'inventory_out_of_stock',
          'Inventory Out of Stock Alert',
          `${outOfStockItems.length} item(s) are out of stock: ${itemNames}${moreText}. Please restock immediately.`,
        );
        console.log(`[Low Stock Cron] Created out-of-stock notification for ${outOfStockItems.length} items`);
      } catch (notifError) {
        console.error('[Low Stock Cron] Failed to create out-of-stock notification:', notifError);
      }
    }

    console.log(`[Low Stock Cron] Job complete. Alerts sent: ${alertsSent}, Items alerted: ${lowStockItems.length}, Excluded: ${excludedCount}`);
    logCronRun(alertsSent, lowStockItems.length, excludedCount);
    
    return { alertsSent, itemsAlerted: lowStockItems.length };
    
  } catch (error) {
    console.error('[Low Stock Cron] Job failed:', error);
    return { alertsSent: 0, itemsAlerted: 0 };
  }
}

/**
 * Start the cron job scheduler
 * Checks every 5 minutes if it's time to run the daily job
 */
export function startLowStockAlertCron(): void {
  console.log('[Low Stock Cron] Initializing automated low stock alert scheduler...');
  console.log(`[Low Stock Cron] Scheduled to run daily at ${CRON_HOUR}:${CRON_MINUTE.toString().padStart(2, '0')}`);
  
  // Check every 5 minutes
  cronInterval = setInterval(() => {
    if (shouldRunCron()) {
      runLowStockAlertJob();
    }
  }, 5 * 60 * 1000); // 5 minutes
  
  // Also check immediately on startup (in case server restarts during cron window)
  if (shouldRunCron()) {
    runLowStockAlertJob();
  }
}

/**
 * Stop the cron job scheduler
 */
export function stopLowStockAlertCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('[Low Stock Cron] Scheduler stopped');
  }
}

/**
 * Manually trigger the low stock alert job (for testing or admin use)
 */
export async function triggerLowStockAlertJob(): Promise<{ alertsSent: number; itemsAlerted: number }> {
  console.log('[Low Stock Cron] Manual trigger requested');
  return runLowStockAlertJob();
}

/**
 * Get the last cron run status
 */
export function getLastLowStockCronRun(): { timestamp: string; alertsSent: number; itemsAlerted: number; excludedCount: number } | null {
  return lastCronRunData;
}
