// Offline regression checks. Execute the real income handler without React or analytics.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync('app/page.tsx', 'utf8');
const css = fs.readFileSync('app/globals.css', 'utf8');
const wiki = fs.readFileSync('WIKI.md', 'utf8');
const approximateSimulator = fs.readFileSync('scripts/simulate-full-life.mjs', 'utf8');
const currentSimulator = fs.readFileSync('scripts/simulate-current-game.mjs', 'utf8');
const simulationRunner = fs.readFileSync('scripts/run-current-simulation.mjs', 'utf8');
const directionExporter = fs.readFileSync('scripts/export-core-event-directions.mjs', 'utf8');
const titleExporter = fs.readFileSync('scripts/export-event-titles.mjs', 'utf8');
const parsed = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const home = parsed.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'Home');
const handler = home.body.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'chooseIncomePath').getText(parsed);
const prefix = source.slice(0, home.getStart(parsed));
const moduleSource = `${prefix}
export { makeGame, familySupportAmount, familySupportChance, achievementsFor, GAME_VERSION };
export function runIncome(initial, path, suppliedRolls) {
  const game = initial;
  const rolls = [...suppliedRolls];
  let result = initial, notice = null;
  const createGameRandom = () => () => rolls.shift() ?? .999999;
  const setGame = next => { result = next; };
  const setIncomeNotice = next => { notice = next; };
  const trackAnonymous = () => {};
  ${handler}
  chooseIncomePath(path);
  return { game: result, notice };
}`;
function compile(text, dependencies) {
  const cjsModule = { exports: {} };
  const js = ts.transpileModule(text, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(js, { module:cjsModule, exports:cjsModule.exports, Math,
    require: name => { assert(name in dependencies, `Unexpected import ${name}`); return dependencies[name]; },
    fetch: () => { throw new Error('Network is forbidden'); },
  });
  return cjsModule.exports;
}
const catalog = compile(fs.readFileSync('app/event-catalog.ts', 'utf8'), {});
const gameApi = compile(moduleSource, { './event-catalog': catalog, 'react/jsx-runtime': { jsx:()=>null, jsxs:()=>null } });
function initial(overrides = {}) {
  const game = gameApi.makeGame('', 'RELEASE106');
  return { ...game, trait:'數字敏感', cash:300000, gauges:{ health:80,stress:20,family:60,knowledge:20,credit:65 }, ...overrides };
}

test('v1.0.6 is consistent across the game, package and Wiki', () => {
  assert.equal(gameApi.GAME_VERSION, 'v1.0.6');
  assert.equal(JSON.parse(fs.readFileSync('package.json','utf8')).version, '1.0.6');
  assert.match(wiki, /適用版本：`v1\.0\.6`/);
});
test('producer Threads link is safe, focusable and pointer-enabled', () => {
  assert.match(source, /href="https:\/\/www\.threads\.com\/@kt48wu\?igshid=NTc4MTIwNjQ2YQ=" target="_blank" rel="noopener noreferrer"/);
  assert.match(css, /\.start-meta a\{[^}]*pointer-events:auto/);
  assert.match(css, /\.start-meta a:focus-visible\{/);
});
test('cold-start outcomes cover 0 to 100000 while preserving the 12% breakout boundary', () => {
  for (const [roll, amountRoll, expected] of [[0,0,20000],[.119999,.999999,100000],[.12,0,0],[.299999,.999999,20000],[.3,0,0]]) {
    const before = initial();
    const { game } = gameApi.runIncome(before,'kol',[roll,amountRoll]);
    assert.equal(game.income,expected);
    assert.equal(game.cash,before.cash,'Annual income must not immediately become cash');
    assert.equal(game.occupation,'投資KOL');
  }
  assert.match(source,/冷啟動期 · 收入 0～10 萬/);
});
test('later KOL income still caps at 1560000', () => {
  const { game } = gameApi.runIncome(initial({year:2,kolReputation:100,gauges:{health:80,stress:20,family:60,knowledge:95,credit:65},lastYearReadAccuracy:1}),'kol',[0,.999999]);
  assert.equal(game.income,1560000);
});
test('ordinary family support spans 210000 to 330000, rounded to thousands', () => {
  for(let family=0;family<=100;family++) {
    const g=initial();g.gauges.family=family;
    assert.equal(gameApi.familySupportAmount(g),Math.min(330000,Math.round((210000+family*1500)/1000)*1000));
  }
});
test('family backer annual support is fixed at 500000', () => {
  assert.equal(gameApi.familySupportAmount(initial({trait:'家族靠山'})),500000);
});
test('approved support is deferred income, not debt; first-year relationship cost remains four', () => {
  const before=initial(), {game,notice}=gameApi.runIncome(before,'family',[0]);
  assert.equal(game.income,300000);assert.equal(game.cash,before.cash);assert.equal(game.debt,before.debt);
  assert.equal(game.gauges.family,56);assert.equal(game.gauges.health,80);assert.equal(game.gauges.stress,22);
  assert.equal(game.familySupportStreak,1);assert.match(notice.body,/300,000/);
});
test('rejected support gives 180000 and applies family -5, health -2, stress +8', () => {
  const before=initial(), {game,notice}=gameApi.runIncome(before,'family',[.999999]);
  assert.equal(game.income,180000);assert.equal(game.cash,before.cash);assert.equal(game.debt,before.debt);
  assert.equal(game.gauges.family,55);assert.equal(game.gauges.health,78);assert.equal(game.gauges.stress,28);
  assert.equal(game.familySupportStreak,1);assert(notice.deltas.includes('家庭關係 −5'));
  assert.match(notice.body,/180,000/);assert.match(source,/若遭拒會改接18萬元臨時零工、家庭關係 −5/);
});
test('family chance and repeated requests keep their existing rules', () => {
  const before=initial({familySupportStreak:2});
  assert(Math.abs(gameApi.familySupportChance(before)-.62)<1e-12);
  const {game}=gameApi.runIncome(before,'family',[0]);
  assert.equal(game.gauges.family,52);assert.equal(game.familySupportStreak,3);
  assert.equal(gameApi.runIncome(game,'family',[0]).game,game);
});
test('paper hands diamond requires surviving to 31 with strictly more than 15000000', () => {
  const achievement = cash => gameApi.achievementsFor(initial({age:31,specialTrait:'紙手體質',cash,debt:0,assets:[]})).find(item => item.id === 'paperHandsDiamond');
  assert.equal(achievement(15000000).unlocked,false);
  assert.equal(achievement(15000001).unlocked,true);
  assert.equal(achievement(15000001).title,'紙手變鑽石手');
  assert.equal(achievement(15000001).tier,'傳說');
  assert.equal(gameApi.achievementsFor(initial({age:30,specialTrait:'紙手體質',cash:20000000,debt:0,assets:[]})).find(item => item.id === 'paperHandsDiamond').unlocked,false);
  assert.equal(gameApi.achievementsFor(initial({age:31,specialTrait:null,cash:20000000,debt:0,assets:[]})).find(item => item.id === 'paperHandsDiamond').unlocked,false);
});
test('late confirmation lens uses A +9, B +8 and C +4 percentage points', () => {
  const event = catalog.buildLifeEventDeck(106,20).find(item => item.lensIndex === 3);
  assert(event);
  assert.equal(event.lensEffect.readAccuracyModifiers.research,.09);
  assert.equal(event.lensEffect.readAccuracyModifiers.observe,.08);
  assert.equal(event.lensEffect.readAccuracyModifiers.trend,.04);
  assert.match(event.lensEffect.detail,/\+9%／\+8%／\+4%/);
});
test('mobile wealth chart uses a full-width SVG coordinate system', () => {
  const wealthChart = source.slice(source.indexOf('function WealthHistoryChart'), source.indexOf('async function endingCardPng'));
  assert.match(source,/className="wealth-chart-lines" viewBox="0 0 100 100" preserveAspectRatio="none"/);
  assert.match(css,/\.wealth-chart-layout\{display:flex;width:100%;min-width:0/);
  assert.match(css,/\.wealth-chart-plot\{[^}]*flex:1 1 0;[^}]*min-width:0/);
  assert.match(css,/\.wealth-chart-scale\{[^}]*white-space:nowrap/);
  assert(!wealthChart.includes('Math.hypot'));
});
test('Wiki includes v1.0.6 figures and existing event effects', () => {
  for(const expected of ['0～100,000','210,000～330,000','500,000','180,000','家庭關係 **−5**','四種事件角度','×1.25','×0.75','1.5 倍','紙手變鑽石手','15,000,000','A 查證 +9%','B 觀察 +8%','C 跟上流量 +4%']) assert(wiki.includes(expected),expected);
  assert(!wiki.includes('0～60,000'));assert(!wiki.includes('NT$ 120,000'));
});
test('local simulation and event export tools follow the current v1.0.6 rules', () => {
  for (const sourceText of [currentSimulator, simulationRunner]) assert(!sourceText.includes('QA104'));
  for (const sourceText of [directionExporter, titleExporter]) assert(!sourceText.includes('v1.0.3'));
  assert.match(approximateSimulator, /FAMILY_BACKER_ANNUAL_SUPPORT = 500000/);
  assert.match(approximateSimulator, /Math\.min\(330000, Math\.max\(210000/);
  assert.match(approximateSimulator, /game\.income = approved \? support : 180000/);
  assert.match(approximateSimulator, /approved \? strain : 5/);
  assert.match(approximateSimulator, /paperHandsDiamond/);
  assert.match(approximateSimulator, /net > 15000000/);
  assert.match(directionExporter, /\+9%／\+8%／\+4%/);
  assert.match(directionExporter, /core-event-market-directions-v\$\{gameVersion\}/);
  assert.match(titleExporter, /event-catalog-v\$\{gameVersion\}/);
  assert.match(currentSimulator, /seedPrefix = process\.argv\[5\] \?\? `QA\$\{app\.GAME_VERSION/);
  assert.match(simulationRunner, /seedPrefix = `QA\$\{packageVersion/);
});
