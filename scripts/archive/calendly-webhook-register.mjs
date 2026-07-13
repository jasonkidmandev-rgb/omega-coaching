/**
 * Registers (or replaces) the Calendly webhook pointing at the production URL.
 *
 * Usage:
 *   CALENDLY_API_TOKEN=<token> node calendly-webhook-register.mjs https://humanedge.health
 *
 * What it does:
 *   1. Fetches the authenticated user's organisation URI from Calendly
 *   2. Lists existing webhook subscriptions and deletes any pointing at the old URL
 *   3. Creates a new subscription pointing at /api/calendly/webhook on the new domain
 */

const TOKEN = process.env.CALENDLY_API_TOKEN;
const BASE_URL = process.argv[2];

if (!TOKEN || !BASE_URL) {
  console.error('Usage: CALENDLY_API_TOKEN=<token> node calendly-webhook-register.mjs <base-url>');
  console.error('Example: CALENDLY_API_TOKEN=ey... node calendly-webhook-register.mjs https://humanedge.health');
  console.error('Note: Manus domains (peptides.manus.space / healthcoach-xykzygal.manus.space) will be deleted.');
  process.exit(1);
}

const WEBHOOK_URL = `${BASE_URL}/api/calendly/webhook`;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function calendly(method, path, body) {
  const res = await fetch(`https://api.calendly.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendly ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

// Step 1: get the current user + organisation URI
console.log('Fetching Calendly user info...');
const { resource: user } = await calendly('GET', '/users/me');
console.log(`  User: ${user.email}`);
console.log(`  Organisation: ${user.current_organization}`);

// Step 2: list existing subscriptions and remove any old ones
console.log('\nChecking existing webhook subscriptions...');
const { collection: existing } = await calendly(
  'GET',
  `/webhook_subscriptions?organization=${encodeURIComponent(user.current_organization)}&scope=organization`
);

for (const sub of existing) {
  console.log(`  Found: ${sub.callback_url}`);
  if (sub.callback_url !== WEBHOOK_URL) {
    console.log(`  Deleting old subscription: ${sub.uri}`);
    await calendly('DELETE', sub.uri.replace('https://api.calendly.com', ''));
    console.log('  Deleted.');
  } else {
    console.log('  Already points at the correct URL — no change needed.');
    process.exit(0);
  }
}

// Step 3: create new subscription
console.log(`\nCreating webhook subscription → ${WEBHOOK_URL}`);
const created = await calendly('POST', '/webhook_subscriptions', {
  url: WEBHOOK_URL,
  events: ['invitee.created', 'invitee.canceled'],
  organization: user.current_organization,
  scope: 'organization',
});
console.log(`\nDone. New subscription URI: ${created.resource.uri}`);
console.log(`Signing key: ${created.resource.signing_key}`);
console.log('\nNext step: add this signing key to Railway Variables as CALENDLY_WEBHOOK_SIGNING_KEY');
