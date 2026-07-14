/**
 * Retention watch list for Shannon's Acquisition & Retention dashboard.
 *
 * Surfaces active coaching clients who need a proactive touch, per Jason:
 *   1. Renewal nudge — flagged when a program has 4 weeks left, escalating at 2 weeks.
 *   2. Monthly client-relations call — one per active enrollment, on a rolling
 *      monthly cadence anchored to the client's program start.
 *
 * Everything is DERIVED from data we already have (program dates + enrollment
 * date), so there is nothing for Shannon to maintain and no schema change. The
 * query selects explicit columns (never `select().from()`) so a future column
 * drift can't turn this into an "Unknown column" outage.
 *
 * NOTE: the monthly call is a derived prompt (shows for a rolling window each
 * month). Persisting a per-month "done" mark is a small fast-follow — it needs
 * one additive column, deliberately deferred to avoid a def/DB schema mismatch.
 */
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export interface RetentionWatchItem {
  name: string;
  reason: string; // short badge text, e.g. "Renewal — 2 wks" / "Monthly call"
  detail: string; // one-line context, e.g. "Program ends Jul 28"
  contactId: number | null;
  protocolId: number | null;
  urgency: number; // lower = more urgent (for sorting)
}

const DAY_MS = 1000 * 60 * 60 * 24;
const RENEWAL_WINDOW_DAYS = 28; // 4 weeks
const RENEWAL_URGENT_DAYS = 14; // 2 weeks
const MONTHLY_CALL_WINDOW_DAYS = 7; // rolling window after each monthly anniversary
const COACHING_ENGAGEMENTS = new Set(["full_coaching", "self_guided_checkins"]);

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric" });
}

/**
 * The most recent monthly anniversary of `anchor` on or before `today`.
 * Clamps the day-of-month for short months (e.g. a Jan-31 anchor → Feb 28).
 */
function lastMonthlyAnniversary(anchor: Date, today: Date): Date {
  const day = anchor.getDate();
  let year = today.getFullYear();
  let month = today.getMonth();
  const clampDay = (y: number, m: number) => Math.min(day, new Date(y, m + 1, 0).getDate());
  let anniv = new Date(year, month, clampDay(year, month));
  if (anniv > today) {
    // this month's anniversary hasn't happened yet — use last month's
    month -= 1;
    if (month < 0) { month = 11; year -= 1; }
    anniv = new Date(year, month, clampDay(year, month));
  }
  return anniv;
}

export async function gatherRetentionWatch(): Promise<RetentionWatchItem[]> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const [rows] = (await database.execute(sql`
    SELECT id, clientName, contactId, endDate, startDate, programStartDate, createdAt, durationMonths, engagementLevel
    FROM client_protocols
    WHERE status = 'active' AND archivedAt IS NULL AND isActiveVersion = 1
  `)) as any;

  const now = new Date();
  const items: RetentionWatchItem[] = [];

  for (const r of (rows || []) as any[]) {
    const name = r.clientName || `Client #${r.id}`;
    const contactId = r.contactId ?? null;
    const protocolId = r.id ?? null;
    // Program start anchor, used for both the derived end date and the monthly call.
    const anchorRaw = r.programStartDate || r.startDate || r.createdAt;

    // 1. Renewal nudge — program ending within 4 weeks (escalates at 2 weeks).
    // Prefer an explicit endDate, but that's currently unpopulated in practice,
    // so fall back to deriving it from the start anchor + program length.
    let hasRenewal = false;
    let end: Date | null = null;
    if (r.endDate) {
      end = new Date(r.endDate);
    } else if (anchorRaw && Number(r.durationMonths) > 0) {
      end = new Date(anchorRaw);
      end.setMonth(end.getMonth() + Number(r.durationMonths));
    }
    if (end) {
      const daysLeft = Math.ceil((end.getTime() - now.getTime()) / DAY_MS);
      if (daysLeft >= 0 && daysLeft <= RENEWAL_WINDOW_DAYS) {
        hasRenewal = true;
        const urgent = daysLeft <= RENEWAL_URGENT_DAYS;
        items.push({
          name,
          reason: urgent ? "Renewal — 2 wks" : "Renewal — 4 wks",
          detail: `Program ends ${fmtDate(end)} (${daysLeft}d left)`,
          contactId,
          protocolId,
          urgency: daysLeft, // sooner end = more urgent
        });
      }
    }

    // 2. Monthly client-relations call — one per active coaching enrollment,
    //    on a rolling monthly cadence. Skipped if a renewal already surfaced
    //    the client (you'll be talking to them anyway).
    if (!hasRenewal && COACHING_ENGAGEMENTS.has(r.engagementLevel)) {
      if (anchorRaw) {
        const anchor = new Date(anchorRaw);
        // only after the client has been enrolled at least a month
        if (now.getTime() - anchor.getTime() >= 28 * DAY_MS) {
          const anniv = lastMonthlyAnniversary(anchor, now);
          const daysSinceAnniv = Math.floor((now.getTime() - anniv.getTime()) / DAY_MS);
          if (daysSinceAnniv >= 0 && daysSinceAnniv < MONTHLY_CALL_WINDOW_DAYS) {
            items.push({
              name,
              reason: "Monthly call",
              detail: "Monthly relations check-in due",
              contactId,
              protocolId,
              urgency: 100 + daysSinceAnniv, // after all renewals
            });
          }
        }
      }
    }
  }

  items.sort((a, b) => a.urgency - b.urgency);
  return items.slice(0, 20);
}
