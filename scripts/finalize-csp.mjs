import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const headersPath = join(dist, "_headers");
const cspMetaPattern = /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/i;

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
  }));
  return nested.flat();
}

function inlineScriptHashes(html) {
  const hashes = new Set();
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (!match[1]) continue;
    const digest = createHash("sha256").update(match[1], "utf8").digest("base64");
    hashes.add(`'sha256-${digest}'`);
  }
  return [...hashes].sort();
}

function contentSecurityPolicy(hashes) {
  const inlineSources = hashes.length > 0 ? ` ${hashes.join(" ")}` : "";
  return [
    "default-src 'self'",
    `script-src 'self'${inlineSources} https://static.cloudflareinsights.com`,
    "script-src-attr 'none'",
    "style-src 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://static.cloudflareinsights.com https://cloudflareinsights.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function injectCspMeta(html, policy, path) {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
  if (cspMetaPattern.test(html)) return html.replace(cspMetaPattern, meta);

  const charsetPattern = /<meta\s+charset=["'][^"']+["'][^>]*>/i;
  if (charsetPattern.test(html)) return html.replace(charsetPattern, (match) => `${match}\n    ${meta}`);
  if (/<head(?:\s[^>]*)?>/i.test(html)) return html.replace(/<head(?:\s[^>]*)?>/i, (match) => `${match}\n    ${meta}`);
  throw new Error(`Cannot inject CSP into ${relative(root, path)} because it has no <head>`);
}

const uniqueHashes = new Set();
let protectedDocuments = 0;
for (const path of await htmlFiles(dist)) {
  const html = await readFile(path, "utf8");
  if (!/<head(?:\s[^>]*)?>/i.test(html)) continue;
  const hashes = inlineScriptHashes(html);
  hashes.forEach((hash) => uniqueHashes.add(hash));
  const policy = contentSecurityPolicy(hashes);
  await writeFile(path, injectCspMeta(html, policy, path), "utf8");
  protectedDocuments += 1;
}

if (protectedDocuments === 0) throw new Error("No HTML documents found while finalizing CSP");

const headers = await readFile(headersPath, "utf8");
const headerLines = headers.split(/\r?\n/).filter((line) => line.trimStart().startsWith("Content-Security-Policy:"));
if (headerLines.length !== 1) throw new Error(`Expected one CSP header in ${relative(root, headersPath)}`);
if (headerLines[0].length > 2_000) throw new Error(`CSP header exceeds the Cloudflare Pages 2,000 character limit: ${headerLines[0].length}`);

console.log(`Finalized CSP for ${protectedDocuments} HTML documents with ${uniqueHashes.size} unique inline-script hashes.`);
