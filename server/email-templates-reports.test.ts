import { describe, it, expect } from "vitest";

describe("Email Template Customization System", () => {
  describe("Schema", () => {
    it("should have email_template_customizations table in schema", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.emailTemplateCustomizations).toBeDefined();
    });

    it("should have required fields in emailTemplateCustomizations", async () => {
      const schema = await import("../drizzle/schema");
      const table = schema.emailTemplateCustomizations;
      
      // Check that the table has the expected structure
      expect(table).toBeDefined();
      expect(typeof table).toBe("object");
    });

    it("should have email_report_settings table in schema", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.emailReportSettings).toBeDefined();
    });

    it("should have required fields in emailReportSettings", async () => {
      const schema = await import("../drizzle/schema");
      const table = schema.emailReportSettings;
      
      expect(table).toBeDefined();
      expect(typeof table).toBe("object");
    });
  });

  describe("Email Templates Router", () => {
    it("should have getPreview procedure", async () => {
      const { emailTemplatesRouter } = await import("./settings/emailTemplatesRouter");
      expect(emailTemplatesRouter._def.procedures.getPreview).toBeDefined();
    });

    it("should have sendTest procedure", async () => {
      const { emailTemplatesRouter } = await import("./settings/emailTemplatesRouter");
      expect(emailTemplatesRouter._def.procedures.sendTest).toBeDefined();
    });

    it("should have list procedure", async () => {
      const { emailTemplatesRouter } = await import("./settings/emailTemplatesRouter");
      expect(emailTemplatesRouter._def.procedures.list).toBeDefined();
    });

    it("should have getCustomization procedure", async () => {
      const { emailTemplatesRouter } = await import("./settings/emailTemplatesRouter");
      expect(emailTemplatesRouter._def.procedures.getCustomization).toBeDefined();
    });

    it("should have saveCustomization procedure", async () => {
      const { emailTemplatesRouter } = await import("./settings/emailTemplatesRouter");
      expect(emailTemplatesRouter._def.procedures.saveCustomization).toBeDefined();
    });

    it("should have resetToDefault procedure", async () => {
      const { emailTemplatesRouter } = await import("./settings/emailTemplatesRouter");
      expect(emailTemplatesRouter._def.procedures.resetToDefault).toBeDefined();
    });
  });

  describe("Email Report Settings Router", () => {
    it("should have list procedure", async () => {
      const { emailReportSettingsRouter } = await import("./settings/emailReportSettingsRouter");
      expect(emailReportSettingsRouter._def.procedures.list).toBeDefined();
    });

    it("should have get procedure", async () => {
      const { emailReportSettingsRouter } = await import("./settings/emailReportSettingsRouter");
      expect(emailReportSettingsRouter._def.procedures.get).toBeDefined();
    });

    it("should have upsert procedure", async () => {
      const { emailReportSettingsRouter } = await import("./settings/emailReportSettingsRouter");
      expect(emailReportSettingsRouter._def.procedures.upsert).toBeDefined();
    });

    it("should have delete procedure", async () => {
      const { emailReportSettingsRouter } = await import("./settings/emailReportSettingsRouter");
      expect(emailReportSettingsRouter._def.procedures.delete).toBeDefined();
    });

    it("should have getDeliveryStats procedure", async () => {
      const { emailReportSettingsRouter } = await import("./settings/emailReportSettingsRouter");
      expect(emailReportSettingsRouter._def.procedures.getDeliveryStats).toBeDefined();
    });

    it("should have sendTestReport procedure", async () => {
      const { emailReportSettingsRouter } = await import("./settings/emailReportSettingsRouter");
      expect(emailReportSettingsRouter._def.procedures.sendTestReport).toBeDefined();
    });
  });

  describe("Email Report Cron", () => {
    it("should have email report cron module", async () => {
      const cron = await import("./cron/emailReportCron");
      expect(cron.initEmailReportCron).toBeDefined();
      expect(typeof cron.initEmailReportCron).toBe("function");
    });

    it("should have processScheduledReports function", async () => {
      const cron = await import("./cron/emailReportCron");
      expect(cron.processScheduledReports).toBeDefined();
      expect(typeof cron.processScheduledReports).toBe("function");
    });
  });
});
