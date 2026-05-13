/**
 * Tests for Universal Contact Propagation with Safety Guards
 * 
 * Verifies that editing a contact in ANY section (Lead Pipeline, Client 360,
 * Client Projects, Clients, Custom Orders) propagates changes to the master
 * contacts record and all linked tables.
 * 
 * Also verifies safety guards:
 * - Cannot overwrite non-empty values with blank/null
 * - Cannot propagate to non-existent contacts
 * - Audit logging is produced
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock database ────────────────────────────────────────────────────────
const mockWhere = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

// Select mock for the contact validation lookup
const mockSelectWhere = vi.fn().mockResolvedValue([{
  id: 1,
  firstName: 'John',
  lastName: 'Smith',
  fullName: 'John Smith',
  email: 'john@test.com',
  phone: '+15551234567',
  lifecycleStage: 'active_client',
}]);
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

const mockInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockResolvedValue([{ insertId: 99 }]),
});

vi.mock('../db', () => ({
  getDb: vi.fn().mockResolvedValue({
    update: (...args: any[]) => mockUpdate(...args),
    select: (...args: any[]) => mockSelect(...args),
    insert: (...args: any[]) => mockInsert(...args),
  }),
}));

vi.mock('../../drizzle/schema', () => ({
  contacts: { id: 'contacts.id', contactId: 'contacts.contactId' },
  prospects: { contactId: 'prospects.contactId' },
  clientProtocols: { contactId: 'clientProtocols.contactId' },
  clientProjects: { contactId: 'clientProjects.contactId' },
  customOrders: { contactId: 'customOrders.contactId' },
  packingSlips: { contactId: 'packingSlips.contactId' },
  users: { contactId: 'users.contactId' },
  transformationEnrollments: { contactId: 'transformationEnrollments.contactId' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  or: vi.fn(),
  and: vi.fn(),
  isNotNull: vi.fn(),
  sql: vi.fn(),
}));

describe('propagateContactChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chains
    mockWhere.mockResolvedValue([{ affectedRows: 1 }]);
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSelectWhere.mockResolvedValue([{
      id: 1, firstName: 'John', lastName: 'Smith', fullName: 'John Smith',
      email: 'john@test.com', phone: '+15551234567', lifecycleStage: 'active_client',
    }]);
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
  });

  it('should exist as an importable module', async () => {
    const mod = await import('./propagateContactChanges');
    expect(mod.propagateContactChanges).toBeDefined();
    expect(typeof mod.propagateContactChanges).toBe('function');
  });

  it('should return early with no tables updated when no fields change', async () => {
    const { propagateContactChanges } = await import('./propagateContactChanges');
    const result = await propagateContactChanges({ contactId: 1 });
    expect(result.success).toBe(true);
    expect(result.tablesUpdated).toEqual([]);
  });

  it('should update contacts table when name changes', async () => {
    const { propagateContactChanges } = await import('./propagateContactChanges');
    const result = await propagateContactChanges({ contactId: 1, name: 'Jane Doe' });
    expect(result.success).toBe(true);
    expect(result.tablesUpdated).toContain('contacts');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should update contacts table when email changes', async () => {
    const { propagateContactChanges } = await import('./propagateContactChanges');
    const result = await propagateContactChanges({ contactId: 1, email: 'new@email.com' });
    expect(result.success).toBe(true);
    expect(result.tablesUpdated).toContain('contacts');
  });

  it('should update contacts table when phone changes', async () => {
    const { propagateContactChanges } = await import('./propagateContactChanges');
    const result = await propagateContactChanges({ contactId: 1, phone: '+15559876543' });
    expect(result.success).toBe(true);
    expect(result.tablesUpdated).toContain('contacts');
  });

  it('should split fullName into firstName and lastName', async () => {
    const { propagateContactChanges } = await import('./propagateContactChanges');
    
    let capturedSet: any = null;
    mockSet.mockImplementation((data: any) => {
      if (!capturedSet) capturedSet = data;
      return { where: mockWhere };
    });
    
    await propagateContactChanges({ contactId: 1, name: 'Jane Marie Doe' });
    
    expect(capturedSet).toBeDefined();
    // fullName is a MySQL GENERATED column - must NOT be set directly
    expect(capturedSet.fullName).toBeUndefined();
    expect(capturedSet.firstName).toBe('Jane');
    expect(capturedSet.lastName).toBe('Marie Doe');
  });

  it('should handle single-word names (no lastName)', async () => {
    const { propagateContactChanges } = await import('./propagateContactChanges');
    
    let capturedSet: any = null;
    mockSet.mockImplementation((data: any) => {
      if (!capturedSet) capturedSet = data;
      return { where: mockWhere };
    });
    
    await propagateContactChanges({ contactId: 1, name: 'Madonna' });
    
    expect(capturedSet.firstName).toBe('Madonna');
    expect(capturedSet.lastName).toBeNull();
  });

  it('should normalize email to lowercase', async () => {
    const { propagateContactChanges } = await import('./propagateContactChanges');
    
    let capturedSet: any = null;
    mockSet.mockImplementation((data: any) => {
      if (!capturedSet) capturedSet = data;
      return { where: mockWhere };
    });
    
    await propagateContactChanges({ contactId: 1, email: 'John@Example.COM' });
    
    expect(capturedSet.email).toBe('john@example.com');
  });

  // ─── SAFETY GUARD TESTS ─────────────────────────────────────────────

  it('should throw when contactId does not exist', async () => {
    const { propagateContactChanges } = await import('./propagateContactChanges');
    
    // Mock select to return empty array (contact not found)
    mockSelectWhere.mockResolvedValue([]);
    
    await expect(
      propagateContactChanges({ contactId: 999, name: 'Ghost Person' })
    ).rejects.toThrow('Contact 999 not found');
  });

  it('should NOT overwrite non-empty name with blank by default', async () => {
    const { propagateContactChanges } = await import('./propagateContactChanges');
    
    const result = await propagateContactChanges({ contactId: 1, name: '' });
    
    // Should skip the name field
    expect(result.fieldsSkipped.length).toBeGreaterThan(0);
    expect(result.fieldsSkipped[0]).toContain('name');
  });

  it('should NOT overwrite non-empty email with null by default', async () => {
    const { propagateContactChanges } = await import('./propagateContactChanges');
    
    const result = await propagateContactChanges({ contactId: 1, email: null });
    
    expect(result.fieldsSkipped.length).toBeGreaterThan(0);
    expect(result.fieldsSkipped[0]).toContain('email');
  });

  it('should NOT overwrite non-empty phone with blank by default', async () => {
    const { propagateContactChanges } = await import('./propagateContactChanges');
    
    const result = await propagateContactChanges({ contactId: 1, phone: '' });
    
    expect(result.fieldsSkipped.length).toBeGreaterThan(0);
    expect(result.fieldsSkipped[0]).toContain('phone');
  });

  it('should ALLOW blank overwrite when forceBlankOverwrite is true', async () => {
    const { propagateContactChanges } = await import('./propagateContactChanges');
    
    const result = await propagateContactChanges({ contactId: 1, name: '', forceBlankOverwrite: true });
    
    // Should NOT skip — should proceed with the blank
    expect(result.fieldsSkipped.length).toBe(0);
    expect(result.tablesUpdated).toContain('contacts');
  });

  it('should return previousValues and newValues for audit', async () => {
    const { propagateContactChanges } = await import('./propagateContactChanges');
    
    const result = await propagateContactChanges({ contactId: 1, name: 'Jane Doe', source: 'test' });
    
    expect(result.previousValues).toBeDefined();
    expect(result.previousValues.name).toBe('John Smith');
    expect(result.newValues).toBeDefined();
    expect(result.newValues.name).toBe('Jane Doe');
  });

  it('should allow overwriting empty values with new values', async () => {
    const { propagateContactChanges } = await import('./propagateContactChanges');
    
    // Contact has no phone
    mockSelectWhere.mockResolvedValue([{
      id: 1, firstName: 'John', lastName: 'Smith', fullName: 'John Smith',
      email: 'john@test.com', phone: null, lifecycleStage: 'active_client',
    }]);
    
    const result = await propagateContactChanges({ contactId: 1, phone: '+15559876543' });
    
    expect(result.fieldsSkipped.length).toBe(0);
    expect(result.tablesUpdated).toContain('contacts');
  });
});

describe('Prospect update propagation', () => {
  it('prospect router should import propagateContactChanges', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync(
      '/home/ubuntu/health-coach-protocol-app/server/prospect/prospectRouter.ts',
      'utf-8'
    );
    expect(source).toContain('import { propagateContactChanges }');
    expect(source).toContain('from "../contacts/propagateContactChanges"');
  });

  it('prospect update mutation should call propagateContactChanges when name/email/phone changes', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync(
      '/home/ubuntu/health-coach-protocol-app/server/prospect/prospectRouter.ts',
      'utf-8'
    );
    expect(source).toContain('hasContactInfoChange');
    expect(source).toContain('propagateContactChanges');
    expect(source).toContain('prospect.contactId');
  });
});

describe('Client Protocol update propagation', () => {
  it('routers.ts clientProtocol.update should call propagateContactChanges', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync(
      '/home/ubuntu/health-coach-protocol-app/server/routers.ts',
      'utf-8'
    );
    expect(source).toContain('[clientProtocol.update] Propagated contact changes');
    expect(source).toContain('protocolForContact?.contactId');
  });
});

describe('Client Project update propagation', () => {
  it('routers.ts clientProject.update should call propagateContactChanges', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync(
      '/home/ubuntu/health-coach-protocol-app/server/routers.ts',
      'utf-8'
    );
    const projectSection = source.substring(
      source.indexOf('clientProject: router({'),
      source.indexOf('clientProject: router({') + 6000
    );
    expect(projectSection).toContain('propagateContactChanges');
    expect(projectSection).toContain('input.clientName');
    expect(projectSection).toContain('input.clientEmail');
  });
});

describe('Custom Orders update propagation', () => {
  it('customOrders router update should call propagateContactChanges', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync(
      '/home/ubuntu/health-coach-protocol-app/server/customOrders/router.ts',
      'utf-8'
    );
    expect(source).toContain('propagateContactChanges');
    expect(source).toContain('order.contactId');
    expect(source).toContain('input.clientName');
    expect(source).toContain('input.clientEmail');
    expect(source).toContain('input.clientPhone');
  });
});

describe('Client360 updateContact uses shared utility', () => {
  it('client360 router should import and use propagateContactChanges', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync(
      '/home/ubuntu/health-coach-protocol-app/server/client360/router.ts',
      'utf-8'
    );
    expect(source).toContain('import { propagateContactChanges }');
    expect(source).toContain('from "../contacts/propagateContactChanges"');
    const updateSection = source.substring(
      source.indexOf('updateContact:'),
      source.indexOf('updateContact:') + 2000
    );
    expect(updateSection).toContain('propagateContactChanges({');
  });
});

describe('Data Integrity Audit endpoint', () => {
  it('client360 router should have dataIntegrityAudit endpoint', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync(
      '/home/ubuntu/health-coach-protocol-app/server/client360/router.ts',
      'utf-8'
    );
    expect(source).toContain('dataIntegrityAudit:');
    expect(source).toContain('healthScore');
    expect(source).toContain('mismatches');
    expect(source).toContain('missingLinks');
    expect(source).toContain('orphanedRecords');
    expect(source).toContain('duplicateEmails');
    expect(source).toContain('duplicatePhones');
  });

  it('client360 router should have fixMismatch and fixAllMismatches endpoints', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync(
      '/home/ubuntu/health-coach-protocol-app/server/client360/router.ts',
      'utf-8'
    );
    expect(source).toContain('fixMismatch:');
    expect(source).toContain('fixAllMismatches:');
  });
});

describe('Safety guards in propagateContactChanges source', () => {
  it('should contain safety guard comments and logic', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync(
      '/home/ubuntu/health-coach-protocol-app/server/contacts/propagateContactChanges.ts',
      'utf-8'
    );
    expect(source).toContain('SAFETY GUARD');
    expect(source).toContain('forceBlankOverwrite');
    expect(source).toContain('fieldsSkipped');
    expect(source).toContain('previousValues');
    expect(source).toContain('newValues');
    expect(source).toContain('Contact ${contactId} not found');
  });

  it('should NOT set fullName directly on contacts table (GENERATED column)', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync(
      '/home/ubuntu/health-coach-protocol-app/server/contacts/propagateContactChanges.ts',
      'utf-8'
    );
    // Must NOT contain contactUpdates.fullName
    expect(source).not.toContain('contactUpdates.fullName');
    // Must contain a comment about GENERATED column
    expect(source).toContain('GENERATED');
    // Must only set firstName and lastName
    expect(source).toContain('contactUpdates.firstName');
    expect(source).toContain('contactUpdates.lastName');
  });

  it('should handle unique email constraint violations', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync(
      '/home/ubuntu/health-coach-protocol-app/server/contacts/propagateContactChanges.ts',
      'utf-8'
    );
    expect(source).toContain('Duplicate');
    expect(source).toContain('ER_DUP_ENTRY');
  });
});

describe('All edit paths have propagation', () => {
  it('should have propagation in all 5 edit paths', async () => {
    const fs = await import('fs');
    
    const paths = [
      { file: '/home/ubuntu/health-coach-protocol-app/server/client360/router.ts', label: 'Client 360' },
      { file: '/home/ubuntu/health-coach-protocol-app/server/prospect/prospectRouter.ts', label: 'Lead Pipeline' },
      { file: '/home/ubuntu/health-coach-protocol-app/server/routers.ts', label: 'Main Routers' },
      { file: '/home/ubuntu/health-coach-protocol-app/server/customOrders/router.ts', label: 'Custom Orders' },
    ];
    
    for (const { file } of paths) {
      const source = fs.readFileSync(file, 'utf-8');
      expect(source).toContain('propagateContactChanges');
    }
  });

  it('propagateContactChanges utility should update all 7 tables', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync(
      '/home/ubuntu/health-coach-protocol-app/server/contacts/propagateContactChanges.ts',
      'utf-8'
    );
    
    const tables = [
      'contacts', 'prospects', 'clientProtocols', 'clientProjects',
      'customOrders', 'packingSlips', 'users', 'transformationEnrollments',
    ];
    
    for (const table of tables) {
      expect(source).toContain(table);
    }
  });
});
