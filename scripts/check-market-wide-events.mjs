import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const pageSource = fs.readFileSync("app/page.tsx", "utf8");
const catalogSource = fs.readFileSync("app/event-catalog.ts", "utf8");
const parsed = ts.createSourceFile("page.tsx", pageSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const home = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "Home");
assert(home, "Home component is missing");

function compile(source, dependencies) {
  const cjsModule = { exports: {} };
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(output, {
    module: cjsModule,
    exports: cjsModule.exports,
    Math,
    require: (name) => {
      assert(name in dependencies, `Unexpected import ${name}`);
      return dependencies[name];
    },
  });
  return cjsModule.exports;
}

const catalog = compile(catalogSource, {});
const moduleSource = `${pageSource.slice(0, home.getStart(parsed))}
export { brokerCatalog, eventTargetsForEvent, createMarketIntel, makeGame, marketScopeCategories, marketScopeLabel };`;
const gameApi = compile(moduleSource, {
  "./event-catalog": catalog,
  "react/jsx-runtime": { jsx: () => null, jsxs: () => null },
});

const eventFor = (topic, lensIndex = 0) => {
  const event = catalog.events.find((item) => item.topic === topic && item.lensIndex === lensIndex);
  assert(event, `Missing event ${topic}`);
  return event;
};
const key = (target) => `${target.category}:${target.name}`;

test("only audited system-wide topics carry a market scope", () => {
  assert.equal(eventFor("台股兩萬點").marketScope, "taiwan");
  assert.equal(eventFor("聯準會預防性降息").marketScope, "us");
  assert.equal(eventFor("全球熔斷").marketScope, "global");
  assert.equal(eventFor("晶片荒").marketScope, undefined);
  assert.equal(eventFor("科技股年底重挫").marketScope, undefined);
  assert.equal(catalog.events.filter((event) => event.marketScope).length, 72);
});

test("Taiwan and US market events reach every listed stock in that market", () => {
  for (const [topic, category] of [["台股兩萬點", "台股"], ["聯準會預防性降息", "美股"]]) {
    const event = eventFor(topic);
    const targets = gameApi.eventTargetsForEvent(event);
    const scopedAssets = gameApi.brokerCatalog.filter((asset) => asset.category === category);
    for (const asset of scopedAssets) assert(targets.some((target) => key(target) === key(asset)), `${topic} did not reach ${key(asset)}`);
    assert(targets.filter((target) => target.role === "market").every((target) => target.category === category));
  }
});

test("global events reach both Taiwan and US stocks without duplicate signals", () => {
  const targets = gameApi.eventTargetsForEvent(eventFor("全球熔斷"));
  const scopedAssets = gameApi.brokerCatalog.filter((asset) => ["台股", "美股"].includes(asset.category));
  for (const asset of scopedAssets) assert(targets.some((target) => key(target) === key(asset)), `Global event did not reach ${key(asset)}`);
  assert.equal(new Set(targets.map(key)).size, targets.length);
});

test("company or industry events still use only primary and linked targets", () => {
  for (const topic of ["晶片荒", "科技股年底重挫"]) {
    const targets = gameApi.eventTargetsForEvent(eventFor(topic));
    assert.deepEqual(Array.from(targets, (target) => target.role), ["primary", "linked"]);
  }
  const techSelloffTargets = gameApi.eventTargetsForEvent(eventFor("科技股年底重挫"));
  assert.deepEqual(Array.from(techSelloffTargets, (target) => target.name), ["水龍頭成長股", "皮衣算力"]);
});

test("market spillover is weaker than linked and primary signals and lasts one quarter", () => {
  const event = eventFor("全球熔斷", 2);
  const targets = gameApi.eventTargetsForEvent(event);
  const game = gameApi.makeGame("", "SCOPE-QA");
  const intels = targets.map((target, index) => gameApi.createMarketIntel(game, event, "research", target, index));
  const primary = intels.find((intel) => intel.signal.role === "primary");
  const linked = intels.find((intel) => intel.signal.role === "linked");
  const market = intels.filter((intel) => intel.signal.role === "market");
  assert(primary && linked && market.length > 0);
  assert(primary.signal.strength > linked.signal.strength);
  for (const intel of market) {
    assert.equal(intel.signal.totalMonths, 3);
    assert.equal(intel.signal.remainingMonths, 3);
    assert.equal(intel.record.readDirection, null);
    assert.equal(intel.signal.direction, primary.signal.direction);
    assert(intel.signal.strength >= .05 * event.lensEffect.signalStrengthMultiplier);
    assert(intel.signal.strength <= .08 * event.lensEffect.signalStrengthMultiplier);
    assert(intel.signal.strength < primary.signal.strength);
  }
});
