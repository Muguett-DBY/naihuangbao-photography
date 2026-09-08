import { describe, expect, it } from "vitest";
import { pickTabTarget } from "./focus-cycle";

/** node 环境下的最小元素桩：只带 id，靠引用相等参与包含判断 */
function makeNode(id: string): HTMLElement {
  return { id } as unknown as HTMLElement;
}

/** 最小容器桩：contains 按 members 集合判断（等价于 DOM contains 的子集语义） */
function makeContainer(members: Set<unknown>) {
  return {
    contains: (n: unknown) => members.has(n),
  } as unknown as HTMLElement;
}

/** 模拟一轮 Tab 按键序列：返回每次实际聚焦的元素 id（null = 不拦截，浏览器默认移动） */
function cycle(
  ids: string[],
  presses: { shiftKey?: boolean; active: string | null }[],
): (string | null)[] {
  const nodes = new Map<string, HTMLElement>();
  const make = (id: string): HTMLElement => {
    if (!nodes.has(id)) nodes.set(id, makeNode(id));
    return nodes.get(id)!;
  };
  const focusables = ids.map(make);
  const container = makeContainer(new Set(focusables));
  return presses.map(({ shiftKey = false, active }) => {
    const hit = pickTabTarget({
      focusables,
      activeElement: active === null ? null : make(active),
      shiftKey,
      container,
    });
    return hit ? hit.next.id : null;
  });
}

describe("pickTabTarget（弹窗焦点圈禁的纯决策）", () => {
  it("Tab 在末尾元素时循环回第一个", () => {
    const [hit] = cycle(["a", "b", "c"], [{ active: "c" }]);
    expect(hit).toBe("a");
  });

  it("Tab 在中间元素时不干预（浏览器默认移到下一个）", () => {
    const [hit] = cycle(["a", "b", "c"], [{ active: "a" }]);
    expect(hit).toBeNull();
  });

  it("Shift+Tab 在第一个元素时循环回最后一个", () => {
    const [hit] = cycle(["a", "b", "c"], [{ shiftKey: true, active: "a" }]);
    expect(hit).toBe("c");
  });

  it("Shift+Tab 在中间元素时不干预", () => {
    const [hit] = cycle(["a", "b", "c"], [{ shiftKey: true, active: "c" }]);
    expect(hit).toBeNull();
  });

  it("Shift+Tab 且焦点为空（容器外）时拉回最后一个", () => {
    const [hit] = cycle(["a", "b"], [{ shiftKey: true, active: null }]);
    expect(hit).toBe("b");
  });

  it("Tab 且焦点为空（容器外，如点击遮罩后）时拉回第一个", () => {
    const [hit] = cycle(["a", "b"], [{ active: null }]);
    expect(hit).toBe("a");
  });

  it("无可聚焦元素时圈禁回容器本身", () => {
    const container = makeContainer(new Set());
    const hit = pickTabTarget({ focusables: [], activeElement: null, shiftKey: false, container });
    expect(hit?.next).toBe(container);
    expect(hit?.prevent).toBe(true);
  });

  it("两元素弹窗：Tab/Shift+Tab 双向循环都能往返", () => {
    const result = cycle(
      ["x", "y"],
      [
        { active: "x" }, // Tab 在 x → 不拦截，默认前进 y
        { active: "y" }, // Tab 在 y → 回 x
        { active: "x", shiftKey: true }, // Shift+Tab 在 x → 回 y
        { active: "y", shiftKey: true }, // Shift+Tab 在 y → 不拦截，默认后退 x
      ],
    );
    expect(result).toEqual([null, "x", "y", null]);
  });

  it("模拟完整循环圈：连续 6 次 Tab 从圈外起点进入且永不逃逸", () => {
    // 焦点起点在圈外（null，等于点遮罩后 focus 回到 body）：第一次 Tab 拉回第一个元素，
    // 之后浏览器默认前进 + 末尾回卷，轨迹始终在 [a, b] 内
    const nodes = ["a", "b"].map(makeNode);
    const container = makeContainer(new Set(nodes));
    let active: HTMLElement | null = null;
    const visited: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const hit = pickTabTarget({
        focusables: nodes,
        activeElement: active,
        shiftKey: false,
        container,
      });
      if (hit) {
        active = hit.next;
      } else {
        // 浏览器默认：前进到下一个可聚焦元素（末尾则出圈——但圈禁不允许走到这一步）
        const idx: number = active ? nodes.indexOf(active as HTMLElement) : -1;
        active = nodes[idx + 1] ?? null;
      }
      visited.push((active as { id?: string } | null)?.id ?? "outside");
    }
    expect(visited).toEqual(["a", "b", "a", "b", "a", "b"]);
  });

  it("Shift+Tab 连续 4 次从圈外起点也能进圈并循环", () => {
    const nodes = ["a", "b", "c"].map(makeNode);
    const container = makeContainer(new Set(nodes));
    let active: HTMLElement | null = null;
    const visited: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const hit = pickTabTarget({ focusables: nodes, activeElement: active, shiftKey: true, container });
      if (hit) {
        active = hit.next;
      } else {
        // 浏览器默认：后退到上一个可聚焦元素
        const idx: number = active ? nodes.indexOf(active as HTMLElement) : -1;
        active = nodes[idx - 1] ?? null;
      }
      visited.push((active as { id?: string } | null)?.id ?? "outside");
    }
    expect(visited).toEqual(["c", "b", "a", "c"]);
  });
});
