# Security Note: Hardcoded Secret Fallbacks (VAPID Key Exposure)

**Date:** 2026-06-11
**Status:** Resolved (code removed) / one latent issue documented below
**Severity:** Low (no exploitable exposure found)

## The bug

`server/pushNotification.ts` (deleted in `c465985`) hardcoded the Web Push
VAPID key pair in source:

```ts
const VAPID_PUBLIC_KEY = 'BImRHF64hUETZkqsXEQgY4G4x6LD4YHadpgyOfhywetfK4U2VDr-JaGMvXBRNQp4jH2Df0wTEoG28432s90TLYM';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'hdLZP4FPM2tFbxmcj9nN6fid8IzbnOsxPk98CeykXHk';
```

The public key being in source is fine (it's public by design, and was also
in `sw.js`). The **private key** is the secret: it signs every push message
the server sends to browser push services. The `process.env.X || '<literal>'`
pattern means the "development fallback" silently became the production key,
and it was committed to GitHub.

## Impact assessment (verified 2026-06-11)

- The private key exists in the repo's git history (initial commit → `c465985`).
- **Production DB has 0 rows in `push_subscriptions` and 0 in
  `push_notification_logs`** — no device was ever subscribed.
- A leaked VAPID private key is only exploitable in combination with stored
  subscription endpoints (it lets an attacker push notifications to those
  devices — it cannot decrypt data or access anything else).
- With zero subscribers and the push feature now fully removed from the app,
  there is nothing to attack. **No rotation or history rewrite needed.**

## Resolution

- The entire push notification system (and this file) was removed in
  `c465985` as part of the SMS/push cleanup.
- If push is ever rebuilt: generate a fresh pair with
  `npx web-push generate-vapid-keys`, store the private key ONLY in Railway
  variables, and fail at startup if unset — never a literal fallback.
- A stale non-git copy of the old source tree at
  `d:\FreeLance\healthcoach_2\health-coach-protocol-app-source\` still
  contains this file; it does not deploy anywhere and should be deleted.

## Codebase audit for the same pattern (2026-06-11)

Searched all of server/ and client/ for `process.env.X || '<literal>'` with
secret-like names and for hardcoded key-shaped literals (Stripe `sk_`/`whsec_`,
Twilio SIDs, Google API keys, long base64/hex strings).

| Location | Finding | Verdict |
|---|---|---|
| `server/_core/encryption.ts:30` | PHI encryption key derivation falls back `JWT_SECRET \|\| "development-key"` when `PHI_ENCRYPTION_KEY` is unset (it is unset in production) | ⚠️ Latent — see below |
| `server/stripe/stripeConfig.ts` | Secrets fall back to `''` (fails closed) | ✅ OK |
| `server/emailService.ts` and others | Fallbacks are URLs / from-addresses, not secrets | ✅ OK |
| client bundle | No `sk_`/`whsec_`/JWT-shaped literals | ✅ OK |
| Everything else | Only charset strings and a base64 1×1 tracking GIF | ✅ OK |

### The one latent issue: `encryption.ts`

`getEncryptionKey()` derives the AES-256 PHI encryption key from, in order:
`PHI_ENCRYPTION_KEY` → `JWT_SECRET` → the literal `"development-key"`.

Mitigating factors, verified: the `encrypt()`/`encryptPhiFields()` service is
**exported but never imported anywhere** — no PHI is actually encrypted with
this key today, so nothing is currently at risk.

Why it's recorded: if anyone starts using `encrypt()` later,
(a) an unset `JWT_SECRET` would mean data encrypted under a key derived from
a public string, and (b) even in the normal case, rotating `JWT_SECRET`
would silently make previously encrypted PHI undecryptable because the two
secrets are coupled.

**Suggested fix when the service is first used:** set a dedicated
`PHI_ENCRYPTION_KEY` in Railway and change `getEncryptionKey()` to throw if
it is missing, removing both fallbacks.

## Rule going forward

Never write `process.env.SECRET || '<literal>'`. Secrets fail closed:
either `|| ''` with an explicit configured-check (Stripe pattern), or throw
at startup. Literal fallbacks are only acceptable for non-secrets
(URLs, display addresses, ports).
