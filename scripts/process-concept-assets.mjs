/**
 * Builds responsive WebP and AVIF variants for concept-premiere source images.
 * Source files live outside public/ so Vite never ships the large originals.
 *
 * Usage: node scripts/process-concept-assets.mjs
 */

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const RAW_DIR = resolve(process.cwd(), "source-assets/concept-premiere/raw");
const OUT_DIR = resolve(process.cwd(), "public/images/concept-premiere");
const SIZES = [
  { directory: "640", width: 640 },
  { directory: "960", width: 960 },
  { directory: "", width: 1800 },
];

async function main() {
  if (!existsSync(RAW_DIR)) {
    console.log("No concept source directory found. Skipping.");
    return;
  }

  const sourceFiles = readdirSync(RAW_DIR).filter((file) =>
    /\.(jpe?g|png|webp)$/i.test(file) && !file.startsWith("."),
  );

  for (const file of sourceFiles) {
    const inputPath = resolve(RAW_DIR, file);
    const baseName = file.replace(/\.[^.]+$/, "");

    for (const size of SIZES) {
      const outputDirectory = resolve(OUT_DIR, size.directory);
      if (!existsSync(outputDirectory)) mkdirSync(outputDirectory, { recursive: true });

      const image = sharp(inputPath).resize(size.width, undefined, {
        fit: "inside",
        withoutEnlargement: true,
      });
      await image.clone().webp({ quality: 82 }).toFile(resolve(outputDirectory, `${baseName}.webp`));
      await image.clone().avif({ quality: 65 }).toFile(resolve(outputDirectory, `${baseName}.avif`));
    }

    console.log(`Built concept variants for ${baseName}`);
  }

  console.log(`Processed ${sourceFiles.length} concept source images.`);
}

main().catch((error) => {
  console.error("Concept asset processing failed:", error);
  process.exit(1);
});
