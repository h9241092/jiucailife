import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { events } from "../app/event-catalog.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const gameVersion = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8")).version;
const catalogSource = readFileSync(join(projectRoot, "app", "event-catalog.ts"), "utf8");

const start = catalogSource.indexOf("const auditedMarketSignals");
const end = catalogSource.indexOf("const linkedAssetByPrimaryName", start);
if (start < 0 || end < 0) throw new Error("找不到人工多空審查表");
const auditedSource = catalogSource.slice(start, end);
const decodeQuoted = (value) => JSON.parse(`"${value}"`);
const auditedSignals = new Map(
  [...auditedSource.matchAll(/^\s*"((?:[^"\\]|\\.)*)": \{ direction: "(bullish|bearish)", hint: "((?:[^"\\]|\\.)*)" \},/gm)]
    .map((match) => [decodeQuoted(match[1]), { direction: match[2], hint: decodeQuoted(match[3]) }]),
);

const advisorRules = new Map([
  ["財經台老師喊明牌", { accuracy: 40, label: "限時明牌" }],
  ["付費會員群投顧", { accuracy: 50, label: "會員群喊單" }],
  ["航海王老師帶會員上船", { accuracy: 65, label: "題材型分析" }],
  ["老師代操保證獲利", { accuracy: 20, label: "保證獲利話術" }],
]);

const directionLabel = (direction) => direction === "bullish" ? "↗ 偏多" : "↘ 偏空";
const grouped = [];
const byTopic = new Map();
for (const event of events) {
  if (!byTopic.has(event.topic)) {
    const group = { topic: event.topic, year: event.historicalYear, kind: event.kind, events: [] };
    byTopic.set(event.topic, group);
    grouped.push(group);
  }
  byTopic.get(event.topic).events.push(event);
}

const bullishCount = events.filter((event) => event.marketDirection === "bullish").length;
const bearishCount = events.length - bullishCount;
const fixedTopicCount = grouped.filter((group) => !advisorRules.has(group.topic)).length;
const advisorEventCount = events.filter((event) => advisorRules.has(event.topic)).length;

const lines = [
  "# 《韭菜人生模擬器》核心事件多空條件",
  "",
  `- 核心題目：${events.length} 題（${grouped.length} 個主題 × 每主題 4 種敘述角度）`,
  `- 題庫靜態方向：偏多 ${bullishCount} 題、偏空 ${bearishCount} 題`,
  `- 固定方向主題：${fixedTopicCount} 個`,
  `- 投顧老師動態方向：${advisorRules.size} 個主題、${advisorEventCount} 題`,
  "",
  "## 多空如何影響價格",
  "",
  "1. 一般股票、ETF與美股每月基礎下跌機率為 47%；加密貨幣為 50%。",
  "2. 主要標的訊號強度為 16%～20%；偏多訊號會從下跌機率扣除，偏空訊號會加到下跌機率。主要標的影響 1～2 季。",
  "3. 連動標的訊號強度為 8%～12%，計算方式相同，但只影響 1 季。",
  "4. 多個有效訊號會疊加，最後下跌機率限制在 12%～88%。",
  "5. 若標的已觸發連跌狀態，下跌機率至少 75%；若已觸發連漲狀態，下跌機率最多 35%。因此題目方向只改變機率，不保證價格一定照該方向走。",
  "6. A／B／C 選項影響玩家看見的情報是否判讀正確；底層真正方向不會因玩家選項改變。",
  "",
  "## 四種敘述角度的實際效果",
  "",
  "- 市場先動了：行情訊號強度 +25%；研究／觀察／追熱門判讀率分別 −3%／−6%／−8%。",
  "- 後座力才開始：主要標的行情訊號額外延長 1 季，因此影響 2～3 季。",
  "- 人人突然變專家：C 選項流量收入 +50%、投資知識額外 −1；研究／觀察／追熱門判讀率分別 −2%／−8%／−12%。",
  "- 早知道最貴：研究／觀察／追熱門判讀率分別 +9%／+8%／+4%；行情訊號強度 −25%。",
  "",
  "## 投顧老師的特殊規則",
  "",
  "以下 4 類題目畫面上都是「老師喊多」，但真正方向由種子碼固定抽取。主要標的和連動標的共用同一次判定：",
  "",
  "- 財經台老師喊明牌：40% 真偏多、60% 反轉偏空。",
  "- 付費會員群投顧：50% 真偏多、50% 反轉偏空。",
  "- 航海王老師帶會員上船：65% 真偏多、35% 反轉偏空。",
  "- 老師代操保證獲利：20% 真偏多、80% 反轉偏空。",
  "",
  "> 下方「題庫方向」顯示人工審查表的靜態設定；遇到上述投顧老師主題時，實際遊戲會優先套用動態命中率規則。",
  "",
  "## 280 題逐題對照",
  "",
];

let eventNumber = 0;
grouped.forEach((group, topicIndex) => {
  const firstEvent = group.events[0];
  const audited = auditedSignals.get(group.topic);
  if (!audited) throw new Error(`主題「${group.topic}」缺少多空判定說明`);
  const primary = firstEvent.choices.find((choice) => choice.risk === "bold" && choice.asset)?.asset;
  if (!primary) throw new Error(`主題「${group.topic}」缺少主要標的`);
  const advisor = advisorRules.get(group.topic);
  lines.push(`### ${topicIndex + 1}. ${group.topic}（${group.year}）`, "");
  lines.push(`- 題庫方向：**${directionLabel(audited.direction)}**`);
  lines.push(`- 判定條件：${advisor ? `動態投顧規則｜${advisor.label}喊多，${advisor.accuracy}% 成真偏多、${100 - advisor.accuracy}% 反轉偏空` : `固定${directionLabel(audited.direction).replace(/[↗↘] /, "")}`}`);
  lines.push(`- 因果依據：${audited.hint}`);
  lines.push(`- 主要標的：${primary.category}「${primary.name}」｜訊號強度 16%～20%｜影響 1～2 季`);
  lines.push(`- 連動標的：${firstEvent.linkedAsset.category}「${firstEvent.linkedAsset.name}」｜訊號強度 8%～12%｜影響 1 季`);
  lines.push("- 所含題目：");
  for (const event of group.events) {
    eventNumber += 1;
    lines.push(`  ${eventNumber}. ${event.title}（${event.lensEffect.label}：${event.lensEffect.detail}）`);
  }
  lines.push("");
});

const outputPath = join(projectRoot, "exports", `core-event-market-directions-v${gameVersion}.md`);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(JSON.stringify({ outputPath, events: events.length, topics: grouped.length, bullishCount, bearishCount, advisorEventCount }, null, 2));
