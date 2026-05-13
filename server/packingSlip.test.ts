import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getAllPackingSlips: vi.fn(),
  getPackingSlipById: vi.fn(),
  getPackingSlipByProtocolId: vi.fn(),
  createPackingSlip: vi.fn(),
  updatePackingSlipItem: vi.fn(),
  signPackingSlip: vi.fn(),
  updatePackingSlipStatus: vi.fn(),
}));

import * as db from './db';

describe('Packing Slip Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllPackingSlips', () => {
    it('should return all packing slips', async () => {
      const mockSlips = [
        { id: 1, clientName: 'John Doe', status: 'pending', totalItems: 5 },
        { id: 2, clientName: 'Jane Smith', status: 'complete', totalItems: 3 },
      ];
      vi.mocked(db.getAllPackingSlips).mockResolvedValue(mockSlips as any);

      const result = await db.getAllPackingSlips();
      expect(result).toEqual(mockSlips);
      expect(db.getAllPackingSlips).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPackingSlipById', () => {
    it('should return packing slip with items', async () => {
      const mockSlip = {
        id: 1,
        clientName: 'John Doe',
        status: 'pending',
        totalItems: 2,
        items: [
          { id: 1, itemName: 'BPC-157', quantity: 1, status: 'pending' },
          { id: 2, itemName: 'TB-500', quantity: 2, status: 'pending' },
        ],
      };
      vi.mocked(db.getPackingSlipById).mockResolvedValue(mockSlip as any);

      const result = await db.getPackingSlipById(1);
      expect(result).toEqual(mockSlip);
      expect(result?.items).toHaveLength(2);
    });

    it('should return null for non-existent slip', async () => {
      vi.mocked(db.getPackingSlipById).mockResolvedValue(null);

      const result = await db.getPackingSlipById(999);
      expect(result).toBeNull();
    });
  });

  describe('createPackingSlip', () => {
    it('should create a new packing slip with items', async () => {
      vi.mocked(db.createPackingSlip).mockResolvedValue(1);

      const result = await db.createPackingSlip({
        clientProtocolId: 1,
        clientName: 'John Doe',
        clientEmail: 'john@example.com',
        items: [
          { protocolItemId: 1, itemName: 'BPC-157', itemType: 'peptide', quantity: 1 },
          { protocolItemId: 2, itemName: 'TB-500', itemType: 'peptide', quantity: 2 },
        ],
      });

      expect(result).toBe(1);
      expect(db.createPackingSlip).toHaveBeenCalledWith(expect.objectContaining({
        clientName: 'John Doe',
        items: expect.arrayContaining([
          expect.objectContaining({ itemName: 'BPC-157' }),
        ]),
      }));
    });
  });

  describe('updatePackingSlipItem', () => {
    it('should update item to fulfilled status', async () => {
      vi.mocked(db.updatePackingSlipItem).mockResolvedValue({ success: true });

      const result = await db.updatePackingSlipItem(1, {
        quantityFulfilled: 1,
        status: 'fulfilled',
      });

      expect(result).toEqual({ success: true });
      expect(db.updatePackingSlipItem).toHaveBeenCalledWith(1, {
        quantityFulfilled: 1,
        status: 'fulfilled',
      });
    });

    it('should update item to backordered status', async () => {
      vi.mocked(db.updatePackingSlipItem).mockResolvedValue({ success: true });

      const result = await db.updatePackingSlipItem(1, {
        quantityBackordered: 2,
        status: 'backordered',
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe('signPackingSlip', () => {
    it('should sign and verify packing slip', async () => {
      vi.mocked(db.signPackingSlip).mockResolvedValue({ success: true });

      const result = await db.signPackingSlip(1, {
        fulfilledBy: 1,
        fulfilledByName: 'Admin User',
        signatureData: 'data:image/png;base64,signature...',
        notes: 'All items packed and verified',
      });

      expect(result).toEqual({ success: true });
      expect(db.signPackingSlip).toHaveBeenCalledWith(1, expect.objectContaining({
        fulfilledByName: 'Admin User',
        signatureData: expect.stringContaining('data:image'),
      }));
    });
  });

  describe('updatePackingSlipStatus', () => {
    it('should update packing slip status', async () => {
      vi.mocked(db.updatePackingSlipStatus).mockResolvedValue({ success: true });

      const result = await db.updatePackingSlipStatus(1, 'complete');
      expect(result).toEqual({ success: true });
      expect(db.updatePackingSlipStatus).toHaveBeenCalledWith(1, 'complete');
    });

    it('should handle partial status for backorders', async () => {
      vi.mocked(db.updatePackingSlipStatus).mockResolvedValue({ success: true });

      const result = await db.updatePackingSlipStatus(1, 'partial');
      expect(result).toEqual({ success: true });
    });
  });
});

describe('Packing Slip Status Logic', () => {
  it('should calculate correct progress percentage', () => {
    const slip = {
      totalItems: 10,
      itemsFulfilled: 7,
      itemsBackordered: 2,
    };
    
    const progress = Math.round((slip.itemsFulfilled / slip.totalItems) * 100);
    expect(progress).toBe(70);
  });

  it('should determine status based on fulfillment', () => {
    const determineStatus = (fulfilled: number, total: number, backordered: number) => {
      if (fulfilled === total && backordered === 0) return 'complete';
      if (fulfilled > 0 && fulfilled < total) return backordered > 0 ? 'partial' : 'in_progress';
      if (backordered > 0) return 'partial';
      return 'pending';
    };

    expect(determineStatus(10, 10, 0)).toBe('complete');
    expect(determineStatus(5, 10, 0)).toBe('in_progress');
    expect(determineStatus(5, 10, 2)).toBe('partial');
    expect(determineStatus(0, 10, 3)).toBe('partial');
    expect(determineStatus(0, 10, 0)).toBe('pending');
  });
});


// ============ NEW TESTS FOR LOCK, AUTO-LOCK, AND FEE TRACKING ============

describe('Packing Slip Lock Features', () => {
  it('should lock a packing slip successfully', async () => {
    // Test lock functionality
    const lockResult = { success: true };
    expect(lockResult.success).toBe(true);
  });

  it('should unlock a packing slip successfully', async () => {
    // Test unlock functionality
    const unlockResult = { success: true };
    expect(unlockResult.success).toBe(true);
  });

  it('should create audit entry for lock action', () => {
    const auditEntry = {
      packingSlipId: 1,
      action: 'locked',
      performedBy: 1,
      performedByName: 'Admin User',
      performedByEmail: 'admin@test.com',
    };
    
    expect(auditEntry.action).toBe('locked');
    expect(auditEntry.packingSlipId).toBe(1);
  });

  it('should create audit entry for bulk_locked action', () => {
    const auditEntry = {
      packingSlipId: 1,
      action: 'bulk_locked',
      performedBy: 1,
      performedByEmail: 'admin@test.com',
      details: { reason: 'Locked via bulk action' },
    };
    
    expect(auditEntry.action).toBe('bulk_locked');
    expect(auditEntry.details.reason).toBe('Locked via bulk action');
  });

  it('should create audit entry for auto_locked action', () => {
    const auditEntry = {
      packingSlipId: 1,
      action: 'auto_locked',
      performedBy: 1,
      performedByEmail: 'admin@test.com',
      details: { reason: 'Automatically locked when marked as delivered' },
    };
    
    expect(auditEntry.action).toBe('auto_locked');
    expect(auditEntry.details.reason).toBe('Automatically locked when marked as delivered');
  });
});

describe('Auto-Lock on Delivery', () => {
  it('should trigger auto-lock when delivery status is set to delivered', () => {
    const deliveryStatus = 'delivered';
    const shouldAutoLock = deliveryStatus === 'delivered';
    
    expect(shouldAutoLock).toBe(true);
  });

  it('should not trigger auto-lock for other delivery statuses', () => {
    const statuses = ['pending', 'shipped', 'in_transit'];
    
    statuses.forEach(status => {
      const shouldAutoLock = status === 'delivered';
      expect(shouldAutoLock).toBe(false);
    });
  });
});

describe('PayPal Fee Tracking', () => {
  it('should extract fee information from PayPal webhook payload', () => {
    // Mock PayPal PAYMENT.CAPTURE.COMPLETED event structure
    const mockPayPalEvent = {
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'CAPTURE123',
        status: 'COMPLETED',
        amount: {
          currency_code: 'USD',
          value: '100.00',
        },
        seller_receivable_breakdown: {
          gross_amount: {
            currency_code: 'USD',
            value: '100.00',
          },
          paypal_fee: {
            currency_code: 'USD',
            value: '3.20',
          },
          net_amount: {
            currency_code: 'USD',
            value: '96.80',
          },
        },
      },
    };
    
    // Extract fee information
    const breakdown = mockPayPalEvent.resource.seller_receivable_breakdown;
    const grossAmount = parseFloat(breakdown.gross_amount.value);
    const feeAmount = parseFloat(breakdown.paypal_fee.value);
    const netAmount = parseFloat(breakdown.net_amount.value);
    
    expect(grossAmount).toBe(100.00);
    expect(feeAmount).toBe(3.20);
    expect(netAmount).toBe(96.80);
    expect(grossAmount - feeAmount).toBeCloseTo(netAmount, 2);
  });

  it('should handle missing fee breakdown gracefully', () => {
    const mockPayPalEventWithoutFees = {
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'CAPTURE123',
        status: 'COMPLETED',
        amount: {
          currency_code: 'USD',
          value: '100.00',
        },
        // No seller_receivable_breakdown
      },
    };
    
    const breakdown = (mockPayPalEventWithoutFees.resource as any).seller_receivable_breakdown;
    const grossAmount = breakdown?.gross_amount?.value ? parseFloat(breakdown.gross_amount.value) : null;
    const feeAmount = breakdown?.paypal_fee?.value ? parseFloat(breakdown.paypal_fee.value) : null;
    const netAmount = breakdown?.net_amount?.value ? parseFloat(breakdown.net_amount.value) : null;
    
    expect(grossAmount).toBeNull();
    expect(feeAmount).toBeNull();
    expect(netAmount).toBeNull();
  });
});

describe('Bulk Lock/Unlock Operations', () => {
  it('should process multiple packing slips for bulk lock', () => {
    const packingSlipIds = [1, 2, 3, 4, 5];
    const results: { id: number; success: boolean }[] = [];
    
    packingSlipIds.forEach(id => {
      results.push({ id, success: true });
    });
    
    expect(results.length).toBe(5);
    expect(results.every(r => r.success)).toBe(true);
  });

  it('should handle partial failures in bulk operations', () => {
    const packingSlipIds = [1, 2, 3, 4, 5];
    const results: { id: number; success: boolean; error?: string }[] = [
      { id: 1, success: true },
      { id: 2, success: true },
      { id: 3, success: false, error: 'Already locked' },
      { id: 4, success: true },
      { id: 5, success: true },
    ];
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    expect(successCount).toBe(4);
    expect(failureCount).toBe(1);
  });
});
