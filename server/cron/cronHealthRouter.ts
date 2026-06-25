import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getRecentCronRuns } from "./cronRunner";

/**
 * Admin-facing job health: recent cron runs (status, duration, counts, errors).
 * Backed by the shared cronRunner's `cron_runs` logging.
 */
export const cronHealthRouter = router({
  recentRuns: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(500).optional() }).optional())
    .query(async ({ input }) => {
      return getRecentCronRuns(input?.limit ?? 100);
    }),
});
