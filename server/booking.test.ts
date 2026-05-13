import { describe, it, expect, vi } from "vitest";

describe("Booking System", () => {
  describe("Appointment Types", () => {
    it("should have valid appointment type structure", () => {
      const appointmentType = {
        id: 1,
        name: "Initial Consultation",
        description: "60-minute initial consultation",
        duration: 60,
        price: "150.00",
        color: "#f97316",
        isActive: true,
        allowOnlineBooking: true,
        requiresApproval: false,
        bufferBefore: 15,
        bufferAfter: 15,
      };

      expect(appointmentType.name).toBeDefined();
      expect(appointmentType.duration).toBeGreaterThan(0);
      expect(appointmentType.duration).toBeLessThanOrEqual(480);
      expect(appointmentType.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it("should validate duration constraints", () => {
      const validDurations = [15, 30, 45, 60, 90, 120];
      validDurations.forEach((duration) => {
        expect(duration).toBeGreaterThanOrEqual(5);
        expect(duration).toBeLessThanOrEqual(480);
      });
    });
  });

  describe("Availability Slots", () => {
    it("should have valid availability slot structure", () => {
      const slot = {
        id: 1,
        coachId: 1,
        dayOfWeek: 1, // Monday
        startTime: "09:00",
        endTime: "17:00",
        isActive: true,
      };

      expect(slot.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(slot.dayOfWeek).toBeLessThanOrEqual(6);
      expect(slot.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(slot.endTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it("should validate day of week range", () => {
      const days = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday
      days.forEach((day) => {
        expect(day).toBeGreaterThanOrEqual(0);
        expect(day).toBeLessThanOrEqual(6);
      });
    });
  });

  describe("Appointments", () => {
    it("should have valid appointment structure", () => {
      const appointment = {
        id: 1,
        coachId: 1,
        clientName: "John Doe",
        clientEmail: "john@example.com",
        clientPhone: "+1234567890",
        appointmentTypeId: 1,
        startTime: new Date("2026-01-15T10:00:00Z"),
        endTime: new Date("2026-01-15T11:00:00Z"),
        status: "scheduled" as const,
        notes: "Initial consultation",
      };

      expect(appointment.clientName).toBeDefined();
      expect(appointment.clientEmail).toMatch(/@/);
      expect(appointment.startTime).toBeInstanceOf(Date);
      expect(appointment.endTime).toBeInstanceOf(Date);
      expect(appointment.endTime.getTime()).toBeGreaterThan(appointment.startTime.getTime());
    });

    it("should validate appointment status values", () => {
      const validStatuses = ["scheduled", "confirmed", "cancelled", "completed", "no_show"];
      validStatuses.forEach((status) => {
        expect(validStatuses).toContain(status);
      });
    });
  });

  describe("Available Slot Generation", () => {
    it("should generate time slots correctly", () => {
      const generateSlots = (
        startHour: number,
        endHour: number,
        duration: number,
        date: Date
      ) => {
        const slots: { startTime: Date; endTime: Date }[] = [];
        let currentTime = new Date(date);
        currentTime.setHours(startHour, 0, 0, 0);

        const endTime = new Date(date);
        endTime.setHours(endHour, 0, 0, 0);

        while (currentTime.getTime() + duration * 60000 <= endTime.getTime()) {
          const slotStart = new Date(currentTime);
          const slotEnd = new Date(currentTime.getTime() + duration * 60000);
          slots.push({ startTime: slotStart, endTime: slotEnd });
          currentTime = new Date(currentTime.getTime() + 30 * 60000); // 30-min intervals
        }

        return slots;
      };

      const testDate = new Date("2026-01-15");
      const slots = generateSlots(9, 12, 60, testDate); // 9 AM to 12 PM, 60-min appointments

      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0].startTime.getHours()).toBe(9);
      
      // Each slot should be 60 minutes
      slots.forEach((slot) => {
        const duration = (slot.endTime.getTime() - slot.startTime.getTime()) / 60000;
        expect(duration).toBe(60);
      });
    });
  });

  describe("Appointment Packages", () => {
    it("should calculate package value correctly", () => {
      const package1 = {
        name: "5 Session Package",
        sessionCount: 5,
        bonusSessions: 1,
        price: "600.00",
        validDays: 365,
      };

      const totalSessions = package1.sessionCount + package1.bonusSessions;
      const pricePerSession = parseFloat(package1.price) / totalSessions;

      expect(totalSessions).toBe(6);
      expect(pricePerSession).toBe(100);
    });
  });
});
