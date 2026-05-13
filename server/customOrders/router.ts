import { z } from "zod";
import * as customOrderDb from "./db";
import { sendEmail } from "../emailService";
import { createNotificationsForEnabledUsers } from "../db";
import { findOrCreateContact } from "../contacts/contactService";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getStripeSecretKey } from "../stripe/stripeConfig";

const lineItemSchema = z.object({
  inventoryItemId: z.number().nullable().optional(),
  name: z.string(),
  description: z.string().optional(),
  quantity: z.number().min(1),
  pricePerUnit: z.string(), // Dollar amount as string
  originalPrice: z.string().optional(), // Catalog price before override
  itemType: z.enum(["product", "service", "shipping", "custom"]).default("product"),
  isDiscountable: z.preprocess((val) => val === 1 || val === true || val === "true", z.boolean()).default(false),
});

const shippingAddressSchema = z.object({
  shippingName: z.string().optional(),
  shippingStreet: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingZip: z.string().optional(),
  shippingCountry: z.string().optional(),
  shippingPhone: z.string().optional(),
  shippingMethod: z.enum(["standard", "expedited", "overnight", "pickup"]).optional(),
});

export const customOrdersRouter = router({
  // ─── Admin: Create a new custom order ─────────────────────────────────────
  create: adminProcedure
    .input(z.object({
      userId: z.number().nullable().optional(),
      clientName: z.string(),
      clientEmail: z.string().email(),
      clientPhone: z.string().optional(),
      paymentMethod: z.enum(["stripe", "manual"]).default("stripe"),
      items: z.array(lineItemSchema).min(1),
      discountAmount: z.string().default("0"),
      shippingFee: z.string().default("0"),
      adminNotes: z.string().optional(),
      ...shippingAddressSchema.shape,
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Calculate subtotal from items
        const subtotal = input.items.reduce(
          (sum, item) => sum + parseFloat(item.pricePerUnit) * item.quantity,
          0
        );
        const discount = parseFloat(input.discountAmount || "0");
        const shipping = parseFloat(input.shippingFee || "0");
        const total = subtotal - discount + shipping;

        if (total < 0) {
          throw new Error("Order total cannot be negative");
        }

        // Generate order number
        const orderNumber = await customOrderDb.generateOrderNumber();

        // Find or create unified contact record
        let contactId: number | null = null;
        try {
          const nameParts = input.clientName.trim().split(/\s+/);
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          const contact = await findOrCreateContact({
            email: input.clientEmail,
            firstName,
            lastName,
            phone: input.clientPhone || undefined,
          });
          contactId = contact.id;
        } catch (e) { console.error('[CustomOrder] Contact link error:', e); }

        // Create the order
        const orderId = await customOrderDb.createCustomOrder({
          orderNumber,
          userId: input.userId || null,
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          clientPhone: input.clientPhone || null,
          paymentMethod: input.paymentMethod,
          subtotal: subtotal.toFixed(2),
          discountAmount: discount.toFixed(2),
          shippingFee: shipping.toFixed(2),
          total: total.toFixed(2),
          status: "draft",
          shippingName: input.shippingName || null,
          shippingStreet: input.shippingStreet || null,
          shippingCity: input.shippingCity || null,
          shippingState: input.shippingState || null,
          shippingZip: input.shippingZip || null,
          shippingCountry: input.shippingCountry || "United States",
          shippingPhone: input.shippingPhone || null,
          shippingMethod: input.shippingMethod || "standard",
          adminNotes: input.adminNotes || null,
          createdBy: ctx.user.id,
          createdByName: ctx.user.name || ctx.user.email || "Admin",
          contactId: contactId,
        });

        // Create line items
        for (const item of input.items) {
          await customOrderDb.createCustomOrderItem({
            customOrderId: orderId,
            inventoryItemId: item.inventoryItemId || null,
            name: item.name,
            description: item.description || null,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            originalPrice: item.originalPrice || null,
            itemType: item.itemType,
            isDiscountable: item.isDiscountable,
          });
        }

        console.log(`[CustomOrder] Created order ${orderNumber} (ID: ${orderId}) for ${input.clientName}`);

        return { orderId, orderNumber };
      } catch (error) {
        console.error("[CustomOrder] Create error:", error);
        throw new Error(`Failed to create custom order: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),

  // ─── Admin: Update an existing custom order ───────────────────────────────
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      clientName: z.string().optional(),
      clientEmail: z.string().email().optional(),
      clientPhone: z.string().optional(),
      paymentMethod: z.enum(["stripe", "manual"]).optional(),
      items: z.array(lineItemSchema).optional(),
      discountAmount: z.string().optional(),
      shippingFee: z.string().optional(),
      adminNotes: z.string().optional(),
      ...shippingAddressSchema.shape,
    }))
    .mutation(async ({ input }) => {
      const order = await customOrderDb.getCustomOrder(input.id);
      if (!order) throw new Error("Order not found");
      const editableStatuses = ["draft", "pending_payment", "processing"];
      if (!editableStatuses.includes(order.status)) {
        throw new Error("Cannot edit orders that are paid, shipped, delivered, cancelled, or refunded");
      }

      // Update items if provided
      if (input.items) {
        await customOrderDb.deleteCustomOrderItems(input.id);
        for (const item of input.items) {
          await customOrderDb.createCustomOrderItem({
            customOrderId: input.id,
            inventoryItemId: item.inventoryItemId || null,
            name: item.name,
            description: item.description || null,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            originalPrice: item.originalPrice || null,
            itemType: item.itemType,
            isDiscountable: item.isDiscountable,
          });
        }
      }

      // Recalculate totals if items or discount/shipping changed
      const items = input.items || (await customOrderDb.getCustomOrderItems(input.id));
      const subtotal = items.reduce(
        (sum, item) => sum + parseFloat(item.pricePerUnit) * item.quantity,
        0
      );
      const discount = parseFloat(input.discountAmount ?? order.discountAmount?.toString() ?? "0");
      const shipping = parseFloat(input.shippingFee ?? order.shippingFee?.toString() ?? "0");
      const total = subtotal - discount + shipping;

      await customOrderDb.updateCustomOrder(input.id, {
        ...(input.clientName ? { clientName: input.clientName } : {}),
        ...(input.clientEmail ? { clientEmail: input.clientEmail } : {}),
        ...(input.clientPhone !== undefined ? { clientPhone: input.clientPhone } : {}),
        ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
        ...(input.adminNotes !== undefined ? { adminNotes: input.adminNotes } : {}),
        ...(input.shippingName !== undefined ? { shippingName: input.shippingName } : {}),
        ...(input.shippingStreet !== undefined ? { shippingStreet: input.shippingStreet } : {}),
        ...(input.shippingCity !== undefined ? { shippingCity: input.shippingCity } : {}),
        ...(input.shippingState !== undefined ? { shippingState: input.shippingState } : {}),
        ...(input.shippingZip !== undefined ? { shippingZip: input.shippingZip } : {}),
        ...(input.shippingCountry !== undefined ? { shippingCountry: input.shippingCountry } : {}),
        ...(input.shippingPhone !== undefined ? { shippingPhone: input.shippingPhone } : {}),
        ...(input.shippingMethod !== undefined ? { shippingMethod: input.shippingMethod as any } : {}),
        subtotal: subtotal.toFixed(2),
        discountAmount: discount.toFixed(2),
        shippingFee: shipping.toFixed(2),
        total: total.toFixed(2),
      });

      // Propagate name/email/phone changes to master contact and all linked records
      const hasContactInfoChange = input.clientName !== undefined || input.clientEmail !== undefined || input.clientPhone !== undefined;
      if (hasContactInfoChange) {
        try {
          if (order.contactId) {
            const { propagateContactChanges } = await import('./contacts/propagateContactChanges');
            await propagateContactChanges({
              contactId: order.contactId,
              ...(input.clientName ? { name: input.clientName } : {}),
              ...(input.clientEmail ? { email: input.clientEmail } : {}),
              ...(input.clientPhone !== undefined ? { phone: input.clientPhone } : {}),
            });
            console.log(`[customOrders.update] Propagated contact changes for order ${input.id} → contact ${order.contactId}`);
          } else {
            console.warn(`[customOrders.update] Order ${input.id} has no contactId — changes not propagated`);
          }
        } catch (propError) {
          console.error('[customOrders.update] Contact propagation error:', propError);
        }
      }

      return { success: true };
    }),

  // ─── Admin: List all custom orders ────────────────────────────────────────
  list: adminProcedure
    .input(z.object({
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return customOrderDb.getAllCustomOrders(input?.status);
    }),

  // ─── Admin: Get a single custom order ─────────────────────────────────────
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const order = await customOrderDb.getCustomOrder(input.id);
      if (!order) throw new Error("Order not found");
      const items = await customOrderDb.getCustomOrderItems(order.id);
      return { order, items };
    }),

  // ─── Admin: Send invoice to client (email with payment link - Stripe to be integrated) ──
  sendInvoice: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const order = await customOrderDb.getCustomOrder(input.id);
      if (!order) throw new Error("Order not found");
      if (order.status !== "draft") throw new Error("Can only send invoices for draft orders");

      const items = await customOrderDb.getCustomOrderItems(order.id);
      const total = parseFloat(order.total?.toString() || "0");

      // Create Stripe checkout session with 3.5% processing fee
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(getStripeSecretKey(), { apiVersion: '2024-06-20' as any });
      const origin = process.env.VITE_APP_URL || 'https://peptidecoach.pro';

      const PROCESSING_FEE_RATE = 0.035;
      const processingFee = Math.round(total * PROCESSING_FEE_RATE * 100) / 100;

      const lineItems: any[] = items.map((item: any) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name || 'Custom Item' },
          unit_amount: Math.round(parseFloat(item.pricePerUnit?.toString() || '0') * 100),
        },
        quantity: item.quantity,
      }));

      // Add processing fee line item
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Credit Card Processing Fee (3.5%)',
            description: 'Merchant service charge for credit/debit card payment',
          },
          unit_amount: Math.round(processingFee * 100),
        },
        quantity: 1,
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: order.clientEmail,
        client_reference_id: order.id.toString(),
        line_items: lineItems,
        metadata: {
          order_id: order.id.toString(),
          order_number: order.orderNumber,
          order_type: 'custom_order',
          customer_name: order.clientName || '',
          customer_email: order.clientEmail || '',
        },
        success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=order&orderId=${order.orderNumber}`,
        cancel_url: `${origin}/custom-order/payment-cancelled/${order.id}`,
      });

      // Update status to pending_payment
      await customOrderDb.updateCustomOrderStatus(order.id, "pending_payment");

      // Send invoice email with Stripe checkout link
      await sendInvoiceEmail(order, items, total, session.url || undefined, processingFee);

      console.log(`[CustomOrder] Invoice sent for ${order.orderNumber} with Stripe link: ${session.id}`);

      return { success: true, checkoutUrl: session.url };
    }),

  // ─── Admin: Resend invoice email to client ────────────────────────────────
  resendInvoice: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const order = await customOrderDb.getCustomOrder(input.id);
      if (!order) throw new Error("Order not found");

      const allowedStatuses = ["pending_payment"];
      if (!allowedStatuses.includes(order.status)) {
        throw new Error("Can only resend invoices for orders with pending payment status");
      }

      const items = await customOrderDb.getCustomOrderItems(order.id);
      const total = parseFloat(order.total?.toString() || "0");

      // Create new Stripe checkout session with 3.5% processing fee
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(getStripeSecretKey(), { apiVersion: '2024-06-20' as any });
      const origin = process.env.VITE_APP_URL || 'https://peptidecoach.pro';

      const PROCESSING_FEE_RATE = 0.035;
      const processingFee = Math.round(total * PROCESSING_FEE_RATE * 100) / 100;

      const lineItems: any[] = items.map((item: any) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name || 'Custom Item' },
          unit_amount: Math.round(parseFloat(item.pricePerUnit?.toString() || '0') * 100),
        },
        quantity: item.quantity,
      }));

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Credit Card Processing Fee (3.5%)',
            description: 'Merchant service charge for credit/debit card payment',
          },
          unit_amount: Math.round(processingFee * 100),
        },
        quantity: 1,
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: order.clientEmail,
        client_reference_id: order.id.toString(),
        line_items: lineItems,
        metadata: {
          order_id: order.id.toString(),
          order_number: order.orderNumber,
          order_type: 'custom_order',
          customer_name: order.clientName || '',
          customer_email: order.clientEmail || '',
        },
        success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=order&orderId=${order.orderNumber}`,
        cancel_url: `${origin}/custom-order/payment-cancelled/${order.id}`,
      });

      // Resend the invoice email with new Stripe link
      await sendInvoiceEmail(order, items, total, session.url || undefined, processingFee);
      console.log(`[CustomOrder] Invoice resent for ${order.orderNumber} with new Stripe link`);

      return { success: true, checkoutUrl: session.url };
    }),

  // ─── Admin: Mark order as paid (manual payment confirmation) ──────────────
  markAsPaid: adminProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const order = await customOrderDb.getCustomOrder(input.id);
      if (!order) throw new Error("Order not found");

      // Update order status to paid
      await customOrderDb.updateCustomOrderStatus(order.id, "paid");

      // Deduct inventory
      try {
        await customOrderDb.deductInventoryForCustomOrder(order.id, ctx.user.id);
        console.log(`[CustomOrder] Inventory deducted for ${order.orderNumber}`);
      } catch (err) {
        console.error(`[CustomOrder] Inventory deduction failed:`, err);
      }

      // Create packing slip
      try {
        const slipId = await customOrderDb.createPackingSlipForCustomOrder(order.id);
        if (slipId) console.log(`[CustomOrder] Packing slip created: ${slipId}`);
      } catch (err) {
        console.error(`[CustomOrder] Packing slip creation failed:`, err);
      }

      // Send payment confirmation email to client
      try {
        await sendEmail({
          to: order.clientEmail,
          subject: `Payment Confirmed - ${order.orderNumber}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #f97316; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Payment Confirmed</h1>
              </div>
              <div style="padding: 20px; background: #fff; border: 1px solid #eee; border-top: none;">
                <p>Hi ${order.clientName},</p>
                <p>Your payment for order <strong>${order.orderNumber}</strong> has been confirmed.</p>
                <p><strong>Amount:</strong> $${parseFloat(order.total?.toString() || "0").toFixed(2)}</p>
                <p>We're now processing your order and will notify you when it ships.</p>
                <p>Thank you for your business!</p>
              </div>
              <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
                Omega Longevity | peptidecoach.pro
              </div>
            </div>
          `,
        });
      } catch (err) {
        console.error(`[CustomOrder] Payment confirmation email failed:`, err);
      }

      return { success: true };
    }),

  // ─── Admin: Complete a $0 gift/trade order (no payment required) ──────────
  completeGiftOrder: adminProcedure
    .input(z.object({
      id: z.number(),
      adminNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const order = await customOrderDb.getCustomOrder(input.id);
      if (!order) throw new Error("Order not found");
      if (order.status !== "draft") throw new Error("Can only complete gift/trade orders from draft status");

      const total = parseFloat(order.total?.toString() || "0");
      if (total > 0) throw new Error("Only $0.00 orders can be completed as gift/trade. Use Send Invoice for paid orders.");

      // Mark as paid (processing) immediately — no payment needed
      await customOrderDb.updateCustomOrderStatus(order.id, "processing");

      // Append admin note
      if (input.adminNotes) {
        const existingNotes = order.adminNotes || "";
        const updatedNotes = existingNotes
          ? `${existingNotes}\n[Gift/Trade] ${input.adminNotes}`
          : `[Gift/Trade] ${input.adminNotes}`;
        await customOrderDb.updateCustomOrder(order.id, { adminNotes: updatedNotes });
      } else {
        const existingNotes = order.adminNotes || "";
        const updatedNotes = existingNotes
          ? `${existingNotes}\n[Gift/Trade] Completed as $0 order by ${ctx.user.name || ctx.user.email}`
          : `[Gift/Trade] Completed as $0 order by ${ctx.user.name || ctx.user.email}`;
        await customOrderDb.updateCustomOrder(order.id, { adminNotes: updatedNotes });
      }

      // Create packing slip using the dedicated custom order function
      try {
        const slipId = await customOrderDb.createPackingSlipForCustomOrder(order.id);
        if (slipId) console.log(`[CustomOrder] Packing slip created for gift order: ${slipId}`);
      } catch (err) {
        console.error(`[CustomOrder] Packing slip creation failed for gift order:`, err);
      }

      console.log(`[CustomOrder] Gift/trade order ${order.orderNumber} completed by ${ctx.user.name || ctx.user.email}`);

      return { success: true };
    }),

  // ─── Admin: Update order status ───────────────────────────────────────────
  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "pending_payment", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"]),
    }))
    .mutation(async ({ input }) => {
      await customOrderDb.updateCustomOrderStatus(input.id, input.status);
      return { success: true };
    }),

  // ─── Admin: Update shipping info ──────────────────────────────────────────
  updateShipping: adminProcedure
    .input(z.object({
      id: z.number(),
      trackingNumber: z.string().min(1),
      trackingCarrier: z.enum(["USPS", "UPS", "FedEx", "DHL", "Other"]),
      status: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const order = await customOrderDb.getCustomOrder(input.id);
      if (!order) throw new Error("Order not found");

      await customOrderDb.updateCustomOrderShipping(input.id, {
        trackingNumber: input.trackingNumber,
        trackingCarrier: input.trackingCarrier,
        status: "shipped",
        shippedAt: new Date(),
      });

      // Send shipping notification email
      try {
        const items = await customOrderDb.getCustomOrderItems(input.id);
        const { generateShippingNotificationEmail } = await import("../emailTemplates/shippingNotification");
        
        const emailData = await generateShippingNotificationEmail({
          customerName: order.clientName,
          customerEmail: order.clientEmail,
          orderId: order.id,
          trackingNumber: input.trackingNumber,
          trackingCarrier: input.trackingCarrier,
          items: items.map(i => ({ name: i.name, quantity: i.quantity })),
        });

        await sendEmail({
          to: order.clientEmail,
          subject: emailData.subject,
          html: emailData.html,
        });
        console.log(`[CustomOrder] Shipping notification sent to ${order.clientEmail}`);
      } catch (err) {
        console.error(`[CustomOrder] Shipping notification failed:`, err);
      }

      return { success: true };
    }),

  // ─── Admin: Delete a custom order ─────────────────────────────────────────
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const order = await customOrderDb.getCustomOrder(input.id);
      if (!order) throw new Error("Order not found");
      if (!["draft", "cancelled"].includes(order.status)) {
        throw new Error("Can only delete draft or cancelled orders");
      }
      await customOrderDb.deleteCustomOrder(input.id);
      return { success: true };
    }),

  // ─── Client: View their custom orders ─────────────────────────────────────
  myOrders: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) return [];
    return customOrderDb.getUserCustomOrders(userId);
  }),

  // ─── Client: Get a single custom order ────────────────────────────────────
  myOrder: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) return null;
      const order = await customOrderDb.getCustomOrder(input.orderId);
      if (!order || order.userId !== userId) return null;
      const items = await customOrderDb.getCustomOrderItems(order.id);
      return { ...order, items };
    }),

  // ─── Public: Confirm payment by order ID (for Stripe redirect callback) ───
  capturePaymentPublic: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const order = await customOrderDb.getCustomOrder(input.id);
      if (!order) throw new Error("Order not found");

      // If already paid, return success without re-processing
      if (order.status === "paid" || order.status === "processing" || order.status === "shipped" || order.status === "delivered") {
        return { success: true, orderNumber: order.orderNumber, alreadyPaid: true };
      }

      if (order.status !== "pending_payment") throw new Error("Order is not awaiting payment");

      // Mark as paid (Stripe webhook will also confirm this)
      await customOrderDb.updateCustomOrderStatus(order.id, "paid");

      // Deduct inventory
      try {
        await customOrderDb.deductInventoryForCustomOrder(order.id, 0);
        console.log(`[CustomOrder] Inventory deducted for ${order.orderNumber}`);
      } catch (err) {
        console.error(`[CustomOrder] Inventory deduction failed:`, err);
      }

      // Create packing slip
      try {
        const slipId = await customOrderDb.createPackingSlipForCustomOrder(order.id);
        if (slipId) console.log(`[CustomOrder] Packing slip created: ${slipId}`);
      } catch (err) {
        console.error(`[CustomOrder] Packing slip creation failed:`, err);
      }

      // Send payment confirmation email to client
      try {
        await sendEmail({
          to: order.clientEmail,
          subject: `Payment Confirmed - ${order.orderNumber}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #f97316; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Payment Confirmed</h1>
              </div>
              <div style="padding: 20px; background: #fff; border: 1px solid #eee; border-top: none;">
                <p>Hi ${order.clientName},</p>
                <p>Your payment for order <strong>${order.orderNumber}</strong> has been confirmed.</p>
                <p><strong>Amount:</strong> $${parseFloat(order.total?.toString() || "0").toFixed(2)}</p>
                <p>We're now processing your order and will notify you when it ships.</p>
                <p>Thank you for your business!</p>
              </div>
              <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
                Omega Longevity | peptidecoach.pro
              </div>
            </div>
          `,
        });
      } catch (err) {
        console.error(`[CustomOrder] Payment confirmation email failed:`, err);
      }

      // Notify admins
      try {
        await createNotificationsForEnabledUsers(
          "new_store_order",
          "Custom Order Payment Received",
          `${order.clientName} paid for custom order ${order.orderNumber} ($${parseFloat(order.total?.toString() || "0").toFixed(2)}).`,
        );
      } catch (err) {
        console.error("[CustomOrder] Admin notification failed:", err);
      }

      return { success: true, orderNumber: order.orderNumber, alreadyPaid: false };
    }),
});

// ─── Helper: Send invoice email ─────────────────────────────────────────────

async function sendInvoiceEmail(
  order: any,
  items: any[],
  total: number,
  checkoutUrl?: string,
  processingFee?: number,
) {
  const itemsHtml = items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.pricePerUnit?.toString() || "0").toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(parseFloat(item.pricePerUnit?.toString() || "0") * item.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const subtotal = parseFloat(order.subtotal?.toString() || "0");
  const discount = parseFloat(order.discountAmount?.toString() || "0");
  const shipping = parseFloat(order.shippingFee?.toString() || "0");
  const fee = processingFee || 0;
  const grandTotal = total + fee;

  // Payment section with Stripe checkout link
  const paymentSection = checkoutUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${checkoutUrl}" style="display: inline-block; background: #f97316; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Pay $${grandTotal.toFixed(2)} Now</a>
      <p style="font-size: 12px; color: #888; margin-top: 10px;">Includes 3.5% credit card processing fee ($${fee.toFixed(2)})</p>
    </div>
  ` : `
    <div style="text-align: center; margin: 30px 0;">
      <p style="font-size: 16px; color: #333;">Please contact us to arrange payment for this order.</p>
      <p style="font-size: 14px; color: #666;">Amount due: <strong>$${grandTotal.toFixed(2)}</strong></p>
    </div>
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background-color: #f97316; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Custom Order Invoice</h1>
      </div>
      
      <div style="padding: 20px; background: #fff; border: 1px solid #eee; border-top: none;">
        <p>Hi ${order.clientName},</p>
        <p>Here's your custom order invoice from Omega Longevity:</p>
        
        <div style="background-color: #f8f9fa; padding: 12px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 4px 0;"><strong>Order:</strong> ${order.orderNumber}</p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver' })}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px 8px; text-align: left;">Item</th>
              <th style="padding: 10px 8px; text-align: center;">Qty</th>
              <th style="padding: 10px 8px; text-align: right;">Price</th>
              <th style="padding: 10px 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div style="border-top: 2px solid #eee; padding-top: 10px; text-align: right;">
          <p style="margin: 4px 0;">Subtotal: <strong>$${subtotal.toFixed(2)}</strong></p>
          ${discount > 0 ? `<p style="margin: 4px 0; color: #16a34a;">Discount: -$${discount.toFixed(2)}</p>` : ""}
          ${shipping > 0 ? `<p style="margin: 4px 0;">Shipping: $${shipping.toFixed(2)}</p>` : ""}
          ${fee > 0 ? `<p style="margin: 4px 0;">CC Processing Fee (3.5%): $${fee.toFixed(2)}</p>` : ""}
          <p style="margin: 8px 0; font-size: 18px; font-weight: bold; color: #f97316;">Total: $${grandTotal.toFixed(2)}</p>
        </div>
        
        ${paymentSection}
        
        <p style="color: #666; font-size: 13px; margin-top: 20px;">
          If you have any questions about this invoice, please reply to this email or contact us directly.
        </p>
      </div>
      
      <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
        Omega Longevity | peptidecoach.pro
      </div>
    </div>
  `;

  await sendEmail({
    to: order.clientEmail,
    subject: `Invoice ${order.orderNumber} from Omega Longevity`,
    html,
  });
}
