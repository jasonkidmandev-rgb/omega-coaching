# humanedge.health — Architecture Audit

**Date:** 2026-06-23
**Scope:** Runtime/process model, background jobs, in-memory state, database layer, code structure, security/compliance, observability, data safety.
**Purpose:** Assess fitness of the Railway (humanedge.health) deployment for scalability and reliability before live customers are migrated off Manus. Feeds the architecture map and the cutover plan.
**Method:** Direct source inspection of `migration-export-package/health-coach-protocol-app-source` with evidence cited as `file:line`.

> **Calibration:** This is a single-tenant system serving one coaching business at modest load. Severity is rated against that reality, not cloud-scale. Over-engineering (Redis, job queues, multi-region) would be its own mistake. The point of this audit is reliability, data safety, and avoiding foot-guns — not premature scale.

---

## Architecture summary

A single Node process (`node dist/index.js`, see `package.json` `start`) runs the Express + tRPC API, serves the React build, **and** runs ~24 cron jobs plus a Gmail IMAP poller in-process. tRPC v11 + Drizzle ORM over one MySQL database (169 tables; hand-written SQL migrations `drizzle/0000–0115`). Auth: JWT with DB-backed sessions. Integrations: Stripe webhooks (idempotent), Resend email, Cloudflare R2 storage, Sentry. Deployed on Railway/Nixpacks as one service; daily DB backup to R2 (7-day retention).

---

## Findings

### 🔴 F1 — Background jobs run in-process via `setInterval` (reliability; matters now)
~24 crons (`server/cron/*` — checkin, paymentReminder, backorderAndTracking, digests, backups, etc.) are plain `setInterval`/`setTimeout` started unconditionally in `startServer()` (`server/_core/index.ts`). 40+ timers across the cron directory.
- **Risk:** every Railway deploy/restart silently drops in-flight schedules; a throwing job has no retry/dead-letter; no record of whether a scheduled run actually fired.
- **Impact:** payment reminders, check-ins, and backups depend on the process never restarting at the wrong moment.
- **Future-fit:** poor. Needs durable scheduling or, at minimum, run-logging + idempotent guards.

### 🔴 F2 — Single process couples web + jobs + IMAP (blast radius; matters now)
The HTTP listener, all crons, and `startEmailReplyPolling()` (Gmail IMAP) share one process and memory (`server/_core/index.ts`).
- **Risk:** a leak or crash in any cron or the poller takes down request-serving.
- **Future-fit:** acceptable short-term, but jobs should be isolatable from the web tier.

### 🟠 F3 — PHI encryption implemented but unused (security/compliance; matters now)
`server/_core/encryption.ts` provides AES-256-GCM field encryption, but `encrypt()` / `encryptPhiFields()` are **never imported** anywhere in the codebase.
- **Risk:** health-adjacent data (peptide protocols, check-in health scores, clinical notes) is stored in plaintext at rest.
- **Decision needed:** treat as regulated health data (wire up the existing service) or consciously document a decision not to. Currently it is unencrypted by omission, not by decision.

### 🟠 F4 — Shared state lives in process memory ("do not horizontally scale" foot-gun)
- In-memory rate limiting: `const store = new Map()` (`server/utils/rateLimiter.ts:13`) + express-rate-limit default in-memory store.
- Module-level Calendly cache (`server/calendly/service.ts:97-105`).
- No cron leader election (no instance/leader guard found in `server/_core/index.ts`).
- **Risk:** at one instance, harmless. At ≥2 instances: **double cron execution** (duplicate emails/charges), rate limits that don't hold across instances, stale caches.
- **Mitigation today:** stay at **one** Railway instance — a safe, documented constraint. Externalize state before scaling out.

### 🟠 F5 — Monolithic core files (development scalability; matters now)
`server/routers.ts` ~9.8k lines, `server/db.ts` ~9.4k lines, `server/emailService.ts` ~4.8k lines; ~67k server LOC; ~22 routers inline.
- **Risk:** every change risks unrelated breakage; guaranteed merge conflicts; slow onboarding and isolation testing.
- **Note:** newer domains (`server/integrations/`, `server/provisioning/`, `server/calendly/`) already follow a clean per-folder pattern — the target shape exists in-repo. Drain the monolith into it on-touch, no big-bang rewrite.

### 🟡 F6 — Database layer untuned (ceiling later; fine now)
Single Drizzle/mysql2 client from a connection string (`server/db.ts:164`); no explicit `connectionLimit` (mysql2 default ~10); single database, no read replica.
- **Future-fit:** fine for current load; connection pressure is invisible until saturation.

### 🟡 F7 — Hand-written SQL migrations, no deploy gate (correctness; manageable)
Sequential `drizzle/00NN_*.sql` applied manually (0115 applied by hand). Disciplined but error-prone; nothing enforces "migrations ran on deploy."

---

## What is solid (preserve)

- **Idempotent payment processing + reconciliation tooling** (`processProtocolPaymentReceived`, `reconciliationRouter`) — verified working.
- **Webhook signature verification**, helmet/CSP, parameterized queries.
- **DB-backed sessions** — survive restarts; already multi-instance-safe.
- **Sentry + daily R2 backups** — real ops hygiene.
- **Test coverage** — vitest + Playwright present.
- **Clean module pattern** in newer folders — the migration target already exists.

---

## Remediation roadmap

**Before live customers (reliability + safety):**
1. Decide PHI encryption posture (F3) — wire up or document the decision.
2. Make jobs durable (F1) — durable scheduling, or run-logging + idempotent single-instance guard.
3. Enforce the staging/live boundary — single `APP_ENV=staging` umbrella flag (forces Stripe test mode, suppresses outbound email, disables customer-facing crons, separate R2 bucket, banner).

**Before any horizontal scale-out:**
4. Externalize rate-limit + cache state; add cron leader election (F4). Until then, **stay at one instance.**

**Ongoing tech-debt paydown:**
5. Drain monoliths into per-domain folders on-touch (F5).
6. Tune DB pooling; gate migrations on deploy (F6, F7).

---

## Open questions (business inputs, not technical)

1. **Compliance posture** — is this regulated health data (must encrypt at rest) or general wellness coaching? Default if unanswered: treat as sensitive and encrypt.
2. **Realistic 12-month volume** — customers/orders per month. Determines whether >1 instance is ever needed (hypothesis: one instance suffices for a long time).
3. **omegalongevity.com ownership** — confirm it funnels sales into humanedge (single source of truth) rather than becoming a separate payment + data silo.

---

## Bottom line

humanedge.health is a sound foundation, not yet ready for live customers. The blocking work is **reliability (durable jobs), data safety (PHI + staging isolation), and a single source of truth** — not raw scalability, which is comfortable at this size. Keep the current system live until these are closed; cut over in one scheduled switch, not a gradual parallel run.
