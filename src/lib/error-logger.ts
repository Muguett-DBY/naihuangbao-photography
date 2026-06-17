/**
 * Centralized error logging utility.
 * In development, logs to console. In production, can be extended to send to
 * Cloudflare Analytics, Sentry, or other error tracking services.
 */
export function logError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  if (import.meta.env.DEV) {
    console.error(`[${context}]`, message, stack ? "\n" + stack : "", extra ?? "");
  }

  // In production, could send to analytics:
  // if (import.meta.env.PROD) {
  //   fetch("/api/analytics/error", {
  //     method: "POST",
  //     body: JSON.stringify({ context, message, stack, ...extra }),
  //   }).catch(() => {});
  // }
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
