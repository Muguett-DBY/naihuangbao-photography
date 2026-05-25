/**
 * One-time script: converts existing WebP gallery images to AVIF.
 * Reads every .webp in public/images/gallery/ (including 640/ and 960/)
 * and outputs .avif alongside each.
 *
 * Usage: node scripts/convert-to-avif.mjs
 */

import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const GALLERY_DIR = resolve(process.cwd(), "public/images/gallery");

async function convertWebpToAvif(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);

    if (entry.isDirectory()) {
      count += await convertWebpToAvif(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".webp")) {
      const avifPath = fullPath.replace(/\.webp$/, ".avif");
      if (existsSync(avifPath)) {
        // Skip if AVIF already exists
        continue;
      }

      await sharp(fullPath)
        .avif({ quality: 65 })
        .toFile(avifPath);
      console.log(`  ✓ AVIF  ${fullPath.replace(GALLERY_DIR, "")}`);
      count++;
    }
  }

  return count;
}

async function main() {
  if (!existsSync(GALLERY_DIR)) {
    console.error("Gallery directory not found:", GALLERY_DIR);
    process.exit(1);
  }

  console.log("Converting WebP → AVIF in", GALLERY_DIR);
  const total = await convertWebpToAvif(GALLERY_DIR);
  console.log(`\nDone — generated ${total} AVIF files.`);
}

main().catch((err) => {
  console.error("Conversion failed:", err);
  process.exit(1);
});
