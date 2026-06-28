/**
 * Client-side error tracking and reporting utility.
 * Captures unhandled errors, promise rejections, and custom error reports.
 */

export type ErrorReport = {
  id: string;
  message: string;
  stack?: string;
  category: "javascript" | "promise" | "react" | "resource" | "manual";
  source: string;
  url: string;
  userAgent: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type ErrorTrackerOptions = {
  maxReports?: number;
  endpoint?: string;
  sampleRate?: number;
  onReport?: (report: ErrorReport) => void;
};

const DEFAULT_MAX_REPORTS = 50;
const DEFAULT_SAMPLE_RATE = 1.0;
const ERROR_STORAGE_KEY = "nhb_error_reports";

function generateId(): string {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getStoredReports(): ErrorReport[] {
  const storage = getBrowserStorage();
  if (!storage) return [];

  try {
    const stored = storage.getItem(ERROR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function persistReports(reports: ErrorReport[]): void {
  const storage = getBrowserStorage();
  if (!storage) return;

  try {
    storage.setItem(ERROR_STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // Ignore storage failures
  }
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export class ErrorTracker {
  private reports: ErrorReport[] = [];
  private maxReports: number;
  private endpoint: string | null;
  private sampleRate: number;
  private onReport: ((report: ErrorReport) => void) | null;
  private installed: boolean = false;
  private originalHandlers: { onError: OnErrorEventHandler | null; onUnhandledRejection: ((event: PromiseRejectionEvent) => void) | null } | null = null;

  constructor(options: ErrorTrackerOptions = {}) {
    this.maxReports = options.maxReports ?? DEFAULT_MAX_REPORTS;
    this.endpoint = options.endpoint ?? null;
    this.sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
    this.onReport = options.onReport ?? null;
  }

  install(): void {
    if (this.installed || typeof window === "undefined") return;
    this.installed = true;
    this.reports = getStoredReports();

    this.originalHandlers = {
      onError: window.onerror,
      onUnhandledRejection: window.onunhandledrejection,
    };

    window.onerror = (message, source, lineno, colno, error) => {
      this.captureError({
        message: String(message),
        stack: error instanceof Error ? error.stack : undefined,
        category: "javascript",
        source: `${source}:${lineno}:${colno}`,
      });
      this.originalHandlers?.onError?.call(window, message, source, lineno, colno, error);
      return false;
    };

    window.onunhandledrejection = (event) => {
      const reason = event.reason;
      this.captureError({
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        category: "promise",
        source: "unhandledrejection",
      });
      this.originalHandlers?.onUnhandledRejection?.call(window, event);
    };
  }

  captureError(input: { message: string; stack?: string; category?: ErrorReport["category"]; source?: string; metadata?: Record<string, unknown> }): ErrorReport | null {
    if (Math.random() > this.sampleRate) return null;

    const report: ErrorReport = {
      id: generateId(),
      message: input.message,
      stack: input.stack,
      category: input.category ?? "manual",
      source: input.source ?? "manual",
      url: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      timestamp: new Date().toISOString(),
      metadata: input.metadata,
    };

    this.reports.push(report);
    if (this.reports.length > this.maxReports) {
      this.reports = this.reports.slice(-this.maxReports);
    }
    persistReports(this.reports);

    if (this.onReport) {
      try { this.onReport(report); } catch { /* ignore */ }
    }

    if (this.endpoint) {
      void this.sendToEndpoint(report);
    }

    return report;
  }

  private async sendToEndpoint(report: ErrorReport): Promise<void> {
    if (!this.endpoint) return;
    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
        keepalive: true,
      });
    } catch {
      // Silently fail; report is already stored locally
    }
  }

  getReports(): ErrorReport[] {
    return [...this.reports];
  }

  clearReports(): void {
    this.reports = [];
    persistReports(this.reports);
  }

  getReportCount(): number {
    return this.reports.length;
  }
}

let sharedTracker: ErrorTracker | null = null;

export function getSharedErrorTracker(): ErrorTracker {
  if (!sharedTracker) {
    sharedTracker = new ErrorTracker({
      maxReports: 50,
      endpoint: "/api/analytics/error",
      sampleRate: 1.0,
    });
  }
  return sharedTracker;
}

export function reportError(message: string, metadata?: Record<string, unknown>): void {
  getSharedErrorTracker().captureError({ message, metadata });
}
