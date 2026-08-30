import { analyticsDb, ensureAnalyticsSchema } from "@/lib/analytics-db";

export type AnalyticsSummary = {
  totalRuns: number;
  completedRuns: number;
  activeRuns: number;
  abandonedRuns: number;
  earlyRetirementRuns: number;
  averageFinalNetWorth: number;
  averageCompletionMinutes: number;
  totalEvents: number;
};

export type MetricRow = { dimension: string; count: number; total: number };
export type DailyRow = { date: string; started: number; completed: number; abandoned: number };
export type RecentRun = {
  id: string;
  seedCode: string;
  gameVersion: string;
  trait: string | null;
  specialTrait: string | null;
  status: string;
  startedAt: string;
  lastSeenAt: string;
  lastAge: number | null;
  lastSeason: number | null;
  lastEventType: string | null;
  eventCount: number;
  ending: string | null;
  finalNetWorth: number | null;
};

const numberValue = (value: unknown) => typeof value === "number" ? value : Number(value ?? 0) || 0;

export async function readAnalyticsReport() {
  const db = analyticsDb();
  await ensureAnalyticsSchema(db);
  const [summaryResult, eventResult, dailyResult, recentResult] = await Promise.all([
    db.prepare(`SELECT
      COUNT(*) AS total_runs,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_runs,
      SUM(CASE WHEN status = 'active' AND last_seen_at >= datetime('now', '-30 minutes') THEN 1 ELSE 0 END) AS active_runs,
      SUM(CASE WHEN status = 'abandoned' OR (status = 'active' AND last_seen_at < datetime('now', '-30 minutes')) THEN 1 ELSE 0 END) AS abandoned_runs,
      SUM(CASE WHEN early_retirement = 1 THEN 1 ELSE 0 END) AS early_retirement_runs,
      AVG(CASE WHEN status = 'completed' THEN final_net_worth END) AS average_final_net_worth,
      AVG(CASE WHEN completed_at IS NOT NULL THEN (julianday(completed_at) - julianday(started_at)) * 1440 END) AS average_completion_minutes
      FROM anonymous_runs`).first<Record<string, unknown>>(),
    db.prepare("SELECT COUNT(*) AS total_events FROM anonymous_events").first<Record<string, unknown>>(),
    db.prepare(`SELECT
      metric_date AS date,
      SUM(CASE WHEN metric_name = 'runs_started' THEN sample_count ELSE 0 END) AS started,
      SUM(CASE WHEN metric_name = 'runs_completed' THEN sample_count ELSE 0 END) AS completed,
      SUM(CASE WHEN metric_name = 'runs_abandoned' THEN sample_count ELSE 0 END) AS abandoned
      FROM analytics_daily_metrics
      WHERE metric_date >= date('now', '-29 days')
      GROUP BY metric_date
      ORDER BY metric_date`).all<Record<string, unknown>>(),
    db.prepare(`SELECT id, seed_code, game_version, trait, special_trait, status, started_at, last_seen_at, last_age, last_season, last_event_type, event_count, ending, final_net_worth
      FROM anonymous_runs ORDER BY started_at DESC LIMIT 20`).all<Record<string, unknown>>(),
  ]);

  const raw = summaryResult ?? {};
  const summary: AnalyticsSummary = {
    totalRuns: numberValue(raw.total_runs),
    completedRuns: numberValue(raw.completed_runs),
    activeRuns: numberValue(raw.active_runs),
    abandonedRuns: numberValue(raw.abandoned_runs),
    earlyRetirementRuns: numberValue(raw.early_retirement_runs),
    averageFinalNetWorth: Math.round(numberValue(raw.average_final_net_worth)),
    averageCompletionMinutes: Math.round(numberValue(raw.average_completion_minutes)),
    totalEvents: numberValue(eventResult?.total_events),
  };
  const daily: DailyRow[] = (dailyResult.results ?? []).map((row) => ({
    date: String(row.date ?? ""),
    started: numberValue(row.started),
    completed: numberValue(row.completed),
    abandoned: numberValue(row.abandoned),
  }));
  const recentRuns: RecentRun[] = (recentResult.results ?? []).map((row) => ({
    id: String(row.id ?? ""),
    seedCode: String(row.seed_code ?? ""),
    gameVersion: String(row.game_version ?? ""),
    trait: row.trait === null ? null : String(row.trait),
    specialTrait: row.special_trait === null ? null : String(row.special_trait),
    status: String(row.status ?? "active"),
    startedAt: String(row.started_at ?? ""),
    lastSeenAt: String(row.last_seen_at ?? ""),
    lastAge: row.last_age === null ? null : numberValue(row.last_age),
    lastSeason: row.last_season === null ? null : numberValue(row.last_season),
    lastEventType: row.last_event_type === null ? null : String(row.last_event_type),
    eventCount: numberValue(row.event_count),
    ending: row.ending === null ? null : String(row.ending),
    finalNetWorth: row.final_net_worth === null ? null : numberValue(row.final_net_worth),
  }));
  return { db, summary, daily, recentRuns };
}

export async function readMetric(db: D1Database, metricName: string, limit = 10) {
  const result = await db.prepare(`SELECT dimension, SUM(sample_count) AS count, SUM(value_total) AS total
    FROM analytics_daily_metrics
    WHERE metric_name = ? AND metric_date >= date('now', '-180 days')
    GROUP BY dimension
    ORDER BY count DESC, dimension ASC
    LIMIT ?`).bind(metricName, limit).all<Record<string, unknown>>();
  return (result.results ?? []).map((row): MetricRow => ({
    dimension: String(row.dimension ?? "all"),
    count: numberValue(row.count),
    total: numberValue(row.total),
  }));
}
