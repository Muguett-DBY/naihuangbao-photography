import { describe, expect, it } from "vitest";
import {
  buildShareLinkRecord,
  evaluateShareLinkAccess,
  hashSharePassword,
  normalizeShareLinkInput,
  verifySharePassword,
  SHARE_LINK_LIMITS,
} from "./share-link";

describe("share-link utilities", () => {
  it("normalizes valid share link input with privacy controls", () => {
    const normalized = normalizeShareLinkInput({
      resourceType: "photo",
      resourceId: "photo-123",
      visibility: "unlisted",
      password: "secret123",
      maxViews: 25,
      expiresInDays: 7,
      createdBy: "admin@example.com",
    });

    expect(normalized.resourceType).toBe("photo");
    expect(normalized.visibility).toBe("unlisted");
    expect(normalized.maxViews).toBe(25);
    expect(normalized.expiresAt).not.toBeNull();
    expect(normalized.passwordHash).not.toBeNull();
    expect(normalized.createdBy).toBe("admin@example.com");
  });

  it("rejects invalid resource types and missing resource ids", () => {
    expect(() => normalizeShareLinkInput({ resourceType: "invalid" as never, resourceId: "x" })).toThrow();
    expect(() => normalizeShareLinkInput({ resourceType: "photo", resourceId: "" })).toThrow();
  });

  it("clamps max views and expiry days to safe limits", () => {
    const tooLarge = normalizeShareLinkInput({
      resourceType: "album",
      resourceId: "album-1",
      maxViews: 100000,
      expiresInDays: 1000,
    });
    expect(tooLarge.maxViews).toBe(SHARE_LINK_LIMITS.MAX_VIEW_LIMIT);
    expect(tooLarge.expiresAt).not.toBeNull();
  });

  it("builds a share link record with crypto-random token and metadata", () => {
    const record = buildShareLinkRecord(
      normalizeShareLinkInput({
        resourceType: "gallery",
        resourceId: "featured",
        maxViews: 5,
      }),
      null,
    );
    expect(record.token).toHaveLength(SHARE_LINK_LIMITS.SHARE_TOKEN_LENGTH * 2);
    expect(record.viewCount).toBe(0);
    expect(record.resourceType).toBe("gallery");
  });

  it("verifies share password hashes with timing-safe comparison", async () => {
    const hash = await hashSharePassword("hunter2");
    expect(await verifySharePassword("hunter2", hash)).toBe(true);
    expect(await verifySharePassword("wrong", hash)).toBe(false);
    expect(await verifySharePassword("anything", "")).toBe(true);
  });

  it("blocks expired share links", () => {
    const result = evaluateShareLinkAccess({
      id: "share_1",
      token: "abc",
      resourceType: "photo",
      resourceId: "photo-1",
      visibility: "public",
      passwordHash: null,
      maxViews: null,
      viewCount: 0,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      createdAt: new Date(Date.now() - 10000).toISOString(),
      createdBy: null,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe("expired");
  });

  it("blocks share links that exceeded max views", () => {
    const result = evaluateShareLinkAccess({
      id: "share_2",
      token: "def",
      resourceType: "photo",
      resourceId: "photo-2",
      visibility: "public",
      passwordHash: null,
      maxViews: 3,
      viewCount: 3,
      expiresAt: null,
      createdAt: new Date().toISOString(),
      createdBy: null,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe("max_views_reached");
  });

  it("allows valid share links within privacy limits", () => {
    const result = evaluateShareLinkAccess({
      id: "share_3",
      token: "ghi",
      resourceType: "album",
      resourceId: "album-3",
      visibility: "unlisted",
      passwordHash: null,
      maxViews: 100,
      viewCount: 5,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: "admin",
    });
    expect(result.allowed).toBe(true);
  });

  it("returns not_found for null or missing share links", () => {
    const result = evaluateShareLinkAccess(null);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe("not_found");
  });
});
