import crypto from "crypto";

/**
 * GHL webhook authentication.
 *
 * Unlike the omegalongevity integration (which HMAC-signs the raw body), GHL's
 * outbound workflows can only attach a static header. So we authenticate with a
 * shared bearer token over HTTPS:
 *
 *   Authorization: Bearer <GHL_WEBHOOK_TOKEN>
 *
 * The token is REQUIRED (not optional, despite the brief framing it as
 * optional) — a request without a valid token is rejected. Set the secret in
 * the GHL_WEBHOOK_TOKEN env var; rotate by changing it here and in the GHL
 * workflow header. Comparison is constant-time to avoid leaking the token via
 * timing.
 */

export function getWebhookToken(): string | null {
  return process.env.GHL_WEBHOOK_TOKEN || null;
}

export interface AuthCheckResult {
  valid: boolean;
  reason?: string;
}

export function verifyBearer(
  authHeader: string | undefined,
  expectedToken: string
): AuthCheckResult {
  if (!authHeader) return { valid: false, reason: "Missing Authorization header" };

  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const provided = match ? match[1].trim() : authHeader.trim();

  const expectedBuf = Buffer.from(expectedToken, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (expectedBuf.length !== providedBuf.length) {
    return { valid: false, reason: "Invalid token" };
  }
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return { valid: false, reason: "Invalid token" };
  }
  return { valid: true };
}
