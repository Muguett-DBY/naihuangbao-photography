/**
 * Generates responsive gallery image variants (640w, 960w, full-res).
 * Reads raw source images from source-assets/gallery/raw/,
 * outputs WebP and AVIF to public/images/gallery/.
 *
 * Usage: node scripts/crop-gallery-assets.mjs
 */

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const RAW_DIR = resolve(process.cwd(), "source-assets/gallery/raw");
const OUT_DIR = resolve(process.cwd(), "public/images/gallery");

const SIZES = [
  { suffix: "640", width: 640 },
  { suffix: "960", width: 960 },
  { suffix: "full", width: 1200 },
];

async function main() {
  if (!existsSync(RAW_DIR)) {
    console.log("No raw images directory found. Skipping crop.");
    return;
  }

  const rawFiles = readdirSync(RAW_DIR).filter(
    (f) => /\.(jpg|jpeg|png|webp)$/i.test(f) && !f.startsWith("."),
  );

  if (rawFiles.length === 0) {
    console.log("No raw images found in source-assets/gallery/raw/. Skipping.");
    return;
  }

  for (const file of rawFiles) {
    const inputPath = resolve(RAW_DIR, file);
    const baseName = file.replace(/\.[^.]+$/, "");

    for (const size of SIZES) {
      const outDir = resolve(
        OUT_DIR,
        size.suffix === "full" ? "" : size.suffix,
      );
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

      // WebP
      const webpPath = resolve(outDir, `${baseName}.webp`);
      await sharp(inputPath)
        .resize(size.width, undefined, { fit: "cover", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(webpPath);
      console.log(`  ✓ WebP  ${size.suffix}: ${baseName}.webp`);

      // AVIF
      const avifPath = resolve(outDir, `${baseName}.avif`);
      await sharp(inputPath)
        .resize(size.width, undefined, { fit: "cover", withoutEnlargement: true })
        .avif({ quality: 65 })
        .toFile(avifPath);
      console.log(`  ✓ AVIF  ${size.suffix}: ${baseName}.avif`);
    }
  }

  console.log(`\nDone — processed ${rawFiles.length} images.`);
}

main().catch((err) => {
  console.error("Crop failed:", err);
  process.exit(1);
});
