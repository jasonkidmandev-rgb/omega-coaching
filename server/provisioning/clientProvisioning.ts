import { sql } from "drizzle-orm";
import {
  getClientProtocolByEmail,
  getDefaultTemplate,
  cloneTemplateToClientProtocol,
  generateAccessToken,
  createClientProtocol,
} from "../db";
import { findOrCreateContact } from "../contacts/contactService";

/**
 * Shared client-provisioning helpers.
 * Extracted from transformationRouter so every onboarding source
 * (in-app funnel, external purchase webhooks, admin manual flow)
 * creates clients and protocols through the same code path.
 */

// Helper to log enrollment activity
export async function logEnrollmentActivity(
  database: any,
  enrollmentId: number,
  action: string,
  details: any,
  performedBy?: string,
  performedByUserId?: number
) {
  try {
    await database.execute(
      sql`INSERT INTO enrollment_activity_log (enrollment_id, action, details, performed_by, performed_by_user_id) VALUES (${enrollmentId}, ${action}, ${JSON.stringify(details)}, ${performedBy || null}, ${performedByUserId || null})`
    );
  } catch (err) {
    console.error("[ActivityLog] Failed to log:", err);
  }
}

// Ensure the canonical CONTACT exists for an enrollment, ensure a client_protocol
// exists, and link the enrollment to both. Identity is keyed on verified email via
// `contacts` (the legacy `clients` table and `client_protocols.clientId` are no
// longer written — contactId is canonical). Shipping is persisted on the protocol
// (the fulfillment record), replacing the old clients.shipping write.
export async function autoCreateOrLinkClient(
  database: any,
  enrollmentId: number,
  email: string,
  name: string | null | undefined,
  extra?: { phone?: string | null; shippingStreet?: string | null; shippingCity?: string | null; shippingState?: string | null; shippingZip?: string | null }
): Promise<{ contactId: number; clientProtocolId: number; action: 'created' | 'linked' | 'skipped' }> {
  try {
    if (!email) return { contactId: 0, clientProtocolId: 0, action: 'skipped' };

    // Helper to treat 'NULL' strings as actual null
    const clean = (v: string | null | undefined) => (v && v !== 'NULL' && v !== '') ? v : null;
    const phone = clean(extra?.phone);
    const street = clean(extra?.shippingStreet);
    const city = clean(extra?.shippingCity);
    const state = clean(extra?.shippingState);
    const zip = clean(extra?.shippingZip);

    // 1. Canonical contact (verified email). Creating a protocol promotes to
    //    active_client. findOrCreateContact auto-links ONLY on exact email.
    const contact = await findOrCreateContact({
      fullName: name || undefined,
      email,
      phone,
      source: 'coaching_onboarding',
      lifecycleStage: 'active_client',
    });
    const contactId = contact.id;
    const action: 'created' | 'linked' = contact.isNew ? 'created' : 'linked';

    // 2. Ensure a client_protocol exists (contactId is set at creation).
    let clientProtocolId = 0;
    try {
      const existingProtocol = await getClientProtocolByEmail(email);
      if (existingProtocol) {
        clientProtocolId = existingProtocol.id;
        // Point the protocol at the canonical contact if not already.
        if (!existingProtocol.contactId) {
          await database.execute(sql`
            UPDATE client_protocols SET contactId = ${contactId} WHERE id = ${clientProtocolId}
          `);
        }
      } else {
        const defaultTemplate = await getDefaultTemplate();
        if (defaultTemplate) {
          clientProtocolId = await cloneTemplateToClientProtocol(
            defaultTemplate.id,
            name || 'New Enrollment',
            email
          );
        } else {
          const accessToken = generateAccessToken();
          clientProtocolId = await createClientProtocol({
            clientName: name || 'New Enrollment',
            clientEmail: email,
            accessToken,
            status: 'draft',
          });
        }
        // contactId is set by createClientProtocol -> findOrCreateContact.
      }
    } catch (protocolErr) {
      console.error('[autoCreateOrLinkClient] Failed to create/link client_protocol:', protocolErr);
    }

    // 3. Persist shipping/phone on the protocol (fulfillment record). COALESCE so
    //    we never clobber values already captured at checkout.
    if (clientProtocolId > 0 && (phone || street || city || state || zip)) {
      await database.execute(sql`
        UPDATE client_protocols
        SET clientPhone    = COALESCE(NULLIF(clientPhone, ''), ${phone}),
            shippingName   = COALESCE(NULLIF(shippingName, ''), ${name || null}),
            shippingStreet = COALESCE(NULLIF(shippingStreet, ''), ${street}),
            shippingCity   = COALESCE(NULLIF(shippingCity, ''), ${city}),
            shippingState  = COALESCE(NULLIF(shippingState, ''), ${state}),
            shippingZip    = COALESCE(NULLIF(shippingZip, ''), ${zip}),
            shippingPhone  = COALESCE(NULLIF(shippingPhone, ''), ${phone})
        WHERE id = ${clientProtocolId}
      `);
    }

    // 4. Link the enrollment to the contact + protocol.
    if (clientProtocolId > 0) {
      await database.execute(sql`
        UPDATE transformation_enrollments
        SET contactId = ${contactId}, clientProtocolId = ${clientProtocolId}, updatedAt = NOW()
        WHERE id = ${enrollmentId}
      `);
    } else {
      await database.execute(sql`
        UPDATE transformation_enrollments
        SET contactId = ${contactId}, updatedAt = NOW()
        WHERE id = ${enrollmentId}
      `);
    }

    console.log(`[autoCreateOrLinkClient] ${action} contact ${contactId}, protocol ${clientProtocolId} for enrollment ${enrollmentId} (${email})`);
    return { contactId, clientProtocolId, action };
  } catch (err) {
    console.error('[autoCreateOrLinkClient] Failed:', err);
    return { contactId: 0, clientProtocolId: 0, action: 'skipped' };
  }
}
