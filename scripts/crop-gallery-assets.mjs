import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const rawDir = path.join(root, "source-assets", "gallery", "raw");
const outputDir = path.join(root, "public", "images", "gallery");
const responsiveWidths = [640, 960];

const outputNames = [
  "gallery-jiangnan-01.webp",
  "gallery-urban-01.webp",
  "gallery-garden-01.webp",
  "gallery-sweet-01.webp",
  "gallery-flower-01.webp",
  "gallery-daily-01.webp",
];

const preferredInputs = [
  "slide-2.jpg",
  "slide-3.jpg",
  "slide-4.jpg",
  "slide-5.jpg",
  "slide-6.jpg",
  "slide-7.jpg",
];

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

mkdirSync(outputDir, { recursive: true });
for (const width of responsiveWidths) {
  mkdirSync(path.join(outputDir, String(width)), { recursive: true });
}

function getInputFiles() {
  const preferred = preferredInputs.filter((input) => existsSync(path.join(rawDir, input)));
  if (preferred.length === outputNames.length) {
    return preferred;
  }

  return readdirSync(rawDir)
    .filter((file) => imageExtensions.has(path.extname(file).toLowerCase()))
    .map((file) => ({
      file,
      modifiedAt: statSync(path.join(rawDir, file)).mtimeMs,
    }))
    .sort((a, b) => a.modifiedAt - b.modifiedAt)
    .map(({ file }) => file);
}

function mergeNearbyIntervals(intervals, maxGap = 32) {
  const merged = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (!previous || interval[0] - previous[1] > maxGap) {
      merged.push([...interval]);
    } else {
      previous[1] = interval[1];
    }
  }
  return merged;
}

async function detectPhotoBounds(inputPath) {
  const { data, info } = await sharp(inputPath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const intervals = [];
  let start = null;

  for (let y = 0; y < info.height; y += 1) {
    let brightPixels = 0;
    const samples = Math.ceil(info.width / 4);

    for (let x = 0; x < info.width; x += 4) {
      const index = (y * info.width + x) * info.channels;
      const brightness = data[index] + data[index + 1] + data[index + 2];
      if (brightness > 60) {
        brightPixels += 1;
      }
    }

    const brightRatio = brightPixels / samples;
    if (brightRatio > 0.65) {
      start ??= y;
    } else if (start !== null) {
      if (y - start > 48) {
        intervals.push([start, y - 1]);
      }
      start = null;
    }
  }

  if (start !== null) {
    intervals.push([start, info.height - 1]);
  }

  const [top, bottom] = mergeNearbyIntervals(intervals)
    .sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0] ?? [0, info.height - 1];

  return {
    left: 0,
    top,
    width: info.width,
    height: bottom - top + 1,
  };
}

const inputFiles = getInputFiles();

if (inputFiles.length !== outputNames.length) {
  console.error(`Expected ${outputNames.length} raw screenshots in ${rawDir}, found ${inputFiles.length}.`);
  console.error("Use slide-2.jpg through slide-7.jpg, or place exactly six image files in the raw folder.");
  process.exit(1);
}

for (const [index, output] of outputNames.entries()) {
  const input = inputFiles[index];
  const inputPath = path.join(rawDir, input);
  const outputPath = path.join(outputDir, output);
  const crop = await detectPhotoBounds(inputPath);
  const croppedImage = sharp(inputPath).extract(crop);

  await croppedImage
    .clone()
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outputPath);

  console.log(`Wrote ${path.relative(root, outputPath)} from ${input}`);

  for (const width of responsiveWidths) {
    const responsivePath = path.join(outputDir, String(width), output);
    await croppedImage
      .clone()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(responsivePath);
    console.log(`Wrote ${path.relative(root, responsivePath)} from ${input}`);
  }
}
