import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLawHistory,
  lawHistoryDayKey,
  recordLawLessonDone,
  recordLawStepDone,
  resetLawHistoryForTest,
} from "./law-history";

/** 极简 localStorage 桩（与 law-progress.test.ts 同款：safeLocalStorage 走 window.localStorage） */
function stubStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
  vi.stubGlobal("window", { localStorage: storage });
  return map;
}

const DAY = 86_400_000;
const NOW = Date.parse("2026-09-09T10:30:00");
let store: Map<string, string>;

beforeEach(() => {
  store = stubStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("law-history（逐日活动记录）", () => {
  it("记步与记课按自然日累加，跨日自动分桶", () => {
    recordLawStepDone(NOW);
    recordLawStepDone(NOW + 1000);
    recordLawLessonDone(NOW + 2000);
    recordLawStepDone(NOW + DAY); // 第二天
    const days = getLawHistory();
    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({ d: "2026-9-9", s: 2, l: 1 });
    expect(days[1]).toMatchObject({ d: "2026-9-10", s: 1, l: 0 });
  });

  it("同日多次写入只更新同一条记录（追加式，不新增重复日）", () => {
    for (let i = 0; i < 5; i += 1) recordLawStepDone(NOW + i);
    recordLawLessonDone(NOW);
    expect(getLawHistory()).toHaveLength(1);
    expect(getLawHistory()[0].s).toBe(5);
    expect(getLawHistory()[0].l).toBe(1);
  });

  it("无任何记录时返回空数组（统计页据此回退旧口径）", () => {
    expect(getLawHistory()).toEqual([]);
  });

  it("损坏的存储内容不抛错，按空历史处理（向后兼容脏数据）", () => {
    store.set("nhb-law-history-v1", "{{{not-json");
    expect(getLawHistory()).toEqual([]);
    // 非数组 JSON（如老版本对象）同样安全
    store.set("nhb-law-history-v1", JSON.stringify({ d: "2026-9-9" }));
    expect(getLawHistory()).toEqual([]);
    recordLawStepDone(NOW); // 且能正常重新开始记录
    expect(getLawHistory()).toHaveLength(1);
  });

  it("超过 400 天时只保留最近一年（存储有界）", () => {
    const longAgo = NOW - 450 * DAY;
    for (let i = 0; i < 410; i += 1) {
      const ts = longAgo + i * DAY;
      store.set(
        "nhb-law-history-v1",
        JSON.stringify([...getLawHistory(), { d: lawHistoryDayKey(ts), s: 1, l: 0, t: ts }]),
      );
    }
    recordLawStepDone(NOW); // 触发一次写入 + 截断
    const days = getLawHistory();
    expect(days.length).toBeLessThanOrEqual(400);
    expect(days.at(-1)?.d).toBe("2026-9-9"); // 最新的一天保留
  });

  it("记录项缺字段时仍可读（健壮性：老数据/半截数据不炸）", () => {
    store.set("nhb-law-history-v1", JSON.stringify([{ d: "2026-9-1" }, null, "junk"]));
    expect(() => recordLawStepDone(NOW)).not.toThrow();
    expect(getLawHistory().some((day) => day.d === "2026-9-1")).toBe(true);
  });
});
