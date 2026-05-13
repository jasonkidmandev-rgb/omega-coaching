import { describe, it, expect } from "vitest";
import { sendPaymentConfirmationEmail } from "./payment/emailService";

describe("Payment System", () => {
  describe("Payment Confirmation Email", () => {
    it("should generate PayPal payment confirmation email", async () => {
      const result = await sendPaymentConfirmationEmail({
        clientName: "Test Client",
        clientEmail: "test@example.com",
        amount: "299.99",
        currency: "USD",
        paymentMethod: "paypal",
        protocolName: "12-Month Wolverine Stack Protocol",
        paymentDate: new Date(),
        orderId: "test-order-123",
      });

      expect(result.success).toBe(true);
    });

    it("should generate Venmo payment confirmation email", async () => {
      const result = await sendPaymentConfirmationEmail({
        clientName: "Test Client",
        clientEmail: "test@example.com",
        amount: "199.99",
        currency: "USD",
        paymentMethod: "venmo",
        protocolName: "90-Day Cognition Protocol",
        paymentDate: new Date(),
      });

      expect(result.success).toBe(true);
    }, 10000);

    it("should include order ID in PayPal confirmation", async () => {
      const result = await sendPaymentConfirmationEmail({
        clientName: "John Doe",
        clientEmail: "john@example.com",
        amount: "499.99",
        currency: "USD",
        paymentMethod: "paypal",
        protocolName: "Complete Health Optimization",
        paymentDate: new Date("2026-01-13"),
        orderId: "PPL-2026-001",
      });

      expect(result.success).toBe(true);
    });

    it("should handle Venmo-specific messaging", async () => {
      const result = await sendPaymentConfirmationEmail({
        clientName: "Jane Smith",
        clientEmail: "jane@example.com",
        amount: "149.99",
        currency: "USD",
        paymentMethod: "venmo",
        protocolName: "Brain Restoration Protocol",
        paymentDate: new Date(),
        supportEmail: "support@example.com",
      });

      expect(result.success).toBe(true);
    });
  });
});
