import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Inventory Unmapped Items Warning', () => {
  it('previewInventoryDeductions should track unmapped items', () => {
    const dbCode = fs.readFileSync(path.join(__dirname, 'db.ts'), 'utf-8');
    const funcStart = dbCode.indexOf('export async function previewInventoryDeductions');
    const funcEnd = dbCode.indexOf('\n\n', funcStart + 100);
    const funcBody = dbCode.substring(funcStart, funcEnd);
    
    // Should track unmapped items
    expect(funcBody).toContain('unmappedItems');
    expect(funcBody).toContain('protocolItemName');
    expect(funcBody).toContain('protocolItemId');
    expect(funcBody).toContain('totalUnmappedItems');
    expect(funcBody).toContain('hasUnmappedItems');
  });

  it('should return unmappedItems array in preview result', () => {
    const dbCode = fs.readFileSync(path.join(__dirname, 'db.ts'), 'utf-8');
    const funcStart = dbCode.indexOf('export async function previewInventoryDeductions');
    const funcEnd = dbCode.indexOf('\n\n', funcStart + 100);
    const funcBody = dbCode.substring(funcStart, funcEnd);
    
    // Return object should include unmapped items data
    expect(funcBody).toContain('unmappedItems,');
    expect(funcBody).toContain('totalUnmappedItems: unmappedItems.length');
    expect(funcBody).toContain('hasUnmappedItems: unmappedItems.length > 0');
  });

  it('PricingTab should display unmapped items warning', () => {
    const pricingTab = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'pages', 'admin', 'client-edit', 'PricingTab.tsx'),
      'utf-8'
    );
    
    expect(pricingTab).toContain('Unmapped Item');
    expect(pricingTab).toContain('unmappedItems');
    expect(pricingTab).toContain('NOT mapped to inventory');
    expect(pricingTab).toContain('Inventory → Mapping');
  });
});

describe('Rich Text Custom Notes', () => {
  it('EditItemDialog (protocol) should use RichTextEditor instead of Textarea for customNotes', () => {
    const editDialog = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'pages', 'admin', 'client-edit', 'EditItemDialog.tsx'),
      'utf-8'
    );
    
    expect(editDialog).toContain('RichTextEditor');
    expect(editDialog).toContain('customNotes');
    // Should NOT use plain Textarea for customNotes
    expect(editDialog).not.toContain('<Textarea');
  });

  it('ProtocolsTab should use RichTextEditor for customNotes', () => {
    const protocolsTab = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'pages', 'admin', 'client-edit', 'ProtocolsTab.tsx'),
      'utf-8'
    );
    
    expect(protocolsTab).toContain("import RichTextEditor from");
    // The customNotes field should use RichTextEditor
    expect(protocolsTab).toContain('content={editItemData.customNotes}');
  });

  it('Inventory EditItemDialog should use RichTextEditor for notes', () => {
    const editDialog = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'pages', 'admin', 'inventory', 'EditItemDialog.tsx'),
      'utf-8'
    );
    
    expect(editDialog).toContain('RichTextEditor');
    expect(editDialog).not.toContain('<Textarea');
  });

  it('Inventory AddItemDialog should use RichTextEditor for notes', () => {
    const addDialog = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'pages', 'admin', 'inventory', 'AddItemDialog.tsx'),
      'utf-8'
    );
    
    expect(addDialog).toContain('RichTextEditor');
    expect(addDialog).not.toContain('<Textarea');
  });

  it('Client Protocol page should render customNotes as HTML', () => {
    const protocolPage = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'pages', 'client', 'Protocol.tsx'),
      'utf-8'
    );
    
    expect(protocolPage).toContain('dangerouslySetInnerHTML');
    expect(protocolPage).toContain('customNotes');
  });

  it('Inventory page should render notes as HTML', () => {
    const inventoryPage = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'pages', 'admin', 'Inventory.tsx'),
      'utf-8'
    );
    
    expect(inventoryPage).toContain('dangerouslySetInnerHTML');
    expect(inventoryPage).toContain('item.notes');
  });
});
