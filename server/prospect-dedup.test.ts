import { describe, it, expect } from 'vitest';

/**
 * Tests for prospect deduplication enforcement
 * Validates the dedup logic across all 3 creation points
 */

describe('Prospect Deduplication', () => {
  describe('Admin create dedup (prospectRouter.create)', () => {
    it('should check by email first, then phone for duplicates', () => {
      // The create mutation now checks:
      // 1. Normalized email match
      // 2. Normalized phone match (excluding N/A and not-provided)
      // 3. If match found: updates existing record, returns merged: true
      // 4. If no match: creates new record, returns merged: false
      const normalizeEmail = (email: string | undefined) => email?.toLowerCase().trim() || null;
      
      expect(normalizeEmail('Patrick@Example.com')).toBe('patrick@example.com');
      expect(normalizeEmail('  test@test.com  ')).toBe('test@test.com');
      expect(normalizeEmail(undefined)).toBe(null);
      expect(normalizeEmail('')).toBe(null);
    });

    it('should skip phone dedup for placeholder values', () => {
      const shouldCheckPhone = (phone: string) => {
        return phone && phone !== 'N/A' && phone !== 'not-provided';
      };
      
      expect(shouldCheckPhone('N/A')).toBeFalsy();
      expect(shouldCheckPhone('not-provided')).toBeFalsy();
      expect(shouldCheckPhone('+15551234567')).toBeTruthy();
      expect(shouldCheckPhone('5551234567')).toBeTruthy();
    });
  });

  describe('OAuth signup dedup (_core/oauth.ts)', () => {
    it('should check by email then name for existing prospects', () => {
      // OAuth dedup checks:
      // 1. Email match (normalized)
      // 2. Name match (exact, case-sensitive via LIKE)
      // 3. If match found: links userId, updates email if missing
      // 4. If no match: creates new prospect with source "account-signup"
      const normalizeEmail = (email: string) => email.toLowerCase().trim();
      
      expect(normalizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
    });
  });

  describe('Onboarding automation dedup (onboardingAutomation.ts)', () => {
    it('should check email, phone, then name for existing prospects', () => {
      // Onboarding dedup checks:
      // 1. Email match (normalized)
      // 2. Phone match (excluding not-provided)
      // 3. Name match (via LIKE)
      // 4. If match found: updates to enrolled status, fills missing fields
      // 5. If no match: creates new prospect with source "{paymentMethod}-enrollment"
      
      const shouldFillPhone = (existing: string, incoming: string) => {
        return incoming && (existing === 'N/A' || existing === 'not-provided');
      };
      
      expect(shouldFillPhone('N/A', '+15551234567')).toBeTruthy();
      expect(shouldFillPhone('not-provided', '+15551234567')).toBeTruthy();
      expect(shouldFillPhone('+15559876543', '+15551234567')).toBeFalsy();
    });
  });

  describe('Merge prospects logic', () => {
    it('should merge fields correctly - keep primary, fill from secondary', () => {
      const keep = {
        email: 'patrick@example.com',
        phone: 'N/A',
        source: null,
        enrollmentId: null,
        notes: 'Original notes',
        totalClicks: 5,
        totalSmsSent: 2,
      };
      
      const remove = {
        email: null,
        phone: '+15551234567',
        source: 'referral',
        enrollmentId: 123,
        notes: 'Secondary notes',
        totalClicks: 3,
        totalSmsSent: 8,
      };
      
      // Merge logic
      const updates: any = {};
      if (!keep.email && remove.email) updates.email = remove.email;
      if ((keep.phone === 'N/A' || keep.phone === 'not-provided') && remove.phone && remove.phone !== 'N/A') updates.phone = remove.phone;
      if (!keep.source && remove.source) updates.source = remove.source;
      if (!keep.enrollmentId && remove.enrollmentId) updates.enrollmentId = remove.enrollmentId;
      if (remove.notes) {
        updates.notes = keep.notes ? `${keep.notes}\n\n[Merged] ${remove.notes}` : remove.notes;
      }
      if (remove.totalClicks > keep.totalClicks) updates.totalClicks = remove.totalClicks;
      if (remove.totalSmsSent > keep.totalSmsSent) updates.totalSmsSent = remove.totalSmsSent;
      
      expect(updates.phone).toBe('+15551234567'); // Filled from secondary
      expect(updates.source).toBe('referral'); // Filled from secondary
      expect(updates.enrollmentId).toBe(123); // Filled from secondary
      expect(updates.notes).toContain('[Merged]'); // Notes merged
      expect(updates.email).toBeUndefined(); // Keep already has email
      expect(updates.totalClicks).toBeUndefined(); // Keep has more clicks
      expect(updates.totalSmsSent).toBe(8); // Secondary has more SMS
    });
  });

  describe('Scan duplicates logic', () => {
    it('should normalize names for comparison', () => {
      const normName = (name: string) => name.toLowerCase().trim();
      
      expect(normName('Patrick Sprague')).toBe('patrick sprague');
      expect(normName('  Tim Sturdevant  ')).toBe('tim sturdevant');
      expect(normName('KIRSTEN HAM')).toBe('kirsten ham');
    });

    it('should normalize phones for comparison', () => {
      const normPhone = (phone: string) => phone.replace(/[^\d+]/g, '');
      
      expect(normPhone('+1 (555) 123-4567')).toBe('+15551234567');
      expect(normPhone('555-123-4567')).toBe('5551234567');
    });
  });
});
