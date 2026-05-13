import { describe, it, expect } from 'vitest';
import { generalLimiter, authLimiter, trackingLimiter, webhookLimiter, publicApiLimiter } from './_core/rateLimiter';

describe('Rate Limiter Configuration', () => {
  it('should export generalLimiter', () => {
    expect(generalLimiter).toBeDefined();
    expect(typeof generalLimiter).toBe('function');
  });

  it('should export authLimiter', () => {
    expect(authLimiter).toBeDefined();
    expect(typeof authLimiter).toBe('function');
  });

  it('should export trackingLimiter', () => {
    expect(trackingLimiter).toBeDefined();
    expect(typeof trackingLimiter).toBe('function');
  });

  it('should export webhookLimiter', () => {
    expect(webhookLimiter).toBeDefined();
    expect(typeof webhookLimiter).toBe('function');
  });

  it('should export publicApiLimiter', () => {
    expect(publicApiLimiter).toBeDefined();
    expect(typeof publicApiLimiter).toBe('function');
  });

  it('all limiters should be Express middleware functions', () => {
    // Express middleware has 3 parameters: req, res, next
    // Rate limiters are middleware functions
    const limiters = [generalLimiter, authLimiter, trackingLimiter, webhookLimiter, publicApiLimiter];
    
    limiters.forEach(limiter => {
      expect(typeof limiter).toBe('function');
    });
  });
});
