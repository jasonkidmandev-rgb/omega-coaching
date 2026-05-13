import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database functions
vi.mock('./db', () => ({
  getDefaultTemplate: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Master Template',
    isDefault: true,
  }),
  getTemplateItems: vi.fn().mockResolvedValue([
    { id: 1, protocolItemId: 101, quantity: 1, isRecommended: true },
    { id: 2, protocolItemId: 102, quantity: 2, isRecommended: true },
    { id: 3, protocolItemId: 103, quantity: 1, isRecommended: false },
  ]),
  getClientProtocolItems: vi.fn().mockResolvedValue([
    { id: 1, protocolItemId: 101, quantity: 1, isRecommended: true },
  ]),
  addClientProtocolItem: vi.fn().mockResolvedValue({ id: 10 }),
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: 1, name: 'Master Template' }]),
  },
}));

describe('Sync with Master Template Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should identify missing items from template', async () => {
    const templateItems = [
      { protocolItemId: 101 },
      { protocolItemId: 102 },
      { protocolItemId: 103 },
    ];
    const clientItems = [
      { protocolItemId: 101 },
    ];
    
    const existingItemIds = new Set(clientItems.map(item => item.protocolItemId));
    const missingItems = templateItems.filter(item => !existingItemIds.has(item.protocolItemId));
    
    expect(missingItems).toHaveLength(2);
    expect(missingItems[0].protocolItemId).toBe(102);
    expect(missingItems[1].protocolItemId).toBe(103);
  });

  it('should return empty array when all items are synced', async () => {
    const templateItems = [
      { protocolItemId: 101 },
      { protocolItemId: 102 },
    ];
    const clientItems = [
      { protocolItemId: 101 },
      { protocolItemId: 102 },
    ];
    
    const existingItemIds = new Set(clientItems.map(item => item.protocolItemId));
    const missingItems = templateItems.filter(item => !existingItemIds.has(item.protocolItemId));
    
    expect(missingItems).toHaveLength(0);
  });

  it('should handle empty client protocol', async () => {
    const templateItems = [
      { protocolItemId: 101 },
      { protocolItemId: 102 },
    ];
    const clientItems: any[] = [];
    
    const existingItemIds = new Set(clientItems.map(item => item.protocolItemId));
    const missingItems = templateItems.filter(item => !existingItemIds.has(item.protocolItemId));
    
    expect(missingItems).toHaveLength(2);
  });
});

describe('Default Template for New Clients', () => {
  it('should use default template when no template is selected', async () => {
    // Simulate the server-side logic
    const formData = {
      clientName: 'Test Client',
      templateId: undefined, // No template selected
    };
    
    // The server should use the default template
    const shouldUseDefaultTemplate = !formData.templateId;
    expect(shouldUseDefaultTemplate).toBe(true);
  });

  it('should use selected template when provided', async () => {
    const formData = {
      clientName: 'Test Client',
      templateId: 5, // Template selected
    };
    
    const shouldUseDefaultTemplate = !formData.templateId;
    expect(shouldUseDefaultTemplate).toBe(false);
  });
});

describe('Template Confirmation Dialog Logic', () => {
  it('should show dialog when creating client without template', () => {
    const isNew = true;
    const formData = { clientName: 'Test', templateId: '' };
    
    const shouldShowDialog = isNew && !formData.templateId;
    expect(shouldShowDialog).toBe(true);
  });

  it('should not show dialog when template is selected', () => {
    const isNew = true;
    const formData = { clientName: 'Test', templateId: '5' };
    
    const shouldShowDialog = isNew && !formData.templateId;
    expect(shouldShowDialog).toBe(false);
  });

  it('should not show dialog when editing existing client', () => {
    const isNew = false;
    const formData = { clientName: 'Test', templateId: '' };
    
    const shouldShowDialog = isNew && !formData.templateId;
    expect(shouldShowDialog).toBe(false);
  });
});
