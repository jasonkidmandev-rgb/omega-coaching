import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

// All supported transformation tiers - single source of truth
const ALL_TIERS = ["elite", "flagship", "essentials", "advanced", "recovery", "immunity", "longevity", "mitochondria", "functional_health_elite"] as const;
const tierEnum = z.enum(ALL_TIERS);

// Helper to get db with null check
async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

export const promoCodeRouter = router({
  // Get all promo codes (admin)
  getAll: adminProcedure.query(async () => {
    const database = await db();
    const codes = await database.execute(sql`
      SELECT * FROM promo_codes 
      ORDER BY createdAt DESC
    `);
    return (codes[0] as unknown as any[]) || [];
  }),

  // Create promo code (admin)
  create: adminProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      discountType: z.enum(["percent", "fixed"]),
      discountValue: z.number().positive(),
      maxUses: z.number().optional(),
      oneTimePerUser: z.boolean().default(true),
      applicableTiers: z.array(tierEnum).optional(),
      startsAt: z.string().optional(),
      expiresAt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { code, name, description, discountType, discountValue, maxUses, oneTimePerUser, applicableTiers, startsAt, expiresAt } = input;
      const database = await db();
      
      // Check if code already exists
      const existing = await database.execute(sql`
        SELECT id FROM promo_codes WHERE LOWER(code) = LOWER(${code})
      `);
      const existingRows = (existing[0] as unknown) as any[];
      if (existingRows && existingRows.length > 0) {
        throw new Error("A promo code with this code already exists");
      }
      
      await database.execute(sql`
        INSERT INTO promo_codes (code, name, description, discountType, discountValue, maxUses, oneTimePerUser, applicableTiers, startsAt, expiresAt, createdBy)
        VALUES (
          ${code}, 
          ${name}, 
          ${description || null}, 
          ${discountType}, 
          ${discountValue}, 
          ${maxUses || null}, 
          ${oneTimePerUser}, 
          ${applicableTiers ? JSON.stringify(applicableTiers) : null}, 
          ${startsAt || null}, 
          ${expiresAt || null}, 
          ${ctx.user?.id || null}
        )
      `);
      
      return { success: true };
    }),

  // Update promo code (admin)
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().min(1).optional(),
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      discountType: z.enum(["percent", "fixed"]).optional(),
      discountValue: z.number().positive().optional(),
      maxUses: z.number().nullable().optional(),
      oneTimePerUser: z.boolean().optional(),
      applicableTiers: z.array(tierEnum).nullable().optional(),
      startsAt: z.string().nullable().optional(),
      expiresAt: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, code, name, description, discountType, discountValue, maxUses, oneTimePerUser, applicableTiers, startsAt, expiresAt, isActive } = input;
      const database = await db();
      
      // Build update query dynamically
      if (code !== undefined) {
        await database.execute(sql`UPDATE promo_codes SET code = ${code} WHERE id = ${id}`);
      }
      if (name !== undefined) {
        await database.execute(sql`UPDATE promo_codes SET name = ${name} WHERE id = ${id}`);
      }
      if (description !== undefined) {
        await database.execute(sql`UPDATE promo_codes SET description = ${description} WHERE id = ${id}`);
      }
      if (discountType !== undefined) {
        await database.execute(sql`UPDATE promo_codes SET discountType = ${discountType} WHERE id = ${id}`);
      }
      if (discountValue !== undefined) {
        await database.execute(sql`UPDATE promo_codes SET discountValue = ${discountValue} WHERE id = ${id}`);
      }
      if (maxUses !== undefined) {
        await database.execute(sql`UPDATE promo_codes SET maxUses = ${maxUses} WHERE id = ${id}`);
      }
      if (oneTimePerUser !== undefined) {
        await database.execute(sql`UPDATE promo_codes SET oneTimePerUser = ${oneTimePerUser} WHERE id = ${id}`);
      }
      if (applicableTiers !== undefined) {
        await database.execute(sql`UPDATE promo_codes SET applicableTiers = ${applicableTiers ? JSON.stringify(applicableTiers) : null} WHERE id = ${id}`);
      }
      if (startsAt !== undefined) {
        await database.execute(sql`UPDATE promo_codes SET startsAt = ${startsAt} WHERE id = ${id}`);
      }
      if (expiresAt !== undefined) {
        await database.execute(sql`UPDATE promo_codes SET expiresAt = ${expiresAt} WHERE id = ${id}`);
      }
      if (isActive !== undefined) {
        await database.execute(sql`UPDATE promo_codes SET isActive = ${isActive} WHERE id = ${id}`);
      }
      
      return { success: true };
    }),

  // Delete promo code (admin)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db();
      await database.execute(sql`DELETE FROM promo_codes WHERE id = ${input.id}`);
      return { success: true };
    }),

  // Get usage history (admin)
  getUsageHistory: adminProcedure
    .input(z.object({ promoCodeId: z.number().optional() }))
    .query(async ({ input }) => {
      const database = await db();
      
      if (input.promoCodeId) {
        const usage = await database.execute(sql`
          SELECT u.*, p.code, p.name as codeName
          FROM promo_code_usage u
          JOIN promo_codes p ON u.promoCodeId = p.id
          WHERE u.promoCodeId = ${input.promoCodeId}
          ORDER BY u.usedAt DESC
          LIMIT 100
        `);
        return (usage[0] as unknown as any[]) || [];
      }
      
      const usage = await database.execute(sql`
        SELECT u.*, p.code, p.name as codeName
        FROM promo_code_usage u
        JOIN promo_codes p ON u.promoCodeId = p.id
        ORDER BY u.usedAt DESC
        LIMIT 100
      `);
      return (usage[0] as unknown as any[]) || [];
    }),

  // Validate promo code (public - for checkout)
  validate: publicProcedure
    .input(z.object({
      code: z.string().min(1),
      tier: tierEnum,
      userId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { code, tier, userId } = input;
      const database = await db();
      
      // First, check if the code exists at all (for debugging)
      const codeExists = await database.execute(sql`
        SELECT id, code, isActive, startsAt, expiresAt, maxUses, usesCount, NOW() as serverNow
        FROM promo_codes 
        WHERE LOWER(code) = LOWER(${code})
        LIMIT 1
      `);
      const existingRows = (codeExists[0] as unknown) as any[];
      if (existingRows && existingRows.length > 0) {
        const debugData = existingRows[0];
        console.log('[PromoCode.validate] Code found:', {
          code: debugData.code,
          isActive: debugData.isActive,
          startsAt: debugData.startsAt,
          expiresAt: debugData.expiresAt,
          maxUses: debugData.maxUses,
          usesCount: debugData.usesCount,
          serverNow: debugData.serverNow,
        });
      } else {
        console.log('[PromoCode.validate] Code not found in database:', code);
      }
      
      // Case-insensitive code lookup with all conditions
      // Note: expiresAt is treated as "end of day" - codes are valid through the entire expiration date
      const promoCode = await database.execute(sql`
        SELECT * FROM promo_codes 
        WHERE LOWER(code) = LOWER(${code}) 
        AND isActive = TRUE 
        AND (startsAt IS NULL OR startsAt <= NOW())
        AND (expiresAt IS NULL OR DATE(expiresAt) >= DATE(NOW()))
        AND (maxUses IS NULL OR usesCount < maxUses)
        LIMIT 1
      `);
      
      const rows = (promoCode[0] as unknown) as any[];
      if (!rows || rows.length === 0) {
        // Log why validation failed
        if (existingRows && existingRows.length > 0) {
          const d = existingRows[0];
          const reasons: string[] = [];
          if (!d.isActive) reasons.push('isActive=false');
          if (d.startsAt && new Date(d.startsAt) > new Date(d.serverNow)) reasons.push(`startsAt (${d.startsAt}) > NOW (${d.serverNow})`);
          if (d.expiresAt) {
            const expiresDate = new Date(d.expiresAt).toISOString().split('T')[0];
            const nowDate = new Date(d.serverNow).toISOString().split('T')[0];
            if (expiresDate < nowDate) reasons.push(`expiresAt date (${expiresDate}) < NOW date (${nowDate})`);
          }
          if (d.maxUses !== null && d.usesCount >= d.maxUses) reasons.push(`usesCount (${d.usesCount}) >= maxUses (${d.maxUses})`);
          console.log('[PromoCode.validate] Validation failed because:', reasons.join(', '));
        }
        return { valid: false, error: "Invalid or expired promo code" };
      }
      
      const codeData = rows[0];
      
      // Check if tier is applicable
      if (codeData.applicableTiers) {
        const applicableTiers = JSON.parse(codeData.applicableTiers);
        if (!applicableTiers.includes(tier)) {
          return { valid: false, error: "This promo code is not valid for the selected tier" };
        }
      }
      
      // Check one-time per user
      if (codeData.oneTimePerUser && userId) {
        const existingUsage = await database.execute(sql`
          SELECT id FROM promo_code_usage 
          WHERE promoCodeId = ${codeData.id} AND userId = ${userId}
          LIMIT 1
        `);
        const usageRows = (existingUsage[0] as unknown) as any[];
        if (usageRows && usageRows.length > 0) {
          return { valid: false, error: "You have already used this promo code" };
        }
      }
      
      // Calculate discount
      const tierPrices: Record<string, number> = {
        elite: 15000,
        functional_health_elite: 8500,
        advanced: 4500,
        flagship: 3000,
        recovery: 3000,
        immunity: 3000,
        longevity: 3000,
        mitochondria: 3000,
        essentials: 1000,
      };
      
      const originalAmount = tierPrices[tier];
      let discountAmount = 0;
      
      if (codeData.discountType === "percent") {
        discountAmount = (originalAmount * parseFloat(codeData.discountValue)) / 100;
      } else {
        discountAmount = parseFloat(codeData.discountValue);
      }
      
      // Cap discount at original amount
      discountAmount = Math.min(discountAmount, originalAmount);
      const finalAmount = originalAmount - discountAmount;
      
      return {
        valid: true,
        promoCodeId: codeData.id,
        code: codeData.code,
        name: codeData.name,
        discountType: codeData.discountType,
        discountValue: parseFloat(codeData.discountValue),
        originalAmount,
        discountAmount,
        finalAmount,
      };
    }),

  // Get analytics data for all promo codes (admin)
  getAnalytics: adminProcedure.query(async () => {
    const database = await db();
    
    // Get all promo codes with their usage stats
    const codes = await database.execute(sql`
      SELECT 
        p.*,
        COALESCE(SUM(u.discountAmount), 0) as totalDiscountGiven,
        COALESCE(SUM(u.finalAmount), 0) as totalRevenue,
        COUNT(u.id) as totalRedemptions,
        COUNT(DISTINCT u.userId) as uniqueUsers,
        MIN(u.usedAt) as firstUsedAt,
        MAX(u.usedAt) as lastUsedAt
      FROM promo_codes p
      LEFT JOIN promo_code_usage u ON p.id = u.promoCodeId
      GROUP BY p.id
      ORDER BY totalRedemptions DESC, p.createdAt DESC
    `);
    
    // Get daily usage for the last 30 days
    const dailyUsage = await database.execute(sql`
      SELECT 
        DATE(usedAt) as date,
        COUNT(*) as redemptions,
        SUM(discountAmount) as discountGiven,
        SUM(finalAmount) as revenue
      FROM promo_code_usage
      WHERE usedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(usedAt)
      ORDER BY date ASC
    `);
    
    // Get tier breakdown
    const tierBreakdown = await database.execute(sql`
      SELECT 
        tier,
        COUNT(*) as count,
        SUM(discountAmount) as totalDiscount,
        SUM(finalAmount) as totalRevenue
      FROM promo_code_usage
      GROUP BY tier
    `);
    
    // Get top performing codes (by revenue)
    const topByRevenue = await database.execute(sql`
      SELECT 
        p.code,
        p.name,
        COUNT(u.id) as redemptions,
        SUM(u.finalAmount) as totalRevenue
      FROM promo_codes p
      JOIN promo_code_usage u ON p.id = u.promoCodeId
      GROUP BY p.id
      ORDER BY totalRevenue DESC
      LIMIT 10
    `);
    
    // Get overall stats
    const overallStats = await database.execute(sql`
      SELECT 
        COUNT(*) as totalRedemptions,
        COUNT(DISTINCT promoCodeId) as uniqueCodesUsed,
        COUNT(DISTINCT userId) as uniqueUsers,
        SUM(discountAmount) as totalDiscountGiven,
        SUM(finalAmount) as totalRevenue,
        AVG(discountAmount) as avgDiscount
      FROM promo_code_usage
    `);
    
    return {
      codes: (codes[0] as unknown as any[]) || [],
      dailyUsage: (dailyUsage[0] as unknown as any[]) || [],
      tierBreakdown: (tierBreakdown[0] as unknown as any[]) || [],
      topByRevenue: (topByRevenue[0] as unknown as any[]) || [],
      overallStats: ((overallStats[0] as unknown as any[]) || [])[0] || {},
    };
  }),

  // Record promo code usage
  recordUsage: publicProcedure
    .input(z.object({
      promoCodeId: z.number(),
      enrollmentId: z.number().optional(),
      userId: z.number().optional(),
      tier: tierEnum,
      originalAmount: z.number(),
      discountAmount: z.number(),
      finalAmount: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { promoCodeId, enrollmentId, userId, tier, originalAmount, discountAmount, finalAmount } = input;
      const database = await db();
      
      // Check for duplicate usage (prevent double-counting from frontend + webhook)
      if (enrollmentId) {
        const existing = await database.execute(sql`
          SELECT id FROM promo_code_usage 
          WHERE promoCodeId = ${promoCodeId} AND enrollmentId = ${enrollmentId}
          LIMIT 1
        `);
        const existingRows = (existing[0] as unknown as any[]) || [];
        if (existingRows.length > 0) {
          console.log(`[PromoCode] Usage already recorded for code ${promoCodeId}, enrollment ${enrollmentId}`);
          return { success: true, alreadyRecorded: true };
        }
      }
      
      const ipAddress = ctx.req?.headers?.["x-forwarded-for"] || ctx.req?.socket?.remoteAddress || null;
      const userAgent = ctx.req?.headers?.["user-agent"] || null;
      
      // Record usage
      await database.execute(sql`
        INSERT INTO promo_code_usage (promoCodeId, enrollmentId, userId, originalAmount, discountAmount, finalAmount, tier, ipAddress, userAgent)
        VALUES (${promoCodeId}, ${enrollmentId || null}, ${userId || null}, ${originalAmount}, ${discountAmount}, ${finalAmount}, ${tier}, ${ipAddress}, ${userAgent})
      `);
      
      // Increment usage count
      await database.execute(sql`
        UPDATE promo_codes 
        SET usesCount = usesCount + 1 
        WHERE id = ${promoCodeId}
      `);
      
      return { success: true };
    }),
});
