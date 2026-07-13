// Trigger the sendScheduledCheckins function by importing it directly
// This runs in the same Node.js context as the dev server

import { sendScheduledCheckins } from './server/cron/checkinCron.ts';

console.log('=== Triggering immediate check-in send ===');
try {
  await sendScheduledCheckins();
  console.log('=== Done ===');
} catch (err) {
  console.error('Error:', err);
}
process.exit(0);
