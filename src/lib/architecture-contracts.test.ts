import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("architecture optimization contracts", () => {
  it("enforces dependency direction, cycle checks, and file-size ratchets in lint", () => {
    const packageJson = read("package.json");
    const architectureCheck = read("scripts/check-architecture.mjs");
    const routePreload = read("src/lib/route-preload.ts");
    const routeLoaders = read("src/routing/route-loaders.ts");
    const prefetchLink = read("src/components/shared/PrefetchLink.tsx");
    const main = read("src/main.tsx");

    expect(packageJson).toContain('"typecheck": "tsc -b --noEmit"');
    expect(packageJson).toContain('"architecture:check": "node scripts/check-architecture.mjs"');
    expect(packageJson).toContain(
      '"lint": "npm run typecheck && npm run architecture:check && npm run deadcode:check"',
    );
    expect(architectureCheck).toContain("findStronglyConnectedComponents");
    expect(architectureCheck).toContain("legacyLineBudgets");
    expect(architectureCheck).toContain('"react-router-dom"');
    expect(routePreload).not.toContain('../pages/');
    expect(routeLoaders).toContain('../pages/HomePage');
    expect(prefetchLink).toContain("useRoutePreloader");
    expect(main).toContain("<RoutePreloadProvider");
    expect(existsSync(resolve(root, "docs/ARCHITECTURE.md"))).toBe(true);
    expect(existsSync(resolve(root, "CONTRIBUTING.md"))).toBe(true);
  });

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
    const gallery = read("src/components/Gallery.tsx");
    const galleryPage = read("src/pages/GalleryPage.tsx");

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
    expect(siteCss).not.toContain('@import "./gallery.css"');
    expect(gallery).toContain('import "../styles/gallery.css"');
    expect(galleryPage).toContain('import "../styles/gallery.css"');
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
    const bookingProvider = read("src/features/booking/BookingProvider.tsx");

    expect(packageJson).toContain("perf:budget");
    expect(viteConfig).toContain("codeSplitting");
    expect(viteConfig).toContain("react-vendor");
    expect(viteConfig).toContain("router-vendor");
    expect(viteConfig).toContain("assetsInlineLimit");
    expect(mainSource).toContain("requestIdleCallback");
    expect(bookingProvider).toContain("lazy(preloadBookingModal)");
    expect(bookingProvider).toContain('import("../../components/BookingModal")');
    expect(bookingProvider).toContain("warmBookingModal");
    expect(bookingProvider).not.toContain("\nvoid preloadBookingModal()");
    expect(bookingProvider).not.toContain(
      'import { BookingModal } from "../../components/BookingModal"',
    );
  });

  it("keeps main.tsx free of undefined identifiers (gsap/plugin references)", () => {
    const mainSource = read("src/main.tsx");
    // main.tsx must not reference gsap/ScrollTrigger without importing them
    // (a previous regression caused a runtime ReferenceError at app boot)
    expect(mainSource).not.toMatch(/^\s*gsap\./m);
    expect(mainSource).not.toMatch(/^\s*ScrollTrigger\./m);
    expect(mainSource).not.toContain("gsap-runtime");
    expect(existsSync(resolve(root, "src/lib/gsap-runtime.ts"))).toBe(false);
  });

  it("automates low-risk dependency maintenance and pins high-risk tooling", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const dependabot = read(".github/dependabot.yml");

    expect(packageJson.scripts["deps:audit"]).toContain("npm audit");
    expect(packageJson.scripts["deadcode:check"]).toContain("knip");
    expect(packageJson.dependencies.three).toBe("0.185.1");
    expect(packageJson.devDependencies["@types/three"]).toBe("0.185.3");
    expect(packageJson.devDependencies.wrangler).toBe("4.120.0");
    expect(packageJson.devDependencies.playwright).toBeUndefined();
    expect(existsSync(resolve(root, "src/types/animal-island-ui.d.ts"))).toBe(false);
    expect(read("src/components/admin/AdminLoading.tsx")).not.toContain("animal-island-ui");
    expect(dependabot).toContain('package-ecosystem: "npm"');
    expect(dependabot).toContain('package-ecosystem: "github-actions"');
    expect(dependabot).toContain('dependency-name: "three"');
    expect(dependabot).toContain('dependency-name: "@vitejs/plugin-react"');
    expect(existsSync(resolve(root, "knip.json"))).toBe(true);
  });

  it("isolates Animal Island component imports from its legacy bundled GSAP runtime", () => {
    const viteConfig = read("vite.config.ts");
    const runtimePath = "src/vendor/animal-island-ui-runtime.mjs";

    expect(viteConfig).toContain("animalIslandRuntime");
    expect(viteConfig).toContain("/^animal-island-ui$/");
    expect(existsSync(resolve(root, runtimePath))).toBe(true);
    expect(read(runtimePath)).not.toContain("Loading");
    expect(read(runtimePath)).toContain("components/Button/Button.js");
  });

  it("isolates the immersive Three.js runtime behind one lazy boundary", () => {
    const packageJson = read("package.json");
    const viteConfig = read("vite.config.ts");
    const rootLayout = read("src/layouts/RootLayout.tsx");
    const gate = read("src/experience/ImmersiveExperienceGate.tsx");

    expect(packageJson).toContain('"three"');
    expect(viteConfig).toContain('name: "immersive-vendor"');
    expect(viteConfig).toContain("**/immersive-vendor-*.js");
    expect(rootLayout).toContain("<ImmersiveExperienceGate");
    expect(rootLayout).not.toContain('from "three"');
    expect(existsSync(resolve(root, "src/experience/ImmersiveExperience.tsx"))).toBe(true);
    expect(gate).toContain(".catch(() => undefined)");
  });

  it("keeps the temporary immersive dependency retention outside React renders", () => {
    const immersiveExperience = read("src/experience/ImmersiveExperience.tsx");

    expect(immersiveExperience).toContain("const placeholderColor = new Color();");
    expect(immersiveExperience).not.toContain("new Color();\n  return null;");
  });
});
