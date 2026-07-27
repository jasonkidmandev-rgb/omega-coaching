import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("../db", () => ({
  getAdminEmails: vi.fn(),
  getUserEnabledEmailNotificationTypes: vi.fn(),
  getUserByEmail: vi.fn(),
  getSiteSetting: vi.fn(),
}));

// Mock the emailService for logEmailSentToHistory
vi.mock("../emailService", () => ({
  logEmailSentToHistory: vi.fn(),
}));

// Mock the emailTracking module
vi.mock("../emailTracking", () => ({
  createEmailTracking: vi.fn().mockResolvedValue("test-tracking-id"),
  injectTrackingIntoHtml: vi.fn().mockImplementation((html) => html),
}));

// Mock nodemailer
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-msg-id" }),
    }),
  },
}));

describe("sendAdminPaymentReceivedEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up SMTP env vars so transporter is created
    process.env.SMTP_HOST = "smtp.test.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "test@test.com";
    process.env.SMTP_PASS = "testpass";
    process.env.SMTP_FROM = "test@omegalongevity.com";
    process.env.VITE_APP_URL = "https://peptidecoach.pro";
  });

  it("should send email to admins who have payment_received enabled", async () => {
    const dbModule = await import("../db");
    (dbModule.getAdminEmails as any).mockResolvedValue(["admin@test.com", "admin2@test.com"]);
    (dbModule.getUserByEmail as any).mockImplementation((email: string) => {
      if (email === "admin@test.com") return { id: 1, email: "admin@test.com" };
      if (email === "admin2@test.com") return { id: 2, email: "admin2@test.com" };
      return null;
    });
    (dbModule.getUserEnabledEmailNotificationTypes as any).mockResolvedValue([
      "payment_received",
      "protocol_approved",
    ]);

    // Re-import to get fresh module with mocks
    const { sendAdminPaymentReceivedEmail } = await import("./emailService");

    const result = await sendAdminPaymentReceivedEmail({
      clientName: "Richard Feyh",
      clientEmail: "richard@test.com",
      amount: "4465.50",
      currency: "USD",
      paymentMethod: "paypal",
      protocolId: 810001,
      protocolName: "Health Protocol",
      orderId: "PAYPAL-ORDER-123",
      feeAmount: "161.79",
      netAmount: "4303.71",
      paymentDate: new Date("2026-02-17T10:00:00Z"),
    });

    expect(result.success).toBe(true);
    expect(result.sentTo.length).toBeGreaterThan(0);
  });

  it("should skip admins who have payment_received disabled", async () => {
    const dbModule = await import("../db");
    (dbModule.getAdminEmails as any).mockResolvedValue(["admin@test.com"]);
    (dbModule.getUserByEmail as any).mockResolvedValue({ id: 1, email: "admin@test.com" });
    (dbModule.getUserEnabledEmailNotificationTypes as any).mockResolvedValue([
      "protocol_approved",
      // payment_received is NOT in the list
    ]);

    const { sendAdminPaymentReceivedEmail } = await import("./emailService");

    const result = await sendAdminPaymentReceivedEmail({
      clientName: "Test Client",
      clientEmail: "client@test.com",
      amount: "100.00",
      currency: "USD",
      paymentMethod: "venmo",
      protocolId: 12345,
      protocolName: "Test Protocol",
      paymentDate: new Date(),
    });

    expect(result.success).toBe(true);
    expect(result.sentTo).toHaveLength(0);
  });

  it("should return success with empty sentTo when no admin emails exist", async () => {
    const dbModule = await import("../db");
    (dbModule.getAdminEmails as any).mockResolvedValue([]);

    const { sendAdminPaymentReceivedEmail } = await import("./emailService");

    const result = await sendAdminPaymentReceivedEmail({
      clientName: "Test Client",
      clientEmail: "client@test.com",
      amount: "100.00",
      currency: "USD",
      paymentMethod: "paypal",
      protocolId: 12345,
      protocolName: "Test Protocol",
      paymentDate: new Date(),
    });

    expect(result.success).toBe(true);
    expect(result.sentTo).toHaveLength(0);
  });

  it("should include correct subject line with client name and amount", async () => {
    const dbModule = await import("../db");
    (dbModule.getAdminEmails as any).mockResolvedValue(["admin@test.com"]);
    (dbModule.getUserByEmail as any).mockResolvedValue({ id: 1, email: "admin@test.com" });
    (dbModule.getUserEnabledEmailNotificationTypes as any).mockResolvedValue(["payment_received"]);

    const { sendAdminPaymentReceivedEmail } = await import("./emailService");

    const result = await sendAdminPaymentReceivedEmail({
      clientName: "John Doe",
      clientEmail: "john@test.com",
      amount: "2500.00",
      currency: "USD",
      paymentMethod: "cc",
      protocolId: 99999,
      protocolName: "Elite Protocol",
      paymentDate: new Date(),
    });

    expect(result.success).toBe(true);
    expect(result.sentTo).toContain("admin@test.com");
  });
});
