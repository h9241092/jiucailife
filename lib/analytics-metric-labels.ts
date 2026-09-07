// Presentation only: keep persisted metric dimensions stable across versions.
export type LocalizedMetric = "income_choices" | "achievements" | "illness_choices" | "family_choices";

const incomeLabels: Readonly<Record<string, string>> = {
  kol: "投資 KOL",
  family: "無業／家裡資助",
  parttime: "麥當當員工",
};

const achievementLabels: Readonly<Record<string, string>> = {
  earlyRetirement: "提前退休",
  retirementWaitingRoom: "退休預備席",
  marketLegend: "市場傳奇",
  fiveMillionClub: "五百萬俱樂部",
  steadyLanding: "穩健上岸",
  debtFreeMillionaire: "無債百萬富翁",
  leveragedSurvivor: "槓桿倖存者",
  workForever: "打工人的完全體",
  kolForever: "流量就是我的年薪",
  onlyTrustTrumpAdvisor: "只信川投顧",
  familyForever: "伸手牌終身會員",
  clearHead: "清醒的韭菜",
  lastBreath: "最後一滴血",
  pressureCooker: "人體壓力鍋",
  familyFirst: "家庭優先股",
  neverSick: "百病不侵",
  frequentPatient: "醫院VIP",
  surpriseCollector: "突襲收藏家",
  paperHandsWin: "紙手也能贏",
  paperHandsDiamond: "紙手變鑽石手",
  minimalist: "極簡投資家",
  diversified: "資產動物園",
};

const illnessSeverityLabels: Readonly<Record<string, string>> = {
  mild: "輕症",
  moderate: "中症",
  severe: "重症",
};
const illnessChoiceLabels: Readonly<Record<string, string>> = {
  push: "硬撐，照常工作看盤",
  treat: "就醫治療並安排休養",
  family: "請家人協助照顧",
};
const familyChoiceLabels: Readonly<Record<string, string>> = {
  time: "花時間陪伴處理",
  money: "出錢支援家裡",
  decline: "工作優先，先婉拒",
};

function labelFor(labels: Readonly<Record<string, string>>, value: string, noun: string) {
  if (Object.prototype.hasOwnProperty.call(labels, value)) return labels[value];
  if (!value || value === "all" || value === "unknown") return `未記錄${noun}`;
  // Keep unfamiliar historical/future codes visible instead of silently mislabelling them.
  return `未識別${noun}（${value}）`;
}

export function metricDimensionLabel(metric: LocalizedMetric | undefined, dimension: string): string {
  switch (metric) {
    case "income_choices": return labelFor(incomeLabels, dimension, "生路");
    case "achievements": return labelFor(achievementLabels, dimension, "成就");
    case "family_choices": return labelFor(familyChoiceLabels, dimension, "選項");
    case "illness_choices": {
      const parts = dimension.split(":");
      if (parts.length !== 2) return `未識別生病選擇（${dimension || "未記錄"}）`;
      return `${labelFor(illnessSeverityLabels, parts[0], "病況")}・${labelFor(illnessChoiceLabels, parts[1], "選項")}`;
    }
    default: return dimension;
  }
}
