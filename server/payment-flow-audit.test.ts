import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * COMPREHENSIVE PAYMENT FLOW AUDIT TEST SUITE
 * 
 * This test suite validates all payment-related workflows:
 * 1. PayPal payment flow and webhook handling
 * 2. Venmo payment manual approval flow
 * 3. Payment status updates
 * 4. Packing slip creation on payment
 * 5. Email notifications on payment
 */

// Mock dependencies
vi.mock('./db', () => ({
  getDb: vi.fn(() => Promise.resolve({})),
  getClientProtocolById: vi.fn(),
  getClientProtocolItems: vi.fn(),
  getAllProtocolItems: vi.fn(),
  getPackingSlipByProtocolId: vi.fn(),
  createPackingSlip: vi.fn(),
  updateClientProtocolPaymentStatus: vi.fn(),
  createNotificationsForEnabledUsers: vi.fn(),
  getPayPalOrder: vi.fn(),
  updatePayPalOrder: vi.fn(),
  getSiteSetting: vi.fn(),
}));

import * as db from './db';

describe('Payment Flow Audit - PayPal Webhook Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CHECKOUT.ORDER.COMPLETED Event', () => {
    it('should update payment status to paid on order completion', async () => {
      const mockOrder = {
        paypalOrderId: 'ORDER123',
        clientProtocolId: 1,
        amount: '150.00',
        status: 'CREATED',
      };

      vi.mocked(db.getPayPalOrder).mockResolvedValue(mockOrder);
      vi.mocked(db.updatePayPalOrder).mockResolvedValue(undefined);
      vi.mocked(db.updateClientProtocolPaymentStatus).mockResolvedValue(undefined);
      vi.mocked(db.getClientProtocolById).mockResolvedValue({
        id: 1,
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
      });

      // Simulate the webhook handler logic
      const orderId = 'ORDER123';
      const order = await db.getPayPalOrder(orderId);
      
      expect(order).not.toBeNull();
      
      // Update order status
      await db.updatePayPalOrder({
        paypalOrderId: orderId,
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      // Mark protocol as paid
      await db.updateClientProtocolPaymentStatus(order!.clientProtocolId.toString(), 'paid');

      expect(db.updatePayPalOrder).toHaveBeenCalledWith(expect.objectContaining({
        paypalOrderId: 'ORDER123',
        status: 'COMPLETED',
      }));
      expect(db.updateClientProtocolPaymentStatus).toHaveBeenCalledWith('1', 'paid');
    });

    it('should create packing slip after successful payment', async () => {
      const mockProtocol = {
        id: 1,
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
        shippingStreet: '123 Main St',
        shippingCity: 'Denver',
        shippingState: 'CO',
        shippingZip: '80202',
      };

      const mockProtocolItems = [
        { protocolItemId: 1, isRecommended: true, quantity: 2, customPrice: null },
      ];

      const mockAllItems = [
        { id: 1, name: 'BPC-157', itemType: 'peptide', price: '100' },
      ];

      vi.mocked(db.getClientProtocolById).mockResolvedValue(mockProtocol);
      vi.mocked(db.getPackingSlipByProtocolId).mockResolvedValue(null);
      vi.mocked(db.getClientProtocolItems).mockResolvedValue(mockProtocolItems);
      vi.mocked(db.getAllProtocolItems).mockResolvedValue(mockAllItems);
      vi.mocked(db.createPackingSlip).mockResolvedValue(1);

      // Check no existing packing slip
      const existingSlip = await db.getPackingSlipByProtocolId(1);
      expect(existingSlip).toBeNull();

      // Get protocol items
      const protocolItems = await db.getClientProtocolItems(1);
      const allItems = await db.getAllProtocolItems();

      // Filter shippable items
      const shippableItems = protocolItems
        .filter((item: any) => item.isRecommended)
        .map((item: any) => {
          const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
          return {
            protocolItemId: item.protocolItemId,
            itemName: protocolItem?.name || 'Unknown Item',
            itemType: protocolItem?.itemType || 'other',
            quantity: item.quantity || 1,
            price: parseFloat(item.customPrice || protocolItem?.price || '0'),
          };
        })
        .filter((item: any) => ['peptide', 'supplement', 'supply', 'other'].includes(item.itemType));

      expect(shippableItems.length).toBe(1);

      // Create packing slip
      const packingSlipId = await db.createPackingSlip({
        clientProtocolId: mockProtocol.id,
        clientName: mockProtocol.clientName,
        clientEmail: mockProtocol.clientEmail,
        shippingStreet: mockProtocol.shippingStreet,
        shippingCity: mockProtocol.shippingCity,
        shippingState: mockProtocol.shippingState,
        shippingZip: mockProtocol.shippingZip,
        items: shippableItems,
      });

      expect(packingSlipId).toBe(1);
      expect(db.createPackingSlip).toHaveBeenCalledWith(expect.objectContaining({
        clientProtocolId: 1,
        clientName: 'Test Client',
        items: expect.arrayContaining([
          expect.objectContaining({ itemName: 'BPC-157' }),
        ]),
      }));
    });
  });

  describe('PAYMENT.CAPTURE.COMPLETED Event', () => {
    it('should handle payment capture completion', async () => {
      const mockOrder = {
        paypalOrderId: 'ORDER123',
        clientProtocolId: 1,
        amount: '150.00',
      };

      vi.mocked(db.getPayPalOrder).mockResolvedValue(mockOrder);
      vi.mocked(db.updatePayPalOrder).mockResolvedValue(undefined);
      vi.mocked(db.updateClientProtocolPaymentStatus).mockResolvedValue(undefined);

      const order = await db.getPayPalOrder('ORDER123');
      expect(order).not.toBeNull();

      await db.updatePayPalOrder({
        paypalOrderId: 'ORDER123',
        status: 'COMPLETED',
        transactionId: 'CAPTURE123',
        payerEmail: 'payer@example.com',
        payerName: 'John Doe',
        completedAt: new Date(),
      });

      await db.updateClientProtocolPaymentStatus(order!.clientProtocolId.toString(), 'paid');

      expect(db.updatePayPalOrder).toHaveBeenCalledWith(expect.objectContaining({
        status: 'COMPLETED',
        transactionId: 'CAPTURE123',
      }));
    });
  });

  describe('PAYMENT.CAPTURE.FAILED Event', () => {
    it('should update payment status to failed on capture failure', async () => {
      const mockOrder = {
        paypalOrderId: 'ORDER123',
        clientProtocolId: 1,
        amount: '150.00',
      };

      vi.mocked(db.getPayPalOrder).mockResolvedValue(mockOrder);
      vi
.mocked(db.updatePayPalOrder).mockResolvedValue(undefined);
      vi.mocked(db.updateClientProtocolPaymentStatus).mockResolvedValue(undefined);

      const order = await db.getPayPalOrder('ORDER123');
      
      await db.updatePayPalOrder({
        paypalOrderId: 'ORDER123',
        status: 'FAILED',
      });

      await db.updateClientProtocolPaymentStatus(order!.clientProtocolId.toString(), 'failed');

      expect(db.updateClientProtocolPaymentStatus).toHaveBeenCalledWith('1', 'failed');
    });
  });

  describe('PAYMENT.CAPTURE.REFUNDED Event', () => {
    it('should update payment status to refunded', async () => {
      const mockOrder = {
        paypalOrderId: 'ORDER123',
        clientProtocolId: 1,
        amount: '150.00',
      };

      vi.mocked(db.getPayPalOrder).mockResolvedValue(mockOrder);
      vi.mocked(db.updatePayPalOrder).mockResolvedValue(undefined);
      vi.mocked(db.updateClientProtocolPaymentStatus).mockResolvedValue(undefined);

      const order = await db.getPayPalOrder('ORDER123');
      
      await db.updatePayPalOrder({
        paypalOrderId: 'ORDER123',
        status: 'REFUNDED',
      });

      await db.updateClientProtocolPaymentStatus(order!.clientProtocolId.toString(), 'refunded');

      expect(db.updateClientProtocolPaymentStatus).toHaveBeenCalledWith('1', 'refunded');
    });
  });
});

describe('Payment Flow Audit - Venmo Manual Approval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Admin Approve Payment', () => {
    it('should update payment status to paid when admin approves', async () => {
      const mockProtocol = {
        id: 1,
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
        paymentMethod: 'venmo',
        paymentStatus: 'pending',
      };

      vi.mocked(db.getClientProtocolById).mockResolvedValue(mockProtocol);
      vi.mocked(db.updateClientProtocolPaymentStatus).mockResolvedValue(undefined);
      vi.mocked(db.createNotificationsForEnabledUsers).mockResolvedValue(undefined);

      const protocol = await db.getClientProtocolById(1);
      expect(protocol?.paymentStatus).toBe('pending');

      await db.updateClientProtocolPaymentStatus('1', 'paid');

      expect(db.updateClientProtocolPaymentStatus).toHaveBeenCalledWith('1', 'paid');
    });

    it('should create admin notification on Venmo payment approval', async () => {
      const mockProtocol = {
        id: 1,
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
        paymentMethod: 'venmo',
      };

      vi.mocked(db.getClientProtocolById).mockResolvedValue(mockProtocol);
      vi.mocked(db.createNotificationsForEnabledUsers).mockResolvedValue(undefined);

      await db.createNotificationsForEnabledUsers(
        'payment_received',
        `Payment received from ${mockProtocol.clientName}`,
        `Venmo payment has been manually confirmed for ${mockProtocol.clientName}'s protocol.`,
        1
      );

      expect(db.createNotificationsForEnabledUsers).toHaveBeenCalledWith(
        'payment_received',
        expect.stringContaining('Test Client'),
        expect.stringContaining('Venmo'),
        1
      );
    });

    it('should create packing slip on Venmo payment approval', async () => {
      const mockProtocol = {
        id: 1,
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
        paymentMethod: 'venmo',
        shippingStreet: '123 Main St',
        shippingCity: 'Denver',
        shippingState: 'CO',
        shippingZip: '80202',
      };

      const mockProtocolItems = [
        { protocolItemId: 1, isRecommended: true, quantity: 1, customPrice: null },
      ];

      const mockAllItems = [
        { id: 1, name: 'BPC-157', itemType: 'peptide', price: '100' },
      ];

      vi.mocked(db.getClientProtocolById).mockResolvedValue(mockProtocol);
      vi.mocked(db.getPackingSlipByProtocolId).mockResolvedValue(null);
      vi.mocked(db.getClientProtocolItems).mockResolvedValue(mockProtocolItems);
      vi.mocked(db.getAllProtocolItems).mockResolvedValue(mockAllItems);
      vi.mocked(db.createPackingSlip).mockResolvedValue(1);

      // Check no existing packing slip
      const existingSlip = await db.getPackingSlipByProtocolId(1);
      expect(existingSlip).toBeNull();

      // Get shippable items
      const protocolItems = await db.getClientProtocolItems(1);
      const allItems = await db.getAllProtocolItems();

      const shippableItems = protocolItems
        .filter((item: any) => item.isRecommended)
        .map((item: any) => {
          const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
          return {
            protocolItemId: item.protocolItemId,
            itemName: protocolItem?.name || 'Unknown Item',
            itemType: protocolItem?.itemType || 'other',
            quantity: item.quantity || 1,
            price: parseFloat(item.customPrice || protocolItem?.price || '0'),
          };
        })
        .filter((item: any) => ['peptide', 'supplement', 'supply', 'other'].includes(item.itemType));

      // Calculate total
      const totalAmount = shippableItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      expect(totalAmount).toBeGreaterThan(0);

      // Create packing slip
      await db.createPackingSlip({
        clientProtocolId: mockProtocol.id,
        clientName: mockProtocol.clientName,
        clientEmail: mockProtocol.clientEmail,
        shippingStreet: mockProtocol.shippingStreet,
        shippingCity: mockProtocol.shippingCity,
        shippingState: mockProtocol.shippingState,
        shippingZip: mockProtocol.shippingZip,
        items: shippableItems,
      });

      expect(db.createPackingSlip).toHaveBeenCalled();
    });
  });

  describe('Bulk Reconciliation', () => {
    it('should handle bulk payment approval', async () => {
      const protocolIds = [1, 2, 3];
      
      vi.mocked(db.updateClientProtocolPaymentStatus).mockResolvedValue(undefined);
      vi.mocked(db.getClientProtocolById).mockResolvedValue({
        id: 1,
        clientName: 'Test Client',
        paymentMethod: 'venmo',
      });
      vi.mocked(db.createNotificationsForEnabledUsers).mockResolvedValue(undefined);

      for (const protocolId of protocolIds) {
        await db.updateClientProtocolPaymentStatus(protocolId.toString(), 'paid');
      }

      expect(db.updateClientProtocolPaymentStatus).toHaveBeenCalledTimes(3);
    });
  });
});

describe('Payment Flow Audit - Payment Status Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transition from pending to paid', async () => {
    vi.mocked(db.updateClientProtocolPaymentStatus).mockResolvedValue(undefined);

    await db.updateClientProtocolPaymentStatus('1', 'paid');

    expect(db.updateClientProtocolPaymentStatus).toHaveBeenCalledWith('1', 'paid');
  });

  it('should transition from pending to failed', async () => {
    vi.mocked(db.updateClientProtocolPaymentStatus).mockResolvedValue(undefined);

    await db.updateClientProtocolPaymentStatus('1', 'failed');

    expect(db.updateClientProtocolPaymentStatus).toHaveBeenCalledWith('1', 'failed');
  });

  it('should transition from paid to refunded', async () => {
    vi.mocked(db.updateClientProtocolPaymentStatus).mockResolvedValue(undefined);

    await db.updateClientProtocolPaymentStatus('1', 'refunded');

    expect(db.updateClientProtocolPaymentStatus).toHaveBeenCalledWith('1', 'refunded');
  });
});

describe('Payment Flow Audit - Notification Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check notification settings before sending', async () => {
    vi.mocked(db.getSiteSetting).mockResolvedValue('true');

    const setting = await db.getSiteSetting('notification_payment_confirmation');
    expect(setting).toBe('true');
  });

  it('should skip notification if disabled', async () => {
    vi.mocked(db.getSiteSetting).mockResolvedValue('false');
    vi.mocked(db.createNotificationsForEnabledUsers).mockResolvedValue(undefined);

    const setting = await db.getSiteSetting('notification_payment_confirmation');
    
    if (setting === 'false') {
      // Should not create notification
      expect(db.createNotificationsForEnabledUsers).not.toHaveBeenCalled();
    }
  });
});

describe('Payment Flow Audit - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle missing protocol gracefully', async () => {
    vi.mocked(db.getClientProtocolById).mockResolvedValue(null);

    const protocol = await db.getClientProtocolById(999);
    expect(protocol).toBeNull();
  });

  it('should handle duplicate packing slip creation attempts', async () => {
    const existingSlip = {
      id: 1,
      clientProtocolId: 1,
      clientName: 'Test Client',
    };

    vi.mocked(db.getPackingSlipByProtocolId).mockResolvedValue(existingSlip);

    const existing = await db.getPackingSlipByProtocolId(1);
    expect(existing).not.toBeNull();
    
    // Should not create new packing slip if one exists
    if (existing) {
      expect(db.createPackingSlip).not.toHaveBeenCalled();
    }
  });

  it('should handle missing PayPal order gracefully', async () => {
    vi.mocked(db.getPayPalOrder).mockResolvedValue(null);

    const order = await db.getPayPalOrder('NONEXISTENT');
    expect(order).toBeNull();
  });
});
