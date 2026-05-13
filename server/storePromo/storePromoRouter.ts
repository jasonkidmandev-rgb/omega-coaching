import { router, adminProcedure, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

// Helper to get db with null check
async function db() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database;
}

export const storePromoRouter = router({
  // Get all store promo codes (admin)
  getAll: adminProcedure.query(async () => {
    const database = await db();
    const codes = await database.execute(sql`
      SELECT * FROM store_promo_codes 
      ORDER BY createdAt DESC
    `);
    return (codes[0] as unknown as any[]) || [];
  }),

  // Create store promo code (admin)
  create: adminProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      discountType: z.enum(["percent", "fixed"]),
      discountValue: z.number().positive(),
      minimumOrderAmount: z.number().optional(),
      maxUses: z.number().optional(),
      oneTimePerUser: z.boolean().default(true),
      applicableCategories: z.array(z.number()).optional(),
      startsAt: z.string().optional(),
      expiresAt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { code, name, description, discountType, discountValue, minimumOrderAmount, maxUses, oneTimePerUser, applicableCategories, startsAt, expiresAt } = input;
      const database = await db();
      
      // Check if code already exists
      const existing = await database.execute(sql`
        SELECT id FROM store_promo_codes WHERE LOWER(code) = LOWER(${code})
      `);
      const existingRows = (existing[0] as unknown) as any[];
      if (existingRows && existingRows.length > 0) {
        throw new Error("A promo code with this code already exists");
      }
      
      await database.execute(sql`
        INSERT INTO store_promo_codes (code, name, description, discountType, discountValue, minimumOrderAmount, maxUses, oneTimePerUser, applicableCategories, startsAt, expiresAt, createdBy)
        VALUES (
          ${code}, 
          ${name}, 
          ${description || null}, 
          ${discountType}, 
          ${discountValue}, 
          ${minimumOrderAmount || null},
          ${maxUses || null}, 
          ${oneTimePerUser}, 
          ${applicableCategories ? JSON.stringify(applicableCategories) : null}, 
          ${startsAt || null}, 
          ${expiresAt || null}, 
          ${ctx.user?.id || null}
        )
      `);
      
      return { success: true };
    }),

  // Update store promo code (admin)
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().min(1).optional(),
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      discountType: z.enum(["percent", "fixed"]).optional(),
      discountValue: z.number().positive().optional(),
      minimumOrderAmount: z.number().nullable().optional(),
      maxUses: z.number().nullable().optional(),
      oneTimePerUser: z.boolean().optional(),
      applicableCategories: z.array(z.number()).nullable().optional(),
      startsAt: z.string().nullable().optional(),
      expiresAt: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, code, name, description, discountType, discountValue, minimumOrderAmount, maxUses, oneTimePerUser, applicableCategories, startsAt, expiresAt, isActive } = input;
      const database = await db();
      
      // Build update query dynamically
      if (code !== undefined) {
        await database.execute(sql`UPDATE store_promo_codes SET code = ${code} WHERE id = ${id}`);
      }
      if (name !== undefined) {
        await database.execute(sql`UPDATE store_promo_codes SET name = ${name} WHERE id = ${id}`);
      }
      if (description !== undefined) {
        await database.execute(sql`UPDATE store_promo_codes SET description = ${description} WHERE id = ${id}`);
      }
      if (discountType !== undefined) {
        await database.execute(sql`UPDATE store_promo_codes SET discountType = ${discountType} WHERE id = ${id}`);
      }
      if (discountValue !== undefined) {
        await database.execute(sql`UPDATE store_promo_codes SET discountValue = ${discountValue} WHERE id = ${id}`);
      }
      if (minimumOrderAmount !== undefined) {
        await database.execute(sql`UPDATE store_promo_codes SET minimumOrderAmount = ${minimumOrderAmount} WHERE id = ${id}`);
      }
      if (maxUses !== undefined) {
        await database.execute(sql`UPDATE store_promo_codes SET maxUses = ${maxUses} WHERE id = ${id}`);
      }
      if (oneTimePerUser !== undefined) {
        await database.execute(sql`UPDATE store_promo_codes SET oneTimePerUser = ${oneTimePerUser} WHERE id = ${id}`);
      }
      if (applicableCategories !== undefined) {
        await database.execute(sql`UPDATE store_promo_codes SET applicableCategories = ${applicableCategories ? JSON.stringify(applicableCategories) : null} WHERE id = ${id}`);
      }
      if (startsAt !== undefined) {
        await database.execute(sql`UPDATE store_promo_codes SET startsAt = ${startsAt} WHERE id = ${id}`);
      }
      if (expiresAt !== undefined) {
        await database.execute(sql`UPDATE store_promo_codes SET expiresAt = ${expiresAt} WHERE id = ${id}`);
      }
      if (isActive !== undefined) {
        await database.execute(sql`UPDATE store_promo_codes SET isActive = ${isActive} WHERE id = ${id}`);
      }
      
      return { success: true };
    }),

  // Delete store promo code (admin)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db();
      await database.execute(sql`DELETE FROM store_promo_codes WHERE id = ${input.id}`);
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
          FROM store_promo_code_usage u
          JOIN store_promo_codes p ON u.promoCodeId = p.id
          WHERE u.promoCodeId = ${input.promoCodeId}
          ORDER BY u.usedAt DESC
          LIMIT 100
        `);
        return (usage[0] as unknown as any[]) || [];
      }
      
      const usage = await database.execute(sql`
        SELECT u.*, p.code, p.name as codeName
        FROM store_promo_code_usage u
        JOIN store_promo_codes p ON u.promoCodeId = p.id
        ORDER BY u.usedAt DESC
        LIMIT 100
      `);
      return (usage[0] as unknown as any[]) || [];
    }),

  // Validate promo code (public - for checkout)
  validate: protectedProcedure
    .input(z.object({
      code: z.string(),
      orderAmount: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { code, orderAmount } = input;
      const database = await db();
      
      // Find the promo code
      const codeResult = await database.execute(sql`
        SELECT * FROM store_promo_codes 
        WHERE LOWER(code) = LOWER(${code}) AND isActive = true
      `);
      const codes = (codeResult[0] as unknown) as any[];
      
      if (!codes || codes.length === 0) {
        return { valid: false, error: "Invalid promo code" };
      }
      
      const promoCode = codes[0];
      
      // Check if code has started
      if (promoCode.startsAt && new Date(promoCode.startsAt) > new Date()) {
        return { valid: false, error: "This promo code is not yet active" };
      }
      
      // Check if code has expired
      if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
        return { valid: false, error: "This promo code has expired" };
      }
      
      // Check usage limits
      if (promoCode.maxUses && promoCode.usesCount >= promoCode.maxUses) {
        return { valid: false, error: "This promo code has reached its usage limit" };
      }
      
      // Check minimum order amount
      if (promoCode.minimumOrderAmount && orderAmount < parseFloat(promoCode.minimumOrderAmount)) {
        return { valid: false, error: `Minimum order amount of $${promoCode.minimumOrderAmount} required` };
      }
      
      // Check one-time per user
      if (promoCode.oneTimePerUser && ctx.user) {
        const userUsage = await database.execute(sql`
          SELECT id FROM store_promo_code_usage 
          WHERE promoCodeId = ${promoCode.id} AND userId = ${ctx.user.id}
        `);
        const userUsageRows = (userUsage[0] as unknown) as any[];
        if (userUsageRows && userUsageRows.length > 0) {
          return { valid: false, error: "You have already used this promo code" };
        }
      }
      
      // Calculate discount
      let discountAmount = 0;
      if (promoCode.discountType === "percent") {
        discountAmount = (orderAmount * parseFloat(promoCode.discountValue)) / 100;
      } else {
        discountAmount = parseFloat(promoCode.discountValue);
      }
      
      // Don't let discount exceed order amount
      discountAmount = Math.min(discountAmount, orderAmount);
      
      return {
        valid: true,
        promo: {
          id: promoCode.id,
          code: promoCode.code,
          name: promoCode.name,
          discountType: promoCode.discountType as "percent" | "fixed",
          discountValue: parseFloat(promoCode.discountValue),
        },
        discountAmount,
        finalAmount: orderAmount - discountAmount,
      };
    }),

  // Record promo code usage
  recordUsage: protectedProcedure
    .input(z.object({
      promoCodeId: z.number(),
      orderId: z.number().optional(),
      originalAmount: z.number(),
      discountAmount: z.number(),
      finalAmount: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { promoCodeId, orderId, originalAmount, discountAmount, finalAmount } = input;
      const database = await db();
      
      // Record usage
      await database.execute(sql`
        INSERT INTO store_promo_code_usage (promoCodeId, orderId, userId, originalAmount, discountAmount, finalAmount)
        VALUES (${promoCodeId}, ${orderId || null}, ${ctx.user?.id || null}, ${originalAmount}, ${discountAmount}, ${finalAmount})
      `);
      
      // Increment usage count
      await database.execute(sql`
        UPDATE store_promo_codes SET usesCount = usesCount + 1 WHERE id = ${promoCodeId}
      `);
      
      return { success: true };
    }),

  // Get analytics data for store promo codes (admin)
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
      FROM store_promo_codes p
      LEFT JOIN store_promo_code_usage u ON p.id = u.promoCodeId
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
      FROM store_promo_code_usage
      WHERE usedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(usedAt)
      ORDER BY date ASC
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
      FROM store_promo_code_usage
    `);
    
    return {
      codes: (codes[0] as unknown as any[]) || [],
      dailyUsage: (dailyUsage[0] as unknown as any[]) || [],
      overallStats: ((overallStats[0] as unknown as any[]) || [])[0] || {},
    };
  }),
});
