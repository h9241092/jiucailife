import { buildLifeEventDeck, events } from "../app/event-catalog.ts";
import fs from "node:fs/promises";

const RUNS = Number(process.argv[2] ?? 10000);
const BASE_WORK_HEALTH_COST = Number(process.argv[3] ?? 5);
const SEED_OFFSET = Number(process.argv[4] ?? 0);
const OUTPUT_PATH = process.argv[5] ?? null;
const WORK_HEALTH_ESCALATION = Number(process.argv[6] ?? 1);
const YEARS = 9;
const EVENTS_PER_YEAR = 8;
const STARTING_CASH = 300000;
const workHealthCost = (consecutiveYears) => BASE_WORK_HEALTH_COST + Math.max(0, consecutiveYears - 2) * WORK_HEALTH_ESCALATION;
const FAMILY_BACKER_STARTING_CASH_BONUS = 200000;
const FAILURE_NET = -500000;
const RETIREMENT_NET = 30000000;
const CREDIT_RATE = .06;
const CREDIT_TERM_MONTHS = 60;
const KOL_MAX_ANNUAL_INCOME = 1560000;
const KNOWLEDGE_CLEAR_SIGNAL_LEVEL = 60;
const KNOWLEDGE_CONFIDENCE_LEVEL = 73;
const KNOWLEDGE_SIGNAL_BOOST_LEVEL = 82;
const KNOWLEDGE_FORESIGHT_LEVEL = 90;
const KNOWLEDGE_SIGNAL_MOVE_MULTIPLIER = 1.1;
const FORESIGHT_CHANCE = .25;
const BREAKOUT_STREAK_TARGET = 3;
const BREAKOUT_UNLOCK_CHANCE = .18;
const BREAKOUT_MOVE_MULTIPLIER = 2.5;

const POLICIES = [
  { id: "safe", label: "穩健打工族" },
  { id: "balanced", label: "均衡配置" },
  { id: "aggressive", label: "高風險 KOL" },
  { id: "family", label: "全靠家裡" },
  { id: "random", label: "隨機韭菜" },
];

const TRAITS = [
  ["數字敏感", { knowledge: 8 }],
  ["家族靠山", { family: 10 }],
  ["信用小白", { credit: -8 }],
  ["天生樂觀", { stress: -8 }],
  ["體弱多病", { healthRange: [60, 68] }],
  ["家破人亡", { familyRange: [38, 54] }],
];
const PAPER_HANDS_CHANCE_DENOMINATOR = 6;
const INITIAL_RANGES = {
  health: [70, 86],
  stress: [14, 30],
  family: [52, 68],
  knowledge: [10, 26],
  credit: [54, 70],
};

const INTEL_EFFECTS = {
  tech: { research: { knowledge: 5, stress: 1, health: -1 }, observe: { knowledge: 1, stress: -1, health: 1 }, trend: { cash: 28000, knowledge: -2, stress: 2, health: -1 } },
  market: { research: { knowledge: 4, stress: 1, health: -1 }, observe: { knowledge: 1, stress: -1, health: 1 }, trend: { cash: 24000, knowledge: -1, stress: 2, health: -1 } },
  crypto: { research: { knowledge: 5, stress: 2, health: -1 }, observe: { knowledge: 2, stress: -1, health: 1 }, trend: { cash: 36000, knowledge: -2, stress: 3, health: -1, credit: -1 } },
  housing: { research: { knowledge: 3, stress: 1, health: -1, credit: 1 }, observe: { knowledge: 1, stress: -2, health: 2 }, trend: { cash: 20000, knowledge: -1, stress: 1, health: -1 } },
  career: { research: { knowledge: 3, stress: 1, health: -1 }, observe: { knowledge: 1, stress: -2, health: 2 }, trend: { cash: 20000, knowledge: -1, stress: 1, health: -1 } },
  macro: { research: { knowledge: 4, stress: 1, health: -1 }, observe: { knowledge: 2, stress: -1, health: 2 }, trend: { cash: 24000, knowledge: -1, stress: 2, health: -1 } },
  meme: { research: { knowledge: 4, stress: 1, health: -1, credit: 1 }, observe: { knowledge: 1, stress: -2, health: 2 }, trend: { cash: 40000, knowledge: -2, stress: 4, health: -1, credit: -1 } },
};

const ACHIEVEMENTS = [
  ["earlyRetirement", "提前退休"],
  ["retirementWaitingRoom", "退休預備席"],
  ["marketLegend", "市場傳奇"],
  ["fiveMillionClub", "五百萬俱樂部"],
  ["steadyLanding", "穩健上岸"],
  ["debtFreeMillionaire", "無債百萬富翁"],
  ["leveragedSurvivor", "槓桿倖存者"],
  ["workForever", "打工人的完全體"],
  ["kolForever", "流量就是我的年薪"],
  ["familyForever", "伸手牌終身會員"],
  ["clearHead", "清醒的韭菜"],
  ["lastBreath", "最後一滴血"],
  ["pressureCooker", "人體壓力鍋"],
  ["familyFirst", "家庭優先股"],
  ["neverSick", "百病不侵"],
  ["frequentPatient", "醫院VIP"],
  ["surpriseCollector", "突襲收藏家"],
  ["paperHandsWin", "紙手也能贏"],
  ["minimalist", "極簡投資家"],
  ["diversified", "資產動物園"],
];

function hash(input) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function mulberry32(seed) {
  return () => {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const flip = (direction) => direction === "bullish" ? "bearish" : "bullish";
const netWorth = (game) => game.cash + [...game.assets.values()].reduce((sum, asset) => sum + asset.value, 0) - game.generalDebt - game.familyDebt;
const totalAssets = (game) => [...game.assets.values()].reduce((sum, asset) => sum + asset.value, 0);

function normal(random) {
  const first = Math.max(Number.EPSILON, random());
  const second = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function addKnowledge(game, baseGain) {
  const remainingFactor = Math.pow(Math.max(0, 100 - game.knowledge) / 100, 1.35);
  const scaledGain = baseGain > 0 && game.knowledge < 95 ? Math.max(1, Math.round(baseGain * remainingFactor)) : 0;
  const gain = Math.max(0, Math.min(95 - game.knowledge, scaledGain));
  game.knowledge = clamp(game.knowledge + gain);
}

function seededInitialGauge(seedCode, key, range = INITIAL_RANGES[key]) {
  const [minimum, maximum] = range;
  return minimum + hash(`${seedCode}:initial:${key}`) % (maximum - minimum + 1);
}

function directionForEvent(event, seed) {
  const advisorAccuracy = event.topic === "財經台老師喊明牌" ? .4
    : event.topic === "付費會員群投顧" ? .5
      : event.topic === "航海王老師帶會員上船" ? .65
        : event.topic === "老師代操保證獲利" ? .2
          : null;
  if (advisorAccuracy !== null) {
    const text = `${event.topic}${event.title}${event.body}`;
    const claimedDirection = /放空|看空|快逃|崩盤|空單/.test(text) ? "bearish" : "bullish";
    const claimIsCorrect = hash(`${seed}:${event.id}:advisor-credibility`) % 10000 < advisorAccuracy * 10000;
    return claimIsCorrect ? claimedDirection : claimedDirection === "bullish" ? "bearish" : "bullish";
  }
  return event.marketDirection;
}

const CATALOG = Array.from(new Map(events.flatMap((event) => event.choices.map((choice) => choice.asset).filter(Boolean)).map((asset) => [`${asset.category}:${asset.name}`, asset])).values());
const ETF_CATALOG = CATALOG.filter((asset) => asset.category === "ETF");

function targetsOf(event) {
  const unique = Array.from(new Map(event.choices.map((choice) => choice.asset).filter(Boolean).map((asset) => [`${asset.category}:${asset.name}`, asset])).values());
  const primary = event.choices[2]?.asset ?? unique[0] ?? CATALOG[0];
  const primaryKey = `${primary.category}:${primary.name}`;
  const linkedKey = `${event.linkedAsset.category}:${event.linkedAsset.name}`;
  const secondary = linkedKey === primaryKey ? null : CATALOG.find((target) => `${target.category}:${target.name}` === linkedKey);
  return [primary, secondary].filter(Boolean);
}

function intelAction(game, policy, random) {
  if (policy === "safe") return game.knowledge < 55 ? "research" : "observe";
  if (policy === "balanced") {
    const roll = random();
    return game.knowledge < 55 ? (roll < .55 ? "research" : roll < .9 ? "observe" : "trend") : (roll < .18 ? "research" : roll < .72 ? "observe" : "trend");
  }
  if (policy === "aggressive") return random() < .65 ? "trend" : random() < .28 ? "research" : "observe";
  if (policy === "family") return random() < .15 ? "research" : "observe";
  return ["research", "observe", "trend"][Math.floor(random() * 3)];
}

function visibleDirection(game, action, role, direction, eventHash, random) {
  const roll = eventHash % 10000 / 10000;
  if (action === "research" && role === "primary") {
    const accuracy = clamp(.78 + game.knowledge * .0017, .78, .95);
    return roll < accuracy ? direction : flip(direction);
  }
  if (action === "observe" && game.knowledge >= 35) {
    const accuracy = game.knowledge >= KNOWLEDGE_SIGNAL_BOOST_LEVEL ? .92 : game.knowledge >= KNOWLEDGE_CLEAR_SIGNAL_LEVEL ? .84 : .68;
    return roll < accuracy ? direction : flip(direction);
  }
  if (action === "trend") return roll < clamp(.55 + game.knowledge * .003, .55, .86) ? direction : flip(direction);
  return null;
}

function buy(game, asset, amount) {
  amount = Math.min(game.cash, Math.max(0, amount));
  if (amount < 3000) return;
  const fee = amount * .001425;
  const invested = Math.max(0, amount - fee);
  game.cash -= amount;
  const creditPurchase = Math.min(amount, game.uninvestedCreditProceeds);
  game.uninvestedCreditProceeds -= creditPurchase;
  game.creditInvestedAmount += creditPurchase;
  const key = `${asset.category}:${asset.name}`;
  const held = game.assets.get(key);
  if (held) {
    held.value += invested;
    held.cost += amount;
  } else {
    game.assets.set(key, { ...asset, key, value: invested, cost: amount, upStreak: 0, downStreak: 0, bullQuarters: 0, bearQuarters: 0, quarterFactor: 1 });
  }
  game.maxAssetRows = Math.max(game.maxAssetRows, game.assets.size);
  const categoryCount = new Set([...game.assets.values()].map((position) => position.category)).size;
  game.diversifiedPeak ||= game.assets.size >= 10 && categoryCount >= 4;
}

function sell(game, key, ratio) {
  const held = game.assets.get(key);
  if (!held) return;
  if (game.paperHands) ratio = 1;
  const sold = held.value * ratio;
  const sellRate = held.category === "ETF" ? .001 : held.category === "加密貨幣" ? .0015 : .003;
  game.cash += sold * (1 - sellRate);
  held.value -= sold;
  held.cost *= 1 - ratio;
  if (ratio >= .999 || held.value < 100) game.assets.delete(key);
}

function tradeOnSignal(game, policy, target, perceived, eventIndex, random) {
  const targetKey = `${target.category}:${target.name}`;
  if (policy === "safe") {
    const chosen = target.category === "ETF" ? target : ETF_CATALOG[eventIndex % ETF_CATALOG.length];
    const key = `${chosen.category}:${chosen.name}`;
    if (perceived === "bearish" && game.assets.has(key)) sell(game, key, .5);
    else if (perceived === "bullish" || eventIndex % 2 === 0) buy(game, chosen, game.cash * .06);
    return;
  }
  if (policy === "balanced") {
    if (perceived === "bullish") buy(game, target, game.cash * .12);
    else if (perceived === "bearish") sell(game, targetKey, .5);
    else if (eventIndex % 4 === 0) buy(game, ETF_CATALOG[eventIndex % ETF_CATALOG.length], game.cash * .035);
    return;
  }
  if (policy === "aggressive") {
    if (perceived === "bullish") buy(game, target, game.cash * .24);
    else if (perceived === "bearish") sell(game, targetKey, .25);
    else if (random() < .45) buy(game, target, game.cash * .1);
    return;
  }
  if (policy === "family") {
    if (target.category === "ETF" && perceived === "bullish") buy(game, target, game.cash * .04);
    else if (perceived === "bearish") sell(game, targetKey, .5);
    return;
  }
  const roll = random();
  if (roll < .42) buy(game, target, game.cash * (.03 + random() * .22));
  else if (roll < .72) sell(game, targetKey, random() < .55 ? .5 : 1);
}

function marketMonth(game, random, surprise = null) {
  let marketMove = 0;
  for (const asset of game.assets.values()) {
    const relevant = game.signals.filter((signal) => signal.key === asset.key && signal.remaining > 0);
    const pressure = relevant.reduce((sum, signal) => sum + (signal.direction === "bearish" ? signal.strength : -signal.strength), 0);
    const signalMoveMultiplier = relevant.reduce((highest, signal) => Math.max(highest, signal.moveMultiplier ?? 1), 1);
    let downChance = clamp((asset.category === "加密貨幣" ? .5 : .47) + pressure, .12, .88);
    if (asset.bearQuarters > 0) downChance = Math.max(.75, downChance);
    else if (asset.bullQuarters > 0) downChance = Math.min(.35, downChance);
    let intendedDown = random() < downChance;
    let multiplier = signalMoveMultiplier;
    if (surprise?.key === asset.key) {
      const truthful = random() < .75;
      intendedDown = surprise.direction === "bearish" ? truthful : !truthful;
      multiplier = Math.min(3, multiplier * (1.2 + random() * .5));
    }
    let moveRate;
    if (asset.category === "加密貨幣") {
      moveRate = intendedDown ? -(.006 + random() * .11) : .005 + random() * .11 * .85;
      moveRate = clamp(moveRate * multiplier, -.6, .66);
    } else {
      const dailyVolatility = asset.category === "ETF" ? .012 : asset.category === "台股" ? .019 : .022;
      const drift = (asset.category === "ETF" ? .0016 : .0024) * (intendedDown ? -1 : 1);
      const tradingDays = 20 + Math.floor(random() * 4);
      let factor = 1;
      for (let day = 0; day < tradingDays; day += 1) {
        const raw = (drift + normal(random) * dailyVolatility) * multiplier;
        const daily = asset.category === "美股" ? clamp(raw, -.3, .3) : clamp(raw, -.1, .1);
        factor *= 1 + daily;
      }
      moveRate = factor - 1;
      if ((moveRate < 0) !== intendedDown) moveRate = (intendedDown ? -1 : 1) * Math.abs(moveRate || .005);
    }
    const before = asset.value;
    asset.value = Math.max(0, before * (1 + moveRate));
    asset.quarterFactor *= 1 + moveRate;
    marketMove += asset.value - before;
  }
  game.annualMarketMove += marketMove;
  game.signals = game.signals.map((signal) => ({ ...signal, remaining: signal.remaining - 1 })).filter((signal) => signal.remaining > 0);
}

function closeQuarter(game, random) {
  for (const asset of game.assets.values()) {
    asset.bearQuarters = Math.max(0, asset.bearQuarters - 1);
    asset.bullQuarters = Math.max(0, asset.bullQuarters - 1);
    if (asset.quarterFactor >= 1) {
      asset.upStreak += 1;
      asset.downStreak = 0;
      if (asset.upStreak >= 2) asset.bullQuarters = 2;
    } else {
      asset.downStreak += 1;
      asset.upStreak = 0;
      if (asset.downStreak >= 3) asset.bearQuarters = 2;
    }
    asset.quarterFactor = 1;
  }
  if (game.stress >= 90 && random() < .5) game.health = clamp(game.health - 2);
  else if (game.stress >= 75 && random() < .35) game.health = clamp(game.health - 1);
  game.currentHighStressQuarters = game.stress >= 90 ? game.currentHighStressQuarters + 1 : 0;
  game.maxHighStressQuarters = Math.max(game.maxHighStressQuarters, game.currentHighStressQuarters);
}

function incomePath(game, policy, random) {
  if (policy === "safe") return "work";
  if (policy === "balanced") return game.year <= 3 || game.year % 2 === 1 ? "work" : "kol";
  if (policy === "aggressive") return "kol";
  if (policy === "family") return "family";
  return ["kol", "family", "work"][Math.floor(random() * 3)];
}

const kolTrackRecordIncomeBonus = (accuracy) => accuracy === null
  ? 0
  : Math.round(clamp((accuracy - .5) * 600000, -90000, 300000) / 1000) * 1000;

function chooseIncome(game, policy, random) {
  const path = incomePath(game, policy, random);
  game.yearsStarted += 1;
  if (path === "work") {
    game.parttimeYears += 1;
    game.familySupportStreak = 0;
    game.parttimeStreak += 1;
    game.workConsecutiveYears += 1;
    game.income = game.parttimeStreak < 3 ? 480000 : Math.round(600000 * Math.pow(1.04, game.parttimeStreak - 3) / 1000) * 1000;
    if (game.parttimeStreak >= 3) game.workTenureProtected = true;
    game.health = clamp(game.health - workHealthCost(game.workConsecutiveYears));
    game.stress = clamp(game.stress + 8);
  } else if (path === "kol") {
    game.kolYears += 1;
    game.familySupportStreak = 0;
    game.workConsecutiveYears = 0;
    if (!game.workTenureProtected) game.parttimeStreak = 0;
    const goodChance = game.year === 1 ? .12 : clamp(
      .18
        + game.knowledge * .0032
        + clamp(game.lastYearMarketMove / 2400000, -.1, .1)
        + (game.lastYearReadAccuracy === null ? 0 : clamp((game.lastYearReadAccuracy - .5) * .36, -.12, .16))
        + game.kolReputation * .0015,
      .12,
      .72,
    );
    const flatChance = game.year === 1 ? .18 : .25;
    const roll = random();
    const outcome = roll < goodChance ? "good" : roll < goodChance + flatChance ? "flat" : "bad";
    const trackRecordBonus = kolTrackRecordIncomeBonus(game.lastYearReadAccuracy);
    if (game.year === 1) game.income = outcome === "good" ? Math.round((20000 + random() * 40000) / 1000) * 1000 : outcome === "flat" ? Math.round(random() * 20000 / 1000) * 1000 : 0;
    else game.income = outcome === "good"
      ? Math.min(KOL_MAX_ANNUAL_INCOME, Math.round((180000 + game.knowledge * 3000 + game.kolReputation * 5000 + trackRecordBonus + random() * 535000) / 1000) * 1000)
      : outcome === "flat"
        ? Math.max(0, Math.round((60000 + game.kolReputation * 1200 + trackRecordBonus * .2 + random() * 120000) / 1000) * 1000)
        : Math.round(random() * 60000 / 1000) * 1000;
    const reputationDelta = game.year === 1
      ? outcome === "good" ? 3 : outcome === "flat" ? 0 : -2
      : outcome === "good"
        ? game.lastYearReadAccuracy !== null && game.lastYearReadAccuracy >= .75 ? 12 : game.lastYearReadAccuracy !== null && game.lastYearReadAccuracy >= .6 ? 7 : 3
        : outcome === "flat"
          ? game.lastYearReadAccuracy !== null && game.lastYearReadAccuracy >= .6 ? 2 : -2
          : -12;
    game.kolReputation = clamp(game.kolReputation + reputationDelta);
    game.maxKolIncome = Math.max(game.maxKolIncome, game.income);
    game.totalKolIncome += game.income;
    addKnowledge(game, game.year === 1 ? 3 : 2);
    const stressDelta = game.year === 1
      ? outcome === "good" ? 2 : outcome === "flat" ? 5 : 8
      : outcome === "good" ? -4 : outcome === "flat" ? 3 : 8;
    game.stress = clamp(game.stress + stressDelta);
    game.credit = clamp(game.credit + (outcome === "good" ? (game.year === 1 ? 1 : 2) : outcome === "flat" ? (game.year === 1 ? 0 : -1) : game.year === 1 ? -2 : -5));
  } else {
    game.familyIncomeYears += 1;
    const approved = random() < clamp(.3 + game.family * .007 - game.familySupportStreak * .05, .15, .9);
    const support = game.trait === "家族靠山"
      ? 400000
      : Math.min(300000, Math.max(180000, Math.round((180000 + game.family * 1500) / 1000) * 1000));
    const strain = Math.min(10, 4 + game.familySupportStreak * 2);
    game.income = approved ? support : 120000;
    game.familySupportStreak += 1;
    game.workConsecutiveYears = 0;
    if (!game.workTenureProtected) game.parttimeStreak = 0;
    game.family = clamp(game.family - (approved ? strain : 3));
    game.health = clamp(game.health - (approved ? 0 : 2));
    game.stress = clamp(game.stress + (approved ? 2 : 8));
  }
}

function maybeFamilyEvent(game, policy, random) {
  if (game.year <= 1 || random() >= .4) return;
  const choice = policy === "aggressive" ? "decline" : policy === "random" ? ["time", "money", "decline"][Math.floor(random() * 3)] : policy === "family" ? "money" : "time";
  if (choice === "time") {
    game.cash -= Math.min(Math.max(0, game.cash), Math.max(8000, Math.round(game.income * .02 / 1000) * 1000));
    game.family = clamp(game.family + 10);
    game.stress = clamp(game.stress - 3);
    game.health = clamp(game.health + 1);
  } else if (choice === "money") {
    game.cash -= Math.min(Math.max(0, game.cash), Math.max(20000, Math.round(game.income * .05 / 1000) * 1000));
    game.family = clamp(game.family + 7);
    game.stress = clamp(game.stress + 2);
    game.credit = clamp(game.credit + 1);
  } else {
    game.family = clamp(game.family - 8);
    game.stress = clamp(game.stress + 4);
  }
}

function maybeBorrow(game, policy, random) {
  let amount = 0;
  if (policy === "balanced" && [4, 7].includes(game.year)) amount = 300000;
  if (policy === "aggressive" && game.year >= 2) amount = 500000;
  if (policy === "random" && random() < .2) amount = [100000, 300000, 500000][Math.floor(random() * 3)];
  const limit = Math.min(1000000, Math.max(100000, Math.floor((game.income * 1.2 + game.credit * 4000) / 10000) * 10000));
  const capacity = Math.max(0, limit - game.generalDebt);
  if (!amount || amount > capacity) return;
  const chance = clamp(.25 + game.credit * .006 + Math.min(.2, game.income / 5000000) - amount / 1000000 * .3, .1, .95);
  if (random() < chance) {
    game.cash += amount;
    game.generalDebt += amount;
    game.cumulativeCreditBorrowed += amount;
    game.uninvestedCreditProceeds += amount;
    game.creditMonths = CREDIT_TERM_MONTHS;
    game.stress = clamp(game.stress + 2);
  } else {
    game.stress = clamp(game.stress + 4);
    game.credit = clamp(game.credit - 1);
  }
}

function maybeFamilyBorrow(game, policy, random) {
  if (!(["family", "random"].includes(policy)) || game.cash + game.income >= 240000 || random() >= .45) return;
  const tier = policy === "family" ? "medium" : ["small", "medium", "large"][Math.floor(random() * 3)];
  const amount = tier === "small" ? 20000 : tier === "medium" ? Math.max(50000, Math.round(game.income * .12 / 1000) * 1000) : Math.max(100000, Math.round(game.income * .3 / 1000) * 1000);
  const penalty = tier === "small" ? 0 : tier === "medium" ? .12 : .27;
  const approved = random() < clamp(.18 + game.family * .007 - penalty, .08, .92);
  const strain = tier === "small" ? 2 : tier === "medium" ? 5 : 9;
  game.family = clamp(game.family - (approved ? strain : 4));
  game.stress = clamp(game.stress + (approved ? Math.ceil(strain / 2) : 5));
  if (approved) {
    game.cash += amount;
    game.familyDebt += amount;
  }
}

function illnessChance(health) {
  return health >= 80 ? .02 : health >= 60 ? .04 : health >= 40 ? .1 : health >= 20 ? .15 : .25;
}

function maybeIllness(game, policy, random) {
  const existingCooldown = game.illnessCooldown;
  game.illnessCooldown = Math.max(0, existingCooldown - 1);
  if (existingCooldown > 0 || random() >= illnessChance(game.health)) return;
  const severeChance = game.health >= 80 ? .05 : game.health >= 60 ? .06 : game.health >= 40 ? .1 : game.health >= 20 ? .17 : .25;
  const moderateChance = game.health >= 80 ? .30 : game.health >= 60 ? .34 : game.health >= 40 ? .40 : game.health >= 20 ? .45 : .50;
  const roll = random();
  const severity = roll < severeChance ? "severe" : roll < severeChance + moderateChance ? "moderate" : "mild";
  const effects = severity === "mild" ? { hardHealth: -4, hardStress: 5, careHealth: 2, careStress: -2 } : severity === "moderate" ? { hardHealth: -8, hardStress: 9, careHealth: 0, careStress: -3 } : { hardHealth: -15, hardStress: 14, careHealth: -4, careStress: 2 };
  const costFactor = severity === "mild" ? .75 + random() * .3 : severity === "moderate" ? .85 + random() * .4 : .9 + random() * .2;
  const base = severity === "mild" ? Math.max(3000, game.income * .012) : severity === "moderate" ? Math.max(15000, game.income * .04) : Math.max(60000, game.income * .14);
  const fullCost = Math.round(base * costFactor / 1000) * 1000;
  game.illnesses += 1;
  game.illnessCooldown = game.health < 20 ? 2 : 4;
  const choice = policy === "safe" ? "treat" : policy === "balanced" ? (game.family >= 60 ? "family" : "treat") : policy === "aggressive" ? (severity === "severe" ? "treat" : "push") : policy === "family" ? "family" : ["push", "treat", "family"][Math.floor(random() * 3)];
  if (choice === "push") {
    const basic = Math.min(Math.max(0, game.cash), Math.max(1000, Math.round(fullCost * .08 / 1000) * 1000));
    game.cash -= basic;
    game.health = clamp(game.health + effects.hardHealth);
    game.stress = clamp(game.stress + effects.hardStress);
  } else if (choice === "treat") {
    const paid = Math.min(Math.max(0, game.cash), fullCost);
    const financed = fullCost - paid;
    game.cash -= paid;
    game.generalDebt += financed;
    game.health = clamp(game.health + effects.careHealth);
    game.stress = clamp(game.stress + effects.careStress);
    if (financed > 0) game.credit = clamp(game.credit - 2);
  } else {
    const supported = random() < clamp(.16 + game.family * .0075, .2, .92);
    if (supported) {
      const playerCost = Math.round(fullCost * .3 / 1000) * 1000;
      const paid = Math.min(Math.max(0, game.cash), playerCost);
      const financed = playerCost - paid;
      game.cash -= paid;
      game.generalDebt += financed;
      game.health = clamp(game.health + effects.careHealth + 1);
      game.stress = clamp(game.stress - 4);
      game.family = clamp(game.family + 4);
      if (financed > 0) game.credit = clamp(game.credit - 1);
    } else {
      const basic = Math.min(Math.max(0, game.cash), Math.max(1000, Math.round(fullCost * .1 / 1000) * 1000));
      game.cash -= basic;
      game.health = clamp(game.health - Math.ceil(Math.abs(effects.hardHealth) * .75));
      game.stress = clamp(game.stress + 7);
      game.family = clamp(game.family - 3);
    }
  }
}

function serviceCredit(game, availableCash) {
  let cash = Math.max(0, availableCash);
  let balance = Math.max(0, game.generalDebt);
  let months = balance > 0 ? Math.max(1, game.creditMonths || CREDIT_TERM_MONTHS) : 0;
  if (balance <= 0) return { cash, balance: 0, months: 0, shortfall: 0, principalPaid: 0 };
  const rate = CREDIT_RATE / 12;
  const growth = Math.pow(1 + rate, months);
  const scheduled = balance * rate * growth / Math.max(growth - 1, Number.EPSILON);
  let dueTotal = 0;
  let paidTotal = 0;
  let principalPaid = 0;
  for (let month = 0; month < 12 && balance > 0; month += 1) {
    const interest = balance * rate;
    const due = Math.min(balance + interest, scheduled);
    const paid = Math.min(cash, due);
    const paidInterest = Math.min(paid, interest);
    const paidPrincipal = Math.max(0, paid - paidInterest);
    balance = Math.max(0, balance - paidPrincipal + Math.max(0, interest - paidInterest));
    principalPaid += paidPrincipal;
    cash -= paid;
    dueTotal += due;
    paidTotal += paid;
    months = Math.max(0, months - 1);
  }
  return { cash, balance, months: balance > 0 ? months : 0, shortfall: dueTotal - paidTotal, principalPaid };
}

function finishYear(game, policy) {
  const living = Math.round(240000 * Math.pow(1.02, game.year - 1) / 1000) * 1000;
  const cashBefore = game.cash + game.income - living;
  const liquidityDebt = Math.max(0, -cashBefore);
  const service = serviceCredit(game, Math.max(0, cashBefore));
  game.cash = service.cash;
  game.generalDebt = service.balance + liquidityDebt;
  game.uninvestedCreditProceeds = Math.max(0, game.uninvestedCreditProceeds - service.principalPaid);
  game.creditMonths = game.generalDebt <= 0 ? 0 : liquidityDebt > 0 ? CREDIT_TERM_MONTHS : service.months;
  if (policy !== "aggressive" && game.familyDebt > 0 && game.cash > living) {
    const repaid = Math.min(game.familyDebt, game.cash - living);
    game.cash -= repaid;
    game.familyDebt -= repaid;
    game.family = clamp(game.family + (game.familyDebt < 1 ? 5 : 2));
    game.stress = clamp(game.stress - (game.familyDebt < 1 ? 4 : 2));
  }
  const debtPressure = game.generalDebt > Math.max(1000000, game.income * 4) ? 2 : game.generalDebt > Math.max(500000, game.income * 2) ? 1 : 0;
  const annualHealthRecovery = game.stress < 35 ? 3 : 1;
  game.health = clamp(game.health - Math.max(0, Math.round((game.stress - 55) / 12)) + annualHealthRecovery);
  game.stress = clamp(game.stress - 5 + (liquidityDebt > 0 ? 6 : 0) + (service.shortfall >= 1 ? 7 : 0) + debtPressure);
  game.credit = clamp(game.credit + (liquidityDebt > 0 ? -6 : service.shortfall >= 1 ? -5 : 2));
  game.lastYearMarketMove = game.annualMarketMove;
  game.lastYearReadAccuracy = game.annualDirectionalReads > 0 ? game.annualCorrectReads / game.annualDirectionalReads : null;
  game.annualCorrectReads = 0;
  game.annualDirectionalReads = 0;
  game.annualMarketMove = 0;
}

function makeGame(seedCode) {
  const trait = TRAITS[hash(`${seedCode}:trait`) % TRAITS.length];
  const bonus = trait[1];
  const healthRange = bonus.healthRange ?? INITIAL_RANGES.health;
  const familyRange = bonus.familyRange ?? INITIAL_RANGES.family;
  const paperHands = hash(`${seedCode}:special:paper-hands`) % PAPER_HANDS_CHANCE_DENOMINATOR === 0;
  return {
    year: 1,
    cash: STARTING_CASH + (trait[0] === "家族靠山" ? FAMILY_BACKER_STARTING_CASH_BONUS : 0),
    assets: new Map(),
    generalDebt: 0,
    familyDebt: 0,
    creditMonths: 0,
    health: clamp(seededInitialGauge(seedCode, "health", healthRange)),
    stress: clamp(seededInitialGauge(seedCode, "stress") + (bonus.stress ?? 0)),
    family: clamp(seededInitialGauge(seedCode, "family", familyRange) + (bonus.family ?? 0)),
    knowledge: clamp(seededInitialGauge(seedCode, "knowledge") + (bonus.knowledge ?? 0)),
    credit: clamp(seededInitialGauge(seedCode, "credit") + (bonus.credit ?? 0)),
    trait: trait[0],
    paperHands,
    income: 0,
    lastYearMarketMove: 0,
    correctSignalStreak: 0,
    maxCorrectSignalStreak: 0,
    breakoutOpportunities: 0,
    foresightSignals: 0,
    knowledgeBoostedSignals: 0,
    annualCorrectReads: 0,
    annualDirectionalReads: 0,
    totalCorrectReads: 0,
    totalDirectionalReads: 0,
    lastYearReadAccuracy: null,
    kolReputation: 0,
    maxKolIncome: 0,
    totalKolIncome: 0,
    annualMarketMove: 0,
    familySupportStreak: 0,
    parttimeStreak: 0,
    workConsecutiveYears: 0,
    workTenureProtected: false,
    illnessCooldown: 0,
    signals: [],
    yearsStarted: 0,
    kolYears: 0,
    familyIncomeYears: 0,
    parttimeYears: 0,
    illnesses: 0,
    surprises: 0,
    maxAssetRows: 0,
    cumulativeCreditBorrowed: 0,
    uninvestedCreditProceeds: 0,
    creditInvestedAmount: 0,
    currentHighStressQuarters: 0,
    maxHighStressQuarters: 0,
    diversifiedPeak: false,
    intelChoices: { research: 0, observe: 0, trend: 0 },
    totalTrendIncome: 0,
    totalTrendKnowledgeLost: 0,
    completed: false,
    ending: null,
  };
}

function unlockedAchievements(game) {
  const net = netWorth(game);
  const completed = game.completed && game.health > 0 && net > FAILURE_NET;
  const unlocked = new Set();
  if (completed && net >= RETIREMENT_NET) unlocked.add("earlyRetirement");
  if (completed && net >= 20000000) unlocked.add("retirementWaitingRoom");
  if (completed && net >= 10000000) unlocked.add("marketLegend");
  if (completed && net >= 5000000) unlocked.add("fiveMillionClub");
  if (completed && net >= 3000000) unlocked.add("steadyLanding");
  if (completed && net >= 3000000 && game.generalDebt + game.familyDebt < 1) unlocked.add("debtFreeMillionaire");
  if (completed && net > 0 && game.creditInvestedAmount >= 500000) unlocked.add("leveragedSurvivor");
  if (completed && game.yearsStarted > 0 && game.parttimeYears === game.yearsStarted) unlocked.add("workForever");
  if (completed && game.yearsStarted > 0 && game.kolYears === game.yearsStarted) unlocked.add("kolForever");
  if (completed && game.familyIncomeYears >= 6) unlocked.add("familyForever");
  if (completed && game.knowledge >= 75) unlocked.add("clearHead");
  if (completed && game.health <= 15) unlocked.add("lastBreath");
  if (completed && game.maxHighStressQuarters >= 4) unlocked.add("pressureCooker");
  if (completed && game.family >= 80) unlocked.add("familyFirst");
  if (completed && game.illnesses === 0) unlocked.add("neverSick");
  if (completed && game.illnesses >= 5) unlocked.add("frequentPatient");
  if (completed && game.surprises >= 12) unlocked.add("surpriseCollector");
  if (completed && game.paperHands && net >= 3000000) unlocked.add("paperHandsWin");
  if (completed && game.maxAssetRows <= 2 && net >= 3000000 && game.cumulativeCreditBorrowed === 0) unlocked.add("minimalist");
  if (completed && game.diversifiedPeak) unlocked.add("diversified");
  return unlocked;
}

function play(run) {
  const policy = POLICIES[run % POLICIES.length];
  const seedIndex = run + SEED_OFFSET;
  const seedCode = `SIM-${seedIndex.toString(36).toUpperCase().padStart(6, "0")}`;
  const seed = hash(`chive-life:${seedCode}`);
  const random = mulberry32(seed);
  const deck = buildLifeEventDeck(seed, YEARS);
  const game = makeGame(seedCode);

  for (let year = 1; year <= YEARS; year += 1) {
    game.year = year;
    chooseIncome(game, policy.id, random);
    maybeFamilyEvent(game, policy.id, random);
    maybeBorrow(game, policy.id, random);
    maybeFamilyBorrow(game, policy.id, random);
    if (game.health <= 0) {
      game.ending = "健康破產";
      break;
    }

    for (let season = 0; season < 4; season += 1) {
      for (let eventInSeason = 0; eventInSeason < 2; eventInSeason += 1) {
        const eventIndex = (year - 1) * EVENTS_PER_YEAR + season * 2 + eventInSeason;
        const event = deck[eventIndex];
        const action = intelAction(game, policy.id, random);
        game.intelChoices[action] += 1;
        const effects = INTEL_EFFECTS[event.kind][action];
        if (action === "research") game.cash -= 1000;
        else game.cash += effects.cash ?? 0;
        const knowledgeBeforeChoice = game.knowledge;
        if ((effects.knowledge ?? 0) < 0) game.knowledge = clamp(game.knowledge + effects.knowledge);
        else addKnowledge(game, effects.knowledge ?? 0);
        if (action === "trend") {
          game.totalTrendIncome += effects.cash ?? 0;
          game.totalTrendKnowledgeLost += Math.max(0, knowledgeBeforeChoice - game.knowledge);
        }
        game.stress = clamp(game.stress + (effects.stress ?? 0));
        game.health = clamp(game.health + (effects.health ?? 0));
        game.credit = clamp(game.credit + (effects.credit ?? 0));

        const targets = targetsOf(event);
        const eventSignalSeed = seed ^ hash(`${event.id}:${year}:${season}:${eventInSeason}`);
        const direction = directionForEvent(event, eventSignalSeed);
        const primaryTarget = targets[0];
        const primaryKey = `${primaryTarget.category}:${primaryTarget.name}`;
        const primaryHash = hash(`${seed}:${event.id}:${year}:${season}:${eventInSeason}:${primaryKey}`);
        const perceived = visibleDirection(game, action, "primary", direction, primaryHash, random);
        const readAttempted = perceived !== null;
        const readCorrect = readAttempted && perceived === direction;
        const streak = readCorrect ? game.correctSignalStreak + 1 : 0;
        const breakoutEligible = readCorrect && streak >= BREAKOUT_STREAK_TARGET && direction === "bullish";
        const breakoutUnlocked = breakoutEligible && random() < BREAKOUT_UNLOCK_CHANCE;
        const foresightUnlocked = readCorrect && game.knowledge >= KNOWLEDGE_FORESIGHT_LEVEL && random() < FORESIGHT_CHANCE;
        game.annualDirectionalReads += readAttempted ? 1 : 0;
        game.annualCorrectReads += readCorrect ? 1 : 0;
        game.totalDirectionalReads += readAttempted ? 1 : 0;
        game.totalCorrectReads += readCorrect ? 1 : 0;
        game.maxCorrectSignalStreak = Math.max(game.maxCorrectSignalStreak, streak);
        game.correctSignalStreak = breakoutUnlocked ? 0 : streak;
        if (breakoutUnlocked) game.breakoutOpportunities += 1;
        if (foresightUnlocked) game.foresightSignals += 1;
        if (readCorrect && game.knowledge >= KNOWLEDGE_SIGNAL_BOOST_LEVEL) game.knowledgeBoostedSignals += 1;

        for (const [targetIndex, target] of targets.entries()) {
          const key = `${target.category}:${target.name}`;
          const role = targetIndex === 0 ? "primary" : "linked";
          const eventHash = hash(`${seed}:${event.id}:${year}:${season}:${eventInSeason}:${key}`);
          const baseRemaining = role === "linked" ? 3 : eventHash % 2 === 0 ? 3 : 6;
          const remaining = role === "primary"
            ? Math.max(breakoutUnlocked ? 6 : 0, baseRemaining + (foresightUnlocked ? 3 : 0))
            : baseRemaining;
          const strength = (role === "linked" ? .08 : .16) + (eventHash % 5) * .01
            + (role === "primary" && foresightUnlocked ? .05 : 0)
            + (role === "primary" && breakoutUnlocked ? .1 : 0);
          const moveMultiplier = role === "primary"
            ? (readCorrect && game.knowledge >= KNOWLEDGE_SIGNAL_BOOST_LEVEL ? KNOWLEDGE_SIGNAL_MOVE_MULTIPLIER : 1)
              * (breakoutUnlocked ? BREAKOUT_MOVE_MULTIPLIER : 1)
            : 1;
          game.signals.push({ eventId: event.id, key, direction, remaining, strength, moveMultiplier });
          if (role === "primary") {
            tradeOnSignal(game, policy.id, target, perceived, eventIndex, random);
          }
        }
        marketMonth(game, random);
        if (game.health <= 0) break;
      }
      if (game.health <= 0) break;
      let surprise = null;
      if (random() < .25) {
        game.surprises += 1;
        const held = [...game.assets.values()];
        const target = held.length ? held[Math.floor(random() * held.length)] : CATALOG[Math.floor(random() * CATALOG.length)];
        surprise = { key: `${target.category}:${target.name}`, direction: random() < .5 ? "bullish" : "bearish" };
        if (held.length) {
          if (policy.id === "aggressive" && surprise.direction === "bullish") buy(game, target, game.cash * .25);
          else if (["safe", "balanced"].includes(policy.id) && surprise.direction === "bearish") sell(game, surprise.key, policy.id === "safe" ? .5 : 1);
          else if (policy.id === "random" && random() < .5) surprise.direction === "bullish" ? buy(game, target, game.cash * .2) : sell(game, surprise.key, 1);
        }
      }
      marketMonth(game, random, surprise);
      closeQuarter(game, random);
      if (game.health > 0) maybeIllness(game, policy.id, random);
      if (game.health <= 0) break;
    }

    if (game.health <= 0) {
      game.ending = "健康破產";
      break;
    }
    finishYear(game, policy.id);
    if (game.health <= 0) {
      game.ending = "健康破產";
      break;
    }
    if (netWorth(game) <= FAILURE_NET) {
      game.ending = "財務斷頭";
      break;
    }
  }

  if (!game.ending) {
    game.completed = true;
    const net = netWorth(game);
    game.ending = net >= RETIREMENT_NET ? "提前退休" : net >= 20000000 ? "退休預備席" : net >= 10000000 ? "差一點上岸" : net >= 3000000 ? "半自由人生" : net < 0 ? "退休延後" : "本金倖存者";
  }
  game.unlocked = unlockedAchievements(game);
  game.policy = policy.label;
  return game;
}

function quantile(values, q) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return Math.round(sorted[lower] + ((sorted[lower + 1] ?? sorted[lower]) - sorted[lower]) * fraction);
}

const games = Array.from({ length: RUNS }, (_, run) => play(run));
const endings = Object.fromEntries([...new Set(games.map((game) => game.ending))].map((ending) => [ending, games.filter((game) => game.ending === ending).length]));
const achievementCounts = Object.fromEntries(ACHIEVEMENTS.map(([id, title]) => [title, games.filter((game) => game.unlocked.has(id)).length]));

function summaryFor(subset) {
  const nets = subset.map(netWorth);
  const completed = subset.filter((game) => game.completed).length;
  const choiceTotal = subset.reduce((sum, game) => sum + Object.values(game.intelChoices).reduce((choiceSum, count) => choiceSum + count, 0), 0);
  const totalDirectionalReads = subset.reduce((sum, game) => sum + game.totalDirectionalReads, 0);
  const totalCorrectReads = subset.reduce((sum, game) => sum + game.totalCorrectReads, 0);
  return {
    runs: subset.length,
    completed,
    completedRate: Number((completed / subset.length).toFixed(4)),
    earlyRetirementRate: Number((subset.filter((game) => game.ending === "提前退休").length / subset.length).toFixed(4)),
    healthFailureRate: Number((subset.filter((game) => game.ending === "健康破產").length / subset.length).toFixed(4)),
    financialFailureRate: Number((subset.filter((game) => game.ending === "財務斷頭").length / subset.length).toFixed(4)),
    averageNetWorth: Math.round(nets.reduce((sum, value) => sum + value, 0) / subset.length),
    p10NetWorth: quantile(nets, .1),
    p25NetWorth: quantile(nets, .25),
    medianNetWorth: quantile(nets, .5),
    p75NetWorth: quantile(nets, .75),
    p90NetWorth: quantile(nets, .9),
    averageCash: Math.round(subset.reduce((sum, game) => sum + game.cash, 0) / subset.length),
    averageInvestments: Math.round(subset.reduce((sum, game) => sum + totalAssets(game), 0) / subset.length),
    averageHealth: Number((subset.reduce((sum, game) => sum + game.health, 0) / subset.length).toFixed(1)),
    averageStress: Number((subset.reduce((sum, game) => sum + game.stress, 0) / subset.length).toFixed(1)),
    averageFamily: Number((subset.reduce((sum, game) => sum + game.family, 0) / subset.length).toFixed(1)),
    averageKnowledge: Number((subset.reduce((sum, game) => sum + game.knowledge, 0) / subset.length).toFixed(1)),
    averageCredit: Number((subset.reduce((sum, game) => sum + game.credit, 0) / subset.length).toFixed(1)),
    averageDebt: Math.round(subset.reduce((sum, game) => sum + game.generalDebt + game.familyDebt, 0) / subset.length),
    debtFreeRate: Number((subset.filter((game) => game.generalDebt + game.familyDebt < 1).length / subset.length).toFixed(4)),
    averageYearsPlayed: Number((subset.reduce((sum, game) => sum + game.yearsStarted, 0) / subset.length).toFixed(2)),
    averageIllnesses: Number((subset.reduce((sum, game) => sum + game.illnesses, 0) / subset.length).toFixed(2)),
    averageSurprises: Number((subset.reduce((sum, game) => sum + game.surprises, 0) / subset.length).toFixed(2)),
    averageAchievements: Number((subset.reduce((sum, game) => sum + game.unlocked.size, 0) / subset.length).toFixed(2)),
    signalReadAccuracy: Number((totalCorrectReads / Math.max(1, totalDirectionalReads)).toFixed(4)),
    averageMaxCorrectSignalStreak: Number((subset.reduce((sum, game) => sum + game.maxCorrectSignalStreak, 0) / subset.length).toFixed(2)),
    averageBreakoutOpportunities: Number((subset.reduce((sum, game) => sum + game.breakoutOpportunities, 0) / subset.length).toFixed(2)),
    breakoutReachedRate: Number((subset.filter((game) => game.breakoutOpportunities > 0).length / subset.length).toFixed(4)),
    averageForesightSignals: Number((subset.reduce((sum, game) => sum + game.foresightSignals, 0) / subset.length).toFixed(2)),
    averageKnowledgeBoostedSignals: Number((subset.reduce((sum, game) => sum + game.knowledgeBoostedSignals, 0) / subset.length).toFixed(2)),
    averageTrendIncome: Math.round(subset.reduce((sum, game) => sum + game.totalTrendIncome, 0) / subset.length),
    averageTrendIncomePerChoice: Math.round(subset.reduce((sum, game) => sum + game.totalTrendIncome, 0) / Math.max(1, subset.reduce((sum, game) => sum + game.intelChoices.trend, 0))),
    averageTrendKnowledgeLost: Number((subset.reduce((sum, game) => sum + game.totalTrendKnowledgeLost, 0) / subset.length).toFixed(1)),
    averageKolReputation: Number((subset.reduce((sum, game) => sum + game.kolReputation, 0) / subset.length).toFixed(1)),
    averageKolIncome: Math.round(subset.reduce((sum, game) => sum + game.totalKolIncome, 0) / Math.max(1, subset.reduce((sum, game) => sum + game.kolYears, 0))),
    maxKolIncome: Math.max(...subset.map((game) => game.maxKolIncome)),
    intelChoiceMix: Object.fromEntries(["research", "observe", "trend"].map((action) => {
      const count = subset.reduce((sum, game) => sum + game.intelChoices[action], 0);
      return [action, { count, rate: Number((count / choiceTotal).toFixed(4)) }];
    })),
  };
}

function endingsFor(subset) {
  return Object.fromEntries([...new Set(subset.map((game) => game.ending))]
    .map((ending) => {
      const count = subset.filter((game) => game.ending === ending).length;
      return [ending, { count, rate: Number((count / subset.length).toFixed(4)) }];
    })
    .sort((left, right) => right[1].count - left[1].count));
}

const report = {
  configuration: {
    runs: RUNS,
    seedRange: `SIM ${SEED_OFFSET.toLocaleString()}–${(SEED_OFFSET + RUNS - 1).toLocaleString()}`,
    baseWorkHealthCost: BASE_WORK_HEALTH_COST,
    workHealthEscalation: WORK_HEALTH_ESCALATION,
    workHealthRule: `前兩年 −${BASE_WORK_HEALTH_COST}，第 3 年起每個連續工作年再多扣 ${WORK_HEALTH_ESCALATION}`,
    gameYears: YEARS,
    eventsPerRun: YEARS * EVENTS_PER_YEAR,
    earlyRetirementTarget: RETIREMENT_NET,
    kolIncomeCap: KOL_MAX_ANNUAL_INCOME,
    trendRewards: Object.fromEntries(Object.entries(INTEL_EFFECTS).map(([kind, effects]) => [kind, { cash: effects.trend.cash, knowledge: effects.trend.knowledge }])),
    breakoutRule: `${BREAKOUT_STREAK_TARGET} 次連續判讀正確後，偏多事件有 ${Math.round(BREAKOUT_UNLOCK_CHANCE * 100)}% 機率形成主升段，行情倍率 ${BREAKOUT_MOVE_MULTIPLIER}`,
    knowledgeThresholds: { clearSignal: KNOWLEDGE_CLEAR_SIGNAL_LEVEL, confidence: KNOWLEDGE_CONFIDENCE_LEVEL, signalBoost: KNOWLEDGE_SIGNAL_BOOST_LEVEL, foresight: KNOWLEDGE_FORESIGHT_LEVEL },
    mainTraitCount: TRAITS.length,
    paperHandsChance: 1 / PAPER_HANDS_CHANCE_DENOMINATOR,
    policies: Object.fromEntries(POLICIES.map((policy) => [policy.label, games.filter((game) => game.policy === policy.label).length])),
    note: "以五種固定策略代理玩家操作；收入、生活費、情報 A/B/C 健康代價、交易、每日複利波動、突襲、生病、信貸本息、種子初始能力、六種主體質、獨立紙手體質與結算條件均納入。不是窮舉所有真人選擇。",
  },
  overall: summaryFor(games),
  endings: Object.fromEntries(Object.entries(endings).sort((left, right) => right[1] - left[1]).map(([ending, count]) => [ending, { count, rate: Number((count / RUNS).toFixed(4)) }])),
  achievements: Object.fromEntries(ACHIEVEMENTS.map(([, title]) => [title, { count: achievementCounts[title], rate: Number((achievementCounts[title] / RUNS).toFixed(4)) }])),
  byPolicy: Object.fromEntries(POLICIES.map((policy) => [policy.label, summaryFor(games.filter((game) => game.policy === policy.label))])),
  byMainTrait: Object.fromEntries(TRAITS.map(([trait]) => {
    const subset = games.filter((game) => game.trait === trait);
    return [trait, { ...summaryFor(subset), endings: endingsFor(subset) }];
  })),
  byPaperHands: Object.fromEntries([
    ["有紙手體質", games.filter((game) => game.paperHands)],
    ["無紙手體質", games.filter((game) => !game.paperHands)],
  ].map(([label, subset]) => [label, { ...summaryFor(subset), endings: endingsFor(subset) }])),
  extremes: {
    minimumNetWorth: Math.round(Math.min(...games.map(netWorth))),
    maximumNetWorth: Math.round(Math.max(...games.map(netWorth))),
    maximumDebt: Math.round(Math.max(...games.map((game) => game.generalDebt + game.familyDebt))),
    maximumKolIncome: Math.max(...games.map((game) => game.maxKolIncome)),
    maximumBreakoutOpportunities: Math.max(...games.map((game) => game.breakoutOpportunities)),
    maximumCorrectSignalStreak: Math.max(...games.map((game) => game.maxCorrectSignalStreak)),
    maximumAchievementsInOneRun: Math.max(...games.map((game) => game.unlocked.size)),
  },
};

const reportJson = JSON.stringify(report, null, 2);
if (OUTPUT_PATH) {
  await fs.writeFile(OUTPUT_PATH, reportJson, "utf8");
  console.log(JSON.stringify({ outputPath: OUTPUT_PATH, runs: RUNS, baseWorkHealthCost: BASE_WORK_HEALTH_COST, workHealthEscalation: WORK_HEALTH_ESCALATION, seedOffset: SEED_OFFSET }));
} else {
  console.log(reportJson);
}
