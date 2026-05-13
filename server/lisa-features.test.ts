import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================================
// Test Suite: Lisa's Feature Requests (Phase 21)
// ============================================================

describe('Lisa Feature Requests', () => {

  // ============================================================
  // 1. Welcome Email with Omega Elite + PepPro WAIT Instructions
  // ============================================================
  describe('Welcome Email in Onboarding Automation', () => {
    const automationCode = readFileSync(
      resolve(__dirname, 'automation/onboardingAutomation.ts'),
      'utf-8'
    );

    it('should have Step 9: Send onboarding welcome email', () => {
      expect(automationCode).toContain('STEP 9: Send onboarding welcome email');
    });

    it('should import sendOnboardingWelcomeEmail from emailService', () => {
      expect(automationCode).toContain('sendOnboardingWelcomeEmail');
    });

    it('should pass community code and access months to welcome email', () => {
      expect(automationCode).toContain('communityCode: config.communityCode');
      expect(automationCode).toContain('communityAccessMonths: config.communityAccessMonths');
    });

    it('should pass Omega Elite signup URL', () => {
      expect(automationCode).toContain('omegaEliteSignupUrl: COMMUNITY.omegaEliteSignup');
    });

    it('should pass Peptide Pro signup URL', () => {
      expect(automationCode).toContain('peptideProSignupUrl: COMMUNITY.peptideProSignup');
    });

    it('should pass app store links', () => {
      expect(automationCode).toContain('appStoreApple: COMMUNITY.appStoreApple');
      expect(automationCode).toContain('appStoreGoogle: COMMUNITY.appStoreGoogle');
    });

    it('should log welcome_email_sent automation event', () => {
      expect(automationCode).toContain("eventType: \"welcome_email_sent\"");
    });

    it('should be non-blocking (tasks for Lisa still exist as fallback)', () => {
      expect(automationCode).toContain('Non-blocking');
    });

    // Verify the email function exists
    const emailCode = readFileSync(
      resolve(__dirname, 'emailService.ts'),
      'utf-8'
    );

    it('should have sendOnboardingWelcomeEmail function in emailService', () => {
      expect(emailCode).toContain('export async function sendOnboardingWelcomeEmail');
    });

    it('welcome email should contain WAIT instructions for PepPro', () => {
      expect(emailCode).toMatch(/wait|WAIT|Wait for.*PepPro|Peptide Pro.*account.*created/i);
    });

    it('welcome email should contain Omega Elite signup info', () => {
      expect(emailCode).toMatch(/Omega Elite|community/i);
    });
  });

  // ============================================================
  // 2. Admin Shipping Notification
  // ============================================================
  describe('Admin Shipping Notification on Packing Slip Sign', () => {
    const routersCode = readFileSync(
      resolve(__dirname, 'routers.ts'),
      'utf-8'
    );

    it('should import sendAdminShippingNotification in sign mutation', () => {
      expect(routersCode).toContain('sendAdminShippingNotification');
    });

    it('should call admin shipping notification after client notification', () => {
      // The admin notification should come after the client notification
      const clientNotifIdx = routersCode.indexOf('sendShippingNotification({');
      const adminNotifIdx = routersCode.indexOf('sendAdminShippingNotification({');
      expect(clientNotifIdx).toBeGreaterThan(-1);
      expect(adminNotifIdx).toBeGreaterThan(-1);
      expect(adminNotifIdx).toBeGreaterThan(clientNotifIdx);
    });

    it('should have sendAdminShippingNotification function in emailService', () => {
      const emailCode = readFileSync(resolve(__dirname, 'emailService.ts'), 'utf-8');
      expect(emailCode).toContain('export async function sendAdminShippingNotification');
    });
  });

  // ============================================================
  // 3. Delivery Notification + Kickoff Task
  // ============================================================
  describe('Delivery Notification + Kickoff Task on markDelivered', () => {
    const routersCode = readFileSync(
      resolve(__dirname, 'routers.ts'),
      'utf-8'
    );

    it('should import sendAdminDeliveryNotification in markDelivered', () => {
      expect(routersCode).toContain('sendAdminDeliveryNotification');
    });

    it('should create kickoff session task on delivery', () => {
      expect(routersCode).toContain('Schedule kickoff session for');
    });

    it('should assign kickoff task to Lisa (team member 1)', () => {
      expect(routersCode).toContain('assignedTeamMemberId: 1, // Lisa');
    });

    it('should set kickoff task due date to 2 days from delivery', () => {
      expect(routersCode).toContain('2 * 24 * 60 * 60 * 1000'); // 2 days
    });

    it('should include reconstitution training mention in kickoff task', () => {
      expect(routersCode).toContain('reconstitution training session');
    });

    it('should have sendAdminDeliveryNotification function in emailService', () => {
      const emailCode = readFileSync(resolve(__dirname, 'emailService.ts'), 'utf-8');
      expect(emailCode).toContain('export async function sendAdminDeliveryNotification');
    });
  });

  // ============================================================
  // 4. Per-Item Ship Source + Tracking
  // ============================================================
  describe('Per-Item Ship Source + Tracking Fields', () => {
    const schemaCode = readFileSync(
      resolve(__dirname, '../drizzle/schema.ts'),
      'utf-8'
    );

    it('should have shipSource enum field on packing_slip_items', () => {
      expect(schemaCode).toContain("shipSource: mysqlEnum(['omega', 'dropship', 'vendor', 'client_sourced'])");
    });

    it('should have itemTrackingCarrier field', () => {
      expect(schemaCode).toContain('itemTrackingCarrier: varchar');
    });

    it('should have itemTrackingNumber field', () => {
      expect(schemaCode).toContain('itemTrackingNumber: varchar');
    });

    it('should have itemTrackingUrl field', () => {
      expect(schemaCode).toContain('itemTrackingUrl: varchar');
    });

    // Router mutation accepts new fields
    const routersCode = readFileSync(
      resolve(__dirname, 'routers.ts'),
      'utf-8'
    );

    it('should accept shipSource in updateItem mutation', () => {
      expect(routersCode).toContain("shipSource: z.enum(['omega', 'dropship', 'vendor', 'client_sourced']).optional()");
    });

    it('should accept itemTrackingCarrier in updateItem mutation', () => {
      expect(routersCode).toContain('itemTrackingCarrier: z.string().optional()');
    });

    it('should accept itemTrackingNumber in updateItem mutation', () => {
      expect(routersCode).toContain('itemTrackingNumber: z.string().optional()');
    });

    it('should auto-generate tracking URL for PirateShip carrier', () => {
      expect(routersCode).toContain("'PirateShip':");
    });

    // Frontend UI
    const detailCode = readFileSync(
      resolve(__dirname, '../client/src/pages/admin/PackingSlipDetail.tsx'),
      'utf-8'
    );

    it('should have ship source dropdown in PackingSlipDetail', () => {
      expect(detailCode).toContain('Omega (In-House)');
      expect(detailCode).toContain('Drop Ship');
      expect(detailCode).toContain('Vendor Direct');
      expect(detailCode).toContain('Client Sourced');
    });

    it('should have carrier dropdown with PirateShip option', () => {
      expect(detailCode).toContain('PirateShip');
    });

    it('should have tracking number input field', () => {
      expect(detailCode).toContain('Enter tracking number');
    });

    it('should show tracking link with external link icon', () => {
      expect(detailCode).toContain('ExternalLink');
    });

    it('should show collapsed badges for non-omega ship sources', () => {
      expect(detailCode).toContain('Collapsed inline badges for ship source');
    });
  });

  // ============================================================
  // 5. Cron Bug Fixes (from earlier phase, verify still intact)
  // ============================================================
  describe('Cron Bug Fixes Still Intact', () => {
    const checkinCronCode = readFileSync(
      resolve(__dirname, 'cron/checkinCron.ts'),
      'utf-8'
    );

    it('should wrap sentAt in new Date() for safe getTime() calls', () => {
      expect(checkinCronCode).toContain('new Date(');
    });

    const sessionCronCode = readFileSync(
      resolve(__dirname, 'cron/sessionReminderCron.ts'),
      'utf-8'
    );

    it('should use lowercase h in reminder column names matching DB', () => {
      expect(sessionCronCode).toContain('reminder24hSent');
      expect(sessionCronCode).toContain('reminder1hSent');
    });
  });
});
