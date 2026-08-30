"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createAnonymousRunId, postAnonymousAnalytics, type AnonymousEventType } from "./analytics";
import { buildLifeEventDeck, events as lifeEvents, type Choice, type EventKind, type GameEvent, type IntelChoiceEffects } from "./event-catalog";

type GaugeKey = "health" | "stress" | "family" | "knowledge" | "credit";
type GaugeStats = Record<GaugeKey, number>;
type Position = {
  id: string;
  category: string;
  name: string;
  cost: number;
  value: number;
  unit?: number;
  loan?: number;
  mortgageMonthsRemaining?: number;
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
type MarketSignal = {
  id: string;
  groupId: string;
  eventId: string;
  topic: string;
  role: "primary" | "linked";
  targetCategory: string;
  targetName: string;
  direction: SurpriseDirection;
  strength: number;
  remainingMonths: number;
  totalMonths: number;
  moveMultiplier?: number;
  opportunity?: "breakout" | "knowledge" | "foresight";
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
  role: "primary" | "linked";
  targetCategory: string;
  targetName: string;
  action: IntelAction;
  actionLabel: string;
  clue: string;
  durationLabel: string;
  readDirection: SurpriseDirection | null;
  confidenceLabel?: string;
  opportunityLabel?: string;
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
};

type BorrowTier = "small" | "medium" | "large";
type DebtAction = "borrow" | "repay" | "creditBorrow" | "interest";
type DebtNotice = { tone: "good" | "bad"; title: string; body: string };
type IncomePath = "kol" | "family" | "parttime";
type IncomeNotice = { tone: "good" | "flat" | "bad"; title: string; body: string; deltas: string[] };
type FamilyEvent = { id: string; title: string; body: string; quote: string };
type FamilyEventChoice = "time" | "money" | "decline";
type IllnessSeverity = "mild" | "moderate" | "severe";
type IllnessEvent = { id: string; severity: IllnessSeverity; title: string; body: string; quote: string; costFactor: number };
type IllnessChoice = "push" | "treat" | "family";
type IllnessNotice = { tone: "good" | "flat" | "bad"; title: string; body: string; deltas: string[] };
type PositionTradeNotice = { title: string; body: string; deltas: string[] };
type PropertyReview = { event: GameEvent; targetId: string };
type BrokerAsset = { category: string; name: string };
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
  specialTrait: string | null;
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
  income: number;
  gauges: GaugeStats;
  assets: Position[];
  result: Resolution | null;
  annualStartNet: number;
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
  propertyReviewNextMonth: number | null;
  propertyReviewSeen: string[];
};

const seasons = ["春", "夏", "秋", "冬"];
const EVENTS_PER_SEASON = 2;
const EVENTS_PER_YEAR = seasons.length * EVENTS_PER_SEASON;
const calendarMonthIndex = (game: Pick<Game, "season" | "month">) => game.season * 3 + Math.min(2, game.month * 2);
const absoluteMonthIndex = (game: Pick<Game, "year" | "season" | "month">) => (game.year - 1) * 12 + calendarMonthIndex(game);
const periodLabel = (game: Pick<Game, "season" | "month">) => `${seasons[game.season]}季`;
const nextPeriodButtonLabel = (game: Pick<Game, "season" | "month">) => game.season >= 3
  ? "查看年度結算"
  : `進入${seasons[game.season + 1]}季`;
const STARTING_AGE = 22;
const FINAL_AGE = 31;
const LIFE_YEAR_COUNT = FINAL_AGE - STARTING_AGE;
const GAME_VERSION = "v1.0.1";
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
  : <span className="foreword-character" style={{ animationDelay: `${(offset + index) * 34}ms` }} aria-hidden="true" key={`${offset}-${index}`}>{character === " " ? "\u00a0" : character}</span>);
const money = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 });
const formatMoney = (value: number) => `${value < 0 ? "−" : ""}NT$ ${money.format(Math.abs(Math.round(value)))}`;
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const isDailyCompoundedAsset = (category: string) => ["台股", "ETF", "美股"].includes(category);
const hasTaiwanDailyLimit = (category: string) => ["台股", "ETF"].includes(category);
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
      // 台股與 ETF 採 ±10% 漲跌幅限制；美股不套用此限制，但單日跌幅仍不能低於 -100%。
      const dailyRate = hasTaiwanDailyLimit(category)
        ? clamp(rawDailyRate, -.1, .1)
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
    : "美股不套用 ±10% 漲跌幅限制";
  return `${movement.tradingDays} 個營業日逐日複利，${dailyRange}；${limit}`;
}
const QUARTER_SURPRISE_CHANCE = .25;
const FINANCIAL_FAILURE_NET_WORTH = -500000;
const EARLY_RETIREMENT_TARGET = 30000000;
const RENTAL_PROPERTY_NAME = "蛋黃收租小金庫";
const RENTAL_PROPERTY_PRICE = 10000000;
const HOME_PROPERTY_PRICE = 18000000;
const FIRST_PROPERTY_DOWN_PAYMENT_RATE = .2;
const ADDITIONAL_PROPERTY_DOWN_PAYMENT_RATE = .4;
const MAX_MORTGAGE_AMOUNT = 10000000;
const MORTGAGE_INTEREST_RATE = .042;
const MORTGAGE_TERM_YEARS = 40;
const MORTGAGE_TERM_MONTHS = MORTGAGE_TERM_YEARS * 12;
const GENERAL_INTEREST_RATE = .06;
const CREDIT_LOAN_MAX = 1000000;
const CREDIT_LOAN_TERM_MONTHS = 60;
const RENTAL_YIELD = .018;
const PROPERTY_HOLDING_COST_RATE = .004;
const OWNER_HOUSING_SAVINGS = 96000;
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
const eventTargetsForEvent = (event: GameEvent) => {
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
  return [primary, secondary].filter((target): target is BrokerAsset => Boolean(target));
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
  const segments = points.slice(1).map((point, index) => {
    const previous = points[index];
    const dx = point.x - previous.x;
    const dy = point.y - previous.y;
    return {
      ...point,
      previous,
      length: Math.hypot(dx, dy * .42),
      angle: Math.atan2(dy * .42, dx) * 180 / Math.PI,
    };
  });
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
        {[12, 31, 50, 69, 88].map((top) => <i className="wealth-chart-gridline" style={{ top: `${top}%` }} key={top} />)}
        {zeroY >= 12 && zeroY <= 88 && <i className="wealth-chart-zero" style={{ top: `${zeroY}%` }}><span>0</span></i>}
        {segments.map((segment, index) => <i className={`wealth-chart-segment ${segment.netWorth >= segment.previous.netWorth ? "wealth-up" : "wealth-down"}`} style={{ left: `${segment.previous.x}%`, top: `${segment.previous.y}%`, width: `${segment.length}%`, transform: `rotate(${segment.angle}deg)` }} key={`wealth-segment-${index}`} />)}
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

async function endingCardPng(element: HTMLElement) {
  await document.fonts?.ready;
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-screenshot-control]").forEach((control) => control.remove());
  clone.style.animation = "none";
  clone.style.margin = "0";
  clone.style.width = `${Math.ceil(element.getBoundingClientRect().width)}px`;
  clone.style.maxWidth = "none";

  const width = Math.ceil(element.scrollWidth);
  const height = Math.ceil(element.scrollHeight);
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.minHeight = `${height}px`;
  wrapper.style.padding = "24px";
  wrapper.style.boxSizing = "border-box";
  wrapper.style.background = "#080b14";

  const rootStyle = getComputedStyle(document.documentElement);
  ["--ink", "--paper", "--cream", "--green", "--lime", "--line", "--red", "--blue", "--gold", "--muted"].forEach((property) => {
    wrapper.style.setProperty(property, rootStyle.getPropertyValue(property));
  });
  const style = document.createElement("style");
  style.textContent = Array.from(document.styleSheets).map((sheet) => {
    try { return Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n"); }
    catch { return ""; }
  }).join("\n");
  wrapper.appendChild(style);
  wrapper.appendChild(clone);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width + 48}" height="${height + 48}" viewBox="0 0 ${width + 48} ${height + 48}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Screenshot render failed"));
      image.src = svgUrl;
    });
    const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((width + 48) * scale);
    canvas.height = Math.round((height + 48) * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.scale(scale, scale);
    context.fillStyle = "#080b14";
    context.fillRect(0, 0, width + 48, height + 48);
    context.drawImage(image, 0, 0, width + 48, height + 48);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png"));
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
const addKnowledge = (gauges: GaugeStats, baseGain: number) => {
  const remainingFactor = Math.pow(Math.max(0, 100 - gauges.knowledge) / 100, 1.35);
  const scaledGain = baseGain > 0 && gauges.knowledge < 95 ? Math.max(1, Math.round(baseGain * remainingFactor)) : 0;
  const gain = Math.max(0, Math.min(95 - gauges.knowledge, scaledGain));
  gauges.knowledge = clamp(gauges.knowledge + gain);
  return gain;
};
const propertyUnitPrice = (assetName?: string) => assetName === RENTAL_PROPERTY_NAME ? RENTAL_PROPERTY_PRICE : HOME_PROPERTY_PRICE;
const propertyDownPaymentRate = (assets: Position[]) => assets.some((asset) => asset.category === "房地產") ? ADDITIONAL_PROPERTY_DOWN_PAYMENT_RATE : FIRST_PROPERTY_DOWN_PAYMENT_RATE;
const maximumPropertyMortgage = (game: Pick<Game, "assets">, assetName?: string) => Math.min(
  MAX_MORTGAGE_AMOUNT,
  Math.round(propertyUnitPrice(assetName) * (1 - propertyDownPaymentRate(game.assets))),
);
const propertyDownPayment = (game: Pick<Game, "assets">, assetName?: string) => propertyUnitPrice(assetName) - maximumPropertyMortgage(game, assetName);
const LIFE_EVENT_SLOT_COUNT = LIFE_YEAR_COUNT * EVENTS_PER_YEAR;
const freshEventOrder = () => Array.from({ length: LIFE_EVENT_SLOT_COUNT }, (_, index) => index);
const propertyChoicesOf = (event: GameEvent) => event.choices.filter((choice) => choice.action === "buy" && choice.asset?.category === "房地產");
const canShowPropertyEvent = (game: Pick<Game, "cash" | "assets">, event: GameEvent) => {
  const propertyChoices = propertyChoicesOf(event);
  if (!propertyChoices.length) return true;
  // 持有房產後，房市消息改由每六個月的額外房務事件處理，不占用每月市場題目。
  if (game.assets.some((asset) => asset.category === "房地產")) return false;
  return propertyChoices.some((choice) => {
    const price = propertyUnitPrice(choice.asset?.name);
    return game.cash + maximumPropertyMortgage(game, choice.asset?.name) >= price;
  });
};
type EventSelection = { event: GameEvent | null; order: number[]; needsCommit: boolean };
const selectAffordableCurrentEvent = (game: Game, deck: GameEvent[]): EventSelection => {
  const orderIsValid = game.eventOrder?.length === deck.length;
  const order = orderIsValid ? game.eventOrder : freshEventOrder();
  const slot = (game.year - 1) * EVENTS_PER_YEAR + game.season * EVENTS_PER_SEASON + game.month;
  const current = deck[order[slot]] ?? null;
  return { event: current, order, needsCommit: !orderIsValid };
};
const mortgageDebtOf = (assets: Position[]) => assets
  .filter((asset) => asset.category === "房地產")
  .reduce((sum, asset) => sum + (asset.loan ?? 0), 0);
const monthlyMortgagePayment = (principal: number, monthsRemaining = MORTGAGE_TERM_MONTHS) => {
  if (principal <= 0) return 0;
  const monthlyRate = MORTGAGE_INTEREST_RATE / 12;
  const months = Math.max(1, monthsRemaining);
  const growth = Math.pow(1 + monthlyRate, months);
  return principal * monthlyRate * growth / Math.max(growth - 1, Number.EPSILON);
};
type MortgageServiceResult = {
  assets: Position[];
  cash: number;
  principalPaid: number;
  interestPaid: number;
  interestCapitalized: number;
  paymentDue: number;
  paymentPaid: number;
};
const serviceAnnualMortgages = (assets: Position[], availableCash: number): MortgageServiceResult => {
  let cash = Math.max(0, availableCash);
  let principalPaid = 0;
  let interestPaid = 0;
  let interestCapitalized = 0;
  let paymentDue = 0;
  let paymentPaid = 0;
  const monthlyRate = MORTGAGE_INTEREST_RATE / 12;

  const servicedAssets = assets.map((asset) => {
    if (asset.category !== "房地產" || (asset.loan ?? 0) <= 0) return asset;
    let balance = asset.loan ?? 0;
    let monthsRemaining = Math.max(1, asset.mortgageMonthsRemaining ?? MORTGAGE_TERM_MONTHS);
    const scheduledMonthlyPayment = monthlyMortgagePayment(balance, monthsRemaining);

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

    return { ...asset, loan: balance, mortgageMonthsRemaining: balance > 0 ? monthsRemaining : 0 };
  });

  return { assets: servicedAssets, cash, principalPaid, interestPaid, interestCapitalized, paymentDue, paymentPaid };
};
const leverageDebtOf = (assets: Position[]) => assets
  .filter((asset) => asset.category !== "房地產")
  .reduce((sum, asset) => sum + (asset.loan ?? 0), 0);
const investableNetWorth = (game: Pick<Game, "cash" | "debt" | "assets">) => {
  const nonPropertyAssets = game.assets.filter((asset) => asset.category !== "房地產").reduce((sum, asset) => sum + asset.value, 0);
  const nonMortgageDebt = Math.max(0, game.debt - mortgageDebtOf(game.assets));
  return game.cash + nonPropertyAssets - nonMortgageDebt;
};
const annualPropertyCashflow = (assets: Position[]) => {
  const properties = assets.filter((asset) => asset.category === "房地產");
  const rent = properties.filter((asset) => asset.name === RENTAL_PROPERTY_NAME).reduce((sum, asset) => sum + asset.value * RENTAL_YIELD, 0);
  const housingSavings = properties.some((asset) => asset.name !== RENTAL_PROPERTY_NAME) ? OWNER_HOUSING_SAVINGS : 0;
  const holdingCost = properties.reduce((sum, asset) => sum + asset.value * PROPERTY_HOLDING_COST_RATE, 0);
  return Math.round(rent + housingSavings - holdingCost);
};
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
const KOL_GOOD_VARIABLE_INCOME = 535000;
const KNOWLEDGE_CLEAR_SIGNAL_LEVEL = 60;
const KNOWLEDGE_CONFIDENCE_LEVEL = 73;
const KNOWLEDGE_SIGNAL_BOOST_LEVEL = 82;
const KNOWLEDGE_FORESIGHT_LEVEL = 90;
const KNOWLEDGE_SIGNAL_MOVE_MULTIPLIER = 1.1;
const FORESIGHT_CHANCE_PERCENT = 25;
const BREAKOUT_STREAK_TARGET = 3;
const BREAKOUT_UNLOCK_CHANCE_PERCENT = 18;
const BREAKOUT_MOVE_MULTIPLIER = 1.8;
const OUTSIDE_WORK_ANNUAL_INCOME = 480000;
const EXPERIENCED_WORK_BASE_INCOME = 600000;
const WORK_RAISE_STREAK = 3;
const WORK_TENURE_PROTECTION_STREAK = 3;
const ANNUAL_WORK_RAISE_RATE = .04;
const outsideWorkIncome = (streak: number) => streak < WORK_RAISE_STREAK
  ? OUTSIDE_WORK_ANNUAL_INCOME
  : Math.round(EXPERIENCED_WORK_BASE_INCOME * Math.pow(1 + ANNUAL_WORK_RAISE_RATE, streak - WORK_RAISE_STREAK) / 1000) * 1000;
const workHealthCost = (consecutiveYears: number) => 5 + Math.max(0, consecutiveYears - 2);
const LEARNING_COST = 5000;
const INTEL_RESEARCH_COST = 1000;
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
const FAMILY_BACKER_ANNUAL_SUPPORT = 400000;
const familySupportAmount = (game: Pick<Game, "trait" | "gauges">) => game.trait === "家族靠山"
  ? FAMILY_BACKER_ANNUAL_SUPPORT
  : Math.min(300000, Math.max(180000, Math.round((180000 + game.gauges.family * 1500) / 1000) * 1000));
const annualLivingCost = (year: number) => Math.round(240000 * Math.pow(1.02, year - 1) / 1000) * 1000;
const achievementsFor = (game: Game): AchievementResult[] => {
  const stats = game.achievementStats ?? blankAchievementStats();
  const net = netWorth(game);
  const completedRun = game.age >= FINAL_AGE && game.gauges.health > 0 && net > FINANCIAL_FAILURE_NET_WORTH;
  const careerProgress = `${stats.yearsStarted} 年中完成 ${stats.yearsStarted} 次生路選擇`;
  const retirementProgress = game.age31InvestableNet ?? investableNetWorth(game);
  const retirementDistance = Math.max(0, EARLY_RETIREMENT_TARGET - retirementProgress);
  return [
    { id: "earlyRetirement", title: "提前退休", tier: "傳說", description: "31歲時，可投資淨資產達3,000萬元，並扣除全部負債。", progress: `${game.age31InvestableNet === null ? "目前" : "31歲紀錄"} ${formatMoney(retirementProgress)}${retirementDistance > 0 ? ` · 還差 ${formatMoney(retirementDistance)}` : " · 已達標"}`, unlocked: game.earlyRetirementQualified },
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
    { id: "minimalist", title: "極簡投資家", tier: "稀有", description: "不使用銀行信貸、最高持倉不超過2筆，並以300萬元淨資產活到31歲。", progress: `最高持倉 ${stats.maxAssetRows} 筆 · 信貸 ${formatMoney(stats.cumulativeCreditBorrowed)} · 淨資產 ${formatMoney(net)}`, unlocked: completedRun && stats.maxAssetRows <= 2 && net >= 3000000 && stats.cumulativeCreditBorrowed === 0 },
    { id: "diversified", title: "資產動物園", tier: "一般", description: "曾同時持有至少10筆資產，且涵蓋台股、ETF、美股與加密貨幣。", progress: stats.diversifiedPeak ? "四類資產與10筆持倉均已達成" : `最高持倉 ${stats.maxAssetRows}／10 筆`, unlocked: completedRun && stats.diversifiedPeak },
  ];
};
const riskLabel = (risk: Choice["risk"]) => risk === "safe" ? "低" : risk === "steady" ? "中" : "高";
const choiceMoneyHint = (game: Game, choice: Choice) => {
  if (choice.action === "invest") {
    const amount = Math.min(Math.max(0, game.cash), Math.max(3000, game.cash * (choice.ratio ?? .2)));
    return `預計投入 ${formatMoney(amount)}`;
  }
  if (choice.action === "buy") return `自備款 ${formatMoney(propertyDownPayment(game, choice.asset?.name))}`;
  if (choice.action === "learn") return `查證支出 −${formatMoney(choice.intelAction === "research" ? INTEL_RESEARCH_COST : LEARNING_COST).replace("NT$ ", "")}`;
  if (choice.action === "work") return choice.intelAction === "trend" ? `KOL 流量收入 +${formatMoney(choice.intelEffects?.cash ?? 6000).replace("NT$ ", "")}` : `即時收入約 ${formatMoney(Math.max(8000, Math.round(game.income * .075 / 1000) * 1000))}`;
  if (choice.action === "family") return `家庭支出最多 ${formatMoney(Math.min(Math.max(0, game.cash), 8000))}`;
  if (choice.action === "wait" || choice.action === "hold") return "不動用現金";
  if (choice.action === "reduce") return game.specialTrait === "紙手體質" ? "直接全部清倉" : "再選減碼 50% 或全清";
  if (choice.action === "sell") return "整間出售並清償房貸";
  return null;
};
const gaugeHint = (key: GaugeKey) => key === "health"
  ? "反映目前的身體狀況與恢復能力"
  : key === "stress" ? "反映目前承受的身心負荷"
    : key === "family" ? "影響家人支援、借款與家庭事件"
      : key === "knowledge" ? "60強化判讀、73顯示可信度、82看對時行情效果+10%、90偶爾提前一季取得情報"
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
  housing: { research: "熬夜查成交、利率與貸款條件", observe: "先休息，之後再看房市量價", trend: "趕著把房市焦慮做成熱門內容" },
  career: { research: "熬夜查政策與產業數據", observe: "先健身休息，再看工作市場反應", trend: "連夜把職場話題做成流量" },
  macro: { research: "熬夜查政策原文與總經數據", observe: "先離開盤面，等市場走出方向", trend: "趕寫政策解讀搶第一波流量" },
  meme: { research: "熬夜查原始消息與喊單紀錄", observe: "關掉社群休息，看迷因能撐幾天", trend: "連夜把迷因加工成流量密碼" },
};

const intelEffectsByKind: Record<EventKind, { research: IntelChoiceEffects; observe: IntelChoiceEffects; trend: IntelChoiceEffects }> = {
  tech: { research: { knowledge: 5, stress: 1, health: -1 }, observe: { knowledge: 1, stress: -1, health: 1 }, trend: { cash: 28000, knowledge: -2, stress: 2, health: -1 } },
  market: { research: { knowledge: 4, stress: 1, health: -1 }, observe: { knowledge: 1, stress: -1, health: 1 }, trend: { cash: 24000, knowledge: -1, stress: 2, health: -1 } },
  crypto: { research: { knowledge: 5, stress: 2, health: -1 }, observe: { knowledge: 2, stress: -1, health: 1 }, trend: { cash: 36000, knowledge: -2, stress: 3, health: -1, credit: -1 } },
  housing: { research: { knowledge: 3, stress: 1, health: -1, credit: 1 }, observe: { knowledge: 1, stress: -2, health: 2 }, trend: { cash: 20000, knowledge: -1, stress: 1, health: -1 } },
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
  return [
    {
      label: copy.research,
      desc: `支出 ${formatMoney(INTEL_RESEARCH_COST)}；可靠確認主要標的方向，連動標的只確認受影響。${intelEffectSummary(effects.research)}。`,
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
      desc: `${intelEffectSummary(effects.trend)}；情報可能被熱門話術誤導。`,
      action: "work",
      risk: "bold",
      minR: 2,
      intelAction: "trend",
      intelEffects: effects.trend,
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

function createMarketIntel(game: Game, event: GameEvent, action: IntelAction, target: { category: string; name: string }, targetIndex = 0): { signal: MarketSignal; record: IntelRecord } {
  const targetKey = `${target.category}:${target.name}`;
  const role = targetIndex === 0 ? "primary" : "linked";
  // 同一事件的主要與連動標的共用一次多空判定；投顧老師不能對兩個標的同時又喊對又喊錯。
  const direction = signalDirectionForEvent(event, game.seed ^ signalHash(`${event.id}:${game.year}:${game.season}:${game.month}`));
  const hash = signalHash(`${game.seed}:${event.id}:${game.year}:${game.season}:${game.month}:${targetKey}`);
  const totalMonths = role === "linked" ? 3 : hash % 2 === 0 ? 3 : 6;
  const strength = role === "linked" ? .08 + (hash % 5) * .01 : .16 + (hash % 5) * .01;
  const researchCorrect = signalReadSucceeded(hash, researchReadAccuracy(game.gauges.knowledge));
  const observeAccuracy = observeReadAccuracy(game.gauges.knowledge);
  const observeCorrect = observeAccuracy > 0 && signalReadSucceeded(hash, observeAccuracy);
  const trendCorrect = signalReadSucceeded(hash, clamp(.55 + game.gauges.knowledge * .003, .55, .86));
  const readDirection = action === "research"
    ? role === "primary" ? researchCorrect ? direction : direction === "bullish" ? "bearish" : "bullish" : null
    : action === "trend"
      ? trendCorrect ? direction : direction === "bullish" ? "bearish" : "bullish"
      : observeAccuracy > 0
        ? observeCorrect ? direction : direction === "bullish" ? "bearish" : "bullish"
        : null;
  const directionLabel = readDirection === "bullish" ? "偏多" : readDirection === "bearish" ? "偏空" : "方向未明";
  const researchConfidence = Math.round(researchReadAccuracy(game.gauges.knowledge) * 100);
  const confidenceLabel = action === "research" && role === "primary" && game.gauges.knowledge >= KNOWLEDGE_CONFIDENCE_LEVEL
    ? `可信度約 ${Math.max(50, researchConfidence - 8)}～${Math.min(98, researchConfidence + 4)}%`
    : undefined;
  const clue = action === "research"
    ? role === "primary"
      ? `交叉查證後，主要線索較可靠地指向「${target.name}」${directionLabel}。${confidenceLabel ? `${confidenceLabel}。` : ""}`
      : `查證後只能確認「${target.name}」是連動標的，方向仍待價格驗證。`
    : action === "trend"
      ? `社群熱門聲量指向「${target.name}」${directionLabel}，但尚未查證，可能是反向話術。`
      : readDirection
        ? game.gauges.knowledge >= KNOWLEDGE_CLEAR_SIGNAL_LEVEL
          ? `高知識判讀顯示「${target.name}」較明確地${directionLabel}，仍需承擔市場雜訊。`
          : `依目前投資知識，你暫時判讀「${target.name}」${directionLabel}，仍可能看錯。`
        : `目前只能確認「${target.name}」受到事件影響，方向仍需自行判讀。`;
  const durationLabel = role === "linked"
    ? "預估影響 1 季"
    : action === "research" || game.gauges.knowledge >= 55
    ? `預估影響 ${totalMonths === 3 ? "1 季" : "2 季"}`
    : "影響時間可能為 1～2 季";
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

const illnessChance = (health: number) => health >= 80 ? .02 : health >= 60 ? .04 : health >= 40 ? .08 : health >= 20 ? .15 : .25;
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
  ["家族靠山", "家庭關係 +10；起始現金額外 +20 萬元；家裡資助通過時，每年獲得 40 萬元", { family: 10 }],
  ["信用小白", "信用較低，但沒有任何歷史包袱", { credit: -8 }],
  ["天生樂觀", "壓力起點較低，梭哈時也笑得出來", { stress: -8 }],
  ["體弱多病", "初始健康只有 60～68，市場以外也有風險", { healthRange: [60, 68] }],
  ["家破人亡", "初始家庭關係只有 38～54，家裡未必接得住你", { familyRange: [38, 54] }],
] as const;
const PAPER_HANDS_CHANCE_DENOMINATOR = 6;
const PAPER_HANDS_EFFECT = "不影響初始能力，但自主減倉時只能全部清倉";

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
  const hasPaperHands = signalHash(`${seedCode}:special:paper-hands`) % PAPER_HANDS_CHANCE_DENOMINATOR === 0;
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
  const startingCash = 300000 + (trait[0] === "家族靠山" ? FAMILY_BACKER_STARTING_CASH_BONUS : 0);
  return {
    age: STARTING_AGE, year: 1, seed, seedCode, phase: "season", season: 0, month: 0,
    name: chosenName, background: "迷茫的大學畢業生", occupation: "無業", trait: trait[0], traitEffect: trait[1], specialTrait: hasPaperHands ? "紙手體質" : null, specialTraitEffect: hasPaperHands ? PAPER_HANDS_EFFECT : null,
    cash: startingCash, debt: 0, familyDebt: 0, lastFamilyBorrowYear: null, lastCreditBorrowYear: null, creditLoanMonthsRemaining: 0, lastIncomeChoiceYear: null, incomeSource: "尚未決定", lastYearMarketMove: 0,
    correctSignalStreak: 0, maxCorrectSignalStreak: 0, breakoutOpportunities: 0, annualCorrectReads: 0, annualDirectionalReads: 0, lastYearReadAccuracy: null, kolReputation: 0,
    familySupportStreak: 0, parttimeStreak: 0, workConsecutiveYears: 0, workTenureProtected: false, income: 0, gauges, assets: [],
    result: null, annualStartNet: startingCash, annualMarketMove: 0, quarterMarketMove: 0, annualSummary: null, wealthHistory: [{ age: STARTING_AGE, netWorth: startingCash }], history: [], surpriseSeen: [], familyEventSeen: [], illnessSeen: [], illnessCooldown: 0,
    activeSignals: [], intelRecords: [], marketQuotes: initialMarketQuotes(),
    age31InvestableNet: null, earlyRetirementQualified: false, achievementStats: blankAchievementStats(), eventOrder: freshEventOrder(),
    propertyReviewNextMonth: null, propertyReviewSeen: [],
  };
}

function addPosition(assets: Position[], next: Position) {
  if (next.category === "房地產") {
    const nextUnit = assets
      .filter((asset) => asset.category === "房地產")
      .reduce((highest, asset) => Math.max(highest, asset.unit ?? 0), 0) + 1;
    return [...assets, { ...next, unit: nextUnit }];
  }
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
  const watchCandidates = brokerCatalog.filter((asset) => asset.category !== "房地產");
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
    const volatility = asset.category === "期貨" ? .13 : asset.category === "加密貨幣" ? .11 : asset.category === "房地產" ? .008 : .04;
    const baseDownChance = ["期貨", "加密貨幣"].includes(asset.category) ? .5 : asset.category === "房地產" ? .42 : .47;
    const relevantSignals = signals
      .filter((signal) => signal.targetCategory === asset.category && signal.targetName === asset.name && signal.remainingMonths > 0);
    const signalPressure = relevantSignals
      .reduce((pressure, signal) => pressure + (signal.direction === "bearish" ? signal.strength : -signal.strength), 0);
    const signalMoveMultiplier = relevantSignals.reduce((highest, signal) => Math.max(highest, signal.moveMultiplier ?? 1), 1);
    let downChance = clamp(baseDownChance + signalPressure, .12, .88);
    if (currentQuote.bearQuarters > 0) downChance = Math.max(.75, downChance);
    else if (currentQuote.bullQuarters > 0) downChance = Math.min(.35, downChance);

    const isSurpriseTarget = Boolean(surprise && surprise.targetCategory === asset.category && surprise.targetName === asset.name);
    const truthful = isSurpriseTarget ? random() < .8 : false;
    const intendedDeclined = isSurpriseTarget
      ? surprise!.direction === "bearish" ? truthful : !truthful
      : random() < downChance;
    const multiplier = Math.min(3, (isSurpriseTarget ? 1.2 + random() * .5 : 1) * signalMoveMultiplier);
    const dailyMovement = isDailyCompoundedAsset(asset.category)
      ? createDailyCompoundedMove(asset.category, intendedDeclined, multiplier, random)
      : null;
    const baseRate = dailyMovement
      ? Math.abs(dailyMovement.moveRate) / multiplier
      : asset.category === "房地產"
        ? intendedDeclined ? .001 + random() * volatility : .001 + random() * volatility * .85
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
      const truthful = random() < .8;
      surpriseImpact = {
        truthful,
        declined: surprise.direction === "bearish" ? truthful : !truthful,
        baseRate: 0,
        moveRate: 0,
        multiplier: 1.2 + random() * .5,
        before: 0,
        after: 0,
      };
    }
  }
  return { assets: movedAssets, marketQuotes: nextMarketQuotes, marketMove, surpriseImpact };
}

function choicesForHolding(event: GameEvent, position: Position): Choice[] {
  const relatedChoice = event.choices.find((choice) => choice.asset?.name === position.name);
  const asset = { category: position.category, name: position.name };
  if (position.category === "房地產") {
    const unitLabel = `第${position.unit ?? 1}間${position.name}`;
    return [
      {
        label: `繼續持有${unitLabel}`,
        desc: "不交易，讓這一間房完整承受房市消息與年度價格波動。",
        action: "hold",
        risk: "steady",
        minR: 1,
        asset,
        positionId: position.id,
      },
      {
        label: `再買一間${position.name}`,
        desc: "購入另一間獨立物件，另外計算房價、自備款、房貸與損益。",
        action: "buy",
        risk: relatedChoice?.risk === "bold" ? "bold" : "steady",
        minR: relatedChoice?.minR ?? 3,
        asset,
      },
      {
        label: `賣掉${unitLabel}`,
        desc: "整間出售，以售價清償這一間房的剩餘房貸。",
        action: "sell",
        risk: "safe",
        minR: 1,
        asset,
        positionId: position.id,
      },
    ];
  }
  return [
    {
      label: `維持${position.name}倉位`,
      desc: "不交易，讓既有部位完整承受這則消息帶來的波動。",
      action: "hold",
      risk: "steady",
      minR: 1,
      asset,
      positionId: position.id,
    },
    {
      label: `加倉${position.name}`,
      desc: "再投入約四分之一現金，放大判斷正確與錯誤的結果。",
      action: "invest",
      risk: relatedChoice?.risk === "bold" ? "bold" : "steady",
      minR: relatedChoice?.minR ?? 2,
      ratio: .25,
      asset,
    },
    {
      label: `減倉${position.name}`,
      desc: "賣出目前部位的一半，把部分帳面損益換回現金。",
      action: "reduce",
      risk: "safe",
      minR: 1,
      ratio: .5,
      asset,
      positionId: position.id,
    },
  ];
}

function titleForEnding(game: Game) {
  const net = netWorth(game);
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
  const [playerName, setPlayerName] = useState("");
  const [seedInput, setSeedInput] = useState("");
  const [showForeword, setShowForeword] = useState(false);
  const [hideForewordNext, setHideForewordNext] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [debtsOpen, setDebtsOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const [intelView, setIntelView] = useState<"active" | "archive">("active");
  const [pendingReduction, setPendingReduction] = useState<Choice | null>(null);
  const [positionTradeTarget, setPositionTradeTarget] = useState<Position | null>(null);
  const [positionTradeNotice, setPositionTradeNotice] = useState<PositionTradeNotice | null>(null);
  const [quarterSurprise, setQuarterSurprise] = useState<QuarterSurprise | null>(null);
  const [debtAction, setDebtAction] = useState<DebtAction | null>(null);
  const [mortgageTargetId, setMortgageTargetId] = useState<string | null>(null);
  const [debtNotice, setDebtNotice] = useState<DebtNotice | null>(null);
  const [incomeNotice, setIncomeNotice] = useState<IncomeNotice | null>(null);
  const [familyEvent, setFamilyEvent] = useState<FamilyEvent | null>(null);
  const [illnessEvent, setIllnessEvent] = useState<IllnessEvent | null>(null);
  const [illnessNotice, setIllnessNotice] = useState<IllnessNotice | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const [propertyReview, setPropertyReview] = useState<PropertyReview | null>(null);
  const [propertyReviewResolving, setPropertyReviewResolving] = useState(false);
  const [brokerOpen, setBrokerOpen] = useState(false);
  const [brokerCategory, setBrokerCategory] = useState("台股");
  const [brokerNotice, setBrokerNotice] = useState<string | null>(null);
  const [quarterReport, setQuarterReport] = useState<Resolution | null>(null);
  const endingCardRef = useRef<HTMLElement | null>(null);
  const [screenshotState, setScreenshotState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function trackAnonymous(eventType: AnonymousEventType, data: Record<string, string | number | boolean | null | string[]> = {}, snapshot = game) {
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
  }

  function startTrackedLife() {
    const next = makeGame(playerName, seedInput);
    const runId = createAnonymousRunId();
    analyticsRunId.current = runId;
    analyticsCompleted.current = false;
    analyticsSequence.current = 1;
    analyticsStartedAt.current = Date.now();
    analyticsLatestGame.current = next;
    lastPresentedEvent.current = null;
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
    setSeedInput((current) => current || randomSeedCode());
  }, []);

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
    setAssetsOpen(false);
    setDebtsOpen(false);
    setIntelOpen(false);
    setIntelView("active");
    setPendingReduction(null);
    setPositionTradeTarget(null);
    setPositionTradeNotice(null);
    setQuarterSurprise(null);
    setDebtAction(null);
    setMortgageTargetId(null);
    setDebtNotice(null);
    setIncomeNotice(null);
    setFamilyEvent(null);
    setIllnessEvent(null);
    setIllnessNotice(null);
    setHistoryOpen(false);
    setPropertyReview(null);
    setPropertyReviewResolving(false);
    setBrokerOpen(false);
    setBrokerNotice(null);
    setQuarterReport(null);
    setGame({ ...game, phase: "ending", result: null, annualSummary: null });
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
  }, [game?.phase]);

  const eventDeck = useMemo(
    () => game ? buildLifeEventDeck(game.seed, LIFE_YEAR_COUNT) : [],
    [game?.seed],
  );
  const currentEventSelection = useMemo(() => game ? selectAffordableCurrentEvent(game, eventDeck) : null, [game, eventDeck]);
  const currentEvent = currentEventSelection?.event ?? null;
  useEffect(() => {
    if (!currentEventSelection?.needsCommit) return;
    setGame((current) => current ? { ...current, eventOrder: currentEventSelection.order } : current);
  }, [currentEventSelection]);
  useEffect(() => {
    if (!game || !currentEvent || game.phase !== "season" || game.result || game.lastIncomeChoiceYear !== game.year
      || propertyReview || quarterSurprise || quarterReport || incomeNotice || familyEvent || illnessEvent || debtAction || positionTradeTarget || brokerOpen) return;
    const presentationKey = `${game.year}:${game.season}:${game.month}:${currentEvent.id}`;
    if (lastPresentedEvent.current === presentationKey) return;
    lastPresentedEvent.current = presentationKey;
    const targets = eventTargetsForEvent(currentEvent);
    trackAnonymous("event_presented", {
      eventId: currentEvent.id,
      eventKind: currentEvent.kind,
      category: targets[0]?.category ?? null,
      target: targets[0]?.name ?? null,
      linkedTarget: targets[1]?.name ?? null,
    }, game);
  }, [game?.year, game?.season, game?.month, game?.phase, game?.result, game?.lastIncomeChoiceYear, currentEvent?.id, propertyReview, quarterSurprise, quarterReport, incomeNotice, familyEvent, illnessEvent, debtAction, positionTradeTarget, brokerOpen]);
  useEffect(() => {
    if (!game || game.phase !== "season" || game.gauges.health <= 0 || game.result || propertyReview || propertyReviewResolving
      || quarterSurprise || quarterReport || incomeNotice || familyEvent || illnessEvent || debtAction || positionTradeTarget || brokerOpen
      || game.lastIncomeChoiceYear !== game.year) return;

    const properties = game.assets.filter((asset) => asset.category === "房地產");
    if (!properties.length) {
      if (game.propertyReviewNextMonth !== null || game.propertyReviewSeen.length) {
        setGame((current) => current ? { ...current, propertyReviewNextMonth: null, propertyReviewSeen: [] } : current);
      }
      return;
    }

    const currentMonth = absoluteMonthIndex(game);
    if (game.propertyReviewNextMonth === null) {
      setGame((current) => current ? { ...current, propertyReviewNextMonth: currentMonth + 6 } : current);
      return;
    }
    if (currentMonth < game.propertyReviewNextMonth) return;

    const propertyRandom = createGameRandom(game, `property-review:${currentMonth}`);
    const target = properties[Math.floor(propertyRandom() * properties.length)];
    const matchingEvents = lifeEvents.filter((event) => event.kind === "housing" && event.choices.some((choice) => choice.asset?.name === target.name));
    const unseenEvents = matchingEvents.filter((event) => !game.propertyReviewSeen.includes(event.id));
    const pool = unseenEvents.length ? unseenEvents : matchingEvents;
    const event = pool[Math.floor(propertyRandom() * pool.length)];
    if (!event) return;
    const nextSeen = unseenEvents.length ? [...game.propertyReviewSeen, event.id] : [event.id];

    setGame((current) => current ? { ...current, propertyReviewNextMonth: currentMonth + 6, propertyReviewSeen: nextSeen } : current);
    setPropertyReview({ event, targetId: target.id });
  }, [game, propertyReview, propertyReviewResolving, quarterSurprise, quarterReport, incomeNotice, familyEvent, illnessEvent, debtAction, positionTradeTarget, brokerOpen]);
  const currentEventTargets = currentEvent ? eventTargetsForEvent(currentEvent) : [];
  const currentEventTarget = currentEventTargets[0];
  const currentAdvisorSignal = currentEvent ? advisorSignalForEvent(currentEvent) : null;
  const currentChoices = currentEvent ? lifeChoicesForEvent(currentEvent) : [];
  const propertyReviewPosition = game && propertyReview ? game.assets.find((asset) => asset.id === propertyReview.targetId) : undefined;
  const propertyReviewChoices = propertyReview ? lifeChoicesForEvent(propertyReview.event) : [];
  const totalAssets = game?.assets.reduce((sum, asset) => sum + asset.value, 0) ?? 0;

  function resolveChoice(choice: Choice, reductionRatio?: number, eventContext?: GameEvent) {
    if (!game) return;
    if (choice.action === "buy" && game.cash < propertyDownPayment(game, choice.asset?.name)) return;
    const sourceEvent = eventContext ?? currentEvent;
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
    } else if (choice.action === "buy") {
      if (!choice.asset || choice.asset.category !== "房地產") return;
      const price = propertyUnitPrice(choice.asset.name);
      const downPayment = propertyDownPayment(next, choice.asset.name);
      const mortgage = price - downPayment;
      const baseChance = choice.risk === "bold" ? .34 : .5;
      const goodChance = clamp(baseChance + next.gauges.knowledge * .002 + (next.gauges.credit - 50) * .0015, .18, .8);
      const roll = random();
      const outcome = roll < goodChance ? "good" : roll < goodChance + .25 ? "flat" : "bad";
      const returnRate = outcome === "good" ? .01 + random() * .03 : outcome === "flat" ? -.008 + random() * .016 : -.02 - random() * .04;
      const value = Math.max(0, price * (1 + returnRate));
      next.cash -= downPayment;
      next.debt += mortgage;
      next.assets = addPosition(next.assets, { id: deterministicPositionId(next, "property", choice.asset.name), category: "房地產", name: choice.asset.name, cost: price, value, loan: mortgage, mortgageMonthsRemaining: MORTGAGE_TERM_MONTHS });
      if (next.propertyReviewNextMonth === null) next.propertyReviewNextMonth = absoluteMonthIndex(next) + 6;
      addKnowledge(next.gauges, outcome === "bad" ? 5 : 2);
      next.gauges.stress = clamp(next.gauges.stress + (outcome === "bad" ? 12 : outcome === "good" ? 2 : 6));
      if (outcome === "bad") next.gauges.credit = clamp(next.gauges.credit - 2);
      const priceMove = value - price;
      resolution = {
        tone: outcome,
        eyebrow: "房地產 · 單間成交",
        title: outcome === "good" ? "你買下一間房，成交後行情先送來一點掌聲。" : outcome === "flat" ? "你買下一間房，價格暫時在原地整理。" : "你買下一間房，交屋後才發現市場正在降溫。",
        body: `${choice.asset.name} 以一間為單位列入資產，不會與其他房產合併。`,
        detail: `單間成交價 ${formatMoney(price)}，自備款 ${formatMoney(downPayment)}，新增房貸 ${formatMoney(mortgage)}。房貸採 40 年期、年利率 4.2% 本息攤還，預估每月約 ${formatMoney(monthlyMortgagePayment(mortgage))}；遊戲會在年度結算彙總扣款。本次好結果機率約 ${Math.round(goodChance * 100)}%。`,
        deltas: [`自備款 −${formatMoney(downPayment).replace("NT$ ", "")}`, `房地產 +1 間`, `負債 +${formatMoney(mortgage).replace("NT$ ", "")}`, `房價變動 ${priceMove >= 0 ? "+" : "−"}${formatMoney(Math.abs(priceMove)).replace("NT$ ", "")}`],
      };
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
      const rawReturnRate = dailyMovement?.moveRate ?? (position.category === "房地產"
        ? outcome === "good" ? .01 + random() * .03 : outcome === "flat" ? -.006 + random() * .012 : -.015 - random() * .035
        : outcome === "good" ? .06 + random() * .1 : outcome === "flat" ? -.025 + random() * .05 : -.08 - random() * .12);
      const returnRate = applyAssetReturnLimits(position.category, rawReturnRate);
      const before = position.value;
      const after = Math.max(0, before * (1 + returnRate));
      next.assets[positionIndex] = { ...position, value: after };
      const knowledgeGain = addKnowledge(next.gauges, outcome === "bad" ? 4 : 2);
      next.gauges.stress = clamp(next.gauges.stress + (outcome === "bad" ? 9 : outcome === "good" ? -2 : 2));
      const profit = after - before;
      resolution = {
        tone: outcome,
        eyebrow: position.category === "房地產" ? `房地產 · 第${position.unit ?? 1}間估價更新` : `${position.category} · 既有倉位結算`,
        title: outcome === "good" ? "你抱住了部位，也抱住了行情。" : outcome === "flat" ? "消息很吵，倉位幾乎原地踏步。" : "沒有動作，也是一種有價格的選擇。",
        body: position.category === "房地產" ? `第${position.unit ?? 1}間${position.name}重新估價，你沒有再買，也沒有出售。` : `${position.name} 完整承受事件波動，你沒有追價，也沒有提前離場。`,
        detail: `依投資知識、信用與事件風險計算，本次好結果機率約 ${Math.round(goodChance * 100)}%。${dailyMovement ? `${dailyMoveDetail(position.category, dailyMovement)}，本月累計報酬 ${(returnRate * 100).toFixed(1)}%。` : position.category === "加密貨幣" ? `加密貨幣單次漲幅上限 +66%、跌幅上限 −60%，本次報酬 ${(returnRate * 100).toFixed(1)}%。` : ""}既有部位變動 ${formatMoney(profit)}。`,
        deltas: [`帳面損益 ${profit >= 0 ? "+" : "−"}${formatMoney(Math.abs(profit)).replace("NT$ ", "")}`, `壓力 ${outcome === "good" ? "−2" : outcome === "bad" ? "+9" : "+2"}`, `投資知識 +${knowledgeGain}`],
      };
    } else if (choice.action === "sell") {
      const positionIndex = next.assets.findIndex((asset) => choice.positionId ? asset.id === choice.positionId : asset.name === choice.asset?.name);
      if (positionIndex < 0) return;
      const position = next.assets[positionIndex];
      if (position.category !== "房地產") return;
      const mortgage = position.loan ?? 0;
      const netProceeds = position.value - mortgage;
      const saleShortfall = Math.max(0, -netProceeds);
      const cashProceeds = Math.max(0, netProceeds);
      const realizedProfit = position.value - position.cost;
      next.cash += cashProceeds;
      next.debt = Math.max(0, next.debt - mortgage + saleShortfall);
      next.assets = next.assets.filter((_, index) => index !== positionIndex);
      next.gauges.stress = clamp(next.gauges.stress - 5);
      addKnowledge(next.gauges, 3);
      resolution = {
        tone: realizedProfit >= 0 ? "good" : "bad",
        eyebrow: `房地產 · 第${position.unit ?? 1}間出售`,
        title: realizedProfit >= 0 ? "房子成交，帳面獲利終於變成現金。" : "房子成交，你用現金結束了這次套房人生。",
        body: `第${position.unit ?? 1}間${position.name}已整間出售，這筆資產不再留在清單中。`,
        detail: `售價 ${formatMoney(position.value)}，清償房貸 ${formatMoney(mortgage)}，實現房價損益 ${formatMoney(realizedProfit)}。${saleShortfall > 0 ? `售價不足清償的 ${formatMoney(saleShortfall)} 轉為有息負債。` : ""}`,
        deltas: [`房地產 −1 間`, `房貸 −${formatMoney(mortgage).replace("NT$ ", "")}`, ...(cashProceeds > 0 ? [`現金 +${formatMoney(cashProceeds).replace("NT$ ", "")}`] : []), ...(saleShortfall > 0 ? [`剩餘負債 +${formatMoney(saleShortfall).replace("NT$ ", "")}`] : []), `實現損益 ${realizedProfit >= 0 ? "+" : "−"}${formatMoney(Math.abs(realizedProfit)).replace("NT$ ", "")}`],
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
      const generalDebt = Math.max(0, next.debt - (next.familyDebt ?? 0) - mortgageDebtOf(next.assets));
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
      if (leveraged) next.debt += exposure - margin;
      next.assets = addPosition(next.assets, { id: deterministicPositionId(next, "choice", choice.asset!.name), category: choice.asset!.category, name: choice.asset!.name, cost: exposure, value, loan: leveraged ? exposure - margin : 0 });
      const knowledgeGain = addKnowledge(next.gauges, outcome === "bad" ? 5 : 2);
      next.gauges.stress = clamp(next.gauges.stress + (outcome === "bad" ? 12 : outcome === "good" ? -3 : 3));
      next.gauges.health = clamp(next.gauges.health - (outcome === "bad" ? 2 : 0));
      if (outcome === "bad" && leveraged) next.gauges.credit = clamp(next.gauges.credit - 3);
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

    if (choice.intelAction && eventContext) {
      const targets = eventTargetsForEvent(eventContext);
      if (targets.length) {
        const rawIntels = targets.map((target, index) => createMarketIntel(next, eventContext, choice.intelAction!, target, index));
        const primaryIntel = rawIntels[0];
        const readAttempted = Boolean(primaryIntel?.record.readDirection);
        const readCorrect = readAttempted && primaryIntel.record.readDirection === primaryIntel.signal.direction;
        const streak = readCorrect ? (next.correctSignalStreak ?? 0) + 1 : 0;
        const breakoutEligible = readCorrect && streak >= BREAKOUT_STREAK_TARGET && primaryIntel.signal.direction === "bullish";
        const breakoutUnlocked = breakoutEligible
          && signalHash(`${next.seed}:${eventContext.id}:${next.year}:${next.season}:${next.month}:breakout`) % 100 < BREAKOUT_UNLOCK_CHANCE_PERCENT;
        const foresightUnlocked = readCorrect
          && next.gauges.knowledge >= KNOWLEDGE_FORESIGHT_LEVEL
          && signalHash(`${next.seed}:${eventContext.id}:${next.year}:${next.season}:${next.month}:foresight`) % 100 < FORESIGHT_CHANCE_PERCENT;
        next.annualDirectionalReads = (next.annualDirectionalReads ?? 0) + (readAttempted ? 1 : 0);
        next.annualCorrectReads = (next.annualCorrectReads ?? 0) + (readCorrect ? 1 : 0);
        next.maxCorrectSignalStreak = Math.max(next.maxCorrectSignalStreak ?? 0, streak);
        next.correctSignalStreak = breakoutUnlocked ? 0 : streak;
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
            : "這次沒有形成明確方向判讀，不累積連勝。";
        resolution.detail = `${resolution.detail} ${intels.map((intel) => `${intel.record.clue} ${intel.record.durationLabel}${intel.record.opportunityLabel ? `；${intel.record.opportunityLabel}` : ""}`).join("；")}；${streakNote}實際行情仍有隨機波動。`;
        resolution.deltas = [
          ...resolution.deltas,
          readCorrect ? `連續看對 ${next.correctSignalStreak}／${BREAKOUT_STREAK_TARGET}` : readAttempted ? "連續看對 歸零" : "連續看對 不變",
          ...(breakoutUnlocked ? ["稀有主升段 已解鎖"] : []),
          ...(foresightUnlocked ? ["提前一季情報 已取得"] : []),
        ];
        resolution.deltas = [...resolution.deltas, `情報入庫：主要「${targets[0]?.name}」／連動「${targets[1]?.name}」`];
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
      netWorth: Math.round(netWorth(next)),
      health: next.gauges.health,
      stress: next.gauges.stress,
      knowledge: next.gauges.knowledge,
    }, next);
    setGame(next);
  }

  function chooseEventOption(choice: Choice) {
    if (choice.action === "reduce") {
      if (game?.specialTrait === "紙手體質") {
        resolveChoice(choice, 1);
        return;
      }
      setPendingReduction(choice);
      return;
    }
    resolveChoice(choice, undefined, currentEvent ?? undefined);
    if (currentEventTarget && brokerCategoryOrder.includes(currentEventTarget.category)) setBrokerCategory(currentEventTarget.category);
    setBrokerNotice(null);
    setBrokerOpen(true);
  }

  function choosePropertyReviewOption(choice: Choice) {
    if (!propertyReview || !propertyReviewPosition) return;
    setPropertyReviewResolving(true);
    resolveChoice(choice, undefined, propertyReview.event);
  }

  function confirmReduction(ratio: .5 | 1) {
    if (!pendingReduction) return;
    const choice = pendingReduction;
    setPendingReduction(null);
    resolveChoice(choice, ratio);
  }

  function openPositionTrade(position: Position) {
    if (!game || position.category === "房地產" || game.phase !== "season" || game.result || quarterSurprise || propertyReview || incomeChoiceRequired || familyEvent || illnessEvent) return;
    setPositionTradeTarget({ ...position });
    setPositionTradeNotice(null);
  }

  function confirmPositionTrade(requestedRatio: .5 | 1) {
    if (!game || !positionTradeTarget || positionTradeNotice) return;
    const positionIndex = game.assets.findIndex((asset) => asset.id === positionTradeTarget.id);
    if (positionIndex < 0) {
      setPositionTradeTarget(null);
      return;
    }
    const position = game.assets[positionIndex];
    if (position.category === "房地產") return;
    const sellRatio = game.specialTrait === "紙手體質" ? 1 : requestedRatio;
    const proceeds = position.value * sellRatio;
    const releasedCost = position.cost * sellRatio;
    const realizedProfit = proceeds - releasedCost;
    const releasedLoan = (position.loan ?? 0) * sellRatio;
    const generalDebt = Math.max(0, game.debt - (game.familyDebt ?? 0) - mortgageDebtOf(game.assets));
    const automaticRepayment = Math.min(proceeds, releasedLoan, generalDebt);
    const netCash = proceeds - automaticRepayment;
    const remainingValue = position.value - proceeds;
    const remainingCost = position.cost - releasedCost;
    const remainingLoan = Math.max(0, (position.loan ?? 0) - releasedLoan);
    const assets = remainingValue < 1
      ? game.assets.filter((_, index) => index !== positionIndex)
      : game.assets.map((asset, index) => index === positionIndex
        ? { ...asset, value: remainingValue, cost: remainingCost, loan: remainingLoan }
        : asset);
    const actionLabel = sellRatio >= 1 ? "全部賣出" : "減碼 50%";
    const notice: PositionTradeNotice = {
      title: sellRatio >= 1 ? `「${position.name}」已全部賣出。` : `「${position.name}」已減碼一半。`,
      body: `你主動指定${position.category}「${position.name}」執行${actionLabel}。這次只是調整資產配置，本次事件仍保留，不會因此跳到下一次事件。`,
      deltas: [
        `賣出價款 +${formatMoney(proceeds).replace("NT$ ", "")}`,
        ...(automaticRepayment > 0 ? [`自動還債 −${formatMoney(automaticRepayment).replace("NT$ ", "")}`] : []),
        `現金淨增加 +${formatMoney(netCash).replace("NT$ ", "")}`,
        `實現損益 ${realizedProfit >= 0 ? "+" : "−"}${formatMoney(Math.abs(realizedProfit)).replace("NT$ ", "")}`,
        `部位 −${Math.round(sellRatio * 100)}%`,
      ],
    };
    const nextGame = {
      ...game,
      cash: game.cash + netCash,
      debt: Math.max(0, game.debt - automaticRepayment),
      assets,
      history: [...game.history, `${game.age}歲${periodLabel(game)}自主交易：${position.name}${actionLabel}`].slice(-8),
    };
    trackAnonymous("trade", {
      side: "sell",
      category: position.category,
      target: position.name,
      ratio: Math.round(sellRatio * 100),
      amount: Math.round(proceeds),
      netWorth: Math.round(netWorth(nextGame)),
    }, nextGame);
    setGame(nextGame);
    setPositionTradeNotice(notice);
  }

  function brokerBuy(asset: BrokerAsset, ratio: .25 | .5 | 1 = .25) {
    if (!game || !brokerOpen || game.cash <= 0) return;
    if (asset.category === "房地產") {
      const price = propertyUnitPrice(asset.name);
      const downPayment = propertyDownPayment(game, asset.name);
      const mortgage = price - downPayment;
      if (game.cash < downPayment) {
        setBrokerNotice(`「${asset.name}」需要自備款 ${formatMoney(downPayment)}，目前現金不足。`);
        return;
      }
      const assets = addPosition(game.assets, {
        id: deterministicPositionId(game, "broker-property", asset.name),
        category: asset.category,
        name: asset.name,
        cost: price,
        value: price,
        loan: mortgage,
        mortgageMonthsRemaining: MORTGAGE_TERM_MONTHS,
      });
      const nextGame = {
        ...game,
        cash: game.cash - downPayment,
        debt: game.debt + mortgage,
        assets,
        achievementStats: achievementStatsForAssets(game.achievementStats ?? blankAchievementStats(), assets),
        history: [...game.history, `${game.age}歲${periodLabel(game)}券商：買進一間${asset.name}`].slice(-8),
      };
      trackAnonymous("trade", {
        side: "buy",
        category: asset.category,
        target: asset.name,
        ratio: 100,
        amount: Math.round(price),
        netWorth: Math.round(netWorth(nextGame)),
      }, nextGame);
      setGame(nextGame);
      setBrokerNotice(`已買進一間「${asset.name}」；支付自備款 ${formatMoney(downPayment)}，新增房貸 ${formatMoney(mortgage)}。`);
      return;
    }

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
    if (!game || !brokerOpen) return;
    const positionIndex = game.assets.findIndex((asset) => asset.id === position.id);
    if (positionIndex < 0) return;
    const current = game.assets[positionIndex];

    if (current.category === "房地產") {
      const mortgage = current.loan ?? 0;
      const equity = current.value - mortgage;
      const cashProceeds = Math.max(0, equity);
      const saleShortfall = Math.max(0, -equity);
      const assets = game.assets.filter((_, index) => index !== positionIndex);
      const nextGame = {
        ...game,
        cash: game.cash + cashProceeds,
        debt: Math.max(0, game.debt - mortgage + saleShortfall),
        assets,
        history: [...game.history, `${game.age}歲${periodLabel(game)}券商：出售第${current.unit ?? 1}間${current.name}`].slice(-8),
      };
      trackAnonymous("trade", {
        side: "sell",
        category: current.category,
        target: current.name,
        ratio: 100,
        amount: Math.round(current.value),
        netWorth: Math.round(netWorth(nextGame)),
      }, nextGame);
      setGame(nextGame);
      setBrokerNotice(`已整間出售「${current.name}」，清償房貸 ${formatMoney(mortgage)}${cashProceeds > 0 ? `，現金增加 ${formatMoney(cashProceeds)}` : `，剩餘缺口 ${formatMoney(saleShortfall)} 轉為負債`}。`);
      return;
    }

    const ratio = game.specialTrait === "紙手體質" ? 1 : requestedRatio;
    const gross = current.value * ratio;
    const fee = gross * brokerSellFeeRate(current.category);
    const proceeds = Math.max(0, gross - fee);
    const releasedCost = current.cost * ratio;
    const releasedLoan = (current.loan ?? 0) * ratio;
    const generalDebt = Math.max(0, game.debt - (game.familyDebt ?? 0) - mortgageDebtOf(game.assets));
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

  function closeBrokerMonth() {
    if (!game || !brokerOpen) return;
    setBrokerOpen(false);
    setBrokerNotice(null);
    if (game.month < EVENTS_PER_SEASON - 1) {
      const firstMonthMove = applyMonthlyMarketMove(game.assets, game.marketQuotes ?? initialMarketQuotes(), 0, createGameRandom(game, "market:0"), undefined, game.activeSignals ?? []);
      setGame({
        ...game,
        assets: firstMonthMove.assets,
        marketQuotes: firstMonthMove.marketQuotes,
        annualMarketMove: game.annualMarketMove + firstMonthMove.marketMove,
        quarterMarketMove: game.quarterMarketMove + firstMonthMove.marketMove,
        activeSignals: ageMarketSignals(game.activeSignals ?? []),
        month: game.month + 1,
        result: null,
      });
      return;
    }

    // 第二次事件結束後，先自動結算季度的第二個月；最後一個月再進入一般行情或突發事件。
    const secondMonthMove = applyMonthlyMarketMove(game.assets, game.marketQuotes ?? initialMarketQuotes(), 1, createGameRandom(game, "market:1"), undefined, game.activeSignals ?? []);
    const secondMonthGame: Game = {
      ...game,
      assets: secondMonthMove.assets,
      marketQuotes: secondMonthMove.marketQuotes,
      annualMarketMove: game.annualMarketMove + secondMonthMove.marketMove,
      quarterMarketMove: game.quarterMarketMove + secondMonthMove.marketMove,
      activeSignals: ageMarketSignals(game.activeSignals ?? []),
      result: null,
    };
    if (createGameRandom(secondMonthGame, "quarter-surprise:chance")() < QUARTER_SURPRISE_CHANCE) {
      const surprise = createQuarterSurprise(secondMonthGame, createGameRandom(secondMonthGame, "quarter-surprise:content"));
      const achievementStats = secondMonthGame.achievementStats ?? blankAchievementStats();
      setGame({ ...secondMonthGame, surpriseSeen: [...secondMonthGame.surpriseSeen, surprise.id], achievementStats: { ...achievementStats, surprises: achievementStats.surprises + 1 } });
      setQuarterSurprise(surprise);
      return;
    }

    const thirdMonthMove = applyMonthlyMarketMove(secondMonthGame.assets, secondMonthGame.marketQuotes, 2, createGameRandom(secondMonthGame, "market:2"), undefined, secondMonthGame.activeSignals ?? []);
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
      eyebrow: `${periodLabel(game)} · 三個月行情結算`,
      title: quarterMarketMove > 0 ? "這一季，市場替帳戶加了點顏色。" : quarterMarketMove < 0 ? "這一季，市場收走了一些耐心。" : "這一季，帳戶幾乎原地踏步。",
      body: game.assets.length ? "三個月營業日波動已逐月複利計入每一筆持倉。" : "你本季維持空手，市場照常波動，但沒有產生持倉損益。",
      detail: "每季包含三個月行情；台股與 ETF 每個營業日限制在 −10%～+10%，美股不套用此限制，加密貨幣沿用單月漲跌上限。",
      deltas: [`本季持倉變動 ${quarterMarketMove >= 0 ? "+" : "−"}${formatMoney(Math.abs(quarterMarketMove)).replace("NT$ ", "")}`, `期末投資資產 ${formatMoney(thirdMonthMove.assets.reduce((sum, asset) => sum + asset.value, 0)).replace("NT$ ", "")}`],
    });
  }

  function continueAfterQuarterReport() {
    if (!game || !quarterReport) return;
    setQuarterReport(null);
    closeQuarterWithHealthCheck(game);
  }

  function continueAfterPropertyReview() {
    if (!game?.result) return;
    setGame({ ...game, result: null });
    setPropertyReview(null);
    setPropertyReviewResolving(false);
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
      if (originalPosition.category === "房地產") {
        const price = propertyUnitPrice(originalPosition.name);
        const downPayment = propertyDownPayment(game, originalPosition.name);
        if (cash < downPayment) return;
        const mortgage = price - downPayment;
        const newValue = Math.max(0, price * (1 + impact.moveRate));
        cash -= downPayment;
        debt += mortgage;
        marketMove += newValue - price;
        affectedMovement += newValue - price;
        assets = addPosition(assets, {
      id: deterministicPositionId(game, "surprise-add", quarterSurprise.targetName),
          category: "房地產",
          name: originalPosition.name,
          cost: price,
          value: newValue,
          loan: mortgage,
          mortgageMonthsRemaining: MORTGAGE_TERM_MONTHS,
          declineStreak: impact.declined ? 1 : 0,
          riseStreak: impact.declined ? 0 : 1,
        });
        transactionDeltas = [`自備款 −${formatMoney(downPayment).replace("NT$ ", "")}`, "房地產 +1 間", `負債 +${formatMoney(mortgage).replace("NT$ ", "")}`];
        actionDetail = `你在消息揭曉前再買一間，自備款 ${formatMoney(downPayment)}，新房與原持有物件一起承受本次波動。`;
      } else {
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
      }
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
      if (originalPosition.category === "房地產") {
        const mortgage = originalPosition.loan ?? 0;
        const proceeds = originalPosition.value - mortgage;
        const saleShortfall = Math.max(0, -proceeds);
        const cashProceeds = Math.max(0, proceeds);
        cash += cashProceeds;
        debt = Math.max(0, debt - mortgage + saleShortfall);
        transactionDeltas = ["房地產 −1 間", `房貸 −${formatMoney(mortgage).replace("NT$ ", "")}`, ...(cashProceeds > 0 ? [`現金 +${formatMoney(cashProceeds).replace("NT$ ", "")}`] : []), ...(saleShortfall > 0 ? [`剩餘負債 +${formatMoney(saleShortfall).replace("NT$ ", "")}`] : [])];
        actionDetail = `你在消息揭曉前整間出售，按原估值成交並清償 ${formatMoney(mortgage)} 房貸，因此避開或錯過本次價格波動。`;
      } else {
        const generalDebt = Math.max(0, debt - (game.familyDebt ?? 0) - mortgageDebtOf(game.assets));
        const automaticRepayment = Math.min(originalPosition.value, originalPosition.loan ?? 0, generalDebt);
        const netProceeds = originalPosition.value - automaticRepayment;
        cash += netProceeds;
        debt = Math.max(0, debt - automaticRepayment);
        transactionDeltas = [`賣出價款 +${formatMoney(originalPosition.value).replace("NT$ ", "")}`, ...(automaticRepayment > 0 ? [`自動還債 −${formatMoney(automaticRepayment).replace("NT$ ", "")}`] : []), `現金淨增加 +${formatMoney(netProceeds).replace("NT$ ", "")}`, "部位 −100%", "本月該部位波動 0"];
        actionDetail = `你在消息揭曉前全部平倉，按原市值賣出 ${formatMoney(originalPosition.value)}。${automaticRepayment > 0 ? `系統先償還 ${formatMoney(automaticRepayment)} 槓桿本金，` : ""}其餘 ${formatMoney(netProceeds)} 回到現金，因此避開或錯過本次波動。`;
      }
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
    setMortgageTargetId(null);
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
    const currentGeneralDebt = Math.max(0, game.debt - (game.familyDebt ?? 0) - mortgageDebtOf(game.assets));
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
    const mortgageDebt = mortgageDebtOf(game.assets);
    const generalDebt = Math.max(0, game.debt - (game.familyDebt ?? 0) - mortgageDebt);
    if (generalDebt <= 0) return;
    const target = ratio === 1 ? generalDebt : generalDebt * .5;
    const repaid = Math.min(game.cash, target);
    const trackedLeverageDebt = leverageDebtOf(game.assets);
    const untrackedDebt = Math.max(0, generalDebt - trackedLeverageDebt);
    const appliedToTrackedLoans = Math.max(0, repaid - Math.min(repaid, untrackedDebt));
    const loanFactor = trackedLeverageDebt > 0 ? Math.max(0, 1 - appliedToTrackedLoans / trackedLeverageDebt) : 1;
    const assets = appliedToTrackedLoans > 0
      ? game.assets.map((asset) => asset.category === "房地產" ? asset : { ...asset, loan: (asset.loan ?? 0) * loanFactor })
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

  function prepayMortgage(ratio: .5 | 1) {
    if (!game || !mortgageTargetId || game.cash <= 0) return;
    const position = game.assets.find((asset) => asset.id === mortgageTargetId && asset.category === "房地產");
    if (!position || (position.loan ?? 0) <= 0) return;
    const mortgage = position.loan ?? 0;
    const target = ratio === 1 ? mortgage : mortgage * .5;
    const repaid = Math.min(game.cash, target);
    const remaining = Math.max(0, mortgage - repaid);
    const fullyRepaid = remaining < 1;
    const gauges = { ...game.gauges };
    gauges.credit = clamp(gauges.credit + (fullyRepaid ? 3 : 1));
    gauges.stress = clamp(gauges.stress - (fullyRepaid ? 4 : 2));
    const assets = game.assets.map((asset) => asset.id === position.id ? { ...asset, loan: remaining } : asset);
    const nextGame = { ...game, cash: game.cash - repaid, debt: Math.max(0, game.debt - repaid), assets, gauges };
    trackAnonymous("debt_action", {
      action: "mortgage_repay",
      target: position.name,
      ratio: Math.round(ratio * 100),
      amount: Math.round(repaid),
      cash: Math.round(nextGame.cash),
      debt: Math.round(nextGame.debt),
      credit: nextGame.gauges.credit,
    }, nextGame);
    setGame(nextGame);
    setDebtNotice({
      tone: "good",
      title: fullyRepaid ? `第${position.unit ?? 1}間房貸已清償。` : `第${position.unit ?? 1}間房貸先還了一部分。`,
      body: `本次提前還款 ${formatMoney(repaid)}，${position.name}剩餘房貸 ${formatMoney(remaining)}。信用 +${fullyRepaid ? 3 : 1}、壓力 −${fullyRepaid ? 4 : 2}。`,
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
      const income = isColdStart
        ? outcome === "good"
          ? Math.round((20000 + random() * 40000) / 1000) * 1000
          : outcome === "flat"
            ? Math.round(random() * 20000 / 1000) * 1000
            : 0
        : outcome === "good"
          ? Math.min(KOL_MAX_ANNUAL_INCOME, Math.round((180000 + game.gauges.knowledge * 3000 + game.kolReputation * 5000 + trackRecordBonus + random() * KOL_GOOD_VARIABLE_INCOME) / 1000) * 1000)
          : outcome === "flat"
            ? Math.max(0, Math.round((60000 + game.kolReputation * 1200 + trackRecordBonus * .2 + random() * 120000) / 1000) * 1000)
            : Math.round(random() * 60000 / 1000) * 1000;
      next.income = income;
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
      next.gauges.stress = clamp(next.gauges.stress + stressDelta);
      next.gauges.credit = clamp(next.gauges.credit + creditDelta);
      next.kolReputation = clamp((game.kolReputation ?? 0) + reputationDelta);
      notice = {
        tone: outcome,
        title: isColdStart
          ? outcome === "good" ? "第一支影片小爆紅，但業配還只敢先試水溫。" : outcome === "flat" ? "帳號開了，觀眾還在路上。" : "你對著鏡頭講盤，演算法先去睡了。"
          : outcome === "good" ? "流量、訂閱與業配一起進場。" : outcome === "flat" ? "有人看影片，演算法沒有特別感動。" : "喊單連續翻車，留言區比帳戶更綠。",
        body: isColdStart
          ? `第一年是冷啟動期，收入只來自小額流量或第一筆試水溫合作。本年度收入確定為 ${formatMoney(income)}，將在年度結算時入帳。`
          : `投資知識、上一年市場判讀戰績與累積聲量共同影響結果。${game.lastYearReadAccuracy === null ? "上一年沒有足夠方向紀錄。" : `上一年判讀命中率 ${Math.round(game.lastYearReadAccuracy * 100)}%。`}本年度 KOL 收入確定為 ${formatMoney(income)}，最高不超過 ${formatMoney(KOL_MAX_ANNUAL_INCOME)}。`,
        deltas: [`年末待入帳 ${formatMoney(income)}`, `KOL 聲量 ${signedStat(reputationDelta)}（目前 ${next.kolReputation}）`, `投資知識 +${knowledgeGain}`, `壓力 ${signedStat(stressDelta)}`, `信用 ${creditDelta > 0 ? `+${creditDelta}` : creditDelta < 0 ? `−${Math.abs(creditDelta)}` : "不變"}`],
      };
    } else if (path === "family") {
      next.achievementStats.familyIncomeYears += 1;
      const streak = game.familySupportStreak ?? 0;
      const chance = familySupportChance(game);
      const approved = random() < chance;
      const support = familySupportAmount(game);
      const fallbackIncome = 120000;
      const strain = Math.min(10, 4 + streak * 2);
      next.income = approved ? support : fallbackIncome;
      next.incomeSource = approved ? "家裡資助" : "家裡資助未通過 · 臨時零工";
      next.occupation = "無業";
      next.familySupportStreak = streak + 1;
      next.workConsecutiveYears = 0;
      if (!game.workTenureProtected) next.parttimeStreak = 0;
      next.gauges.family = clamp(next.gauges.family - (approved ? strain : 3));
      next.gauges.health = clamp(next.gauges.health - (approved ? 0 : 2));
      next.gauges.stress = clamp(next.gauges.stress + (approved ? 2 : 8));
      notice = {
        tone: approved ? "good" : "bad",
        title: approved ? "家人答應支援，餐桌上也多了一張隱形對帳單。" : "家人沒有點頭，你只好先接臨時零工。",
        body: approved ? `本年度獲得 ${formatMoney(support)} 資助，不計入負債並在年度結算時入帳。連續伸手仍會降低關係與下次核准率。` : `本次資助未通過；你臨時工作補進 ${formatMoney(fallbackIncome)} 年收入，代價是健康 −2、壓力 +8。生活費仍照常發生。`,
        deltas: [`年末待入帳 ${approved ? formatMoney(support) : formatMoney(fallbackIncome)}`, `家庭關係 −${approved ? strain : 3}`, `壓力 +${approved ? 2 : 8}`, ...(!approved ? ["健康 −2"] : []), `連續申請 ${streak + 1} 年`],
      };
    } else {
      next.achievementStats.parttimeYears += 1;
      const streak = (game.parttimeStreak ?? 0) + 1;
      const consecutiveYears = (game.workConsecutiveYears ?? 0) + 1;
      const healthCost = workHealthCost(consecutiveYears);
      const income = outsideWorkIncome(streak);
      next.income = income;
      next.incomeSource = streak >= WORK_RAISE_STREAK ? "外出打工 · 資深薪資" : "外出打工";
      next.occupation = "麥當當員工";
      next.familySupportStreak = 0;
      next.parttimeStreak = streak;
      next.workConsecutiveYears = consecutiveYears;
      const tenureJustUnlocked = !game.workTenureProtected && streak >= WORK_TENURE_PROTECTION_STREAK;
      next.workTenureProtected = game.workTenureProtected || tenureJustUnlocked;
      next.gauges.health = clamp(next.gauges.health - healthCost);
      next.gauges.stress = clamp(next.gauges.stress + 8);
      notice = {
        tone: "flat",
        title: tenureJustUnlocked ? "連續工作滿三年，這份年資終於不會蒸發。" : streak >= WORK_RAISE_STREAK ? "老闆終於承認你不是新人。" : "白天服務客人，晚上服務券商。",
        body: tenureJustUnlocked
          ? `這是第 ${streak} 年工作，年薪為 ${formatMoney(income)}。你已解鎖永久年資保留；以後即使中途改做 KOL 或接受家裡資助，再回來工作仍會沿用目前年資與薪資級距。`
          : streak >= WORK_RAISE_STREAK
            ? `目前工作年資第 ${streak} 年，年薪提高為 ${formatMoney(income)}，將在年度結算時入帳。${game.workTenureProtected ? "永久年資已保留，即使中途換跑道也不會歸零。" : "第 3 年可解鎖永久年資保留；之後每年薪資再調升 4%。"}`
          : `連續打工第 ${streak} 年，你換到穩定的 ${formatMoney(income)} 年收入；連續第 3 年起會提高為 ${formatMoney(EXPERIENCED_WORK_BASE_INCOME)}，之後每年再調升 4%。`,
        deltas: [`年末待入帳 ${formatMoney(income)}`, `${next.workTenureProtected ? "保留年資" : "工作年資"} ${streak} 年`, `連續工作 ${consecutiveYears} 年`, ...(tenureJustUnlocked ? ["永久年資保留 已解鎖"] : []), `健康 −${healthCost}`, "壓力 +8", "投資知識不變"],
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
      next.gauges.health = clamp(next.gauges.health + 1);
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
    const livingCost = annualLivingCost(current.year);
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
    const assets = current.assets
      .filter((asset) => asset.category !== "房地產")
      .map((asset) => appliedToTrackedLoans > 0 ? { ...asset, loan: (asset.loan ?? 0) * loanFactor } : asset);
    const gauges = { ...current.gauges };
    const generalDebtAfter = Math.max(0, debt - (current.familyDebt ?? 0));
    const generalDebtPressure = generalDebtAfter > Math.max(1000000, incomeAdded * 4) ? 2 : generalDebtAfter > Math.max(500000, incomeAdded * 2) ? 1 : 0;
    const missedCreditPayment = creditPaymentShortfall >= 1;
    const debtPressure = generalDebtPressure;
    const annualHealthRecovery = gauges.stress < 35 ? 3 : 1;
    gauges.health = clamp(gauges.health - Math.max(0, Math.round((gauges.stress - 55) / 12)) + annualHealthRecovery);
    gauges.stress = clamp(gauges.stress - 5 + (liquidityDebtAdded > 0 ? 6 : 0) + (missedCreditPayment ? 7 : 0) + debtPressure);
    gauges.credit = clamp(gauges.credit + (liquidityDebtAdded > 0 ? -6 : missedCreditPayment ? -5 : 2));
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
      income: 0,
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
    setResetConfirmationOpen(false);
    setGame(null);
    setSeedInput(randomSeedCode());
    setAssetsOpen(false);
    setDebtsOpen(false);
    setIntelOpen(false);
    setIntelView("active");
    setPendingReduction(null);
    setPositionTradeTarget(null);
    setPositionTradeNotice(null);
    setQuarterSurprise(null);
    setDebtAction(null);
    setMortgageTargetId(null);
    setDebtNotice(null);
    setIncomeNotice(null);
    setFamilyEvent(null);
    setIllnessEvent(null);
    setIllnessNotice(null);
    setHistoryOpen(false);
    setPropertyReview(null);
    setPropertyReviewResolving(false);
    setBrokerOpen(false);
    setBrokerCategory("台股");
    setBrokerNotice(null);
    setQuarterReport(null);
    setScreenshotState("idle");
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
    if (!game || !endingCardRef.current || screenshotState === "saving") return;
    setScreenshotState("saving");
    try {
      const blob = await endingCardPng(endingCardRef.current);
      const objectUrl = URL.createObjectURL(blob);
      const safeName = game.name.replace(/[\\/:*?"<>|]/g, "-").trim().slice(0, 20) || "韭菜";
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `韭菜人生-${safeName}-${game.seedCode}-${GAME_VERSION}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setScreenshotState("saved");
    } catch {
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
            <span>靠打工、家裡支援或經營投資帳號活下去——直到存到三千萬，或先被市場退休。</span>
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
          <small>純屬娛樂，不構成投資建議 · 每輪約 10–20 分鐘</small>
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
          <small>製作人：傑佛瑞老割</small>
        </div>
      </main>
    );
  }

  const gaugeRows: [string, GaugeKey][] = [["健康", "health"], ["壓力", "stress"], ["家庭關係", "family"], ["投資知識", "knowledge"], ["信用", "credit"]];
  const ending = titleForEnding(game);
  const achievementResults = achievementsFor(game);
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
  const surpriseMinimumAdd = surprisePosition?.category === "房地產" ? propertyDownPayment(game, surprisePosition.name) : 3000;
  const surpriseCanAdd = surpriseAvailableCash >= surpriseMinimumAdd;
  const surpriseAddCost = surprisePosition?.category === "房地產"
    ? surpriseMinimumAdd
    : surpriseCanAdd ? Math.min(surpriseAvailableCash, Math.max(3000, surpriseAvailableCash * .25)) : surpriseMinimumAdd;
  const debtActionEyebrow = debtAction === "borrow" ? "負債管理 · 家庭借款申請"
    : debtAction === "repay" ? "負債管理 · 償還家人"
      : debtAction === "creditBorrow" ? "負債管理 · 銀行信貸申請"
        : "負債管理 · 償還信貸本金";
  const dashboardAlert = game.gauges.health <= 20 ? "健康已進入危險區，身體正在發出警訊。"
    : game.gauges.stress >= 80 ? "目前處於高壓狀態，身心負荷已明顯升高。"
      : null;
  const activeSignalIds = new Set((game.activeSignals ?? []).map((signal) => signal.id));
  const latestIntelRecords = (game.intelRecords ?? []).slice(0, 2);
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
  const currentEventIntel = currentEventTargets.map((target, index) => {
    const signals = (game.activeSignals ?? []).filter((signal) => signal.targetCategory === target.category && signal.targetName === target.name);
    return {
      target,
      role: index === 0 ? "primary" as const : "linked" as const,
      record: latestIntelRecords.find((record) => record.targetCategory === target.category && record.targetName === target.name),
      signals,
      summary: summarizeVisibleSignals(signals, game.intelRecords ?? []),
    };
  });
  const renderIntelGroup = (records: IntelRecord[]) => {
    const orderedRecords = [...records].sort((left, right) => intelRoleOf(left) === intelRoleOf(right) ? 0 : intelRoleOf(left) === "primary" ? -1 : 1);
    const first = orderedRecords[0];
    if (!first) return null;
    const groupIsActive = orderedRecords.some((record) => activeSignalIds.has(record.id));
    return <article className="intel-row intel-group-card" key={first.groupId || first.id}>
      <div className="intel-group-heading"><span>{first.period}</span><em className={groupIsActive ? "active" : "expired"}>{groupIsActive ? "部分或全部生效中" : "已到期"}</em></div>
      <h3>{first.topic}</h3>
      <div className="intel-target-list">{orderedRecords.map((record) => {
        const signal = (game.activeSignals ?? []).find((item) => item.id === record.id);
        const role = intelRoleOf(record);
        return <section className={`intel-target-item intel-target-${role}`} key={record.id}>
          <div><em>{role === "primary" ? "主要標的" : "連動標的"}</em><b>{record.targetCategory} · 「{record.targetName}」</b><AssetQuoteLabel asset={{ category: record.targetCategory, name: record.targetName }} game={game} /><i>{signal ? `剩 ${signal.remainingMonths} 月` : "已到期"}</i></div>
          <p>{record.clue}</p><small>{record.actionLabel} · {record.durationLabel}{record.opportunityLabel ? ` · ${record.opportunityLabel}` : ""}</small>
        </section>;
      })}</div>
    </article>;
  };

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">韭</span><div><strong>韭菜人生模擬器</strong><small>JIU-CAI LIFE</small></div></div>
        <div className="top-actions"><span className="year-label">第 {game.year} 年 · 種子 {game.seedCode}</span><b className="age-pill">{game.age} 歲</b><button className="text-button history-button" onClick={() => setHistoryOpen(true)}>最近紀錄</button><button className="text-button" onClick={resetGame}>重開人生</button></div>
      </header>

      <div className="layout">
        <aside className="dashboard" id="financial-dashboard">
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
              return <div className="asset-row" key={asset.id}><span><i>{asset.category}{asset.category === "房地產" ? ` · 第${asset.unit ?? 1}間` : ""}</i><b>{asset.name}</b>{asset.category === "房地產" && <small className="property-cashflow-hint">{asset.name === RENTAL_PROPERTY_NAME ? "年租金約1.8% · 持有成本約0.4%" : "年省居住支出9.6萬 · 持有成本約0.4%"}</small>}{(asset.bearQuarters ?? 0) > 0 && <small className="trend-badge trend-down">空頭壓力剩 {asset.bearQuarters} 季 · 跌≥75%</small>}{(asset.bullQuarters ?? 0) > 0 && <small className="trend-badge trend-up">多頭慣性剩 {asset.bullQuarters} 季 · 漲≥65%</small>}</span><span><b>{formatMoney(asset.value)}</b><em className={profit >= 0 ? "positive" : "negative"}>{profit >= 0 ? "+" : ""}{((profit / Math.max(asset.cost, 1)) * 100).toFixed(1)}%</em>{(asset.loan ?? 0) > 0 && <small className="asset-loan">{asset.category === "房地產" ? "房貸" : "槓桿本金"} {formatMoney(asset.loan ?? 0)}</small>}</span></div>;
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
          <div className="mobile-snapshot" aria-label="財務與身心狀態摘要"><div><span>現金</span><b>{formatMoney(game.cash)}</b></div><div><span>淨資產</span><b className={netWorth(game) < 0 ? "negative" : ""}>{formatMoney(netWorth(game))}</b></div><div><span>健康</span><b>{game.gauges.health}</b></div><div><span>壓力</span><b>{game.gauges.stress}</b></div><a href="#financial-dashboard">查看完整狀態 ↓</a></div>
          <nav className="progress" aria-label="四季進度">
            {seasons.map((seasonName, index) => <span key={seasonName} className={game.phase === "season" && game.season === index ? "active" : game.phase === "summary" || game.phase === "ending" || (game.phase === "season" && game.season > index) ? "done" : ""}>{seasonName}季</span>)}
          </nav>

          {game.phase === "ending" || game.gauges.health <= 0 ? <article className="event-card ending-card" ref={endingCardRef}>
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
              <div className="achievement-heading"><div><span>本局成就</span><h2 id="achievement-title">解鎖 {unlockedAchievementResults.length}／{achievementResults.length}</h2></div><b>{unlockedAchievementResults.length ? "你的傷疤已成功鑄成徽章。" : "這局先留下經驗，徽章下次再拿。"}</b></div>
              {unlockedAchievementResults.length > 0 && <div className="achievement-unlocked-list">
                {unlockedAchievementResults.map((achievement) => <article className={`achievement-card unlocked tier-${achievement.tier}`} key={achievement.id}><div><span>✓ 已解鎖</span><em>{achievement.tier}</em></div><h3>{achievement.title}</h3><p>{achievement.description}</p><small>{achievement.progress}</small></article>)}
              </div>}
              <details className="achievement-catalog">
                <summary>查看全部成就與本局進度 <span>＋</span></summary>
                <div className="achievement-grid">
                  {achievementResults.map((achievement) => <article className={`achievement-card ${achievement.unlocked ? "unlocked" : "locked"} tier-${achievement.tier}`} key={achievement.id}><div><span>{achievement.unlocked ? "✓ 已解鎖" : "○ 未解鎖"}</span><em>{achievement.tier}</em></div><h3>{achievement.title}</h3><p>{achievement.description}</p><small>{achievement.progress}</small></article>)}
                </div>
              </details>
            </section>
            <div className="ending-actions" data-screenshot-control>
              <button className="ending-screenshot-button" type="button" disabled={screenshotState === "saving"} onClick={saveEndingScreenshot}><span>⇩</span><b>{screenshotState === "saving" ? "正在產生圖片…" : screenshotState === "saved" ? "已儲存，再截一次" : "儲存結算截圖"}</b><small>下載 PNG · 不包含操作按鈕</small></button>
              <button className="primary" onClick={resetGame}>再活一次 <span>↻</span></button>
            </div>
            <p className={`ending-screenshot-status ${screenshotState}`} data-screenshot-control aria-live="polite">{screenshotState === "saved" ? "結算圖片已下載到你的裝置。" : screenshotState === "error" ? "圖片產生失敗，請再試一次。" : ""}</p>
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
            <div className="surprise-rule"><span>成真：順消息方向、波動放大至 1.2～1.7 倍</span><span>反轉：逆消息方向、波動放大至 1.2～1.7 倍</span></div>
            <p className="question">{surprisePosition ? "消息尚未證實，你要怎麼處理這筆持倉？" : "消息尚未證實，你目前沒有這項資產，要怎麼回應？"}</p>
            <div className={`choices surprise-choices ${surprisePosition ? "surprise-position-actions" : "surprise-watch-actions"}`}>
              {surprisePosition ? <>
                <button onClick={() => revealQuarterSurprise("hold")}><span>A</span><b>維持倉位</b><small>不改變持倉，完整承受消息成真或反轉的本月波動。</small><div className="choice-meta"><em className="risk-tag risk-steady">部位 不動</em><em className="money-hint">現金不變</em></div></button>
                <button disabled={!surpriseCanAdd} onClick={() => revealQuarterSurprise("add")}><span>B</span><b>{surprisePosition.category === "房地產" ? "再買 1 間" : "繼續加倉"}</b><small>{surpriseCanAdd ? `消息揭曉前投入 ${formatMoney(surpriseAddCost)}，新增部位一起承受波動。` : `現金不足，需要 ${formatMoney(surpriseAddCost)}。`}</small><div className="choice-meta"><em className="risk-tag risk-bold">部位 加碼</em><em className="money-hint">{surprisePosition.category === "房地產" ? "增加 1 間" : "可用現金 25%"}</em></div></button>
                <button onClick={() => revealQuarterSurprise("close")}><span>C</span><b>{surprisePosition.category === "房地產" ? "整間出售" : "全部平倉"}</b><small>按消息揭曉前的市值賣出，避開下跌，也可能錯過上漲。</small><div className="choice-meta"><em className="risk-tag risk-bold">部位 清空</em><em className="money-hint">賣出 100%</em></div></button>
              </> : <>
                <button onClick={() => revealQuarterSurprise("hold")}><span>A</span><b>保持觀望</b><small>不建立部位，只看消息最後成真還是反轉。</small><div className="choice-meta"><em className="risk-tag risk-steady">部位 觀望</em><em className="money-hint">持倉損益 0</em></div></button>
                <button disabled={!surpriseCanAdd} onClick={() => revealQuarterSurprise("add")}><span>B</span><b>建立部位</b><small>{surpriseCanAdd ? `投入 ${formatMoney(surpriseAddCost)}，立即參與本次波動。` : "現金不足，至少需要 NT$ 3,000。"}</small><div className="choice-meta"><em className="risk-tag risk-bold">部位 買進</em><em className="money-hint">可用現金 25%</em></div></button>
                <button onClick={() => revealQuarterSurprise("hold", "research")}><span>C</span><b>先查證消息</b><small>不建立部位，交叉驗證來源並增加投資知識。</small><div className="choice-meta"><em className="risk-tag risk-safe">情報 查證</em><em className="money-hint">投資知識 +4</em></div></button>
              </>}
            </div>
          </article> : game.result ? <article className={`event-card result-card tone-${game.result.tone}`}>
            <p className="eyebrow green">{periodLabel(game)} · 第 {game.month + 1} 次事件 · {game.result.eyebrow}</p><div className="result-symbol">{game.result.tone === "good" ? "↗" : game.result.tone === "bad" ? "↘" : "→"}</div><h1>{game.result.title}</h1><p className="lede">{game.result.body}</p><div className="delta-list">{game.result.deltas.map((delta) => <span className={deltaClassName(delta)} key={delta}>{delta}</span>)}</div><details className="result-calculation"><summary>查看計算詳情</summary><div className="result-detail">{game.result.detail}</div></details><button className="primary" onClick={propertyReviewResolving ? continueAfterPropertyReview : continueAfterResult}>{propertyReviewResolving ? "回到本次市場事件" : "進入本次券商 APP"} <span>→</span></button>
          </article> : propertyReview && propertyReviewPosition ? <article className="event-card">
            <p className="eyebrow green">{game.age} 歲 · {periodLabel(game)} · 持有滿六個月額外房務事件</p>
            <div className="event-impact-tag"><span>本次房務標的</span><b>房地產 · 「第{propertyReviewPosition.unit ?? 1}間{propertyReviewPosition.name}」</b><i className="target-price">{formatMoney(propertyReviewPosition.value)}</i></div>
            <h1>{propertyReview.event.title}</h1><p className="lede">{propertyReview.event.body}</p><div className="quote">「{propertyReview.event.quote}」<span>— {propertyReview.event.source}</span></div>
            <p className="question">這是額外房務情報，不占用本月市場事件；判讀會寫入情報庫並影響後續房價機率。</p>
            <div className="choices">{propertyReviewChoices.map((choice, index) => {
              return <button key={choice.label} onClick={() => choosePropertyReviewOption(choice)}>
                <span>{String.fromCharCode(65 + index)}</span><b>{choice.label}</b><small>{choice.desc}</small>
                <div className="choice-meta"><em className={`risk-tag risk-${choice.risk}`}>風險 {riskLabel(choice.risk)}</em>{choiceMoneyHint(game, choice) && <em className="money-hint">{choiceMoneyHint(game, choice)}</em>}</div>
                <em className="asset-target">房務焦點｜房地產 · 「{propertyReviewPosition.name}」 · 第{propertyReviewPosition.unit ?? 1}間</em>
              </button>;
            })}</div>
          </article> : currentEvent && <article className="event-card">
            <p className="eyebrow green">{game.age} 歲 · {periodLabel(game)}第 {game.month + 1} 次事件 · {currentEvent.tag}</p>
            {currentEventTargets.length > 0 && <div className="event-impact-tag event-impact-pair">{currentEventTargets.map((target, index) => <div key={`${target.category}:${target.name}`}><span>{index === 0 ? "主要標的" : "連動標的"}</span><b>{target.category} · 「{target.name}」</b><AssetQuoteLabel asset={target} game={game} /></div>)}</div>}
            {currentAdvisorSignal && <div className={`advisor-signal-card advisor-${currentAdvisorSignal.claimedDirection}`}><span>{currentAdvisorSignal.claimedDirection === "bullish" ? "老師喊多 ↗" : "老師喊空 ↘"}</span><b>{currentAdvisorSignal.label} · 參考命中率 {Math.round(currentAdvisorSignal.accuracy * 100)}%</b><small>{currentAdvisorSignal.warning}</small></div>}
            <h1>{currentEvent.title}</h1><p className="lede">{currentEvent.body}</p><div className="quote">「{currentEvent.quote}」<span>— {currentEvent.source}</span></div><p className="question">主要標的影響較強、可延續 1～2 季；連動標的影響較弱且只維持 1 季。判讀後，再到券商 APP 自由買賣。</p><div className="choices">
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
            <div><p className="eyebrow green">{game.age} 歲 · {periodLabel(game)}第 {game.month + 1} 次事件 · 自主交易時間</p><h2 id="broker-title">韭菜證券</h2><span>主要與連動情報分開判讀，買賣由你決定。</span></div>
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
            <div className="broker-intelligence-targets">{currentEventIntel.length ? currentEventIntel.map((item) => <article className={`broker-intelligence-item broker-intelligence-${item.role}`} key={`${item.target.category}:${item.target.name}`}>
              <div><em>{item.role === "primary" ? "主要標的" : "連動標的"}</em><b>{item.target.category} · 「{item.target.name}」</b><AssetQuoteLabel asset={item.target} game={game} />{item.signals.length > 0 && <i className={`broker-intel-summary signal-${item.summary.tone}`}>{item.summary.label} · {item.summary.detail}</i>}</div>
              <p>{item.record ? `${item.record.clue} ${item.record.durationLabel}${item.record.opportunityLabel ? `；${item.record.opportunityLabel}` : ""}` : "尚未取得本次判讀。"}</p>
            </article>) : <p>沒有標的焦點；可以回到情報庫查看過去線索。</p>}</div>
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
              const activeAssetSignals = (game.activeSignals ?? []).filter((signal) => signal.targetCategory === asset.category && signal.targetName === asset.name);
              const assetSignalSummary = summarizeVisibleSignals(activeAssetSignals, game.intelRecords ?? []);
              const isProperty = asset.category === "房地產";
              const downPayment = isProperty ? propertyDownPayment(game, asset.name) : 0;
              return <article className="broker-asset-card" key={`${asset.category}-${asset.name}`}>
                <div className="broker-asset-info">
                  <h3>「{asset.name}」</h3><AssetQuoteLabel asset={asset} game={game} className="broker-quote" label="即時報價" /><AssetMiniTrend asset={asset} game={game} />
                  {positions.length ? <p>持有 {isProperty ? `${positions.length} 間` : formatMoney(heldValue)} · <em className={profit >= 0 ? "positive" : "negative"}>{profit >= 0 ? "+" : "−"}{formatMoney(Math.abs(profit)).replace("NT$ ", "")}</em></p> : <p>目前未持有</p>}
                  {activeAssetSignals.length > 0 && <small className={`broker-signal-badge signal-${assetSignalSummary.tone}`}><b>{assetSignalSummary.label}</b> · {assetSignalSummary.detail}</small>}
                  {isProperty && <small>單間 {formatMoney(propertyUnitPrice(asset.name))} · 自備款 {formatMoney(downPayment)} · 房貸上限 {formatMoney(maximumPropertyMortgage(game, asset.name))}</small>}
                </div>
                <div className="broker-actions">
                  {isProperty ? <>
                    <button disabled={game.cash < downPayment} onClick={() => brokerBuy(asset)}>買 1 間</button>
                    {positions.map((position) => <button className="sell" onClick={() => brokerSell(position, 1)} key={position.id}>賣第{position.unit ?? 1}間</button>)}
                  </> : <>
                    <div><span>買進</span><button disabled={game.cash < 3000} onClick={() => brokerBuy(asset, .25)}>25%</button><button disabled={game.cash < 3000} onClick={() => brokerBuy(asset, .5)}>50%</button><button disabled={game.cash < 3000} onClick={() => brokerBuy(asset, 1)}>MAX</button></div>
                    {positions[0] && <div><span>賣出</span>{game.specialTrait !== "紙手體質" && <><button className="sell" onClick={() => brokerSell(positions[0], .25)}>25%</button><button className="sell" onClick={() => brokerSell(positions[0], .5)}>50%</button></>}<button className="sell" onClick={() => brokerSell(positions[0], 1)}>ALL</button></div>}
                  </>}
                </div>
              </article>;
            })}
          </div>
          <footer className="broker-footer"><span>畫面為模擬單位報價；交易仍依投入金額計算。買進手續費 0.1425%，賣出依商品別計入交易成本。</span><b>{game.specialTrait === "紙手體質" ? "紙手體質：賣出時只能全部清倉。" : "你可以在本季內反覆調整，按下結算才會推進時間。"}</b></footer>
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
      {positionTradeTarget && game.gauges.health > 0 && <div className="decision-overlay position-trade-overlay" role="presentation" onMouseDown={() => { setPositionTradeTarget(null); setPositionTradeNotice(null); }}>
        <section className="decision-dialog position-trade-dialog" role="dialog" aria-modal="true" aria-labelledby="position-trade-title" onMouseDown={(event) => event.stopPropagation()}>
          <p className="eyebrow green">自主資產管理 · {positionTradeTarget.category}</p>
          {positionTradeNotice ? <>
            <h2 id="position-trade-title">{positionTradeNotice.title}</h2>
            <p>{positionTradeNotice.body}</p>
            <div className="delta-list">{positionTradeNotice.deltas.map((delta) => <span className={deltaClassName(delta)} key={delta}>{delta}</span>)}</div>
            <button className="primary" onClick={() => { setPositionTradeTarget(null); setPositionTradeNotice(null); }}>回到本次事件 <span>→</span></button>
          </> : <>
            <h2 id="position-trade-title">要賣多少<br/>「{positionTradeTarget.name}」？</h2>
            <div className="position-trade-snapshot"><span>目前市值 <b>{formatMoney(positionTradeTarget.value)}</b></span><span>帳面損益 <b className={positionTradeTarget.value >= positionTradeTarget.cost ? "positive" : "negative"}>{positionTradeTarget.value >= positionTradeTarget.cost ? "+" : "−"}{formatMoney(Math.abs(positionTradeTarget.value - positionTradeTarget.cost)).replace("NT$ ", "")}</b></span></div>
            <p>你可以直接指定這筆持倉賣出，不必等待相關事件出現。交易完成後，本月題目與月份進度都會保留。</p>
            <div className={`decision-actions ${game.specialTrait === "紙手體質" ? "single-action" : ""}`}>
              {game.specialTrait !== "紙手體質" && <button className="primary" onClick={() => confirmPositionTrade(.5)}>減碼 50% <span>½</span></button>}
              <button className="danger-button" onClick={() => confirmPositionTrade(1)}>全部賣出 <span>×</span></button>
            </div>
            {game.specialTrait === "紙手體質" && <p className="paper-hands-warning">紙手體質觸發：自主賣出時只能整筆清倉。</p>}
            <button className="text-button cancel-reduction" onClick={() => { setPositionTradeTarget(null); setPositionTradeNotice(null); }}>取消，維持這筆部位</button>
          </>}
        </section>
      </div>}
      {debtAction && game.gauges.health > 0 && <div className="decision-overlay" role="presentation" onMouseDown={() => { setDebtAction(null); setDebtNotice(null); setMortgageTargetId(null); }}>
        <section className={`decision-dialog debt-dialog ${debtNotice ? `debt-notice-${debtNotice.tone}` : ""}`} role="dialog" aria-modal="true" aria-labelledby="debt-action-title" onMouseDown={(event) => event.stopPropagation()}>
          <p className="eyebrow green">{debtActionEyebrow}</p>
          {debtNotice ? <>
            <h2 id="debt-action-title">{debtNotice.title}</h2><p>{debtNotice.body}</p>
            <button className="primary" onClick={() => { setDebtAction(null); setDebtNotice(null); setMortgageTargetId(null); }}>知道了 <span>→</span></button>
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
          <p>本年固定生活費為 {formatMoney(annualLivingCost(game.year))}，收入會在年度結算時入帳。每年必須選擇一次，選定後不能反悔。</p>
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
            <button onClick={() => chooseIncomePath("kol")}><span>A</span><b>投資KOL</b><small>{game.year === 1 ? "職業更新為投資KOL · 冷啟動期 · 收入 0～6 萬 · 小爆紅機率約 12%" : `職業更新為投資KOL · 收入 0～156 萬 · 目前好結果機率約 ${Math.round(kolSuccessChance(game) * 100)}% · 連動知識、去年判讀戰績、聲量與壓力`}</small></button>
            <button onClick={() => chooseIncomePath("family")}><span>B</span><b>無業</b><small>職業更新為無業 · 接受家裡資助；目前核准率約 {Math.round(familySupportChance(game) * 100)}% · 若遭拒會改接12萬元臨時零工</small></button>
            <button onClick={() => chooseIncomePath("parttime")}><span>C</span><b>麥當當員工</b><small>職業更新為麥當當員工 · {game.workTenureProtected ? `永久年資已保留 · 目前 ${game.parttimeStreak} 年` : `目前工作年資 ${game.parttimeStreak} 年 · 滿3年永久保留`} · 已連續工作 ${game.workConsecutiveYears ?? 0} 年 · 本次年薪 {formatMoney(outsideWorkIncome(game.parttimeStreak + 1))} · 本次健康 −{workHealthCost((game.workConsecutiveYears ?? 0) + 1)}、壓力 +8</small></button>
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
      {familyEvent && game.gauges.health > 0 && <div className="decision-overlay family-event-overlay" role="presentation">
        <section className="decision-dialog family-event-dialog" role="dialog" aria-modal="true" aria-labelledby="family-event-title">
          <p className="eyebrow green">不定時家庭事件</p>
          <h2 id="family-event-title">{familyEvent.title}</h2>
          <p>{familyEvent.body}</p>
          <div className="family-event-quote">「{familyEvent.quote}」</div>
          <div className="family-choice-list">
            <button onClick={() => resolveFamilyEvent("time")}><b>花時間陪伴處理</b><small>支出少量現金、家庭關係 +10、壓力 −3、健康 +1</small></button>
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
