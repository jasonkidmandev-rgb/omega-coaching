import { sql } from "drizzle-orm";
import {
  getClientProtocolByEmail,
  getDefaultTemplate,
  cloneTemplateToClientProtocol,
  generateAccessToken,
  createClientProtocol,
} from "../db";

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

// Helper to auto-create or link a client record AND client_protocol for an enrollment
export async function autoCreateOrLinkClient(
  database: any,
  enrollmentId: number,
  email: string,
  name: string | null | undefined,
  extra?: { phone?: string | null; shippingStreet?: string | null; shippingCity?: string | null; shippingState?: string | null; shippingZip?: string | null }
): Promise<{ clientId: number; clientProtocolId: number; action: 'created' | 'linked' | 'skipped' }> {
  try {
    if (!email) return { clientId: 0, clientProtocolId: 0, action: 'skipped' };

    // Helper to treat 'NULL' strings as actual null
    const clean = (v: string | null | undefined) => (v && v !== 'NULL' && v !== '') ? v : null;
    const phone = clean(extra?.phone);
    const street = clean(extra?.shippingStreet);
    const city = clean(extra?.shippingCity);
    const state = clean(extra?.shippingState);
    const zip = clean(extra?.shippingZip);

    // Check if a client already exists with this email (case-insensitive)
    const existingResult = await database.execute(sql`
      SELECT id, name, phone FROM clients WHERE LOWER(email) = LOWER(${email}) LIMIT 1
    `);
    const existingClients = (existingResult[0] as unknown) as any[];

    let clientId: number;
    let action: 'created' | 'linked' | 'skipped';

    if (existingClients.length > 0) {
      clientId = existingClients[0].id;
      // Update name, phone, and shipping if client has missing data but enrollment has it
      await database.execute(sql`
        UPDATE clients
        SET name = COALESCE(NULLIF(name, ''), NULLIF(name, 'Unknown'), ${name}),
            phone = COALESCE(NULLIF(phone, ''), ${phone}),
            shippingName = COALESCE(NULLIF(shippingName, ''), ${name}),
            shippingStreet = COALESCE(NULLIF(shippingStreet, ''), ${street}),
            shippingCity = COALESCE(NULLIF(shippingCity, ''), ${city}),
            shippingState = COALESCE(NULLIF(shippingState, ''), ${state}),
            shippingZip = COALESCE(NULLIF(shippingZip, ''), ${zip}),
            shippingPhone = COALESCE(NULLIF(shippingPhone, ''), ${phone}),
            updatedAt = NOW()
        WHERE id = ${clientId}
      `);
      action = 'linked';
    } else {
      // Create new client record with all available data
      const insertResult = await database.execute(sql`
        INSERT INTO clients (name, email, phone, shippingName, shippingStreet, shippingCity, shippingState, shippingZip, shippingPhone, shippingCountry, referralSource, createdAt, updatedAt)
        VALUES (${name || 'New Enrollment'}, ${email}, ${phone}, ${name}, ${street}, ${city}, ${state}, ${zip}, ${phone}, 'USA', 'coaching_onboarding', NOW(), NOW())
      `);
      clientId = (insertResult[0] as any).insertId;
      action = 'created';
    }

    // Also ensure a client_protocol record exists (the Clients & Protocols UI depends on this)
    let clientProtocolId = 0;
    try {
      const existingProtocol = await getClientProtocolByEmail(email);
      if (existingProtocol) {
        clientProtocolId = existingProtocol.id;
        // Link protocol to client record if not already linked
        if (!existingProtocol.clientId) {
          await database.execute(sql`
            UPDATE client_protocols SET clientId = ${clientId} WHERE id = ${clientProtocolId}
          `);
        }
      } else {
        // Create a new client_protocol using the default template
        const defaultTemplate = await getDefaultTemplate();
        if (defaultTemplate) {
          clientProtocolId = await cloneTemplateToClientProtocol(
            defaultTemplate.id,
            name || 'New Enrollment',
            email
          );
        } else {
          // Fallback: create empty protocol
          const accessToken = generateAccessToken();
          clientProtocolId = await createClientProtocol({
            clientName: name || 'New Enrollment',
            clientEmail: email,
            accessToken,
            status: 'draft',
          });
        }
        // Link the new protocol to the client record
        await database.execute(sql`
          UPDATE client_protocols SET clientId = ${clientId} WHERE id = ${clientProtocolId}
        `);
      }
    } catch (protocolErr) {
      console.error('[autoCreateOrLinkClient] Failed to create/link client_protocol:', protocolErr);
    }

    // Link enrollment to client and client_protocol
    if (clientProtocolId > 0) {
      await database.execute(sql`
        UPDATE transformation_enrollments
        SET clientId = ${clientId}, clientProtocolId = ${clientProtocolId}, updatedAt = NOW()
        WHERE id = ${enrollmentId}
      `);
    } else {
      await database.execute(sql`
        UPDATE transformation_enrollments
        SET clientId = ${clientId}, updatedAt = NOW()
        WHERE id = ${enrollmentId}
      `);
    }

    console.log(`[autoCreateOrLinkClient] ${action} client ${clientId}, protocol ${clientProtocolId} for enrollment ${enrollmentId} (${email})`);
    return { clientId, clientProtocolId, action };
  } catch (err) {
    console.error('[autoCreateOrLinkClient] Failed:', err);
    return { clientId: 0, clientProtocolId: 0, action: 'skipped' };
  }
}
