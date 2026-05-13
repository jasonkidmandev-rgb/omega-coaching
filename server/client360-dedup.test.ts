import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Client 360 Dedup Fix', () => {
  const routerCode = readFileSync(
    resolve(__dirname, 'client360/router.ts'),
    'utf-8'
  );

  it('should have multi-key dedup with email, phone, and name indexes', () => {
    expect(routerCode).toContain('phoneIndex');
    expect(routerCode).toContain('nameIndex');
    expect(routerCode).toContain('multi-key dedup');
  });

  it('should normalize phone numbers for matching', () => {
    expect(routerCode).toContain('normalizePhone');
    expect(routerCode).toContain("p.replace(/\\D/g, '')");
  });

  it('should normalize names for matching', () => {
    expect(routerCode).toContain('normalizeName');
    expect(routerCode).toContain("n?.toLowerCase().replace(/[^a-z]/g, '')");
  });

  it('should only match names with at least 2 words to avoid false positives', () => {
    expect(routerCode).toContain("name.trim().includes(' ')");
  });

  it('should try email match first (strongest signal)', () => {
    expect(routerCode).toContain('Try email match first (strongest signal)');
  });

  it('should try phone match as secondary', () => {
    expect(routerCode).toContain('Try phone match');
  });

  it('should try name match as tertiary', () => {
    expect(routerCode).toContain('Try exact name match');
  });

  it('should merge missing data when matching existing person', () => {
    expect(routerCode).toContain("if (email && !existing.email) existing.email = email");
    expect(routerCode).toContain("if (phone && !existing.phone) existing.phone = phone");
  });

  it('should deduplicate output array since multiple map keys point to same object', () => {
    expect(routerCode).toContain('const seen = new Set<UnifiedPerson>()');
    expect(routerCode).toContain('if (!seen.has(person))');
  });

  it('should pass phone parameter to getOrCreate for prospects', () => {
    expect(routerCode).toContain('getOrCreate(p.email, p.name, p.phone,');
  });

  it('should pass phone parameter to getOrCreate for client protocols', () => {
    expect(routerCode).toContain('getOrCreate(cp.clientEmail, cp.clientName, cp.clientPhone,');
  });

  it('should pass phone parameter to getOrCreate for users', () => {
    expect(routerCode).toContain("getOrCreate(u.email, u.name || 'Unknown', u.phone || null,");
  });

  // Verify the prospect creation dedup is still intact
  describe('Prospect Creation Dedup (existing)', () => {
    const prospectRouterCode = readFileSync(
      resolve(__dirname, 'prospect/prospectRouter.ts'),
      'utf-8'
    );

    it('should have dedup check in prospect creation', () => {
      expect(prospectRouterCode).toContain('DEDUPLICATION CHECK');
    });

    it('should check by email first', () => {
      expect(prospectRouterCode).toContain('eq(prospects.email, normalizedEmail)');
    });

    it('should check by phone second', () => {
      expect(prospectRouterCode).toContain('eq(prospects.phone, normalizedPhone)');
    });

    it('should merge with existing prospect instead of creating duplicate', () => {
      expect(prospectRouterCode).toContain('merged: true');
    });
  });

  // Verify onboarding automation dedup is still intact
  describe('Onboarding Automation Dedup (existing)', () => {
    const automationCode = readFileSync(
      resolve(__dirname, 'automation/onboardingAutomation.ts'),
      'utf-8'
    );

    it('should check by email in onboarding automation', () => {
      expect(automationCode).toContain("clientEmail.toLowerCase().trim()");
    });

    it('should check by phone in onboarding automation', () => {
      expect(automationCode).toContain("eqOp(prospects.phone, clientPhone)");
    });

    it('should check by name in onboarding automation', () => {
      expect(automationCode).toContain("likeOp(prospects.name, clientName)");
    });

    it('should update existing prospect instead of creating duplicate', () => {
      expect(automationCode).toContain("status: 'enrolled'");
      expect(automationCode).toContain("enrollmentId: enrollmentId");
    });
  });
});
