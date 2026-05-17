import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const indexPath = resolve(root, "index.html");
const { renderSeoHead } = await import("../src/lib/seo.ts");
const html = await readFile(indexPath, "utf8");
const generatedBlock = [
  "<!-- seo:generated:start -->",
  `    ${renderSeoHead()}`,
  "    <!-- seo:generated:end -->",
].join("\n");

const generatedPattern = /<!-- seo:generated:start -->[\s\S]*?<!-- seo:generated:end -->/;
const legacyPattern = /<meta name="robots"[\s\S]*?<title>[\s\S]*?<\/title>/;
const nextHtml = generatedPattern.test(html)
  ? html.replace(generatedPattern, generatedBlock.trim())
  : html.replace(legacyPattern, generatedBlock.trim());

if (nextHtml === html) {
  console.log("SEO shell already up to date.");
} else {
  await writeFile(indexPath, nextHtml, "utf8");
  console.log("SEO shell synced.");
}
