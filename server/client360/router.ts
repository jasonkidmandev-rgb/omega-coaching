/**
 * Client 360 Router — Unified person view combining leads, clients, and past clients
 */
import { router } from "../_core/trpc";
import { adminProcedure, managerProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  contacts,
  prospects,
  clientProtocols,
  transformationEnrollments,
  users,
  appointments,
  appointmentTypes,
  storeOrders,
  checkins,
  emailTracking,
  consultationNotes,
  clientProjects,
  customOrders,
  packingSlips,
  automationEvents,
  projectActivityLog,
  projectTasks,
  teamNotifications,
} from "../../drizzle/schema";
import { eq, or, like, sql, desc, and, isNotNull } from "drizzle-orm";
import { getCalendlyAppointments, isCalendlyConfigured } from "../calendly/service";
import { propagateContactChanges } from "../contacts/propagateContactChanges";

// Unified person type combining all data sources
interface UnifiedPerson {
  id: string; // composite key like "contact:5" or "prospect:5" or "client:12"
  contactId: number | null;
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

export const client360Router = router({
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
          console.error('[Client360] Failed to fetch Calendly appointments for counts:', err);
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
      // Priority: contactId (strongest) → email → phone → name
      const peopleMap = new Map<string, UnifiedPerson>();
      // Secondary indexes for dedup
      const contactIdIndex = new Map<number, string>(); // contactId → primary key
      const phoneIndex = new Map<string, string>();
      const nameIndex = new Map<string, string>();

      const normalizeName = (n: string) => n?.toLowerCase().replace(/[^a-z]/g, '') || '';
      const normalizePhone = (p: string | null) => {
        if (!p) return null;
        const digits = p.replace(/\D/g, '');
        return digits.length >= 7 ? digits : null;
      };

      const findExistingPerson = (email: string | null, name: string, phone: string | null, contactId?: number | null): UnifiedPerson | null => {
        // 0. Try contactId match (strongest signal — database-level link)
        if (contactId) {
          const existingKey = contactIdIndex.get(contactId);
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

      const getOrCreate = (email: string | null, name: string, phone: string | null, fallbackKey: string, contactId?: number | null): UnifiedPerson => {
        // Try to find an existing person by any identifier
        const existing = findExistingPerson(email, name, phone, contactId);
        if (existing) {
          // Merge: fill in missing data
          if (email && !existing.email) existing.email = email;
          if (name && (!existing.name || existing.name === 'Unknown')) existing.name = name;
          if (phone && !existing.phone) existing.phone = phone;
          if (contactId && !existing.contactId) existing.contactId = contactId;
          // Update all indexes to point to this person's primary key
          const primaryKey = existing.email?.toLowerCase() || existing.id;
          if (email) {
            const eKey = email.toLowerCase();
            if (!peopleMap.has(eKey)) peopleMap.set(eKey, existing);
          }
          if (contactId) contactIdIndex.set(contactId, primaryKey);
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
          contactId: contactId || null,
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
        if (contactId) contactIdIndex.set(contactId, primaryKey);
        const normPhone = normalizePhone(phone);
        if (normPhone) phoneIndex.set(normPhone, primaryKey);
        const normName = normalizeName(name);
        if (normName && name.trim().includes(' ')) nameIndex.set(normName, primaryKey);
        return person;
      };

      // Merge prospects
      for (const p of allProspects) {
        const person = getOrCreate(p.email, p.name, p.phone, `prospect:${p.id}`, (p as any).contactId);
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
        const person = getOrCreate(cp.clientEmail, cp.clientName, cp.clientPhone, `client:${cp.id}`, (cp as any).contactId);
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
        const uContactId = (u as any).contactId;
        const key = u.email?.toLowerCase();
        // Try to find existing person by contactId first, then email
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
          if (uContactId && !person.contactId) person.contactId = uContactId;
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
   * Get detailed 360 view for a single person by contactId, email, or person ID
   */
  detail: adminProcedure
    .input(z.object({
      email: z.string().optional(),
      contactId: z.number().optional(),
      personId: z.string().optional(), // e.g. "prospect:270009"
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Resolve contact to get all linked identifiers
      let contactRecord: any = null;
      let emailLower: string | null = null;
      let linkedProspectIds: number[] = [];
      let linkedProtocolIds: number[] = [];
      let linkedUserIds: number[] = [];
      let linkedEnrollmentIds: number[] = [];

      // If contactId provided, look up the contact first
      if (input.contactId) {
        const [c] = await database.select().from(contacts).where(eq(contacts.id, input.contactId)).limit(1);
        if (c) {
          contactRecord = c;
          emailLower = c.email?.toLowerCase() || null;
        }
      }

      // If personId provided, extract the type and ID
      if (!emailLower && input.personId) {
        const [type, idStr] = input.personId.split(':');
        const id = parseInt(idStr);
        if (type === 'prospect' && id) {
          const [p] = await database.select().from(prospects).where(eq(prospects.id, id)).limit(1);
          if (p) {
            emailLower = p.email?.toLowerCase() || null;
            linkedProspectIds.push(p.id);
            if ((p as any).contactId && !contactRecord) {
              const [c] = await database.select().from(contacts).where(eq(contacts.id, (p as any).contactId)).limit(1);
              if (c) { contactRecord = c; emailLower = emailLower || c.email?.toLowerCase() || null; }
            }
          }
        } else if (type === 'client' && id) {
          const [cp] = await database.select().from(clientProtocols).where(eq(clientProtocols.id, id)).limit(1);
          if (cp) {
            emailLower = cp.clientEmail?.toLowerCase() || null;
            linkedProtocolIds.push(cp.id);
            if ((cp as any).contactId && !contactRecord) {
              const [c] = await database.select().from(contacts).where(eq(contacts.id, (cp as any).contactId)).limit(1);
              if (c) { contactRecord = c; emailLower = emailLower || c.email?.toLowerCase() || null; }
            }
          }
        } else if (type === 'user' && id) {
          const [u] = await database.select().from(users).where(eq(users.id, id)).limit(1);
          if (u) {
            emailLower = u.email?.toLowerCase() || null;
            linkedUserIds.push(u.id);
          }
        }
      }

      // Fallback to email input
      if (!emailLower && input.email) {
        emailLower = input.email.toLowerCase();
      }

      // Now find all linked records via contactId OR email
      const contactId = contactRecord?.id || null;

      // Get prospect records
      let prospectRecords: any[] = [];
      if (contactId) {
        prospectRecords = await database.select().from(prospects).where(sql`${prospects.contactId} = ${contactId}`);
      }
      if (emailLower) {
        const byEmail = await database.select().from(prospects).where(eq(prospects.email, emailLower));
        for (const p of byEmail) {
          if (!prospectRecords.find((r: any) => r.id === p.id)) prospectRecords.push(p);
        }
      }
      for (const pid of linkedProspectIds) {
        if (!prospectRecords.find((r: any) => r.id === pid)) {
          const [p] = await database.select().from(prospects).where(eq(prospects.id, pid)).limit(1);
          if (p) prospectRecords.push(p);
        }
      }

      // Get client protocols
      let protocols: any[] = [];
      if (contactId) {
        protocols = await database.select().from(clientProtocols).where(sql`${clientProtocols.contactId} = ${contactId}`);
      }
      if (emailLower) {
        const byEmail = await database.select().from(clientProtocols).where(eq(clientProtocols.clientEmail, emailLower));
        for (const cp of byEmail) {
          if (!protocols.find((r: any) => r.id === cp.id)) protocols.push(cp);
        }
      }
      for (const cpid of linkedProtocolIds) {
        if (!protocols.find((r: any) => r.id === cpid)) {
          const [cp] = await database.select().from(clientProtocols).where(eq(clientProtocols.id, cpid)).limit(1);
          if (cp) protocols.push(cp);
        }
      }

      // Get user account
      let user: any = null;
      if (contactId) {
        const [u] = await database.select().from(users).where(sql`${users.contactId} = ${contactId}`).limit(1);
        if (u) user = u;
      }
      if (!user && emailLower) {
        const [u] = await database.select().from(users).where(eq(users.email, emailLower)).limit(1);
        if (u) user = u;
      }
      for (const uid of linkedUserIds) {
        if (!user) {
          const [u] = await database.select().from(users).where(eq(users.id, uid)).limit(1);
          if (u) user = u;
        }
      }

      // Get enrollments
      let enrollments: any[] = [];
      if (user) {
        enrollments = await database
          .select()
          .from(transformationEnrollments)
          .where(eq(transformationEnrollments.userId, user.id));
      }

      // Get appointments (search by email, phone, or name)
      let appts: any[] = [];
      const apptConditions = [];
      if (emailLower) apptConditions.push(eq(appointments.clientEmail, emailLower));
      if (contactRecord?.phone) apptConditions.push(eq(appointments.clientPhone, contactRecord.phone));
      if (apptConditions.length > 0) {
        const rawAppts = await database
          .select({
            id: appointments.id,
            coachId: appointments.coachId,
            clientProtocolId: appointments.clientProtocolId,
            clientName: appointments.clientName,
            clientEmail: appointments.clientEmail,
            clientPhone: appointments.clientPhone,
            appointmentTypeId: appointments.appointmentTypeId,
            startTime: appointments.startTime,
            endTime: appointments.endTime,
            status: appointments.status,
            notes: appointments.notes,
            clientNotes: appointments.clientNotes,
            meetingLink: appointments.meetingLink,
            appointmentTypeName: appointmentTypes.name,
            appointmentTypeColor: appointmentTypes.color,
            appointmentTypeDuration: appointmentTypes.duration,
          })
          .from(appointments)
          .leftJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
          .where(or(...apptConditions))
          .orderBy(desc(appointments.startTime));
        // Deduplicate by id in case email and phone match the same appointment
        const seen = new Set<number>();
        appts = rawAppts.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
      }

      // Get store orders
      let orders: any[] = [];
      if (user) {
        orders = await database
          .select()
          .from(storeOrders)
          .where(eq(storeOrders.userId, user.id))
          .orderBy(desc(storeOrders.createdAt));
      }

      // Get checkins for all protocols
      let allCheckins: any[] = [];
      for (const cp of protocols) {
        const cks = await database
          .select()
          .from(checkins)
          .where(eq(checkins.clientProtocolId, cp.id))
          .orderBy(desc(checkins.createdAt));
        allCheckins.push(...cks);
      }

      // Get email history
      let emails: any[] = [];
      if (emailLower) {
        emails = await database
          .select()
          .from(emailTracking)
          .where(eq(emailTracking.recipientEmail, emailLower))
          .orderBy(desc(emailTracking.sentAt))
          .limit(50);
      }

      // Get consultation notes
      let notes: any[] = [];
      const prospectIds = prospectRecords.map(p => p.id);
      if (prospectIds.length > 0) {
        for (const pid of prospectIds) {
          const n = await database
            .select()
            .from(consultationNotes)
            .where(eq(consultationNotes.prospectId, pid))
            .orderBy(desc(consultationNotes.createdAt));
          notes.push(...n);
        }
      }

      // Get client projects
      let projects: any[] = [];
      for (const cp of protocols) {
        const p = await database
          .select()
          .from(clientProjects)
          .where(eq(clientProjects.clientProtocolId, cp.id));
        projects.push(...p);
      }

      return {
        contact: contactRecord || null,
        prospect: prospectRecords[0] || null,
        allProspects: prospectRecords,
        protocols,
        enrollments,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
          lastSignedIn: user.lastSignedIn,
          stripeCustomerId: user.stripeCustomerId,
        } : null,
        appointments: appts,
        orders,
        checkins: allCheckins,
        emailHistory: emails,
        consultationNotes: notes,
        projects,
      };
    }),

  /**
   * Merge two contacts into one — keeps the primary, reassigns all linked records from secondary
   */
  mergeContacts: managerProcedure
    .input(z.object({
      primaryContactId: z.number(),
      secondaryContactId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const { primaryContactId, secondaryContactId } = input;
      if (primaryContactId === secondaryContactId) throw new Error("Cannot merge a contact with itself");

      // Get both contacts
      const [primary] = await database.select().from(contacts).where(eq(contacts.id, primaryContactId));
      const [secondary] = await database.select().from(contacts).where(eq(contacts.id, secondaryContactId));
      if (!primary) throw new Error("Primary contact not found");
      if (!secondary) throw new Error("Secondary contact not found");

      // Fill missing fields on primary from secondary
      const updates: Record<string, any> = {};
      if (!primary.email && secondary.email) updates.email = secondary.email;
      if (!primary.phone && secondary.phone) updates.phone = secondary.phone;
      if (!primary.firstName && secondary.firstName) updates.firstName = secondary.firstName;
      if (!primary.lastName && secondary.lastName) updates.lastName = secondary.lastName;
      // NOTE: Do NOT set fullName — it's a MySQL GENERATED column (auto-computed from first_name + last_name)

      if (Object.keys(updates).length > 0) {
        await database.update(contacts).set(updates).where(eq(contacts.id, primaryContactId));
      }

      // Reassign all linked records from secondary to primary
      await database.update(prospects).set({ contactId: primaryContactId }).where(eq(prospects.contactId, secondaryContactId));
      await database.update(clientProtocols).set({ contactId: primaryContactId }).where(eq(clientProtocols.contactId, secondaryContactId));
      await database.update(transformationEnrollments).set({ contactId: primaryContactId }).where(eq(transformationEnrollments.contactId, secondaryContactId));
      await database.update(users).set({ contactId: primaryContactId }).where(eq(users.contactId, secondaryContactId));

      // Delete the secondary contact
      await database.delete(contacts).where(eq(contacts.id, secondaryContactId));

      console.log(`[Client360] Merged contact ${secondaryContactId} into ${primaryContactId}`);

      return { success: true, primaryContactId, mergedFields: Object.keys(updates) };
    }),

  /**
   * Update a contact's canonical info (propagates to linked records)
   */
  updateContact: managerProcedure
    .input(z.object({
      contactId: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional().nullable(),
      phone: z.string().optional().nullable(),
      lifecycleStage: z.enum(['lead', 'prospect', 'enrolled', 'active_client', 'past_client', 'store_customer']).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const { contactId, ...fields } = input;

      // Build fullName from firstName/lastName
      let fullName: string | undefined;
      if (fields.firstName !== undefined || fields.lastName !== undefined) {
        const [current] = await database.select().from(contacts).where(eq(contacts.id, contactId));
        if (current) {
          const fn = fields.firstName !== undefined ? fields.firstName : current.firstName;
          const ln = fields.lastName !== undefined ? fields.lastName : current.lastName;
          fullName = [fn, ln].filter(Boolean).join(' ') || undefined;
        }
      }

      // Update lifecycle stage if provided
      if (fields.lifecycleStage) {
        await database.update(contacts).set({ lifecycleStage: fields.lifecycleStage }).where(eq(contacts.id, contactId));
      }

      // Also update firstName/lastName directly on the contacts table
      // (propagateContactChanges handles fullName + first/last splitting,
      //  but we also want to preserve the original firstName/lastName if provided)
      const directContactUpdates: Record<string, any> = {};
      if (fields.firstName !== undefined) directContactUpdates.firstName = fields.firstName;
      if (fields.lastName !== undefined) directContactUpdates.lastName = fields.lastName;
      if (Object.keys(directContactUpdates).length > 0) {
        await database.update(contacts).set(directContactUpdates).where(eq(contacts.id, contactId));
      }

      // Use the shared propagation utility to update contacts + all 7 linked tables
      await propagateContactChanges({
        contactId,
        ...(fullName !== undefined ? { name: fullName } : {}),
        ...(fields.email !== undefined ? { email: fields.email } : {}),
        ...(fields.phone !== undefined ? { phone: fields.phone } : {}),
      });

      return { success: true };
    }),

  /**
   * Delete a contact and all associated records
   */
  deleteContact: adminProcedure
    .input(z.object({
      contactId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      const { contactId } = input;

      // Delete linked records first (prospects, enrollments linked by contactId)
      await database.delete(prospects).where(eq(prospects.contactId, contactId));
      // Delete the contact itself
      await database.delete(contacts).where(eq(contacts.id, contactId));

      return { success: true };
    }),

  /**
   * Bulk update lifecycle stage for multiple contacts
   */
  bulkUpdateStage: adminProcedure
    .input(z.object({
      contactIds: z.array(z.number()),
      lifecycleStage: z.enum(['lead', 'prospect', 'enrolled', 'active_client', 'past_client', 'store_customer']),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      const { contactIds, lifecycleStage } = input;
      for (const id of contactIds) {
        await database.update(contacts).set({ lifecycleStage }).where(eq(contacts.id, id));
      }
      return { success: true, updated: contactIds.length };
    }),

  /**
   * Data quality: get contacts with missing or incomplete data
   */
  dataQuality: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    const allContacts = await database.select().from(contacts).orderBy(desc(contacts.createdAt));

    const issues: { contactId: number; name: string; email: string | null; phone: string | null; issues: string[] }[] = [];

    for (const c of allContacts) {
      const contactIssues: string[] = [];
      if (!c.email) contactIssues.push('missing_email');
      if (!c.phone) contactIssues.push('missing_phone');
      if (!c.firstName && !c.lastName) contactIssues.push('missing_name');

      if (contactIssues.length > 0) {
        issues.push({
          contactId: c.id,
          name: c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown',
          email: c.email,
          phone: c.phone,
          issues: contactIssues,
        });
      }
    }

    // Check for potential duplicates (same email or same phone across different contacts)
    const emailMap = new Map<string, number[]>();
    const phoneMap = new Map<string, number[]>();
    for (const c of allContacts) {
      if (c.email) {
        const key = c.email.toLowerCase();
        if (!emailMap.has(key)) emailMap.set(key, []);
        emailMap.get(key)!.push(c.id);
      }
      if (c.phone) {
        const key = c.phone.replace(/\D/g, '');
        if (!phoneMap.has(key)) phoneMap.set(key, []);
        phoneMap.get(key)!.push(c.id);
      }
    }

    const duplicates: { ids: number[]; reason: string; value: string }[] = [];
    for (const [email, ids] of emailMap) {
      if (ids.length > 1) duplicates.push({ ids, reason: 'duplicate_email', value: email });
    }
    for (const [phone, ids] of phoneMap) {
      if (ids.length > 1) duplicates.push({ ids, reason: 'duplicate_phone', value: phone });
    }

    // Stats - return shape matching frontend expectations
    const totalContacts = allContacts.length;
    const completeRecords = allContacts.filter(c => c.email && c.phone && (c.firstName || c.lastName)).length;
    const missingEmailOnly = allContacts.filter(c => !c.email && c.phone);
    const missingPhoneOnly = allContacts.filter(c => c.email && !c.phone);
    const missingBothArr = allContacts.filter(c => !c.email && !c.phone);
    
    // Stale contacts: no activity in last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const staleContactsArr = allContacts.filter(c => {
      const updated = c.updatedAt ? new Date(c.updatedAt) : null;
      return updated && updated < ninetyDaysAgo;
    });

    // Count unlinked records
    const unlinkedProspects = allContacts.filter(c => !c.prospectId).length;
    const unlinkedProtocols = allContacts.filter(c => !c.clientProtocolId).length;
    const unlinkedUsers = allContacts.filter(c => !c.userId).length;

    return {
      totalContacts,
      completeRecords,
      missingEmail: missingEmailOnly.map(c => ({
        id: c.id,
        fullName: c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown',
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        email: c.email,
        lifecycleStage: c.lifecycleStage,
        updatedAt: c.updatedAt,
      })),
      missingPhone: missingPhoneOnly.map(c => ({
        id: c.id,
        fullName: c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown',
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        email: c.email,
        lifecycleStage: c.lifecycleStage,
        updatedAt: c.updatedAt,
      })),
      missingBoth: missingBothArr.map(c => ({
        id: c.id,
        fullName: c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown',
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        email: c.email,
        lifecycleStage: c.lifecycleStage,
        updatedAt: c.updatedAt,
      })),
      staleContacts: staleContactsArr.map(c => ({
        id: c.id,
        fullName: c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown',
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        email: c.email,
        lifecycleStage: c.lifecycleStage,
        updatedAt: c.updatedAt,
      })),
      unlinkedProspects,
      unlinkedProtocols,
      unlinkedUsers,
      // Also include issues and duplicates for potential future use
      issues,
      duplicates,
    };
  }),

  /**
   * Comprehensive Data Integrity Audit
   * Scans the entire database for:
   * 1. Orphaned records (linked tables with no matching contact)
   * 2. Data mismatches (name/email/phone differs between contact and linked record)
   * 3. Duplicate contacts (same email or phone pointing to different contact IDs)
   * 4. Missing contactId links
   * 5. Overall health score
   */
  dataIntegrityAudit: adminProcedure
    .query(async () => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const allContacts = await database.select().from(contacts);
      const allProspects = await database.select().from(prospects);
      const allProtocols = await database.select().from(clientProtocols);
      const allProjects = await database.select().from(clientProjects);
      const allCustomOrders = await database.select().from(customOrders);
      const allPackingSlips = await database.select().from(packingSlips);
      const allUsers = await database.select().from(users);
      const allEnrollments = await database.select().from(transformationEnrollments);

      const contactMap = new Map(allContacts.map(c => [c.id, c]));

      // ─── 1. Data Mismatches ─────────────────────────────────────────
      const mismatches: Array<{
        table: string;
        recordId: number;
        contactId: number;
        field: string;
        contactValue: string | null;
        recordValue: string | null;
      }> = [];

      function normStr(s: string | null | undefined): string | null {
        if (!s) return null;
        return s.trim().toLowerCase();
      }

      // Check prospects
      for (const p of allProspects) {
        if (!p.contactId) continue;
        const c = contactMap.get(p.contactId);
        if (!c) continue;
        const contactFullName = [c.firstName, c.lastName].filter(Boolean).join(' ');
        if (p.name && normStr(p.name) !== normStr(contactFullName) && contactFullName) {
          mismatches.push({ table: 'prospects', recordId: p.id, contactId: p.contactId, field: 'name', contactValue: contactFullName, recordValue: p.name });
        }
        if (p.email && c.email && normStr(p.email) !== normStr(c.email)) {
          mismatches.push({ table: 'prospects', recordId: p.id, contactId: p.contactId, field: 'email', contactValue: c.email, recordValue: p.email });
        }
        if (p.phone && c.phone && p.phone.replace(/\D/g, '') !== c.phone.replace(/\D/g, '') && p.phone !== 'N/A') {
          mismatches.push({ table: 'prospects', recordId: p.id, contactId: p.contactId, field: 'phone', contactValue: c.phone, recordValue: p.phone });
        }
      }

      // Check client protocols
      for (const cp of allProtocols) {
        if (!cp.contactId) continue;
        const c = contactMap.get(cp.contactId);
        if (!c) continue;
        const contactFullName = [c.firstName, c.lastName].filter(Boolean).join(' ');
        if (cp.clientName && normStr(cp.clientName) !== normStr(contactFullName) && contactFullName) {
          mismatches.push({ table: 'clientProtocols', recordId: cp.id, contactId: cp.contactId, field: 'clientName', contactValue: contactFullName, recordValue: cp.clientName });
        }
        if (cp.clientEmail && c.email && normStr(cp.clientEmail) !== normStr(c.email)) {
          mismatches.push({ table: 'clientProtocols', recordId: cp.id, contactId: cp.contactId, field: 'clientEmail', contactValue: c.email, recordValue: cp.clientEmail });
        }
      }

      // Check client projects
      for (const proj of allProjects) {
        if (!proj.contactId) continue;
        const c = contactMap.get(proj.contactId);
        if (!c) continue;
        const contactFullName = [c.firstName, c.lastName].filter(Boolean).join(' ');
        if (proj.clientName && normStr(proj.clientName) !== normStr(contactFullName) && contactFullName) {
          mismatches.push({ table: 'clientProjects', recordId: proj.id, contactId: proj.contactId, field: 'clientName', contactValue: contactFullName, recordValue: proj.clientName });
        }
        if (proj.clientEmail && c.email && normStr(proj.clientEmail) !== normStr(c.email)) {
          mismatches.push({ table: 'clientProjects', recordId: proj.id, contactId: proj.contactId, field: 'clientEmail', contactValue: c.email, recordValue: proj.clientEmail });
        }
      }

      // Check custom orders
      for (const co of allCustomOrders) {
        if (!co.contactId) continue;
        const c = contactMap.get(co.contactId);
        if (!c) continue;
        const contactFullName = [c.firstName, c.lastName].filter(Boolean).join(' ');
        if (co.clientName && normStr(co.clientName) !== normStr(contactFullName) && contactFullName) {
          mismatches.push({ table: 'customOrders', recordId: co.id, contactId: co.contactId, field: 'clientName', contactValue: contactFullName, recordValue: co.clientName });
        }
        if (co.clientEmail && c.email && normStr(co.clientEmail) !== normStr(c.email)) {
          mismatches.push({ table: 'customOrders', recordId: co.id, contactId: co.contactId, field: 'clientEmail', contactValue: c.email, recordValue: co.clientEmail });
        }
      }

      // Check packing slips
      for (const ps of allPackingSlips) {
        if (!ps.contactId) continue;
        const c = contactMap.get(ps.contactId);
        if (!c) continue;
        const contactFullName = [c.firstName, c.lastName].filter(Boolean).join(' ');
        if (ps.clientName && normStr(ps.clientName) !== normStr(contactFullName) && contactFullName) {
          mismatches.push({ table: 'packingSlips', recordId: ps.id, contactId: ps.contactId, field: 'clientName', contactValue: contactFullName, recordValue: ps.clientName });
        }
      }

      // Check users
      for (const u of allUsers) {
        if (!u.contactId) continue;
        const c = contactMap.get(u.contactId);
        if (!c) continue;
        const contactFullName = [c.firstName, c.lastName].filter(Boolean).join(' ');
        if (u.name && normStr(u.name) !== normStr(contactFullName) && contactFullName) {
          mismatches.push({ table: 'users', recordId: u.id, contactId: u.contactId, field: 'name', contactValue: contactFullName, recordValue: u.name });
        }
      }

      // Check transformation enrollments
      for (const te of allEnrollments) {
        if (!te.contactId) continue;
        const c = contactMap.get(te.contactId);
        if (!c) continue;
        const contactFullName = [c.firstName, c.lastName].filter(Boolean).join(' ');
        if (te.clientName && normStr(te.clientName) !== normStr(contactFullName) && contactFullName) {
          mismatches.push({ table: 'transformationEnrollments', recordId: te.id, contactId: te.contactId, field: 'clientName', contactValue: contactFullName, recordValue: te.clientName });
        }
        if (te.clientEmail && c.email && normStr(te.clientEmail) !== normStr(c.email)) {
          mismatches.push({ table: 'transformationEnrollments', recordId: te.id, contactId: te.contactId, field: 'clientEmail', contactValue: c.email, recordValue: te.clientEmail });
        }
      }

      // ─── 2. Missing contactId links ─────────────────────────────────
      const missingLinks: Array<{ table: string; recordId: number; name: string | null; email: string | null }> = [];

      for (const p of allProspects) {
        if (!p.contactId) missingLinks.push({ table: 'prospects', recordId: p.id, name: p.name, email: p.email });
      }
      for (const cp of allProtocols) {
        if (!cp.contactId) missingLinks.push({ table: 'clientProtocols', recordId: cp.id, name: cp.clientName, email: cp.clientEmail });
      }
      for (const proj of allProjects) {
        if (!proj.contactId) missingLinks.push({ table: 'clientProjects', recordId: proj.id, name: proj.clientName, email: proj.clientEmail });
      }
      for (const co of allCustomOrders) {
        if (!co.contactId) missingLinks.push({ table: 'customOrders', recordId: co.id, name: co.clientName, email: co.clientEmail });
      }
      for (const ps of allPackingSlips) {
        if (!ps.contactId) missingLinks.push({ table: 'packingSlips', recordId: ps.id, name: ps.clientName, email: ps.clientEmail });
      }
      for (const u of allUsers) {
        if (!u.contactId) missingLinks.push({ table: 'users', recordId: u.id, name: u.name, email: u.email });
      }
      for (const te of allEnrollments) {
        if (!te.contactId) missingLinks.push({ table: 'transformationEnrollments', recordId: te.id, name: te.clientName, email: te.clientEmail });
      }

      // ─── 3. Orphaned contactIds (point to non-existent contact) ─────
      const orphanedRecords: Array<{ table: string; recordId: number; contactId: number }> = [];

      for (const p of allProspects) {
        if (p.contactId && !contactMap.has(p.contactId)) orphanedRecords.push({ table: 'prospects', recordId: p.id, contactId: p.contactId });
      }
      for (const cp of allProtocols) {
        if (cp.contactId && !contactMap.has(cp.contactId)) orphanedRecords.push({ table: 'clientProtocols', recordId: cp.id, contactId: cp.contactId });
      }
      for (const proj of allProjects) {
        if (proj.contactId && !contactMap.has(proj.contactId)) orphanedRecords.push({ table: 'clientProjects', recordId: proj.id, contactId: proj.contactId });
      }
      for (const co of allCustomOrders) {
        if (co.contactId && !contactMap.has(co.contactId)) orphanedRecords.push({ table: 'customOrders', recordId: co.id, contactId: co.contactId });
      }
      for (const ps of allPackingSlips) {
        if (ps.contactId && !contactMap.has(ps.contactId)) orphanedRecords.push({ table: 'packingSlips', recordId: ps.id, contactId: ps.contactId });
      }
      for (const u of allUsers) {
        if (u.contactId && !contactMap.has(u.contactId)) orphanedRecords.push({ table: 'users', recordId: u.id, contactId: u.contactId });
      }
      for (const te of allEnrollments) {
        if (te.contactId && !contactMap.has(te.contactId)) orphanedRecords.push({ table: 'transformationEnrollments', recordId: te.id, contactId: te.contactId });
      }

      // ─── 4. Duplicate contacts (same email or phone) ────────────────
      const duplicateEmails: Array<{ email: string; contactIds: number[]; names: string[] }> = [];
      const duplicatePhones: Array<{ phone: string; contactIds: number[]; names: string[] }> = [];

      const emailMap = new Map<string, Array<{ id: number; name: string }>>(); 
      const phoneMap = new Map<string, Array<{ id: number; name: string }>>();

      for (const c of allContacts) {
        const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ') || '(unnamed)';
        if (c.email) {
          const normEmail = c.email.toLowerCase().trim();
          if (!emailMap.has(normEmail)) emailMap.set(normEmail, []);
          emailMap.get(normEmail)!.push({ id: c.id, name: fullName });
        }
        if (c.phone) {
          const normPhone = c.phone.replace(/\D/g, '');
          if (normPhone.length >= 7) {
            if (!phoneMap.has(normPhone)) phoneMap.set(normPhone, []);
            phoneMap.get(normPhone)!.push({ id: c.id, name: fullName });
          }
        }
      }

      for (const [email, entries] of emailMap) {
        if (entries.length > 1) {
          duplicateEmails.push({ email, contactIds: entries.map(e => e.id), names: entries.map(e => e.name) });
        }
      }
      for (const [phone, entries] of phoneMap) {
        if (entries.length > 1) {
          duplicatePhones.push({ phone, contactIds: entries.map(e => e.id), names: entries.map(e => e.name) });
        }
      }

      // ─── 5. Summary stats ───────────────────────────────────────────
      const totalLinkedRecords = 
        allProspects.filter(p => p.contactId).length +
        allProtocols.filter(p => p.contactId).length +
        allProjects.filter(p => p.contactId).length +
        allCustomOrders.filter(p => p.contactId).length +
        allPackingSlips.filter(p => p.contactId).length +
        allUsers.filter(p => p.contactId).length +
        allEnrollments.filter(p => p.contactId).length;

      const totalRecords = 
        allProspects.length + allProtocols.length + allProjects.length +
        allCustomOrders.length + allPackingSlips.length + allUsers.length + allEnrollments.length;

      const totalIssues = mismatches.length + missingLinks.length + orphanedRecords.length + duplicateEmails.length + duplicatePhones.length;
      const healthScore = totalRecords > 0 
        ? Math.round(((totalRecords - totalIssues) / totalRecords) * 100) 
        : 100;

      return {
        summary: {
          totalContacts: allContacts.length,
          totalRecords,
          totalLinkedRecords,
          totalUnlinked: missingLinks.length,
          totalMismatches: mismatches.length,
          totalOrphaned: orphanedRecords.length,
          totalDuplicateEmails: duplicateEmails.length,
          totalDuplicatePhones: duplicatePhones.length,
          totalIssues,
          healthScore,
        },
        tableCounts: {
          contacts: allContacts.length,
          prospects: allProspects.length,
          clientProtocols: allProtocols.length,
          clientProjects: allProjects.length,
          customOrders: allCustomOrders.length,
          packingSlips: allPackingSlips.length,
          users: allUsers.length,
          transformationEnrollments: allEnrollments.length,
        },
        mismatches,
        missingLinks,
        orphanedRecords,
        duplicateEmails,
        duplicatePhones,
        auditTimestamp: new Date().toISOString(),
      };
    }),

  /**
   * Fix data mismatches: Sync a linked record's data to match its master contact
   */
  fixMismatch: adminProcedure
    .input(z.object({
      contactId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const [contact] = await database.select().from(contacts).where(eq(contacts.id, input.contactId));
      if (!contact) throw new Error("Contact not found");

      const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || null;

      // Re-propagate the contact's canonical data to all linked tables
      await propagateContactChanges({
        contactId: input.contactId,
        name: fullName,
        email: contact.email,
        phone: contact.phone,
      });

      return { success: true, contactId: input.contactId, syncedName: fullName, syncedEmail: contact.email };
    }),

  /**
   * Fix ALL mismatches at once: Re-sync every contact's data to all linked records
   */
  fixAllMismatches: adminProcedure
    .mutation(async () => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const allContactsList = await database.select().from(contacts);
      let fixed = 0;

      for (const contact of allContactsList) {
        const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || null;
        try {
          await propagateContactChanges({
            contactId: contact.id,
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
  /**
   * Journey Timeline — aggregates all events for a person into a chronological timeline
   */
  journeyTimeline: adminProcedure
    .input(z.object({
      email: z.string().optional(),
      contactId: z.number().optional(),
      personId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      let emailLower: string | null = null;
      let contactId: number | null = null;
      if (input.contactId) {
        const [c] = await database.select().from(contacts).where(eq(contacts.id, input.contactId)).limit(1);
        if (c) { contactId = c.id; emailLower = c.email?.toLowerCase() || null; }
      }
      if (!emailLower && input.personId) {
        const [type, idStr] = input.personId.split(':');
        const id = parseInt(idStr);
        if (type === 'prospect' && id) {
          const [p] = await database.select().from(prospects).where(eq(prospects.id, id)).limit(1);
          if (p) { emailLower = p.email?.toLowerCase() || null; if ((p as any).contactId) contactId = (p as any).contactId; }
        } else if (type === 'client' && id) {
          const [cp] = await database.select().from(clientProtocols).where(eq(clientProtocols.id, id)).limit(1);
          if (cp) { emailLower = cp.clientEmail?.toLowerCase() || null; if ((cp as any).contactId) contactId = (cp as any).contactId; }
        }
      }
      if (!emailLower && input.email) emailLower = input.email.toLowerCase();
      const events: Array<{ id: string; date: string; type: string; category: string; title: string; description: string; icon: string; color: string }> = [];
      // 1. Prospect events
      let prospectRecords: any[] = [];
      if (contactId) prospectRecords = await database.select().from(prospects).where(sql`${prospects.contactId} = ${contactId}`);
      if (emailLower) {
        const byEmail = await database.select().from(prospects).where(eq(prospects.email, emailLower));
        for (const p of byEmail) if (!prospectRecords.find((r: any) => r.id === p.id)) prospectRecords.push(p);
      }
      for (const p of prospectRecords) {
        events.push({ id: `prospect-created-${p.id}`, date: p.createdAt || '', type: 'prospect_created', category: 'Pipeline', title: 'Lead Created', description: `Added as prospect via ${p.source || 'unknown source'}`, icon: 'UserPlus', color: 'blue' });
        if (p.discoveryCallDate) events.push({ id: `discovery-${p.id}`, date: p.discoveryCallDate, type: 'discovery_call', category: 'Pipeline', title: 'Discovery Call', description: `Discovery session${p.discoveryCallNotes ? ': ' + p.discoveryCallNotes.substring(0, 100) : ''}`, icon: 'Phone', color: 'purple' });
      }
      // 2. Protocol events
      let protocols: any[] = [];
      if (contactId) protocols = await database.select().from(clientProtocols).where(sql`${clientProtocols.contactId} = ${contactId}`);
      if (emailLower) {
        const byEmail = await database.select().from(clientProtocols).where(eq(clientProtocols.clientEmail, emailLower));
        for (const cp of byEmail) if (!protocols.find((r: any) => r.id === cp.id)) protocols.push(cp);
      }
      for (const cp of protocols) {
        events.push({ id: `protocol-created-${cp.id}`, date: cp.createdAt || '', type: 'protocol_created', category: 'Protocol', title: 'Protocol Created', description: `"${cp.templateName || 'Custom'}" protocol assigned`, icon: 'FileText', color: 'green' });
        if (cp.approvedAt) events.push({ id: `protocol-approved-${cp.id}`, date: cp.approvedAt, type: 'protocol_approved', category: 'Protocol', title: 'Protocol Approved', description: 'Client approved their protocol', icon: 'CheckCircle', color: 'green' });
      }
      // 3. Enrollment events
      let user: any = null;
      if (contactId) { const [u] = await database.select().from(users).where(sql`${users.contactId} = ${contactId}`).limit(1); if (u) user = u; }
      if (!user && emailLower) { const [u] = await database.select().from(users).where(eq(users.email, emailLower)).limit(1); if (u) user = u; }
      if (user) {
        const enrollments = await database.select().from(transformationEnrollments).where(eq(transformationEnrollments.userId, user.id));
        for (const e of enrollments) {
          events.push({ id: `enrollment-${e.id}`, date: (e as any).createdAt || '', type: 'enrollment_created', category: 'Enrollment', title: 'Enrolled in Program', description: `${(e as any).programType?.replace(/_/g, ' ') || 'Transformation'} — ${(e as any).tierName || 'Standard'}`, icon: 'Star', color: 'amber' });
          if ((e as any).strategySessionDate) events.push({ id: `strategy-${e.id}`, date: (e as any).strategySessionDate, type: 'strategy_session', category: 'Enrollment', title: 'Strategy Session', description: 'Strategy session completed', icon: 'Calendar', color: 'purple' });
          if ((e as any).kickoffCallDate) events.push({ id: `kickoff-${e.id}`, date: (e as any).kickoffCallDate, type: 'kickoff_call', category: 'Enrollment', title: 'Kickoff Call', description: 'Kickoff call completed', icon: 'Rocket', color: 'orange' });
        }
      }
      // 4. Appointment events
      if (emailLower) {
        const appts = await database.select({ id: appointments.id, startTime: appointments.startTime, status: appointments.status, appointmentTypeName: appointmentTypes.name }).from(appointments).leftJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id)).where(eq(appointments.clientEmail, emailLower)).orderBy(desc(appointments.startTime)).limit(50);
        for (const a of appts) {
          events.push({ id: `appt-${a.id}`, date: a.startTime || '', type: 'appointment', category: 'Appointment', title: a.appointmentTypeName || 'Appointment', description: `Status: ${a.status || 'scheduled'}`, icon: 'Calendar', color: a.status === 'completed' ? 'green' : a.status === 'cancelled' ? 'red' : 'blue' });
        }
      }
      // 5. Store order events
      if (user) {
        const orders = await database.select().from(storeOrders).where(eq(storeOrders.userId, user.id)).orderBy(desc(storeOrders.createdAt)).limit(20);
        for (const o of orders) {
          events.push({ id: `order-${o.id}`, date: (o as any).createdAt || '', type: 'store_order', category: 'Store', title: 'Store Order', description: `Order #${o.id} — $${(o as any).totalAmount || '?'}`, icon: 'ShoppingCart', color: 'emerald' });
        }
      }
      // 6. Automation events
      const protocolIds = protocols.map((p: any) => p.id);
      const projectIds: number[] = [];
      for (const cp of protocols) {
        const projs = await database.select().from(clientProjects).where(eq(clientProjects.clientProtocolId, cp.id));
        for (const proj of projs) projectIds.push(proj.id);
      }
      if (protocolIds.length > 0) {
        for (const cpId of protocolIds) {
          const autoEvents = await database.select().from(automationEvents).where(eq(automationEvents.clientProtocolId, cpId)).orderBy(desc(automationEvents.createdAt)).limit(50);
          for (const ae of autoEvents) {
            events.push({ id: `auto-${ae.id}`, date: ae.createdAt || '', type: 'automation', category: 'Automation', title: ae.eventType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), description: ae.details || '', icon: 'Zap', color: ae.status === 'failed' ? 'red' : 'cyan' });
          }
        }
      }
      // 7. Project activity log
      if (projectIds.length > 0) {
        for (const projId of projectIds) {
          const logs = await database.select().from(projectActivityLog).where(eq(projectActivityLog.clientProjectId, projId)).orderBy(desc(projectActivityLog.createdAt)).limit(30);
          for (const log of logs) {
            events.push({ id: `activity-${log.id}`, date: log.createdAt || '', type: 'project_activity', category: 'Project', title: log.actionType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), description: log.description || '', icon: 'Activity', color: 'slate' });
          }
        }
      }
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return { events, totalCount: events.length };
    }),
});
