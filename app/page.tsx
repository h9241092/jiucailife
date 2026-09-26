"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAnonymousRunId, postAnonymousAnalytics, type AnonymousEventType } from "./analytics";
import { buildLifeEventDeck, events as lifeEvents, type Choice, type EventKind, type GameEvent, type IntelChoiceEffects, type MarketScope } from "./event-catalog";

type GaugeKey = "health" | "stress" | "family" | "knowledge" | "credit";
type GaugeStats = Record<GaugeKey, number>;
type Position = {
  id: string;
  category: string;
  name: string;
  cost: number;
  value: number;
  loan?: number;
  declineStreak?: number;
  bearQuarters?: number;
  bearTriggered?: boolean;
  riseStreak?: number;
  bullQuarters?: number;
  bullTriggered?: boolean;
  quarterMoveFactor?: number;
};

type Resolution = {
  tone: "good" | "flat" | "bad";
  eyebrow: string;
  title: string;
  body: string;
  detail: string;
  deltas: string[];
};

type SurpriseDirection = "bullish" | "bearish";
type IntelAction = "research" | "observe" | "trend";
type SignalRole = "primary" | "linked" | "market";
type MarketSignal = {
  id: string;
  groupId: string;
  eventId: string;
  topic: string;
  role: SignalRole;
  targetCategory: string;
  targetName: string;
  direction: SurpriseDirection;
  strength: number;
  remainingMonths: number;
  totalMonths: number;
  moveMultiplier?: number;
  opportunity?: "breakout" | "knowledge" | "foresight";
  hidden?: boolean;
};
type MarketQuoteState = {
  price: number;
  previousPrice: number;
  lastMoveRate: number;
  history?: { month: number; price: number; moveRate: number }[];
  declineStreak: number;
  bearQuarters: number;
  bearTriggered: boolean;
  riseStreak: number;
  bullQuarters: number;
  bullTriggered: boolean;
  quarterMoveFactor: number;
};
type IntelRecord = {
  id: string;
  groupId: string;
  period: string;
  topic: string;
  role: SignalRole;
  targetCategory: string;
  targetName: string;
  action: IntelAction;
  actionLabel: string;
  clue: string;
  durationLabel: string;
  readDirection: SurpriseDirection | null;
  confidenceLabel?: string;
  opportunityLabel?: string;
  source?: string;
};
type QuarterSurprise = {
  id: string;
  direction: SurpriseDirection;
  title: string;
  body: string;
  quote: string;
  source: string;
  targetId?: string;
  targetName: string;
  targetCategory: string;
  outcome?: Resolution;
};

type SurpriseImpact = {
  truthful: boolean;
  declined: boolean;
  baseRate: number;
  moveRate: number;
  multiplier: number;
  before: number;
  after: number;
  tradingDays?: number;
  minDailyRate?: number;
  maxDailyRate?: number;
};

type AnnualSummary = {
  startNet: number;
  endNet: number;
  marketMove: number;
  livingCost: number;
  incomeAdded: number;
  interestPaid: number;
  creditInterestPaid: number;
  creditPrincipalPaid: number;
  creditPaymentDue: number;
  creditPaymentPaid: number;
  creditPaymentShortfall: number;
  generalInterestPaid: number;
  interestCapitalized: number;
  liquidityDebtAdded: number;
  bookkeepingCreditBonus: number;
  bookkeepingDebtStress: number;
  nextLivingCost: number;
};

type BorrowTier = "small" | "medium" | "large";
type DebtAction = "borrow" | "repay" | "creditBorrow" | "interest";
type DebtNotice = { tone: "good" | "bad"; title: string; body: string };
type IncomePath = "kol" | "family" | "parttime";
type SpecialTrait = "紙手體質" | "工作狂" | "記帳強迫症" | "你爸是董座";
type IncomeNotice = { tone: "good" | "flat" | "bad"; title: string; body: string; deltas: string[] };
type FamilyEvent = { id: string; title: string; body: string; quote: string };
type FamilyEventChoice = "time" | "money" | "decline";
type IllnessSeverity = "mild" | "moderate" | "severe";
type IllnessEvent = { id: string; severity: IllnessSeverity; title: string; body: string; quote: string; costFactor: number };
type IllnessChoice = "push" | "treat" | "family";
type IllnessNotice = { tone: "good" | "flat" | "bad"; title: string; body: string; deltas: string[] };
type BrokerAsset = { category: string; name: string };
type EventTarget = BrokerAsset & { role: SignalRole };
type CareerEventId = "mcd_overtime" | "mcd_coworker_leave" | "mcd_promotion" | "kol_sponsorship" | "kol_viral_video" | "kol_asset_crash" | "kol_investigation";
type CareerEventChoice = "A" | "B";
type CareerEventDefinition = { id: CareerEventId; eyebrow: string; title: string; body: string; quote: string };
type CareerEventNotice = { tone: "good" | "flat" | "bad"; title: string; body: string; deltas: string[] };
type KolEndorsement = { category: string; name: string; price: number; quarter: number; resolved?: boolean };
type CareerEventStats = {
  triggered: number;
  salaryBonus: number;
  kolCash: number;
  hiddenNews: number;
  lockedQuarters: number;
  overtimeAccepted: number;
  coworkerCovered: number;
  promotionsAccepted: number;
  investigations: number;
  investigationPunishments: number;
};
type AchievementStats = {
  yearsStarted: number;
  kolYears: number;
  familyIncomeYears: number;
  parttimeYears: number;
  illnesses: number;
  surprises: number;
  maxAssetRows: number;
  cumulativeCreditBorrowed: number;
  uninvestedCreditProceeds: number;
  creditInvestedAmount: number;
  currentHighStressQuarters: number;
  maxHighStressQuarters: number;
  totalHighStressQuarters: number;
  researchChoices: number;
  observeChoices: number;
  trendChoices: number;
  diversifiedPeak: boolean;
  redHatHoldingYears: number;
  maxRedHatHoldingYears: number;
};
type AchievementResult = {
  id: string;
  title: string;
  tier: "傳說" | "史詩" | "稀有" | "一般";
  description: string;
  progress: string;
  unlocked: boolean;
  hidden?: boolean;
};
type WealthSnapshot = { age: number; netWorth: number };

type Game = {
  age: number;
  year: number;
  seed: number;
  seedCode: string;
  phase: "season" | "summary" | "ending";
  season: number;
  month: number;
  name: string;
  background: string;
  occupation: string;
  trait: string;
  traitEffect: string;
  specialTrait: SpecialTrait | null;
  specialTraitEffect: string | null;
  cash: number;
  debt: number;
  familyDebt: number;
  lastFamilyBorrowYear: number | null;
  lastCreditBorrowYear: number | null;
  creditLoanMonthsRemaining: number;
  lastIncomeChoiceYear: number | null;
  incomeSource: string;
  lastYearMarketMove: number;
  correctSignalStreak: number;
  correctSignalUnclearCount: number;
  maxCorrectSignalStreak: number;
  breakoutOpportunities: number;
  annualCorrectReads: number;
  annualDirectionalReads: number;
  lastYearReadAccuracy: number | null;
  kolReputation: number;
  familySupportStreak: number;
  parttimeStreak: number;
  workConsecutiveYears: number;
  workTenureProtected: boolean;
  workPromoted: boolean;
  workBaseIncomeThisYear: number;
  income: number;
  gauges: GaugeStats;
  assets: Position[];
  result: Resolution | null;
  annualStartNet: number;
  annualDebtAdded: number;
  annualMarketMove: number;
  quarterMarketMove: number;
  annualSummary: AnnualSummary | null;
  wealthHistory: WealthSnapshot[];
  history: string[];
  surpriseSeen: string[];
  familyEventSeen: string[];
  illnessSeen: string[];
  illnessCooldown: number;
  activeSignals: MarketSignal[];
  intelRecords: IntelRecord[];
  marketQuotes: Record<string, MarketQuoteState>;
  age31InvestableNet: number | null;
  earlyRetirementQualified: boolean;
  achievementStats: AchievementStats;
  eventOrder: number[];
  careerEventCounts: Partial<Record<CareerEventId, number>>;
  careerEventStats: CareerEventStats;
  lastCareerEventPeriod: string | null;
  hiddenNewsRemaining: number;
  tradeLockUntilQuarter: number;
  investigationCooldownUntilQuarter: number;
  publicShoutCount: number;
  kolEndorsements: KolEndorsement[];
};

const seasons = ["春", "夏", "秋", "冬"];
const EVENTS_PER_SEASON = 2;
const EVENTS_PER_YEAR = seasons.length * EVENTS_PER_SEASON;
const absoluteQuarterIndex = (game: Pick<Game, "year" | "season">) => (game.year - 1) * 4 + game.season;
const periodLabel = (game: Pick<Game, "season" | "month">) => `${seasons[game.season]}季`;
const nextPeriodButtonLabel = (game: Pick<Game, "season" | "month">) => game.season >= 3
  ? "查看年度結算"
  : `進入${seasons[game.season + 1]}季`;
const STARTING_AGE = 22;
const FINAL_AGE = 31;
const LIFE_YEAR_COUNT = FINAL_AGE - STARTING_AGE;
const GAME_VERSION = "v1.1.6";
const forewordTitleLines = ["22 歲那年，", "你帶著 30 萬元走進市場。"];
const forewordTitle = forewordTitleLines.join("\n");
const forewordParagraphs = [
  "有人告訴你，努力工作就會變有錢；\n也有人告訴你，只差下一支飆股。",
  "大學畢業後，你對未來沒有答案，只知道帳戶裡還有 30 萬元。",
  "未來 9 年，每一次選擇都會影響你的資產、健康、壓力，以及你還願不願意回家吃飯。",
  "你不一定能財富自由。\n但市場很樂意先教你——自由落體。",
];
const animatedCharacters = (text: string, offset = 0) => Array.from(text).map((character, index) => character === "\n"
  ? <br key={`${offset}-${index}`} />
  : <span className="foreword-character" style={{ animationDelay: `${(offset + index) * 30}ms` }} aria-hidden="true" key={`${offset}-${index}`}>{character === " " ? "\u00a0" : character}</span>);
const money = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 });
const formatMoney = (value: number) => `${value < 0 ? "−" : ""}NT$ ${money.format(Math.abs(Math.round(value)))}`;
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const isDailyCompoundedAsset = (category: string) => ["台股", "ETF", "美股"].includes(category);
const hasTaiwanDailyLimit = (category: string) => ["台股", "ETF"].includes(category);
const hasUsDailyLimit = (category: string) => category === "美股";
const applyAssetReturnLimits = (category: string, returnRate: number) => category === "加密貨幣"
  ? clamp(returnRate, -.6, .66)
  : returnRate;
type DailyCompoundedMove = { moveRate: number; tradingDays: number; minDailyRate: number; maxDailyRate: number };
type RandomSource = () => number;
const randomNormal = (random: RandomSource) => {
  const first = Math.max(Number.EPSILON, random());
  const second = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
};

function createDailyCompoundedMove(category: string, intendedDeclined: boolean | null, multiplier = 1, random: RandomSource): DailyCompoundedMove {
  const tradingDays = 20 + Math.floor(random() * 4);
  const volatility = category === "ETF" ? .012 : category === "台股" ? .019 : .022;
  const drift = intendedDeclined === null ? 0 : (category === "ETF" ? .0016 : .0024) * (intendedDeclined ? -1 : 1);
  let chosen: DailyCompoundedMove | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    let factor = 1;
    let minDailyRate = Infinity;
    let maxDailyRate = -Infinity;
    for (let day = 0; day < tradingDays; day += 1) {
      const noise = randomNormal(random) * volatility;
      const rawDailyRate = (drift + noise) * multiplier;
      // 台股與 ETF 採 ±10% 漲跌幅限制；美股採 ±30% 漲跌幅限制。
      const dailyRate = hasTaiwanDailyLimit(category)
        ? clamp(rawDailyRate, -.1, .1)
        : hasUsDailyLimit(category)
          ? clamp(rawDailyRate, -.3, .3)
          : Math.max(-.999, rawDailyRate);
      factor *= 1 + dailyRate;
      minDailyRate = Math.min(minDailyRate, dailyRate);
      maxDailyRate = Math.max(maxDailyRate, dailyRate);
    }
    chosen = { moveRate: factor - 1, tradingDays, minDailyRate, maxDailyRate };
    if (intendedDeclined === null || (chosen.moveRate < 0) === intendedDeclined) break;
  }

  return chosen!;
}

function dailyMoveDetail(category: string, movement: DailyCompoundedMove) {
  const dailyRange = `單日實際區間 ${(movement.minDailyRate * 100).toFixed(1)}%～${(movement.maxDailyRate * 100).toFixed(1)}%`;
  const limit = hasTaiwanDailyLimit(category)
    ? "每日漲跌幅硬性限制為 −10%～+10%"
    : "美股每日漲跌幅硬性限制為 −30%～+30%";
  return `${movement.tradingDays} 個營業日逐日複利，${dailyRange}；${limit}`;
}
const QUARTER_SURPRISE_CHANCE = .25;
const FINANCIAL_FAILURE_NET_WORTH = -500000;
const EARLY_RETIREMENT_TARGET = 30000000;
const GENERAL_INTEREST_RATE = .06;
const CREDIT_LOAN_MAX = 1000000;
const CREDIT_LOAN_TERM_MONTHS = 60;
const BROKER_BUY_FEE_RATE = .001425;
const brokerSellFeeRate = (category: string) => category === "ETF" ? .001 : category === "加密貨幣" ? .0015 : .003;
const brokerCategoryOrder = ["台股", "ETF", "美股", "加密貨幣"];
const brokerCatalog: BrokerAsset[] = Array.from(new Map(
  lifeEvents.flatMap((event) => event.choices.map((choice) => choice.asset).filter((asset): asset is BrokerAsset => Boolean(asset)))
    .map((asset) => [`${asset.category}:${asset.name}`, asset]),
).values()).sort((left, right) => {
  const categoryDifference = brokerCategoryOrder.indexOf(left.category) - brokerCategoryOrder.indexOf(right.category);
  return categoryDifference || left.name.localeCompare(right.name, "zh-Hant");
});
const brokerBaseQuotes: Record<string, number> = {
  "台股:老AI解套聯盟": 56,
  "ETF:靈靈舞靈": 195,
  "台股:低鬼衛星": 142,
  "美股:紅帽美國優先組合": 3260,
  "加密貨幣:橘貓幣": 2180000,
  "台股:護國神積": 1080,
  "ETF:00九八2欸": 14.8,
  "美股:水龍頭成長股": 5480,
  "台股:貨櫃三雄聯盟": 188,
  "美股:大摩": 4160,
  "美股:皮衣算力": 6280,
  "加密貨幣:川幣": 42,
};
const marketQuoteKey = (asset: Pick<BrokerAsset, "category" | "name">) => `${asset.category}:${asset.name}`;
const initialMarketQuote = (asset: Pick<BrokerAsset, "category" | "name">): MarketQuoteState => {
  const price = brokerBaseQuotes[marketQuoteKey(asset)] ?? 100;
  return {
    price,
    previousPrice: price,
    lastMoveRate: 0,
    history: [{ month: 0, price, moveRate: 0 }],
    declineStreak: 0,
    bearQuarters: 0,
    bearTriggered: false,
    riseStreak: 0,
    bullQuarters: 0,
    bullTriggered: false,
    quarterMoveFactor: 1,
  };
};
const initialMarketQuotes = () => Object.fromEntries(brokerCatalog.map((asset) => [marketQuoteKey(asset), initialMarketQuote(asset)]));
const marketQuoteFor = (asset: Pick<BrokerAsset, "category" | "name">, game: Pick<Game, "marketQuotes">) => game.marketQuotes?.[marketQuoteKey(asset)] ?? initialMarketQuote(asset);
const marketHistoryFor = (quote: MarketQuoteState) => quote.history?.length
  ? quote.history
  : quote.previousPrice !== quote.price || quote.lastMoveRate !== 0
    ? [
        { month: 0, price: quote.previousPrice, moveRate: 0 },
        { month: 1, price: quote.price, moveRate: quote.lastMoveRate },
      ]
    : [{ month: 0, price: quote.price, moveRate: 0 }];

function AssetQuoteLabel({ asset, game, className = "target-price", label }: { asset: Pick<BrokerAsset, "category" | "name">; game: Pick<Game, "marketQuotes">; className?: string; label?: string }) {
  const quote = marketQuoteFor(asset, game);
  const tone = quote.lastMoveRate > .000001 ? "up" : quote.lastMoveRate < -.000001 ? "down" : "flat";
  const symbol = tone === "up" ? "↗" : tone === "down" ? "↘" : "→";
  const directionLabel = tone === "up" ? "上漲" : tone === "down" ? "下跌" : "尚未變動";
  return <span className={`${className} quote-${tone}`} title={`${directionLabel}${tone === "flat" ? "" : ` ${(Math.abs(quote.lastMoveRate) * 100).toFixed(1)}%`}`}>
    {label && <small>{label}</small>}{formatMoney(quote.price)} <b className="quote-arrow" aria-label={directionLabel}>{symbol}</b>{tone !== "flat" && <em>{quote.lastMoveRate > 0 ? "+" : "−"}{(Math.abs(quote.lastMoveRate) * 100).toFixed(1)}%</em>}
  </span>;
}

function AssetMiniTrend({ asset, game }: { asset: Pick<BrokerAsset, "category" | "name">; game: Pick<Game, "marketQuotes" | "assets"> }) {
  const quote = marketQuoteFor(asset, game);
  const history = marketHistoryFor(quote).slice(-13);
  const chartHistory = history.slice(-7);
  const prices = chartHistory.map((point) => point.price);
  const positions = game.assets.filter((position) => position.category === asset.category && position.name === asset.name);
  const heldValue = positions.reduce((sum, position) => sum + position.value, 0);
  const heldCost = positions.reduce((sum, position) => sum + position.cost, 0);
  const averageCostPrice = heldValue > .01 && heldCost > 0 ? quote.price * heldCost / heldValue : null;
  const scaleValues = averageCostPrice === null ? prices : [...prices, averageCostPrice];
  const minimum = Math.min(...scaleValues);
  const maximum = Math.max(...scaleValues);
  const flatRange = Math.abs(maximum - minimum) < .000001;
  const priceRange = Math.max(maximum - minimum, Math.max(maximum, 1) * .015);
  const chartY = (price: number) => flatRange ? 50 : 86 - (price - minimum) / priceRange * 72;
  const points = chartHistory.map((point, index) => ({
    ...point,
    x: chartHistory.length <= 1 ? 50 : index / (chartHistory.length - 1) * 100,
    y: chartY(point.price),
  }));
  const averageCostY = averageCostPrice === null ? null : chartY(averageCostPrice);
  const segments = points.slice(1).map((point, index) => {
    const previous = points[index];
    const dx = point.x - previous.x;
    const dy = point.y - previous.y;
    return {
      ...point,
      left: previous.x,
      top: previous.y,
      length: Math.hypot(dx, dy * (44 / 132)),
      angle: Math.atan2(dy * (44 / 132), dx) * 180 / Math.PI,
    };
  });
  const moves = history.slice(1);
  const latestDirection = moves.length ? Math.sign(moves[moves.length - 1].moveRate) : 0;
  let streak = 0;
  if (latestDirection) {
    for (let index = moves.length - 1; index >= 0 && Math.sign(moves[index].moveRate) === latestDirection; index -= 1) streak += 1;
  }
  const streakTone = latestDirection > 0 ? "up" : latestDirection < 0 ? "down" : "flat";
  const streakLabel = !moves.length
    ? "尚無歷史走勢"
    : latestDirection > 0
      ? streak > 1 ? `連 ${streak} 月上漲` : "本月上漲"
      : latestDirection < 0
        ? streak > 1 ? `連 ${streak} 月下跌` : "本月下跌"
        : "本月持平";
  return <details className={`asset-trend-details trend-${streakTone}`}>
    <summary>
      <span className="asset-sparkline" role="img" aria-label={`最近六個月實際價格走勢，${streakLabel}`}>
        {points.filter((point, index) => index > 0 && point.month % 3 === 0 && index < points.length - 1).map((point) => <i className="spark-quarter" style={{ left: `${point.x}%` }} key={`quarter-${point.month}`} />)}
        {averageCostY !== null && <i className="spark-cost-line" style={{ top: `${averageCostY}%` }} title={`平均成本 ${formatMoney(averageCostPrice!)}`} />}
        {segments.map((segment) => <i className={`spark-segment ${segment.moveRate > 0 ? "spark-up" : segment.moveRate < 0 ? "spark-down" : "spark-flat"}`} style={{ left: `${segment.left}%`, top: `${segment.top}%`, width: `${segment.length}%`, transform: `rotate(${segment.angle}deg)` }} key={`segment-${segment.month}`} />)}
        {points.map((point) => <i className={`spark-point ${point.moveRate > 0 ? "spark-up" : point.moveRate < 0 ? "spark-down" : "spark-flat"}`} style={{ left: `${point.x}%`, top: `${point.y}%` }} key={`point-${point.month}`} />)}
      </span>
      <b>實際走勢 · {streakLabel}</b><em>6月線圖 · 展開12月</em>
    </summary>
    {averageCostPrice !== null && <p className="asset-cost-legend"><i />平均成本線 {formatMoney(averageCostPrice)}</p>}
    <div className="asset-trend-months">
      {moves.length ? moves.map((point) => <span key={point.month}><i>第 {point.month} 月</i><b className={point.moveRate >= 0 ? "positive" : "negative"}>{point.moveRate >= 0 ? "+" : "−"}{(Math.abs(point.moveRate) * 100).toFixed(1)}%</b><em>{formatMoney(point.price)}</em></span>) : <p>第一個月結算後，這裡會開始累積實際價格。</p>}
    </div>
  </details>;
}
const marketScopeCategories = (scope?: MarketScope) => scope === "taiwan"
  ? ["台股"]
  : scope === "us"
    ? ["美股"]
    : scope === "global"
      ? ["台股", "美股"]
      : [];
const marketScopeLabel = (scope?: MarketScope) => scope === "taiwan"
  ? "全台股"
  : scope === "us"
    ? "全美股"
    : scope === "global"
      ? "台股＋美股"
      : "";
const signalRoleLabel = (role: SignalRole) => role === "primary" ? "主要標的" : role === "market" ? "市場連動" : "連動標的";
const eventTargetsForEvent = (event: GameEvent): EventTarget[] => {
  const uniqueTargets = Array.from(new Map(
    event.choices
      .map((choice) => choice.asset)
      .filter((asset): asset is BrokerAsset => Boolean(asset))
      .map((asset) => [`${asset.category}:${asset.name}`, asset]),
  ).values());
  const primary = event.choices[2]?.asset ?? uniqueTargets[0];
  if (!primary) return [];
  const primaryKey = `${primary.category}:${primary.name}`;
  const configuredLinkedKey = `${event.linkedAsset.category}:${event.linkedAsset.name}`;
  const secondary = configuredLinkedKey === primaryKey
    ? undefined
    : brokerCatalog.find((target) => `${target.category}:${target.name}` === configuredLinkedKey);
  const scopedCategories = new Set(marketScopeCategories(event.marketScope));
  const candidates: EventTarget[] = [
    { ...primary, role: "primary" },
    ...(secondary ? [{ ...secondary, role: "linked" as const }] : []),
    ...brokerCatalog.filter((target) => scopedCategories.has(target.category)).map((target) => ({ ...target, role: "market" as const })),
  ];
  return Array.from(candidates.reduce((targets, target) => {
    const key = `${target.category}:${target.name}`;
    if (!targets.has(key)) targets.set(key, target);
    return targets;
  }, new Map<string, EventTarget>()).values());
};
const blankAchievementStats = (): AchievementStats => ({
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
  totalHighStressQuarters: 0,
  researchChoices: 0,
  observeChoices: 0,
  trendChoices: 0,
  diversifiedPeak: false,
  redHatHoldingYears: 0,
  maxRedHatHoldingYears: 0,
});
const blankCareerEventStats = (): CareerEventStats => ({
  triggered: 0,
  salaryBonus: 0,
  kolCash: 0,
  hiddenNews: 0,
  lockedQuarters: 0,
  overtimeAccepted: 0,
  coworkerCovered: 0,
  promotionsAccepted: 0,
  investigations: 0,
  investigationPunishments: 0,
});
const achievementStatsForAssets = (stats: AchievementStats, assets: Position[], purchaseAmount = 0): AchievementStats => {
  const categoryCount = new Set(assets.filter((asset) => brokerCategoryOrder.includes(asset.category)).map((asset) => asset.category)).size;
  const creditPurchase = Math.min(Math.max(0, purchaseAmount), stats.uninvestedCreditProceeds);
  return {
    ...stats,
    maxAssetRows: Math.max(stats.maxAssetRows, assets.length),
    uninvestedCreditProceeds: Math.max(0, stats.uninvestedCreditProceeds - creditPurchase),
    creditInvestedAmount: stats.creditInvestedAmount + creditPurchase,
    diversifiedPeak: stats.diversifiedPeak || (assets.length >= 10 && categoryCount >= brokerCategoryOrder.length),
  };
};
const netWorth = (game: Pick<Game, "cash" | "debt" | "assets">) => game.cash + game.assets.reduce((sum, asset) => sum + asset.value, 0) - game.debt;
const formatChartMoney = (value: number) => {
  const sign = value < 0 ? "−" : "";
  const absolute = Math.abs(value);
  if (absolute >= 100000000) return `${sign}${(absolute / 100000000).toFixed(1).replace(/\.0$/, "")} 億`;
  if (absolute >= 10000) return `${sign}${(absolute / 10000).toFixed(absolute >= 1000000 ? 0 : 1).replace(/\.0$/, "")} 萬`;
  return `${sign}${money.format(Math.round(absolute))}`;
};
const endingWealthHistory = (game: Game) => {
  const history = game.wealthHistory?.length ? [...game.wealthHistory] : [{ age: STARTING_AGE, netWorth: 300000 }];
  const finalNetWorth = netWorth(game);
  const latest = history[history.length - 1];
  if (!latest || latest.age !== game.age || Math.abs(latest.netWorth - finalNetWorth) >= 1) history.push({ age: game.age, netWorth: finalNetWorth });
  return history;
};

function WealthHistoryChart({ game }: { game: Game }) {
  const history = endingWealthHistory(game);
  const values = history.map((snapshot) => snapshot.netWorth);
  const scaleMinimum = Math.min(0, ...values);
  const scaleMaximum = Math.max(0, ...values);
  const scaleRange = Math.max(1, scaleMaximum - scaleMinimum);
  const chartY = (value: number) => 88 - (value - scaleMinimum) / scaleRange * 76;
  const points = history.map((snapshot, index) => ({
    ...snapshot,
    x: history.length <= 1 ? 50 : index / (history.length - 1) * 100,
    y: chartY(snapshot.netWorth),
  }));
  const highest = history.reduce((best, snapshot) => snapshot.netWorth > best.netWorth ? snapshot : best);
  const lowest = history.reduce((worst, snapshot) => snapshot.netWorth < worst.netWorth ? snapshot : worst);
  const totalChange = history[history.length - 1].netWorth - history[0].netWorth;
  const zeroY = chartY(0);
  const ariaSummary = history.map((snapshot) => `${snapshot.age} 歲 ${formatMoney(snapshot.netWorth)}`).join("、");
  return <section className="wealth-history-card" aria-labelledby="wealth-history-title">
    <header>
      <div><span>歷年總財產</span><h2 id="wealth-history-title">你的財富走勢</h2></div>
      <b className={totalChange >= 0 ? "positive" : "negative"}>{totalChange >= 0 ? "+" : "−"}{formatMoney(Math.abs(totalChange)).replace("NT$ ", "")}</b>
    </header>
    <div className="wealth-chart-layout">
      <div className="wealth-chart-scale" aria-hidden="true"><span>{formatChartMoney(scaleMaximum)}</span><span>{formatChartMoney(scaleMinimum)}</span></div>
      <div className="wealth-chart-plot" role="img" aria-label={`22 歲至結算時的歷年淨資產折線圖：${ariaSummary}`}>
        <svg className="wealth-chart-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          {[12, 31, 50, 69, 88].map((top) => <line className="wealth-chart-gridline" x1="0" x2="100" y1={top} y2={top} vectorEffect="non-scaling-stroke" key={top} />)}
          {zeroY >= 12 && zeroY <= 88 && <line className="wealth-chart-zero" x1="0" x2="100" y1={zeroY} y2={zeroY} vectorEffect="non-scaling-stroke" />}
          {points.slice(1).map((point, index) => {
            const previous = points[index];
            return <line className={`wealth-chart-segment ${point.netWorth >= previous.netWorth ? "wealth-up" : "wealth-down"}`} x1={previous.x} x2={point.x} y1={previous.y} y2={point.y} vectorEffect="non-scaling-stroke" key={`wealth-segment-${index}`} />;
          })}
        </svg>
        {zeroY >= 12 && zeroY <= 88 && <span className="wealth-chart-zero-label" style={{ top: `${zeroY}%` }}>0</span>}
        {points.map((point, index) => <i className={`wealth-chart-point ${point.netWorth < 0 ? "wealth-negative" : ""} ${index === points.length - 1 ? "wealth-final" : ""}`} style={{ left: `${point.x}%`, top: `${point.y}%` }} title={`${point.age} 歲 ${formatMoney(point.netWorth)}`} key={`wealth-point-${index}`} />)}
      </div>
    </div>
    <div className="wealth-chart-ages" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }} aria-hidden="true">
      {points.map((point, index) => <span key={`wealth-age-${index}`}>{point.age}<small>歲</small></span>)}
    </div>
    <footer>
      <span>起點<b>{formatMoney(history[0].netWorth)}</b></span>
      <span>最高 · {highest.age} 歲<b>{formatMoney(highest.netWorth)}</b></span>
      <span>最低 · {lowest.age} 歲<b>{formatMoney(lowest.netWorth)}</b></span>
      <span>最終<b className={history[history.length - 1].netWorth < 0 ? "negative" : ""}>{formatMoney(history[history.length - 1].netWorth)}</b></span>
    </footer>
  </section>;
}

const ENDING_SHARE_WIDTH = 1080;
const ENDING_SHARE_HEIGHT = 1920;
const ENDING_SHARE_FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", Arial, sans-serif';

function roundedCanvasRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function fittedCanvasFont(context: CanvasRenderingContext2D, text: string, maximumWidth: number, preferredSize: number, minimumSize: number, weight = 800) {
  let size = preferredSize;
  while (size > minimumSize) {
    context.font = `${weight} ${size}px ${ENDING_SHARE_FONT}`;
    if (context.measureText(text).width <= maximumWidth) return size;
    size -= 2;
  }
  context.font = `${weight} ${minimumSize}px ${ENDING_SHARE_FONT}`;
  return minimumSize;
}

function drawWrappedCanvasText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maximumWidth: number, lineHeight: number, maximumLines: number) {
  const characters = Array.from(text);
  const lines: string[] = [];
  let line = "";
  characters.forEach((character) => {
    const candidate = `${line}${character}`;
    if (line && context.measureText(candidate).width > maximumWidth) {
      lines.push(line);
      line = character;
    } else line = candidate;
  });
  if (line) lines.push(line);
  const visibleLines = lines.slice(0, maximumLines);
  if (lines.length > maximumLines && visibleLines.length) {
    let last = visibleLines[visibleLines.length - 1];
    while (last.length && context.measureText(`${last}…`).width > maximumWidth) last = last.slice(0, -1);
    visibleLines[visibleLines.length - 1] = `${last}…`;
  }
  visibleLines.forEach((visibleLine, index) => context.fillText(visibleLine, x, y + index * lineHeight));
  return y + visibleLines.length * lineHeight;
}

function canvasPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG_EXPORT_FAILED")), "image/png");
  });
}

async function endingCardPng(game: Game, achievements: AchievementResult[]) {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = ENDING_SHARE_WIDTH;
  canvas.height = ENDING_SHARE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CANVAS_UNAVAILABLE");

  const palette = {
    background: "#080b14", panel: "#101626", panelDeep: "#0b0f1a", line: "#2d3655",
    ink: "#eef2ff", muted: "#8f99b7", green: "#43dcc0", lime: "#c7f36b",
    red: "#ff6f7d", blue: "#6e7cff", gold: "#f5c866",
  };
  const panel = (x: number, y: number, width: number, height: number, radius = 28) => {
    roundedCanvasRect(context, x, y, width, height, radius);
    context.fillStyle = palette.panel;
    context.fill();
    context.strokeStyle = palette.line;
    context.lineWidth = 2;
    context.stroke();
  };
  const drawStat = (label: string, value: string, x: number, y: number, width: number, tone = palette.ink) => {
    roundedCanvasRect(context, x, y, width, 104, 18);
    context.fillStyle = palette.panelDeep;
    context.fill();
    context.strokeStyle = palette.line;
    context.stroke();
    context.textAlign = "left";
    context.fillStyle = palette.muted;
    context.font = `700 22px ${ENDING_SHARE_FONT}`;
    context.fillText(label, x + 22, y + 35);
    context.fillStyle = tone;
    fittedCanvasFont(context, value, width - 44, 32, 23, 850);
    context.fillText(value, x + 22, y + 79);
  };

  const background = context.createLinearGradient(0, 0, ENDING_SHARE_WIDTH, ENDING_SHARE_HEIGHT);
  background.addColorStop(0, "#080b14");
  background.addColorStop(.55, "#0b1020");
  background.addColorStop(1, "#10162a");
  context.fillStyle = background;
  context.fillRect(0, 0, ENDING_SHARE_WIDTH, ENDING_SHARE_HEIGHT);
  context.textBaseline = "alphabetic";

  const markGradient = context.createLinearGradient(64, 58, 150, 144);
  markGradient.addColorStop(0, palette.green);
  markGradient.addColorStop(1, palette.blue);
  roundedCanvasRect(context, 64, 58, 86, 86, 24);
  context.fillStyle = markGradient;
  context.fill();
  context.textAlign = "center";
  context.fillStyle = "white";
  context.font = `900 50px ${ENDING_SHARE_FONT}`;
  context.fillText("韭", 107, 119);
  context.textAlign = "left";
  context.fillStyle = palette.ink;
  context.font = `850 34px ${ENDING_SHARE_FONT}`;
  context.fillText("韭菜人生模擬器", 174, 96);
  context.fillStyle = palette.muted;
  context.font = `800 19px ${ENDING_SHARE_FONT}`;
  context.fillText("JIU-CAI LIFE", 176, 129);
  context.textAlign = "right";
  context.fillStyle = palette.muted;
  context.font = `700 19px ${ENDING_SHARE_FONT}`;
  context.fillText(`${GAME_VERSION}  ·  種子 ${game.seedCode}`, 1016, 89);
  context.fillText(`${game.age} 歲結算`, 1016, 121);

  const [endingTitle, endingDescription] = titleForEnding(game);
  context.textAlign = "left";
  context.fillStyle = palette.green;
  context.font = `850 22px ${ENDING_SHARE_FONT}`;
  context.fillText("我的韭菜人生結算", 64, 205);
  context.fillStyle = palette.ink;
  fittedCanvasFont(context, endingTitle, 952, 78, 58, 900);
  context.fillText(endingTitle, 64, 286);
  context.fillStyle = palette.muted;
  context.font = `600 26px ${ENDING_SHARE_FONT}`;
  drawWrappedCanvasText(context, endingDescription, 64, 337, 952, 40, 2);

  const net = netWorth(game);
  const totalAssets = game.assets.reduce((sum, asset) => sum + asset.value, 0);
  const wealthHistory = endingWealthHistory(game);
  const wealthValues = wealthHistory.map((snapshot) => snapshot.netWorth);
  const highest = wealthHistory.reduce((best, snapshot) => snapshot.netWorth > best.netWorth ? snapshot : best);
  const lowest = wealthHistory.reduce((worst, snapshot) => snapshot.netWorth < worst.netWorth ? snapshot : worst);
  const wealthChange = wealthHistory[wealthHistory.length - 1].netWorth - wealthHistory[0].netWorth;

  const worthGradient = context.createLinearGradient(64, 410, 1016, 610);
  worthGradient.addColorStop(0, "#1d866f");
  worthGradient.addColorStop(1, "#5968dd");
  roundedCanvasRect(context, 64, 410, 952, 200, 30);
  context.fillStyle = worthGradient;
  context.fill();
  context.fillStyle = "rgba(255,255,255,.82)";
  context.font = `750 24px ${ENDING_SHARE_FONT}`;
  context.fillText("最終淨資產", 104, 462);
  context.fillStyle = "white";
  fittedCanvasFont(context, formatMoney(net), 872, 74, 48, 900);
  context.fillText(formatMoney(net), 104, 552);

  panel(64, 642, 952, 506);
  context.fillStyle = palette.muted;
  context.font = `800 20px ${ENDING_SHARE_FONT}`;
  context.fillText("歷年總財產", 96, 687);
  context.fillStyle = palette.ink;
  context.font = `850 36px ${ENDING_SHARE_FONT}`;
  context.fillText("你的財富走勢", 96, 732);
  context.textAlign = "right";
  context.fillStyle = wealthChange >= 0 ? palette.green : palette.red;
  context.font = `850 32px ${ENDING_SHARE_FONT}`;
  context.fillText(`${wealthChange >= 0 ? "+" : "−"}${formatMoney(Math.abs(wealthChange)).replace("NT$ ", "")}`, 984, 724);

  const plot = { x: 108, y: 774, width: 864, height: 224 };
  const scaleMinimum = Math.min(0, ...wealthValues);
  const scaleMaximum = Math.max(0, ...wealthValues);
  const scaleRange = Math.max(1, scaleMaximum - scaleMinimum);
  const pointX = (index: number) => wealthHistory.length <= 1 ? plot.x + plot.width / 2 : plot.x + index / (wealthHistory.length - 1) * plot.width;
  const pointY = (value: number) => plot.y + plot.height - 18 - (value - scaleMinimum) / scaleRange * (plot.height - 36);
  context.lineWidth = 1;
  context.strokeStyle = "rgba(143,153,183,.24)";
  [0, .25, .5, .75, 1].forEach((position) => {
    const y = plot.y + position * plot.height;
    context.beginPath(); context.moveTo(plot.x, y); context.lineTo(plot.x + plot.width, y); context.stroke();
  });
  if (scaleMinimum < 0 && scaleMaximum > 0) {
    const zeroY = pointY(0);
    context.setLineDash([8, 8]);
    context.strokeStyle = "rgba(245,200,102,.6)";
    context.beginPath(); context.moveTo(plot.x, zeroY); context.lineTo(plot.x + plot.width, zeroY); context.stroke();
    context.setLineDash([]);
  }
  wealthHistory.slice(1).forEach((snapshot, index) => {
    const previous = wealthHistory[index];
    context.beginPath();
    context.moveTo(pointX(index), pointY(previous.netWorth));
    context.lineTo(pointX(index + 1), pointY(snapshot.netWorth));
    context.strokeStyle = snapshot.netWorth >= previous.netWorth ? palette.green : palette.red;
    context.lineWidth = 6;
    context.lineCap = "round";
    context.stroke();
  });
  wealthHistory.forEach((snapshot, index) => {
    context.beginPath();
    context.arc(pointX(index), pointY(snapshot.netWorth), index === wealthHistory.length - 1 ? 10 : 7, 0, Math.PI * 2);
    context.fillStyle = snapshot.netWorth >= 0 ? palette.green : palette.red;
    context.fill();
    context.lineWidth = 4;
    context.strokeStyle = palette.panelDeep;
    context.stroke();
  });
  context.fillStyle = palette.muted;
  context.font = `700 18px ${ENDING_SHARE_FONT}`;
  context.textAlign = "center";
  wealthHistory.forEach((snapshot, index) => {
    if (index === 0 || index === wealthHistory.length - 1 || snapshot.age % 2 === 0) context.fillText(`${snapshot.age}歲`, pointX(index), 1032);
  });
  context.textAlign = "left";
  const footerItems = [
    ["起點", formatMoney(wealthHistory[0].netWorth)],
    [`最高 · ${highest.age}歲`, formatMoney(highest.netWorth)],
    [`最低 · ${lowest.age}歲`, formatMoney(lowest.netWorth)],
    ["最終", formatMoney(net)],
  ];
  footerItems.forEach(([label, value], index) => {
    const x = 96 + index * 222;
    context.fillStyle = palette.muted;
    context.font = `700 17px ${ENDING_SHARE_FONT}`;
    context.fillText(label, x, 1083);
    context.fillStyle = palette.ink;
    fittedCanvasFont(context, value, 202, 23, 17, 800);
    context.fillText(value, x, 1115);
  });

  panel(64, 1180, 952, 314);
  context.fillStyle = palette.muted;
  context.font = `800 20px ${ENDING_SHARE_FONT}`;
  context.fillText("角色結算", 96, 1223);
  context.fillStyle = palette.ink;
  context.font = `900 36px ${ENDING_SHARE_FONT}`;
  context.fillText(game.name, 96, 1268);
  context.fillStyle = palette.muted;
  context.font = `650 21px ${ENDING_SHARE_FONT}`;
  context.fillText(`${game.background} · ${game.occupation || "無業"}`, 96, 1303);
  context.textAlign = "right";
  context.fillStyle = palette.green;
  fittedCanvasFont(context, `${game.trait}${game.specialTrait ? ` · ${game.specialTrait}` : ""}`, 430, 23, 17, 800);
  context.fillText(`${game.trait}${game.specialTrait ? ` · ${game.specialTrait}` : ""}`, 984, 1268);
  const statWidth = 210;
  drawStat("現金", formatMoney(game.cash), 96, 1334, statWidth);
  drawStat("投資資產", formatMoney(totalAssets), 320, 1334, statWidth);
  drawStat("負債", formatMoney(game.debt), 544, 1334, statWidth, game.debt > 0 ? palette.red : palette.ink);
  drawStat("知識／健康／壓力", `${game.gauges.knowledge}／${game.gauges.health}／${game.gauges.stress}`, 768, 1334, 216);

  const visibleAchievements = achievementsVisibleAtEnding(achievements);
  const unlocked = visibleAchievements.filter((achievement) => achievement.unlocked);
  context.textAlign = "left";
  context.fillStyle = palette.muted;
  context.font = `800 20px ${ENDING_SHARE_FONT}`;
  context.fillText("本局解鎖成就", 64, 1555);
  context.fillStyle = palette.ink;
  context.font = `900 34px ${ENDING_SHARE_FONT}`;
  context.fillText(`${unlocked.length}／${visibleAchievements.length}`, 64, 1598);
  context.fillStyle = palette.muted;
  const achievementSummary = unlocked.length
    ? `傷疤已成功鑄成徽章${unlocked.length > 6 ? ` · 另有 ${unlocked.length - 6} 項` : ""}`
    : "這局先留下經驗，徽章下次再拿";
  fittedCanvasFont(context, achievementSummary, 800, 19, 15, 650);
  context.fillText(achievementSummary, 184, 1595);
  const tierColors: Record<AchievementResult["tier"], string> = { 傳說: palette.gold, 史詩: "#d59cff", 稀有: palette.green, 一般: palette.lime };
  const visibleAchievementCards = unlocked.slice(0, 6);
  if (visibleAchievementCards.length) {
    visibleAchievementCards.forEach((achievement, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 64 + column * 484;
      const y = 1632 + row * 82;
      roundedCanvasRect(context, x, y, 468, 68, 16);
      context.fillStyle = "rgba(16,22,38,.92)";
      context.fill();
      context.strokeStyle = tierColors[achievement.tier];
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = tierColors[achievement.tier];
      context.font = `850 17px ${ENDING_SHARE_FONT}`;
      context.fillText(achievement.tier, x + 18, y + 27);
      context.fillStyle = palette.ink;
      fittedCanvasFont(context, achievement.title, 330, 23, 17, 800);
      context.fillText(achievement.title, x + 116, y + 43);
    });
  } else {
    roundedCanvasRect(context, 64, 1632, 952, 150, 22);
    context.fillStyle = palette.panel;
    context.fill();
    context.strokeStyle = palette.line;
    context.stroke();
    context.fillStyle = palette.muted;
    context.font = `700 24px ${ENDING_SHARE_FONT}`;
    context.textAlign = "center";
    context.fillText("尚未解鎖成就，再活一次看看。", 540, 1720);
  }

  context.textAlign = "left";
  context.fillStyle = palette.green;
  context.font = `850 21px ${ENDING_SHARE_FONT}`;
  context.fillText("市場有風險，韭菜有新鮮度。", 64, 1880);
  context.textAlign = "right";
  context.fillStyle = palette.muted;
  context.font = `700 17px ${ENDING_SHARE_FONT}`;
  context.fillText("jiucai-life-simulator.mmrichdog.workers.dev", 1016, 1880);

  return canvasPng(canvas);
}
const addKnowledge = (gauges: GaugeStats, baseGain: number) => {
  const remainingFactor = Math.pow(Math.max(0, 100 - gauges.knowledge) / 100, 1.35);
  const scaledGain = baseGain > 0 && gauges.knowledge < 95 ? Math.max(1, Math.round(baseGain * remainingFactor)) : 0;
  const gain = Math.max(0, Math.min(95 - gauges.knowledge, scaledGain));
  gauges.knowledge = clamp(gauges.knowledge + gain);
  return gain;
};
const LIFE_EVENT_SLOT_COUNT = LIFE_YEAR_COUNT * EVENTS_PER_YEAR;
const freshEventOrder = () => Array.from({ length: LIFE_EVENT_SLOT_COUNT }, (_, index) => index);
type EventSelection = { event: GameEvent | null; order: number[]; needsCommit: boolean };
const selectAffordableCurrentEvent = (game: Game, deck: GameEvent[]): EventSelection => {
  const orderIsValid = game.eventOrder?.length === deck.length;
  const order = orderIsValid ? game.eventOrder : freshEventOrder();
  const slot = (game.year - 1) * EVENTS_PER_YEAR + game.season * EVENTS_PER_SEASON + game.month;
  const current = deck[order[slot]] ?? null;
  return { event: current, order, needsCommit: !orderIsValid };
};
const leverageDebtOf = (assets: Position[]) => assets
  .reduce((sum, asset) => sum + (asset.loan ?? 0), 0);
const investableNetWorth = (game: Pick<Game, "cash" | "debt" | "assets">) => game.cash + game.assets.reduce((sum, asset) => sum + asset.value, 0) - game.debt;
const creditLoanLimit = (game: Pick<Game, "income" | "gauges">) => {
  const incomeWeight = game.income * 1.2;
  const creditWeight = game.gauges.credit * 4000;
  return Math.min(CREDIT_LOAN_MAX, Math.max(100000, Math.floor((incomeWeight + creditWeight) / 10000) * 10000));
};
const creditLoanChance = (game: Pick<Game, "income" | "gauges">, amount: number) => clamp(
  .25 + game.gauges.credit * .006 + Math.min(.2, game.income / 5000000) - amount / CREDIT_LOAN_MAX * .3,
  .1,
  .95,
);
const monthlyCreditPayment = (principal: number, monthsRemaining = CREDIT_LOAN_TERM_MONTHS) => {
  if (principal <= 0) return 0;
  const monthlyRate = GENERAL_INTEREST_RATE / 12;
  const months = Math.max(1, monthsRemaining);
  const growth = Math.pow(1 + monthlyRate, months);
  return principal * monthlyRate * growth / Math.max(growth - 1, Number.EPSILON);
};
type CreditServiceResult = {
  cash: number;
  balance: number;
  monthsRemaining: number;
  principalPaid: number;
  interestPaid: number;
  interestCapitalized: number;
  paymentDue: number;
  paymentPaid: number;
};
const serviceAnnualCreditDebt = (principal: number, availableCash: number, remainingMonths: number): CreditServiceResult => {
  let cash = Math.max(0, availableCash);
  let balance = Math.max(0, principal);
  let monthsRemaining = balance > 0 ? Math.max(1, remainingMonths || CREDIT_LOAN_TERM_MONTHS) : 0;
  let principalPaid = 0;
  let interestPaid = 0;
  let interestCapitalized = 0;
  let paymentDue = 0;
  let paymentPaid = 0;
  const monthlyRate = GENERAL_INTEREST_RATE / 12;
  const scheduledMonthlyPayment = monthlyCreditPayment(balance, monthsRemaining);

  for (let month = 0; month < 12 && balance > 0; month += 1) {
    const interestDue = balance * monthlyRate;
    const scheduledDue = Math.min(balance + interestDue, scheduledMonthlyPayment);
    const paid = Math.min(cash, scheduledDue);
    const paidInterest = Math.min(paid, interestDue);
    const paidPrincipal = Math.max(0, paid - paidInterest);
    const capitalizedInterest = Math.max(0, interestDue - paidInterest);
    balance = Math.max(0, balance - paidPrincipal + capitalizedInterest);
    cash -= paid;
    principalPaid += paidPrincipal;
    interestPaid += paidInterest;
    interestCapitalized += capitalizedInterest;
    paymentDue += scheduledDue;
    paymentPaid += paid;
    monthsRemaining = Math.max(0, monthsRemaining - 1);
  }

  return { cash, balance, monthsRemaining: balance > 0 ? monthsRemaining : 0, principalPaid, interestPaid, interestCapitalized, paymentDue, paymentPaid };
};
const familyBorrowAmount = (game: Pick<Game, "income">, tier: BorrowTier) => tier === "small" ? 20000 : tier === "medium" ? Math.max(50000, Math.round(game.income * .12 / 1000) * 1000) : Math.max(100000, Math.round(game.income * .3 / 1000) * 1000);
const familyBorrowChance = (game: Pick<Game, "gauges">, tier: BorrowTier) => {
  const penalty = tier === "small" ? 0 : tier === "medium" ? .12 : .27;
  return clamp(.18 + game.gauges.family * .007 - penalty, .08, .92);
};
const FIRST_YEAR_KOL_GOOD_CHANCE = .12;
const FIRST_YEAR_KOL_FLAT_CHANCE = .18;
const KOL_FLAT_CHANCE = .25;
const KOL_MAX_ANNUAL_INCOME = 1560000;
const WORKAHOLIC_KOL_MAX_ANNUAL_INCOME = 1800000;
const WORKAHOLIC_ANNUAL_INCOME_MULTIPLIER = 1.08;
const WORKAHOLIC_CAREER_EVENT_MULTIPLIER = 1.15;
const KOL_GOOD_VARIABLE_INCOME = 535000;
const KNOWLEDGE_CLEAR_SIGNAL_LEVEL = 63;
const KNOWLEDGE_CONFIDENCE_LEVEL = 75;
const KNOWLEDGE_SIGNAL_BOOST_LEVEL = 86;
const KNOWLEDGE_FORESIGHT_LEVEL = 93;
const KNOWLEDGE_SIGNAL_MOVE_MULTIPLIER = 1.1;
const FORESIGHT_CHANCE_PERCENT = 25;
const BREAKOUT_STREAK_TARGET = 3;
const BREAKOUT_UNLOCK_CHANCE_PERCENT = 15.7;
const BREAKOUT_MOVE_MULTIPLIER = 1.6;
const OUTSIDE_WORK_ANNUAL_INCOME = 480000;
const EXPERIENCED_WORK_BASE_INCOME = 600000;
const WORK_RAISE_STREAK = 3;
const WORK_TENURE_PROTECTION_STREAK = 3;
const ANNUAL_WORK_RAISE_RATE = .04;
const outsideWorkIncome = (streak: number) => streak < WORK_RAISE_STREAK
  ? OUTSIDE_WORK_ANNUAL_INCOME
  : Math.round(EXPERIENCED_WORK_BASE_INCOME * Math.pow(1 + ANNUAL_WORK_RAISE_RATE, streak - WORK_RAISE_STREAK) / 1000) * 1000;
const rankedWorkIncome = (streak: number, promoted: boolean) => Math.round(outsideWorkIncome(streak) * (promoted ? 1.18 : 1) / 1000) * 1000;
const annualCareerIncome = (amount: number, specialTrait: SpecialTrait | null) => Math.round(
  amount * (specialTrait === "工作狂" ? WORKAHOLIC_ANNUAL_INCOME_MULTIPLIER : 1) / 1000,
) * 1000;
const careerEventIncome = (amount: number, specialTrait: SpecialTrait | null) => Math.round(
  amount * (specialTrait === "工作狂" ? WORKAHOLIC_CAREER_EVENT_MULTIPLIER : 1) / 1000,
) * 1000;
const kolAnnualIncomeCap = (specialTrait: SpecialTrait | null) => specialTrait === "工作狂"
  ? WORKAHOLIC_KOL_MAX_ANNUAL_INCOME
  : KOL_MAX_ANNUAL_INCOME;
const workHealthCost = (consecutiveYears: number) => 5 + Math.max(0, consecutiveYears - 2);
const LEARNING_COST = 5000;
const INTEL_RESEARCH_COST = 1000;
const careerEventDefinitions: Record<CareerEventId, CareerEventDefinition> = {
  mcd_overtime: {
    id: "mcd_overtime",
    eyebrow: "麥當當職場事件",
    title: "主管問你：今晚能不能留下來加班？",
    body: "晚班缺人，主管把加班表推到你面前。多賺一筆，就得拿本季的市場情報交換。",
    quote: "錢會進帳，但新聞不會等你下班。",
  },
  mcd_coworker_leave: {
    id: "mcd_coworker_leave",
    eyebrow: "麥當當職場事件",
    title: "同事臨時請假，群組只剩你還沒已讀。",
    body: "代班能多換一點收入，但你會錯過下一則市場新聞；婉拒則照常看完兩則。",
    quote: "今天救班，明天不一定有人救你的持倉。",
  },
  mcd_promotion: {
    id: "mcd_promotion",
    eyebrow: "麥當當升遷事件",
    title: "店長把值班主管的名牌放到你面前。",
    body: "收入會永久提高，但健康與壓力成本也會加重；從此每季只能完整看到一則市場新聞。",
    quote: "升遷不是免費午餐，只是比較貴的員工餐。",
  },
  kol_sponsorship: {
    id: "kol_sponsorship",
    eyebrow: "投資 KOL 職業事件",
    title: "品牌主動找上門，希望你替產品說幾句好話。",
    body: "直接照稿能拿滿業配費；先查證只拿六成，但比較不會拿信用去換現金。",
    quote: "合作內容僅供參考，帳單倒是一定會入帳。",
  },
  kol_viral_video: {
    id: "kol_viral_video",
    eyebrow: "投資 KOL 職業事件",
    title: "一支舊影片突然爆紅，演算法把你推回首頁。",
    body: "立刻追更能把流量換成更多現金與聲量，但要用健康、壓力和下一則新聞付款。",
    quote: "流量回來了，睡眠還在載入中。",
  },
  kol_asset_crash: {
    id: "kol_asset_crash",
    eyebrow: "投資 KOL 職業事件",
    title: "你先前喊過的標的突然重挫。",
    body: "留言區開始翻舊帳。道歉會掉聲量但保住信用；硬拗能繼續賺流量，代價則會留在帳上。",
    quote: "影片可以剪掉，歷史價格不行。",
  },
  kol_investigation: {
    id: "kol_investigation",
    eyebrow: "投資 KOL 監管事件",
    title: "你因公開喊單被要求配合調查。",
    body: "配合調查會停看盤、停交易兩季；堅稱只是分享有四成機率脫身，失敗則付出更高罰款並停權一年。",
    quote: "免責聲明很小，調查通知很大。",
  },
};
const careerEventCount = (game: Pick<Game, "careerEventCounts">, id: CareerEventId) => game.careerEventCounts?.[id] ?? 0;
const kolSponsorshipFee = (reputation: number) => reputation >= 80 ? 300000 : reputation >= 50 ? 160000 : 100000;
const annualWorkBaseIncome = (game: Pick<Game, "workBaseIncomeThisYear" | "parttimeStreak" | "workPromoted">) => game.workBaseIncomeThisYear || rankedWorkIncome(Math.max(1, game.parttimeStreak), game.workPromoted);
const careerSalaryBonus = (baseIncome: number, rate: number) => Math.round(baseIncome * rate / 1000) * 1000;
const careerEventChance = (game: Pick<Game, "occupation" | "parttimeStreak" | "kolReputation">) => {
  if (game.occupation === "麥當當員工" || game.occupation === "麥當當值班主管") {
    if (game.parttimeStreak >= 4) return .19;
    if (game.parttimeStreak === 3) return .16;
    if (game.parttimeStreak === 2) return .14;
    return .12;
  }
  if (game.occupation === "投資KOL") {
    if (game.kolReputation >= 80) return .19;
    if (game.kolReputation >= 50) return .17;
    if (game.kolReputation >= 20) return .15;
    return .12;
  }
  return 0;
};
const promotionEventShare = (game: Pick<Game, "parttimeStreak" | "workConsecutiveYears">) => Math.min(
  .85,
  .25 + Math.max(0, game.parttimeStreak - 3) * .1 + Math.max(0, game.workConsecutiveYears - 2) * .05,
);
const currentCrashedEndorsement = (game: Game) => {
  const quarter = absoluteQuarterIndex(game);
  return (game.kolEndorsements ?? []).find((endorsement) => {
    const age = quarter - endorsement.quarter;
    const quote = game.marketQuotes?.[marketQuoteKey(endorsement)];
    return !endorsement.resolved && age >= 0 && age <= 4 && Boolean(quote && quote.price <= endorsement.price * .85);
  }) ?? null;
};
const chooseQuarterCareerEvent = (game: Game): CareerEventDefinition | null => {
  const chance = careerEventChance(game);
  if (chance <= 0) return null;
  const random = createGameRandom(game, "career-event");
  if (random() >= chance) return null;

  if (game.occupation === "麥當當員工" || game.occupation === "麥當當值班主管") {
    const promotionEligible = !game.workPromoted && game.parttimeStreak >= 3 && game.workConsecutiveYears >= 2 && game.gauges.health > 30;
    if (promotionEligible && random() < promotionEventShare(game)) return careerEventDefinitions.mcd_promotion;
    const candidates: CareerEventDefinition[] = [];
    if (!game.workPromoted) candidates.push(careerEventDefinitions.mcd_overtime);
    if (careerEventCount(game, "mcd_coworker_leave") < 3) candidates.push(careerEventDefinitions.mcd_coworker_leave);
    return candidates.length ? candidates[Math.floor(random() * candidates.length)] : null;
  }

  if (game.occupation === "投資KOL") {
    const candidates: CareerEventDefinition[] = [];
    if (game.kolReputation >= 20 && careerEventCount(game, "kol_sponsorship") < 3) candidates.push(careerEventDefinitions.kol_sponsorship);
    if ((game.achievementStats?.kolYears ?? 0) > 0 && careerEventCount(game, "kol_viral_video") < 2) candidates.push(careerEventDefinitions.kol_viral_video);
    if (currentCrashedEndorsement(game) && careerEventCount(game, "kol_asset_crash") < 3) candidates.push(careerEventDefinitions.kol_asset_crash);
    const quarter = absoluteQuarterIndex(game);
    if (game.kolReputation >= 30 && game.publicShoutCount >= 3 && careerEventCount(game, "kol_investigation") < 2
      && quarter >= game.tradeLockUntilQuarter && quarter >= game.investigationCooldownUntilQuarter) candidates.push(careerEventDefinitions.kol_investigation);
    return candidates.length ? candidates[Math.floor(random() * candidates.length)] : null;
  }
  return null;
};
const careerEventOptionsFor = (game: Game, event: CareerEventDefinition) => {
  const workBase = annualWorkBaseIncome(game);
  const sponsorshipFee = careerEventIncome(kolSponsorshipFee(game.kolReputation), game.specialTrait);
  const eventIncome = (amount: number) => careerEventIncome(amount, game.specialTrait);
  if (event.id === "mcd_overtime") return [
    { choice: "A" as const, label: "留下來加班", desc: `本年收入 +${formatMoney(eventIncome(careerSalaryBonus(workBase, .12)))}、健康 −1、壓力 +3；本季兩則新聞都看不到，但仍能交易。` },
    { choice: "B" as const, label: "準時下班看盤", desc: "收入不變；本季兩則新聞與交易照常。" },
  ];
  if (event.id === "mcd_coworker_leave") return [
    { choice: "A" as const, label: "接下這次代班", desc: `本年收入 +${formatMoney(eventIncome(careerSalaryBonus(workBase, .06)))}、健康 −1、壓力 +2；下一則新聞看不到，但仍能交易。` },
    { choice: "B" as const, label: "婉拒代班", desc: "收入不變、壓力 −1；本季兩則新聞照常。" },
  ];
  if (event.id === "mcd_promotion") return [
    { choice: "A" as const, label: "接受升遷", desc: "職稱改為值班主管；下一年度起基本年薪永久 +18%，每年健康額外 −1、壓力額外 +3；每季固定少看一則新聞。" },
    { choice: "B" as const, label: "暫時婉拒", desc: "維持原職；健康 +1、壓力 −3，未來仍可能再次遇到升遷。" },
  ];
  if (event.id === "kol_sponsorship") return [
    { choice: "A" as const, label: "直接照稿上片", desc: `現金 +${formatMoney(sponsorshipFee)}、聲量 +4、信用 −3、投資知識 −1；兩則新聞照常。` },
    { choice: "B" as const, label: "先查證再合作", desc: `現金 +${formatMoney(Math.round(sponsorshipFee * .6))}、知識 +2、信用 +2、健康 −1、壓力 +2；下一則新聞看不到。` },
  ];
  if (event.id === "kol_viral_video") return [
    { choice: "A" as const, label: "熬夜追更", desc: `現金 +${formatMoney(eventIncome(100000)).replace("NT$ ", "")}、聲量 +8、健康 −3、壓力 +6；下一則新聞看不到。` },
    { choice: "B" as const, label: "照原排程更新", desc: `現金 +${formatMoney(eventIncome(30000)).replace("NT$ ", "")}、聲量 +3、健康 +1、壓力 −2；兩則新聞照常。` },
  ];
  if (event.id === "kol_asset_crash") return [
    { choice: "A" as const, label: "公開道歉並檢討", desc: "聲量 −10、信用 +4、知識 +2、壓力 +3。" },
    { choice: "B" as const, label: "堅稱只是長期布局，繼續喊", desc: `現金 +${formatMoney(eventIncome(60000)).replace("NT$ ", "")}、聲量 +5、信用 −6、知識 −3、壓力 +7；公開喊單次數再 +1。` },
  ];
  return [
    { choice: "A" as const, label: "配合調查並下架影片", desc: "支出 100,000、聲量 −8、信用 +2、壓力 +4；接下來兩季不能看情報或交易。" },
    { choice: "B" as const, label: "堅稱只是分享", desc: "先獲得聲量 +4；40% 脫身，60% 遭處分：支出 500,000、聲量再 −15、信用 −8、壓力 +10，四季不能看情報或交易。" },
  ];
};
const kolSuccessChance = (game: Pick<Game, "year" | "gauges" | "lastYearMarketMove" | "lastYearReadAccuracy" | "kolReputation">) => game.year === 1
  ? FIRST_YEAR_KOL_GOOD_CHANCE
  : clamp(
    .18
      + game.gauges.knowledge * .0032
      + clamp(game.lastYearMarketMove / 2400000, -.1, .1)
      + (game.lastYearReadAccuracy === null ? 0 : clamp((game.lastYearReadAccuracy - .5) * .36, -.12, .16))
      + game.kolReputation * .0015,
    .12,
    .72,
  );
const kolFlatChance = (game: Pick<Game, "year">) => game.year === 1 ? FIRST_YEAR_KOL_FLAT_CHANCE : KOL_FLAT_CHANCE;
const kolTrackRecordIncomeBonus = (accuracy: number | null) => accuracy === null
  ? 0
  : Math.round(clamp((accuracy - .5) * 600000, -90000, 300000) / 1000) * 1000;
const familySupportChance = (game: Pick<Game, "gauges" | "familySupportStreak">) => clamp(.3 + game.gauges.family * .007 - game.familySupportStreak * .05, .15, .9);
const FAMILY_BACKER_STARTING_CASH_BONUS = 200000;
const FAMILY_BACKER_ANNUAL_SUPPORT = 500000;
const CHAIRMAN_CHILD_STARTING_CASH_BONUS = 500000;
const CHAIRMAN_CHILD_ANNUAL_SUPPORT = 1000000;
const familySupportAmount = (game: Pick<Game, "trait" | "specialTrait" | "gauges">) => game.specialTrait === "你爸是董座"
  ? CHAIRMAN_CHILD_ANNUAL_SUPPORT
  : game.trait === "家族靠山"
    ? FAMILY_BACKER_ANNUAL_SUPPORT
    : Math.min(330000, Math.max(210000, Math.round((210000 + game.gauges.family * 1500) / 1000) * 1000));
const annualLivingCost = (year: number, specialTrait: SpecialTrait | null = null) => Math.round(
  288000 * Math.pow(1.02, year - 1) * (specialTrait === "記帳強迫症" ? .92 : 1) / 1000,
) * 1000;
const achievementsFor = (game: Game): AchievementResult[] => {
  const stats = game.achievementStats ?? blankAchievementStats();
  const net = netWorth(game);
  const completedRun = game.age >= FINAL_AGE && game.gauges.health > 0 && net > FINANCIAL_FAILURE_NET_WORTH;
  if (game.specialTrait === "你爸是董座") return [{
    id: "chairmanChild",
    title: "拎北是天公仔",
    tier: "傳說",
    description: "有些人的投資起跑線，就在別人的終點線前面。",
    progress: `家族飯桌情報 · 最終淨資產 ${formatMoney(net)}`,
    unlocked: game.phase === "ending" || game.gauges.health <= 0,
  }];
  const careerProgress = `${stats.yearsStarted} 年中完成 ${stats.yearsStarted} 次生路選擇`;
  const retirementProgress = game.age31InvestableNet ?? investableNetWorth(game);
  const retirementDistance = Math.max(0, EARLY_RETIREMENT_TARGET - retirementProgress);
  return [
    { id: "earlyRetirement", title: "提前退休", tier: "傳說", description: "31歲時，可投資淨資產達3,000萬元，並扣除全部負債。", progress: `${game.age31InvestableNet === null ? "目前" : "31歲紀錄"} ${formatMoney(retirementProgress)}${retirementDistance > 0 ? ` · 還差 ${formatMoney(retirementDistance)}` : " · 已達標"}`, unlocked: game.earlyRetirementQualified },
    { id: "hundredMillionMystery", title: "你是谷癌？", tier: "傳說", description: "最終淨資產突破一億元。", progress: `最終淨資產 ${formatMoney(net)}`, unlocked: completedRun && net > 100000000, hidden: true },
    { id: "retirementWaitingRoom", title: "退休預備席", tier: "史詩", description: "活到31歲，最終淨資產達2,000萬元。", progress: `目前 ${formatMoney(net)}／目標 ${formatMoney(20000000)}`, unlocked: completedRun && net >= 20000000 },
    { id: "marketLegend", title: "市場傳奇", tier: "傳說", description: "活到31歲，最終淨資產達1,000萬元。", progress: `目前 ${formatMoney(net)}／目標 ${formatMoney(10000000)}`, unlocked: completedRun && net >= 10000000 },
    { id: "fiveMillionClub", title: "五百萬俱樂部", tier: "稀有", description: "活到31歲，最終淨資產達500萬元。", progress: `目前 ${formatMoney(net)}／目標 ${formatMoney(5000000)}`, unlocked: completedRun && net >= 5000000 },
    { id: "steadyLanding", title: "穩健上岸", tier: "一般", description: "活到31歲，最終淨資產達300萬元。", progress: `目前 ${formatMoney(net)}／目標 ${formatMoney(3000000)}`, unlocked: completedRun && net >= 3000000 },
    { id: "debtFreeMillionaire", title: "無債百萬富翁", tier: "史詩", description: "活到31歲，淨資產達300萬元且負債歸零。", progress: `淨資產 ${formatMoney(net)} · 負債 ${formatMoney(game.debt)}`, unlocked: completedRun && net >= 3000000 && game.debt === 0 },
    { id: "leveragedSurvivor", title: "槓桿倖存者", tier: "史詩", description: "累計將至少50萬元銀行信貸投入市場，並以正淨資產活到31歲。", progress: `信貸投入 ${formatMoney(stats.creditInvestedAmount)}／${formatMoney(500000)} · 淨資產 ${formatMoney(net)}`, unlocked: completedRun && net > 0 && stats.creditInvestedAmount >= 500000 },
    { id: "workForever", title: "打工人的完全體", tier: "史詩", description: "每一年都選擇出去打工，並活到31歲。", progress: `${careerProgress} · 打工 ${stats.parttimeYears} 年`, unlocked: completedRun && stats.yearsStarted > 0 && stats.parttimeYears === stats.yearsStarted },
    { id: "kolForever", title: "流量就是我的年薪", tier: "史詩", description: "每一年都選擇經營股市KOL，並活到31歲。", progress: `${careerProgress} · KOL ${stats.kolYears} 年`, unlocked: completedRun && stats.yearsStarted > 0 && stats.kolYears === stats.yearsStarted },
    { id: "onlyTrustTrumpAdvisor", title: "只信川投顧", tier: "稀有", description: "連續持有「紅帽美國優先組合」滿5年。", progress: `目前連續 ${stats.redHatHoldingYears ?? 0}／5 年 · 最長 ${stats.maxRedHatHoldingYears ?? 0} 年`, unlocked: (stats.maxRedHatHoldingYears ?? 0) >= 5 },
    { id: "familyForever", title: "伸手牌終身會員", tier: "史詩", description: "九年內至少六年選擇接受家裡資助，並活到31歲。", progress: `家裡資助 ${stats.familyIncomeYears}／6 年`, unlocked: completedRun && stats.familyIncomeYears >= 6 },
    { id: "clearHead", title: "清醒的韭菜", tier: "一般", description: "活到31歲，投資知識達75以上。", progress: `投資知識 ${game.gauges.knowledge}／75`, unlocked: completedRun && game.gauges.knowledge >= 75 },
    { id: "lastBreath", title: "最後一滴血", tier: "稀有", description: "活到31歲時，健康介於1至15。", progress: `健康 ${game.gauges.health}／15`, unlocked: completedRun && game.gauges.health <= 15 },
    { id: "pressureCooker", title: "人體壓力鍋", tier: "稀有", description: "曾連續四季以90以上壓力撐過市場，並活到31歲。", progress: `最高連續高壓 ${stats.maxHighStressQuarters}／4 季`, unlocked: completedRun && stats.maxHighStressQuarters >= 4 },
    { id: "familyFirst", title: "家庭優先股", tier: "一般", description: "活到31歲時，家庭關係達80以上。", progress: `家庭關係 ${game.gauges.family}／80`, unlocked: completedRun && game.gauges.family >= 80 },
    { id: "neverSick", title: "百病不侵", tier: "稀有", description: "活到31歲，整局沒有觸發任何生病事件。", progress: `本局生病 ${stats.illnesses} 次`, unlocked: completedRun && stats.illnesses === 0 },
    { id: "frequentPatient", title: "醫院VIP", tier: "一般", description: "活到31歲，累計觸發至少5次生病事件。", progress: `本局生病 ${stats.illnesses}／5 次`, unlocked: completedRun && stats.illnesses >= 5 },
    { id: "surpriseCollector", title: "突襲收藏家", tier: "稀有", description: "活到31歲，累計遇到至少12次季度突襲。", progress: `本局突襲 ${stats.surprises}／12 次`, unlocked: completedRun && stats.surprises >= 12 },
    { id: "paperHandsWin", title: "紙手也能贏", tier: "史詩", description: "紙手體質活到31歲，最終淨資產達300萬元。", progress: `${game.specialTrait ?? "未獲得紙手體質"} · 淨資產 ${formatMoney(net)}`, unlocked: completedRun && game.specialTrait === "紙手體質" && net >= 3000000 },
    { id: "paperHandsDiamond", title: "紙手變鑽石手", tier: "傳說", description: "紙手體質活到31歲，最終淨資產超過1,500萬元。", progress: `${game.specialTrait ?? "未獲得紙手體質"} · 淨資產 ${formatMoney(net)}／需超過 ${formatMoney(15000000)}`, unlocked: completedRun && game.specialTrait === "紙手體質" && net > 15000000 },
    { id: "minimalist", title: "極簡投資家", tier: "稀有", description: "不使用銀行信貸、最高持倉不超過2筆，並以300萬元淨資產活到31歲。", progress: `最高持倉 ${stats.maxAssetRows} 筆 · 信貸 ${formatMoney(stats.cumulativeCreditBorrowed)} · 淨資產 ${formatMoney(net)}`, unlocked: completedRun && stats.maxAssetRows <= 2 && net >= 3000000 && stats.cumulativeCreditBorrowed === 0 },
    { id: "diversified", title: "資產動物園", tier: "一般", description: "曾同時持有至少10筆資產，且涵蓋台股、ETF、美股與加密貨幣。", progress: stats.diversifiedPeak ? "四類資產與10筆持倉均已達成" : `最高持倉 ${stats.maxAssetRows}／10 筆`, unlocked: completedRun && stats.diversifiedPeak },
  ];
};
const achievementsVisibleAtEnding = (achievements: AchievementResult[]) => achievements.filter((achievement) => !achievement.hidden || achievement.unlocked);
const riskLabel = (risk: Choice["risk"]) => risk === "safe" ? "低" : risk === "steady" ? "中" : "高";
const choiceMoneyHint = (game: Game, choice: Choice) => {
  if (choice.action === "invest") {
    const amount = Math.min(Math.max(0, game.cash), Math.max(3000, game.cash * (choice.ratio ?? .2)));
    return `預計投入 ${formatMoney(amount)}`;
  }
  if (choice.action === "learn") return `查證支出 −${formatMoney(choice.intelAction === "research" ? INTEL_RESEARCH_COST : LEARNING_COST).replace("NT$ ", "")}`;
  if (choice.action === "work") return choice.intelAction === "trend" ? `KOL 流量收入 +${formatMoney(choice.intelEffects?.cash ?? 6000).replace("NT$ ", "")}` : `即時收入約 ${formatMoney(Math.max(8000, Math.round(game.income * .075 / 1000) * 1000))}`;
  if (choice.action === "family") return `家庭支出最多 ${formatMoney(Math.min(Math.max(0, game.cash), 8000))}`;
  if (choice.action === "wait" || choice.action === "hold") return "不動用現金";
  if (choice.action === "reduce") return game.specialTrait === "紙手體質" ? "直接全部清倉" : "再選減碼 50% 或全清";
  return null;
};
const gaugeHint = (key: GaugeKey) => key === "health"
  ? "反映目前的身體狀況與恢復能力"
  : key === "stress" ? "反映目前承受的身心負荷"
    : key === "family" ? "影響家人支援、借款與家庭事件"
      : key === "knowledge" ? "63強化判讀、75顯示可信度、86看對時行情效果+10%、93偶爾提前一季取得情報"
        : "影響槓桿、借款與部分投資結果";
const incomeAbilityMeta: Record<GaugeKey, { icon: string; label: string }> = {
  health: { icon: "♥", label: "健康" },
  stress: { icon: "!", label: "壓力" },
  family: { icon: "⌂", label: "家庭關係" },
  knowledge: { icon: "◆", label: "投資知識" },
  credit: { icon: "✓", label: "信用" },
};
const incomeAbilityState = (key: GaugeKey, value: number) => {
  if (key === "stress") {
    if (value >= 80) return { label: "過載", tone: "danger" };
    if (value >= 60) return { label: "偏高", tone: "warning" };
    if (value >= 30) return { label: "可負荷", tone: "neutral" };
    return { label: "放鬆", tone: "good" };
  }
  if (key === "health") {
    if (value >= 75) return { label: "良好", tone: "good" };
    if (value >= 50) return { label: "普通", tone: "neutral" };
    if (value >= 25) return { label: "偏弱", tone: "warning" };
    return { label: "危險", tone: "danger" };
  }
  if (key === "family") {
    if (value >= 75) return { label: "親近", tone: "good" };
    if (value >= 50) return { label: "穩定", tone: "neutral" };
    if (value >= 25) return { label: "疏遠", tone: "warning" };
    return { label: "冷淡", tone: "danger" };
  }
  if (key === "knowledge") {
    if (value >= 75) return { label: "熟練", tone: "good" };
    if (value >= 50) return { label: "夠用", tone: "neutral" };
    if (value >= 25) return { label: "新手", tone: "warning" };
    return { label: "看不懂", tone: "danger" };
  }
  if (value >= 75) return { label: "優良", tone: "good" };
  if (value >= 50) return { label: "普通", tone: "neutral" };
  if (value >= 25) return { label: "偏低", tone: "warning" };
  return { label: "危險", tone: "danger" };
};

const signalHash = (input: string) => {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
const createSeededRandom = (...parts: Array<string | number>) => {
  let state = signalHash(parts.join(":")) || 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};
const createGameRandom = (game: Pick<Game, "seedCode" | "year" | "season" | "month">, scope: string) =>
  createSeededRandom("chive-life", game.seedCode, game.year, game.season, game.month, scope);
const deterministicPositionId = (game: Pick<Game, "seedCode" | "year" | "season" | "month" | "assets">, scope: string, name: string) =>
  `${game.year}-${game.season}-${game.month}-${scope}-${signalHash(`${game.seedCode}:${scope}:${name}:${game.assets.length}:${Math.round(game.assets.reduce((sum, asset) => sum + asset.cost, 0))}`).toString(36)}`;
type AdvisorSignalRule = {
  claimedDirection: SurpriseDirection;
  accuracy: number;
  label: string;
  warning: string;
};
const advisorSignalForEvent = (event: GameEvent): AdvisorSignalRule | null => {
  const text = `${event.topic}${event.title}${event.body}`;
  const claimedDirection: SurpriseDirection = /放空|看空|快逃|崩盤|空單/.test(text) ? "bearish" : "bullish";
  if (event.topic === "財經台老師喊明牌") return { claimedDirection, accuracy: .4, label: "限時明牌", warning: "拍桌與倒數增加聲量，不增加勝率" };
  if (event.topic === "付費會員群投顧") return { claimedDirection, accuracy: .5, label: "會員群喊單", warning: "勝率截圖完整，失敗紀錄不完整" };
  if (event.topic === "航海王老師帶會員上船") return { claimedDirection, accuracy: .65, label: "題材型分析", warning: "可能抓到趨勢，也可能只是最後一批船票" };
  if (event.topic === "老師代操保證獲利") return { claimedDirection, accuracy: .2, label: "保證獲利話術", warning: "保證獲利與只收匯款都是高風險警訊" };
  return null;
};
const signalDirectionForEvent = (event: GameEvent, seed: number): SurpriseDirection => {
  const advisorRule = advisorSignalForEvent(event);
  if (advisorRule) {
    const claimIsCorrect = signalHash(`${seed}:${event.id}:advisor-credibility`) % 10000 < advisorRule.accuracy * 10000;
    return claimIsCorrect
      ? advisorRule.claimedDirection
      : advisorRule.claimedDirection === "bullish" ? "bearish" : "bullish";
  }
  return event.marketDirection;
};
const intelChoiceCopy: Record<GameEvent["kind"], { research: string; observe: string; trend: string }> = {
  tech: { research: "熬夜查產品、訂單與供應鏈", observe: "關掉盤面，休息後再觀察科技題材", trend: "連夜把新科技剪成熱門短影音" },
  market: { research: "熬夜查公告、籌碼與歷史走勢", observe: "先去運動，晚點再看市場反應", trend: "趕稿跟上財經話題搶流量" },
  crypto: { research: "熬夜查鏈上資料與資金來源", observe: "關掉報價，睡一晚再看幣圈", trend: "連夜轉貼幣圈熱帖搶流量" },
  career: { research: "熬夜查政策與產業數據", observe: "先健身休息，再看工作市場反應", trend: "連夜把職場話題做成流量" },
  macro: { research: "熬夜查政策原文與總經數據", observe: "先離開盤面，等市場走出方向", trend: "趕寫政策解讀搶第一波流量" },
  meme: { research: "熬夜查原始消息與喊單紀錄", observe: "關掉社群休息，看迷因能撐幾天", trend: "連夜把迷因加工成流量密碼" },
};

const intelEffectsByKind: Record<EventKind, { research: IntelChoiceEffects; observe: IntelChoiceEffects; trend: IntelChoiceEffects }> = {
  tech: { research: { knowledge: 5, stress: 1, health: -1 }, observe: { knowledge: 1, stress: -1, health: 1 }, trend: { cash: 28000, knowledge: -2, stress: 2, health: -1 } },
  market: { research: { knowledge: 4, stress: 1, health: -1 }, observe: { knowledge: 1, stress: -1, health: 1 }, trend: { cash: 24000, knowledge: -1, stress: 2, health: -1 } },
  crypto: { research: { knowledge: 5, stress: 2, health: -1 }, observe: { knowledge: 2, stress: -1, health: 1 }, trend: { cash: 36000, knowledge: -2, stress: 3, health: -1, credit: -1 } },
  career: { research: { knowledge: 3, stress: 1, health: -1 }, observe: { knowledge: 1, stress: -2, health: 2 }, trend: { cash: 20000, knowledge: -1, stress: 1, health: -1 } },
  macro: { research: { knowledge: 4, stress: 1, health: -1 }, observe: { knowledge: 2, stress: -1, health: 2 }, trend: { cash: 24000, knowledge: -1, stress: 2, health: -1 } },
  meme: { research: { knowledge: 4, stress: 1, health: -1, credit: 1 }, observe: { knowledge: 1, stress: -2, health: 2 }, trend: { cash: 40000, knowledge: -2, stress: 4, health: -1, credit: -1 } },
};
const signedStat = (value: number) => value === 0 ? "不變" : value > 0 ? `+${value}` : `−${Math.abs(value)}`;
const deltaClassName = (delta: string) => /(?:^|\s)[−-]\s*(?:NT\$\s*)?\d/.test(delta) ? "delta-negative" : undefined;
const intelEffectSummary = (effects: IntelChoiceEffects) => [
  effects.cash ? `現金 +${formatMoney(effects.cash).replace("NT$ ", "")}` : null,
  effects.knowledge > 0 ? `投資知識最多 +${effects.knowledge}` : effects.knowledge < 0 ? `投資知識 ${signedStat(effects.knowledge)}` : null,
  effects.stress ? `壓力 ${signedStat(effects.stress)}` : "壓力不變",
  effects.health ? `健康 ${signedStat(effects.health)}` : null,
  effects.credit ? `信用 ${signedStat(effects.credit)}` : null,
].filter(Boolean).join("、");

const lifeChoicesForEvent = (event: GameEvent): Choice[] => {
  const copy = intelChoiceCopy[event.kind];
  const effects = intelEffectsByKind[event.kind];
  const trendEffects: IntelChoiceEffects = {
    ...effects.trend,
    cash: Math.round((effects.trend.cash ?? 0) * (event.lensEffect.trendCashMultiplier ?? 1)),
    knowledge: effects.trend.knowledge + (event.lensEffect.trendKnowledgeDelta ?? 0),
  };
  return [
    {
      label: copy.research,
      desc: `支出 ${formatMoney(INTEL_RESEARCH_COST)}；可靠確認主要標的方向，連動標的${event.marketScope ? `與${marketScopeLabel(event.marketScope)}` : ""}只確認受影響。${intelEffectSummary(effects.research)}。`,
      action: "learn",
      risk: "safe",
      minR: 1,
      intelAction: "research",
      intelEffects: effects.research,
    },
    {
      label: copy.observe,
      desc: `免費保留判斷空間；${intelEffectSummary(effects.observe)}，精確度依投資知識而定。`,
      action: "wait",
      risk: "steady",
      minR: 1,
      intelAction: "observe",
      intelEffects: effects.observe,
    },
    {
      label: copy.trend,
      desc: `${intelEffectSummary(trendEffects)}；情報可能被熱門話術誤導。`,
      action: "work",
      risk: "bold",
      minR: 2,
      intelAction: "trend",
      intelEffects: trendEffects,
    },
  ];
};

const researchReadAccuracy = (knowledge: number) => clamp(.78 + knowledge * .0017, .78, .95);
const observeReadAccuracy = (knowledge: number) => knowledge >= KNOWLEDGE_SIGNAL_BOOST_LEVEL
  ? .92
  : knowledge >= KNOWLEDGE_CLEAR_SIGNAL_LEVEL
    ? .84
    : knowledge >= 35
      ? .68
      : 0;
const signalReadSucceeded = (hashValue: number, accuracy: number) => hashValue % 10000 < accuracy * 10000;

function createMarketIntel(game: Game, event: GameEvent, action: IntelAction, target: EventTarget, targetIndex = 0): { signal: MarketSignal; record: IntelRecord } {
  const targetKey = `${target.category}:${target.name}`;
  const role = target.role;
  // 同一事件的主要與連動標的共用一次多空判定；投顧老師不能對兩個標的同時又喊對又喊錯。
  const direction = signalDirectionForEvent(event, game.seed ^ signalHash(`${event.id}:${game.year}:${game.season}:${game.month}`));
  const hash = signalHash(`${game.seed}:${event.id}:${game.year}:${game.season}:${game.month}:${targetKey}`);
  const baseTotalMonths = role === "primary" ? hash % 2 === 0 ? 3 : 6 : 3;
  const totalMonths = baseTotalMonths + (role === "primary" ? event.lensEffect.primaryDurationBonusMonths : 0);
  const baseStrength = role === "primary"
    ? .16 + (hash % 5) * .01
    : role === "market"
      ? .05 + (hash % 4) * .01
      : .08 + (hash % 5) * .01;
  const strength = baseStrength * event.lensEffect.signalStrengthMultiplier;
  const adjustAccuracy = (accuracy: number, modifier: number) => accuracy === 0 ? 0 : clamp(accuracy + modifier, 0, .99);
  const researchAccuracy = adjustAccuracy(researchReadAccuracy(game.gauges.knowledge), event.lensEffect.readAccuracyModifiers.research);
  const observeAccuracy = adjustAccuracy(observeReadAccuracy(game.gauges.knowledge), event.lensEffect.readAccuracyModifiers.observe);
  const trendAccuracy = adjustAccuracy(clamp(.55 + game.gauges.knowledge * .003, .55, .86), event.lensEffect.readAccuracyModifiers.trend);
  const researchCorrect = signalReadSucceeded(hash, researchAccuracy);
  const observeCorrect = observeAccuracy > 0 && signalReadSucceeded(hash, observeAccuracy);
  const trendCorrect = signalReadSucceeded(hash, trendAccuracy);
  const readDirection = action === "research"
    ? role === "primary" ? researchCorrect ? direction : direction === "bullish" ? "bearish" : "bullish" : null
    : action === "trend"
      ? trendCorrect ? direction : direction === "bullish" ? "bearish" : "bullish"
      : observeAccuracy > 0
        ? observeCorrect ? direction : direction === "bullish" ? "bearish" : "bullish"
        : null;
  const directionLabel = readDirection === "bullish" ? "偏多" : readDirection === "bearish" ? "偏空" : "方向未明";
  const researchConfidence = Math.round(researchAccuracy * 100);
  const confidenceLabel = action === "research" && role === "primary" && game.gauges.knowledge >= KNOWLEDGE_CONFIDENCE_LEVEL
    ? `可信度約 ${Math.max(50, researchConfidence - 8)}～${Math.min(98, researchConfidence + 4)}%`
    : undefined;
  const clue = action === "research"
    ? role === "primary"
      ? `交叉查證後，主要線索較可靠地指向「${target.name}」${directionLabel}。${confidenceLabel ? `${confidenceLabel}。` : ""}`
      : `查證後只能確認「${target.name}」是${role === "market" ? "市場連動標的" : "連動標的"}，方向仍待價格驗證。`
    : action === "trend"
      ? `社群熱門聲量指向「${target.name}」${directionLabel}，但尚未查證，可能是反向話術。`
      : readDirection
        ? game.gauges.knowledge >= KNOWLEDGE_CLEAR_SIGNAL_LEVEL
          ? `高知識判讀顯示「${target.name}」較明確地${directionLabel}，仍需承擔市場雜訊。`
          : `依目前投資知識，你暫時判讀「${target.name}」${directionLabel}，仍可能看錯。`
        : `目前只能確認「${target.name}」受到事件影響，方向仍需自行判讀。`;
  const durationLabel = role !== "primary"
    ? "預估影響 1 季"
    : action === "research" || game.gauges.knowledge >= 55
    ? `預估影響 ${Math.ceil(totalMonths / 3)} 季`
    : `影響時間可能為 ${event.lensEffect.primaryDurationBonusMonths ? "2～3" : "1～2"} 季`;
  const id = `${event.id}-${game.year}-${game.season}-${game.month}-${action}-${targetIndex}`;
  const groupId = `${event.id}-${game.year}-${game.season}-${game.month}-${action}`;
  return {
    signal: {
      id,
      groupId,
      eventId: event.id,
      topic: event.topic,
      role,
      targetCategory: target.category,
      targetName: target.name,
      direction,
      strength,
      remainingMonths: totalMonths,
      totalMonths,
    } satisfies MarketSignal,
    record: {
      id,
      groupId,
      period: `${game.age} 歲 · ${periodLabel(game)}第 ${game.month + 1} 次事件`,
      topic: event.topic,
      role,
      targetCategory: target.category,
      targetName: target.name,
      action,
      actionLabel: action === "research" ? "已查證" : action === "trend" ? "追熱門" : "自行觀察",
      clue,
      durationLabel,
      readDirection,
      confidenceLabel,
    } satisfies IntelRecord,
  };
}

type ChairmanTip = {
  target: EventTarget;
  predictedDirection: SurpriseDirection;
  truthful: boolean;
  durationQuarters: 1 | 2;
  signal: MarketSignal;
  record: IntelRecord;
};

const chairmanTipSeasonsFor = (game: Pick<Game, "seedCode" | "year">): readonly [number, number] => {
  const first = signalHash(`${game.seedCode}:chairman-tip:${game.year}:first-season`) % seasons.length;
  let second = signalHash(`${game.seedCode}:chairman-tip:${game.year}:second-season`) % (seasons.length - 1);
  if (second >= first) second += 1;
  return first < second ? [first, second] : [second, first];
};

const isChairmanTipPeriod = (game: Pick<Game, "seedCode" | "year" | "season" | "month" | "specialTrait">) =>
  game.specialTrait === "你爸是董座"
  && game.month === 0
  && chairmanTipSeasonsFor(game).includes(game.season);

function createChairmanTip(game: Game): ChairmanTip {
  const key = `${game.seedCode}:chairman-tip:${game.year}:${game.season}`;
  const target = { ...brokerCatalog[signalHash(`${key}:target`) % brokerCatalog.length], role: "primary" as const };
  const predictedDirection: SurpriseDirection = signalHash(`${key}:prediction`) % 2 === 0 ? "bullish" : "bearish";
  const truthful = signalHash(`${key}:truth`) % 100 < 88;
  const direction = truthful
    ? predictedDirection
    : predictedDirection === "bullish" ? "bearish" : "bullish";
  const durationQuarters = (signalHash(`${key}:duration`) % 2 + 1) as 1 | 2;
  const totalMonths = durationQuarters * 3;
  const id = `chairman-table-${game.year}-${game.season}`;
  const groupId = `${id}-family`;
  const directionLabel = predictedDirection === "bullish" ? "偏多 ↗" : "偏空 ↘";
  return {
    target,
    predictedDirection,
    truthful,
    durationQuarters,
    signal: {
      id,
      groupId,
      eventId: id,
      topic: "董事餐桌耳語",
      role: "primary",
      targetCategory: target.category,
      targetName: target.name,
      direction,
      strength: .19,
      remainingMonths: totalMonths,
      totalMonths,
    },
    record: {
      id,
      groupId,
      period: `${game.age} 歲 · ${periodLabel(game)}第 ${game.month + 1} 次事件`,
      topic: "董事餐桌耳語",
      role: "primary",
      targetCategory: target.category,
      targetName: target.name,
      action: "observe",
      actionLabel: "家族飯桌",
      source: "家族飯桌",
      clue: `家族消息直接指向「${target.name}」${directionLabel}；消息可靠度 88%，仍有 12% 機率反轉。`,
      durationLabel: `預估影響 ${durationQuarters} 季`,
      readDirection: predictedDirection,
      confidenceLabel: "消息可靠度 88%",
    },
  };
}

function createHiddenMarketSignals(game: Game, event: GameEvent) {
  return eventTargetsForEvent(event).map((target, index) => {
    const { signal } = createMarketIntel(game, event, "observe", target, index);
    const id = `${signal.id}-hidden`;
    return { ...signal, id, groupId: `${signal.groupId}-hidden`, hidden: true } satisfies MarketSignal;
  });
}

const ageMarketSignals = (signals: MarketSignal[]) => signals
  .map((signal) => ({ ...signal, remainingMonths: signal.remainingMonths - 1 }))
  .filter((signal) => signal.remainingMonths > 0);

function summarizeVisibleSignals(signals: MarketSignal[], records: IntelRecord[]) {
  const recordById = new Map(records.map((record) => [record.id, record]));
  let bullish = 0;
  let bearish = 0;
  let unknown = 0;
  signals.forEach((signal) => {
    const read = recordById.get(signal.id)?.readDirection;
    if (read === "bullish") bullish += signal.strength;
    else if (read === "bearish") bearish += signal.strength;
    else unknown += 1;
  });
  const difference = bullish - bearish;
  if (bullish > 0 && bearish > 0 && Math.abs(difference) < .12) return { label: "多空分歧", tone: "mixed", detail: `${signals.length} 則情報互相拉扯` };
  if (difference > .04) return { label: "綜合偏多", tone: "bullish", detail: `${signals.length} 則情報，偏多力道較強` };
  if (difference < -.04) return { label: "綜合偏空", tone: "bearish", detail: `${signals.length} 則情報，偏空力道較強` };
  return { label: "方向未明", tone: "unknown", detail: unknown ? `${unknown} 則情報尚無可靠方向` : `${signals.length} 則情報暫時抵銷` };
}

const bullishSurprises = [
  ["央行口風突然轉鴿", "降息預期在盤中急速升溫。", "資金先跑，理由晚點再補。"],
  ["財報與財測雙雙超標", "市場原本只求不要爆雷，結果數字意外亮眼。", "分析師的模型正在連夜改答案。"],
  ["政策補貼提前落地", "原本卡在公文裡的利多突然開始執行。", "補貼還沒入帳，股價先收到了。"],
  ["關稅豁免名單流出", "供應鏈傳出可能取得豁免，避險單瞬間回補。", "名單還沒蓋章，市場已經按下買進。"],
  ["外資大舉回補", "連續賣超的外資突然反手買進。", "昨天嫌貴，今天怕買不到。"],
  ["庫存調整提前結束", "通路庫存降到健康水位，補貨聲音重新出現。", "倉庫終於有空位，訂單也終於有座位。"],
  ["大型客戶追加訂單", "供應鏈臨時收到急單，產能利用率快速拉高。", "客戶說很急，市場聽成很賺。"],
  ["法人全面上修目標價", "多家機構同時調高評價，追價買盤湧入。", "目標價不是承諾，但紅色很有說服力。"],
  ["供給中斷推升報價", "競爭者產能意外停擺，現貨價格突然上揚。", "別人的停機，變成自己的報價單。"],
  ["監管鬆綁超出預期", "主管機關公布的新規比市場預期友善。", "紅線往後退，資金往前衝。"],
] as const;

const bearishSurprises = [
  ["央行突襲升息", "市場還在討論降息，利率卻突然往上。", "會議只開半天，估值要重算半年。"],
  ["財測無預警大砍", "公司下修展望，訂單能見度突然起霧。", "昨天叫展望，今天叫尊重市場。"],
  ["關稅清單臨時加碼", "新的課稅範圍超出預期，供應鏈連夜重算成本。", "一張清單，整條供應鏈一起失眠。"],
  ["監管調查突然啟動", "主管機關要求補件並暫停部分業務。", "成長故事先按暫停，律師開始加班。"],
  ["大股東申報轉讓", "市場看見大額持股轉讓申報，賣壓預期升高。", "嘴上長期看好，手上先換現金。"],
  ["資安事故導致停擺", "核心服務中斷，營運與賠償風險同步浮現。", "系統正在維護，市值也一起維護。"],
  ["融資斷頭潮擴散", "槓桿部位接連被迫平倉，賣壓自我強化。", "不是想賣，是券商幫你想好了。"],
  ["地緣風險快速升溫", "突發衝突讓避險需求急升，風險資產被拋售。", "地圖上的一條線，帳戶裡的一根黑棒。"],
  ["價格戰全面開打", "競爭者突然降價，市場開始擔心毛利率失守。", "銷量可能變多，利潤先變薄。"],
  ["信用評等遭到下調", "再融資成本可能上升，債務疑慮重新定價。", "一個字母掉下來，利息爬上去。"],
] as const;

const familyEvents: FamilyEvent[] = [
  { id: "health-check", title: "長輩的健康檢查出現紅字。", body: "家族群組突然安靜下來，大家都在等一個人先說要陪同回診。", quote: "報告上的紅字，比股票帳面還難假裝沒看見。" },
  { id: "home-repair", title: "老家的水管終於撐不住了。", body: "漏水從小問題變成整面牆的問題，家人開始討論誰有時間、誰能出錢。", quote: "房子不會自己修好，群組也不會自己達成共識。" },
  { id: "family-trip", title: "家人想安排一趟久違的旅行。", body: "日期總是湊不齊，預算也各有看法，但長輩說再拖下去可能就走不動了。", quote: "行程可以延後，有些時間不會配息。" },
  { id: "wedding", title: "手足決定結婚，婚禮帳單開始排隊。", body: "喜事是真的，花費也是真的；每個人都說形式不重要，直到開始挑場地。", quote: "幸福無價，桌錢有價。" },
  { id: "care-duty", title: "家裡突然需要有人輪班照顧長輩。", body: "工作、睡眠與照護時間互相撞期，沒有人真的有空，只是有人必須挪出空。", quote: "最難排的班，不在公司系統裡。" },
  { id: "festival", title: "重要節日到了，家人問你今年回不回家。", body: "市場照常開收盤，餐桌的位置卻只為你留到某個時間。", quote: "群組貼圖很多，真的見面很少。" },
  { id: "sibling-setback", title: "手足工作不順，開始縮減生活開銷。", body: "對方沒有直接開口，只在聊天時不經意提到房租和下一份工作的距離。", quote: "有些求救訊號，不會寫成借款申請。" },
  { id: "parent-device", title: "父母的手機壞了，連視訊都變得困難。", body: "換一支手機不算大事，但教會他們使用新功能可能需要整個週末。", quote: "科技縮短距離，設定畫面又把距離拉長。" },
  { id: "ancestral-home", title: "家族開始討論老屋要留、要租，還是要賣。", body: "每個人都有回憶，也都有自己的資金需求；共識比估價更難取得。", quote: "同一間房，有人看坪數，有人看童年。" },
  { id: "birthday", title: "家人提醒你，某個重要生日快到了。", body: "你原本只記得財報日期，現在得決定要不要為一頓飯空出時間與預算。", quote: "市場不記得你缺席，家人可能會。" },
];

const illnessEvents: IllnessEvent[] = [
  { id: "flu", severity: "mild", title: "流感把你的行事曆全部改成休息。", body: "發燒、痠痛和未讀訊息一起增加；盤勢還在動，你只想知道退燒藥什麼時候生效。", quote: "市場可以等開盤，病毒不用。", costFactor: .8 },
  { id: "stomach-flu", severity: "mild", title: "急性腸胃炎讓你離不開洗手間。", body: "昨晚的宵夜開始反向報酬，今天所有會議都變成耐力測試。", quote: "真正的流動性風險，通常不在財報裡。", costFactor: .9 },
  { id: "migraine", severity: "mild", title: "偏頭痛在收盤前準時敲鐘。", body: "螢幕亮度降到最低，K 線仍然像在腦袋裡閃爍。", quote: "今天最刺眼的不是跌停，是螢幕。", costFactor: .75 },
  { id: "back-pain", severity: "mild", title: "腰背拉傷，連坐著看盤都有槓桿。", body: "你只是彎腰撿個東西，身體卻用一根長黑宣布暫停交易。", quote: "年輕是資產，姿勢是未揭露負債。", costFactor: 1.05 },
  { id: "insomnia", severity: "moderate", title: "失眠從一晚變成整季的夜盤。", body: "你記得每個海外指數的波動，卻想不起來上次一覺到天亮是什麼時候。", quote: "二十四小時交易，並不代表人也該全年無休。", costFactor: .85 },
  { id: "shingles", severity: "moderate", title: "帶狀皰疹沿著壓力曲線出現。", body: "醫師說免疫力需要休息，你的工作群組則說專案只差最後一點。", quote: "身體沒有停損按鈕，只會直接跳通知。", costFactor: 1.05 },
  { id: "ulcer", severity: "moderate", title: "胃痛終於從忍耐升級成檢查。", body: "咖啡、熬夜和壓力聯手完成了一次惡意併購，你只剩下胃藥與清淡飲食。", quote: "有些紅字在帳戶裡，有些紅字在檢查報告裡。", costFactor: 1.15 },
  { id: "arrhythmia", severity: "moderate", title: "心悸讓你分不清是行情還是身體在跳空。", body: "檢查結果要求減少熬夜與刺激，剛好都是你最近持有最多的部位。", quote: "心跳可以波動，但不能沒有風控。", costFactor: 1.25 },
  { id: "appendicitis", severity: "severe", title: "急性闌尾炎不接受延後處理。", body: "腹痛快速惡化，原本安排好的工作、投資與生活同時被送進候補名單。", quote: "人生真正的突襲，通常沒有盤前通知。", costFactor: .9 },
  { id: "gallstone", severity: "severe", title: "膽結石發作，手術日期比財報更確定。", body: "醫師談恢復期，你想到的是收入中斷；家人談健康，你還在心算醫療費。", quote: "有些石頭不能抱著等解套。", costFactor: 1.1 },
];

const illnessChance = (health: number) => health >= 80 ? .02 : health >= 60 ? .04 : health >= 40 ? .1 : health >= 20 ? .15 : .25;
const illnessSeverityLabel = (severity: IllnessSeverity) => severity === "mild" ? "輕症" : severity === "moderate" ? "中症" : "重症";
const illnessBaseCost = (game: Pick<Game, "income">, event: IllnessEvent) => {
  const base = event.severity === "mild" ? Math.max(3000, game.income * .012) : event.severity === "moderate" ? Math.max(15000, game.income * .04) : Math.max(60000, game.income * .14);
  return Math.round(base * event.costFactor / 1000) * 1000;
};

function createIllnessEvent(game: Pick<Game, "gauges" | "illnessSeen">, random: RandomSource) {
  const health = game.gauges.health;
  const severityRoll = random();
  const severeChance = health >= 80 ? .05 : health >= 60 ? .06 : health >= 40 ? .1 : health >= 20 ? .17 : .25;
  const moderateChance = health >= 80 ? .3 : health >= 60 ? .34 : health >= 40 ? .4 : health >= 20 ? .45 : .5;
  const severity: IllnessSeverity = severityRoll < severeChance ? "severe" : severityRoll < severeChance + moderateChance ? "moderate" : "mild";
  const unseen = illnessEvents.filter((event) => !game.illnessSeen.includes(event.id));
  const severityMatches = unseen.filter((event) => event.severity === severity);
  const candidates = severityMatches.length ? severityMatches : unseen.length ? unseen : illnessEvents.filter((event) => event.severity === severity);
  return candidates[Math.floor(random() * candidates.length)] ?? illnessEvents[0];
}

const surpriseAngles = [
  ["盤中急報", "消息在交易時段突然出現，價格比查證速度更快。", "盤中快訊"],
  ["海外先動", "海外盤率先反應，台灣投資人一開盤就被迫表態。", "海外市場連線"],
  ["法說插播", "管理層臨時補充說明，市場只抓到最刺激的那一句。", "公司法說會"],
  ["政策突襲", "官方沒有預告，記者會一結束買賣單就塞滿畫面。", "政策記者會"],
  ["法人群組瘋傳", "消息先在交易群組流動，真假還在排隊等確認。", "法人交易室"],
  ["收盤前爆量", "最後一小時成交急增，來不及反應的人只能看收盤價。", "市場收盤快訊"],
] as const;

const names = ["嘎尾", "喆喆", "成龍", "祥德", "銀龍", "千安", "屁渴脫", "骨癌"];
const traits = [
  ["數字敏感", "投資知識較高，穩健選項成功率提升", { knowledge: 8 }],
  ["家族靠山", "家庭關係 +10；起始現金額外 +20 萬元；家裡資助通過時，每年獲得 50 萬元", { family: 10 }],
  ["信用小白", "信用較低，但沒有任何歷史包袱", { credit: -8 }],
  ["天生樂觀", "壓力起點較低，梭哈時也笑得出來", { stress: -10 }],
  ["體弱多病", "初始健康只有 56～64，市場以外也有風險", { healthRange: [56, 64] }],
  ["家破人亡", "初始家庭關係只有 30～46，家裡未必接得住你", { familyRange: [30, 46] }],
] as const;
const PAPER_HANDS_EFFECT = "不影響初始能力，但自主減倉時只能全部清倉";
const WORKAHOLIC_EFFECT = "投資KOL與麥當當年度收入 +8%，職業事件收入 +15%；有工作時健康額外 −1、壓力 +2，KOL 年收入上限提高至 180 萬元";
const BOOKKEEPER_EFFECT = "固定生活支出 −8%；持有負債時年末壓力 +2，全年未新增借款時年末信用 +1";
const CHAIRMAN_CHILD_EFFECT = "家族靠山的稀有升級；家庭關係 +10、起始現金額外 +50 萬元、家裡資助通過時固定獲得 100 萬元；每年兩季會從家族飯桌取得一則主要標的情報";
const CHAIRMAN_CHILD_UPGRADE_PERCENT = 5;
const specialTraitSlots: readonly (SpecialTrait | null)[] = ["紙手體質", "工作狂", "記帳強迫症", null, null, null];
const specialTraitEffect = (trait: SpecialTrait | null) => trait === "紙手體質"
  ? PAPER_HANDS_EFFECT
  : trait === "工作狂"
    ? WORKAHOLIC_EFFECT
    : trait === "記帳強迫症"
      ? BOOKKEEPER_EFFECT
      : trait === "你爸是董座"
        ? CHAIRMAN_CHILD_EFFECT
      : null;

const initialGaugeRanges: Record<GaugeKey, readonly [number, number]> = {
  health: [70, 86],
  stress: [14, 30],
  family: [52, 68],
  knowledge: [10, 26],
  credit: [54, 70],
};
const seededInitialGauge = (seedCode: string, key: GaugeKey, range = initialGaugeRanges[key]) => {
  const [minimum, maximum] = range;
  return minimum + signalHash(`${seedCode}:initial:${key}`) % (maximum - minimum + 1);
};

const seedAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomSeedCode = () => {
  const randomValues = new Uint32Array(8);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(randomValues);
  else for (let index = 0; index < randomValues.length; index += 1) randomValues[index] = Math.floor(Math.random() * 0x100000000);
  return Array.from(randomValues, (value) => seedAlphabet[value % seedAlphabet.length]).join("");
};
const normalizedSeedCode = (requestedSeed = "") => requestedSeed.trim().replace(/\s+/g, "-").toUpperCase().slice(0, 24)
  || randomSeedCode();

function makeGame(characterName = "", requestedSeed = ""): Game {
  const seedCode = normalizedSeedCode(requestedSeed);
  const seed = signalHash(`chive-life:${seedCode}`);
  const trait = traits[signalHash(`${seedCode}:trait`) % traits.length];
  const isChairmanChild = trait[0] === "家族靠山"
    && signalHash(`${seedCode}:special:chairman-child`) % 100 < CHAIRMAN_CHILD_UPGRADE_PERCENT;
  const specialTrait = isChairmanChild
    ? "你爸是董座"
    : specialTraitSlots[signalHash(`${seedCode}:special:paper-hands`) % specialTraitSlots.length];
  const chosenName = characterName.trim() || names[signalHash(`${seedCode}:name`) % names.length];
  const healthRange = "healthRange" in trait[2] ? trait[2].healthRange : initialGaugeRanges.health;
  const familyRange = "familyRange" in trait[2] ? trait[2].familyRange : initialGaugeRanges.family;
  const baseGauges: GaugeStats = {
    health: seededInitialGauge(seedCode, "health", healthRange),
    stress: seededInitialGauge(seedCode, "stress"),
    family: seededInitialGauge(seedCode, "family", familyRange),
    knowledge: seededInitialGauge(seedCode, "knowledge"),
    credit: seededInitialGauge(seedCode, "credit"),
  };
  const gauges: GaugeStats = {
    health: clamp(baseGauges.health),
    stress: clamp(baseGauges.stress + ("stress" in trait[2] ? trait[2].stress! : 0)),
    family: clamp(baseGauges.family + ("family" in trait[2] ? trait[2].family! : 0)),
    knowledge: clamp(baseGauges.knowledge + ("knowledge" in trait[2] ? trait[2].knowledge! : 0)),
    credit: clamp(baseGauges.credit + ("credit" in trait[2] ? trait[2].credit! : 0)),
  };
  const startingCash = 300000 + (isChairmanChild
    ? CHAIRMAN_CHILD_STARTING_CASH_BONUS
    : trait[0] === "家族靠山" ? FAMILY_BACKER_STARTING_CASH_BONUS : 0);
  return {
    age: STARTING_AGE, year: 1, seed, seedCode, phase: "season", season: 0, month: 0,
    name: chosenName, background: "迷茫的大學畢業生", occupation: "無業", trait: trait[0], traitEffect: trait[1], specialTrait, specialTraitEffect: specialTraitEffect(specialTrait),
    cash: startingCash, debt: 0, familyDebt: 0, lastFamilyBorrowYear: null, lastCreditBorrowYear: null, creditLoanMonthsRemaining: 0, lastIncomeChoiceYear: null, incomeSource: "尚未決定", lastYearMarketMove: 0,
    correctSignalStreak: 0, correctSignalUnclearCount: 0, maxCorrectSignalStreak: 0, breakoutOpportunities: 0, annualCorrectReads: 0, annualDirectionalReads: 0, lastYearReadAccuracy: null, kolReputation: 0,
    familySupportStreak: 0, parttimeStreak: 0, workConsecutiveYears: 0, workTenureProtected: false, workPromoted: false, workBaseIncomeThisYear: 0, income: 0, gauges, assets: [],
    result: null, annualStartNet: startingCash, annualDebtAdded: 0, annualMarketMove: 0, quarterMarketMove: 0, annualSummary: null, wealthHistory: [{ age: STARTING_AGE, netWorth: startingCash }], history: [], surpriseSeen: [], familyEventSeen: [], illnessSeen: [], illnessCooldown: 0,
    activeSignals: [], intelRecords: [], marketQuotes: initialMarketQuotes(),
    age31InvestableNet: null, earlyRetirementQualified: false, achievementStats: blankAchievementStats(), eventOrder: freshEventOrder(),
    careerEventCounts: {}, careerEventStats: blankCareerEventStats(), lastCareerEventPeriod: null, hiddenNewsRemaining: 0,
    tradeLockUntilQuarter: 0, investigationCooldownUntilQuarter: 0, publicShoutCount: 0, kolEndorsements: [],
  };
}

function addPosition(assets: Position[], next: Position) {
  const found = assets.find((asset) => asset.name === next.name);
  if (!found) return [...assets, next];
  return assets.map((asset) => asset.name === next.name ? { ...asset, cost: asset.cost + next.cost, value: asset.value + next.value, loan: (asset.loan ?? 0) + (next.loan ?? 0) } : asset);
}

function createFamilyEvent(game: Pick<Game, "familyEventSeen">, random: RandomSource) {
  const seen = game.familyEventSeen ?? [];
  const unused = familyEvents.filter((event) => !seen.includes(event.id));
  const candidates = unused.length ? unused : familyEvents;
  return candidates[Math.floor(random() * candidates.length)];
}

function createQuarterSurprise(game: Game, random: RandomSource): QuarterSurprise {
  const direction: SurpriseDirection = random() < .5 ? "bullish" : "bearish";
  const causes = direction === "bullish" ? bullishSurprises : bearishSurprises;
  const candidates = causes.flatMap((cause, causeIndex) => surpriseAngles.map((angle, angleIndex) => ({ cause, angle, id: `${direction}-${causeIndex}-${angleIndex}` })));
  const unused = candidates.filter((candidate) => !game.surpriseSeen.includes(candidate.id));
  const selected = (unused.length ? unused : candidates)[Math.floor(random() * (unused.length || candidates.length))];
  const position = game.assets[Math.floor(random() * game.assets.length)];
  const watchCandidates = brokerCatalog;
  const watchTarget = position ? null : watchCandidates[Math.floor(random() * watchCandidates.length)];
  const targetName = position?.name ?? watchTarget?.name ?? "整體市場";
  const targetCategory = position?.category ?? watchTarget?.category ?? "市場觀望";
  return {
    id: selected.id,
    direction,
    title: `${selected.angle[0]}｜${selected.cause[0]}`,
    body: `${targetName} 成為消息焦點。${selected.cause[1]}${selected.angle[1]}`,
    quote: selected.cause[2],
    source: selected.angle[2],
    targetId: position?.id ?? `surprise-watch-${game.year}-${game.season}-${game.month}-${selected.id}`,
    targetName,
    targetCategory,
  };
}

function applyMonthlyMarketMove(assets: Position[], marketQuotes: Record<string, MarketQuoteState>, monthInQuarter: number, random: RandomSource, surprise?: QuarterSurprise, signals: MarketSignal[] = []) {
  const quoteSource = marketQuotes ?? initialMarketQuotes();
  const marketAssets = Array.from(new Map(
    [...brokerCatalog, ...assets.map((asset) => ({ category: asset.category, name: asset.name }))]
      .map((asset) => [marketQuoteKey(asset), asset]),
  ).values());
  const movements = new Map<string, { moveRate: number; truthful: boolean; declined: boolean; baseRate: number; multiplier: number; dailyMovement: DailyCompoundedMove | null }>();
  const nextMarketQuotes = { ...quoteSource };

  marketAssets.forEach((asset) => {
    const key = marketQuoteKey(asset);
    const currentQuote = quoteSource[key] ?? initialMarketQuote(asset);
    const volatility = asset.category === "期貨" ? .13 : asset.category === "加密貨幣" ? .11 : .04;
    const baseDownChance = ["期貨", "加密貨幣"].includes(asset.category) ? .5 : .47;
    const relevantSignals = signals
      .filter((signal) => signal.targetCategory === asset.category && signal.targetName === asset.name && signal.remainingMonths > 0);
    const signalPressure = relevantSignals
      .reduce((pressure, signal) => pressure + (signal.direction === "bearish" ? signal.strength : -signal.strength), 0);
    const signalMoveMultiplier = relevantSignals.reduce((highest, signal) => Math.max(highest, signal.moveMultiplier ?? 1), 1);
    let downChance = clamp(baseDownChance + signalPressure, .12, .88);
    if (currentQuote.bearQuarters > 0) downChance = Math.max(.75, downChance);
    else if (currentQuote.bullQuarters > 0) downChance = Math.min(.35, downChance);

    const isSurpriseTarget = Boolean(surprise && surprise.targetCategory === asset.category && surprise.targetName === asset.name);
    const truthful = isSurpriseTarget ? random() < .75 : false;
    const intendedDeclined = isSurpriseTarget
      ? surprise!.direction === "bearish" ? truthful : !truthful
      : random() < downChance;
    const multiplier = Math.min(3, (isSurpriseTarget ? 1.25 + random() * .5 : 1) * signalMoveMultiplier);
    const dailyMovement = isDailyCompoundedAsset(asset.category)
      ? createDailyCompoundedMove(asset.category, intendedDeclined, multiplier, random)
      : null;
    const baseRate = dailyMovement
      ? Math.abs(dailyMovement.moveRate) / multiplier
      : intendedDeclined ? .006 + random() * volatility : .005 + random() * volatility * .85;
    const rawMoveRate = dailyMovement?.moveRate ?? (intendedDeclined ? -1 : 1) * baseRate * multiplier;
    const moveRate = applyAssetReturnLimits(asset.category, rawMoveRate);
    const declined = moveRate < 0;
    const quarterMoveFactor = (currentQuote.quarterMoveFactor ?? 1) * (1 + moveRate);
    let declineStreak = currentQuote.declineStreak ?? 0;
    let riseStreak = currentQuote.riseStreak ?? 0;
    let bearQuarters = currentQuote.bearQuarters ?? 0;
    let bearTriggered = currentQuote.bearTriggered ?? false;
    let bullQuarters = currentQuote.bullQuarters ?? 0;
    let bullTriggered = currentQuote.bullTriggered ?? false;
    if (monthInQuarter === 2) {
      const quarterDeclined = quarterMoveFactor < 1;
      declineStreak = quarterDeclined ? declineStreak + 1 : 0;
      riseStreak = quarterDeclined ? 0 : riseStreak + 1;
      bearQuarters = Math.max(0, bearQuarters - 1);
      bearTriggered = quarterDeclined ? bearTriggered : false;
      bullQuarters = Math.max(0, bullQuarters - 1);
      bullTriggered = quarterDeclined ? false : bullTriggered;
      if (declineStreak >= 3 && !bearTriggered) {
        bearQuarters = 2;
        bearTriggered = true;
      }
      if (riseStreak >= 2 && !bullTriggered) {
        bullQuarters = 2;
        bullTriggered = true;
      }
    }
    const nextPrice = Math.max(.01, currentQuote.price * (1 + moveRate));
    const quoteHistory = marketHistoryFor(currentQuote);
    const nextHistoryMonth = (quoteHistory[quoteHistory.length - 1]?.month ?? 0) + 1;
    nextMarketQuotes[key] = {
      price: nextPrice,
      previousPrice: currentQuote.price,
      lastMoveRate: moveRate,
      history: [...quoteHistory, { month: nextHistoryMonth, price: nextPrice, moveRate }].slice(-13),
      declineStreak,
      bearQuarters,
      bearTriggered,
      riseStreak,
      bullQuarters,
      bullTriggered,
      quarterMoveFactor: monthInQuarter === 2 ? 1 : quarterMoveFactor,
    };
    movements.set(key, { moveRate, truthful, declined, baseRate, multiplier, dailyMovement });
  });

  let marketMove = 0;
  const movedAssets = assets.map((asset) => {
    const movement = movements.get(marketQuoteKey(asset));
    const quote = nextMarketQuotes[marketQuoteKey(asset)];
    if (!movement || !quote) return asset;
    const value = Math.max(0, asset.value * (1 + movement.moveRate));
    marketMove += value - asset.value;
    return {
      ...asset,
      value,
      declineStreak: quote.declineStreak,
      bearQuarters: quote.bearQuarters,
      bearTriggered: quote.bearTriggered,
      riseStreak: quote.riseStreak,
      bullQuarters: quote.bullQuarters,
      bullTriggered: quote.bullTriggered,
      quarterMoveFactor: quote.quarterMoveFactor,
    };
  });

  let surpriseImpact: SurpriseImpact | undefined;
  if (surprise) {
    const movement = movements.get(marketQuoteKey({ category: surprise.targetCategory, name: surprise.targetName }));
    const targetPosition = assets.find((asset) => asset.id === surprise.targetId)
      ?? assets.find((asset) => asset.category === surprise.targetCategory && asset.name === surprise.targetName);
    if (movement) {
      const before = targetPosition?.value ?? 0;
      surpriseImpact = {
        truthful: movement.truthful,
        declined: movement.declined,
        baseRate: movement.baseRate,
        moveRate: movement.moveRate,
        multiplier: movement.multiplier,
        before,
        after: Math.max(0, before * (1 + movement.moveRate)),
        tradingDays: movement.dailyMovement?.tradingDays,
        minDailyRate: movement.dailyMovement?.minDailyRate,
        maxDailyRate: movement.dailyMovement?.maxDailyRate,
      };
    } else {
      const truthful = random() < .75;
      surpriseImpact = {
        truthful,
        declined: surprise.direction === "bearish" ? truthful : !truthful,
        baseRate: 0,
        moveRate: 0,
        multiplier: 1.25 + random() * .5,
        before: 0,
        after: 0,
      };
    }
  }
  return { assets: movedAssets, marketQuotes: nextMarketQuotes, marketMove, surpriseImpact };
}

function titleForEnding(game: Game) {
  const net = netWorth(game);
  if (game.specialTrait === "你爸是董座") return ["拎北是天公仔", "因為出身能爽爽賺又能騙吃騙喝是不是很爽 哈哈!!!"];
  if (game.gauges.health <= 0) return ["健康破產", "市場還沒收盤，身體先替你強制平倉。人生不等下一季，也不接受展期。"];
  if (net <= FINANCIAL_FAILURE_NET_WORTH) return ["財務斷頭", "現金流與信用同時失守，市場替你按下了人生的強制停損。"];
  if (game.earlyRetirementQualified) return ["提前退休", "31 歲，可投資淨資產突破三千萬元。你終於可以把鬧鐘和看盤軟體一起關掉。"];
  if (net >= 20000000) return ["退休預備席", "離三千萬只差最後一段行情。你還不能關掉鬧鐘，但已經可以先挑退休後要用的鈴聲。"];
  if (net >= 10000000) return ["差一點上岸", "離三千萬還有距離，但你已經把迷茫換成了一大段選擇權。"];
  if (net >= 3000000) return ["半自由人生", "還不能退休，但至少不必為每一次市場震盪改寫履歷。"];
  if (net < 0) return ["退休延後", "三十一歲沒有自由，只有負債提醒你明天仍要準時起床。"];
  return ["本金倖存者", "九年後帳戶還活著。這不是財富自由，但已經勝過不少群組老師。"];
}

export default function Home() {
  const [game, setGame] = useState<Game | null>(null);
  const analyticsRunId = useRef<string | null>(null);
  const analyticsCompleted = useRef(false);
  const analyticsSequence = useRef(0);
  const analyticsStartedAt = useRef(0);
  const analyticsLatestGame = useRef<Game | null>(null);
  const lastPresentedEvent = useRef<string | null>(null);
  const lastCareerRoll = useRef<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [seedInput, setSeedInput] = useState(() => randomSeedCode());
  const [showForeword, setShowForeword] = useState(false);
  const [hideForewordNext, setHideForewordNext] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [debtsOpen, setDebtsOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [intelView, setIntelView] = useState<"active" | "archive">("active");
  const [pendingReduction, setPendingReduction] = useState<Choice | null>(null);
  const [quarterSurprise, setQuarterSurprise] = useState<QuarterSurprise | null>(null);
  const [debtAction, setDebtAction] = useState<DebtAction | null>(null);
  const [debtNotice, setDebtNotice] = useState<DebtNotice | null>(null);
  const [incomeNotice, setIncomeNotice] = useState<IncomeNotice | null>(null);
  const [careerEvent, setCareerEvent] = useState<CareerEventDefinition | null>(null);
  const [careerNotice, setCareerNotice] = useState<CareerEventNotice | null>(null);
  const [familyEvent, setFamilyEvent] = useState<FamilyEvent | null>(null);
  const [illnessEvent, setIllnessEvent] = useState<IllnessEvent | null>(null);
  const [illnessNotice, setIllnessNotice] = useState<IllnessNotice | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const [brokerOpen, setBrokerOpen] = useState(false);
  const [brokerNewsHidden, setBrokerNewsHidden] = useState(false);
  const [brokerCategory, setBrokerCategory] = useState("台股");
  const [brokerNotice, setBrokerNotice] = useState<string | null>(null);
  const [quarterReport, setQuarterReport] = useState<Resolution | null>(null);
  const [screenshotState, setScreenshotState] = useState<"idle" | "saving" | "ready" | "saved" | "error">("idle");
  const [screenshotPreview, setScreenshotPreview] = useState<{ url: string; filename: string } | null>(null);

  const trackAnonymous = useCallback((eventType: AnonymousEventType, data: Record<string, string | number | boolean | null | string[]> = {}, snapshot: Game | null = game) => {
    const runId = analyticsRunId.current;
    if (!runId) return;
    postAnonymousAnalytics({
      runId,
      eventType,
      gameVersion: GAME_VERSION,
      eventSequence: analyticsSequence.current++,
      clientElapsedMs: analyticsStartedAt.current ? Date.now() - analyticsStartedAt.current : 0,
      year: snapshot?.year,
      age: snapshot?.age,
      season: snapshot?.season,
      month: snapshot?.month,
      data,
    });
  }, [game]);

  function startTrackedLife() {
    const next = makeGame(playerName, seedInput);
    const runId = createAnonymousRunId();
    analyticsRunId.current = runId;
    analyticsCompleted.current = false;
    analyticsSequence.current = 1;
    analyticsStartedAt.current = Date.now();
    analyticsLatestGame.current = next;
    lastPresentedEvent.current = null;
    lastCareerRoll.current = null;
    setGame(next);
    postAnonymousAnalytics({
      runId,
      eventType: "run_started",
      gameVersion: GAME_VERSION,
      eventSequence: 0,
      clientElapsedMs: 0,
      seedCode: next.seedCode,
      year: next.year,
      age: next.age,
      season: next.season,
      month: next.month,
      data: {
        trait: next.trait,
        specialTrait: next.specialTrait,
        initialCash: next.cash,
        initialHealth: next.gauges.health,
        initialStress: next.gauges.stress,
        initialFamily: next.gauges.family,
        initialKnowledge: next.gauges.knowledge,
        initialCredit: next.gauges.credit,
      },
    });
  }

  useEffect(() => {
    if (!mobileProfileOpen) return;
    const mobileViewport = window.matchMedia("(max-width: 900px)");
    if (!mobileViewport.matches) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileProfileOpen(false);
    };
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (!event.matches) setMobileProfileOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    mobileViewport.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      mobileViewport.removeEventListener("change", closeOnDesktop);
    };
  }, [mobileProfileOpen]);

  useEffect(() => {
    if (!screenshotPreview) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setScreenshotPreview(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      URL.revokeObjectURL(screenshotPreview.url);
    };
  }, [screenshotPreview]);

  useEffect(() => {
    analyticsLatestGame.current = game;
  }, [game]);

  useEffect(() => {
    const recordDeparture = (event: PageTransitionEvent) => {
      if (event.persisted || analyticsCompleted.current) return;
      const runId = analyticsRunId.current;
      const snapshot = analyticsLatestGame.current;
      if (!runId || !snapshot) return;
      postAnonymousAnalytics({
        runId,
        eventType: "run_abandoned",
        gameVersion: GAME_VERSION,
        eventSequence: analyticsSequence.current++,
        clientElapsedMs: analyticsStartedAt.current ? Date.now() - analyticsStartedAt.current : 0,
        year: snapshot.year,
        age: snapshot.age,
        season: snapshot.season,
        month: snapshot.month,
        data: {
          reason: "pagehide",
          netWorth: Math.round(netWorth(snapshot)),
          cash: Math.round(snapshot.cash),
          assetValue: Math.round(snapshot.assets.reduce((sum, asset) => sum + asset.value, 0)),
          debt: Math.round(snapshot.debt),
        },
      });
    };
    window.addEventListener("pagehide", recordDeparture);
    return () => window.removeEventListener("pagehide", recordDeparture);
  }, []);

  useEffect(() => {
    if (!game || game.phase === "ending" || game.gauges.health > 0) return;
    const timer = window.setTimeout(() => {
      setAssetsOpen(false);
      setDebtsOpen(false);
      setIntelOpen(false);
      setMobileProfileOpen(false);
      setIntelView("active");
      setPendingReduction(null);
      setQuarterSurprise(null);
      setDebtAction(null);
      setDebtNotice(null);
      setIncomeNotice(null);
      setCareerEvent(null);
      setCareerNotice(null);
      setFamilyEvent(null);
      setIllnessEvent(null);
      setIllnessNotice(null);
      setHistoryOpen(false);
      setBrokerOpen(false);
      setBrokerNewsHidden(false);
      setBrokerNotice(null);
      setQuarterReport(null);
      setGame({ ...game, phase: "ending", result: null, annualSummary: null });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    if (!game || game.phase !== "ending" || analyticsCompleted.current) return;
    analyticsCompleted.current = true;
    const [ending] = titleForEnding(game);
    trackAnonymous("run_completed", {
      ending,
      netWorth: Math.round(netWorth(game)),
      cash: Math.round(game.cash),
      assetValue: Math.round(game.assets.reduce((sum, asset) => sum + asset.value, 0)),
      debt: Math.round(game.debt),
      health: game.gauges.health,
      stress: game.gauges.stress,
      family: game.gauges.family,
      knowledge: game.gauges.knowledge,
      credit: game.gauges.credit,
      earlyRetirement: game.earlyRetirementQualified,
      achievementIds: achievementsFor(game).filter((achievement) => achievement.unlocked).map((achievement) => achievement.id),
    }, game);
  }, [game, trackAnonymous]);

  const gameSeed = game?.seed;
  const eventDeck = useMemo(
    () => gameSeed !== undefined ? buildLifeEventDeck(gameSeed, LIFE_YEAR_COUNT) : [],
    [gameSeed],
  );
  const currentEventSelection = useMemo(() => game ? selectAffordableCurrentEvent(game, eventDeck) : null, [game, eventDeck]);
  const currentEvent = currentEventSelection?.event ?? null;
  const currentChairmanTip = game && isChairmanTipPeriod(game) ? createChairmanTip(game) : null;
  const currentQuarter = game ? absoluteQuarterIndex(game) : 0;
  const marketAccessLocked = Boolean(game && currentQuarter < game.tradeLockUntilQuarter);
  const currentNewsHidden = Boolean(game && (
    !currentChairmanTip && (
      marketAccessLocked
      || game.hiddenNewsRemaining > 0
      || (game.workPromoted && game.occupation === "麥當當值班主管" && game.month === 1)
    )
  ));
  const careerPeriod = game ? `${game.year}:${game.season}` : "";
  const careerCheckPending = Boolean(game && game.phase === "season" && game.month === 0 && game.lastIncomeChoiceYear === game.year && game.lastCareerEventPeriod !== careerPeriod);
  useEffect(() => {
    if (!currentEventSelection?.needsCommit) return;
    const timer = window.setTimeout(() => {
      setGame((current) => current ? { ...current, eventOrder: currentEventSelection.order } : current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentEventSelection]);
  useEffect(() => {
    if (!game || game.phase !== "season" || game.month !== 0 || game.lastIncomeChoiceYear !== game.year
      || game.lastCareerEventPeriod === careerPeriod || lastCareerRoll.current === careerPeriod
      || game.result || quarterSurprise || quarterReport || incomeNotice || familyEvent || illnessEvent || debtAction || brokerOpen || careerEvent || careerNotice) return;
    lastCareerRoll.current = careerPeriod;
    const selected = chooseQuarterCareerEvent(game);
    const counts = { ...(game.careerEventCounts ?? {}) };
    const stats = { ...(game.careerEventStats ?? blankCareerEventStats()) };
    if (selected) {
      counts[selected.id] = (counts[selected.id] ?? 0) + 1;
      stats.triggered += 1;
    }
    const timer = window.setTimeout(() => {
      setGame({ ...game, lastCareerEventPeriod: careerPeriod, careerEventCounts: counts, careerEventStats: stats });
      if (selected) setCareerEvent(selected);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [game, careerPeriod, quarterSurprise, quarterReport, incomeNotice, familyEvent, illnessEvent, debtAction, brokerOpen, careerEvent, careerNotice]);
  useEffect(() => {
    if (!game || !currentEvent || game.phase !== "season" || game.result || game.lastIncomeChoiceYear !== game.year
      || careerCheckPending || currentNewsHidden || quarterSurprise || quarterReport || incomeNotice || careerEvent || careerNotice || familyEvent || illnessEvent || debtAction || brokerOpen) return;
    const presentationKey = `${game.year}:${game.season}:${game.month}:${currentChairmanTip?.signal.eventId ?? currentEvent.id}`;
    if (lastPresentedEvent.current === presentationKey) return;
    lastPresentedEvent.current = presentationKey;
    const targets = currentChairmanTip ? [currentChairmanTip.target] : eventTargetsForEvent(currentEvent);
    trackAnonymous("event_presented", {
      eventId: currentChairmanTip?.signal.eventId ?? currentEvent.id,
      eventKind: currentChairmanTip ? "family_tip" : currentEvent.kind,
      category: targets[0]?.category ?? null,
      target: targets[0]?.name ?? null,
      linkedTarget: targets[1]?.name ?? null,
      marketScope: currentChairmanTip ? null : currentEvent.marketScope ?? null,
      affectedTargets: targets.map((target) => `${target.category}:${target.name}`),
    }, game);
  }, [game, currentEvent, currentChairmanTip, careerCheckPending, currentNewsHidden, quarterSurprise, quarterReport, incomeNotice, careerEvent, careerNotice, familyEvent, illnessEvent, debtAction, brokerOpen, trackAnonymous]);
  const currentEventTargets = currentChairmanTip ? [currentChairmanTip.target] : currentEvent ? eventTargetsForEvent(currentEvent) : [];
  const currentEventTarget = currentEventTargets[0];
  const currentAdvisorSignal = currentEvent ? advisorSignalForEvent(currentEvent) : null;
  const currentChoices = currentEvent ? lifeChoicesForEvent(currentEvent) : [];
  const totalAssets = game?.assets.reduce((sum, asset) => sum + asset.value, 0) ?? 0;

  function resolveChoice(choice: Choice, reductionRatio?: number) {
    if (!game) return;
    const sourceEvent = currentEvent;
    const random = createGameRandom(game, `choice:${sourceEvent?.id ?? "unknown"}:${choice.action}:${reductionRatio ?? choice.ratio ?? "default"}`);
    const next: Game = { ...game, gauges: { ...game.gauges }, assets: [...game.assets] };
    let resolution: Resolution;

    if (choice.action === "learn") {
      const isIntelResearch = choice.intelAction === "research";
      const intelEffects = choice.intelEffects ?? { knowledge: 4, stress: 1 };
      const cost = isIntelResearch ? INTEL_RESEARCH_COST : LEARNING_COST;
      const paid = Math.min(Math.max(0, next.cash), cost);
      const financed = cost - paid;
      next.cash -= paid;
      next.debt += financed;
      next.annualDebtAdded = (next.annualDebtAdded ?? 0) + financed;
      if (financed > 0) next.gauges.credit = clamp(next.gauges.credit - 1);
      const gain = addKnowledge(next.gauges, isIntelResearch ? intelEffects.knowledge : 7 + (choice.risk === "steady" ? 2 : 0));
      next.gauges.stress = clamp(next.gauges.stress + (isIntelResearch ? intelEffects.stress : 1));
      if (isIntelResearch && intelEffects.health) next.gauges.health = clamp(next.gauges.health + intelEffects.health);
      if (isIntelResearch && intelEffects.credit) next.gauges.credit = clamp(next.gauges.credit + intelEffects.credit);
      const researchDeltas = isIntelResearch ? [
        `投資知識 +${gain}`,
        `壓力 ${signedStat(intelEffects.stress)}`,
        ...(intelEffects.health ? [`健康 ${signedStat(intelEffects.health)}`] : []),
        ...(intelEffects.credit ? [`信用 ${signedStat(intelEffects.credit)}`] : []),
      ] : [];
      resolution = isIntelResearch
        ? { tone: "good", eyebrow: "情報查證", title: "你熬夜找原始資料，再決定要不要相信市場。", body: "消息沒有因此變成保證，但雜訊與睡眠都少了一些。", detail: `本次查證支出 ${formatMoney(cost)}。${financed > 0 ? `現金不足的 ${formatMoney(financed)} 轉為短期負債。` : "本次以現金支付。"}查證能提高知識與情報可靠度，但會消耗時間、健康並增加壓力。`, deltas: [`查證支出 −${formatMoney(cost).replace("NT$ ", "")}`, ...(financed > 0 ? [`負債 +${formatMoney(financed).replace("NT$ ", "")}`, "信用 −1"] : []), ...researchDeltas] }
        : { tone: "good", eyebrow: "知識複利", title: "你沒有立刻賺錢，但少繳了一點學費給市場。", body: "你開始看得懂風險、成本與那些藏在小字裡的提醒。", detail: `這次投入 ${formatMoney(cost)} 在自己身上。${financed > 0 ? `現金不足的 ${formatMoney(financed)} 轉為短期負債。` : "本次以現金支付。"}知識會提高之後投資選項的好結果機率。`, deltas: [`學習支出 −${formatMoney(cost).replace("NT$ ", "")}`, ...(financed > 0 ? [`負債 +${formatMoney(financed).replace("NT$ ", "")}`, "信用 −1"] : []), `投資知識 +${gain}`] };
    } else if (choice.action === "work") {
      const isIntelTrend = choice.intelAction === "trend";
      const intelEffects = choice.intelEffects ?? { cash: 6000, knowledge: 0, stress: 5 };
      const earned = isIntelTrend ? intelEffects.cash ?? 6000 : Math.max(8000, Math.round(next.income * .075 / 1000) * 1000);
      next.cash += earned;
      if (!isIntelTrend) next.income += 18000;
      next.gauges.stress = clamp(next.gauges.stress + (isIntelTrend ? intelEffects.stress : 7));
      if (isIntelTrend && intelEffects.health) next.gauges.health = clamp(next.gauges.health + intelEffects.health);
      if (isIntelTrend && intelEffects.credit) next.gauges.credit = clamp(next.gauges.credit + intelEffects.credit);
      if (isIntelTrend && intelEffects.knowledge) next.gauges.knowledge = clamp(next.gauges.knowledge + intelEffects.knowledge);
      if (!isIntelTrend) next.gauges.health = clamp(next.gauges.health - 3);
      resolution = isIntelTrend
        ? { tone: "flat", eyebrow: "社群熱度", title: "流量先到了，答案還在路上。", body: "你趕著把市場話題做成內容，收入立刻進帳，睡眠與判讀品質一起下降。", detail: "反覆依賴熱門話術會讓市場判讀退化；迷因與加密題材的雜訊更多，因此扣除的投資知識也較高。", deltas: [`KOL 流量收入 +${formatMoney(earned).replace("NT$ ", "")}`, `壓力 ${signedStat(intelEffects.stress)}`, ...(intelEffects.knowledge ? [`投資知識 ${signedStat(intelEffects.knowledge)}`] : []), ...(intelEffects.health ? [`健康 ${signedStat(intelEffects.health)}`] : []), ...(intelEffects.credit ? [`信用 ${signedStat(intelEffects.credit)}`] : [])] }
        : { tone: "flat", eyebrow: "臨時收入", title: "你用時間換到了確定的現金流。", body: "這筆錢沒有漲停，卻真的進了帳戶。代價是眼神比昨天更空洞。", detail: "臨時排班讓現金立刻增加，也提高本年度收入；下一年仍要重新選擇生活來源。", deltas: [`即時收入 +${formatMoney(earned).replace("NT$ ", "")}`, "年末待入帳 +18,000", "壓力 +7", "健康 −3"] };
    } else if (choice.action === "family") {
      const cost = Math.min(Math.max(0, next.cash), 8000);
      next.cash -= cost;
      next.gauges.family = clamp(next.gauges.family + 11);
      next.gauges.stress = clamp(next.gauges.stress - 4);
      resolution = { tone: "good", eyebrow: "人生資產", title: "這頓飯沒有殖利率，但有人記得。", body: "你暫時沒有打開報價軟體。市場少了你照樣波動，家裡卻安靜了一點。", detail: "家庭關係會影響未來的支援、人生事件與部分結局。", deltas: [`家庭支出 −${formatMoney(cost).replace("NT$ ", "")}`, "家庭關係 +11", "壓力 −4"] };
    } else if (choice.action === "wait") {
      const isIntelObserve = choice.intelAction === "observe";
      const intelEffects = choice.intelEffects ?? { knowledge: 1, stress: -1 };
      next.gauges.stress = clamp(next.gauges.stress + (isIntelObserve ? intelEffects.stress : -2));
      if (isIntelObserve && intelEffects.health) next.gauges.health = clamp(next.gauges.health + intelEffects.health);
      if (isIntelObserve && intelEffects.credit) next.gauges.credit = clamp(next.gauges.credit + intelEffects.credit);
      const gain = addKnowledge(next.gauges, isIntelObserve ? intelEffects.knowledge : 2);
      if (!isIntelObserve) next.gauges.health = clamp(next.gauges.health + 1);
      resolution = isIntelObserve
        ? { tone: "flat", eyebrow: "休息觀察", title: "你沒有追著消息跑，先把身體顧回來。", body: "關掉盤面、睡一覺或去運動；市場繼續波動，你的健康則恢復了一點。", detail: "觀察不花現金，能降低壓力並恢復健康；代價是情報較模糊，判讀精確度仍取決於投資知識。", deltas: ["現金不變", `壓力 ${signedStat(intelEffects.stress)}`, `投資知識 +${gain}`, ...(intelEffects.health ? [`健康 ${signedStat(intelEffects.health)}`] : []), ...(intelEffects.credit ? [`信用 ${signedStat(intelEffects.credit)}`] : [])] }
        : { tone: "flat", eyebrow: "持有現金", title: "什麼都沒買。市場也沒有因此停止。", body: "你保留了選擇空間——不是會歸零的商品，而是真的可以晚點再決定。", detail: "現金沒有帳面波動，也會承受錯過行情與通膨的代價。", deltas: ["壓力 −2", `投資知識 +${gain}`, "健康 +1"] };
    } else if (choice.action === "hold") {
      const positionIndex = next.assets.findIndex((asset) => choice.positionId ? asset.id === choice.positionId : asset.name === choice.asset?.name);
      if (positionIndex < 0) return;
      const position = next.assets[positionIndex];
      const goodChance = clamp(.46 + next.gauges.knowledge * .0024 + (next.gauges.credit - 50) * .001, .2, .78);
      const roll = random();
      const outcome = roll < goodChance ? "good" : roll < goodChance + .24 ? "flat" : "bad";
      const dailyMovement = isDailyCompoundedAsset(position.category)
        ? createDailyCompoundedMove(position.category, outcome === "bad" ? true : outcome === "good" ? false : null, outcome === "flat" ? .35 : 1, random)
        : null;
      const rawReturnRate = dailyMovement?.moveRate ?? (outcome === "good" ? .06 + random() * .1 : outcome === "flat" ? -.025 + random() * .05 : -.08 - random() * .12);
      const returnRate = applyAssetReturnLimits(position.category, rawReturnRate);
      const before = position.value;
      const after = Math.max(0, before * (1 + returnRate));
      next.assets[positionIndex] = { ...position, value: after };
      const knowledgeGain = addKnowledge(next.gauges, outcome === "bad" ? 4 : 2);
      next.gauges.stress = clamp(next.gauges.stress + (outcome === "bad" ? 9 : outcome === "good" ? -2 : 2));
      const profit = after - before;
      resolution = {
        tone: outcome,
        eyebrow: `${position.category} · 既有倉位結算`,
        title: outcome === "good" ? "你抱住了部位，也抱住了行情。" : outcome === "flat" ? "消息很吵，倉位幾乎原地踏步。" : "沒有動作，也是一種有價格的選擇。",
        body: `${position.name} 完整承受事件波動，你沒有追價，也沒有提前離場。`,
        detail: `依投資知識、信用與事件風險計算，本次好結果機率約 ${Math.round(goodChance * 100)}%。${dailyMovement ? `${dailyMoveDetail(position.category, dailyMovement)}，本月累計報酬 ${(returnRate * 100).toFixed(1)}%。` : position.category === "加密貨幣" ? `加密貨幣單次漲幅上限 +66%、跌幅上限 −60%，本次報酬 ${(returnRate * 100).toFixed(1)}%。` : ""}既有部位變動 ${formatMoney(profit)}。`,
        deltas: [`帳面損益 ${profit >= 0 ? "+" : "−"}${formatMoney(Math.abs(profit)).replace("NT$ ", "")}`, `壓力 ${outcome === "good" ? "−2" : outcome === "bad" ? "+9" : "+2"}`, `投資知識 +${knowledgeGain}`],
      };
    } else if (choice.action === "reduce") {
      const positionIndex = next.assets.findIndex((asset) => choice.positionId ? asset.id === choice.positionId : asset.name === choice.asset?.name);
      if (positionIndex < 0) return;
      const position = next.assets[positionIndex];
      const sellRatio = reductionRatio ?? choice.ratio ?? .5;
      const proceeds = position.value * sellRatio;
      const releasedCost = position.cost * sellRatio;
      const realizedProfit = proceeds - releasedCost;
      const releasedLoan = (position.loan ?? 0) * sellRatio;
      const generalDebt = Math.max(0, next.debt - (next.familyDebt ?? 0));
      const automaticRepayment = Math.min(proceeds, releasedLoan, generalDebt);
      next.cash += proceeds - automaticRepayment;
      next.debt = Math.max(0, next.debt - automaticRepayment);
      const remainingCost = position.cost - releasedCost;
      const remainingValue = position.value - proceeds;
      const remainingLoan = Math.max(0, (position.loan ?? 0) - releasedLoan);
      next.assets = remainingValue < 1
        ? next.assets.filter((_, index) => index !== positionIndex)
        : next.assets.map((asset, index) => index === positionIndex ? { ...asset, cost: remainingCost, value: remainingValue, loan: remainingLoan } : asset);
      next.gauges.stress = clamp(next.gauges.stress - 3);
      addKnowledge(next.gauges, 2);
      resolution = {
        tone: realizedProfit >= 0 ? "good" : "flat",
        eyebrow: `${position.category} · 主動減倉`,
        title: sellRatio >= 1 ? "你按下全部清倉，讓這段部位正式結束。" : realizedProfit >= 0 ? "你把一部分帳面獲利換成真的現金。" : "你承認判斷需要調整，先收回一半部位。",
        body: sellRatio >= 1 ? `${position.name} 已全部賣出，損益正式落袋。` : `${position.name} 賣出 ${Math.round(sellRatio * 100)}%，剩下的部位繼續留在市場。`,
        detail: `按市值賣出 ${formatMoney(proceeds)}，${automaticRepayment > 0 ? `其中 ${formatMoney(automaticRepayment)} 自動償還這筆部位的槓桿本金，` : ""}本次實現損益 ${formatMoney(realizedProfit)}。降低曝險不保證賣在高點，但能換回調整空間。`,
        deltas: [`賣出價款 +${formatMoney(proceeds).replace("NT$ ", "")}`, ...(automaticRepayment > 0 ? [`自動還債 −${formatMoney(automaticRepayment).replace("NT$ ", "")}`] : []), `現金淨增加 +${formatMoney(proceeds - automaticRepayment).replace("NT$ ", "")}`, `實現損益 ${realizedProfit >= 0 ? "+" : "−"}${formatMoney(Math.abs(realizedProfit)).replace("NT$ ", "")}`, `部位 −${Math.round(sellRatio * 100)}%`, "壓力 −3"],
      };
    } else {
      const ratio = choice.ratio ?? .2;
      const margin = Math.min(Math.max(0, next.cash), Math.max(3000, next.cash * ratio));
      if (margin <= 0 || !choice.asset) return;
      const leveraged = choice.minR >= 4;
      const exposure = margin * (leveraged ? 1.75 : 1);
      const baseChance = choice.risk === "safe" ? .72 : choice.risk === "steady" ? .54 : .39;
      const knowledgeBonus = next.gauges.knowledge * .0022;
      const creditBonus = leveraged ? (next.gauges.credit - 50) * .001 : 0;
      const balanceSheetBonus = netWorth(next) > next.income ? .025 : next.debt > next.income ? -.035 : 0;
      const goodChance = clamp(baseChance + knowledgeBonus + creditBonus + balanceSheetBonus, .16, .86);
      const roll = random();
      const outcome = roll < goodChance ? "good" : roll < goodChance + .2 ? "flat" : "bad";
      const dailyMovement = isDailyCompoundedAsset(choice.asset.category)
        ? createDailyCompoundedMove(choice.asset.category, outcome === "bad" ? true : outcome === "good" ? false : null, outcome === "flat" ? .35 : 1, random)
        : null;
      const returnRate = dailyMovement?.moveRate ?? (outcome === "good"
        ? choice.risk === "bold" ? .65 + random() * .2 : (choice.risk === "steady" ? .2 : .07) + random() * .12
        : outcome === "flat" ? -.025 + random() * .07
        : -(choice.risk === "bold" ? .38 : choice.risk === "steady" ? .2 : .07) - random() * (choice.risk === "bold" ? .1 : .08));
      const rawFinalReturn = dailyMovement ? returnRate : returnRate * (leveraged ? 1.18 : 1);
      const finalReturn = applyAssetReturnLimits(choice.asset.category, rawFinalReturn);
      const value = Math.max(0, exposure * (1 + finalReturn));
      next.cash -= margin;
      if (leveraged) {
        const borrowed = exposure - margin;
        next.debt += borrowed;
        next.annualDebtAdded = (next.annualDebtAdded ?? 0) + borrowed;
      }
      next.assets = addPosition(next.assets, { id: deterministicPositionId(next, "choice", choice.asset!.name), category: choice.asset!.category, name: choice.asset!.name, cost: exposure, value, loan: leveraged ? exposure - margin : 0 });
      const knowledgeGain = addKnowledge(next.gauges, outcome === "bad" ? 5 : 2);
      next.gauges.stress = clamp(next.gauges.stress + (outcome === "bad" ? 12 : outcome === "good" ? -3 : 3));
      next.gauges.health = clamp(next.gauges.health - (outcome === "bad" ? 2 : 0));
      const profit = value - exposure;
      const probability = Math.round(goodChance * 100);
      resolution = {
        tone: outcome,
        eyebrow: `${choice.asset!.category} · 條件機率結算`,
        title: outcome === "good" ? "市場這次站在你這邊。" : outcome === "flat" ? "忙了一圈，幾乎回到原點。" : "市場收下學費，沒有開收據。",
        body: outcome === "good" ? `${choice.asset!.name} 迎來一段漂亮行情。群組裡每個人都像早就知道。` : outcome === "flat" ? `${choice.asset!.name} 上上下下，最後留下幾張截圖和一點手續費。` : `${choice.asset!.name} 很快證明，信仰不能拿來補保證金。`,
        detail: `依投資知識、信用、資產負債與風險程度計算，本次好結果機率約 ${probability}%。${dailyMovement ? `${dailyMoveDetail(choice.asset.category, dailyMovement)}，本月累計報酬 ${(finalReturn * 100).toFixed(1)}%。` : choice.asset.category === "加密貨幣" ? `加密貨幣單次漲幅上限 +66%、跌幅上限 −60%，本次報酬 ${(finalReturn * 100).toFixed(1)}%。` : ""}部位損益 ${formatMoney(profit)}。`,
        deltas: [`投入本金 −${formatMoney(margin).replace("NT$ ", "")}`, `帳面損益 ${profit >= 0 ? "+" : "−"}${formatMoney(Math.abs(profit)).replace("NT$ ", "")}`, `壓力 ${outcome === "good" ? "−3" : outcome === "bad" ? "+12" : "+3"}`, `投資知識 +${knowledgeGain}`],
      };
    }

    if (choice.intelAction && sourceEvent) {
      const targets = eventTargetsForEvent(sourceEvent);
      if (targets.length) {
        if (choice.intelAction === "trend") {
          const primary = targets.find((target) => target.role === "primary") ?? targets[0];
          const quote = next.marketQuotes?.[marketQuoteKey(primary)];
          next.publicShoutCount = (next.publicShoutCount ?? 0) + 1;
          if (quote) {
            next.kolEndorsements = [
              ...(next.kolEndorsements ?? []).filter((endorsement) => absoluteQuarterIndex(next) - endorsement.quarter <= 4),
              { category: primary.category, name: primary.name, price: quote.price, quarter: absoluteQuarterIndex(next), resolved: false },
            ].slice(-24);
          }
        }
        const rawIntels = targets.map((target, index) => createMarketIntel(next, sourceEvent, choice.intelAction!, target, index));
        const primaryIntel = rawIntels[0];
        const readAttempted = Boolean(primaryIntel?.record.readDirection);
        const readCorrect = readAttempted && primaryIntel.record.readDirection === primaryIntel.signal.direction;
        const previousStreak = next.correctSignalStreak ?? 0;
        const previousUnclearCount = next.correctSignalUnclearCount ?? 0;
        const unclearCount = readAttempted ? 0 : previousUnclearCount + 1;
        const unclearResetsStreak = !readAttempted && unclearCount >= 3;
        const streak = readCorrect
          ? previousStreak + 1
          : readAttempted || unclearResetsStreak
            ? 0
            : previousStreak;
        const breakoutEligible = readCorrect && streak >= BREAKOUT_STREAK_TARGET && primaryIntel.signal.direction === "bullish";
        const breakoutUnlocked = breakoutEligible
          && signalHash(`${next.seed}:${sourceEvent.id}:${next.year}:${next.season}:${next.month}:breakout`) % 1000 < BREAKOUT_UNLOCK_CHANCE_PERCENT * 10;
        const foresightUnlocked = readCorrect
          && next.gauges.knowledge >= KNOWLEDGE_FORESIGHT_LEVEL
          && signalHash(`${next.seed}:${sourceEvent.id}:${next.year}:${next.season}:${next.month}:foresight`) % 100 < FORESIGHT_CHANCE_PERCENT;
        next.annualDirectionalReads = (next.annualDirectionalReads ?? 0) + (readAttempted ? 1 : 0);
        next.annualCorrectReads = (next.annualCorrectReads ?? 0) + (readCorrect ? 1 : 0);
        next.maxCorrectSignalStreak = Math.max(next.maxCorrectSignalStreak ?? 0, streak);
        next.correctSignalStreak = breakoutUnlocked ? 0 : streak;
        next.correctSignalUnclearCount = readAttempted || unclearResetsStreak ? 0 : unclearCount;
        if (breakoutUnlocked) next.breakoutOpportunities = (next.breakoutOpportunities ?? 0) + 1;

        const intels: { signal: MarketSignal; record: IntelRecord }[] = rawIntels.map((intel, index) => {
          if (index !== 0) return intel;
          const knowledgeBoosted = readCorrect && next.gauges.knowledge >= KNOWLEDGE_SIGNAL_BOOST_LEVEL;
          const totalMonths = Math.max(
            breakoutUnlocked ? 6 : 0,
            intel.signal.totalMonths + (foresightUnlocked ? 3 : 0),
          );
          const moveMultiplier = (knowledgeBoosted ? KNOWLEDGE_SIGNAL_MOVE_MULTIPLIER : 1)
            * (breakoutUnlocked ? BREAKOUT_MOVE_MULTIPLIER : 1);
          const opportunityParts = [
            knowledgeBoosted ? "知識優勢：看對後行情效果 +10%" : null,
            foresightUnlocked ? "高階情報：提前一季掌握" : null,
            breakoutUnlocked ? `連續判讀獎勵：稀有主升段已解鎖，行情幅度 ×${BREAKOUT_MOVE_MULTIPLIER}` : null,
          ].filter(Boolean) as string[];
          const opportunity: MarketSignal["opportunity"] = breakoutUnlocked
            ? "breakout"
            : foresightUnlocked
              ? "foresight"
              : knowledgeBoosted
                ? "knowledge"
                : undefined;
          return {
            signal: {
              ...intel.signal,
              strength: intel.signal.strength + (foresightUnlocked ? .05 : 0) + (breakoutUnlocked ? .1 : 0),
              remainingMonths: totalMonths,
              totalMonths,
              moveMultiplier,
              opportunity,
            },
            record: {
              ...intel.record,
              durationLabel: `預估影響 ${totalMonths <= 3 ? "1 季" : totalMonths <= 6 ? "2 季" : "3 季"}`,
              opportunityLabel: opportunityParts.join(" · ") || undefined,
            },
          };
        });
        next.activeSignals = [...(next.activeSignals ?? []), ...intels.map((intel) => intel.signal)];
        next.intelRecords = [...intels.map((intel) => intel.record), ...(next.intelRecords ?? [])].slice(0, 144);
        const streakNote = readCorrect
          ? breakoutUnlocked
            ? "你連續判讀成功並抽中稀有主升段，連勝重新計算。"
            : `主要標的判讀正確，連續看對 ${streak} 次。${breakoutEligible ? "本次未形成主升段，連勝資格保留。" : ""}`
          : readAttempted
            ? "主要標的判讀錯誤，連續看對次數歸零。"
            : unclearResetsStreak
              ? "連續第 3 次方向未明，連續看對次數歸零。"
              : `本次方向未明，連勝暫時保留（未明 ${unclearCount}／3 次）。`;
        const focusedIntels = intels.filter((intel) => intel.signal.role !== "market");
        const marketIntelCount = intels.length - focusedIntels.length;
        const marketIntelDetail = marketIntelCount > 0
          ? `；${marketScopeLabel(sourceEvent.marketScope)}另有 ${marketIntelCount} 檔受到較弱的 1 季擴散影響`
          : "";
        resolution.detail = `${resolution.detail} ${focusedIntels.map((intel) => `${intel.record.clue} ${intel.record.durationLabel}${intel.record.opportunityLabel ? `；${intel.record.opportunityLabel}` : ""}`).join("；")}${marketIntelDetail}；${streakNote}實際行情仍有隨機波動。`;
        resolution.deltas = [
          ...resolution.deltas,
          readCorrect
            ? `連續看對 ${next.correctSignalStreak}／${BREAKOUT_STREAK_TARGET}`
            : readAttempted || unclearResetsStreak
              ? "連續看對 歸零"
              : `連續看對 保留・方向未明 ${unclearCount}／3`,
          ...(breakoutUnlocked ? ["稀有主升段 已解鎖"] : []),
          ...(foresightUnlocked ? ["提前一季情報 已取得"] : []),
        ];
        resolution.deltas = [
          ...resolution.deltas,
          `情報入庫：主要「${targets.find((target) => target.role === "primary")?.name}」／連動「${targets.find((target) => target.role === "linked")?.name}」`,
          ...(marketIntelCount > 0 ? [`市場擴散：${marketScopeLabel(sourceEvent.marketScope)}共 ${targets.filter((target) => marketScopeCategories(sourceEvent.marketScope).includes(target.category)).length} 檔`] : []),
        ];
      }
    }

    next.result = resolution;
    const achievementStats = game.achievementStats ?? blankAchievementStats();
    const actionStats = choice.intelAction === "research"
      ? { ...achievementStats, researchChoices: (achievementStats.researchChoices ?? 0) + 1 }
      : choice.intelAction === "observe"
        ? { ...achievementStats, observeChoices: (achievementStats.observeChoices ?? 0) + 1 }
        : choice.intelAction === "trend"
          ? { ...achievementStats, trendChoices: (achievementStats.trendChoices ?? 0) + 1 }
          : achievementStats;
    next.achievementStats = achievementStatsForAssets(actionStats, next.assets);
    next.history = [...next.history, `${next.age}歲${periodLabel(next)}：${resolution.title}`].slice(-8);
    const displayedChoices = sourceEvent ? lifeChoicesForEvent(sourceEvent) : [];
    const choiceIndex = displayedChoices.findIndex((item) => item.label === choice.label);
    trackAnonymous("event_choice", {
      eventId: sourceEvent?.id ?? "unknown",
      eventKind: sourceEvent?.kind ?? "unknown",
      choice: choiceIndex >= 0 ? ["A", "B", "C"][choiceIndex] ?? "unknown" : "unknown",
      action: choice.action,
      intelAction: choice.intelAction ?? null,
      outcome: resolution.tone,
      category: choice.asset?.category ?? null,
      target: choice.asset?.name ?? null,
      marketScope: sourceEvent?.marketScope ?? null,
      affectedTargets: sourceEvent ? eventTargetsForEvent(sourceEvent).map((target) => `${target.category}:${target.name}`) : [],
      netWorth: Math.round(netWorth(next)),
      health: next.gauges.health,
      stress: next.gauges.stress,
      knowledge: next.gauges.knowledge,
    }, next);
    setGame(next);
  }

  function chooseEventOption(choice: Choice) {
    if (marketAccessLocked || currentNewsHidden) return;
    if (choice.action === "reduce") {
      if (game?.specialTrait === "紙手體質") {
        resolveChoice(choice, 1);
        return;
      }
      setPendingReduction(choice);
      return;
    }
    resolveChoice(choice);
    if (currentEventTarget && brokerCategoryOrder.includes(currentEventTarget.category)) setBrokerCategory(currentEventTarget.category);
    setBrokerNotice(null);
    setBrokerOpen(true);
  }

  function acceptChairmanTip() {
    if (!game || !currentChairmanTip) return;
    const next: Game = {
      ...game,
      activeSignals: [...(game.activeSignals ?? []), currentChairmanTip.signal],
      intelRecords: [currentChairmanTip.record, ...(game.intelRecords ?? [])].slice(0, 144),
      history: [...game.history, `${game.age}歲${periodLabel(game)}：從家族飯桌取得「${currentChairmanTip.target.name}」情報`].slice(-8),
    };
    trackAnonymous("event_choice", {
      eventId: currentChairmanTip.signal.eventId,
      eventKind: "family_tip",
      choice: "family_tip",
      action: "receive",
      intelAction: "family_table",
      outcome: "received",
      category: currentChairmanTip.target.category,
      target: currentChairmanTip.target.name,
      marketScope: null,
      affectedTargets: [`${currentChairmanTip.target.category}:${currentChairmanTip.target.name}`],
      netWorth: Math.round(netWorth(next)),
      health: next.gauges.health,
      stress: next.gauges.stress,
      knowledge: next.gauges.knowledge,
    }, next);
    setBrokerCategory(currentChairmanTip.target.category);
    setBrokerNotice(null);
    if (marketAccessLocked) {
      setBrokerNewsHidden(false);
      setBrokerOpen(false);
      advanceMarketMonth(next, false);
      return;
    }
    setGame(next);
    setBrokerNewsHidden(false);
    setBrokerOpen(true);
  }

  function confirmReduction(ratio: .5 | 1) {
    if (!pendingReduction) return;
    const choice = pendingReduction;
    setPendingReduction(null);
    resolveChoice(choice, ratio);
  }

  function brokerBuy(asset: BrokerAsset, ratio: .25 | .5 | 1 = .25) {
    if (!game || marketAccessLocked || !brokerOpen || game.cash <= 0) return;
    const budget = Math.min(game.cash, Math.max(3000, game.cash * ratio));
    if (budget < 3000) {
      setBrokerNotice("單筆最低下單金額為 NT$ 3,000，目前可用現金不足。");
      return;
    }
    const principal = budget / (1 + BROKER_BUY_FEE_RATE);
    const fee = budget - principal;
    const assets = addPosition(game.assets, {
      id: deterministicPositionId(game, "broker", asset.name),
      category: asset.category,
      name: asset.name,
      cost: budget,
      value: principal,
      loan: 0,
    });
    const nextGame = {
      ...game,
      cash: game.cash - budget,
      assets,
      achievementStats: achievementStatsForAssets(game.achievementStats ?? blankAchievementStats(), assets, budget),
      history: [...game.history, `${game.age}歲${periodLabel(game)}券商：買進${asset.name}`].slice(-8),
    };
    trackAnonymous("trade", {
      side: "buy",
      category: asset.category,
      target: asset.name,
      ratio: Math.round(ratio * 100),
      amount: Math.round(budget),
      netWorth: Math.round(netWorth(nextGame)),
    }, nextGame);
    setGame(nextGame);
    setBrokerNotice(`已用 ${formatMoney(budget)} 買進「${asset.name}」，其中手續費 ${formatMoney(fee)}。`);
  }

  function brokerSell(position: Position, requestedRatio: .25 | .5 | 1 = 1) {
    if (!game || marketAccessLocked || !brokerOpen) return;
    const positionIndex = game.assets.findIndex((asset) => asset.id === position.id);
    if (positionIndex < 0) return;
    const current = game.assets[positionIndex];

    const ratio = game.specialTrait === "紙手體質" ? 1 : requestedRatio;
    const gross = current.value * ratio;
    const fee = gross * brokerSellFeeRate(current.category);
    const proceeds = Math.max(0, gross - fee);
    const releasedCost = current.cost * ratio;
    const releasedLoan = (current.loan ?? 0) * ratio;
    const generalDebt = Math.max(0, game.debt - (game.familyDebt ?? 0));
    const automaticRepayment = Math.min(proceeds, releasedLoan, generalDebt);
    const netCash = proceeds - automaticRepayment;
    const remainingValue = current.value - gross;
    const assets = remainingValue < 1
      ? game.assets.filter((_, index) => index !== positionIndex)
      : game.assets.map((item, index) => index === positionIndex ? {
        ...item,
        value: remainingValue,
        cost: Math.max(0, item.cost - releasedCost),
        loan: Math.max(0, (item.loan ?? 0) - releasedLoan),
      } : item);
    const nextGame = {
      ...game,
      cash: game.cash + netCash,
      debt: Math.max(0, game.debt - automaticRepayment),
      assets,
      history: [...game.history, `${game.age}歲${periodLabel(game)}券商：賣出${Math.round(ratio * 100)}% ${current.name}`].slice(-8),
    };
    trackAnonymous("trade", {
      side: "sell",
      category: current.category,
      target: current.name,
      ratio: Math.round(ratio * 100),
      amount: Math.round(gross),
      netWorth: Math.round(netWorth(nextGame)),
    }, nextGame);
    setGame(nextGame);
    setBrokerNotice(`已賣出「${current.name}」${Math.round(ratio * 100)}%，扣除交易成本 ${formatMoney(fee)}，現金淨增加 ${formatMoney(netCash)}。`);
  }

  function continueAfterResult() {
    if (!game?.result) return;
    setGame({ ...game, result: null });
    setBrokerNotice(null);
    setBrokerOpen(true);
  }

  function processHiddenNews() {
    if (!game || !currentEvent || !currentNewsHidden) return;
    const hiddenSignals = createHiddenMarketSignals(game, currentEvent);
    const stats = { ...(game.careerEventStats ?? blankCareerEventStats()), hiddenNews: (game.careerEventStats?.hiddenNews ?? 0) + 1 };
    const next: Game = {
      ...game,
      activeSignals: [...(game.activeSignals ?? []), ...hiddenSignals],
      hiddenNewsRemaining: Math.max(0, game.hiddenNewsRemaining - (game.hiddenNewsRemaining > 0 ? 1 : 0)),
      careerEventStats: stats,
      result: null,
      history: [...game.history, `${game.age}歲${periodLabel(game)}：因工作安排錯過一則市場新聞`].slice(-8),
    };
    trackAnonymous("career_news_missed", {
      eventId: currentEvent.id,
      reason: marketAccessLocked ? "market_access_locked" : game.occupation === "麥當當值班主管" && game.month === 1 ? "manager_schedule" : "career_workload",
      tradeLocked: marketAccessLocked,
      hiddenNewsRemaining: next.hiddenNewsRemaining,
    }, next);
    setBrokerNotice(null);
    if (marketAccessLocked) {
      setBrokerOpen(false);
      setBrokerNewsHidden(false);
      advanceMarketMonth(next, false);
      return;
    }
    setGame(next);
    setBrokerNewsHidden(true);
    setBrokerOpen(true);
  }

  function closeBrokerMonth() {
    if (!game || !brokerOpen) return;
    setBrokerOpen(false);
    setBrokerNewsHidden(false);
    setBrokerNotice(null);
    advanceMarketMonth(game, true);
  }

  function settleQuarterMarkets(secondMonthGame: Game, thirdMonthMove: ReturnType<typeof applyMonthlyMarketMove>, hiddenSurprise = false) {
    const quarterMarketMove = secondMonthGame.quarterMarketMove + thirdMonthMove.marketMove;
    const settled: Game = {
      ...secondMonthGame,
      assets: thirdMonthMove.assets,
      marketQuotes: thirdMonthMove.marketQuotes,
      annualMarketMove: secondMonthGame.annualMarketMove + thirdMonthMove.marketMove,
      quarterMarketMove: 0,
      activeSignals: ageMarketSignals(secondMonthGame.activeSignals ?? []),
      result: null,
    };
    setGame(settled);
    setQuarterReport({
      tone: quarterMarketMove > 0 ? "good" : quarterMarketMove < 0 ? "bad" : "flat",
      eyebrow: `${periodLabel(secondMonthGame)} · 三個月行情結算`,
      title: quarterMarketMove > 0 ? "這一季，市場替帳戶加了點顏色。" : quarterMarketMove < 0 ? "這一季，市場收走了一些耐心。" : "這一季，帳戶幾乎原地踏步。",
      body: secondMonthGame.assets.length ? "三個月營業日波動已逐月複利計入每一筆持倉。" : "你本季維持空手，市場照常波動，但沒有產生持倉損益。",
      detail: `${hiddenSurprise ? "本季曾有一則無法閱讀的突發消息，已在背景納入價格。" : ""}每季包含三個月行情；台股與 ETF 每個營業日限制在 −10%～+10%，美股每個營業日限制在 −30%～+30%，加密貨幣沿用單月漲跌上限。`,
      deltas: [`本季持倉變動 ${quarterMarketMove >= 0 ? "+" : "−"}${formatMoney(Math.abs(quarterMarketMove)).replace("NT$ ", "")}`, `期末投資資產 ${formatMoney(thirdMonthMove.assets.reduce((sum, asset) => sum + asset.value, 0)).replace("NT$ ", "")}`],
    });
  }

  function advanceMarketMonth(source: Game, allowSurpriseInteraction: boolean) {
    if (source.month < EVENTS_PER_SEASON - 1) {
      const firstMonthMove = applyMonthlyMarketMove(source.assets, source.marketQuotes ?? initialMarketQuotes(), 0, createGameRandom(source, "market:0"), undefined, source.activeSignals ?? []);
      setGame({
        ...source,
        assets: firstMonthMove.assets,
        marketQuotes: firstMonthMove.marketQuotes,
        annualMarketMove: source.annualMarketMove + firstMonthMove.marketMove,
        quarterMarketMove: source.quarterMarketMove + firstMonthMove.marketMove,
        activeSignals: ageMarketSignals(source.activeSignals ?? []),
        month: source.month + 1,
        result: null,
      });
      return;
    }

    // 第二次核心事件後結算第二個月，第三個月可能出現季末突襲。
    const secondMonthMove = applyMonthlyMarketMove(source.assets, source.marketQuotes ?? initialMarketQuotes(), 1, createGameRandom(source, "market:1"), undefined, source.activeSignals ?? []);
    let secondMonthGame: Game = {
      ...source,
      assets: secondMonthMove.assets,
      marketQuotes: secondMonthMove.marketQuotes,
      annualMarketMove: source.annualMarketMove + secondMonthMove.marketMove,
      quarterMarketMove: source.quarterMarketMove + secondMonthMove.marketMove,
      activeSignals: ageMarketSignals(source.activeSignals ?? []),
      result: null,
    };
    if (createGameRandom(secondMonthGame, "quarter-surprise:chance")() < QUARTER_SURPRISE_CHANCE) {
      const surprise = createQuarterSurprise(secondMonthGame, createGameRandom(secondMonthGame, "quarter-surprise:content"));
      const achievementStats = secondMonthGame.achievementStats ?? blankAchievementStats();
      secondMonthGame = { ...secondMonthGame, surpriseSeen: [...secondMonthGame.surpriseSeen, surprise.id], achievementStats: { ...achievementStats, surprises: achievementStats.surprises + 1 } };
      if (allowSurpriseInteraction) {
        setGame(secondMonthGame);
        setQuarterSurprise(surprise);
        return;
      }
      const hiddenSurpriseMove = applyMonthlyMarketMove(secondMonthGame.assets, secondMonthGame.marketQuotes, 2, createGameRandom(secondMonthGame, "market:2"), surprise, secondMonthGame.activeSignals ?? []);
      settleQuarterMarkets(secondMonthGame, hiddenSurpriseMove, true);
      return;
    }

    const thirdMonthMove = applyMonthlyMarketMove(secondMonthGame.assets, secondMonthGame.marketQuotes, 2, createGameRandom(secondMonthGame, "market:2"), undefined, secondMonthGame.activeSignals ?? []);
    settleQuarterMarkets(secondMonthGame, thirdMonthMove);
  }

  function continueAfterQuarterReport() {
    if (!game || !quarterReport) return;
    setQuarterReport(null);
    closeQuarterWithHealthCheck(game);
  }

  function revealQuarterSurprise(action: "hold" | "add" | "close", response?: "research" | "rest" | "content") {
    if (!game || !quarterSurprise || quarterSurprise.outcome) return;
    const originalPosition = game.assets.find((asset) => asset.id === quarterSurprise.targetId);
    const watchedAsset = originalPosition ? null : brokerCatalog.find((asset) => asset.category === quarterSurprise.targetCategory && asset.name === quarterSurprise.targetName);
    if (action === "close" && !originalPosition) return;
    if (action === "add" && !originalPosition && !watchedAsset) return;
    const syntheticTarget: Position | null = watchedAsset ? {
      id: quarterSurprise.targetId ?? `surprise-watch-${quarterSurprise.id}`,
      category: watchedAsset.category,
      name: watchedAsset.name,
      cost: 100000,
      value: 100000,
    } : null;
    const movementAssets = syntheticTarget ? [...game.assets, syntheticTarget] : game.assets;
    const quarterMove = applyMonthlyMarketMove(movementAssets, game.marketQuotes ?? initialMarketQuotes(), 2, createGameRandom(game, "market:2"), quarterSurprise, game.activeSignals ?? []);
    const impact = quarterMove.surpriseImpact;
    if (!impact) return;
    const syntheticMovement = syntheticTarget ? impact.after - impact.before : 0;
    let assets: Position[] = syntheticTarget ? quarterMove.assets.filter((asset) => asset.id !== syntheticTarget.id) : quarterMove.assets;
    let cash = game.cash;
    let debt = game.debt;
    let marketMove = quarterMove.marketMove - syntheticMovement;
    let transactionDeltas: string[] = [];
    let actionDetail = originalPosition ? "你選擇維持原倉位，完整承受本次突襲波動。" : "你選擇保持觀望，沒有建立新部位。";
    let affectedMovement = originalPosition ? impact.after - impact.before : 0;
    let creditInvestmentPurchase = 0;

    if (action === "add" && originalPosition) {
      const added = Math.min(cash, Math.max(3000, cash * .25));
      if (added <= 0) return;
      const movedIndex = assets.findIndex((asset) => asset.id === originalPosition.id);
      if (movedIndex < 0) return;
      const addedValue = Math.max(0, added * (1 + impact.moveRate));
      cash -= added;
      creditInvestmentPurchase = added;
      marketMove += addedValue - added;
      affectedMovement += addedValue - added;
      assets = assets.map((asset, index) => index === movedIndex ? { ...asset, cost: asset.cost + added, value: asset.value + addedValue } : asset);
      transactionDeltas = [`投入本金 −${formatMoney(added).replace("NT$ ", "")}`, `加倉 ${formatMoney(added).replace("NT$ ", "")}`];
      actionDetail = `你在消息揭曉前投入 ${formatMoney(added)} 加倉，新增部位與原倉位一起承受本次波動。`;
    } else if (action === "add" && watchedAsset) {
      const added = Math.min(cash, Math.max(3000, cash * .25));
      if (added <= 0) return;
      const addedValue = Math.max(0, added * (1 + impact.moveRate));
      cash -= added;
      creditInvestmentPurchase = added;
      marketMove += addedValue - added;
      affectedMovement = addedValue - added;
      assets = addPosition(assets, {
        id: deterministicPositionId(game, "surprise-entry", quarterSurprise.targetName),
        category: watchedAsset.category,
        name: watchedAsset.name,
        cost: added,
        value: addedValue,
        declineStreak: impact.declined ? 1 : 0,
        riseStreak: impact.declined ? 0 : 1,
      });
      transactionDeltas = [`投入本金 −${formatMoney(added).replace("NT$ ", "")}`, `建立「${watchedAsset.name}」部位`];
      actionDetail = `你在消息揭曉前投入 ${formatMoney(added)} 建立部位，立即承受本次突襲波動。`;
    } else if (action === "close" && originalPosition) {
      const avoidedMovement = impact.after - impact.before;
      assets = assets.filter((asset) => asset.id !== originalPosition.id);
      marketMove -= avoidedMovement;
      affectedMovement = 0;
      const generalDebt = Math.max(0, debt - (game.familyDebt ?? 0));
      const automaticRepayment = Math.min(originalPosition.value, originalPosition.loan ?? 0, generalDebt);
      const netProceeds = originalPosition.value - automaticRepayment;
      cash += netProceeds;
      debt = Math.max(0, debt - automaticRepayment);
      transactionDeltas = [`賣出價款 +${formatMoney(originalPosition.value).replace("NT$ ", "")}`, ...(automaticRepayment > 0 ? [`自動還債 −${formatMoney(automaticRepayment).replace("NT$ ", "")}`] : []), `現金淨增加 +${formatMoney(netProceeds).replace("NT$ ", "")}`, "部位 −100%", "本月該部位波動 0"];
      actionDetail = `你在消息揭曉前全部平倉，按原市值賣出 ${formatMoney(originalPosition.value)}。${automaticRepayment > 0 ? `系統先償還 ${formatMoney(automaticRepayment)} 槓桿本金，` : ""}其餘 ${formatMoney(netProceeds)} 回到現金，因此避開或錯過本次波動。`;
    }

    const directionLabel = quarterSurprise.direction === "bullish" ? "利多" : "利空";
    const truthLabel = impact.truthful ? "成真" : "反轉";
    const amplification = Math.round((impact.multiplier - 1) * 100);
    const hasPosition = Boolean(originalPosition) || action === "add";
    const gauges = { ...game.gauges };
    const responseDeltas: string[] = [];
    let responseDetail = "";
    if (response === "research") {
      const knowledgeGain = addKnowledge(gauges, 4);
      gauges.stress = clamp(gauges.stress + 1);
      responseDeltas.push(`投資知識 +${knowledgeGain}`, "壓力 +1");
      responseDetail = "你先查來源與交叉驗證，交易部位保持原狀。";
    } else if (response === "rest") {
      gauges.health = clamp(gauges.health + 1);
      gauges.stress = clamp(gauges.stress - 3);
      responseDeltas.push("健康 +1", "壓力 −3");
      responseDetail = "你關掉通知，讓既有配置自行承受行情。";
    } else if (response === "content") {
      cash += 8000;
      gauges.stress = clamp(gauges.stress + 5);
      responseDeltas.push("即時收入 +8,000", "壓力 +5");
      responseDetail = "你把消息整理成內容，沒有在突襲畫面臨時下單。";
    }
    const surpriseDailyDetail = impact.tradingDays && impact.minDailyRate !== undefined && impact.maxDailyRate !== undefined
      ? `${dailyMoveDetail(quarterSurprise.targetCategory, { moveRate: impact.moveRate, tradingDays: impact.tradingDays, minDailyRate: impact.minDailyRate, maxDailyRate: impact.maxDailyRate })}。`
      : "";
    const outcome: Resolution = {
      tone: impact.declined ? "bad" : "good",
      eyebrow: `季度突襲 · ${directionLabel}${truthLabel}`,
      title: quarterSurprise.direction === "bullish"
        ? impact.truthful ? "利多成真，價格把好消息放大。" : "利多破功，追價盤被反向收割。"
        : impact.truthful ? "利空成真，賣壓比消息跑得更快。" : "利空被證偽，回補把價格往上推。",
      body: hasPosition
        ? `${quarterSurprise.targetName} 本月市場反應為${impact.declined ? "下跌" : "上漲"} ${(Math.abs(impact.moveRate) * 100).toFixed(1)}%。你的持倉選擇已直接納入本月結算。`
        : `${quarterSurprise.targetName} 完成一輪${impact.declined ? "下跌" : "上漲"}突襲；你保持觀望，因此沒有產生持倉損益。`,
      detail: hasPosition
        ? `${responseDetail || actionDetail}本次消息結果為「${truthLabel}」：一般月度波動幅度約 ${(impact.baseRate * 100).toFixed(1)}%，再放大 ${amplification}% 後，本月累計波動 ${(Math.abs(impact.moveRate) * 100).toFixed(1)}%。${surpriseDailyDetail}月底會把本季三個月的累計結果納入連漲／連跌判定。`
        : `${responseDetail || actionDetail}${directionLabel}消息本次抽中「${truthLabel}」。你沒有建立這項資產的部位，因此本次持倉損益為零。`,
      deltas: hasPosition
        ? [...responseDeltas, ...transactionDeltas, ...(action === "close" ? [`若續抱 ${impact.declined ? "−" : "+"}${formatMoney(Math.abs(impact.after - impact.before)).replace("NT$ ", "")}`] : [`本月帳面變動 ${affectedMovement >= 0 ? "+" : "−"}${formatMoney(Math.abs(affectedMovement)).replace("NT$ ", "")}`]), `消息${truthLabel}`, `波動放大 +${amplification}%`]
        : [...responseDeltas, `消息${truthLabel}`, "持倉損益 0"],
    };
    const quarterClosed: Game = {
      ...game,
      assets,
      marketQuotes: quarterMove.marketQuotes,
      cash,
      debt,
      gauges,
      achievementStats: achievementStatsForAssets(game.achievementStats ?? blankAchievementStats(), assets, creditInvestmentPurchase),
      annualMarketMove: game.annualMarketMove + marketMove,
      quarterMarketMove: 0,
      activeSignals: ageMarketSignals(game.activeSignals ?? []),
      history: [...game.history, `${game.age}歲${periodLabel(game)}突襲：${outcome.title}`].slice(-8),
    };
    trackAnonymous("surprise_resolved", {
      eventId: quarterSurprise.id,
      action,
      response: response ?? null,
      direction: quarterSurprise.direction,
      truthful: impact.truthful,
      outcome: outcome.tone,
      category: quarterSurprise.targetCategory,
      target: quarterSurprise.targetName,
      priceMove: Math.round(impact.moveRate * 10000),
      netWorth: Math.round(netWorth(quarterClosed)),
    }, quarterClosed);
    setGame(quarterClosed);
    setQuarterSurprise({ ...quarterSurprise, outcome });
  }

  function continueAfterSurprise() {
    if (!game || !quarterSurprise?.outcome) return;
    setQuarterSurprise(null);
    closeQuarterWithHealthCheck(game);
  }

  function closeQuarterWithHealthCheck(quarterClosed: Game) {
    const random = createGameRandom(quarterClosed, "quarter-health");
    const existingCooldown = quarterClosed.illnessCooldown ?? 0;
    const gauges = { ...quarterClosed.gauges };
    if (gauges.stress >= 90 && random() < .5) gauges.health = clamp(gauges.health - 2);
    else if (gauges.stress >= 75 && random() < .35) gauges.health = clamp(gauges.health - 1);
    const previousStats = quarterClosed.achievementStats ?? blankAchievementStats();
    const currentHighStressQuarters = gauges.stress >= 90 ? previousStats.currentHighStressQuarters + 1 : 0;
    const achievementStats = {
      ...previousStats,
      currentHighStressQuarters,
      maxHighStressQuarters: Math.max(previousStats.maxHighStressQuarters, currentHighStressQuarters),
      totalHighStressQuarters: (previousStats.totalHighStressQuarters ?? 0) + (gauges.stress >= 90 ? 1 : 0),
    };
    const prepared = { ...quarterClosed, gauges, achievementStats, illnessCooldown: Math.max(0, existingCooldown - 1) };
    if (gauges.health <= 0) {
      setGame(prepared);
      return;
    }
    if (existingCooldown > 0 || random() >= illnessChance(prepared.gauges.health)) {
      advanceClosedMonth(prepared);
      return;
    }
    const event = createIllnessEvent(prepared, random);
    const illnessCooldown = prepared.gauges.health < 20 ? 2 : 4;
    setGame({ ...prepared, illnessSeen: [...(prepared.illnessSeen ?? []), event.id], illnessCooldown, achievementStats: { ...achievementStats, illnesses: achievementStats.illnesses + 1 } });
    setIllnessEvent(event);
    setIllnessNotice(null);
  }

  function resolveIllness(choice: IllnessChoice) {
    if (!game || !illnessEvent || illnessNotice) return;
    const random = createGameRandom(game, `illness:${illnessEvent.id}:${choice}`);
    const next: Game = { ...game, gauges: { ...game.gauges } };
    const fullCost = illnessBaseCost(game, illnessEvent);
    const effects = illnessEvent.severity === "mild"
      ? { hardHealth: -4, hardStress: 5, careHealth: 2, careStress: -2 }
      : illnessEvent.severity === "moderate"
        ? { hardHealth: -8, hardStress: 9, careHealth: 0, careStress: -3 }
        : { hardHealth: -15, hardStress: 14, careHealth: -4, careStress: 2 };
    let notice: IllnessNotice;

    if (choice === "push") {
      const basicCost = Math.min(Math.max(0, next.cash), Math.max(1000, Math.round(fullCost * .08 / 1000) * 1000));
      next.cash -= basicCost;
      next.gauges.health = clamp(next.gauges.health + effects.hardHealth);
      next.gauges.stress = clamp(next.gauges.stress + effects.hardStress);
      notice = {
        tone: illnessEvent.severity === "mild" ? "flat" : "bad",
        title: "你選擇硬撐，工作沒有停，身體也沒有忘記。",
        body: `你只做了基本處理並照常生活。這次省下大部分費用，但${illnessSeverityLabel(illnessEvent.severity)}對健康與壓力留下了更明顯的影響。`,
        deltas: [`現金 −${formatMoney(basicCost).replace("NT$ ", "")}`, `健康 ${effects.hardHealth}`, `壓力 +${effects.hardStress}`],
      };
    } else if (choice === "treat") {
      const paid = Math.min(Math.max(0, next.cash), fullCost);
      const financed = fullCost - paid;
      next.cash -= paid;
      next.debt += financed;
      next.annualDebtAdded = (next.annualDebtAdded ?? 0) + financed;
      next.gauges.health = clamp(next.gauges.health + effects.careHealth);
      next.gauges.stress = clamp(next.gauges.stress + effects.careStress);
      if (financed > 0) next.gauges.credit = clamp(next.gauges.credit - 2);
      notice = {
        tone: illnessEvent.severity === "severe" ? "flat" : "good",
        title: "你把治療排在行情前面，帳戶變薄，恢復期變短。",
        body: financed > 0 ? `醫療與請假成本共 ${formatMoney(fullCost)}；現金不足的 ${formatMoney(financed)} 轉為有息醫療負債。` : `醫療與請假成本共 ${formatMoney(fullCost)}，本次以現金支付，沒有新增負債。`,
        deltas: [`現金 −${formatMoney(paid).replace("NT$ ", "")}`, ...(financed > 0 ? [`負債 +${formatMoney(financed).replace("NT$ ", "")}`, "信用 −2"] : []), `健康 ${effects.careHealth >= 0 ? "+" : ""}${effects.careHealth}`, `壓力 ${effects.careStress >= 0 ? "+" : ""}${effects.careStress}`],
      };
    } else {
      const supportChance = clamp(.16 + next.gauges.family * .0075, .2, .92);
      const supported = random() < supportChance;
      if (supported) {
        const playerCost = Math.round(fullCost * .3 / 1000) * 1000;
        const paid = Math.min(Math.max(0, next.cash), playerCost);
        const financed = playerCost - paid;
        next.cash -= paid;
        next.debt += financed;
        next.annualDebtAdded = (next.annualDebtAdded ?? 0) + financed;
        next.gauges.health = clamp(next.gauges.health + effects.careHealth + 1);
        next.gauges.stress = clamp(next.gauges.stress - 4);
        next.gauges.family = clamp(next.gauges.family + 4);
        if (financed > 0) next.gauges.credit = clamp(next.gauges.credit - 1);
        notice = {
          tone: "good",
          title: "家人接住了你，這次不是靠保證金。",
          body: `家人協助照顧並分擔七成費用，你負擔 ${formatMoney(playerCost)}。有人陪你把恢復期走完，關係也因此更靠近。`,
          deltas: [`現金 −${formatMoney(paid).replace("NT$ ", "")}`, ...(financed > 0 ? [`負債 +${formatMoney(financed).replace("NT$ ", "")}`, "信用 −1"] : []), `健康 ${effects.careHealth + 1 >= 0 ? "+" : ""}${effects.careHealth + 1}`, "壓力 −4", "家庭關係 +4"],
        };
      } else {
        const basicCost = Math.min(Math.max(0, next.cash), Math.max(1000, Math.round(fullCost * .1 / 1000) * 1000));
        const healthLoss = Math.ceil(Math.abs(effects.hardHealth) * .75);
        next.cash -= basicCost;
        next.gauges.health = clamp(next.gauges.health - healthLoss);
        next.gauges.stress = clamp(next.gauges.stress + 7);
        next.gauges.family = clamp(next.gauges.family - 3);
        notice = {
          tone: "bad",
          title: "家裡這次接不住，你只好先用身體墊款。",
          body: `依家庭關係加權後，本次沒有獲得實質支援。你先做基本處理，省下費用，但健康與家庭氣氛一起受損。`,
          deltas: [`現金 −${formatMoney(basicCost).replace("NT$ ", "")}`, `健康 −${healthLoss}`, "壓力 +7", "家庭關係 −3"],
        };
      }
    }

    next.history = [...game.history, `${game.age}歲${periodLabel(game)}健康：${illnessEvent.title} ${notice.title}`].slice(-8);
    trackAnonymous("illness_event", {
      eventId: illnessEvent.id,
      severity: illnessEvent.severity,
      choice,
      outcome: notice.tone,
      amount: Math.round(Math.max(0, game.cash - next.cash)),
      cash: Math.round(next.cash),
      debt: Math.round(next.debt),
      health: next.gauges.health,
      stress: next.gauges.stress,
      family: next.gauges.family,
    }, next);
    setGame(next);
    setIllnessNotice(notice);
  }

  function continueAfterIllness() {
    if (!game || !illnessNotice) return;
    setIllnessEvent(null);
    setIllnessNotice(null);
    advanceClosedMonth(game);
  }

  function advanceClosedMonth(monthClosed: Game) {
    if (monthClosed.month < EVENTS_PER_SEASON - 1) {
      setGame({ ...monthClosed, month: monthClosed.month + 1, result: null });
      return;
    }
    if (monthClosed.season < 3) {
      setGame({ ...monthClosed, season: monthClosed.season + 1, month: 0, result: null });
      return;
    }
    finishYear(monthClosed);
  }

  function openDebtAction(action: DebtAction) {
    setDebtNotice(null);
    setDebtAction(action);
  }

  function requestFamilyLoan(tier: BorrowTier) {
    if (!game || game.phase === "ending" || game.lastFamilyBorrowYear === game.year) return;
    const amount = familyBorrowAmount(game, tier);
    const chance = familyBorrowChance(game, tier);
    const approved = createGameRandom(game, `family-loan:${tier}`)() < chance;
    const strain = tier === "small" ? 2 : tier === "medium" ? 5 : 9;
    const gauges = { ...game.gauges };
    gauges.family = clamp(gauges.family - (approved ? strain : 4));
    gauges.stress = clamp(gauges.stress + (approved ? Math.ceil(strain / 2) : 5));
    const nextGame = {
      ...game,
      cash: approved ? game.cash + amount : game.cash,
      debt: approved ? game.debt + amount : game.debt,
      annualDebtAdded: approved ? (game.annualDebtAdded ?? 0) + amount : game.annualDebtAdded ?? 0,
      familyDebt: approved ? (game.familyDebt ?? 0) + amount : game.familyDebt ?? 0,
      lastFamilyBorrowYear: game.year,
      gauges,
    };
    trackAnonymous("debt_action", {
      action: "family_borrow",
      outcome: approved ? "approved" : "rejected",
      amount: Math.round(amount),
      cash: Math.round(nextGame.cash),
      debt: Math.round(nextGame.debt),
      family: nextGame.gauges.family,
    }, nextGame);
    setGame(nextGame);
    setDebtNotice(approved
      ? { tone: "good", title: "家人點頭了，錢進帳，欠的人情也進帳。", body: `借到 ${formatMoney(amount)}，利率固定 0%。家庭關係 −${strain}、壓力 +${Math.ceil(strain / 2)}；這筆錢仍計入總負債。` }
      : { tone: "bad", title: "家人沒有答應，餐桌突然比股市還安靜。", body: `本次申請未通過。沒有新增負債，家庭關係 −4、壓力 +5；本年度不能再次申請。` });
  }

  function repayFamilyLoan(ratio: .5 | 1) {
    if (!game || (game.familyDebt ?? 0) <= 0 || game.cash <= 0) return;
    const target = ratio === 1 ? game.familyDebt : game.familyDebt * .5;
    const repaid = Math.min(game.cash, target);
    const remaining = Math.max(0, game.familyDebt - repaid);
    const fullyRepaid = remaining < 1;
    const gauges = { ...game.gauges };
    gauges.family = clamp(gauges.family + (fullyRepaid ? 5 : 2));
    gauges.stress = clamp(gauges.stress - (fullyRepaid ? 4 : 2));
    const nextGame = { ...game, cash: game.cash - repaid, debt: Math.max(0, game.debt - repaid), familyDebt: remaining, gauges };
    trackAnonymous("debt_action", {
      action: "family_repay",
      ratio: Math.round(ratio * 100),
      amount: Math.round(repaid),
      cash: Math.round(nextGame.cash),
      debt: Math.round(nextGame.debt),
      family: nextGame.gauges.family,
    }, nextGame);
    setGame(nextGame);
    setDebtNotice({
      tone: "good",
      title: fullyRepaid ? "家人借款清償完畢，群組氣氛明顯回暖。" : "你先還了一部分，至少不是只會已讀。",
      body: `本次償還 ${formatMoney(repaid)}，家人借款剩餘 ${formatMoney(remaining)}。家庭關係 +${fullyRepaid ? 5 : 2}、壓力 −${fullyRepaid ? 4 : 2}。`,
    });
  }

  function requestCreditLoan(amount: number) {
    if (!game || game.phase === "ending" || game.lastCreditBorrowYear === game.year) return;
    if (amount < 100000 || amount > CREDIT_LOAN_MAX || amount % 10000 !== 0) return;
    const currentGeneralDebt = Math.max(0, game.debt - (game.familyDebt ?? 0));
    const limit = creditLoanLimit(game);
    const capacity = Math.max(0, Math.min(CREDIT_LOAN_MAX, limit) - currentGeneralDebt);
    if (amount > capacity) return;
    const chance = creditLoanChance(game, amount);
    const approved = createGameRandom(game, `credit-loan:${amount}`)() < chance;
    const gauges = { ...game.gauges };
    gauges.stress = clamp(gauges.stress + (approved ? 2 : 4));
    gauges.credit = clamp(gauges.credit + (approved ? 0 : -1));
    const achievementStats = game.achievementStats ?? blankAchievementStats();
    const nextGame = {
      ...game,
      cash: approved ? game.cash + amount : game.cash,
      debt: approved ? game.debt + amount : game.debt,
      annualDebtAdded: approved ? (game.annualDebtAdded ?? 0) + amount : game.annualDebtAdded ?? 0,
      lastCreditBorrowYear: game.year,
      creditLoanMonthsRemaining: approved ? CREDIT_LOAN_TERM_MONTHS : game.creditLoanMonthsRemaining,
      gauges,
      achievementStats: approved
        ? {
          ...achievementStats,
          cumulativeCreditBorrowed: achievementStats.cumulativeCreditBorrowed + amount,
          uninvestedCreditProceeds: achievementStats.uninvestedCreditProceeds + amount,
        }
        : achievementStats,
    };
    trackAnonymous("debt_action", {
      action: "credit_borrow",
      outcome: approved ? "approved" : "rejected",
      amount: Math.round(amount),
      cash: Math.round(nextGame.cash),
      debt: Math.round(nextGame.debt),
      credit: nextGame.gauges.credit,
    }, nextGame);
    setGame(nextGame);
    setDebtNotice(approved
      ? { tone: "good", title: "信貸核准，現金進場，五年倒數也開始。", body: `核准 ${formatMoney(amount)}，固定年利率 6%，分 60 期本息攤還，預估每月 ${formatMoney(monthlyCreditPayment(amount))}。壓力 +2。` }
      : { tone: "bad", title: "銀行婉拒了這次申請。", body: `收入與信用加權後未通過，本年度不能再次申請。沒有新增負債；壓力 +4、信用 −1。` });
  }

  function repayInterestDebt(ratio: .5 | 1) {
    if (!game || game.cash <= 0) return;
    const generalDebt = Math.max(0, game.debt - (game.familyDebt ?? 0));
    if (generalDebt <= 0) return;
    const target = ratio === 1 ? generalDebt : generalDebt * .5;
    const repaid = Math.min(game.cash, target);
    const trackedLeverageDebt = leverageDebtOf(game.assets);
    const untrackedDebt = Math.max(0, generalDebt - trackedLeverageDebt);
    const appliedToTrackedLoans = Math.max(0, repaid - Math.min(repaid, untrackedDebt));
    const loanFactor = trackedLeverageDebt > 0 ? Math.max(0, 1 - appliedToTrackedLoans / trackedLeverageDebt) : 1;
    const assets = appliedToTrackedLoans > 0
      ? game.assets.map((asset) => ({ ...asset, loan: (asset.loan ?? 0) * loanFactor }))
      : game.assets;
    const remaining = Math.max(0, generalDebt - repaid);
    const fullyRepaid = remaining < 1;
    const gauges = { ...game.gauges };
    gauges.credit = clamp(gauges.credit + (fullyRepaid ? 3 : 1));
    gauges.stress = clamp(gauges.stress - (fullyRepaid ? 5 : 2));
    const achievementStats = game.achievementStats ?? blankAchievementStats();
    const nextGame = {
      ...game,
      cash: game.cash - repaid,
      debt: Math.max(0, game.debt - repaid),
      assets,
      creditLoanMonthsRemaining: fullyRepaid ? 0 : game.creditLoanMonthsRemaining,
      gauges,
      achievementStats: { ...achievementStats, uninvestedCreditProceeds: Math.max(0, achievementStats.uninvestedCreditProceeds - repaid) },
    };
    trackAnonymous("debt_action", {
      action: "credit_repay",
      ratio: Math.round(ratio * 100),
      amount: Math.round(repaid),
      cash: Math.round(nextGame.cash),
      debt: Math.round(nextGame.debt),
      credit: nextGame.gauges.credit,
    }, nextGame);
    setGame(nextGame);
    setDebtNotice({
      tone: "good",
      title: fullyRepaid ? "信貸與有息負債清空，利息終於停止吃本金。" : "你先砍掉一部分本金，後續本息也跟著變小。",
      body: `本次償還 ${formatMoney(repaid)}，信貸與其他有息負債剩餘 ${formatMoney(remaining)}。信用 +${fullyRepaid ? 3 : 1}、壓力 −${fullyRepaid ? 5 : 2}。`,
    });
  }

  function chooseIncomePath(path: IncomePath) {
    if (!game || game.phase !== "season" || game.lastIncomeChoiceYear === game.year) return;
    const random = createGameRandom(game, `income:${path}`);
    const achievementStats = game.achievementStats ?? blankAchievementStats();
    const next: Game = { ...game, gauges: { ...game.gauges }, lastIncomeChoiceYear: game.year, achievementStats: { ...achievementStats, yearsStarted: achievementStats.yearsStarted + 1 } };
    let notice: IncomeNotice;

    if (path === "kol") {
      next.achievementStats.kolYears += 1;
      const isColdStart = game.year === 1;
      const chance = kolSuccessChance(game);
      const roll = random();
      const outcome = roll < chance ? "good" : roll < chance + kolFlatChance(game) ? "flat" : "bad";
      const trackRecordBonus = kolTrackRecordIncomeBonus(game.lastYearReadAccuracy);
      const baseIncome = isColdStart
        ? outcome === "good"
          ? Math.round((20000 + random() * 80000) / 1000) * 1000
          : outcome === "flat"
            ? Math.round(random() * 20000 / 1000) * 1000
            : 0
        : outcome === "good"
          ? Math.round((180000 + game.gauges.knowledge * 3000 + game.kolReputation * 5000 + trackRecordBonus + random() * KOL_GOOD_VARIABLE_INCOME) / 1000) * 1000
          : outcome === "flat"
            ? Math.max(0, Math.round((60000 + game.kolReputation * 1200 + trackRecordBonus * .2 + random() * 120000) / 1000) * 1000)
            : Math.round(random() * 60000 / 1000) * 1000;
      const income = Math.min(kolAnnualIncomeCap(game.specialTrait), annualCareerIncome(baseIncome, game.specialTrait));
      next.income = income;
      next.workBaseIncomeThisYear = 0;
      next.incomeSource = isColdStart ? "股市 KOL · 冷啟動" : "股市 KOL";
      next.occupation = "投資KOL";
      next.familySupportStreak = 0;
      next.workConsecutiveYears = 0;
      if (!game.workTenureProtected) next.parttimeStreak = 0;
      const knowledgeGain = addKnowledge(next.gauges, isColdStart ? 3 : 2);
      const stressDelta = isColdStart
        ? outcome === "good" ? 2 : outcome === "flat" ? 5 : 8
        : outcome === "good" ? -4 : outcome === "flat" ? 3 : 8;
      const creditDelta = isColdStart
        ? outcome === "good" ? 1 : outcome === "flat" ? 0 : -2
        : outcome === "good" ? 2 : outcome === "flat" ? -1 : -5;
      const reputationDelta = isColdStart
        ? outcome === "good" ? 3 : outcome === "flat" ? 0 : -2
        : outcome === "good"
          ? game.lastYearReadAccuracy !== null && game.lastYearReadAccuracy >= .75 ? 12 : game.lastYearReadAccuracy !== null && game.lastYearReadAccuracy >= .6 ? 7 : 3
          : outcome === "flat"
            ? game.lastYearReadAccuracy !== null && game.lastYearReadAccuracy >= .6 ? 2 : -2
            : -12;
      const workaholic = game.specialTrait === "工作狂";
      const totalStressDelta = stressDelta + (workaholic ? 2 : 0);
      next.gauges.stress = clamp(next.gauges.stress + totalStressDelta);
      if (workaholic) next.gauges.health = clamp(next.gauges.health - 1);
      next.gauges.credit = clamp(next.gauges.credit + creditDelta);
      next.kolReputation = clamp((game.kolReputation ?? 0) + reputationDelta);
      notice = {
        tone: outcome,
        title: isColdStart
          ? outcome === "good" ? "第一支影片小爆紅，但業配還只敢先試水溫。" : outcome === "flat" ? "帳號開了，觀眾還在路上。" : "你對著鏡頭講盤，演算法先去睡了。"
          : outcome === "good" ? "流量、訂閱與業配一起進場。" : outcome === "flat" ? "有人看影片，演算法沒有特別感動。" : "喊單連續翻車，留言區比帳戶更綠。",
        body: isColdStart
          ? `第一年是冷啟動期，收入只來自小額流量或第一筆試水溫合作。本年度收入確定為 ${formatMoney(income)}，將在年度結算時入帳。`
          : `投資知識、上一年市場判讀戰績與累積聲量共同影響結果。${game.lastYearReadAccuracy === null ? "上一年沒有足夠方向紀錄。" : `上一年判讀命中率 ${Math.round(game.lastYearReadAccuracy * 100)}%。`}本年度 KOL 收入確定為 ${formatMoney(income)}，最高不超過 ${formatMoney(kolAnnualIncomeCap(game.specialTrait))}。`,
        deltas: [`年末待入帳 ${formatMoney(income)}`, ...(workaholic ? ["工作狂收入 +8%", "健康 −1"] : []), `KOL 聲量 ${signedStat(reputationDelta)}（目前 ${next.kolReputation}）`, `投資知識 +${knowledgeGain}`, `壓力 ${signedStat(totalStressDelta)}`, `信用 ${creditDelta > 0 ? `+${creditDelta}` : creditDelta < 0 ? `−${Math.abs(creditDelta)}` : "不變"}`],
      };
    } else if (path === "family") {
      next.achievementStats.familyIncomeYears += 1;
      const streak = game.familySupportStreak ?? 0;
      const chance = familySupportChance(game);
      const approved = random() < chance;
      const support = familySupportAmount(game);
      const fallbackIncome = 180000;
      const strain = Math.min(10, 4 + streak * 2);
      next.income = approved ? support : fallbackIncome;
      next.workBaseIncomeThisYear = 0;
      next.incomeSource = approved ? "家裡資助" : "家裡資助未通過 · 臨時零工";
      next.occupation = "無業";
      next.familySupportStreak = streak + 1;
      next.workConsecutiveYears = 0;
      if (!game.workTenureProtected) next.parttimeStreak = 0;
      next.gauges.family = clamp(next.gauges.family - (approved ? strain : 5));
      next.gauges.health = clamp(next.gauges.health - (approved ? 0 : 2));
      next.gauges.stress = clamp(next.gauges.stress + (approved ? 2 : 8));
      notice = {
        tone: approved ? "good" : "bad",
        title: approved ? "家人答應支援，餐桌上也多了一張隱形對帳單。" : "家人沒有點頭，你只好先接臨時零工。",
        body: approved ? `本年度獲得 ${formatMoney(support)} 資助，不計入負債並在年度結算時入帳。連續伸手仍會降低關係與下次核准率。` : `本次資助未通過；你臨時工作補進 ${formatMoney(fallbackIncome)} 年收入，代價是家庭關係 −5、健康 −2、壓力 +8。生活費仍照常發生。`,
        deltas: [`年末待入帳 ${approved ? formatMoney(support) : formatMoney(fallbackIncome)}`, `家庭關係 −${approved ? strain : 5}`, `壓力 +${approved ? 2 : 8}`, ...(!approved ? ["健康 −2"] : []), `連續申請 ${streak + 1} 年`],
      };
    } else {
      next.achievementStats.parttimeYears += 1;
      const streak = (game.parttimeStreak ?? 0) + 1;
      const consecutiveYears = (game.workConsecutiveYears ?? 0) + 1;
      const workaholic = game.specialTrait === "工作狂";
      const healthCost = workHealthCost(consecutiveYears) + (game.workPromoted ? 1 : 0) + (workaholic ? 1 : 0);
      const stressCost = 8 + (game.workPromoted ? 3 : 0) + (workaholic ? 2 : 0);
      const income = annualCareerIncome(rankedWorkIncome(streak, game.workPromoted), game.specialTrait);
      next.income = income;
      next.workBaseIncomeThisYear = income;
      next.incomeSource = game.workPromoted ? "麥當當值班主管" : streak >= WORK_RAISE_STREAK ? "外出打工 · 資深薪資" : "外出打工";
      next.occupation = game.workPromoted ? "麥當當值班主管" : "麥當當員工";
      next.familySupportStreak = 0;
      next.parttimeStreak = streak;
      next.workConsecutiveYears = consecutiveYears;
      const tenureJustUnlocked = !game.workTenureProtected && streak >= WORK_TENURE_PROTECTION_STREAK;
      next.workTenureProtected = game.workTenureProtected || tenureJustUnlocked;
      next.gauges.health = clamp(next.gauges.health - healthCost);
      next.gauges.stress = clamp(next.gauges.stress + stressCost);
      notice = {
        tone: "flat",
        title: game.workPromoted ? "你回到值班主管的位置，薪資與責任一起報到。" : tenureJustUnlocked ? "連續工作滿三年，這份年資終於不會蒸發。" : streak >= WORK_RAISE_STREAK ? "老闆終於承認你不是新人。" : "白天服務客人，晚上服務券商。",
        body: tenureJustUnlocked
          ? `這是第 ${streak} 年工作，年薪為 ${formatMoney(income)}。你已解鎖永久年資保留；以後即使中途改做 KOL 或接受家裡資助，再回來工作仍會沿用目前年資與薪資級距。`
          : game.workPromoted
            ? `值班主管基本年薪永久提高18%，本年度為 ${formatMoney(income)}。主管職每年額外消耗健康1點、增加壓力3點，工作期間每季固定少看一則市場新聞。`
          : streak >= WORK_RAISE_STREAK
            ? `目前工作年資第 ${streak} 年，年薪提高為 ${formatMoney(income)}，將在年度結算時入帳。${game.workTenureProtected ? "永久年資已保留，即使中途換跑道也不會歸零。" : "第 3 年可解鎖永久年資保留；之後每年薪資再調升 4%。"}`
          : `連續打工第 ${streak} 年，你換到穩定的 ${formatMoney(income)} 年收入；連續第 3 年起會提高為 ${formatMoney(EXPERIENCED_WORK_BASE_INCOME)}，之後每年再調升 4%。`,
        deltas: [`年末待入帳 ${formatMoney(income)}`, ...(workaholic ? ["工作狂收入 +8%"] : []), `${next.workTenureProtected ? "保留年資" : "工作年資"} ${streak} 年`, `連續工作 ${consecutiveYears} 年`, ...(game.workPromoted ? ["主管基本年薪 +18%", "每季固定隱藏 1 則新聞"] : []), ...(tenureJustUnlocked ? ["永久年資保留 已解鎖"] : []), `健康 −${healthCost}`, `壓力 +${stressCost}`, "投資知識不變"],
      };
    }

    next.history = [...game.history, `${game.age}歲收入：${notice.title}`].slice(-8);
    trackAnonymous("income_choice", {
      incomePath: path,
      outcome: notice.tone,
      income: Math.round(next.income),
      health: next.gauges.health,
      stress: next.gauges.stress,
      family: next.gauges.family,
      knowledge: next.gauges.knowledge,
    }, next);
    setGame(next);
    setIncomeNotice(notice);
  }

  function resolveCareerEvent(choice: CareerEventChoice) {
    if (!game || !careerEvent || careerNotice) return;
    const next: Game = {
      ...game,
      gauges: { ...game.gauges },
      careerEventStats: { ...(game.careerEventStats ?? blankCareerEventStats()) },
      kolEndorsements: [...(game.kolEndorsements ?? [])],
    };
    const stats = next.careerEventStats;
    const workBase = annualWorkBaseIncome(game);
    const sponsorshipFee = careerEventIncome(kolSponsorshipFee(game.kolReputation), game.specialTrait);
    const eventIncome = (amount: number) => careerEventIncome(amount, game.specialTrait);
    const quarter = absoluteQuarterIndex(game);
    const chargeExpense = (amount: number) => {
      const paid = Math.min(Math.max(0, next.cash), amount);
      const financed = amount - paid;
      next.cash -= paid;
      next.debt += financed;
      next.annualDebtAdded = (next.annualDebtAdded ?? 0) + financed;
      if (financed > 0) next.creditLoanMonthsRemaining = Math.max(next.creditLoanMonthsRemaining, CREDIT_LOAN_TERM_MONTHS);
      return { paid, financed };
    };
    let notice: CareerEventNotice;

    if (careerEvent.id === "mcd_overtime") {
      if (choice === "A") {
        const bonus = eventIncome(careerSalaryBonus(workBase, .12));
        next.income += bonus;
        next.gauges.health = clamp(next.gauges.health - 1);
        next.gauges.stress = clamp(next.gauges.stress + 3);
        next.hiddenNewsRemaining += 2;
        stats.salaryBonus += bonus;
        stats.overtimeAccepted += 1;
        notice = { tone: "flat", title: "你留下來補完晚班，薪水變多，市場先跳過你。", body: "本季兩則新聞仍會在背景影響行情；你看不到內容，但每次仍可進券商自行交易。", deltas: [`本年收入 +${formatMoney(bonus).replace("NT$ ", "")}`, "健康 −1", "壓力 +3", "本季隱藏新聞 2 則"] };
      } else {
        notice = { tone: "good", title: "你準時下班，市場資訊沒有缺席。", body: "收入不變，本季兩則新聞與交易照常進行。", deltas: ["本年收入 不變", "健康 不變", "本季新聞 2 則"] };
      }
    } else if (careerEvent.id === "mcd_coworker_leave") {
      if (choice === "A") {
        const bonus = eventIncome(careerSalaryBonus(workBase, .06));
        next.income += bonus;
        next.gauges.health = clamp(next.gauges.health - 1);
        next.gauges.stress = clamp(next.gauges.stress + 2);
        next.hiddenNewsRemaining += 1;
        stats.salaryBonus += bonus;
        stats.coworkerCovered += 1;
        notice = { tone: "flat", title: "你接下代班，也把下一則新聞讓給別人看。", body: "下一則新聞仍會影響行情；你不會看到標的與方向，但仍能進券商交易。", deltas: [`本年收入 +${formatMoney(bonus).replace("NT$ ", "")}`, "健康 −1", "壓力 +2", "下一則新聞 隱藏"] };
      } else {
        next.gauges.stress = clamp(next.gauges.stress - 1);
        notice = { tone: "good", title: "你婉拒代班，第一次把時間留給自己。", body: "收入不變，本季兩則新聞都能正常閱讀。", deltas: ["本年收入 不變", "壓力 −1", "本季新聞 2 則"] };
      }
    } else if (careerEvent.id === "mcd_promotion") {
      if (choice === "A") {
        next.workPromoted = true;
        next.occupation = "麥當當值班主管";
        stats.promotionsAccepted += 1;
        notice = { tone: "good", title: "你接過主管名牌，也接過更長的責任清單。", body: "本年度原薪資不追溯調整；下一次選擇麥當當工作起，基本年薪永久提高18%，年度健康與壓力成本同步增加。", deltas: ["職稱 麥當當值班主管", "下年度起基本年薪 +18%", "每年健康額外 −1", "每年壓力額外 +3", "每季固定隱藏 1 則新聞"] };
      } else {
        next.gauges.health = clamp(next.gauges.health + 1);
        next.gauges.stress = clamp(next.gauges.stress - 3);
        notice = { tone: "flat", title: "你先把名牌推回去，讓生活喘一口氣。", body: "維持麥當當員工；條件仍符合時，未來可能再次遇到升遷。", deltas: ["職稱 不變", "健康 +1", "壓力 −3"] };
      }
    } else if (careerEvent.id === "kol_sponsorship") {
      if (choice === "A") {
        next.cash += sponsorshipFee;
        next.kolReputation = clamp(next.kolReputation + 4);
        next.gauges.credit = clamp(next.gauges.credit - 3);
        next.gauges.knowledge = clamp(next.gauges.knowledge - 1);
        stats.kolCash += sponsorshipFee;
        notice = { tone: "flat", title: "業配準時上線，信用開始延遲入帳。", body: "這筆現金是額外職業事件收入，不占年度 KOL 收入上限。", deltas: [`現金 +${formatMoney(sponsorshipFee).replace("NT$ ", "")}`, "KOL 聲量 +4", "信用 −3", "投資知識 −1"] };
      } else {
        const earned = Math.round(sponsorshipFee * .6);
        next.cash += earned;
        next.kolReputation = clamp(next.kolReputation);
        next.gauges.knowledge = clamp(next.gauges.knowledge + 2);
        next.gauges.credit = clamp(next.gauges.credit + 2);
        next.gauges.health = clamp(next.gauges.health - 1);
        next.gauges.stress = clamp(next.gauges.stress + 2);
        next.hiddenNewsRemaining += 1;
        stats.kolCash += earned;
        notice = { tone: "good", title: "你先查產品再接合作，少賺一些，也少欠一些。", body: "下一則新聞會在背景影響市場；你忙於查證業配，因此看不到那則情報。", deltas: [`現金 +${formatMoney(earned).replace("NT$ ", "")}`, "投資知識 +2", "信用 +2", "健康 −1", "壓力 +2", "下一則新聞 隱藏"] };
      }
    } else if (careerEvent.id === "kol_viral_video") {
      if (choice === "A") {
        const earned = eventIncome(100000);
        next.cash += earned;
        next.kolReputation = clamp(next.kolReputation + 8);
        next.gauges.health = clamp(next.gauges.health - 3);
        next.gauges.stress = clamp(next.gauges.stress + 6);
        next.hiddenNewsRemaining += 1;
        stats.kolCash += earned;
        notice = { tone: "good", title: "你趁熱追更，流量和黑眼圈一起成長。", body: "下一則新聞仍會影響行情，但你只來得及剪片，沒時間閱讀。", deltas: [`現金 +${formatMoney(earned).replace("NT$ ", "")}`, "KOL 聲量 +8", "健康 −3", "壓力 +6", "下一則新聞 隱藏"] };
      } else {
        const earned = eventIncome(30000);
        next.cash += earned;
        next.kolReputation = clamp(next.kolReputation + 3);
        next.gauges.health = clamp(next.gauges.health + 1);
        next.gauges.stress = clamp(next.gauges.stress - 2);
        stats.kolCash += earned;
        notice = { tone: "flat", title: "你沒有追著演算法跑，舊流量仍帶來一點收入。", body: "本季兩則新聞照常閱讀，身體也得到一點恢復。", deltas: [`現金 +${formatMoney(earned).replace("NT$ ", "")}`, "KOL 聲量 +3", "健康 +1", "壓力 −2"] };
      }
    } else if (careerEvent.id === "kol_asset_crash") {
      const crashed = currentCrashedEndorsement(game);
      if (crashed) next.kolEndorsements = next.kolEndorsements.map((endorsement) => endorsement.quarter === crashed.quarter && endorsement.category === crashed.category && endorsement.name === crashed.name && endorsement.price === crashed.price ? { ...endorsement, resolved: true } : endorsement);
      if (choice === "A") {
        next.kolReputation = clamp(next.kolReputation - 10);
        next.gauges.credit = clamp(next.gauges.credit + 4);
        next.gauges.knowledge = clamp(next.gauges.knowledge + 2);
        next.gauges.stress = clamp(next.gauges.stress + 3);
        notice = { tone: "flat", title: "你公開道歉，流量掉了，信用沒有一起跌停。", body: crashed ? `「${crashed.name}」這次重挫成為一堂公開的風險課。` : "你把錯誤留下來，沒有再用新話術蓋過去。", deltas: ["KOL 聲量 −10", "信用 +4", "投資知識 +2", "壓力 +3"] };
      } else {
        const earned = eventIncome(60000);
        next.cash += earned;
        next.kolReputation = clamp(next.kolReputation + 5);
        next.gauges.credit = clamp(next.gauges.credit - 6);
        next.gauges.knowledge = clamp(next.gauges.knowledge - 3);
        next.gauges.stress = clamp(next.gauges.stress + 7);
        next.publicShoutCount += 1;
        stats.kolCash += earned;
        notice = { tone: "bad", title: "你把重挫說成洗盤，流量回來，信用先離場。", body: "這次硬拗也被計為一次公開喊單，會提高未來遭調查事件的觸發資格。", deltas: [`現金 +${formatMoney(earned).replace("NT$ ", "")}`, "KOL 聲量 +5", "信用 −6", "投資知識 −3", "壓力 +7", "累計公開喊單 +1"] };
      }
    } else {
      stats.investigations += 1;
      if (choice === "A") {
        const expense = chargeExpense(100000);
        next.kolReputation = clamp(next.kolReputation - 8);
        next.gauges.credit = clamp(next.gauges.credit + 2);
        next.gauges.stress = clamp(next.gauges.stress + 4);
        next.tradeLockUntilQuarter = Math.max(next.tradeLockUntilQuarter, quarter + 2);
        stats.lockedQuarters += 2;
        notice = { tone: "flat", title: "你配合調查，市場接下來兩季只會從帳面經過。", body: "兩季內看不到任何核心新聞與突發消息，也不能開啟券商；行情、持倉、生活費與其他人生事件仍會照常發生。", deltas: [`調查支出 −${formatMoney(100000).replace("NT$ ", "")}`, ...(expense.financed > 0 ? [`新增6%負債 +${formatMoney(expense.financed).replace("NT$ ", "")}`] : []), "KOL 聲量 −8", "信用 +2", "壓力 +4", "市場權限鎖定 2 季"] };
      } else {
        next.kolReputation = clamp(next.kolReputation + 4);
        const escaped = createGameRandom(game, `career-investigation:${careerEventCount(game, "kol_investigation")}:B`)() < .4;
        if (escaped) {
          next.gauges.credit = clamp(next.gauges.credit - 2);
          next.gauges.stress = clamp(next.gauges.stress + 3);
          next.investigationCooldownUntilQuarter = Math.max(next.investigationCooldownUntilQuarter, quarter + 2);
          notice = { tone: "good", title: "你這次成功脫身，但監管已經記住帳號。", body: "沒有停權；至少隔一整季才可能再遇到調查。", deltas: ["KOL 聲量 +4", "信用 −2", "壓力 +3", "市場權限 正常", "調查冷卻 1 季"] };
        } else {
          const expense = chargeExpense(500000);
          next.kolReputation = clamp(next.kolReputation - 15);
          next.gauges.credit = clamp(next.gauges.credit - 8);
          next.gauges.stress = clamp(next.gauges.stress + 10);
          next.tradeLockUntilQuarter = Math.max(next.tradeLockUntilQuarter, quarter + 4);
          stats.lockedQuarters += 4;
          stats.investigationPunishments += 1;
          notice = { tone: "bad", title: "說明沒有被接受，處分與停權一起寄到。", body: "四季內看不到市場情報也不能交易；現金不足的罰款已轉為固定年利率6%的有息負債。", deltas: ["KOL 聲量 淨減少 11", `處分支出 −${formatMoney(500000).replace("NT$ ", "")}`, ...(expense.financed > 0 ? [`新增6%負債 +${formatMoney(expense.financed).replace("NT$ ", "")}`] : []), "信用 −8", "壓力 +10", "市場權限鎖定 4 季"] };
        }
      }
    }

    next.history = [...next.history, `${next.age}歲${periodLabel(next)}職業：${careerEvent.title} ${notice.title}`].slice(-8);
    trackAnonymous("career_event", {
      eventId: careerEvent.id,
      choice,
      outcome: notice.tone,
      income: Math.round(next.income),
      cash: Math.round(next.cash),
      debt: Math.round(next.debt),
      health: next.gauges.health,
      stress: next.gauges.stress,
      knowledge: next.gauges.knowledge,
      credit: next.gauges.credit,
      kolReputation: next.kolReputation,
      hiddenNewsRemaining: next.hiddenNewsRemaining,
      tradeLockedUntilQuarter: next.tradeLockUntilQuarter,
    }, next);
    setGame(next);
    setCareerNotice(notice);
  }

  function closeCareerEvent() {
    if (!careerNotice) return;
    setCareerEvent(null);
    setCareerNotice(null);
  }

  function closeIncomeNotice() {
    if (!game) return;
    setIncomeNotice(null);
    const random = createGameRandom(game, "family-event");
    if (game.year > 1 && random() < .4) {
      const event = createFamilyEvent(game, random);
      setGame({ ...game, familyEventSeen: [...(game.familyEventSeen ?? []), event.id] });
      setFamilyEvent(event);
    } else {
      setFamilyEvent(null);
    }
  }

  function resolveFamilyEvent(choice: FamilyEventChoice) {
    if (!game || !familyEvent) return;
    const next: Game = { ...game, gauges: { ...game.gauges } };
    let historyTitle: string;

    if (choice === "time") {
      const cost = Math.min(Math.max(0, game.cash), Math.max(8000, Math.round(game.income * .02 / 1000) * 1000));
      next.cash -= cost;
      next.gauges.family = clamp(next.gauges.family + 10);
      next.gauges.stress = clamp(next.gauges.stress - 3);
      next.gauges.health = clamp(next.gauges.health + 2);
      historyTitle = `你花時間陪家人處理「${familyEvent.title}」`;
    } else if (choice === "money") {
      const cost = Math.min(Math.max(0, game.cash), Math.max(20000, Math.round(game.income * .05 / 1000) * 1000));
      next.cash -= cost;
      next.gauges.family = clamp(next.gauges.family + 7);
      next.gauges.stress = clamp(next.gauges.stress + 2);
      next.gauges.credit = clamp(next.gauges.credit + 1);
      historyTitle = `你出錢支援「${familyEvent.title}」`;
    } else {
      next.gauges.family = clamp(next.gauges.family - 8);
      next.gauges.stress = clamp(next.gauges.stress + 4);
      historyTitle = `你婉拒處理「${familyEvent.title}」`;
    }

    next.history = [...game.history, `${game.age}歲家庭：${historyTitle}`].slice(-8);
    trackAnonymous("family_event", {
      eventId: familyEvent.id,
      choice,
      amount: Math.round(Math.max(0, game.cash - next.cash)),
      cash: Math.round(next.cash),
      health: next.gauges.health,
      stress: next.gauges.stress,
      family: next.gauges.family,
      credit: next.gauges.credit,
    }, next);
    setGame(next);
    setFamilyEvent(null);
  }

  function finishYear(closingGame?: Game) {
    const current = closingGame ?? game;
    if (!current) return;
    const livingCost = annualLivingCost(current.year, current.specialTrait);
    const incomeAdded = current.income;
    const generalInterestDebt = Math.max(0, current.debt - (current.familyDebt ?? 0));
    const cashBeforeDebtService = current.cash + incomeAdded - livingCost;
    const liquidityDebtAdded = Math.max(0, -cashBeforeDebtService);
    const creditService = serviceAnnualCreditDebt(generalInterestDebt, Math.max(0, cashBeforeDebtService), current.creditLoanMonthsRemaining);
    const cash = creditService.cash;
    const interestPaid = creditService.interestPaid;
    const interestCapitalized = creditService.interestCapitalized;
    const creditPaymentShortfall = Math.max(0, creditService.paymentDue - creditService.paymentPaid);
    const debt = Math.max(0, (current.familyDebt ?? 0) + creditService.balance + liquidityDebtAdded);
    const trackedLeverageDebt = leverageDebtOf(current.assets);
    const untrackedDebt = Math.max(0, generalInterestDebt - trackedLeverageDebt);
    const appliedToTrackedLoans = Math.max(0, creditService.principalPaid - Math.min(creditService.principalPaid, untrackedDebt));
    const loanFactor = trackedLeverageDebt > 0 ? Math.max(0, 1 - appliedToTrackedLoans / trackedLeverageDebt) : 1;
    const assets = current.assets.map((asset) => appliedToTrackedLoans > 0 ? { ...asset, loan: (asset.loan ?? 0) * loanFactor } : asset);
    const gauges = { ...current.gauges };
    const generalDebtAfter = Math.max(0, debt - (current.familyDebt ?? 0));
    const generalDebtPressure = generalDebtAfter > Math.max(1000000, incomeAdded * 4) ? 2 : generalDebtAfter > Math.max(500000, incomeAdded * 2) ? 1 : 0;
    const missedCreditPayment = creditPaymentShortfall >= 1;
    const debtPressure = generalDebtPressure;
    const bookkeeping = current.specialTrait === "記帳強迫症";
    const annualDebtAdded = (current.annualDebtAdded ?? 0) + liquidityDebtAdded;
    const bookkeepingCreditBonus = bookkeeping && annualDebtAdded <= 0 ? 1 : 0;
    const bookkeepingDebtStress = bookkeeping && debt > 0 ? 2 : 0;
    const annualHealthRecovery = gauges.stress < 35 ? 3 : 1;
    gauges.health = clamp(gauges.health - Math.max(0, Math.round((gauges.stress - 55) / 12)) + annualHealthRecovery);
    gauges.stress = clamp(gauges.stress - 5 + (liquidityDebtAdded > 0 ? 6 : 0) + (missedCreditPayment ? 7 : 0) + debtPressure + bookkeepingDebtStress);
    gauges.credit = clamp(gauges.credit + (liquidityDebtAdded > 0 ? -6 : missedCreditPayment ? -5 : 2) + bookkeepingCreditBonus);
    const creditLoanMonthsRemaining = generalDebtAfter <= 0 ? 0 : liquidityDebtAdded > 0 ? CREDIT_LOAN_TERM_MONTHS : creditService.monthsRemaining;
    const achievementStats = current.achievementStats ?? blankAchievementStats();
    const holdsRedHatPortfolio = current.assets.some((asset) => asset.name === "紅帽美國優先組合" && asset.value > 0);
    const redHatHoldingYears = holdsRedHatPortfolio ? (achievementStats.redHatHoldingYears ?? 0) + 1 : 0;
    const maxRedHatHoldingYears = Math.max(achievementStats.maxRedHatHoldingYears ?? 0, redHatHoldingYears);
    const lastYearReadAccuracy = (current.annualDirectionalReads ?? 0) > 0
      ? (current.annualCorrectReads ?? 0) / current.annualDirectionalReads
      : null;
    let nextBase = {
      ...current,
      cash,
      debt,
      assets,
      gauges,
      annualDebtAdded,
      creditLoanMonthsRemaining,
      lastYearReadAccuracy,
      achievementStats: {
        ...achievementStats,
        uninvestedCreditProceeds: Math.max(0, achievementStats.uninvestedCreditProceeds - creditService.principalPaid),
        redHatHoldingYears,
        maxRedHatHoldingYears,
      },
    };
    const annualEndNetWorth = netWorth(nextBase);
    nextBase = {
      ...nextBase,
      wealthHistory: [
        ...(current.wealthHistory?.length ? current.wealthHistory : [{ age: STARTING_AGE, netWorth: 300000 }]),
        { age: Math.min(FINAL_AGE, current.age + 1), netWorth: annualEndNetWorth },
      ],
    };
    if (current.age === FINAL_AGE - 1) {
      const age31InvestableNet = investableNetWorth(nextBase);
      nextBase = { ...nextBase, age31InvestableNet, earlyRetirementQualified: age31InvestableNet >= EARLY_RETIREMENT_TARGET };
    }
    const summary: AnnualSummary = {
      startNet: current.annualStartNet,
      endNet: annualEndNetWorth,
      marketMove: current.annualMarketMove,
      livingCost,
      incomeAdded,
      interestPaid,
      creditInterestPaid: creditService.interestPaid,
      creditPrincipalPaid: creditService.principalPaid,
      creditPaymentDue: creditService.paymentDue,
      creditPaymentPaid: creditService.paymentPaid,
      creditPaymentShortfall,
      generalInterestPaid: creditService.interestPaid,
      interestCapitalized,
      liquidityDebtAdded,
      bookkeepingCreditBonus,
      bookkeepingDebtStress,
      nextLivingCost: annualLivingCost(current.year + 1, current.specialTrait),
    };
    const yearClosed = { ...nextBase, phase: "summary" as const, result: null, annualSummary: summary };
    trackAnonymous("year_completed", {
      income: Math.round(incomeAdded),
      cash: Math.round(yearClosed.cash),
      assetValue: Math.round(yearClosed.assets.reduce((sum, asset) => sum + asset.value, 0)),
      debt: Math.round(yearClosed.debt),
      netWorth: Math.round(annualEndNetWorth),
      health: yearClosed.gauges.health,
      stress: yearClosed.gauges.stress,
      family: yearClosed.gauges.family,
      knowledge: yearClosed.gauges.knowledge,
      credit: yearClosed.gauges.credit,
    }, yearClosed);
    setGame(yearClosed);
  }

  function startNextYear() {
    if (!game) return;
    if (netWorth(game) <= FINANCIAL_FAILURE_NET_WORTH || game.gauges.health <= 0) {
      setGame({ ...game, phase: "ending", annualSummary: null });
      return;
    }
    if (game.age >= FINAL_AGE - 1) {
      setGame({ ...game, age: FINAL_AGE, phase: "ending", annualSummary: null });
      return;
    }
    const nextYear: Game = {
      ...game,
      age: game.age + 1,
      year: game.year + 1,
      season: 0,
      month: 0,
      phase: "season",
      result: null,
      annualStartNet: netWorth(game),
      annualMarketMove: 0,
      quarterMarketMove: 0,
      annualSummary: null,
      annualDebtAdded: 0,
      income: 0,
      workBaseIncomeThisYear: 0,
      incomeSource: "尚未決定",
      lastYearMarketMove: game.annualSummary?.marketMove ?? 0,
      annualCorrectReads: 0,
      annualDirectionalReads: 0,
    };
    setFamilyEvent(null);
    setGame(nextYear);
  }

  function resetGame() {
    if (game) {
      setResetConfirmationOpen(true);
      return;
    }
    performResetGame();
  }

  function performResetGame() {
    if (game && !analyticsCompleted.current) {
      trackAnonymous("run_abandoned", {
        netWorth: Math.round(netWorth(game)),
        cash: Math.round(game.cash),
        assetValue: Math.round(game.assets.reduce((sum, asset) => sum + asset.value, 0)),
        debt: Math.round(game.debt),
      }, game);
    }
    analyticsRunId.current = null;
    analyticsCompleted.current = false;
    analyticsSequence.current = 0;
    analyticsStartedAt.current = 0;
    analyticsLatestGame.current = null;
    lastPresentedEvent.current = null;
    lastCareerRoll.current = null;
    setResetConfirmationOpen(false);
    setGame(null);
    setSeedInput(randomSeedCode());
    setAssetsOpen(false);
    setDebtsOpen(false);
    setIntelOpen(false);
    setIntelView("active");
    setPendingReduction(null);
    setQuarterSurprise(null);
    setDebtAction(null);
    setDebtNotice(null);
    setIncomeNotice(null);
    setCareerEvent(null);
    setCareerNotice(null);
    setFamilyEvent(null);
    setIllnessEvent(null);
    setIllnessNotice(null);
    setHistoryOpen(false);
    setBrokerOpen(false);
    setBrokerNewsHidden(false);
    setBrokerCategory("台股");
    setBrokerNotice(null);
    setQuarterReport(null);
    setScreenshotState("idle");
    setScreenshotPreview(null);
    setShowForeword(false);
    setHideForewordNext(false);
  }

  function beginLife() {
    if (window.localStorage.getItem("chive-hide-foreword") === "1") {
      startTrackedLife();
      return;
    }
    setShowForeword(true);
  }

  function enterLife() {
    if (hideForewordNext) window.localStorage.setItem("chive-hide-foreword", "1");
    else window.localStorage.removeItem("chive-hide-foreword");
    setShowForeword(false);
    startTrackedLife();
  }

  async function saveEndingScreenshot() {
    if (!game || screenshotState === "saving") return;
    setScreenshotState("saving");
    try {
      const blob = await endingCardPng(game, achievementsFor(game));
      const objectUrl = URL.createObjectURL(blob);
      const safeName = game.name.replace(/[\\/:*?"<>|]/g, "-").trim().slice(0, 20) || "韭菜";
      setScreenshotPreview({ url: objectUrl, filename: `韭菜人生-${safeName}-${game.seedCode}-${GAME_VERSION}.png` });
      setScreenshotState("ready");
    } catch (error) {
      console.error("Ending screenshot generation failed", error);
      setScreenshotState("error");
    }
  }

  if (!game) {
    return (
      <main className="start-screen">
        <div className="start-orbit orbit-one" /><div className="start-orbit orbit-two" />
        <section className="start-copy">
          <div className="start-logo"><span>韭</span> JIU-CAI LIFE</div>
          <p className="eyebrow green">一款關於錢、選擇，以及自我感覺良好的遊戲</p>
          <h1>韭菜人生<br/>模擬器</h1>
          <p className="start-intro">
            <span>22 歲，剛大學畢業的你，帶著三十萬元和提前退休的夢走進市場。</span>
            <span>靠打工、家裡支援或經營投資帳號活下去——直到存到三千萬提早退休，或先被市場退休。</span>
          </p>
          <label className="name-field"><span>角色姓名 <small>留白會隨機取名</small></span><input type="text" value={playerName} maxLength={16} placeholder="輸入你的韭菜大名" onChange={(event) => setPlayerName(event.target.value)} /></label>
          <button className="primary start-button" onClick={beginLife}>抽取我的投資人生 <span>→</span></button>
          <div className="seed-control" aria-label="人生種子設定">
            <div className="seed-control-row">
              <span>人生種子</span>
              <input aria-label="人生種子碼" type="text" value={seedInput} maxLength={24} autoCapitalize="characters" spellCheck={false} placeholder="輸入種子碼" onChange={(event) => setSeedInput(event.target.value)} />
              <i>·</i>
              <button type="button" onClick={() => setSeedInput(randomSeedCode())}>換一個</button>
            </div>
            <p>相同種子會重現初始能力、體質、事件順序與市場行情；也可以直接輸入朋友的種子碼。</p>
          </div>
          <small className="anonymous-notice">匿名記錄種子碼與遊戲選擇，用於平衡調整；不包含角色姓名或裝置識別，原始資料保存 180 天。</small>
          <small>純屬娛樂，不構成投資建議 · 平均遊玩時間約 25 分鐘</small>
        </section>
        {showForeword && <div className="foreword-overlay" role="presentation">
          <section className="foreword-dialog" role="dialog" aria-modal="true" aria-labelledby="foreword-title">
            <div className="foreword-dialog-heading"><div className="start-logo"><span>韭</span> JIU-CAI LIFE · 序章</div><button onClick={enterLife}>跳過前言</button></div>
            <p className="eyebrow green">進入市場前，請先閱讀人生風險預告</p>
            <h2 id="foreword-title" aria-label={forewordTitle.replace("\n", " ")}>
              {forewordTitleLines.map((line, index) => <span className="foreword-title-line" key={line}>{animatedCharacters(line, index === 0 ? 0 : forewordTitleLines[0].length + 1)}</span>)}
            </h2>
            <div className="foreword-text">
              {forewordParagraphs.map((paragraph, index) => {
                const offset = forewordTitle.length + forewordParagraphs.slice(0, index).reduce((sum, item) => sum + item.length, 0);
                return <p className={index === forewordParagraphs.length - 1 ? "foreword-punchline" : ""} aria-label={paragraph.replace("\n", " ")} key={paragraph}>{animatedCharacters(paragraph, offset)}</p>;
              })}
            </div>
            <div className="foreword-risk-strip" aria-label="人生風險揭露"><span>保證獲利 <b>0%</b></span><span>保證波動 <b>100%</b></span><span>可重來 <b>∞</b></span></div>
            <div className="foreword-footer">
              <label className="foreword-preference"><input type="checkbox" checked={hideForewordNext} onChange={(event) => setHideForewordNext(event.target.checked)} />下次重開人生時不再顯示前言</label>
              <button className="primary foreword-enter" onClick={enterLife}>簽下風險預告，開始人生 <span>→</span></button>
            </div>
          </section>
        </div>}
        <div className="start-meta" aria-label="遊戲版本與製作資訊">
          <small>版本：{GAME_VERSION}</small>
          <small>製作人：<a href="https://www.threads.com/@kt48wu?igshid=NTc4MTIwNjQ2YQ=" target="_blank" rel="noopener noreferrer" aria-label="傑佛瑞老割的 Threads（另開分頁）">傑佛瑞老割</a></small>
        </div>
      </main>
    );
  }

  const gaugeRows: [string, GaugeKey][] = [["健康", "health"], ["壓力", "stress"], ["家庭關係", "family"], ["投資知識", "knowledge"], ["信用", "credit"]];
  const ending = titleForEnding(game);
  const achievementResults = achievementsFor(game);
  const visibleAchievementResults = achievementsVisibleAtEnding(achievementResults);
  const unlockedAchievementResults = achievementResults.filter((achievement) => achievement.unlocked);
  const endingStats = game.achievementStats ?? blankAchievementStats();
  const financialEnding = game.phase === "ending" && game.gauges.health > 0 && game.age < FINAL_AGE && netWorth(game) <= FINANCIAL_FAILURE_NET_WORTH;
  const currentFamilyDebt = game.familyDebt ?? 0;
  const interestBearingDebt = Math.max(0, game.debt - currentFamilyDebt);
  const generalInterestDebt = interestBearingDebt;
  const familyBorrowUsed = game.lastFamilyBorrowYear === game.year;
  const creditBorrowUsed = game.lastCreditBorrowYear === game.year;
  const currentCreditLimit = creditLoanLimit(game);
  const creditCapacity = Math.max(0, Math.min(CREDIT_LOAN_MAX, currentCreditLimit) - generalInterestDebt);
  const fullCreditCapacityOption = Math.floor(creditCapacity / 10000) * 10000;
  const creditLoanOptions = Array.from(new Set([100000, 300000, 500000, fullCreditCapacityOption, CREDIT_LOAN_MAX]))
    .filter((amount) => amount >= 100000 && amount <= CREDIT_LOAN_MAX)
    .sort((left, right) => left - right);
  const incomeChoiceUsed = game.lastIncomeChoiceYear === game.year;
  const incomeChoiceRequired = game.phase === "season" && game.gauges.health > 0 && !incomeChoiceUsed;
  const surprisePosition = quarterSurprise?.targetId ? game.assets.find((asset) => asset.id === quarterSurprise.targetId) : undefined;
  const surpriseAvailableCash = Math.max(0, game.cash);
  const surpriseMinimumAdd = 3000;
  const surpriseCanAdd = surpriseAvailableCash >= surpriseMinimumAdd;
  const surpriseAddCost = surpriseCanAdd ? Math.min(surpriseAvailableCash, Math.max(3000, surpriseAvailableCash * .25)) : surpriseMinimumAdd;
  const debtActionEyebrow = debtAction === "borrow" ? "負債管理 · 家庭借款申請"
    : debtAction === "repay" ? "負債管理 · 償還家人"
      : debtAction === "creditBorrow" ? "負債管理 · 銀行信貸申請"
        : "負債管理 · 償還信貸本金";
  const dashboardAlert = game.gauges.health <= 20 ? "健康已進入危險區，身體正在發出警訊。"
    : game.gauges.stress >= 80 ? "目前處於高壓狀態，身心負荷已明顯升高。"
      : null;
  const activeSignalIds = new Set((game.activeSignals ?? []).map((signal) => signal.id));
  const latestIntelGroupId = game.intelRecords?.[0]?.groupId;
  const latestIntelRecords = latestIntelGroupId
    ? (game.intelRecords ?? []).filter((record) => record.groupId === latestIntelGroupId)
    : (game.intelRecords ?? []).slice(0, 2);
  const intelRoleOf = (record: IntelRecord) => record.role || (record.id.endsWith("-0") ? "primary" : "linked");
  const intelRecordGroups = Array.from((game.intelRecords ?? []).reduce((groups, record) => {
    const groupId = record.groupId || record.id.replace(/-\d+$/, "");
    groups.set(groupId, [...(groups.get(groupId) ?? []), record]);
    return groups;
  }, new Map<string, IntelRecord[]>()).values());
  const activeIntelGroups = intelRecordGroups.filter((records) => records.some((record) => activeSignalIds.has(record.id)));
  const archivedIntelGroups = intelRecordGroups.filter((records) => records.every((record) => !activeSignalIds.has(record.id)));
  const archivedIntelByAge = Array.from(archivedIntelGroups.reduce((groups, records) => {
    const ageLabel = records[0]?.period.split(" · ")[0] ?? "過往情報";
    groups.set(ageLabel, [...(groups.get(ageLabel) ?? []), records]);
    return groups;
  }, new Map<string, IntelRecord[][]>()).entries());
  const currentEventIntel = currentEventTargets.map((target) => {
    const signals = (game.activeSignals ?? []).filter((signal) => !signal.hidden && signal.targetCategory === target.category && signal.targetName === target.name);
    return {
      target,
      role: target.role,
      record: latestIntelRecords.find((record) => record.targetCategory === target.category && record.targetName === target.name),
      signals,
      summary: summarizeVisibleSignals(signals, game.intelRecords ?? []),
    };
  });
  const currentFocusedIntel = currentEventIntel.filter((item) => item.role !== "market");
  const currentMarketIntel = currentEventIntel.filter((item) => item.role === "market");
  const currentMarketSummary = currentMarketIntel.length
    ? summarizeVisibleSignals(currentMarketIntel.flatMap((item) => item.signals), game.intelRecords ?? [])
    : null;
  const renderIntelGroup = (records: IntelRecord[]) => {
    const orderedRecords = [...records].sort((left, right) => intelRoleOf(left) === intelRoleOf(right) ? 0 : intelRoleOf(left) === "primary" ? -1 : 1);
    const first = orderedRecords[0];
    if (!first) return null;
    const groupIsActive = orderedRecords.some((record) => activeSignalIds.has(record.id));
    const focusedRecords = orderedRecords.filter((record) => intelRoleOf(record) !== "market");
    const marketRecords = orderedRecords.filter((record) => intelRoleOf(record) === "market");
    const marketCategories = [...new Set(marketRecords.map((record) => record.targetCategory))].join("＋");
    const marketDirection = marketRecords[0]?.readDirection;
    return <article className="intel-row intel-group-card" key={first.groupId || first.id}>
      <div className="intel-group-heading"><span>{first.period}</span><em className={groupIsActive ? "active" : "expired"}>{groupIsActive ? "部分或全部生效中" : "已到期"}</em></div>
      <h3>{first.topic}</h3>
      <div className="intel-target-list">{focusedRecords.map((record) => {
        const signal = (game.activeSignals ?? []).find((item) => item.id === record.id);
        const role = intelRoleOf(record);
        return <section className={`intel-target-item intel-target-${role}`} key={record.id}>
          <div><em>{signalRoleLabel(role)}</em><b>{record.targetCategory} · 「{record.targetName}」</b><AssetQuoteLabel asset={{ category: record.targetCategory, name: record.targetName }} game={game} /><i>{signal ? `剩 ${signal.remainingMonths} 月` : "已到期"}</i></div>
          <p>{record.clue}</p><small>{record.source ?? record.actionLabel} · {record.durationLabel}{record.opportunityLabel ? ` · ${record.opportunityLabel}` : ""}</small>
        </section>;
      })}{marketRecords.length > 0 && <section className="intel-target-item intel-target-market" key={`${first.groupId || first.id}-market`}>
        <div><em>市場連動</em><b>{marketCategories} · {marketRecords.length} 檔</b><i>{groupIsActive ? "部分或全部生效中" : "已到期"}</i></div>
        <p>{marketRecords.map((record) => `「${record.targetName}」`).join("、")}</p>
        <small>{marketRecords[0].actionLabel} · {marketDirection === "bullish" ? "判讀偏多" : marketDirection === "bearish" ? "判讀偏空" : "方向仍待價格驗證"} · 預估影響 1 季</small>
      </section>}</div>
    </article>;
  };

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">韭</span><div><strong>韭菜人生模擬器</strong><small>JIU-CAI LIFE</small></div></div>
        <div className="top-actions"><span className="year-label">第 {game.year} 年 · 種子 {game.seedCode}</span><b className="age-pill">{game.age} 歲</b><button className="text-button history-button" onClick={() => setHistoryOpen(true)}>最近紀錄</button><button className="text-button" onClick={resetGame}>重開人生</button></div>
      </header>

      <div className="layout">
        {mobileProfileOpen && <button className="mobile-profile-backdrop" type="button" aria-label="關閉角色資料" onClick={() => setMobileProfileOpen(false)} />}
        <aside className={`dashboard ${mobileProfileOpen ? "mobile-profile-open" : ""}`} id="financial-dashboard" aria-label="角色資料">
          <div className="mobile-profile-sheet-heading"><span><i />角色資料</span><button type="button" aria-label="關閉角色資料" onClick={() => setMobileProfileOpen(false)}>×</button></div>
          <div className="profile-heading"><div><p className="eyebrow">你的財務體質</p><h2>{game.name}</h2><p className="identity">{game.background} · {game.occupation ?? "無業"}</p></div><div className="trait-stack"><span className="trait" title={game.traitEffect}>{game.trait}</span>{game.specialTrait && <span className="trait special-trait" title={game.specialTraitEffect ?? undefined}>{game.specialTrait}</span>}</div></div>
          <div className="money-grid">
            <div><span>現金</span><b>{formatMoney(game.cash)}</b></div>
            <button className="asset-toggle" onClick={() => { setAssetsOpen(!assetsOpen); setDebtsOpen(false); setIntelOpen(false); }} aria-expanded={assetsOpen}><span>投資資產 <i>{assetsOpen ? "收合" : "展開"}</i></span><b>{formatMoney(totalAssets)} <em>{assetsOpen ? "−" : "+"}</em></b></button>
            <button className="debt-toggle" onClick={() => { setDebtsOpen(!debtsOpen); setAssetsOpen(false); setIntelOpen(false); }} aria-expanded={debtsOpen}><span>負債 <i>{debtsOpen ? "收合" : "管理"}</i></span><b className={game.debt > 0 ? "negative" : ""}>{formatMoney(game.debt)} <em>{debtsOpen ? "−" : "+"}</em></b></button>
            <button className="intel-toggle" onClick={() => { if (!intelOpen) setIntelView("active"); setIntelOpen(!intelOpen); setAssetsOpen(false); setDebtsOpen(false); }} aria-expanded={intelOpen}><span>情報庫 <i>{intelOpen ? "收合" : "查看"}</i></span><b>{activeIntelGroups.length} 組生效 <em>{intelOpen ? "−" : "+"}</em></b></button>
          </div>
          {assetsOpen && <div className="asset-drawer">
            {game.assets.length === 0 ? <p>帳戶空空的，只有無限可能。</p> : game.assets.map((asset) => {
              const profit = asset.value - asset.cost;
              return <div className="asset-row" key={asset.id}><span><i>{asset.category}</i><b>{asset.name}</b>{(asset.bearQuarters ?? 0) > 0 && <small className="trend-badge trend-down">空頭壓力剩 {asset.bearQuarters} 季 · 跌≥75%</small>}{(asset.bullQuarters ?? 0) > 0 && <small className="trend-badge trend-up">多頭慣性剩 {asset.bullQuarters} 季 · 漲≥65%</small>}</span><span><b>{formatMoney(asset.value)}</b><em className={profit >= 0 ? "positive" : "negative"}>{profit >= 0 ? "+" : ""}{((profit / Math.max(asset.cost, 1)) * 100).toFixed(1)}%</em>{(asset.loan ?? 0) > 0 && <small className="asset-loan">槓桿本金 {formatMoney(asset.loan ?? 0)}</small>}</span></div>;
            })}
          </div>}
          {debtsOpen && <div className="debt-drawer">
            <div className="debt-breakdown"><span><i>信貸與其他有息負債 · 固定年息 6%</i><b>{formatMoney(generalInterestDebt)}</b></span><span><i>家人借款 · 年息 0%</i><b>{formatMoney(currentFamilyDebt)}</b></span></div>
            <div className="debt-actions"><button disabled={creditBorrowUsed || creditCapacity < 100000 || game.phase === "ending"} onClick={() => openDebtAction("creditBorrow")}><b>申請銀行信貸</b><small>{creditBorrowUsed ? "本年度已申請過" : creditCapacity < 100000 ? "目前可用額度不足10萬元" : `核定上限 ${formatMoney(currentCreditLimit)} · 尚可借 ${formatMoney(creditCapacity)}`}</small></button><button disabled={generalInterestDebt <= 0 || game.cash <= 0} onClick={() => openDebtAction("interest")}><b>提前償還信貸</b><small>{generalInterestDebt <= 0 ? "目前沒有有息負債" : "可還一半或全部清償"}</small></button><button disabled={familyBorrowUsed || game.phase === "ending"} onClick={() => openDebtAction("borrow")}><b>向家裡借錢</b><small>{familyBorrowUsed ? "本年度已詢問過" : `家庭關係 ${game.gauges.family} · 加權審核`}</small></button><button disabled={currentFamilyDebt <= 0 || game.cash <= 0} onClick={() => openDebtAction("repay")}><b>償還家人</b><small>{currentFamilyDebt <= 0 ? "目前沒有家人借款" : "可還一半或全部清償"}</small></button></div>
          <p>信貸採5年本息攤還；收入與信用會影響額度及通過率。年度現金不足時，生活缺口與未繳利息會併入有息負債。</p>
          </div>}
          {intelOpen && <div className="intel-drawer">
            {(game.intelRecords ?? []).length === 0 ? <p>尚未取得情報。完成市場事件後，判讀會保存在這裡。</p> : <>
              <div className="intel-view-tabs"><button className={intelView === "active" ? "active" : ""} onClick={() => setIntelView("active")}>生效中 {activeIntelGroups.length}</button><button className={intelView === "archive" ? "active" : ""} onClick={() => setIntelView("archive")}>歷史 {archivedIntelGroups.length}</button></div>
              {intelView === "active" ? activeIntelGroups.length ? <div className="intel-list">{activeIntelGroups.map(renderIntelGroup)}</div> : <p>目前沒有生效中的情報；過往判讀仍保存在「歷史」。</p> : <div className="intel-archive-list">
                {archivedIntelByAge.map(([ageLabel, groups]) => <details className="intel-year-group" key={ageLabel}><summary><b>{ageLabel}</b><span>{groups.length} 組</span></summary><div className="intel-list">{groups.map(renderIntelGroup)}</div></details>)}
              </div>}
            </>}
          </div>}
          <div className="gauge-list">
            {gaugeRows.map(([label, key]) => <div className={`gauge ${key === "stress" ? "stress" : ""}`} title={gaugeHint(key)} aria-label={`${label} ${game.gauges[key]}。${gaugeHint(key)}`} key={key}><span>{label}</span><i><em style={{ width: `${game.gauges[key]}%` }} /></i><b>{game.gauges[key]}</b></div>)}
          </div>
          {dashboardAlert && <p className="dashboard-alert is-warning">{dashboardAlert}</p>}
          <div className="net-worth"><span>目前淨資產</span><strong className={netWorth(game) < 0 ? "negative" : ""}>{formatMoney(netWorth(game))}</strong></div>
        </aside>

        <section className="stage">
          <div className="mobile-snapshot" aria-label="財務與身心狀態摘要"><div><span>現金</span><b>{formatMoney(game.cash)}</b></div><div><span>淨資產</span><b className={netWorth(game) < 0 ? "negative" : ""}>{formatMoney(netWorth(game))}</b></div><div><span>健康</span><b>{game.gauges.health}</b></div><div><span>壓力</span><b>{game.gauges.stress}</b></div><button type="button" className={`mobile-profile-trigger ${dashboardAlert ? "has-warning" : ""}`} aria-controls="financial-dashboard" aria-expanded={mobileProfileOpen} onClick={() => setMobileProfileOpen(true)}><span><b>角色資料</b><small>{game.name} · {game.occupation ?? "無業"}</small></span><em>{dashboardAlert ? "狀態需留意" : "查看全部"}<i>↑</i></em></button></div>
          <nav className="progress" aria-label="四季進度">
            {seasons.map((seasonName, index) => <span key={seasonName} className={game.phase === "season" && game.season === index ? "active" : game.phase === "summary" || game.phase === "ending" || (game.phase === "season" && game.season > index) ? "done" : ""}>{seasonName}季</span>)}
          </nav>

          {game.phase === "ending" || game.gauges.health <= 0 ? <article className="event-card ending-card">
            <p className="eyebrow green">{game.gauges.health <= 0 ? `${game.age} 歲 · 健康歸零 · 提前結束` : financialEnding ? `${game.age} 歲 · 償債能力失守 · 提前結束` : `${FINAL_AGE} 歲 · 第一階段人生結算`}</p><h1>{ending[0]}</h1><p className="lede">{ending[1]}</p>
            <div className="ending-number"><span>最終淨資產</span><b>{formatMoney(netWorth(game))}</b></div>
            <WealthHistoryChart game={game} />
            <div className="ending-grid"><div><span>現金</span><b>{formatMoney(game.cash)}</b></div><div><span>投資資產</span><b>{formatMoney(totalAssets)}</b></div><div><span>負債</span><b>{formatMoney(game.debt)}</b></div><div><span>投資知識</span><b>{game.gauges.knowledge}</b></div></div>
            {game.gauges.health <= 0 && <section className="health-ending-review" aria-labelledby="health-review-title">
              <div><span>隱藏機制結算</span><h2 id="health-review-title">身體留下的帳單</h2><p>健康歸零不是單一事件，而是這些選擇一路累積的結果。</p></div>
              <dl>
                <div><dt>熬夜研究</dt><dd>{endingStats.researchChoices ?? 0} 次<small>每次健康 −1</small></dd></div>
                <div><dt>跟著喊</dt><dd>{endingStats.trendChoices ?? 0} 次<small>每次健康 −1、知識 −1～2</small></dd></div>
                <div><dt>休息觀察</dt><dd>{endingStats.observeChoices ?? 0} 次<small>每次健康 +1～2</small></dd></div>
                <div><dt>高壓季度</dt><dd>{endingStats.totalHighStressQuarters ?? 0} 季<small>最長連續 {endingStats.maxHighStressQuarters} 季</small></dd></div>
                <div><dt>工作生涯</dt><dd>打工 {endingStats.parttimeYears} 年<small>KOL {endingStats.kolYears} 年</small></dd></div>
                <div><dt>生病事件</dt><dd>{endingStats.illnesses} 次<small>治療方式也會改變傷害</small></dd></div>
              </dl>
            </section>}
            <section className="achievement-section" aria-labelledby="achievement-title">
              <div className="achievement-heading"><div><span>本局成就</span><h2 id="achievement-title">解鎖 {unlockedAchievementResults.length}／{visibleAchievementResults.length}</h2></div><b>{unlockedAchievementResults.length ? "你的傷疤已成功鑄成徽章。" : "這局先留下經驗，徽章下次再拿。"}</b></div>
              {unlockedAchievementResults.length > 0 && <div className="achievement-unlocked-list">
                {unlockedAchievementResults.map((achievement) => <article className={`achievement-card unlocked tier-${achievement.tier}`} key={achievement.id}><div><span>✓ 已解鎖</span><em>{achievement.tier}</em></div><h3>{achievement.title}</h3><p>{achievement.description}</p><small>{achievement.progress}</small></article>)}
              </div>}
              <details className="achievement-catalog">
                <summary>查看全部成就與本局進度 <span>＋</span></summary>
                <div className="achievement-grid">
                  {visibleAchievementResults.map((achievement) => <article className={`achievement-card ${achievement.unlocked ? "unlocked" : "locked"} tier-${achievement.tier}`} key={achievement.id}><div><span>{achievement.unlocked ? "✓ 已解鎖" : "○ 未解鎖"}</span><em>{achievement.tier}</em></div><h3>{achievement.title}</h3><p>{achievement.description}</p><small>{achievement.progress}</small></article>)}
                </div>
              </details>
            </section>
            <div className="ending-actions" data-screenshot-control>
              <button className="ending-screenshot-button" type="button" disabled={screenshotState === "saving"} onClick={saveEndingScreenshot}><span>⇩</span><b>{screenshotState === "saving" ? "正在產生圖片…" : screenshotState === "saved" ? "已下載，再產生一次" : "產生結算圖片"}</b><small>固定尺寸 PNG · 預覽後下載</small></button>
              <button className="primary" onClick={resetGame}>再活一次 <span>↻</span></button>
            </div>
            <p className={`ending-screenshot-status ${screenshotState}`} data-screenshot-control aria-live="polite">{screenshotState === "ready" ? "結算圖片已完成，請在預覽視窗下載。" : screenshotState === "saved" ? "結算圖片已下載到你的裝置。" : screenshotState === "error" ? "圖片產生失敗，請再試一次。" : ""}</p>
          </article> : game.phase === "summary" && game.annualSummary ? <article className="event-card summary-card">
            <p className="eyebrow green">{game.age} 歲 · 年度財務結算</p><h1>市場收盤，<br/>人生繼續計息。</h1>
            <div className="summary-net"><span>年度淨資產變化</span><b className={game.annualSummary.endNet >= game.annualSummary.startNet ? "positive" : "negative"}>{game.annualSummary.endNet >= game.annualSummary.startNet ? "+" : "−"}{formatMoney(Math.abs(game.annualSummary.endNet - game.annualSummary.startNet)).replace("NT$ ", "")}</b></div>
            <div className="summary-list">
              <div><span>本年收入已入帳 · {game.incomeSource}</span><b>+{formatMoney(game.annualSummary.incomeAdded).replace("NT$ ", "")}</b></div>
              <div><span>固定生活費 · 年增 2%</span><b>−{formatMoney(game.annualSummary.livingCost).replace("NT$ ", "")}</b></div>
              <div><span>十二個月持有部位波動</span><b className={game.annualSummary.marketMove >= 0 ? "positive" : "negative"}>{game.annualSummary.marketMove >= 0 ? "+" : "−"}{formatMoney(Math.abs(game.annualSummary.marketMove)).replace("NT$ ", "")}</b></div>
              {game.annualSummary.creditPaymentDue > 0 && <div><span>信貸本息已繳 · 本金 {formatMoney(game.annualSummary.creditPrincipalPaid)}＋利息 {formatMoney(game.annualSummary.creditInterestPaid)}</span><b>−{formatMoney(game.annualSummary.creditPaymentPaid).replace("NT$ ", "")}</b></div>}
              {game.annualSummary.creditPaymentShortfall > 0 && <div><span>信貸本息未繳足 · 未付利息併入負債</span><b className="negative">差額 {formatMoney(game.annualSummary.creditPaymentShortfall)}</b></div>}
              {game.annualSummary.interestCapitalized > 0 && <div><span>未付利息併入負債</span><b className="negative">+{formatMoney(game.annualSummary.interestCapitalized).replace("NT$ ", "")}</b></div>}
              {game.annualSummary.liquidityDebtAdded > 0 && <div><span>生活資金缺口轉為短期負債</span><b className="negative">+{formatMoney(game.annualSummary.liquidityDebtAdded).replace("NT$ ", "")}</b></div>}
              {game.specialTrait === "記帳強迫症" && game.annualSummary.bookkeepingDebtStress > 0 && <div><span>記帳強迫症 · 年末仍持有負債</span><b className="negative">壓力 +2</b></div>}
              {game.specialTrait === "記帳強迫症" && game.annualSummary.bookkeepingCreditBonus > 0 && <div><span>記帳強迫症 · 全年未新增借款</span><b className="positive">信用 +1</b></div>}
              {game.specialTrait === "記帳強迫症" && game.age < FINAL_AGE - 1 && <div><span>下一年度預估生活費 · 已減免 8%</span><b>{formatMoney(game.annualSummary.nextLivingCost)}</b></div>}
              <div><span>年末淨資產</span><b>{formatMoney(game.annualSummary.endNet)}</b></div>
            </div>
            <button className="primary" onClick={startNextYear}>{game.age >= FINAL_AGE - 1 ? "查看人生結局" : `迎接 ${game.age + 1} 歲`} <span>→</span></button>
          </article> : quarterReport ? <article className={`event-card result-card tone-${quarterReport.tone}`}>
            <p className="eyebrow green">{quarterReport.eyebrow}</p><div className="result-symbol">{quarterReport.tone === "good" ? "↗" : quarterReport.tone === "bad" ? "↘" : "→"}</div><h1>{quarterReport.title}</h1><p className="lede">{quarterReport.body}</p><div className="delta-list">{quarterReport.deltas.map((delta) => <span className={deltaClassName(delta)} key={delta}>{delta}</span>)}</div><details className="result-calculation"><summary>查看計算詳情</summary><div className="result-detail">{quarterReport.detail}</div></details><button className="primary" onClick={continueAfterQuarterReport}>{nextPeriodButtonLabel(game)} <span>→</span></button>
          </article> : quarterSurprise?.outcome ? <article className={`event-card result-card surprise-result tone-${quarterSurprise.outcome.tone}`}>
            <p className="eyebrow green">{quarterSurprise.outcome.eyebrow}</p><div className="event-impact-tag result-impact-tag"><span>本次結算標的</span><b>{quarterSurprise.targetCategory} · 「{quarterSurprise.targetName}」</b><AssetQuoteLabel asset={{ category: quarterSurprise.targetCategory, name: quarterSurprise.targetName }} game={game} /></div><div className="result-symbol">{quarterSurprise.outcome.tone === "good" ? "↗" : "↘"}</div><h1>{quarterSurprise.outcome.title}</h1><p className="lede">{quarterSurprise.outcome.body}</p><div className="delta-list">{quarterSurprise.outcome.deltas.map((delta) => <span className={deltaClassName(delta)} key={delta}>{delta}</span>)}</div><details className="result-calculation"><summary>查看計算詳情</summary><div className="result-detail">{quarterSurprise.outcome.detail}</div></details><button className="primary" onClick={continueAfterSurprise}>{nextPeriodButtonLabel(game)} <span>→</span></button>
          </article> : quarterSurprise ? <article className={`event-card surprise-card surprise-${quarterSurprise.direction}`}>
            <p className="eyebrow green">{game.age} 歲 · {periodLabel(game)} · 季末不定時突襲</p>
            <div className="surprise-signal"><span>{quarterSurprise.direction === "bullish" ? "利多" : "利空"}</span><b>影響標的｜{quarterSurprise.targetCategory} · 「{quarterSurprise.targetName}」</b><AssetQuoteLabel asset={{ category: quarterSurprise.targetCategory, name: quarterSurprise.targetName }} game={game} /></div>
            <h1>{quarterSurprise.title}</h1><p className="lede">{quarterSurprise.body}</p>
            <div className="quote">「{quarterSurprise.quote}」<span>— {quarterSurprise.source}</span></div>
            <div className="surprise-rule"><span>成真：順消息方向、波動放大至 1.25～1.75 倍</span><span>反轉：逆消息方向、波動放大至 1.25～1.75 倍</span></div>
            <p className="question">{surprisePosition ? "消息尚未證實，你要怎麼處理這筆持倉？" : "消息尚未證實，你目前沒有這項資產，要怎麼回應？"}</p>
            <div className={`choices surprise-choices ${surprisePosition ? "surprise-position-actions" : "surprise-watch-actions"}`}>
              {surprisePosition ? <>
                <button onClick={() => revealQuarterSurprise("hold")}><span>A</span><b>維持倉位</b><small>不改變持倉，完整承受消息成真或反轉的本月波動。</small><div className="choice-meta"><em className="risk-tag risk-steady">部位 不動</em><em className="money-hint">現金不變</em></div></button>
                <button disabled={!surpriseCanAdd} onClick={() => revealQuarterSurprise("add")}><span>B</span><b>繼續加倉</b><small>{surpriseCanAdd ? `消息揭曉前投入 ${formatMoney(surpriseAddCost)}，新增部位一起承受波動。` : `現金不足，需要 ${formatMoney(surpriseAddCost)}。`}</small><div className="choice-meta"><em className="risk-tag risk-bold">部位 加碼</em><em className="money-hint">可用現金 25%</em></div></button>
                <button onClick={() => revealQuarterSurprise("close")}><span>C</span><b>全部平倉</b><small>按消息揭曉前的市值賣出，避開下跌，也可能錯過上漲。</small><div className="choice-meta"><em className="risk-tag risk-bold">部位 清空</em><em className="money-hint">賣出 100%</em></div></button>
              </> : <>
                <button onClick={() => revealQuarterSurprise("hold")}><span>A</span><b>保持觀望</b><small>不建立部位，只看消息最後成真還是反轉。</small><div className="choice-meta"><em className="risk-tag risk-steady">部位 觀望</em><em className="money-hint">持倉損益 0</em></div></button>
                <button disabled={!surpriseCanAdd} onClick={() => revealQuarterSurprise("add")}><span>B</span><b>建立部位</b><small>{surpriseCanAdd ? `投入 ${formatMoney(surpriseAddCost)}，立即參與本次波動。` : "現金不足，至少需要 NT$ 3,000。"}</small><div className="choice-meta"><em className="risk-tag risk-bold">部位 買進</em><em className="money-hint">可用現金 25%</em></div></button>
                <button onClick={() => revealQuarterSurprise("hold", "research")}><span>C</span><b>先查證消息</b><small>不建立部位，交叉驗證來源並增加投資知識。</small><div className="choice-meta"><em className="risk-tag risk-safe">情報 查證</em><em className="money-hint">投資知識 +4</em></div></button>
              </>}
            </div>
          </article> : careerCheckPending ? <article className="event-card career-loading-card">
            <p className="eyebrow green">{game.age} 歲 · {periodLabel(game)} · 行程確認中</p><h1>先看一眼<br/>這季的工作表。</h1><p className="lede">職業事件與市場新聞正在排入本季行程。</p>
          </article> : currentChairmanTip ? <article className="event-card chairman-tip-card">
            <p className="eyebrow green">{game.age} 歲 · {periodLabel(game)}第 {game.month + 1} 次事件 · 家族飯桌</p>
            <div className="event-impact-tag chairman-tip-target"><span>主要標的</span><b>{currentChairmanTip.target.category} · 「{currentChairmanTip.target.name}」</b><AssetQuoteLabel asset={currentChairmanTip.target} game={game} /></div>
            <div className={`chairman-direction direction-${currentChairmanTip.predictedDirection}`}><span>董事餐桌耳語</span><b>{currentChairmanTip.predictedDirection === "bullish" ? "預估偏多 ↗" : "預估偏空 ↘"}</b><small>可靠度 88% · 仍有 12% 機率反轉</small></div>
            <h1>餐桌上有人，<br/>不小心說太多。</h1>
            <p className="lede">你免費取得一則不需要知識門檻的家族消息。它會取代本季其中一則市場新聞，但不會替你自動下單。</p>
            <div className="quote">「方向已經有人先講了；敢不敢買，還是你自己的事。」<span>— 家族飯桌</span></div>
            <p className="question">預估影響 {currentChairmanTip.durationQuarters} 季；情報會保存在情報庫，仍須自行進入券商 APP 買賣。</p>
            <button className="primary" onClick={acceptChairmanTip}>{marketAccessLocked ? "收下情報，讓行情在背景結算" : "收下情報，進入券商 APP"} <span>→</span></button>
          </article> : currentNewsHidden && currentEvent ? <article className={`event-card hidden-news-card ${marketAccessLocked ? "access-locked" : "work-hidden"}`}>
            <p className="eyebrow green">{game.age} 歲 · {periodLabel(game)}第 {game.month + 1} 次事件 · {marketAccessLocked ? "市場權限鎖定" : "工作占用時間"}</p>
            <div className="hidden-news-symbol">{marketAccessLocked ? "⊘" : "…"}</div>
            <h1>{marketAccessLocked ? <>市場照常波動，<br/>你看不到內容。</> : <>這則新聞發生了，<br/>你沒有時間閱讀。</>}</h1>
            <p className="lede">{marketAccessLocked ? `目前尚餘 ${Math.max(1, game.tradeLockUntilQuarter - currentQuarter)} 季市場權限鎖定。新聞與季末突發消息仍會在背景影響價格，持倉也會照常漲跌。` : "標的、方向與情報全部隱藏；消息仍會在背景影響價格。你仍可進入券商，只能依既有資訊自行交易。"}</p>
            <button className="primary" onClick={processHiddenNews}>{marketAccessLocked ? "讓本次行情在背景結算" : "進入券商，自行判斷"} <span>→</span></button>
          </article> : game.result ? <article className={`event-card result-card tone-${game.result.tone}`}>
            <p className="eyebrow green">{periodLabel(game)} · 第 {game.month + 1} 次事件 · {game.result.eyebrow}</p><div className="result-symbol">{game.result.tone === "good" ? "↗" : game.result.tone === "bad" ? "↘" : "→"}</div><h1>{game.result.title}</h1><p className="lede">{game.result.body}</p><div className="delta-list">{game.result.deltas.map((delta) => <span className={deltaClassName(delta)} key={delta}>{delta}</span>)}</div><details className="result-calculation"><summary>查看計算詳情</summary><div className="result-detail">{game.result.detail}</div></details><button className="primary" onClick={continueAfterResult}>進入本次券商 APP <span>→</span></button>
          </article> : currentEvent && <article className="event-card">
            <p className="eyebrow green">{game.age} 歲 · {periodLabel(game)}第 {game.month + 1} 次事件 · {currentEvent.tag}</p>
            {currentEventTargets.length > 0 && <div className="event-impact-tag event-impact-pair">
              {currentEventTargets.filter((target) => target.role !== "market").map((target) => <div key={`${target.category}:${target.name}`}><span>{signalRoleLabel(target.role)}</span><b>{target.category} · 「{target.name}」</b><AssetQuoteLabel asset={target} game={game} /></div>)}
              {currentEvent?.marketScope && <div className="market-wide-impact"><span>市場擴散</span><b>{marketScopeLabel(currentEvent.marketScope)} · 共影響 {currentEventTargets.filter((target) => marketScopeCategories(currentEvent.marketScope).includes(target.category)).length} 檔</b><small>{currentEventTargets.filter((target) => target.role === "market").map((target) => `「${target.name}」`).join("、")}</small></div>}
            </div>}
            {currentAdvisorSignal && <div className={`advisor-signal-card advisor-${currentAdvisorSignal.claimedDirection}`}><span>{currentAdvisorSignal.claimedDirection === "bullish" ? "老師喊多 ↗" : "老師喊空 ↘"}</span><b>{currentAdvisorSignal.label} · 參考命中率 {Math.round(currentAdvisorSignal.accuracy * 100)}%</b><small>{currentAdvisorSignal.warning}</small></div>}
            <div className={`event-lens-effect lens-${currentEvent.lensIndex}`}><span>{currentEvent.title.split("｜").at(-1)}</span><b>{currentEvent.lensEffect.label}</b><small>{currentEvent.lensEffect.detail}</small></div>
            <h1>{currentEvent.title}</h1><p className="lede">{currentEvent.body}</p><div className="quote">「{currentEvent.quote}」<span>— {currentEvent.source}</span></div><p className="question">主要標的影響較強、可延續 {currentEvent.lensEffect.primaryDurationBonusMonths ? "2～3" : "1～2"} 季；{currentEvent.marketScope ? `${marketScopeLabel(currentEvent.marketScope)}也會受到較弱的 1 季擴散影響。` : "連動標的影響較弱且只維持 1 季。"}判讀後，再到券商 APP 自由買賣。</p><div className="choices">
              {currentChoices.map((choice, index) => {
                const moneyHint = choiceMoneyHint(game, choice);
                return <button key={choice.label} onClick={() => chooseEventOption(choice)}>
                  <span>{String.fromCharCode(65 + index)}</span><b>{choice.label}</b><small>{choice.desc}</small>
                  <div className="choice-meta"><em className={`risk-tag risk-${choice.risk}`}>風險 {riskLabel(choice.risk)}</em>{moneyHint && <em className="money-hint">{moneyHint}</em>}</div>
                </button>;
              })}
            </div></article>}

          <footer><span>本遊戲純屬娛樂，不構成任何投資建議。</span><b>市場有風險，韭菜有新鮮度。</b></footer>
        </section>
      </div>
      {brokerOpen && game.gauges.health > 0 && <div className="broker-overlay" role="presentation">
        <section className="broker-app" role="dialog" aria-modal="true" aria-labelledby="broker-title">
          <header className="broker-header">
            <div><p className="eyebrow green">{game.age} 歲 · {periodLabel(game)}第 {game.month + 1} 次事件 · 自主交易時間</p><h2 id="broker-title">韭菜證券</h2><span>{brokerNewsHidden ? "你因工作錯過本次新聞；標的與方向不公開，仍可依既有資訊交易。" : currentChairmanTip ? "家族飯桌情報已入庫；消息不會自動替你買進，買賣仍由你決定。" : <>{currentEvent?.marketScope ? `本次消息擴散至${marketScopeLabel(currentEvent.marketScope)}；` : "主要與連動情報分開判讀，"}買賣由你決定。</>}</span></div>
            <button className="broker-finish" onClick={closeBrokerMonth}>{game.month < EVENTS_PER_SEASON - 1 ? `結束交易，進入本季第 ${game.month + 2} 次事件` : "結束交易並結算本季"} <span>→</span></button>
          </header>
          <div className="broker-metrics">
            <div><span>可用現金</span><b>{formatMoney(game.cash)}</b></div>
            <div><span>投資資產</span><b>{formatMoney(totalAssets)}</b></div>
            <div><span>投資知識</span><b>{game.gauges.knowledge}</b></div>
            <div><span>退休目標</span><b>{formatMoney(EARLY_RETIREMENT_TARGET)}</b></div>
          </div>
          <div className="broker-intelligence">
            <span>本次情報</span>
            <div className="broker-intelligence-targets">{brokerNewsHidden ? <p className="broker-hidden-intelligence">本次新聞內容已錯過，不顯示標的、方向或連動範圍。價格仍會在本月結算時反映消息。</p> : currentEventIntel.length ? <>{currentFocusedIntel.map((item) => <article className={`broker-intelligence-item broker-intelligence-${item.role}`} key={`${item.target.category}:${item.target.name}`}>
              <div><em>{signalRoleLabel(item.role)}</em><b>{item.target.category} · 「{item.target.name}」</b><AssetQuoteLabel asset={item.target} game={game} />{item.signals.length > 0 && <i className={`broker-intel-summary signal-${item.summary.tone}`}>{item.summary.label} · {item.summary.detail}</i>}</div>
              <p>{item.record ? `${item.record.clue} ${item.record.durationLabel}${item.record.opportunityLabel ? `；${item.record.opportunityLabel}` : ""}` : "尚未取得本次判讀。"}</p>
            </article>)}{currentMarketIntel.length > 0 && <article className="broker-intelligence-item broker-intelligence-market">
              <div><em>市場擴散</em><b>{marketScopeLabel(currentEvent?.marketScope)} · {currentMarketIntel.length} 檔額外連動</b>{currentMarketSummary && <i className={`broker-intel-summary signal-${currentMarketSummary.tone}`}>{currentMarketSummary.label}</i>}</div>
              <p>{currentMarketIntel.map((item) => `「${item.target.name}」`).join("、")}；各標的價格與情報徽章可在下方查看。</p>
            </article>}</> : <p>沒有標的焦點；可以回到情報庫查看過去線索。</p>}</div>
          </div>
          {game.result && <details className={`broker-result-summary tone-${game.result.tone}`} open>
            <summary><span>{game.result.eyebrow}</span><b>{game.result.title}</b><i>展開／收合</i></summary>
            <p>{game.result.body}</p><div className="delta-list">{game.result.deltas.map((delta) => <span className={deltaClassName(delta)} key={delta}>{delta}</span>)}</div>
            {game.result.eyebrow !== "情報查證" && <small>{game.result.detail}</small>}
          </details>}
          {brokerNotice && <div className="broker-notice"><span>成交回報</span><p>{brokerNotice}</p><button onClick={() => setBrokerNotice(null)}>關閉</button></div>}
          <nav className="broker-tabs" aria-label="投資商品分類">
            {brokerCategoryOrder.map((category) => <button className={brokerCategory === category ? "active" : ""} onClick={() => { setBrokerCategory(category); setBrokerNotice(null); }} key={category}>{category}</button>)}
          </nav>
          <div className="broker-list">
            {brokerCatalog.filter((asset) => asset.category === brokerCategory).map((asset) => {
              const positions = game.assets.filter((position) => position.category === asset.category && position.name === asset.name);
              const heldValue = positions.reduce((sum, position) => sum + position.value, 0);
              const heldCost = positions.reduce((sum, position) => sum + position.cost, 0);
              const profit = heldValue - heldCost;
              const activeAssetSignals = (game.activeSignals ?? []).filter((signal) => !signal.hidden && signal.targetCategory === asset.category && signal.targetName === asset.name);
              const assetSignalSummary = summarizeVisibleSignals(activeAssetSignals, game.intelRecords ?? []);
              return <article className="broker-asset-card" key={`${asset.category}-${asset.name}`}>
                <div className="broker-asset-info">
                  <h3>「{asset.name}」</h3><AssetQuoteLabel asset={asset} game={game} className="broker-quote" label="即時報價" /><AssetMiniTrend asset={asset} game={game} />
                  {positions.length ? <p>持有 {formatMoney(heldValue)} · <em className={profit >= 0 ? "positive" : "negative"}>{profit >= 0 ? "+" : "−"}{formatMoney(Math.abs(profit)).replace("NT$ ", "")}</em></p> : <p>目前未持有</p>}
                  {activeAssetSignals.length > 0 && <small className={`broker-signal-badge signal-${assetSignalSummary.tone}`}><b>{assetSignalSummary.label}</b> · {assetSignalSummary.detail}</small>}
                </div>
                <div className="broker-actions">
                  <div><span>買進</span><button disabled={game.cash < 3000} onClick={() => brokerBuy(asset, .25)}>25%</button><button disabled={game.cash < 3000} onClick={() => brokerBuy(asset, .5)}>50%</button><button disabled={game.cash < 3000} onClick={() => brokerBuy(asset, 1)}>MAX</button></div>
                  {positions[0] && <div><span>賣出</span>{game.specialTrait !== "紙手體質" && <><button className="sell" onClick={() => brokerSell(positions[0], .25)}>25%</button><button className="sell" onClick={() => brokerSell(positions[0], .5)}>50%</button></>}<button className="sell" onClick={() => brokerSell(positions[0], 1)}>ALL</button></div>}
                </div>
              </article>;
            })}
          </div>
          <footer className="broker-footer"><span>畫面為模擬單位報價；交易仍依投入金額計算。買進手續費 0.1425%，賣出依商品別計入交易成本。</span><b>{game.specialTrait === "紙手體質" ? "紙手體質：賣出時只能全部清倉。" : "你可以在本季內反覆調整，按下結算才會推進時間。"}</b></footer>
        </section>
      </div>}
      {screenshotPreview && <div className="ending-preview-overlay" role="presentation" onMouseDown={() => setScreenshotPreview(null)}>
        <section className="ending-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="ending-preview-title" onMouseDown={(event) => event.stopPropagation()}>
          <header><div><span>結算圖片已完成</span><h2 id="ending-preview-title">預覽後再下載</h2></div><button type="button" aria-label="關閉結算圖片預覽" onClick={() => setScreenshotPreview(null)}>×</button></header>
          <div className="ending-preview-image">
            {/* Blob 預覽不適用 Next Image 的最佳化流程。 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={screenshotPreview.url} alt={`${game.name}的韭菜人生結算圖片預覽`} />
          </div>
          <p>固定為 1080 × 1920，不受結算頁長度影響；若手機沒有直接下載，也可以長按預覽圖片儲存。</p>
          <div className="ending-preview-actions">
            <button className="text-button" type="button" onClick={() => setScreenshotPreview(null)}>返回結算</button>
            <a className="primary" href={screenshotPreview.url} download={screenshotPreview.filename} onClick={() => setScreenshotState("saved")}>下載 PNG <span>↓</span></a>
          </div>
        </section>
      </div>}
      {historyOpen && <div className="decision-overlay history-overlay" role="presentation" onMouseDown={() => setHistoryOpen(false)}>
        <section className="decision-dialog history-dialog" role="dialog" aria-modal="true" aria-labelledby="history-title" onMouseDown={(event) => event.stopPropagation()}>
          <p className="eyebrow green">最近八次人生紀錄</p>
          <h2 id="history-title">你的韭菜足跡</h2>
          {game.history.length ? <ol className="history-list">{[...game.history].reverse().map((item, index) => <li key={`${item}-${index}`}><span>{game.history.length - index}</span><p>{item}</p></li>)}</ol> : <p className="history-empty">人生才剛開盤，目前還沒有紀錄。</p>}
          <button className="primary" onClick={() => setHistoryOpen(false)}>回到市場 <span>→</span></button>
        </section>
      </div>}
      {resetConfirmationOpen && <div className="decision-overlay" role="presentation" onMouseDown={() => setResetConfirmationOpen(false)}>
        <section className="decision-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-confirmation-title" onMouseDown={(event) => event.stopPropagation()}>
          <p className="eyebrow green">人生重新開盤</p>
          <h2 id="reset-confirmation-title">確定要放棄進度<br/>重開人生嗎？</h2>
          <p>目前角色、資產、情報與事件進度都會清空，回到角色命名畫面。這個動作不會改變「下次略過前言」的裝置設定。</p>
          <div className="decision-actions">
            <button className="primary" onClick={() => setResetConfirmationOpen(false)}>繼續這段人生 <span>←</span></button>
            <button className="danger-button" onClick={performResetGame}>確定重開 <span>↻</span></button>
          </div>
        </section>
      </div>}
      {pendingReduction && game.gauges.health > 0 && <div className="decision-overlay" role="presentation" onMouseDown={() => setPendingReduction(null)}>
        <section className="decision-dialog" role="dialog" aria-modal="true" aria-labelledby="reduction-title" onMouseDown={(event) => event.stopPropagation()}>
          <p className="eyebrow green">部位調整</p>
          <h2 id="reduction-title">要賣多少<br/>{pendingReduction.asset?.name}？</h2>
          <p>減碼會依目前市值實現對應比例的損益；全部清倉後，這筆資產會從持倉清單移除。</p>
          <div className="decision-actions">
            <button className="primary" onClick={() => confirmReduction(.5)}>減碼 50% <span>½</span></button>
            <button className="danger-button" onClick={() => confirmReduction(1)}>全部清倉 <span>×</span></button>
          </div>
          <button className="text-button cancel-reduction" onClick={() => setPendingReduction(null)}>取消，維持原部位</button>
        </section>
      </div>}
      {debtAction && game.gauges.health > 0 && <div className="decision-overlay" role="presentation" onMouseDown={() => { setDebtAction(null); setDebtNotice(null); }}>
        <section className={`decision-dialog debt-dialog ${debtNotice ? `debt-notice-${debtNotice.tone}` : ""}`} role="dialog" aria-modal="true" aria-labelledby="debt-action-title" onMouseDown={(event) => event.stopPropagation()}>
          <p className="eyebrow green">{debtActionEyebrow}</p>
          {debtNotice ? <>
            <h2 id="debt-action-title">{debtNotice.title}</h2><p>{debtNotice.body}</p>
            <button className="primary" onClick={() => { setDebtAction(null); setDebtNotice(null); }}>知道了 <span>→</span></button>
          </> : debtAction === "borrow" ? <>
            <h2 id="debt-action-title">這次要向家裡<br/>開口借多少？</h2>
            <p>每年只有一次申請機會。家庭關係越高越容易通過，金額越大則會扣除更多核准權重。</p>
            <div className="debt-choice-list">{(["small", "medium", "large"] as BorrowTier[]).map((tier) => <button key={tier} onClick={() => requestFamilyLoan(tier)}><span>{tier === "small" ? "小額救急" : tier === "medium" ? "中額週轉" : "大額支援"}</span><b>{formatMoney(familyBorrowAmount(game, tier))}</b><small>估計核准率 {Math.round(familyBorrowChance(game, tier) * 100)}%</small></button>)}</div>
            <button className="text-button cancel-reduction" onClick={() => setDebtAction(null)}>取消，不開口</button>
          </> : debtAction === "repay" ? <>
            <h2 id="debt-action-title">要還多少<br/>家人借款？</h2>
            <p>目前欠家人 {formatMoney(currentFamilyDebt)}。還款不會產生利息折抵，但能改善家庭關係並降低壓力。</p>
            <div className="decision-actions"><button className="primary" onClick={() => repayFamilyLoan(.5)}>償還一半 <span>½</span></button><button className="danger-button" onClick={() => repayFamilyLoan(1)}>{game.cash >= currentFamilyDebt ? "全部還清" : "用盡現金還款"} <span>✓</span></button></div>
            <button className="text-button cancel-reduction" onClick={() => setDebtAction(null)}>稍後再還</button>
          </> : debtAction === "creditBorrow" ? <>
            <h2 id="debt-action-title">這次要向銀行<br/>申請多少信貸？</h2>
            <p>固定年利率 6%，分 60 期本息攤還。你的核定上限為 {formatMoney(currentCreditLimit)}，目前尚可申請 {formatMoney(creditCapacity)}；收入與信用會影響通過率。</p>
            <div className="debt-choice-list">{creditLoanOptions.map((amount) => <button disabled={amount > creditCapacity} key={amount} onClick={() => requestCreditLoan(amount)}><span>{amount === 100000 ? "小額信貸" : amount === 300000 ? "中額信貸" : amount === 500000 ? "高額信貸" : amount === CREDIT_LOAN_MAX ? "百萬信貸" : "借滿可用額度"}</span><b>{formatMoney(amount)}</b><small>{amount > creditCapacity ? "超過目前可用額度" : `估計核准率 ${Math.round(creditLoanChance(game, amount) * 100)}% · 月付約 ${formatMoney(monthlyCreditPayment(amount))}`}</small></button>)}</div>
            <button className="text-button cancel-reduction" onClick={() => setDebtAction(null)}>取消，不申請</button>
          </> : <>
            <h2 id="debt-action-title">要還多少<br/>信貸本金？</h2>
            <p>目前信貸與其他有息負債為 {formatMoney(generalInterestDebt)}。提前降低本金後，後續每期利息也會跟著下降。</p>
            <div className="decision-actions"><button className="primary" onClick={() => repayInterestDebt(.5)}>償還一半 <span>½</span></button><button className="danger-button" onClick={() => repayInterestDebt(1)}>{game.cash >= generalInterestDebt ? "全部還清" : "用盡現金還款"} <span>✓</span></button></div>
            <button className="text-button cancel-reduction" onClick={() => setDebtAction(null)}>稍後再還</button>
          </>}
        </section>
      </div>}
      {incomeChoiceRequired && !incomeNotice && <div className="decision-overlay income-choice-overlay" role="presentation">
        <section className="decision-dialog income-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="income-choice-title">
          <p className="eyebrow green">第 {game.year} 年 · 專業韭菜生存計畫</p>
          <h2 id="income-choice-title">今年要靠什麼活？</h2>
          <p>本年固定生活費為 {formatMoney(annualLivingCost(game.year, game.specialTrait))}{game.specialTrait === "記帳強迫症" ? "（記帳強迫症已減少 8%）" : ""}，收入會在年度結算時入帳。每年必須選擇一次，選定後不能反悔。</p>
          <div className="income-finance-grid" aria-label="目前財務狀況">
            <div><i aria-hidden="true">＄</i><span>現金</span><b>{formatMoney(game.cash)}</b></div>
            <div><i aria-hidden="true">↗</i><span>投資資產</span><b>{formatMoney(totalAssets)}</b></div>
            <div><i aria-hidden="true">−</i><span>負債</span><b>{formatMoney(game.debt)}</b></div>
            <div><i aria-hidden="true">＋</i><span>本年收入</span><b>{formatMoney(game.income)}</b></div>
          </div>
          <section className="income-ability-section" aria-label="目前角色特長">
            <div className="income-ability-heading"><b>角色特長</b><small>顏色與長條表示目前狀態</small></div>
            <div className="income-ability-grid">
              {gaugeRows.map(([, key]) => {
                const meta = incomeAbilityMeta[key];
                const state = incomeAbilityState(key, game.gauges[key]);
                return <div className={`income-ability-card ability-${state.tone}`} key={key} title={gaugeHint(key)}>
                  <i aria-hidden="true">{meta.icon}</i>
                  <span>{meta.label}</span>
                  <b>{state.label}</b>
                  <small>{game.gauges[key]}／100</small>
                  <em><u style={{ width: `${clamp(game.gauges[key])}%` }} /></em>
                </div>;
              })}
            </div>
          </section>
          <div className="income-path-list">
            <button onClick={() => chooseIncomePath("kol")}><span>A</span><b>投資KOL</b><small>{game.year === 1 ? `職業更新為投資KOL · 冷啟動期 · 收入 0～${game.specialTrait === "工作狂" ? "10.8" : "10"} 萬 · 小爆紅機率約 12%${game.specialTrait === "工作狂" ? " · 健康額外 −1、壓力 +2" : ""}` : `職業更新為投資KOL · 收入上限 ${formatMoney(kolAnnualIncomeCap(game.specialTrait))} · 目前好結果機率約 ${Math.round(kolSuccessChance(game) * 100)}% · 連動知識、去年判讀戰績、聲量與壓力${game.specialTrait === "工作狂" ? " · 健康額外 −1、壓力 +2" : ""}`}</small></button>
            <button onClick={() => chooseIncomePath("family")}><span>B</span><b>無業</b><small>職業更新為無業 · 接受家裡資助；目前核准率約 {Math.round(familySupportChance(game) * 100)}% · 若遭拒會改接18萬元臨時零工、家庭關係 −5</small></button>
            <button onClick={() => chooseIncomePath("parttime")}><span>C</span><b>{game.workPromoted ? "麥當當值班主管" : "麥當當員工"}</b><small>職業更新為{game.workPromoted ? "麥當當值班主管" : "麥當當員工"} · {game.workTenureProtected ? `永久年資已保留 · 目前 ${game.parttimeStreak} 年` : `目前工作年資 ${game.parttimeStreak} 年 · 滿3年永久保留`} · 已連續工作 ${game.workConsecutiveYears ?? 0} 年 · 本次年薪 {formatMoney(annualCareerIncome(rankedWorkIncome(game.parttimeStreak + 1, game.workPromoted), game.specialTrait))} · 本次健康 −{workHealthCost((game.workConsecutiveYears ?? 0) + 1) + (game.workPromoted ? 1 : 0) + (game.specialTrait === "工作狂" ? 1 : 0)}、壓力 +{8 + (game.workPromoted ? 3 : 0) + (game.specialTrait === "工作狂" ? 2 : 0)}{game.workPromoted ? " · 每季固定少看1則新聞" : ""}</small></button>
          </div>
        </section>
      </div>}
      {incomeNotice && game.gauges.health > 0 && <div className="decision-overlay income-notice-overlay" role="presentation">
        <section className={`decision-dialog career-dialog career-notice-${incomeNotice.tone}`} role="dialog" aria-modal="true" aria-labelledby="income-result-title">
          <p className="eyebrow green">本年度收入來源 · {game.incomeSource}</p>
          <h2 id="income-result-title">{incomeNotice.title}</h2>
          <p>{incomeNotice.body}</p>
          <div className="delta-list">{incomeNotice.deltas.map((delta) => <span className={deltaClassName(delta)} key={delta}>{delta}</span>)}</div>
          <button className="primary" onClick={closeIncomeNotice}>開始今年的市場人生 <span>→</span></button>
        </section>
      </div>}
      {careerEvent && game.gauges.health > 0 && <div className="decision-overlay career-event-overlay" role="presentation">
        <section className={`decision-dialog career-event-dialog ${careerNotice ? `career-notice-${careerNotice.tone}` : ""}`} role="dialog" aria-modal="true" aria-labelledby="career-event-title">
          <p className="eyebrow green">{careerEvent.eyebrow} · {periodLabel(game)}</p>
          {careerNotice ? <>
            <h2 id="career-event-title">{careerNotice.title}</h2>
            <p>{careerNotice.body}</p>
            <div className="delta-list">{careerNotice.deltas.map((delta) => <span className={deltaClassName(delta)} key={delta}>{delta}</span>)}</div>
            <button className="primary" onClick={closeCareerEvent}>繼續本季 <span>→</span></button>
          </> : <>
            <h2 id="career-event-title">{careerEvent.title}</h2>
            <p>{careerEvent.body}</p>
            <div className="family-event-quote">「{careerEvent.quote}」</div>
            <div className="career-event-choice-list">
              {careerEventOptionsFor(game, careerEvent).map((option) => <button key={option.choice} onClick={() => resolveCareerEvent(option.choice)}><span>{option.choice}</span><b>{option.label}</b><small>{option.desc}</small></button>)}
            </div>
          </>}
        </section>
      </div>}
      {familyEvent && game.gauges.health > 0 && <div className="decision-overlay family-event-overlay" role="presentation">
        <section className="decision-dialog family-event-dialog" role="dialog" aria-modal="true" aria-labelledby="family-event-title">
          <p className="eyebrow green">不定時家庭事件</p>
          <h2 id="family-event-title">{familyEvent.title}</h2>
          <p>{familyEvent.body}</p>
          <div className="family-event-quote">「{familyEvent.quote}」</div>
          <div className="family-choice-list">
            <button onClick={() => resolveFamilyEvent("time")}><b>花時間陪伴處理</b><small>支出少量現金、家庭關係 +10、壓力 −3、健康 +2</small></button>
            <button onClick={() => resolveFamilyEvent("money")}><b>出錢支援家裡</b><small>支出較多現金、家庭關係 +7、壓力 +2、信用 +1</small></button>
            <button className="family-decline" onClick={() => resolveFamilyEvent("decline")}><b>工作優先，先婉拒</b><small>保住現金、家庭關係 −8、壓力 +4</small></button>
          </div>
        </section>
      </div>}
      {illnessEvent && game.gauges.health > 0 && <div className="decision-overlay illness-event-overlay" role="presentation">
        <section className={`decision-dialog illness-event-dialog illness-${illnessEvent.severity} ${illnessNotice ? `illness-notice-${illnessNotice.tone}` : ""}`} role="dialog" aria-modal="true" aria-labelledby="illness-event-title">
          <p className="eyebrow green">不定時健康事件 · {illnessSeverityLabel(illnessEvent.severity)}</p>
          {illnessNotice ? <>
            <h2 id="illness-event-title">{illnessNotice.title}</h2>
            <p>{illnessNotice.body}</p>
            <div className="delta-list">{illnessNotice.deltas.map((delta) => <span className={deltaClassName(delta)} key={delta}>{delta}</span>)}</div>
            <button className="primary" onClick={continueAfterIllness}>{nextPeriodButtonLabel(game)} <span>→</span></button>
          </> : <>
            <div className="illness-status"><span>目前健康</span><b>{game.gauges.health}</b><span>預估完整處理成本</span><b>{formatMoney(illnessBaseCost(game, illnessEvent))}</b></div>
            <h2 id="illness-event-title">{illnessEvent.title}</h2>
            <p>{illnessEvent.body}</p>
            <div className="family-event-quote">「{illnessEvent.quote}」</div>
            <div className="family-choice-list illness-choice-list">
              <button className="illness-push" onClick={() => resolveIllness("push")}><b>硬撐，照常工作看盤</b><small>只做基本處理、花費最低；健康與壓力承受最大代價。</small></button>
              <button onClick={() => resolveIllness("treat")}><b>就醫治療並安排休養</b><small>支付醫療與請假成本；現金不足部分會轉為有息醫療負債。</small></button>
              <button onClick={() => resolveIllness("family")}><b>請家人協助照顧</b><small>由家庭關係加權判定支援；成功可分擔七成費用，結果會影響家庭關係。</small></button>
            </div>
          </>}
        </section>
      </div>}
    </main>
  );
}
