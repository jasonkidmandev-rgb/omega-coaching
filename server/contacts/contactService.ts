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
 * Matches by: email (strongest) → phone → full name (2+ words only)
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

  // Try to find existing contact
  let existing: any = null;

  // 1. Match by email (strongest)
  if (normEmail) {
    const [found] = await d.select().from(contacts).where(eq(contacts.email, normEmail)).limit(1);
    if (found) existing = found;
  }

  // 2. Match by phone
  if (!existing && normPhone) {
    // We need to match normalized phones — strip non-digits from DB phone too
    const allWithPhone = await d.select().from(contacts).where(isNotNull(contacts.phone));
    for (const c of allWithPhone) {
      const cPhone = normalizePhone(c.phone);
      if (cPhone && cPhone === normPhone) {
        existing = c;
        break;
      }
    }
  }

  // 3. Match by full name (only 2+ word names to avoid false positives)
  if (!existing && fullNameNorm && fullNameNorm.includes(' ')) {
    const allContacts = await d.select().from(contacts);
    for (const c of allContacts) {
      const cName = normalizeName(`${c.firstName || ''} ${c.lastName || ''}`);
      if (cName && cName === fullNameNorm) {
        existing = c;
        break;
      }
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
