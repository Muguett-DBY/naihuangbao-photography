import type { LawSubjectId } from "../types/law";
import { safeLocalStorage } from "./browser-storage";

/** 考试记录存储键（历次模拟成绩，结果页趋势与配置页回顾共用） */
export const LAW_EXAM_RECORDS_KEY = "nhb-law-exam-v1";

/** 上限 50 条：超出按 FIFO 淘汰最旧的 */
export const LAW_EXAM_RECORDS_CAP = 50;

/** 按科目得分（与 gradeExam 的 bySubject 同构） */
export type LawExamSubjectScores = Partial<Record<LawSubjectId, { correct: number; total: number }>>;

/** 一场考试的存档摘要 */
export interface LawExamRecord {
  /** 交卷时间戳（趋势排序/展示用） */
  at: number;
  /** 本次参考科目 */
  subjects: LawSubjectId[];
  /** 总题量 */
  total: number;
  /** 答对数 */
  correct: number;
  /** 按科目得分 */
  bySubject: LawExamSubjectScores;
}

interface LawExamStore {
  version: 1;
  records: LawExamRecord[];
}

function readStore(): LawExamStore {
  const raw = safeLocalStorage.getItem(LAW_EXAM_RECORDS_KEY);
  if (!raw) return { version: 1, records: [] };
  try {
    const parsed = JSON.parse(raw) as LawExamStore;
    if (parsed?.version !== 1 || !Array.isArray(parsed.records)) return { version: 1, records: [] };
    // 坏条目逐条剔除（单条损坏不拖垮整份历史）
    const records = parsed.records.filter(
      (record) =>
        record &&
        typeof record.at === "number" &&
        typeof record.total === "number" &&
        typeof record.correct === "number" &&
        Array.isArray(record.subjects) &&
        typeof record.bySubject === "object" &&
        record.bySubject !== null,
    );
    return { version: 1, records };
  } catch {
    return { version: 1, records: [] };
  }
}

function writeStore(store: LawExamStore): void {
  safeLocalStorage.setItem(LAW_EXAM_RECORDS_KEY, JSON.stringify(store));
}

/** 历次成绩，最新的在前（写入序即时间序，倒序读出） */
export function getExamRecords(): LawExamRecord[] {
  return [...readStore().records].reverse();
}

/** 记一场成绩：追加到队尾，超上限从最旧的开始淘汰；返回淘汰后的最新在前列表 */
export function addExamRecord(record: LawExamRecord): LawExamRecord[] {
  const store = readStore();
  store.records.push(record);
  if (store.records.length > LAW_EXAM_RECORDS_CAP) {
    store.records.splice(0, store.records.length - LAW_EXAM_RECORDS_CAP);
  }
  writeStore(store);
  return [...store.records].reverse();
}

/** 清空全部考试记录（测试注入数据清理 / 未来设置入口共用） */
export function clearExamRecords(): void {
  safeLocalStorage.removeItem(LAW_EXAM_RECORDS_KEY);
}
