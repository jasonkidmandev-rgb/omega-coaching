import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Rate limiting middleware
 * All limiters return JSON responses (not HTML) to prevent tRPC client parse errors.
 */

// Helper to create a JSON-only rate limit handler
function jsonHandler(msg: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({
      error: {
        json: {
          message: msg,
          code: -32029,
          data: { code: 'TOO_MANY_REQUESTS', httpStatus: 429 },
        },
      },
    });
  };
}

// General API rate limiter - 3000 requests per 15 minutes
// Admin pages have 30+ queries plus autosave every 2s, so limit must be generous.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // Limit each IP to 3000 requests per windowMs
  handler: jsonHandler('Too many requests. Please wait a moment and try again.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for authentication endpoints - 20 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  handler: jsonHandler('Too many authentication attempts, please try again after 15 minutes.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Tracking endpoint limiter - 200 requests per minute (high traffic expected)
export const trackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  handler: jsonHandler('Too many tracking requests.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Webhook limiter - 50 requests per minute (for external services)
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  handler: jsonHandler('Too many webhook requests.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Public API limiter - 30 requests per minute (for unauthenticated access)
export const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  handler: jsonHandler('Too many requests, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});
