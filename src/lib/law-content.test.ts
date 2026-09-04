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
      expect(book.lessonCount).toBe(lessons.length - shellCount);
    }
    expect(shells).toBe(72);
  });

  it("matches stats.json lesson counts (shells excluded)", () => {
    const stats = JSON.parse(readFileSync(resolve(__dirname, "../data/law/stats.json"), "utf8"));
    for (const id of SUBJECTS) {
      expect(stats[id].lessonCount).toBe(books[id].lessonCount);
    }
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
    expect(LAW_GRAPHICS.length).toBeGreaterThanOrEqual(13);
    for (const graphic of LAW_GRAPHICS) {
      const lesson = byId.get(graphic.lessonId);
      expect(lesson, `graphic ${graphic.lessonId} dangling`).toBeTruthy();
      expect(isShellLesson(lesson!)).toBe(false);
      expect(graphic.captions.length).toBeGreaterThan(0);
    }
  });
});
