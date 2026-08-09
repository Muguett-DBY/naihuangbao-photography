/**
 * Builds responsive WebP and AVIF variants for versioned concept collections.
 * Source files live outside public/ so Vite never ships the large originals.
 *
 * Usage: node scripts/process-concept-assets.mjs
 */

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const COLLECTIONS = [
  { name: "concept-premiere", webpQuality: 82, avifQuality: 65 },
  { name: "optical-archive", webpQuality: 76, avifQuality: 58 },
  { name: "visual-os-v5", webpQuality: 80, avifQuality: 62 },
  { name: "visual-os-v6", webpQuality: 82, avifQuality: 64 },
  { name: "visual-os-v7", webpQuality: 84, avifQuality: 66, deriveDetail: true },
];
const SIZES = [
  { directory: "640", width: 640 },
  { directory: "960", width: 960 },
  { directory: "", width: 1800 },
];

async function processCollection(collection) {
  const rawDirectory = resolve(process.cwd(), `source-assets/${collection.name}/raw`);
  const outputRoot = resolve(process.cwd(), `public/images/${collection.name}`);
  if (!existsSync(rawDirectory)) return 0;

  const sourceFiles = readdirSync(rawDirectory).filter((file) =>
    /\.(jpe?g|png|webp)$/i.test(file) && !file.startsWith("."),
  );

  for (const file of sourceFiles) {
    const inputPath = resolve(rawDirectory, file);
    const baseName = file.replace(/\.[^.]+$/, "");
    const variants = collection.deriveDetail
      ? [{ suffix: "", square: false }, { suffix: "-detail", square: true }]
      : [{ suffix: "", square: false }];

    for (const variant of variants) {
      for (const size of SIZES) {
        const outputDirectory = resolve(outputRoot, size.directory);
        if (!existsSync(outputDirectory)) mkdirSync(outputDirectory, { recursive: true });
        const width = variant.square ? Math.min(size.width, 1024) : size.width;
        const image = variant.square
          ? sharp(inputPath).resize(width, width, { fit: "cover", position: sharp.strategy.attention, withoutEnlargement: true })
          : sharp(inputPath).resize(width, undefined, { fit: "inside", withoutEnlargement: true });
        const outputName = `${baseName}${variant.suffix}`;
        await image.clone().webp({ quality: collection.webpQuality, effort: 5 }).toFile(resolve(outputDirectory, `${outputName}.webp`));
        await image.clone().avif({ quality: collection.avifQuality, effort: 5 }).toFile(resolve(outputDirectory, `${outputName}.avif`));
      }
    }

    console.log(`Built ${collection.name} variants for ${baseName}${collection.deriveDetail ? " and detail crop" : ""}`);
  }

  return sourceFiles.length;
}

async function main() {
  const requestedCollection = process.argv[2];
  const collections = requestedCollection
    ? COLLECTIONS.filter((collection) => collection.name === requestedCollection)
    : COLLECTIONS;
  if (collections.length === 0) {
    throw new Error(`Unknown concept collection: ${requestedCollection}`);
  }
  let processed = 0;
  for (const collection of collections) {
    processed += await processCollection(collection);
  }
  console.log(`Processed ${processed} concept source images across ${collections.length} collections.`);
}

main().catch((error) => {
  console.error("Concept asset processing failed:", error);
  process.exit(1);
});
