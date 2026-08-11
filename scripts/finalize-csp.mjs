import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const headersPath = join(dist, "_headers");
const placeholder = "__CSP_SCRIPT_HASHES__";

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
  }));
  return nested.flat();
}

const hashes = new Set();
for (const path of await htmlFiles(dist)) {
  const html = await readFile(path, "utf8");
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (!match[1]) continue;
    const digest = createHash("sha256").update(match[1], "utf8").digest("base64");
    hashes.add(`'sha256-${digest}'`);
  }
}

if (hashes.size === 0) throw new Error("No inline scripts found while finalizing CSP");
const hashSource = [...hashes].sort().join(" ");
if (hashSource.length > 12_000) throw new Error(`CSP script hash list is too large: ${hashSource.length} bytes`);

const headers = await readFile(headersPath, "utf8");
if (!headers.includes(placeholder)) throw new Error(`Missing ${placeholder} in ${relative(root, headersPath)}`);
await writeFile(headersPath, headers.replaceAll(placeholder, hashSource));
console.log(`Finalized CSP with ${hashes.size} inline-script hashes.`);
