import { isStaging } from "../_core/appEnv";

// Evaluated at call time so dotenv has already populated process.env.
// Staging is always forced into test mode so a test deployment can never
// touch live Stripe, even if a live key is left in the environment.
function testMode(): boolean {
  return isStaging() || process.env.STRIPE_TEST_MODE === 'true';
}

export function getStripeSecretKey(): string {
  return testMode()
    ? (process.env.STRIPE_TEST_SECRET_KEY || '')
    : (process.env.STRIPE_SECRET_KEY || '');
}

export function getStripeWebhookSecret(): string {
  return testMode()
    ? (process.env.STRIPE_TEST_WEBHOOK_SECRET || '')
    : (process.env.STRIPE_WEBHOOK_SECRET || '');
}

export function getStripePublishableKey(): string {
  return testMode()
    ? (process.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || '')
    : (process.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
}

export function isStripeTestMode(): boolean {
  return testMode();
}
