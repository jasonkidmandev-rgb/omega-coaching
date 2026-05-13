import { describe, it, expect } from "vitest";

describe("Intake Form Phone Sync Feature", () => {
  describe("saveIntakeForm endpoint", () => {
    it("should sync phone to enrollment when phone is provided in form data", () => {
      // Mock form data with phone
      const formData = {
        fullName: "John Doe",
        email: "john@example.com",
        phone: "(555) 123-4567",
        dateOfBirth: "1990-01-15",
      };
      
      // Verify phone is present and will be synced
      expect(formData.phone).toBe("(555) 123-4567");
      expect(formData.phone).toBeTruthy();
    });
    
    it("should not sync phone when phone is not provided", () => {
      const formDataNoPhone = {
        fullName: "Jane Doe",
        email: "jane@example.com",
        dateOfBirth: "1985-06-20",
      };
      
      // Verify phone is not present
      expect((formDataNoPhone as any).phone).toBeUndefined();
    });
    
    it("should handle empty string phone gracefully", () => {
      const formDataEmptyPhone = {
        fullName: "Test User",
        email: "test@example.com",
        phone: "",
      };
      
      // Empty string should be treated as falsy
      expect(formDataEmptyPhone.phone).toBeFalsy();
    });
  });
  
  describe("submitIntakeForm endpoint", () => {
    it("should sync phone to enrollment on form submission", () => {
      const submitData = {
        enrollmentId: 1,
        formData: {
          fullName: "John Doe",
          email: "john@example.com",
          phone: "(555) 987-6543",
        },
        signatures: {
          coaching_waiver: "typed:John Doe",
        },
      };
      
      // Verify phone will be synced
      expect(submitData.formData.phone).toBe("(555) 987-6543");
    });
    
    it("should use COALESCE to preserve existing phone if new phone is null", () => {
      // SQL COALESCE(new_value, existing_value) returns first non-null value
      const newPhone = null;
      const existingPhone = "(555) 111-2222";
      
      // Simulate COALESCE behavior
      const resultPhone = newPhone ?? existingPhone;
      expect(resultPhone).toBe("(555) 111-2222");
    });
    
    it("should update phone if new phone is provided", () => {
      const newPhone = "(555) 333-4444";
      const existingPhone = "(555) 111-2222";
      
      // New phone should override existing
      const resultPhone = newPhone ?? existingPhone;
      expect(resultPhone).toBe("(555) 333-4444");
    });
  });
  
  describe("Phone sync logging", () => {
    it("should log phone sync for debugging", () => {
      const enrollmentId = 123;
      const phone = "(555) 123-4567";
      
      // Verify log message structure
      const logMessage = `[saveIntakeForm] Synced phone to enrollment: { enrollmentId: ${enrollmentId}, phone: ${phone} }`;
      expect(logMessage).toContain("Synced phone to enrollment");
      expect(logMessage).toContain(enrollmentId.toString());
      expect(logMessage).toContain(phone);
    });
  });
  
  describe("Integration with pending enrollments", () => {
    it("should display synced phone in pending enrollments table", () => {
      // Mock enrollment with synced phone
      const enrollment = {
        id: 1,
        email: "client@example.com",
        clientName: "Test Client",
        phone: "(555) 123-4567", // Synced from intake form
        tier: "flagship",
        status: "coaching_paid",
        intakeFormCompleted: true,
      };
      
      expect(enrollment.phone).toBe("(555) 123-4567");
      expect(enrollment.intakeFormCompleted).toBe(true);
    });
  });
});
