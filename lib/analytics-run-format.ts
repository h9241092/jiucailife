import { taiwanTimeLabel } from "@/lib/analytics-time-label";

const seasonNames = ["春季", "夏季", "秋季", "冬季"];

export function runStatusLabel(status: string, lastSeenAt: string, now = Date.now()) {
  if (status === "completed") return "已完成";
  const timestamp = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(lastSeenAt) ? lastSeenAt : `${lastSeenAt}Z`;
  if (status === "abandoned") return "已離場";
  if (now - Date.parse(timestamp) > 30 * 60 * 1000) return "逾時未確認";
  return "進行中";
}

export function runPositionLabel(age: number | null, season: number | null) {
  return age ? `${age} 歲 · ${seasonNames[season ?? 0] ?? "未知"}` : "剛開始";
}

export function runTimeLabel(value: string) {
  return taiwanTimeLabel(value);
}
