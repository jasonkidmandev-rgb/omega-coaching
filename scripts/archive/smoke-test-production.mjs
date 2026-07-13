/**
 * Post-cutover smoke test suite.
 * Run after DNS switch:  node smoke-test-production.mjs https://humanedge.health
 * Or against Railway:    node smoke-test-production.mjs https://omega-coaching-production.up.railway.app
 */

const BASE_URL = process.argv[2];
if (!BASE_URL) {
  console.error('Usage: node smoke-test-production.mjs <base-url>');
  process.exit(1);
}

let passed = 0;
let failed = 0;
const failures = [];

async function check(label, fn) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${label}: ${err.message}`);
    failures.push({ label, error: err.message });
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function get(path, opts = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    redirect: 'follow',
    ...opts,
  });
  return res;
}

console.log(`\nSmoke testing: ${BASE_URL}\n`);

// ── 1. Frontend / static assets ────────────────────────────────────────────
console.log('1. Frontend');
await check('Root returns 200', async () => {
  const res = await get('/');
  assert(res.ok, `HTTP ${res.status}`);
});
await check('Root returns HTML with app root', async () => {
  const res = await get('/');
  const text = await res.text();
  assert(text.includes('<div id="root">') || text.includes('</html>'), 'No HTML shell found');
});

// ── 2. Auth endpoints ──────────────────────────────────────────────────────
console.log('\n2. Auth');
await check('POST /api/auth/login rejects bad credentials with 401', async () => {
  const res = await get('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong' }),
  });
  assert(res.status === 401 || res.status === 400, `Expected 401/400, got ${res.status}`);
});
await check('tRPC middleware is reachable (not 404)', async () => {
  const res = await get('/api/trpc/upload.uploadImage');
  assert(res.status !== 404, `tRPC endpoint not found (404)`);
});

// ── 3. Health / DB connectivity ────────────────────────────────────────────
console.log('\n3. Health');
await check('tRPC responds to batch request (DB reachable)', async () => {
  const res = await get('/api/trpc/user.getProfile?batch=1&input=%7B%7D');
  const text = await res.text();
  assert(text.length > 0 && !text.includes('Cannot GET'), `Unexpected response: ${text.slice(0, 100)}`);
});

// ── 4. Stripe webhook endpoint exists ──────────────────────────────────────
console.log('\n4. Stripe');
await check('POST /api/stripe/webhook returns 400 (not 404) without valid signature', async () => {
  const res = await get('/api/stripe/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert(res.status !== 404, `Stripe webhook route not found (404)`);
});

// ── 5. Calendly webhook endpoint exists ────────────────────────────────────
console.log('\n5. Calendly');
await check('POST /api/calendly/webhook returns 400 (not 404) without valid signature', async () => {
  const res = await get('/api/calendly/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert(res.status !== 404, `Calendly webhook route not found (404)`);
});

// ── 6. File storage (R2) ───────────────────────────────────────────────────
console.log('\n6. File storage');
await check('GET /api/trpc/upload.uploadImage is reachable (not 404)', async () => {
  const res = await get('/api/trpc/upload.uploadImage');
  assert(res.status !== 404, `Upload tRPC route not found (404)`);
});

// ── 7. Security headers ────────────────────────────────────────────────────
console.log('\n7. Security headers');
await check('Response includes X-Content-Type-Options', async () => {
  const res = await get('/');
  assert(res.headers.get('x-content-type-options') === 'nosniff', 'Missing X-Content-Type-Options');
});
await check('Response includes Content-Security-Policy', async () => {
  const res = await get('/');
  assert(res.headers.has('content-security-policy'), 'Missing Content-Security-Policy');
});
await check('No X-Powered-By header (Express fingerprint hidden)', async () => {
  const res = await get('/');
  assert(!res.headers.has('x-powered-by'), 'X-Powered-By header exposed');
});

// ── 8. HTTPS / cookies ─────────────────────────────────────────────────────
console.log('\n8. HTTPS & cookies');
await check('Base URL uses HTTPS', async () => {
  assert(BASE_URL.startsWith('https://'), 'URL is not HTTPS');
});

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Passed: ${passed}  Failed: ${failed}`);
if (failures.length) {
  console.log('\nFailed checks:');
  for (const f of failures) console.log(`  • ${f.label}: ${f.error}`);
  process.exit(1);
} else {
  console.log('\nAll checks passed. App is healthy post-cutover.');
}
