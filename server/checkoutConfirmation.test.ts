import { describe, it, expect } from "vitest";
import {
  generateCheckoutConfirmationHTML,
  getCheckoutConfirmationSubject,
  type CheckoutConfirmationData,
} from "./emailTemplates/checkoutConfirmation";

describe("Checkout Confirmation Email", () => {
  const baseData: CheckoutConfirmationData = {
    clientName: "Jason",
    clientEmail: "jason@test.com",
    planKey: "flagship",
    planName: "Weight Loss & Physique Transformation",
    planPrice: 3000,
    paymentMethod: "stripe",
    intakeCompleted: true,
    discoveryScheduled: false,
    enrollmentId: 123,
  };

  describe("generateCheckoutConfirmationHTML", () => {
    it("should generate valid HTML for coached plan", () => {
      const html = generateCheckoutConfirmationHTML(baseData);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Jason");
      expect(html).toContain("Weight Loss & Physique Transformation");
      expect(html).toContain("$3,000");
      expect(html).toContain("Stripe");
      expect(html).toContain("What Happens Next");
      expect(html).toContain("Program Roadmap");
      expect(html).toContain("60-minute strategy");
      expect(html).toContain("calendly.com");
    });

    it("should generate valid HTML for essentials plan", () => {
      const data: CheckoutConfirmationData = {
        ...baseData,
        planKey: "essentials",
        planName: "Protocol Essentials",
        planPrice: 750,
      };
      const html = generateCheckoutConfirmationHTML(data);
      expect(html).toContain("Protocol Essentials");
      expect(html).toContain("$750");
      expect(html).toContain("5 business days");
      expect(html).toContain("Protocol Essentials Timeline");
      expect(html).not.toContain("60-minute strategy");
    });

    it("should generate valid HTML for coaching session", () => {
      const data: CheckoutConfirmationData = {
        ...baseData,
        planKey: "coaching_20min",
        planName: "Targeted Focus Call",
        planPrice: 125,
      };
      const html = generateCheckoutConfirmationHTML(data);
      expect(html).toContain("Targeted Focus Call");
      expect(html).toContain("$125");
      expect(html).toContain("Session Confirmed!");
      expect(html).toContain("20 minutes");
      // Should NOT have a program roadmap content (the HTML comment is still there but the roadmap div is empty)
      expect(html).not.toContain("Your 90-Day Program Roadmap");
      expect(html).not.toContain("Protocol Essentials Timeline");
    });

    it("should generate valid HTML for elite plan with 2-hour session", () => {
      const data: CheckoutConfirmationData = {
        ...baseData,
        planKey: "elite",
        planName: "Elite Longevity",
        planPrice: 15000,
      };
      const html = generateCheckoutConfirmationHTML(data);
      expect(html).toContain("Elite Longevity");
      expect(html).toContain("$15,000");
      expect(html).toContain("2-hour deep-dive");
      expect(html).toContain("2-hour-elite-longevity");
      expect(html).toContain("priority access");
    });

    it("should show Venmo payment method correctly", () => {
      const data: CheckoutConfirmationData = {
        ...baseData,
        paymentMethod: "venmo",
      };
      const html = generateCheckoutConfirmationHTML(data);
      expect(html).toContain("Venmo");
    });

    it("should show intake completed checkmark when intake is done", () => {
      const html = generateCheckoutConfirmationHTML(baseData);
      expect(html).toContain("Completed");
      expect(html).toContain("Intake Form");
    });

    it("should not show intake row when intake is not completed", () => {
      const data: CheckoutConfirmationData = {
        ...baseData,
        intakeCompleted: false,
      };
      const html = generateCheckoutConfirmationHTML(data);
      // Should still have the next steps but no intake completed row
      expect(html).toContain("What Happens Next");
    });

    it("should include platform features links", () => {
      const html = generateCheckoutConfirmationHTML(baseData);
      expect(html).toContain("Free Masterclass");
      expect(html).toContain("Omega Store");
      expect(html).toContain("Peptide Cheat Sheet");
      expect(html).toContain("Inside Omega Podcast");
    });

    it("should include footer with support email", () => {
      const html = generateCheckoutConfirmationHTML(baseData);
      expect(html).toContain("omega@omegalongevity.com");
      expect(html).toContain("Omega Longevity");
    });

    it("should show scheduled message when discovery is scheduled", () => {
      const data: CheckoutConfirmationData = {
        ...baseData,
        discoveryScheduled: true,
      };
      const html = generateCheckoutConfirmationHTML(data);
      expect(html).toContain("scheduled");
      expect(html).toContain("calendar");
    });
  });

  describe("getCheckoutConfirmationSubject", () => {
    it("should return correct subject for coached plan", () => {
      const subject = getCheckoutConfirmationSubject(baseData);
      expect(subject).toContain("Weight Loss & Physique Transformation");
      expect(subject).toContain("Enrollment Confirmed");
    });

    it("should return correct subject for essentials plan", () => {
      const data: CheckoutConfirmationData = {
        ...baseData,
        planKey: "essentials",
        planName: "Protocol Essentials",
        planPrice: 750,
      };
      const subject = getCheckoutConfirmationSubject(data);
      expect(subject).toContain("Protocol Essentials");
    });

    it("should return correct subject for coaching session", () => {
      const data: CheckoutConfirmationData = {
        ...baseData,
        planKey: "coaching_20min",
        planName: "Targeted Focus Call",
        planPrice: 125,
      };
      const subject = getCheckoutConfirmationSubject(data);
      expect(subject).toContain("Coaching Session Confirmed");
    });

    it("should return correct subject for elite plan", () => {
      const data: CheckoutConfirmationData = {
        ...baseData,
        planKey: "elite",
        planName: "Elite Longevity",
        planPrice: 15000,
      };
      const subject = getCheckoutConfirmationSubject(data);
      expect(subject).toContain("Welcome to Elite Longevity");
    });
  });
});
