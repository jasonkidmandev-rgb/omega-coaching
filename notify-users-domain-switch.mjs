/**
 * Emails all active users warning them they will need to log in once after the domain switch.
 * Session cookies are scoped to the Railway domain and won't carry over to the custom domain.
 *
 * Usage (run BEFORE the DNS cutover — ideally 1 hour before):
 *   node notify-users-domain-switch.mjs
 *
 * Required env vars (same as the app's Railway Variables):
 *   DATABASE_URL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Optional:
 *   NEW_DOMAIN  — the custom domain going live (default: humanedge.health)
 *   DRY_RUN=true — print emails without sending
 */

import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';

const NEW_DOMAIN = process.env.NEW_DOMAIN ?? 'humanedge.health';
const DRY_RUN = process.env.DRY_RUN === 'true';
const FROM = process.env.SMTP_FROM || `noreply@${NEW_DOMAIN}`;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}
if (!DRY_RUN && (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS)) {
  console.error('SMTP_HOST, SMTP_USER, and SMTP_PASS are required (or set DRY_RUN=true).');
  process.exit(1);
}

// ── DB: fetch all active user emails ─────────────────────────────────────
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  `SELECT u.email, u.display_name
   FROM users u
   WHERE u.is_active = 1
     AND u.email IS NOT NULL
     AND u.email != ''
   ORDER BY u.email`
);
await conn.end();

console.log(`Found ${rows.length} active users.`);
if (DRY_RUN) console.log('DRY RUN — no emails will be sent.\n');

// ── SMTP transporter ──────────────────────────────────────────────────────
const transporter = DRY_RUN
  ? null
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

// ── Send ──────────────────────────────────────────────────────────────────
let sent = 0;
let failed = 0;

for (const user of rows) {
  const name = user.display_name || 'there';
  const subject = `Action needed: please log in again at ${NEW_DOMAIN}`;
  const html = `
    <p>Hi ${name},</p>
    <p>We're upgrading our platform today and moving to our new address:
       <strong>https://${NEW_DOMAIN}</strong></p>
    <p><strong>What you need to do:</strong> the next time you visit, simply log in once as normal.
       Your data, programs, and history are all intact — nothing has changed.</p>
    <p>If you have the old address bookmarked, please update it to
       <a href="https://${NEW_DOMAIN}">https://${NEW_DOMAIN}</a>.</p>
    <p>Thank you for being a part of our community.</p>
  `.trim();

  if (DRY_RUN) {
    console.log(`[DRY RUN] To: ${user.email}  Subject: ${subject}`);
    sent++;
    continue;
  }

  try {
    await transporter.sendMail({ from: FROM, to: user.email, subject, html });
    console.log(`  ✓ ${user.email}`);
    sent++;
  } catch (err) {
    console.log(`  ✗ ${user.email}: ${err.message}`);
    failed++;
  }
}

console.log(`\nDone. Sent: ${sent}  Failed: ${failed}`);
if (failed > 0) process.exit(1);
