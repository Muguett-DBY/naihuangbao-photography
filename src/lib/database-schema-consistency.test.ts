import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const schemaSource = readFileSync(resolve(root, "db/schema.sql"), "utf8");
const migrationSource = readdirSync(resolve(root, "db/migrations"))
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort()
  .map((fileName) => readFileSync(resolve(root, "db/migrations", fileName), "utf8"))
  .join("\n");

function extractNames(source: string, pattern: RegExp) {
  return [...new Set(
    [...source.matchAll(pattern)].map((match) => match[1].toLowerCase()),
  )].sort();
}

const tablePattern = /\bcreate\s+table\s+if\s+not\s+exists\s+([a-z0-9_]+)/gi;
const indexPattern = /\bcreate\s+(?:unique\s+)?index\s+if\s+not\s+exists\s+([a-z0-9_]+)/gi;

describe("database schema consistency", () => {
  it("represents every baseline table in incremental migrations", () => {
    expect(extractNames(migrationSource, tablePattern)).toEqual(
      extractNames(schemaSource, tablePattern),
    );
  });

  it("represents every baseline index in incremental migrations", () => {
    expect(extractNames(migrationSource, indexPattern)).toEqual(
      extractNames(schemaSource, indexPattern),
    );
  });
});
