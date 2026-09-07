// 法硕考研内容构建管线：
// 把 OCR 好的逐页文本解析为结构化 LawBook JSON（章节树 + 课时 + 动画步骤）。
// 保证：所有 OCR 文本行都必须落位（课时原文 raw 或 leftover），覆盖率不足会报警。
//
// 运行：node scripts/build-law-content.mjs
import { readFile, writeFile, readdir, mkdir, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const OCR_ROOT = join(root, ".tmp", "law-ocr");
const OUT_DIR = join(root, "src", "data", "law");

const BOOKS = [
  { id: "falixue", name: "法理学", fullName: "法理学背诵一本通", emoji: "⚖️", accent: "#6f9277", accentSoft: "#e7efe7" },
  { id: "xianfa", name: "宪法学", fullName: "宪法学背诵一本通", emoji: "🏛️", accent: "#b1544e", accentSoft: "#f6e5e2" },
  {
    id: "zhishixiang", name: "法制史", fullName: "法制史背诵一本通", emoji: "📜", accent: "#a9853f", accentSoft: "#f3ecd9",
    // 上编章末"思维导图总结表"的行标签（继承/强制措施/执行/债权）被误判为编章级标题，
    // 产生只含 1 个导览课的垃圾组，把真章拦腰切断——按名合并回前一章
    mergeTourGroups: ["继承", "强制措施", "执行", "债权"],
    // 附录四《考试大纲》断代考点索引（约 90 条"朝代→题号"索引行）：保留为附录，
    // 但不进学习流/目录/搜索/出题/课时计数
    appendixChapter: { titleIs: "绪论", minLessons: 50, rename: "附录·断代考点速查" },
  },
  { id: "minfa", name: "民法", fullName: "民法背诵一本通", emoji: "🏠", accent: "#5f7fae", accentSoft: "#e6ecf6" },
  { id: "xingfa", name: "刑法", fullName: "刑法背诵一本通", emoji: "🛡️", accent: "#96608f", accentSoft: "#efe6ee" },
];

// ── 正则模式 ──
const RE_PART = /^(第[一二三四五六七八九十百零0-9]+(编|部分|篇|卷)|(上|下|总|附)编|导\s*论(背诵误区与背诵方法)?|绪\s*论|总\s*论|分\s*论|附\s*论|专题[一二三四五六七八九十]+)/;
const RE_CHAPTER = /^第[一二三四五六七八九十百零0-9]+章/;
const RE_SECTION = /^第[一二三四五六七八九十百零0-9]+节/;
// 真题号兼容 1-3 位（民法编-题号式"5-161"，三位数此前被漏切进导览）
const RE_QUESTION = /^(?:第?[一二三四五六七八九十百零]{1,6}[、.]|\d{1,3}-\d{1,3}[.．、])/;
const RE_SUB = /^[（(][一二三四五六七八九十]{1,4}[)）]/;
const RE_LIST_ITEM = /^[①②③④⑤⑥⑦⑧⑨⑩]/;
const RE_NUM_ITEM = /^\d{1,2}[.、．]/;
const RE_PAGE_NO = /^\d{1,3}$/;

const HEADER_FOOTER = [
  /^法律.{1,4}考试.{1,4}一本通[·.。]/,
  // OCR 糊版页眉（"法律士考试背偏一木·法理学""法律硕士考试背一本迹·民法学"）
  /^法律[^。]{0,12}考试[^。]{0,12}·(法理学|宪法学|法制史|民法学|刑法学)$/,
  /^连续$/,
  /^续表$/,
];

const FIXES = [
  ["自已", "自己"],
  ["壹、", "一、"],
  [" ", " "],
];

// 页眉运行头"第X课○标题/附X○标题"的糊字形态（"第十一亿○法律制定""第大章○司法制度"
// "附件二○对比类考点归纳"）。干净形态（第N章○X）必须保留——它们是 semanticTitle 的别名来源；
// 只有带不上 RE_PART/RE_CHAPTER 前缀的糊字形态才会漏进正文，这里整行剥离（零误伤：
// 全部含 ○/〇 的 OCR 行已逐一枚举核实，正文含 ○ 仅"一八四○年"引文一种，被 1840 守卫放行）。
function isRunningHeaderLine(text) {
  if (!/[○〇]/.test(text)) return false;
  if (/一八四[○〇]年/.test(text)) return false;
  if (RE_PART.test(text) || RE_CHAPTER.test(text)) return false;
  if (text.length > 26) return false;
  if (/[。！？，；：]/.test(text)) return false;
  return (
    /^[策繁算]?第?[一二三四五六七八九十百0-9大小寮窜亿崇分王郁]{1,6}[课章編编意童崇郁分]?[○〇][一-龥（）"“”]{0,20}$/.test(
      text,
    ) || /^附[录件][一二三四五六0-9]{1,3}[○〇][^，。；]{0,22}$/.test(text)
  );
}

function isHeading(line) {
  if (RE_QUESTION.test(line) && line.length <= 40) return "question";
  if (RE_SUB.test(line) && line.length <= 40) return "sub";
  if (RE_NUM_ITEM.test(line) && line.length <= 40) return "num";
  return null;
}

function cleanLine(line) {
  let text = line.trim();
  for (const [from, to] of FIXES) text = text.split(from).join(to);
  if (HEADER_FOOTER.some((re) => re.test(text))) return "";
  // 纯符号噪音行（"/"、"，'：（-），：）"）——OCR 糊掉的目录点线/符号残片，
  // 不含任何汉字/字母/数字，真实内容行不可能全符号
  if (/^[\p{P}\p{S}‘’''""·…]+$/u.test(text)) return "";
  // 糊到失去结构的整行页眉变体（"法相士专使壹一未遭、共法学"）——精确串剥离零误伤
  if (text === "法相士专使壹一未遭、共法学") return "";
  if (isRunningHeaderLine(text)) return "";
  // 页边方法标注的独立行（"背诵内容""正反结合背诵内容"）——纯标签
  if (/^[一-龥]{0,8}背诵内容[：:]?$/.test(text)) return "";
  // 页脚日期行（"2026年6月"及与后续小节标题的焊接行）——纯噪音
  if (/^\d{4}年\d{1,2}月$/.test(text)) return "";
  if (/^\d{4}年\d{1,2}月(?=[一二三四五六七八九十]{1,3}[、.])/.test(text)) return "";
  if (RE_PAGE_NO.test(text)) return "";
  // 英文页眉/无关拉丁行（"CHAPTERONE"、"What" 这类 OCR 页眉残渣）
  if (/^[A-Za-z][A-Za-z\s.'-]{3,40}$/.test(text) && !/[。，：；]/.test(text)) return "";
  return text;
}

async function readPages(bookId) {
  const dir = join(OCR_ROOT, bookId);
  let files;
  try {
    files = (await readdir(dir)).filter((f) => /page-\d{5}\.txt$/.test(f)).sort();
  } catch {
    return []; // OCR 尚未完成
  }
  const pages = [];
  for (const file of files) {
    const content = await readFile(join(dir, file), "utf8");
    const pageNo = Number(file.match(/page-(\d{5})/)[1]);
    const lines = content
      .split("\n")
      .map(cleanLine)
      .filter((line) => line !== "");
    pages.push({ pageNo, lines });
  }
  return pages;
}

const META_TITLE = /^使用说明|^Instructions|^序\s*言|^前\s*言|^Preface|^作者的话|^绪\s*论|^导\s*论/i;

function isFrontMatterPage(page) {
  const lines = page.lines;
  const text = lines.join("\n");
  // 目录页：首行是"目录"，或同时出现多个章节标题与多个页码（目录续页）
  if (/^目录|^Contents/i.test(lines[0] ?? "")) return true;
  const chapterCount = lines.filter((line) => /^第[一二三四五六七八九十百零0-9]+[编章节]/.test(line)).length;
  const pageRefCount = lines.filter((line) => /^\/?[0-9]{1,3}$/.test(line)).length;
  if (chapterCount >= 2 && pageRefCount >= 2) return true;
  for (const line of lines) {
    if (RE_PART.test(line) || RE_CHAPTER.test(line) || RE_SECTION.test(line)) {
      return false;
    }
    if (/^使用说明|^Instructions/i.test(line)) return false;
  }
  return /图书在版编目|ISBN|目录|Contents|CHINA|Bei Song|中国石化|中国经济出版社|题名|责任编辑/.test(text);
}

function classifyChapterLevel(line) {
  if (RE_PART.test(line)) return "part";
  if (RE_CHAPTER.test(line)) return "chapter";
  if (RE_SECTION.test(line)) return "section";
  return "group";
}

function headingTitle(line, level, bookMeta) {
  let title = line
    .replace(/^第[一二三四五六七八九十百零0-9]+[编章节]/, "")
    .replace(/^[（(]?[一二三四五六七八九十]{1,6}[)）]?[、.]?/, "")
    .replace(/^[（(][一二三四五六七八九十]{1,4}[)）]/, "")
    .replace(/^\d{1,2}[.、]/, "")
    // 页眉装饰符开头的残迹（"○绪论"）——章标题不保留装饰符
    .replace(/^[○◎●◆・•·✦☆〇\s]+/, "")
    .trim();
  if (!title) title = line;
  return title;
}

function stripHeading(code, titleLine) {
  const title = titleLine
    .replace(/^[一二三四五六七八九十百零]{1,6}[、.]/, "")
    .replace(/^[（(][一二三四五六七八九十]{1,4}[)）]/, "")
    .replace(/^\d{1,2}[.、．]/, "")
    .replace(/^\d{1,2}-\d{1,2}[.、．]/, "")
    .trim();
  return polishTitle(title);
}

/** 文本规整：全角标点统一 + 连续标点压缩 + 高置信 OCR 残词修正 */
function polishText(text) {
  let t = text
    .replace(/[\u200b\u200e\u200f\u00a0]/g, "")
    .replace(/[ ]{2,}/g, " ")
    .replace(/，,/g, "，")
    .replace(new RegExp(",", "g"), "，")
    .replace(/;{1,}/g, "；")
    .replace(/：{1,}/g, "：")
    .replace(/。{2,}/g, "。")
    .replace(/！{2,}/g, "！")
    .replace(new RegExp("？{2,}", "g"), "？")
    .replace(/(，)+/g, "，")
    .replace(/(；)+/g, "；")
    .replace(/(：)+/g, "：")
    .replace(/[ \t]+/g, "");
  // 英文页眉残渣（高置信；Whig/Tory 等真实知识词不可删）
  // 注意：要在括号宽度统一之前做——否则 "(when)" 变全角后匹配不到
  t = t
    .replace(/[Cc]hapter[A-Za-z]*/g, "")
    .replace(/\b(What|True|Fals|Note|five|one|two|three)\b/g, "")
    .replace(/\((?:when|what|where|how|which)\)/gi, "");
  // 括号宽度统一：OCR 把全角注记括号写成半角/异体（"[示例2］""【表达逻辑）"），
  // 统一为全角一族，消除大量视觉失衡（语义上这些括号只有注记一种用途）
  t = t
    .replace(/\(/g, "（")
    .replace(/\)/g, "）")
    .replace(/[\[〔]/g, "［")
    .replace(/[\]〕]/g, "］")
    .replace(/【/g, "［")
    .replace(/】/g, "］");
  const OCR_FIX = [
    ["香义", "主要"],
    ["主香义", "主要"],
    ["权成", "权威"],
    ["尊严和权威", "尊严和权威"],
    ["背楠", "背诵"],
    ["学研", "学习"],
    ["筒述", "简述"],
    ["客休", "客体"],
    ["买奖合同", "买卖合同"],
    ["（-）", "（一）"],
    // 双栏焊接把"概念"插进"制定"中间（"制概念定颁布的规范性法律文件"）
    ["制概念定", "制定"],
    ["称植", "移植"],
    ["发累", "发展"],
    ["待殊", "特殊"],
    ["新瓶念法的影响", "新法的影响"],
    ["偏祖", "偏袒"],
    ["作为特殊的特殊裁判依据", "作为裁判依据"],
    // 页面换行把"…为主"与"主要内容…"焊接产生的叠字（高置信）
    ["主主要要内容", "主要内容"],
    ["主主要内容", "主要内容"],
    // ── 高置信 OCR 错字（对照《背诵一本通》原书核实）──
    ["恶意申通", "恶意串通"],
    ["具休", "具体"],
    ["借务的合义", "债务的含义"],
    ["公厅良俗", "公序良俗"],
    ["简过式事", "简述民事"],
    ["魏明帝曹《曹魏律》", "魏明帝曹叡《曹魏律》"],
    ["《北齐体》", "《北齐律》"],
    ["恪守职业道宿", "恪守职业道德"],
    // 背诵口诀前焊进的英文页眉残渣（"Feel非偶（非终是偶犯）"）
    ["Feel非偶", "非偶"],
  ];
  for (const [from, to] of OCR_FIX) {
    t = t.split(from).join(to);
  }
  // 跨栏拼接残迹：句读符号两两粘连（"。；""；。""：；"等）；
  // "，；""、；"是 parts 拼接伪影（条目自带尾读 + join 分隔符），"：，"为栏界粘连
  t = t
    .replace(/。；/g, "。")
    .replace(/；。/g, "。")
    .replace(/：；/g, "：")
    .replace(/；：/g, "：")
    .replace(/[，、：]；/g, "；")
    .replace(/[：:][，、]/g, "：")
    // 表格行标签尾读焊上直角引号残迹（"查阅、复制、、「1．…"）
    .replace(/、「/g, "，");
  // OCR 双栏表格合并产生的"术语回声"（如"累犯累犯应当从重处罚"）：
  // 紧邻的完全相同汉字串几乎都是合并残迹，折叠为一次。
  // 白名单排除汉语正常叠词（大大/渐渐/往往等）。
  // 注："标签行+内容行"口吃（"民事法律行为民事法律行为的有效要件"）折叠后更通顺，属目标形态。
  t = t.replace(new RegExp("([\\u4e00-\\u9fa5]{2,10})\\1", "g"), (match, echo) => {
    if (/^(大大|小小|高高|低低|久久|渐渐|往往|常常|刚刚|明明|时时|层层|一一|人人|种种|点点|个个|步步|处处|代代|日日夜夜|口口声声|形形色色|世世代代)/.test(echo)) {
      return match;
    }
    return echo;
  });
  // 页边方法标注与正文焊接（"文意拆解背诵内容""要素拆解背诵内容"等）——纯标签，剥离
  t = t
    .replace(/[一-龥]{0,4}拆解背诵内容/g, "")
    .replace(/(标准填充法|生活常识法|文意拆解法|要素拆解法|动作拆解法|环节拆解法|正反结合法)背诵内容/g, "");
  // 页眉糊版行焊进句中（"法律础士考试背偏一木通、法扭学。"）——页 furniture，剥离
  t = t.replace(/法律[础士硕]{0,2}考试?背[偏诵]{0,2}[一壹][本木][通迹]?[、.。]?法?[扭理]?学?[。.]?/g, "");
  // 页眉糊版变体（"法建猫士考试背楠一本通""律铺土弯试昔楠一木庙·法街阜"）：
  // 必须命中"法/律+考/弯+试/请+背/昔+一本+通/迹/植/庙"完整链条才剥离，防误伤合法正文
  t = t.replace(
    /法?律?[硕础建猫韧铺士土]{0,4}[考弯][试请]{0,2}[背昔][诵楠痛请偏]{0,2}[一壹][本木][通迹植庙][·、.。]{0,2}[法街完]{0,2}[理宪刑民扭]{0,4}学?[。.]?/g,
    "",
  );
  // 页眉兜底：糊到亲妈不认的变体（"律桃土患风背橘一木通·法理学""法土非试費一本·刑法学"）
  // 用稳定签名锚定——"一本/一木"后必须跟 [通/遍/迪/迹/植/庙/拖/道] 尾字或"·学科名"尾巴，
  // 两者都出现在页眉；正文书名引用带《》且无 ·学科名 尾巴，不受影响。
  // （尾字/尾巴必须至少命中一个：裸"…一本"是合法正文——《明大诰》"户户有此一本"曾被误剥）
  t = t.replace(
    /[一-龥]{0,8}[一壹][本木](?:[通遍迪迹植庙拖道]|[·、.。]{1,2}[法完州站那比余]{0,2}[理宪史民侧建]{0,3}学?[。.]?)/g,
    (match, offset, str) => {
      const before = str.slice(Math.max(0, offset - 1), offset);
      if (before === "《" || before === "［") return match; // 书名引用不剥
      return /一本通|一木通/.test(match) && !/[·、.。][法完]/.test(match) && match.length <= 4
        ? match
        : "";
    },
  );
  // 糊版章名（"第十八意○带续夷""第大童○机构论"——页眉"第X章○章名"的 OCR 残迹）
  t = t.replace(/[第][大小宽二王三四五六七八九十]{1,3}[童意亿审][〇○0][一-龥]{0,10}/g, "");
  // 页边"平替"记忆标注（"使用“严格执法原则”平替即可""用“法治国家”平替法治建设"）——纯标签，剥离
  t = t
    .replace(/使用[““][^””]{2,24}[””]平替即可/g, "")
    .replace(/用[““][^””]{2,24}[””]平替[一-龥]{2,10}/g, "");
  // 糊到失去一切结构的页眉残迹（OCR 逐条核实，精确串剥离零误伤）
  for (const junk of [
    "注德糖士害试背痛一朱·法理学",
    "法相士考衍背一朱遒、宪法单",
    "法钟橘土专世背一未·代法学",
  ]) {
    t = t.split(junk).join("");
  }
  // OCR 括号错配（"［表达逻辑）""（表达逻辑］""［表达逻辑」""「表达逻辑］""（表达逻辑」"）：
  // 括号语义只有注记一种，按开括号补齐宽度（覆盖全部开×闭跨类组合）
  t = t
    .replace(/［([^［］（）()「」]{1,24})）/g, "［$1］")
    .replace(/［([^［］（）()「」]{1,24})」/g, "［$1］")
    .replace(/（([^（）（「」［］]{1,24})］/g, "（$1）")
    .replace(/（([^（）（「」［］]{1,24})」/g, "（$1）")
    .replace(/「([^「」（）()［］]{1,24})）/g, "「$1」")
    .replace(/「([^「」（）()［］]{1,24})］/g, "「$1」");
  return t;
}

/** 句末标点恢复：完整句在扫描边界丢句号 → 补"。"（连接词悬停的真截断不补） */
function restoreTerminal(text) {
  // 列表拼接遗留的句末"；"悬停（全书 21% 步骤的观感损伤）→ 收束为句号
  let t = text.replace(/[；]+$/, "");
  if (
    t.length >= 8 &&
    (t !== text || /[一-龥]$/.test(t)) &&
    // 仅拒绝"真正的悬停虚词"——据/受/变/于/由/从/到/联/向 等是合法名词收尾（依据/自由/改变/属于）
    !/[的与或及是对为把被从而并按向但其至了着跟从]$/.test(t)
  ) {
    return `${t}。`;
  }
  return t;
}

// ── 人工修表（按课时 id 锚定）────────────────────────────────────────
// 90 处"连接词悬停"是扫描件 OCR 丢失/表格标签焊接，程序无法凭空恢复；
// 唯一可靠来源是渲染原页读图核实。修表条目 = 人工誊录的完整替换文本。
// 构建时强制校验：条目必须命中课时与步骤；替换后文本必须句读完整（终止标点收尾）。
const MANUAL_FIXES_PATH = join(root, "scripts", "law-manual-fixes.json");

async function loadManualFixes() {
  try {
    return JSON.parse(await readFile(MANUAL_FIXES_PATH, "utf8"));
  } catch {
    return { fixes: {} };
  }
}

function applyManualFixes(chapters, fixes, bookId, consumed) {
  let applied = 0;
  for (const [lessonId, entry] of Object.entries(fixes)) {
    if (!lessonId.startsWith(`${bookId}-`)) continue;
    const lesson = chapters.flatMap((c) => c.lessons).find((l) => l.id === lessonId);
    if (!lesson) throw new Error(`修表条目课时不存在: ${lessonId}`);
    for (const [stepId, patch] of Object.entries(entry.steps ?? {})) {
      const step = lesson.steps.find((s) => s.id === stepId);
      if (!step) throw new Error(`修表条目步骤不存在: ${lessonId}/${stepId}`);
      const p = typeof patch === "string" ? { text: patch } : patch;
      if (p.text !== undefined) {
        const text = p.text.trim();
        if (!/[。！？…”」》）]$/.test(text)) {
          throw new Error(`修表文本必须以终止标点收尾: ${lessonId}/${stepId} → …${text.slice(-20)}`);
        }
        step.text = text;
        if (p.parts === undefined) delete step.parts; // text 已是权威，旧 parts 一并作废
      }
      if (p.parts !== undefined) step.parts = p.parts;
      if (p.kind !== undefined) step.kind = p.kind;
      consumed[`${lessonId}/${stepId}`] = entry.note ?? "";
      applied += 1;
    }
  }
  return applied;
}

/** 标题级 OCR 修正（正文走 polishText，标题单独过一遍同源修正表） */
function polishTitle(text) {
  let t = text;
  const TITLE_FIX = [
    ["筒述", "简述"],
    ["客休", "客体"],
    ["自已", "自己"],
    ["买奖合同", "买卖合同"],
    ["借务的合义", "债务的含义"],
    ["具休", "具体"],
    ["公厅良俗", "公序良俗"],
    ["简过式事", "简述民事"],
  ];
  for (const [from, to] of TITLE_FIX) {
    t = t.split(from).join(to);
  }
  return t;
}

/**
 * 章节结构后处理：
 * 1) 按名合并"章末表格行误判成编章"的单导览垃圾组（法制史上编四组）；
 * 2) 相邻同语义名组合并（"○立法制度"并回"第一章"，消除被垃圾组拦腰切断的真章）。
 * 全部只搬 lessons，不丢任何内容。
 */
function postProcessChapters(chapters, bookMeta) {
  // 1) 垃圾单导览组 → 并入前一章
  if (bookMeta.mergeTourGroups?.length) {
    for (let i = chapters.length - 1; i >= 1; i -= 1) {
      const group = chapters[i];
      const cleaned = (group.title ?? "").replace(/[○◎●◆・•·✦☆〇“”"「」\s]/g, "");
      const isTarget = bookMeta.mergeTourGroups.some((name) => cleaned === name || cleaned.includes(name));
      const singleTour = group.lessons.length >= 1 && group.lessons.every((l) => l.id.endsWith("-tour"));
      const prev = chapters[i - 1];
      if (isTarget && singleTour && prev && prev.title !== "作者的话") {
        prev.lessons.push(...group.lessons);
        chapters.splice(i, 1);
      }
    }
  }
  // 2) 相邻同语义组 → 并回前一章（重名后缀"·续"由后续去重逻辑再生）
  const semanticBase = (chapter) =>
    (chapter.semanticTitle || chapter.title || "")
      .replace(/[○◎●◆・•·✦☆口〇]/g, "")
      .replace(/·.+$/, "")
      .trim();
  for (let i = chapters.length - 1; i >= 1; i -= 1) {
    const group = chapters[i];
    const prev = chapters[i - 1];
    if (!group.semanticTitle || !prev?.semanticTitle) continue;
    if (semanticBase(group) && semanticBase(group) === semanticBase(prev) && prev.title !== "作者的话") {
      prev.lessons.push(...group.lessons);
      chapters.splice(i, 1);
    }
  }
  // 3) 附录组标记（保留内容与课时，但不进学习流/计数/搜索/出题）
  if (bookMeta.appendixChapter) {
    const { titleIs, minLessons, rename } = bookMeta.appendixChapter;
    const target = chapters.find((c) => c.title === titleIs && c.lessons.length >= minLessons);
    if (target) {
      target.appendix = true;
      target.title = rename;
      target.semanticTitle = rename;
    }
  }
  return chapters;
}

/** 去掉编号前缀（用于连续重复条目的判等） */
function itemKey(part) {
  return part
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]/, "")
    .replace(/^\d{1,2}[.、．]/, "")
    .replace(/^[（(][一二三四五六七八九十]{1,4}[)）]/, "")
    .trim();
}

function joinParagraph(lines) {
  // 把断行拼成句：无终止标点的行合并到下一行；
  // 但遇到新条目开头（①/1./(一)）必须断段，避免把多条内容焊成一坨
  const out = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const startsNewItem =
      RE_LIST_ITEM.test(line) || RE_NUM_ITEM.test(line) || RE_SUB.test(line);
    const prev = out[out.length - 1];
    if (prev && !startsNewItem && !/[。！？；：”’』」]/.test(prev.trimEnd().slice(-1))) {
      out[out.length - 1] = polishText(prev + line);
    } else {
      out.push(polishText(line));
    }
  }
  return out.map((line) => polishText(line));
}

function splitSentences(paragraph) {
  // 从长句中切分"…。①②…/（一）…"等混合内容
  const parts = paragraph
    .split(/(?<=。)(?=[①-⑨（(]|\d{1,2}[.、]|第[一二三四五六七八九十]{1,3}[条款])/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
  return parts.length > 0 ? parts : [paragraph];
}

function extractTerms(text) {
  const terms = [];
  const seen = new Set();
  const patterns = [
    /[“「《]([^”」》]{2,18})[”」》]/g,
    /([\u4e00-\u9fa5]{2,12})（([^）]{2,14})）/g,
  ];
  for (const re of patterns) {
    for (const match of text.matchAll(re)) {
      const term = (match[1] ?? match[2]).trim();
      if (term.length >= 2 && !seen.has(term)) {
        seen.add(term);
        terms.push({ term });
      }
    }
  }
  return terms.slice(0, 6);
}

/**
 * 从正文行里提取本课口诀。
 * 必须是显式 "口诀：/巧记：/速记：/记：" 形式，且口诀体本身要像口诀
 * （短、无括号示例、无题型动词、无第二个冒号）——防止把 OCR 拼接句当口诀展示。
 * 注意 "记：" 必须是独立的记号（句首或标点后），否则 "登记：/登记载：" 会被误匹配。
 */
function validMnemonicText(raw) {
  if (!raw) return null;
  let text = raw
    .trim()
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩］[（(）)\s]+/, "")
    .replace(/[）)」』””，。；、\s]+$/, "")
    .trim();
  if (text.length < 2 || text.length > 24) return null;
  if (/^[0-9０-９]/.test(text)) return null;
  if (/[：:［\[\]］（）()]/.test(text)) return null;
  if (/示例|简述|论述|简答|分析|评述|试述|说明|背诵|记忆|考点|内容|如何|什么/.test(text)) return null;
  return text;
}

function gatherMnemonic(lines) {
  for (const line of lines) {
    const match = line.match(/(?:口诀|巧记|速记)[：:]\s*([^。；\n]{2,30})/);
    if (match) {
      const valid = validMnemonicText(match[1]);
      if (valid) return valid;
    }
    const match2 = line.match(/(?:^|[。；，：：”’」』])\s*记[：:]\s*([^。；\n]{2,30})/);
    if (match2) {
      const valid = validMnemonicText(match2[1]);
      if (valid) return valid;
    }
  }
  return null;
}

function classifyStep(blockTexts) {
  const joined = blockTexts.join("；");
  // 至少有两条编号条目 → 列举型（可逐条点按）
  const numberedCount = blockTexts.filter(
    (part) => RE_LIST_ITEM.test(part.trim()) || RE_NUM_ITEM.test(part.trim()),
  ).length;
  if (numberedCount >= 2) return "list";
  if (/异同|相同点|不同点|区别|比较|区别于|相比/.test(joined)) return "compare";
  if (/要件|具备.*条件|构成要件|成立.*条件|\b必须\b/.test(joined) && /要件|条件/.test(joined)) return "condition";
  if (/但书|除外|例外|原则上|但是/.test(joined)) return "exception";
  if (/程序|步骤|先后|首先|其次|最后|依次|顺序/.test(joined)) return "flow";
  if (/朝代|公元前|公元\d{2,4}年|\d{3,4}年/.test(joined)) return "timeline";
  if (/是指|指，|指\w{2,}|是[\u4e00-\u9fa5]{2,12}的总称|即[\u4e00-\u9fa5]/.test(joined)) return "definition";
  if (/包括|分为|有[\u4e00-\u9fa5]{2,8}种|如下|以下/.test(joined)) return "list";
  return "plain";
}

function buildSteps(blocks) {
  const steps = [];
  for (const block of blocks) {
    let texts = block.items.length > 0 ? block.items : block.texts;
    // 对照表两栏产生同编号同内容条目（"1.先交付；1.先交付；"）→ 相邻去重
    if (block.items.length > 1) {
      const deduped = [];
      for (const item of block.items) {
        const prev = deduped[deduped.length - 1];
        if (prev !== undefined && itemKey(item) === itemKey(prev) && itemKey(item).length >= 2) continue;
        deduped.push(item);
      }
      texts = deduped;
    }
    const kind = classifyStep(texts);
    let joined = polishText(texts.join("；"));
    joined = restoreTerminal(joined);
    const step = {
      id: "",
      kind,
      // 拼接分隔符"；"与前段句号会形成"。；"，最终拼装再过一遍规整
      text: joined,
      parts: texts.length >= 2 ? texts.slice(0, 8) : undefined,
      terms: extractTerms(texts.join("")),
    };
    if (block.mnemonic) step.mnemonic = block.mnemonic;
    steps.push(step);
  }
  return steps;
}

function makeLesson(bookMeta, seq, line, stack) {
  const code =
    line.match(/^([一二三四五六七八九十百零]{1,6})[、.]/)?.[1] ??
    line.match(/^(\d{1,2}-\d{1,2})/)?.[1] ??
    String(seq);
  const title = stripHeading(code, line).replace(/[○◎●◆・•·✦☆]/g, "") || line.replace(/[○◎●◆・•·✦☆]/g, "");
  return {
    id: `${bookMeta.id}-q${String(seq).padStart(3, "0")}`,
    subject: bookMeta.id,
    code,
    breadcrumb: stack.map((h) => headingTitle(h.title, h.level, bookMeta)),
    title,
    intro: "",
    steps: [],
    pageRange: [0, 0],
    raw: [],
  };
}

function parseBookPages(pages, bookMeta) {
  const chapters = [];
  const leftovers = [];
  const rawTrail = [];
  let stack = []; // part/chapter/section 层级栈（breadcrumb）
  let lesson = null;
  let lessonBody = [];
  let lessonStartPage = 0;
  let lessonEndPage = 0;
  let seq = 0;
  let metaLesson = null;
  let metaLessonBody = [];
  let metaLessonStartPage = 0;
  let metaLessonEndPage = 0;
  let trailStartPage = 0;
  let trailEndPage = 0;

  const currentGroup = () => chapters[chapters.length - 1];

  const ensureGroup = (title, level) => {
    if (!currentGroup()) {
      chapters.push({ id: `${bookMeta.id}-c0`, title: title || "全书", level, lessons: [] });
    }
  };

  const flushLesson = () => {
    if (!lesson) return;
    const paragraphs = joinParagraph(lessonBody);
    const blocks = [];
    const hasItemPrefix = (block) => {
      const first = block.items[0] ?? block.texts[0] ?? "";
      return RE_LIST_ITEM.test(first) || RE_NUM_ITEM.test(first);
    };
    for (const line of paragraphs) {
      if (RE_SUB.test(line)) {
        blocks.push({ items: [line], texts: [] });
        continue;
      }
      if (RE_LIST_ITEM.test(line) || RE_NUM_ITEM.test(line)) {
        const last = blocks[blocks.length - 1];
        if (last && hasItemPrefix(last)) {
          last.items.push(line);
        } else {
          blocks.push({ items: [line], texts: [] });
        }
        continue;
      }
      if (blocks.length === 0) blocks.push({ items: [], texts: [] });
      const block = blocks[blocks.length - 1];
      // 列表内容行跟在列表项后 → 归入该列表
      if (block.items.length > 0 && block.texts.length === 0) {
        block.items.push(line);
      } else {
        block.texts.push(line);
      }
    }
    const mnemonic = gatherMnemonic(paragraphs);
    const rawSteps = buildSteps(blocks)
      .filter((s) => s.text && s.text.trim().length >= 2);
    // 超长步骤按句切分，保证一屏能读完（"傻子也能看懂"）
    const splitSteps = [];
    for (const step of rawSteps) {
      if (step.text.length <= 300) {
        splitSteps.push(step);
        continue;
      }
      const sentences = step.text.split(/(?<=[。！？；])/).filter((s) => s.trim().length >= 2);
      let buffer = "";
      for (const sentence of sentences) {
        if (buffer.length + sentence.length > 190 && buffer.length > 0) {
          splitSteps.push({
            ...step,
            kind: "plain",
            text: restoreTerminal(buffer),
            parts: undefined,
            timeline: undefined,
            compare: undefined,
            pivot: undefined,
          });
          buffer = sentence;
        } else {
          buffer += sentence;
        }
      }
      if (buffer) {
        splitSteps.push({
          ...step,
          kind: "plain",
          text: restoreTerminal(buffer),
          parts: undefined,
          timeline: undefined,
          compare: undefined,
          pivot: undefined,
        });
      }
    }
    // 悬停短步合并：以"的/与/了"收尾的超短步骤多为节内小标题被截断
    // （"（二）简述法律对平等价值的"），其正文就在下一步——合并成一步，消灭悬空残标题
    for (let i = splitSteps.length - 2; i >= 0; i -= 1) {
      const step = splitSteps[i];
      const nextStep = splitSteps[i + 1];
      if (!nextStep) continue;
      if (step.kind === "mnemonic" || nextStep.kind === "mnemonic") continue;
      if (step.text.length > 40) continue;
      if (!/[的与和或及了着]$/.test(step.text)) continue;
      step.text = restoreTerminal(`${step.text}：${nextStep.text}`);
      step.parts = nextStep.parts ?? step.parts;
      step.terms = [...(step.terms ?? []), ...(nextStep.terms ?? [])].slice(0, 6);
      splitSteps.splice(i + 1, 1);
    }
    const steps = splitSteps.map((s, index) => ({ ...s, id: `${lesson.id}-s${index}` }));
    if (steps.length === 0) {
      // 本课没有可成步骤的行 → 保留原文，防止丢内容
      steps.push({
        id: `${lesson.id}-s0`,
        kind: "plain",
        text: polishText(lessonBody.join("；")) || lesson.title,
        terms: [],
      });
    }
    // 有效口诀 → 追加一张"口诀记忆卡"步骤（翻字背诵），组件与数据在此打通
    if (mnemonic) {
      steps.push({
        id: `${lesson.id}-sm`,
        kind: "mnemonic",
        text: "本课口诀",
        mnemonic,
        terms: [],
      });
    }
    lesson.steps = steps;
    // 目录/考点索引页产生的"纯标题课"（无任何正文原文）→ 打上 shell 标记：
    // 保留 id 稳定性与原文保底承诺，但不计入知识点总数、不进目录/搜索/出题
    lesson.shell = lesson.raw.length === 0
      && lesson.steps.length === 1
      && lesson.steps[0].text === lesson.title
      ? true
      : undefined;
    lesson.intro = polishText(lessonBody[0] ?? "") || (lesson.steps[0]?.text ?? "");
    lesson.mnemonic = mnemonic ?? undefined;
    lesson.pageRange = [lessonStartPage, lessonEndPage || lessonStartPage];
    lesson.raw = [...lessonBody];
    if (currentGroup()) {
      currentGroup().lessons.push(lesson);
    } else {
      leftovers.push({ page: lessonStartPage, text: lessonBody.join("\n") });
    }
    lesson = null;
    lessonBody = [];
  };

  /** 序言/使用说明 课时的收尾（与普通课时共用构造逻辑） */
  const flushMetaLesson = () => {
    if (!metaLesson) return;
    lesson = metaLesson;
    lessonBody = metaLessonBody;
    lessonStartPage = metaLessonStartPage;
    lessonEndPage = metaLessonEndPage;
    flushLesson();
    metaLesson = null;
    metaLessonBody = [];
  };

  /** 把排队中的散行（思维导图/编前导览等）打包成「章节导览」课时，确保内容不丢 */
  const flushTrail = () => {
    if (rawTrail.length === 0 || !currentGroup()) return;
    seq += 1;
    const trailLesson = makeLesson(bookMeta, seq, "导览", stack);
    trailLesson.id = `${bookMeta.id}-q${String(seq).padStart(3, "0")}-tour`;
    const topTitle = (stack.length > 0
      ? headingTitle(stack[stack.length - 1].title, stack[stack.length - 1].level, bookMeta)
      : "本章").replace(/[○◎●◆・•·✦☆]/g, "");
    trailLesson.title = `导览：${topTitle}`;
    // 导览分块：直接拼接（不插分隔符——书页断行处插"；"会把词切开，如"中；国人民"），
    // 再按句号边界打包，保证任何一块都不在句子中间被切断
    const joinedTrail = rawTrail.join("");
    const sentences = joinedTrail
      .split(/(?<=[。！？])/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);
    const chunked = [];
    let buffer = "";
    for (const sentence of sentences) {
      if (sentence.length > 160) {
        // 超长无标点句（思维导图碎片串）：按 160 硬切
        if (buffer) {
          chunked.push(buffer);
          buffer = "";
        }
        for (let i = 0; i < sentence.length; i += 160) {
          chunked.push(sentence.slice(i, i + 160));
        }
        continue;
      }
      if (buffer.length + sentence.length > 160 && buffer.length > 0) {
        chunked.push(buffer);
        buffer = sentence;
      } else {
        buffer += sentence;
      }
    }
    if (buffer) chunked.push(buffer);
    trailLesson.steps = chunked.map((text, index) => {
      // 与正文步骤同规则的句末标点恢复（统一走 restoreTerminal）
      return {
        id: `${trailLesson.id}-s${index}`,
        kind: "plain",
        text: restoreTerminal(polishText(text)),
        terms: [],
      };
    });
    trailLesson.intro = polishText(rawTrail[0] ?? "");
    trailLesson.raw = [...rawTrail];
    trailLesson.pageRange = [trailStartPage, trailEndPage || trailStartPage];
    currentGroup().lessons.push(trailLesson);
    rawTrail.length = 0;
    // 重置导览页码游标：否则全书后续所有 -tour 课都带着第一次导览的起点页（系统性 pageRange 错位）
    trailStartPage = 0;
    trailEndPage = 0;
  };

  /** 去除页眉装饰符号并压缩为"N 级编号"，用于识别"同一标题" */
  const normalizeHeading = (line) => {
    const match = line.match(/^(第[一二三四五六七八九十百零0-9]+[编部分章篇卷]|专题[一二三四五六七八九十]+)/);
    return match ? match[1] : line.replace(/[○◎●◆・•·\s]/g, "");
  };

  let partGroups = new Map(); // 键 = 第X编/部分 编号
  let chapterGroups = new Map(); // 键 = 第X章 编号，随新编重置

  /** 编/章级标题：同一编号（含运行页眉变体）合并进同一个组，选更完整的标题 */
  const onHeading = (line, level, indexInPage, pageNo, prevPageTopKeys, tocLike) => {
    if (level !== "part" && level !== "chapter") {
      flushLesson();
      flushMetaLesson();
      flushTrail();
      stack = stack.filter((h) => levelRank(h.level) < levelRank(level));
      stack.push({ title: line, level });
      return;
    }
    if (tocLike) return;
    const key = normalizeHeading(line);
    if (indexInPage <= 2 && pageNo > 1 && prevPageTopKeys.has(key)) {
      // 上一页顶部出现过同一编号 → 运行页眉：不建组，但它的"真实名称"很有价值
      const current = level === "part" ? partGroups.get(key) : chapterGroups.get(key);
      current?.aliases.add(line);
      return;
    }
    if (level === "part") {
      if (!partGroups.has(key)) {
        chapterGroups = new Map();
        flushLesson();
        flushMetaLesson();
        flushTrail();
        stack = stack.filter((h) => levelRank(h.level) < levelRank(level));
        stack.push({ title: line, level });
        const group = {
          id: `${bookMeta.id}-c${chapters.length}`,
          title: headingTitle(line, level, bookMeta),
          level,
          lessons: [],
          aliases: new Set([line]),
        };
        chapters.push(group);
        partGroups.set(key, group);
      } else {
        // 同一编再次出现：选更完整的标题，面包屑更新，不建新组
        const title = headingTitle(line, level, bookMeta);
        const prior = partGroups.get(key);
        prior.aliases.add(line);
        if (/^第[编部分]*$/.test(prior.title) && title && title.length >= 2) {
          prior.title = title;
        }
        stack = stack.filter((h) => levelRank(h.level) < levelRank(level));
        stack.push({ title: line, level });
      }
      return;
    }
    // chapter
    if (chapterGroups.has(key)) {
      const title = headingTitle(line, level, bookMeta);
      const prior = chapterGroups.get(key);
      prior.aliases.add(line);
      if (/^第[编部分]*$/.test(prior.title) && title && title.length >= 2) {
        prior.title = title;
      }
      stack = stack.filter((h) => levelRank(h.level) < levelRank(level));
      stack.push({ title: line, level });
      return;
    }
    flushLesson();
    flushMetaLesson();
    flushTrail();
    stack = stack.filter((h) => levelRank(h.level) < levelRank(level));
    stack.push({ title: line, level });
    const group = {
      id: `${bookMeta.id}-c${chapters.length}`,
      title: headingTitle(line, level, bookMeta),
      level,
      lessons: [],
      aliases: new Set([line]),
    };
    chapters.push(group);
    chapterGroups.set(key, group);
  };

  let prevPageTopKeys = new Set();
  let prevPageNo = 0;

  for (const page of pages) {
    if (isFrontMatterPage(page)) {
      leftovers.push({ page: page.pageNo, text: page.lines.join("\n") });
      prevPageTopKeys = new Set(page.lines.slice(0, 3).map(normalizeHeading));
      prevPageNo = page.pageNo;
      continue;
    }

    // 使用说明 / 序言 / 前言：连续页合成一个「作者的话」课时
    if (META_TITLE.test(page.lines[0] ?? "")) {
      flushLesson();
      if (!metaLesson) {
        if (!currentGroup()) {
          chapters.push({ id: `${bookMeta.id}-c0`, title: "作者的话", level: "chapter", lessons: [] });
        }
        flushMetaLesson();
        stack = [{ title: "作者的话", level: "chapter" }];
        seq += 1;
        metaLesson = makeLesson(bookMeta, seq, "作者的话", stack);
        metaLesson.title = page.lines[0];
        metaLessonStartPage = page.pageNo;
      }
      metaLessonBody.push(...page.lines.slice(1));
      metaLessonEndPage = page.pageNo;
      continue;
    }

    // 序言/使用说明 的续页：只要无标题行就算续页内容
    if (metaLesson) {
      const hasHeading = page.lines.some(
        (line) => classifyChapterLevel(line) !== "group" || RE_QUESTION.test(line),
      );
      if (!hasHeading) {
        metaLessonBody.push(...page.lines);
        metaLessonEndPage = page.pageNo;
        continue;
      }
    }

    // 目录/导览式罗列页：同页出现 3 个及以上不同编章标题 → 不建组
    const tocLikePage =
      new Set(
        page.lines
          .filter((line) => classifyChapterLevel(line) !== "group")
          .map(normalizeHeading),
      ).size >= 3;

    for (let lineIndex = 0; lineIndex < page.lines.length; lineIndex += 1) {
      const line = page.lines[lineIndex];
      let level = classifyChapterLevel(line);
      const isQuestion = RE_QUESTION.test(line) && line.length <= 46;
      const isSub = RE_SUB.test(line) && line.length <= 46;

      if (level !== "group" && !isQuestion) {
        // 编/章/节标题
        onHeading(line, level, lineIndex, page.pageNo, prevPageTopKeys, tocLikePage);
        continue;
      }

      if (isQuestion) {
        flushLesson();
        flushMetaLesson();
        flushTrail();
        ensureGroup(
          stack.length > 0 ? headingTitle(stack[stack.length - 1].title, stack[stack.length - 1].level, bookMeta) : "全书",
          stack.length > 0 ? stack[stack.length - 1].level : "group",
        );
        seq += 1;
        lesson = makeLesson(bookMeta, seq, line, stack);
        lessonStartPage = page.pageNo;
        lessonEndPage = page.pageNo;
        continue;
      }

      if (isSub && lesson) {
        lessonBody.push(line);
        lessonEndPage = page.pageNo;
        continue;
      }

      if (lesson) {
        lessonBody.push(line);
        lessonEndPage = page.pageNo;
      } else {
        // 没有任何课时之前的散行 → 先排队，最终作为「导览」课时或附录保留
        if (!trailStartPage) trailStartPage = page.pageNo;
        trailEndPage = page.pageNo;
        rawTrail.push(line);
      }
    }
    prevPageTopKeys = new Set(page.lines.slice(0, 3).map(normalizeHeading));
    prevPageNo = page.pageNo;
  }
  flushLesson();
  flushMetaLesson();
  if (rawTrail.length > 0) {
    leftovers.push({ page: 0, text: rawTrail.join("\n") });
  }
  return { chapters, leftovers };
}

function levelRank(level) {
  return level === "part" ? 0 : level === "chapter" ? 1 : level === "section" ? 2 : 3;
}

/** OCR 固定变体 → 正确语义名 */
const SEMANTIC_FIX = {
  贪污络邹: "贪污贿赂罪",
  "0坊言社会貨型约字信": "妨害社会管理秩序罪",
  薯作权: "著作权",
  继丞: "继承",
  婿细家庭: "婚姻家庭",
  公演得: "法律推理",
  法律溪源: "法律渊源",
  司法物度: "司法制度",
  立法发: "立法概况",
  一运行论: "宪法的运行",
  "0合周务9州": "债权编",
  白负與合回: "债权编",
  权益王: "债权编",
};

/** 纯序号/结构占位标题（"第一章""专题二"）：不是语义名 */
function isOrdinalPlaceholder(text) {
  return /^(第[一二三四五六七八九十百零0-9]+(编|部分|章|篇|卷)?|上编|下编|附编|总论|分论|导论|绪论|专题[一二三四五六七八九十]+)$/.test(text);
}

/** 从别名集合挑选语义名称（如"第二部分○犯罪论" → "犯罪论"） */
function pickSemanticTitle(aliases, lessonTitles = []) {
  let best = "";
  for (const alias of aliases) {
    const cleaned = alias
      .replace(/[○◎●◆・•·✦☆（）()〇Q口□OoOCc\s]/g, "")
      .replace(/^\s*第[一二三四五六七八九十百零0-9]+(编|部分|章|篇|卷)\s*/, "")
      .replace(/^\s*(上编|下编|附编)\s*/, "")
      .trim();
    if (!cleaned || cleaned === alias.replace(/[○◎●◆・•·✦☆（）()〇Q口O\s]/g, "").trim()) continue;
    if (isOrdinalPlaceholder(cleaned)) continue;
    if (cleaned.length >= 2 && cleaned.length > best.length) best = cleaned;
  }
  // 常见 OCR 尾字修正
  best = best.replace(/用$|显$|丽$|忌$|极$|均$|点$|与$/, "罪");
  if (SEMANTIC_FIX[best]) best = SEMANTIC_FIX[best];
  if (!best) {
    // 回退：从本课标题里挑语义名——剥掉题号/题型动词后取最长的候选（剥后不足 4 字的候选不要，
    // 防"分析法学派"被剥成"法学派"）
    let fallback = "";
    for (const rawTitle of lessonTitles) {
      const base = polishTitle(rawTitle)
        .replace(/^导览[：:]/, "")
        .replace(/^\d{1,3}-\d{1,3}[.．、]/, "")
        .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "")
        .split(/[、，。；：（(的：:]/)[0]
        .replace(/[○◎●◆・•·✦☆口〇]/g, "")
        .trim();
      if (base.length < 2 || base.length > 10) continue;
      if (isOrdinalPlaceholder(base)) continue;
      const stripped = base.replace(/^(简述|论述|简答|分析|评述|试述|说明|比较|谈谈)/, "").trim();
      const candidate = stripped.length >= 4 ? stripped : base;
      // 句 fragment 不配当章名（"中国法制历史中"是被"的"切断的半句）
      if (/[中上下的与和及在是为得了着]$/.test(candidate)) continue;
      if (candidate.length > fallback.length) fallback = candidate;
    }
    best = fallback;
  }
  return best || undefined;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(join(root, ".tmp", "law-build"), { recursive: true });
  const stats = {};
  const summary = [];
  const manualFixes = await loadManualFixes();
  const consumed = {};
  let totalApplied = 0;

  for (const bookMeta of BOOKS) {
    const pages = await readPages(bookMeta.id);
    const parsed = parseBookPages(pages, bookMeta);
    // 去掉没有任何课时的空组（目录页装饰性标题产生）
    parsed.chapters = parsed.chapters.filter((chapter) => chapter.lessons.length > 0);
    const { chapters, leftovers } = parsed;
    const lessonsCount = chapters.reduce((sum, c) => sum + c.lessons.length, 0);
    const stepsCount = chapters.reduce(
      (sum, c) => sum + c.lessons.reduce((s, l) => s + l.steps.length, 0),
      0,
    );
    const leftoverLines = leftovers.reduce((sum, p) => sum + p.text.split("\n").length, 0);
    const ocrLines = pages.reduce((sum, p) => sum + p.lines.length, 0);
    const lessonLines = chapters.reduce(
      (sum, c) => sum + c.lessons.reduce((s, l) => s + l.raw.length, 0),
      0,
    );
    const coverage = (lessonLines + leftoverLines) / Math.max(ocrLines, 1);
    console.log(
      `${bookMeta.name}: pages=${pages.length} ocrLines=${ocrLines} lessons=${lessonsCount} steps=${stepsCount} 「lesson=${lessonLines} leftover=${leftoverLines}」coverage=${(coverage * 100).toFixed(2)}%`,
    );

    const leftoverText = leftovers.map((p) => `【第 ${p.page} 页】\n${p.text}`).join("\n\n");
    await writeFile(
      join(root, ".tmp", "law-build", `leftover-${bookMeta.id}.txt`),
      leftoverText || "（无）",
      "utf8",
    );
    // 先算语义名（结构合并要用它做相邻判等），再做章节结构后处理（垃圾组合并/附录标记）
    for (const chapter of chapters) {
      chapter.semanticTitle = pickSemanticTitle(
        chapter.aliases ?? new Set(),
        chapter.lessons.filter((l) => !l.shell).map((l) => l.title),
      );
    }
    postProcessChapters(chapters, bookMeta);
    const plainChapters = chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      semanticTitle: chapter.semanticTitle,
      level: chapter.level,
      appendix: chapter.appendix === true || undefined,
      lessons: chapter.lessons,
    }));
    // 语义名书内去重：重名章节追加各自标题限定（"民法·第二编"/"立法制度·上编"），列表里才分得清
    {
      const used = new Map();
      for (const ch of plainChapters) {
        const st = ch.semanticTitle;
        if (!st) continue;
        const n = used.get(st) ?? 0;
        used.set(st, n + 1);
        if (n > 0) {
          const cleaned = (ch.title ?? "").replace(/[○◎●◆・•·✦☆]/g, "").trim();
          // 纯序号（"第五章"）不能当限定词，否则出现"司法制度·第五章"这种脏名
          const qualifier = cleaned && cleaned !== st && !isOrdinalPlaceholder(cleaned) ? cleaned : "续";
          ch.semanticTitle = `${st}·${qualifier}`;
        }
      }
    }
    totalApplied += applyManualFixes(plainChapters, manualFixes.fixes ?? {}, bookMeta.id, consumed);
    const flowLessons = (chapter) => (chapter.appendix ? [] : chapter.lessons.filter((l) => !l.shell));
    const book = {
      id: bookMeta.id,
      name: bookMeta.name,
      fullName: bookMeta.fullName,
      emoji: bookMeta.emoji,
      accent: bookMeta.accent,
      accentSoft: bookMeta.accentSoft,
      chapters: plainChapters,
      lessonCount: plainChapters.reduce((sum, c) => sum + flowLessons(c).length, 0),
      leftover: leftovers.length > 0 ? [leftoverText] : [],
    };

    await writeFile(
      join(OUT_DIR, `${bookMeta.id}.json`),
      `${JSON.stringify({ book }, null, 1)}\n`,
      "utf8",
    );
    stats[bookMeta.id] = {
      lessonCount: book.lessonCount,
      chapterTitles: chapters.map((c) => c.title),
      steps: plainChapters.reduce((sum, c) => sum + flowLessons(c).reduce((s, l) => s + l.steps.length, 0), 0),
    };
    const shellCount = chapters.reduce((sum, c) => sum + c.lessons.filter((l) => l.shell).length, 0);
    summary.push(
      `${bookMeta.name}: ${book.lessonCount}课(+${shellCount}索引壳) / ${stats[bookMeta.id].steps}步 / leftover ${leftoverLines}行`,
    );
  }

  // 修表完整性：每一条都必须被应用，未命中的条目说明数据结构变了，直接构建失败
  const stale = Object.keys(manualFixes.fixes ?? {}).flatMap((lessonId) =>
    Object.keys(manualFixes.fixes[lessonId].steps ?? {})
      .filter((stepId) => !consumed[`${lessonId}/${stepId}`])
      .map((stepId) => `${lessonId}/${stepId}`),
  );
  if (stale.length > 0) {
    console.error(`修表存在未命中条目（数据结构已变化，请核对）: ${stale.join(", ")}`);
    process.exit(1);
  }
  if (totalApplied > 0) console.log(`人工修表: 应用 ${totalApplied} 条`);
  await writeFile(join(OUT_DIR, "stats.json"), `${JSON.stringify(stats, null, 2)}\n`, "utf8");
  await writeFile(
    join(root, ".tmp", "law-build", "summary.txt"),
    summary.join("\n"),
    "utf8",
  );
  console.log("done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
