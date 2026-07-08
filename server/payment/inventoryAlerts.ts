import { sql } from "drizzle-orm";
import * as db from "../db";

/**
 * Normalized result of a single inventory-line deduction. Shared across every
 * deduction path (protocol payment, custom order, store order) so they can all
 * feed the same fail-loud alerting. Matches the shape returned by
 * `deductInventoryForProtocol`.
 */
export interface InventoryDeductionResult {
  itemName: string;
  quantity: number;
  success: boolean;
  error?: string;
  wentNegative?: boolean;
  previousQuantity?: number;
  newQuantity?: number;
}

/**
 * Notify all admins + owners directly (NOT preference-gated), so inventory
 * problems can never be silently lost — the count drives fulfillment, so
 * anything off must be visible. `clientProtocolId` is optional: custom and
 * store orders have no protocol, so their notifications are filed against NULL.
 */
export async function notifyInventoryAdmins(
  title: string,
  message: string,
  clientProtocolId: number | null = null,
): Promise<void> {
  const database = await db.getDb();
  if (!database) return;
  const [rows] = await database.execute(
    sql`SELECT id FROM users WHERE role IN ('admin', 'owner')`,
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
 * Inspect a set of inventory deduction results and fire loud admin alerts:
 *   (a) failures / unmapped items  → "⚠️ Inventory not fully deducted"
 *   (b) backorders (stock went < 0) → "📦 Backorder — stock went negative"
 *
 * This is the single source of the fail-loud behavior for ALL deduction paths.
 * Both alerts are best-effort (they never throw back into the payment flow).
 *
 * @param subjectName short name for the alert title (e.g. the customer's name)
 * @param subjectDesc descriptive phrase for the body (e.g. "Custom order ORD-123 (Jane Doe)")
 */
export async function alertInventoryDeductions(params: {
  subjectName: string;
  subjectDesc: string;
  results: InventoryDeductionResult[] | undefined | null;
  clientProtocolId?: number | null;
}): Promise<void> {
  const list = (params.results ?? []) as InventoryDeductionResult[];
  const clientProtocolId = params.clientProtocolId ?? null;

  // (a) Hard failures + unmapped items — something couldn't deduct / isn't set up.
  const failures = list.filter(d => d && d.success === false);
  if (failures.length > 0) {
    const issues = failures
      .map(f => `${f.itemName} (x${f.quantity}): ${f.error ?? 'not deducted'}`)
      .join('; ');
    console.warn(`[InventoryAlert] ${params.subjectDesc} — deduction issues: ${issues}`);
    await notifyInventoryAdmins(
      `⚠️ Inventory not fully deducted: ${params.subjectName}`,
      `${params.subjectDesc} was paid but ${failures.length} item(s) did not deduct: ${issues}. Check stock levels / inventory mappings.`,
      clientProtocolId,
    ).catch(err => console.error('[InventoryAlert] Failure alert failed:', err));
  }

  // (b) Backorders — stock deliberately went negative (we owe the customer).
  // Loud, but DISTINCT from a failure: the deduction worked, the shelf is short.
  const backorders = list.filter(d => d && d.success === true && d.wentNegative === true);
  if (backorders.length > 0) {
    const items = backorders
      .map(b => `${b.itemName} (${b.previousQuantity}→${b.newQuantity})`)
      .join('; ');
    console.warn(`[InventoryAlert] ${params.subjectDesc} — backorder (negative stock): ${items}`);
    await notifyInventoryAdmins(
      `📦 Backorder — stock went negative: ${params.subjectName}`,
      `${params.subjectDesc}: ${backorders.length} item(s) went to negative stock (owed / backordered): ${items}. Restock or dropship to fulfill.`,
      clientProtocolId,
    ).catch(err => console.error('[InventoryAlert] Backorder alert failed:', err));
  }
}
