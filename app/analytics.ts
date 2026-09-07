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
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 30000;
const terminalEventTypes = new Set<AnonymousEventType>(["run_completed", "run_abandoned"]);
let flushing = false;
let memoryQueue: QueuedAnalyticsEvent[] = [];
let retryTimer: number | null = null;
let retryAttempts = 0;

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

function trimQueue(queue: QueuedAnalyticsEvent[]) {
  if (queue.length <= MAX_QUEUE_SIZE) return queue;
  const terminalEvents = queue.filter((event) => terminalEventTypes.has(event.eventType)).slice(-MAX_QUEUE_SIZE);
  const ordinarySlots = MAX_QUEUE_SIZE - terminalEvents.length;
  const ordinaryEvents = ordinarySlots > 0
    ? queue.filter((event) => !terminalEventTypes.has(event.eventType)).slice(-ordinarySlots)
    : [];
  const retainedIds = new Set([...ordinaryEvents, ...terminalEvents].map((event) => event.eventId));
  return queue.filter((event) => retainedIds.has(event.eventId));
}

function writeQueue(queue: QueuedAnalyticsEvent[]) {
  memoryQueue = trimQueue(queue);
  if (typeof window === "undefined") return;
  try {
    if (memoryQueue.length) window.localStorage.setItem(QUEUE_KEY, JSON.stringify(memoryQueue));
    else window.localStorage.removeItem(QUEUE_KEY);
  } catch {
    // Browser storage can be unavailable in private modes; the in-memory queue still retries during this visit.
  }
}

function scheduleFlush(delayMs: number) {
  if (typeof window === "undefined" || retryTimer !== null) return;
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    void flushAnonymousAnalytics();
  }, delayMs);
}

export async function flushAnonymousAnalytics() {
  if (flushing || typeof window === "undefined" || !window.navigator.onLine) return;
  if (retryTimer !== null) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
  flushing = true;
  let retryNeeded = false;
  try {
    while (true) {
      const queue = readQueue();
      const current = queue[0];
      if (!current) break;
      let response: Response;
      try {
        response = await fetch("/api/analytics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(current),
          keepalive: true,
        });
      } catch {
        retryNeeded = true;
        break;
      }
      if (!response.ok && (response.status === 429 || response.status >= 500)) {
        retryNeeded = true;
        break;
      }
      // Re-read after the request: another event can be queued while fetch is in flight.
      // Removing from the old snapshot would overwrite and lose that newer event.
      writeQueue(readQueue().filter((event) => event.eventId !== current.eventId));
      retryAttempts = 0;
    }
  } finally {
    flushing = false;
    if (readQueue().length) {
      if (retryNeeded) retryAttempts += 1;
      const delayMs = retryNeeded
        ? Math.min(RETRY_MAX_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** Math.min(retryAttempts - 1, 5))
        : 0;
      scheduleFlush(delayMs);
    }
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
