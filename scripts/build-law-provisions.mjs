// 法条索引构建脚本（P4·T1）：扫描五本 JSON 全文提取法条引用，
// 产出 src/data/law/provisions-index.json（幂等、确定性——重跑产物逐字节一致）。
// 提取引擎单源于 src/lib/law-provisions.ts（经 tsx 加载，与页面高亮共用同一套正则）。
// 运行：npm run law:provisions
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildProvisionsIndex } from "../src/lib/law-provisions";

const SUBJECT_IDS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"];

const books = [];
for (const subject of SUBJECT_IDS) {
  const source = JSON.parse(await readFile(join(process.cwd(), "src", "data", "law", `${subject}.json`), "utf8"));
  if (!source?.book?.chapters) throw new Error(`law source ${subject}.json 缺少 book.chapters`);
  books.push({ subject, book: source.book });
}

const index = buildProvisionsIndex(books);
if (index.totalProvisions === 0) throw new Error("法条索引为空——正则或数据路径出了问题");

const target = join(process.cwd(), "src", "data", "law", "provisions-index.json");
await writeFile(target, `${JSON.stringify(index, null, 2)}\n`, "utf8");

const lawCount = new Set(index.provisions.map((provision) => provision.law)).size;
console.log(
  `法条索引已生成：${index.totalProvisions} 条（${lawCount} 部法律），总引用 ${index.totalReferences} 次 → src/data/law/provisions-index.json`,
);
