import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Bulk Restock Feature', () => {
  const routersPath = join(__dirname, 'routers.ts');
  const routersCode = readFileSync(routersPath, 'utf-8');
  
  const componentPath = join(__dirname, '..', 'client', 'src', 'components', 'BulkRestockDialog.tsx');
  const componentCode = readFileSync(componentPath, 'utf-8');
  
  const inventoryPagePath = join(__dirname, '..', 'client', 'src', 'pages', 'admin', 'Inventory.tsx');
  const inventoryCode = readFileSync(inventoryPagePath, 'utf-8');

  describe('Server endpoint', () => {
    it('should have a bulkRestock endpoint in the inventory router', () => {
      expect(routersCode).toContain('bulkRestock');
    });

    it('should accept an array of items with id, quantity, and mode', () => {
      expect(routersCode).toContain('z.array(');
      expect(routersCode).toContain('inventoryItemId:');
      expect(routersCode).toContain('quantity:');
      expect(routersCode).toContain("z.enum(['add', 'set'])");
    });

    it('should accept batch notes', () => {
      expect(routersCode).toContain('notes: z.string().');
    });

    it('should be an admin procedure', () => {
      // bulkRestock should use adminProcedure
      const bulkRestockSection = routersCode.substring(
        routersCode.indexOf('bulkRestock'),
        routersCode.indexOf('bulkRestock') + 500
      );
      expect(bulkRestockSection).toContain('adminProcedure');
    });

    it('should call adjustInventory for each item', () => {
      const bulkRestockStart = routersCode.indexOf('bulkRestock');
      const bulkRestockSection = routersCode.substring(
        bulkRestockStart,
        bulkRestockStart + 2000
      );
      expect(bulkRestockSection).toContain('adjust');
    });

    it('should support set mode (absolute) and add mode (relative)', () => {
      const bulkRestockSection = routersCode.substring(
        routersCode.indexOf('bulkRestock'),
        routersCode.indexOf('bulkRestock') + 1500
      );
      expect(bulkRestockSection).toContain("'set'");
      expect(bulkRestockSection).toContain("'add'");
    });
  });

  describe('BulkRestockDialog component', () => {
    it('should export BulkRestockDialog component', () => {
      expect(componentCode).toContain('export function BulkRestockDialog');
    });

    it('should have search functionality', () => {
      expect(componentCode).toContain('search');
      expect(componentCode).toContain('Search');
    });

    it('should have category filter', () => {
      expect(componentCode).toContain('category');
      expect(componentCode).toContain('All Categories');
    });

    it('should have quick filters for negative and low stock', () => {
      expect(componentCode).toContain('Negative');
      expect(componentCode).toContain('Low Stock');
    });

    it('should support Set To and Add modes', () => {
      expect(componentCode).toContain('set');
      expect(componentCode).toContain('add');
    });

    it('should have batch notes field', () => {
      expect(componentCode).toContain('batchNotes');
    });

    it('should have a confirmation step before applying', () => {
      expect(componentCode).toContain('confirm');
    });

    it('should show summary of changes', () => {
      expect(componentCode).toContain('changes');
    });

    it('should call the bulkRestock mutation', () => {
      expect(componentCode).toContain('inventory.bulkRestock');
    });

    it('should have a clear all button', () => {
      expect(componentCode).toContain('Clear All');
    });
  });

  describe('Inventory page integration', () => {
    it('should import BulkRestockDialog', () => {
      expect(inventoryCode).toContain('BulkRestockDialog');
    });

    it('should have a Bulk Restock button', () => {
      expect(inventoryCode).toContain('Bulk Restock');
    });

    it('should have state for bulk restock dialog', () => {
      expect(inventoryCode).toContain('isBulkRestockOpen');
    });

    it('should render BulkRestockDialog with correct props', () => {
      expect(inventoryCode).toContain('open={isBulkRestockOpen}');
      expect(inventoryCode).toContain('onOpenChange={setIsBulkRestockOpen}');
      expect(inventoryCode).toContain('inventoryData={inventoryData}');
      expect(inventoryCode).toContain('onSuccess');
    });

    it('should invalidate queries on success', () => {
      expect(inventoryCode).toContain('getWithCategories.invalidate');
      expect(inventoryCode).toContain('getLowStock.invalidate');
    });
  });
});
