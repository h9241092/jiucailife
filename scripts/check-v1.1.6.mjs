// Offline v1.1.7 release checks plus v1.1.6 rare-trait regression checks.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const source = fs.readFileSync("app/page.tsx", "utf8");
const wiki = fs.readFileSync("WIKI.md", "utf8");
const readme = fs.readFileSync("README.md", "utf8");
const parsed = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const home = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "Home");
const incomeHandler = home.body.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "chooseIncomePath").getText(parsed);
const healthHandler = home.body.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "closeQuarterWithHealthCheck").getText(parsed);
const prefix = source.slice(0, home.getStart(parsed));
const moduleSource = `${prefix}
export { makeGame, familySupportAmount, chairmanTipSeasonsFor, isChairmanTipPeriod, createChairmanTip, achievementsFor, titleForEnding, specialTraitSlots, GAME_VERSION, seededInitialGauge, initialGaugeRanges, brokerCatalog };
export function runIncome(initial, path, roll) {
  const game = initial;
  let result = initial, notice = null;
  const createGameRandom = () => () => roll;
  const setGame = next => { result = next; };
  const setIncomeNotice = next => { notice = next; };
  const trackAnonymous = () => {};
  ${incomeHandler}
  chooseIncomePath(path);
  return { game: result, notice };
}
export function runQuarterHealth(initial, roll) {
  let result = initial;
  const createGameRandom = () => () => roll;
  const setGame = next => { result = next; };
  const advanceClosedMonth = next => { result = next; };
  const setIllnessEvent = () => {};
  const setIllnessNotice = () => {};
  ${healthHandler}
  closeQuarterWithHealthCheck({ ...initial, illnessCooldown: 1 });
  return result;
}`;

function compile(text, dependencies) {
  const cjsModule = { exports: {} };
  const js = ts.transpileModule(text, { compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(js, {
    module: cjsModule,
    exports: cjsModule.exports,
    Math,
    require: (name) => {
      assert(name in dependencies, `Unexpected import ${name}`);
      return dependencies[name];
    },
    fetch: () => { throw new Error("Network is forbidden"); },
  });
  return cjsModule.exports;
}

const catalog = compile(fs.readFileSync("app/event-catalog.ts", "utf8"), {});
const game = compile(moduleSource, { "./event-catalog": catalog, "react/jsx-runtime": { jsx: () => null, jsxs: () => null } });

test("current version is synchronized and the v1.1.6 public release note stays intentionally minimal", () => {
  const version = `v${JSON.parse(fs.readFileSync("package.json", "utf8")).version}`;
  assert.equal(game.GAME_VERSION, version);
  assert(readme.includes(`目前版本：\`${version}\``));
  assert(wiki.includes(`適用版本：\`${version}\``));
  const releaseNote = readme.slice(readme.indexOf("## v1.1.6"), readme.indexOf("## v1.1.5"));
  assert.equal(releaseNote.trim(), "## v1.1.6 更新內容\n\n- 新增特殊人物性質。");
  for (const spoiler of ["你爸是董座", "董事餐桌耳語", "拎北是天公仔"]) {
    assert(!readme.includes(spoiler), `README leaked ${spoiler}`);
    assert(!wiki.includes(spoiler), `WIKI leaked ${spoiler}`);
  }
});

test("pressure-heavy starts at base stress plus twenty and stays deterministic", () => {
  let count = 0;
  for (let index = 0; index < 1000; index += 1) {
    const seed = `V117-STRESS-${index}`;
    const candidate = game.makeGame("", seed);
    if (candidate.trait !== "壓力山大") continue;
    count += 1;
    assert.equal(candidate.gauges.stress, game.seededInitialGauge(seed, "stress") + 20);
    assert(candidate.gauges.stress >= 34 && candidate.gauges.stress <= 50);
    assert.equal(game.makeGame("", seed).gauges.stress, candidate.gauges.stress);
  }
  assert(count > 0);
});

test("rejected family support defers 240000 income with the new costs, without adding debt", () => {
  const initial = game.makeGame("", "V117-REJECT");
  initial.gauges = { ...initial.gauges, family: 60, health: 80, stress: 20 };
  const { game: result, notice } = game.runIncome(initial, "family", .999999);
  assert.equal(result.income, 240000);
  assert.equal(result.cash, initial.cash);
  assert.equal(result.debt, initial.debt);
  assert.equal(result.gauges.family, 54);
  assert.equal(result.gauges.health, 77);
  assert.equal(result.gauges.stress, 28);
  assert(notice.deltas.includes("家庭關係 −6"));
  assert(notice.deltas.includes("健康 −3"));
});

test("stress damage uses exactly 33.3 percent only within the 75 to 89 bracket", () => {
  const initial = game.makeGame("", "V117-HEALTH");
  const run = (stress, roll) => game.runQuarterHealth({ ...initial, gauges: { ...initial.gauges, stress, health: 80 } }, roll).gauges.health;
  assert.equal(run(74, 0), 80);
  for (const stress of [75, 89]) {
    assert.equal(run(stress, .332999), 79);
    assert.equal(run(stress, .333), 80);
    assert.equal(run(stress, .34), 80);
  }
  assert.equal(run(90, .499999), 78);
  assert.equal(run(90, .5), 80);
});

test("renamed ETF keeps 195 initial price and every event link resolves to the broker catalog", () => {
  const initial = game.makeGame("", "V117-ETF");
  assert.equal(game.brokerCatalog.length, 12);
  assert.equal(initial.marketQuotes["ETF:00午靈"].price, 195);
  const keys = new Set(game.brokerCatalog.map(asset => `${asset.category}:${asset.name}`));
  for (const event of catalog.events) {
    for (const asset of [event.linkedAsset, ...event.choices.map(choice => choice.asset)].filter(Boolean)) {
      assert(keys.has(`${asset.category}:${asset.name}`), `${event.id}: ${asset.name}`);
      assert.notEqual(asset.name, "靈靈舞靈");
    }
  }
});

test("ordinary family backer is restored to 500000 cash and 500000 support", () => {
  let backer;
  for (let index = 0; index < 5000 && !backer; index += 1) {
    const candidate = game.makeGame("", `V116-FAMILY-${index}`);
    if (candidate.trait === "家族靠山" && candidate.specialTrait !== "你爸是董座") backer = candidate;
  }
  assert(backer);
  assert.equal(backer.cash, 500000);
  assert.equal(game.familySupportAmount(backer), 500000);
  assert.match(wiki, /起始現金額外 \+NT\$ 200,000/);
  assert.match(wiki, /固定獲得 NT\$ 500,000/);
});

test("chairman child is only a five-percent upgrade of family backer and replaces the normal secondary trait", () => {
  let familyCount = 0;
  let rareCount = 0;
  let rareGame;
  for (let index = 0; index < 30000; index += 1) {
    const candidate = game.makeGame("", `V116-ROLL-${index}`);
    if (candidate.trait !== "家族靠山") {
      assert.notEqual(candidate.specialTrait, "你爸是董座");
      continue;
    }
    familyCount += 1;
    if (candidate.specialTrait === "你爸是董座") {
      rareCount += 1;
      rareGame ??= candidate;
    }
  }
  assert(rareGame);
  const rate = rareCount / familyCount;
  assert(rate > .04 && rate < .06, `upgrade rate was ${(rate * 100).toFixed(2)}%`);
  assert.equal(rareGame.trait, "家族靠山");
  assert.equal(rareGame.specialTrait, "你爸是董座");
  assert.equal(rareGame.cash, 800000);
  assert.equal(game.familySupportAmount(rareGame), 1000000);
  assert(!game.specialTraitSlots.includes("你爸是董座"));
});

test("family-table intelligence appears in exactly two distinct seasons each year and replaces the first news slot", () => {
  const rare = Array.from({ length: 10000 }, (_, index) => game.makeGame("", `V116-TIP-${index}`))
    .find((candidate) => candidate.specialTrait === "你爸是董座");
  assert(rare);
  for (let year = 1; year <= 9; year += 1) {
    const seasons = Array.from(game.chairmanTipSeasonsFor({ ...rare, year }));
    assert.equal(seasons.length, 2);
    assert.equal(new Set(seasons).size, 2);
    for (let season = 0; season < 4; season += 1) {
      assert.equal(game.isChairmanTipPeriod({ ...rare, year, season, month: 0 }), seasons.includes(season));
      assert.equal(game.isChairmanTipPeriod({ ...rare, year, season, month: 1 }), false);
    }
  }
});

test("family-table intelligence is free, explicit, retained and follows the 88/12 truth rule", () => {
  let truthful = 0;
  for (let index = 0; index < 10000; index += 1) {
    const base = game.makeGame("", `V116-TRUTH-${index}`);
    const tip = game.createChairmanTip({ ...base, specialTrait: "你爸是董座", year: index % 9 + 1, season: index % 4, month: 0 });
    truthful += tip.truthful ? 1 : 0;
    assert([1, 2].includes(tip.durationQuarters));
    assert.equal(tip.record.source, "家族飯桌");
    assert.equal(tip.record.readDirection, tip.predictedDirection);
    assert.equal(tip.signal.totalMonths, tip.durationQuarters * 3);
  }
  const rate = truthful / 10000;
  assert(rate > .87 && rate < .89, `truth rate was ${(rate * 100).toFixed(2)}%`);
  assert.match(source, /intelRecords: \[currentChairmanTip\.record/);
  assert.match(source, /currentChairmanTip \? \[currentChairmanTip\.target\]/);
});

test("the rare trait receives only its unique ending achievement and exact ending line", () => {
  const rare = Array.from({ length: 10000 }, (_, index) => game.makeGame("", `V116-END-${index}`))
    .find((candidate) => candidate.specialTrait === "你爸是董座");
  assert(rare);
  const ending = { ...rare, phase: "ending", age: 31 };
  const achievements = game.achievementsFor(ending);
  assert.equal(achievements.length, 1);
  assert.equal(achievements[0].title, "拎北是天公仔");
  assert.equal(achievements[0].unlocked, true);
  assert.deepEqual(Array.from(game.titleForEnding(ending)), ["拎北是天公仔", "因為出身能爽爽賺又能騙吃騙喝是不是很爽 哈哈!!!"]);
});
