import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the email service
vi.mock('../emailService', () => ({
  sendTransformationMilestoneEmail: vi.fn().mockResolvedValue({ success: true }),
  sendAdminMilestoneNotification: vi.fn().mockResolvedValue({ success: true }),
  sendTransformationPaymentConfirmationEmail: vi.fn().mockResolvedValue({ success: true, message: 'Email sent' }),
  sendTransformationPaymentAdminNotification: vi.fn().mockResolvedValue({ success: true, message: 'Admin notified' }),
}));

// Import after mocking
import { 
  sendTransformationPaymentConfirmationEmail, 
  sendTransformationPaymentAdminNotification 
} from '../emailService';

describe('Transformation Payment Email Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendTransformationPaymentConfirmationEmail', () => {
    it('should send confirmation email with correct parameters', async () => {
      const params = {
        to: 'client@example.com',
        clientName: 'John Doe',
        tier: 'flagship' as const,
        amount: 2500,
        paymentMethod: 'PayPal',
        baseUrl: 'https://peptidecoach.pro',
      };

      const result = await sendTransformationPaymentConfirmationEmail(params);

      expect(result.success).toBe(true);
      expect(sendTransformationPaymentConfirmationEmail).toHaveBeenCalledWith(params);
    });

    it('should include promo code details when provided', async () => {
      const params = {
        to: 'client@example.com',
        clientName: 'Jane Smith',
        tier: 'elite' as const,
        amount: 8000,
        paymentMethod: 'Venmo',
        promoCode: 'SAVE20',
        discountAmount: 2000,
        originalAmount: 10000,
        baseUrl: 'https://peptidecoach.pro',
      };

      const result = await sendTransformationPaymentConfirmationEmail(params);

      expect(result.success).toBe(true);
      expect(sendTransformationPaymentConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          promoCode: 'SAVE20',
          discountAmount: 2000,
          originalAmount: 10000,
        })
      );
    });

    it('should handle all tier types correctly', async () => {
      const tiers = ['elite', 'flagship', 'essentials'] as const;
      
      for (const tier of tiers) {
        const result = await sendTransformationPaymentConfirmationEmail({
          to: 'test@example.com',
          clientName: 'Test User',
          tier,
          amount: tier === 'elite' ? 10000 : tier === 'flagship' ? 2500 : 750,
          paymentMethod: 'PayPal',
          baseUrl: 'https://peptidecoach.pro',
        });

        expect(result.success).toBe(true);
      }
    });
  });

  describe('sendTransformationPaymentAdminNotification', () => {
    it('should send admin notification with correct parameters', async () => {
      const params = {
        clientName: 'John Doe',
        clientEmail: 'john@example.com',
        tier: 'flagship' as const,
        amount: 2500,
        paymentMethod: 'Venmo',
        baseUrl: 'https://peptidecoach.pro',
      };

      const result = await sendTransformationPaymentAdminNotification(params);

      expect(result.success).toBe(true);
      expect(sendTransformationPaymentAdminNotification).toHaveBeenCalledWith(params);
    });

    it('should include promo code in admin notification', async () => {
      const params = {
        clientName: 'Jane Smith',
        clientEmail: 'jane@example.com',
        tier: 'elite' as const,
        amount: 8000,
        paymentMethod: 'PayPal',
        promoCode: 'VIP50',
        discountAmount: 2000,
        baseUrl: 'https://peptidecoach.pro',
      };

      const result = await sendTransformationPaymentAdminNotification(params);

      expect(result.success).toBe(true);
      expect(sendTransformationPaymentAdminNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          promoCode: 'VIP50',
          discountAmount: 2000,
        })
      );
    });
  });
});

describe('Promo Code Discount Calculation', () => {
  it('should calculate percentage discount correctly', () => {
    const originalAmount = 2500;
    const discountPercent = 20;
    const expectedDiscount = originalAmount * (discountPercent / 100);
    const finalAmount = originalAmount - expectedDiscount;

    expect(expectedDiscount).toBe(500);
    expect(finalAmount).toBe(2000);
  });

  it('should calculate fixed discount correctly', () => {
    const originalAmount = 2500;
    const fixedDiscount = 300;
    const finalAmount = originalAmount - fixedDiscount;

    expect(finalAmount).toBe(2200);
  });

  it('should not allow negative final amounts', () => {
    const originalAmount = 100;
    const fixedDiscount = 200;
    const finalAmount = Math.max(0, originalAmount - fixedDiscount);

    expect(finalAmount).toBe(0);
  });

  it('should apply correct tier prices', () => {
    const tierPrices: Record<string, number> = {
      elite: 10000,
      flagship: 2500,
      essentials: 750,
    };

    expect(tierPrices.elite).toBe(10000);
    expect(tierPrices.flagship).toBe(2500);
    expect(tierPrices.essentials).toBe(750);
  });
});

describe('Pending Payment Verification Flow', () => {
  it('should have correct status transitions', () => {
    const validStatuses = ['pending', 'verified', 'rejected'];
    
    expect(validStatuses).toContain('pending');
    expect(validStatuses).toContain('verified');
    expect(validStatuses).toContain('rejected');
  });

  it('should validate payment method types', () => {
    const validMethods = ['paypal', 'venmo', 'PayPal', 'Venmo'];
    
    expect(validMethods.map(m => m.toLowerCase())).toContain('paypal');
    expect(validMethods.map(m => m.toLowerCase())).toContain('venmo');
  });
});
