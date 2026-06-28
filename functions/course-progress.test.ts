import { afterEach, describe, expect, it, vi } from "vitest";
import { createUserSession } from "./_auth";

type ProgressRoute = {
  onRequestGet: PagesFunction;
  onRequestPost: PagesFunction;
};

const authSecret = "course-progress-test-secret-1234567890";

async function loadProgressRoute(): Promise<ProgressRoute | null> {
  const routeUrl = new URL("./api/courses/[id]/progress.ts", import.meta.url).href;
  return import(/* @vite-ignore */ routeUrl).catch(() => null) as Promise<ProgressRoute | null>;
}

async function progressRequest(method = "GET", body?: unknown) {
  const session = await createUserSession("user-1", authSecret);
  return new Request("https://shoot.custard.top/api/courses/course-1/progress", {
    method,
    headers: {
      cookie: `nhb_user_session=${session}`,
      "content-type": "application/json",
      "x-nhb-public-action": "1",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createProgressDb({
  completedModules = ["module-1"],
  moduleIds = ["module-1", "module-2", "module-3"],
  priceCents = 0,
  purchased = false,
}: {
  completedModules?: string[];
  moduleIds?: string[];
  priceCents?: number;
  purchased?: boolean;
} = {}) {
  const prepare = vi.fn((sql: string) => {
    const normalized = sql.toLowerCase();
    const statement = {
      bind: vi.fn(() => statement),
      first: vi.fn(async () => {
        if (normalized.includes("from courses")) return { id: "course-1", price_cents: priceCents };
        if (normalized.includes("from course_purchases")) return purchased ? { id: "purchase-1" } : null;
        if (normalized.includes("from course_progress")) {
          return { completed_modules: JSON.stringify(completedModules) };
        }
        return null;
      }),
      all: vi.fn(async () => ({
        results: normalized.includes("from course_modules")
          ? moduleIds.map((id) => ({ id }))
          : [],
      })),
      run: vi.fn(async () => ({ success: true })),
    };
    return statement;
  });

  return { prepare };
}

describe("course progress API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads persisted module completion for an authenticated free course", async () => {
    const route = await loadProgressRoute();
    expect(route).not.toBeNull();
    if (!route) return;

    const response = await route.onRequestGet({
      request: await progressRequest(),
      env: { DB: createProgressDb(), AUTH_SECRET: authSecret },
      params: { id: "course-1" },
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ completedModules: ["module-1"] });
  });

  it("persists only valid course modules and updates the numeric progress", async () => {
    const route = await loadProgressRoute();
    expect(route).not.toBeNull();
    if (!route) return;
    const db = createProgressDb();

    const response = await route.onRequestPost({
      request: await progressRequest("POST", { completedModules: ["module-1", "module-2", "module-1"] }),
      env: { DB: db, AUTH_SECRET: authSecret },
      params: { id: "course-1" },
    } as never);
    const body = (await response.json()) as { completedModules?: string[]; progress?: number };

    expect(response.status).toBe(200);
    expect(body).toEqual({ completedModules: ["module-1", "module-2"], progress: 67 });
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("insert into course_progress"));
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("update course_purchases set progress"));
  });

  it("rejects module IDs that do not belong to the course", async () => {
    const route = await loadProgressRoute();
    expect(route).not.toBeNull();
    if (!route) return;
    const db = createProgressDb();

    const response = await route.onRequestPost({
      request: await progressRequest("POST", { completedModules: ["not-this-course"] }),
      env: { DB: db, AUTH_SECRET: authSecret },
      params: { id: "course-1" },
    } as never);

    expect(response.status).toBe(400);
    expect(db.prepare).not.toHaveBeenCalledWith(expect.stringContaining("insert into course_progress"));
  });
});
