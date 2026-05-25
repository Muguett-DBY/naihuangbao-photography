import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("architecture optimization contracts", () => {
  it("keeps Cloudflare bindings generated and deploy environments explicit", () => {
    const wrangler = read("wrangler.toml");
    const tsconfigNode = read("tsconfig.node.json");
    const functionSources = [
      "functions/api/content.ts",
      "functions/api/photos.ts",
      "functions/api/admin/content.ts",
      "functions/api/admin/login.ts",
      "functions/api/admin/photos.ts",
      "functions/api/admin/session.ts",
      "functions/api/admin/photos/[id].ts",
      "functions/api/photos/[id]/image.ts",
    ].map((path) => read(path));

    expect(existsSync(resolve(root, "worker-configuration.d.ts"))).toBe(true);
    expect(tsconfigNode).toContain("worker-configuration.d.ts");
    expect(wrangler).not.toContain("[observability]");
    expect(wrangler).not.toContain("env.preview.observability");
    expect(wrangler).not.toContain("env.production.observability");
    expect(wrangler).toContain("pages_build_output_dir");
    expect(functionSources.join("\n")).not.toMatch(/^type Env =/m);
  });

  it("routes Cloudflare API behavior through shared response and photo helpers", () => {
    expect(existsSync(resolve(root, "functions/_responses.ts"))).toBe(true);
    expect(existsSync(resolve(root, "functions/_photos.ts"))).toBe(true);

    expect(read("functions/api/photos.ts")).toContain("publicPhotosFallback");
    expect(read("functions/api/admin/photos.ts")).toContain("createPhotoWithCompensation");
    expect(read("functions/api/admin/photos/[id].ts")).toContain("deletePhotoWithConsistency");
  });

  it("splits admin behavior into focused hooks and tab components", () => {
    const adminDashboard = read("src/components/AdminDashboard.tsx");
    const expectedFiles = [
      "src/hooks/useAdminSession.ts",
      "src/components/admin/AdminShell.tsx",
      "src/components/admin/AdminPhotosTab.tsx",
      "src/components/admin/AdminPackagesTab.tsx",
      "src/components/admin/AdminServicesTab.tsx",
      "src/components/admin/AdminFaqTab.tsx",
      "src/components/admin/AdminCopyTab.tsx",
    ];

    for (const path of expectedFiles) {
      expect(existsSync(resolve(root, path))).toBe(true);
    }

    expect(adminDashboard.length).toBeLessThan(12_000);
    expect(adminDashboard).not.toContain("function renderPhotosTab");
    expect(adminDashboard).not.toContain("function renderPackagesTab");
  });

  it("uses focused CSS modules through a small global entrypoint", () => {
    const globalCss = read("src/styles/global.css");
    const siteCss = read("src/styles/site.css");

    expect(existsSync(resolve(root, "src/styles/base.css"))).toBe(true);
    expect(existsSync(resolve(root, "src/styles/site.css"))).toBe(true);
    expect(existsSync(resolve(root, "src/styles/hero.css"))).toBe(true);
    expect(existsSync(resolve(root, "src/styles/gallery.css"))).toBe(true);
    expect(existsSync(resolve(root, "src/styles/sections.css"))).toBe(true);
    expect(existsSync(resolve(root, "src/styles/chat.css"))).toBe(true);
    expect(globalCss).toContain('@import "./base.css"');
    expect(globalCss).toContain('@import "./site.css"');
    expect(globalCss).toContain('@import "./chat.css"');
    expect(siteCss).toContain('@import "./hero.css"');
    expect(siteCss).toContain('@import "./gallery.css"');
    expect(siteCss).toContain('@import "./sections.css"');
    expect(globalCss.split(/\r?\n/).length).toBeLessThan(80);
    expect(siteCss.split(/\r?\n/).length).toBeLessThan(10);
  });

  it("generates the static SEO shell from the default content model", () => {
    const html = read("index.html");
    const packageJson = read("package.json");

    expect(existsSync(resolve(root, "src/lib/seo.ts"))).toBe(true);
    expect(existsSync(resolve(root, "scripts/sync-seo-shell.mjs"))).toBe(true);
    expect(packageJson).toContain("seo:sync");
    expect(packageJson).toContain("npm run seo:sync");
    expect(html).toContain("<!-- seo:generated:start -->");
    expect(html).toContain("<!-- seo:generated:end -->");
  });

  it("keeps performance budgets and explicit bundle splitting in place", () => {
    const packageJson = read("package.json");
    const viteConfig = read("vite.config.ts");
    const mainSource = read("src/main.tsx");

    expect(packageJson).toContain("perf:budget");
    expect(viteConfig).toContain("manualChunks");
    expect(viteConfig).toContain("react-vendor");
    expect(viteConfig).toContain("assetsInlineLimit");
    expect(mainSource).toContain("requestIdleCallback");
  });

  it("removes the unused cinematic WebGL gallery from the public architecture", () => {
    const packageJson = read("package.json");
    const gallerySource = read("src/components/Gallery.tsx");
    const viteConfig = read("vite.config.ts");
    const cssSource = [
      "src/styles/hero.css",
      "src/styles/gallery.css",
      "src/styles/sections.css",
    ].map((path) => read(path)).join("\n");

    expect(packageJson).toContain('"three"');
    expect(packageJson).toContain('"@fontsource/nunito"');
    expect(existsSync(resolve(root, "src/components/CinematicGalleryScene.tsx"))).toBe(false);
    expect(existsSync(resolve(root, "src/lib/cinematic-gallery.ts"))).toBe(false);
    expect(existsSync(resolve(root, "src/data/cinematic.ts"))).toBe(false);
    expect(existsSync(resolve(root, "public/images/cinematic"))).toBe(false);
    expect(viteConfig).not.toContain("images/cinematic");
    expect(cssSource).not.toContain("cinematic");
    expect(gallerySource).toContain('lazy(() => import("./Lightbox"))');
    expect(gallerySource).not.toContain("<CinematicGalleryScene");
    expect(gallerySource).toContain('t("gallery.description")');
  });
});
