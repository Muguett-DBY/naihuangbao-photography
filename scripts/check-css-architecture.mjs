import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const budgets = new Map([
  ["src/styles/pages.css", 260_000],
  ["src/styles/sections.css", 106_000],
  ["src/styles/site.css", 12_000],
  ["src/styles/global.css", 12_000],
]);

const failures = [];
for (const [file, maxBytes] of budgets) {
  const size = (await stat(resolve(root, file))).size;
  if (size > maxBytes) failures.push(`${file} is ${size} bytes (budget ${maxBytes})`);
}

const globalCss = await readFile(resolve(root, "src/styles/global.css"), "utf8");
const siteCss = await readFile(resolve(root, "src/styles/site.css"), "utf8");
for (const [file, source] of [["global.css", globalCss], ["site.css", siteCss]]) {
  if (/pages\.css/.test(source)) failures.push(`${file} must not eagerly import route-level pages.css`);
}

const pagesCss = await readFile(resolve(root, "src/styles/pages.css"), "utf8");
const keyframes = [...pagesCss.matchAll(/@keyframes\s+([\w-]+)/g)].map((match) => match[1]);
const duplicateKeyframes = [...new Set(keyframes.filter((name, index) => keyframes.indexOf(name) !== index))];
if (duplicateKeyframes.length) failures.push(`pages.css has duplicate keyframes: ${duplicateKeyframes.join(", ")}`);

if (failures.length) {
  console.error("CSS architecture check failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`CSS architecture check passed (${budgets.size} file budgets, ${keyframes.length} keyframes).`);
