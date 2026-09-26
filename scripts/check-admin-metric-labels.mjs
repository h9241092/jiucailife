// Offline checks: no D1 access and no analytics requests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const nativeRequire = createRequire(import.meta.url);
function compile(source, imports = {}) {
  const mod = { exports: {} };
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(js, { exports: mod.exports, module: mod, Intl,
    require: name => {
      if (name === 'react/jsx-runtime') return nativeRequire(name);
      if (Object.hasOwn(imports, name)) return imports[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
    fetch: () => { throw new Error('Network is forbidden'); },
  });
  return mod.exports;
}
const api = compile(fs.readFileSync('lib/analytics-metric-labels.ts', 'utf8'));
const reportApi = compile(fs.readFileSync('lib/analytics-report.ts', 'utf8'), {
  '@/lib/analytics-db': {
    analyticsDb: () => { throw new Error('analyticsDb is not used in this test'); },
    ensureAnalyticsSchema: () => { throw new Error('ensureAnalyticsSchema is not used in this test'); },
  },
});
const label = api.metricDimensionLabel;
const adminSource = fs.readFileSync('app/admin/page.tsx', 'utf8');
const parsed = ts.createSourceFile('admin.tsx', adminSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'MetricList');
assert(component);
const { MetricList } = compile(`
  import { metricDimensionLabel } from 'labels';
  const money = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 });
  ${component.getText(parsed)}
  export { MetricList };
`, { labels: api });

test('annual career choices are Chinese and distinguish support from loans', () => {
  assert.equal(label('income_choices', 'kol'), '投資 KOL');
  assert.equal(label('income_choices', 'family'), '無業／家裡資助');
  assert.equal(label('income_choices', 'parttime'), '麥當當員工');
});

test('every achievement uses the exact in-game Chinese title', () => {
  const game = fs.readFileSync('app/page.tsx', 'utf8');
  const catalog = game.slice(game.indexOf('const achievementsFor ='), game.indexOf('const riskLabel ='));
  const achievements = [...catalog.matchAll(/\{\s*id:\s*"([^"]+)",\s*title:\s*"([^"]+)"/g)];
  assert.equal(achievements.length, 24);
  for (const [, id, title] of achievements) assert.equal(label('achievements', id), title);
});

test('all nine illness severity and response combinations are translated', () => {
  for (const [severity, title] of Object.entries({ mild:'輕症', moderate:'中症', severe:'重症' })) {
    for (const [choice, action] of Object.entries({ push:'硬撐，照常工作看盤', treat:'就醫治療並安排休養', family:'請家人協助照顧' })) {
      assert.equal(label('illness_choices', `${severity}:${choice}`), `${title}・${action}`);
    }
  }
});

test('family event labels match the game options', () => {
  const game = fs.readFileSync('app/page.tsx', 'utf8');
  for (const [, choice, text] of game.matchAll(/resolveFamilyEvent\("(time|money|decline)"\)\}><b>([^<]+)<\/b>/g)) {
    assert.equal(label('family_choices', choice), text);
  }
  assert.equal(label('family_choices', 'time'), '花時間陪伴處理');
  assert.equal(label('family_choices', 'money'), '出錢支援家裡');
  assert.equal(label('family_choices', 'decline'), '工作優先，先婉拒');
});

test('missing and unfamiliar codes remain distinguishable instead of being mislabelled', () => {
  assert.equal(label('achievements', 'all'), '未記錄成就');
  assert.equal(label('achievements', 'newBadge'), '未識別成就（newBadge）');
  assert.equal(label('income_choices', 'constructor'), '未識別生路（constructor）');
  assert.equal(label('family_choices', '__proto__'), '未識別選項（__proto__）');
  assert.equal(label('illness_choices', 'all:treat'), '未記錄病況・就醫治療並安排休養');
  assert.match(label('illness_choices', 'unexpected'), /未識別生病選擇/);
  assert.equal(label(undefined, 'buy:護國神積'), 'buy:護國神積');
});

test('ranking renders Chinese without changing dimensions, counts, ordering or bars', () => {
  const rows = Object.freeze([
    Object.freeze({dimension:'frequentPatient', count:1234, total:0}),
    Object.freeze({dimension:'earlyRetirement', count:20, total:0}),
  ]);
  const markup = renderToStaticMarkup(createElement(MetricList, { title:'成就達成', rows, metric:'achievements' }));
  assert(markup.includes('醫院VIP'));
  assert(markup.includes('1,234 次'));
  assert(markup.includes('20 次'));
  assert(markup.indexOf('醫院VIP') < markup.indexOf('提前退休'));
  assert(markup.includes('width:100%'));
  assert(markup.includes('width:3%'));
  assert(!markup.includes('frequentPatient'));
  assert.equal(rows[0].dimension, 'frequentPatient');
  const escaped = renderToStaticMarkup(createElement(MetricList, { title:'成就達成', rows:[{dimension:'<script>alert(1)</script>',count:1,total:0}], metric:'achievements' }));
  assert(!escaped.includes('<script>'));
  assert(escaped.includes('&lt;script&gt;'));
});

test('hidden and special achievements stay visible in the dashboard table, even at zero', () => {
  assert.equal(label('achievements', 'hundredMillionMystery'), '你是谷癌？');
  assert.equal(label('achievements', 'chairmanChild'), '拎北是天公仔');
  assert.match(adminSource, /requiredAchievementIds = \["hundredMillionMystery", "chairmanChild"\]/);
  assert.match(adminSource, /readMetric\(db, "achievements", 30\)/);
  assert.match(adminSource, /count: 0, total: 0/);
  const markup = renderToStaticMarkup(createElement(MetricList, {
    title:'成就達成', rows:[{dimension:'chairmanChild',count:0,total:0}], metric:'achievements', completedOnly:true,
  }));
  assert(markup.includes('拎北是天公仔'));
  assert(markup.includes('0 次'));
  assert(markup.includes('width:0%'));
});

test('empty rankings and unrelated metric labels retain their original behavior', () => {
  assert(renderToStaticMarkup(createElement(MetricList, {title:'生病事件選擇',rows:[],metric:'illness_choices'})).includes('尚無資料'));
  const markup = renderToStaticMarkup(createElement(MetricList, {title:'事件', rows:[{dimension:'B',count:9,total:0}]}));
  assert(markup.includes('<b>B</b>'));
  assert(!markup.includes('analytics-localized'));
});

test('completed-only rankings explain their data scope', () => {
  const markup = renderToStaticMarkup(createElement(MetricList, {
    title:'事件 A／B／C 選擇', rows:[{dimension:'A',count:9,total:0}], completedOnly:true,
  }));
  assert(markup.includes('僅完成局 · 近 180 天'));
});

test('choice metrics join raw events to completed runs', async () => {
  const definitions = {
    event_choices: ['event_choice', '$.choice'],
    income_choices: ['income_choice', '$.incomePath'],
    trades: ['trade', '$.side', '$.target'],
    illness_choices: ['illness_event', '$.severity', '$.choice'],
    family_choices: ['family_event', '$.choice'],
    surprises: ['surprise_resolved', '$.direction', '$.action'],
  };
  for (const [metric, [eventType, ...jsonPaths]] of Object.entries(definitions)) {
    let sql = '', bindings = [];
    const db = { prepare(statement) {
      sql = statement;
      return { bind(...values) {
        bindings = values;
        return { all: async () => ({ results:[{dimension:'A',count:'2',total:0}] }) };
      } };
    } };
    const rows = await reportApi.readCompletedRunMetric(db, metric, 7);
    assert.match(sql, /INNER JOIN anonymous_runs AS run ON run\.id = event\.run_id/);
    assert.match(sql, /run\.status = 'completed'/);
    assert.match(sql, /event\.created_at >= datetime\('now', '-180 days'\)/);
    for (const path of jsonPaths) assert(sql.includes(path));
    assert.deepEqual([...bindings], [eventType, 7]);
    assert.deepEqual(JSON.parse(JSON.stringify(rows)), [{dimension:'A',count:2,total:0}]);
  }
});

test('completed-run query excludes choices from abandoned games in SQLite', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`
    CREATE TABLE anonymous_runs (id TEXT PRIMARY KEY, status TEXT NOT NULL);
    CREATE TABLE anonymous_events (run_id TEXT NOT NULL, event_type TEXT NOT NULL, data_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO anonymous_runs (id, status) VALUES ('done', 'completed'), ('left', 'abandoned');
  `);
  const insert = sqlite.prepare('INSERT INTO anonymous_events (run_id, event_type, data_json) VALUES (?, ?, ?)');
  const samples = {
    event_choices: ['event_choice', {choice:'A'}, {choice:'B'}, 'A'],
    income_choices: ['income_choice', {incomePath:'kol'}, {incomePath:'family'}, 'kol'],
    trades: ['trade', {side:'buy',target:'護國神積'}, {side:'sell',target:'川幣'}, 'buy:護國神積'],
    illness_choices: ['illness_event', {severity:'mild',choice:'treat'}, {severity:'severe',choice:'push'}, 'mild:treat'],
    family_choices: ['family_event', {choice:'time'}, {choice:'decline'}, 'time'],
    surprises: ['surprise_resolved', {direction:'bull',action:'follow'}, {direction:'bear',action:'wait'}, 'bull:follow'],
  };
  const d1 = { prepare(sql) {
    return { bind(...values) {
      return { all: async () => ({ results:sqlite.prepare(sql).all(...values) }) };
    } };
  } };
  for (const [metric, [eventType, completedData, abandonedData, expected]] of Object.entries(samples)) {
    insert.run('done', eventType, JSON.stringify(completedData));
    insert.run('left', eventType, JSON.stringify(abandonedData));
    const rows = await reportApi.readCompletedRunMetric(d1, metric, 10);
    assert.deepEqual(JSON.parse(JSON.stringify(rows)), [{dimension:expected,count:1,total:0}]);
  }
  sqlite.close();
});

test('all four panels use localization and long labels can wrap', () => {
  for (const [title, metric] of [['年度生路選擇','income_choices'],['成就達成','achievements'],['生病事件選擇','illness_choices'],['家庭事件選擇','family_choices']]) {
    assert.match(adminSource, new RegExp(`<MetricList title="${title}"[^>]+metric="${metric}"`));
  }
  assert.match(adminSource, /key=\{row.dimension\}/);
  assert.match(adminSource, /import "\.\/metric-labels.css"/);
  assert.match(fs.readFileSync('app/admin/metric-labels.css','utf8'), /white-space: normal/);
});

test('every dashboard ranking is explicitly scoped to completed runs', () => {
  const panels = [...adminSource.matchAll(/<MetricList title="([^"]+)"[^>]*\/>/g)];
  assert.equal(panels.length, 8);
  for (const panel of panels) assert(panel[0].includes('completedOnly'), `${panel[1]} is missing completedOnly`);
  assert.equal((adminSource.match(/readCompletedRunMetric\(/g) ?? []).length, 6);
});
