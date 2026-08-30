import { buildLifeEventDeck, EVENT_COUNT, events } from "../app/event-catalog.ts";

const RUNS = Number(process.argv[2] ?? 1000);
const YEARS = 9;
const EVENTS_PER_YEAR = 8;
const EVENT_STEPS = YEARS * EVENTS_PER_YEAR;
const INTEL_EFFECTS = {
  tech: { research: { knowledge: 5, stress: 1 }, observe: { knowledge: 1, stress: 0 }, trend: { cash: 7000, knowledge: 0, stress: 6 } },
  market: { research: { knowledge: 4, stress: 1 }, observe: { knowledge: 1, stress: -1 }, trend: { cash: 6000, knowledge: 0, stress: 5 } },
  crypto: { research: { knowledge: 5, stress: 2 }, observe: { knowledge: 2, stress: 1 }, trend: { cash: 8000, knowledge: 0, stress: 8 } },
  housing: { research: { knowledge: 3, stress: 0 }, observe: { knowledge: 1, stress: -2 }, trend: { cash: 5000, knowledge: 0, stress: 4 } },
  career: { research: { knowledge: 3, stress: -1 }, observe: { knowledge: 1, stress: -2 }, trend: { cash: 5000, knowledge: 0, stress: 4 } },
  macro: { research: { knowledge: 4, stress: 1 }, observe: { knowledge: 2, stress: -1 }, trend: { cash: 6000, knowledge: 0, stress: 6 } },
  meme: { research: { knowledge: 4, stress: 0 }, observe: { knowledge: 1, stress: -2 }, trend: { cash: 9000, knowledge: 0, stress: 9 } },
};

function hash(input) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function directionForEvent(event, seed) {
  const text = `${event.topic}${event.title}${event.body}`;
  const bearish = /震撼|破局|戰爭|制裁|升息|重挫|危機|爆|詐騙|封城|缺|荒|降評|裁罰|管制|吃緊|高牆|熔斷|負油價|熊市|勒索|大旱|塞船|倒閉|壓力|關稅/.test(text);
  const bullish = /降息|減稅|回流|行情|護盤|投資|協議|暫停|千金|兩萬|登台|競賽|儲備|追加|放寬|受惠|轉向/.test(text);
  if (bearish !== bullish) return bearish ? "bearish" : "bullish";
  return hash(`${seed}:${event.id}`) % 2 === 0 ? "bullish" : "bearish";
}

function addKnowledge(current, baseGain) {
  const remainingFactor = Math.pow(Math.max(0, 100 - current) / 100, 1.35);
  const gain = Math.max(0, Math.min(95 - current, Math.round(baseGain * remainingFactor)));
  return current + gain;
}

const simulatorCatalog = Array.from(new Map(events.flatMap((event) => event.choices.map((choice) => choice.asset).filter(Boolean)).map((asset) => [`${asset.category}:${asset.name}`, asset])).values());

function targetsOf(event, activeSignals = []) {
  const uniqueTargets = Array.from(new Map(event.choices.map((choice) => choice.asset).filter(Boolean).map((asset) => [`${asset.category}:${asset.name}`, asset])).values());
  const primary = event.choices[2]?.asset ?? uniqueTargets[0] ?? { category: "市場", name: "整體市場" };
  const primaryKey = `${primary.category}:${primary.name}`;
  const directTargetKeys = new Set(uniqueTargets.map((target) => `${target.category}:${target.name}`));
  const activeCount = (target) => activeSignals.filter((signal) => signal.eventId !== event.id && signal.targetKey === `${target.category}:${target.name}`).length;
  const secondary = simulatorCatalog
    .filter((target) => `${target.category}:${target.name}` !== primaryKey)
    .filter((target) => primary.category !== "ETF" || target.category !== "ETF")
    .sort((left, right) => {
      const activeDifference = activeCount(left) - activeCount(right);
      if (activeDifference) return activeDifference;
      const directDifference = Number(directTargetKeys.has(`${right.category}:${right.name}`)) - Number(directTargetKeys.has(`${left.category}:${left.name}`));
      if (directDifference) return directDifference;
      return hash(`${event.id}:${left.category}:${left.name}`) - hash(`${event.id}:${right.category}:${right.name}`);
    })[0];
  return [primary, secondary];
}

const totals = {
  runs: RUNS,
  generatedEvents: 0,
  distinctTopics: 0,
  repeatedTopicEvents: 0,
  firstRepeatedTopicMonth: 0,
  repeatedAdjacentTargets: 0,
  activeSignalSamples: 0,
  activeSignals: 0,
  maxActiveSignals: 0,
  overlappingSignalSamples: 0,
  conflictingSignalSamples: 0,
  displayTargetMismatches: 0,
  research: 0,
  observe: 0,
  trend: 0,
  researchCost: 0,
  trendIncome: 0,
  clueReads: 0,
  correctClueReads: 0,
  finalKnowledge: 0,
  finalStress: 0,
  finalActionCash: 0,
};

const targetCounts = new Map();
const policyCounts = { adaptive: 0, research: 0, observe: 0, trend: 0 };

for (let run = 0; run < RUNS; run += 1) {
  const seed = (run * 7919 + 17) % 100000;
  const deck = buildLifeEventDeck(seed, YEARS);
  if (deck.length !== EVENT_STEPS) throw new Error(`牌組長度錯誤：${deck.length}`);
  if (new Set(deck.map((event) => event.id)).size !== EVENT_STEPS) throw new Error("同一局出現完全相同事件");
  for (let year = 0; year < YEARS; year += 1) {
    const yearDeck = deck.slice(year * EVENTS_PER_YEAR, year * EVENTS_PER_YEAR + EVENTS_PER_YEAR);
    if (new Set(yearDeck.map((event) => event.topicId)).size !== EVENTS_PER_YEAR) throw new Error(`第 ${year + 1} 年主題重複`);
  }

  const policy = ["adaptive", "research", "observe", "trend"][run % 4];
  policyCounts[policy] += 1;
  let knowledge = run % 5 === 0 ? 26 : 18;
  let stress = 22;
  let cash = 300000;
  let previousTarget = null;
  let activeSignals = [];
  const topics = new Set();
  let firstRepeatedTopicMonth = null;

  for (let eventStep = 0; eventStep < deck.length; eventStep += 1) {
    const event = deck[eventStep];
    const targets = targetsOf(event, activeSignals);
    const primaryTargetKey = `${targets[0].category}:${targets[0].name}`;
    for (const target of targets) {
      const targetKey = `${target.category}:${target.name}`;
      targetCounts.set(targetKey, (targetCounts.get(targetKey) ?? 0) + 1);
    }
    if (previousTarget === primaryTargetKey) totals.repeatedAdjacentTargets += 1;
    previousTarget = primaryTargetKey;
    if (topics.has(event.topicId) && firstRepeatedTopicMonth === null) firstRepeatedTopicMonth = eventStep + 1;
    topics.add(event.topicId);

    let action = policy;
    if (policy === "adaptive") {
      const roll = hash(`${seed}:${eventStep}:choice`) % 100;
      action = knowledge < 50 ? (roll < 55 ? "research" : roll < 85 ? "observe" : "trend") : (roll < 20 ? "research" : roll < 75 ? "observe" : "trend");
    }

    const actionEffects = INTEL_EFFECTS[event.kind][action];
    if (action === "research") {
      totals.research += 1;
      totals.researchCost += 600;
      cash -= 1000;
      knowledge = addKnowledge(knowledge, actionEffects.knowledge);
      stress = Math.max(0, Math.min(100, stress + actionEffects.stress));
    } else if (action === "observe") {
      totals.observe += 1;
      knowledge = addKnowledge(knowledge, actionEffects.knowledge);
      stress = Math.max(0, Math.min(100, stress + actionEffects.stress));
    } else {
      totals.trend += 1;
      totals.trendIncome += actionEffects.cash;
      cash += actionEffects.cash;
      stress = Math.max(0, Math.min(100, stress + actionEffects.stress));
    }

    for (const [targetIndex, target] of targets.entries()) {
      const targetKey = `${target.category}:${target.name}`;
      const eventHash = hash(`${seed}:${event.id}:${Math.floor(eventStep / EVENTS_PER_YEAR) + 1}:${Math.floor((eventStep % EVENTS_PER_YEAR) / 2)}:${eventStep % 2}:${targetKey}`);
      const direction = directionForEvent(event, seed ^ hash(targetKey));
      const role = targetIndex === 0 ? "primary" : "linked";
      const duration = role === "linked" ? 3 : eventHash % 2 === 0 ? 3 : 6;
      const strength = role === "linked" ? .08 + (eventHash % 5) * .01 : .16 + (eventHash % 5) * .01;
      let readDirection = null;
      if (action === "research" && role === "primary") readDirection = direction;
      if (action === "observe" && knowledge >= 70) readDirection = direction;
      if (action === "observe" && knowledge >= 35 && knowledge < 70) readDirection = eventHash % 4 !== 0 ? direction : direction === "bullish" ? "bearish" : "bullish";
      if (action === "trend") {
        const correct = eventHash % 100 < 55 + Math.round(knowledge * .3);
        readDirection = correct ? direction : direction === "bullish" ? "bearish" : "bullish";
      }
      if (readDirection) {
        totals.clueReads += 1;
        if (readDirection === direction) totals.correctClueReads += 1;
      }
      activeSignals.push({ eventId: event.id, targetKey, direction, duration, strength, role });
    }
    const tradingTargets = targetsOf(event, activeSignals);
    const eventTargetKeys = targets.map((target) => `${target.category}:${target.name}`);
    const tradingTargetKeys = tradingTargets.map((target) => `${target.category}:${target.name}`);
    if (eventTargetKeys.some((targetKey, index) => targetKey !== tradingTargetKeys[index])) totals.displayTargetMismatches += 1;
    totals.activeSignalSamples += 1;
    totals.activeSignals += activeSignals.length;
    totals.maxActiveSignals = Math.max(totals.maxActiveSignals, activeSignals.length);

    const grouped = new Map();
    for (const signal of activeSignals) {
      const group = grouped.get(signal.targetKey) ?? [];
      group.push(signal);
      grouped.set(signal.targetKey, group);
    }
    if ([...grouped.values()].some((signals) => signals.length > 1)) totals.overlappingSignalSamples += 1;
    if ([...grouped.values()].some((signals) => new Set(signals.map((signal) => signal.direction)).size > 1)) totals.conflictingSignalSamples += 1;
    const elapsedMonths = eventStep % 2 === 0 ? 1 : 2;
    activeSignals = activeSignals.map((signal) => ({ ...signal, duration: signal.duration - elapsedMonths })).filter((signal) => signal.duration > 0);
  }

  totals.generatedEvents += deck.length;
  totals.distinctTopics += topics.size;
  totals.repeatedTopicEvents += deck.length - topics.size;
  totals.firstRepeatedTopicMonth += firstRepeatedTopicMonth ?? EVENT_STEPS + 1;
  totals.finalKnowledge += knowledge;
  totals.finalStress += stress;
  totals.finalActionCash += cash;
}

const eventCount = totals.generatedEvents;
const coreClicksPerRun = EVENT_STEPS * 2 + YEARS * 3;
const result = {
  configuration: {
    runs: RUNS,
    eventCatalog: EVENT_COUNT,
    yearsPerRun: YEARS,
    eventsPerRun: EVENT_STEPS,
    minimumCoreClicksPerRun: coreClicksPerRun,
    note: "最低操作數含每季兩次事件選擇與券商結束，以及每年收入選擇、收入結果、年度結算；每次事件產生一組主要與連動情報。",
  },
  deckQuality: {
    exactDuplicateEvents: 0,
    sameTopicWithinYear: 0,
    averageDistinctTopicsPerRun: Number((totals.distinctTopics / RUNS).toFixed(2)),
    averageRepeatedTopicLensesPerRun: Number((totals.repeatedTopicEvents / RUNS).toFixed(2)),
    averageFirstRepeatedTopicMonth: Number((totals.firstRepeatedTopicMonth / RUNS).toFixed(2)),
    adjacentSameTargetRate: Number((totals.repeatedAdjacentTargets / (RUNS * (EVENT_STEPS - 1))).toFixed(4)),
  },
  intelLoad: {
    cardsAtCompletedRun: EVENT_STEPS,
    recordsAtCompletedRun: EVENT_STEPS * 2,
    averageActiveSignals: Number((totals.activeSignals / totals.activeSignalSamples).toFixed(2)),
    maximumActiveSignalsSeen: totals.maxActiveSignals,
    overlapSameTargetRate: Number((totals.overlappingSignalSamples / totals.activeSignalSamples).toFixed(4)),
    conflictingSameTargetRate: Number((totals.conflictingSignalSamples / totals.activeSignalSamples).toFixed(4)),
    eventToTradingTargetMismatches: totals.displayTargetMismatches,
  },
  mixedPolicies: {
    policyRuns: policyCounts,
    choiceShare: {
      research: Number((totals.research / eventCount).toFixed(4)),
      observe: Number((totals.observe / eventCount).toFixed(4)),
      trend: Number((totals.trend / eventCount).toFixed(4)),
    },
    averageResearchCostPerRun: Math.round(totals.researchCost / RUNS),
    averageTrendIncomePerRun: Math.round(totals.trendIncome / RUNS),
    averageCashAfterIntelActions: Math.round(totals.finalActionCash / RUNS),
    readableClueAccuracy: Number((totals.correctClueReads / totals.clueReads).toFixed(4)),
    averageFinalKnowledge: Number((totals.finalKnowledge / RUNS).toFixed(2)),
    averageFinalStress: Number((totals.finalStress / RUNS).toFixed(2)),
  },
  mostFrequentTargets: [...targetCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([target, count]) => ({ target, share: Number((count / (eventCount * 2)).toFixed(4)) })),
};

console.log(JSON.stringify(result, null, 2));
