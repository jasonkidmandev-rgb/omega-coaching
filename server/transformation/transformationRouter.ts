import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb, cloneTemplateToClientProtocol, getDefaultTemplate, getClientProtocolByEmail, generateAccessToken, createClientProtocol } from "../db";
import { sql } from "drizzle-orm";
import { sendTransformationMilestoneEmail, sendAdminMilestoneNotification, sendTransformationPaymentConfirmationEmail, sendTransformationPaymentAdminNotification, sendEmail, sendCheckoutConfirmationEmail } from "../emailService";
import { checkRateLimit, getClientIp } from "../utils/rateLimiter";
import { autoCreateOrLinkClient, logEnrollmentActivity } from "../provisioning/clientProvisioning";
// PayPal/Venmo removed - migrating to Stripe
// createPayPalOrder functions kept in db.ts for historical record lookup only

// Helper to get db with null check
async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

// ============================================
// ACCESS CODE MANAGEMENT
// ============================================

export const transformationRouter = router({
  // Capture email for masterclass access (public)
  captureMasterclassEmail: publicProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      phone: z.string().optional(),
      source: z.string().default("masterclass_signup"),
    }))
    .mutation(async ({ input, ctx }) => {
      const { email, name, phone, source } = input;
      const database = await db();
      
      // Check if this email already exists in prospects
      const existing = await database.execute(sql`
        SELECT id, name, phone FROM prospects WHERE email = ${email} LIMIT 1
      `);
      const existingRows = (existing[0] as unknown as any[]) || [];
      
      if (existingRows.length > 0) {
        // Update last contacted, and backfill name/phone if they were previously missing
        const existingProspect = existingRows[0];
        const shouldUpdateName = name && (!existingProspect.name || existingProspect.name === 'Masterclass Viewer');
        const shouldUpdatePhone = phone && (!existingProspect.phone || existingProspect.phone === 'N/A');
        
        if (shouldUpdateName && shouldUpdatePhone) {
          await database.execute(sql`
            UPDATE prospects SET name = ${name}, phone = ${phone}, lastViewedAt = NOW(), updatedAt = NOW() WHERE email = ${email}
          `);
        } else if (shouldUpdateName) {
          await database.execute(sql`
            UPDATE prospects SET name = ${name}, lastViewedAt = NOW(), updatedAt = NOW() WHERE email = ${email}
          `);
        } else if (shouldUpdatePhone) {
          await database.execute(sql`
            UPDATE prospects SET phone = ${phone}, lastViewedAt = NOW(), updatedAt = NOW() WHERE email = ${email}
          `);
        } else {
          await database.execute(sql`
            UPDATE prospects SET lastViewedAt = NOW(), updatedAt = NOW() WHERE email = ${email}
          `);
        }
        return { success: true, alreadyRegistered: true, prospectId: existingProspect.id };
      }
      
      // Derive a readable name from email prefix if no name provided
      const deriveName = (em: string) => {
        const prefix = em.split('@')[0];
        return prefix.replace(/[._]/g, ' ').replace(/\d+$/, '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ').trim() || em;
      };
      const displayName = name || deriveName(email);
      const displayPhone = phone || 'N/A';

      // Dedup: also check by phone or name match before creating
      const phoneDedup = phone ? await database.execute(sql`SELECT id FROM prospects WHERE phone = ${phone} LIMIT 1`) : { 0: [] };
      const phoneMatch = ((phoneDedup as any)[0] as any[]) || [];
      if (phoneMatch.length > 0) {
        // Update existing prospect found by phone
        const existingId = phoneMatch[0].id;
        await database.execute(sql`
          UPDATE prospects SET email = ${email}, name = ${displayName}, lastViewedAt = NOW(), updatedAt = NOW() WHERE id = ${existingId}
        `);
        return { success: true, alreadyRegistered: true, prospectId: existingId };
      }

      // Create new prospect — auto-assign to Shannon (team member ID 30001)
      const SHANNON_TEAM_ID = 30001;
      const trackingToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const result = await database.execute(sql`
        INSERT INTO prospects (name, email, phone, source, trackingToken, status, assignedTo)
        VALUES (${displayName}, ${email}, ${displayPhone}, ${source}, ${trackingToken}, 'viewing', ${SHANNON_TEAM_ID})
      `);
      
      const prospectId = (result[0] as any).insertId;
      
      // Log engagement
      try {
        await database.execute(sql`
          INSERT INTO prospect_engagement (prospectId, eventType, metadata)
          VALUES (${prospectId}, 'masterclass_view', ${JSON.stringify({ email, name: name || null, phone: phone || null, source, timestamp: new Date().toISOString() })})
        `);
      } catch (err) {
        console.error('[captureMasterclassEmail] Failed to log engagement:', err);
      }
      
      // Send admin notification
      try {
        await sendEmail({
          to: 'omega@omegalongevity.com',
          subject: `New Masterclass Signup: ${name || email}`,
          html: `<p>A new visitor signed up for the free peptide masterclass.</p><p><strong>Email:</strong> ${email}</p><p><strong>Name:</strong> ${name || 'Not provided'}</p><p><strong>Phone:</strong> ${phone || 'Not provided'}</p><p><strong>Source:</strong> ${source}</p>`,
        });
      } catch (err) {
        console.error('[captureMasterclassEmail] Failed to send admin notification:', err);
      }
      
      return { success: true, alreadyRegistered: false, prospectId };
    }),

  // Access code procedures removed - feature deprecated

  // ============================================
  // MASTERCLASS VIDEOS
  // ============================================

  // Get all masterclass videos
  getMasterclassVideos: publicProcedure.query(async () => {
    const database = await db();
    const videos = await database.execute(sql`
      SELECT * FROM masterclass_videos 
      WHERE isActive = TRUE 
      ORDER BY sortOrder ASC
    `);
    return (videos[0] as unknown as any[]) || [];
  }),

  // Update masterclass video (admin)
  updateMasterclassVideo: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      googleDriveFolderId: z.string().optional(),
      googleDriveVideoId: z.string().optional(),
      youtubeVideoId: z.string().optional(),
      estimatedDurationMinutes: z.number().optional(),
      chapters: z.string().optional(),
      isRequired: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, title, description, googleDriveFolderId, googleDriveVideoId, youtubeVideoId, estimatedDurationMinutes, isRequired, isActive } = input;
      const database = await db();
      
      if (title !== undefined) {
        await database.execute(sql`UPDATE masterclass_videos SET title = ${title} WHERE id = ${id}`);
      }
      if (description !== undefined) {
        await database.execute(sql`UPDATE masterclass_videos SET description = ${description} WHERE id = ${id}`);
      }
      if (googleDriveFolderId !== undefined) {
        await database.execute(sql`UPDATE masterclass_videos SET googleDriveFolderId = ${googleDriveFolderId} WHERE id = ${id}`);
      }
      if (googleDriveVideoId !== undefined) {
        await database.execute(sql`UPDATE masterclass_videos SET googleDriveVideoId = ${googleDriveVideoId} WHERE id = ${id}`);
      }
      if (youtubeVideoId !== undefined) {
        await database.execute(sql`UPDATE masterclass_videos SET youtubeVideoId = ${youtubeVideoId} WHERE id = ${id}`);
      }
      if (estimatedDurationMinutes !== undefined) {
        await database.execute(sql`UPDATE masterclass_videos SET estimatedDurationMinutes = ${estimatedDurationMinutes} WHERE id = ${id}`);
      }
      if (input.chapters !== undefined) {
        await database.execute(sql`UPDATE masterclass_videos SET chapters = ${input.chapters} WHERE id = ${id}`);
      }
      if (isRequired !== undefined) {
        await database.execute(sql`UPDATE masterclass_videos SET isRequired = ${isRequired} WHERE id = ${id}`);
      }
      if (isActive !== undefined) {
        await database.execute(sql`UPDATE masterclass_videos SET isActive = ${isActive} WHERE id = ${id}`);
      }
      
      return { success: true };
    }),

  // ============================================
  // ENROLLMENTS
  // ============================================

  // Create enrollment (legacy - now redirects to createDirectEnrollment logic, access codes removed)
  createEnrollment: publicProcedure
    .input(z.object({
      email: z.string().email().optional(),
      programType: z.enum(["90_day_transformation", "protocol_only"]).default("90_day_transformation"),
      tier: z.string().default("flagship"),
    }))
    .mutation(async ({ input, ctx }) => {
      const { programType, tier } = input;
      const userId = ctx.user?.id || null;
      const database = await db();
      
      // ===== DUPLICATE ENROLLMENT PREVENTION =====
      if (userId) {
        const existingEnrollments = await database.execute(sql`
          SELECT id, status, tier, programType, createdAt
          FROM transformation_enrollments
          WHERE userId = ${userId}
            AND status NOT IN ('completed', 'renewed')
          ORDER BY createdAt DESC
          LIMIT 1
        `);
        const existingRows = (existingEnrollments[0] as unknown) as any[];
        if (existingRows.length > 0) {
          const existing = existingRows[0];
          console.log(`[createEnrollment] Duplicate prevention: user ${userId} already has active enrollment ${existing.id} (status: ${existing.status})`);
          return { 
            success: true, 
            enrollmentId: existing.id, 
            tier: existing.tier,
            existingEnrollment: true,
            message: `You already have an active enrollment (ID: ${existing.id}). Resuming your existing journey.`
          };
        }
      }
      
      if (!userId && input.email) {
        const existingByEmail = await database.execute(sql`
          SELECT id, status, tier, programType, createdAt
          FROM transformation_enrollments
          WHERE email = ${input.email}
            AND status NOT IN ('completed', 'renewed')
          ORDER BY createdAt DESC
          LIMIT 1
        `);
        const existingEmailRows = (existingByEmail[0] as unknown) as any[];
        if (existingEmailRows.length > 0) {
          const existing = existingEmailRows[0];
          console.log(`[createEnrollment] Duplicate prevention: guest email ${input.email} already has active enrollment ${existing.id}`);
          return { 
            success: true, 
            enrollmentId: existing.id, 
            tier: existing.tier,
            existingEnrollment: true,
            message: `You already have an active enrollment. Resuming your existing journey.`
          };
        }
      }
      // ===== END DUPLICATE PREVENTION =====
      
      // Always capture name and email on the enrollment row
      const clientName = ctx.user?.name || null;
      const clientEmail = ctx.user?.email || input.email || null;
      const result = await database.execute(sql`
        INSERT INTO transformation_enrollments (userId, clientName, email, programType, tier, status)
        VALUES (${userId}, ${clientName}, ${clientEmail}, ${programType}, ${tier}, 'enrolled')
      `);
      
      const insertId = (result[0] as any).insertId;
      
      // Create in-app admin notification for new enrollment
      try {
        const notifName = clientName || input.email || 'New Client';
        const notifEmail = clientEmail || 'Unknown';
        await database.execute(sql`
          INSERT INTO notifications (userId, type, title, message, createdAt)
          SELECT u.id, 'new_enrollment',
            ${`New Enrollment: ${notifName}`},
            ${`${notifName} (${notifEmail}) enrolled in the ${tier} tier transformation program`},
            NOW()
          FROM users u WHERE u.role = 'admin'
        `);
      } catch (notifErr) {
        console.error('[createEnrollment] Failed to create admin notification:', notifErr);
      }

      // Send admin email notification for new enrollment
      try {
        const adminNotifName = clientName || input.email || 'New Client';
        const adminNotifEmail = clientEmail || 'Unknown';
        const adminResult = await database.execute(sql`SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL`);
        const adminEmails = ((adminResult[0] as unknown) as any[])?.map((r: any) => r.email).filter(Boolean) || [];
        if (adminEmails.length > 0) {
          await sendAdminMilestoneNotification({
            adminEmails,
            clientName: adminNotifName,
            clientEmail: adminNotifEmail,
            milestone: 'new_enrollment',
            milestoneLabel: `New Enrollment - ${tier} Tier`
          });
        }
      } catch (emailErr) {
        console.error('[createEnrollment] Failed to send admin enrollment email:', emailErr);
      }
      
      // Send welcome email to client
      try {
        if (clientEmail) {
          const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
          await sendTransformationMilestoneEmail({
            to: clientEmail,
            clientName: ctx.user?.name || 'Valued Client',
            milestone: 'enrolled' as any,
            nextStepTitle: 'Watch the Bioregulator Video',
            nextStepDescription: 'Start by watching the introductory bioregulator video to learn about the science behind your transformation.',
            dashboardUrl: `${baseUrl}/transformation`,
            enrollmentId: insertId,
          });
        }
      } catch (emailErr) {
        console.error('[createEnrollment] Failed to send welcome email:', emailErr);
      }
      
      // Log enrollment creation in activity log
      await logEnrollmentActivity(database, insertId, 'enrollment_created', {
        tier,
        programType,
      }, ctx.user?.name || 'Client', ctx.user?.id || undefined);
      
      // Auto-create or link client record so they appear in Clients immediately
      if (clientEmail) {
        await autoCreateOrLinkClient(database, insertId, clientEmail, clientName);
      }
      
      return { success: true, enrollmentId: insertId, tier };
    }),

  // Create direct enrollment (no access code required) - for the new funnel flow
  createDirectEnrollment: publicProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      tier: z.enum(["elite", "flagship", "essentials", "advanced", "recovery", "immunity", "longevity", "mitochondria", "functional_health_elite", "coaching_20min", "coaching_60min"]),
      programType: z.enum(["90_day_transformation", "protocol_only", "coaching_session"]).default("90_day_transformation"),
      vipConcierge: z.boolean().default(false),
      vipConciergeFee: z.number().optional(),
      // Honeypot field - bots will auto-fill this, humans won't see it
      website: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { email, name, tier, programType, vipConcierge, vipConciergeFee, website } = input;
      const userId = ctx.user?.id || null;
      
      // HONEYPOT CHECK: If the hidden "website" field is filled, it's a bot
      if (website && website.trim().length > 0) {
        console.log(`[createDirectEnrollment] HONEYPOT TRIGGERED: email=${email}, name=${name}, website="${website}"`);
        // Return a fake success to not alert the bot
        return { success: true, enrollmentId: 0, tier, vipConcierge: false };
      }
      
      // RATE LIMITING: Max 3 enrollment attempts per IP per hour
      const clientIp = getClientIp(ctx.req);
      const rateCheck = checkRateLimit(`enrollment:${clientIp}`, 3, 3600000); // 3 per hour
      if (!rateCheck.allowed) {
        const minutesLeft = Math.ceil(rateCheck.resetInMs / 60000);
        console.log(`[createDirectEnrollment] RATE LIMITED: ip=${clientIp}, email=${email}, resetIn=${minutesLeft}min`);
        throw new Error(`Too many attempts. Please try again in ${minutesLeft} minutes.`);
      }
      
      const database = await db();
      
      // Duplicate prevention - check by userId or email
      if (userId) {
        const existingEnrollments = await database.execute(sql`
          SELECT id, status, tier, programType, createdAt
          FROM transformation_enrollments
          WHERE userId = ${userId}
            AND status NOT IN ('completed', 'renewed')
          ORDER BY createdAt DESC
          LIMIT 1
        `);
        const existingRows = (existingEnrollments[0] as unknown) as any[];
        if (existingRows.length > 0) {
          const existing = existingRows[0];
          console.log(`[createDirectEnrollment] Duplicate prevention: user ${userId} already has active enrollment ${existing.id}`);
          // Ensure client record exists even for returning enrollments
          if (email) {
            await autoCreateOrLinkClient(database, existing.id, email, name || ctx.user?.name || null);
          }
          return { 
            success: true, 
            enrollmentId: existing.id, 
            tier: existing.tier,
            existingEnrollment: true,
            message: `You already have an active enrollment (ID: ${existing.id}). Resuming your existing journey.`
          };
        }
      }
      
      if (!userId && email) {
        const existingByEmail = await database.execute(sql`
          SELECT id, status, tier, programType, createdAt
          FROM transformation_enrollments
          WHERE email = ${email}
            AND status NOT IN ('completed', 'renewed')
          ORDER BY createdAt DESC
          LIMIT 1
        `);
        const existingEmailRows = (existingByEmail[0] as unknown) as any[];
        if (existingEmailRows.length > 0) {
          const existing = existingEmailRows[0];
          console.log(`[createDirectEnrollment] Duplicate prevention: email ${email} already has active enrollment ${existing.id}`);
          // Ensure client record exists even for returning enrollments
          await autoCreateOrLinkClient(database, existing.id, email, name || null);
          return { 
            success: true, 
            enrollmentId: existing.id, 
            tier: existing.tier,
            existingEnrollment: true,
            message: `You already have an active enrollment. Resuming your existing journey.`
          };
        }
      }
      
      // Create enrollment without access code - always store name
      const clientName = name || ctx.user?.name || null;
      const result = await database.execute(sql`
        INSERT INTO transformation_enrollments (userId, clientName, email, programType, tier, status, vipConcierge, vipConciergeFee)
        VALUES (${userId}, ${clientName}, ${email}, ${programType}, ${tier}, 'enrolled', ${vipConcierge ? 1 : 0}, ${vipConciergeFee || null})
      `);
      
      const insertId = (result[0] as any).insertId;
      
      // Admin notification
      try {
        const notifName = clientName || 'New Client';
        await database.execute(sql`
          INSERT INTO notifications (userId, type, title, message, createdAt)
          SELECT u.id, 'new_enrollment',
            ${`New Enrollment: ${notifName}`},
            ${`${notifName} (${email}) enrolled in the ${tier} tier transformation program via direct purchase${vipConcierge ? ' [VIP CONCIERGE]' : ''}`},
            NOW()
          FROM users u WHERE u.role = 'admin'
        `);
      } catch (notifErr) {
        console.error('[createDirectEnrollment] Failed to create admin notification:', notifErr);
      }

      // Admin email
      try {
        const adminNotifName = clientName || 'New Client';
        const adminResult = await database.execute(sql`SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL`);
        const adminEmails = ((adminResult[0] as unknown) as any[])?.map((r: any) => r.email).filter(Boolean) || [];
        if (adminEmails.length > 0) {
          await sendAdminMilestoneNotification({
            adminEmails,
            clientName: adminNotifName,
            clientEmail: email,
            milestone: 'new_enrollment',
            milestoneLabel: `New Direct Enrollment - ${tier} Tier`
          });
        }
      } catch (emailErr) {
        console.error('[createDirectEnrollment] Failed to send admin email:', emailErr);
      }
      
      // Welcome email to client
      try {
        if (email) {
          const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
          await sendTransformationMilestoneEmail({
            to: email,
            clientName: name || ctx.user?.name || 'Valued Client',
            milestone: 'enrolled' as any,
            nextStepTitle: 'Complete Your Intake Form',
            nextStepDescription: 'Start by completing your intake form so your coach can begin designing your personalized protocol.',
            dashboardUrl: `${baseUrl}/transformation`,
            enrollmentId: insertId,
          });
        }
      } catch (emailErr) {
        console.error('[createDirectEnrollment] Failed to send welcome email:', emailErr);
      }
      
      // Activity log
      await logEnrollmentActivity(database, insertId, 'enrollment_created', {
        tier,
        programType,
        source: 'direct_purchase',
        email,
        vipConcierge,
        vipConciergeFee: vipConciergeFee || null,
      }, name || ctx.user?.name || 'Client', ctx.user?.id || undefined);
      
      // Auto-create or link client record so they appear in Clients immediately
      if (email) {
        await autoCreateOrLinkClient(database, insertId, email, name || ctx.user?.name || null);
      }
      
       return { success: true, enrollmentId: insertId, tier, vipConcierge };
    }),

  // Send checkout confirmation email after completing the full checkout flow
  sendCheckoutConfirmation: publicProcedure
    .input(z.object({
      enrollmentId: z.number(),
      planKey: z.string(),
      planName: z.string(),
      planPrice: z.number(),
      paymentMethod: z.enum(['stripe', 'manual', 'paypal', 'venmo', 'other']).default('stripe'),
      intakeCompleted: z.boolean(),
      discoveryScheduled: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      
      // Get enrollment details
      const enrollmentResult = await database.execute(sql`
        SELECT e.email, e.tier, e.userId, COALESCE(u.name, e.clientName) as userName, u.email as userEmail
        FROM transformation_enrollments e
        LEFT JOIN users u ON e.userId = u.id
        WHERE e.id = ${input.enrollmentId}
        LIMIT 1
      `);
      const rows = (enrollmentResult[0] as unknown) as any[];
      const enrollment = rows?.[0];
      
      if (!enrollment) {
        return { success: false, message: 'Enrollment not found' };
      }
      
      const clientEmail = enrollment.email || enrollment.userEmail || ctx.user?.email;
      const clientName = enrollment.userName || ctx.user?.name || 'Valued Client';
      
      if (!clientEmail) {
        return { success: false, message: 'No email address found for enrollment' };
      }
      
      try {
        const result = await sendCheckoutConfirmationEmail({
          to: clientEmail,
          clientName,
          planKey: input.planKey,
          planName: input.planName,
          planPrice: input.planPrice,
          paymentMethod: input.paymentMethod,
          intakeCompleted: input.intakeCompleted,
          discoveryScheduled: input.discoveryScheduled,
          enrollmentId: input.enrollmentId,
          userId: enrollment.userId || ctx.user?.id,
        });
        
        // Log the activity
        await logEnrollmentActivity(database, input.enrollmentId, 'checkout_confirmation_sent', {
          planKey: input.planKey,
          intakeCompleted: input.intakeCompleted,
          discoveryScheduled: input.discoveryScheduled,
          emailSent: result.success,
        }, clientName, enrollment.userId || ctx.user?.id);
        
        return result;
      } catch (error) {
        console.error('[sendCheckoutConfirmation] Failed:', error);
        return { success: false, message: 'Failed to send confirmation email' };
      }
    }),

  // Get enrollment by ID (public - for non-logged-in users with enrollment ID)
  getEnrollmentPublic: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const enrollment = await database.execute(sql`
        SELECT * FROM transformation_enrollments WHERE id = ${input.id}
      `);
      const rows = (enrollment[0] as unknown) as any[];
      if (!rows[0]) return null;
      
      // Add computed fields based on status for frontend compatibility
      const e = rows[0];
      const statusOrder = [
        'enrolled', 'watching_videos', 'video_complete', 'coaching_paid',
        'intake_complete', 'discovery_scheduled', 'discovery_complete', 'protocol_preparing',
        'protocol_review', 'protocol_paid', 'launched', 'fulfillment',
        'shipped', 'delivered', 'training_scheduled', 'training_complete',
        'active', 'week3_review', 'month2', 'month3_final', 'completed', 'renewed'
      ];
      const currentStatusIndex = statusOrder.indexOf(e.status);
      
      return {
        ...e,
        // Computed fields for frontend compatibility
        bioregulatorVideoWatched: e.bioregulatorVideoWatched || currentStatusIndex >= statusOrder.indexOf('video_complete'),
        coachingFeePaid: e.coachingFeePaid || currentStatusIndex >= statusOrder.indexOf('coaching_paid'),
        intakeFormCompleted: e.intakeFormCompleted || currentStatusIndex >= statusOrder.indexOf('intake_complete'),
        waiverCompleted: currentStatusIndex >= statusOrder.indexOf('discovery_scheduled'),
        discoverySessionScheduled: e.discoverySessionScheduledAt ? true : currentStatusIndex >= statusOrder.indexOf('discovery_scheduled'),
        discoverySessionCompleted: e.discoverySessionCompletedAt ? true : currentStatusIndex >= statusOrder.indexOf('discovery_complete'),
        protocolReady: currentStatusIndex >= statusOrder.indexOf('protocol_review'),
        protocolApproved: currentStatusIndex >= statusOrder.indexOf('protocol_paid'),
        boxShipped: currentStatusIndex >= statusOrder.indexOf('shipped'),
        boxDelivered: currentStatusIndex >= statusOrder.indexOf('delivered'),
        reconstitutionScheduled: currentStatusIndex >= statusOrder.indexOf('training_scheduled'),
        reconstitutionCompleted: currentStatusIndex >= statusOrder.indexOf('training_complete'),
      };
    }),

  // Get enrollment by ID (protected)
  getEnrollment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const enrollment = await database.execute(sql`
        SELECT * FROM transformation_enrollments WHERE id = ${input.id}
      `);
      const rows = (enrollment[0] as unknown) as any[];
      if (!rows[0]) return null;
      
      // Add computed fields based on status for frontend compatibility
      const e = rows[0];
      const statusOrder = [
        'enrolled', 'watching_videos', 'video_complete', 'coaching_paid',
        'intake_complete', 'discovery_scheduled', 'discovery_complete', 'protocol_preparing',
        'protocol_review', 'protocol_paid', 'launched', 'fulfillment',
        'shipped', 'delivered', 'training_scheduled', 'training_complete',
        'active', 'week3_review', 'month2', 'month3_final', 'completed', 'renewed'
      ];
      const currentStatusIndex = statusOrder.indexOf(e.status);
      
      return {
        ...e,
        // Computed fields for frontend compatibility
        bioregulatorVideoWatched: e.bioregulatorVideoWatched || currentStatusIndex >= statusOrder.indexOf('video_complete'),
        coachingFeePaid: e.coachingFeePaid || currentStatusIndex >= statusOrder.indexOf('coaching_paid'),
        intakeFormCompleted: e.intakeFormCompleted || currentStatusIndex >= statusOrder.indexOf('intake_complete'),
        waiverCompleted: currentStatusIndex >= statusOrder.indexOf('discovery_scheduled'),
        discoverySessionScheduled: e.discoverySessionScheduledAt ? true : currentStatusIndex >= statusOrder.indexOf('discovery_scheduled'),
        discoverySessionCompleted: e.discoverySessionCompletedAt ? true : currentStatusIndex >= statusOrder.indexOf('discovery_complete'),
        protocolReady: currentStatusIndex >= statusOrder.indexOf('protocol_review'),
        protocolApproved: currentStatusIndex >= statusOrder.indexOf('protocol_paid'),
        boxShipped: currentStatusIndex >= statusOrder.indexOf('shipped'),
        boxDelivered: currentStatusIndex >= statusOrder.indexOf('delivered'),
        reconstitutionScheduled: currentStatusIndex >= statusOrder.indexOf('training_scheduled'),
        reconstitutionCompleted: currentStatusIndex >= statusOrder.indexOf('training_complete'),
      };
    }),

  // Get enrollment linked to a client protocol (admin — used in PricingTab)
  getEnrollmentByProtocolId: adminProcedure
    .input(z.object({ clientProtocolId: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const [rows] = await database.execute(sql`
        SELECT id, status, coachingFeePaid, coachingFeePaidAt, coachingFeeAmount,
               coachingFeeStripePaymentId, tier, email, clientName, enrolledAt
        FROM transformation_enrollments
        WHERE clientProtocolId = ${input.clientProtocolId}
        ORDER BY id DESC
        LIMIT 1
      `);
      const row = (rows as any[])[0];
      return row ?? null;
    }),

  // Link enrollment to user (when user logs in after entering access code or after payment)
  linkEnrollmentToUser: protectedProcedure
    .input(z.object({ 
      enrollmentId: z.number(),
      authToken: z.string().optional(), // Optional - required for post-payment linking
    }))
    .mutation(async ({ input, ctx }) => {
      const { enrollmentId, authToken } = input;
      const database = await db();
      
      // Check if enrollment exists
      const enrollment = await database.execute(sql`
        SELECT * FROM transformation_enrollments WHERE id = ${enrollmentId}
      `);
      const rows = (enrollment[0] as unknown) as any[];
      if (!rows[0]) {
        throw new Error("Enrollment not found");
      }
      
      // If already linked to this user, return success
      if (rows[0].userId === ctx.user.id) {
        return { success: true, alreadyLinked: true };
      }
      
      // If linked to another user, throw error
      if (rows[0].userId && rows[0].userId !== ctx.user.id) {
        throw new Error("Enrollment is already linked to another user");
      }
      
      // If enrollment has an auth token, verify it matches (for post-payment linking)
      if (rows[0].authToken) {
        if (!authToken || rows[0].authToken !== authToken) {
          // Fallback: if user's email matches the enrollment email, allow linking
          // This handles cases where the authToken expired but the user is legitimate
          if (ctx.user.email && rows[0].email && ctx.user.email.toLowerCase() === rows[0].email.toLowerCase()) {
            console.log('[linkEnrollmentToUser] Auth token mismatch but email matches, allowing link:', { enrollmentId, email: ctx.user.email });
          } else {
            throw new Error("Invalid authentication token");
          }
        } else {
          // Token matches, but check if expired - fall back to email match
          if (rows[0].authTokenExpiresAt && new Date(rows[0].authTokenExpiresAt) < new Date()) {
            if (ctx.user.email && rows[0].email && ctx.user.email.toLowerCase() === rows[0].email.toLowerCase()) {
              console.log('[linkEnrollmentToUser] Auth token expired but email matches, allowing link:', { enrollmentId, email: ctx.user.email });
            } else {
              throw new Error("Authentication token has expired");
            }
          }
        }
      }
      
      // Link to current user and clear auth token if present
      await database.execute(sql`
        UPDATE transformation_enrollments 
        SET userId = ${ctx.user.id}, authToken = NULL, authTokenExpiresAt = NULL, updatedAt = NOW()
        WHERE id = ${enrollmentId}
      `);
      
      console.log('[linkEnrollmentToUser] Enrollment linked to user:', { enrollmentId, userId: ctx.user.id });
      
      return { success: true, alreadyLinked: false };
    }),

  // Get user's active enrollment
  getMyEnrollment: protectedProcedure.query(async ({ ctx }) => {
    const database = await db();
    // First try by userId
    const enrollment = await database.execute(sql`
      SELECT * FROM transformation_enrollments 
      WHERE userId = ${ctx.user.id}
      AND status NOT IN ('completed', 'renewed')
      ORDER BY createdAt DESC
      LIMIT 1
    `);
    const rows = (enrollment[0] as unknown) as any[];
    if (rows[0]) return rows[0];
    
    // Fallback: try by email match (handles cases where enrollment wasn't linked to user)
    if (ctx.user.email) {
      const emailEnrollment = await database.execute(sql`
        SELECT * FROM transformation_enrollments 
        WHERE email = ${ctx.user.email}
        AND userId IS NULL
        AND status NOT IN ('completed', 'renewed')
        ORDER BY createdAt DESC
        LIMIT 1
      `);
      const emailRows = (emailEnrollment[0] as unknown) as any[];
      if (emailRows[0]) {
        // Auto-link the enrollment to this user
        await database.execute(sql`
          UPDATE transformation_enrollments 
          SET userId = ${ctx.user.id}, authToken = NULL, authTokenExpiresAt = NULL, updatedAt = NOW()
          WHERE id = ${emailRows[0].id}
        `);
        console.log('[getMyEnrollment] Auto-linked enrollment by email match:', { enrollmentId: emailRows[0].id, userId: ctx.user.id, email: ctx.user.email });
        return { ...emailRows[0], userId: ctx.user.id };
      }
    }
    
    return null;
  }),

  // Update enrollment status
  updateEnrollmentStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.string(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      await database.execute(sql`
        UPDATE transformation_enrollments 
        SET status = ${input.status}
        WHERE id = ${input.id}
      `);
      return { success: true };
    }),

  // Get all enrollments (admin)
  getAllEnrollments: adminProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const { status, limit, offset } = input;
      const database = await db();
      
      if (status) {
      const enrollments = await database.execute(sql`
        SELECT e.*,
               COALESCE(u.name, e.clientName, c.name) as userName,
               COALESCE(u.email, e.email) as userEmail
        FROM transformation_enrollments e
        LEFT JOIN users u ON e.userId = u.id
        LEFT JOIN clients c ON e.clientId = c.id
        WHERE e.status = ${status}
        ORDER BY e.createdAt DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
        return (enrollments[0] as unknown as any[]) || [];
      }
      
      const enrollments = await database.execute(sql`
        SELECT e.*,
               COALESCE(u.name, e.clientName, c.name) as userName,
               COALESCE(u.email, e.email) as userEmail
        FROM transformation_enrollments e
        LEFT JOIN users u ON e.userId = u.id
        LEFT JOIN clients c ON e.clientId = c.id
        ORDER BY e.createdAt DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      return (enrollments[0] as unknown as any[]) || [];
    }),

  // ============================================
  // VIDEO PROGRESS
  // ============================================

  // Get video progress for enrollment (public - needed for non-logged-in users)
  getVideoProgress: publicProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const progress = await database.execute(sql`
        SELECT vp.*, mv.title, mv.sectionNumber, mv.isRequired
        FROM video_progress vp
        JOIN masterclass_videos mv ON vp.videoId = mv.id
        WHERE vp.enrollmentId = ${input.enrollmentId}
      `);
      return (progress[0] as unknown as any[]) || [];
    }),

  // Update video progress (public - needed for non-logged-in users)
  updateVideoProgress: publicProcedure
    .input(z.object({
      enrollmentId: z.number(),
      videoId: z.number(),
      watchedSeconds: z.number(),
      totalSeconds: z.number().optional(),
      isCompleted: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { enrollmentId, videoId, watchedSeconds, totalSeconds, isCompleted } = input;
      const database = await db();
      
      // Check if progress record exists
      const existing = await database.execute(sql`
        SELECT id FROM video_progress 
        WHERE enrollmentId = ${enrollmentId} AND videoId = ${videoId}
      `);
      
      const existingRows = (existing[0] as unknown) as any[];
      const percentComplete = totalSeconds ? Math.min(100, (watchedSeconds / totalSeconds) * 100) : 0;
      const completed = isCompleted || percentComplete >= 90;
      
      if (existingRows.length > 0) {
        // Update existing
        await database.execute(sql`
          UPDATE video_progress 
          SET watchedSeconds = ${watchedSeconds},
              totalSeconds = ${totalSeconds || null},
              percentComplete = ${percentComplete},
              isCompleted = ${completed},
              lastWatchedAt = NOW(),
              watchCount = watchCount + 1
          WHERE enrollmentId = ${enrollmentId} AND videoId = ${videoId}
        `);
        
        if (completed) {
          await database.execute(sql`
            UPDATE video_progress SET completedAt = NOW()
            WHERE enrollmentId = ${enrollmentId} AND videoId = ${videoId} AND completedAt IS NULL
          `);
        }
      } else {
        // Create new
        await database.execute(sql`
          INSERT INTO video_progress (enrollmentId, videoId, watchedSeconds, totalSeconds, percentComplete, isCompleted, completedAt, lastWatchedAt, watchCount)
          VALUES (${enrollmentId}, ${videoId}, ${watchedSeconds}, ${totalSeconds || null}, ${percentComplete}, ${completed}, ${completed ? sql`NOW()` : sql`NULL`}, NOW(), 1)
        `);
      }
      
      return { success: true };
    }),

  // Check if required video is completed
  isRequiredVideoCompleted: protectedProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const result = await database.execute(sql`
        SELECT vp.isCompleted
        FROM video_progress vp
        JOIN masterclass_videos mv ON vp.videoId = mv.id
        WHERE vp.enrollmentId = ${input.enrollmentId}
        AND mv.isRequired = TRUE
        AND vp.isCompleted = TRUE
      `);
      
      const rows = (result[0] as unknown) as any[];
      return { completed: rows.length > 0 };
    }),

  // ============================================
  // CALENDLY SETTINGS
  // ============================================

  // Get Calendly settings
  getCalendlySettings: publicProcedure.query(async () => {
    const database = await db();
    const settings = await database.execute(sql`
      SELECT * FROM calendly_settings WHERE isActive = TRUE
    `);
    return (settings[0] as unknown as any[]) || [];
  }),

  // Update Calendly setting (admin)
  updateCalendlySetting: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      eventType: z.enum(["discovery_session", "reconstitution_training", "week3_review", "month2_session", "final_review", "general"]),
      calendlyUrl: z.string(),
      eventName: z.string(),
      durationMinutes: z.number(),
      description: z.string().optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const { id, eventType, calendlyUrl, eventName, durationMinutes, description, isActive } = input;
      const database = await db();
      
      if (id) {
        await database.execute(sql`
          UPDATE calendly_settings 
          SET calendlyUrl = ${calendlyUrl}, eventName = ${eventName}, durationMinutes = ${durationMinutes}, description = ${description || null}, isActive = ${isActive}
          WHERE id = ${id}
        `);
      } else {
        // Check if exists for this event type
        const existing = await database.execute(sql`
          SELECT id FROM calendly_settings WHERE eventType = ${eventType}
        `);
        
        const existingRows = (existing[0] as unknown) as any[];
        if (existingRows.length > 0) {
          await database.execute(sql`
            UPDATE calendly_settings 
            SET calendlyUrl = ${calendlyUrl}, eventName = ${eventName}, durationMinutes = ${durationMinutes}, description = ${description || null}, isActive = ${isActive}
            WHERE eventType = ${eventType}
          `);
        } else {
          await database.execute(sql`
            INSERT INTO calendly_settings (eventType, calendlyUrl, eventName, durationMinutes, description, isActive)
            VALUES (${eventType}, ${calendlyUrl}, ${eventName}, ${durationMinutes}, ${description || null}, ${isActive})
          `);
        }
      }
      
      return { success: true };
    }),

  // ============================================
  // LABS
  // ============================================

  // Upload lab
  uploadLab: protectedProcedure
    .input(z.object({
      enrollmentId: z.number(),
      fileName: z.string(),
      fileUrl: z.string(),
      fileSize: z.number().optional(),
      fileType: z.string().optional(),
      labType: z.string().optional(),
      labDate: z.string().optional(),
      labProvider: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { enrollmentId, fileName, fileUrl, fileSize, fileType, labType, labDate, labProvider, notes } = input;
      const database = await db();
      
      await database.execute(sql`
        INSERT INTO transformation_labs (enrollmentId, fileName, fileUrl, fileSize, fileType, labType, labDate, labProvider, notes)
        VALUES (${enrollmentId}, ${fileName}, ${fileUrl}, ${fileSize || null}, ${fileType || null}, ${labType || null}, ${labDate || null}, ${labProvider || null}, ${notes || null})
      `);
      
      return { success: true };
    }),

  // Get labs for enrollment
  getLabs: protectedProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const labs = await database.execute(sql`
        SELECT * FROM transformation_labs 
        WHERE enrollmentId = ${input.enrollmentId}
        ORDER BY uploadedAt DESC
      `);
      return (labs[0] as unknown as any[]) || [];
    }),

  // Delete lab
  deleteLab: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db();
      await database.execute(sql`DELETE FROM transformation_labs WHERE id = ${input.id}`);
      return { success: true };
    }),

  // Admin: Update enrollment journey step (for admin management)
  adminUpdateEnrollmentStep: adminProcedure
    .input(z.object({
      enrollmentId: z.number(),
      step: z.enum([
        "bioregulatorVideoWatched",
        "coachingFeePaid",
        "discoverySessionScheduled",
        "discoverySessionCompleted",
        "protocolReady",
        "protocolApproved",
        "protocolPaid",
        "boxShipped",
        "boxDelivered",
        "unpackingVideoWatched",
        "reconstitutionScheduled",
        "reconstitutionCompleted",
      ]),
      value: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { enrollmentId, step, value } = input;
      const database = await db();
      
      // Update the specific step AND the pipeline status together
      if (step === "bioregulatorVideoWatched") {
        if (value) {
          await database.execute(sql`UPDATE transformation_enrollments SET bioregulatorVideoWatched = TRUE, status = 'video_complete' WHERE id = ${enrollmentId}`);
        } else {
          await database.execute(sql`UPDATE transformation_enrollments SET bioregulatorVideoWatched = FALSE WHERE id = ${enrollmentId}`);
        }
      } else if (step === "coachingFeePaid") {
        if (value) {
          await database.execute(sql`UPDATE transformation_enrollments SET coachingFeePaid = TRUE, coachingFeePaidAt = NOW(), status = 'coaching_paid' WHERE id = ${enrollmentId}`);
        } else {
          await database.execute(sql`UPDATE transformation_enrollments SET coachingFeePaid = FALSE, coachingFeePaidAt = NULL WHERE id = ${enrollmentId}`);
        }
      } else if (step === "discoverySessionScheduled") {
        if (value) {
          await database.execute(sql`UPDATE transformation_enrollments SET discoverySessionScheduled = TRUE, discoverySessionScheduledAt = NOW(), status = 'discovery_scheduled' WHERE id = ${enrollmentId}`);
        } else {
          await database.execute(sql`UPDATE transformation_enrollments SET discoverySessionScheduled = FALSE WHERE id = ${enrollmentId}`);
        }
      } else if (step === "discoverySessionCompleted") {
        if (value) {
          await database.execute(sql`UPDATE transformation_enrollments SET discoverySessionCompleted = TRUE, discoverySessionCompletedAt = NOW(), status = 'discovery_complete' WHERE id = ${enrollmentId}`);
        } else {
          await database.execute(sql`UPDATE transformation_enrollments SET discoverySessionCompleted = FALSE, discoverySessionCompletedAt = NULL WHERE id = ${enrollmentId}`);
        }
      } else if (step === "protocolReady") {
        if (value) {
          await database.execute(sql`UPDATE transformation_enrollments SET protocolReady = TRUE, status = 'protocol_review' WHERE id = ${enrollmentId}`);
        } else {
          await database.execute(sql`UPDATE transformation_enrollments SET protocolReady = FALSE WHERE id = ${enrollmentId}`);
        }
      } else if (step === "protocolApproved") {
        if (value) {
          await database.execute(sql`UPDATE transformation_enrollments SET protocolApproved = TRUE, status = 'protocol_review' WHERE id = ${enrollmentId}`);
          // Also sync approvedAt to the linked client_protocols record to stop follow-up emails
          await database.execute(sql`
            UPDATE client_protocols SET approvedAt = NOW(), status = 'approved'
            WHERE id = (SELECT clientProtocolId FROM transformation_enrollments WHERE id = ${enrollmentId} AND clientProtocolId IS NOT NULL AND clientProtocolId > 0 LIMIT 1)
              AND approvedAt IS NULL
          `);
        } else {
          await database.execute(sql`UPDATE transformation_enrollments SET protocolApproved = FALSE WHERE id = ${enrollmentId}`);
        }
      } else if (step === "protocolPaid") {
        if (value) {
          await database.execute(sql`UPDATE transformation_enrollments SET protocolPaid = TRUE, protocolCostPaid = TRUE, protocolCostPaidAt = NOW(), status = 'protocol_paid' WHERE id = ${enrollmentId}`);
          // Also sync approvedAt to the linked client_protocols record to stop follow-up emails
          await database.execute(sql`
            UPDATE client_protocols SET approvedAt = COALESCE(approvedAt, NOW()), status = 'approved'
            WHERE id = (SELECT clientProtocolId FROM transformation_enrollments WHERE id = ${enrollmentId} AND clientProtocolId IS NOT NULL AND clientProtocolId > 0 LIMIT 1)
              AND approvedAt IS NULL
          `);
        } else {
          await database.execute(sql`UPDATE transformation_enrollments SET protocolPaid = FALSE, protocolCostPaidAt = NULL WHERE id = ${enrollmentId}`);
        }
      } else if (step === "boxShipped") {
        if (value) {
          await database.execute(sql`UPDATE transformation_enrollments SET boxShipped = TRUE, boxShippedAt = NOW(), status = 'shipped' WHERE id = ${enrollmentId}`);
        } else {
          await database.execute(sql`UPDATE transformation_enrollments SET boxShipped = FALSE, boxShippedAt = NULL WHERE id = ${enrollmentId}`);
        }
      } else if (step === "boxDelivered") {
        if (value) {
          await database.execute(sql`UPDATE transformation_enrollments SET boxDelivered = TRUE, boxDeliveredAt = NOW(), status = 'delivered' WHERE id = ${enrollmentId}`);
        } else {
          await database.execute(sql`UPDATE transformation_enrollments SET boxDelivered = FALSE, boxDeliveredAt = NULL WHERE id = ${enrollmentId}`);
        }
      } else if (step === "unpackingVideoWatched") {
        if (value) {
          await database.execute(sql`UPDATE transformation_enrollments SET unpackingVideoWatched = TRUE WHERE id = ${enrollmentId}`);
        } else {
          await database.execute(sql`UPDATE transformation_enrollments SET unpackingVideoWatched = FALSE WHERE id = ${enrollmentId}`);
        }
      } else if (step === "reconstitutionScheduled") {
        if (value) {
          await database.execute(sql`UPDATE transformation_enrollments SET reconstitutionScheduled = TRUE, reconstitutionSessionScheduledAt = NOW(), status = 'training_scheduled' WHERE id = ${enrollmentId}`);
        } else {
          await database.execute(sql`UPDATE transformation_enrollments SET reconstitutionScheduled = FALSE WHERE id = ${enrollmentId}`);
        }
      } else if (step === "reconstitutionCompleted") {
        if (value) {
          await database.execute(sql`UPDATE transformation_enrollments SET reconstitutionCompleted = TRUE, reconstitutionSessionCompletedAt = NOW(), status = 'training_complete' WHERE id = ${enrollmentId}`);
        } else {
          await database.execute(sql`UPDATE transformation_enrollments SET reconstitutionCompleted = FALSE, reconstitutionSessionCompletedAt = NULL WHERE id = ${enrollmentId}`);
        }
      }
      
      // Send milestone email notifications when step is marked complete
      if (value) {
        // Get enrollment details for email
        const enrollmentResult = await database.execute(sql`
          SELECT e.*, COALESCE(u.name, e.clientName) as userName, u.email as userEmail
          FROM transformation_enrollments e
          LEFT JOIN users u ON e.userId = u.id
          WHERE e.id = ${enrollmentId}
        `);
        const enrollmentRows = (enrollmentResult[0] as unknown) as any[];
        const enrollment = enrollmentRows[0];
        
        if (enrollment?.userEmail) {
          const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
          const dashboardUrl = `${baseUrl}/transformation`;
          
          // Map step to milestone type and next step info
          const milestoneMap: Record<string, { milestone: any; nextTitle?: string; nextDesc?: string }> = {
            bioregulatorVideoWatched: {
              milestone: 'enrolled',
              nextTitle: 'Complete Payment',
              nextDesc: 'Proceed to payment to secure your spot in the transformation program.'
            },
            coachingFeePaid: {
              milestone: 'coaching_paid',
              nextTitle: 'Complete Intake Form',
              nextDesc: 'Fill out your intake form so we can prepare for your strategy session.'
            },
            intakeFormCompleted: {
              milestone: 'intake_completed',
              nextTitle: 'Schedule Strategy Session',
              nextDesc: 'Book your 60-minute strategy call to discuss your goals and create your personalized protocol.'
            },
            discoverySessionScheduled: {
              milestone: 'discovery_scheduled',
              nextTitle: 'Attend Strategy Session',
              nextDesc: 'Your strategy session is booked! Get ready to discuss your health goals.'
            },
            discoverySessionCompleted: {
              milestone: 'discovery_completed',
              nextTitle: 'Protocol Preparation',
              nextDesc: 'Your customized protocol is being prepared based on our strategy session.'
            },
            protocolReady: {
              milestone: 'protocol_ready',
              nextTitle: 'Review & Approve Protocol',
              nextDesc: 'Review your personalized protocol and approve it to proceed with ordering.'
            },
            protocolApproved: {
              milestone: 'protocol_approved',
              nextTitle: 'Complete Protocol Payment',
              nextDesc: 'Your protocol is approved! Complete payment to begin preparation of your supply box.'
            },
            protocolPaid: {
              milestone: 'protocol_paid',
              nextTitle: 'Box Preparation',
              nextDesc: 'Your payment is confirmed. Your peptide supply box is being prepared for shipment.'
            },
            boxShipped: {
              milestone: 'box_shipped',
              nextTitle: 'Track Your Delivery',
              nextDesc: 'Your peptide supply box is on its way! Check your dashboard for tracking info.'
            },
            boxDelivered: {
              milestone: 'box_delivered',
              nextTitle: 'Schedule Reconstitution Training',
              nextDesc: 'Book your training session to learn proper preparation and administration.'
            },
            unpackingVideoWatched: {
              milestone: 'box_delivered',
              nextTitle: 'Schedule Training',
              nextDesc: 'Great job reviewing the unboxing guide! Now schedule your reconstitution training.'
            },
            reconstitutionScheduled: {
              milestone: 'reconstitution_scheduled',
              nextTitle: 'Attend Training Session',
              nextDesc: 'Your training session is booked! You\'ll learn proper preparation and administration.'
            },
            reconstitutionCompleted: {
              milestone: 'training_completed',
              nextTitle: 'Begin Your Protocol',
              nextDesc: 'You\'re ready to start! Follow your protocol schedule and track your progress.'
            }
          };
          
          const milestoneInfo = milestoneMap[step];
          if (milestoneInfo) {
            // Send client email (async, don't wait)
            sendTransformationMilestoneEmail({
              to: enrollment.userEmail,
              clientName: enrollment.userName || 'Valued Client',
              milestone: milestoneInfo.milestone,
              nextStepTitle: milestoneInfo.nextTitle,
              nextStepDescription: milestoneInfo.nextDesc,
              dashboardUrl,
              enrollmentId
            }).catch(err => console.error('[Milestone Email] Failed:', err));
            
            // Send admin notification (async, don't wait)
            const milestoneLabels: Record<string, string> = {
              bioregulatorVideoWatched: 'Bioregulator Video Watched',
              coachingFeePaid: 'Coaching Fee Paid',
              intakeFormCompleted: 'Intake Form Completed',
              discoverySessionScheduled: 'Strategy Session Scheduled',
              discoverySessionCompleted: 'Strategy Session Completed',
              protocolReady: 'Protocol Ready',
              protocolApproved: 'Protocol Approved',
              protocolPaid: 'Protocol Paid',
              boxShipped: 'Box Shipped',
              boxDelivered: 'Box Delivered',
              unpackingVideoWatched: 'Unboxing Video Watched',
              reconstitutionScheduled: 'Reconstitution Scheduled',
              reconstitutionCompleted: 'Training Completed'
            };
            
            // Create in-app admin notification for step changes
            try {
              const notifDb = await db();
              await notifDb.execute(sql`
                INSERT INTO notifications (userId, type, title, message, createdAt)
                SELECT u.id, 'enrollment_update',
                  ${`${enrollment.userName || 'Client'}: ${milestoneLabels[step] || step}`},
                  ${`${enrollment.userName || 'Client'} (${enrollment.userEmail}) - ${milestoneLabels[step] || step} has been ${value ? 'completed' : 'unchecked'}`},
                  NOW()
                FROM users u WHERE u.role = 'admin'
              `);
            } catch (notifErr) {
              console.error('[Step Toggle] Failed to create in-app notification:', notifErr);
            }
            
            sendAdminMilestoneNotification({
              adminEmails: ['omega@omegalongevity.com'],
              clientName: enrollment.userName || 'Unknown',
              clientEmail: enrollment.userEmail,
              milestone: step,
              milestoneLabel: milestoneLabels[step] || step
            }).catch(err => console.error('[Admin Milestone Notification] Failed:', err));
          }
        }
      }
      
      // Log the step toggle in activity log
      await logEnrollmentActivity(database, enrollmentId, 'step_toggled', {
        step,
        value,
        toggled: value ? 'on' : 'off',
      }, ctx.user?.name || 'Admin', ctx.user?.id);
      
      return { success: true };
    }),
  // Admin: Get single enrollment with full detailss
  getEnrollmentDetails: adminProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const enrollment = await database.execute(sql`
        SELECT e.*,
               u.name as userName,
               u.email as userEmail
        FROM transformation_enrollments e
        LEFT JOIN users u ON e.userId = u.id
        WHERE e.id = ${input.enrollmentId}
      `);
      const rows = (enrollment[0] as unknown) as any[];
      return rows[0] || null;
    }),

  // Admin: Add coach notes to enrollment
  updateEnrollmentNotes: adminProcedure
    .input(z.object({
      enrollmentId: z.number(),
      notes: z.string(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      await database.execute(sql`
        UPDATE transformation_enrollments 
        SET coachNotes = ${input.notes}
        WHERE id = ${input.enrollmentId}
      `);
      return { success: true };
    }),

  // Update enrollment journey step (for client self-service)
  // Maps step names to status enum values in the database
  updateEnrollmentJourneyStep: protectedProcedure
    .input(z.object({
      enrollmentId: z.number(),
      step: z.enum([
        "bioregulatorVideoWatched",
        "coachingFeePaid",
        "discoverySessionScheduled",
        "discoverySessionCompleted",
        "protocolReady",
        "protocolApproved",
        "protocolPaid",
        "boxShipped",
        "boxDelivered",
        "unpackingVideoWatched",
        "reconstitutionScheduled",
        "reconstitutionCompleted",
      ]),
      value: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { enrollmentId, step, value } = input;
      const database = await db();
      
      // Verify user owns this enrollment OR enrollment has no user (public enrollment)
      const enrollment = await database.execute(sql`
        SELECT userId FROM transformation_enrollments WHERE id = ${enrollmentId}
      `);
      const rows = (enrollment[0] as unknown) as any[];
      if (!rows[0]) {
        throw new Error("Enrollment not found");
      }
      // Allow if user owns it OR if enrollment has no user assigned
      if (rows[0].userId && rows[0].userId !== ctx.user.id) {
        throw new Error("Not authorized to update this enrollment");
      }
      
      // Map step names to status values and update accordingly
      if (step === "bioregulatorVideoWatched" && value) {
        await database.execute(sql`UPDATE transformation_enrollments SET status = 'video_complete' WHERE id = ${enrollmentId}`);
      } else if (step === "coachingFeePaid" && value) {
        await database.execute(sql`UPDATE transformation_enrollments SET status = 'coaching_paid', coachingFeePaid = TRUE, coachingFeePaidAt = NOW() WHERE id = ${enrollmentId}`);
        
        // Send payment confirmation emails
        try {
          const enrollmentData = await database.execute(sql`
            SELECT e.*, u.email as userEmail, u.name as userName
            FROM transformation_enrollments e
            LEFT JOIN users u ON e.userId = u.id
            WHERE e.id = ${enrollmentId}
          `);
          const enrollmentRows = (enrollmentData[0] as unknown) as any[];
          if (enrollmentRows[0]) {
            const data = enrollmentRows[0];
            const clientEmail = data.userEmail || data.email;
            const clientName = data.userName || data.clientName || 'Valued Client';
            const tier = data.tier || 'flagship';
            const tierPrices: Record<string, number> = { elite: 15000, functional_health_elite: 8500, advanced: 4500, flagship: 3000, recovery: 3000, immunity: 3000, longevity: 3000, mitochondria: 3000, essentials: 1000 };
            const amount = tierPrices[tier] || 3000;
            const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
            
            // Send confirmation to client
            if (clientEmail) {
              await sendTransformationPaymentConfirmationEmail({
                to: clientEmail,
                clientName,
                tier,
                amount,
                paymentMethod: 'Stripe',
                baseUrl,
                enrollmentId,
              });
            }
            
            // Send notification to admin
            await sendTransformationPaymentAdminNotification({
              clientName,
              clientEmail: clientEmail || 'unknown',
              tier,
              amount,
              paymentMethod: 'Stripe',
              baseUrl,
            });
            
            // Send dedicated intake form email
            if (clientEmail) {
              const { sendIntakeFormEmail } = await import('../emailService');
              await sendIntakeFormEmail({
                to: clientEmail,
                clientName,
                tier,
                enrollmentId,
                baseUrl,
              });
            }
          }
        } catch (emailError) {
          console.error('[Transformation] Failed to send payment confirmation emails:', emailError);
          // Don't throw - payment was successful, email is secondary
        }
      } else if (step === "discoverySessionScheduled" && value) {
        await database.execute(sql`UPDATE transformation_enrollments SET status = 'discovery_scheduled', discoverySessionScheduledAt = NOW() WHERE id = ${enrollmentId}`);
      } else if (step === "discoverySessionCompleted" && value) {
        await database.execute(sql`UPDATE transformation_enrollments SET status = 'discovery_complete', discoverySessionCompletedAt = NOW() WHERE id = ${enrollmentId}`);
      } else if (step === "protocolReady" && value) {
        await database.execute(sql`UPDATE transformation_enrollments SET status = 'protocol_review' WHERE id = ${enrollmentId}`);
      } else if (step === "protocolApproved" && value) {
        await database.execute(sql`UPDATE transformation_enrollments SET status = 'protocol_review' WHERE id = ${enrollmentId}`);
        // Sync approvedAt to linked client_protocols to stop follow-up emails
        await database.execute(sql`
          UPDATE client_protocols SET approvedAt = NOW(), status = 'approved'
          WHERE id = (SELECT clientProtocolId FROM transformation_enrollments WHERE id = ${enrollmentId} AND clientProtocolId IS NOT NULL AND clientProtocolId > 0 LIMIT 1)
            AND approvedAt IS NULL
        `);
      } else if (step === "protocolPaid" && value) {
        await database.execute(sql`UPDATE transformation_enrollments SET status = 'protocol_paid', protocolCostPaid = TRUE, protocolCostPaidAt = NOW() WHERE id = ${enrollmentId}`);
        // Sync approvedAt to linked client_protocols to stop follow-up emails
        await database.execute(sql`
          UPDATE client_protocols SET approvedAt = COALESCE(approvedAt, NOW()), status = 'approved'
          WHERE id = (SELECT clientProtocolId FROM transformation_enrollments WHERE id = ${enrollmentId} AND clientProtocolId IS NOT NULL AND clientProtocolId > 0 LIMIT 1)
            AND approvedAt IS NULL
        `);
      } else if (step === "boxShipped" && value) {
        await database.execute(sql`UPDATE transformation_enrollments SET status = 'shipped', boxShippedAt = NOW() WHERE id = ${enrollmentId}`);
      } else if (step === "boxDelivered" && value) {
        await database.execute(sql`UPDATE transformation_enrollments SET status = 'delivered', boxDeliveredAt = NOW() WHERE id = ${enrollmentId}`);
      } else if (step === "reconstitutionScheduled" && value) {
        await database.execute(sql`UPDATE transformation_enrollments SET status = 'training_scheduled', reconstitutionSessionScheduledAt = NOW() WHERE id = ${enrollmentId}`);
      } else if (step === "reconstitutionCompleted" && value) {
        await database.execute(sql`UPDATE transformation_enrollments SET status = 'training_complete', reconstitutionSessionCompletedAt = NOW() WHERE id = ${enrollmentId}`);
      }
      
      // Send admin notifications for client-initiated milestone changes
      // (payment already has its own notifications above, skip it)
      if (value && step !== 'coachingFeePaid') {
        try {
          const enrollmentDetails = await database.execute(sql`
            SELECT e.id, COALESCE(u.name, e.clientName, 'Unknown') as clientName,
                   COALESCE(u.email, e.email, '') as clientEmail, e.tier
            FROM transformation_enrollments e
            LEFT JOIN users u ON e.userId = u.id
            WHERE e.id = ${enrollmentId}
          `);
          const enrollmentData = ((enrollmentDetails[0] as unknown) as any[])[0];
          const clientName = enrollmentData?.clientName || 'Unknown';
          const clientEmail = enrollmentData?.clientEmail || '';
          const tier = enrollmentData?.tier || '';
          
          const milestoneLabels: Record<string, string> = {
            bioregulatorVideoWatched: 'Masterclass Videos Completed',
            discoverySessionScheduled: 'Strategy Session Scheduled',
            discoverySessionCompleted: 'Strategy Session Completed',
            protocolReady: 'Protocol Ready for Review',
            protocolApproved: 'Protocol Approved',
            protocolPaid: 'Protocol Payment Received',
            boxShipped: 'Box Shipped',
            boxDelivered: 'Box Delivered',
            reconstitutionScheduled: 'Reconstitution Training Scheduled',
            reconstitutionCompleted: 'Reconstitution Training Completed',
          };
          
          const label = milestoneLabels[step] || step;
          
          // In-app notification
          await database.execute(sql`
            INSERT INTO notifications (userId, type, title, message, createdAt)
            SELECT u.id, 'enrollment_update',
              ${`${clientName}: ${label}`},
              ${`${clientName} (${clientEmail}) - ${label} for the ${tier} tier program.`},
              NOW()
            FROM users u WHERE u.role = 'admin'
          `);
          
          // Email notification
          const adminResult = await database.execute(sql`SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL`);
          const adminEmails = ((adminResult[0] as unknown) as any[])?.map((r: any) => r.email).filter(Boolean) || [];
          if (adminEmails.length > 0) {
            await sendAdminMilestoneNotification({
              adminEmails,
              clientName,
              clientEmail,
              milestone: step,
              milestoneLabel: `${label} - ${tier} Tier`
            });
          }
        } catch (notifErr) {
          console.error(`[Client Step ${step}] Failed to send admin notification:`, notifErr);
        }
      }
      
      return { success: true };
    }),

  // Update enrollment journey step (public - for non-logged-in users with enrollment ID)
  // Only allows updating bioregulatorVideoWatched for non-authenticated users
  updateEnrollmentJourneyStepPublic: publicProcedure
    .input(z.object({
      enrollmentId: z.number(),
      step: z.enum(["bioregulatorVideoWatched", "discoverySessionScheduled", "reconstitutionScheduled"]),
      value: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const { enrollmentId, step, value } = input;
      const database = await db();
      
      // Verify enrollment exists
      const enrollment = await database.execute(sql`
        SELECT id FROM transformation_enrollments WHERE id = ${enrollmentId}
      `);
      const rows = (enrollment[0] as unknown) as any[];
      if (!rows[0]) {
        throw new Error("Enrollment not found");
      }
      
      // Handle each allowed public step
      if (step === "discoverySessionScheduled" && value) {
        await database.execute(sql`UPDATE transformation_enrollments SET status = 'discovery_scheduled', discoverySessionScheduledAt = NOW() WHERE id = ${enrollmentId}`);
        
        // Send admin notification
        try {
          const enrollmentDetails = await database.execute(sql`
            SELECT e.id, COALESCE(u.name, e.clientName, 'Unknown') as clientName,
                   COALESCE(u.email, e.email, '') as clientEmail, e.tier
            FROM transformation_enrollments e
            LEFT JOIN users u ON e.userId = u.id
            WHERE e.id = ${enrollmentId}
          `);
          const enrollmentData = ((enrollmentDetails[0] as unknown) as any[])[0];
          const clientName = enrollmentData?.clientName || 'Unknown';
          const clientEmail = enrollmentData?.clientEmail || '';
          const tier = enrollmentData?.tier || '';
          
          await database.execute(sql`
            INSERT INTO notifications (userId, type, title, message, createdAt)
            SELECT u.id, 'enrollment_update',
              ${`${clientName}: Strategy Session Scheduled`},
              ${`${clientName} (${clientEmail}) has scheduled their strategy session for the ${tier} tier program.`},
              NOW()
            FROM users u WHERE u.role = 'admin'
          `);
          
          const adminResult = await database.execute(sql`SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL`);
          const adminEmails = ((adminResult[0] as unknown) as any[])?.map((r: any) => r.email).filter(Boolean) || [];
          if (adminEmails.length > 0) {
            await sendAdminMilestoneNotification({
              adminEmails,
              clientName,
              clientEmail,
              milestone: 'discoverySessionScheduled',
              milestoneLabel: `Strategy Session Scheduled - ${tier} Tier`
            });
          }
        } catch (notifErr) {
          console.error('[Public Strategy Scheduled] Failed to send admin notification:', notifErr);
        }
      } else if (step === "reconstitutionScheduled" && value) {
        await database.execute(sql`UPDATE transformation_enrollments SET status = 'training_scheduled', reconstitutionSessionScheduledAt = NOW() WHERE id = ${enrollmentId}`);
        
        // Send admin notification
        try {
          const enrollmentDetails = await database.execute(sql`
            SELECT e.id, COALESCE(u.name, e.clientName, 'Unknown') as clientName,
                   COALESCE(u.email, e.email, '') as clientEmail, e.tier
            FROM transformation_enrollments e
            LEFT JOIN users u ON e.userId = u.id
            WHERE e.id = ${enrollmentId}
          `);
          const enrollmentData = ((enrollmentDetails[0] as unknown) as any[])[0];
          const clientName = enrollmentData?.clientName || 'Unknown';
          const clientEmail = enrollmentData?.clientEmail || '';
          const tier = enrollmentData?.tier || '';
          
          await database.execute(sql`
            INSERT INTO notifications (userId, type, title, message, createdAt)
            SELECT u.id, 'enrollment_update',
              ${`${clientName}: Reconstitution Training Scheduled`},
              ${`${clientName} (${clientEmail}) has scheduled their reconstitution training for the ${tier} tier program.`},
              NOW()
            FROM users u WHERE u.role = 'admin'
          `);
          
          const adminResult = await database.execute(sql`SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL`);
          const adminEmails = ((adminResult[0] as unknown) as any[])?.map((r: any) => r.email).filter(Boolean) || [];
          if (adminEmails.length > 0) {
            await sendAdminMilestoneNotification({
              adminEmails,
              clientName,
              clientEmail,
              milestone: 'reconstitutionScheduled',
              milestoneLabel: `Reconstitution Training Scheduled - ${tier} Tier`
            });
          }
        } catch (notifErr) {
          console.error('[Public Reconstitution Scheduled] Failed to send admin notification:', notifErr);
        }
      } else if (step === "bioregulatorVideoWatched" && value) {
        await database.execute(sql`UPDATE transformation_enrollments SET status = 'video_complete' WHERE id = ${enrollmentId}`);
        
        // Get enrollment details for notification
        const enrollmentDetails = await database.execute(sql`
          SELECT e.id, COALESCE(u.name, e.clientName, 'Unknown') as clientName,
                 COALESCE(u.email, e.email, '') as clientEmail, e.tier
          FROM transformation_enrollments e
          LEFT JOIN users u ON e.userId = u.id
          WHERE e.id = ${enrollmentId}
        `);
        const enrollmentData = ((enrollmentDetails[0] as unknown) as any[])[0];
        const clientName = enrollmentData?.clientName || 'Unknown';
        const clientEmail = enrollmentData?.clientEmail || '';
        const tier = enrollmentData?.tier || '';
        
        // Create in-app notification for admin
        try {
          await database.execute(sql`
            INSERT INTO notifications (userId, type, title, message, createdAt)
            SELECT u.id, 'enrollment_update',
              ${`${clientName} completed masterclass videos`},
              ${`${clientName} (${clientEmail}) has completed watching all masterclass videos for the ${tier} tier program. They are now ready for payment.`},
              NOW()
            FROM users u WHERE u.role = 'admin'
          `);
        } catch (notifErr) {
          console.error('[Video Complete] Failed to create in-app notification:', notifErr);
        }
        
        // Send admin email notification
        try {
          const adminResult = await database.execute(sql`SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL`);
          const adminEmails = ((adminResult[0] as unknown) as any[])?.map((r: any) => r.email).filter(Boolean) || [];
          if (adminEmails.length > 0) {
            await sendAdminMilestoneNotification({
              adminEmails,
              clientName,
              clientEmail,
              milestone: 'video_complete',
              milestoneLabel: `Masterclass Videos Completed - ${tier} Tier`
            });
          }
        } catch (emailErr) {
          console.error('[Video Complete] Failed to send admin email:', emailErr);
        }
      }
      
      return { success: true };
    }),

  // ============================================
  // PENDING PAYMENTS VERIFICATION (Admin)
  // ============================================

  // Get all pending payments (admin) - includes both pending_payments table AND confirmed PayPal/Venmo from enrollments
  getPendingPayments: adminProcedure.query(async () => {
    const database = await db();
    // Get Venmo-style pending payments
    const pendingPayments = await database.execute(sql`
      SELECT * FROM transformation_pending_payments
      ORDER BY 
        CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
        createdAt DESC
    `);
    const venmoPayments = ((pendingPayments[0] as unknown as any[]) || []).map(p => ({
      ...p,
      source: 'venmo_pending'
    }));
    
    // Get confirmed PayPal/Venmo payments from enrollments table
    const confirmedPayments = await database.execute(sql`
      SELECT 
        e.id as enrollmentId,
        COALESCE(e.clientName, u.name) as clientName,
        COALESCE(e.email, u.email) as clientEmail,
        e.tier,
        e.coachingFeeAmount as amount,
        CASE 
          WHEN e.coachingFeeStripePaymentId LIKE 'pi_%' THEN 'paypal'
          ELSE 'paypal'
        END as paymentMethod,
        NULL as venmoUsername,
        NULL as promoCode,
        NULL as originalAmount,
        NULL as discountAmount,
        'verified' as status,
        NULL as adminNotes,
        NULL as verifiedBy,
        e.coachingFeePaidAt as verifiedAt,
        e.coachingFeePaidAt as createdAt,
        e.coachingFeeStripePaymentId as transactionId
      FROM transformation_enrollments e
      LEFT JOIN users u ON e.userId = u.id
      WHERE e.coachingFeePaid = TRUE
      AND e.coachingFeeStripePaymentId IS NOT NULL
      ORDER BY e.coachingFeePaidAt DESC
    `);
    const autoPayments = ((confirmedPayments[0] as unknown as any[]) || []).map((p: any) => ({
      ...p,
      id: `auto-${p.enrollmentId}`,
      source: 'auto_verified'
    }));
    
    // Combine and sort: pending first, then by date
    const allPayments = [...venmoPayments, ...autoPayments].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return allPayments;
  }),

  // Create pending payment (called when client confirms Venmo payment)
  createPendingPayment: publicProcedure
    .input(z.object({
      enrollmentId: z.number(),
      clientName: z.string(),
      clientEmail: z.string().optional(),
      tier: z.string(),
      amount: z.number(),
      paymentMethod: z.string().default("venmo"),
      venmoUsername: z.string().optional(),
      promoCodeId: z.number().optional(),
      promoCode: z.string().optional(),
      originalAmount: z.number().optional(),
      discountAmount: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      
      await database.execute(sql`
        INSERT INTO transformation_pending_payments 
        (enrollmentId, clientName, clientEmail, tier, amount, paymentMethod, venmoUsername, promoCodeId, promoCode, originalAmount, discountAmount)
        VALUES (
          ${input.enrollmentId},
          ${input.clientName},
          ${input.clientEmail || null},
          ${input.tier},
          ${input.amount},
          ${input.paymentMethod},
          ${input.venmoUsername || null},
          ${input.promoCodeId || null},
          ${input.promoCode || null},
          ${input.originalAmount || null},
          ${input.discountAmount || null}
        )
      `);
      
      // Send admin notification when client REPORTS Venmo payment
      console.log('[Transformation] Client reported Venmo payment, sending admin notification:', {
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        tier: input.tier,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
      });
      
      const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      const notificationResult = await sendTransformationPaymentAdminNotification({
        clientName: input.clientName,
        clientEmail: input.clientEmail || 'unknown',
        tier: input.tier,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        promoCode: input.promoCode,
        discountAmount: input.discountAmount,
        baseUrl,
      });
      
      console.log('[Transformation] Admin notification result:', notificationResult);
      
      return { success: true };
    }),

  // Verify pending payment (admin)
  verifyPendingPayment: adminProcedure
    .input(z.object({
      paymentId: z.number(),
      adminNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      
      // Get payment details
      const payment = await database.execute(sql`
        SELECT * FROM transformation_pending_payments WHERE id = ${input.paymentId}
      `);
      const rows = (payment[0] as unknown) as any[];
      if (!rows[0]) {
        throw new Error("Payment not found");
      }
      const paymentData = rows[0];
      
      // Update payment status
      await database.execute(sql`
        UPDATE transformation_pending_payments 
        SET status = 'verified', verifiedBy = ${ctx.user.id}, verifiedAt = NOW(), adminNotes = ${input.adminNotes || null}, updatedAt = NOW()
        WHERE id = ${input.paymentId}
      `);
      
      // Update enrollment to mark coaching fee as paid
      await database.execute(sql`
        UPDATE transformation_enrollments 
        SET status = 'coaching_paid', coachingFeePaid = TRUE, coachingFeePaidAt = NOW()
        WHERE id = ${paymentData.enrollmentId}
      `);
      
      // Send confirmation email to client
      if (paymentData.clientEmail) {
        const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
        await sendTransformationPaymentConfirmationEmail({
          to: paymentData.clientEmail,
          clientName: paymentData.clientName,
          tier: paymentData.tier,
          amount: parseFloat(paymentData.amount),
          paymentMethod: paymentData.paymentMethod,
          promoCode: paymentData.promoCode,
          discountAmount: paymentData.discountAmount ? parseFloat(paymentData.discountAmount) : undefined,
          originalAmount: paymentData.originalAmount ? parseFloat(paymentData.originalAmount) : undefined,
          baseUrl,
          enrollmentId: paymentData.enrollmentId,
        });
        
        // Send dedicated intake form email
        const { sendIntakeFormEmail } = await import('../emailService');
        await sendIntakeFormEmail({
          to: paymentData.clientEmail,
          clientName: paymentData.clientName,
          tier: paymentData.tier,
          enrollmentId: paymentData.enrollmentId,
          baseUrl,
        });
      }
      
      return { success: true };
    }),

  // Reject pending payment (admin)
  rejectPendingPayment: adminProcedure
    .input(z.object({
      paymentId: z.number(),
      adminNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      
      await database.execute(sql`
        UPDATE transformation_pending_payments 
        SET status = 'rejected', verifiedBy = ${ctx.user.id}, verifiedAt = NOW(), adminNotes = ${input.adminNotes || null}, updatedAt = NOW()
        WHERE id = ${input.paymentId}
      `);
      
      return { success: true };
    }),

  // Delete a test/dummy payment record (admin)
  // - venmo_pending rows are deleted from transformation_pending_payments
  // - auto_verified rows are synthesized from the enrollment, so "deleting"
  //   clears the payment fields on the enrollment (and reverts coaching_paid status)
  deletePayment: adminProcedure
    .input(z.object({
      source: z.enum(["venmo_pending", "auto_verified"]),
      paymentId: z.number().optional(),
      enrollmentId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();

      if (input.source === "venmo_pending") {
        if (!input.paymentId) throw new Error("paymentId is required for pending payment records");
        const result = await database.execute(sql`
          DELETE FROM transformation_pending_payments WHERE id = ${input.paymentId}
        `);
        const affected = (result[0] as any)?.affectedRows ?? 0;
        if (affected === 0) throw new Error("Payment record not found");
        console.log(`[Transformation] Admin ${ctx.user.id} deleted pending payment ${input.paymentId}`);
        return { success: true };
      }

      // auto_verified: clear payment fields on the enrollment
      if (!input.enrollmentId) throw new Error("enrollmentId is required for auto-verified records");
      const result = await database.execute(sql`
        UPDATE transformation_enrollments
        SET coachingFeePaid = FALSE,
            coachingFeePaidAt = NULL,
            coachingFeeAmount = NULL,
            coachingFeeStripePaymentId = NULL,
            status = CASE WHEN status = 'coaching_paid' THEN 'enrolled' ELSE status END,
            updatedAt = NOW()
        WHERE id = ${input.enrollmentId}
      `);
      const affected = (result[0] as any)?.affectedRows ?? 0;
      if (affected === 0) throw new Error("Enrollment not found");
      await logEnrollmentActivity(database, input.enrollmentId, "test_payment_deleted", {
        deletedBy: ctx.user.id,
      }, ctx.user.name || ctx.user.email || "Admin", ctx.user.id);
      console.log(`[Transformation] Admin ${ctx.user.id} cleared payment on enrollment ${input.enrollmentId}`);
      return { success: true };
    }),

  // Get pending payment count (for badge)
  getPendingPaymentsCount: adminProcedure.query(async () => {
    const database = await db();
    const result = await database.execute(sql`
      SELECT COUNT(*) as count FROM transformation_pending_payments WHERE status = 'pending'
    `);
    const rows = (result[0] as unknown) as any[];
    return parseInt(rows[0]?.count || '0');
  }),

  // ============================================
  // ACCESS CODE ANALYTICS
  // ============================================

  // Access code analytics removed - feature deprecated

  // ============================================
  // INTAKE FORM ENDPOINTS
  // ============================================

  // Get intake form data (public - for clients)
  getIntakeForm: publicProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const result = await database.execute(sql`
        SELECT * FROM intake_form_responses WHERE enrollmentId = ${input.enrollmentId} LIMIT 1
      `);
      const rows = (result[0] as unknown) as any[];
      if (!rows || rows.length === 0) return null;
      
      const form = rows[0];
      
      // Get signatures
      const sigResult = await database.execute(sql`
        SELECT * FROM intake_form_signatures WHERE enrollmentId = ${input.enrollmentId}
      `);
      const sigRows = (sigResult[0] as unknown) as any[];
      const signatures: Record<string, string> = {};
      if (sigRows) {
        for (const sig of sigRows) {
          signatures[sig.sectionKey] = sig.signatureData;
        }
      }
      
      return {
        id: form.id,
        enrollmentId: form.enrollmentId,
        currentSection: form.currentSection,
        completedSections: form.completedSections ? JSON.parse(form.completedSections) : [],
        data: {
          // Demographics
          fullName: form.fullName,
          dateOfBirth: form.dateOfBirth,
          sex: form.sex,
          email: form.email,
          phone: form.phone,
          streetAddress: form.streetAddress,
          city: form.city,
          stateProvince: form.stateProvince,
          country: form.country,
          zipCode: form.zipCode,
          // Anthropometrics
          height: form.height,
          currentWeight: form.currentWeight,
          goalWeight: form.goalWeight,
          bodyFatPercentage: form.bodyFatPercentage,
          // Goals
          peptideGoals: form.peptideGoals ? JSON.parse(form.peptideGoals) : [],
          primaryGoal: form.primaryGoal,
          secondaryGoal: form.secondaryGoal,
          additionalGoals: form.additionalGoals,
          previousPeptideExperience: form.previousPeptideExperience,
          // Health
          foodCravings: form.foodCravings,
          currentSupplements: form.currentSupplements ? JSON.parse(form.currentSupplements) : [],
          medicalIssues: form.medicalIssues,
          physicalActivityRoutine: form.physicalActivityRoutine,
          physicalLimitations: form.physicalLimitations,
          hormonalStatus: form.hormonalStatus,
          currentMedications: form.currentMedications ? JSON.parse(form.currentMedications) : [],
          foodIntolerances: form.foodIntolerances ? JSON.parse(form.foodIntolerances) : [],
          digestiveIssues: form.digestiveIssues,
          medicalDiagnoses: form.medicalDiagnoses,
          otherGoalSupport: form.otherGoalSupport,
          // Aggressiveness
          aggressivenessScale: form.aggressivenessScale,
          financialAggressivenessScale: form.financialAggressivenessScale,
          organizationalCapacityScale: form.organizationalCapacityScale,
          otherConcerns: form.otherConcerns,
          additionalContext: form.additionalContext,
          // Referral
          referralSource: form.referralSource,
          referralName: form.referralName,
          referralOther: form.referralOther,
          // Safety
          safetyScreenFlags: form.safetyScreenFlags ? JSON.parse(form.safetyScreenFlags) : [],
          // Mental health
          mentalHealthHistory: form.mentalHealthHistory,
          psychMedications: form.psychMedications,
          // Emergency contact
          emergencyContactName: form.emergencyContactName,
          emergencyContactRelationship: form.emergencyContactRelationship,
          emergencyContactPhone: form.emergencyContactPhone,
          // Substances
          alcoholUse: form.alcoholUse,
          nicotineUse: form.nicotineUse,
          cannabisUse: form.cannabisUse,
          otherSubstanceUse: form.otherSubstanceUse,
          // Sleep & stress
          sleepDuration: form.sleepDuration,
          sleepQuality: form.sleepQuality,
          stressLevel: form.stressLevel,
          mainStressors: form.mainStressors,
          stressManagementMethods: form.stressManagementMethods,
          // Wearables
          wearableDevices: form.wearableDevices ? JSON.parse(form.wearableDevices) : [],
          typicalMetricsTracked: form.typicalMetricsTracked,
          // Time horizon
          top3Goals: form.top3Goals,
          weeklyTimeCommitment: form.weeklyTimeCommitment,
          // Minor consent
          isMinor: form.isMinor,
          parentGuardianName: form.parentGuardianName,
          // Acknowledgments
          privacy_acknowledged: true, // If form exists, privacy was acknowledged
        },
        signatures,
        isSubmitted: form.status === 'completed',
        submittedAt: form.submittedAt,
      };
    }),

  // Save intake form progress (public - for clients)
  saveIntakeForm: publicProcedure
    .input(z.object({
      enrollmentId: z.number(),
      currentSection: z.number(),
      completedSections: z.array(z.number()),
      formData: z.record(z.string(), z.any()),
      signatures: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      const { enrollmentId, currentSection, completedSections, formData, signatures } = input;
      
      // Get userId from enrollment if available
      const enrollmentResult = await database.execute(sql`
        SELECT userId FROM transformation_enrollments WHERE id = ${enrollmentId} LIMIT 1
      `);
      const enrollmentRows = (enrollmentResult[0] as unknown) as any[];
      const userId = enrollmentRows?.[0]?.userId || null;
      
      // Check if form exists
      const existing = await database.execute(sql`
        SELECT id FROM intake_form_responses WHERE enrollmentId = ${enrollmentId} LIMIT 1
      `);
      const existingRows = (existing[0] as unknown) as any[];
      
      // Extract form fields
      const fd = formData;
      
      if (existingRows && existingRows.length > 0) {
        // Update existing
        await database.execute(sql`
          UPDATE intake_form_responses SET
            currentSection = ${currentSection},
            completedSections = ${JSON.stringify(completedSections)},
            fullName = ${fd.fullName || null},
            dateOfBirth = ${fd.dateOfBirth || null},
            sex = ${fd.sex || null},
            email = ${fd.email || null},
            phone = ${fd.phone || null},
            streetAddress = ${fd.streetAddress || null},
            city = ${fd.city || null},
            stateProvince = ${fd.stateProvince || null},
            country = ${fd.country || 'United States'},
            zipCode = ${fd.zipCode || null},
            height = ${fd.height || null},
            currentWeight = ${fd.currentWeight || null},
            goalWeight = ${fd.goalWeight || null},
            bodyFatPercentage = ${fd.bodyFatPercentage || null},
            peptideGoals = ${fd.peptideGoals ? JSON.stringify(fd.peptideGoals) : null},
            primaryGoal = ${fd.primaryGoal || null},
            secondaryGoal = ${fd.secondaryGoal || null},
            additionalGoals = ${fd.additionalGoals || null},
            previousPeptideExperience = ${fd.previousPeptideExperience || null},
            foodCravings = ${fd.foodCravings || null},
            currentSupplements = ${fd.currentSupplements ? JSON.stringify(fd.currentSupplements) : null},
            medicalIssues = ${fd.medicalIssues || null},
            physicalActivityRoutine = ${fd.physicalActivityRoutine || null},
            physicalLimitations = ${fd.physicalLimitations || null},
            hormonalStatus = ${fd.hormonalStatus || null},
            currentMedications = ${fd.currentMedications ? JSON.stringify(fd.currentMedications) : null},
            foodIntolerances = ${fd.foodIntolerances ? JSON.stringify(fd.foodIntolerances) : null},
            digestiveIssues = ${fd.digestiveIssues || null},
            medicalDiagnoses = ${fd.medicalDiagnoses || null},
            otherGoalSupport = ${fd.otherGoalSupport || null},
            aggressivenessScale = ${fd.aggressivenessScale || null},
            financialAggressivenessScale = ${fd.financialAggressivenessScale || null},
            organizationalCapacityScale = ${fd.organizationalCapacityScale || null},
            otherConcerns = ${fd.otherConcerns || null},
            additionalContext = ${fd.additionalContext || null},
            referralSource = ${fd.referralSource || null},
            referralName = ${fd.referralName || null},
            referralOther = ${fd.referralOther || null},
            safetyScreenFlags = ${fd.safetyScreenFlags ? JSON.stringify(fd.safetyScreenFlags) : null},
            mentalHealthHistory = ${fd.mentalHealthHistory || null},
            psychMedications = ${fd.psychMedications || null},
            emergencyContactName = ${fd.emergencyContactName || null},
            emergencyContactRelationship = ${fd.emergencyContactRelationship || null},
            emergencyContactPhone = ${fd.emergencyContactPhone || null},
            alcoholUse = ${fd.alcoholUse || null},
            nicotineUse = ${fd.nicotineUse || null},
            cannabisUse = ${fd.cannabisUse || null},
            otherSubstanceUse = ${fd.otherSubstanceUse || null},
            sleepDuration = ${fd.sleepDuration || null},
            sleepQuality = ${fd.sleepQuality || null},
            stressLevel = ${fd.stressLevel || null},
            mainStressors = ${fd.mainStressors || null},
            stressManagementMethods = ${fd.stressManagementMethods || null},
            wearableDevices = ${fd.wearableDevices ? JSON.stringify(fd.wearableDevices) : null},
            typicalMetricsTracked = ${fd.typicalMetricsTracked || null},
            top3Goals = ${fd.top3Goals || null},
            weeklyTimeCommitment = ${fd.weeklyTimeCommitment || null},
            isMinor = ${fd.isMinor || false},
            parentGuardianName = ${fd.parentGuardianName || null},
            lastSavedAt = NOW()
          WHERE enrollmentId = ${enrollmentId}
        `);
      } else {
        // Create new
        await database.execute(sql`
          INSERT INTO intake_form_responses (
            enrollmentId, userId, currentSection, completedSections, status,
            fullName, dateOfBirth, sex, email, phone, streetAddress, city, stateProvince, country, zipCode,
            height, currentWeight, goalWeight, bodyFatPercentage,
            peptideGoals, primaryGoal, secondaryGoal, additionalGoals, previousPeptideExperience,
            foodCravings, currentSupplements, medicalIssues, physicalActivityRoutine, physicalLimitations,
            hormonalStatus, currentMedications, foodIntolerances, digestiveIssues, medicalDiagnoses, otherGoalSupport,
            aggressivenessScale, financialAggressivenessScale, organizationalCapacityScale, otherConcerns, additionalContext,
            referralSource, referralName, referralOther,
            safetyScreenFlags, mentalHealthHistory, psychMedications,
            emergencyContactName, emergencyContactRelationship, emergencyContactPhone,
            alcoholUse, nicotineUse, cannabisUse, otherSubstanceUse,
            sleepDuration, sleepQuality, stressLevel, mainStressors, stressManagementMethods,
            wearableDevices, typicalMetricsTracked, top3Goals, weeklyTimeCommitment,
            isMinor, parentGuardianName
          ) VALUES (
            ${enrollmentId}, ${userId}, ${currentSection}, ${JSON.stringify(completedSections)}, 'in_progress',
            ${fd.fullName || null}, ${fd.dateOfBirth || null}, ${fd.sex || null}, ${fd.email || null}, ${fd.phone || null},
            ${fd.streetAddress || null}, ${fd.city || null}, ${fd.stateProvince || null}, ${fd.country || 'United States'}, ${fd.zipCode || null},
            ${fd.height || null}, ${fd.currentWeight || null}, ${fd.goalWeight || null}, ${fd.bodyFatPercentage || null},
            ${fd.peptideGoals ? JSON.stringify(fd.peptideGoals) : null}, ${fd.primaryGoal || null}, ${fd.secondaryGoal || null},
            ${fd.additionalGoals || null}, ${fd.previousPeptideExperience || null},
            ${fd.foodCravings || null}, ${fd.currentSupplements ? JSON.stringify(fd.currentSupplements) : null},
            ${fd.medicalIssues || null}, ${fd.physicalActivityRoutine || null}, ${fd.physicalLimitations || null},
            ${fd.hormonalStatus || null}, ${fd.currentMedications ? JSON.stringify(fd.currentMedications) : null},
            ${fd.foodIntolerances ? JSON.stringify(fd.foodIntolerances) : null}, ${fd.digestiveIssues || null},
            ${fd.medicalDiagnoses || null}, ${fd.otherGoalSupport || null},
            ${fd.aggressivenessScale || null}, ${fd.financialAggressivenessScale || null},
            ${fd.organizationalCapacityScale || null}, ${fd.otherConcerns || null}, ${fd.additionalContext || null},
            ${fd.referralSource || null}, ${fd.referralName || null}, ${fd.referralOther || null},
            ${fd.safetyScreenFlags ? JSON.stringify(fd.safetyScreenFlags) : null},
            ${fd.mentalHealthHistory || null}, ${fd.psychMedications || null},
            ${fd.emergencyContactName || null}, ${fd.emergencyContactRelationship || null}, ${fd.emergencyContactPhone || null},
            ${fd.alcoholUse || null}, ${fd.nicotineUse || null}, ${fd.cannabisUse || null}, ${fd.otherSubstanceUse || null},
            ${fd.sleepDuration || null}, ${fd.sleepQuality || null}, ${fd.stressLevel || null},
            ${fd.mainStressors || null}, ${fd.stressManagementMethods || null},
            ${fd.wearableDevices ? JSON.stringify(fd.wearableDevices) : null}, ${fd.typicalMetricsTracked || null},
            ${fd.top3Goals || null}, ${fd.weeklyTimeCommitment || null},
            ${fd.isMinor || false}, ${fd.parentGuardianName || null}
          )
        `);
      }
      
      // Save signatures to separate table
      for (const [sectionKey, signatureData] of Object.entries(signatures)) {
        if (signatureData) {
          // Get form ID
          const formResult = await database.execute(sql`
            SELECT id FROM intake_form_responses WHERE enrollmentId = ${enrollmentId} LIMIT 1
          `);
          const formRows = (formResult[0] as unknown) as any[];
          const intakeFormId = formRows?.[0]?.id;
          
          if (intakeFormId) {
            const signatureType = signatureData.startsWith('typed:') ? 'typed' : 'drawn';
            await database.execute(sql`
              INSERT INTO intake_form_signatures (intakeFormId, enrollmentId, sectionKey, signatureType, signatureData)
              VALUES (${intakeFormId}, ${enrollmentId}, ${sectionKey}, ${signatureType}, ${signatureData})
              ON DUPLICATE KEY UPDATE signatureData = ${signatureData}, signatureType = ${signatureType}, signedAt = NOW()
            `);
          }
        }
      }
      
      // Sync phone from intake form to enrollment record
      if (fd.phone) {
        await database.execute(sql`
          UPDATE transformation_enrollments 
          SET phone = ${fd.phone}, updatedAt = NOW()
          WHERE id = ${enrollmentId}
        `);
        console.log('[saveIntakeForm] Synced phone to enrollment:', { enrollmentId, phone: fd.phone });
        
        // Also sync phone to linked client record
        try {
          const enrollLookup = await database.execute(sql`
            SELECT clientId FROM transformation_enrollments WHERE id = ${enrollmentId} LIMIT 1
          `);
          const enrollRows = (enrollLookup[0] as unknown) as any[];
          const linkedClientId = enrollRows?.[0]?.clientId;
          if (linkedClientId && linkedClientId > 0) {
            await database.execute(sql`
              UPDATE clients SET phone = COALESCE(NULLIF(phone, ''), ${fd.phone}), updatedAt = NOW()
              WHERE id = ${linkedClientId}
            `);
          }
        } catch (syncErr) {
          console.error('[saveIntakeForm] Failed to sync phone to client:', syncErr);
        }
      }
      
      return { success: true };
    }),

  // Submit intake form (public - for clients)
  submitIntakeForm: publicProcedure
    .input(z.object({
      enrollmentId: z.number(),
      formData: z.record(z.string(), z.any()),
      signatures: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      const { enrollmentId, formData, signatures } = input;
      const fd = formData;
      
      // Update form as submitted
      await database.execute(sql`
        UPDATE intake_form_responses SET
          status = 'completed',
          submittedAt = NOW(),
          fullName = ${fd.fullName || null},
          dateOfBirth = ${fd.dateOfBirth || null},
          sex = ${fd.sex || null},
          email = ${fd.email || null},
          phone = ${fd.phone || null},
          streetAddress = ${fd.streetAddress || null},
          city = ${fd.city || null},
          stateProvince = ${fd.stateProvince || null},
          country = ${fd.country || 'United States'},
          zipCode = ${fd.zipCode || null},
          height = ${fd.height || null},
          currentWeight = ${fd.currentWeight || null},
          goalWeight = ${fd.goalWeight || null},
          bodyFatPercentage = ${fd.bodyFatPercentage || null},
          peptideGoals = ${fd.peptideGoals ? JSON.stringify(fd.peptideGoals) : null},
          primaryGoal = ${fd.primaryGoal || null},
          secondaryGoal = ${fd.secondaryGoal || null},
          additionalGoals = ${fd.additionalGoals || null},
          previousPeptideExperience = ${fd.previousPeptideExperience || null},
          emergencyContactName = ${fd.emergencyContactName || null},
          emergencyContactRelationship = ${fd.emergencyContactRelationship || null},
          emergencyContactPhone = ${fd.emergencyContactPhone || null}
        WHERE enrollmentId = ${enrollmentId}
      `);
      
      // Update enrollment status and sync phone
      await database.execute(sql`
        UPDATE transformation_enrollments SET
          status = CASE WHEN status = 'coaching_paid' THEN 'intake_complete' ELSE status END,
          intakeFormCompleted = TRUE,
          intakeFormCompletedAt = NOW(),
          phone = COALESCE(${fd.phone || null}, phone),
          updatedAt = NOW()
        WHERE id = ${enrollmentId}
      `);
      
      if (fd.phone) {
        console.log('[submitIntakeForm] Synced phone to enrollment:', { enrollmentId, phone: fd.phone });
      }
      
      // Also sync phone, name, and address to the linked client record
      try {
        const enrollLookup = await database.execute(sql`
          SELECT clientId FROM transformation_enrollments WHERE id = ${enrollmentId} LIMIT 1
        `);
        const enrollRows = (enrollLookup[0] as unknown) as any[];
        const linkedClientId = enrollRows?.[0]?.clientId;
        if (linkedClientId && linkedClientId > 0) {
          await database.execute(sql`
            UPDATE clients 
            SET name = COALESCE(NULLIF(name, ''), NULLIF(name, 'New Enrollment'), ${fd.fullName || null}),
                phone = COALESCE(NULLIF(phone, ''), ${fd.phone || null}),
                shippingName = COALESCE(NULLIF(shippingName, ''), ${fd.fullName || null}),
                shippingStreet = COALESCE(NULLIF(shippingStreet, ''), ${fd.streetAddress || null}),
                shippingCity = COALESCE(NULLIF(shippingCity, ''), ${fd.city || null}),
                shippingState = COALESCE(NULLIF(shippingState, ''), ${fd.stateProvince || null}),
                shippingZip = COALESCE(NULLIF(shippingZip, ''), ${fd.zipCode || null}),
                shippingPhone = COALESCE(NULLIF(shippingPhone, ''), ${fd.phone || null}),
                updatedAt = NOW()
            WHERE id = ${linkedClientId}
          `);
          console.log('[submitIntakeForm] Synced profile data to client record:', { enrollmentId, clientId: linkedClientId });
          
          // Also update the client_protocol name/email if linked
          const cpLookup = await database.execute(sql`
            SELECT clientProtocolId FROM transformation_enrollments WHERE id = ${enrollmentId} LIMIT 1
          `);
          const cpRows = (cpLookup[0] as unknown) as any[];
          const cpId = cpRows?.[0]?.clientProtocolId;
          if (cpId && cpId > 0) {
            await database.execute(sql`
              UPDATE client_protocols 
              SET clientName = COALESCE(NULLIF(clientName, ''), NULLIF(clientName, 'New Enrollment'), ${fd.fullName || null}),
                  clientEmail = COALESCE(NULLIF(clientEmail, ''), ${fd.email || null}),
                  updatedAt = NOW()
              WHERE id = ${cpId}
            `);
          }
        } else {
          // No client record linked yet - create one now (catches cases where duplicate prevention skipped client creation)
          const enrollEmail = fd.email || null;
          const enrollNameForClient = fd.fullName || null;
          if (enrollEmail) {
            const { clientId: newClientId } = await autoCreateOrLinkClient(
              database, enrollmentId, enrollEmail, enrollNameForClient,
              { phone: fd.phone, shippingStreet: fd.streetAddress, shippingCity: fd.city, shippingState: fd.stateProvince, shippingZip: fd.zipCode }
            );
            if (newClientId > 0) {
              console.log('[submitIntakeForm] Created missing client record on intake completion:', { enrollmentId, clientId: newClientId });
            }
          }
        }
      } catch (syncErr) {
        console.error('[submitIntakeForm] Failed to sync to client record:', syncErr);
      }
      
      // Store individual signatures to intake_form_signatures table
      const formResult = await database.execute(sql`
        SELECT id FROM intake_form_responses WHERE enrollmentId = ${enrollmentId} LIMIT 1
      `);
      const formRows = (formResult[0] as unknown) as any[];
      const intakeFormId = formRows?.[0]?.id;
      
      if (intakeFormId) {
        for (const [sectionKey, signatureData] of Object.entries(signatures)) {
          if (signatureData) {
            const signatureType = signatureData.startsWith('typed:') ? 'typed' : 'drawn';
            await database.execute(sql`
              INSERT INTO intake_form_signatures (intakeFormId, enrollmentId, sectionKey, signatureType, signatureData)
              VALUES (${intakeFormId}, ${enrollmentId}, ${sectionKey}, ${signatureType}, ${signatureData})
              ON DUPLICATE KEY UPDATE signatureData = ${signatureData}, signatureType = ${signatureType}, signedAt = NOW()
            `);
          }
        }
      }
      
      // Send admin notification for intake form completion
      try {
        // Get enrollment details for the notification
        const enrollmentResult = await database.execute(sql`
          SELECT e.*, COALESCE(u.name, e.clientName) as userName, u.email as userEmail
          FROM transformation_enrollments e
          LEFT JOIN users u ON e.userId = u.id
          WHERE e.id = ${enrollmentId}
          LIMIT 1
        `);
        const enrollmentRows = (enrollmentResult[0] as unknown) as any[];
        const enrollment = enrollmentRows?.[0];
        
        if (enrollment) {
          const clientName = fd.fullName || enrollment.userName || 'Unknown Client';
          const clientEmail = fd.email || enrollment.userEmail || 'No email';
          const tierLabel = enrollment.tier === 'elite' ? 'Elite Longevity ($15,000)' :
                           enrollment.tier === 'functional_health_elite' ? 'Functional Health Elite ($8,500)' :
                           enrollment.tier === 'advanced' ? 'Advanced Weight Loss ($4,500)' :
enrollment.tier === 'flagship' ? 'Weight Loss & Physique ($3,000)' :
                            enrollment.tier === 'recovery' ? 'Recovery & Inflammation ($3,000)' :
                            enrollment.tier === 'immunity' ? 'Immunity & Healing ($3,000)' :
                            enrollment.tier === 'longevity' ? 'Longevity & Bioregulators ($3,000)' :
                            enrollment.tier === 'mitochondria' ? 'Mitochondria Restoration ($3,000)' :
                           'Protocol Essentials ($1,000)';
          
          // Create in-app notification for all admins
          await database.execute(sql`
            INSERT INTO notifications (userId, type, title, message, createdAt)
            SELECT id, 'other', 
              ${`Intake Form Completed: ${clientName}`},
              ${`${clientName} (${clientEmail}) has completed their intake form for the ${tierLabel} program. They are now ready for their strategy session.`},
              NOW()
            FROM users WHERE role = 'admin'
          `);
          
          // Send email notification to admin
          // Get admin emails for notification
          const adminResult = await database.execute(sql`
            SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL
          `);
          const adminRows = (adminResult[0] as unknown) as any[];
          const adminEmails = adminRows?.map((r: any) => r.email).filter(Boolean) || [];
          
          if (adminEmails.length > 0) {
            await sendAdminMilestoneNotification({
              adminEmails,
              clientName,
              clientEmail,
              milestone: 'intake_form_completed',
              milestoneLabel: `Intake Form Completed - ${tierLabel}`
            });
          }
        }
      } catch (notifyError) {
        console.error('[submitIntakeForm] Failed to send admin notification:', notifyError);
        // Don't fail the submission if notification fails
      }
      
      return { success: true };
    }),

  // Admin update individual intake form fields (for quick-fill of missing data)
  adminUpdateIntakeFormFields: adminProcedure
    .input(z.object({
      enrollmentId: z.number(),
      fields: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      const { enrollmentId, fields } = input;
      
      // Whitelist of editable fields to prevent SQL injection
      const allowedFields: Record<string, string> = {
        primaryGoal: 'primaryGoal',
        secondaryGoal: 'secondaryGoal',
        additionalGoals: 'additionalGoals',
        alcoholUse: 'alcoholUse',
        nicotineUse: 'nicotineUse',
        cannabisUse: 'cannabisUse',
        otherSubstanceUse: 'otherSubstanceUse',
        additionalContext: 'additionalContext',
        top3Goals: 'top3Goals',
        previousPeptideExperience: 'previousPeptideExperience',
        medicalIssues: 'medicalIssues',
        medicalDiagnoses: 'medicalDiagnoses',
        hormonalStatus: 'hormonalStatus',
        digestiveIssues: 'digestiveIssues',
        foodCravings: 'foodCravings',
        physicalActivityRoutine: 'physicalActivityRoutine',
        physicalLimitations: 'physicalLimitations',
        sleepDuration: 'sleepDuration',
        mainStressors: 'mainStressors',
        stressManagementMethods: 'stressManagementMethods',
        mentalHealthHistory: 'mentalHealthHistory',
        psychMedications: 'psychMedications',
        otherConcerns: 'otherConcerns',
        otherGoalSupport: 'otherGoalSupport',
        fullName: 'fullName',
        phone: 'phone',
        emergencyContactName: 'emergencyContactName',
        emergencyContactRelationship: 'emergencyContactRelationship',
        emergencyContactPhone: 'emergencyContactPhone',
      };
      
      // Validate at least one allowed field is provided
      const validFields = Object.entries(fields).filter(([key]) => allowedFields[key]);
      if (validFields.length === 0) {
        throw new Error('No valid fields provided');
      }
      
      // Update each field individually for safety (parameterized values, whitelisted column names)
      for (const [key, value] of validFields) {
        const col = allowedFields[key];
        await database.execute(sql`
          UPDATE intake_form_responses 
          SET ${sql.raw(col)} = ${value || null}, lastSavedAt = NOW()
          WHERE enrollmentId = ${enrollmentId}
        `);
      }
      
      console.log('[adminUpdateIntakeFormFields] Updated fields for enrollment', enrollmentId, ':', Object.keys(fields));
      return { success: true, updatedFields: Object.keys(fields).filter(k => allowedFields[k]) };
    }),

  // Get intake form for admin view
  getIntakeFormAdmin: protectedProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      
      // Get form data
      const formResult = await database.execute(sql`
        SELECT f.*, e.tier, COALESCE(u.name, e.clientName) as userName, u.email as userEmail
        FROM intake_form_responses f
        JOIN transformation_enrollments e ON f.enrollmentId = e.id
        LEFT JOIN users u ON e.userId = u.id
        WHERE f.enrollmentId = ${input.enrollmentId}
        LIMIT 1
      `);
      const formRows = (formResult[0] as unknown) as any[];
      if (!formRows || formRows.length === 0) return null;
      
      const form = formRows[0];
      
      // Get signatures
      const sigResult = await database.execute(sql`
        SELECT * FROM intake_form_signatures WHERE enrollmentId = ${input.enrollmentId}
      `);
      const sigRows = (sigResult[0] as unknown) as any[];
      
      // Build signatures map
      const signatures: Record<string, string> = {};
      if (sigRows) {
        for (const sig of sigRows) {
          signatures[sig.sectionKey] = sig.signatureData;
        }
      }
      
      return {
        ...form,
        completedSections: form.completedSections ? JSON.parse(form.completedSections) : [],
        peptideGoals: form.peptideGoals ? JSON.parse(form.peptideGoals) : [],
        currentSupplements: form.currentSupplements ? JSON.parse(form.currentSupplements) : [],
        currentMedications: form.currentMedications ? JSON.parse(form.currentMedications) : [],
        foodIntolerances: form.foodIntolerances ? JSON.parse(form.foodIntolerances) : [],
        safetyScreenFlags: form.safetyScreenFlags ? JSON.parse(form.safetyScreenFlags) : [],
        wearableDevices: form.wearableDevices ? JSON.parse(form.wearableDevices) : [],
        signatures,
        signatureRecords: sigRows || [],
      };
    }),

  // Get intake form content for admin editing
  getIntakeFormContent: protectedProcedure
    .query(async () => {
      const database = await db();
      const result = await database.execute(sql`
        SELECT * FROM intake_form_config ORDER BY sortOrder, sectionNumber
      `);
      // Cast MySQL tinyint (0/1) to proper booleans for frontend
      return ((result[0] as unknown) as any[]).map(row => ({
        ...row,
        isRequired: !!row.isRequired,
        requiresSignature: !!row.requiresSignature,
        requiresCheckbox: !!row.requiresCheckbox,
        isActive: !!row.isActive,
      }));
    }),

  // Update intake form content (admin only)
   updateIntakeFormContent: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      displayText: z.string().optional(),
      isRequired: z.preprocess(v => v === 1 || v === true, z.boolean()).optional(),
      requiresSignature: z.preprocess(v => v === 1 || v === true, z.boolean()).optional(),
      requiresCheckbox: z.preprocess(v => v === 1 || v === true, z.boolean()).optional(),
      isActive: z.preprocess(v => v === 1 || v === true, z.boolean()).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      const { id, ...updates } = input;
      
      // Use parameterized queries to prevent SQL injection and handle special characters
      const setClauses: ReturnType<typeof sql>[] = [];
      if (updates.title !== undefined) setClauses.push(sql`title = ${updates.title}`);
      if (updates.displayText !== undefined) setClauses.push(sql`displayText = ${updates.displayText}`);
      if (updates.isRequired !== undefined) setClauses.push(sql`isRequired = ${updates.isRequired}`);
      if (updates.requiresSignature !== undefined) setClauses.push(sql`requiresSignature = ${updates.requiresSignature}`);
      if (updates.requiresCheckbox !== undefined) setClauses.push(sql`requiresCheckbox = ${updates.requiresCheckbox}`);
      if (updates.isActive !== undefined) setClauses.push(sql`isActive = ${updates.isActive}`);
      if (updates.sortOrder !== undefined) setClauses.push(sql`sortOrder = ${updates.sortOrder}`);
      
      if (setClauses.length > 0) {
        // Build the SET clause by joining parameterized fragments
        const setClause = setClauses.reduce((acc, clause, i) => 
          i === 0 ? clause : sql`${acc}, ${clause}`
        );
        await database.execute(sql`
          UPDATE intake_form_config SET ${setClause}, updatedAt = NOW()
          WHERE id = ${id}
        `);
      }
      
      return { success: true };
    }),

  // Create intake form config section (admin only)
  createIntakeFormSection: adminProcedure
    .input(z.object({
      sectionKey: z.string(),
      sectionNumber: z.number(),
      title: z.string(),
      displayText: z.string().optional(),
      isRequired: z.boolean().default(true),
      requiresSignature: z.boolean().default(false),
      requiresCheckbox: z.boolean().default(false),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      await database.execute(sql`
        INSERT INTO intake_form_config (sectionKey, sectionNumber, title, displayText, isRequired, requiresSignature, requiresCheckbox, sortOrder)
        VALUES (${input.sectionKey}, ${input.sectionNumber}, ${input.title}, ${input.displayText || null}, ${input.isRequired}, ${input.requiresSignature}, ${input.requiresCheckbox}, ${input.sortOrder})
      `);
      return { success: true };
    }),

  // Delete intake form section permanently (admin only)
  deleteIntakeFormSection: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db();
      // Safety check: only allow deleting inactive sections
      const checkResult = await database.execute(sql`
        SELECT id, sectionKey, isActive FROM intake_form_config WHERE id = ${input.id} LIMIT 1
      `);
      const rows = (checkResult[0] as unknown) as any[];
      if (!rows || rows.length === 0) {
        throw new Error("Section not found");
      }
      if (rows[0].isActive) {
        throw new Error("Cannot delete an active section. Deactivate it first.");
      }
      await database.execute(sql`
        DELETE FROM intake_form_config WHERE id = ${input.id}
      `);
      console.log(`[IntakeFormConfig] Permanently deleted section id=${input.id} key=${rows[0].sectionKey}`);
      return { success: true, deletedKey: rows[0].sectionKey };
    }),

  // Reorder intake form sections (admin only)
  reorderIntakeFormSections: adminProcedure
    .input(z.object({
      sections: z.array(z.object({
        id: z.number(),
        sortOrder: z.number(),
        sectionNumber: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      for (const section of input.sections) {
        await database.execute(sql`
          UPDATE intake_form_config SET sortOrder = ${section.sortOrder}, sectionNumber = ${section.sectionNumber}, updatedAt = NOW()
          WHERE id = ${section.id}
        `);
      }
      console.log(`[IntakeFormConfig] Reordered ${input.sections.length} sections`);
      return { success: true };
    }),

  // Export intake form as PDF data (for client-side PDF generation)
  exportIntakeFormPdf: protectedProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      
      // Get enrollment info
      const enrollmentResult = await database.execute(sql`
        SELECT e.*, COALESCE(u.name, e.clientName) as userName, u.email as userEmail
        FROM transformation_enrollments e
        LEFT JOIN users u ON e.userId = u.id
        WHERE e.id = ${input.enrollmentId}
        LIMIT 1
      `);
      const enrollmentRows = (enrollmentResult[0] as unknown) as any[];
      if (!enrollmentRows || enrollmentRows.length === 0) {
        throw new Error("Enrollment not found");
      }
      const enrollment = enrollmentRows[0];
      
      // Get form data
      const formResult = await database.execute(sql`
        SELECT * FROM intake_form_responses WHERE enrollmentId = ${input.enrollmentId} LIMIT 1
      `);
      const formRows = (formResult[0] as unknown) as any[];
      if (!formRows || formRows.length === 0) {
        throw new Error("Intake form not found");
      }
      const form = formRows[0];
      
      // Get signatures
      const sigResult = await database.execute(sql`
        SELECT * FROM intake_form_signatures WHERE enrollmentId = ${input.enrollmentId}
      `);
      const sigRows = (sigResult[0] as unknown) as any[];
      const signatures: Record<string, { type: string; data: string; signedAt: string }> = {};
      if (sigRows) {
        for (const sig of sigRows) {
          signatures[sig.sectionKey] = {
            type: sig.signatureType,
            data: sig.signatureData,
            signedAt: sig.signedAt?.toISOString() || '',
          };
        }
      }
      
      // Return structured data for PDF generation
      return {
        enrollment: {
          id: enrollment.id,
          tier: enrollment.tier,
          userName: enrollment.userName,
          userEmail: enrollment.userEmail,

          enrolledAt: enrollment.enrolledAt?.toISOString(),
          intakeFormCompletedAt: enrollment.intakeFormCompletedAt?.toISOString(),
        },
        formData: {
          // Demographics
          fullName: form.fullName,
          dateOfBirth: form.dateOfBirth,
          sex: form.sex,
          email: form.email,
          phone: form.phone,
          address: {
            street: form.streetAddress,
            city: form.city,
            state: form.stateProvince,
            country: form.country,
            zip: form.zipCode,
          },
          // Anthropometrics
          height: form.height,
          currentWeight: form.currentWeight,
          goalWeight: form.goalWeight,
          bodyFatPercentage: form.bodyFatPercentage,
          // Goals
          peptideGoals: form.peptideGoals ? JSON.parse(form.peptideGoals) : [],
          primaryGoal: form.primaryGoal,
          secondaryGoal: form.secondaryGoal,
          additionalGoals: form.additionalGoals,
          previousPeptideExperience: form.previousPeptideExperience,
          // Health
          medicalIssues: form.medicalIssues,
          currentMedications: form.currentMedications ? JSON.parse(form.currentMedications) : [],
          currentSupplements: form.currentSupplements ? JSON.parse(form.currentSupplements) : [],
          foodIntolerances: form.foodIntolerances ? JSON.parse(form.foodIntolerances) : [],
          digestiveIssues: form.digestiveIssues,
          physicalActivityRoutine: form.physicalActivityRoutine,
          physicalLimitations: form.physicalLimitations,
          hormonalStatus: form.hormonalStatus,
          // Safety
          safetyScreenFlags: form.safetyScreenFlags ? JSON.parse(form.safetyScreenFlags) : [],
          // Mental health
          mentalHealthHistory: form.mentalHealthHistory,
          psychMedications: form.psychMedications,
          // Emergency contact
          emergencyContact: {
            name: form.emergencyContactName,
            relationship: form.emergencyContactRelationship,
            phone: form.emergencyContactPhone,
          },
          // Lifestyle
          alcoholUse: form.alcoholUse,
          nicotineUse: form.nicotineUse,
          cannabisUse: form.cannabisUse,
          sleepDuration: form.sleepDuration,
          sleepQuality: form.sleepQuality,
          stressLevel: form.stressLevel,
          mainStressors: form.mainStressors,
          // Wearables
          wearableDevices: form.wearableDevices ? JSON.parse(form.wearableDevices) : [],
          // Aggressiveness
          aggressivenessScale: form.aggressivenessScale,
          financialAggressivenessScale: form.financialAggressivenessScale,
          organizationalCapacityScale: form.organizationalCapacityScale,
          // Referral
          referralSource: form.referralSource,
          referralName: form.referralName,
        },
        signatures,
        submittedAt: form.submittedAt?.toISOString(),
        status: form.status,
      };
    }),

  // ============================================
  // PUBLIC PAYMENT COMPLETION (for guest users)
  // ============================================

  // Complete payment and generate magic link token for guest users
  // Called after successful PayPal payment to update enrollment and allow seamless continuation
  completePaymentPublic: publicProcedure
    .input(z.object({
      enrollmentId: z.number(),
      paymentId: z.string().optional(), // Stripe payment intent ID or legacy PayPal order ID
      paymentMethod: z.enum(["stripe", "manual", "paypal", "venmo"]),
      clientEmail: z.string().email(),
      clientName: z.string(),
      clientPhone: z.string().optional(),
      tier: z.string(),
      amount: z.number(),
      promoCodeId: z.number().optional(),
      promoCode: z.string().optional(),
      originalAmount: z.number().optional(),
      discountAmount: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      const { enrollmentId, paymentId, paymentMethod, clientEmail, clientName, clientPhone, tier, amount, promoCodeId, promoCode, originalAmount, discountAmount } = input;
      
      console.log('[completePaymentPublic] Processing payment completion:', { enrollmentId, paymentMethod, clientEmail, tier, amount });
      
      // Verify enrollment exists
      const enrollmentResult = await database.execute(sql`
        SELECT * FROM transformation_enrollments WHERE id = ${enrollmentId}
      `);
      const enrollmentRows = (enrollmentResult[0] as unknown) as any[];
      if (!enrollmentRows || enrollmentRows.length === 0) {
        throw new Error("Enrollment not found");
      }
      
      const enrollment = enrollmentRows[0];
      
      // Generate a secure magic link token (valid for 24 hours)
      const crypto = await import('crypto');
      const authToken = crypto.randomBytes(32).toString('hex');
      const authTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      // Update enrollment with payment info, client info, and auth token
      await database.execute(sql`
        UPDATE transformation_enrollments 
        SET 
          status = 'coaching_paid',
          coachingFeePaid = TRUE,
          coachingFeePaidAt = NOW(),
          coachingFeeAmount = ${amount},
          coachingFeeStripePaymentId = ${paymentId || null},
          email = ${clientEmail},
          clientName = ${clientName},
          phone = ${clientPhone || null},
          authToken = ${authToken},
          authTokenExpiresAt = ${authTokenExpiresAt.toISOString().slice(0, 19).replace('T', ' ')},
          updatedAt = NOW()
        WHERE id = ${enrollmentId}
      `);
      
      console.log('[completePaymentPublic] Enrollment updated with payment and auth token');
      
      // Create in-app admin notification for payment received
      try {
        const notifDb = await db();
        await notifDb.execute(sql`
          INSERT INTO notifications (userId, type, title, message, createdAt)
          SELECT u.id, 'payment_received',
            ${`Payment Received: ${clientName} - $${amount}`},
            ${`${clientName} (${clientEmail}) paid $${amount} via ${paymentMethod} for ${tier} tier transformation program`},
            NOW()
          FROM users u WHERE u.role = 'admin'
        `);
      } catch (notifErr) {
        console.error('[completePaymentPublic] Failed to create in-app notification:', notifErr);
      }
      
      // Send payment confirmation emails
      try {
        const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
        
        await sendTransformationPaymentConfirmationEmail({
          to: clientEmail,
          clientName: clientName,
          tier: tier,
          amount: amount,
          paymentMethod: paymentMethod,
          baseUrl: baseUrl,
          enrollmentId: enrollmentId,
        });
        
        await sendTransformationPaymentAdminNotification({
          clientName: clientName,
          clientEmail: clientEmail,
          tier: tier,
          amount: amount,
          paymentMethod: paymentMethod,
          baseUrl: baseUrl,
        });
        
        // Send verification email with magic link for account setup
        const { sendGuestEnrollmentVerificationEmail, sendIntakeFormEmail } = await import('../emailService');
        await sendGuestEnrollmentVerificationEmail({
          to: clientEmail,
          clientName: clientName,
          tier: tier,
          authToken: authToken,
          enrollmentId: enrollmentId,
          baseUrl: baseUrl,
        });
        
        // Send dedicated intake form email with direct link
        await sendIntakeFormEmail({
          to: clientEmail,
          clientName: clientName,
          tier: tier,
          enrollmentId: enrollmentId,
          baseUrl: baseUrl,
          authToken: authToken,
        });
        
        console.log('[completePaymentPublic] Payment confirmation, verification, and intake form emails sent');
      } catch (emailError) {
        console.error('[completePaymentPublic] Failed to send payment emails:', emailError);
        // Don't fail the whole operation if email fails
      }
      
      // Return the auth token so frontend can use it for seamless continuation
      return {
        success: true,
        authToken,
        enrollmentId,
        message: "Payment completed successfully. Use the auth token to continue your journey.",
      };
    }),

  // Verify auth token and get enrollment (for magic link authentication)
  verifyAuthToken: publicProcedure
    .input(z.object({
      enrollmentId: z.number(),
      authToken: z.string(),
    }))
    .query(async ({ input }) => {
      const database = await db();
      const { enrollmentId, authToken } = input;
      
      // Find enrollment with matching token
      const result = await database.execute(sql`
        SELECT * FROM transformation_enrollments 
        WHERE id = ${enrollmentId} 
        AND authToken = ${authToken}
      `);
      const rows = (result[0] as unknown) as any[];
      
      if (!rows || rows.length === 0) {
        throw new Error("Invalid authentication token");
      }
      
      const enrollment = rows[0];
      
      // Check if token has expired
      if (enrollment.authTokenExpiresAt && new Date(enrollment.authTokenExpiresAt) < new Date()) {
        throw new Error("Authentication token has expired");
      }
      
      return {
        id: enrollment.id,
        email: enrollment.email,
        clientName: enrollment.clientName,
        tier: enrollment.tier,
        status: enrollment.status,
        coachingFeePaid: enrollment.coachingFeePaid,
        intakeFormCompleted: enrollment.intakeFormCompleted,
      };
    }),

  // Get pending enrollments (paid but not linked to user account)
  getPendingEnrollments: adminProcedure
    .query(async () => {
      const database = await db();
      
      // Find enrollments where payment is complete but no user is linked
      const result = await database.execute(sql`
        SELECT 
          id, email, clientName, tier, status, 
          coachingFeePaid, coachingFeePaidAt, coachingFeeAmount,
          intakeFormCompleted, intakeFormCompletedAt,
          authToken, authTokenExpiresAt,
          phone,
          createdAt, updatedAt
        FROM transformation_enrollments 
        WHERE coachingFeePaid = TRUE 
        AND userId IS NULL
        ORDER BY coachingFeePaidAt DESC
      `);
      const rows = (result[0] as unknown) as any[];
      
      return rows || [];
    }),

  // Manually link enrollment to user by email (admin only)
  linkEnrollmentToUserByEmail: adminProcedure
    .input(z.object({
      enrollmentId: z.number(),
      userEmail: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      const { enrollmentId, userEmail } = input;
      
      // Find user by email
      const userResult = await database.execute(sql`
        SELECT id, email, name FROM users WHERE email = ${userEmail}
      `);
      const users = (userResult[0] as unknown) as any[];
      
      if (!users || users.length === 0) {
        throw new Error(`No user found with email: ${userEmail}`);
      }
      
      const user = users[0];
      
      // Update enrollment with user ID
      await database.execute(sql`
        UPDATE transformation_enrollments 
        SET userId = ${user.id}, updatedAt = NOW()
        WHERE id = ${enrollmentId}
      `);
      
      return { success: true, userId: user.id, userName: user.name };
    }),

  // Resend verification email for pending enrollment
  resendVerificationEmail: adminProcedure
    .input(z.object({
      enrollmentId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const database = await db();
      const { enrollmentId } = input;
      
      // Get enrollment
      const result = await database.execute(sql`
        SELECT * FROM transformation_enrollments WHERE id = ${enrollmentId}
      `);
      const rows = (result[0] as unknown) as any[];
      
      if (!rows || rows.length === 0) {
        throw new Error("Enrollment not found");
      }
      
      const enrollment = rows[0];
      
      if (!enrollment.email) {
        throw new Error("No email address on file for this enrollment");
      }
      
      // Generate new auth token
      const crypto = await import('crypto');
      const authToken = crypto.randomBytes(32).toString('hex');
      const authTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      // Update enrollment with new token
      await database.execute(sql`
        UPDATE transformation_enrollments 
        SET authToken = ${authToken}, 
            authTokenExpiresAt = ${authTokenExpiresAt.toISOString().slice(0, 19).replace('T', ' ')},
            updatedAt = NOW()
        WHERE id = ${enrollmentId}
      `);
      
      // Send verification email
      const { sendGuestEnrollmentVerificationEmail } = await import('../emailService');
      const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      
      await sendGuestEnrollmentVerificationEmail({
        to: enrollment.email,
        clientName: enrollment.clientName || 'Valued Client',
        tier: enrollment.tier,
        authToken: authToken,
        enrollmentId: enrollmentId,
        baseUrl: baseUrl,
      });
      
      return { success: true, message: `Verification email sent to ${enrollment.email}` };
    }),

  // ============================================
  // RETRY PAYMENT RECORDING
  // ============================================

  // Admin: Retry payment recording for an enrollment
  // Checks local DB for completed payment records and updates the enrollment if found
  retryPaymentRecording: adminProcedure
    .input(z.object({
      enrollmentId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { enrollmentId } = input;
      const database = await db();
      
      // 1. Get the enrollment
      const enrollmentResult = await database.execute(sql`
        SELECT e.*, COALESCE(u.name, e.clientName) as userName, u.email as userEmail
        FROM transformation_enrollments e
        LEFT JOIN users u ON e.userId = u.id
        WHERE e.id = ${enrollmentId}
      `);
      const enrollmentRows = (enrollmentResult[0] as unknown) as any[];
      if (!enrollmentRows[0]) {
        throw new Error('Enrollment not found');
      }
      const enrollment = enrollmentRows[0];
      
      // 2. Check if already paid
      if (enrollment.coachingFeePaid) {
        return {
          success: false,
          message: 'This enrollment already has coaching fee marked as paid.',
          alreadyPaid: true,
        };
      }
      
      // 3. Look for completed payment records linked to this enrollment
      const paymentResult = await database.execute(sql`
        SELECT * FROM paypal_orders
        WHERE clientProtocolId = ${enrollmentId}
          AND status = 'COMPLETED'
        ORDER BY completedAt DESC
        LIMIT 1
      `);
      const paymentRecords = (paymentResult[0] as unknown) as any[];
      
      if (!paymentRecords[0]) {
        return {
          success: false,
          message: 'No completed payment records found for this enrollment. You can manually mark the coaching fee as paid using the journey step toggles above.',
          noOrderFound: true,
        };
      }
      
      // Found a completed payment that wasn't recorded to the enrollment
      const paymentRecord = paymentRecords[0];
      const tierPrices: Record<string, number> = { elite: 15000, functional_health_elite: 8500, advanced: 4500, flagship: 3000, recovery: 3000, immunity: 3000, longevity: 3000, mitochondria: 3000, essentials: 1000 };
      const amount = tierPrices[enrollment.tier] || parseFloat(paymentRecord.gross_amount || paymentRecord.amount) || 3000;
      
      await database.execute(sql`
        UPDATE transformation_enrollments
        SET status = 'coaching_paid',
            coachingFeePaid = TRUE,
            coachingFeePaidAt = ${paymentRecord.completedAt || new Date()},
            coachingFeeAmount = ${amount},
            clientName = COALESCE(clientName, ${paymentRecord.payerName}),
            email = COALESCE(email, ${paymentRecord.payerEmail}),
            updatedAt = NOW()
        WHERE id = ${enrollmentId}
      `);
      
      // Send confirmation emails
      const clientEmail = enrollment.userEmail || enrollment.email || paymentRecord.payerEmail;
      const clientName = enrollment.userName || enrollment.clientName || paymentRecord.payerName || 'Valued Client';
      const baseUrl = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      
      try {
        if (clientEmail) {
          await sendTransformationPaymentConfirmationEmail({
            to: clientEmail,
            clientName,
            tier: enrollment.tier,
            amount,
            paymentMethod: 'Payment Recovery',
            baseUrl,
            enrollmentId,
          });
        }
        await sendTransformationPaymentAdminNotification({
          clientName,
          clientEmail: clientEmail || 'unknown',
          tier: enrollment.tier,
          amount,
          paymentMethod: 'Payment Recovery',
          baseUrl,
        });
        
        if (clientEmail) {
          const { sendIntakeFormEmail } = await import('../emailService');
          await sendIntakeFormEmail({
            to: clientEmail,
            clientName,
            tier: enrollment.tier,
            enrollmentId,
            baseUrl,
          });
        }
      } catch (emailErr) {
        console.error('[retryPaymentRecording] Email send failed:', emailErr);
      }
      
      return {
        success: true,
        message: `Payment recorded! Enrollment updated to coaching_paid. Amount: $${amount}.`,
        recovered: true,
        amount,
      };
    }),

  // ============================================
  // STRIPE CHECKOUT SESSION CREATION
  // ============================================
  createCheckoutSession: publicProcedure
    .input(z.object({
      enrollmentId: z.number(),
      tier: z.string(),
      planName: z.string(),
      amount: z.number(), // in dollars
      customerEmail: z.string().email(),
      customerName: z.string(),
      vipConcierge: z.boolean().optional(),
      vipConciergeFee: z.number().optional(),
      promoCode: z.string().optional(),
      promoCodeId: z.number().optional(),
      originalAmount: z.number().optional(),
      discountAmount: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { getStripeSecretKey } = await import('../stripe/stripeConfig');
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(getStripeSecretKey(), { apiVersion: '2024-06-20' as any });

      const { enrollmentId, tier, planName, amount, customerEmail, customerName, vipConcierge, vipConciergeFee, promoCode, promoCodeId, originalAmount, discountAmount } = input;
      const origin = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';

      // Build line items
      const PROCESSING_FEE_RATE = 0.035; // 3.5% CC processing fee
      // Only subtract concierge fee if VIP concierge is actually selected
      const actualConciergeFee = vipConcierge ? (vipConciergeFee || 0) : 0;
      const baseAmount = Math.max(amount - actualConciergeFee, 0.50); // Stripe minimum $0.50
      const processingFee = Math.round(amount * PROCESSING_FEE_RATE * 100) / 100; // 3.5% of total amount

      const lineItems: any[] = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: planName,
            description: `90-Day Transformation Coaching Program - ${tier.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}`,
          },
          unit_amount: Math.round(baseAmount * 100), // cents
        },
        quantity: 1,
      }];

      // Add VIP Concierge as separate line item if selected
      if (vipConcierge && vipConciergeFee && vipConciergeFee > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'VIP Supply Concierge',
              description: 'Pharmaceutical-grade supply sourcing & delivery coordination',
            },
            unit_amount: Math.round(vipConciergeFee * 100),
          },
          quantity: 1,
        });
      }

      // Add 3.5% CC processing fee as separate line item
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Credit Card Processing Fee (3.5%)',
            description: 'Merchant service charge for credit/debit card payment',
          },
          unit_amount: Math.round(processingFee * 100),
        },
        quantity: 1,
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: customerEmail,
        client_reference_id: enrollmentId.toString(),
        allow_promotion_codes: true,
        line_items: lineItems,
        metadata: {
          enrollment_id: enrollmentId.toString(),
          user_id: (ctx.user?.id || '').toString(),
          tier,
          plan_name: planName,
          customer_name: customerName,
          customer_email: customerEmail,
          vip_concierge: vipConcierge ? 'true' : 'false',
          vip_concierge_fee: (vipConciergeFee || 0).toString(),
          ...(promoCodeId ? {
            promo_code_id: promoCodeId.toString(),
            promo_code: promoCode || '',
            promo_original_amount: (originalAmount || 0).toString(),
            promo_discount_amount: (discountAmount || 0).toString(),
          } : {}),
        },
        success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=transformation&plan=${encodeURIComponent(planName)}&tier=${input.tier}&enrollmentId=${input.enrollmentId}`,
        cancel_url: `${origin}/transformation?plan=${tier}&payment=cancelled`,
      });

      console.log(`[Stripe] Created checkout session ${session.id} for enrollment ${enrollmentId}, amount: $${amount}`);

      return { checkoutUrl: session.url, sessionId: session.id };
    }),

  // Admin: resend payment link via Stripe
  resendPaymentLink: adminProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      const result = await database.execute(sql`
        SELECT e.*, COALESCE(u.email, e.email) as clientEmail, COALESCE(u.name, e.clientName) as clientName
        FROM transformation_enrollments e
        LEFT JOIN users u ON e.userId = u.id
        WHERE e.id = ${input.enrollmentId}
      `);
      const rows = (result[0] as unknown) as any[];
      if (!rows || rows.length === 0) throw new Error('Enrollment not found');
      const enrollment = rows[0];

      if (!enrollment.clientEmail) throw new Error('No email on file for this enrollment');

      const { getStripeSecretKey } = await import('../stripe/stripeConfig');
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(getStripeSecretKey(), { apiVersion: '2024-06-20' as any });
      const origin = ctx.req?.headers?.origin || process.env.VITE_APP_URL || 'https://peptidecoach.pro';

      const tierPrices: Record<string, number> = {
        flagship: 3000, recovery: 3000, immunity: 3000, longevity: 3000, mitochondria: 3000,
        advanced: 4500, functional_health_elite: 8500, elite: 15000, essentials: 1000,
        coaching_20min: 150, coaching_60min: 300,
      };
      const amount = tierPrices[enrollment.tier] || 3000;
      const planName = enrollment.tier?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Coaching Program';
      const processingFee = Math.round(amount * 0.035 * 100) / 100; // 3.5% CC fee

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: enrollment.clientEmail,
        client_reference_id: input.enrollmentId.toString(),
        allow_promotion_codes: true,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: planName,
              description: `90-Day Transformation Coaching Program`,
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        }, {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Credit Card Processing Fee (3.5%)',
              description: 'Merchant service charge for credit/debit card payment',
            },
            unit_amount: Math.round(processingFee * 100),
          },
          quantity: 1,
        }],
        metadata: {
          enrollment_id: input.enrollmentId.toString(),
          tier: enrollment.tier,
          plan_name: planName,
          customer_name: enrollment.clientName || '',
          customer_email: enrollment.clientEmail,
        },
        success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=transformation&plan=${encodeURIComponent(enrollment.tier || 'Coaching Program')}&tier=${enrollment.tier}&enrollmentId=${enrollment.id}`,
        cancel_url: `${origin}/transformation?payment=cancelled`,
      });

      // Send the payment link via email
      try {
        await sendEmail({
          to: enrollment.clientEmail,
          subject: `Complete Your Payment - ${planName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e40af;">Complete Your Payment</h2>
              <p>Hi ${enrollment.clientName || 'there'},</p>
              <p>Your coach has sent you a payment link to complete your enrollment in the <strong>${planName}</strong> program.</p>
              <p style="margin: 24px 0;"><a href="${session.url}" style="background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Complete Payment - $${(amount + processingFee).toLocaleString()}</a></p>
              <p style="color: #888; font-size: 12px;">Includes 3.5% credit card processing fee ($${processingFee.toFixed(2)})</p>
              <p style="color: #666; font-size: 14px;">This link will expire in 24 hours. If you have questions, reply to this email.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('[resendPaymentLink] Email send failed:', emailErr);
      }

      return { success: true, checkoutUrl: session.url, message: `Payment link sent to ${enrollment.clientEmail}` };
    }),

  // ============================================
  // ENROLLMENT ACTIVITY LOG
  // ============================================
  getEnrollmentActivityLog: adminProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .query(async ({ input }) => {
      const database = await db();
      const logs = await database.execute(sql`
        SELECT * FROM enrollment_activity_log
        WHERE enrollment_id = ${input.enrollmentId}
        ORDER BY created_at DESC
        LIMIT 100
      `);
      return (logs[0] as unknown as any[]) || [];
    }),

  // ============================================
  // BULK ENROLLMENT CLEANUP
  // ============================================
  scanDuplicateEnrollments: adminProcedure
    .query(async () => {
      const database = await db();

      // Find users with multiple enrollments
      const byUser = await database.execute(sql`
        SELECT e.userId, COALESCE(u.name, e.clientName) as userName, u.email as userEmail, COUNT(*) as count,
               GROUP_CONCAT(e.id ORDER BY e.id DESC) as enrollmentIds,
               GROUP_CONCAT(e.status ORDER BY e.id DESC) as statuses,
               GROUP_CONCAT(e.tier ORDER BY e.id DESC) as tiers,
               GROUP_CONCAT(COALESCE(e.coachingFeePaid, 0) ORDER BY e.id DESC) as paidStatuses
        FROM transformation_enrollments e
        LEFT JOIN users u ON e.userId = u.id
        WHERE e.userId IS NOT NULL
        GROUP BY e.userId
        HAVING COUNT(*) > 1
        ORDER BY count DESC
      `);

      // Find guest emails with multiple enrollments
      const byEmail = await database.execute(sql`
        SELECT e.email, e.clientName, COUNT(*) as count,
               GROUP_CONCAT(e.id ORDER BY e.id DESC) as enrollmentIds,
               GROUP_CONCAT(e.status ORDER BY e.id DESC) as statuses,
               GROUP_CONCAT(e.tier ORDER BY e.id DESC) as tiers,
               GROUP_CONCAT(COALESCE(e.coachingFeePaid, 0) ORDER BY e.id DESC) as paidStatuses
        FROM transformation_enrollments e
        WHERE e.userId IS NULL AND e.email IS NOT NULL
        GROUP BY e.email
        HAVING COUNT(*) > 1
        ORDER BY count DESC
      `);

      const userDuplicates = (byUser[0] as unknown as any[]) || [];
      const guestDuplicates = (byEmail[0] as unknown as any[]) || [];

      // Format results
      const duplicateGroups = [
        ...userDuplicates.map((d: any) => ({
          type: 'user' as const,
          identifier: d.userName || d.userEmail || `User #${d.userId}`,
          userId: d.userId,
          email: d.userEmail,
          count: d.count,
          enrollmentIds: d.enrollmentIds?.split(',').map(Number) || [],
          statuses: d.statuses?.split(',') || [],
          tiers: d.tiers?.split(',') || [],
          paidStatuses: d.paidStatuses?.split(',').map((s: string) => s === '1') || [],
        })),
        ...guestDuplicates.map((d: any) => ({
          type: 'guest' as const,
          identifier: d.clientName || d.email || 'Unknown Guest',
          userId: null,
          email: d.email,
          count: d.count,
          enrollmentIds: d.enrollmentIds?.split(',').map(Number) || [],
          statuses: d.statuses?.split(',') || [],
          tiers: d.tiers?.split(',') || [],
          paidStatuses: d.paidStatuses?.split(',').map((s: string) => s === '1') || [],
        })),
      ];

      return {
        totalDuplicateGroups: duplicateGroups.length,
        totalDuplicateEnrollments: duplicateGroups.reduce((sum, g) => sum + g.count - 1, 0),
        groups: duplicateGroups,
      };
    }),

  mergeEnrollments: adminProcedure
    .input(z.object({
      keepEnrollmentId: z.number(),
      deleteEnrollmentIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      const { keepEnrollmentId, deleteEnrollmentIds } = input;

      // Safety check: don't delete the one we're keeping
      const safeDeleteIds = deleteEnrollmentIds.filter(id => id !== keepEnrollmentId);
      if (safeDeleteIds.length === 0) {
        return { success: false, message: 'No enrollments to delete.' };
      }

      // Verify the keep enrollment exists
      const keepResult = await database.execute(sql`SELECT id FROM transformation_enrollments WHERE id = ${keepEnrollmentId}`);
      const keepRows = (keepResult[0] as unknown) as any[];
      if (!keepRows[0]) throw new Error(`Enrollment ${keepEnrollmentId} not found`);

      // Soft-delete the duplicates by setting status to 'completed' and adding a deletedAt marker
      let deletedCount = 0;
      for (const deleteId of safeDeleteIds) {
        await database.execute(sql`
          UPDATE transformation_enrollments
          SET status = 'completed',
              coachNotes = CONCAT(COALESCE(coachNotes, ''), '\n[Auto-merged: Duplicate removed in favor of enrollment #${keepEnrollmentId} on ${new Date().toISOString()}]')
          WHERE id = ${deleteId}
        `);
        deletedCount++;

        // Log activity on the deleted enrollment
        await logEnrollmentActivity(database, deleteId, 'enrollment_deleted', {
          reason: 'duplicate_merge',
          mergedInto: keepEnrollmentId,
        }, ctx.user?.name || 'Admin', ctx.user?.id);
      }

      // Log activity on the kept enrollment
      await logEnrollmentActivity(database, keepEnrollmentId, 'enrollment_merged', {
        mergedFrom: safeDeleteIds,
        deletedCount,
      }, ctx.user?.name || 'Admin', ctx.user?.id);

      return {
        success: true,
        message: `Merged ${deletedCount} duplicate enrollment(s). Kept enrollment #${keepEnrollmentId}.`,
        deletedCount,
        keptId: keepEnrollmentId,
      };
    }),

  // Admin: Export enrollments as CSV
  exportEnrollmentsCsv: adminProcedure
    .input(z.object({
      status: z.string().optional(),
      tier: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const database = await db();
      let query = `
        SELECT e.id, e.status, e.tier, e.programType,
               COALESCE(u.name, e.clientName, 'Unknown') as clientName,
               COALESCE(u.email, e.email, '') as clientEmail,
               e.coachingFeePaid, e.intakeFormCompleted,
               e.discoverySessionScheduled, e.discoverySessionCompleted,
               e.protocolReady, e.protocolApproved, e.protocolPaid,
               e.boxShipped, e.boxDelivered,
               e.reconstitutionScheduled, e.reconstitutionCompleted,
               e.paymentMethod, e.paymentId, e.paymentAmount,
               e.trackingNumber, e.shippingCarrier,
               e.coachNotes,
               e.createdAt, e.updatedAt
        FROM transformation_enrollments e
        LEFT JOIN users u ON e.userId = u.id
        WHERE 1=1
      `;
      const conditions: string[] = [];
      
      if (input?.status) {
        conditions.push(` AND e.status = '${input.status.replace(/'/g, "''")}'`);
      }
      if (input?.tier) {
        conditions.push(` AND e.tier = '${input.tier.replace(/'/g, "''")}'`);
      }
      if (input?.dateFrom) {
        conditions.push(` AND e.createdAt >= '${input.dateFrom.replace(/'/g, "''")}' `);
      }
      if (input?.dateTo) {
        conditions.push(` AND e.createdAt <= '${input.dateTo.replace(/'/g, "''")} 23:59:59' `);
      }
      
      query += conditions.join('') + ' ORDER BY e.createdAt DESC';
      
      const result = await database.execute(sql.raw(query));
      const rows = (result[0] as unknown) as any[];
      
      if (!rows || rows.length === 0) {
        return { csv: 'No enrollments found matching the criteria.', count: 0 };
      }
      
      // Build CSV
      const headers = [
        'ID', 'Status', 'Tier', 'Program Type', 'Client Name', 'Client Email',
        'Coaching Fee Paid', 'Intake Completed', 'Strategy Scheduled', 'Strategy Completed',
        'Protocol Ready', 'Protocol Approved', 'Protocol Paid',
        'Box Shipped', 'Box Delivered', 'Reconstitution Scheduled', 'Training Completed',
        'Payment Method', 'Payment ID', 'Payment Amount',
        'Tracking Number', 'Shipping Carrier', 'Coach Notes',
        'Created At', 'Updated At'
      ];
      
      const csvRows = rows.map(r => [
        r.id, r.status, r.tier, r.programType, r.clientName, r.clientEmail,
        r.coachingFeePaid ? 'Yes' : 'No', r.intakeFormCompleted ? 'Yes' : 'No',
        r.discoverySessionScheduled ? 'Yes' : 'No', r.discoverySessionCompleted ? 'Yes' : 'No',
        r.protocolReady ? 'Yes' : 'No', r.protocolApproved ? 'Yes' : 'No', r.protocolPaid ? 'Yes' : 'No',
        r.boxShipped ? 'Yes' : 'No', r.boxDelivered ? 'Yes' : 'No',
        r.reconstitutionScheduled ? 'Yes' : 'No', r.reconstitutionCompleted ? 'Yes' : 'No',
        r.paymentMethod || '', r.paymentId || '', r.paymentAmount || '',
        r.trackingNumber || '', r.shippingCarrier || '',
        (r.coachNotes || '').replace(/[\n\r]+/g, ' '),
        r.createdAt ? new Date(r.createdAt).toISOString() : '',
        r.updatedAt ? new Date(r.updatedAt).toISOString() : ''
      ]);
      
      const escapeCsv = (val: any) => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };
      
      const csv = [headers.join(','), ...csvRows.map(row => row.map(escapeCsv).join(','))].join('\n');
      
      return { csv, count: rows.length };
    }),

  // ============================================
  // EMAIL TRACKING
  // ============================================
  
  // Get email tracking data for a specific enrollment
  getEnrollmentEmailTracking: adminProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .query(async ({ input }) => {
      const { getEnrollmentEmailTracking } = await import('../emailTracking');
      return getEnrollmentEmailTracking(input.enrollmentId);
    }),

  // Get click details for a specific tracking ID
  getEmailClickDetails: adminProcedure
    .input(z.object({ trackingId: z.string() }))
    .query(async ({ input }) => {
      const { getClickDetails } = await import('../emailTracking');
      return getClickDetails(input.trackingId);
    }),

  // Get transformation email stats (aggregate)
  getTransformationEmailStats: adminProcedure
    .query(async () => {
      const { getTransformationEmailStats } = await import('../emailTracking');
      return getTransformationEmailStats();
    }),

  // Get email tracking status for multiple enrollments (for list view badges)
  getEmailTrackingByEnrollmentIds: adminProcedure
    .input(z.object({ enrollmentIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      const { getEmailTrackingByEnrollmentIds } = await import('../emailTracking');
      return getEmailTrackingByEnrollmentIds(input.enrollmentIds);
    }),

  // ============================================
  // RESEND WELCOME EMAIL
  // ============================================
  resendWelcomeEmail: adminProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      const { enrollmentId } = input;

      // Get enrollment with user info
      const enrollmentResult = await database.execute(sql`
        SELECT e.*, COALESCE(u.name, e.clientName) as userName, u.email as userEmail
        FROM transformation_enrollments e
        LEFT JOIN users u ON e.userId = u.id
        WHERE e.id = ${enrollmentId}
      `);
      const rows = (enrollmentResult[0] as unknown) as any[];
      const enrollment = rows[0];
      if (!enrollment) throw new Error('Enrollment not found');

      const clientEmail = enrollment.userEmail || enrollment.email;
      if (!clientEmail) throw new Error('No email address found for this enrollment. Cannot resend welcome email.');

      const clientName = enrollment.userName || enrollment.clientName || 'Valued Client';
      const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      const dashboardUrl = `${baseUrl}/transformation`;

      // Create tracking record for the resend
      const { createEmailTracking, injectTrackingIntoHtml } = await import('../emailTracking');
      const trackingId = await createEmailTracking({
        enrollmentId,
        emailType: 'resend_welcome',
        recipientEmail: clientEmail,
        recipientName: clientName,
        subject: 'Welcome to Your Transformation Journey! (Resent)',
      });

      // Send the welcome email (same as enrolled milestone)
      const result = await sendTransformationMilestoneEmail({
        to: clientEmail,
        clientName,
        milestone: 'enrolled' as any,
        nextStepTitle: 'Watch the Bioregulator Video',
        nextStepDescription: 'Start by watching the introductory bioregulator video to learn about the science behind your transformation.',
        dashboardUrl,
        enrollmentId,
      });

      // Log the resend in activity log
      await logEnrollmentActivity(database, enrollmentId, 'welcome_email_resent', {
        sentTo: clientEmail,
        success: result.success,
        trackingId,
      }, ctx.user?.name || 'Admin', ctx.user?.id);

      if (!result.success) {
        throw new Error(`Failed to resend welcome email: ${result.message}`);
      }

      return {
        success: true,
        message: `Welcome email resent to ${clientEmail}`,
        trackingId,
      };
    }),

  // Resend intake form email to a client (admin action)
  resendIntakeFormEmail: adminProcedure
    .input(z.object({ enrollmentId: z.number(), resetForm: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      const { enrollmentId, resetForm } = input;

      // Get enrollment with user info
      const enrollmentResult = await database.execute(sql`
        SELECT e.*, COALESCE(u.name, e.clientName) as userName, u.email as userEmail
        FROM transformation_enrollments e
        LEFT JOIN users u ON e.userId = u.id
        WHERE e.id = ${enrollmentId}
      `);
      const rows = (enrollmentResult[0] as unknown) as any[];
      const enrollment = rows[0];
      if (!enrollment) throw new Error('Enrollment not found');

      const clientEmail = enrollment.userEmail || enrollment.email;
      if (!clientEmail) throw new Error('No email address found for this enrollment.');

      const clientName = enrollment.userName || enrollment.clientName || 'Valued Client';
      const tier = enrollment.tier || 'flagship';
      const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';

      // Optionally reset intake form status so client can redo it
      if (resetForm) {
        await database.execute(sql`
          UPDATE transformation_enrollments SET
            intakeFormCompleted = FALSE,
            intakeFormCompletedAt = NULL,
            status = CASE WHEN status = 'intake_complete' THEN 'coaching_paid' ELSE status END,
            updatedAt = NOW()
          WHERE id = ${enrollmentId}
        `);
        // Reset the intake form response status so the form is editable again
        await database.execute(sql`
          UPDATE intake_form_responses SET status = 'in_progress', submittedAt = NULL WHERE enrollmentId = ${enrollmentId}
        `);
      }

      // Send the intake form email
      const { sendIntakeFormEmail } = await import('../emailService');
      const result = await sendIntakeFormEmail({
        to: clientEmail,
        clientName,
        tier,
        enrollmentId,
        baseUrl,
      });

      // Log the resend
      await logEnrollmentActivity(database, enrollmentId, 'intake_form_email_resent', {
        sentTo: clientEmail,
        resetForm: !!resetForm,
        success: result.success,
      }, ctx.user?.name || 'Admin', ctx.user?.id);

      if (!result.success) {
        throw new Error(`Failed to resend intake form email: ${result.message}`);
      }

      return {
        success: true,
        message: `Intake form email resent to ${clientEmail}${resetForm ? ' (form reset)' : ''}`,
      };
    }),

  // ============================================
  // PROSPECT PROFILE GATE
  // ============================================
  
  // Save prospect profile (required before watching videos)
  saveProspectProfile: publicProcedure
    .input(z.object({
      enrollmentId: z.number(),
      fullName: z.string().min(2, 'Full name is required'),
      email: z.string().email('Valid email is required'),
      phone: z.string().min(7, 'Phone number is required'),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      const { enrollmentId, fullName, email, phone, address, city, state, zipCode } = input;

      // Verify enrollment exists
      const enrollmentResult = await database.execute(sql`
        SELECT id, status, clientName, email, profileCompleted
        FROM transformation_enrollments WHERE id = ${enrollmentId}
      `);
      const rows = (enrollmentResult[0] as unknown) as any[];
      const enrollment = rows[0];
      if (!enrollment) throw new Error('Enrollment not found');

      // Update enrollment with profile data
      await database.execute(sql`
        UPDATE transformation_enrollments
        SET clientName = ${fullName},
            email = ${email},
            phone = ${phone},
            shippingStreet = ${address || null},
            shippingCity = ${city || null},
            shippingState = ${state || null},
            shippingZip = ${zipCode || null},
            profileCompleted = 1,
            profileCompletedAt = NOW(),
            updatedAt = NOW()
        WHERE id = ${enrollmentId}
      `);

      // If user is logged in, also update their user record
      if (ctx.user?.id) {
        await database.execute(sql`
          UPDATE users
          SET name = COALESCE(NULLIF(name, ''), ${fullName}),
              phone = COALESCE(NULLIF(phone, ''), ${phone})
          WHERE id = ${ctx.user.id}
        `);
      }

      // Sync profile data to linked client record (phone, address, name)
      try {
        const clientLookup = await database.execute(sql`
          SELECT clientId, clientProtocolId FROM transformation_enrollments WHERE id = ${enrollmentId} LIMIT 1
        `);
        const clRows = (clientLookup[0] as unknown) as any[];
        const linkedClientId = clRows?.[0]?.clientId;
        const linkedCpId = clRows?.[0]?.clientProtocolId;
        
        if (linkedClientId && linkedClientId > 0) {
          await database.execute(sql`
            UPDATE clients 
            SET name = COALESCE(NULLIF(${fullName}, ''), name),
                phone = COALESCE(NULLIF(${phone}, ''), phone),
                shippingName = COALESCE(NULLIF(${fullName}, ''), shippingName),
                shippingStreet = COALESCE(NULLIF(${address || null}, ''), shippingStreet),
                shippingCity = COALESCE(NULLIF(${city || null}, ''), shippingCity),
                shippingState = COALESCE(NULLIF(${state || null}, ''), shippingState),
                shippingZip = COALESCE(NULLIF(${zipCode || null}, ''), shippingZip),
                shippingPhone = COALESCE(NULLIF(${phone}, ''), shippingPhone),
                updatedAt = NOW()
            WHERE id = ${linkedClientId}
          `);
          console.log('[saveProspectProfile] Synced profile to client record:', { enrollmentId, clientId: linkedClientId });
        }
        
        if (linkedCpId && linkedCpId > 0) {
          await database.execute(sql`
            UPDATE client_protocols 
            SET clientName = COALESCE(NULLIF(${fullName}, ''), clientName),
                clientEmail = COALESCE(NULLIF(${email}, ''), clientEmail),
                updatedAt = NOW()
            WHERE id = ${linkedCpId}
          `);
        }
      } catch (syncErr) {
        console.error('[saveProspectProfile] Failed to sync to client record:', syncErr);
      }

      // Log activity
      await logEnrollmentActivity(database, enrollmentId, 'profile_completed', {
        clientName: fullName,
        email,
        phone,
        shippingStreet: address || null,
        shippingCity: city || null,
        shippingState: state || null,
        shippingZip: zipCode || null,
      }, fullName, ctx.user?.id);

      // Create admin in-app notification
      try {
        await database.execute(sql`
          INSERT INTO notifications (userId, type, title, message, createdAt)
          SELECT u.id, 'profile_completed',
            ${`${fullName} completed their profile`},
            ${`${fullName} (${email}) has completed their profile and is ready to watch the masterclass videos.`},
            NOW()
          FROM users u WHERE u.role = 'admin'
        `);
      } catch (notifErr) {
        console.error('[saveProspectProfile] Failed to create admin notification:', notifErr);
      }

      // Send admin email notification for profile completion
      try {
        const adminResult = await database.execute(sql`SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL`);
        const adminEmails = ((adminResult[0] as unknown) as any[])?.map((r: any) => r.email).filter(Boolean) || [];
        if (adminEmails.length > 0) {
          await sendAdminMilestoneNotification({
            adminEmails,
            clientName: fullName,
            clientEmail: email,
            milestone: 'profile_completed',
            milestoneLabel: 'Profile Completed - Ready for Masterclass'
          });
        }
      } catch (emailErr) {
        console.error('[saveProspectProfile] Failed to send admin email:', emailErr);
      }

      return {
        success: true,
        message: 'Profile saved successfully. You can now access the masterclass videos.',
      };
    }),

  // ============================================
  // INTAKE FORM REMINDERS
  // ============================================

  // Send manual intake form reminder to a specific enrollment
  sendIntakeReminder: adminProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { sendManualIntakeReminder } = await import('../cron/intakeFormReminderCron');
      const result = await sendManualIntakeReminder(input.enrollmentId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send intake reminder');
      }
      
      return {
        success: true,
        message: 'Intake form reminder sent successfully',
      };
    }),

  // Send bulk intake form reminders to all enrollments with incomplete intake forms
  sendBulkIntakeReminders: adminProcedure
    .mutation(async ({ ctx }) => {
      const database = await db();
      
      // Find all enrollments with paid coaching fee but incomplete intake form and valid email
      const result = await database.execute(sql`
        SELECT id, email, clientName
        FROM transformation_enrollments
        WHERE coachingFeePaid = TRUE
          AND intakeFormCompleted = FALSE
          AND email IS NOT NULL
          AND email != ''
        ORDER BY createdAt DESC
      `);
      
      const enrollments = (result[0] as unknown) as any[];
      if (!enrollments || enrollments.length === 0) {
        return { success: true, sent: 0, failed: 0, message: 'No enrollments need intake form reminders' };
      }
      
      const { sendManualIntakeReminder } = await import('../cron/intakeFormReminderCron');
      let sent = 0;
      let failed = 0;
      
      for (const enrollment of enrollments) {
        const result = await sendManualIntakeReminder(enrollment.id);
        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      }
      
      return {
        success: true,
        sent,
        failed,
        message: `Sent ${sent} intake form reminder(s)${failed > 0 ? `, ${failed} failed` : ''}`,
      };
    }),

  // Sync a single enrollment to a client record (and client_protocol)
  syncSingleEnrollmentClient: adminProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db();
      const result = await database.execute(sql`
        SELECT id, clientName, email, phone, shippingStreet, shippingCity, shippingState, shippingZip, clientId, clientProtocolId
        FROM transformation_enrollments
        WHERE id = ${input.enrollmentId}
      `);
      const rows = (result[0] as unknown) as any[];
      const enrollment = rows[0];
      if (!enrollment) throw new Error('Enrollment not found');
      if (!enrollment.email) throw new Error('Enrollment has no email address');
      
      // Use the shared helper which creates both client + client_protocol
      const { clientId, clientProtocolId, action } = await autoCreateOrLinkClient(
        database,
        input.enrollmentId,
        enrollment.email,
        enrollment.clientName
      );
      
      // Also update shipping info on the client record if available
      if (clientId > 0) {
        await database.execute(sql`
          UPDATE clients
          SET phone = COALESCE(NULLIF(phone, ''), ${enrollment.phone}),
              shippingName = COALESCE(NULLIF(shippingName, ''), ${enrollment.clientName}),
              shippingStreet = COALESCE(NULLIF(shippingStreet, ''), ${enrollment.shippingStreet}),
              shippingCity = COALESCE(NULLIF(shippingCity, ''), ${enrollment.shippingCity}),
              shippingState = COALESCE(NULLIF(shippingState, ''), ${enrollment.shippingState}),
              shippingZip = COALESCE(NULLIF(shippingZip, ''), ${enrollment.shippingZip}),
              updatedAt = NOW()
          WHERE id = ${clientId}
        `);
      }
      
      return {
        success: true,
        clientId,
        clientProtocolId,
        action,
        message: action === 'created' ? 'New client record and protocol created' : action === 'linked' ? 'Linked to existing client record and protocol' : 'Already linked',
      };
    }),

  // Backfill client records for existing enrollments that have completed profiles
  syncEnrollmentClients: adminProcedure
    .mutation(async ({ ctx }) => {
      const database = await db();
      
      // Find enrollments with completed profiles but no client record
      const result = await database.execute(sql`
        SELECT id, clientName, email, phone, shippingStreet, shippingCity, shippingState, shippingZip, clientId
        FROM transformation_enrollments
        WHERE profileCompleted = 1
          AND (clientId IS NULL OR clientId = 0)
          AND email IS NOT NULL AND email != ''
        ORDER BY createdAt DESC
      `);
      const enrollments = (result[0] as unknown) as any[];
      
      if (!enrollments || enrollments.length === 0) {
        return { success: true, created: 0, linked: 0, message: 'All enrollments already have client records' };
      }
      
      let created = 0;
      let linked = 0;
      let errors = 0;
      
      for (const enrollment of enrollments) {
        try {
          // Check if client with this email already exists
          const existingResult = await database.execute(sql`
            SELECT id FROM clients WHERE email = ${enrollment.email} AND deletedAt IS NULL LIMIT 1
          `);
          const existing = (existingResult[0] as unknown) as any[];
          
          let clientId: number;
          if (existing.length > 0) {
            clientId = existing[0].id;
            // Update existing client with latest info
            await database.execute(sql`
              UPDATE clients
              SET name = COALESCE(NULLIF(name, ''), ${enrollment.clientName}),
                  phone = COALESCE(NULLIF(phone, ''), ${enrollment.phone}),
                  shippingName = COALESCE(NULLIF(shippingName, ''), ${enrollment.clientName}),
                  shippingStreet = COALESCE(NULLIF(shippingStreet, ''), ${enrollment.shippingStreet}),
                  shippingCity = COALESCE(NULLIF(shippingCity, ''), ${enrollment.shippingCity}),
                  shippingState = COALESCE(NULLIF(shippingState, ''), ${enrollment.shippingState}),
                  shippingZip = COALESCE(NULLIF(shippingZip, ''), ${enrollment.shippingZip}),
                  updatedAt = NOW()
              WHERE id = ${clientId}
            `);
            linked++;
          } else {
            // Create new client record
            const insertResult = await database.execute(sql`
              INSERT INTO clients (name, email, phone, shippingName, shippingStreet, shippingCity, shippingState, shippingZip, shippingPhone, shippingCountry, referralSource, createdAt, updatedAt)
              VALUES (${enrollment.clientName}, ${enrollment.email}, ${enrollment.phone}, ${enrollment.clientName}, ${enrollment.shippingStreet}, ${enrollment.shippingCity}, ${enrollment.shippingState}, ${enrollment.shippingZip}, ${enrollment.phone}, 'USA', 'coaching_onboarding', NOW(), NOW())
            `);
            clientId = (insertResult[0] as any).insertId;
            created++;
          }
          
          // Link enrollment to client
          await database.execute(sql`
            UPDATE transformation_enrollments SET clientId = ${clientId}, updatedAt = NOW() WHERE id = ${enrollment.id}
          `);
        } catch (err) {
          console.error(`[syncEnrollmentClients] Failed for enrollment ${enrollment.id}:`, err);
          errors++;
        }
      }
      
      return {
        success: true,
        created,
        linked,
        errors,
        message: `Synced ${created + linked} enrollment(s) to client records (${created} new, ${linked} linked to existing)${errors > 0 ? `, ${errors} errors` : ''}`,
      };
    }),

  // ============================================
  // ENROLLMENT DASHBOARD STATS
  // ============================================
  
  // Get enrollment profile/intake completion stats for dashboard widget
  getEnrollmentCompletionStats: adminProcedure
    .query(async () => {
      const database = await db();
      
      const result = await database.execute(sql`
        SELECT 
          COUNT(*) as totalEnrollments,
          SUM(CASE WHEN profileCompleted = 1 THEN 1 ELSE 0 END) as profilesCompleted,
          SUM(CASE WHEN profileCompleted = 0 OR profileCompleted IS NULL THEN 1 ELSE 0 END) as profilesIncomplete,
          SUM(CASE WHEN coachingFeePaid = TRUE AND intakeFormCompleted = FALSE THEN 1 ELSE 0 END) as intakePending,
          SUM(CASE WHEN intakeFormCompleted = TRUE THEN 1 ELSE 0 END) as intakeCompleted,
          SUM(CASE WHEN discoverySessionScheduledAt IS NOT NULL THEN 1 ELSE 0 END) as consultationsScheduled,
          SUM(CASE WHEN status = 'enrolled' THEN 1 ELSE 0 END) as statusEnrolled,
          SUM(CASE WHEN status = 'video_complete' THEN 1 ELSE 0 END) as statusVideoComplete,
          SUM(CASE WHEN status = 'coaching_paid' THEN 1 ELSE 0 END) as statusCoachingPaid,
          SUM(CASE WHEN status = 'intake_complete' THEN 1 ELSE 0 END) as statusIntakeComplete,
          SUM(CASE WHEN status = 'discovery_scheduled' THEN 1 ELSE 0 END) as statusDiscoveryScheduled,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as statusActive,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as statusCompleted
        FROM transformation_enrollments
      `);
      
      const stats = ((result[0] as unknown) as any[])[0] || {};
      
      // Get enrollments past 10-day start deadline
      const overdueResult = await database.execute(sql`
        SELECT e.id, COALESCE(u.name, e.clientName, 'Unknown') as clientName,
               COALESCE(u.email, e.email) as email, e.tier, e.status, e.enrolledAt
        FROM transformation_enrollments e
        LEFT JOIN users u ON e.userId = u.id
        WHERE e.status NOT IN ('completed', 'renewed', 'active', 'launched')
          AND e.enrolledAt IS NOT NULL
          AND e.enrolledAt < DATE_SUB(NOW(), INTERVAL 10 DAY)
        ORDER BY e.enrolledAt ASC
        LIMIT 20
      `);
      const overdueEnrollments = ((overdueResult[0] as unknown) as any[]) || [];

      // Get enrollments needing intake form reminders (paid but no intake form)
      const pendingIntakeResult = await database.execute(sql`
        SELECT e.id, COALESCE(u.name, e.clientName, 'Unknown') as clientName,
               COALESCE(u.email, e.email) as email, e.tier, e.status,
               e.coachingFeePaidAt, e.intakeReminder24hSentAt, e.intakeReminder72hSentAt,
               e.profileCompleted
        FROM transformation_enrollments e
        LEFT JOIN users u ON e.userId = u.id
        WHERE e.coachingFeePaid = TRUE
          AND e.intakeFormCompleted = FALSE
          AND (COALESCE(u.email, e.email)) IS NOT NULL
        ORDER BY e.coachingFeePaidAt DESC
        LIMIT 20
      `);
      
      const pendingIntake = ((pendingIntakeResult[0] as unknown) as any[]) || [];
      
      return {
        ...stats,
        totalEnrollments: Number(stats.totalEnrollments || 0),
        profilesCompleted: Number(stats.profilesCompleted || 0),
        profilesIncomplete: Number(stats.profilesIncomplete || 0),
        intakePending: Number(stats.intakePending || 0),
        intakeCompleted: Number(stats.intakeCompleted || 0),
        consultationsScheduled: Number(stats.consultationsScheduled || 0),
        statusEnrolled: Number(stats.statusEnrolled || 0),
        statusVideoComplete: Number(stats.statusVideoComplete || 0),
        statusCoachingPaid: Number(stats.statusCoachingPaid || 0),
        statusIntakeComplete: Number(stats.statusIntakeComplete || 0),
        statusDiscoveryScheduled: Number(stats.statusDiscoveryScheduled || 0),
        statusActive: Number(stats.statusActive || 0),
        statusCompleted: Number(stats.statusCompleted || 0),
        pendingIntake,
        overdueEnrollments,
        overdueCount: overdueEnrollments.length,
      };
    }),

  // ============================================
  // COACHING SESSION NOTES
  // ============================================

  // Get session notes for an enrollment
  getSessionNotes: adminProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');
      
      const result = await database.execute(sql`
        SELECT * FROM coaching_session_notes
        WHERE enrollment_id = ${input.enrollmentId}
        ORDER BY is_pinned DESC, session_date DESC
      `);
      
      return ((result[0] as unknown) as any[]) || [];
    }),

  // Get session notes for a user (across all enrollments) - for client profile view
  getSessionNotesByUserId: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');
      
      const result = await database.execute(sql`
        SELECT n.*, e.tier, e.status as enrollmentStatus,
               COALESCE(e.clientName, u.name) as clientName
        FROM coaching_session_notes n
        JOIN transformation_enrollments e ON n.enrollment_id = e.id
        LEFT JOIN users u ON n.user_id = u.id
        WHERE n.user_id = ${input.userId}
        ORDER BY n.is_pinned DESC, n.session_date DESC
      `);
      
      return ((result[0] as unknown) as any[]) || [];
    }),

  // Create a session note
  createSessionNote: adminProcedure
    .input(z.object({
      enrollmentId: z.number(),
      sessionDate: z.string(),
      sessionType: z.enum(['discovery', 'check_in', 'training', 'reconstitution', 'ad_hoc', 'follow_up']),
      content: z.string().min(1, 'Note content is required'),
      isPinned: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');
      
      // Get enrollment to find userId
      const enrollmentResult = await database.execute(sql`
        SELECT userId FROM transformation_enrollments WHERE id = ${input.enrollmentId}
      `);
      const enrollment = ((enrollmentResult[0] as unknown) as any[])[0];
      if (!enrollment) throw new Error('Enrollment not found');
      
      await database.execute(sql`
        INSERT INTO coaching_session_notes (enrollment_id, user_id, session_date, session_type, content, coach_id, coach_name, is_pinned)
        VALUES (${input.enrollmentId}, ${enrollment.userId || null}, ${input.sessionDate}, ${input.sessionType}, ${input.content}, ${ctx.user?.id || null}, ${ctx.user?.name || ctx.user?.email || 'Admin'}, ${input.isPinned ? 1 : 0})
      `);
      
      // Log activity
      await logEnrollmentActivity(database, input.enrollmentId, 'session_note_added', {
        sessionType: input.sessionType,
        sessionDate: input.sessionDate,
        coachName: ctx.user?.name || ctx.user?.email || 'Admin',
      }, ctx.user?.name || ctx.user?.email || 'Admin', ctx.user?.id);
      
      return { success: true, message: 'Session note added successfully' };
    }),

  // Update a session note
  updateSessionNote: adminProcedure
    .input(z.object({
      noteId: z.number(),
      content: z.string().min(1).optional(),
      sessionDate: z.string().optional(),
      sessionType: z.enum(['discovery', 'check_in', 'training', 'reconstitution', 'ad_hoc', 'follow_up']).optional(),
      isPinned: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');
      
      const setParts: ReturnType<typeof sql>[] = [];

      if (input.content !== undefined) setParts.push(sql`content = ${input.content}`);
      if (input.sessionDate !== undefined) setParts.push(sql`session_date = ${input.sessionDate}`);
      if (input.sessionType !== undefined) setParts.push(sql`session_type = ${input.sessionType}`);
      if (input.isPinned !== undefined) setParts.push(sql`is_pinned = ${input.isPinned ? 1 : 0}`);

      if (setParts.length === 0) throw new Error('No fields to update');

      setParts.push(sql`updated_at = NOW()`);

      await database.execute(
        sql`UPDATE coaching_session_notes SET ${sql.join(setParts, sql`, `)} WHERE id = ${input.noteId}`
      );
      
      return { success: true, message: 'Session note updated' };
    }),

  // Delete a session note
  deleteSessionNote: adminProcedure
    .input(z.object({ noteId: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');
      
      await database.execute(sql`
        DELETE FROM coaching_session_notes WHERE id = ${input.noteId}
      `);
      
      return { success: true, message: 'Session note deleted' };
    }),

  // Get all session notes for a client by email (for client profile view)
  getClientSessionNotes: adminProcedure
    .input(z.object({ clientEmail: z.string() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');
      
      const result = await database.execute(sql`
        SELECT n.*, e.tier, e.status as enrollment_status
        FROM coaching_session_notes n
        JOIN transformation_enrollments e ON n.enrollment_id = e.id
        WHERE e.email = ${input.clientEmail}
           OR e.userId IN (SELECT id FROM users WHERE email = ${input.clientEmail})
        ORDER BY n.is_pinned DESC, n.session_date DESC
      `);
      
      return ((result[0] as unknown) as any[]) || [];
    }),

  // ===== ABANDONED CHECKOUT RECOVERY =====

  // Track when a user starts the checkout flow
  trackCheckoutStart: publicProcedure
    .input(z.object({
      planKey: z.string(),
      planName: z.string(),
      planPrice: z.number(),
      email: z.string().email().optional(),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      const userId = ctx.user?.id || null;
      const email = input.email || ctx.user?.email || null;
      const clientName = ctx.user?.name || null;
      const sessionId = input.sessionId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      if (!email && !userId) {
        return { success: false, message: 'No user or email to track' };
      }

      try {
        const existingResult = await database.execute(sql`
          SELECT id FROM abandoned_checkouts
          WHERE planKey = ${input.planKey}
            AND completedAt IS NULL
            AND (
              (userId IS NOT NULL AND userId = ${userId})
              OR (email IS NOT NULL AND email = ${email})
            )
            AND startedAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)
          ORDER BY startedAt DESC
          LIMIT 1
        `);
        const existingRows = (existingResult[0] as unknown) as any[];

        if (existingRows.length > 0) {
          await database.execute(sql`
            UPDATE abandoned_checkouts SET updatedAt = NOW() WHERE id = ${existingRows[0].id}
          `);
          return { success: true, checkoutId: existingRows[0].id, existing: true };
        }

        const result = await database.execute(sql`
          INSERT INTO abandoned_checkouts (userId, email, clientName, planKey, planName, planPrice, sessionId)
          VALUES (${userId}, ${email}, ${clientName}, ${input.planKey}, ${input.planName}, ${String(input.planPrice)}, ${sessionId})
        `);
        const insertId = (result[0] as any).insertId;
        console.log(`[AbandonedCheckout] Tracked checkout start: ${email || userId} for ${input.planKey} (ID: ${insertId})`);
        return { success: true, checkoutId: insertId };
      } catch (error) {
        console.error('[AbandonedCheckout] Failed to track checkout start:', error);
        return { success: false, message: 'Failed to track checkout' };
      }
    }),

  // Mark a checkout as completed (called after successful enrollment)
  markCheckoutCompleted: publicProcedure
    .input(z.object({
      planKey: z.string(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await db();
      const userId = ctx.user?.id || null;
      const email = input.email || ctx.user?.email || null;

      try {
        await database.execute(sql`
          UPDATE abandoned_checkouts
          SET completedAt = NOW(),
              recoveredAt = CASE WHEN recoveryEmailSentAt IS NOT NULL THEN NOW() ELSE NULL END
          WHERE planKey = ${input.planKey}
            AND completedAt IS NULL
            AND (
              (userId IS NOT NULL AND userId = ${userId})
              OR (email IS NOT NULL AND email = ${email})
            )
        `);
        console.log(`[AbandonedCheckout] Marked checkout completed: ${email || userId} for ${input.planKey}`);
        return { success: true };
      } catch (error) {
        console.error('[AbandonedCheckout] Failed to mark checkout completed:', error);
        return { success: false };
      }
    }),

  // Admin: Get abandoned checkout stats
  getAbandonedCheckoutStats: adminProcedure
    .query(async () => {
      const database = await db();

      const statsResult = await database.execute(sql`
        SELECT
          COUNT(*) as totalStarted,
          SUM(CASE WHEN completedAt IS NOT NULL THEN 1 ELSE 0 END) as totalCompleted,
          SUM(CASE WHEN completedAt IS NULL AND startedAt < DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as totalAbandoned,
          SUM(CASE WHEN recoveryEmailSentAt IS NOT NULL THEN 1 ELSE 0 END) as recoveryEmailsSent,
          SUM(CASE WHEN recoveryEmailOpenedAt IS NOT NULL THEN 1 ELSE 0 END) as recoveryEmailsOpened,
          SUM(CASE WHEN recoveredAt IS NOT NULL THEN 1 ELSE 0 END) as totalRecovered
        FROM abandoned_checkouts
      `);
      const stats = ((statsResult[0] as unknown) as any[])[0];

      const recentResult = await database.execute(sql`
        SELECT id, email, clientName, planKey, planName, planPrice, startedAt,
               recoveryEmailSentAt, recoveryEmailOpenedAt, recoveredAt
        FROM abandoned_checkouts
        WHERE completedAt IS NULL
          AND startedAt < DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY startedAt DESC
        LIMIT 50
      `);

      const planBreakdownResult = await database.execute(sql`
        SELECT planKey, planName,
          COUNT(*) as total,
          SUM(CASE WHEN completedAt IS NOT NULL THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN completedAt IS NULL AND startedAt < DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as abandoned
        FROM abandoned_checkouts
        GROUP BY planKey, planName
        ORDER BY total DESC
      `);

      return {
        stats: {
          totalStarted: Number(stats.totalStarted) || 0,
          totalCompleted: Number(stats.totalCompleted) || 0,
          totalAbandoned: Number(stats.totalAbandoned) || 0,
          recoveryEmailsSent: Number(stats.recoveryEmailsSent) || 0,
          recoveryEmailsOpened: Number(stats.recoveryEmailsOpened) || 0,
          totalRecovered: Number(stats.totalRecovered) || 0,
          conversionRate: stats.totalStarted > 0 ? Math.round((Number(stats.totalCompleted) / Number(stats.totalStarted)) * 100) : 0,
          recoveryRate: stats.recoveryEmailsSent > 0 ? Math.round((Number(stats.totalRecovered) / Number(stats.recoveryEmailsSent)) * 100) : 0,
        },
        recentAbandoned: ((recentResult[0] as unknown) as any[]) || [],
        planBreakdown: ((planBreakdownResult[0] as unknown) as any[]) || [],
      };
    }),

  // Admin: Resend enrollment link with fresh auth token
  resendEnrollmentLink: adminProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db();
      const { enrollmentId } = input;

      // Get enrollment details
      const result = await database.execute(sql`
        SELECT id, email, fullName, status, authToken, authTokenExpiresAt
        FROM transformation_enrollments WHERE id = ${enrollmentId}
      `);
      const rows = (result[0] as unknown) as any[];
      if (!rows.length) throw new Error('Enrollment not found');
      const enrollment = rows[0];
      if (!enrollment.email) throw new Error('Enrollment has no email address');

      // Generate a fresh auth token (valid for 30 days)
      const crypto = await import('crypto');
      const authToken = crypto.randomBytes(32).toString('hex');
      const authTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Update enrollment with new token
      await database.execute(sql`
        UPDATE transformation_enrollments
        SET authToken = ${authToken},
            authTokenExpiresAt = ${authTokenExpiresAt.toISOString().slice(0, 19).replace('T', ' ')},
            updatedAt = NOW()
        WHERE id = ${enrollmentId}
      `);

      // Build the enrollment link
      const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
      const enrollmentLink = `${baseUrl}/transformation`;

      // Send email with the new link
      await sendEmail({
        to: enrollment.email,
        subject: 'Your Omega Longevity Enrollment Link',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">Your Enrollment Link</h2>
            <p>Hi ${enrollment.fullName || 'there'},</p>
            <p>Here is your updated enrollment link for the Omega Longevity 90-Day Transformation program. This link is valid for 30 days.</p>
            <p style="margin: 24px 0;">
              <a href="${enrollmentLink}" style="background-color: #e67e22; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Access Your Enrollment</a>
            </p>
            <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 12px; word-break: break-all;">${enrollmentLink}</p>
            <p style="margin-top: 24px;">If you have any questions, reply to this email or contact your coach.</p>
            <p>— The Omega Longevity Team</p>
          </div>
        `,
      });

      // Log activity
      await logEnrollmentActivity(database, enrollmentId, 'resend_enrollment_link', {
        email: enrollment.email,
        tokenRefreshed: true,
        expiresAt: authTokenExpiresAt.toISOString(),
      }, 'admin');

      return {
        success: true,
        message: `Enrollment link sent to ${enrollment.email} (valid for 30 days)`,
      };
    }),
});
