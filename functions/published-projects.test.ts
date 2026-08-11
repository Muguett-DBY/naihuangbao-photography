import { describe, expect, it, vi } from "vitest";
import { onRequestPost as publishProject } from "./api/projects/publish";
import { onRequestGet as getPublishedProject } from "./api/projects/published/[slug]";
import type { PublishedProjectDraft } from "../src/types/published-project";
import { hashPublishedProject } from "../src/lib/project-publish-contract";
import { createUserSession } from "./_auth";

const authSecret = "published-project-test-secret-with-enough-entropy";

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

function createDb(row?: Record<string, unknown>, handleOwner = "publish-user", handleExists = false) {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  let handleCreated = handleExists;
  return {
    statements,
    prepare: vi.fn((sql: string) => {
      const statement = {
        sql,
        values: [] as unknown[],
        bind: vi.fn((...values: unknown[]) => { statement.values = values; statements.push({ sql, values }); return statement; }),
        run: vi.fn(async () => {
          if (sql.includes("insert into published_project_handles")) handleCreated = true;
          return { success: true };
        }),
        all: vi.fn(async () => ({ results: sql.includes("chat_rate_limits") ? [] : row ? [row] : [] })),
        first: vi.fn(async () => {
          if (sql.includes("session_version from users")) return { session_version: 0 };
          if (sql.includes("from published_project_handles")) return handleCreated ? { owner_user_id: handleOwner, project_id: draft.project.id } : null;
          if (sql.includes("update published_project_handles")) return { latest_version: 2 };
          if (sql.includes("from published_projects where slug = ? limit 1")) return null;
          return row ?? null;
        }),
      };
      return statement;
    }),
  };
}

describe("published project Pages Functions", () => {
  it("rejects anonymous publishing before claiming a slug or writing R2", async () => {
    const db = createDb();
    const bucket = { put: vi.fn(), delete: vi.fn(), get: vi.fn() };
    const validDraft = { ...draft, contentHash: await hashPublishedProject(draft.project) };
    const request = new Request("https://shoot.custard.top/api/projects/publish", {
      method: "POST",
      headers: { "content-type": "application/json", "x-nhb-public-action": "1" },
      body: JSON.stringify({ draft: validDraft, slug: "rain-glass-study-test" }),
    });

    const response = await publishProject({ request, env: { DB: db, PHOTO_BUCKET: bucket, AUTH_SECRET: authSecret }, params: {}, data: {}, waitUntil: vi.fn(), next: vi.fn(), functionPath: "", passThroughOnException: vi.fn() } as never);

    expect(response.status).toBe(401);
    expect(bucket.put).not.toHaveBeenCalled();
    expect(db.statements.some((entry) => entry.sql.includes("published_project_handles"))).toBe(false);
  });

  it("prevents another account from taking over an existing project address", async () => {
    const db = createDb(undefined, "different-owner", true);
    const bucket = { put: vi.fn(), delete: vi.fn(), get: vi.fn() };
    const validDraft = { ...draft, contentHash: await hashPublishedProject(draft.project) };
    const session = await createUserSession("publish-user", authSecret);
    const request = new Request("https://shoot.custard.top/api/projects/publish", {
      method: "POST",
      headers: { "content-type": "application/json", "x-nhb-public-action": "1", cookie: `nhb_user_session=${session}` },
      body: JSON.stringify({ draft: validDraft, slug: "rain-glass-study-test" }),
    });

    const response = await publishProject({ request, env: { DB: db, PHOTO_BUCKET: bucket, AUTH_SECRET: authSecret }, params: {}, data: {}, waitUntil: vi.fn(), next: vi.fn(), functionPath: "", passThroughOnException: vi.fn() } as never);

    expect(response.status).toBe(403);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("writes an immutable R2 snapshot and D1 version index", async () => {
    const db = createDb();
    const bucket = { put: vi.fn(async () => undefined), delete: vi.fn(async () => undefined), get: vi.fn() };
    const validDraft = { ...draft, contentHash: await hashPublishedProject(draft.project) };
    const session = await createUserSession("publish-user", authSecret);
    const request = new Request("https://shoot.custard.top/api/projects/publish", {
      method: "POST",
      headers: { "content-type": "application/json", "x-nhb-public-action": "1", cookie: `nhb_user_session=${session}` },
      body: JSON.stringify({ draft: validDraft, slug: "rain-glass-study-test" }),
    });
    const response = await publishProject({ request, env: { DB: db, PHOTO_BUCKET: bucket, AUTH_SECRET: authSecret }, params: {}, data: {}, waitUntil: vi.fn(), next: vi.fn(), functionPath: "", passThroughOnException: vi.fn() } as never);
    const body = await response.json() as { version: number; url: string };
    expect(response.status).toBe(201);
    expect(body).toMatchObject({ version: 2, url: "/share/rain-glass-study-test" });
    expect(bucket.put).toHaveBeenCalledWith(expect.stringMatching(/^published-projects\/rain-glass-study-test\/[0-9a-f-]+\.json$/), expect.any(String), expect.any(Object));
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
