/**
 * Simple in-memory rate limiter for tRPC mutations.
 * Tracks attempts by IP address with a sliding window.
 * 
 * Note: This is in-memory so it resets on server restart.
 * For a multi-instance deployment, use Redis instead.
 */

interface RateLimitEntry {
  attempts: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const keys = Array.from(store.keys());
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const entry = store.get(key);
    if (!entry) continue;
    // Remove entries where all attempts are older than the window
    entry.attempts = entry.attempts.filter((t: number) => now - t < 3600000); // 1 hour
    if (entry.attempts.length === 0) {
      store.delete(key);
    }
  }
}, 600000); // Every 10 minutes

/**
 * Check if a request should be rate limited.
 * @param identifier - Usually the IP address
 * @param maxAttempts - Maximum allowed attempts in the window (default: 3)
 * @param windowMs - Time window in milliseconds (default: 1 hour)
 * @returns { allowed: boolean, remaining: number, resetIn: number }
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 3,
  windowMs: number = 3600000 // 1 hour
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  
  let entry = store.get(identifier);
  if (!entry) {
    entry = { attempts: [] };
    store.set(identifier, entry);
  }
  
  // Filter out attempts outside the window
  entry.attempts = entry.attempts.filter((t: number) => now - t < windowMs);
  
  if (entry.attempts.length >= maxAttempts) {
    // Rate limited
    const oldestAttempt = entry.attempts[0];
    const resetInMs = windowMs - (now - oldestAttempt);
    return { allowed: false, remaining: 0, resetInMs };
  }
  
  // Allow and record the attempt
  entry.attempts.push(now);
  return { 
    allowed: true, 
    remaining: maxAttempts - entry.attempts.length, 
    resetInMs: windowMs 
  };
}

/**
 * Extract client IP from Express request, handling proxies.
 */
export function getClientIp(req: any): string {
  // x-forwarded-for may contain multiple IPs: "client, proxy1, proxy2"
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded : forwarded[0];
    return ips.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
}
