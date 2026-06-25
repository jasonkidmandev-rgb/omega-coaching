/**
 * Payment Ledger — the unified "logbook" + settlement seam.
 *
 * One place that records every payment (any funnel, any method) and runs a single
 * idempotent fulfillment pipeline when a payment settles. This makes Stripe and
 * manual (Venmo/PayPal/etc.) interchangeable, and lets the app fail over from one
 * to the other via a single `payment_mode` flag.
 *
 * See docs/design/2026-06-25-payment-layer-architecture.md
 *
 * Status: foundation (additive). The funnels, Stripe webhook, and admin actions
 * are wired to call these in later increments — Fork 3 routes protocol +
 * coaching_plan first; custom_order + store keep their existing flows until migrated.
 */
import { sql, eq } from "drizzle-orm";
import { getDb, getSiteSetting } from "../db";
import { payments } from "../../drizzle/schema";
import { processProtocolPaymentReceived } from "./paymentService";

export type PaymentEntityType = 'protocol' | 'coaching_plan' | 'custom_order' | 'store_order';
export type PaymentMethod = 'stripe' | 'venmo' | 'paypal' | 'zelle' | 'cash' | 'check' | 'other';
export type PaymentMode = 'stripe' | 'manual' | 'both';

type PaymentRow = typeof payments.$inferSelect;

// ── Failover control plane ─────────────────────────────────────────────────

/** Which settlement methods the app should offer. Defaults to 'both'. */
export async function getPaymentMode(): Promise<PaymentMode> {
  const v = await getSiteSetting('payment_mode');
  return v === 'stripe' || v === 'manual' ? v : 'both';
}

/** True if the given method family is currently enabled by payment_mode. */
export async function isMethodEnabled(family: 'stripe' | 'manual'): Promise<boolean> {
  const mode = await getPaymentMode();
  return mode === 'both' || mode === family;
}

// ── Ledger writes ──────────────────────────────────────────────────────────

export interface RecordPaymentInput {
  entityType: PaymentEntityType;
  entityId: number;
  amountCents: number;
  customerId?: number | null;
  customerEmail?: string | null;
  customerName?: string | null;
  processorLabel?: string | null;
  method?: PaymentMethod | null;
  externalRef?: string | null;
  status?: 'open' | 'awaiting_confirmation' | 'paid';
  settledBy?: number | null;
  notes?: string | null;
}

/** Record an owed (or already-settled) payment. Returns the ledger row id. */
export async function recordPayment(input: RecordPaymentInput): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const status = input.status ?? 'open';
  const settledAt = status === 'paid'
    ? new Date().toISOString().slice(0, 19).replace('T', ' ')
    : null;
  const result: any = await db.insert(payments).values({
    entityType: input.entityType,
    entityId: input.entityId,
    amountCents: input.amountCents,
    customerId: input.customerId ?? null,
    customerEmail: input.customerEmail ?? null,
    customerName: input.customerName ?? null,
    processorLabel: input.processorLabel ?? null,
    method: input.method ?? null,
    externalRef: input.externalRef ?? null,
    status,
    settledAt,
    settledBy: input.settledBy ?? null,
    notes: input.notes ?? null,
  });
  const insertId = Number(result?.insertId ?? result?.[0]?.insertId);
  return Number.isFinite(insertId) ? insertId : null;
}

// ── Settlement ─────────────────────────────────────────────────────────────

export interface SettlementInfo {
  method: PaymentMethod;
  externalRef?: string | null;
  settledBy?: number | null;
  grossAmount?: string;
  feeAmount?: string;
  netAmount?: string;
  transactionId?: string;
  notes?: string;
  baseUrl?: string;
}

async function getPaymentById(id: number): Promise<PaymentRow | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return rows[0] ?? null;
}

async function getPaymentByExternalRef(ref: string): Promise<PaymentRow | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(payments).where(eq(payments.externalRef, ref)).limit(1);
  return rows[0] ?? null;
}

/**
 * Mark a ledger row paid and run fulfillment. Idempotent: a row already 'paid'
 * is a no-op, and the underlying `processProtocolPaymentReceived` is itself
 * idempotent, so duplicate Stripe webhooks / double-clicks are safe.
 */
export async function settlePayment(payment: PaymentRow, info: SettlementInfo): Promise<{ alreadyPaid: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (payment.status === 'paid') {
    return { alreadyPaid: true };
  }

  const settledAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db.update(payments)
    .set({
      status: 'paid',
      method: info.method,
      externalRef: info.externalRef ?? payment.externalRef,
      settledAt,
      settledBy: info.settledBy ?? null,
      notes: info.notes ?? payment.notes,
    })
    .where(eq(payments.id, payment.id));

  await onPaid(payment, info);
  return { alreadyPaid: false };
}

/** Settle by ledger id — used by the admin manual-confirmation action. */
export async function confirmPaymentById(paymentId: number, info: SettlementInfo): Promise<{ alreadyPaid: boolean }> {
  const payment = await getPaymentById(paymentId);
  if (!payment) throw new Error(`Payment ${paymentId} not found`);
  return settlePayment(payment, info);
}

/** Settle by external reference — used by the Stripe webhook (idempotent on the ref). */
export async function confirmPaymentByExternalRef(ref: string, info: SettlementInfo): Promise<{ alreadyPaid: boolean } | null> {
  const payment = await getPaymentByExternalRef(ref);
  if (!payment) return null;
  return settlePayment(payment, info);
}

// ── Fulfillment dispatch ───────────────────────────────────────────────────

async function onPaid(payment: PaymentRow, info: SettlementInfo): Promise<void> {
  switch (payment.entityType) {
    case 'protocol':
    case 'coaching_plan': {
      // protocol: entityId is the clientProtocolId.
      // coaching_plan: entityId is the enrollmentId; provision its linked protocol.
      const clientProtocolId = payment.entityType === 'protocol'
        ? payment.entityId
        : await resolveProtocolIdFromEnrollment(payment.entityId);
      if (!clientProtocolId) {
        console.warn(`[PaymentLedger] No clientProtocolId for ${payment.entityType} payment ${payment.id} — fulfillment skipped`);
        return;
      }
      await processProtocolPaymentReceived(clientProtocolId, info.method as any, {
        grossAmount: info.grossAmount,
        feeAmount: info.feeAmount,
        netAmount: info.netAmount,
        transactionId: info.transactionId ?? info.externalRef ?? undefined,
        notes: info.notes,
        performedBy: info.settledBy ?? undefined,
        baseUrl: info.baseUrl,
      });
      return;
    }
    case 'custom_order':
    case 'store_order':
      // Fork 3: not yet routed through the ledger — their existing handlers still
      // run fulfillment. The ledger row is recorded for the unified money view.
      console.log(`[PaymentLedger] ${payment.entityType} payment ${payment.id} recorded; fulfillment still handled by its own flow (not yet migrated)`);
      return;
  }
}

async function resolveProtocolIdFromEnrollment(enrollmentId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [rows] = await db.execute(
    sql`SELECT clientProtocolId FROM transformation_enrollments WHERE id = ${enrollmentId} LIMIT 1`
  );
  const row = (rows as any[])?.[0];
  return row?.clientProtocolId ?? null;
}
