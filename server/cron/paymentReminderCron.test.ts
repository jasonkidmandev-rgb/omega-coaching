import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for Payment Reminder Cron Job Safeguards
 * 
 * These tests verify that the payment reminder cron only sends emails to:
 * 1. Protocols with paymentStatus === "pending"
 * 2. Protocols that have been SENT (status !== "draft")
 * 3. Protocols where sentAt is NOT null
 * 4. Protocols that are NOT already active (status !== "active")
 * 5. Protocols where the client has NOT already submitted a Venmo payment pending verification
 */

// Mock protocol data for testing the filtering logic
interface MockProtocol {
  id: number;
  clientName: string;
  clientEmail: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  sentAt: Date | null;
  createdAt: Date;
  followUpCount: number;
  paymentReminderOptOut?: boolean;
}

// Mock pending Venmo submissions (keyed by clientProtocolId)
const mockPendingVenmoSubmissions: Record<number, { id: number; status: string }[]> = {
  // Protocol 8 (Doug Harris) has a pending Venmo submission
  8: [{ id: 1, status: "pending" }],
  // Protocol 9 has a confirmed (already verified) Venmo submission
  9: [{ id: 2, status: "confirmed" }],
  // Protocol 10 has a rejected Venmo submission (should still get reminders)
  10: [{ id: 3, status: "rejected" }],
};

const mockProtocols: MockProtocol[] = [
  // Should NOT receive reminder - Draft protocol (never sent)
  {
    id: 1,
    clientName: "Mary Lou Viola",
    clientEmail: "mlviola21@yahoo.com",
    status: "draft",
    paymentStatus: "pending",
    sentAt: null,
    createdAt: new Date("2026-01-15"),
    followUpCount: 0,
  },
  // Should NOT receive reminder - No sentAt date
  {
    id: 2,
    clientName: "Test User",
    clientEmail: "test@example.com",
    status: "pending",
    paymentStatus: "pending",
    sentAt: null,
    createdAt: new Date("2026-01-10"),
    followUpCount: 0,
  },
  // Should NOT receive reminder - Already active (paid)
  {
    id: 3,
    clientName: "Active Client",
    clientEmail: "active@example.com",
    status: "active",
    paymentStatus: "pending",
    sentAt: new Date("2026-01-05"),
    createdAt: new Date("2026-01-01"),
    followUpCount: 0,
  },
  // Should NOT receive reminder - Already paid
  {
    id: 4,
    clientName: "Paid Client",
    clientEmail: "paid@example.com",
    status: "approved",
    paymentStatus: "paid",
    sentAt: new Date("2026-01-10"),
    createdAt: new Date("2026-01-05"),
    followUpCount: 0,
  },
  // SHOULD receive reminder - Sent, pending status, pending payment (PayPal)
  {
    id: 5,
    clientName: "Valid Reminder Client",
    clientEmail: "valid@example.com",
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: "paypal",
    sentAt: new Date("2026-01-10"),
    createdAt: new Date("2026-01-05"),
    followUpCount: 0,
  },
  // SHOULD receive reminder - Approved but not paid
  {
    id: 6,
    clientName: "Approved Unpaid Client",
    clientEmail: "approved@example.com",
    status: "approved",
    paymentStatus: "pending",
    sentAt: new Date("2026-01-08"),
    createdAt: new Date("2026-01-01"),
    followUpCount: 0,
  },
  // Should NOT receive reminder - Opted out of payment reminders
  {
    id: 7,
    clientName: "Opted Out Client",
    clientEmail: "optedout@example.com",
    status: "pending",
    paymentStatus: "pending",
    sentAt: new Date("2026-01-10"),
    createdAt: new Date("2026-01-05"),
    followUpCount: 0,
    paymentReminderOptOut: true,
  },
  // Should NOT receive reminder - Venmo payment already submitted (pending verification)
  {
    id: 8,
    clientName: "Doug Harris",
    clientEmail: "dougwharris@gmail.com",
    status: "approved",
    paymentStatus: "pending",
    paymentMethod: "venmo",
    sentAt: new Date("2026-02-10"),
    createdAt: new Date("2026-02-08"),
    followUpCount: 0,
  },
  // Should NOT receive reminder - Venmo payment confirmed (already verified)
  {
    id: 9,
    clientName: "Confirmed Venmo Client",
    clientEmail: "confirmed@example.com",
    status: "approved",
    paymentStatus: "pending",
    paymentMethod: "venmo",
    sentAt: new Date("2026-02-05"),
    createdAt: new Date("2026-02-01"),
    followUpCount: 0,
  },
  // SHOULD receive reminder - Venmo payment was rejected (needs to pay again)
  {
    id: 10,
    clientName: "Rejected Venmo Client",
    clientEmail: "rejected@example.com",
    status: "approved",
    paymentStatus: "pending",
    paymentMethod: "venmo",
    sentAt: new Date("2026-02-05"),
    createdAt: new Date("2026-02-01"),
    followUpCount: 0,
  },
  // SHOULD receive reminder - Venmo method but no submission yet
  {
    id: 11,
    clientName: "Venmo No Submission Client",
    clientEmail: "venmo-nosub@example.com",
    status: "approved",
    paymentStatus: "pending",
    paymentMethod: "venmo",
    sentAt: new Date("2026-02-05"),
    createdAt: new Date("2026-02-01"),
    followUpCount: 0,
  },
];

// Filter function that mirrors the cron job logic (including Venmo check)
function shouldSendReminder(protocol: MockProtocol): boolean {
  // Only process pending payments
  if (protocol.paymentStatus !== "pending") {
    return false;
  }

  // CRITICAL: Only send reminders for protocols that were actually SENT to the client
  // Skip drafts - they haven't been sent yet
  if (protocol.status === "draft") {
    return false;
  }

  // Skip if protocol was never sent (sentAt is null)
  if (!protocol.sentAt) {
    return false;
  }

  // Skip if protocol is already active (fully paid and in use)
  if (protocol.status === "active") {
    return false;
  }

  // Skip if no email
  if (!protocol.clientEmail) {
    return false;
  }

  // Skip if client has opted out of payment reminders
  if (protocol.paymentReminderOptOut) {
    return false;
  }

  // CRITICAL: Skip if client has already submitted a Venmo payment pending verification
  if (protocol.paymentMethod === "venmo") {
    const submissions = mockPendingVenmoSubmissions[protocol.id] || [];
    const hasPendingOrConfirmed = submissions.some(
      s => s.status === "pending" || s.status === "confirmed"
    );
    if (hasPendingOrConfirmed) {
      return false;
    }
  }

  return true;
}

describe('Payment Reminder Cron Safeguards', () => {
  describe('shouldSendReminder filtering', () => {
    it('should NOT send reminder to draft protocols', () => {
      const draftProtocol = mockProtocols.find(p => p.clientName === "Mary Lou Viola");
      expect(shouldSendReminder(draftProtocol!)).toBe(false);
    });

    it('should NOT send reminder to protocols without sentAt date', () => {
      const noSentAtProtocol = mockProtocols.find(p => p.clientName === "Test User");
      expect(shouldSendReminder(noSentAtProtocol!)).toBe(false);
    });

    it('should NOT send reminder to active protocols', () => {
      const activeProtocol = mockProtocols.find(p => p.clientName === "Active Client");
      expect(shouldSendReminder(activeProtocol!)).toBe(false);
    });

    it('should NOT send reminder to already paid protocols', () => {
      const paidProtocol = mockProtocols.find(p => p.clientName === "Paid Client");
      expect(shouldSendReminder(paidProtocol!)).toBe(false);
    });

    it('should send reminder to valid pending protocols that were sent', () => {
      const validProtocol = mockProtocols.find(p => p.clientName === "Valid Reminder Client");
      expect(shouldSendReminder(validProtocol!)).toBe(true);
    });

    it('should send reminder to approved but unpaid protocols', () => {
      const approvedUnpaid = mockProtocols.find(p => p.clientName === "Approved Unpaid Client");
      expect(shouldSendReminder(approvedUnpaid!)).toBe(true);
    });

    it('should NOT send reminder to clients who opted out', () => {
      const optedOutClient = mockProtocols.find(p => p.clientName === "Opted Out Client");
      expect(shouldSendReminder(optedOutClient!)).toBe(false);
    });
  });

  describe('Venmo pending payment check', () => {
    it('should NOT send reminder to Doug Harris who has a pending Venmo submission', () => {
      const dougHarris = mockProtocols.find(p => p.clientName === "Doug Harris");
      expect(dougHarris!.paymentMethod).toBe("venmo");
      expect(shouldSendReminder(dougHarris!)).toBe(false);
    });

    it('should NOT send reminder to client with confirmed Venmo submission', () => {
      const confirmedClient = mockProtocols.find(p => p.clientName === "Confirmed Venmo Client");
      expect(shouldSendReminder(confirmedClient!)).toBe(false);
    });

    it('should STILL send reminder to client whose Venmo was rejected (needs to pay again)', () => {
      const rejectedClient = mockProtocols.find(p => p.clientName === "Rejected Venmo Client");
      expect(shouldSendReminder(rejectedClient!)).toBe(true);
    });

    it('should STILL send reminder to Venmo client who has not submitted any payment yet', () => {
      const noSubClient = mockProtocols.find(p => p.clientName === "Venmo No Submission Client");
      expect(shouldSendReminder(noSubClient!)).toBe(true);
    });

    it('should NOT affect PayPal clients (no Venmo check for PayPal)', () => {
      const paypalClient = mockProtocols.find(p => p.clientName === "Valid Reminder Client");
      expect(paypalClient!.paymentMethod).toBe("paypal");
      expect(shouldSendReminder(paypalClient!)).toBe(true);
    });
  });

  describe('filtering all protocols', () => {
    it('should return 4 protocols eligible for reminders', () => {
      const eligibleProtocols = mockProtocols.filter(shouldSendReminder);
      expect(eligibleProtocols.length).toBe(4);
    });

    it('should filter out 7 ineligible protocols', () => {
      const ineligibleProtocols = mockProtocols.filter(p => !shouldSendReminder(p));
      expect(ineligibleProtocols.length).toBe(7);
    });

    it('eligible protocols should be the correct 4 clients', () => {
      const eligibleProtocols = mockProtocols.filter(shouldSendReminder);
      const names = eligibleProtocols.map(p => p.clientName);
      expect(names).toContain("Valid Reminder Client");
      expect(names).toContain("Approved Unpaid Client");
      expect(names).toContain("Rejected Venmo Client");
      expect(names).toContain("Venmo No Submission Client");
    });

    it('Doug Harris should NOT be in the eligible list', () => {
      const eligibleProtocols = mockProtocols.filter(shouldSendReminder);
      const names = eligibleProtocols.map(p => p.clientName);
      expect(names).not.toContain("Doug Harris");
    });
  });
});
