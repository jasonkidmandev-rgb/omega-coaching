import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Negative Stock Alert Feature', () => {
  const inventoryPage = readFileSync(
    join(__dirname, '../client/src/pages/admin/Inventory.tsx'),
    'utf-8'
  );

  it('should compute negativeStockItems from inventory data', () => {
    expect(inventoryPage).toContain('negativeStockItems');
    expect(inventoryPage).toContain('item.quantity < 0');
  });

  it('should exclude non-restocked categories from negative stock alerts', () => {
    expect(inventoryPage).toContain('excludedAlertCategories');
    expect(inventoryPage).toContain('limitless non-stock');
    expect(inventoryPage).toContain('b grade uw branded products');
    expect(inventoryPage).toContain('additional inventory - non store');
    expect(inventoryPage).toContain('!excludedAlertCategories.includes(cat.name.toLowerCase())');
  });

  it('should not highlight rows in excluded categories as negative stock', () => {
    expect(inventoryPage).toContain('isCategoryExcluded');
    expect(inventoryPage).toContain('item.quantity < 0 && !isCategoryExcluded');
  });

  it('should display a Negative Stock Alert banner when items are below zero', () => {
    expect(inventoryPage).toContain('Negative Stock Alert');
    expect(inventoryPage).toContain('negativeStockItems.length > 0');
  });

  it('should highlight negative stock rows with red background', () => {
    expect(inventoryPage).toContain('bg-red-50');
    expect(inventoryPage).toContain('border-l-red-500');
    expect(inventoryPage).toContain('isNegativeStock');
  });

  it('should have a Negative Stock stats card', () => {
    expect(inventoryPage).toContain('Negative Stock');
    expect(inventoryPage).toContain('Needs restocking');
  });

  it('should have a Show Only Negative filter button', () => {
    expect(inventoryPage).toContain('showNegativeOnly');
    expect(inventoryPage).toContain("Show Only Negative");
    expect(inventoryPage).toContain("Show All");
  });

  it('should apply negative stock filter to inventory items', () => {
    expect(inventoryPage).toContain('matchesNegative');
    expect(inventoryPage).toContain('!showNegativeOnly || item.quantity < 0');
  });

  it('should show negative stock badge with animate-pulse', () => {
    expect(inventoryPage).toContain("animate-pulse");
    expect(inventoryPage).toContain("item.quantity < 0 && !isCategoryExcluded ? 'animate-pulse' : ''");
  });

  it('should not disable Sell button at zero stock (allow negative)', () => {
    // The old code had: disabled={item.quantity === 0}
    // The new code should NOT have this disabled check
    const sellButtonSection = inventoryPage.slice(
      inventoryPage.indexOf('openAdjustDialog(item, "sell")'),
      inventoryPage.indexOf('openAdjustDialog(item, "sell")') + 200
    );
    expect(sellButtonSection).not.toContain('disabled={item.quantity === 0}');
  });

  it('should allow clicking negative stock items in alert to open restock dialog', () => {
    expect(inventoryPage).toContain("openAdjustDialog(item, 'restock')");
  });

  // Verify the server-side deduction allows negative stock
  const dbFile = readFileSync(
    join(__dirname, 'db.ts'),
    'utf-8'
  );

  it('should allow negative stock in deductInventoryForProtocol', () => {
    // Should NOT contain the old stock check that blocked deductions
    const deductSection = dbFile.slice(
      dbFile.indexOf('deductInventoryForProtocol'),
      dbFile.indexOf('deductInventoryForProtocol') + 3000
    );
    expect(deductSection).not.toContain('Insufficient stock');
    expect(deductSection).toContain('even if stock goes negative');
  });

  it('should allow negative stock in deductInventoryForStoreOrder', () => {
    const storeDeductSection = dbFile.slice(
      dbFile.indexOf('deductInventoryForStoreOrder'),
      dbFile.indexOf('deductInventoryForStoreOrder') + 2000
    );
    // Should NOT clamp to zero
    expect(storeDeductSection).not.toContain('Math.max(0,');
    expect(storeDeductSection).toContain('currentQty - item.quantity');
  });
});
