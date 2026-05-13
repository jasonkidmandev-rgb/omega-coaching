import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getAllInventoryCategories: vi.fn().mockResolvedValue([
    { id: 1, name: 'Bioregulators', description: 'Peptide bioregulators', sortOrder: 1 },
    { id: 2, name: 'Limitless Tier 1', description: 'Premium peptides', sortOrder: 2 },
  ]),
  getInventoryWithCategories: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Bioregulators',
      items: [
        { id: 1, name: 'BPC-157 (10mg)', price: '150.00', quantity: 10, isDiscountable: true, isActive: true },
        { id: 2, name: 'Cerebrolysin', price: '200.00', quantity: 5, isDiscountable: false, isActive: true },
      ],
    },
  ]),
  sellInventoryItem: vi.fn().mockResolvedValue({
    previousQuantity: 10,
    newQuantity: 9,
    transactionId: 1,
  }),
}));

describe('Inventory System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Discount Calculation', () => {
    it('should calculate 10% discount for discountable items', () => {
      const items = [
        { price: 15000, quantity: 2, isDiscountable: true }, // $150 x 2 = $300
        { price: 20000, quantity: 1, isDiscountable: false }, // $200 x 1 = $200
      ];

      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountableSubtotal = items
        .filter(item => item.isDiscountable)
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountAmount = Math.round(discountableSubtotal * 0.10);
      const total = subtotal - discountAmount;

      expect(subtotal).toBe(50000); // $500
      expect(discountableSubtotal).toBe(30000); // $300
      expect(discountAmount).toBe(3000); // $30 (10% of $300)
      expect(total).toBe(47000); // $470
    });

    it('should not apply discount to non-discountable items', () => {
      const items = [
        { price: 20000, quantity: 1, isDiscountable: false },
        { price: 25000, quantity: 1, isDiscountable: false },
      ];

      const discountableSubtotal = items
        .filter(item => item.isDiscountable)
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountAmount = Math.round(discountableSubtotal * 0.10);

      expect(discountableSubtotal).toBe(0);
      expect(discountAmount).toBe(0);
    });

    it('should apply discount to all items when all are discountable', () => {
      const items = [
        { price: 10000, quantity: 3, isDiscountable: true }, // $100 x 3 = $300
        { price: 15000, quantity: 2, isDiscountable: true }, // $150 x 2 = $300
      ];

      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountableSubtotal = items
        .filter(item => item.isDiscountable)
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountAmount = Math.round(discountableSubtotal * 0.10);
      const total = subtotal - discountAmount;

      expect(subtotal).toBe(60000); // $600
      expect(discountableSubtotal).toBe(60000); // $600
      expect(discountAmount).toBe(6000); // $60 (10% of $600)
      expect(total).toBe(54000); // $540
    });
  });

  describe('Cart Operations', () => {
    it('should add items to cart correctly', () => {
      const cart: Array<{ id: number; name: string; price: number; quantity: number }> = [];
      
      // Add first item
      const item1 = { id: 1, name: 'BPC-157', price: 15000, quantity: 1 };
      cart.push(item1);
      expect(cart.length).toBe(1);
      expect(cart[0].quantity).toBe(1);

      // Update quantity of existing item
      const existingIndex = cart.findIndex(i => i.id === 1);
      if (existingIndex >= 0) {
        cart[existingIndex].quantity += 1;
      }
      expect(cart[0].quantity).toBe(2);
    });

    it('should remove items from cart', () => {
      const cart = [
        { id: 1, name: 'BPC-157', price: 15000, quantity: 2 },
        { id: 2, name: 'TB-500', price: 12000, quantity: 1 },
      ];

      const newCart = cart.filter(item => item.id !== 1);
      expect(newCart.length).toBe(1);
      expect(newCart[0].id).toBe(2);
    });

    it('should calculate cart total correctly', () => {
      const cart = [
        { id: 1, price: 15000, quantity: 2 },
        { id: 2, price: 12000, quantity: 3 },
      ];

      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      expect(total).toBe(66000); // $660
    });
  });

  describe('Inventory Categories', () => {
    it('should have Limitless Tier 1 category for premium items', async () => {
      const { getAllInventoryCategories } = await import('./db');
      const categories = await getAllInventoryCategories();
      
      const limitlessTier = categories.find(c => c.name === 'Limitless Tier 1');
      expect(limitlessTier).toBeDefined();
    });

    it('should return items with isDiscountable flag', async () => {
      const { getInventoryWithCategories } = await import('./db');
      const inventory = await getInventoryWithCategories();
      
      const bioregulators = inventory.find(c => c.name === 'Bioregulators');
      expect(bioregulators).toBeDefined();
      
      const discountableItem = bioregulators?.items.find(i => i.isDiscountable);
      const nonDiscountableItem = bioregulators?.items.find(i => !i.isDiscountable);
      
      expect(discountableItem).toBeDefined();
      expect(nonDiscountableItem).toBeDefined();
    });
  });
});
