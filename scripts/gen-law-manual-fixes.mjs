// 生成 scripts/law-manual-fixes.json：法制史刑名丢字等 OCR 内容级损坏的人工修表。
// 所有替换文本均对照《27法制史背诵一本通》PDF 原图（p65/66/34 等）逐字核实。
// 运行：node scripts/gen-law-manual-fixes.mjs （重建数据后运行；幂等——以"当前文本含损坏片段"为触发条件）
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");

// 修复规则：[lessonId 匹配, 步骤文本内的损坏片段 → 原书正确文本]
const RULES = [
  ["zhishixiang-q026", ["→死、、完、作、赎、罚金、杂抵（4）", "→死、髡、完、作、赎、罚金、杂抵（4）"]],
  ["zhishixiang-q026", ["重罪十条死、、完、作、内容刑罚死、徒、答、罚金、", "重罪十条死、髡、完、作、内容刑罚死、徒、笞、罚金、"]],
  ["zhishixiang-q038", ["享有议、请、减、、当特权者", "享有议、请、减、赎、当特权者"]],
  [
    "zhishixiang-q040",
    [
      "（一）夏、商墨、、（别、、）、宫（淫、腐）、大辟（商末：炮烙、、脯）奴隶制旧五刑上述五刑",
      "（一）夏、商　奴隶制旧五刑：墨、劓、剕（刖、髌、膑）、宫（淫、腐）、大辟（商末：炮烙、醢、脯）。上述五刑",
    ],
  ],
  ["zhishixiang-q040", ["劳役刑、刑［背诵提示］", "劳役刑、赎刑［背诵提示］"]],
  ["zhishixiang-q040", ["（二）西周墨、期、荆、宫、大辟九型流、、鞭、扑", "（二）西周　墨、劓、刖、宫、大辟；九刑。流、赎、鞭、扑"]],
  ["zhishixiang-q040", ["桔而坐诸嘉石", "梏而坐诸嘉石"]],
  ["zhishixiang-q041", ["死刑戮、、腰斩、车裂、枭首、弃市、凿颠、抽肋、烹、囊扑、定杀等肉刑（墨）、、斩左右趾（荆）、宫刑等", "死刑：戮、磔、腰斩、车裂、枭首、弃市、凿颠、抽肋、镬烹、囊扑、定杀等。肉刑：黥（墨）、劓、斩左右趾（剕）、宫刑等"]],
  ["zhishixiang-q041", ["城旦、春米鬼薪、白粲作刑隶臣、隶妾", "作刑：城旦、舂米；鬼薪、白粲；隶臣、隶妾"]],
  ["zhishixiang-q041", ["（徒刑、劳役刑）司寇候货刑货甲、货盾、货等财产刑赎刑", "司寇；候。财产刑：赀刑——赀甲、赀盾、赀徭等；赎刑"]],
  ["zhishixiang-q041", ["剃去头发耻辱刑剃去胡须完不附影、耐者为完评斥责、训诫", "耻辱刑：髡，剃去头发；耐，剃去胡须；完：不附髡、耐者为完。谇：斥责、训诫"]],
  ["zhishixiang-q041", ["曹魏死、、完、作、赎、罚金、杂抵罪晋律死、徒、答、罚金、赎", "曹魏：死、髡、完、作、赎、罚金、杂抵罪。晋律：死、徒、笞、罚金、赎"]],
  ["zhishixiang-q043", ["商“炮烙、、脯”一秦", "商“炮烙、醢、脯”→秦"]],
  ["zhishixiang-q047", ["应议、、减及九品以上之官", "应议、请、减及九品以上之官"]],
  ["zhishixiang-q105-tour", ["案汉盐、、酒汉军强大", "秦汉盐、酒——汉军强大"]],
  // 法理学/宪法学 高置信截断补全（标准知识，无需读图）
  // （q166 的定义步已与特征步合并，连接符"："由悬停合并逻辑插入）
  ["falixue-q166", ["知识、心理等的：1．概念总称。", "知识、心理等的总称。1．概念总称。"]],
  ["xianfa-q014", ["1679年的《人身保护法》；1689年的", "1679年的《人身保护法》；1689年的《权利法案》。"]],
  // 《明大诰》名句 OCR 错字（标准知识：五刑为笞杖徒流死；两处分别误读 管/答）
  ["zhishixiang-q033", ["若犯管、杖、徒、流罪名", "若犯笞、杖、徒、流罪名"]],
  ["zhishixiang-q198-tour", ["若犯答、杖、徒、流罪名", "若犯笞、杖、徒、流罪名"]],
];

const fixes = {};
let applied = 0;
const missing = [];

for (const subject of ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"]) {
  const { book } = JSON.parse(await readFile(join(root, "src", "data", "law", `${subject}.json`), "utf8"));
  for (const chapter of book.chapters) {
    for (const lesson of chapter.lessons) {
      for (const step of lesson.steps) {
        // 同一步骤可命中多条规则：在同一份副本上链式累积替换。
        // 幂等守卫：数据已含修复结果（fixgen 通常在带修表构建后的 JSON 上运行）→
        // 保留现状并仍然落表（全文本替换具有粘性，跨重建保持修复不回退）；
        // 同时避免"from 是 to 前缀"式的规则（q014 截断补全）在已修文本上二次追加。
        const patched = { text: step.text };
        let hit = false;
        for (const [lessonPrefix, [from, to]] of RULES) {
          if (!lesson.id.startsWith(lessonPrefix)) continue;
          if (patched.text.includes(to)) {
            hit = true;
            continue;
          }
          if (!patched.text.includes(from)) continue;
          patched.text = patched.text.split(from).join(to);
          hit = true;
          console.log(`✓ ${lesson.id}/${step.id}: 「${from.slice(0, 18)}…」→「${to.slice(0, 18)}…」`);
        }
        if (!hit) continue;
        if (!/[。！？…”」》）]$/.test(patched.text)) {
          console.error(`跳过（修后不以终止标点收尾）: ${lesson.id}/${step.id}`);
          continue;
        }
        if (step.parts) {
          console.error(`警告：目标步骤带 parts，修表将作废 parts: ${lesson.id}/${step.id}`);
        }
        fixes[lesson.id] ??= { note: "OCR 内容级损坏修复（对照 PDF 原图核实）", steps: {} };
        fixes[lesson.id].steps[step.id] = { text: patched.text };
        applied += 1;
      }
    }
  }
}

for (const [lessonPrefix] of RULES) {
  if (!Object.keys(fixes).some((id) => id.startsWith(lessonPrefix))) missing.push(lessonPrefix);
}
if (missing.length > 0) {
  console.error(`未命中的规则前缀（数据结构可能已变化）: ${missing.join(", ")}`);
}await writeFile(
  join(root, "scripts", "law-manual-fixes.json"),
  `${JSON.stringify({ fixes }, null, 2)}\n`,
  "utf8",
);
console.log(`共 ${applied} 条修复已写入 scripts/law-manual-fixes.json`);
