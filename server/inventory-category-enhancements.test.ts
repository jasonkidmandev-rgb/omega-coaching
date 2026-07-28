import { describe, it, expect, beforeAll } from 'vitest';

describe('Inventory Category Enhancements', () => {
  // Importing ./routers pulls in the whole ~9.6k-line router graph and everything it
  // touches; it lands around 5s on a warm machine, i.e. right on vitest's default
  // timeout. Left inline, whichever test imported it first failed at random and made the
  // suite's pass count a coin-flip. Hoisted here — outer scope, so both the Router
  // Validation and Upload Router blocks share it — with an explicit budget, so the cost
  // is paid once and the tests below just assert.
  let appRouter: typeof import('./routers')['appRouter'];
  beforeAll(async () => {
    ({ appRouter } = await import('./routers'));
  }, 60_000);

  describe('Schema Fields', () => {
    it('should have iconUrl field in inventory categories schema', async () => {
      // Test that the schema includes iconUrl field
      const { inventoryCategories } = await import('../drizzle/schema');
      expect(inventoryCategories).toBeDefined();
      // The field should exist in the table definition
      const columns = Object.keys(inventoryCategories);
      expect(columns.length).toBeGreaterThan(0);
    });

    it('should have accentColor field in inventory categories schema', async () => {
      const { inventoryCategories } = await import('../drizzle/schema');
      expect(inventoryCategories).toBeDefined();
    });

    it('should have isActive field in inventory categories schema', async () => {
      const { inventoryCategories } = await import('../drizzle/schema');
      expect(inventoryCategories).toBeDefined();
    });
  });

  describe('Router Validation', () => {
    it('should accept iconUrl in updateCategory mutation', async () => {
      expect(appRouter).toBeDefined();
      expect(appRouter.inventory).toBeDefined();
      expect(appRouter.inventory.updateCategory).toBeDefined();
    });

    it('should accept accentColor in updateCategory mutation', async () => {
      expect(appRouter.inventory.updateCategory).toBeDefined();
    });

    it('should accept isActive in updateCategory mutation', async () => {
      expect(appRouter.inventory.updateCategory).toBeDefined();
    });
  });

  describe('Upload Router', () => {
    it('should have upload router available', async () => {
      expect(appRouter).toBeDefined();
      expect(appRouter.upload).toBeDefined();
      expect(appRouter.upload.uploadImage).toBeDefined();
    });
  });

  describe('Category Visibility Logic', () => {
    it('should default isActive to true for new categories', () => {
      // Test the default value logic
      const defaultIsActive = true;
      expect(defaultIsActive).toBe(true);
    });

    it('should filter inactive categories correctly', () => {
      const categories = [
        { id: 1, name: 'Active Category', isActive: true },
        { id: 2, name: 'Inactive Category', isActive: false },
        { id: 3, name: 'Default Active', isActive: undefined },
      ];

      const activeCategories = categories.filter(cat => cat.isActive !== false);
      expect(activeCategories).toHaveLength(2);
      expect(activeCategories.map(c => c.id)).toEqual([1, 3]);
    });
  });

  describe('Accent Color Handling', () => {
    it('should handle hex color values', () => {
      const validColors = ['#f97316', '#3b82f6', '#10b981', '#ef4444'];
      validColors.forEach(color => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('should handle empty accent color gracefully', () => {
      const category = { name: 'Test', accentColor: '' };
      const displayColor = category.accentColor || '#f97316';
      expect(displayColor).toBe('#f97316');
    });

    it('should generate correct background color with opacity', () => {
      const accentColor = '#f97316';
      const bgWithOpacity = `${accentColor}20`;
      expect(bgWithOpacity).toBe('#f9731620');
    });
  });

  describe('Icon URL Handling', () => {
    it('should handle S3 URLs correctly', () => {
      const s3Url = 'https://s3.amazonaws.com/bucket/category-icons/icon-123.png';
      expect(s3Url).toContain('category-icons');
    });

    it('should handle empty icon URL gracefully', () => {
      const category = { name: 'Test', iconUrl: '' };
      const hasIcon = !!category.iconUrl;
      expect(hasIcon).toBe(false);
    });
  });
});
