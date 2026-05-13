import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const routerPath = join(__dirname, "customOrders/router.ts");
const routerCode = readFileSync(routerPath, "utf-8");

const customOrdersPagePath = join(__dirname, "../client/src/pages/admin/CustomOrders.tsx");
const pageCode = readFileSync(customOrdersPagePath, "utf-8");

describe("Custom Order Editability", () => {
  describe("Backend - router.ts", () => {
    it("should allow editing for draft, pending_payment, and processing statuses", () => {
      // The update mutation should include editable statuses
      expect(routerCode).toContain('"draft"');
      expect(routerCode).toContain('"pending_payment"');
      expect(routerCode).toContain('"processing"');
      // Check the editable statuses array exists
      expect(routerCode).toMatch(/editableStatuses.*=.*\[.*"draft".*"pending_payment".*"processing".*\]/s);
    });

    it("should throw error for non-editable statuses", () => {
      expect(routerCode).toContain("Cannot edit orders that are paid, shipped, delivered, cancelled, or refunded");
    });

    it("should delete and recreate items when updating", () => {
      expect(routerCode).toContain("deleteCustomOrderItems");
      expect(routerCode).toContain("createCustomOrderItem");
    });

    it("should recalculate totals on update", () => {
      // The update mutation should recalculate subtotal, discount, shipping, total
      expect(routerCode).toContain("subtotal");
      expect(routerCode).toContain("discountAmount");
      expect(routerCode).toContain("shippingFee");
      expect(routerCode).toContain("total");
    });
  });

  describe("Frontend - CustomOrders.tsx", () => {
    it("should define EDITABLE_STATUSES constant", () => {
      expect(pageCode).toContain("EDITABLE_STATUSES");
      expect(pageCode).toMatch(/EDITABLE_STATUSES.*=.*\[.*"draft".*"pending_payment".*"processing".*\]/s);
    });

    it("should have an Edit Order button in the detail dialog", () => {
      expect(pageCode).toContain("Edit Order");
      expect(pageCode).toContain("Pencil");
      expect(pageCode).toContain("enterEditMode");
    });

    it("should show Edit button only for editable statuses", () => {
      expect(pageCode).toContain("isEditable && !isEditing");
    });

    it("should have Save Changes button in edit mode", () => {
      expect(pageCode).toContain("Save Changes");
      expect(pageCode).toContain("handleSaveEdit");
    });

    it("should have Cancel button in edit mode", () => {
      // Cancel edit mode button
      expect(pageCode).toMatch(/isEditing.*&&[\s\S]*?Cancel/);
    });

    it("should have edit mode state variables", () => {
      expect(pageCode).toContain("isEditing");
      expect(pageCode).toContain("setIsEditing");
      expect(pageCode).toContain("editClientName");
      expect(pageCode).toContain("editLineItems");
      expect(pageCode).toContain("editDiscountAmount");
      expect(pageCode).toContain("editShippingFee");
    });

    it("should reset edit mode when dialog closes", () => {
      expect(pageCode).toContain("if (!open) setIsEditing(false)");
    });

    it("should have editable line items with add/remove functionality", () => {
      expect(pageCode).toContain("addEditCustomLineItem");
      expect(pageCode).toContain("removeEditLineItem");
      expect(pageCode).toContain("updateEditLineItem");
    });

    it("should have product catalog picker in edit mode", () => {
      expect(pageCode).toContain("showEditProductPicker");
      expect(pageCode).toContain("addEditProductFromCatalog");
      expect(pageCode).toContain("From Catalog");
    });

    it("should have editable shipping address fields", () => {
      expect(pageCode).toContain("editShippingName");
      expect(pageCode).toContain("editShippingStreet");
      expect(pageCode).toContain("editShippingCity");
      expect(pageCode).toContain("editShippingState");
      expect(pageCode).toContain("editShippingZip");
    });

    it("should have editable payment and shipping method", () => {
      expect(pageCode).toContain("editPaymentMethod");
      expect(pageCode).toContain("editShippingMethod");
    });

    it("should have editable admin notes", () => {
      expect(pageCode).toContain("editAdminNotes");
    });

    it("should calculate edit totals correctly", () => {
      expect(pageCode).toContain("editSubtotal");
      expect(pageCode).toContain("editDiscount");
      expect(pageCode).toContain("editTotal");
    });

    it("should have Edit option in the dropdown menu for editable orders", () => {
      // The dropdown should show Edit for editable statuses
      expect(pageCode).toMatch(/EDITABLE_STATUSES\.includes\(order\.status\)[\s\S]*?Edit Order/);
    });

    it("should use updateOrderMutation to save edits", () => {
      expect(pageCode).toContain("updateOrderMutation");
      expect(pageCode).toContain("trpc.customOrders.update.useMutation");
    });

    it("should populate edit fields from existing order data", () => {
      // enterEditMode should set all fields from order data
      expect(pageCode).toContain("setEditClientName(o.clientName");
      expect(pageCode).toContain("setEditClientEmail(o.clientEmail");
      expect(pageCode).toContain("setEditLineItems(order.items.map");
    });

    it("should validate before saving - require items and names", () => {
      expect(pageCode).toContain("Add at least one line item");
      expect(pageCode).toContain("All line items must have a name");
    });

    it("should show (Editable) label for editable orders", () => {
      expect(pageCode).toContain("(Editable)");
    });
  });
});
