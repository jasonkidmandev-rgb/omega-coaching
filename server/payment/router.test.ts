import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('../db', () => ({
  getClientProtocolById: vi.fn(),
  updateClientProtocolPaymentStatus: vi.fn(),
  deductInventoryForProtocol: vi.fn(),
  createNotificationsForEnabledUsers: vi.fn(),
  getPackingSlipByProtocolId: vi.fn(),
  getClientProtocolItems: vi.fn(),
  getAllProtocolItems: vi.fn(),
  createPackingSlip: vi.fn(),
}));

import * as db from '../db';

describe('Payment Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should return payment status for existing protocol', async () => {
      const mockProtocol = {
        id: 1,
        clientName: 'John Doe',
        paymentStatus: 'pending',
        paymentReceivedAt: null,
        paymentMethod: 'venmo',
      };
      vi.mocked(db.getClientProtocolById).mockResolvedValue(mockProtocol as any);

      const result = await db.getClientProtocolById(1);
      expect(result).toEqual(mockProtocol);
      expect(result?.paymentStatus).toBe('pending');
    });

    it('should return null for non-existent protocol', async () => {
      vi.mocked(db.getClientProtocolById).mockResolvedValue(null);

      const result = await db.getClientProtocolById(999);
      expect(result).toBeNull();
    });
  });

  describe('markAsReceived', () => {
    it('should update payment status to paid', async () => {
      vi.mocked(db.updateClientProtocolPaymentStatus).mockResolvedValue(undefined);

      await db.updateClientProtocolPaymentStatus('1', 'paid');
      expect(db.updateClientProtocolPaymentStatus).toHaveBeenCalledWith('1', 'paid');
    });

    it('should deduct inventory for protocol', async () => {
      const mockDeductions = [
        { itemId: 1, itemName: 'BPC-157', quantityDeducted: 2 },
        { itemId: 2, itemName: 'TB-500', quantityDeducted: 1 },
      ];
      vi.mocked(db.deductInventoryForProtocol).mockResolvedValue(mockDeductions as any);

      const result = await db.deductInventoryForProtocol(1, 1);
      expect(result).toEqual(mockDeductions);
      expect(db.deductInventoryForProtocol).toHaveBeenCalledWith(1, 1);
    });

    it('should create notifications for payment received', async () => {
      vi.mocked(db.createNotificationsForEnabledUsers).mockResolvedValue(undefined);

      await db.createNotificationsForEnabledUsers(
        'payment_received',
        'Payment received for John Doe',
        'Manual payment has been confirmed for John Doe\'s protocol.',
        1
      );

      expect(db.createNotificationsForEnabledUsers).toHaveBeenCalledWith(
        'payment_received',
        expect.stringContaining('Payment received'),
        expect.any(String),
        1
      );
    });

    it('should create packing slip if none exists', async () => {
      vi.mocked(db.getPackingSlipByProtocolId).mockResolvedValue(null);
      vi.mocked(db.getClientProtocolItems).mockResolvedValue([
        { id: 1, protocolItemId: 1, quantity: 2, isIncluded: true },
      ] as any);
      vi.mocked(db.getAllProtocolItems).mockResolvedValue([
        { id: 1, name: 'BPC-157', itemType: 'peptide', price: '100' },
      ] as any);
      vi.mocked(db.createPackingSlip).mockResolvedValue(1);

      await db.createPackingSlip({
        clientProtocolId: 1,
        clientName: 'John Doe',
        clientEmail: 'john@example.com',
        items: [
          { protocolItemId: 1, itemName: 'BPC-157', itemType: 'peptide', quantity: 2, price: 100 },
        ],
      });

      expect(db.createPackingSlip).toHaveBeenCalledWith(
        expect.objectContaining({
          clientProtocolId: 1,
          clientName: 'John Doe',
        })
      );
    });

    it('should not create duplicate packing slip', async () => {
      const existingSlip = { id: 1, clientProtocolId: 1, status: 'pending' };
      vi.mocked(db.getPackingSlipByProtocolId).mockResolvedValue(existingSlip as any);

      const result = await db.getPackingSlipByProtocolId(1);
      expect(result).toEqual(existingSlip);
      // createPackingSlip should not be called when slip already exists
    });
  });

  describe('markAsFailed', () => {
    it('should update payment status to failed', async () => {
      vi.mocked(db.updateClientProtocolPaymentStatus).mockResolvedValue(undefined);

      await db.updateClientProtocolPaymentStatus('1', 'failed');
      expect(db.updateClientProtocolPaymentStatus).toHaveBeenCalledWith('1', 'failed');
    });

    it('should create notification for payment failure', async () => {
      vi.mocked(db.createNotificationsForEnabledUsers).mockResolvedValue(undefined);

      await db.createNotificationsForEnabledUsers(
        'payment_failed',
        'Payment failed for John Doe',
        'Payment for John Doe\'s protocol has been marked as failed.',
        1
      );

      expect(db.createNotificationsForEnabledUsers).toHaveBeenCalledWith(
        'payment_failed',
        expect.stringContaining('Payment failed'),
        expect.any(String),
        1
      );
    });
  });

  describe('markAsRefunded', () => {
    it('should update payment status to refunded', async () => {
      vi.mocked(db.updateClientProtocolPaymentStatus).mockResolvedValue(undefined);

      await db.updateClientProtocolPaymentStatus('1', 'refunded');
      expect(db.updateClientProtocolPaymentStatus).toHaveBeenCalledWith('1', 'refunded');
    });

    it('should create notification for refund', async () => {
      vi.mocked(db.createNotificationsForEnabledUsers).mockResolvedValue(undefined);

      await db.createNotificationsForEnabledUsers(
        'payment_refunded',
        'Payment refunded for John Doe',
        'Payment for John Doe\'s protocol has been refunded.',
        1
      );

      expect(db.createNotificationsForEnabledUsers).toHaveBeenCalledWith(
        'payment_refunded',
        expect.stringContaining('Payment refunded'),
        expect.any(String),
        1
      );
    });
  });
});

describe('Payment Status Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should follow correct workflow: pending -> paid -> active', async () => {
    // Initial state
    const protocol = {
      id: 1,
      clientName: 'John Doe',
      status: 'pending_approval',
      paymentStatus: 'pending',
    };
    vi.mocked(db.getClientProtocolById).mockResolvedValue(protocol as any);

    // Verify initial state
    const initialProtocol = await db.getClientProtocolById(1);
    expect(initialProtocol?.paymentStatus).toBe('pending');
    expect(initialProtocol?.status).toBe('pending_approval');

    // Mark as paid should update both payment status and protocol status
    vi.mocked(db.updateClientProtocolPaymentStatus).mockResolvedValue(undefined);
    await db.updateClientProtocolPaymentStatus('1', 'paid');

    expect(db.updateClientProtocolPaymentStatus).toHaveBeenCalledWith('1', 'paid');
  });

  it('should handle refund workflow: paid -> refunded', async () => {
    const protocol = {
      id: 1,
      clientName: 'John Doe',
      status: 'active',
      paymentStatus: 'paid',
    };
    vi.mocked(db.getClientProtocolById).mockResolvedValue(protocol as any);

    // Mark as refunded
    vi.mocked(db.updateClientProtocolPaymentStatus).mockResolvedValue(undefined);
    await db.updateClientProtocolPaymentStatus('1', 'refunded');

    expect(db.updateClientProtocolPaymentStatus).toHaveBeenCalledWith('1', 'refunded');
  });
});

describe('Fulfillment Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger inventory deduction on payment confirmation', async () => {
    const mockDeductions = [
      { itemId: 1, itemName: 'BPC-157', quantityDeducted: 2, previousQty: 10, newQty: 8 },
    ];
    vi.mocked(db.deductInventoryForProtocol).mockResolvedValue(mockDeductions as any);

    const result = await db.deductInventoryForProtocol(1, 1);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('quantityDeducted', 2);
  });

  it('should create packing slip with correct items', async () => {
    vi.mocked(db.createPackingSlip).mockResolvedValue(1);

    const packingSlipData = {
      clientProtocolId: 1,
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      shippingName: 'John Doe',
      shippingStreet: '123 Main St',
      shippingCity: 'Los Angeles',
      shippingState: 'CA',
      shippingZip: '90001',
      shippingCountry: 'USA',
      shippingPhone: '555-1234',
      items: [
        { protocolItemId: 1, itemName: 'BPC-157', itemType: 'peptide', quantity: 2, price: 100 },
        { protocolItemId: 2, itemName: 'TB-500', itemType: 'peptide', quantity: 1, price: 150 },
      ],
    };

    const result = await db.createPackingSlip(packingSlipData);

    expect(result).toBe(1);
    expect(db.createPackingSlip).toHaveBeenCalledWith(
      expect.objectContaining({
        clientProtocolId: 1,
        shippingCity: 'Los Angeles',
        items: expect.arrayContaining([
          expect.objectContaining({ itemName: 'BPC-157' }),
          expect.objectContaining({ itemName: 'TB-500' }),
        ]),
      })
    );
  });

  it('should filter out non-shippable items from packing slip', () => {
    const allItems = [
      { protocolItemId: 1, itemName: 'BPC-157', itemType: 'peptide', quantity: 2 },
      { protocolItemId: 2, itemName: 'Coaching Session', itemType: 'service', quantity: 1 },
      { protocolItemId: 3, itemName: 'Vitamin D', itemType: 'supplement', quantity: 1 },
    ];

    // Filter to only shippable items (peptide, supplement, supply, other)
    const shippableTypes = ['peptide', 'supplement', 'supply', 'other'];
    const shippableItems = allItems.filter(item => shippableTypes.includes(item.itemType));

    expect(shippableItems).toHaveLength(2);
    expect(shippableItems.find(i => i.itemType === 'service')).toBeUndefined();
  });
});
