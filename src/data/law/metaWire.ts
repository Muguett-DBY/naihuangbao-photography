import type { LawChapter, LawSubjectId } from "../../types/law";

/**
 * law 分块 meta 的 wire 格式与解码（P5·T1 紧凑编码 v2）：
 * - 编码见 scripts/build-law-chunks.mjs；课/章 id 去前缀、课表元组化、词条 digest 字典化。
 * - decodeMeta 还原为运行时结构，loader 下游全部函数与解码前语义一致
 *   （loader-chunks.test.ts 全量等价锁定）。
 * 独立成模块：loader.ts 受单文件 500 行架构预算约束。
 */

/** 章级 level 枚举（与 LawChapterLevel 对齐；meta wire 存下标） */
const CHAPTER_LEVELS = ["part", "chapter", "section", "group"] as const;

/** law:chunks 产物 meta 的 v2 紧凑 wire 格式 */
export interface LawMetaWire {
  v: 2;
  id: LawSubjectId;
  name: string;
  fullName: string;
  emoji: string;
  accent: string;
  accentSoft: string;
  lessonCount: number;
  leftover: string[];
  parts: string[];
  chapters: {
    /** 章短 id（subject- 前缀已去） */
    c: string;
    t: string;
    st?: string;
    /** CHAPTER_LEVELS 下标 */
    l: number;
    /** 1 = 附录章 */
    ax?: 1;
    /** 含本章内容的 part 文件在 meta.parts 里的下标（装配顺序） */
    p: number[];
    /** 与 p 对齐：每个 part 覆盖的章内课数 */
    s: number[];
    /** 课表元组 [短课id, 标题, 学习流flag, 分层前缀步数?] */
    ls: [string, string, 0 | 1, number?][];
  }[];
  /** 词条 digest（与 chapters 对齐）：d = 章内唯一词条（首发序），x[j] = 第 j 课的词条索引
   *  （课内去重，不影响 includes 去重语义）；无词条章为 null */
  dg: ({ d: string[]; x: number[][] } | null)[];
}

export interface LawMetaLesson {
  i: string;
  t: string;
  /** 1 = 学习流课时（与 isFlowLesson 等价） */
  f: 0 | 1;
  /** 课内分层（S6·T1）：前 lt 步全文在 {id}-light.json，余下步骤在 {id}-tail.json；未分层课无此字段 */
  lt?: number;
}

export interface LawMetaChapter {
  id: string;
  t: string;
  st?: string;
  lv: LawChapter["level"];
  /** 1 = 附录章 */
  ax?: 1;
  ls: LawMetaLesson[];
  /** 含本章内容的 part 文件（装配顺序） */
  parts: string[];
  /** 与 parts 对齐：每个 part 覆盖的章内课数 */
  spans: number[];
}

export interface LawMeta {
  id: LawSubjectId;
  name: string;
  fullName: string;
  emoji: string;
  accent: string;
  accentSoft: string;
  lessonCount: number;
  leftover: string[];
  parts: string[];
  chapters: LawMetaChapter[];
  /** digests[chapterId] = 每课的清洗后词条（课内去重、跨课保序；collectSiblingTerms 的构建期摘要） */
  digests: Record<string, string[][]>;
}

/** v2 紧凑编码 → 运行时结构：id 还原 `subject-` 前缀、词条字典还原每课词条表。
 *  输出与编码前的明文 meta 结构一致（除课内去重——对扫描输出无影响的等价变换） */
export function decodeMeta(subject: LawSubjectId, wire: LawMetaWire): LawMeta {
  const prefix = `${subject}-`;
  const digests: Record<string, string[][]> = {};
  const chapters = wire.chapters.map((wc, chapterIndex): LawMetaChapter => {
    const id = prefix + wc.c;
    const encoded = wire.dg[chapterIndex];
    digests[id] = encoded ? encoded.x.map((indices) => indices.map((at) => encoded.d[at])) : [];
    const chapter: LawMetaChapter = {
      id,
      t: wc.t,
      lv: CHAPTER_LEVELS[wc.l] ?? "chapter",
      ls: wc.ls.map((tuple): LawMetaLesson => {
        const lesson: LawMetaLesson = { i: prefix + tuple[0], t: tuple[1], f: tuple[2] };
        if (tuple.length > 3) lesson.lt = tuple[3];
        return lesson;
      }),
      parts: wc.p.map((partIndex) => wire.parts[partIndex]),
      spans: wc.s,
    };
    if (wc.st !== undefined) chapter.st = wc.st;
    if (wc.ax === 1) chapter.ax = 1;
    return chapter;
  });
  return {
    id: wire.id,
    name: wire.name,
    fullName: wire.fullName,
    emoji: wire.emoji,
    accent: wire.accent,
    accentSoft: wire.accentSoft,
    lessonCount: wire.lessonCount,
    leftover: wire.leftover,
    parts: wire.parts,
    chapters,
    digests,
  };
}
