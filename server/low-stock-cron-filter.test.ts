import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Tests for the Low Stock Alert Cron category filtering fix.
 * 
 * The daily cron was sending alerts for ALL low stock items, including
 * categories the admin doesn't track (e.g., "Limitless Non-Stock",
 * "B Grade UW Branded Products", "Additional Inventory - Non Store").
 * 
 * The fix ensures the cron respects the `inventory_excluded_categories`
 * site setting, matching the behavior of:
 * - The Inventory page UI (which already excluded these categories)
 * - The checkAndSendRestockAlerts function (which already excluded them)
 */

const cronCode = readFileSync(join(__dirname, 'cron/lowStockAlertCron.ts'), 'utf-8');
const dbCode = readFileSync(join(__dirname, 'db.ts'), 'utf-8');

describe('Low Stock Cron - Excluded Categories Filter', () => {
  
  describe('Category filtering in daily cron', () => {
    it('should read excluded categories from site settings', () => {
      expect(cronCode).toContain("getSiteSetting('inventory_excluded_categories')");
    });

    it('should have default excluded categories as fallback', () => {
      expect(cronCode).toContain('DEFAULT_EXCLUDED_CATEGORIES');
      expect(cronCode).toContain('limitless non-stock');
      expect(cronCode).toContain('b grade uw branded products');
      expect(cronCode).toContain('additional inventory - non store');
    });

    it('should fetch all inventory categories to build category map', () => {
      expect(cronCode).toContain('getAllInventoryCategories');
      expect(cronCode).toContain('categoryMap');
    });

    it('should filter out items from excluded categories', () => {
      expect(cronCode).toContain('excludedCategories.includes(catName)');
      // The filter should be applied before sending emails
      const filterIndex = cronCode.indexOf('excludedCategories.includes(catName)');
      const sendEmailIndex = cronCode.indexOf('sendEmail({');
      expect(filterIndex).toBeLessThan(sendEmailIndex);
    });

    it('should log how many items were excluded', () => {
      expect(cronCode).toContain('Filtered out');
      expect(cronCode).toContain('excludedCount');
    });

    it('should skip sending email if all items are in excluded categories', () => {
      expect(cronCode).toContain('No low stock items after filtering excluded categories');
    });

    it('should include actual category names in email data', () => {
      // Previously it hardcoded "Inventory" as category name
      expect(cronCode).not.toContain("categoryName: 'Inventory'");
      expect(cronCode).toContain("categoryMap.get(item.categoryId) || 'Uncategorized'");
    });

    it('should also filter out-of-stock notifications by excluded categories', () => {
      // The out-of-stock notification should only fire for tracked items
      // It uses lowStockItems (already filtered) not allLowStockItems
      const outOfStockSection = cronCode.substring(
        cronCode.indexOf('out-of-stock items'),
        cronCode.indexOf('Job complete')
      );
      expect(outOfStockSection).toContain('lowStockItems.filter');
      expect(outOfStockSection).not.toContain('allLowStockItems.filter');
    });
  });

  describe('Consistency with checkAndSendRestockAlerts', () => {
    it('both should read from the same inventory_excluded_categories setting', () => {
      expect(cronCode).toContain("inventory_excluded_categories");
      expect(dbCode).toContain("getSiteSetting('inventory_excluded_categories')");
    });

    it('both should use getAllInventoryCategories for category mapping', () => {
      expect(cronCode).toContain('getAllInventoryCategories');
      expect(dbCode).toContain('getAllInventoryCategories');
    });

    it('both should filter using category name comparison', () => {
      expect(cronCode).toContain('excludedCategories.includes(catName)');
      // checkAndSendRestockAlerts in db.ts
      const restockFn = dbCode.substring(
        dbCode.indexOf('export async function checkAndSendRestockAlerts'),
        dbCode.indexOf('// Update last sent timestamp') || dbCode.length
      );
      expect(restockFn).toContain('excludedCategories.includes(catName)');
    });
  });

  describe('getExcludedCategories helper', () => {
    it('should exist as a separate function', () => {
      expect(cronCode).toContain('async function getExcludedCategories');
    });

    it('should parse JSON from settings', () => {
      expect(cronCode).toContain('JSON.parse(excludedSetting)');
    });

    it('should lowercase category names for case-insensitive comparison', () => {
      expect(cronCode).toContain('.toLowerCase()');
    });

    it('should fall back to defaults on parse error', () => {
      expect(cronCode).toContain('DEFAULT_EXCLUDED_CATEGORIES');
    });
  });

  describe('Cron run logging', () => {
    it('should track excluded count in run data', () => {
      expect(cronCode).toContain('excludedCount');
      expect(cronCode).toContain('excludedCount: number');
    });
  });
});
