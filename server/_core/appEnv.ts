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
//
// ── Why this file also handles local development (added 2026-07-29) ──────────
//
// APP_ENV used to default to 'production'. Combined with a committed `.env` that
// points DATABASE_URL at the live Railway database and SMTP_HOST at a real sender,
// that meant simply starting the server locally began running ~20 cron jobs against
// production with a working mailer: check-in dispatch every 5 minutes, low-score
// alerts every 15, payment reminders, and a startup check-in scan. Nobody had to do
// anything wrong; `pnpm dev` was enough. It made local verification unsafe, so
// changes were shipped on typecheck and build alone.
//
// The environment is now derived rather than assumed: production only when it is
// genuinely production. Everything else gets the same suppression staging already
// had, through the same `isStaging()` checks (now `sideEffectsDisabled()`).
//
// The escape hatch is deliberately opt-in and loud: set ALLOW_LOCAL_SIDE_EFFECTS=true
// to exercise crons/email locally, ideally against the Docker test DB
// (`pnpm testdb:up`). It should never be set in a shell that has production
// credentials loaded.

function deriveAppEnv(): string {
  const explicit = process.env.APP_ENV?.trim().toLowerCase();
  if (explicit) return explicit;
  // No APP_ENV set: trust NODE_ENV, and default to 'local' rather than 'production'.
  // The production start script sets NODE_ENV=production explicitly (see package.json),
  // so a real deployment still resolves to 'production'.
  return process.env.NODE_ENV === 'production' ? 'production' : 'local';
}

export const APP_ENV = deriveAppEnv();

/** True on the staging deployment. */
export function isStaging(): boolean {
  return APP_ENV === 'staging';
}

/** True for any non-deployed environment: local dev, tests, CI. */
export function isLocal(): boolean {
  return APP_ENV === 'local' || APP_ENV === 'development' || APP_ENV === 'test';
}

/** Explicit, opt-in override for exercising side effects outside production. */
export function localSideEffectsAllowed(): boolean {
  return process.env.ALLOW_LOCAL_SIDE_EFFECTS === 'true';
}

/**
 * True when outbound side effects must be suppressed: no cron jobs, no email, no
 * IMAP polling, Stripe forced to test mode.
 *
 * This is the check to use for anything that reaches a real person or takes real
 * money. Use `isStaging()` only when the behaviour is genuinely staging-specific.
 */
export function sideEffectsDisabled(): boolean {
  if (isStaging()) return true;
  if (isLocal()) return !localSideEffectsAllowed();
  return false;
}

/** One-line startup banner so the running mode is never a guess. */
export function describeAppEnv(): string {
  if (isStaging()) return `APP_ENV=staging — side effects suppressed (no crons, no email, Stripe test mode)`;
  if (isLocal()) {
    return localSideEffectsAllowed()
      ? `APP_ENV=${APP_ENV} with ALLOW_LOCAL_SIDE_EFFECTS=true — ⚠️  CRONS AND EMAIL ARE LIVE. Check DATABASE_URL and SMTP_HOST point somewhere safe.`
      : `APP_ENV=${APP_ENV} — side effects suppressed (no crons, no email, Stripe test mode). Set ALLOW_LOCAL_SIDE_EFFECTS=true to override.`;
  }
  return `APP_ENV=production — crons, email and live Stripe are ACTIVE.`;
}
