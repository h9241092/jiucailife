"use client";

import { useEffect, useRef, useState } from "react";

import type { RunsExportPage } from "@/lib/analytics-runs-export";

export default function ExportRunsButton() {
  const pending = useRef<AbortController | null>(null);
  const [exporting, setExporting] = useState(false);
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => () => pending.current?.abort(), []);

  async function exportRuns() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setExporting(true);
    setCount(0);
    setMessage("");
    setFailed(false);
    try {
      const chunks: BlobPart[] = [];
      let cursor: string | null = null;
      let filename = "jiucai-all-runs.csv";
      let downloaded = 0;
      do {
        const response = await fetch(`/api/admin/runs-export${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, {
          credentials: "same-origin", cache: "no-store", signal: controller.signal,
        });
        if (response.status === 401) throw new Error("登入已失效，請重新登入後台後再匯出。");
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
          throw new Error("匯出失敗，請稍後重試；尚未下載不完整的檔案。");
        }
        const page: RunsExportPage = await response.json();
        if (typeof page.csv !== "string" || !Number.isSafeInteger(page.count) || page.count < 0
          || (page.nextCursor !== null && typeof page.nextCursor !== "string")
          || (page.nextCursor !== null && (page.nextCursor === cursor || page.count === 0))
          || typeof page.filename !== "string") {
          throw new Error("匯出資料不完整，請重新匯出。");
        }
        chunks.push(page.csv);
        downloaded += page.count;
        setCount(downloaded);
        filename = page.filename;
        cursor = page.nextCursor;
      } while (cursor);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(new Blob(chunks, { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage(`已產生 ${downloaded.toLocaleString("zh-TW")} 局的 CSV；可使用 Excel 開啟。`);
    } catch (error) {
      if (!controller.signal.aborted) {
        setFailed(true);
        setMessage(error instanceof Error ? error.message : "匯出失敗，請稍後重試。");
      }
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setExporting(false);
    }
  }

  return <div className="analytics-export">
    <button type="button" onClick={exportRuns} disabled={exporting}>
      {exporting ? `匯出中… ${count.toLocaleString("zh-TW")} 局` : "匯出全部紀錄 CSV"}
    </button>
    <p role="status" aria-live="polite" className={failed ? "analytics-export-error" : ""}>
      {message || (exporting ? "正在讀取全部紀錄，請勿關閉頁面。" : "匯出所有尚保留的局次，不限畫面上的 20 局。")}
    </p>
    {failed && <a href="/admin/login">重新登入後台</a>}
  </div>;
}
