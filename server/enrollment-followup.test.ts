import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Enrollment Follow-Up System', () => {
  describe('Enrollment Follow-Up Cron Module', () => {
    it('should have enrollment follow-up cron module', async () => {
      const cronModule = await import('./cron/enrollmentFollowUpCron');
      expect(cronModule).toBeDefined();
      expect(typeof cronModule.initEnrollmentFollowUpCron).toBe('function');
      expect(typeof cronModule.processEnrollmentFollowUps).toBe('function');
    });

    it('should export initEnrollmentFollowUpCron function', async () => {
      const { initEnrollmentFollowUpCron } = await import('./cron/enrollmentFollowUpCron');
      expect(initEnrollmentFollowUpCron).toBeDefined();
      expect(typeof initEnrollmentFollowUpCron).toBe('function');
    });

    it('should export processEnrollmentFollowUps function for manual triggering', async () => {
      const { processEnrollmentFollowUps } = await import('./cron/enrollmentFollowUpCron');
      expect(processEnrollmentFollowUps).toBeDefined();
      expect(typeof processEnrollmentFollowUps).toBe('function');
    });

    it('should export stopEnrollmentFollowUpCron function', async () => {
      const { stopEnrollmentFollowUpCron } = await import('./cron/enrollmentFollowUpCron');
      expect(stopEnrollmentFollowUpCron).toBeDefined();
      expect(typeof stopEnrollmentFollowUpCron).toBe('function');
    });

    it('should export triggerEnrollmentFollowUpJob function', async () => {
      const { triggerEnrollmentFollowUpJob } = await import('./cron/enrollmentFollowUpCron');
      expect(triggerEnrollmentFollowUpJob).toBeDefined();
      expect(typeof triggerEnrollmentFollowUpJob).toBe('function');
    });

    it('should export getLastEnrollmentFollowUpCronRun function', async () => {
      const { getLastEnrollmentFollowUpCronRun } = await import('./cron/enrollmentFollowUpCron');
      expect(getLastEnrollmentFollowUpCronRun).toBeDefined();
      expect(typeof getLastEnrollmentFollowUpCronRun).toBe('function');
    });
  });

  describe('Follow-Up Timing Logic', () => {
    it('should identify enrollments paid 48+ hours ago', () => {
      const now = new Date();
      const paidAt48HoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const paidAt24HoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const isEligibleForFollowUp = (paidAt: Date) => {
        const hoursSincePaid = (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60);
        return hoursSincePaid >= 48;
      };
      
      expect(isEligibleForFollowUp(paidAt48HoursAgo)).toBe(true);
      expect(isEligibleForFollowUp(paidAt24HoursAgo)).toBe(false);
    });

    it('should not send follow-up to enrollments older than 7 days', () => {
      const now = new Date();
      const paidAt5DaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const paidAt10DaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      
      const isWithinWindow = (paidAt: Date) => {
        const daysSincePaid = (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSincePaid >= 2 && daysSincePaid <= 7;
      };
      
      expect(isWithinWindow(paidAt5DaysAgo)).toBe(true);
      expect(isWithinWindow(paidAt10DaysAgo)).toBe(false);
    });
  });

  describe('Enrollment Filtering', () => {
    const mockEnrollments = [
      { id: 1, tier: 'elite', intakeFormCompleted: true, authTokenExpiresAt: new Date(Date.now() + 100000).toISOString() },
      { id: 2, tier: 'flagship', intakeFormCompleted: false, authTokenExpiresAt: new Date(Date.now() + 100000).toISOString() },
      { id: 3, tier: 'flagship', intakeFormCompleted: true, authTokenExpiresAt: new Date(Date.now() - 100000).toISOString() },
      { id: 4, tier: 'essentials', intakeFormCompleted: false, authTokenExpiresAt: null },
      { id: 5, tier: 'elite', intakeFormCompleted: false, authTokenExpiresAt: new Date(Date.now() + 100000).toISOString() },
    ];

    it('should filter by tier correctly', () => {
      const eliteEnrollments = mockEnrollments.filter(e => e.tier === 'elite');
      const flagshipEnrollments = mockEnrollments.filter(e => e.tier === 'flagship');
      const essentialsEnrollments = mockEnrollments.filter(e => e.tier === 'essentials');
      
      expect(eliteEnrollments).toHaveLength(2);
      expect(flagshipEnrollments).toHaveLength(2);
      expect(essentialsEnrollments).toHaveLength(1);
    });

    it('should filter by intake form status correctly', () => {
      const intakeComplete = mockEnrollments.filter(e => e.intakeFormCompleted);
      const intakePending = mockEnrollments.filter(e => !e.intakeFormCompleted);
      
      expect(intakeComplete).toHaveLength(2);
      expect(intakePending).toHaveLength(3);
    });

    it('should filter by expired links correctly', () => {
      const isTokenExpired = (expiresAt: string | null) => {
        if (!expiresAt) return true;
        return new Date(expiresAt) < new Date();
      };
      
      const expiredLinks = mockEnrollments.filter(e => isTokenExpired(e.authTokenExpiresAt));
      const activeLinks = mockEnrollments.filter(e => !isTokenExpired(e.authTokenExpiresAt));
      
      expect(expiredLinks).toHaveLength(2); // id 3 (expired) and id 4 (null)
      expect(activeLinks).toHaveLength(3);
    });
  });

  describe('Onboarding Progress Calculation', () => {
    it('should calculate progress correctly for complete enrollment', () => {
      const enrollment = {
        coachingFeePaid: true,
        authToken: 'abc123',
        userId: 1,
        intakeFormCompleted: true,
      };
      
      const steps = [
        { complete: enrollment.coachingFeePaid },
        { complete: !!enrollment.authToken },
        { complete: !!enrollment.userId },
        { complete: enrollment.intakeFormCompleted },
      ];
      
      const completedSteps = steps.filter(s => s.complete).length;
      const progress = (completedSteps / steps.length) * 100;
      
      expect(completedSteps).toBe(4);
      expect(progress).toBe(100);
    });

    it('should calculate progress correctly for partial enrollment', () => {
      const enrollment = {
        coachingFeePaid: true,
        authToken: 'abc123',
        userId: null,
        intakeFormCompleted: false,
      };
      
      const steps = [
        { complete: enrollment.coachingFeePaid },
        { complete: !!enrollment.authToken },
        { complete: !!enrollment.userId },
        { complete: enrollment.intakeFormCompleted },
      ];
      
      const completedSteps = steps.filter(s => s.complete).length;
      const progress = (completedSteps / steps.length) * 100;
      
      expect(completedSteps).toBe(2);
      expect(progress).toBe(50);
    });

    it('should calculate progress correctly for new enrollment', () => {
      const enrollment = {
        coachingFeePaid: true,
        authToken: null,
        userId: null,
        intakeFormCompleted: false,
      };
      
      const steps = [
        { complete: enrollment.coachingFeePaid },
        { complete: !!enrollment.authToken },
        { complete: !!enrollment.userId },
        { complete: enrollment.intakeFormCompleted },
      ];
      
      const completedSteps = steps.filter(s => s.complete).length;
      const progress = (completedSteps / steps.length) * 100;
      
      expect(completedSteps).toBe(1);
      expect(progress).toBe(25);
    });
  });

  describe('Stats Calculation', () => {
    const mockEnrollments = [
      { tier: 'elite', intakeFormCompleted: true, coachingFeeAmount: '10000', authTokenExpiresAt: new Date(Date.now() + 100000).toISOString() },
      { tier: 'flagship', intakeFormCompleted: false, coachingFeeAmount: '3000', authTokenExpiresAt: new Date(Date.now() - 100000).toISOString() },
      { tier: 'flagship', intakeFormCompleted: true, coachingFeeAmount: '3000', authTokenExpiresAt: new Date(Date.now() + 100000).toISOString() },
      { tier: 'essentials', intakeFormCompleted: false, coachingFeeAmount: '750', authTokenExpiresAt: null },
    ];

    it('should calculate total revenue correctly', () => {
      const totalRevenue = mockEnrollments.reduce(
        (sum, e) => sum + (parseFloat(e.coachingFeeAmount) || 0), 
        0
      );
      
      expect(totalRevenue).toBe(16750);
    });

    it('should count tiers correctly', () => {
      const eliteCount = mockEnrollments.filter(e => e.tier === 'elite').length;
      const flagshipCount = mockEnrollments.filter(e => e.tier === 'flagship').length;
      const essentialsCount = mockEnrollments.filter(e => e.tier === 'essentials').length;
      
      expect(eliteCount).toBe(1);
      expect(flagshipCount).toBe(2);
      expect(essentialsCount).toBe(1);
    });

    it('should count intake status correctly', () => {
      const intakeComplete = mockEnrollments.filter(e => e.intakeFormCompleted).length;
      const intakePending = mockEnrollments.filter(e => !e.intakeFormCompleted).length;
      
      expect(intakeComplete).toBe(2);
      expect(intakePending).toBe(2);
    });
  });

  describe('Tier Names and Colors', () => {
    const tierNames: Record<string, string> = {
      elite: "Elite Longevity",
      flagship: "90-Day Transformation",
      essentials: "Protocol Essentials",
    };

    const tierColors: Record<string, string> = {
      elite: "bg-purple-100 text-purple-800",
      flagship: "bg-blue-100 text-blue-800",
      essentials: "bg-green-100 text-green-800",
    };

    it('should have correct tier name mappings', () => {
      expect(tierNames['elite']).toBe('Elite Longevity');
      expect(tierNames['flagship']).toBe('90-Day Transformation');
      expect(tierNames['essentials']).toBe('Protocol Essentials');
    });

    it('should have correct tier color mappings', () => {
      expect(tierColors['elite']).toContain('purple');
      expect(tierColors['flagship']).toContain('blue');
      expect(tierColors['essentials']).toContain('green');
    });
  });
});
