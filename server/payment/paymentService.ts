import { sql } from "drizzle-orm";
import * as db from "../db";
import { paymentEvents } from "../../drizzle/schema";
import { sendPaymentStatusNotification } from "../emailService";

export type PaymentMethodInput = 'venmo' | 'cc' | 'stripe' | 'other' | 'paypal';

// Maps payment method to DB-safe value for client_protocols.paymentMethod
// (after migration 0114, 'stripe' is a valid enum value)
const toDbPaymentMethod = (m: PaymentMethodInput): 'venmo' | 'cc' | 'stripe' | 'other' | 'paypal' => m;

export interface ProcessPaymentOptions {
  grossAmount?: string;
  feeAmount?: string;
  netAmount?: string;
  transactionId?: string;
  notes?: string;
  /** null = system/webhook action */
  performedBy?: number | null;
  baseUrl?: string;
}

export interface ProcessPaymentResult {
  /** true if the protocol was already paid — no duplicate processing done */
  alreadyPaid: boolean;
  packingSlipId: number | null;
}

/**
 * Notify all admins + owners directly (not preference-gated), so inventory
 * problems are never silently lost — the count drives fulfillment, so anything
 * off must be visible.
 */
async function notifyAdmins(title: string, message: string, clientProtocolId: number): Promise<void> {
  const database = await db.getDb();
  if (!database) return;
  const [rows] = await database.execute(
    sql`SELECT id FROM users WHERE role IN ('admin', 'owner')`
  );
  const adminIds = ((rows as unknown) as any[]).map((r: any) => r.id as number);
  for (const userId of adminIds) {
    await database.execute(sql`
      INSERT INTO notifications (userId, type, title, message, clientProtocolId, createdAt)
      VALUES (${userId}, 'other', ${title}, ${message}, ${clientProtocolId}, NOW())
    `);
  }
}

/**
 * Central function for recording a protocol payment as received.
 * Both the Stripe webhook and the admin manual-payment flow call this.
 * Idempotent: if the protocol is already paid it returns early without
 * creating duplicate events, packing slips, or inventory deductions.
 */
export async function processProtocolPaymentReceived(
  clientProtocolId: number,
  paymentMethod: PaymentMethodInput,
  options: ProcessPaymentOptions = {}
): Promise<ProcessPaymentResult> {
  const protocol = await db.getClientProtocolById(clientProtocolId);
  if (!protocol) throw new Error(`Protocol ${clientProtocolId} not found`);

  // Idempotency guard — already paid, do nothing
  if (protocol.paymentStatus === 'paid') {
    console.log(`[PaymentService] Protocol ${clientProtocolId} already paid — skipping duplicate processing`);
    return { alreadyPaid: true, packingSlipId: null };
  }

  // 1. Mark protocol paid + activate
  await db.updateClientProtocolPaymentStatus(
    clientProtocolId.toString(),
    'paid',
    toDbPaymentMethod(paymentMethod)
  );
  console.log(`[PaymentService] Protocol ${clientProtocolId} marked paid (${paymentMethod})`);

  // 2. Audit trail — insert payment_received event
  const database = await db.getDb();
  if (database) {
    try {
      await database.insert(paymentEvents).values({
        clientProtocolId,
        eventType: 'payment_received',
        grossAmount: options.grossAmount ?? null,
        feeAmount: options.feeAmount ?? null,
        netAmount: options.netAmount ?? null,
        amount: options.grossAmount ?? null,
        paymentMethod,           // varchar(50) — no enum restriction, 'stripe' is fine here
        transactionId: options.transactionId ?? null,
        notes: options.notes ?? null,
        performedBy: options.performedBy ?? null,
      });
      console.log(`[PaymentService] Payment event logged for protocol ${clientProtocolId}`);
    } catch (e) {
      console.error('[PaymentService] Failed to log payment event:', e);
    }
  }

  // 3. Inventory deduction — fail LOUD: deduction problems AND backorders must
  // alert admins, not pass silently. Payment itself stays unaffected (best-effort).
  try {
    const deductions = await db.deductInventoryForProtocol(clientProtocolId, options.performedBy ?? 0);
    const list = (deductions ?? []) as any[];

    // (a) Hard failures + unmapped items — something couldn't deduct / isn't set up.
    const failures = list.filter(d => d && d.success === false);
    if (failures.length > 0) {
      const issues = failures.map(f => `${f.itemName} (x${f.quantity}): ${f.error ?? 'not deducted'}`).join('; ');
      console.warn(`[PaymentService] Inventory issues for protocol ${clientProtocolId}: ${issues}`);
      await notifyAdmins(
        `⚠️ Inventory not fully deducted: ${protocol.clientName}`,
        `Protocol #${clientProtocolId} (${protocol.clientName}) was paid but ${failures.length} item(s) did not deduct: ${issues}. Check stock levels / inventory mappings.`,
        clientProtocolId
      ).catch(err => console.error('[PaymentService] Inventory alert failed:', err));
    }

    // (b) Backorders — stock deliberately went negative (we owe the customer).
    // Loud, but DISTINCT from a failure: the deduction worked, the shelf is short.
    const backorders = list.filter(d => d && d.success === true && d.wentNegative === true);
    if (backorders.length > 0) {
      const items = backorders.map(b => `${b.itemName} (${b.previousQuantity}→${b.newQuantity})`).join('; ');
      console.warn(`[PaymentService] Backorder (negative stock) for protocol ${clientProtocolId}: ${items}`);
      await notifyAdmins(
        `📦 Backorder — stock went negative: ${protocol.clientName}`,
        `Protocol #${clientProtocolId} (${protocol.clientName}): ${backorders.length} item(s) went to negative stock (owed / backordered): ${items}. Restock or dropship to fulfill.`,
        clientProtocolId
      ).catch(err => console.error('[PaymentService] Backorder alert failed:', err));
    }

    if (failures.length === 0 && backorders.length === 0) {
      console.log(`[PaymentService] Inventory deducted for protocol ${clientProtocolId}`);
    }
  } catch (e) {
    console.error('[PaymentService] Inventory deduction threw (non-fatal to payment):', e);
    await notifyAdmins(
      `⚠️ Inventory not fully deducted: ${protocol.clientName}`,
      `Protocol #${clientProtocolId} (${protocol.clientName}) was paid but inventory deduction failed entirely: ${e instanceof Error ? e.message : 'unknown error'}. Check stock / mappings.`,
      clientProtocolId
    ).catch(err => console.error('[PaymentService] Inventory alert failed:', err));
  }

  // 4. Packing slip — createPackingSlipOnPayment already has its own idempotency check
  let packingSlipId: number | null = null;
  try {
    packingSlipId = await db.createPackingSlipOnPayment(clientProtocolId);
    if (packingSlipId) {
      await db.createNotificationsForEnabledUsers(
        'packing_slip_created',
        `Packing slip created for ${protocol.clientName}`,
        `A new packing slip has been created for ${protocol.clientName} with items ready for fulfillment.`,
        clientProtocolId
      );
      console.log(`[PaymentService] Packing slip ${packingSlipId} created for protocol ${clientProtocolId}`);
    }
  } catch (e) {
    console.error('[PaymentService] Packing slip creation failed (non-fatal):', e);
  }

  // 5. In-app notification
  try {
    const source = paymentMethod === 'stripe' ? 'Stripe' : paymentMethod === 'venmo' ? 'Venmo' : 'manual';
    await db.createNotificationsForEnabledUsers(
      'payment_received',
      `Payment received for ${protocol.clientName}`,
      `${protocol.clientName}'s protocol payment confirmed via ${source}. Protocol is now active.`,
      clientProtocolId
    );
  } catch (e) {
    console.error('[PaymentService] In-app notification failed (non-fatal):', e);
  }

  // 6. Client email notification
  try {
    if (protocol.clientEmail) {
      const baseUrl = options.baseUrl || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      const protocolUrl = `${baseUrl}/protocol/${(protocol as any).accessToken}`;
      const methodLabel = paymentMethod === 'stripe' ? 'Credit Card (Stripe)' :
                          paymentMethod === 'venmo' ? 'Venmo' :
                          paymentMethod === 'cc' ? 'Credit Card' :
                          paymentMethod === 'paypal' ? 'PayPal' : 'Manual';
      await sendPaymentStatusNotification({
        to: protocol.clientEmail,
        clientName: protocol.clientName,
        status: 'paid',
        protocolName: 'Health Protocol',
        paymentMethod: methodLabel,
        notes: options.notes,
        protocolUrl,
      });
      console.log(`[PaymentService] Confirmation email sent to ${protocol.clientEmail}`);
    }
  } catch (e) {
    console.error('[PaymentService] Client email failed (non-fatal):', e);
  }

  return { alreadyPaid: false, packingSlipId };
}
