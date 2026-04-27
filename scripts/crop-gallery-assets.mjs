import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const rawDir = path.join(root, "public", "images", "gallery", "raw");
const outputDir = path.join(root, "public", "images", "gallery");

const assets = [
  ["slide-2.jpg", "gallery-jiangnan-01.webp"],
  ["slide-3.jpg", "gallery-urban-01.webp"],
  ["slide-4.jpg", "gallery-garden-01.webp"],
  ["slide-5.jpg", "gallery-sweet-01.webp"],
  ["slide-6.jpg", "gallery-flower-01.webp"],
  ["slide-7.jpg", "gallery-daily-01.webp"],
];

const crop = {
  left: 0,
  top: 410,
  width: 921,
  height: 1230,
};

mkdirSync(outputDir, { recursive: true });

const missing = assets
  .map(([input]) => input)
  .filter((input) => !existsSync(path.join(rawDir, input)));

if (missing.length > 0) {
  console.error(`Missing raw screenshots in ${rawDir}:`);
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  console.error("Save screenshots 2-7 with these exact names, then run npm run assets:crop again.");
  process.exit(1);
}

for (const [input, output] of assets) {
  const inputPath = path.join(rawDir, input);
  const outputPath = path.join(outputDir, output);
  const metadata = await sharp(inputPath).metadata();

  const width = Math.min(crop.width, metadata.width ?? crop.width);
  const top = Math.min(crop.top, Math.max(0, (metadata.height ?? crop.height) - crop.height));
  const height = Math.min(crop.height, (metadata.height ?? crop.height) - top);

  await sharp(inputPath)
    .extract({ left: crop.left, top, width, height })
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outputPath);

  console.log(`Wrote ${path.relative(root, outputPath)}`);
}
