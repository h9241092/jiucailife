import { runPositionLabel, runStatusLabel, runTimeLabel } from "./analytics-run-format";

export const RUN_EXPORT_PAGE_SIZE = 500;
export const RUN_EXPORT_COLUMNS = [
  "開始時間（台灣）", "種子碼", "版本", "人物性質", "特殊體質", "狀態",
  "最後位置", "最後操作", "操作數", "結局", "最終淨資產（NT$）", "最後操作時間（台灣）", "局次 ID",
];

type ExportRow = {
  export_rowid: number;
  id: string;
  seed_code: string;
  game_version: string;
  trait: string | null;
  special_trait: string | null;
  status: string;
  started_at: string;
  last_seen_at: string;
  last_age: number | null;
  last_season: number | null;
  last_event_type: string | null;
  event_count: number;
  ending: string | null;
  final_net_worth: number | null;
};

type ExportCursor = {
  maxRowId: number;
  beforeTime: string;
  beforeRowId: number;
  now: number;
};

export type RunsExportPage = {
  csv: string;
  count: number;
  nextCursor: string | null;
  filename: string;
};

export class InvalidExportCursor extends Error {}

function decodeCursor(value: string): ExportCursor {
  try {
    if (value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
    const parsed = JSON.parse(atob(value.replace(/-/g, "+").replace(/_/g, "/")));
    if (!parsed || !Number.isSafeInteger(parsed.maxRowId) || parsed.maxRowId < 1
      || !Number.isSafeInteger(parsed.beforeRowId) || parsed.beforeRowId < 1 || parsed.beforeRowId > parsed.maxRowId
      || !Number.isSafeInteger(parsed.now) || parsed.now < 0 || parsed.now > 8.64e15
      || typeof parsed.beforeTime !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(parsed.beforeTime)) {
      throw new Error();
    }
    return { maxRowId: parsed.maxRowId, beforeTime: parsed.beforeTime, beforeRowId: parsed.beforeRowId, now: parsed.now };
  } catch {
    throw new InvalidExportCursor("Invalid export cursor");
  }
}

function encodeCursor(cursor: ExportCursor) {
  return btoa(JSON.stringify(cursor)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function runCsvCell(value: string | number | null) {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = value ?? "";
  // Treat untrusted text as literal text in Excel, while preserving numeric losses.
  if (/^[\s\uFEFF]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text) || /^\d+$/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function rowCsv(row: ExportRow, now: number) {
  return [
    runTimeLabel(row.started_at), row.seed_code, row.game_version,
    row.trait ?? "未記錄", row.special_trait ?? "無特殊體質",
    runStatusLabel(row.status, row.last_seen_at, now), runPositionLabel(row.last_age, row.last_season),
    row.last_event_type ?? "尚無操作", row.event_count, row.ending ?? "—", row.final_net_worth,
    runTimeLabel(row.last_seen_at), row.id,
  ].map(runCsvCell).join(",");
}

export async function readRunsExportPage(db: Pick<D1Database, "prepare">, cursorValue: string | null): Promise<RunsExportPage> {
  const cursor = cursorValue === null ? null : decodeCursor(cursorValue);
  // Each request reads a bounded page. New runs cannot shift rows into or out of
  // subsequent pages; rowid also breaks ties when runs started in the same second.
  const maxRowId = cursor?.maxRowId ?? (await db.prepare("SELECT MAX(rowid) AS max_rowid FROM anonymous_runs")
    .first<{ max_rowid: number | null }>())?.max_rowid ?? 0;
  const now = cursor?.now ?? Date.now();
  const statement = db.prepare(`SELECT rowid AS export_rowid,
    id, seed_code, game_version, trait, special_trait, status, started_at, last_seen_at,
    last_age, last_season, last_event_type, event_count, ending, final_net_worth
    FROM anonymous_runs
    WHERE rowid <= ? ${cursor ? "AND (started_at, rowid) < (?, ?)" : ""}
    ORDER BY started_at DESC, rowid DESC LIMIT ?`);
  const result = await (cursor
    ? statement.bind(maxRowId, cursor.beforeTime, cursor.beforeRowId, RUN_EXPORT_PAGE_SIZE + 1)
    : statement.bind(maxRowId, RUN_EXPORT_PAGE_SIZE + 1)).all<ExportRow>();
  if (!result.success) throw new Error("Could not read run export");
  const rows = result.results.slice(0, RUN_EXPORT_PAGE_SIZE);
  const last = rows.at(-1);
  const nextCursor = result.results.length > RUN_EXPORT_PAGE_SIZE && last
    ? encodeCursor({ maxRowId, beforeTime: last.started_at, beforeRowId: last.export_rowid, now }) : null;
  const lines = rows.map((row) => rowCsv(row, now));
  if (!cursor) lines.unshift(RUN_EXPORT_COLUMNS.map(runCsvCell).join(","));
  return {
    csv: `${cursor ? "" : "\uFEFF"}${lines.length ? `${lines.join("\r\n")}\r\n` : ""}`,
    count: rows.length,
    nextCursor,
    filename: `jiucai-all-runs-${new Date(now).toISOString().slice(0, 10)}.csv`,
  };
}
