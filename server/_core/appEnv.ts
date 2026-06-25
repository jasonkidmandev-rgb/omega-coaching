// Single source of truth for the deployment environment.
//
// Set APP_ENV=staging on the staging deployment to neutralize ALL outbound
// side effects so a test environment can never touch a real customer:
//   - Stripe is forced into test mode (see stripeConfig.ts)
//   - Outbound email is suppressed (see emailService.ts transporter)
//   - Cron jobs and the email-reply IMAP poller do not start (see _core/index.ts)
//
// Anything left (DB, R2 bucket) is selected by its own env var, so point the
// staging deployment at a staging database and a staging R2 bucket.
export const APP_ENV = (process.env.APP_ENV || 'production').toLowerCase();

export function isStaging(): boolean {
  return APP_ENV === 'staging';
}
