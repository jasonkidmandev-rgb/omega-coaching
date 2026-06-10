import crypto from "crypto";

/**
 * HMAC-SHA256 request signing (Stripe-style).
 *
 * The sender computes: signature = hex(HMAC_SHA256(secret, `${timestamp}.${rawBody}`))
 * and sends headers:
 *   X-Omega-Timestamp: <unix seconds>
 *   X-Omega-Signature: <hex digest>
 *
 * The timestamp is part of the signed payload, so a captured request can't be
 * replayed outside the tolerance window.
 */

const TOLERANCE_SECONDS = 300; // 5 minutes

export function getWebhookSecret(): string | null {
  return process.env.OMEGALONGEVITY_WEBHOOK_SECRET || null;
}

export interface SignatureCheckResult {
  valid: boolean;
  reason?: string;
}

export function verifySignature(
  rawBody: Buffer,
  timestampHeader: string | undefined,
  signatureHeader: string | undefined,
  secret: string
): SignatureCheckResult {
  if (!timestampHeader) return { valid: false, reason: "Missing X-Omega-Timestamp header" };
  if (!signatureHeader) return { valid: false, reason: "Missing X-Omega-Signature header" };

  const timestamp = parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestamp)) return { valid: false, reason: "Invalid timestamp" };

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > TOLERANCE_SECONDS) {
    return { valid: false, reason: "Timestamp outside tolerance window" };
  }

  const signedPayload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(signatureHeader.trim().toLowerCase(), "utf8");
  if (expectedBuf.length !== providedBuf.length) {
    return { valid: false, reason: "Signature mismatch" };
  }
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return { valid: false, reason: "Signature mismatch" };
  }
  return { valid: true };
}

/** Used by tests / the spec doc example to generate a valid signature. */
export function signPayload(rawBody: string, timestamp: number, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}
