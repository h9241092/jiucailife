import { headers } from "next/headers";

import { isAnalyticsAdmin } from "@/lib/admin-auth";
import { analyticsDb, ensureAnalyticsSchema } from "@/lib/analytics-db";

export const dynamic = "force-dynamic";

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET() {
  const requestHeaders = await headers();
  if (!await isAnalyticsAdmin(requestHeaders)) return new Response(null, { status: 404 });
  const db = analyticsDb();
  await ensureAnalyticsSchema(db);
  const result = await db.prepare(`SELECT
    seed_code, game_version, trait, special_trait, status, started_at, last_seen_at, completed_at,
    last_age, last_season, last_event_type, event_count, ending, final_net_worth, early_retirement, achievement_ids
    FROM anonymous_runs
    WHERE started_at >= datetime('now', '-180 days')
    ORDER BY started_at DESC
    LIMIT 5000`).all<Record<string, unknown>>();
  const columns = ["seed_code", "game_version", "trait", "special_trait", "status", "started_at", "last_seen_at", "completed_at", "last_age", "last_season", "last_event_type", "event_count", "ending", "final_net_worth", "early_retirement", "achievement_ids"];
  const lines = [columns.join(","), ...(result.results ?? []).map((row) => columns.map((column) => csvCell(row[column])).join(","))];
  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="jiucai-analytics-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
