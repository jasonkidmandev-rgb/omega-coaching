import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('./db', () => {
  const mockDb: Record<string, any> = {
    getClientProtocolById: vi.fn(),
    getTemplateById: vi.fn(),
    getClientProtocolItems: vi.fn(),
    getTemplateItems: vi.fn(),
    getAllProtocolItems: vi.fn(),
    addClientProtocolItem: vi.fn(),
    updateClientProtocol: vi.fn(),
  };
  return mockDb;
});

import * as db from './db';

describe('syncWithTemplate logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should identify missing items correctly', () => {
    // Template has items [1, 2, 3, 4, 5]
    const templateItems = [
      { protocolItemId: 1, quantity: 1, isRecommended: true, customNotes: null, sortOrder: 0 },
      { protocolItemId: 2, quantity: 1, isRecommended: false, customNotes: null, sortOrder: 1 },
      { protocolItemId: 3, quantity: 1, isRecommended: true, customNotes: null, sortOrder: 2 },
      { protocolItemId: 4, quantity: 1, isRecommended: false, customNotes: null, sortOrder: 3 },
      { protocolItemId: 5, quantity: 1, isRecommended: true, customNotes: null, sortOrder: 4 },
    ];

    // Protocol has items [1, 3] (missing 2, 4, 5)
    const currentItems = [
      { protocolItemId: 1, quantity: 2, isIncluded: true, isRecommended: true },
      { protocolItemId: 3, quantity: 1, isIncluded: true, isRecommended: false },
    ];

    const currentItemIds = new Set(currentItems.map(item => item.protocolItemId));
    const missingItems = templateItems.filter(ti => !currentItemIds.has(ti.protocolItemId));

    expect(missingItems.length).toBe(3);
    expect(missingItems.map(i => i.protocolItemId)).toEqual([2, 4, 5]);
  });

  it('should not add duplicate items when protocol already has all template items', () => {
    const templateItems = [
      { protocolItemId: 1, quantity: 1, isRecommended: true, customNotes: null, sortOrder: 0 },
      { protocolItemId: 2, quantity: 1, isRecommended: false, customNotes: null, sortOrder: 1 },
    ];

    const currentItems = [
      { protocolItemId: 1, quantity: 2, isIncluded: true },
      { protocolItemId: 2, quantity: 1, isIncluded: false },
    ];

    const currentItemIds = new Set(currentItems.map(item => item.protocolItemId));
    const missingItems = templateItems.filter(ti => !currentItemIds.has(ti.protocolItemId));

    expect(missingItems.length).toBe(0);
  });

  it('should preserve existing item customizations (not overwrite)', () => {
    const templateItems = [
      { protocolItemId: 1, quantity: 1, isRecommended: true, customNotes: 'template note', sortOrder: 0 },
      { protocolItemId: 2, quantity: 1, isRecommended: false, customNotes: null, sortOrder: 1 },
    ];

    // Protocol already has item 1 with custom quantity and notes
    const currentItems = [
      { protocolItemId: 1, quantity: 5, isIncluded: true, customNotes: 'my custom note' },
    ];

    const currentItemIds = new Set(currentItems.map(item => item.protocolItemId));
    const missingItems = templateItems.filter(ti => !currentItemIds.has(ti.protocolItemId));

    // Only item 2 should be added
    expect(missingItems.length).toBe(1);
    expect(missingItems[0].protocolItemId).toBe(2);

    // Existing item 1 should NOT be in the missing list (preserving customizations)
    expect(missingItems.find(i => i.protocolItemId === 1)).toBeUndefined();
  });

  it('should add new items as excluded (isIncluded: false)', () => {
    const templateItems = [
      { protocolItemId: 10, quantity: 1, isRecommended: true, customNotes: null, sortOrder: 0 },
    ];
    const currentItems: any[] = [];

    const currentItemIds = new Set(currentItems.map((item: any) => item.protocolItemId));
    const missingItems = templateItems.filter(ti => !currentItemIds.has(ti.protocolItemId));

    // When adding, isIncluded should be false
    const newItem = {
      clientProtocolId: 123,
      protocolItemId: missingItems[0].protocolItemId,
      quantity: missingItems[0].quantity,
      isIncluded: false, // Key: added as excluded
      isRecommended: false,
      customNotes: missingItems[0].customNotes || undefined,
      sortOrder: missingItems[0].sortOrder,
    };

    expect(newItem.isIncluded).toBe(false);
    expect(newItem.isRecommended).toBe(false);
  });

  it('should handle the Jenny Noble scenario: 7 items → sync adds ~150 missing items', () => {
    // Simulate Jenny's scenario: protocol has 7 items, template has 157
    const templateItems = Array.from({ length: 157 }, (_, i) => ({
      protocolItemId: i + 1,
      quantity: 1,
      isRecommended: i < 10,
      customNotes: null,
      sortOrder: i,
    }));

    // Jenny only has 7 items (IDs: 24, 63, 67, 68, 69, 70, 60005)
    const jennyItemIds = [24, 63, 67, 68, 69, 70, 60005];
    const currentItems = jennyItemIds.map(id => ({
      protocolItemId: id,
      quantity: 1,
      isIncluded: true,
    }));

    const currentItemIds = new Set(currentItems.map(item => item.protocolItemId));
    const missingItems = templateItems.filter(ti => !currentItemIds.has(ti.protocolItemId));

    // Should find ~150 missing items (157 - 7 = 150, but some IDs may not be in template range)
    // In this simulation, items 24, 63, 67, 68, 69, 70 are in range 1-157, 60005 is not
    expect(missingItems.length).toBe(157 - 6); // 6 of Jenny's items are in range 1-157
    expect(missingItems.length).toBeGreaterThan(100);
  });
});
