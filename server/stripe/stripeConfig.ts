// Set STRIPE_TEST_MODE=true in env to use test keys; false/absent = live keys
const isTestMode = process.env.STRIPE_TEST_MODE === 'true';

export function getStripeSecretKey(): string {
  return isTestMode
    ? (process.env.STRIPE_TEST_SECRET_KEY || '')
    : (process.env.STRIPE_SECRET_KEY || '');
}

export function getStripeWebhookSecret(): string {
  return isTestMode
    ? (process.env.STRIPE_TEST_WEBHOOK_SECRET || '')
    : (process.env.STRIPE_WEBHOOK_SECRET || '');
}

export function getStripePublishableKey(): string {
  return isTestMode
    ? (process.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || '')
    : (process.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
}

export function isStripeTestMode(): boolean {
  return isTestMode;
}
