// Offline release checks for v1.1.5 secondary traits and living costs.
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
const prefix = source.slice(0, home.getStart(parsed));
const moduleSource = `${prefix}
export { makeGame, annualLivingCost, annualCareerIncome, careerEventIncome, kolAnnualIncomeCap, specialTraitSlots, GAME_VERSION };`;

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

test("v1.1.5 is synchronized across game, package and public docs", () => {
  assert.equal(game.GAME_VERSION, "v1.1.5");
  assert.equal(JSON.parse(fs.readFileSync("package.json", "utf8")).version, "1.1.5");
  assert.match(readme, /目前版本：`v1\.1\.5`/);
  assert.match(wiki, /適用版本：`v1\.1\.5`/);
});

test("secondary trait slots preserve paper hands and add two traits at one sixth each", () => {
  assert.deepEqual(Array.from(game.specialTraitSlots), ["紙手體質", "工作狂", "記帳強迫症", null, null, null]);
  const allowed = new Set(["紙手體質", "工作狂", "記帳強迫症", null]);
  for (let index = 0; index < 1000; index += 1) {
    assert(allowed.has(game.makeGame("", `V115-${index}`).specialTrait));
  }
});

test("living costs start at 288000 and bookkeeping reduces them by eight percent", () => {
  assert.equal(game.annualLivingCost(1, null), 288000);
  assert.equal(game.annualLivingCost(1, "記帳強迫症"), 265000);
  assert.equal(game.annualLivingCost(2, null), 294000);
  assert.equal(game.annualLivingCost(2, "記帳強迫症"), 270000);
  assert.match(source, /bookkeepingCreditBonus = bookkeeping && annualDebtAdded <= 0 \? 1 : 0/);
  assert.match(source, /bookkeepingDebtStress = bookkeeping && debt > 0 \? 2 : 0/);
});

test("workaholic income and caps use the agreed multipliers", () => {
  assert.equal(game.annualCareerIncome(480000, null), 480000);
  assert.equal(game.annualCareerIncome(480000, "工作狂"), 518000);
  assert.equal(game.careerEventIncome(100000, "工作狂"), 115000);
  assert.equal(game.kolAnnualIncomeCap(null), 1560000);
  assert.equal(game.kolAnnualIncomeCap("工作狂"), 1800000);
  assert.match(source, /const healthCost = workHealthCost\(consecutiveYears\).+\(workaholic \? 1 : 0\)/);
  assert.match(source, /const stressCost = 8.+\(workaholic \? 2 : 0\)/);
});

test("public Wiki documents all three secondary traits", () => {
  for (const expected of ["紙手體質", "工作狂", "記帳強迫症", "NT$ 1,800,000", "NT$ 288,000"]) {
    assert(wiki.includes(expected), expected);
  }
});
