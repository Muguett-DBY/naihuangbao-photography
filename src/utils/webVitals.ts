/**
 * Web Vitals real-user-monitoring (RUM) collector.
 *
 * Captures LCP, INP, CLS, FCP, TTFB via PerformanceObserver, batches them,
 * and ships to /api/analytics/vitals using `navigator.sendBeacon` (or fetch fallback).
 *
 * Production-only. No-op in dev to avoid noisy logs.
 */

type MetricName = "LCP" | "INP" | "CLS" | "FCP" | "TTFB";
type Rating = "good" | "needs-improvement" | "poor";

type MetricReport = {
  metric: MetricName;
  value: number;
  rating: Rating;
  page: string;
  connectionType: string | null;
};

const SEND_URL = "/api/analytics/vitals";
const FLUSH_INTERVAL_MS = 10_000;
const MAX_BATCH = 20;

let initialized = false;
const queue: MetricReport[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let pagehideListener: (() => void) | null = null;
let visibilityListener: (() => void) | null = null;

/** Public entry point — call once at app boot. */
export function initWebVitals() {
  if (initialized) return;
  if (typeof window === "undefined") return;
  if (!import.meta.env.PROD) return;
  initialized = true;

  observeLCP();
  observeINP();
  observeCLS();
  observeFCP();
  observeTTFB();

  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);

  const send = () => flush(true);
  pagehideListener = () => send();
  visibilityListener = () => {
    if (document.visibilityState === "hidden") send();
  };
  window.addEventListener("pagehide", pagehideListener);
  document.addEventListener("visibilitychange", visibilityListener);
}

function observeLCP() {
  if (!("PerformanceObserver" in window)) return;
  try {
    let lastValue = 0;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) lastValue = last.startTime;
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });
    recordOnHidden("LCP", () => lastValue);
  } catch {
    /* LCP not supported */
  }
}

function observeINP() {
  if (!("PerformanceObserver" in window)) return;
  try {
    let worst = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventTiming = entry as PerformanceEntry & { duration: number };
        if (eventTiming.duration > worst) worst = eventTiming.duration;
      }
    });
    observer.observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
    recordOnHidden("INP", () => worst);
  } catch {
    /* INP not supported */
  }
}

function observeCLS() {
  if (!("PerformanceObserver" in window)) return;
  try {
    let totalShift = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!layoutShift.hadRecentInput) totalShift += layoutShift.value;
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });
    recordOnHidden("CLS", () => totalShift);
  } catch {
    /* CLS not supported */
  }
}

function observeFCP() {
  if (!("PerformanceObserver" in window)) return;
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntriesByName("first-contentful-paint");
      const last = entries[entries.length - 1];
      if (last) enqueue({ metric: "FCP", value: last.startTime, page: currentPage() });
    });
    observer.observe({ type: "paint", buffered: true });
  } catch {
    /* FCP not supported */
  }
}

function observeTTFB() {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      const ttfb = nav.responseStart - nav.requestStart;
      enqueue({ metric: "TTFB", value: ttfb, page: currentPage() });
    }
  } catch {
    /* TTFB not available */
  }
}

function recordOnHidden(metric: MetricName, getValue: () => number) {
  const handler = () => {
    if (document.visibilityState === "hidden") {
      const value = getValue();
      if (value > 0) enqueue({ metric, value, page: currentPage() });
    }
  };
  document.addEventListener("visibilitychange", handler, { passive: true });
}

function enqueue(partial: { metric: MetricName; value: number; page: string }) {
  if (queue.length >= MAX_BATCH * 2) return;
  const rating = rate(partial.metric, partial.value);
  const report: MetricReport = {
    ...partial,
    rating,
    connectionType: readConnectionType(),
  };
  queue.push(report);
  if (queue.length >= MAX_BATCH) flush();
}

function rate(metric: MetricName, value: number): Rating {
  if (metric === "LCP") {
    if (value <= 2500) return "good";
    if (value <= 4000) return "needs-improvement";
    return "poor";
  }
  if (metric === "INP") {
    if (value <= 200) return "good";
    if (value <= 500) return "needs-improvement";
    return "poor";
  }
  if (metric === "CLS") {
    if (value <= 0.1) return "good";
    if (value <= 0.25) return "needs-improvement";
    return "poor";
  }
  if (metric === "FCP") {
    if (value <= 1800) return "good";
    if (value <= 3000) return "needs-improvement";
    return "poor";
  }
  if (metric === "TTFB") {
    if (value <= 800) return "good";
    if (value <= 1800) return "needs-improvement";
    return "poor";
  }
  return "good";
}

function readConnectionType(): string | null {
  const conn = (navigator as Navigator & {
    connection?: { effectiveType?: string };
  }).connection;
  return conn?.effectiveType ?? null;
}

function currentPage(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname.slice(0, 200);
}

function flush(force = false) {
  if (queue.length === 0) return;
  if (!force && document.visibilityState !== "hidden" && queue.length < MAX_BATCH) return;

  const batch = queue.splice(0, MAX_BATCH);
  const payload = JSON.stringify({ metrics: batch });

  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      const ok = navigator.sendBeacon(SEND_URL, blob);
      if (ok) return;
    }
  } catch {
    /* fall through to fetch */
  }

  fetch(SEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    /* silently drop — telemetry must never break the app */
  });

  if (queue.length > 0 && !force) {
    setTimeout(() => flush(false), 0);
  }
}

/** Test-only — resets the module's internal state. */
export function _resetForTests() {
  initialized = false;
  queue.length = 0;
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  if (pagehideListener) {
    window.removeEventListener("pagehide", pagehideListener);
    pagehideListener = null;
  }
  if (visibilityListener) {
    document.removeEventListener("visibilitychange", visibilityListener);
    visibilityListener = null;
  }
}

/** Test-only — exposes the rate threshold logic. */
export function _rateForTests(metric: MetricName, value: number): Rating {
  return rate(metric, value);
}
