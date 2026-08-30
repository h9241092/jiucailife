import { env } from "cloudflare:workers";

import { analyticsSchemaStatements } from "@/db/schema";

type AnalyticsEnv = { DB: D1Database };

export function analyticsDb() {
  return (env as unknown as AnalyticsEnv).DB;
}

let schemaReady: Promise<void> | null = null;

export function ensureAnalyticsSchema(db: D1Database) {
  schemaReady ??= db.batch([
    ...analyticsSchemaStatements.map((statement) => db.prepare(statement)),
    db.prepare("PRAGMA optimize"),
  ]).then(() => undefined).catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}
