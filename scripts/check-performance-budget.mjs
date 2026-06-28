import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const assetsDir = join(process.cwd(), "dist", "assets");
const maxMainJsBytes = 384 * 1024;
const maxLazyJsBytes = 700 * 1024;
const maxMainCssBytes = 200 * 1024;
const maxFontAssetBytes = 256 * 1024;

const files = await readdir(assetsDir);
const stats = await Promise.all(files.map(async (file) => ({
  file,
  size: (await stat(join(assetsDir, file))).size,
})));

const mainJs = stats.find((item) => /^index-.*\.js$/.test(item.file));
const mainCss = stats.find((item) => /^index-.*\.css$/.test(item.file));
const largestLazyJs = stats
  .filter((item) => item.file.endsWith(".js") && item.file !== mainJs?.file)
  .sort((a, b) => b.size - a.size)[0];
const fontAssetBytes = stats
  .filter((item) => /\.(?:woff2?|ttf)$/.test(item.file))
  .reduce((sum, item) => sum + item.size, 0);

if (!mainJs || !mainCss) {
  throw new Error("Could not find main JS/CSS assets for performance budget check.");
}

if (mainJs.size > maxMainJsBytes) {
  throw new Error(`Main JS budget exceeded: ${mainJs.size} > ${maxMainJsBytes}`);
}

if (mainCss.size > maxMainCssBytes) {
  throw new Error(`Main CSS budget exceeded: ${mainCss.size} > ${maxMainCssBytes}`);
}

if (largestLazyJs && largestLazyJs.size > maxLazyJsBytes) {
  throw new Error(`Lazy JS budget exceeded: ${largestLazyJs.file} ${largestLazyJs.size} > ${maxLazyJsBytes}`);
}

if (fontAssetBytes > maxFontAssetBytes) {
  throw new Error(`Font asset budget exceeded: ${fontAssetBytes} > ${maxFontAssetBytes}`);
}

console.log(
  `Performance budget ok: ${mainJs.file} ${mainJs.size} bytes, ${mainCss.file} ${mainCss.size} bytes, largest lazy JS ${largestLazyJs?.size ?? 0} bytes, fonts ${fontAssetBytes} bytes.`,
);
