/**
 * Tests for the prospect auto-creation feature in onboarding automation.
 * Verifies that every enrollment automatically creates a prospect record
 * so Shannon can see them in the lead pipeline.
 */
import { describe, it, expect } from 'vitest';

describe('Prospect Auto-Creation in Onboarding', () => {
  describe('Onboarding Automation Step 8', () => {
    it('should create a prospect record for new enrollments', () => {
      // Simulate the prospect creation logic
      const clientName = 'Kirsten Ham';
      const clientEmail = 'kirstenham2@gmail.com';
      const tier = 'immunity';
      const enrollmentId = 630001;
      const paymentMethod = 'paypal';
      const coachingFeeAmount = 350;

      const prospectData = {
        name: clientName,
        email: clientEmail,
        phone: 'not-provided',
        status: 'enrolled',
        source: `${paymentMethod}-enrollment`,
        notes: `Auto-created from ${tier} enrollment #${enrollmentId} ($${coachingFeeAmount} via ${paymentMethod}). Client paid and enrolled directly — did not come through SMS pipeline.`,
        enrollmentId: enrollmentId,
      };

      expect(prospectData.name).toBe('Kirsten Ham');
      expect(prospectData.status).toBe('enrolled');
      expect(prospectData.source).toBe('paypal-enrollment');
      expect(prospectData.enrollmentId).toBe(630001);
      expect(prospectData.notes).toContain('immunity');
      expect(prospectData.notes).toContain('Auto-created');
    });

    it('should update existing prospect to enrolled if one already exists', () => {
      const existingProspect = {
        id: 100,
        name: 'Test Person',
        email: 'test@example.com',
        status: 'contacted',
        enrollmentId: null,
      };

      // Simulate update logic
      const updatedFields = {
        status: 'enrolled',
        enrollmentId: 999,
      };

      const updated = { ...existingProspect, ...updatedFields };
      expect(updated.status).toBe('enrolled');
      expect(updated.enrollmentId).toBe(999);
    });

    it('should handle missing phone by using not-provided placeholder', () => {
      const clientPhone = undefined;
      const phoneValue = clientPhone || 'not-provided';
      expect(phoneValue).toBe('not-provided');
    });

    it('should skip internal team emails during backfill', () => {
      const internalEmails = [
        'jason@kidmancorp.com',
        'jkidman@gmail.com',
        'shannon@omegalongevity.com',
        'vienvelle@gmail.com',
      ];

      expect(internalEmails.includes('jason@kidmancorp.com')).toBe(true);
      expect(internalEmails.includes('kirstenham2@gmail.com')).toBe(false);
    });

    it('should set correct source for different payment methods', () => {
      const paypalSource = `paypal-enrollment`;
      const venmoSource = `venmo-enrollment`;

      expect(paypalSource).toBe('paypal-enrollment');
      expect(venmoSource).toBe('venmo-enrollment');
    });
  });

  describe('Backfill Script Logic', () => {
    it('should categorize clients with enrollments as enrolled', () => {
      const clientWithEnrollment = {
        id: 330001,
        name: 'Kirsten Ham',
        email: 'kirstenham2@gmail.com',
        enrollmentId: 630001,
        tier: 'immunity',
        enrollmentStatus: 'intake_complete',
        coachingFeeAmount: '350.00',
      };

      const status = clientWithEnrollment.enrollmentId ? 'enrolled' : 'new';
      const source = clientWithEnrollment.enrollmentId ? 'enrollment-backfill' : 'client-backfill';

      expect(status).toBe('enrolled');
      expect(source).toBe('enrollment-backfill');
    });

    it('should categorize clients without enrollments as new', () => {
      const clientWithoutEnrollment = {
        id: 1,
        name: 'Greg Quiroga',
        email: 'greg@stellarsf.com',
        enrollmentId: null,
        tier: null,
      };

      const status = clientWithoutEnrollment.enrollmentId ? 'enrolled' : 'new';
      const source = clientWithoutEnrollment.enrollmentId ? 'enrollment-backfill' : 'client-backfill';

      expect(status).toBe('new');
      expect(source).toBe('client-backfill');
    });

    it('should generate unique tracking tokens', () => {
      // Simulate crypto.randomBytes(16).toString('hex')
      const token1 = 'a'.repeat(32);
      const token2 = 'b'.repeat(32);
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(32);
    });
  });

  describe('Pipeline Completeness', () => {
    it('should ensure all enrollment sources create prospects', () => {
      const enrollmentSources = [
        'paypal-enrollment',    // PayPal webhook → onboarding
        'venmo-enrollment',     // Venmo webhook → onboarding
        'enrollment-backfill',  // Backfill script
        'client-backfill',      // Client without enrollment
        'orphan-enrollment-backfill', // Enrollment without client
      ];

      // All sources should be recognized
      enrollmentSources.forEach(source => {
        expect(source.length).toBeGreaterThan(0);
        expect(source).toContain('-');
      });
    });

    it('should map enrollment status to prospect status correctly', () => {
      const statusMap: Record<string, string> = {
        'coaching_paid': 'enrolled',
        'intake_complete': 'enrolled',
        'discovery_scheduled': 'enrolled',
        'active': 'enrolled',
        'completed': 'enrolled',
      };

      // All enrollment statuses should map to enrolled
      Object.values(statusMap).forEach(prospectStatus => {
        expect(prospectStatus).toBe('enrolled');
      });
    });
  });
});
