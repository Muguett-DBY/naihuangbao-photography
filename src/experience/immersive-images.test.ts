import { describe, expect, it } from "vitest";
import { selectImmersiveImageUrls } from "./immersive-images";

describe("selectImmersiveImageUrls", () => {
  it("keeps unique same-origin public textures in source order", () => {
    expect(selectImmersiveImageUrls([
      undefined,
      " ",
      "/images/one.webp#frame",
      "http://localhost/images/one.webp",
      "/images/two.avif?width=960",
      "/api/photos/photo-1/image",
    ])).toEqual([
      "/images/one.webp",
      "/images/two.avif?width=960",
      "/api/photos/photo-1/image",
    ]);
  });

  it("rejects cross-origin, credentialed, and unsupported image resources", () => {
    expect(selectImmersiveImageUrls([
      "https://cdn.example.com/portrait.webp",
      "http://user:password@localhost/portrait.webp",
      "/portrait.jpg",
      "/api/private/photo-1/image",
    ])).toEqual([]);
  });

  it("caps both explicit and default selections conservatively", () => {
    const candidates = Array.from({ length: 12 }, (_, index) => `/images/${index}.webp`);
    expect(selectImmersiveImageUrls(candidates, 3)).toHaveLength(3);
    expect(selectImmersiveImageUrls(candidates)).toHaveLength(10);
    expect(selectImmersiveImageUrls(candidates, -1)).toEqual([]);
  });
});
