import cron from 'node-cron';
import { deleteOldArchivedPackingSlips } from '../db';

/**
 * Cron job to automatically delete archived packing slips older than 30 days.
 * Runs daily at 3:00 AM to minimize impact on system performance.
 */
export function startArchivedPackingSlipCleanupCron() {
  console.log('[Archived Packing Slip Cleanup] Initializing cleanup scheduler...');
  console.log('[Archived Packing Slip Cleanup] Archived slips older than 30 days will be permanently deleted');
  console.log('[Archived Packing Slip Cleanup] Scheduled to run daily at 3:00 AM');
  
  // Run daily at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[Archived Packing Slip Cleanup] Running cleanup job...');
    
    try {
      const result = await deleteOldArchivedPackingSlips(30);
      
      if (result.deleted > 0) {
        console.log(`[Archived Packing Slip Cleanup] Permanently deleted ${result.deleted} archived packing slip(s) older than 30 days`);
      } else {
        console.log('[Archived Packing Slip Cleanup] No archived packing slips older than 30 days found');
      }
    } catch (error) {
      console.error('[Archived Packing Slip Cleanup] Error during cleanup:', error);
    }
  });
}

// Export for manual triggering if needed
export async function runArchivedPackingSlipCleanup() {
  console.log('[Archived Packing Slip Cleanup] Manual cleanup triggered...');
  const result = await deleteOldArchivedPackingSlips(30);
  console.log(`[Archived Packing Slip Cleanup] Deleted ${result.deleted} archived packing slip(s)`);
  return result;
}
