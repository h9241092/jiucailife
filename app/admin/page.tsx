/* eslint-disable @next/next/no-html-link-for-pages -- Vinext's Link prefetch runtime currently errors on this dynamic D1 page. */
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isAnalyticsAdmin } from "@/lib/admin-auth";
import { readAnalyticsReport, readMetric, type MetricRow } from "@/lib/analytics-report";
import { metricDimensionLabel, type LocalizedMetric } from "@/lib/analytics-metric-labels";
import { runPositionLabel, runStatusLabel as statusLabel, runTimeLabel } from "@/lib/analytics-run-format";
import ExportRunsButton from "./export-runs-button";

import "./admin.css";
import "./metric-labels.css";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 });
const formatMoney = (value: number) => `${value < 0 ? "−" : ""}NT$ ${money.format(Math.abs(Math.round(value)))}`;
const percentage = (value: number, total: number) => total ? `${(value / total * 100).toFixed(1)}%` : "0.0%";

function MetricList({ title, rows, metric, empty = "尚無資料" }: { title: string; rows: MetricRow[]; metric?: LocalizedMetric; empty?: string }) {
  const highest = Math.max(1, ...rows.map((row) => row.count));
  return <section className={`analytics-panel analytics-ranking${metric ? " analytics-localized" : ""}`}>
    <header><h2>{title}</h2><span>近 180 天</span></header>
    {rows.length ? <ol>{rows.map((row) => <li key={row.dimension}>
      <div><b>{metricDimensionLabel(metric, row.dimension)}</b><span>{money.format(row.count)} 次</span></div>
      <i><em style={{ width: `${Math.max(3, row.count / highest * 100)}%` }} /></i>
    </li>)}</ol> : <p className="analytics-empty">{empty}</p>}
  </section>;
}

export default async function AnalyticsAdminPage() {
  const requestHeaders = await headers();
  if (!await isAnalyticsAdmin(requestHeaders)) redirect("/admin/login");
  const { db, summary, daily, recentRuns } = await readAnalyticsReport();
  const [eventChoices, incomeChoices, trades, endings, achievements, illnessChoices, familyChoices, surprises] = await Promise.all([
    readMetric(db, "event_choices", 6),
    readMetric(db, "income_choices", 6),
    readMetric(db, "trades", 10),
    readMetric(db, "endings", 10),
    readMetric(db, "achievements", 10),
    readMetric(db, "illness_choices", 10),
    readMetric(db, "family_choices", 6),
    readMetric(db, "surprises", 10),
  ]);
  const dailyPeak = Math.max(1, ...daily.map((day) => Math.max(day.started, day.completed, day.abandoned)));

  return <main className="analytics-admin">
    <header className="analytics-hero">
      <div><p>韭菜人生模擬器 · 製作人專用</p><h1>匿名遊玩統計</h1><span>資料不包含角色姓名、裝置指紋或玩家帳號；原始局次保存 180 天。</span></div>
      <nav><a href="/">返回遊戲</a><a href="/api/admin/analytics.csv">匯出 CSV</a><form method="post" action="/api/admin/logout"><button type="submit">登出</button></form></nav>
    </header>

    <section className="analytics-kpis" aria-label="核心數據">
      <article><span>匿名局次</span><b>{money.format(summary.totalRuns)}</b><small>{money.format(summary.totalEvents)} 筆操作</small></article>
      <article><span>完成率</span><b>{percentage(summary.completedRuns, summary.totalRuns)}</b><small>{summary.completedRuns} 局完成</small></article>
      <article><span>進行中</span><b>{percentage(summary.activeRuns, summary.totalRuns)}</b><small>{summary.activeRuns} 局仍有近期操作</small></article>
      <article><span>中途離場</span><b>{percentage(summary.abandonedRuns, summary.totalRuns)}</b><small>{summary.abandonedRuns} 局明確離場</small></article>
      <article><span>逾時未確認</span><b>{percentage(summary.staleRuns, summary.totalRuns)}</b><small>{summary.staleRuns} 局缺少終局訊號</small></article>
      <article><span>提前退休</span><b>{percentage(summary.earlyRetirementRuns, summary.completedRuns)}</b><small>{summary.earlyRetirementRuns} 局達成</small></article>
      <article><span>平均最終淨資產</span><b>{formatMoney(summary.averageFinalNetWorth)}</b><small>僅計完成局</small></article>
      <article><span>平均完成時間</span><b>{summary.averageCompletionMinutes} 分</b><small>伺服器時間估算</small></article>
    </section>

    <section className="analytics-panel analytics-daily">
      <header><h2>最近 30 天遊玩量</h2><div><span className="started">開始</span><span className="completed">完成</span><span className="abandoned">離場</span></div></header>
      {daily.length ? <div className="analytics-bars">{daily.map((day) => <article key={day.date}>
        <div className="bar-set"><i className="started" style={{ height: `${day.started / dailyPeak * 100}%` }} title={`開始 ${day.started}`} /><i className="completed" style={{ height: `${day.completed / dailyPeak * 100}%` }} title={`完成 ${day.completed}`} /><i className="abandoned" style={{ height: `${day.abandoned / dailyPeak * 100}%` }} title={`離場 ${day.abandoned}`} /></div>
        <span>{day.date.slice(5)}</span>
      </article>)}</div> : <p className="analytics-empty">新版統計尚未累積每日資料。</p>}
    </section>

    <section className="analytics-grid">
      <MetricList title="事件 A／B／C 選擇" rows={eventChoices} />
      <MetricList title="年度生路選擇" rows={incomeChoices} metric="income_choices" />
      <MetricList title="最常交易的標的" rows={trades} />
      <MetricList title="遊戲結局" rows={endings} />
      <MetricList title="成就達成" rows={achievements} metric="achievements" />
      <MetricList title="生病事件選擇" rows={illnessChoices} metric="illness_choices" />
      <MetricList title="家庭事件選擇" rows={familyChoices} metric="family_choices" />
      <MetricList title="季度突襲反應" rows={surprises} />
    </section>

    <section className="analytics-panel analytics-runs">
      <header className="analytics-runs-header"><section><h2>最近局次</h2><p>顯示最近 20 局／共 {money.format(summary.totalRuns)} 局；超過 30 分鐘無操作但未收到終局訊號，標為「逾時未確認」。</p></section><ExportRunsButton /></header>
      <div className="analytics-table-wrap"><table>
        <thead><tr><th>開始時間（台灣）</th><th>種子碼</th><th>版本</th><th>人物性質</th><th>狀態</th><th>最後位置</th><th>操作數</th><th>結局／淨資產</th></tr></thead>
        <tbody>{recentRuns.map((run) => <tr key={run.id}>
          <td>{runTimeLabel(run.startedAt)}</td><td><code>{run.seedCode}</code></td><td>{run.gameVersion}</td><td>{run.trait ?? "未記錄"}<small>{run.specialTrait ?? "無特殊體質"}</small></td>
          <td><span className={`run-status status-${statusLabel(run.status, run.lastSeenAt)}`}>{statusLabel(run.status, run.lastSeenAt)}</span></td>
          <td>{runPositionLabel(run.lastAge, run.lastSeason)}<small>{run.lastEventType ?? "尚無操作"}</small></td>
          <td>{run.eventCount}</td><td>{run.ending ?? "—"}<small>{run.finalNetWorth === null ? "" : formatMoney(run.finalNetWorth)}</small></td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </main>;
}
