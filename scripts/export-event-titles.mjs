import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EVENT_COUNT, events } from "../app/event-catalog.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const gameVersion = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8")).version;
const pageSource = readFileSync(join(projectRoot, "app", "page.tsx"), "utf8");

const sliceBetween = (start, end) => {
  const startIndex = pageSource.indexOf(start);
  const endIndex = pageSource.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) throw new Error(`找不到事件區段：${start}`);
  return pageSource.slice(startIndex, endIndex);
};

const decodeQuoted = (value) => JSON.parse(`"${value}"`);
const objectTitles = (source) => [...source.matchAll(/title:\s*"((?:[^"\\]|\\.)*)"/g)].map((match) => decodeQuoted(match[1]));
const tupleTitles = (source) => [...source.matchAll(/^\s*\["((?:[^"\\]|\\.)*)",/gm)].map((match) => decodeQuoted(match[1]));

const familyTitles = objectTitles(sliceBetween("const familyEvents", "const illnessEvents"));
const illnessTitles = objectTitles(sliceBetween("const illnessEvents", "const illnessChance"));
const bullishTitles = tupleTitles(sliceBetween("const bullishSurprises", "const bearishSurprises"));
const bearishTitles = tupleTitles(sliceBetween("const bearishSurprises", "const familyEvents"));
const surpriseAngles = tupleTitles(sliceBetween("const surpriseAngles", "const names"));
const bullishSurpriseTitles = bullishTitles.flatMap((cause) => surpriseAngles.map((angle) => `${angle}｜${cause}`));
const bearishSurpriseTitles = bearishTitles.flatMap((cause) => surpriseAngles.map((angle) => `${angle}｜${cause}`));

const kindLabels = {
  tech: "科技",
  market: "市場",
  crypto: "加密貨幣",
  housing: "居住／房市",
  career: "職涯",
  macro: "總體經濟",
  meme: "迷因／投顧",
};

const allTitles = [
  ...events.map((event) => event.title),
  ...familyTitles,
  ...illnessTitles,
  ...bullishSurpriseTitles,
  ...bearishSurpriseTitles,
];
const duplicateEntries = [...new Map(
  allTitles.map((title) => [title, allTitles.filter((candidate) => candidate === title).length]),
).entries()].filter(([, count]) => count > 1);

const lines = [
  "# 《韭菜人生模擬器》事件題目完整清單",
  "",
  `- 核心市場／人生事件：${EVENT_COUNT} 題`,
  `- 家庭事件：${familyTitles.length} 題`,
  `- 生病事件：${illnessTitles.length} 題`,
  `- 季度突襲事件標題組合：${bullishSurpriseTitles.length + bearishSurpriseTitles.length} 題（利多 ${bullishSurpriseTitles.length}、利空 ${bearishSurpriseTitles.length}）`,
  `- 合計：${allTitles.length} 題`,
  `- 完全相同標題：${duplicateEntries.length} 組`,
  "",
  "> 範圍是玩家可能看到的事件標題；不包含結算結果、職業選擇、成就名稱與按鈕文字。季度突襲標題由「出現方式」和「消息原因」動態組合，因此列出所有可能組合。",
  "",
  `## 一、核心市場／人生事件（${EVENT_COUNT} 題）`,
  "",
  ...events.flatMap((event, index) => [
    `${index + 1}. **${event.title}**`,
    `   - ${kindLabels[event.kind] ?? event.kind}｜${event.historicalYear}｜主題：${event.topic}`,
  ]),
  "",
  `## 二、家庭事件（${familyTitles.length} 題）`,
  "",
  ...familyTitles.map((title, index) => `${index + 1}. ${title}`),
  "",
  `## 三、生病事件（${illnessTitles.length} 題）`,
  "",
  ...illnessTitles.map((title, index) => `${index + 1}. ${title}`),
  "",
  `## 四、季度突襲事件（${bullishSurpriseTitles.length + bearishSurpriseTitles.length} 種標題組合）`,
  "",
  `### 利多（${bullishSurpriseTitles.length} 種）`,
  "",
  ...bullishSurpriseTitles.map((title, index) => `${index + 1}. ${title}`),
  "",
  `### 利空（${bearishSurpriseTitles.length} 種）`,
  "",
  ...bearishSurpriseTitles.map((title, index) => `${index + 1}. ${title}`),
  "",
  "## 完全相同標題檢查",
  "",
  ...(duplicateEntries.length
    ? duplicateEntries.map(([title, count]) => `- ${title}（${count} 次）`)
    : ["目前沒有完全相同的事件標題。"]),
  "",
];

const outputPath = join(projectRoot, "exports", `event-catalog-v${gameVersion}.md`);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(JSON.stringify({ outputPath, total: allTitles.length, core: EVENT_COUNT, family: familyTitles.length, illness: illnessTitles.length, surprises: bullishSurpriseTitles.length + bearishSurpriseTitles.length, duplicateGroups: duplicateEntries.length }, null, 2));
