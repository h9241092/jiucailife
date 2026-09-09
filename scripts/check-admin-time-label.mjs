// Offline timezone regression checks. No D1 access or analytics requests.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync("lib/analytics-time-label.ts", "utf8");
const mod = { exports: {} };
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(js, { module: mod, exports: mod.exports, Intl, Date, Number, Object });
const { taiwanTimeLabel } = mod.exports;

test("D1 UTC timestamp is displayed as Taiwan time on the next day", () => {
  assert.equal(taiwanTimeLabel("2026-09-06 23:25:00"), "2026-09-07 07:25");
});

test("explicit UTC ISO timestamps use the same conversion", () => {
  assert.equal(taiwanTimeLabel("2026-09-06T22:53:00Z"), "2026-09-07 06:53");
});

test("timestamps carrying an explicit offset are not treated as UTC twice", () => {
  assert.equal(taiwanTimeLabel("2026-09-07T06:43:00+08:00"), "2026-09-07 06:43");
});

test("conversion is fixed to Asia/Taipei rather than the computer timezone", () => {
  const instant = "2026-01-01T00:00:00Z";
  assert.equal(taiwanTimeLabel(instant), "2026-01-01 08:00");
  assert.equal(taiwanTimeLabel(instant), taiwanTimeLabel(instant));
});

test("invalid historical values remain readable", () => {
  assert.equal(taiwanTimeLabel("legacy timestamp"), "legacy timestamp");
  assert.equal(taiwanTimeLabel(""), "—");
});

test("admin column names the timezone and no longer truncates raw UTC", () => {
  const admin = fs.readFileSync("app/admin/page.tsx", "utf8");
  const runFormat = fs.readFileSync("lib/analytics-run-format.ts", "utf8");
  assert.match(admin, /<th>開始時間（台灣）<\/th>/);
  assert.match(admin, /runTimeLabel\(run\.startedAt\)/);
  assert.match(runFormat, /return taiwanTimeLabel\(value\)/);
  assert.doesNotMatch(admin, /run\.startedAt\.replace/);
});
