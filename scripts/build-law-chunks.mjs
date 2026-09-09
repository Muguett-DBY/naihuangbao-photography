// 法学数据分块构建：把 src/data/law/{id}.json（law:build 的产物，只读）切成
// "轻元数据 + 正文分块"两层，供 loader 按需加载。
//
// 输出 src/data/law/chunks/{id}/：
//   {id}-meta.json  书头 + 章树 + 每章词条 digest + leftover，v2 紧凑编码：
//     · 章树 ls 为元组 [短课id, 标题, f, lt?]——步数/首步 kind 从未运行时消费，
//       从 meta 剔除（需要时正文分块可重建）；课/章 id 去 `subject-` 前缀
//     · 章级 parts 文件名 → meta.parts 下标；lv → 固定枚举下标
//     · 词条 digest → dg：与 chapters 对齐，每章 {d:[章内唯一词条], x:[[词条索引…]]}，
//       x[j] = 第 j 课的课内去重词条——可无损重建每课词条表，
//       跨课重复由运行时 includes 去重兜住，collectSiblingTerms 语义不变（测试锁定）
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

/** 章级 level 枚举（与 src/types/law.ts 的 LawChapterLevel 对齐；meta 里存下标） */
const CHAPTER_LEVELS = ["part", "chapter", "section", "group"];

/** 单个分块文件的原始字节上限（正文 lesson 数组部分） */
const PART_MAX_BYTES = 95 * 1024;

// ── 课内分层（S6·T1）：单课正文超过阈值的拆出两个伴生文件 ──
//   {lessonId}-light.json 轻视图：前 LIGHT_STEPS_BYTES 的步骤全文 + 余下步骤占位元数据
//                         （{id,kind,text:""}）+ 前段原文行；loadLawLessonView 首屏只拉它
//   {lessonId}-tail.json  尾部全文：余下步骤 + 余下原文行；交互推进到占位步骤时才拉
// part 文件始终保留完整课——loadLawBook 的无损装配与等价性测试完全不受影响。
const LESSON_LAYER_BYTES = 48 * 1024;
const LIGHT_STEPS_BYTES = 32 * 1024;
const LIGHT_RAW_BYTES = 8 * 1024;

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

/**
 * 词条 digest 压缩：每章建唯一词条字典（首发序）+ 每课索引数组（课内去重）。
 * 课内重复词条对 collectSiblingTerms 输出无影响（includes 去重），故课内去重是等价变换；
 * 跨课重复保留（不进字典去重）——它影响"跳过某课"时的输出，必须让运行时照常扫描。
 */
function encodeDigests(chapters) {
  return chapters.map((chapter) => {
    const dict = [];
    const position = new Map();
    const perLesson = chapter.lessons.map((lesson) => {
      const seen = new Set();
      const indices = [];
      for (const term of lessonDigest(lesson)) {
        if (seen.has(term)) continue;
        seen.add(term);
        let at = position.get(term);
        if (at === undefined) {
          at = dict.length;
          dict.push(term);
          position.set(term, at);
        }
        indices.push(at);
      }
      return indices;
    });
    if (dict.length === 0) return null;
    return { d: dict, x: perLesson };
  });
}

async function main() {
  for (const id of SUBJECTS) {
    const book = JSON.parse(await readFile(join(SRC_DIR, `${id}.json`), "utf8")).book;
    const prefix = `${id}-`;

    const meta = {
      v: 2,
      id: book.id,
      name: book.name,
      fullName: book.fullName,
      emoji: book.emoji,
      accent: book.accent,
      accentSoft: book.accentSoft,
      lessonCount: book.lessonCount,
      leftover: book.leftover,
      parts: [],
      chapters: book.chapters.map((chapter) => {
        if (!chapter.id.startsWith(prefix) || chapter.lessons.some((lesson) => !lesson.id.startsWith(prefix))) {
          throw new Error(`${id}: 章/课 id 未带 ${prefix} 前缀，v2 紧凑编码无法去前缀`);
        }
        return {
          c: chapter.id.slice(prefix.length),
          t: chapter.title,
          st: chapter.semanticTitle,
          l: CHAPTER_LEVELS.indexOf(chapter.level),
          ax: chapter.appendix ? 1 : undefined,
          // 学习流 flag：与 isFlowLesson(chapter, lesson) 等价（附录章整章 false）；
          // 元组 [短课id, 标题, f, lt?]，lt 仅课内分层课存在
          ls: chapter.lessons.map((lesson) => {
            const tuple = [lesson.id.slice(prefix.length), lesson.title, !chapter.appendix && !isShellLesson(lesson) ? 1 : 0];
            return tuple;
          }),
        };
      }),
      // 词条 digest（编码见 encodeDigests；与 chapters 对齐，空章为 null）
      dg: encodeDigests(book.chapters),
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
    // 运行时用它把"章内第 i 课"定位到唯一 part 文件（wire 存 meta.parts 下标）
    for (let ci = 0; ci < meta.chapters.length; ci += 1) {
      const mc = meta.chapters[ci];
      mc.p = parts
        .map((part, partIndex) => (part.segments.some((segment) => segment.c === book.chapters[ci].id) ? partIndex : -1))
        .filter((index) => index >= 0);
      mc.s = mc.p.map((partIndex) =>
        parts[partIndex].segments
          .filter((segment) => segment.c === book.chapters[ci].id)
          .reduce((sum, segment) => sum + segment.lessons.length, 0),
      );
    }
    meta.parts = parts.map((part) => part.f);

    const dir = join(OUT_DIR, id);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });

    // ── 课内分层产物：单课超限拆 light/tail 伴生文件，meta.ls 元组第 4 位记前缀步数 ──
    let layeredCount = 0;
    for (const chapter of book.chapters) {
      const mc = meta.chapters.find((entry) => entry.c === chapter.id.slice(prefix.length));
      for (let lessonIndex = 0; lessonIndex < chapter.lessons.length; lessonIndex += 1) {
        const lesson = chapter.lessons[lessonIndex];
        if (Buffer.byteLength(JSON.stringify(lesson)) <= LESSON_LAYER_BYTES) continue;
        const sizes = lesson.steps.map((step) => Buffer.byteLength(JSON.stringify(step)));
        // 步骤前缀：至少 8 步（避免超短前缀），目标 ≤32KB
        let acc = 0;
        let k = 0;
        while (k < lesson.steps.length && (k < 8 || acc + sizes[k] <= LIGHT_STEPS_BYTES)) {
          acc += sizes[k];
          k += 1;
        }
        // 原文行前缀：目标 ≤8KB（原文对照面板先见首段，其余随尾部懒加载）
        let rawAcc = 0;
        let rawCount = 0;
        for (const line of lesson.raw) {
          const lineBytes = Buffer.byteLength(line) + 1;
          if (rawAcc + lineBytes > LIGHT_RAW_BYTES) break;
          rawAcc += lineBytes;
          rawCount += 1;
        }
        const light = {
          ...lesson,
          steps: lesson.steps
            .slice(0, k)
            .concat(lesson.steps.slice(k).map((step) => ({ id: step.id, kind: step.kind, text: "" }))),
          raw: lesson.raw.slice(0, rawCount),
        };
        const tail = {
          f: lesson.id,
          from: k,
          steps: lesson.steps.slice(k),
          raw: lesson.raw.slice(rawCount),
        };
        mc.ls[lessonIndex].push(k);
        layeredCount += 1;
        console.log(
          `  分层课 ${lesson.id}：${lesson.steps.length} 步 ${(Buffer.byteLength(JSON.stringify(lesson)) / 1024).toFixed(0)}KB → light 前 ${k} 步 + tail 后 ${lesson.steps.length - k} 步`,
        );
        await writeFile(join(dir, `${lesson.id}-light.json`), JSON.stringify(light));
        await writeFile(join(dir, `${lesson.id}-tail.json`), JSON.stringify(tail));
      }
    }
    if (layeredCount > 0) console.log(`  ${id}: ${layeredCount} 课做了课内分层`);

    const metaBytes = Buffer.byteLength(JSON.stringify(meta));
    const dgBytes = meta.dg ? Buffer.byteLength(JSON.stringify(meta.dg)) : 0;
    await writeFile(join(dir, `${id}-meta.json`), JSON.stringify(meta));
    let partBytes = 0;
    for (const part of parts) {
      const json = JSON.stringify(part);
      partBytes += Buffer.byteLength(json);
      await writeFile(join(dir, part.f), json);
    }
    console.log(
      `${id}: ${book.chapters.length} 章 ${book.lessonCount} 课 → ${parts.length} 块 | meta ${(metaBytes / 1024).toFixed(1)}KB（其中 dg 词条表 ${(dgBytes / 1024).toFixed(1)}KB） + parts ${(partBytes / 1024).toFixed(0)}KB`,
    );
  }
}

await main();
