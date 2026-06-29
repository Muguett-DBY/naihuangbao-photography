import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FaceModelLoadTimeoutError,
  withTimeout,
} from "./photo-processing";

describe("photo processing model loading", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a model operation result before its deadline", async () => {
    await expect(withTimeout(Promise.resolve("ready"), 1_000)).resolves.toBe("ready");
  });

  it("rejects a model operation that exceeds its deadline", async () => {
    vi.useFakeTimers();
    const operation = new Promise<never>(() => undefined);
    const result = withTimeout(operation, 50);
    const assertion = expect(result).rejects.toBeInstanceOf(FaceModelLoadTimeoutError);

    await vi.advanceTimersByTimeAsync(50);
    await assertion;
  });
});
