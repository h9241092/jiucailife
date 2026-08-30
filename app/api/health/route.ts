import { analyticsDb, ensureAnalyticsSchema } from "@/lib/analytics-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = analyticsDb();
    await ensureAnalyticsSchema(db);
    await db.prepare("SELECT 1 AS healthy").first();
    return Response.json(
      { status: "ok", database: "connected" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "error", database: "unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
