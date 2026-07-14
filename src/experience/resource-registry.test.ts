import { describe, expect, it, vi } from "vitest";
import { ResourceRegistry } from "./resource-registry";

describe("ResourceRegistry", () => {
  it("disposes each unique resource once in reverse registration order", () => {
    const order: string[] = [];
    const first = { dispose: vi.fn(() => order.push("first")) };
    const second = {};
    const disposeSecond = vi.fn(() => order.push("second"));
    const registry = new ResourceRegistry();

    expect(registry.register(first)).toBe(first);
    expect(registry.register(second, disposeSecond)).toBe(second);
    registry.register(first);

    registry.dispose();
    registry.dispose();

    expect(order).toEqual(["second", "first"]);
    expect(first.dispose).toHaveBeenCalledOnce();
    expect(disposeSecond).toHaveBeenCalledOnce();
    expect(registry.size).toBe(0);
  });
});
