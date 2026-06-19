/**
 * Lightweight client-side event tracking utility.
 * Sends structured events to /api/analytics/event via sendBeacon (or fetch fallback).
 *
 * Production-only by default. No-op in dev to avoid noisy logs.
 *
 * Usage:
 *   track("gallery_view", { photoId: "abc123", style: "jiangnan" });
 *   track("booking_started", { packageName: "Half Day" });
 */

type TrackMetadata = Record<string, string | number | boolean | null>;

const ENDPOINT = "/api/analytics/event";
const FLUSH_INTERVAL_MS = 5_000;
const MAX_BATCH = 10;

let initialized = false;
const queue: { event: string; metadata: TrackMetadata; sessionId: string; page: string; ts: number }[] = [];
let sessionId: string | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let unloadHandler: (() => void) | null = null;
let visibilityHandler: (() => void) | null = null;

function ensureSessionId(): string {
  if (sessionId) return sessionId;
  try {
    const stored = window.sessionStorage.getItem("nhb_track_sid");
    if (stored) {
      sessionId = stored;
      return stored;
    }
    const newId = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem("nhb_track_sid", newId);
    sessionId = newId;
    return newId;
  } catch {
    sessionId = `s_${Date.now().toString(36)}`;
    return sessionId;
  }
}

function init() {
  if (initialized) return;
  if (typeof window === "undefined") return;
  if (!import.meta.env.PROD) return;
  initialized = true;
  ensureSessionId();
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  unloadHandler = () => flush(true);
  visibilityHandler = () => { if (document.visibilityState === "hidden") flush(true); };
  window.addEventListener("pagehide", unloadHandler);
  document.addEventListener("visibilitychange", visibilityHandler);
}

/** Public API — track an event with optional metadata. */
export function track(event: string, metadata: TrackMetadata = {}) {
  if (typeof window === "undefined") return;
  if (!import.meta.env.PROD) return;
  init();
  const cleanMetadata: TrackMetadata = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (v === undefined) continue;
    cleanMetadata[k] = typeof v === "object" && v !== null ? JSON.stringify(v) : v;
  }
  queue.push({
    event: String(event).slice(0, 64),
    metadata: cleanMetadata,
    sessionId: ensureSessionId(),
    page: typeof window !== "undefined" ? window.location.pathname.slice(0, 200) : "",
    ts: Date.now(),
  });
  if (queue.length >= MAX_BATCH) flush();
}

function flush(force = false) {
  if (queue.length === 0) return;
  if (!force && typeof document !== "undefined" && document.visibilityState !== "hidden" && queue.length < MAX_BATCH) return;

  const batch = queue.splice(0, MAX_BATCH);
  const payload = JSON.stringify({ events: batch });

  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      const ok = navigator.sendBeacon(ENDPOINT, blob);
      if (ok) return;
    }
  } catch {
    /* fall through to fetch */
  }

  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    /* telemetry must never break the app */
  });

  if (queue.length > 0 && !force) {
    setTimeout(() => flush(false), 0);
  }
}

/** Test-only — resets internal state. */
export function _resetTrackForTests() {
  initialized = false;
  sessionId = null;
  queue.length = 0;
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  if (unloadHandler) {
    window.removeEventListener("pagehide", unloadHandler);
    unloadHandler = null;
  }
  if (visibilityHandler) {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = null;
  }
}
