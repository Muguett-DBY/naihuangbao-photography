import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LAW_GRAPHICS } from "../data/law/graphics";
import { isShellLesson, type LawBook } from "../types/law";

const SUBJECTS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"] as const;

const books = Object.fromEntries(
  SUBJECTS.map((id) => [
    id,
    (JSON.parse(
      readFileSync(resolve(__dirname, "../data/law", `${id}.json`), "utf8"),
    ) as { book: LawBook }).book,
  ]),
) as Record<(typeof SUBJECTS)[number], LawBook>;

describe("law content data quality", () => {
  it("keeps lesson ids unique and stable across all five books", () => {
    const ids = new Set<string>();
    for (const book of Object.values(books)) {
      for (const lesson of book.chapters.flatMap((c) => c.lessons)) {
        expect(ids.has(lesson.id), `duplicate lesson id ${lesson.id}`).toBe(false);
        ids.add(lesson.id);
        expect(lesson.id).toMatch(new RegExp(`^${lesson.subject}-q\\d+`));
      }
    }
    expect(ids.size).toBeGreaterThan(1500);
  });

  it("marks index-shell lessons and excludes them from lessonCount", () => {
    let shells = 0;
    for (const [id, book] of Object.entries(books)) {
      const lessons = book.chapters.flatMap((c) => c.lessons);
      const shellCount = lessons.filter((l) => isShellLesson(l)).length;
      shells += shellCount;
      for (const shell of lessons.filter(isShellLesson)) {
        // 空壳课必须符合"纯标题"形态
        expect(shell.raw.length).toBe(0);
        expect(shell.steps).toHaveLength(1);
      }
      // 未标记 shell 的课必须有原文（保底承诺）
      const missing = lessons.filter((l) => !isShellLesson(l) && l.raw.length === 0);
      expect(missing, `${id}: lessons without raw`).toHaveLength(0);
      // 课时总数 = 学习流课时（非附录章的非空壳课）；附录章（考点索引）不进计数
      const flowCount = book.chapters
        .filter((c) => !c.appendix)
        .reduce((sum, c) => sum + c.lessons.filter((l) => !isShellLesson(l)).length, 0);
      expect(book.lessonCount).toBe(flowCount);
    }
    // 84：附录头页 zhishixiang-q216 在页眉剥离后正确回归纯标题形态（2026-09-08 C 会话）
    expect(shells).toBe(84);
  });

  it("matches stats.json lesson counts (shells excluded)", () => {
    const stats = JSON.parse(readFileSync(resolve(__dirname, "../data/law/stats.json"), "utf8"));
    for (const id of SUBJECTS) {
      expect(stats[id].lessonCount).toBe(books[id].lessonCount);
    }
  });

  it("marks the zhishixiang dynasty index as an appendix chapter (kept but not counted)", () => {
    const appendixChapters = books.zhishixiang.chapters.filter((c) => c.appendix);
    expect(appendixChapters).toHaveLength(1);
    expect(appendixChapters[0].semanticTitle ?? "").toMatch(/^附录/);
    // 附录课时内容完整保留（可查阅），但绝不进学习流计数
    const real = appendixChapters[0].lessons.filter((l) => !isShellLesson(l));
    expect(real.length).toBeGreaterThan(50);
  });

  it("gives every multi-lesson chapter a semantic, non-ordinal title", () => {
    for (const [id, book] of Object.entries(books)) {
      for (const chapter of book.chapters) {
        const realCount = chapter.lessons.filter((l) => !isShellLesson(l)).length;
        if (realCount <= 1) continue;
        expect(
          chapter.semanticTitle,
          `${id}/${chapter.id}「${chapter.title}」missing semanticTitle`,
        ).toBeTruthy();
        expect(chapter.semanticTitle).not.toMatch(
          /^(第[一二三四五六七八九十百零0-9]+|专题[一二三四五六七八九十]+)$/,
        );
      }
    }
  });

  it("keeps mnemonic fields clean (no OCR garbage in the summary display)", () => {
    for (const lesson of Object.values(books).flatMap((b) => b.chapters.flatMap((c) => c.lessons))) {
      if (!lesson.mnemonic) continue;
      expect(lesson.mnemonic.length).toBeLessThanOrEqual(24);
      expect(lesson.mnemonic).not.toMatch(/[：:［\[\]］（）()]/);
      expect(lesson.mnemonic).not.toMatch(/示例|简述|论述|简答|背诵|记忆|考点/);
    }
  });

  it("anchors every graphic to a real, non-shell lesson", () => {
    const byId = new Map(
      Object.values(books).flatMap((b) => b.chapters.flatMap((c) => c.lessons)).map((l) => [l.id, l]),
    );
    expect(LAW_GRAPHICS.length).toBeGreaterThanOrEqual(25);
    for (const graphic of LAW_GRAPHICS) {
      const lesson = byId.get(graphic.lessonId);
      expect(lesson, `graphic ${graphic.lessonId} dangling`).toBeTruthy();
      expect(isShellLesson(lesson!)).toBe(false);
      expect(graphic.captions.length).toBeGreaterThan(0);
    }
    // S5 配额均衡：五科下限（图解不再向刑法倾斜，法史/法理有足量图）
    const quota: Record<string, number> = { minfa: 9, xianfa: 9, zhishixiang: 8, falixue: 8, xingfa: 10 };
    for (const [subject, min] of Object.entries(quota)) {
      expect(
        LAW_GRAPHICS.filter((g) => g.subject === subject).length,
        `${subject} 图解少于配额下限`,
      ).toBeGreaterThanOrEqual(min);
    }
    expect(LAW_GRAPHICS.length).toBeGreaterThanOrEqual(40);
    // 五科全覆盖：每个学科至少 3 个图解
    const subjects = new Set(LAW_GRAPHICS.map((g) => g.subject));
    for (const subject of subjects) {
      expect(LAW_GRAPHICS.filter((g) => g.subject === subject).length).toBeGreaterThanOrEqual(3);
    }
    // E 扩展图解每个 6-8 步解说
    const expanded = [
      "xingfa-q053", "xingfa-q032", "minfa-q627", "minfa-q081", "xianfa-q098-tour",
      "zhishixiang-q114-tour", "falixue-q108", "zhishixiang-q124",
      "xingfa-q052", "minfa-q417", "falixue-q114", "xianfa-q061",
    ];
    for (const id of expanded) {
      const graphic = LAW_GRAPHICS.find((g) => g.lessonId === id);
      expect(graphic, `expanded graphic ${id} missing`).toBeTruthy();
      expect(graphic!.captions.length).toBeGreaterThanOrEqual(6);
      expect(graphic!.captions.length).toBeLessThanOrEqual(8);
    }
    // S5 脚手架骨架带 S5-DRAFT/TODO 标记——精炼完成后才允许上线（扫全部图解数据文件）
    for (const file of ["graphics.ts", "graphicsExtended.ts", "graphicsS5.ts"]) {
      const source = readFileSync(resolve(__dirname, "../data/law", file), "utf8");
      expect(source, `${file} 有未精炼的 S5-DRAFT 骨架`).not.toContain("S5-DRAFT");
      expect(source, `${file} 有未填的 TODO 槽位`).not.toContain("TODO-");
    }
  });
});
