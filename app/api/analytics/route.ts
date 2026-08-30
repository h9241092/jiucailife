import { analyticsDb, ensureAnalyticsSchema } from "@/lib/analytics-db";

const ANALYTICS_SCHEMA_VERSION = 2;
const MAX_EVENTS_PER_RUN = 1000;
const RAW_RETENTION_DAYS = 180;

const eventTypes = new Set([
  "run_started",
  "event_presented",
  "event_choice",
  "income_choice",
  "trade",
  "debt_action",
  "surprise_resolved",
  "family_event",
  "illness_event",
  "year_completed",
  "run_completed",
  "run_abandoned",
]);

const allowedDataKeys = new Set([
  "trait", "specialTrait", "initialCash", "initialHealth", "initialStress", "initialFamily", "initialKnowledge", "initialCredit",
  "eventId", "eventKind", "choice", "action", "response", "reason", "intelAction", "outcome", "category", "target", "linkedTarget",
  "side", "ratio", "amount", "incomePath", "income", "direction", "truthful", "priceMove", "severity",
  "cash", "assetValue", "debt", "netWorth", "health", "stress", "family", "knowledge", "credit", "ending", "earlyRetirement", "achievementIds",
]);

type MetricEntry = { name: string; dimension?: string; total?: number };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const seedPattern = /^[A-Z0-9-]{1,24}$/;
const shortText = (value: unknown, maximum = 80) => typeof value === "string" ? value.slice(0, maximum) : null;
const optionalInteger = (value: unknown, minimum: number, maximum: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
};

function sanitizeData(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const clean: Record<string, string | number | boolean | null | string[]> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!allowedDataKeys.has(key)) continue;
    if (typeof item === "string") clean[key] = item.slice(0, 80);
    else if (typeof item === "number" && Number.isFinite(item)) clean[key] = Math.round(item);
    else if (typeof item === "boolean" || item === null) clean[key] = item;
    else if (Array.isArray(item)) clean[key] = item.filter((entry): entry is string => typeof entry === "string").slice(0, 32).map((entry) => entry.slice(0, 48));
  }
  return clean;
}

const dimension = (value: unknown, fallback = "all") => shortText(value, 72) || fallback;

function metricsForEvent(eventType: string, data: Record<string, string | number | boolean | null | string[]>): MetricEntry[] {
  const metrics: MetricEntry[] = [{ name: "events", dimension: eventType }];
  if (eventType === "run_started") metrics.push({ name: "runs_started" });
  if (eventType === "event_presented") metrics.push({ name: "events_presented", dimension: dimension(data.eventId) });
  if (eventType === "event_choice") {
    metrics.push({ name: "event_choices", dimension: dimension(data.choice) });
    metrics.push({ name: "event_choice_detail", dimension: `${dimension(data.eventId, "unknown")}:${dimension(data.choice, "unknown")}` });
  }
  if (eventType === "income_choice") metrics.push({ name: "income_choices", dimension: dimension(data.incomePath) });
  if (eventType === "trade") metrics.push({ name: "trades", dimension: `${dimension(data.side)}:${dimension(data.target, "unknown")}` });
  if (eventType === "debt_action") metrics.push({ name: "debt_actions", dimension: dimension(data.action) });
  if (eventType === "surprise_resolved") metrics.push({ name: "surprises", dimension: `${dimension(data.direction)}:${dimension(data.action)}` });
  if (eventType === "family_event") metrics.push({ name: "family_choices", dimension: dimension(data.choice) });
  if (eventType === "illness_event") metrics.push({ name: "illness_choices", dimension: `${dimension(data.severity)}:${dimension(data.choice)}` });
  if (eventType === "year_completed") metrics.push({ name: "years_completed" });
  if (eventType === "run_abandoned") metrics.push({ name: "runs_abandoned", dimension: dimension(data.reason) });
  if (eventType === "run_completed") {
    metrics.push({ name: "runs_completed" });
    metrics.push({ name: "endings", dimension: dimension(data.ending) });
    metrics.push({ name: "final_net_worth", total: typeof data.netWorth === "number" ? data.netWorth : 0 });
    if (data.earlyRetirement) metrics.push({ name: "early_retirement" });
    if (Array.isArray(data.achievementIds)) {
      for (const achievementId of data.achievementIds) metrics.push({ name: "achievements", dimension: dimension(achievementId) });
    }
  }
  return metrics;
}

let nextCleanupAt = 0;
async function cleanupExpiredRawData(db: D1Database) {
  const now = Date.now();
  if (now < nextCleanupAt) return;
  nextCleanupAt = now + 60 * 60 * 1000;
  await db.batch([
    db.prepare(`DELETE FROM anonymous_events WHERE created_at < datetime('now', '-${RAW_RETENTION_DAYS} days')`),
    db.prepare(`DELETE FROM anonymous_runs WHERE started_at < datetime('now', '-${RAW_RETENTION_DAYS} days')`),
    db.prepare("PRAGMA optimize"),
  ]);
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return new Response(null, { status: 403, headers: { "cache-control": "no-store" } });
    }
    const raw = await request.text();
    if (raw.length > 8192) return new Response(null, { status: 413 });
    const body = JSON.parse(raw) as Record<string, unknown>;
    const runId = shortText(body.runId, 36);
    const eventId = shortText(body.eventId, 36);
    const eventType = shortText(body.eventType, 32);
    const gameVersion = shortText(body.gameVersion, 32);
    const schemaVersion = optionalInteger(body.schemaVersion, 1, 20);
    const eventSequence = optionalInteger(body.eventSequence, 0, MAX_EVENTS_PER_RUN - 1);
    const clientElapsedMs = optionalInteger(body.clientElapsedMs, 0, 7 * 24 * 60 * 60 * 1000);
    if (!runId || !eventId || !uuidPattern.test(runId) || !uuidPattern.test(eventId) || !eventType || !eventTypes.has(eventType)
      || !gameVersion || schemaVersion !== ANALYTICS_SCHEMA_VERSION || eventSequence === null) {
      return new Response(null, { status: 400 });
    }

    const seedCode = shortText(body.seedCode, 24)?.toUpperCase() ?? null;
    if (eventType === "run_started" && (!seedCode || !seedPattern.test(seedCode) || eventSequence !== 0)) return new Response(null, { status: 400 });
    const data = sanitizeData(body.data);
    const db = analyticsDb();
    await ensureAnalyticsSchema(db);

    if (eventType === "run_started") {
      await db.prepare(`INSERT OR IGNORE INTO anonymous_runs (
        id, game_version, schema_version, seed_code, trait, special_trait, initial_cash, initial_health, initial_stress, initial_family, initial_knowledge, initial_credit,
        last_event_sequence, last_event_type, last_game_year, last_age, last_season, last_month
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, -1, NULL, ?, ?, ?, ?)`).bind(
        runId, gameVersion, schemaVersion, seedCode, shortText(data.trait), shortText(data.specialTrait),
        optionalInteger(data.initialCash, 0, 1000000000), optionalInteger(data.initialHealth, 0, 100), optionalInteger(data.initialStress, 0, 100),
        optionalInteger(data.initialFamily, 0, 100), optionalInteger(data.initialKnowledge, 0, 100), optionalInteger(data.initialCredit, 0, 100),
        optionalInteger(body.year, 1, 100), optionalInteger(body.age, 0, 120), optionalInteger(body.season, 0, 3), optionalInteger(body.month, 0, 2),
      ).run();
    }

    const run = await db.prepare("SELECT game_version, event_count FROM anonymous_runs WHERE id = ?").bind(runId).first<{ game_version: string; event_count: number }>();
    if (!run) return new Response(null, { status: 409 });
    if (run.game_version !== gameVersion) return new Response(null, { status: 409 });
    const existingEvent = await db.prepare("SELECT id, event_type FROM anonymous_events WHERE run_id = ? AND event_sequence = ?")
      .bind(runId, eventSequence).first<{ id: string; event_type: string }>();
    if (existingEvent) {
      if (existingEvent.id === eventId && existingEvent.event_type === eventType) {
        return new Response(null, { status: 202, headers: { "cache-control": "no-store" } });
      }
      return new Response(null, { status: 409, headers: { "cache-control": "no-store" } });
    }
    if (run.event_count >= MAX_EVENTS_PER_RUN) return new Response(null, { status: 429 });

    const gameYear = optionalInteger(body.year, 1, 100);
    const age = optionalInteger(body.age, 0, 120);
    const season = optionalInteger(body.season, 0, 3);
    const month = optionalInteger(body.month, 0, 2);
    const inserted = await db.prepare(`INSERT OR IGNORE INTO anonymous_events (
      id, run_id, event_type, game_version, schema_version, event_sequence, client_elapsed_ms, game_year, age, season, month, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      eventId, runId, eventType, gameVersion, schemaVersion, eventSequence, clientElapsedMs, gameYear, age, season, month, JSON.stringify(data),
    ).run();
    const wasInserted = Number(inserted.meta.changes ?? 0) > 0;

    if (wasInserted) {
      const metricStatements = metricsForEvent(eventType, data).map((metric) => db.prepare(`INSERT INTO analytics_daily_metrics (
        metric_date, game_version, metric_name, dimension, sample_count, value_total, updated_at
      ) VALUES (date('now'), ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(metric_date, game_version, metric_name, dimension) DO UPDATE SET
        sample_count = sample_count + 1,
        value_total = value_total + excluded.value_total,
        updated_at = CURRENT_TIMESTAMP`).bind(gameVersion, metric.name, metric.dimension ?? "all", metric.total ?? 0));
      await db.batch([
        db.prepare(`UPDATE anonymous_runs SET
          event_count = event_count + 1,
          last_event_sequence = MAX(last_event_sequence, ?),
          last_event_type = ?, last_game_year = ?, last_age = ?, last_season = ?, last_month = ?, last_seen_at = CURRENT_TIMESTAMP,
          status = CASE WHEN status = 'abandoned' AND ? NOT IN ('run_abandoned', 'run_completed') THEN 'active' ELSE status END
          WHERE id = ?`).bind(eventSequence, eventType, gameYear, age, season, month, eventType, runId),
        ...metricStatements,
      ]);
    }

    if (wasInserted && eventType === "run_completed") {
      await db.prepare(`UPDATE anonymous_runs SET
        status = 'completed', ending = ?, final_age = ?, final_net_worth = ?, early_retirement = ?, achievement_ids = ?, completed_at = CURRENT_TIMESTAMP, last_seen_at = CURRENT_TIMESTAMP
        WHERE id = ?`).bind(
        shortText(data.ending), age, optionalInteger(data.netWorth, -1000000000, 10000000000), data.earlyRetirement ? 1 : 0,
        JSON.stringify(Array.isArray(data.achievementIds) ? data.achievementIds : []), runId,
      ).run();
    } else if (wasInserted && eventType === "run_abandoned") {
      await db.prepare("UPDATE anonymous_runs SET status = CASE WHEN status = 'active' THEN 'abandoned' ELSE status END, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(runId).run();
    }

    await cleanupExpiredRawData(db);
    return new Response(null, { status: 202, headers: { "cache-control": "no-store" } });
  } catch {
    return new Response(null, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
