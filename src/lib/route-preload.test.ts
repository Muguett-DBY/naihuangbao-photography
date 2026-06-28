import { describe, expect, it } from "vitest";
import { createRoutePreloader } from "./route-preload";

describe("route intent preloading", () => {
  it("deduplicates concurrent preloads and ignores search and hash fragments", async () => {
    let calls = 0;
    let release: (() => void) | undefined;
    const loadGallery = () => {
      calls += 1;
      return new Promise<void>((resolve) => {
        release = resolve;
      });
    };
    const preload = createRoutePreloader({ "/gallery": loadGallery });

    const first = preload("/gallery?sort=recent#featured");
    const second = preload("/gallery");

    expect(calls).toBe(1);
    release?.();
    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);
  });

  it("allows a failed route preload to be retried", async () => {
    let calls = 0;
    const preload = createRoutePreloader({
      "/editor": async () => {
        calls += 1;
        if (calls === 1) throw new Error("chunk unavailable");
      },
    });

    await expect(preload("/editor")).rejects.toThrow("chunk unavailable");
    await expect(preload("/editor")).resolves.toBe(true);
    expect(calls).toBe(2);
  });

  it("does not load unknown routes", async () => {
    const preload = createRoutePreloader({});

    await expect(preload("/missing")).resolves.toBe(false);
  });
});
