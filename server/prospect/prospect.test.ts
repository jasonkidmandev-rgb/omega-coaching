import { describe, it, expect, vi } from "vitest";
import { formatPhoneE164, formatPhoneDisplay } from "../utils/phone";

describe("Phone utilities", () => {
  describe("formatPhoneE164", () => {
    it("formats 10-digit US number", () => {
      expect(formatPhoneE164("5551234567")).toBe("+15551234567");
    });
    
    it("formats (XXX) XXX-XXXX format", () => {
      expect(formatPhoneE164("(555) 123-4567")).toBe("+15551234567");
    });
    
    it("formats XXX-XXX-XXXX format", () => {
      expect(formatPhoneE164("555-123-4567")).toBe("+15551234567");
    });
    
    it("handles 11-digit US number with country code", () => {
      expect(formatPhoneE164("15551234567")).toBe("+15551234567");
    });
    
    it("handles already E.164 formatted number", () => {
      expect(formatPhoneE164("+15551234567")).toBe("+15551234567");
    });
    
    it("returns null for empty string", () => {
      expect(formatPhoneE164("")).toBeNull();
    });
    
    it("returns null for too-short numbers", () => {
      expect(formatPhoneE164("12345")).toBeNull();
    });
  });
  
  describe("formatPhoneDisplay", () => {
    it("formats E.164 to display format", () => {
      expect(formatPhoneDisplay("+15551234567")).toBe("(555) 123-4567");
    });
    
    it("formats 10-digit to display format", () => {
      expect(formatPhoneDisplay("5551234567")).toBe("(555) 123-4567");
    });
    
    it("returns original for unrecognized format", () => {
      expect(formatPhoneDisplay("123")).toBe("123");
    });
  });
});

describe("Prospect Pipeline", () => {
  describe("Phone number validation", () => {
    it("rejects invalid phone numbers", () => {
      expect(formatPhoneE164("abc")).toBeNull();
      expect(formatPhoneE164("")).toBeNull();
      expect(formatPhoneE164("123")).toBeNull();
    });
    
    it("accepts various valid US formats", () => {
      const validFormats = [
        "(555) 123-4567",
        "555-123-4567",
        "5551234567",
        "+15551234567",
        "1-555-123-4567",
      ];
      for (const format of validFormats) {
        const result = formatPhoneE164(format);
        expect(result).toBe("+15551234567");
      }
    });
  });
  
  describe("Template variable rendering", () => {
    it("replaces template variables correctly", () => {
      const template = "Hey {{name}}, check out our programs: {{link}}";
      const rendered = template
        .replace(/\{\{name\}\}/g, "John")
        .replace(/\{\{link\}\}/g, "https://example.com/track/abc123");
      
      expect(rendered).toBe("Hey John, check out our programs: https://example.com/track/abc123");
    });
    
    it("handles missing variables gracefully", () => {
      const template = "Hey {{name}}, welcome!";
      const rendered = template.replace(/\{\{name\}\}/g, "");
      expect(rendered).toBe("Hey , welcome!");
    });
  });
  
  describe("Tracked link generation", () => {
    it("builds correct tracked link URL", () => {
      const baseUrl = "https://example.com";
      const trackingToken = "abc123";
      const destination = "/transformation";
      const link = `${baseUrl}/api/prospect/click/${trackingToken}?dest=${encodeURIComponent(destination)}`;
      
      expect(link).toBe("https://example.com/api/prospect/click/abc123?dest=%2Ftransformation");
    });
    
    it("encodes special characters in destination", () => {
      const baseUrl = "https://example.com";
      const trackingToken = "abc123";
      const destination = "/transformation/select-tier?ref=sms";
      const link = `${baseUrl}/api/prospect/click/${trackingToken}?dest=${encodeURIComponent(destination)}`;
      
      expect(link).toContain("dest=%2Ftransformation%2Fselect-tier%3Fref%3Dsms");
    });
  });
});
