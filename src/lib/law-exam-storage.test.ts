import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LawSubjectId } from "../types/law";
import {
  LAW_EXAM_RECORDS_CAP,
  LAW_EXAM_RECORDS_KEY,
  addExamRecord,
  clearExamRecords,
  getExamRecords,
  type LawExamRecord,
} from "./law-exam-storage";

function recordOf(at: number, correct = 6, total = 10): LawExamRecord {
  const bySubject: Partial<Record<LawSubjectId, { correct: number; total: number }>> = {
    falixue: { correct, total },
  };
  return { at, subjects: ["falixue"], total, correct, bySubject };
}

/** 内存 Storage 桩（vitest 为 node 环境，无真实 localStorage） */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
  } as unknown as Storage;
}

/** 记录测试前的真实键值，结束后原样归还（注入数据零残留） */
let backup: string | null = null;
let storage: Storage;

beforeEach(() => {
  storage = memoryStorage();
  backup = storage.getItem(LAW_EXAM_RECORDS_KEY);
  vi.stubGlobal("window", { localStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
  expect(backup).toBeNull();
});

describe("law exam records storage", () => {
  it("无记录时返回空数组", () => {
    expect(getExamRecords()).toEqual([]);
  });

  it("写入后可读回，最新的排在前面", () => {
    addExamRecord(recordOf(1000));
    addExamRecord(recordOf(2000));
    const records = getExamRecords();
    expect(records).toHaveLength(2);
    expect(records[0].at).toBe(2000);
    expect(records[1].at).toBe(1000);
  });

  it("记录字段完整落盘（subjects/total/correct/bySubject）", () => {
    addExamRecord({
      at: 1234,
      subjects: ["falixue", "minfa"],
      total: 12,
      correct: 7,
      bySubject: { falixue: { correct: 4, total: 6 }, minfa: { correct: 3, total: 6 } },
    });
    const [record] = getExamRecords();
    expect(record.subjects).toEqual(["falixue", "minfa"]);
    expect(record.total).toBe(12);
    expect(record.correct).toBe(7);
    expect(record.bySubject.minfa).toEqual({ correct: 3, total: 6 });
  });

  it(`上限 ${LAW_EXAM_RECORDS_CAP} 条：超出的最旧记录被 FIFO 淘汰`, () => {
    for (let i = 0; i < LAW_EXAM_RECORDS_CAP + 7; i += 1) {
      addExamRecord(recordOf(i));
    }
    const records = getExamRecords();
    expect(records).toHaveLength(LAW_EXAM_RECORDS_CAP);
    // 最旧的 0..6 被淘汰，剩下 7..56，且最新在前
    expect(records[0].at).toBe(LAW_EXAM_RECORDS_CAP + 6);
    expect(records[records.length - 1].at).toBe(7);
  });

  it("损坏的 JSON 不抛错，返回空历史", () => {
    storage.setItem(LAW_EXAM_RECORDS_KEY, "{{{not json");
    expect(getExamRecords()).toEqual([]);
    // 写入照常工作（自愈）
    addExamRecord(recordOf(42));
    expect(getExamRecords()).toHaveLength(1);
  });

  it("版本不认识/结构不对时按空历史处理", () => {
    storage.setItem(LAW_EXAM_RECORDS_KEY, JSON.stringify({ version: 9, records: [recordOf(1)] }));
    expect(getExamRecords()).toEqual([]);
    storage.setItem(LAW_EXAM_RECORDS_KEY, JSON.stringify({ version: 1, records: "oops" }));
    expect(getExamRecords()).toEqual([]);
  });

  it("单条坏记录被剔除，好记录保留", () => {
    const good = recordOf(10);
    storage.setItem(
      LAW_EXAM_RECORDS_KEY,
      JSON.stringify({ version: 1, records: [good, { at: "bad" }, null] }),
    );
    const records = getExamRecords();
    expect(records).toEqual([good]);
  });

  it("clearExamRecords 清空全部记录", () => {
    addExamRecord(recordOf(1));
    addExamRecord(recordOf(2));
    clearExamRecords();
    expect(getExamRecords()).toEqual([]);
    expect(storage.getItem(LAW_EXAM_RECORDS_KEY)).toBeNull();
  });
});
