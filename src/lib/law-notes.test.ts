import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LAW_NOTES_CAP,
  LAW_NOTE_MAX_LENGTH,
  addBookmark,
  addNote,
  countAllNotes,
  deleteNote,
  exportAllNotes,
  getAllNotes,
  getLessonBookmarks,
  getLessonNotes,
  importNotes,
  mergeImportedNotes,
  removeBookmark,
  searchNotes,
  serializeNotesForExport,
  updateNote,
} from "./law-notes";

/** 极简 localStorage 桩（与 law-history.test.ts 同款：safeLocalStorage 走 window.localStorage） */
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

let store: Map<string, string>;
const KEY = "nhb-law-notes-v1";

beforeEach(() => {
  store = stubStorage();
  vi.useFakeTimers();
  vi.setSystemTime(Date.parse("2026-09-10T03:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("law-notes CRUD", () => {
  it("addNote：新增带时间戳与 id，trim 空文本拒绝返回 null", () => {
    const note = addNote("minfa-q001", "  请求权基础思维  ");
    expect(note).not.toBeNull();
    expect(note?.text).toBe("请求权基础思维");
    expect(note?.createdAt).toBe(Date.parse("2026-09-10T03:00:00"));
    expect(note?.updatedAt).toBe(note?.createdAt);
    expect(note?.stepId).toBeUndefined();
    expect(addNote("minfa-q001", "   ")).toBeNull();
  });

  it("addNote：stepId 可选关联", () => {
    const note = addNote("minfa-q001", "这步是定义", "s0");
    expect(note?.stepId).toBe("s0");
  });

  it("getLessonNotes：按创建时间倒序（最新的在前）", () => {
    vi.setSystemTime(1000);
    addNote("xianfa-q001", "第一条");
    vi.setSystemTime(2000);
    addNote("xianfa-q001", "第二条");
    vi.setSystemTime(3000);
    addNote("xianfa-q001", "第三条");
    const notes = getLessonNotes("xianfa-q001");
    expect(notes.map((note) => note.text)).toEqual(["第三条", "第二条", "第一条"]);
  });

  it("updateNote：改文本并刷新 updatedAt；不存在的笔记返回 false；空文本拒绝", () => {
    const note = addNote("minfa-q001", "初稿")!;
    vi.setSystemTime(5000);
    expect(updateNote("minfa-q001", note.id, "  定稿版本  ")).toBe(true);
    const saved = getLessonNotes("minfa-q001")[0];
    expect(saved.text).toBe("定稿版本");
    expect(saved.updatedAt).toBe(5000);
    expect(saved.createdAt).toBe(Date.parse("2026-09-10T03:00:00"));
    expect(updateNote("minfa-q001", "不存在", "文本")).toBe(false);
    expect(updateNote("没有这课", note.id, "文本")).toBe(false);
    expect(updateNote("minfa-q001", note.id, "  ")).toBe(false);
  });

  it("deleteNote：删除生效并剪掉空课时键；删除不存在的返回 false", () => {
    const a = addNote("minfa-q001", "要留下的")!;
    const b = addNote("minfa-q001", "要删掉的")!;
    expect(deleteNote("minfa-q001", b.id)).toBe(true);
    expect(getLessonNotes("minfa-q001").map((note) => note.id)).toEqual([a.id]);
    expect(deleteNote("minfa-q001", b.id)).toBe(false);
    // 删到空：课时键整个从存储里剪掉（存储紧凑）
    expect(deleteNote("minfa-q001", a.id)).toBe(true);
    expect(store.get(KEY)).toBe("{}");
  });

  it("书签：添加/覆盖/移除；书签不受 500 条上限影响", () => {
    const base = Date.now();
    addBookmark("xingfa-q001", "s1", "犯罪构成");
    vi.setSystemTime(base + 1000);
    addBookmark("xingfa-q001", "s2", "因果关系");
    // 同 stepId 重复添加 → 覆盖 label、不动 createdAt
    vi.setSystemTime(base + 2000);
    addBookmark("xingfa-q001", "s1", "犯罪构成（修正）");
    const bookmarks = getLessonBookmarks("xingfa-q001");
    expect(bookmarks).toHaveLength(2);
    expect(bookmarks[0].label).toBe("犯罪构成（修正）"); // 按 createdAt 排序后 s1 仍是第一个
    expect(bookmarks[0].createdAt).toBe(base); // 覆盖不改创建时间
    expect(removeBookmark("xingfa-q001", "s2")).toBe(true);
    expect(removeBookmark("xingfa-q001", "s2")).toBe(false);
    expect(getLessonBookmarks("xingfa-q001")).toHaveLength(1);
  });
});

describe("law-notes 搜索", () => {
  it("searchNotes：跨课时匹配，命中带 lessonId 上下文与摘要", () => {
    vi.setSystemTime(1000);
    addNote("minfa-q001", "善意取得是物权编的核心制度");
    vi.setSystemTime(2000);
    addNote("xingfa-q001", "正当防卫要求不法侵害正在进行");
    const hits = searchNotes("正当防卫");
    expect(hits).toHaveLength(1);
    expect(hits[0].lessonId).toBe("xingfa-q001");
    expect(hits[0].excerpt).toContain("正当防卫");
    expect(hits[0].note.text).toContain("正当防卫");
  });

  it("searchNotes：大小写不敏感、空关键词返回空、无命中返回空", () => {
    addNote("falixue-q001", "Legal rule 与法律规则");
    expect(searchNotes("LEGAL")).toHaveLength(1);
    expect(searchNotes("  ")).toEqual([]);
    expect(searchNotes("不存在的词")).toEqual([]);
  });

  it("searchNotes：超长文本的摘要在命中词附近截断加省略号", () => {
    const long = "前".repeat(100) + "关键词在中间" + "后".repeat(100);
    addNote("minfa-q001", long);
    const [hit] = searchNotes("关键词");
    expect(hit.excerpt.startsWith("…")).toBe(true);
    expect(hit.excerpt.endsWith("…")).toBe(true);
    expect(hit.excerpt.length).toBeLessThan(long.length);
  });
});

describe("law-notes 上限与防腐", () => {
  it("超过 500 条 FIFO 淘汰 createdAt 最旧的（跨课时合计）", () => {
    for (let i = 0; i < LAW_NOTES_CAP; i += 1) {
      vi.setSystemTime(1000 + i);
      addNote("minfa-q001", `笔记 ${i}`);
    }
    expect(countAllNotes()).toBe(LAW_NOTES_CAP);
    // 再加一条 → 最旧的「笔记 0」被淘汰
    addNote("xingfa-q001", "新来的挤掉最旧的");
    expect(countAllNotes()).toBe(LAW_NOTES_CAP);
    expect(searchNotes("笔记 0")).toEqual([]);
    expect(searchNotes("新来的挤掉最旧的")).toHaveLength(1);
  });

  it("损坏的 JSON 回退空库（不 throw、不丢写权）", () => {
    store.set(KEY, "{这不是JSON");
    expect(getLessonNotes("minfa-q001")).toEqual([]);
    expect(countAllNotes()).toBe(0);
    // 坏数据被读成空库后，写入能正常重建
    expect(addNote("minfa-q001", "重建")).not.toBeNull();
    expect(countAllNotes()).toBe(1);
  });

  it("结构残缺的条目被逐条过滤（旧数据无笔记字段/字段缺失不炸）", () => {
    store.set(
      KEY,
      JSON.stringify({
        "minfa-q001": {
          notes: [
            { id: "n1", text: "合法笔记", createdAt: 1, updatedAt: 1 },
            { text: "缺 id 的垃圾" },
            { id: "", text: "空 id", createdAt: 1, updatedAt: 1 },
            "纯字符串垃圾",
            { id: "n2", text: 42, createdAt: 1, updatedAt: 1 },
          ],
          bookmarks: [{ stepId: "s0", label: "书签", createdAt: 1 }],
        },
        "空课课时": { notes: [], bookmarks: [] },
        "垃圾课时": "不是对象",
      }),
    );
    const notes = getLessonNotes("minfa-q001");
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe("n1");
    expect(getLessonBookmarks("minfa-q001")).toHaveLength(1);
    expect(getLessonNotes("空课课时")).toEqual([]);
    expect(getLessonNotes("垃圾课时")).toEqual([]);
  });

  it("超长文本写时截断到 2000 字符", () => {
    const note = addNote("minfa-q001", "长".repeat(5000))!;
    expect(note.text.length).toBe(LAW_NOTE_MAX_LENGTH);
    // updateNote 同样截断
    updateNote("minfa-q001", note.id, "改".repeat(5000));
    expect(getLessonNotes("minfa-q001")[0].text.length).toBe(LAW_NOTE_MAX_LENGTH);
  });

  it("localStorage 写入失败不 throw（隐私模式防腐）", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      },
    });
    expect(() => addNote("minfa-q001", "写不进去也要安静")).not.toThrow();
    // 内存返回值仍然有效（本次会话内可用）
    expect(addNote("minfa-q001", "第二条")?.text).toBe("第二条");
  });
});

describe("law-notes 导出/导入", () => {
  it("serializeNotesForExport：带版本与时间的完整快照", () => {
    addNote("minfa-q001", "导出我", "s1");
    addBookmark("minfa-q001", "s1", "定义步");
    const parsed = JSON.parse(serializeNotesForExport()) as {
      version: number;
      exportedAt: number;
      notes: Record<string, unknown>;
    };
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBe(Date.parse("2026-09-10T03:00:00"));
    expect(Object.keys(parsed.notes)).toEqual(["minfa-q001"]);
  });

  it("exportAllNotes：无 DOM 环境只返回 JSON 文本（不触发下载）", () => {
    addNote("minfa-q001", "内容");
    const json = exportAllNotes();
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("mergeImportedNotes：新 id 追加、同 id 覆盖（保留本地其余笔记）", () => {
    vi.setSystemTime(1000);
    const local = addNote("minfa-q001", "本地笔记")!;
    vi.setSystemTime(2000);
    addNote("minfa-q001", "本地另一条");
    const result = mergeImportedNotes({
      version: 1,
      notes: {
        "minfa-q001": {
          notes: [
            { id: local.id, text: "导入覆盖版", createdAt: 1, updatedAt: 2 },
            { id: "imported-new", text: "导入的新笔记", createdAt: 3, updatedAt: 3 },
          ],
          bookmarks: [],
        },
      },
    });
    expect(result).toEqual({ imported: 2, skipped: 0 });
    const notes = getLessonNotes("minfa-q001");
    expect(notes).toHaveLength(3);
    expect(notes.find((note) => note.id === local.id)?.text).toBe("导入覆盖版");
    expect(notes.find((note) => note.id === "imported-new")?.text).toBe("导入的新笔记");
  });

  it("mergeImportedNotes：非法载荷与坏条目计入 skipped，不炸不覆盖", () => {
    expect(mergeImportedNotes(null)).toEqual({ imported: 0, skipped: 0 });
    expect(mergeImportedNotes("字符串")).toEqual({ imported: 0, skipped: 0 });
    expect(mergeImportedNotes({ version: 1 })).toEqual({ imported: 0, skipped: 0 });
    const bad = mergeImportedNotes({
      notes: { "minfa-q001": { notes: [{ text: "缺 id" }, "垃圾"], bookmarks: [] } },
    });
    expect(bad).toEqual({ imported: 0, skipped: 2 });
    expect(countAllNotes()).toBe(0);
  });

  it("importNotes：从 File 恢复（导出→清空→导入还原）", async () => {
    addNote("minfa-q001", "防丢的笔记");
    const json = serializeNotesForExport();
    const file = new File([json], "backup.json", { type: "application/json" });
    store.clear(); // 模拟换设备/清空后恢复
    const result = await importNotes(file);
    expect(result.imported).toBe(1);
    expect(getLessonNotes("minfa-q001")[0].text).toBe("防丢的笔记");
    // 坏文件安静失败
    const broken = await importNotes(new File(["{坏"], "broken.json", { type: "application/json" }));
    expect(broken.imported).toBe(0);
  });

  it("导入超过 500 条同样执行 FIFO 淘汰", () => {
    const notes = Array.from({ length: LAW_NOTES_CAP + 10 }, (_, i) => ({
      id: `n${i}`,
      text: `导入 ${i}`,
      createdAt: i,
      updatedAt: i,
    }));
    const result = mergeImportedNotes({ notes: { "minfa-q001": { notes, bookmarks: [] } } });
    expect(result.imported).toBe(LAW_NOTES_CAP + 10);
    expect(countAllNotes()).toBe(LAW_NOTES_CAP);
    expect(searchNotes("导入 0")).toEqual([]); // 最旧的 10 条被淘汰
    expect(searchNotes("导入 509")).toHaveLength(1);
  });
});

describe("law-notes 汇总读取", () => {
  it("getAllNotes：打平全部课时并按 updatedAt 倒序", () => {
    vi.setSystemTime(1000);
    addNote("minfa-q001", "旧");
    vi.setSystemTime(2000);
    const moved = addNote("xingfa-q001", "中")!;
    vi.setSystemTime(3000);
    addNote("minfa-q001", "新");
    // 更新中间那条 → updatedAt 跳到最前
    vi.setSystemTime(4000);
    updateNote("xingfa-q001", moved.id, "中（更新）");
    const all = getAllNotes();
    expect(all.map((note) => note.text)).toEqual(["中（更新）", "新", "旧"]);
    expect(all.every((note) => typeof note.lessonId === "string")).toBe(true);
  });
});
