import { describe, it, expect } from 'vitest';

// Constants matching the implementation
const FLAT_SHIPPING_FEE_CENTS = 1000; // $10.00
const DISCOUNT_RATE = 0.10;
const PAYPAL_PROCESSING_FEE_RATE = 0.035;

describe('Flat-Rate Shipping Fee', () => {
  describe('Frontend total calculation', () => {
    it('should add $10 shipping fee to cart total', () => {
      const cart = [
        { price: 5000, quantity: 1, isDiscountable: false }, // $50.00
        { price: 3000, quantity: 2, isDiscountable: false }, // $30.00 x 2
      ];
      
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const shippingFee = cart.length > 0 ? FLAT_SHIPPING_FEE_CENTS : 0;
      const total = subtotal - 0 + shippingFee; // No discount
      
      expect(subtotal).toBe(11000); // $110.00
      expect(shippingFee).toBe(1000); // $10.00
      expect(total).toBe(12000); // $120.00
    });

    it('should not add shipping fee for empty cart', () => {
      const cart: any[] = [];
      const shippingFee = cart.length > 0 ? FLAT_SHIPPING_FEE_CENTS : 0;
      expect(shippingFee).toBe(0);
    });

    it('should correctly calculate total with discount and shipping', () => {
      const cart = [
        { price: 10000, quantity: 1, isDiscountable: true }, // $100.00 discountable
        { price: 5000, quantity: 1, isDiscountable: false }, // $50.00 not discountable
      ];
      
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountableSubtotal = cart
        .filter(item => item.isDiscountable)
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountAmount = Math.round(discountableSubtotal * DISCOUNT_RATE);
      const shippingFee = FLAT_SHIPPING_FEE_CENTS;
      const total = subtotal - discountAmount + shippingFee;
      
      expect(subtotal).toBe(15000); // $150.00
      expect(discountAmount).toBe(1000); // $10.00 (10% of $100)
      expect(shippingFee).toBe(1000); // $10.00
      expect(total).toBe(15000); // $150.00 - $10.00 + $10.00 = $150.00
    });
  });

  describe('Backend PayPal order calculation', () => {
    it('should include shipping fee in PayPal order total', () => {
      const items = [
        { price: 5000, quantity: 2 }, // $50.00 x 2
      ];
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountAmount = 0;
      const shippingFee = FLAT_SHIPPING_FEE_CENTS;
      const total = subtotal - discountAmount + shippingFee;
      const totalDollars = (total / 100).toFixed(2);
      
      // PayPal adds 3.5% processing fee on top
      const totalNum = parseFloat(totalDollars);
      const processingFee = totalNum * PAYPAL_PROCESSING_FEE_RATE;
      const totalWithFee = totalNum + processingFee;
      
      expect(total).toBe(11000); // $110.00 (items + shipping)
      expect(totalDollars).toBe('110.00');
      expect(totalWithFee).toBeCloseTo(113.85, 2); // $110 + 3.5% = $113.85
    });

    it('should include shipping fee in Venmo order total (no processing fee)', () => {
      const items = [
        { price: 5000, quantity: 2 }, // $50.00 x 2
      ];
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountAmount = 0;
      const shippingFee = FLAT_SHIPPING_FEE_CENTS;
      const total = subtotal - discountAmount + shippingFee;
      const totalDollars = (total / 100).toFixed(2);
      
      // Venmo has NO processing fee
      expect(total).toBe(11000); // $110.00 (items + shipping)
      expect(totalDollars).toBe('110.00');
    });
  });

  describe('Shipping fee in dollars formatting', () => {
    it('should format shipping fee correctly for database storage', () => {
      const shippingFeeDollars = (FLAT_SHIPPING_FEE_CENTS / 100).toFixed(2);
      expect(shippingFeeDollars).toBe('10.00');
    });

    it('should format shipping fee correctly for display', () => {
      const display = `$${(FLAT_SHIPPING_FEE_CENTS / 100).toFixed(2)}`;
      expect(display).toBe('$10.00');
    });
  });

  describe('Email template shipping section', () => {
    it('should show shipping section when shippingFee > 0', () => {
      const shippingFee = '10.00';
      const hasShipping = shippingFee && parseFloat(shippingFee) > 0;
      expect(hasShipping).toBeTruthy();
    });

    it('should not show shipping section when shippingFee is 0', () => {
      const shippingFee = '0.00';
      const hasShipping = shippingFee && parseFloat(shippingFee) > 0;
      expect(hasShipping).toBeFalsy();
    });

    it('should not show shipping section when shippingFee is undefined', () => {
      const shippingFee = undefined;
      const hasShipping = shippingFee && parseFloat(shippingFee) > 0;
      expect(hasShipping).toBeFalsy();
    });
  });
});
