import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// law 模块弹层的可达性契约：node 环境无 jsdom，按仓库方法学用源码契约 + 纯函数单测
// （focus-cycle.test.ts）锁语义；行为级浏览器断言由 e2e 覆盖（见移交 S3 清单）。
const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("law dialog accessibility contracts", () => {
  it("EggModal 挂 useFocusTrap：圈禁 + 初始入焦 + 归还触发元素", () => {
    const source = read("src/components/law/EasterEgg.tsx");
    expect(source).toContain("useFocusTrap");
    expect(source).toContain("overlayRef");
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('event.key === "Escape"');
  });

  it("EggGallery 挂 useFocusTrap，且图鉴订阅解锁事件实时刷新网格", () => {
    const source = read("src/components/law/EggGallery.tsx");
    expect(source).toContain("useFocusTrap");
    expect(source).toContain("LAW_EGG_UNLOCKED_EVENT");
    expect(source).toContain("document.addEventListener(LAW_EGG_UNLOCKED_EVENT");
    // 网格状态不能是一次性快照（曾用 useMemo(getEggState, []) 导致打开期间不刷新）
    expect(source).not.toContain("useMemo(() => getEggState()");
    expect(source).toContain('role="dialog"');
  });

  it("focus trap 决策逻辑为纯函数且覆盖循环/圈外拉回", () => {
    const source = read("src/lib/focus-cycle.ts");
    expect(source).toContain("pickTabTarget");
    expect(source).toContain("shiftKey");
    expect(source).toContain("container.contains");
  });

  it("useFocusTrap 把 Tab 决策委托给纯函数（单一事实源）", () => {
    const source = read("src/hooks/useFocusTrap.ts");
    expect(source).toContain("pickTabTarget");
    expect(source).toContain('"Tab"');
  });
});
