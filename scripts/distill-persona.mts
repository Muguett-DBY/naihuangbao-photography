/**
 * distill-persona.mts — 把一年期微信聊天记录蒸馏成画像统计 + 四分类分层样本 + 冲突链素材。
 *
 * 用法: node --import tsx scripts/distill-persona.mts
 * 输入: E:\DEV\TEST\wechat-export\export\WuWuWu_chat.csv (utf-8-sig, CRLF, 含多行引号字段)
 * 输出(重输出不提交, .tmp/ 已被 .gitignore 忽略):
 *   .tmp/persona-stats.json                 — 双人统计画像
 *   .tmp/persona-samples/su.txt             — 苏一平的四池分层样本(≤400 行, 带池标签)
 *   .tmp/persona-samples/liao.txt           — 廖文静的四池分层样本(≤400 行, 带池标签)
 *   .tmp/persona-samples/su-conflicts.txt   — 苏一平参与的完整冲突序列(触发→升级→收场)
 *   .tmp/persona-samples/liao-conflicts.txt — 廖文静参与的完整冲突序列
 *
 * 分类法(参考 ex-skill chat_analyzer 四分类): 长消息(>50字观点/情绪抒发)、冲突、甜蜜、日常闲聊。
 * 只统计「文本」「引用回复」两类；引用回复剥掉尾部 " ⇠ 引用: …"。
 * 脱敏: 手机号 / 身份证 / 银行卡长数字串 / 门牌号 → 占位符, 统计与样本一律先洗后算。
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { dirname } from "node:path";

const ROOT = resolve(dirname(process.argv[1] ?? "."), "..");
const CSV_PATH = "E:/DEV/TEST/wechat-export/export/WuWuWu_chat.csv";
const OUT_DIR = join(ROOT, ".tmp");
const SAMPLE_DIR = join(OUT_DIR, "persona-samples");

/** 发送者 → 人。飛燕 = 苏一平；* ੯‧̀͡⬮小狗狗💛 = 廖文静。 */
const SU_SENDER = "飛燕";
const LIAO_SENDER = "* ੯‧̀͡⬮小狗狗💛";

function who(sender: string): "su" | "liao" | null {
  if (sender === SU_SENDER || sender.includes("飛燕") || sender.includes("飞燕")) return "su";
  if (sender === LIAO_SENDER || sender.includes("小狗狗")) return "liao";
  return null;
}

// ---------------------------------------------------------------- CSV 解析

/** RFC4180 状态机: 处理 BOM、CRLF、双引号转义、字段内换行。 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// ---------------------------------------------------------------- 脱敏

const SCRUBBERS: [RegExp, string, string][] = [
  // 身份证 (18 位, 末位可为 X)
  [/(?<!\d)\d{17}[0-9Xx](?!\d)/g, "[证件号]", "idCard"],
  // 银行卡级长数字串 (16-19 位)
  [/(?<!\d)\d{16,19}(?!\d)/g, "[卡号]", "card"],
  // 大陆手机号
  [/(?<!\d)1[3-9]\d{9}(?!\d)/g, "[电话]", "phone"],
  // 座机 (区号-号码)
  [/(?<!\d)0\d{2,3}-?\d{7,8}(?!\d)/g, "[电话]", "landline"],
  // 门牌号: 3栋2单元501室 / 5号楼802 / 12幢3单元26号 之类
  [/\d{1,4}\s*[栋幢楼]\s*\d{0,3}\s*单元\s*\d{1,5}\s*[号室]?/g, "[门牌]", "address"],
  [/\d{1,4}\s*号楼\s*\d{1,5}\s*(室|号)?/g, "[门牌]", "address"],
  [/\d{1,4}\s*[栋幢]\s*\d{1,5}\s*[号室]/g, "[门牌]", "address"],
  [/\d{1,3}\s*层\s*\d{1,4}\s*号/g, "[门牌]", "address"],
];

const scrubCounts: Record<string, number> = {};

function scrub(text: string): string {
  let out = text;
  for (const [re, token, key] of SCRUBBERS) {
    out = out.replace(re, () => { scrubCounts[key] = (scrubCounts[key] ?? 0) + 1; return token; });
  }
  return out;
}

// ---------------------------------------------------------------- 过滤

/** 引用尾巴: "正文 ⇠ 引用: 被引用内容"（引用内容里常带 xml/表情占位，整体丢弃）。 */
function stripQuoteTail(content: string): string {
  return content.replace(/\s*⇠\s*引用[:：][\s\S]*$/, "").trim();
}

const PLACEHOLDER_ONLY = /^\[[^\]]*\]$/; // "[图片]" "[动画表情]" 等占位
const XML_RE = /<\?xml|<msg\b|&lt;|<[a-z][\w-]*[\s/>]/i;
const URL_RE = /https?:\/\/|www\.|\.(com|cn|net|org|xyz|top|me|io)\b/i;

/** 含 xml / 网址 / 纯符号(无字母数字汉字) 的消息 → 采样时剔除。 */
function isJunkForSample(text: string): boolean {
  if (text.length < 2) return true;
  if (PLACEHOLDER_ONLY.test(text) || XML_RE.test(text) || URL_RE.test(text)) return true;
  return !/[\p{L}\p{N}]/u.test(text);
}

// ---------------------------------------------------------------- 四分类池

/** 冲突: 争吵/冷战/道歉/分手/负面情绪 */
const CONFLICT_RE = /(生气|气死|气人|好气|气到|气哭|火大|吵架|吵了一架|吵一架|跟你吵|对不起|抱歉|我错了|原谅|道歉|分手|和好|冷战|不想理|不理我|不想说话|不想跟你说|拉黑|删了吧|删了我|后悔|受够|烦死|你烦|别烦我|讨厌你|恨你|滚蛋|你给我滚|哭死|眼泪|哭了|嚎啕|难过|难受|委屈|失望|心寒|伤心|崩溃|挂你电话|挂电话|不接电话|关机|你忙吧|呵呵|随便你|无所谓|懒得理|懒得说|没意思|真下头|下头|绝交|再见吧|受够了|受不了你|你怎么这样|你能不能|有病吧|神经病|凶我|吼我|大声)/;
/** 甜蜜: 表白/撒娇/想念/关心 */
const SWEET_RE = /(想你|想我了吗|好想你|想见你|喜欢你|爱你|我爱|亲亲|么么|mua|啵|抱抱|抱一下|抱住|抱着|贴贴|摸摸|摸头|牵手|牵着我|老公|老婆|宝宝|宝贝|崽崽|猪猪|乖啦|乖乖|好乖|真乖|陪你|陪着我|陪你到|等你|等我来|吃了吗|吃饭了吗|吃了没|早点睡|晚安|早安|多穿|加衣服|盖好被子|多喝水|喝热水|小心点|注意安全|到家了|到家没|报平安|路上小心|照顾好|梦见|梦到|结婚|娶你|嫁给我|以后我们|亲一口|亲一个|比心|爱你哦|爱你呀|抱紧|求抱|嘤嘤|呜呜|好嘛|好不好嘛|撒娇)/;

type Pool = "冲突" | "甜蜜" | "长文" | "日常";
const LONG_LEN = 50;

function poolOf(text: string): Pool {
  if (CONFLICT_RE.test(text)) return "冲突";
  if (SWEET_RE.test(text)) return "甜蜜";
  if ([...text].length > LONG_LEN) return "长文";
  return "日常";
}

// ---------------------------------------------------------------- 工具

const len = (s: string) => [...s].length; // 按 Unicode 码点计数

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function topN(map: Map<string, number>, n: number): [string, number][] {
  return [...map.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, n);
}

// ---------------------------------------------------------------- 主流程

interface KeptMsg {
  idx: number;          // CSV 行序
  person: "su" | "liao";
  time: Date;
  month: string;        // YYYY-MM
  hour: number;
  text: string;         // 剥引用尾 + 脱敏后
  pool: Pool;
}

function main() {
  const raw = readFileSync(CSV_PATH, "utf8");
  const rows = parseCsv(raw.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("CSV 为空或解析失败");

  const kept: KeptMsg[] = [];
  let skippedType = 0, skippedEmpty = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 4) continue;
    const [timeStr, sender, type, content] = [r[0], r[1], r[2], r[3] ?? ""];
    if (type !== "文本" && type !== "引用回复") { skippedType++; continue; }
    const person = who(sender);
    if (!person) { skippedType++; continue; }
    const time = new Date(timeStr.replace(" ", "T"));
    if (Number.isNaN(time.getTime())) { skippedType++; continue; }
    let text = scrub(type === "引用回复" ? stripQuoteTail(content) : content.trim());
    text = text.trim();
    if (!text || PLACEHOLDER_ONLY.test(text)) { skippedEmpty++; continue; }
    kept.push({
      idx: i,
      person,
      time,
      month: timeStr.slice(0, 7),
      hour: time.getHours(),
      text,
      pool: poolOf(text),
    });
  }

  // ---------------- 逐人统计 (A 部分) ----------------
  const stats: Record<"su" | "liao", Record<string, unknown>> = {};

  for (const person of ["su", "liao"] as const) {
    const msgs = kept.filter((m) => m.person === person);
    const lengths = msgs.map((m) => len(m.text)).sort((a, b) => a - b);
    const pct = (n: number) => +((n / (msgs.length || 1)) * 100).toFixed(1);
    const inRange = (lo: number, hi: number) => lengths.filter((l) => l >= lo && l <= hi).length;

    // 句长分布: 任务要求的三档占比 + 细分档
    const lenDistAsk = {
      "<10字": { n: inRange(1, 9), pct: pct(inRange(1, 9)) },
      "10-30字": { n: inRange(10, 30), pct: pct(inRange(10, 30)) },
      ">30字": { n: inRange(31, Infinity), pct: pct(inRange(31, Infinity)) },
    };

    // 标点习惯: ！？～…。（全角为主, 半角单列）
    const punctDefs = ["！", "？", "～", "…", "。", "!", "?", "~", "，", "、", "…哈哈", "···"];
    const punct = punctDefs.map((p) => {
      const total = msgs.reduce((s, m) => s + [...m.text].filter((ch) => ch === p).length, 0);
      const msgsContaining = msgs.filter((m) => m.text.includes(p)).length;
      return { char: p, total, per100msg: +((total / msgs.length) * 100).toFixed(1), msgPct: pct(msgsContaining) };
    });

    // emoji (ZWJ 序列合并计数)
    const EMOJI_RE = /\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*/gu;
    const emoji = new Map<string, number>();
    for (const m of msgs) for (const e of m.text.matchAll(EMOJI_RE)) emoji.set(e[0], (emoji.get(e[0]) ?? 0) + 1);

    // 颜文字: 括号组内不含汉字/长度<=16 + 手工观察名单
    const KAOMOJI_RE = /[（(][^()（）\p{Script=Han}]{1,16}[)）]/gu;
    const kaomoji = new Map<string, number>();
    for (const m of msgs)
      for (const k of m.text.matchAll(KAOMOJI_RE)) {
        const v = k[0];
        if (/[.\n!=+/^~ω°･*＊^─=]/.test(v) || /\p{So}|\p{Sk}/u.test(v)) kaomoji.set(v, (kaomoji.get(v) ?? 0) + 1);
      }
    for (const watch of ["੯‧̀͡⬮", "ᓚᘏᓗ", "( ^_^)", "TAT", "QAQ", "QWQ", "0.0", "0v0", "T^T", "qwq", "ovo"]) {
      const c = msgs.filter((m) => m.text.includes(watch)).length;
      if (c > 0) kaomoji.set(watch, c);
    }

    // 高频 2-4 字词组: 汉字连续段滑窗; 只保留"不被更长高频词组吞掉"的
    const grams = new Map<string, number>();
    for (const m of msgs) {
      for (const run of m.text.matchAll(/[\u4e00-\u9fff]+/g)) {
        const s = run[0];
        for (let n = 2; n <= 4; n++)
          for (let i = 0; i + n <= s.length; i++) {
            const g = s.slice(i, i + n);
            grams.set(g, (grams.get(g) ?? 0) + 1);
          }
      }
    }
    const gramList = [...grams.entries()];
    const independent = gramList.filter(([g, c]) => {
      if (c < 8) return false; // 低频噪声
      return !gramList.some(([h, hc]) => {
        if (h.length <= g.length || !h.includes(g)) return false;
        return hc * 2 >= c;
      });
    });
    const phraseTop = independent.sort((a, b) => b[1] - a[1]).slice(0, 30);

    // 短消息整句复现榜 (≤8字, ≥15次) — 口头禅最直接证据
    const shortMsg = new Map<string, number>();
    for (const m of msgs) if (len(m.text) <= 8) shortMsg.set(m.text, (shortMsg.get(m.text) ?? 0) + 1);
    const shortMsgTop = [...shortMsg.entries()].filter(([, c]) => c >= 15).sort((a, b) => b[1] - a[1]).slice(0, 40);

    // 互称: 候选称呼在本人消息里出现的人次
    const addressTokens = ["文静", "静静", "小狗狗", "狗狗", "小狗", "狗子", "宝宝", "宝贝", "老婆", "老公", "媳妇", "猪猪", "猪", "崽崽", "崽", "一平", "平平", "飞燕", "飛燕", "燕哥", "平哥", "哥哥", "姐姐", "妹妹", "亲爱的", "老师", "同学", "小猫", "猫猫", "飞飞"];
    const address = addressTokens
      .map((t) => ({ token: t, msgs: msgs.filter((m) => m.text.includes(t)).length }))
      .filter((x) => x.msgs > 0)
      .sort((a, b) => b.msgs - a.msgs);

    // 作息热力 + 月度消息量 + 池规模
    const hours = Array.from({ length: 24 }, () => 0);
    for (const m of msgs) hours[m.hour]++;
    const byMonth = new Map<string, number>();
    for (const m of msgs) byMonth.set(m.month, (byMonth.get(m.month) ?? 0) + 1);
    const poolCounts: Record<Pool, number> = { 冲突: 0, 甜蜜: 0, 长文: 0, 日常: 0 };
    for (const m of msgs) poolCounts[m.pool]++;

    stats[person] = {
      msgCount: msgs.length,
      avgLen: +(lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1)).toFixed(1),
      medianLen: lengths[Math.floor(lengths.length / 2)] ?? 0,
      lenDistAsk,
      lenDist: { "1-5字": inRange(1, 5), "6-10字": inRange(6, 10), "11-20字": inRange(11, 20), "21-40字": inRange(21, 40), "41字+": inRange(41, Infinity) },
      punctuation: punct,
      emojiTop15: topN(emoji, 15),
      kaomojiTop15: topN(kaomoji, 15),
      phraseTop30: phraseTop,
      shortMsgTop,
      addressTokens: address,
      hourHistogram: hours,
      months: [...byMonth.entries()].sort(),
      poolCounts,
    };
  }

  // ---------------- 四池按月分层抽样 (B 部分, 每人 ≤400 行) ----------------
  const LINES_PER_PERSON = 400;
  const POOL_QUOTA: Record<Pool, number> = { 冲突: 170, 甜蜜: 170, 长文: 40, 日常: 20 };

  function samplePoolLines(person: "su" | "liao"): string[] {
    const other = person === "su" ? "liao" : "su";
    // 候选: 本人的消息 + 紧邻对方的上一句(≤30min)作为语境
    const candidates: { pool: Pool; month: string; time: string; ctx: string | null; text: string }[] = [];
    for (let i = 1; i < kept.length; i++) {
      const me = kept[i], prev = kept[i - 1];
      if (me.person !== person) continue;
      let ctx: string | null = null;
      if (prev && prev.person === other && me.time.getTime() - prev.time.getTime() <= 30 * 60_000 && !isJunkForSample(prev.text)) {
        ctx = prev.text.replace(/\s+/g, " ").slice(0, 120);
      }
      candidates.push({
        pool: me.pool,
        month: me.month,
        time: `${String(me.time.getMonth() + 1).padStart(2, "0")}-${String(me.time.getDate()).padStart(2, "0")} ${String(me.time.getHours()).padStart(2, "0")}:${String(me.time.getMinutes()).padStart(2, "0")}`,
        ctx,
        text: me.text.replace(/\s+/g, " ").slice(0, 200),
      });
    }
    // 按池分桶、桶内按月分桶; 配额用不满时滚动让给 冲突→甜蜜→长文→日常
    const byPool = new Map<Pool, Map<string, typeof candidates>>();
    for (const c of candidates) {
      if (isJunkForSample(c.text)) continue;
      const m = byPool.get(c.pool) ?? new Map();
      const list = m.get(c.month) ?? [];
      list.push(c); m.set(c.month, list); byPool.set(c.pool, m);
    }
    const avail = (p: Pool) => [...(byPool.get(p)?.values() ?? [])].reduce((s, a) => s + a.length, 0);
    const quota: Record<Pool, number> = { ...POOL_QUOTA };
    const order: Pool[] = ["冲突", "甜蜜", "长文", "日常"];
    let rest = 0;
    for (const p of order) {
      const a = avail(p);
      if (quota[p] > a) { rest += quota[p] - a; quota[p] = a; }
    }
    // 把缺口补给还有余量的池(优先 冲突→甜蜜→长文→日常)
    for (const p of order) {
      if (rest <= 0) break;
      const a = avail(p);
      const add = Math.min(rest, a - quota[p]);
      if (add > 0) { quota[p] += add; rest -= add; }
    }
    const rand = mulberry32(person === "su" ? 20261012 : 20261013); // 固定种子, 可复现
    const picked: { pool: Pool; month: string; time: string; ctx: string | null; text: string }[] = [];
    for (const p of order) {
      const months = [...(byPool.get(p)?.keys() ?? [])].sort();
      const pools = months.map((mo) => shuffled(byPool.get(p)!.get(mo)!, rand));
      let n = 0;
      while (picked.length < LINES_PER_PERSON && pools.some((x) => x.length > 0) && n < 5000) {
        let progressed = false;
        for (const pool of pools) {
          if (quota[p] <= 0) break;
          const item = pool.pop();
          if (item) { picked.push(item); quota[p]--; progressed = true; }
        }
        if (!progressed) break;
        n++;
      }
    }
    // 时间序输出, 便于精读时感受关系走向
    picked.sort((a, b) => a.time.localeCompare(b.time));
    return picked.map((p) =>
      `[${p.pool}][${p.month}][${p.time}]${p.ctx ? ` 对方:${p.ctx}` : ""} ┊ 本人:${p.text}`
    );
  }

  // ---------------- 冲突链 (C 部分: 每人 5-8 段, 各 3-6 条连排原文) ----------------
  function conflictSequences(person: "su" | "liao"): string[] {
    // 冲突区域: 连续(间隔≤4h)的冲突消息(双方都算), 前后各带 ≤2 条语境
    const flagged = kept.map((m) => CONFLICT_RE.test(m.text));
    const regions: { start: number; end: number; flags: number[] }[] = [];
    let cur: { start: number; end: number; flags: number[] } | null = null;
    for (let i = 0; i < kept.length; i++) {
      if (!flagged[i]) continue;
      if (cur && kept[i].time.getTime() - kept[cur.end].time.getTime() <= 4 * 3600_000) {
        cur.end = i; cur.flags.push(i);
      } else {
        if (cur) regions.push(cur);
        cur = { start: i, end: i, flags: [i] };
      }
    }
    if (cur) regions.push(cur);

    // 展开为序列: 触发(带前文) → 升级 → 收场(带后文), 滑窗挑冲突密度最高的 ≤6 条
    const seqs: { month: string; mineCount: number; flags: number; lines: string[] }[] = [];
    for (const r of regions) {
      if (r.flags.length < 2) continue; // 单条负面情绪不算完整冲突
      const s = Math.max(0, r.start - 2);
      const e = Math.min(kept.length - 1, r.end + 2);
      const slice = kept.slice(s, e + 1);
      if (slice.length < 3) continue;
      const win = Math.min(6, slice.length);
      let best: { score: number; from: number } | null = null;
      for (let from = 0; from + win <= slice.length; from++) {
        const flagsIn = slice.slice(from, from + win).filter((m) => CONFLICT_RE.test(m.text)).length;
        if (flagsIn < 2) continue;
        const score = flagsIn * 10 - from; // 同密度取更早(触发段)
        if (!best || score > best.score) best = { score, from };
      }
      if (!best) continue;
      const window = slice.slice(best.from, best.from + win);
      const mineCount = window.filter((m) => m.person === person).length;
      const personFlags = window.filter((m) => m.person === person && CONFLICT_RE.test(m.text)).length;
      if (personFlags < 1) continue; // 该人不参与的不进该人的冲突链
      const lines = window.map((m) =>
        `${fmt(m.time)} ${m.person === "su" ? "苏一平" : "廖文静"}: ${m.text.replace(/\s+/g, " ").slice(0, 220)}`
      );
      seqs.push({ month: window[0].month, mineCount, flags: personFlags, lines });
    }
    // 去重(相同起始时间) + 按本人冲突参与度排序 + 月份多样化挑 5-8 段
    const seen = new Set<string>();
    const unique = seqs.filter((s) => {
      const key = s.lines[0];
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    unique.sort((a, b) => b.flags * 2 + b.mineCount - (a.flags * 2 + a.mineCount));
    const chosen: typeof unique = [];
    const monthCount = new Map<string, number>();
    for (const s of unique) { // 第一轮: 每月最多 2 段, 保证时间覆盖
      if (chosen.length >= 8) break;
      const c = monthCount.get(s.month) ?? 0;
      if (c >= 2) continue;
      chosen.push(s); monthCount.set(s.month, c + 1);
    }
    for (const s of unique) { // 第二轮补足到 5 段
      if (chosen.length >= 5) break;
      if (!chosen.includes(s)) chosen.push(s);
    }
    return chosen.map((s, i) =>
      `### 序列${i + 1} · ${s.month} · 本侧冲突消息 ${s.flags} 条\n` + s.lines.join("\n")
    );
  }

  function fmt(t: Date): string {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`;
  }

  // ---------------- 落盘 ----------------
  mkdirSync(SAMPLE_DIR, { recursive: true });

  const suLines = samplePoolLines("su");
  const liaoLines = samplePoolLines("liao");
  writeFileSync(
    join(SAMPLE_DIR, "su.txt"),
    `# 苏一平（飛燕）四池分层样本 · ${suLines.length} 行 · 对方=廖文静 · 已脱敏/去xml/去网址/去纯符号\n# 格式: [池][YYYY-MM][MM-DD HH:MM] 对方:紧邻上一条(≤30min, 可缺) ┊ 本人:本人这条\n` + suLines.join("\n") + "\n",
    "utf8",
  );
  writeFileSync(
    join(SAMPLE_DIR, "liao.txt"),
    `# 廖文静（* ੯‧̀͡⬮小狗狗💛）四池分层样本 · ${liaoLines.length} 行 · 对方=苏一平 · 已脱敏/去xml/去网址/去纯符号\n# 格式: [池][YYYY-MM][MM-DD HH:MM] 对方:紧邻上一条(≤30min, 可缺) ┊ 本人:本人这条\n` + liaoLines.join("\n") + "\n",
    "utf8",
  );

  const suConf = conflictSequences("su");
  const liaoConf = conflictSequences("liao");
  writeFileSync(
    join(SAMPLE_DIR, "su-conflicts.txt"),
    `# 苏一平参与的完整冲突序列 · ${suConf.length} 段 · 触发→升级→收场连排原文(已脱敏)\n\n` + suConf.join("\n\n") + "\n",
    "utf8",
  );
  writeFileSync(
    join(SAMPLE_DIR, "liao-conflicts.txt"),
    `# 廖文静参与的完整冲突序列 · ${liaoConf.length} 段 · 触发→升级→收场连排原文(已脱敏)\n\n` + liaoConf.join("\n\n") + "\n",
    "utf8",
  );

  writeFileSync(
    join(OUT_DIR, "persona-stats.json"),
    JSON.stringify({
      generatedBy: "scripts/distill-persona.mts",
      csvPath: CSV_PATH,
      dateRange: [kept[0]?.month, kept[kept.length - 1]?.month],
      keptMsgs: kept.length,
      skippedType, skippedEmpty,
      scrubCounts,
      suConflictSequences: suConf.length,
      liaoConflictSequences: liaoConf.length,
      stats,
    }, null, 2),
    "utf8",
  );

  // 控制台摘要
  for (const person of ["su", "liao"] as const) {
    const s = stats[person];
    console.log(`\n=== ${person === "su" ? "苏一平(飛燕)" : "廖文静(小狗狗)"} ===`);
    console.log(`消息 ${s.msgCount} 条 | 平均 ${s.avgLen} 字 | 中位 ${s.medianLen} 字 | 池:`, JSON.stringify(s.poolCounts));
    console.log(`emoji top5:`, (s.emojiTop15 as [string, number][]).slice(0, 5).map(([e, c]) => `${e}x${c}`).join(" "));
    console.log(`短语 top10:`, (s.phraseTop30 as [string, number][]).slice(0, 10).map(([g, c]) => `${g}(${c})`).join(" "));
    console.log(`整句复现 top10:`, (s.shortMsgTop as [string, number][]).slice(0, 10).map(([g, c]) => `${g}(${c})`).join(" "));
    console.log(`互称:`, (s.addressTokens as { token: string; msgs: number }[]).slice(0, 8).map((a) => `${a.token}(${a.msgs})`).join(" "));
  }
  console.log(`\n样本行数: su=${suLines.length} liao=${liaoLines.length} | 冲突序列: su=${suConf.length} liao=${liaoConf.length}`);
  console.log(`脱敏替换:`, JSON.stringify(scrubCounts));
  console.log(`输出: ${OUT_DIR} / ${SAMPLE_DIR}`);
}

main();
