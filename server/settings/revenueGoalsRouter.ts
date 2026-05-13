import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { revenueGoals } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const revenueGoalsRouter = router({
  /**
   * Get all revenue goals
   */
  getAll: adminProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return { success: false, error: "Database not available", data: [] };
      
      const goals = await db
        .select()
        .from(revenueGoals)
        .orderBy(desc(revenueGoals.year), desc(revenueGoals.month));
      
      return {
        success: true,
        data: goals,
      };
    } catch (error) {
      console.error("Error fetching revenue goals:", error);
      return {
        success: false,
        error: "Failed to fetch revenue goals",
        data: [],
      };
    }
  }),

  /**
   * Get revenue goal for a specific month
   */
  getByMonth: adminProcedure
    .input(z.object({
      year: z.number().min(2020).max(2100),
      month: z.number().min(1).max(12),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { success: false, error: "Database not available", data: null };
        
        const [goal] = await db
          .select()
          .from(revenueGoals)
          .where(
            and(
              eq(revenueGoals.year, input.year),
              eq(revenueGoals.month, input.month)
            )
          )
          .limit(1);
        
        return {
          success: true,
          data: goal || null,
        };
      } catch (error) {
        console.error("Error fetching revenue goal:", error);
        return {
          success: false,
          error: "Failed to fetch revenue goal",
          data: null,
        };
      }
    }),

  /**
   * Get current month's goal with progress
   */
  getCurrentMonthProgress: adminProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return { success: false, error: "Database not available", data: null };
      
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const [goal] = await db
        .select()
        .from(revenueGoals)
        .where(
          and(
            eq(revenueGoals.year, year),
            eq(revenueGoals.month, month)
          )
        )
        .limit(1);

      return {
        success: true,
        data: {
          goal: goal || null,
          year,
          month,
        },
      };
    } catch (error) {
      console.error("Error fetching current month progress:", error);
      return {
        success: false,
        error: "Failed to fetch current month progress",
        data: null,
      };
    }
  }),

  /**
   * Create or update a revenue goal
   */
  upsert: adminProcedure
    .input(z.object({
      year: z.number().min(2020).max(2100),
      month: z.number().min(1).max(12),
      targetAmount: z.number().min(0),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) return { success: false, error: "Database not available" };
        
        // Check if goal exists
        const [existing] = await db
          .select()
          .from(revenueGoals)
          .where(
            and(
              eq(revenueGoals.year, input.year),
              eq(revenueGoals.month, input.month)
            )
          )
          .limit(1);

        if (existing) {
          // Update existing
          await db
            .update(revenueGoals)
            .set({
              targetAmount: input.targetAmount.toFixed(2),
              notes: input.notes || null,
            })
            .where(eq(revenueGoals.id, existing.id));

          return {
            success: true,
            message: "Revenue goal updated",
          };
        } else {
          // Create new
          await db.insert(revenueGoals).values({
            year: input.year,
            month: input.month,
            targetAmount: input.targetAmount.toFixed(2),
            notes: input.notes || null,
            createdBy: ctx.user?.id,
          });

          return {
            success: true,
            message: "Revenue goal created",
          };
        }
      } catch (error) {
        console.error("Error upserting revenue goal:", error);
        return {
          success: false,
          error: "Failed to save revenue goal",
        };
      }
    }),

  /**
   * Delete a revenue goal
   */
  delete: adminProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { success: false, error: "Database not available" };
        
        await db
          .delete(revenueGoals)
          .where(eq(revenueGoals.id, input.id));

        return {
          success: true,
          message: "Revenue goal deleted",
        };
      } catch (error) {
        console.error("Error deleting revenue goal:", error);
        return {
          success: false,
          error: "Failed to delete revenue goal",
        };
      }
    }),

  /**
   * Get automated goal suggestions based on historical data
   */
  getSuggestions: adminProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return { success: false, error: "Database not available", data: null };
      
      // Import db functions to get protocol data
      const dbModule = await import("../db");
      const protocols = await dbModule.getAllClientProtocols('all');
      const paidProtocols = protocols.filter((p) => p.paymentStatus === "paid");
      
      // Calculate monthly revenue for the past 12 months
      const now = new Date();
      const monthlyRevenue: { year: number; month: number; revenue: number }[] = [];
      
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const monthPayments = paidProtocols.filter((p) => {
          const paidDate = p.paymentReceivedAt ? new Date(p.paymentReceivedAt) : null;
          return paidDate && paidDate >= monthStart && paidDate <= monthEnd;
        });
        
        // Calculate revenue for this month
        let monthRev = 0;
        for (const protocol of monthPayments) {
          const items = await dbModule.getClientProtocolItems(protocol.id);
          const allItems = await dbModule.getAllProtocolItems();
          
          let total = 0;
          for (const item of items) {
            if (item.isIncluded) {
              const protocolItem = allItems.find((i: any) => i.id === item.protocolItemId);
              const price = parseFloat(item.customPrice || protocolItem?.price || '0');
              total += price * item.quantity;
            }
          }
          
          if (protocol.coachingPrice) {
            total += parseFloat(protocol.coachingPrice);
          }
          
          if (protocol.discountPercent) {
            const discount = parseFloat(protocol.discountPercent);
            total = total * (1 - discount / 100);
          }
          
          monthRev += total;
        }
        
        monthlyRevenue.push({
          year: monthStart.getFullYear(),
          month: monthStart.getMonth() + 1,
          revenue: Math.round(monthRev * 100) / 100,
        });
      }
      
      // Calculate statistics
      const revenueValues = monthlyRevenue.map(m => m.revenue);
      const nonZeroRevenue = revenueValues.filter(r => r > 0);
      
      const totalRevenue = revenueValues.reduce((sum, r) => sum + r, 0);
      const averageMonthly = nonZeroRevenue.length > 0 
        ? totalRevenue / nonZeroRevenue.length 
        : 0;
      
      // Calculate recent vs older trend (last 3 months vs previous 3 months)
      const recent3 = monthlyRevenue.slice(-3).map(m => m.revenue);
      const older3 = monthlyRevenue.slice(-6, -3).map(m => m.revenue);
      
      const recentAvg = recent3.reduce((sum, r) => sum + r, 0) / 3;
      const olderAvg = older3.reduce((sum, r) => sum + r, 0) / 3;
      
      let growthRate = 0;
      if (olderAvg > 0) {
        growthRate = ((recentAvg - olderAvg) / olderAvg) * 100;
      }
      
      // Determine trend
      let trend: 'growing' | 'stable' | 'declining' = 'stable';
      if (growthRate > 10) trend = 'growing';
      else if (growthRate < -10) trend = 'declining';
      
      // Calculate suggested goals for next 12 months
      const suggestions: {
        year: number;
        month: number;
        monthName: string;
        suggestedAmount: number;
        confidence: 'high' | 'medium' | 'low';
        reasoning: string;
      }[] = [];
      
      // Base suggestion on average with growth adjustment
      const monthlyGrowthFactor = trend === 'growing' 
        ? 1 + (growthRate / 100 / 12) 
        : trend === 'declining' 
          ? 1 + (growthRate / 100 / 12) 
          : 1;
      
      let baseAmount = averageMonthly > 0 ? averageMonthly : 5000; // Default if no data
      
      for (let i = 0; i < 12; i++) {
        let year = now.getFullYear();
        let month = now.getMonth() + 1 + i;
        if (month > 12) {
          month -= 12;
          year += 1;
        }
        
        // Apply growth factor progressively
        const suggestedAmount = Math.round(baseAmount * Math.pow(monthlyGrowthFactor, i + 1) * 100) / 100;
        
        // Determine confidence based on data availability
        let confidence: 'high' | 'medium' | 'low' = 'low';
        let reasoning = '';
        
        if (nonZeroRevenue.length >= 6) {
          confidence = 'high';
          reasoning = `Based on ${nonZeroRevenue.length} months of revenue data with ${trend} trend`;
        } else if (nonZeroRevenue.length >= 3) {
          confidence = 'medium';
          reasoning = `Based on ${nonZeroRevenue.length} months of limited data`;
        } else {
          confidence = 'low';
          reasoning = nonZeroRevenue.length > 0 
            ? `Limited data (${nonZeroRevenue.length} month(s)) - consider adjusting manually`
            : 'No historical data - using default baseline';
        }
        
        suggestions.push({
          year,
          month,
          monthName: new Date(year, month - 1).toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'long' }),
          suggestedAmount,
          confidence,
          reasoning,
        });
      }
      
      return {
        success: true,
        data: {
          historicalData: monthlyRevenue,
          statistics: {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            averageMonthly: Math.round(averageMonthly * 100) / 100,
            monthsWithData: nonZeroRevenue.length,
            growthRate: Math.round(growthRate * 10) / 10,
            trend,
          },
          suggestions,
        },
      };
    } catch (error) {
      console.error("Error generating goal suggestions:", error);
      return {
        success: false,
        error: "Failed to generate goal suggestions",
        data: null,
      };
    }
  }),

  /**
   * Get goals for the next 12 months (for planning)
   */
  getUpcoming: adminProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return { success: false, error: "Database not available", data: [] };
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const goals = await db
        .select()
        .from(revenueGoals)
        .orderBy(desc(revenueGoals.year), desc(revenueGoals.month));

      // Create a map for quick lookup
      const goalMap = new Map<string, typeof goals[0]>();
      for (const goal of goals) {
        goalMap.set(`${goal.year}-${goal.month}`, goal);
      }

      // Generate next 12 months with goals
      const upcoming = [];
      for (let i = 0; i < 12; i++) {
        let year = currentYear;
        let month = currentMonth + i;
        if (month > 12) {
          month -= 12;
          year += 1;
        }
        
        const key = `${year}-${month}`;
        const goal = goalMap.get(key);
        
        upcoming.push({
          year,
          month,
          monthName: new Date(year, month - 1).toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'long' }),
          goal: goal || null,
        });
      }

      return {
        success: true,
        data: upcoming,
      };
    } catch (error) {
      console.error("Error fetching upcoming goals:", error);
      return {
        success: false,
        error: "Failed to fetch upcoming goals",
        data: [],
      };
    }
  }),
});
