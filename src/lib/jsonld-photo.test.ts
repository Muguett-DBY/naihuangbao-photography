import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("dynamic JSON-LD for photo detail", () => {
  it("ships a useJsonLd hook that injects and cleans up an ld+json script", () => {
    const source = read("src/hooks/useJsonLd.ts");
    expect(source).toContain("useJsonLd");
    expect(source).toContain("application/ld+json");
    expect(source).toContain("removeOnUnmount");
    expect(source).toContain("scriptId");
  });

  it("emits a Photograph schema and a BreadcrumbList schema for photo detail", () => {
    const source = read("src/pages/PhotoDetailPage.tsx");
    expect(source).toContain("useJsonLd");
    expect(source).toContain('"@type": "Photograph"');
    expect(source).toContain('"@type": "BreadcrumbList"');
    expect(source).toContain('photo-${photo.id}');
    expect(source).toContain("imageObject");
    expect(source).toContain("breadcrumb");
  });

  it("preserves the static ProfessionalService and FAQPage schemas on the home shell", () => {
    const html = read("index.html");
    expect(html).toContain('"@type": "ProfessionalService"');
    expect(html).toContain('"@type": "FAQPage"');
    expect(html).toContain('"@type": "ImageGallery"');
  });
});
