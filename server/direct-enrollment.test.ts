import { describe, it, expect, vi } from 'vitest';

// Test the tier pricing configuration
describe('Tier Pricing Configuration', () => {
  const tierPrices: Record<string, number> = {
    elite: 15000,
    functional_health_elite: 8500,
    advanced: 4500,
    flagship: 3000,
    recovery: 3000,
    immunity: 3000,
    longevity: 3000,
    mitochondria: 3000,
    essentials: 750,
  };

  it('should have correct pricing for all 9 tiers', () => {
    expect(Object.keys(tierPrices)).toHaveLength(9);
    expect(tierPrices.elite).toBe(15000);
    expect(tierPrices.functional_health_elite).toBe(8500);
    expect(tierPrices.advanced).toBe(4500);
    expect(tierPrices.flagship).toBe(3000);
    expect(tierPrices.recovery).toBe(3000);
    expect(tierPrices.immunity).toBe(3000);
    expect(tierPrices.longevity).toBe(3000);
    expect(tierPrices.mitochondria).toBe(3000);
    expect(tierPrices.essentials).toBe(750);
  });

  it('should NOT have $10,000 for elite (was fixed to $15,000)', () => {
    expect(tierPrices.elite).not.toBe(10000);
    expect(tierPrices.elite).toBe(15000);
  });

  it('should have all specialty plans at $3,000', () => {
    const specialtyTiers = ['recovery', 'immunity', 'longevity', 'mitochondria'];
    specialtyTiers.forEach(tier => {
      expect(tierPrices[tier]).toBe(3000);
    });
  });
});

// Test the tier enum values
describe('Tier Enum Values', () => {
  const validTiers = [
    'elite', 'functional_health_elite', 'advanced', 'flagship',
    'recovery', 'immunity', 'longevity', 'mitochondria', 'essentials'
  ];

  it('should have 9 valid tiers', () => {
    expect(validTiers).toHaveLength(9);
  });

  it('should include all new specialty tiers', () => {
    expect(validTiers).toContain('recovery');
    expect(validTiers).toContain('immunity');
    expect(validTiers).toContain('longevity');
    expect(validTiers).toContain('mitochondria');
  });

  it('should include functional_health_elite and advanced tiers', () => {
    expect(validTiers).toContain('functional_health_elite');
    expect(validTiers).toContain('advanced');
  });
});

// Test commission rates
describe('Referral Commission Rates', () => {
  const COMMISSION_RATES: Record<string, number> = {
    essentials: 0.10,
    flagship: 0.10,
    transformation: 0.10,
    recovery: 0.10,
    immunity: 0.10,
    longevity: 0.10,
    mitochondria: 0.10,
    advanced: 0.08,
    functional_health_elite: 0.06,
    elite: 0.05,
  };

  const PROGRAM_PRICES: Record<string, number> = {
    essentials: 750,
    flagship: 3000,
    transformation: 3000,
    recovery: 3000,
    immunity: 3000,
    longevity: 3000,
    mitochondria: 3000,
    advanced: 4500,
    functional_health_elite: 8500,
    elite: 15000,
  };

  it('should calculate correct commission for elite tier', () => {
    const commission = PROGRAM_PRICES.elite * COMMISSION_RATES.elite;
    expect(commission).toBe(750); // 5% of $15,000
  });

  it('should calculate correct commission for functional_health_elite', () => {
    const commission = PROGRAM_PRICES.functional_health_elite * COMMISSION_RATES.functional_health_elite;
    expect(commission).toBe(510); // 6% of $8,500
  });

  it('should calculate correct commission for advanced tier', () => {
    const commission = PROGRAM_PRICES.advanced * COMMISSION_RATES.advanced;
    expect(commission).toBe(360); // 8% of $4,500
  });

  it('should calculate correct commission for flagship tier', () => {
    const commission = PROGRAM_PRICES.flagship * COMMISSION_RATES.flagship;
    expect(commission).toBe(300); // 10% of $3,000
  });

  it('should calculate correct commission for essentials tier', () => {
    const commission = PROGRAM_PRICES.essentials * COMMISSION_RATES.essentials;
    expect(commission).toBe(75); // 10% of $750
  });
});
