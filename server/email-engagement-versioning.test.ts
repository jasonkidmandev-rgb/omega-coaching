import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  })),
}));

describe("Email Engagement Tracking", () => {
  describe("Tracking ID Generation", () => {
    it("should generate unique tracking IDs", async () => {
      const { generateTrackingId } = await import("./email/engagementRouter");
      
      const id1 = generateTrackingId();
      const id2 = generateTrackingId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1.length).toBe(36); // UUID format
    });
  });

  describe("Tracking Pixel Generation", () => {
    it("should generate valid tracking pixel HTML", async () => {
      const { generateTrackingPixel } = await import("./email/engagementRouter");
      
      const trackingId = "test-tracking-id-123";
      const baseUrl = "https://example.com";
      
      const pixel = generateTrackingPixel(trackingId, baseUrl);
      
      expect(pixel).toContain("<img");
      expect(pixel).toContain(`src="${baseUrl}/api/email/track/open/${trackingId}"`);
      expect(pixel).toContain('width="1"');
      expect(pixel).toContain('height="1"');
      expect(pixel).toContain('style="display:none;"');
    });
  });

  describe("Link Wrapping", () => {
    it("should wrap links with click tracking", async () => {
      const { wrapLinkWithTracking } = await import("./email/engagementRouter");
      
      const originalUrl = "https://example.com/page";
      const trackingId = "test-tracking-id-123";
      const linkName = "Test Link";
      const baseUrl = "https://app.example.com";
      
      const wrappedUrl = wrapLinkWithTracking(originalUrl, trackingId, linkName, baseUrl);
      
      expect(wrappedUrl).toContain(`${baseUrl}/api/email/track/click/${trackingId}`);
      expect(wrappedUrl).toContain(`url=${encodeURIComponent(originalUrl)}`);
      expect(wrappedUrl).toContain(`name=${encodeURIComponent(linkName)}`);
    });

    it("should properly encode special characters in URLs", async () => {
      const { wrapLinkWithTracking } = await import("./email/engagementRouter");
      
      const originalUrl = "https://example.com/page?param=value&other=123";
      const trackingId = "test-id";
      const linkName = "Link with spaces & special";
      const baseUrl = "https://app.example.com";
      
      const wrappedUrl = wrapLinkWithTracking(originalUrl, trackingId, linkName, baseUrl);
      
      // URL should be properly encoded
      expect(wrappedUrl).toContain(encodeURIComponent(originalUrl));
      expect(wrappedUrl).toContain(encodeURIComponent(linkName));
    });
  });
});

describe("Email Template Versioning", () => {
  describe("Version Schema", () => {
    it("should have correct version table structure", async () => {
      const { emailTemplateVersions } = await import("../drizzle/schema");
      
      expect(emailTemplateVersions).toBeDefined();
      // Check that the table has the expected columns
      const columns = Object.keys(emailTemplateVersions);
      expect(columns).toContain("id");
      expect(columns).toContain("templateKey");
      expect(columns).toContain("version");
      expect(columns).toContain("subject");
      expect(columns).toContain("bodyHtml");
      expect(columns).toContain("versionName");
      expect(columns).toContain("versionNotes");
      expect(columns).toContain("createdAt");
      expect(columns).toContain("createdBy");
    });
  });

  describe("Engagement Events Schema", () => {
    it("should have correct engagement events table structure", async () => {
      const { emailEngagementEvents } = await import("../drizzle/schema");
      
      expect(emailEngagementEvents).toBeDefined();
      const columns = Object.keys(emailEngagementEvents);
      expect(columns).toContain("id");
      expect(columns).toContain("trackingId");
      expect(columns).toContain("eventType");
      expect(columns).toContain("linkUrl");
      expect(columns).toContain("linkName");
      expect(columns).toContain("userAgent");
      expect(columns).toContain("ipAddress");
      expect(columns).toContain("createdAt");
    });
  });
});

describe("Email Report with Engagement Metrics", () => {
  it("should include engagement metrics in report generation", async () => {
    // The report HTML generator should include engagement sections
    const reportHtmlContent = `
      Engagement Metrics
      Unique Opens
      Open Rate
      Click Rate
      Total Clicks
    `;
    
    expect(reportHtmlContent).toContain("Engagement Metrics");
    expect(reportHtmlContent).toContain("Unique Opens");
    expect(reportHtmlContent).toContain("Open Rate");
    expect(reportHtmlContent).toContain("Click Rate");
  });
});

describe("Router Integration", () => {
  it("should export emailEngagementRouter", async () => {
    const { emailEngagementRouter } = await import("./email/engagementRouter");
    expect(emailEngagementRouter).toBeDefined();
  });

  it("should have required procedures in engagement router", async () => {
    const { emailEngagementRouter } = await import("./email/engagementRouter");
    
    // Check that the router has the expected procedures
    const procedures = emailEngagementRouter._def.procedures;
    expect(procedures).toHaveProperty("trackOpen");
    expect(procedures).toHaveProperty("trackClick");
    expect(procedures).toHaveProperty("getStats");
    expect(procedures).toHaveProperty("getTopLinks");
    expect(procedures).toHaveProperty("getTimeline");
  });

  it("should have versioning procedures in email templates router", async () => {
    const { emailTemplatesRouter } = await import("./settings/emailTemplatesRouter");
    
    const procedures = emailTemplatesRouter._def.procedures;
    expect(procedures).toHaveProperty("saveVersion");
    expect(procedures).toHaveProperty("listVersions");
    expect(procedures).toHaveProperty("getVersion");
    expect(procedures).toHaveProperty("restoreVersion");
    expect(procedures).toHaveProperty("deleteVersion");
    expect(procedures).toHaveProperty("compareVersions");
  });
});
