/** Local-only simulation: executes the current Home component's real handlers.
 * No production module is edited, no browser or analytics transport is loaded.
 * Usage: node scripts/simulate-current-game.mjs 10000 reports/current-10000 0 QA106 [paired|random] [policyOffset]
 */
/* eslint-disable @typescript-eslint/no-this-alias -- The hook harness intentionally exposes the active Runner instance. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';

const root = process.cwd();
const runsRequested = Number(process.argv[2] ?? 10000);
const outputDirArg = process.argv[3];
const seedOffset = Number(process.argv[4] ?? 0);
const seedMode = process.argv[6] ?? 'paired';
const policyOffset = Number(process.argv[7] ?? 0);
assert(runsRequested > 0, 'Run count must be positive');
assert(['paired','random'].includes(seedMode), 'Seed mode must be paired or random');
const sourcePath = path.join(root, 'app/page.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');
const catalogSource = fs.readFileSync(path.join(root, 'app/event-catalog.ts'), 'utf8');
let activeRunner;
let networkAttempts = 0;
const denyNetwork = () => { networkAttempts++; throw new Error('Network forbidden in local simulation'); };

// Only remove rendering and browser lifecycle effects. Game-state effects remain.
const ast = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const home = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'Home');
assert(home?.body);
const cutoff = home.body.statements.find(n => ts.isIfStatement(n) && n.expression.getText(ast) === '!game' && n.getText(ast).includes('<main'));
assert(cutoff, 'Could not locate the start of rendering');
const edits = [];
const exposed = [];
for (const statement of home.body.statements) {
  if (statement.pos >= cutoff.pos) break;
  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) exposed.push(declaration.name.text);
      else if (ts.isArrayBindingPattern(declaration.name)) {
        for (const element of declaration.name.elements) if (element.name && ts.isIdentifier(element.name)) exposed.push(element.name.text);
      }
      if (ts.isIdentifier(declaration.name) && declaration.name.text === 'trackAnonymous' && declaration.initializer) edits.push({
        start: declaration.initializer.getStart(ast), end: declaration.initializer.end,
        text: 'useCallback((eventType, data = {}, snapshot = game) => { __record(eventType, data, snapshot); }, [game])',
      });
    }
  }
  if (ts.isFunctionDeclaration(statement)) {
    exposed.push(statement.name.text);
    if (statement.name.text === 'trackAnonymous') edits.push({
      start: statement.body.pos, end: statement.body.end,
      text: '{ __record(eventType, data, snapshot); }',
    });
  }
  if (ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression)
    && statement.expression.expression.getText(ast) === 'useEffect') {
    const body = statement.getText(ast);
    if (body.includes('randomSeedCode()') || body.includes('analyticsLatestGame.current = game') || body.includes('window.addEventListener')) {
      edits.push({ start: statement.pos, end: statement.end, text: '\nuseEffect(() => {}, []);' });
    }
  }
}
edits.push({ start: cutoff.pos, end: home.body.end - 1, text: `\nreturn {${exposed.join(',')}};\n` });
let instrumented = source;
for (const edit of edits.sort((a,b) => b.start - a.start)) instrumented = instrumented.slice(0, edit.start) + edit.text + instrumented.slice(edit.end);
instrumented += '\nexport { makeGame, netWorth, achievementsFor, titleForEnding, brokerCatalog, creditLoanLimit, annualLivingCost, GAME_VERSION };\n';

const hooks = {
  useState(initial) {
    const r = activeRunner, i = r.index++;
    if (!(i in r.hooks)) r.hooks[i] = { value: typeof initial === 'function' ? initial() : initial };
    const entry = r.hooks[i];
    return [entry.value, value => {
      const next = typeof value === 'function' ? value(entry.value) : value;
      if (!Object.is(next, entry.value)) { entry.value = next; r.dirty = true; }
    }];
  },
  useRef(initial) {
    const r = activeRunner, i = r.index++;
    return r.hooks[i] ??= { current: initial };
  },
  useMemo(factory, deps) {
    const r = activeRunner, i = r.index++, old = r.hooks[i];
    if (!old || !equalDeps(old.deps, deps)) r.hooks[i] = { deps, value: factory() };
    return r.hooks[i].value;
  },
  useCallback(callback, deps) {
    const r = activeRunner, i = r.index++, old = r.hooks[i];
    if (!old || !equalDeps(old.deps, deps)) r.hooks[i] = { deps, value: callback };
    return r.hooks[i].value;
  },
  useEffect(callback, deps) {
    const r = activeRunner, i = r.index++, old = r.hooks[i];
    if (!old || !equalDeps(old.deps, deps)) r.effects.push(callback);
    r.hooks[i] = { deps };
  },
};
function equalDeps(a, b) { return a && b && a.length === b.length && a.every((v,i) => Object.is(v,b[i])); }
function compile(text, filename, dependencies) {
  const compiled = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const cjsModule = { exports: {} };
  const simulatedWindow = {
    setTimeout(callback) { callback(); return 0; },
    clearTimeout() {},
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches:false, addEventListener() {}, removeEventListener() {} }),
  };
  const sandbox = { module: cjsModule, exports: cjsModule.exports, console, URL, TextEncoder, Math,
    fetch: denyNetwork, window: simulatedWindow, navigator: undefined, document: undefined,
    __record: (type, data, game) => activeRunner.record(type, data, game),
    require: name => { if (!(name in dependencies)) throw new Error(`Blocked import: ${name}`); return dependencies[name]; },
  };
  vm.runInNewContext(compiled, sandbox, { filename });
  return cjsModule.exports;
}
const catalog = compile(catalogSource, 'event-catalog.cjs', {});
const eventById = new Map(catalog.events.map(e => [e.id,e]));
// Pure deck generation can be shared by the five policies using an identical seed.
const deckCache = new Map();
const cachedCatalog = { ...catalog, buildLifeEventDeck: (seed, years) => {
  const key = `${seed}:${years}`;
  if (!deckCache.has(key)) deckCache.set(key, catalog.buildLifeEventDeck(seed, years));
  return deckCache.get(key);
} };
const app = compile(instrumented, 'instrumented-current-page.cjs', {
  react: hooks,
  'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
  './event-catalog': cachedCatalog,
  './analytics': { createAnonymousRunId: denyNetwork, postAnonymousAnalytics: denyNetwork },
});
const seedPrefix = process.argv[5] ?? `QA${app.GAME_VERSION.replace(/\D/g, '')}`;
const outputDir = path.resolve(outputDirArg ?? `reports/${app.GAME_VERSION}-current-${runsRequested}`);

class Runner {
  hooks = []; index = 0; dirty = false; effects = []; view;
  logs = []; eventYears = new Map(); duplicateEvents = 0; duplicateCoreEvents = 0;
  topicYears = new Set(); readCounts = { directional:0,correct:0 }; lastReads = { year:0,directional:0,correct:0 };
  minHealth = 100; peakDebt = 0; peakNet = 0; maxDrawdown = 0; operations = 0;
  gaugeZeroCounts = {}; numericalFailures = 0; monthlySamples = 0;
  constructor(seed) { this.render(); this.view.setGame(app.makeGame('', seed)); this.render(); this.initial = structuredClone(this.view.game); }
  render() {
    activeRunner = this;
    let passes = 0;
    do {
      assert(++passes <= 20, 'Render/effect loop did not settle');
      this.dirty = false; this.index = 0; this.effects = [];
      this.view = app.default();
      for (const callback of this.effects) callback();
    } while (this.dirty);
    const g = this.view.game;
    if (g) {
      const net = app.netWorth(g);
      const nums = [net, g.cash, g.debt, g.familyDebt, g.income, ...Object.values(g.gauges), ...g.assets.flatMap(a => [a.value,a.cost])];
      assert(nums.every(Number.isFinite), 'Non-finite financial or ability value');
      assert(g.cash >= -.001 && g.debt >= -.001 && g.familyDebt <= g.debt + .001, 'Invalid cash/debt accounting');
      assert(Object.values(g.gauges).every(v => v >= 0 && v <= 100), 'Ability out of bounds');
      assert(g.gauges.health > 0 || g.phase === 'ending', 'Zero health did not end the game');
      this.minHealth = Math.min(this.minHealth, g.gauges.health);
      this.peakDebt = Math.max(this.peakDebt, g.debt);
      this.peakNet = Math.max(this.peakNet, net);
      if (this.peakNet > 0) this.maxDrawdown = Math.max(this.maxDrawdown, (this.peakNet - net) / this.peakNet);
    }
    return this.view;
  }
  call(name, ...args) { activeRunner = this; this.operations++; this.view[name](...args); return this.render(); }
  record(type, data, game) {
    this.logs.push({ type, data: { ...data }, year: game?.year, age: game?.age, season: game?.season, month: game?.month });
    if (type === 'event_choice') {
      const key = `${game.year}:${data.eventId}`;
      if (this.eventYears.has(key)) this.duplicateEvents++;
      this.eventYears.set(key, true);
      const topicKey = `${game.year}:${eventById.get(data.eventId)?.topicId}`;
      if (this.topicYears.has(topicKey)) this.duplicateCoreEvents++;
      this.topicYears.add(topicKey);
      if (this.lastReads.year !== game.year) this.lastReads = { year:game.year,directional:0,correct:0 };
      this.readCounts.directional += game.annualDirectionalReads - this.lastReads.directional;
      this.readCounts.correct += game.annualCorrectReads - this.lastReads.correct;
      this.lastReads = { year:game.year,directional:game.annualDirectionalReads,correct:game.annualCorrectReads };
    }
  }
}

const policies = [
  { id: 'safe', name: '穩健打工族', description: '每年打工；健康低於50優先B，否則知識未55選A、達標選B。只買ETF，每次25%，持有不賣；現金保留至少8萬及當年預計生活缺口。不主動貸款；生病以治療為主。' },
  { id: 'balanced', name: '均衡情報派', description: '前3年打工，之後健康低於55選家裡、否則打工。健康低於50選B，否則知識未73選A、達標後A60%／B35%／C5%。只讀玩家可见主要情報：看多買25%，看空賣50%；無方向不買，保留至少8萬及生活缺口。不主動貸款。' },
  { id: 'aggressive', name: '高風險KOL', description: '每年KOL；健康低於35選B，否則A25%／B15%／C60%。可見情報看多買50%、看空清倉，無方向隨機台美股或加密買50%；保留2萬。銀行負債低於30萬且淨資產正數時，每年嘗試50萬或100萬可用信貸；健康高於50遇病硬撐，否則治療。' },
  { id: 'family', name: '家裡支援派', description: '每年向家裡要資助；健康低於50或知識達55選B，其餘A。只買ETF，每次25%，持有不賣；保留至少8萬及生活缺口。每年现金不足5萬嘗試中額家庭借款，有足夠現金時償還；不主動銀行貸款。' },
  { id: 'random', name: '隨機韭菜', description: '工作與A/B/C等機率抽選；每次交易畫面40%買25%、20%隨機賣50%、40%不交易，保留2萬。每年20%嘗試10萬信貸。突襲、病況和家庭事件在有效選項中隨機選。' },
  { id: 'researcher', name: '深度研究派', description: '前2年打工累積本金，之後轉KOL；健康30以上固定選A查證，僅依可見多空交易，每次25%，看空賣50%。不借錢；職業事件偏向查證、道歉與配合調查。' },
  { id: 'cash', name: '現金觀望族', description: '每年打工、固定選B觀察，不主動買賣任何標的，也不借錢；職業事件一律拒絕額外負擔，作為不投資的現金基準組。' },
  { id: 'health', name: '健康優先派', description: '每年打工；健康低於70選B休養，否則選A研究。只依可見多空小額交易，看多買15%、看空賣50%；不借錢，職業事件拒絕額外負擔。' },
];
function seededRandom(seed) {
  let x = crypto.createHash('sha256').update(seed).digest().readUInt32LE(0);
  return () => { x += 0x6D2B79F5; let t = Math.imul(x ^ x >>> 15, 1 | x); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function pick(items, random) { return items[Math.floor(random() * items.length)]; }
function reserveFor(g, id) { return ['aggressive','random'].includes(id) ? 20000 : Math.max(80000, app.annualLivingCost(g.year, g.specialTrait) - g.income + 50000); }
function chooseCareer(g, id, random) {
  if (id === 'safe') return 'parttime';
  if (id === 'cash') return 'parttime';
  if (id === 'health') return 'parttime';
  if (id === 'researcher') return g.year <= 2 ? 'parttime' : 'kol';
  if (id === 'family') return 'family';
  if (id === 'aggressive') return 'kol';
  if (id === 'balanced') return g.year <= 3 || g.gauges.health >= 55 ? 'parttime' : 'family';
  return pick(['parttime','kol','family'], random);
}
function chooseABC(g, id, random) {
  if (id === 'random') return Math.floor(random() * 3);
  if (id === 'cash') return 1;
  if (id === 'health') return g.gauges.health < 70 ? 1 : 0;
  if (id === 'researcher') return g.gauges.health < 30 ? 1 : 0;
  if (id === 'aggressive') return g.gauges.health < 35 ? 1 : pick([0,0,0,0,0,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2], random);
  if (g.gauges.health < 50) return 1;
  if (['safe','family'].includes(id)) return g.gauges.knowledge < 55 ? 0 : 1;
  return g.gauges.knowledge < 73 ? 0 : pick([0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,2], random);
}
function manageDebt(r, id, random) {
  let g = r.view.game;
  if (g.phase === 'ending') return;
  const reserve = reserveFor(g, id);
  if (!['aggressive','random'].includes(id) && g.debt > g.familyDebt && g.cash - (g.debt - g.familyDebt) > reserve) r.call('repayInterestDebt', 1);
  g = r.view.game;
  if (id === 'family' && g.familyDebt > 0 && g.cash - g.familyDebt > reserve) r.call('repayFamilyLoan', 1);
  g = r.view.game;
  if (id === 'family' && g.cash < 50000 && g.lastFamilyBorrowYear !== g.year) r.call('requestFamilyLoan', 'medium');
  g = r.view.game;
  const debt = Math.max(0, g.debt - g.familyDebt);
  const capacity = Math.min(1000000, app.creditLoanLimit(g)) - debt;
  if (id === 'aggressive' && debt < 300000 && app.netWorth(g) > 0 && capacity >= 500000) r.call('requestCreditLoan', capacity >= 1000000 ? 1000000 : 500000);
  if (id === 'random' && random() < .2 && capacity >= 100000) r.call('requestCreditLoan', 100000);
  if (r.view.debtNotice) r.call('setDebtNotice', null);
}
function trade(r, id, random) {
  let g = r.view.game;
  if (id === 'cash') return;
  // New entries are prepended. Read only the visible direction, never activeSignals.direction.
  const newest = g.intelRecords[0];
  const primary = g.intelRecords.find(i => i.role === 'primary' && i.groupId === newest?.groupId);
  let target, ratio = .25;
  if (['safe','family'].includes(id)) target = pick(app.brokerCatalog.filter(a => a.category === 'ETF'), random);
  else if (id === 'random') {
    const roll = random();
    if (roll < .4) target = pick(app.brokerCatalog, random);
    else if (roll < .6 && g.assets.length) r.call('brokerSell', pick(g.assets,random), .5);
  } else {
    if (primary?.readDirection === 'bearish') {
      const held = g.assets.find(a => a.category === primary.targetCategory && a.name === primary.targetName);
      if (held) r.call('brokerSell', held, id === 'aggressive' ? 1 : .5);
    } else if (primary?.readDirection === 'bullish') target = app.brokerCatalog.find(a => a.category === primary.targetCategory && a.name === primary.targetName);
    else if (id === 'aggressive') target = pick(app.brokerCatalog.filter(a => a.category !== 'ETF'), random);
    if (id === 'aggressive') ratio = .5;
    if (id === 'health') ratio = .15;
  }
  g = r.view.game;
  if (target && g.cash >= 3000 && g.cash - Math.max(3000, g.cash * ratio) >= reserveFor(g,id)) r.call('brokerBuy', target, ratio);
}

function simulate(seed, policy, collectTrace = false) {
  const r = new Runner(seed), id = policy.id, random = seededRandom(`${seed}:${id}:policy`);
  let loops = 0;
  while (r.view.game.phase !== 'ending') {
    if (++loops >= 1000) {
      const stalled = r.view;
      throw new Error(`Stalled life: ${seed}/${id} ${JSON.stringify({ phase:stalled.game.phase, year:stalled.game.year, season:stalled.game.season, month:stalled.game.month, incomeNotice:Boolean(stalled.incomeNotice), careerEvent:stalled.careerEvent?.id, careerNotice:Boolean(stalled.careerNotice), familyEvent:Boolean(stalled.familyEvent), illnessEvent:Boolean(stalled.illnessEvent), illnessNotice:Boolean(stalled.illnessNotice), quarterSurprise:Boolean(stalled.quarterSurprise), quarterReport:Boolean(stalled.quarterReport), brokerOpen:stalled.brokerOpen, result:Boolean(stalled.game.result), currentEvent:stalled.currentEvent?.id })}`);
    }
    const v = r.view, g = v.game;
    if (v.incomeNotice) { r.call('closeIncomeNotice'); continue; }
    if (v.careerNotice) { r.call('closeCareerEvent'); continue; }
    if (v.careerEvent) {
      const choice = id === 'random' ? pick(['A','B'],random)
        : id === 'aggressive' ? (v.careerEvent.id === 'kol_investigation' || v.careerEvent.id === 'kol_asset_crash' ? 'B' : 'A')
        : id === 'researcher' ? (v.careerEvent.id === 'kol_investigation' || v.careerEvent.id === 'kol_asset_crash' ? 'A' : 'B')
        : id === 'safe' ? (v.careerEvent.id === 'mcd_promotion' || v.careerEvent.id === 'mcd_coworker_leave' ? 'A' : 'B')
        : 'B';
      r.call('resolveCareerEvent', choice); continue;
    }
    if (v.familyEvent) { r.call('resolveFamilyEvent', id === 'random' ? pick(['time','money','decline'],random) : 'time'); continue; }
    if (v.illnessNotice) { r.call('continueAfterIllness'); continue; }
    if (v.illnessEvent) {
      const action = id === 'random' ? pick(['push','treat','family'],random) : id === 'aggressive' && g.gauges.health > 50 ? 'push' : g.gauges.family >= 70 ? 'family' : 'treat';
      r.call('resolveIllness', action); continue;
    }
    if (v.quarterSurprise) {
      if (v.quarterSurprise.outcome) r.call('continueAfterSurprise');
      else {
        const s = v.quarterSurprise, held = g.assets.some(a => a.id === s.targetId);
        const mayAdd = g.cash >= 3000 && g.cash - Math.max(3000,g.cash*.25) >= reserveFor(g,id);
        let action = 'hold';
        if (id === 'random') action = pick(['hold', ...(mayAdd?['add']:[]), ...(held?['close']:[])],random);
        else if (id === 'balanced' || id === 'aggressive' || id === 'researcher') action = s.direction === 'bearish' && held ? 'close' : s.direction === 'bullish' && mayAdd ? 'add' : 'hold';
        r.call('revealQuarterSurprise', action);
      }
      continue;
    }
    if (v.quarterReport) { r.call('continueAfterQuarterReport'); continue; }
    if (g.phase === 'summary') { r.call('startNextYear'); continue; }
    if (g.lastIncomeChoiceYear !== g.year) { r.call('chooseIncomePath', chooseCareer(g,id,random)); continue; }
    if (r.debtManagedYear !== g.year) { r.debtManagedYear = g.year; manageDebt(r,id,random); continue; }
    if (v.pendingReduction) { r.call('confirmReduction', g.specialTrait === '紙手體質' ? 1 : .5); continue; }
    if (v.brokerOpen) { trade(r,id,random); r.call('closeBrokerMonth'); r.monthlySamples++; continue; }
    if (v.currentNewsHidden) { r.call('processHiddenNews'); continue; }
    if (g.result) { r.call('continueAfterResult'); continue; }
    assert(v.currentEvent && v.currentChoices.length === 3, 'Missing three-choice event');
    r.call('chooseEventOption', v.currentChoices[chooseABC(g,id,random)]);
  }
  const g = r.view.game;
  const achievements = app.achievementsFor(g).filter(a => a.unlocked).map(a => a.id);
  const counts = {}, choices = { A:0,B:0,C:0 }, incomePaths = {}, familyChoices = {}, careerChoices = {}, illnessChoices = {}, surpriseActions = {};
  let incomeTotal = 0, livingTotal = 0, interestTotal = 0, principalTotal = 0, shortfallTotal = 0;
  for (const log of r.logs) {
    counts[log.type] = (counts[log.type] ?? 0) + 1;
    if (log.type === 'event_choice') choices[log.data.choice]++;
    if (log.type === 'income_choice') incomePaths[log.data.incomePath] = (incomePaths[log.data.incomePath] ?? 0) + 1;
    if (log.type === 'family_event') familyChoices[log.data.choice] = (familyChoices[log.data.choice] ?? 0) + 1;
    if (log.type === 'career_event') careerChoices[`${log.data.eventId}:${log.data.choice}`] = (careerChoices[`${log.data.eventId}:${log.data.choice}`] ?? 0) + 1;
    if (log.type === 'illness_event') illnessChoices[log.data.choice] = (illnessChoices[log.data.choice] ?? 0) + 1;
    if (log.type === 'surprise_resolved') surpriseActions[log.data.action] = (surpriseActions[log.data.action] ?? 0) + 1;
  }
  // Year snapshots are captured directly from the real annualSummary via a local hook below.
  for (const a of r.annuals ?? []) { incomeTotal += a.incomeAdded; livingTotal += a.livingCost; interestTotal += a.interestPaid; principalTotal += a.creditPrincipalPaid; shortfallTotal += a.creditPaymentShortfall; }
  const result = {
    seed, policy:id, trait:g.trait, specialTrait:g.specialTrait, initialCash:r.initial.cash,
    initialGauges:r.initial.gauges, ending:app.titleForEnding(g)[0], age:g.age, year:g.year,
    netWorth:app.netWorth(g), cash:g.cash, assets:g.assets.reduce((sum,a)=>sum+a.value,0), debt:g.debt, familyDebt:g.familyDebt,
    gauges:g.gauges, lastAnnualIncome:g.income, achievements, stats:g.achievementStats,
    counts, choices, incomePaths, familyChoices, careerChoices, illnessChoices, surpriseActions,
    incomeTotal,livingTotal,interestTotal,principalTotal,shortfallTotal,
    minHealth:r.minHealth,peakDebt:r.peakDebt,peakNet:r.peakNet,maxDrawdown:r.maxDrawdown,
    operations:r.operations,completedYears:r.annuals?.length ?? 0,duplicateEvents:r.duplicateEvents,
    duplicateCoreEvents:r.duplicateCoreEvents,readCounts:r.readCounts,breakouts:g.breakoutOpportunities,
    maxCorrectSignalStreak:g.maxCorrectSignalStreak,
    surpriseTruthful:r.logs.filter(l=>l.type==='surprise_resolved'&&l.data.truthful).length,
    illnessSeverity:Object.fromEntries(['mild','moderate','severe'].map(s=>[s,r.logs.filter(l=>l.type==='illness_event'&&l.data.severity===s).length])),
    eventIds:r.logs.filter(l=>l.type==='event_choice').map(l=>l.data.eventId),
    wealthHistory:g.wealthHistory,
  };
  if (collectTrace) result.trace = r.logs;
  return result;
}
// Collect each annual summary once, even if a later effect sends zero-health players to ending.
const originalRecord = Runner.prototype.record;
Runner.prototype.record = function(type,data,game) {
  originalRecord.call(this,type,data,game);
  if (type === 'year_completed' && game?.annualSummary) (this.annuals ??= []).push({ ...game.annualSummary });
};

const start = performance.now();
const randomSeeds = [];
if (seedMode === 'random') {
  const seen = new Set();
  while (randomSeeds.length < runsRequested) {
    const seed = `${seedPrefix}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    if (!seen.has(seed)) { seen.add(seed); randomSeeds.push(seed); }
  }
}
const replaySeed = seedMode === 'random' ? randomSeeds[0] : `${seedPrefix}-000001`;
console.log(seedMode === 'random'
  ? `v${app.GAME_VERSION.replace(/^v/,'')} local real-handler simulation: ${runsRequested} games / ${runsRequested} random unique seeds`
  : `v${app.GAME_VERSION.replace(/^v/,'')} local real-handler simulation: ${runsRequested} games / ${runsRequested/policies.length} paired seeds`);
// A replay must be identical; this also exercises both death and annual transitions in the pilot.
for (const policy of policies) {
  const first = simulate(replaySeed,policy);
  const second = simulate(replaySeed,policy);
  assert.equal(JSON.stringify(first),JSON.stringify(second), `Non-deterministic replay: ${policy.id}`);
}
const rows = [], failures = [];
if (seedMode === 'random') {
  for (let i=0; i<runsRequested; i++) {
    const seed = randomSeeds[i], policy = policies[(i + policyOffset) % policies.length];
    try { rows.push(simulate(seed,policy)); }
    catch(error) { failures.push({ seed, policy:policy.id, error:error.stack }); console.error(`FAILED ${seed}/${policy.id}: ${error.message}`); }
    if ((i+1)%100===0 || i+1===runsRequested) { deckCache.clear(); console.log(`${rows.length}/${runsRequested} settled; ${failures.length} failures; ${((performance.now()-start)/1000).toFixed(1)} sec`); }
  }
} else {
  assert(runsRequested % policies.length === 0, `Paired mode requires a run count divisible by ${policies.length}`);
  for (let i=0; i<runsRequested/policies.length; i++) {
    const seed = `${seedPrefix}-${String(seedOffset+i+1).padStart(6,'0')}`;
    for (const policy of policies) {
      try { rows.push(simulate(seed,policy)); }
      catch(error) { failures.push({ seed, policy:policy.id, error:error.stack }); console.error(`FAILED ${seed}/${policy.id}: ${error.message}`); }
    }
    deckCache.clear();
    if ((i+1)%100===0 || i+1===runsRequested/policies.length) console.log(`${rows.length}/${runsRequested} settled; ${failures.length} failures; ${((performance.now()-start)/1000).toFixed(1)} sec`);
  }
}
const achievementCatalog = app.achievementsFor(app.makeGame('', replaySeed)).map(({id,title,tier,description})=>({id,title,tier,description}));
const metadata = {
  generatedAt:new Date().toISOString(),version:app.GAME_VERSION,requested:runsRequested,completed:rows.length,
  distinctSeeds:seedMode === 'random' ? runsRequested : runsRequested/policies.length, seedMode, policyOffset,
  seedPattern:seedMode === 'random' ? `${seedPrefix}-XXXXXXXXXXXX (cryptographically random, unique within this run)` : `${seedPrefix}-${String(seedOffset+1).padStart(6,'0')}..${seedPrefix}-${String(seedOffset+runsRequested/policies.length).padStart(6,'0')}`,
  method:'Current app/page.tsx handlers and game-state effects, TypeScript transpilation and local hook runner; presentation and browser lifecycle omitted.',
  elapsedSeconds:(performance.now()-start)/1000,networkAttempts,deterministicReplayChecks:policies.length,
  sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),
  catalogSha256:crypto.createHash('sha256').update(catalogSource).digest('hex'),
  policies,achievementCatalog,assetCatalog:app.brokerCatalog,eventCount:catalog.events.length,
};
assert.equal(networkAttempts,0);
fs.mkdirSync(outputDir,{recursive:true});
fs.writeFileSync(path.join(outputDir,'results.json'),JSON.stringify({metadata,failures,rows}));
fs.writeFileSync(path.join(outputDir,'pilot-traces.json'),JSON.stringify(policies.map(p=>simulate(replaySeed,p,true)),null,2));
console.log(JSON.stringify({outputDir,...metadata,policies:undefined,achievementCatalog:undefined,assetCatalog:undefined,failures:failures.length},null,2));
if (failures.length || rows.length !== runsRequested) process.exitCode = 1;
