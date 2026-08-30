export type AnonymousEventType =
  | "run_started"
  | "event_presented"
  | "event_choice"
  | "income_choice"
  | "trade"
  | "debt_action"
  | "surprise_resolved"
  | "family_event"
  | "illness_event"
  | "year_completed"
  | "run_completed"
  | "run_abandoned";

type AnonymousValue = string | number | boolean | null | string[];

export const ANALYTICS_SCHEMA_VERSION = 2;

export type AnonymousAnalyticsEvent = {
  runId: string;
  eventType: AnonymousEventType;
  gameVersion: string;
  eventSequence: number;
  clientElapsedMs?: number;
  seedCode?: string;
  year?: number;
  age?: number;
  season?: number;
  month?: number;
  data?: Record<string, AnonymousValue>;
};

type QueuedAnalyticsEvent = AnonymousAnalyticsEvent & {
  eventId: string;
  schemaVersion: number;
};

const QUEUE_KEY = "jiucai-anonymous-analytics-v2";
const MAX_QUEUE_SIZE = 400;
let flushing = false;
let memoryQueue: QueuedAnalyticsEvent[] = [];

export const createAnonymousRunId = () => globalThis.crypto.randomUUID();

function readQueue() {
  if (typeof window === "undefined") return memoryQueue;
  try {
    const value = window.localStorage.getItem(QUEUE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.slice(-MAX_QUEUE_SIZE) as QueuedAnalyticsEvent[] : [];
  } catch {
    return memoryQueue;
  }
}

function writeQueue(queue: QueuedAnalyticsEvent[]) {
  memoryQueue = queue.slice(-MAX_QUEUE_SIZE);
  if (typeof window === "undefined") return;
  try {
    if (memoryQueue.length) window.localStorage.setItem(QUEUE_KEY, JSON.stringify(memoryQueue));
    else window.localStorage.removeItem(QUEUE_KEY);
  } catch {
    // Browser storage can be unavailable in private modes; the in-memory queue still retries during this visit.
  }
}

export async function flushAnonymousAnalytics() {
  if (flushing || typeof window === "undefined" || !window.navigator.onLine) return;
  flushing = true;
  try {
    let queue = readQueue();
    while (queue.length) {
      const current = queue[0];
      let response: Response;
      try {
        response = await fetch("/api/analytics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(current),
          keepalive: true,
        });
      } catch {
        break;
      }
      if (!response.ok && (response.status === 429 || response.status >= 500)) break;
      queue = queue.filter((event) => event.eventId !== current.eventId);
      writeQueue(queue);
    }
  } finally {
    flushing = false;
  }
}

export function postAnonymousAnalytics(event: AnonymousAnalyticsEvent) {
  const queued: QueuedAnalyticsEvent = {
    ...event,
    eventId: globalThis.crypto.randomUUID(),
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
  };
  writeQueue([...readQueue(), queued]);
  void flushAnonymousAnalytics();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flushAnonymousAnalytics());
  void flushAnonymousAnalytics();
}
