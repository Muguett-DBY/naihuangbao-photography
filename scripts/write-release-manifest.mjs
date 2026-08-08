import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const archiveManifest = JSON.parse(await readFile(resolve(root, "public", "archive-manifest.json"), "utf8"));
const storyManifest = JSON.parse(await readFile(resolve(root, "public", "story-manifest.json"), "utf8"));

function resolveCommit() {
  const environmentCommit = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA;
  if (environmentCommit) return environmentCommit;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const release = {
  name: packageJson.name,
  version: packageJson.version,
  commit: resolveCommit(),
  builtAt: new Date().toISOString(),
  archiveSchemaVersion: archiveManifest.schemaVersion,
  storySchemaVersion: storyManifest.schemaVersion,
};

await writeFile(resolve(root, "dist", "release.json"), `${JSON.stringify(release, null, 2)}\n`, "utf8");
console.log(`Release manifest written for ${release.commit.slice(0, 12)}.`);
