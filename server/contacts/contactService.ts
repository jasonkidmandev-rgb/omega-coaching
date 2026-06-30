/**
 * Unified Contact Service
 * 
 * Single source of truth for finding or creating contacts.
 * All creation paths (prospect, client protocol, enrollment, user registration)
 * should call findOrCreateContact() to ensure deduplication.
 */
import { getDb } from "../db";
import { contacts } from "../../drizzle/schema";
import { eq, or, and, isNotNull, sql } from "drizzle-orm";

async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

type LifecycleStage = 'lead' | 'prospect' | 'enrolled' | 'active_client' | 'past_client' | 'store_customer';

// Lifecycle stage priority (higher = more advanced)
const LIFECYCLE_PRIORITY: Record<LifecycleStage, number> = {
  lead: 1,
  prospect: 2,
  enrolled: 3,
  active_client: 4,
  past_client: 5,
  store_customer: 1,
};

interface FindOrCreateContactInput {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;  // will be split if firstName/lastName not provided
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  lifecycleStage?: LifecycleStage;
}

interface ContactRecord {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  lifecycleStage: string;
  isNew: boolean;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone || phone === 'N/A' || phone === 'not-provided') return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
}

function normalizeName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim() || null;
}

function splitFullName(fullName: string): { firstName: string; lastName: string | null } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/**
 * Find an existing contact or create a new one.
 *
 * DETERMINISTIC resolution (identity-consolidation design, 2026-06-30):
 * auto-links ONLY on an exact normalized email match. Phone and name are
 * unreliable identity signals — a single typo or a shared line can fuse two
 * different people — so they are logged as review suggestions but NEVER
 * auto-merged. Verified email is the canonical key.
 *
 * If found, updates any missing fields and upgrades lifecycle stage if appropriate.
 * If not found, creates a new contact record.
 */
export async function findOrCreateContact(input: FindOrCreateContactInput): Promise<ContactRecord> {
  const { email, phone, source, lifecycleStage = 'lead' } = input;
  
  // Resolve first/last name
  let firstName = input.firstName || null;
  let lastName = input.lastName || null;
  if (!firstName && input.fullName) {
    const split = splitFullName(input.fullName);
    firstName = split.firstName;
    lastName = split.lastName;
  }
  
  const normEmail = email?.toLowerCase().trim() || null;
  const normPhone = normalizePhone(phone);
  const fullNameNorm = normalizeName(`${firstName || ''} ${lastName || ''}`);

  const d = await db();

  // Try to find existing contact — DETERMINISTIC: auto-link ONLY on exact email.
  let existing: any = null;

  // Match by email — the single auto-link signal (canonical, verifiable, stable).
  if (normEmail) {
    const [found] = await d.select().from(contacts).where(eq(contacts.email, normEmail)).limit(1);
    if (found) existing = found;
  }

  // No email match → do NOT fuse on phone/name. Surface a possible duplicate for
  // human review (merge tool), then fall through to creating a distinct contact.
  if (!existing && (normPhone || (fullNameNorm && fullNameNorm.includes(' ')))) {
    try {
      const candidates = await d.select().from(contacts);
      const suspect = candidates.find((c: any) => {
        const cPhone = normalizePhone(c.phone);
        const cName = normalizeName(`${c.firstName || ''} ${c.lastName || ''}`);
        return (normPhone && cPhone && cPhone === normPhone)
          || (fullNameNorm && fullNameNorm.includes(' ') && cName && cName === fullNameNorm);
      });
      if (suspect) {
        const by = normPhone && normalizePhone(suspect.phone) === normPhone ? 'phone' : 'name';
        console.warn(`[contactService] Possible duplicate (NOT auto-merged): new "${(firstName || '').trim()} ${(lastName || '').trim()}" / ${normEmail || 'no-email'} resembles contact #${suspect.id} by ${by}. Review via merge tool.`);
      }
    } catch (_e) {
      /* suggestion-only — never block contact creation */
    }
  }

  if (existing) {
    // Update missing fields and upgrade lifecycle
    const updates: Record<string, any> = {};
    
    if (normEmail && !existing.email) updates.email = normEmail;
    if (phone && !existing.phone) updates.phone = phone;
    if (firstName && !existing.firstName) updates.firstName = firstName;
    if (lastName && !existing.lastName) updates.lastName = lastName;
    
    // Upgrade lifecycle stage if new stage is higher priority
    const currentPriority = LIFECYCLE_PRIORITY[existing.lifecycleStage as LifecycleStage] || 0;
    const newPriority = LIFECYCLE_PRIORITY[lifecycleStage] || 0;
    if (newPriority > currentPriority) {
      updates.lifecycleStage = lifecycleStage;
    }
    
    if (Object.keys(updates).length > 0) {
      await d.update(contacts).set(updates).where(eq(contacts.id, existing.id));
    }
    
    return {
      id: existing.id,
      firstName: updates.firstName || existing.firstName,
      lastName: updates.lastName || existing.lastName,
      email: updates.email || existing.email,
      phone: updates.phone || existing.phone,
      lifecycleStage: updates.lifecycleStage || existing.lifecycleStage,
      isNew: false,
    };
  }

  // Create new contact
  const [result] = await d.insert(contacts).values({
    firstName,
    lastName,
    email: normEmail,
    phone: phone || null,
    source: source || null,
    lifecycleStage,
  });

  return {
    id: result.insertId,
    firstName,
    lastName,
    email: normEmail,
    phone: phone || null,
    lifecycleStage,
    isNew: true,
  };
}

/**
 * Update a contact's lifecycle stage (only upgrades, never downgrades)
 */
export async function upgradeContactLifecycle(contactId: number, newStage: LifecycleStage): Promise<void> {
  const d = await db();
  const [existing] = await d.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!existing) return;
  
  const currentPriority = LIFECYCLE_PRIORITY[existing.lifecycleStage as LifecycleStage] || 0;
  const newPriority = LIFECYCLE_PRIORITY[newStage] || 0;
  
  if (newPriority > currentPriority) {
    await d.update(contacts).set({ lifecycleStage: newStage }).where(eq(contacts.id, contactId));
  }
}

/**
 * Update a contact's info (email, phone, name)
 */
export async function updateContactInfo(contactId: number, updates: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}): Promise<void> {
  const cleanUpdates: Record<string, any> = {};
  if (updates.firstName !== undefined) cleanUpdates.firstName = updates.firstName;
  if (updates.lastName !== undefined) cleanUpdates.lastName = updates.lastName;
  if (updates.email !== undefined) cleanUpdates.email = updates.email?.toLowerCase().trim() || null;
  if (updates.phone !== undefined) cleanUpdates.phone = updates.phone;
  
  const d = await db();
  if (Object.keys(cleanUpdates).length > 0) {
    await d.update(contacts).set(cleanUpdates).where(eq(contacts.id, contactId));
  }
}
