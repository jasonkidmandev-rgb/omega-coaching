import { publicProcedure, router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { sql } from "drizzle-orm";
import * as db from "../db";
import { sendEmail } from "../emailService";

export const paymentAnalyticsRouter = router({
  // Get payment trends over time (daily revenue for past 30 days)
  getTrends: adminProcedure
    .input(
      z.object({
        days: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      const clientProtocols = await db.getAllClientProtocols();
      const now = new Date();
      const startDate = new Date(now.getTime() - input.days * 24 * 60 * 60 * 1000);

      // Group payments by date
      const trends: Record<string, { date: string; revenue: number; count: number }> = {};

      clientProtocols.forEach((protocol: any) => {
        if (protocol.paymentStatus === "paid" && protocol.paymentReceivedAt) {
          const date = new Date(protocol.paymentReceivedAt);
          if (date >= startDate) {
            const dateStr = date.toISOString().split("T")[0];
            if (!trends[dateStr]) {
              trends[dateStr] = { date: dateStr, revenue: 0, count: 0 };
            }
            const amount = parseFloat(protocol.totalPrice || "0");
            trends[dateStr].revenue += amount;
            trends[dateStr].count += 1;
          }
        }
      });

      return Object.values(trends).sort((a, b) => a.date.localeCompare(b.date));
    }),

  // Get payment method breakdown
  getMethodBreakdown: adminProcedure.query(async () => {
    const clientProtocols = await db.getAllClientProtocols();

    const breakdown = {
      paypal: { count: 0, revenue: 0, percentage: 0 },
      venmo: { count: 0, revenue: 0, percentage: 0 },
      other: { count: 0, revenue: 0, percentage: 0 },
    };

    let totalRevenue = 0;
    let totalCount = 0;

    clientProtocols.forEach((protocol: any) => {
      if (protocol.paymentStatus === "paid") {
        const amount = parseFloat(protocol.totalPrice || "0");
        totalRevenue += amount;
        totalCount += 1;

        const method = protocol.paymentMethod || "other";
        if (method === "paypal") {
          breakdown.paypal.count += 1;
          breakdown.paypal.revenue += amount;
        } else if (method === "venmo") {
          breakdown.venmo.count += 1;
          breakdown.venmo.revenue += amount;
        } else {
          breakdown.other.count += 1;
          breakdown.other.revenue += amount;
        }
      }
    });

    // Calculate percentages
    if (totalRevenue > 0) {
      breakdown.paypal.percentage = (breakdown.paypal.revenue / totalRevenue) * 100;
      breakdown.venmo.percentage = (breakdown.venmo.revenue / totalRevenue) * 100;
      breakdown.other.percentage = (breakdown.other.revenue / totalRevenue) * 100;
    }

    return breakdown;
  }),

  // Get revenue by protocol type
  getRevenueByProtocol: adminProcedure.query(async () => {
    const clientProtocols = await db.getAllClientProtocols();
    const templates = await db.getAllTemplates();

    const revenueByProtocol: Record<string, { name: string; revenue: number; count: number }> = {};

    clientProtocols.forEach((protocol: any) => {
      if (protocol.paymentStatus === "paid") {
        const templateId = protocol.templateId;
        const template = templates.find((t: any) => t.id === templateId);
        const protocolName = template?.name || "Unknown Protocol";

        if (!revenueByProtocol[protocolName]) {
          revenueByProtocol[protocolName] = { name: protocolName, revenue: 0, count: 0 };
        }

        const amount = parseFloat(protocol.totalPrice || "0");
        revenueByProtocol[protocolName].revenue += amount;
        revenueByProtocol[protocolName].count += 1;
      }
    });

    return Object.values(revenueByProtocol).sort((a, b) => b.revenue - a.revenue);
  }),

  // Get conversion metrics
  getConversionMetrics: adminProcedure.query(async () => {
    const clientProtocols = await db.getAllClientProtocols();

    const metrics = {
      totalProtocols: clientProtocols.length,
      paidProtocols: 0,
      pendingProtocols: 0,
      failedProtocols: 0,
      conversionRate: 0,
      averageOrderValue: 0,
      totalRevenue: 0,
    };

    let totalRevenue = 0;

    clientProtocols.forEach((protocol: any) => {
      if (protocol.paymentStatus === "paid") {
        metrics.paidProtocols += 1;
        const amount = parseFloat(protocol.totalPrice || "0");
        totalRevenue += amount;
      } else if (protocol.paymentStatus === "pending") {
        metrics.pendingProtocols += 1;
      } else if (protocol.paymentStatus === "failed") {
        metrics.failedProtocols += 1;
      }
    });

    metrics.conversionRate = metrics.totalProtocols > 0 ? (metrics.paidProtocols / metrics.totalProtocols) * 100 : 0;
    metrics.averageOrderValue = metrics.paidProtocols > 0 ? totalRevenue / metrics.paidProtocols : 0;
    metrics.totalRevenue = totalRevenue;

    return metrics;
  }),

  // Get PayPal/payment processing fee summary
  getFeeSummary: adminProcedure
    .input(
      z.object({
        days: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) return { totalGross: 0, totalFees: 0, totalNet: 0, transactionCount: 0, averageFeePercent: 0, feesByMethod: {} };
      
      // Query payment events with fee data
      const rows = input?.days
        ? await database.execute(sql`SELECT grossAmount, feeAmount, netAmount, paymentMethod, createdAt 
            FROM payment_events 
            WHERE eventType = 'payment_received' AND grossAmount IS NOT NULL
            AND createdAt >= DATE_SUB(NOW(), INTERVAL ${input.days} DAY)`)
        : await database.execute(sql`SELECT grossAmount, feeAmount, netAmount, paymentMethod, createdAt 
            FROM payment_events 
            WHERE eventType = 'payment_received' AND grossAmount IS NOT NULL`);
      
      let totalGross = 0;
      let totalFees = 0;
      let totalNet = 0;
      let transactionCount = 0;
      const feesByMethod: Record<string, { gross: number; fees: number; net: number; count: number }> = {};
      
      for (const row of (rows as any).rows || rows as any[]) {
        const gross = parseFloat(row.grossAmount || '0');
        const fee = parseFloat(row.feeAmount || '0');
        const net = parseFloat(row.netAmount || '0');
        const method = row.paymentMethod || 'unknown';
        
        if (gross > 0) {
          totalGross += gross;
          totalFees += fee;
          totalNet += net > 0 ? net : (gross - fee);
          transactionCount++;
          
          if (!feesByMethod[method]) {
            feesByMethod[method] = { gross: 0, fees: 0, net: 0, count: 0 };
          }
          feesByMethod[method].gross += gross;
          feesByMethod[method].fees += fee;
          feesByMethod[method].net += net > 0 ? net : (gross - fee);
          feesByMethod[method].count++;
        }
      }
      
      // PayPal orders fee data is already included via payment_events
      // No need for a separate query since we now create payment events for all PayPal payments
      
      const averageFeePercent = totalGross > 0 ? (totalFees / totalGross) * 100 : 0;
      
      return {
        totalGross,
        totalFees,
        totalNet,
        transactionCount,
        averageFeePercent,
        feesByMethod,
      };
    }),

  // Export monthly fee summary as CSV
  exportFeeSummary: adminProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number().min(2020).max(2100),
        format: z.enum(["csv", "json"]).default("csv"),
      })
    )
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) return { data: "", filename: "", rows: [] };

      const startDate = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
      const endMonth = input.month === 12 ? 1 : input.month + 1;
      const endYear = input.month === 12 ? input.year + 1 : input.year;
      const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

      // Get all payment events with fee data for the month
      const eventRows = await database.execute(sql`
        SELECT clientProtocolId, grossAmount, feeAmount, netAmount, 
               paymentMethod, transactionId, createdAt, notes
        FROM payment_events
        WHERE eventType = 'payment_received' 
          AND createdAt >= ${startDate} AND createdAt < ${endDate}
        ORDER BY createdAt ASC
      `);

      // Get client names for each protocol
      const rows: Array<{
        date: string;
        clientName: string;
        paymentMethod: string;
        transactionId: string;
        grossAmount: string;
        feeAmount: string;
        netAmount: string;
        notes: string;
      }> = [];

      let totalGross = 0;
      let totalFees = 0;
      let totalNet = 0;

      for (const event of ((eventRows as any).rows || eventRows) as any[]) {
        // Get client name from protocol
        let clientName = "Unknown";
        try {
          const protocol = await db.getClientProtocolById(event.clientProtocolId);
          if (protocol) clientName = protocol.clientName;
        } catch (e) {
          // ignore
        }

        const gross = parseFloat(event.grossAmount || "0");
        const fee = parseFloat(event.feeAmount || "0");
        const net = parseFloat(event.netAmount || "0") || (gross - fee);

        totalGross += gross;
        totalFees += fee;
        totalNet += net;

        rows.push({
          date: new Date(event.createdAt).toLocaleDateString("en-US", { timeZone: 'America/Denver',
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }),
          clientName,
          paymentMethod: (event.paymentMethod || "unknown").toUpperCase(),
          transactionId: event.transactionId || "",
          grossAmount: gross.toFixed(2),
          feeAmount: fee.toFixed(2),
          netAmount: net.toFixed(2),
          notes: event.notes || "",
        });
      }

      // Also check paypal_orders for any transactions not in payment_events
      const paypalRows = await database.execute(sql`
        SELECT paypal_order_id, gross_amount, fee_amount, net_amount, 
               completedAt, client_protocol_id, payer_name
        FROM paypal_orders
        WHERE status = 'COMPLETED' AND fee_amount IS NOT NULL
          AND completedAt >= ${startDate} AND completedAt < ${endDate}
          AND paypal_order_id NOT IN (
            SELECT COALESCE(transactionId, '') FROM payment_events 
            WHERE eventType = 'payment_received' AND createdAt >= ${startDate} AND createdAt < ${endDate}
          )
        ORDER BY completedAt ASC
      `);

      for (const order of ((paypalRows as any).rows || paypalRows) as any[]) {
        const gross = parseFloat(order.gross_amount || "0");
        const fee = parseFloat(order.fee_amount || "0");
        const net = parseFloat(order.net_amount || "0") || (gross - fee);

        totalGross += gross;
        totalFees += fee;
        totalNet += net;

        let clientName = order.payer_name || "Unknown";
        try {
          if (order.client_protocol_id) {
            const protocol = await db.getClientProtocolById(order.client_protocol_id);
            if (protocol) clientName = protocol.clientName;
          }
        } catch (e) {
          // ignore
        }

        rows.push({
          date: new Date(order.completedAt).toLocaleDateString("en-US", { timeZone: 'America/Denver',
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }),
          clientName,
          paymentMethod: "PAYPAL",
          transactionId: order.paypal_order_id || "",
          grossAmount: gross.toFixed(2),
          feeAmount: fee.toFixed(2),
          netAmount: net.toFixed(2),
          notes: "From PayPal orders",
        });
      }

      // Sort all rows by date
      rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const monthName = monthNames[input.month - 1];
      const filename = `PayPal_Fee_Summary_${monthName}_${input.year}`;

      // Build CSV
      const csvHeaders = "Date,Client Name,Payment Method,Transaction ID,Gross Amount,Fee Amount,Net Amount,Notes";
      const csvRows = rows.map(
        (r) =>
          `${r.date},"${r.clientName}",${r.paymentMethod},${r.transactionId},${r.grossAmount},${r.feeAmount},${r.netAmount},"${r.notes}"`
      );
      // Add totals row
      csvRows.push(
        `,,,,${totalGross.toFixed(2)},${totalFees.toFixed(2)},${totalNet.toFixed(2)},"TOTALS"`
      );
      const csvData = [csvHeaders, ...csvRows].join("\n");

      return {
        data: csvData,
        filename,
        rows,
        totals: {
          totalGross: totalGross.toFixed(2),
          totalFees: totalFees.toFixed(2),
          totalNet: totalNet.toFixed(2),
          transactionCount: rows.length,
        },
      };
    }),

  // Get year-end annual fee summary
  getAnnualSummary: adminProcedure
    .input(
      z.object({
        year: z.number().min(2020).max(2100),
      })
    )
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) return { year: input.year, months: [], totals: { gross: 0, fees: 0, net: 0, count: 0 } };

      const startDate = `${input.year}-01-01`;
      const endDate = `${input.year + 1}-01-01`;

      // Get all payment events for the year
      const eventRows = await database.execute(sql`
        SELECT grossAmount, feeAmount, netAmount, paymentMethod, createdAt
        FROM payment_events
        WHERE eventType = 'payment_received' AND grossAmount IS NOT NULL
          AND createdAt >= ${startDate} AND createdAt < ${endDate}
        ORDER BY createdAt ASC
      `);

      // Also get PayPal orders not in payment_events
      const paypalRows = await database.execute(sql`
        SELECT gross_amount, fee_amount, net_amount, completedAt
        FROM paypal_orders
        WHERE status = 'COMPLETED' AND fee_amount IS NOT NULL
          AND completedAt >= ${startDate} AND completedAt < ${endDate}
          AND paypal_order_id NOT IN (
            SELECT COALESCE(transactionId, '') FROM payment_events 
            WHERE eventType = 'payment_received' AND createdAt >= ${startDate} AND createdAt < ${endDate}
          )
        ORDER BY completedAt ASC
      `);

      // Build monthly breakdown
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const months: Array<{ month: number; name: string; gross: number; fees: number; net: number; count: number }> = 
        monthNames.map((name, i) => ({ month: i + 1, name, gross: 0, fees: 0, net: 0, count: 0 }));

      // Process payment events
      for (const event of ((eventRows as any).rows || eventRows) as any[]) {
        const gross = parseFloat(event.grossAmount || '0');
        const fee = parseFloat(event.feeAmount || '0');
        const net = parseFloat(event.netAmount || '0') || (gross - fee);
        const monthIdx = new Date(event.createdAt).getMonth();
        if (gross > 0) {
          months[monthIdx].gross += gross;
          months[monthIdx].fees += fee;
          months[monthIdx].net += net;
          months[monthIdx].count++;
        }
      }

      // Process PayPal orders
      for (const order of ((paypalRows as any).rows || paypalRows) as any[]) {
        const gross = parseFloat(order.gross_amount || '0');
        const fee = parseFloat(order.fee_amount || '0');
        const net = parseFloat(order.net_amount || '0') || (gross - fee);
        const monthIdx = new Date(order.completedAt).getMonth();
        if (gross > 0) {
          months[monthIdx].gross += gross;
          months[monthIdx].fees += fee;
          months[monthIdx].net += net;
          months[monthIdx].count++;
        }
      }

      // Calculate totals
      const totals = months.reduce(
        (acc, m) => ({
          gross: acc.gross + m.gross,
          fees: acc.fees + m.fees,
          net: acc.net + m.net,
          count: acc.count + m.count,
        }),
        { gross: 0, fees: 0, net: 0, count: 0 }
      );

      return {
        year: input.year,
        months: months.filter(m => m.count > 0 || m.month <= new Date().getMonth() + 1),
        totals,
      };
    }),

  // Export annual summary as CSV
  exportAnnualSummary: adminProcedure
    .input(
      z.object({
        year: z.number().min(2020).max(2100),
      })
    )
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) return { data: "", filename: "" };

      const startDate = `${input.year}-01-01`;
      const endDate = `${input.year + 1}-01-01`;

      // Get all payment events for the year with client info
      const eventRows = await database.execute(sql`
        SELECT pe.clientProtocolId, pe.grossAmount, pe.feeAmount, pe.netAmount, 
               pe.paymentMethod, pe.transactionId, pe.createdAt, pe.notes
        FROM payment_events pe
        WHERE pe.eventType = 'payment_received'
          AND pe.createdAt >= ${startDate} AND pe.createdAt < ${endDate}
        ORDER BY pe.createdAt ASC
      `);

      const rows: Array<{
        date: string; month: string; clientName: string; paymentMethod: string;
        transactionId: string; grossAmount: string; feeAmount: string; netAmount: string;
      }> = [];

      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];

      let totalGross = 0, totalFees = 0, totalNet = 0;

      for (const event of ((eventRows as any).rows || eventRows) as any[]) {
        const gross = parseFloat(event.grossAmount || '0');
        const fee = parseFloat(event.feeAmount || '0');
        const net = parseFloat(event.netAmount || '0') || (gross - fee);
        totalGross += gross; totalFees += fee; totalNet += net;

        let clientName = "Unknown";
        try {
          const protocol = await db.getClientProtocolById(event.clientProtocolId);
          if (protocol) clientName = protocol.clientName;
        } catch (e) { /* ignore */ }

        const d = new Date(event.createdAt);
        rows.push({
          date: d.toLocaleDateString('en-US', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }),
          month: monthNames[d.getMonth()],
          clientName,
          paymentMethod: (event.paymentMethod || 'unknown').toUpperCase(),
          transactionId: event.transactionId || '',
          grossAmount: gross.toFixed(2),
          feeAmount: fee.toFixed(2),
          netAmount: net.toFixed(2),
        });
      }

      // Also check paypal_orders
      const paypalRows = await database.execute(sql`
        SELECT paypal_order_id, gross_amount, fee_amount, net_amount, 
               completedAt, client_protocol_id, payer_name
        FROM paypal_orders
        WHERE status = 'COMPLETED' AND fee_amount IS NOT NULL
          AND completedAt >= ${startDate} AND completedAt < ${endDate}
          AND paypal_order_id NOT IN (
            SELECT COALESCE(transactionId, '') FROM payment_events 
            WHERE eventType = 'payment_received' AND createdAt >= ${startDate} AND createdAt < ${endDate}
          )
        ORDER BY completedAt ASC
      `);

      for (const order of ((paypalRows as any).rows || paypalRows) as any[]) {
        const gross = parseFloat(order.gross_amount || '0');
        const fee = parseFloat(order.fee_amount || '0');
        const net = parseFloat(order.net_amount || '0') || (gross - fee);
        totalGross += gross; totalFees += fee; totalNet += net;

        let clientName = order.payer_name || "Unknown";
        try {
          if (order.client_protocol_id) {
            const protocol = await db.getClientProtocolById(order.client_protocol_id);
            if (protocol) clientName = protocol.clientName;
          }
        } catch (e) { /* ignore */ }

        const d = new Date(order.completedAt);
        rows.push({
          date: d.toLocaleDateString('en-US', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }),
          month: monthNames[d.getMonth()],
          clientName,
          paymentMethod: 'PAYPAL',
          transactionId: order.paypal_order_id || '',
          grossAmount: gross.toFixed(2),
          feeAmount: fee.toFixed(2),
          netAmount: net.toFixed(2),
        });
      }

      rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const csvHeaders = "Date,Month,Client Name,Payment Method,Transaction ID,Gross Amount,Fee Amount,Net Amount";
      const csvRows = rows.map(
        r => `${r.date},${r.month},"${r.clientName}",${r.paymentMethod},${r.transactionId},${r.grossAmount},${r.feeAmount},${r.netAmount}`
      );
      csvRows.push(`,,,,TOTALS,${totalGross.toFixed(2)},${totalFees.toFixed(2)},${totalNet.toFixed(2)}`);

      return {
        data: [csvHeaders, ...csvRows].join('\n'),
        filename: `Annual_Fee_Summary_${input.year}`,
        totals: {
          totalGross: totalGross.toFixed(2),
          totalFees: totalFees.toFixed(2),
          totalNet: totalNet.toFixed(2),
          transactionCount: rows.length,
        },
      };
    }),

  // Get payment status summary
  getPaymentStatusSummary: adminProcedure.query(async () => {
    const clientProtocols = await db.getAllClientProtocols();

    const summary = {
      paid: clientProtocols.filter((p: any) => p.paymentStatus === "paid").length,
      pending: clientProtocols.filter((p: any) => p.paymentStatus === "pending").length,
      failed: clientProtocols.filter((p: any) => p.paymentStatus === "failed").length,
      refunded: clientProtocols.filter((p: any) => p.paymentStatus === "refunded").length,
    };

    return summary;
  }),

  // Email monthly or annual fee summary to a specified address
  emailFeeSummary: adminProcedure
    .input(
      z.object({
        recipientEmail: z.string().email(),
        month: z.number().min(1).max(12).optional(),
        year: z.number().min(2020).max(2100),
        type: z.enum(["monthly", "annual"]).default("monthly"),
      })
    )
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];

      let startDate: string;
      let endDate: string;
      let periodLabel: string;

      if (input.type === "monthly" && input.month) {
        startDate = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
        const endMonth = input.month === 12 ? 1 : input.month + 1;
        const endYear = input.month === 12 ? input.year + 1 : input.year;
        endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
        periodLabel = `${monthNames[input.month - 1]} ${input.year}`;
      } else {
        startDate = `${input.year}-01-01`;
        endDate = `${input.year + 1}-01-01`;
        periodLabel = `Year ${input.year}`;
      }

      // Get all payment events for the period
      const eventRows = await database.execute(sql`
        SELECT clientProtocolId, grossAmount, feeAmount, netAmount,
               paymentMethod, transactionId, createdAt, notes
        FROM payment_events
        WHERE eventType = 'payment_received'
          AND createdAt >= ${startDate} AND createdAt < ${endDate}
        ORDER BY createdAt ASC
      `);

      // Also get PayPal orders not in payment_events
      const paypalRows = await database.execute(sql`
        SELECT paypal_order_id, gross_amount, fee_amount, net_amount,
               completedAt, client_protocol_id, payer_name
        FROM paypal_orders
        WHERE status = 'COMPLETED' AND fee_amount IS NOT NULL
          AND completedAt >= ${startDate} AND completedAt < ${endDate}
          AND paypal_order_id NOT IN (
            SELECT COALESCE(transactionId, '') FROM payment_events
            WHERE eventType = 'payment_received' AND createdAt >= ${startDate} AND createdAt < ${endDate}
          )
        ORDER BY completedAt ASC
      `);

      // Build rows
      interface FeeRow {
        date: string; clientName: string; paymentMethod: string;
        transactionId: string; gross: string; fee: string; net: string;
      }
      const rows: FeeRow[] = [];
      let totalGross = 0, totalFees = 0, totalNet = 0;

      for (const event of ((eventRows as any).rows || eventRows) as any[]) {
        const gross = parseFloat(event.grossAmount || '0');
        const fee = parseFloat(event.feeAmount || '0');
        const net = parseFloat(event.netAmount || '0') || (gross - fee);
        totalGross += gross; totalFees += fee; totalNet += net;

        let clientName = "Unknown";
        try {
          const protocol = await db.getClientProtocolById(event.clientProtocolId);
          if (protocol) clientName = protocol.clientName;
        } catch (e) { /* ignore */ }

        rows.push({
          date: new Date(event.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Denver' }),
          clientName,
          paymentMethod: (event.paymentMethod || 'unknown').toUpperCase(),
          transactionId: event.transactionId || '',
          gross: gross.toFixed(2),
          fee: fee.toFixed(2),
          net: net.toFixed(2),
        });
      }

      for (const order of ((paypalRows as any).rows || paypalRows) as any[]) {
        const gross = parseFloat(order.gross_amount || '0');
        const fee = parseFloat(order.fee_amount || '0');
        const net = parseFloat(order.net_amount || '0') || (gross - fee);
        totalGross += gross; totalFees += fee; totalNet += net;

        let clientName = order.payer_name || "Unknown";
        try {
          if (order.client_protocol_id) {
            const protocol = await db.getClientProtocolById(order.client_protocol_id);
            if (protocol) clientName = protocol.clientName;
          }
        } catch (e) { /* ignore */ }

        rows.push({
          date: new Date(order.completedAt).toLocaleDateString('en-US', { timeZone: 'America/Denver' }),
          clientName,
          paymentMethod: 'PAYPAL',
          transactionId: order.paypal_order_id || '',
          gross: gross.toFixed(2),
          fee: fee.toFixed(2),
          net: net.toFixed(2),
        });
      }

      rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Build email HTML
      const tableRows = rows.map(r => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${r.date}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${r.clientName}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${r.paymentMethod}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;font-size:11px;">${r.transactionId}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:#16a34a;">$${r.gross}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:#dc2626;">-$${r.fee}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:#2563eb;">$${r.net}</td>
        </tr>
      `).join('');

      const feePercent = totalGross > 0 ? ((totalFees / totalGross) * 100).toFixed(1) : '0.0';

      const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;">
          <div style="background:#ea580c;color:white;padding:20px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:22px;">Omega Longevity - Fee Summary</h1>
            <p style="margin:5px 0 0;opacity:0.9;">${periodLabel} | Generated ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver' })}</p>
          </div>
          
          <div style="padding:20px;background:#f9f9f9;">
            <div style="display:flex;gap:15px;margin-bottom:20px;">
              <div style="flex:1;background:white;padding:15px;border-radius:8px;text-align:center;border:1px solid #e5e7eb;">
                <div style="font-size:12px;color:#666;">Gross Revenue</div>
                <div style="font-size:22px;font-weight:bold;color:#16a34a;">$${totalGross.toFixed(2)}</div>
              </div>
              <div style="flex:1;background:white;padding:15px;border-radius:8px;text-align:center;border:1px solid #e5e7eb;">
                <div style="font-size:12px;color:#666;">Total Fees</div>
                <div style="font-size:22px;font-weight:bold;color:#dc2626;">-$${totalFees.toFixed(2)}</div>
              </div>
              <div style="flex:1;background:white;padding:15px;border-radius:8px;text-align:center;border:1px solid #e5e7eb;">
                <div style="font-size:12px;color:#666;">Net Revenue</div>
                <div style="font-size:22px;font-weight:bold;color:#2563eb;">$${totalNet.toFixed(2)}</div>
              </div>
              <div style="flex:1;background:white;padding:15px;border-radius:8px;text-align:center;border:1px solid #e5e7eb;">
                <div style="font-size:12px;color:#666;">Avg Fee Rate</div>
                <div style="font-size:22px;font-weight:bold;color:#7c3aed;">${feePercent}%</div>
              </div>
            </div>

            <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;font-size:13px;">
              <thead>
                <tr style="background:#f97316;color:white;">
                  <th style="padding:10px 8px;text-align:left;">Date</th>
                  <th style="padding:10px 8px;text-align:left;">Client</th>
                  <th style="padding:10px 8px;text-align:left;">Method</th>
                  <th style="padding:10px 8px;text-align:left;">Transaction ID</th>
                  <th style="padding:10px 8px;text-align:right;">Gross</th>
                  <th style="padding:10px 8px;text-align:right;">Fee</th>
                  <th style="padding:10px 8px;text-align:right;">Net</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
                <tr style="font-weight:bold;border-top:2px solid #333;background:#f5f5f5;">
                  <td colspan="4" style="padding:10px 8px;">TOTALS (${rows.length} transactions)</td>
                  <td style="padding:10px 8px;text-align:right;color:#16a34a;">$${totalGross.toFixed(2)}</td>
                  <td style="padding:10px 8px;text-align:right;color:#dc2626;">-$${totalFees.toFixed(2)}</td>
                  <td style="padding:10px 8px;text-align:right;color:#2563eb;">$${totalNet.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="padding:15px;text-align:center;font-size:11px;color:#999;background:#f3f4f6;border-radius:0 0 8px 8px;">
            This is an automated fee summary from Omega Longevity. Do not reply to this email.
          </div>
        </div>
      `;

      const subject = input.type === "annual"
        ? `Annual Fee Summary ${input.year} - Omega Longevity`
        : `Fee Summary ${periodLabel} - Omega Longevity`;

      const result = await sendEmail({
        to: input.recipientEmail,
        subject,
        html: emailHtml,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to send email");
      }

      return {
        success: true,
        message: `Fee summary for ${periodLabel} sent to ${input.recipientEmail}`,
        transactionCount: rows.length,
      };
    }),
});
