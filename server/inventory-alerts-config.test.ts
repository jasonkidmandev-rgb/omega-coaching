import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const dbCode = readFileSync(join(__dirname, 'db.ts'), 'utf-8');
const settingsPage = readFileSync(join(__dirname, '../client/src/pages/admin/Settings.tsx'), 'utf-8');
const inventoryPage = readFileSync(join(__dirname, '../client/src/pages/admin/Inventory.tsx'), 'utf-8');
const restockTemplate = readFileSync(join(__dirname, 'emailTemplates/restockAlert.ts'), 'utf-8');

describe('Configurable Inventory Alert Settings', () => {
  describe('Settings UI', () => {
    it('has an Inventory tab in Settings page', () => {
      expect(settingsPage).toContain('value="inventory"');
      expect(settingsPage).toContain('Inventory Alert Settings');
    });

    it('has restock alerts toggle', () => {
      expect(settingsPage).toContain('restock_alerts_enabled');
      expect(settingsPage).toContain('Automatic Restock Alerts');
    });

    it('has configurable threshold input', () => {
      expect(settingsPage).toContain('restock_alert_threshold');
      expect(settingsPage).toContain('Restock Alert Threshold');
    });

    it('has excluded categories multi-select', () => {
      expect(settingsPage).toContain('inventory_excluded_categories');
      expect(settingsPage).toContain('Excluded Categories');
      expect(settingsPage).toContain('toggleExcludedCategory');
    });

    it('has email customization fields', () => {
      expect(settingsPage).toContain('restock_email_subject');
      expect(settingsPage).toContain('restock_email_intro');
      expect(settingsPage).toContain('Email Subject');
      expect(settingsPage).toContain('Email Introduction Text');
    });

    it('has save button and send test alert button', () => {
      expect(settingsPage).toContain('handleSaveInventoryAlerts');
      expect(settingsPage).toContain('handleSendTestRestockAlert');
      expect(settingsPage).toContain('Send Test Alert Now');
    });

    it('saves all settings via settings.set mutation', () => {
      expect(settingsPage).toContain('setSettingMutation.mutateAsync({ key: "restock_alerts_enabled"');
      expect(settingsPage).toContain('setSettingMutation.mutateAsync({ key: "restock_alert_threshold"');
      expect(settingsPage).toContain('setSettingMutation.mutateAsync({ key: "inventory_excluded_categories"');
    });
  });

  describe('Auto-trigger after deduction', () => {
    it('calls checkAndSendRestockAlerts after protocol deduction', () => {
      // Find the deductInventoryForProtocol function and verify it calls checkAndSendRestockAlerts
      const deductSection = dbCode.substring(
        dbCode.indexOf('export async function deductInventoryForProtocol'),
        dbCode.indexOf('// Preview inventory deductions')
      );
      expect(deductSection).toContain('checkAndSendRestockAlerts');
      expect(deductSection).toContain('Protocol #${clientProtocolId}');
    });

    it('calls checkAndSendRestockAlerts after store order deduction', () => {
      const storeDeductSection = dbCode.substring(
        dbCode.indexOf('export async function deductInventoryForStoreOrder'),
        dbCode.indexOf('// Restock inventory when a store order is refunded')
      );
      expect(storeDeductSection).toContain('checkAndSendRestockAlerts');
      expect(storeDeductSection).toContain('Store order #${storeOrderId}');
    });

    it('auto-trigger is non-blocking (uses .catch)', () => {
      expect(dbCode).toContain("checkAndSendRestockAlerts(`Protocol #${clientProtocolId}`).catch");
      expect(dbCode).toContain("checkAndSendRestockAlerts(`Store order #${storeOrderId}`).catch");
    });
  });

  describe('checkAndSendRestockAlerts function', () => {
    it('exists and is exported', () => {
      expect(dbCode).toContain('export async function checkAndSendRestockAlerts');
    });

    it('checks if alerts are enabled via settings', () => {
      expect(dbCode).toContain("getSiteSetting('restock_alerts_enabled')");
    });

    it('reads configurable threshold from settings', () => {
      expect(dbCode).toContain("getSiteSetting('restock_alert_threshold')");
    });

    it('reads excluded categories from settings', () => {
      expect(dbCode).toContain("getSiteSetting('inventory_excluded_categories')");
    });

    it('has rate limiting (once per hour)', () => {
      expect(dbCode).toContain("getSiteSetting('restock_alert_last_sent')");
      expect(dbCode).toContain('60 * 60 * 1000');
      expect(dbCode).toContain('Rate limited');
    });

    it('filters out excluded categories', () => {
      const fn = dbCode.substring(
        dbCode.indexOf('export async function checkAndSendRestockAlerts'),
        dbCode.indexOf('// Update user phone number')
      );
      expect(fn).toContain('excludedCategories.includes(catName)');
    });

    it('reads custom email subject and intro from settings', () => {
      expect(dbCode).toContain("getSiteSetting('restock_email_subject')");
      expect(dbCode).toContain("getSiteSetting('restock_email_intro')");
    });

    it('updates last sent timestamp after sending', () => {
      expect(dbCode).toContain("setSiteSetting('restock_alert_last_sent'");
    });
  });

  describe('Inventory page uses configurable excluded categories', () => {
    it('reads excluded categories from settings', () => {
      expect(inventoryPage).toContain("trpc.settings.get.useQuery({ key: 'inventory_excluded_categories' })");
    });

    it('parses JSON excluded categories with fallback defaults', () => {
      expect(inventoryPage).toContain('JSON.parse(excludedCategoriesSetting)');
      // Has fallback defaults
      expect(inventoryPage).toContain('limitless non-stock');
      expect(inventoryPage).toContain('b grade uw branded products');
      expect(inventoryPage).toContain('additional inventory - non store');
    });
  });

  describe('Restock alert email template', () => {
    it('supports custom subject via template variables', () => {
      expect(restockTemplate).toContain('customSubject');
      expect(restockTemplate).toContain("replace('{{count}}'");
      expect(restockTemplate).toContain("replace('{{threshold}}'");
    });

    it('supports custom intro text', () => {
      expect(restockTemplate).toContain('customIntro');
    });

    it('highlights negative stock items', () => {
      expect(restockTemplate).toContain('negative stock');
    });

    it('includes triggeredBy info', () => {
      expect(restockTemplate).toContain('triggeredBy');
      expect(restockTemplate).toContain('Triggered By');
    });
  });
});
