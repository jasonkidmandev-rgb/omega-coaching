import { Router, raw } from "express";
import Stripe from "stripe";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { getStripeSecretKey, getStripeWebhookSecret } from "./stripeConfig";

// Helper to get db with null check
async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}
import { sendTransformationPaymentConfirmationEmail, sendTransformationPaymentAdminNotification } from "../emailService";

// MySQL prepared statements do not support ? parameters in the SELECT list of
// an INSERT...SELECT statement. Fetch admin IDs first, then insert with VALUES.
// type must be a valid notifications enum value (see drizzle/schema.ts).
async function notifyAdmins(
  database: Awaited<ReturnType<typeof db>>,
  type: string,
  title: string,
  message: string
) {
  const [rows] = await database.execute(sql`
    SELECT id FROM users WHERE role IN ('admin', 'owner')
  `);
  const adminIds = (rows as any[]).map((r: any) => r.id as number);
  for (const userId of adminIds) {
    await database.execute(sql`
      INSERT INTO notifications (userId, type, title, message, createdAt)
      VALUES (${userId}, ${type}, ${title}, ${message}, NOW())
    `);
  }
}

const stripeWebhookRouter = Router();

// Use raw body for signature verification
stripeWebhookRouter.post(
  "/",
  raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = new Stripe(getStripeSecretKey(), {
      apiVersion: "2024-06-20" as any,
    });

    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = getStripeWebhookSecret();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle test events
    if (event.id.startsWith("evt_test_")) {
      console.log("[Stripe Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutCompleted(session);
          break;
        }
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(`[Stripe Webhook] Payment intent succeeded: ${paymentIntent.id}`);
          break;
        }
        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (err: any) {
      console.error(`[Stripe Webhook] Error processing event ${event.type}: ${err.message}`);
      // Still return 200 to prevent Stripe from retrying
    }

    res.json({ received: true });
  }
);

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const orderType = metadata.order_type || 'transformation';
  const paymentIntentId = session.payment_intent as string;
  const amountTotal = session.amount_total ? session.amount_total / 100 : 0;

  console.log(`[Stripe Webhook] Checkout completed - type: ${orderType}, amount: $${amountTotal}`);

  // Route to appropriate handler based on order type
  if (orderType === 'store') {
    await handleStoreOrderCompleted(session, metadata, paymentIntentId, amountTotal);
    return;
  }

  if (orderType === 'custom_order') {
    await handleCustomOrderCompleted(session, metadata, paymentIntentId, amountTotal);
    return;
  }

  // Default: transformation enrollment payment
  const enrollmentId = metadata.enrollment_id ? parseInt(metadata.enrollment_id) : null;
  const userId = metadata.user_id ? parseInt(metadata.user_id) : null;
  const tier = metadata.tier || "";
  const planName = metadata.plan_name || "";
  const clientName = metadata.customer_name || session.customer_details?.name || "Unknown";
  const clientEmail = metadata.customer_email || session.customer_details?.email || "";

  if (!enrollmentId) {
    console.error("[Stripe Webhook] No enrollment_id in session metadata");
    return;
  }

  const database = await db();

  // Update enrollment with payment info
  await database.execute(sql`
    UPDATE transformation_enrollments
    SET coachingFeePaid = TRUE,
        coachingFeePaidAt = NOW(),
        coachingFeeAmount = ${amountTotal},
        coachingFeeStripePaymentId = ${paymentIntentId},
        status = CASE
          WHEN status = 'enrolled' OR status = 'video_complete' THEN 'coaching_paid'
          ELSE status
        END
    WHERE id = ${enrollmentId}
  `);

  console.log(`[Stripe Webhook] Updated enrollment ${enrollmentId} - payment confirmed`);

  // Record promo code usage if one was applied (server-side, reliable)
  const promoCodeId = metadata.promo_code_id ? parseInt(metadata.promo_code_id) : null;
  const promoCode = metadata.promo_code || null;
  const promoOriginalAmount = metadata.promo_original_amount ? parseFloat(metadata.promo_original_amount) : null;
  const promoDiscountAmount = metadata.promo_discount_amount ? parseFloat(metadata.promo_discount_amount) : null;

  if (promoCodeId && promoCodeId > 0) {
    try {
      const existingUsage = await database.execute(sql`
        SELECT id FROM promo_code_usage
        WHERE promoCodeId = ${promoCodeId} AND enrollmentId = ${enrollmentId}
        LIMIT 1
      `);
      const existingRows = (existingUsage[0] as unknown as any[]) || [];

      if (existingRows.length === 0) {
        await database.execute(sql`
          INSERT INTO promo_code_usage (promoCodeId, enrollmentId, userId, originalAmount, discountAmount, finalAmount, tier)
          VALUES (${promoCodeId}, ${enrollmentId}, ${userId || null}, ${promoOriginalAmount || amountTotal}, ${promoDiscountAmount || 0}, ${amountTotal}, ${tier})
        `);
        await database.execute(sql`
          UPDATE promo_codes SET usesCount = usesCount + 1 WHERE id = ${promoCodeId}
        `);
        console.log(`[Stripe Webhook] Recorded promo code usage: code=${promoCode}, id=${promoCodeId}, enrollment=${enrollmentId}`);
      } else {
        console.log(`[Stripe Webhook] Promo code usage already recorded for enrollment ${enrollmentId}`);
      }
    } catch (err: any) {
      console.error(`[Stripe Webhook] Failed to record promo code usage: ${err.message}`);
    }
  }

  const baseUrl = session.success_url?.split("/transformation")[0] || process.env.VITE_APP_URL || "";

  // Send confirmation email to client
  try {
    if (!clientEmail) {
      console.warn(`[Stripe Webhook] No client email for enrollment ${enrollmentId} — skipping confirmation email`);
    } else {
      await sendTransformationPaymentConfirmationEmail({
        to: clientEmail,
        clientName,
        tier,
        amount: amountTotal,
        paymentMethod: "Stripe",
        baseUrl,
        enrollmentId,
      });
    }
  } catch (err: any) {
    console.error(`[Stripe Webhook] Failed to send client confirmation email: ${err.message}`);
  }

  // Send admin email notification
  try {
    await sendTransformationPaymentAdminNotification({
      clientName,
      clientEmail,
      tier,
      amount: amountTotal,
      paymentMethod: "Stripe",
      baseUrl,
    });
  } catch (err: any) {
    console.error(`[Stripe Webhook] Failed to send admin notification: ${err.message}`);
  }

  // Create in-app notification for admins
  try {
    await notifyAdmins(
      database,
      'payment_received',
      `💰 Payment Received: ${clientName}`,
      `${clientName} paid $${amountTotal.toFixed(2)} for ${planName || tier} via Stripe`
    );
  } catch (err: any) {
    console.error(`[Stripe Webhook] Failed to create admin notifications: ${err.message}`);
  }
}

// Handle store order payment completion
async function handleStoreOrderCompleted(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>,
  paymentIntentId: string,
  amountTotal: number
) {
  const orderId = metadata.store_order_id ? parseInt(metadata.store_order_id) : null;
  const userId = metadata.user_id ? parseInt(metadata.user_id) : null;
  const userEmail = metadata.user_email || session.customer_details?.email || '';
  const itemCount = metadata.item_count || '0';

  console.log(`[Stripe Webhook] Store order paid - orderId: ${orderId}, user: ${userId} (${userEmail}), ${itemCount} items, $${amountTotal}`);

  const database = await db();

  // Update the pending store order to paid
  if (orderId) {
    try {
      await database.execute(sql`
        UPDATE store_orders
        SET status = 'paid',
            paidAt = NOW(),
            stripePaymentIntentId = ${paymentIntentId},
            payerEmail = COALESCE(payerEmail, ${userEmail}),
            updatedAt = NOW()
        WHERE id = ${orderId} AND status = 'pending'
      `);
      console.log(`[Stripe Webhook] Store order ${orderId} marked as paid`);
    } catch (err: any) {
      console.error(`[Stripe Webhook] Failed to update store order ${orderId} status: ${err.message}`);
    }

    // Deduct inventory and sync client inventory
    if (userId) {
      try {
        const { deductInventoryForStoreOrder, syncClientInventoryFromStoreOrder } = await import('../db');
        await deductInventoryForStoreOrder(orderId, userId);
        await syncClientInventoryFromStoreOrder(orderId, userId);
        console.log(`[Stripe Webhook] Inventory deducted and synced for store order ${orderId}`);
      } catch (err: any) {
        console.error(`[Stripe Webhook] Failed to deduct inventory for store order ${orderId}: ${err.message}`);
      }
    }

    // Send confirmation email
    try {
      const { sendStoreOrderConfirmationEmail } = await import('../payment/emailService');
      const { getStoreOrder, getStoreOrderItems, getUserById } = await import('../db');
      const order = await getStoreOrder(orderId);
      const items = await getStoreOrderItems(orderId);
      const user = userId ? await getUserById(userId) : null;
      const customerEmail = user?.email || userEmail;
      const customerName = user?.name || order?.payerName || 'Customer';
      if (customerEmail) {
        await sendStoreOrderConfirmationEmail({
          customerName,
          customerEmail,
          orderId,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            isDiscountable: item.isDiscountable,
          })),
          subtotal: order?.subtotal || amountTotal.toFixed(2),
          discountAmount: order?.discountAmount || '0.00',
          shippingFee: order?.shippingFee?.toString() || '0.00',
          total: order?.total || amountTotal.toFixed(2),
          paymentMethod: 'stripe',
          orderDate: order?.createdAt ? new Date(order.createdAt) : new Date(),
        });
        console.log(`[Stripe Webhook] Confirmation email sent for store order ${orderId}`);
      }
    } catch (err: any) {
      console.error(`[Stripe Webhook] Failed to send store order confirmation email: ${err.message}`);
    }

    // Create packing slip for fulfillment
    try {
      const { createPackingSlipForStoreOrder } = await import('../db');
      await createPackingSlipForStoreOrder(orderId);
      console.log(`[Stripe Webhook] Packing slip created for store order ${orderId}`);
    } catch (err: any) {
      console.error(`[Stripe Webhook] Failed to create packing slip (non-critical): ${err.message}`);
    }
  }

  // Create admin in-app notification
  try {
    await notifyAdmins(
      database,
      'new_store_order',
      `🛒 Store Payment: ${userEmail}`,
      `Store order ${orderId ? '#' + orderId : ''} paid via Stripe - $${amountTotal.toFixed(2)} (${itemCount} items) - Payment: ${paymentIntentId}`
    );
  } catch (err: any) {
    console.error(`[Stripe Webhook] Failed to create store order notification: ${err.message}`);
  }
}

// Handle custom order payment completion
async function handleCustomOrderCompleted(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>,
  paymentIntentId: string,
  amountTotal: number
) {
  const orderId = metadata.order_id ? parseInt(metadata.order_id) : null;
  const orderNumber = metadata.order_number || '';
  const clientName = metadata.customer_name || session.customer_details?.name || 'Unknown';
  const clientEmail = metadata.customer_email || session.customer_details?.email || '';

  console.log(`[Stripe Webhook] Custom order ${orderNumber} paid by ${clientName}, $${amountTotal}`);

  if (!orderId) {
    console.error("[Stripe Webhook] No order_id in custom order session metadata");
    return;
  }

  const database = await db();

  // Update custom order status to paid
  try {
    await database.execute(sql`
      UPDATE custom_orders
      SET status = 'paid',
          paidAt = NOW(),
          stripePaymentIntentId = ${paymentIntentId},
          paidAmount = ${amountTotal}
      WHERE id = ${orderId}
    `);
    console.log(`[Stripe Webhook] Custom order ${orderNumber} marked as paid`);
  } catch (err: any) {
    console.error(`[Stripe Webhook] Failed to update custom order status: ${err.message}`);
  }

  // Create admin in-app notification
  try {
    await notifyAdmins(
      database,
      'payment_received',
      `💰 Custom Order Paid: ${orderNumber}`,
      `${clientName} (${clientEmail}) paid $${amountTotal.toFixed(2)} for custom order ${orderNumber} via Stripe`
    );
  } catch (err: any) {
    console.error(`[Stripe Webhook] Failed to create custom order notification: ${err.message}`);
  }
}

export default stripeWebhookRouter;
