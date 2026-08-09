import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const dist = join(root, "dist");
const manifest = JSON.parse(await readFile(join(dist, ".vite", "manifest.json"), "utf8"));
const routeBudgets = {
  "src/pages/HomePage.tsx": 560 * 1024,
  "src/pages/ArchivePage.tsx": 360 * 1024,
  "src/pages/CreativeStudioPage.tsx": 300 * 1024,
  "src/pages/StoryBuilderPage.tsx": 300 * 1024,
  "src/pages/ProjectsPage.tsx": 300 * 1024,
  "src/pages/AssetVaultPage.tsx": 300 * 1024,
  "src/pages/SceneComposerPage.tsx": 320 * 1024,
  "src/pages/CreativeCuratorPage.tsx": 300 * 1024,
  "src/pages/PublishedProjectPage.tsx": 280 * 1024,
  "src/pages/PhotoEditorPage.tsx": 760 * 1024,
};

async function collectEntry(entryKey) {
  const seenEntries = new Set();
  const files = new Set();
  const visit = (key) => {
    if (seenEntries.has(key)) return;
    seenEntries.add(key);
    const entry = manifest[key];
    if (!entry) return;
    if (entry.file) files.add(entry.file);
    for (const css of entry.css ?? []) files.add(css);
    for (const imported of entry.imports ?? []) visit(imported);
  };
  visit(entryKey);
  const gzipBytes = (await Promise.all([...files].map(async (file) => gzipSync(await readFile(join(dist, file))).byteLength)))
    .reduce((sum, bytes) => sum + bytes, 0);
  return { files: files.size, gzipBytes };
}

for (const [source, budget] of Object.entries(routeBudgets)) {
  const key = Object.keys(manifest).find((candidate) => candidate.replaceAll("\\", "/").endsWith(source));
  if (!key) throw new Error(`Route budget entry missing from Vite manifest: ${source}`);
  const result = await collectEntry(key);
  if (result.gzipBytes > budget) throw new Error(`Route budget exceeded for ${source}: ${result.gzipBytes} > ${budget}`);
  console.log(`${source}: ${result.gzipBytes} gzip across ${result.files} files (budget ${budget}).`);
}
