import { describe, expect, it, vi } from "vitest";
import { onRequestPost as publishProject } from "./api/projects/publish";
import { onRequestGet as getPublishedProject } from "./api/projects/published/[slug]";
import type { PublishedProjectDraft } from "../src/types/published-project";

const draft: PublishedProjectDraft = {
  schemaVersion: 1,
  contentHash: "a".repeat(64),
  project: {
    id: "workspace-test",
    version: 1,
    projectType: "workspace",
    name: "Rain Glass Study",
    description: "Personal practice",
    accent: "#d25f62",
    assets: [{ assetId: "rain", src: "/images/visual-os-v7/05-rain-observatory.webp", alt: "Rain", title: "Rain", source: "archive", addedAt: 1 }],
    compositionIds: [],
    storyIds: [],
    activeSurface: "publish",
    createdAt: 1,
    updatedAt: 2,
  },
};

function createDb(row?: Record<string, unknown>) {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  return {
    statements,
    prepare: vi.fn((sql: string) => {
      const statement = {
        sql,
        values: [] as unknown[],
        bind: vi.fn((...values: unknown[]) => { statement.values = values; statements.push({ sql, values }); return statement; }),
        run: vi.fn(async () => ({ success: true })),
        all: vi.fn(async () => ({ results: sql.includes("chat_rate_limits") ? [] : row ? [row] : [] })),
        first: vi.fn(async () => sql.includes("max(version)") ? { version: 1 } : row ?? null),
      };
      return statement;
    }),
  };
}

describe("published project Pages Functions", () => {
  it("writes an immutable R2 snapshot and D1 version index", async () => {
    const db = createDb();
    const bucket = { put: vi.fn(async () => undefined), delete: vi.fn(async () => undefined), get: vi.fn() };
    const request = new Request("https://shoot.custard.top/api/projects/publish", {
      method: "POST",
      headers: { "content-type": "application/json", "x-nhb-public-action": "1" },
      body: JSON.stringify({ draft, slug: "rain-glass-study-test" }),
    });
    const response = await publishProject({ request, env: { DB: db, PHOTO_BUCKET: bucket }, params: {}, data: {}, waitUntil: vi.fn(), next: vi.fn(), functionPath: "", passThroughOnException: vi.fn() } as never);
    const body = await response.json() as { version: number; url: string };
    expect(response.status).toBe(201);
    expect(body).toMatchObject({ version: 2, url: "/share/rain-glass-study-test" });
    expect(bucket.put).toHaveBeenCalledWith("published-projects/rain-glass-study-test/v2.json", expect.any(String), expect.any(Object));
    expect(db.statements.some((entry) => entry.sql.includes("insert into published_projects"))).toBe(true);
  });

  it("resolves the latest immutable snapshot from D1 and R2", async () => {
    const snapshot = { ...draft, id: "published-1", slug: "rain-glass-study-test", version: 2, publishedAt: "2026-08-09T00:00:00.000Z" };
    const db = createDb({ slug: snapshot.slug, version: 2, object_key: "published-projects/rain-glass-study-test/v2.json", content_hash: draft.contentHash, published_at: snapshot.publishedAt });
    const bucket = { get: vi.fn(async () => ({ body: new Blob([JSON.stringify(snapshot)]).stream() })) };
    const request = new Request("https://shoot.custard.top/api/projects/published/rain-glass-study-test");
    const response = await getPublishedProject({ request, env: { DB: db, PHOTO_BUCKET: bucket }, params: { slug: "rain-glass-study-test" }, data: {}, waitUntil: vi.fn(), next: vi.fn(), functionPath: "", passThroughOnException: vi.fn() } as never);
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe(`\"${draft.contentHash}\"`);
    expect(await response.json()).toMatchObject({ slug: snapshot.slug, version: 2 });
  });
});
