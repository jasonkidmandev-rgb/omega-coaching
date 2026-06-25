/**
 * Shared cron runner — durable run-logging + admin failure alerting.
 *
 * Wrap any scheduled job in `runCronJob(name, fn)` to get:
 *   1. A row in `cron_runs` for every run (status, duration, item counts, error),
 *      so a missed/failed run is visible instead of silently lost on a deploy/crash.
 *   2. An admin notification when a job throws (the piece that was missing — most
 *      crons logged nothing and alerted no one).
 *
 * Generalizes the per-job logging that previously lived only in checkinCron.
 * Never throws: a logging/alert failure must not crash the scheduler.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { cronRuns } from "../../drizzle/schema";

export interface CronRunResult {
  itemsProcessed?: number;
  itemsSucceeded?: number;
  itemsFailed?: number;
  details?: string;
}

type TriggeredBy = "cron" | "manual" | "startup";

function toMysqlDatetime(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Run a job with run-logging and failure alerting. Returns the job's result
 * (or {} on failure). Re-throwing is suppressed so the scheduler keeps running.
 */
export async function runCronJob(
  jobName: string,
  fn: () => Promise<CronRunResult | void>,
  opts: { triggeredBy?: TriggeredBy } = {}
): Promise<CronRunResult> {
  const triggeredBy = opts.triggeredBy ?? "cron";
  const startedAt = new Date();
  let result: CronRunResult = {};
  let status: "success" | "error" | "partial" = "success";
  let errorMessage: string | undefined;

  try {
    const r = await fn();
    if (r) result = r;
    if ((result.itemsFailed ?? 0) > 0) status = "partial";
  } catch (err: any) {
    status = "error";
    errorMessage = (err?.message ? String(err.message) : String(err)).slice(0, 1000);
    console.error(`[CronRunner] ${jobName} failed:`, err);
  }

  const completedAt = new Date();

  // 1. Durable run log
  try {
    const database = await getDb();
    if (database) {
      await database.insert(cronRuns).values({
        jobName,
        status,
        startedAt: toMysqlDatetime(startedAt),
        completedAt: toMysqlDatetime(completedAt),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        itemsProcessed: result.itemsProcessed ?? 0,
        itemsSucceeded: result.itemsSucceeded ?? 0,
        itemsFailed: result.itemsFailed ?? 0,
        errorMessage: errorMessage ?? null,
        details: result.details ?? null,
        triggeredBy,
      });
    }
  } catch (logErr) {
    console.error(`[CronRunner] Failed to record run for ${jobName}:`, logErr);
  }

  // 2. Admin failure alert (the previously-missing piece)
  if (status === "error") {
    try {
      await alertAdminsOfFailure(jobName, errorMessage ?? "Unknown error");
    } catch (alertErr) {
      console.error(`[CronRunner] Failed to alert admins for ${jobName}:`, alertErr);
    }
  }

  return result;
}

async function alertAdminsOfFailure(jobName: string, errorMessage: string): Promise<void> {
  const database = await getDb();
  if (!database) return;
  const [rows] = await database.execute(
    sql`SELECT id FROM users WHERE role IN ('admin', 'owner')`
  );
  const adminIds = ((rows as unknown) as any[]).map((r: any) => r.id as number);
  const title = `⚠️ Scheduled job failed: ${jobName}`;
  const when = new Date().toLocaleString("en-US", { timeZone: "America/Denver" });
  const message = `The "${jobName}" job failed at ${when}. Error: ${errorMessage}. Check /admin/payment-history or server logs.`;
  for (const userId of adminIds) {
    await database.execute(sql`
      INSERT INTO notifications (userId, type, title, message, createdAt)
      VALUES (${userId}, 'other', ${title}, ${message}, NOW())
    `);
  }
}

/**
 * Read recent cron runs for an admin health view (newest first).
 */
export async function getRecentCronRuns(limit = 100): Promise<any[]> {
  const database = await getDb();
  if (!database) return [];
  const [rows] = await database.execute(sql`
    SELECT id, jobName, status, startedAt, completedAt, durationMs,
           itemsProcessed, itemsSucceeded, itemsFailed, errorMessage, triggeredBy
    FROM cron_runs
    ORDER BY startedAt DESC
    LIMIT ${limit}
  `);
  return (rows as unknown) as any[];
}
