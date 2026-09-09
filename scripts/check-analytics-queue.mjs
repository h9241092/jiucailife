// Offline analytics regression checks. No requests are sent to production.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync("app/analytics.ts", "utf8");
const reportSource = fs.readFileSync("lib/analytics-report.ts", "utf8");
const adminSource = fs.readFileSync("app/admin/page.tsx", "utf8");
const adminCss = fs.readFileSync("app/admin/admin.css", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadAnalytics({ online = true, fetchImpl }) {
  const values = new Map();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  let uuid = 0;
  const window = {
    localStorage,
    navigator: { onLine: online },
    addEventListener: () => {},
    setTimeout,
    clearTimeout,
  };
  const mod = { exports: {} };
  vm.runInNewContext(js, {
    module: mod,
    exports: mod.exports,
    window,
    fetch: fetchImpl ?? (async () => ({ ok: true, status: 202 })),
    crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, "0")}` },
    setTimeout,
    clearTimeout,
    JSON,
  });
  return { api: mod.exports, values };
}

const event = (eventType, eventSequence) => ({
  runId: "10000000-0000-4000-8000-000000000001",
  eventType,
  gameVersion: "v-test",
  eventSequence,
});

async function waitUntil(check, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for analytics flush");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test("an event queued during an in-flight request is not overwritten by the old queue snapshot", async () => {
  const sent = [];
  let releaseFirst;
  const firstResponse = new Promise((resolve) => { releaseFirst = resolve; });
  const { api, values } = loadAnalytics({
    fetchImpl: async (_url, init) => {
      sent.push(JSON.parse(init.body));
      if (sent.length === 1) return firstResponse;
      return { ok: true, status: 202 };
    },
  });

  api.postAnonymousAnalytics(event("run_started", 0));
  await waitUntil(() => sent.length === 1);
  api.postAnonymousAnalytics(event("run_completed", 1));
  releaseFirst({ ok: true, status: 202 });
  await waitUntil(() => sent.length === 2 && !values.has("jiucai-anonymous-analytics-v2"));

  assert.deepEqual(sent.map((item) => item.eventType), ["run_started", "run_completed"]);
});

test("terminal events survive queue trimming even if later ordinary events are added", () => {
  const { api, values } = loadAnalytics({ online: false });
  api.postAnonymousAnalytics(event("run_started", 0));
  api.postAnonymousAnalytics(event("run_completed", 1));
  for (let sequence = 2; sequence < 452; sequence += 1) {
    api.postAnonymousAnalytics(event("trade", sequence));
  }
  const queue = JSON.parse(values.get("jiucai-anonymous-analytics-v2"));
  assert.equal(queue.length, 400);
  assert(queue.some((item) => item.eventType === "run_completed"));
});

test("admin separates explicit departures from stale runs awaiting confirmation", () => {
  assert.match(reportSource, /status = 'abandoned' THEN 1 ELSE 0 END\) AS abandoned_runs/);
  assert.match(reportSource, /status = 'active' AND last_seen_at < datetime\('now', '-30 minutes'\).*AS stale_runs/);
  assert.match(adminSource, /summary\.staleRuns/);
  assert.match(adminCss, /\.status-逾時未確認/);
});
