import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import { inventoryCategories, categories } from '../drizzle/schema';

describe('Category UI Enhancements', () => {
  describe('Schema - iconUrl field', () => {
    it('should have iconUrl field in categories table', () => {
      // Verify the iconUrl field exists in the categories schema
      const categoryColumns = Object.keys(categories);
      expect(categoryColumns).toContain('iconUrl');
    });

    it('should have iconUrl field in inventoryCategories table', () => {
      // Verify the iconUrl field exists in the inventoryCategories schema
      const inventoryCategoryColumns = Object.keys(inventoryCategories);
      expect(inventoryCategoryColumns).toContain('iconUrl');
    });
  });

  describe('Upload Router', () => {
    it('should have upload router in appRouter', () => {
      // Verify the upload router exists
      expect(appRouter._def.procedures).toHaveProperty('upload.uploadImage');
    });

    it('should have uploadImage as a mutation', () => {
      // Verify it's a mutation endpoint
      const procedure = appRouter._def.procedures['upload.uploadImage'];
      expect(procedure).toBeDefined();
      expect(procedure._def.type).toBe('mutation');
    });
  });

  describe('Category Router - iconUrl support', () => {
    it('should have category.create endpoint', () => {
      expect(appRouter._def.procedures).toHaveProperty('category.create');
    });

    it('should have category.update endpoint', () => {
      expect(appRouter._def.procedures).toHaveProperty('category.update');
    });

    it('should have category.list endpoint', () => {
      expect(appRouter._def.procedures).toHaveProperty('category.list');
    });
  });

  describe('Inventory Category Schema', () => {
    it('should have description field in inventoryCategories', () => {
      const columns = Object.keys(inventoryCategories);
      expect(columns).toContain('description');
    });

    it('should have sortOrder field in inventoryCategories', () => {
      const columns = Object.keys(inventoryCategories);
      expect(columns).toContain('sortOrder');
    });
  });
});
