import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { format } from "date-fns";

export const paymentExportRouter = router({
  // Export payments to CSV format
  exportToCSV: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        paymentMethod: z.string().optional(),
        paymentStatus: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const clientProtocols = await db.getAllClientProtocols();

      let filtered = clientProtocols;

      // Filter by date range
      if (input.startDate) {
        filtered = filtered.filter((p: any) => new Date(p.createdAt) >= input.startDate!);
      }
      if (input.endDate) {
        filtered = filtered.filter((p: any) => new Date(p.createdAt) <= input.endDate!);
      }

      // Filter by payment method
      if (input.paymentMethod) {
        filtered = filtered.filter((p: any) => p.paymentMethod === input.paymentMethod);
      }

      // Filter by payment status
      if (input.paymentStatus) {
        filtered = filtered.filter((p: any) => p.paymentStatus === input.paymentStatus);
      }

      // Generate CSV headers
      const headers = [
        "Client Name",
        "Email",
        "Payment Status",
        "Payment Method",
        "Amount",
        "Created Date",
        "Received Date",
        "Protocol ID",
      ];

      // Generate CSV rows
      const rows = filtered.map((p: any) => [
        p.clientName,
        p.clientEmail || "",
        p.paymentStatus || "pending",
        p.paymentMethod || "unknown",
        p.totalPrice || "0",
        format(new Date(p.createdAt), "yyyy-MM-dd HH:mm:ss"),
        p.paymentReceivedAt ? format(new Date(p.paymentReceivedAt), "yyyy-MM-dd HH:mm:ss") : "",
        p.id,
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(","),
        ...rows.map((row: string[]) =>
          row.map((cell: string) => `"${cell.toString().replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      return {
        csv: csvContent,
        filename: `payments-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`,
        count: filtered.length,
      };
    }),

  // Get export summary
  getSummary: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        paymentMethod: z.string().optional(),
        paymentStatus: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const clientProtocols = await db.getAllClientProtocols();

      let filtered = clientProtocols;

      if (input.startDate) {
        filtered = filtered.filter((p: any) => new Date(p.createdAt) >= input.startDate!);
      }
      if (input.endDate) {
        filtered = filtered.filter((p: any) => new Date(p.createdAt) <= input.endDate!);
      }
      if (input.paymentMethod) {
        filtered = filtered.filter((p: any) => p.paymentMethod === input.paymentMethod);
      }
      if (input.paymentStatus) {
        filtered = filtered.filter((p: any) => p.paymentStatus === input.paymentStatus);
      }

      return {
        totalRecords: filtered.length,
        totalRevenue: filtered
          .filter((p: any) => p.paymentStatus === "paid")
          .reduce((sum: number, p: any) => sum + (typeof p.totalPrice === "string" ? parseFloat(p.totalPrice) : p.totalPrice || 0), 0),
        byStatus: {
          paid: filtered.filter((p: any) => p.paymentStatus === "paid").length,
          pending: filtered.filter((p: any) => p.paymentStatus === "pending").length,
          failed: filtered.filter((p: any) => p.paymentStatus === "failed").length,
          refunded: filtered.filter((p: any) => p.paymentStatus === "refunded").length,
        },
        byMethod: {
          paypal: filtered.filter((p: any) => p.paymentMethod === "paypal").length,
          venmo: filtered.filter((p: any) => p.paymentMethod === "venmo").length,
          other: filtered.filter((p: any) => p.paymentMethod === "other" || !p.paymentMethod).length,
        },
      };
    }),
});
