/**
 * Centralized error logging utility.
 * In development, logs to console. In production, sends to backend for monitoring.
 */
function reportErrorLoggingFailure(context: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn("[ErrorLogger]", context, message);
}

export function logError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  if (import.meta.env.DEV) {
    console.error(`[${context}]`, message, stack ? "\n" + stack : "", extra ?? "");
  }

  // In production, send to backend for monitoring
  if (import.meta.env.PROD) {
    try {
      const payload = {
        context,
        message,
        stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        ...extra,
      };

      // Use sendBeacon for reliable delivery even if page is unloading
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon("/api/analytics/error", blob);
      } else {
        // Fallback for older browsers
        fetch("/api/analytics/error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch((reportError) => reportErrorLoggingFailure("fallback request failed", reportError));
      }
    } catch (loggingError) {
      reportErrorLoggingFailure("payload creation failed", loggingError);
    }
  }
}

/**
 * Create a context-bound error logger for use in catch blocks.
 *
 * Usage:
 *   const err = errorLogger("WorkshopRegister");
 *   try { ... } catch (e) { err(e); }
 */
export function errorLogger(context: string, extra?: Record<string, unknown>) {
  return (error: unknown) => logError(context, error, extra);
}
