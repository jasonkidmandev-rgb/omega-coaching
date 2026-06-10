import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
    })),
  },
}));

// Mock db - include all functions used by the email service
vi.mock('./db', () => ({
  getSiteSetting: vi.fn().mockResolvedValue(null),
  getAdminEmails: vi.fn().mockResolvedValue(['admin@test.com', 'coach@test.com']),
  getAdminEmailsForNotificationType: vi.fn().mockResolvedValue(['admin@test.com', 'coach@test.com']),
  isUserEmailNotificationEnabled: vi.fn().mockResolvedValue(true),
  getUserEnabledEmailNotificationTypes: vi.fn().mockResolvedValue([
    'protocol_approved', 'protocol_viewed', 'protocol_updated',
    'payment_received', 'payment_failed', 'payment_refunded',
    'low_checkin_score', 'checkin_submitted', 'new_store_order',
    'waiver_signed', 'intake_completed', 'appointment_booked',
    'appointment_cancelled', 'client_comment', 'inventory_out_of_stock',
    'venmo_pending', 'new_user_registered', 'referral_submitted', 'new_message',
  ]),
}));

// Mock emailTracking
vi.mock('./emailTracking', () => ({
  createEmailTracking: vi.fn().mockResolvedValue('tracking-123'),
  injectTrackingIntoHtml: vi.fn((html: string) => html),
}));

// Mock notification history - logNotification MUST return a Promise (it's called with .catch())
vi.mock('./clientCorner/notificationHistoryRouter', () => ({
  logNotification: vi.fn().mockResolvedValue(undefined),
}));

// Set SMTP env vars so transporter is created (not null)
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'testpass';
process.env.SMTP_FROM = 'noreply@test.com';
process.env.VITE_APP_URL = 'https://peptidecoach.pro';

describe('Message Email Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendNewMessageEmailToClient', () => {
    it('should send email to client when coach sends a message', async () => {
      const { sendNewMessageEmailToClient } = await import('./emailService');
      const result = await sendNewMessageEmailToClient({
        to: 'client@test.com',
        clientName: 'Richard Feyh',
        coachName: 'Coach Omega',
        messagePreview: 'Hey Richard, your protocol is looking great!',
        protocolUrl: 'https://peptidecoach.pro/protocol/abc123',
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('sent');
    });

    it('should truncate long message previews without error', async () => {
      const { sendNewMessageEmailToClient } = await import('./emailService');
      const longMessage = 'A'.repeat(500);
      const result = await sendNewMessageEmailToClient({
        to: 'client@test.com',
        clientName: 'Test Client',
        coachName: 'Coach',
        messagePreview: longMessage,
        protocolUrl: 'https://peptidecoach.pro/protocol/abc123',
      });
      expect(result.success).toBe(true);
    });

    it('should return disabled message when global notification setting is off', async () => {
      const { getSiteSetting } = await import('./db');
      (getSiteSetting as any).mockResolvedValueOnce('false');
      const { sendNewMessageEmailToClient } = await import('./emailService');
      const result = await sendNewMessageEmailToClient({
        to: 'client@test.com',
        clientName: 'Test Client',
        coachName: 'Coach',
        messagePreview: 'Hello!',
        protocolUrl: 'https://peptidecoach.pro/protocol/abc123',
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Notification disabled');
    });

    it('should skip email when client user has opted out of new_message notifications', async () => {
      const { isUserEmailNotificationEnabled } = await import('./db');
      (isUserEmailNotificationEnabled as any).mockResolvedValueOnce(false);
      const { sendNewMessageEmailToClient } = await import('./emailService');
      const result = await sendNewMessageEmailToClient({
        to: 'client@test.com',
        clientName: 'Test Client',
        coachName: 'Coach',
        messagePreview: 'Hello!',
        protocolUrl: 'https://peptidecoach.pro/protocol/abc123',
        clientUserId: 42,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('User opted out of message notifications');
    });

    it('should send email when clientUserId is provided but user has new_message enabled', async () => {
      const { isUserEmailNotificationEnabled } = await import('./db');
      (isUserEmailNotificationEnabled as any).mockResolvedValueOnce(true);
      const { sendNewMessageEmailToClient } = await import('./emailService');
      const result = await sendNewMessageEmailToClient({
        to: 'client@test.com',
        clientName: 'Test Client',
        coachName: 'Coach',
        messagePreview: 'Hello!',
        protocolUrl: 'https://peptidecoach.pro/protocol/abc123',
        clientUserId: 42,
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('sent');
    });

    it('should send email when no clientUserId is provided (legacy/no account)', async () => {
      const { sendNewMessageEmailToClient } = await import('./emailService');
      const result = await sendNewMessageEmailToClient({
        to: 'client@test.com',
        clientName: 'Test Client',
        coachName: 'Coach',
        messagePreview: 'Hello!',
        protocolUrl: 'https://peptidecoach.pro/protocol/abc123',
        // No clientUserId - client doesn't have an account
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('sent');
    });
  });

  describe('sendNewMessageEmailToAdmins', () => {
    it('should send email to admins who have new_message enabled', async () => {
      const { sendNewMessageEmailToAdmins } = await import('./emailService');
      const result = await sendNewMessageEmailToAdmins({
        clientName: 'Richard Feyh',
        clientEmail: 'feyh3415@gmail.com',
        messagePreview: 'I have a question about my protocol',
        protocolId: 810001,
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('admin');
    });

    it('should handle case where all admins opted out', async () => {
      const { getAdminEmailsForNotificationType } = await import('./db');
      (getAdminEmailsForNotificationType as any).mockResolvedValueOnce([]);
      const { sendNewMessageEmailToAdmins } = await import('./emailService');
      const result = await sendNewMessageEmailToAdmins({
        clientName: 'Test Client',
        clientEmail: 'test@test.com',
        messagePreview: 'Hello!',
        protocolId: 123,
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain('No admin emails');
    });

    it('should return disabled message when global notification setting is off', async () => {
      const { getSiteSetting } = await import('./db');
      (getSiteSetting as any).mockResolvedValueOnce('false');
      const { sendNewMessageEmailToAdmins } = await import('./emailService');
      const result = await sendNewMessageEmailToAdmins({
        clientName: 'Test Client',
        clientEmail: 'test@test.com',
        messagePreview: 'Hello!',
        protocolId: 123,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Notification disabled');
    });
  });

  describe('Integration: comments router wiring', () => {
    it('should have sendNewMessageEmailToClient wired with clientUserId in coach message flow', async () => {
      const fs = await import('fs');
      const routerCode = fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/routers.ts', 'utf-8');
      
      // Coach -> Client: should call sendNewMessageEmailToClient
      expect(routerCode).toContain('sendNewMessageEmailToClient');
      
      // Should pass clientUserId for per-user preference checking
      expect(routerCode).toContain('clientUserId');
      
      // Verify it's inside the authorType === 'coach' block
      const coachBlock = routerCode.indexOf("if (input.authorType === 'coach')");
      const clientEmailCall = routerCode.indexOf('sendNewMessageEmailToClient');
      expect(coachBlock).toBeGreaterThan(-1);
      expect(clientEmailCall).toBeGreaterThan(coachBlock);
    });

    it('should have sendNewMessageEmailToAdmins wired in client message flow', async () => {
      const fs = await import('fs');
      const routerCode = fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/routers.ts', 'utf-8');
      
      // Client -> Coach: should call sendNewMessageEmailToAdmins
      expect(routerCode).toContain('sendNewMessageEmailToAdmins');
      
      // Verify it's inside the authorType === 'client' block
      const clientBlock = routerCode.indexOf("if (input.authorType === 'client')");
      const adminEmailCall = routerCode.indexOf('sendNewMessageEmailToAdmins');
      expect(clientBlock).toBeGreaterThan(-1);
      expect(adminEmailCall).toBeGreaterThan(clientBlock);
    });
  });

  describe('Notification symmetry: full coverage for both directions', () => {
    it('should create in-app notification for client when coach sends a message', async () => {
      const fs = await import('fs');
      const routerCode = fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/routers.ts', 'utf-8');
      const coachBlock = routerCode.indexOf("if (input.authorType === 'coach')");
      const clientBlock = routerCode.indexOf("if (input.authorType === 'client')");
      const createNotifCall = routerCode.indexOf('createNotification({', coachBlock);
      expect(createNotifCall).toBeGreaterThan(coachBlock);
      expect(createNotifCall).toBeLessThan(clientBlock);
      const notifSection = routerCode.substring(createNotifCall, createNotifCall + 300);
      expect(notifSection).toContain('New message from your coach');
    });

    it('coach->client flow should have in-app and email notifications', async () => {
      const fs = await import('fs');
      const routerCode = fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/routers.ts', 'utf-8');
      const coachBlock = routerCode.indexOf("if (input.authorType === 'coach')");
      const clientBlock = routerCode.indexOf("if (input.authorType === 'client')");
      const coachSection = routerCode.substring(coachBlock, clientBlock);
      expect(coachSection).toContain('createNotification');
      expect(coachSection).toContain('sendNewMessageEmailToClient');
    });

    it('client->admin flow should have owner, in-app, and email notifications', async () => {
      const fs = await import('fs');
      const routerCode = fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/routers.ts', 'utf-8');
      const clientBlock = routerCode.indexOf("if (input.authorType === 'client')");
      const clientSection = routerCode.substring(clientBlock, clientBlock + 2000);
      expect(clientSection).toContain('notifyOwner');
      expect(clientSection).toContain('createNotificationsForEnabledUsers');
      expect(clientSection).toContain('sendNewMessageEmailToAdmins');
    });
  });

  describe('Per-user preference: new_message type in EMAIL_NOTIFICATION_TYPES', () => {
    it('should include new_message in the EMAIL_NOTIFICATION_TYPES constant', async () => {
      const fs = await import('fs');
      const dbCode = fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/db.ts', 'utf-8');
      
      // Verify new_message is in EMAIL_NOTIFICATION_TYPES
      const typesStart = dbCode.indexOf('export const EMAIL_NOTIFICATION_TYPES');
      const typesEnd = dbCode.indexOf('] as const;', typesStart);
      const typesBlock = dbCode.substring(typesStart, typesEnd);
      expect(typesBlock).toContain('"new_message"');
    });

    it('should have getAdminEmailsForNotificationType function in db.ts', async () => {
      const fs = await import('fs');
      const dbCode = fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/db.ts', 'utf-8');
      expect(dbCode).toContain('export async function getAdminEmailsForNotificationType');
    });

    it('should have isUserEmailNotificationEnabled function in db.ts', async () => {
      const fs = await import('fs');
      const dbCode = fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/db.ts', 'utf-8');
      expect(dbCode).toContain('export async function isUserEmailNotificationEnabled');
    });
  });
});
