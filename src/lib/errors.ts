/**
 * Determines if an error is an AbortError (from AbortController).
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Silently logs an error when caught in a non-critical path.
 * Always returns `undefined` so it can be used in catch tail: `.catch(logAndIgnore)`
 */
export function logAndIgnore(...args: unknown[]): undefined {
  console.warn("[ignored]", ...args);
  return undefined;
}
