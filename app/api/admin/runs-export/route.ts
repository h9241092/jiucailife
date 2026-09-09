import { isAnalyticsAdmin } from "@/lib/admin-auth";
import { analyticsDb, ensureAnalyticsSchema } from "@/lib/analytics-db";
import { InvalidExportCursor, readRunsExportPage } from "@/lib/analytics-runs-export";

export const dynamic = "force-dynamic";

const privateHeaders = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };

export async function GET(request: Request) {
  if (!await isAnalyticsAdmin(request.headers)) {
    return Response.json({ error: "登入已失效，請重新登入後台後再匯出。" }, { status: 401, headers: privateHeaders });
  }
  try {
    const db = analyticsDb();
    await ensureAnalyticsSchema(db);
    const page = await readRunsExportPage(db, new URL(request.url).searchParams.get("cursor"));
    return Response.json(page, { headers: privateHeaders });
  } catch (error) {
    if (error instanceof InvalidExportCursor) {
      return Response.json({ error: "匯出分頁無效，請重新點選匯出。" }, { status: 400, headers: privateHeaders });
    }
    console.error(JSON.stringify({ event: "admin_runs_export_failed" }));
    return Response.json({ error: "匯出失敗，請稍後重試。" }, { status: 503, headers: privateHeaders });
  }
}
