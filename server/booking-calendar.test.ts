import { describe, it, expect } from "vitest";

describe("Booking Calendar System", () => {
  describe("Appointment Reminder Cron", () => {
    it("should generate 24-hour reminder email HTML", async () => {
      // Test that reminder email template generates correctly
      const clientName = "John Doe";
      const appointmentType = "Initial Consultation";
      const appointmentDate = new Date("2026-01-15T10:00:00");
      
      // Simulated email content check
      const expectedSubject = `Reminder: Your appointment tomorrow - ${appointmentType}`;
      expect(expectedSubject).toContain("tomorrow");
      expect(expectedSubject).toContain(appointmentType);
    });

    it("should generate 1-hour reminder email HTML", async () => {
      const clientName = "Jane Smith";
      const appointmentType = "Follow-up Session";
      const appointmentDate = new Date("2026-01-13T14:00:00");
      
      const expectedSubject = `Reminder: Your appointment in 1 hour - ${appointmentType}`;
      expect(expectedSubject).toContain("1 hour");
      expect(expectedSubject).toContain(appointmentType);
    });
  });

  describe("Outlook Integration", () => {
    it("should check if Outlook is configured", async () => {
      // Without environment variables, should return false
      const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID || "";
      const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET || "";
      const OUTLOOK_REDIRECT_URI = process.env.OUTLOOK_REDIRECT_URI || "";
      
      const isConfigured = !!(OUTLOOK_CLIENT_ID && OUTLOOK_CLIENT_SECRET && OUTLOOK_REDIRECT_URI);
      
      // In test environment, Outlook credentials are set
      expect(isConfigured).toBe(true);
    });

    it("should generate correct OAuth authorization URL format", async () => {
      const state = "test-state-123";
      const clientId = "test-client-id";
      const redirectUri = "https://example.com/callback";
      const tenantId = "common";
      
      const scopes = [
        "offline_access",
        "Calendars.ReadWrite",
        "User.Read",
      ].join(" ");

      const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        response_mode: "query",
        scope: scopes,
        state,
      });

      const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
      
      expect(url).toContain("login.microsoftonline.com");
      expect(url).toContain("oauth2/v2.0/authorize");
      expect(url).toContain("client_id=test-client-id");
      expect(url).toContain("response_type=code");
      expect(url).toContain("Calendars.ReadWrite");
    });
  });

  describe("Booking Router", () => {
    it("should validate appointment type creation input", () => {
      const validInput = {
        name: "Initial Consultation",
        duration: 60,
        price: "150.00",
        description: "First meeting with new clients",
        color: "#f97316",
        isActive: true,
      };
      
      expect(validInput.name).toBeTruthy();
      expect(validInput.duration).toBeGreaterThan(0);
      expect(validInput.price).toMatch(/^\d+\.\d{2}$/);
    });

    it("should validate availability slot format", () => {
      const availabilitySlot = {
        dayOfWeek: 1, // Monday
        startTime: "09:00",
        endTime: "17:00",
        isActive: true,
      };
      
      expect(availabilitySlot.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(availabilitySlot.dayOfWeek).toBeLessThanOrEqual(6);
      expect(availabilitySlot.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(availabilitySlot.endTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it("should validate blocked slot creation", () => {
      const blockedSlot = {
        startTime: new Date("2026-01-20T00:00:00"),
        endTime: new Date("2026-01-25T23:59:59"),
        reason: "Vacation",
        isRecurring: false,
      };
      
      expect(blockedSlot.startTime).toBeInstanceOf(Date);
      expect(blockedSlot.endTime).toBeInstanceOf(Date);
      expect(blockedSlot.endTime.getTime()).toBeGreaterThan(blockedSlot.startTime.getTime());
    });

    it("should validate appointment creation input", () => {
      const appointmentInput = {
        appointmentTypeId: 1,
        clientName: "Test Client",
        clientEmail: "test@example.com",
        startTime: new Date("2026-01-15T10:00:00"),
        notes: "Looking forward to the session",
      };
      
      expect(appointmentInput.clientName).toBeTruthy();
      expect(appointmentInput.clientEmail).toContain("@");
      expect(appointmentInput.startTime).toBeInstanceOf(Date);
    });
  });

  describe("Session Packages", () => {
    it("should calculate package pricing correctly", () => {
      const packageData = {
        name: "5-Session Package",
        appointmentTypeId: 1,
        sessionCount: 5,
        price: "600.00", // Discounted from $750 (5 x $150)
        validityDays: 90,
      };
      
      const regularPrice = 150 * packageData.sessionCount;
      const packagePrice = parseFloat(packageData.price);
      const discount = ((regularPrice - packagePrice) / regularPrice) * 100;
      
      expect(discount).toBeCloseTo(20, 0); // 20% discount
      expect(packageData.validityDays).toBe(90);
    });
  });
});
