import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Calculate the total amount for a protocol based on its items and settings
 */
import { calculateProtocolTotal } from "../lib/protocolTotal";

/**
 * Unified payment record type used across all sources
 */
interface UnifiedPayment {
  id: string;
  clientName: string;
  clientEmail: string | null;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentType: "protocol" | "coaching_fee" | "store_order";
  paymentDate: Date | null;
  createdAt: Date | null;
  feeAmount: string | null;
  netAmount: string | null;
  sourceId: number;
  details: string;
}

/**
 * Fetch protocol payments from client_protocols
 */
async function getProtocolPayments(): Promise<UnifiedPayment[]> {
  try {
    const protocols = await db.getAllClientProtocols('all');
    
    const payments: UnifiedPayment[] = await Promise.all(
      protocols
        .filter(p => {
          // Only show protocols where payment was actually received
          if (p.paymentStatus === 'paid') return true;
          // Or protocols that were explicitly invoiced (approved + have payment method + pending)
          if (p.paymentStatus === 'pending' && p.paymentMethod && p.approvedAt) return true;
          // Skip protocols that just have a payment method set but were never approved/invoiced
          return false;
        })
        .map(async (p) => {
          const amount = await calculateProtocolTotal(p);
          
          let feeAmount: string | null = null;
          let netAmount: string | null = null;
          
          if ((p.paymentMethod as string) === 'paypal' && p.paymentStatus === 'paid') {
            const paypalOrder = await db.getPayPalOrderByProtocolId(p.id);
            if (paypalOrder) {
              feeAmount = paypalOrder.feeAmount;
              netAmount = paypalOrder.netAmount;
            }
          }
          
          return {
            id: `protocol-${p.id}`,
            clientName: p.clientName || 'Unknown',
            clientEmail: p.clientEmail || null,
            amount,
            paymentMethod: (p.paymentMethod as string) || 'unknown',
            paymentStatus: p.paymentStatus || 'pending',
            paymentType: "protocol" as const,
            paymentDate: p.paymentReceivedAt ? new Date(p.paymentReceivedAt) : null,
            createdAt: p.createdAt ? new Date(p.createdAt) : null,
            feeAmount,
            netAmount,
            sourceId: p.id,
            details: `Protocol #${p.id}`,
          };
        })
    );
    
    return payments;
  } catch (error) {
    console.error("Error fetching protocol payments:", error);
    return [];
  }
}

/**
 * Fetch transformation coaching fee payments from transformation_pending_payments and enrollments
 */
async function getCoachingFeePayments(): Promise<UnifiedPayment[]> {
  try {
    const database = await getDb();
    if (!database) return [];
    
    const payments: UnifiedPayment[] = [];
    
    // 1. Get Venmo-style pending payments from transformation_pending_payments
    const pendingResult = await database.execute(sql`
      SELECT 
        tpp.id,
        tpp.enrollmentId,
        tpp.clientName,
        tpp.clientEmail,
        tpp.tier,
        tpp.amount,
        tpp.paymentMethod,
        tpp.venmoUsername,
        tpp.promoCode,
        tpp.originalAmount,
        tpp.discountAmount,
        tpp.status,
        tpp.verifiedAt,
        tpp.createdAt
      FROM transformation_pending_payments tpp
      ORDER BY tpp.createdAt DESC
    `);
    
    const pendingRows = (pendingResult[0] as unknown as any[]) || [];
    for (const row of pendingRows) {
      const statusMap: Record<string, string> = {
        'pending': 'pending',
        'verified': 'paid',
        'rejected': 'failed',
      };
      
      payments.push({
        id: `coaching-venmo-${row.id}`,
        clientName: row.clientName || 'Unknown',
        clientEmail: row.clientEmail || null,
        amount: parseFloat(row.amount || '0'),
        paymentMethod: row.paymentMethod || 'venmo',
        paymentStatus: statusMap[row.status] || row.status,
        paymentType: "coaching_fee",
        paymentDate: row.verifiedAt ? new Date(row.verifiedAt) : null,
        createdAt: row.createdAt ? new Date(row.createdAt) : null,
        feeAmount: null,
        netAmount: null,
        sourceId: row.id,
        details: `${(row.tier || 'unknown').charAt(0).toUpperCase() + (row.tier || 'unknown').slice(1)} Coaching Fee${row.promoCode ? ` (Promo: ${row.promoCode})` : ''}`,
      });
    }
    
    // 2. Get confirmed PayPal payments from enrollments (where coaching fee is paid via PayPal)
    const confirmedResult = await database.execute(sql`
      SELECT 
        e.id as enrollmentId,
        COALESCE(e.clientName, u.name) as clientName,
        COALESCE(e.email, u.email) as clientEmail,
        e.tier,
        e.coachingFeeAmount as amount,
        e.coachingFeePaidAt,
        e.coachingFeeStripePaymentId as transactionId,
        e.createdAt
      FROM transformation_enrollments e
      LEFT JOIN users u ON e.userId = u.id
      WHERE e.coachingFeePaid = TRUE
      AND e.coachingFeeStripePaymentId IS NOT NULL
    `);
    
    const confirmedRows = (confirmedResult[0] as unknown as any[]) || [];
    
    // Get IDs of enrollments already covered by transformation_pending_payments (verified ones)
    const coveredEnrollmentIds = new Set(
      pendingRows
        .filter((r: any) => r.status === 'verified')
        .map((r: any) => r.enrollmentId)
    );
    
    for (const row of confirmedRows) {
      // Skip if this enrollment is already covered by a verified pending payment
      if (coveredEnrollmentIds.has(row.enrollmentId)) continue;
      
      payments.push({
        id: `coaching-auto-${row.enrollmentId}`,
        clientName: row.clientName || 'Unknown',
        clientEmail: row.clientEmail || null,
        amount: parseFloat(row.amount || '0'),
        paymentMethod: 'paypal',
        paymentStatus: 'paid',
        paymentType: "coaching_fee",
        paymentDate: row.coachingFeePaidAt ? new Date(row.coachingFeePaidAt) : null,
        createdAt: row.createdAt ? new Date(row.createdAt) : null,
        feeAmount: null,
        netAmount: null,
        sourceId: row.enrollmentId,
        details: `${(row.tier || 'unknown').charAt(0).toUpperCase() + (row.tier || 'unknown').slice(1)} Coaching Fee`,
      });
    }
    
    return payments;
  } catch (error) {
    console.error("Error fetching coaching fee payments:", error);
    return [];
  }
}

/**
 * Fetch store order payments
 */
async function getStoreOrderPayments(): Promise<UnifiedPayment[]> {
  try {
    const database = await getDb();
    if (!database) return [];
    
    const result = await database.execute(sql`
      SELECT 
        so.id,
        so.userId,
        so.paymentMethod,
        so.total,
        so.status,
        so.payerEmail,
        so.payerName,
        so.paidAt,
        so.createdAt,
        COALESCE(so.payerName, u.name) as clientName,
        COALESCE(so.payerEmail, u.email) as clientEmail
      FROM store_orders so
      LEFT JOIN users u ON so.userId = u.id
      ORDER BY so.createdAt DESC
    `);
    
    const rows = (result[0] as unknown as any[]) || [];
    
    return rows.map(row => ({
      id: `store-${row.id}`,
      clientName: row.clientName || 'Unknown',
      clientEmail: row.clientEmail || null,
      amount: parseFloat(row.total || '0'),
      paymentMethod: row.paymentMethod || 'unknown',
      paymentStatus: row.status === 'paid' || row.status === 'processing' || row.status === 'shipped' || row.status === 'delivered' ? 'paid' : row.status,
      paymentType: "store_order" as const,
      paymentDate: row.paidAt ? new Date(row.paidAt) : (row.status === 'paid' ? new Date(row.createdAt) : null),
      createdAt: row.createdAt ? new Date(row.createdAt) : null,
      feeAmount: null,
      netAmount: null,
      sourceId: row.id,
      details: `Store Order #${row.id}`,
    }));
  } catch (error) {
    console.error("Error fetching store order payments:", error);
    return [];
  }
}

export const paymentHistoryRouter = router({
  /**
   * Get unified payment history with filtering and search
   */
  getHistory: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        paymentMethod: z.enum(["paypal", "venmo", "cc", "other"]).optional(),
        paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
        paymentType: z.enum(["protocol", "coaching_fee", "store_order"]).optional(),
        searchQuery: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        // Fetch from all sources in parallel
        const [protocolPayments, coachingPayments, storePayments] = await Promise.all([
          getProtocolPayments(),
          getCoachingFeePayments(),
          getStoreOrderPayments(),
        ]);
        
        // Combine all payments
        let allPayments = [...protocolPayments, ...coachingPayments, ...storePayments];
        
        // Apply filters
        if (input.searchQuery && input.searchQuery.trim()) {
          const query = input.searchQuery.toLowerCase().trim();
          allPayments = allPayments.filter(
            (p) =>
              p.clientName?.toLowerCase().includes(query) ||
              p.clientEmail?.toLowerCase().includes(query) ||
              p.details?.toLowerCase().includes(query)
          );
        }
        
        if (input.startDate) {
          allPayments = allPayments.filter((p) => {
            const date = p.paymentDate || p.createdAt;
            return date && new Date(date) >= input.startDate!;
          });
        }
        
        if (input.endDate) {
          allPayments = allPayments.filter((p) => {
            const date = p.paymentDate || p.createdAt;
            return date && new Date(date) <= input.endDate!;
          });
        }
        
        if (input.paymentMethod) {
          allPayments = allPayments.filter((p) => p.paymentMethod === input.paymentMethod);
        }
        
        if (input.paymentStatus) {
          allPayments = allPayments.filter((p) => p.paymentStatus === input.paymentStatus);
        }
        
        if (input.paymentType) {
          allPayments = allPayments.filter((p) => p.paymentType === input.paymentType);
        }
        
        // Sort by most recent first
        allPayments.sort((a, b) => {
          const dateA = a.paymentDate || a.createdAt || new Date(0);
          const dateB = b.paymentDate || b.createdAt || new Date(0);
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        
        const total = allPayments.length;
        const paginated = allPayments.slice(input.offset, input.offset + input.limit);
        
        return {
          success: true,
          data: paginated,
          total,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("Error fetching unified payment history:", error);
        return {
          success: false,
          error: "Failed to fetch payment history",
          data: [],
          total: 0,
          limit: input.limit,
          offset: input.offset,
        };
      }
    }),

  /**
   * Get unified payment summary statistics with revenue data
   */
  getSummary: adminProcedure.query(async () => {
    try {
      // Fetch from all sources in parallel
      const [protocolPayments, coachingPayments, storePayments] = await Promise.all([
        getProtocolPayments(),
        getCoachingFeePayments(),
        getStoreOrderPayments(),
      ]);
      
      const allPayments = [...protocolPayments, ...coachingPayments, ...storePayments];
      const paidPayments = allPayments.filter(p => p.paymentStatus === 'paid');
      
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      let totalRevenue = 0;
      let currentMonthRevenue = 0;
      let previousMonthRevenue = 0;
      let thisWeekRevenue = 0;
      
      for (const payment of paidPayments) {
        totalRevenue += payment.amount;
        
        const paidDate = payment.paymentDate;
        if (paidDate && paidDate >= currentMonthStart) {
          currentMonthRevenue += payment.amount;
        }
        if (paidDate && paidDate >= previousMonthStart && paidDate <= previousMonthEnd) {
          previousMonthRevenue += payment.amount;
        }
        if (paidDate && paidDate >= weekStart) {
          thisWeekRevenue += payment.amount;
        }
      }
      
      const currentMonthPaid = paidPayments.filter(p => {
        const d = p.paymentDate;
        return d && d >= currentMonthStart;
      });
      
      const previousMonthPaid = paidPayments.filter(p => {
        const d = p.paymentDate;
        return d && d >= previousMonthStart && d <= previousMonthEnd;
      });
      
      const thisWeekPaid = paidPayments.filter(p => {
        const d = p.paymentDate;
        return d && d >= weekStart;
      });
      
      const averageOrderValue = paidPayments.length > 0 ? totalRevenue / paidPayments.length : 0;
      
      const summary = {
        totalProtocols: allPayments.length,
        pendingPayments: allPayments.filter(p => p.paymentStatus === 'pending').length,
        paidPayments: paidPayments.length,
        failedPayments: allPayments.filter(p => p.paymentStatus === 'failed').length,
        refundedPayments: allPayments.filter(p => p.paymentStatus === 'refunded').length,
        paypalCount: allPayments.filter(p => p.paymentMethod === 'paypal').length,
        venmoCount: allPayments.filter(p => p.paymentMethod === 'venmo').length,
        ccCount: allPayments.filter(p => p.paymentMethod === 'cc').length,
        // Payment type counts
        protocolCount: allPayments.filter(p => p.paymentType === 'protocol').length,
        coachingFeeCount: allPayments.filter(p => p.paymentType === 'coaching_fee').length,
        storeOrderCount: allPayments.filter(p => p.paymentType === 'store_order').length,
        // Time-based metrics
        currentMonthPaid: currentMonthPaid.length,
        previousMonthPaid: previousMonthPaid.length,
        thisWeekPaid: thisWeekPaid.length,
        // Revenue metrics
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        currentMonthRevenue: Math.round(currentMonthRevenue * 100) / 100,
        previousMonthRevenue: Math.round(previousMonthRevenue * 100) / 100,
        thisWeekRevenue: Math.round(thisWeekRevenue * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        // Conversion rate
        conversionRate: allPayments.length > 0
          ? Math.round((paidPayments.length / allPayments.length) * 100)
          : 0,
      };
      
      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      console.error("Error fetching payment summary:", error);
      return {
        success: false,
        error: "Failed to fetch payment summary",
        data: null,
      };
    }
  }),

  /**
   * Get pending payments that need follow-up
   */
  getPendingFollowups: adminProcedure
    .input(
      z.object({
        daysOverdue: z.number().min(1).default(3),
      })
    )
    .query(async ({ input }) => {
      try {
        const [protocolPayments, coachingPayments] = await Promise.all([
          getProtocolPayments(),
          getCoachingFeePayments(),
        ]);
        
        const allPayments = [...protocolPayments, ...coachingPayments];
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - input.daysOverdue * 24 * 60 * 60 * 1000);
        
        const pending = allPayments.filter(p => {
          const createdDate = p.createdAt;
          return (
            p.paymentStatus === 'pending' &&
            createdDate &&
            createdDate <= cutoffDate
          );
        });
        
        return {
          success: true,
          data: pending.map(p => ({
            id: p.sourceId,
            unifiedId: p.id,
            clientName: p.clientName,
            clientEmail: p.clientEmail,
            paymentMethod: p.paymentMethod,
            paymentType: p.paymentType,
            createdAt: p.createdAt,
            daysOverdue: Math.floor(
              (now.getTime() - (p.createdAt ? new Date(p.createdAt).getTime() : 0)) /
                (24 * 60 * 60 * 1000)
            ),
            amount: p.amount,
            details: p.details,
          })),
        };
      } catch (error) {
        console.error("Error fetching pending followups:", error);
        return {
          success: false,
          error: "Failed to fetch pending followups",
          data: [],
        };
      }
    }),

  /**
   * Get payment method breakdown for charts with revenue
   */
  getMethodBreakdown: adminProcedure.query(async () => {
    try {
      const [protocolPayments, coachingPayments, storePayments] = await Promise.all([
        getProtocolPayments(),
        getCoachingFeePayments(),
        getStoreOrderPayments(),
      ]);
      
      const paidPayments = [...protocolPayments, ...coachingPayments, ...storePayments]
        .filter(p => p.paymentStatus === 'paid');
      
      const methods = ['paypal', 'venmo', 'cc', 'other'] as const;
      const breakdown: Record<string, { count: number; revenue: number }> = {};
      
      for (const method of methods) {
        const methodPayments = paidPayments.filter(p => {
          if (method === 'other') {
            return !['paypal', 'venmo', 'cc'].includes(p.paymentMethod);
          }
          return p.paymentMethod === method;
        });
        
        breakdown[method] = {
          count: methodPayments.length,
          revenue: Math.round(methodPayments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100,
        };
      }
      
      return {
        success: true,
        data: breakdown,
      };
    } catch (error) {
      console.error("Error fetching method breakdown:", error);
      return {
        success: false,
        error: "Failed to fetch method breakdown",
        data: null,
      };
    }
  }),

  /**
   * Get monthly payment trends (last 6 months) with revenue
   */
  getMonthlyTrends: adminProcedure.query(async () => {
    try {
      const [protocolPayments, coachingPayments, storePayments] = await Promise.all([
        getProtocolPayments(),
        getCoachingFeePayments(),
        getStoreOrderPayments(),
      ]);
      
      const paidPayments = [...protocolPayments, ...coachingPayments, ...storePayments]
        .filter(p => p.paymentStatus === 'paid');
      
      const now = new Date();
      const trends = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const monthPayments = paidPayments.filter(p => {
          const paidDate = p.paymentDate;
          return paidDate && paidDate >= monthStart && paidDate <= monthEnd;
        });
        
        const monthRevenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);
        
        trends.push({
          month: monthStart.toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'short', year: 'numeric' }),
          count: monthPayments.length,
          revenue: Math.round(monthRevenue * 100) / 100,
        });
      }
      
      return {
        success: true,
        data: trends,
      };
    } catch (error) {
      console.error("Error fetching monthly trends:", error);
      return {
        success: false,
        error: "Failed to fetch monthly trends",
        data: [],
      };
    }
  }),
});
