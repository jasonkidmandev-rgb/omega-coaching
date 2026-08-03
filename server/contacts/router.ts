/**
 * Contacts admin router — list + update contacts, and re-sync a contact's data to the
 * tables that copy it.
 * (Formerly the Client 360 router; the 360 dashboard view and the mergeContacts
 * band-aid were retired 2026-07-02 as part of the identity consolidation — contacts
 * is the canonical identity, so the fuzzy-merge tool is no longer needed.)
 */
import { router } from "../_core/trpc";
import { adminProcedure, managerProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  people,
  prospects,
  clientProtocols,
  transformationEnrollments,
  users,
  appointments,
  storeOrders,
  checkins,
} from "../../drizzle/schema";
import { eq, or, like, sql, desc, and, isNotNull } from "drizzle-orm";
import { getCalendlyAppointments, isCalendlyConfigured } from "../calendly/service";
import { propagateContactChanges } from "./propagateContactChanges";

// Unified person type combining all data sources
interface UnifiedPerson {
  id: string; // composite key like "contact:5" or "prospect:5" or "client:12"
  personId: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  lifecycleStage: 'lead' | 'prospect' | 'enrolled' | 'active_client' | 'past_client' | 'store_customer';
  source: string | null;
  // IDs for cross-referencing
  prospectId: number | null;
  clientProtocolId: number | null;
  enrollmentId: number | null;
  userId: number | null;
  // Summary stats
  protocolStatus: string | null;
  enrollmentStatus: string | null;
  prospectStatus: string | null;
  totalAppointments: number;
  totalOrders: number;
  totalCheckins: number;
  profileComplete: boolean;
  lastActivity: string | null;
  createdAt: string;
  assignedTo: number | null;
}

export const contactsRouter = router({
  /**
   * List all people across all data sources with search/filter
   */
  list: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      stage: z.enum(['all', 'lead', 'prospect', 'enrolled', 'active_client', 'past_client', 'store_customer']).optional().default('all'),
      limit: z.number().min(1).max(200).optional().default(100),
      offset: z.number().min(0).optional().default(0),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const { search, stage, limit, offset } = input;
      const searchLower = search?.toLowerCase().trim();

      // 1. Get all prospects
      const allProspects = await database.select().from(prospects);

      // 2. Get all client protocols (active, completed, draft, etc.)
      const allProtocols = await database.select().from(clientProtocols);

      // 3. Get all transformation enrollments
      const allEnrollments = await database.select().from(transformationEnrollments);

      // 4. Get all users
      const allUsers = await database.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
        stripeCustomerId: users.stripeCustomerId,
      }).from(users);

      // 5. Get appointment counts per email
      const appointmentCounts = await database
        .select({
          clientEmail: appointments.clientEmail,
          count: sql<number>`count(*)`.as('count'),
        })
        .from(appointments)
        .groupBy(appointments.clientEmail);
      const apptMap = new Map(appointmentCounts.map(a => [a.clientEmail?.toLowerCase(), a.count]));

      // Enrich with Calendly appointment counts
      if (isCalendlyConfigured()) {
        try {
          const calendlyAppts = await getCalendlyAppointments({ pastDays: 90, futureDays: 90 });
          for (const appt of calendlyAppts) {
            for (const inv of appt.invitees) {
              const email = inv.email?.toLowerCase();
              if (email) {
                apptMap.set(email, (apptMap.get(email) || 0) + 1);
              }
            }
          }
        } catch (err) {
          console.error('[ContactsRouter] Failed to fetch Calendly appointments for counts:', err);
        }
      }

      // 6. Get order counts per userId
      const orderCounts = await database
        .select({
          userId: storeOrders.userId,
          count: sql<number>`count(*)`.as('count'),
        })
        .from(storeOrders)
        .groupBy(storeOrders.userId);
      const orderMap = new Map(orderCounts.map(o => [o.userId, o.count]));

      // 7. Get checkin counts per clientProtocolId
      const checkinCounts = await database
        .select({
          clientProtocolId: checkins.clientProtocolId,
          count: sql<number>`count(*)`.as('count'),
        })
        .from(checkins)
        .groupBy(checkins.clientProtocolId);
      const checkinMap = new Map(checkinCounts.map(c => [c.clientProtocolId, c.count]));

      // Build a unified people map with multi-key dedup
      // Priority: personId (strongest) → email → phone → name
      const peopleMap = new Map<string, UnifiedPerson>();
      // Secondary indexes for dedup
      const contactIdIndex = new Map<number, string>(); // personId → primary key
      const phoneIndex = new Map<string, string>();
      const nameIndex = new Map<string, string>();

      const normalizeName = (n: string) => n?.toLowerCase().replace(/[^a-z]/g, '') || '';
      const normalizePhone = (p: string | null) => {
        if (!p) return null;
        const digits = p.replace(/\D/g, '');
        return digits.length >= 7 ? digits : null;
      };

      const findExistingPerson = (email: string | null, name: string, phone: string | null, personId?: number | null): UnifiedPerson | null => {
        // 0. Try personId match (strongest signal — database-level link)
        if (personId) {
          const existingKey = contactIdIndex.get(personId);
          if (existingKey && peopleMap.has(existingKey)) return peopleMap.get(existingKey)!;
        }
        // 1. Try email match
        if (email) {
          const key = email.toLowerCase();
          if (peopleMap.has(key)) return peopleMap.get(key)!;
        }
        // 2. Try phone match
        const normPhone = normalizePhone(phone);
        if (normPhone) {
          const existingKey = phoneIndex.get(normPhone);
          if (existingKey && peopleMap.has(existingKey)) return peopleMap.get(existingKey)!;
        }
        // 3. Try exact name match (only if name is specific enough — at least 2 words)
        const normName = normalizeName(name);
        if (normName && name.trim().includes(' ')) {
          const existingKey = nameIndex.get(normName);
          if (existingKey && peopleMap.has(existingKey)) return peopleMap.get(existingKey)!;
        }
        return null;
      };

      const getOrCreate = (email: string | null, name: string, phone: string | null, fallbackKey: string, personId?: number | null): UnifiedPerson => {
        // Try to find an existing person by any identifier
        const existing = findExistingPerson(email, name, phone, personId);
        if (existing) {
          // Merge: fill in missing data
          if (email && !existing.email) existing.email = email;
          if (name && (!existing.name || existing.name === 'Unknown')) existing.name = name;
          if (phone && !existing.phone) existing.phone = phone;
          if (personId && !existing.personId) existing.personId = personId;
          // Update all indexes to point to this person's primary key
          const primaryKey = existing.email?.toLowerCase() || existing.id;
          if (email) {
            const eKey = email.toLowerCase();
            if (!peopleMap.has(eKey)) peopleMap.set(eKey, existing);
          }
          if (personId) contactIdIndex.set(personId, primaryKey);
          const normPhone = normalizePhone(phone);
          if (normPhone) phoneIndex.set(normPhone, primaryKey);
          const normName = normalizeName(name);
          if (normName && name.trim().includes(' ')) nameIndex.set(normName, primaryKey);
          return existing;
        }

        // Create new person
        const primaryKey = email?.toLowerCase() || fallbackKey;
        const person: UnifiedPerson = {
          id: fallbackKey,
          personId: personId || null,
          name,
          email,
          phone,
          lifecycleStage: 'lead',
          source: null,
          prospectId: null,
          clientProtocolId: null,
          enrollmentId: null,
          userId: null,
          protocolStatus: null,
          enrollmentStatus: null,
          prospectStatus: null,
          totalAppointments: 0,
          totalOrders: 0,
          totalCheckins: 0,
          profileComplete: false,
          lastActivity: null,
          createdAt: new Date().toISOString(),
          assignedTo: null,
        };
        peopleMap.set(primaryKey, person);
        // Index by all available identifiers
        if (email) peopleMap.set(email.toLowerCase(), person);
        if (personId) contactIdIndex.set(personId, primaryKey);
        const normPhone = normalizePhone(phone);
        if (normPhone) phoneIndex.set(normPhone, primaryKey);
        const normName = normalizeName(name);
        if (normName && name.trim().includes(' ')) nameIndex.set(normName, primaryKey);
        return person;
      };

      // Merge prospects
      for (const p of allProspects) {
        const person = getOrCreate(p.email, p.name, p.phone, `prospect:${p.id}`, (p as any).personId);
        person.prospectId = p.id;
        person.phone = person.phone || p.phone;
        person.source = p.source;
        person.prospectStatus = p.customStatus || p.status;
        person.assignedTo = person.assignedTo || p.assignedTo;
        if (!person.lastActivity || (p.updatedAt && p.updatedAt > person.lastActivity)) {
          person.lastActivity = p.updatedAt;
        }
        if (p.createdAt && p.createdAt < person.createdAt) {
          person.createdAt = p.createdAt;
        }
        // Lifecycle: at minimum they're a lead
        if (person.lifecycleStage === 'lead') {
          if (['enrolled'].includes(p.status)) {
            person.lifecycleStage = 'enrolled';
          } else if (['contacted', 'clicked', 'viewing', 'engaged', 'ready_for_consult'].includes(p.status)) {
            person.lifecycleStage = 'prospect';
          }
        }
      }

      // Merge client protocols
      for (const cp of allProtocols) {
        if (cp.deletedAt || cp.archivedAt) continue;
        const person = getOrCreate(cp.clientEmail, cp.clientName, cp.clientPhone, `client:${cp.id}`, (cp as any).personId);
        person.clientProtocolId = person.clientProtocolId || cp.id;
        person.protocolStatus = cp.status;
        person.totalCheckins = (person.totalCheckins || 0) + (checkinMap.get(cp.id) || 0);
        if (!person.lastActivity || (cp.updatedAt && cp.updatedAt > person.lastActivity)) {
          person.lastActivity = cp.updatedAt;
        }
        if (cp.createdAt && cp.createdAt < person.createdAt) {
          person.createdAt = cp.createdAt;
        }
        // Profile completeness check
        const hasShipping = !!(cp.shippingName && cp.shippingStreet && cp.shippingCity);
        person.profileComplete = hasShipping;
        // Lifecycle upgrade
        if (['active'].includes(cp.status)) {
          person.lifecycleStage = 'active_client';
        } else if (['completed'].includes(cp.status)) {
          if (person.lifecycleStage !== 'active_client') {
            person.lifecycleStage = 'past_client';
          }
        } else if (['approved', 'pending_approval'].includes(cp.status)) {
          if (!['active_client', 'past_client'].includes(person.lifecycleStage)) {
            person.lifecycleStage = 'enrolled';
          }
        }
      }

      // Merge enrollments
      for (const e of allEnrollments) {
        // Find matching person by userId or clientId
        let person: UnifiedPerson | undefined;
        if (e.userId) {
          const user = allUsers.find(u => u.id === e.userId);
          if (user?.email) {
            person = peopleMap.get(user.email.toLowerCase());
          }
        }
        if (!person && e.clientId) {
          // clientId maps to clientProtocols.id
          const cp = allProtocols.find(c => c.id === e.clientId);
          if (cp?.clientEmail) {
            person = peopleMap.get(cp.clientEmail.toLowerCase());
          }
        }
        if (person) {
          person.enrollmentId = person.enrollmentId || e.id;
          person.enrollmentStatus = e.status;
          if (['active', 'launched', 'fulfillment', 'shipped', 'delivered', 'training_scheduled', 'training_complete'].includes(e.status)) {
            person.lifecycleStage = 'active_client';
          } else if (['completed', 'renewed'].includes(e.status)) {
            if (person.lifecycleStage !== 'active_client') {
              person.lifecycleStage = 'past_client';
            }
          }
        }
      }

      // Merge users (for store-only customers)
      for (const u of allUsers) {
        if (u.role !== 'user') continue; // skip admin/staff
        const uContactId = (u as any).personId;
        const key = u.email?.toLowerCase();
        // Try to find existing person by personId first, then email
        let person: UnifiedPerson | undefined;
        if (uContactId) {
          const existingKey = contactIdIndex.get(uContactId);
          if (existingKey && peopleMap.has(existingKey)) person = peopleMap.get(existingKey);
        }
        if (!person && key && peopleMap.has(key)) {
          person = peopleMap.get(key);
        }
        if (person) {
          // Already exists, just add userId
          person.userId = u.id;
          if (uContactId && !person.personId) person.personId = uContactId;
          person.totalOrders = orderMap.get(u.id) || 0;
          if (key) person.totalAppointments = apptMap.get(key) || 0;
          if (!person.lastActivity || (u.lastSignedIn && u.lastSignedIn > person.lastActivity)) {
            person.lastActivity = u.lastSignedIn;
          }
        } else {
          // Store-only customer
          const orders = orderMap.get(u.id) || 0;
          if (orders > 0) {
            const newPerson = getOrCreate(u.email, u.name || 'Unknown', u.phone || null, `user:${u.id}`, uContactId);
            newPerson.userId = u.id;
            newPerson.lifecycleStage = 'store_customer';
            newPerson.totalOrders = orders;
            if (key) newPerson.totalAppointments = apptMap.get(key) || 0;
            newPerson.lastActivity = u.lastSignedIn;
            newPerson.createdAt = u.createdAt;
          }
        }
      }

      // Also set appointment counts for people who have them
      for (const person of peopleMap.values()) {
        if (person.email && !person.totalAppointments) {
          person.totalAppointments = apptMap.get(person.email.toLowerCase()) || 0;
        }
      }

      // Convert to array and deduplicate (multiple map keys may point to same person object)
      const seen = new Set<UnifiedPerson>();
      let people: UnifiedPerson[] = [];
      for (const person of peopleMap.values()) {
        if (!seen.has(person)) {
          seen.add(person);
          people.push(person);
        }
      }

      // Search filter
      if (searchLower) {
        people = people.filter(p =>
          (p.name?.toLowerCase().includes(searchLower)) ||
          (p.email?.toLowerCase().includes(searchLower)) ||
          (p.phone?.includes(searchLower))
        );
      }

      // Stage filter
      if (stage !== 'all') {
        people = people.filter(p => p.lifecycleStage === stage);
      }

      // Sort by last activity (most recent first), then by name
      people.sort((a, b) => {
        const aDate = a.lastActivity || a.createdAt;
        const bDate = b.lastActivity || b.createdAt;
        return bDate.localeCompare(aDate);
      });

      const total = people.length;
      const paginated = people.slice(offset, offset + limit);

      // Count by stage
      // Use the already-deduped people array for stage counts (before search/stage filters)
      const seenAll = new Set<UnifiedPerson>();
      const allPeople: UnifiedPerson[] = [];
      for (const person of peopleMap.values()) {
        if (!seenAll.has(person)) {
          seenAll.add(person);
          allPeople.push(person);
        }
      }
      const stageCounts = {
        all: allPeople.length,
        lead: allPeople.filter(p => p.lifecycleStage === 'lead').length,
        prospect: allPeople.filter(p => p.lifecycleStage === 'prospect').length,
        enrolled: allPeople.filter(p => p.lifecycleStage === 'enrolled').length,
        active_client: allPeople.filter(p => p.lifecycleStage === 'active_client').length,
        past_client: allPeople.filter(p => p.lifecycleStage === 'past_client').length,
        store_customer: allPeople.filter(p => p.lifecycleStage === 'store_customer').length,
      };

      return { people: paginated, total, stageCounts };
    }),
  /**
   * Update a contact's canonical info (propagates to linked records)
   */
  updateContact: managerProcedure
    .input(z.object({
      personId: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional().nullable(),
      phone: z.string().optional().nullable(),
      lifecycleStage: z.enum(['lead', 'prospect', 'enrolled', 'active_client', 'past_client', 'store_customer']).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const { personId, ...fields } = input;

      // Build fullName from firstName/lastName
      let fullName: string | undefined;
      if (fields.firstName !== undefined || fields.lastName !== undefined) {
        const [current] = await database.select().from(people).where(eq(people.id, personId));
        if (current) {
          const fn = fields.firstName !== undefined ? fields.firstName : current.firstName;
          const ln = fields.lastName !== undefined ? fields.lastName : current.lastName;
          fullName = [fn, ln].filter(Boolean).join(' ') || undefined;
        }
      }

      // Update lifecycle stage if provided
      if (fields.lifecycleStage) {
        await database.update(people).set({ lifecycleStage: fields.lifecycleStage }).where(eq(people.id, personId));
      }

      // Also update firstName/lastName directly on the contacts table
      // (propagateContactChanges handles fullName + first/last splitting,
      //  but we also want to preserve the original firstName/lastName if provided)
      const directContactUpdates: Record<string, any> = {};
      if (fields.firstName !== undefined) directContactUpdates.firstName = fields.firstName;
      if (fields.lastName !== undefined) directContactUpdates.lastName = fields.lastName;
      if (Object.keys(directContactUpdates).length > 0) {
        await database.update(people).set(directContactUpdates).where(eq(people.id, personId));
      }

      // Use the shared propagation utility to update contacts + all 7 linked tables
      await propagateContactChanges({
        personId,
        ...(fullName !== undefined ? { name: fullName } : {}),
        ...(fields.email !== undefined ? { email: fields.email } : {}),
        ...(fields.phone !== undefined ? { phone: fields.phone } : {}),
      });

      return { success: true };
    }),
  /**
   * Fix data mismatches: Sync a linked record's data to match its master contact
   */
  fixMismatch: adminProcedure
    .input(z.object({
      personId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const [contact] = await database.select().from(people).where(eq(people.id, input.personId));
      if (!contact) throw new Error("Contact not found");

      const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || null;

      // Re-propagate the contact's canonical data to all linked tables
      await propagateContactChanges({
        personId: input.personId,
        name: fullName,
        email: contact.email,
        phone: contact.phone,
      });

      return { success: true, personId: input.personId, syncedName: fullName, syncedEmail: contact.email };
    }),

  /**
   * Fix ALL mismatches at once: Re-sync every contact's data to all linked records
   */
  fixAllMismatches: adminProcedure
    .mutation(async () => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const allContactsList = await database.select().from(people);
      let fixed = 0;

      for (const contact of allContactsList) {
        const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || null;
        try {
          await propagateContactChanges({
            personId: contact.id,
            name: fullName,
            email: contact.email,
            phone: contact.phone,
          });
          fixed++;
        } catch (e) {
          console.error(`[fixAllMismatches] Failed for contact ${contact.id}:`, e);
        }
      }

      return { success: true, totalFixed: fixed, totalContacts: allContactsList.length };
    }),
});
