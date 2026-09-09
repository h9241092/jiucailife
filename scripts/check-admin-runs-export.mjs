// Local-only regression checks: in-memory SQLite, no production analytics calls.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = process.cwd();
const nativeRequire = createRequire(import.meta.url);
const cache = new Map();
const auth = { allowed: true };
let routeDb;
let dbAccesses = 0;

function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const cjsModule = { exports: {} };
  cache.set(file, cjsModule);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const require = (specifier) => {
    if (specifier === "@/lib/admin-auth") return { isAnalyticsAdmin: async () => auth.allowed };
    if (specifier === "@/lib/analytics-db") return {
      analyticsDb: () => { dbAccesses += 1; return routeDb; }, ensureAnalyticsSchema: async () => {},
    };
    if (specifier.startsWith("@/")) return load(`${specifier.slice(2)}.ts`);
    if (specifier.startsWith(".")) return load(`${path.resolve(path.dirname(file), specifier)}.ts`);
    return nativeRequire(specifier);
  };
  vm.runInThisContext(`(function(require, module, exports) {${source}\n})`, { filename: file })(require, cjsModule, cjsModule.exports);
  return cjsModule.exports;
}

const { readRunsExportPage, runCsvCell, RUN_EXPORT_COLUMNS } = load("lib/analytics-runs-export.ts");
const { runStatusLabel, runPositionLabel } = load("lib/analytics-run-format.ts");
const { GET } = load("app/api/admin/runs-export/route.ts");

function database() {
  const sqlite = new DatabaseSync(":memory:");
  const { analyticsSchemaStatements } = load("db/schema.ts");
  for (const statement of analyticsSchemaStatements) sqlite.exec(statement);
  let queries = 0;
  return {
    sqlite,
    get queries() { return queries; },
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      let values = [];
      return {
        bind(...bound) { values = bound; return this; },
        async first() { queries += 1; return statement.get(...values) ?? null; },
        async all() { queries += 1; return { success: true, results: statement.all(...values) }; },
      };
    },
  };
}

function seed(db, count, prefix = "run") {
  const statement = db.sqlite.prepare(`INSERT INTO anonymous_runs
    (id, game_version, seed_code, trait, special_trait, status, started_at, last_seen_at, last_age, last_season, last_event_type, event_count, ending, final_net_worth)
    VALUES (?, 'v1.0.6', ?, '數字敏感', '紙手體質', 'completed', ?, '2026-09-04 09:05:00', 31, 3, 'run_completed', 224, '差一點上岸', ?)`);
  db.sqlite.exec("BEGIN");
  for (let i = 0; i < count; i += 1) {
    statement.run(`${prefix}-${i}`, `SEED${i}`, i % 3 === 0 ? "2026-09-03 09:05:00" : "2026-09-04 09:05:00", i === 0 ? -500 : 19064484);
  }
  db.sqlite.exec("COMMIT");
}

test("empty export still contains one Excel UTF-8 BOM and Chinese header", async () => {
  const db = database();
  try {
    const page = await readRunsExportPage(db, null);
    assert.equal(page.count, 0);
    assert.equal(page.nextCursor, null);
    assert.ok(page.csv.startsWith('\uFEFF"開始時間（台灣）"'));
    assert.equal(page.csv.split("\r\n").length, 2);
    assert.equal(RUN_EXPORT_COLUMNS.length, 13);
  } finally { db.sqlite.close(); }
});

test("CSV escapes quotes, commas, newlines and formulas; negative amounts remain numeric", () => {
  assert.equal(runCsvCell('a,"b"\nc'), '"a,""b""\nc"');
  for (const input of ["=SUM(1,2)", "+cmd", "-cmd", "@SUM(1)", "  =SUM(1)", "\t123"]) {
    assert.ok(runCsvCell(input).startsWith('"\''));
  }
  assert.equal(runCsvCell(-500), "-500");
  assert.equal(runCsvCell(0), "0");
  assert.equal(runCsvCell(null), '""');
  assert.equal(runCsvCell("數字敏感"), '"數字敏感"');
  assert.equal(runCsvCell("00123456"), '"\'00123456"');
  assert.equal(runCsvCell("1234567890123456"), '"\'1234567890123456"');
});

test("status, quarter and missing information agree with the on-screen table", () => {
  const now = Date.parse("2026-09-04T10:00:00Z");
  assert.equal(runStatusLabel("completed", "2026-09-03 00:00:00", now), "已完成");
  assert.equal(runStatusLabel("abandoned", "2026-09-04 09:59:00", now), "已離場");
  assert.equal(runStatusLabel("active", "2026-09-04 09:29:59", now), "逾時未確認");
  assert.equal(runStatusLabel("active", "2026-09-04 09:30:00", now), "進行中");
  assert.equal(runStatusLabel("active", "2026-09-04T09:59:00Z", now), "進行中");
  assert.equal(runStatusLabel("active", "2026-09-04T17:59:00+08:00", now), "進行中");
  assert.equal(runPositionLabel(31, 3), "31 歲 · 冬季");
  assert.equal(runPositionLabel(null, null), "剛開始");
});

for (const count of [1, 500, 501, 6003]) {
  test(`all ${count} runs export without missing/duplicated rows or 5,000-row truncation`, async () => {
    const db = database();
    try {
      seed(db, count);
      const expected = db.sqlite.prepare("SELECT id FROM anonymous_runs ORDER BY started_at DESC, rowid DESC").all().map((row) => row.id);
      const chunks = [];
      let cursor = null;
      let total = 0;
      let pages = 0;
      do {
        const page = await readRunsExportPage(db, cursor);
        assert.ok(page.count <= 500);
        chunks.push(page.csv);
        total += page.count;
        cursor = page.nextCursor;
        pages += 1;
        assert.ok(pages < 30);
      } while (cursor);
      assert.equal(total, count);
      assert.equal(pages, Math.ceil(count / 500));
      const csv = chunks.join("");
      assert.equal((csv.match(/\uFEFF/g) ?? []).length, 1);
      const lines = csv.trimEnd().split("\r\n").slice(1);
      assert.deepEqual(lines.map((line) => line.match(/"(run-\d+)"$/)[1]), expected);
      assert.ok(csv.includes('"紙手體質","已完成","31 歲 · 冬季"'));
      assert.ok(csv.includes('"差一點上岸",-500,'));
      assert.equal(db.queries, pages + 1);
    } finally { db.sqlite.close(); }
  });
}

test("new runs arriving during an export are excluded, even with backdated starts", async () => {
  const db = database();
  try {
    seed(db, 1002);
    const first = await readRunsExportPage(db, null);
    seed(db, 50, "new");
    let cursor = first.nextCursor;
    let count = first.count;
    let csv = first.csv;
    while (cursor) {
      const page = await readRunsExportPage(db, cursor);
      cursor = page.nextCursor;
      count += page.count;
      csv += page.csv;
    }
    assert.equal(count, 1002);
    assert.ok(!csv.includes('"new-'));
  } finally { db.sqlite.close(); }
});

test("bad cursors fail before any database query", async () => {
  const db = database();
  try {
    for (const cursor of ["", "garbage", "x".repeat(600), btoa("null"), btoa('{"maxRowId":-1}'), btoa('{}')]) {
      await assert.rejects(readRunsExportPage(db, cursor), /Invalid export cursor/);
    }
    assert.equal(db.queries, 0);
  } finally { db.sqlite.close(); }
});

test("older retained and legacy runs are not silently omitted; zero net worth is not blank", async () => {
  const db = database();
  try {
    db.sqlite.prepare(`INSERT INTO anonymous_runs (id, seed_code, game_version, started_at, final_net_worth)
      VALUES ('legacy', '00123456', 'v1.0.1', '2025-01-01 00:00:00', 0)`).run();
    const page = await readRunsExportPage(db, null);
    assert.equal(page.count, 1);
    assert.ok(page.csv.includes('"未記錄","無特殊體質"'));
    assert.ok(page.csv.includes('"剛開始","尚無操作",0,"—",0,'));
    assert.ok(page.csv.includes('"\'00123456"'));
  } finally { db.sqlite.close(); }
});

test("admin endpoint denies unauthenticated requests before database access", async () => {
  auth.allowed = false;
  dbAccesses = 0;
  const response = await GET(new Request("http://localhost/api/admin/runs-export"));
  assert.equal(response.status, 401);
  assert.equal(dbAccesses, 0);
  assert.match(response.headers.get("cache-control"), /no-store/);
  auth.allowed = true;
});

test("admin endpoint serves complete chunks and handles invalid cursors/errors without exposing data", async () => {
  const db = database();
  routeDb = db;
  try {
    seed(db, 501);
    const response = await GET(new Request("http://localhost/api/admin/runs-export"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /private, no-store/);
    assert.match(response.headers.get("x-robots-tag"), /noindex/);
    const page = await response.json();
    assert.equal(page.count, 500);
    const second = await GET(new Request(`http://localhost/api/admin/runs-export?cursor=${page.nextCursor}`));
    assert.equal((await second.json()).count, 1);
    assert.equal((await GET(new Request("http://localhost/api/admin/runs-export?cursor=bad"))).status, 400);
    routeDb = { prepare: () => { throw new Error("sensitive SQL details"); } };
    const failed = await GET(new Request("http://localhost/api/admin/runs-export"));
    assert.equal(failed.status, 503);
    assert.ok(!(await failed.text()).includes("sensitive SQL"));
  } finally { db.sqlite.close(); }
});

test("export button has clear full-export wording and is not a capped raw-CSV link", () => {
  const { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const { createElement } = nativeRequire("react");
  const Button = load("app/admin/export-runs-button.tsx").default;
  const html = renderToStaticMarkup(createElement(Button));
  assert.ok(html.includes("匯出全部紀錄 CSV"));
  assert.ok(html.includes("不限畫面上的 20 局"));
  assert.ok(html.includes('aria-live="polite"'));
});
