/**
 * Schedules a callback to run when the browser is idle (via requestIdleCallback),
 * falling back to setTimeout with a configurable delay.
 *
 * Returns a cleanup function that cancels the pending task.
 */
export function scheduleIdleTask(callback: () => void, delayMs = 1200): () => void {
  const browserWindow = window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  let idleHandle: number | null = null;

  const timeoutHandle = window.setTimeout(() => {
    if (browserWindow.requestIdleCallback) {
      idleHandle = browserWindow.requestIdleCallback(callback, { timeout: 2500 });
      return;
    }

    callback();
  }, delayMs);

  return () => {
    window.clearTimeout(timeoutHandle);
    if (idleHandle !== null) {
      browserWindow.cancelIdleCallback?.(idleHandle);
    }
  };
}
