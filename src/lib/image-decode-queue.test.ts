import { describe, expect, it } from "vitest";
import { BoundedTaskQueue } from "./image-decode-queue";

describe("BoundedTaskQueue", () => {
  it("never exceeds its configured concurrency", async () => {
    const queue = new BoundedTaskQueue(2);
    let active = 0;
    let peak = 0;
    const results = await Promise.all(Array.from({ length: 6 }, (_, index) => queue.enqueue(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 4));
      active -= 1;
      return index;
    })));
    expect(peak).toBe(2);
    expect(results).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("continues after a failed task", async () => {
    const queue = new BoundedTaskQueue(1);
    const failed = queue.enqueue(async () => { throw new Error("decode failed"); });
    const next = queue.enqueue(async () => "decoded");
    await expect(failed).rejects.toThrow("decode failed");
    await expect(next).resolves.toBe("decoded");
  });
});
