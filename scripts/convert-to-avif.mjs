/**
 * Converts local editorial WebP image assets to AVIF.
 * Reads every .webp in gallery and concept-premiere directories (including 640/ and 960/)
 * and outputs .avif alongside each.
 *
 * Usage: node scripts/convert-to-avif.mjs
 */

import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const IMAGE_DIRECTORIES = [
  resolve(process.cwd(), "public/images/gallery"),
  resolve(process.cwd(), "public/images/concept-premiere"),
];

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
      console.log(`  ✓ AVIF  ${fullPath}`);
      count++;
    }
  }

  return count;
}

async function main() {
  const existingDirectories = IMAGE_DIRECTORIES.filter(existsSync);
  if (existingDirectories.length === 0) {
    console.error("No local editorial image directories found.");
    process.exit(1);
  }

  let total = 0;
  for (const directory of existingDirectories) {
    console.log("Converting WebP → AVIF in", directory);
    total += await convertWebpToAvif(directory);
  }
  console.log(`\nDone — generated ${total} AVIF files.`);
}

main().catch((err) => {
  console.error("Conversion failed:", err);
  process.exit(1);
});
