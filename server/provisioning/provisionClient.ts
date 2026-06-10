import { sql } from "drizzle-orm";
import { getDb, getClientProtocolByEmail, cloneTemplateToClientProtocol } from "../db";
import { processProtocolPaymentReceived } from "../payment/paymentService";
import { sendTransformationPaymentAdminNotification } from "../emailService";
import { autoCreateOrLinkClient, logEnrollmentActivity } from "./clientProvisioning";

/**
 * Canonical provisioning service: every onboarding source converges here.
 *
 * Sources today:
 *  - omegalongevity.com purchase webhook (server/integrations/omegalongevity)
 *  - (future) in-app transformation funnel, admin manual enrollment
 *
 * Given a paid purchase, this: finds/creates the enrollment, creates/links
 * the client record, creates the protocol from the mapped template (if any),
 * marks payment received, and fires the full downstream chain (inventory,
 * packing slip, emails, notifications) via processProtocolPaymentReceived.
 *
 * Idempotent at two levels: enrollment dedup by email, and
 * processProtocolPaymentReceived skips already-paid protocols.
 */

export interface ProvisionPurchaseInput {
  source: string; // e.g. 'omegalongevity'
  email: string;
  name?: string | null;
  phone?: string | null;
  shipping?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
  };
  /** Resolved from external_product_mappings by the caller */
  protocolTemplateId?: number | null;
  tier?: string | null;
  programType?: string | null;
  productName?: string | null;
  payment: {
    amount: number;
    transactionId?: string | null;
    /** external reference, e.g. the partner's event ID */
    reference?: string | null;
  };
}

export interface ProvisionPurchaseResult {
  enrollmentId: number;
  clientId: number;
  clientProtocolId: number | null;
  packingSlipId: number | null;
  createdNewEnrollment: boolean;
  protocolAlreadyPaid: boolean;
}

async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

async function notifyAdmins(database: Awaited<ReturnType<typeof db>>, type: string, title: string, message: string) {
  const [rows] = await database.execute(sql`
    SELECT id FROM users WHERE role IN ('admin', 'owner')
  `);
  const adminIds = ((rows as unknown) as any[]).map((r: any) => r.id as number);
  for (const userId of adminIds) {
    await database.execute(sql`
      INSERT INTO notifications (userId, type, title, message, createdAt)
      VALUES (${userId}, ${type}, ${title}, ${message}, NOW())
    `);
  }
}

export async function provisionPurchase(input: ProvisionPurchaseInput): Promise<ProvisionPurchaseResult> {
  const database = await db();
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;
  const tier = input.tier || 'flagship';
  const programType = input.programType || '90_day_transformation';
  const amount = input.payment.amount;

  // 1. Find an active enrollment for this email, or create one
  const [existingRows] = await database.execute(sql`
    SELECT id, status FROM transformation_enrollments
    WHERE LOWER(email) = ${email}
      AND status NOT IN ('completed', 'renewed')
    ORDER BY createdAt DESC
    LIMIT 1
  `);
  const existing = ((existingRows as unknown) as any[])[0];

  let enrollmentId: number;
  let createdNewEnrollment = false;
  if (existing) {
    enrollmentId = existing.id;
    console.log(`[Provisioning] Reusing active enrollment ${enrollmentId} for ${email}`);
  } else {
    const [result] = await database.execute(sql`
      INSERT INTO transformation_enrollments (userId, clientName, email, programType, tier, status)
      VALUES (NULL, ${name}, ${email}, ${programType}, ${tier}, 'enrolled')
    `);
    enrollmentId = (result as any).insertId;
    createdNewEnrollment = true;
    console.log(`[Provisioning] Created enrollment ${enrollmentId} for ${email} (source: ${input.source})`);
  }

  // 2. If the purchase maps to a specific protocol template, make sure a
  //    protocol from THAT template exists before autoCreateOrLinkClient
  //    falls back to the default template.
  let mappedProtocolId: number | null = null;
  if (input.protocolTemplateId) {
    const existingProtocol = await getClientProtocolByEmail(email);
    if (
      existingProtocol &&
      existingProtocol.templateId === input.protocolTemplateId &&
      existingProtocol.paymentStatus !== 'paid'
    ) {
      // Unpaid protocol from the same template already exists — reuse it
      mappedProtocolId = existingProtocol.id;
    } else {
      mappedProtocolId = await cloneTemplateToClientProtocol(
        input.protocolTemplateId,
        name || 'New Enrollment',
        email
      );
      console.log(`[Provisioning] Created protocol ${mappedProtocolId} from template ${input.protocolTemplateId} for ${email}`);
    }
  }

  // 3. Create/link the client record (also links enrollment <-> client <-> protocol)
  const { clientId } = await autoCreateOrLinkClient(database, enrollmentId, email, name, {
    phone: input.phone ?? null,
    shippingStreet: input.shipping?.street ?? null,
    shippingCity: input.shipping?.city ?? null,
    shippingState: input.shipping?.state ?? null,
    shippingZip: input.shipping?.zip ?? null,
  });

  // If we created a protocol from a mapped template, make sure the enrollment
  // points at it (autoCreateOrLinkClient may have linked an older protocol).
  if (mappedProtocolId) {
    await database.execute(sql`
      UPDATE transformation_enrollments
      SET clientProtocolId = ${mappedProtocolId}, updatedAt = NOW()
      WHERE id = ${enrollmentId}
    `);
    if (clientId > 0) {
      await database.execute(sql`
        UPDATE client_protocols SET clientId = ${clientId} WHERE id = ${mappedProtocolId} AND (clientId IS NULL OR clientId = 0)
      `);
    }
  }

  // 4. Mark the enrollment's fee as paid (same shape as the Stripe webhook flow)
  await database.execute(sql`
    UPDATE transformation_enrollments
    SET coachingFeePaid = TRUE,
        coachingFeePaidAt = NOW(),
        coachingFeeAmount = ${amount},
        coachingFeeStripePaymentId = ${input.payment.transactionId ?? null},
        status = CASE
          WHEN status = 'enrolled' OR status = 'video_complete' THEN 'coaching_paid'
          ELSE status
        END
    WHERE id = ${enrollmentId}
  `);

  // 5. Run the full payment chain on the mapped protocol (inventory, packing
  //    slip, emails, notifications). Coaching-only packages (no template
  //    mapping) skip this — the coach designs the protocol later.
  let packingSlipId: number | null = null;
  let protocolAlreadyPaid = false;
  if (mappedProtocolId) {
    const baseUrl = process.env.VITE_APP_URL || '';
    const result = await processProtocolPaymentReceived(mappedProtocolId, 'stripe', {
      grossAmount: amount.toFixed(2),
      transactionId: input.payment.transactionId ?? undefined,
      notes: `External purchase via ${input.source}${input.productName ? ` — ${input.productName}` : ''}${input.payment.reference ? ` (ref: ${input.payment.reference})` : ''}`,
      performedBy: null,
      baseUrl,
    });
    packingSlipId = result.packingSlipId;
    protocolAlreadyPaid = result.alreadyPaid;
  }

  // 6. Activity log on the enrollment
  await logEnrollmentActivity(database, enrollmentId, 'external_purchase_provisioned', {
    source: input.source,
    productName: input.productName ?? null,
    amount,
    transactionId: input.payment.transactionId ?? null,
    protocolTemplateId: input.protocolTemplateId ?? null,
    clientProtocolId: mappedProtocolId,
    createdNewEnrollment,
  }, input.source);

  // 7. Notify admins (in-app + email)
  const displayName = name || email;
  try {
    await notifyAdmins(
      database,
      'payment_received',
      `💰 ${input.source} Purchase: ${displayName}`,
      `${displayName} purchased ${input.productName || tier} ($${amount.toFixed(2)}) on ${input.source}${mappedProtocolId ? ` — protocol #${mappedProtocolId} provisioned` : ' — coaching package, protocol to be designed'}`
    );
  } catch (err: any) {
    console.error(`[Provisioning] Failed to create admin notifications: ${err.message}`);
  }
  try {
    await sendTransformationPaymentAdminNotification({
      clientName: displayName,
      clientEmail: email,
      tier: (input.productName || tier) as any,
      amount,
      paymentMethod: `Stripe (${input.source})`,
      baseUrl: process.env.VITE_APP_URL || '',
    });
  } catch (err: any) {
    console.error(`[Provisioning] Failed to send admin email: ${err.message}`);
  }

  return {
    enrollmentId,
    clientId,
    clientProtocolId: mappedProtocolId,
    packingSlipId,
    createdNewEnrollment,
    protocolAlreadyPaid,
  };
}
