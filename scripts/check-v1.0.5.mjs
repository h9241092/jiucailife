// Offline regression checks. Execute the real income handler without React or analytics.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync('app/page.tsx', 'utf8');
const css = fs.readFileSync('app/globals.css', 'utf8');
const wiki = fs.readFileSync('WIKI.md', 'utf8');
const parsed = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const home = parsed.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'Home');
const handler = home.body.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'chooseIncomePath').getText(parsed);
const prefix = source.slice(0, home.getStart(parsed));
const moduleSource = `${prefix}
export { makeGame, familySupportAmount, familySupportChance, GAME_VERSION };
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
  const game = gameApi.makeGame('', 'RELEASE105');
  return { ...game, trait:'數字敏感', cash:300000, gauges:{ health:80,stress:20,family:60,knowledge:20,credit:65 }, ...overrides };
}

test('v1.0.5 is consistent across the game, package and Wiki', () => {
  assert.equal(gameApi.GAME_VERSION, 'v1.0.5');
  assert.equal(JSON.parse(fs.readFileSync('package.json','utf8')).version, '1.0.5');
  assert.match(wiki, /適用版本：`v1\.0\.5`/);
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
test('Wiki includes v1.0.5 figures and existing v1.0.4 event effects', () => {
  for(const expected of ['0～100,000','210,000～330,000','500,000','180,000','家庭關係 **−5**','四種事件角度','×1.25','×0.75','1.5 倍']) assert(wiki.includes(expected),expected);
  assert(!wiki.includes('0～60,000'));assert(!wiki.includes('NT$ 120,000'));
});
