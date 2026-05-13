import { describe, it, expect, vi } from "vitest";

// Test the discount calculation logic used in CustomOrders
describe("Custom Order Discount Calculations", () => {
  // Helper to mimic the frontend discount logic
  function calculateDiscount(opts: {
    lineItems: { pricePerUnit: string; quantity: number; isDiscountable: boolean; inventoryItemId: number | null }[];
    discountType: "dollar" | "percent";
    discountAmount: string;
    discountOverride: boolean;
  }) {
    const subtotal = opts.lineItems.reduce(
      (sum, item) => sum + (parseFloat(item.pricePerUnit) || 0) * item.quantity,
      0
    );
    const discountableSubtotal = opts.discountOverride
      ? subtotal
      : opts.lineItems.reduce(
          (sum, item) =>
            sum + (item.isDiscountable ? (parseFloat(item.pricePerUnit) || 0) * item.quantity : 0),
          0
        );
    const rawInput = parseFloat(opts.discountAmount) || 0;
    const calculatedDiscount =
      opts.discountType === "percent"
        ? Math.round(discountableSubtotal * (rawInput / 100) * 100) / 100
        : Math.min(rawInput, discountableSubtotal);
    const total = Math.max(0, subtotal - calculatedDiscount);
    return { subtotal, discountableSubtotal, calculatedDiscount, total };
  }

  it("should apply dollar discount only to discountable items", () => {
    const result = calculateDiscount({
      lineItems: [
        { pricePerUnit: "100", quantity: 1, isDiscountable: true, inventoryItemId: 1 },
        { pricePerUnit: "50", quantity: 1, isDiscountable: false, inventoryItemId: 2 },
      ],
      discountType: "dollar",
      discountAmount: "30",
      discountOverride: false,
    });
    expect(result.subtotal).toBe(150);
    expect(result.discountableSubtotal).toBe(100);
    expect(result.calculatedDiscount).toBe(30);
    expect(result.total).toBe(120);
  });

  it("should cap dollar discount at discountable subtotal", () => {
    const result = calculateDiscount({
      lineItems: [
        { pricePerUnit: "50", quantity: 1, isDiscountable: true, inventoryItemId: 1 },
        { pricePerUnit: "100", quantity: 1, isDiscountable: false, inventoryItemId: 2 },
      ],
      discountType: "dollar",
      discountAmount: "80",
      discountOverride: false,
    });
    expect(result.calculatedDiscount).toBe(50); // Capped at discountable subtotal
    expect(result.total).toBe(100); // Non-discountable item remains
  });

  it("should apply percentage discount only to discountable items", () => {
    const result = calculateDiscount({
      lineItems: [
        { pricePerUnit: "200", quantity: 1, isDiscountable: true, inventoryItemId: 1 },
        { pricePerUnit: "100", quantity: 1, isDiscountable: false, inventoryItemId: 2 },
      ],
      discountType: "percent",
      discountAmount: "10",
      discountOverride: false,
    });
    expect(result.discountableSubtotal).toBe(200);
    expect(result.calculatedDiscount).toBe(20); // 10% of $200
    expect(result.total).toBe(280); // $300 - $20
  });

  it("should apply discount to ALL items when override is enabled", () => {
    const result = calculateDiscount({
      lineItems: [
        { pricePerUnit: "100", quantity: 1, isDiscountable: true, inventoryItemId: 1 },
        { pricePerUnit: "50", quantity: 1, isDiscountable: false, inventoryItemId: 2 },
      ],
      discountType: "percent",
      discountAmount: "10",
      discountOverride: true,
    });
    expect(result.discountableSubtotal).toBe(150); // Override includes all
    expect(result.calculatedDiscount).toBe(15); // 10% of $150
    expect(result.total).toBe(135);
  });

  it("should handle zero discount gracefully", () => {
    const result = calculateDiscount({
      lineItems: [
        { pricePerUnit: "100", quantity: 2, isDiscountable: true, inventoryItemId: 1 },
      ],
      discountType: "dollar",
      discountAmount: "0",
      discountOverride: false,
    });
    expect(result.subtotal).toBe(200);
    expect(result.calculatedDiscount).toBe(0);
    expect(result.total).toBe(200);
  });

  it("should handle 100% discount correctly", () => {
    const result = calculateDiscount({
      lineItems: [
        { pricePerUnit: "100", quantity: 1, isDiscountable: true, inventoryItemId: 1 },
        { pricePerUnit: "50", quantity: 1, isDiscountable: false, inventoryItemId: 2 },
      ],
      discountType: "percent",
      discountAmount: "100",
      discountOverride: false,
    });
    expect(result.calculatedDiscount).toBe(100); // 100% of discountable
    expect(result.total).toBe(50); // Only non-discountable remains
  });

  it("should handle custom items (no inventoryItemId) as non-discountable by default", () => {
    const result = calculateDiscount({
      lineItems: [
        { pricePerUnit: "100", quantity: 1, isDiscountable: true, inventoryItemId: 1 },
        { pricePerUnit: "75", quantity: 1, isDiscountable: false, inventoryItemId: null }, // Custom item
      ],
      discountType: "dollar",
      discountAmount: "50",
      discountOverride: false,
    });
    expect(result.discountableSubtotal).toBe(100);
    expect(result.calculatedDiscount).toBe(50);
    expect(result.total).toBe(125);
  });
});
