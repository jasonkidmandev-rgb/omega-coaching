/**
 * Propagate Contact Changes
 * 
 * When a contact's name/email/phone is edited in ANY section of the app,
 * this function updates the master contacts record and propagates the
 * changes to ALL linked records across the system.
 * 
 * SAFETY GUARDS:
 * 1. Will NOT overwrite a non-empty value with blank/null unless explicitly forced
 * 2. Logs every change with before/after values for audit trail
 * 3. Validates contactId exists before propagating
 * 4. Normalizes email to lowercase and trims whitespace
 * 5. Does NOT set full_name directly (it's a MySQL GENERATED column)
 * 6. Handles unique email constraint conflicts gracefully
 * 
 * This ensures a true "single master record per person" architecture.
 */
import { getDb } from "../db";
import {
  contacts,
  prospects,
  clientProtocols,
  clientProjects,
  customOrders,
  packingSlips,
  users,
  transformationEnrollments,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

interface PropagateInput {
  contactId: number;
  name?: string | null;       // full name (e.g. "John Smith")
  email?: string | null;
  phone?: string | null;
  /** If true, allows overwriting non-empty values with blank/null. Default: false */
  forceBlankOverwrite?: boolean;
  /** Source of the change for audit logging */
  source?: string;
}

interface PropagateResult {
  success: boolean;
  tablesUpdated: string[];
  fieldsSkipped: string[];
  previousValues: { name?: string | null; email?: string | null; phone?: string | null };
  newValues: { name?: string | null; email?: string | null; phone?: string | null };
}

/**
 * Update the master contacts record and propagate name/email/phone changes
 * to all 7 linked tables. This is the single function that ALL edit paths
 * should call when contact info changes.
 * 
 * IMPORTANT: The contacts.full_name column is a MySQL GENERATED column
 * (computed from first_name + last_name). We must NEVER set it directly.
 * We only set first_name and last_name, and MySQL auto-generates full_name.
 * 
 * @param input - contactId plus the fields that changed
 * @returns PropagateResult with details of what was updated and what was skipped
 */
export async function propagateContactChanges(input: PropagateInput): Promise<PropagateResult> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const { contactId, name, email, phone, forceBlankOverwrite = false, source = 'unknown' } = input;
  const tablesUpdated: string[] = [];
  const fieldsSkipped: string[] = [];

  // Determine what changed
  const hasNameChange = name !== undefined;
  const hasEmailChange = email !== undefined;
  const hasPhoneChange = phone !== undefined;

  if (!hasNameChange && !hasEmailChange && !hasPhoneChange) {
    return { success: true, tablesUpdated: [], fieldsSkipped: [], previousValues: {}, newValues: {} };
  }

  // ─── SAFETY GUARD 1: Validate contact exists ─────────────────────────
  const [existingContact] = await database.select().from(contacts).where(eq(contacts.id, contactId));
  if (!existingContact) {
    console.error(`[propagateContactChanges] BLOCKED: contactId=${contactId} does not exist (source: ${source})`);
    throw new Error(`Contact ${contactId} not found — cannot propagate changes to a non-existent contact`);
  }

  const previousValues: PropagateResult['previousValues'] = {
    name: [existingContact.firstName, existingContact.lastName].filter(Boolean).join(' ') || null,
    email: existingContact.email,
    phone: existingContact.phone,
  };

  // ─── SAFETY GUARD 2: Prevent blank overwrite of non-empty values ─────
  const contactUpdates: Record<string, any> = {};
  const normalizedEmail = email?.toLowerCase().trim() || null;
  const normalizedName = name?.trim() || null;
  const normalizedPhone = phone?.trim() || null;

  if (hasNameChange) {
    const isBlankingName = !normalizedName && previousValues.name;
    if (isBlankingName && !forceBlankOverwrite) {
      fieldsSkipped.push('name (would blank existing value)');
      console.warn(`[propagateContactChanges] SKIPPED name change for contactId=${contactId}: would overwrite "${previousValues.name}" with blank (source: ${source})`);
    } else {
      // IMPORTANT: Do NOT set fullName — it's a MySQL GENERATED column.
      // Only set firstName and lastName; MySQL auto-computes full_name.
      if (normalizedName) {
        const parts = normalizedName.split(/\s+/);
        contactUpdates.firstName = parts[0] || null;
        contactUpdates.lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;
      } else {
        contactUpdates.firstName = null;
        contactUpdates.lastName = null;
      }
    }
  }

  if (hasEmailChange) {
    const isBlankingEmail = !normalizedEmail && previousValues.email;
    if (isBlankingEmail && !forceBlankOverwrite) {
      fieldsSkipped.push('email (would blank existing value)');
      console.warn(`[propagateContactChanges] SKIPPED email change for contactId=${contactId}: would overwrite "${previousValues.email}" with blank (source: ${source})`);
    } else {
      contactUpdates.email = normalizedEmail;
    }
  }

  if (hasPhoneChange) {
    const isBlankingPhone = !normalizedPhone && previousValues.phone;
    if (isBlankingPhone && !forceBlankOverwrite) {
      fieldsSkipped.push('phone (would blank existing value)');
      console.warn(`[propagateContactChanges] SKIPPED phone change for contactId=${contactId}: would overwrite "${previousValues.phone}" with blank (source: ${source})`);
    } else {
      contactUpdates.phone = normalizedPhone;
    }
  }

  // Determine the effective new values (after safety guards)
  const effectiveFirstName = contactUpdates.firstName !== undefined ? contactUpdates.firstName : existingContact.firstName;
  const effectiveLastName = contactUpdates.lastName !== undefined ? contactUpdates.lastName : existingContact.lastName;
  const effectiveName = [effectiveFirstName, effectiveLastName].filter(Boolean).join(' ') || null;
  const effectiveEmail = contactUpdates.email !== undefined ? contactUpdates.email : previousValues.email;
  const effectivePhone = contactUpdates.phone !== undefined ? contactUpdates.phone : previousValues.phone;

  const newValues: PropagateResult['newValues'] = {
    name: effectiveName,
    email: effectiveEmail,
    phone: effectivePhone,
  };

  // 0. Update the master contacts record (skip fullName — it's GENERATED)
  if (Object.keys(contactUpdates).length > 0) {
    try {
      await database.update(contacts).set(contactUpdates).where(eq(contacts.id, contactId));
      tablesUpdated.push('contacts');
    } catch (e: any) {
      // Handle unique email constraint violation gracefully
      if (e?.message?.includes('Duplicate') || e?.cause?.code === 'ER_DUP_ENTRY') {
        console.error(`[propagateContactChanges] BLOCKED: email "${normalizedEmail}" already exists for another contact (source: ${source})`);
        throw new Error(`Cannot update contact ${contactId}: email "${normalizedEmail}" is already used by another contact`);
      }
      throw e;
    }
  }

  // Only propagate the fields that actually passed safety guards
  // For name propagation to linked tables, use the full name string
  const nameToPropagate = (contactUpdates.firstName !== undefined || contactUpdates.lastName !== undefined) ? effectiveName : undefined;
  const emailToPropagate = contactUpdates.email !== undefined ? contactUpdates.email : undefined;
  const phoneToPropagate = contactUpdates.phone !== undefined ? contactUpdates.phone : undefined;

  const hasEffectiveNameChange = nameToPropagate !== undefined;
  const hasEffectiveEmailChange = emailToPropagate !== undefined;
  const hasEffectivePhoneChange = phoneToPropagate !== undefined;

  if (!hasEffectiveNameChange && !hasEffectiveEmailChange && !hasEffectivePhoneChange) {
    console.log(`[propagateContactChanges] contactId=${contactId} — all changes skipped by safety guards (source: ${source})`);
    return { success: true, tablesUpdated, fieldsSkipped, previousValues, newValues };
  }

  // 1. Prospects
  try {
    const prospectUpdates: Record<string, any> = {};
    if (hasEffectiveNameChange) prospectUpdates.name = nameToPropagate;
    if (hasEffectiveEmailChange) prospectUpdates.email = emailToPropagate;
    if (hasEffectivePhoneChange) prospectUpdates.phone = phoneToPropagate;
    if (Object.keys(prospectUpdates).length > 0) {
      await database.update(prospects).set(prospectUpdates).where(eq(prospects.contactId, contactId));
      tablesUpdated.push('prospects');
    }
  } catch (e) { console.error('[propagateContactChanges] prospects sync error', e); }

  // 2. Client Protocols
  try {
    const cpUpdates: Record<string, any> = {};
    if (hasEffectiveNameChange) cpUpdates.clientName = nameToPropagate;
    if (hasEffectiveEmailChange) cpUpdates.clientEmail = emailToPropagate;
    if (hasEffectivePhoneChange) cpUpdates.clientPhone = phoneToPropagate;
    if (Object.keys(cpUpdates).length > 0) {
      await database.update(clientProtocols).set(cpUpdates).where(eq(clientProtocols.contactId, contactId));
      tablesUpdated.push('clientProtocols');
    }
  } catch (e) { console.error('[propagateContactChanges] clientProtocols sync error', e); }

  // 3. Client Projects
  try {
    const projUpdates: Record<string, any> = {};
    if (hasEffectiveNameChange) projUpdates.clientName = nameToPropagate;
    if (hasEffectiveEmailChange) projUpdates.clientEmail = emailToPropagate;
    if (Object.keys(projUpdates).length > 0) {
      await database.update(clientProjects).set(projUpdates).where(eq(clientProjects.contactId, contactId));
      tablesUpdated.push('clientProjects');
    }
  } catch (e) { console.error('[propagateContactChanges] clientProjects sync error', e); }

  // 4. Custom Orders
  try {
    const coUpdates: Record<string, any> = {};
    if (hasEffectiveNameChange) coUpdates.clientName = nameToPropagate;
    if (hasEffectiveEmailChange) coUpdates.clientEmail = emailToPropagate;
    if (hasEffectivePhoneChange) coUpdates.clientPhone = phoneToPropagate;
    if (Object.keys(coUpdates).length > 0) {
      await database.update(customOrders).set(coUpdates).where(eq(customOrders.contactId, contactId));
      tablesUpdated.push('customOrders');
    }
  } catch (e) { console.error('[propagateContactChanges] customOrders sync error', e); }

  // 5. Packing Slips
  try {
    const psUpdates: Record<string, any> = {};
    if (hasEffectiveNameChange) psUpdates.clientName = nameToPropagate;
    if (hasEffectiveEmailChange) psUpdates.clientEmail = emailToPropagate;
    if (Object.keys(psUpdates).length > 0) {
      await database.update(packingSlips).set(psUpdates).where(eq(packingSlips.contactId, contactId));
      tablesUpdated.push('packingSlips');
    }
  } catch (e) { console.error('[propagateContactChanges] packingSlips sync error', e); }

  // 6. Users (name only — email change for users requires separate auth flow)
  try {
    if (hasEffectiveNameChange) {
      await database.update(users).set({ name: nameToPropagate }).where(eq(users.contactId, contactId));
      tablesUpdated.push('users');
    }
  } catch (e) { console.error('[propagateContactChanges] users sync error', e); }

  // 7. Transformation Enrollments
  try {
    const teUpdates: Record<string, any> = {};
    if (hasEffectiveNameChange) teUpdates.clientName = nameToPropagate;
    if (hasEffectiveEmailChange) teUpdates.clientEmail = emailToPropagate;
    if (Object.keys(teUpdates).length > 0) {
      await database.update(transformationEnrollments).set(teUpdates).where(eq(transformationEnrollments.contactId, contactId));
      tablesUpdated.push('transformationEnrollments');
    }
  } catch (e) { console.error('[propagateContactChanges] transformationEnrollments sync error', e); }

  // ─── AUDIT LOG ────────────────────────────────────────────────────────
  console.log(`[propagateContactChanges] contactId=${contactId} source=${source} updated: ${tablesUpdated.join(', ')}${fieldsSkipped.length > 0 ? ` | skipped: ${fieldsSkipped.join(', ')}` : ''}`);
  if (previousValues.name !== newValues.name) console.log(`  name: "${previousValues.name}" → "${newValues.name}"`);
  if (previousValues.email !== newValues.email) console.log(`  email: "${previousValues.email}" → "${newValues.email}"`);
  if (previousValues.phone !== newValues.phone) console.log(`  phone: "${previousValues.phone}" → "${newValues.phone}"`);

  return { success: true, tablesUpdated, fieldsSkipped, previousValues, newValues };
}
