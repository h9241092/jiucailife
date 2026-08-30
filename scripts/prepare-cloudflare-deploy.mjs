import { access, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const deployConfigPath = resolve("dist/server/wrangler.deploy.json");
const workerEntryPath = resolve("dist/server/index.js");
const workerName = process.env.JIUCAI_WORKER_NAME?.trim() || "jiucai-life-simulator";
const databaseName = process.env.JIUCAI_D1_DATABASE_NAME?.trim() || "jiucai-analytics";
const databaseId = process.env.JIUCAI_D1_DATABASE_ID?.trim();

if (!databaseId || !/^[0-9a-f-]{36}$/i.test(databaseId)) {
  throw new Error("JIUCAI_D1_DATABASE_ID 必須是有效的 Cloudflare D1 database ID。");
}

await access(workerEntryPath);

const config = {
  name: workerName,
  main: "index.js",
  compatibility_date: "2026-08-29",
  compatibility_flags: ["nodejs_compat"],
  no_bundle: true,
  rules: [{ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] }],
  assets: { directory: "../client" },
  d1_databases: [{
    binding: "DB",
    database_name: databaseName,
    database_id: databaseId,
    migrations_dir: "../../drizzle",
  }],
  observability: { enabled: true },
};

await writeFile(deployConfigPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Prepared ${workerName} with D1 binding DB (${databaseName}).`);
