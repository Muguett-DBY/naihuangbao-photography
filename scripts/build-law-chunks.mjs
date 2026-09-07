// 法学数据分块构建：把 src/data/law/{id}.json（law:build 的产物，只读）切成
// "轻元数据 + 正文分块"两层，供 loader 按需加载。
//
// 输出 src/data/law/chunks/{id}/：
//   {id}-meta.json  书头 + 章树（每课 id/标题/步数/首步 kind/学习流 flag）
//                   + 每章词条 digest（collectSiblingTerms 的构建期摘要）+ leftover
//   {id}-p{NN}.json 正文分块：整章打包 ≤ PART_MAX_BYTES；超大章拆连续段；
//                   段记录 (chapterId, from) 保证可无损重装
//
// 等价性由 src/data/law/loader-chunks.test.ts 全量锁定：
//   装配书 === 原书（结构级）、meta 流 flag === isFlowLesson、
//   digest 扫描 === collectSiblingTerms、meta 下一课 === nextFlowLesson。
//
// 运行：node scripts/build-law-chunks.mjs（npm run law:chunks；prebuild 自动跑）
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const SRC_DIR = join(root, "src", "data", "law");
const OUT_DIR = join(SRC_DIR, "chunks");

const SUBJECTS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"];

/** 单个分块文件的原始字节上限（正文 lesson 数组部分） */
const PART_MAX_BYTES = 95 * 1024;

// ── 与 src/types/law.ts 的 isCleanTerm 完全一致的实现（等价性测试锁定）──
function isCleanTerm(term) {
  if (!term) return false;
  const text = term.trim().replace(/^[（(【[]|[）)】\]]$/g, "").trim();
  if (text.length < 3 || text.length > 12) return false;
  if (!/^[\u4e00-\u9fa5]+$/.test(text)) return false;
  if (/[（(【[]\d|[0-9]{2,}/.test(text)) return false;
  if (/[。，；：、！？]/.test(text)) return false;
  if (/[简述论述简答分析评述试述说明讨论如何什么为什么哪些怎么谈谈]/.test(text)) return false;
  if (/^(的|了|是|在|与|和|或|对|从|把|被|并|而)/.test(text)) return false;
  if (/[是了着们]$/.test(text)) return false;
  if (/含义|内容/.test(text)) return false;
  return true;
}

// ── 与 src/types/law.ts 的 isShellLesson 完全一致（等价性测试锁定）──
function isShellLesson(lesson) {
  if (lesson.shell) return true;
  return lesson.raw.length === 0 && lesson.steps.length <= 1 && lesson.steps[0]?.text === lesson.title;
}

/** 单课的清洗后词条（保序、含重复；去重语义由运行时扫描与 collectSiblingTerms 一致） */
function lessonDigest(lesson) {
  const terms = [];
  for (const step of lesson.steps) {
    for (const term of step.terms ?? []) {
      const cleaned = term.term?.trim().replace(/^[（(【[]|[）)】\]]$/g, "").trim();
      if (cleaned && isCleanTerm(cleaned)) terms.push(cleaned);
    }
  }
  return terms;
}

async function main() {
  for (const id of SUBJECTS) {
    const book = JSON.parse(await readFile(join(SRC_DIR, `${id}.json`), "utf8")).book;

    const meta = {
      id: book.id,
      name: book.name,
      fullName: book.fullName,
      emoji: book.emoji,
      accent: book.accent,
      accentSoft: book.accentSoft,
      lessonCount: book.lessonCount,
      leftover: book.leftover,
      parts: [],
      chapters: book.chapters.map((chapter) => ({
        id: chapter.id,
        t: chapter.title,
        st: chapter.semanticTitle,
        lv: chapter.level,
        ax: chapter.appendix ? 1 : undefined,
        // 学习流 flag：与 isFlowLesson(chapter, lesson) 等价（附录章整章 false）
        ls: chapter.lessons.map((lesson) => ({
          i: lesson.id,
          t: lesson.title,
          s: lesson.steps.length,
          k: lesson.steps[0]?.kind ?? "plain",
          f: !chapter.appendix && !isShellLesson(lesson) ? 1 : 0,
        })),
      })),
      // 词条 digest：digests[chapterId] = 每课的清洗后 terms（保序、含重复；
      // 运行时扫描用与 collectSiblingTerms 相同的 includes 去重语义）
      digests: Object.fromEntries(
        book.chapters.map((chapter) => [chapter.id, chapter.lessons.map(lessonDigest)]),
      ),
    };

    // ── 分块：整章贪心打包；超过上限的章独占多个连续 part ──
    const parts = []; // { f, segments: [{ c, from, lessons }] }
    let current = { segments: [], bytes: 0 };

    function flush() {
      if (current.segments.length > 0) {
        parts.push({
          f: `${id}-p${String(parts.length + 1).padStart(2, "0")}.json`,
          segments: current.segments,
        });
      }
      current = { segments: [], bytes: 0 };
    }

    for (const chapter of book.chapters) {
      const sizes = chapter.lessons.map((lesson) => Buffer.byteLength(JSON.stringify(lesson)));
      const total = sizes.reduce((sum, size) => sum + size, 0);

      if (total <= PART_MAX_BYTES) {
        // 章整体搭当前 part 的车（放不下就先收尾再装）
        if (current.bytes + total > PART_MAX_BYTES && current.segments.length > 0) flush();
        current.segments.push({ c: chapter.id, from: 0, lessons: chapter.lessons });
        current.bytes += total;
        continue;
      }

      // 超限章：独占连续多个 part（不与其它章合并，保住"进一节课只拉 1 块正文"）
      flush();
      let segment = { lessons: [], bytes: 0 };
      chapter.lessons.forEach((lesson, lessonIndex) => {
        if (segment.bytes + sizes[lessonIndex] > PART_MAX_BYTES && segment.lessons.length > 0) {
          current.segments.push({
            c: chapter.id,
            from: lessonIndex - segment.lessons.length,
            lessons: segment.lessons,
          });
          flush();
          segment = { lessons: [], bytes: 0 };
        }
        segment.lessons.push(lesson);
        segment.bytes += sizes[lessonIndex];
      });
      if (segment.lessons.length > 0) {
        current.segments.push({
          c: chapter.id,
          from: chapter.lessons.length - segment.lessons.length,
          lessons: segment.lessons,
        });
        flush();
      }
    }
    flush();

    // 章 → 含它的 part 文件（按 parts 顺序，即装配顺序）+ 每 part 覆盖的章内课数，
    // 运行时用它把"章内第 i 课"定位到唯一 part 文件
    for (const mc of meta.chapters) {
      mc.parts = parts
        .filter((part) => part.segments.some((segment) => segment.c === mc.id))
        .map((part) => part.f);
      mc.spans = mc.parts.map((file) =>
        parts
          .find((part) => part.f === file)
          .segments.filter((segment) => segment.c === mc.id)
          .reduce((sum, segment) => sum + segment.lessons.length, 0),
      );
    }
    meta.parts = parts.map((part) => part.f);

    const dir = join(OUT_DIR, id);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });

    const metaBytes = Buffer.byteLength(JSON.stringify(meta));
    await writeFile(join(dir, `${id}-meta.json`), JSON.stringify(meta));
    let partBytes = 0;
    for (const part of parts) {
      const json = JSON.stringify(part);
      partBytes += Buffer.byteLength(json);
      await writeFile(join(dir, part.f), json);
    }
    console.log(
      `${id}: ${book.chapters.length} 章 ${book.lessonCount} 课 → ${parts.length} 块 | meta ${(metaBytes / 1024).toFixed(0)}KB + parts ${(partBytes / 1024).toFixed(0)}KB`,
    );
  }
}

await main();
