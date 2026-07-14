import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("immersive experience integration", () => {
  it("mounts the adaptive canvas through the public layout", () => {
    expect(read("src/layouts/RootLayout.tsx")).toContain("<ExperienceProvider>");
    expect(read("src/layouts/RootLayout.tsx")).toContain("<ImmersiveExperienceGate");
    expect(read("src/experience/ImmersiveExperienceGate.tsx")).toContain('import("./ImmersiveExperience")');
    expect(read("src/experience/ImmersiveExperience.tsx")).toContain('aria-hidden="true"');
    expect(read("src/components/shared/PageHero.tsx")).toContain("useImmersiveAnchor");
    expect(read("src/styles/site.css")).toContain('@import "./immersive.css"');
    expect(read("src/styles/immersive.css")).toContain("pointer-events: none");
  });

  it("keeps Three.js behind the dynamic immersive branch", () => {
    const rootLayout = read("src/layouts/RootLayout.tsx");
    const gate = read("src/experience/ImmersiveExperienceGate.tsx");
    const provider = read("src/experience/ExperienceProvider.tsx");

    expect(rootLayout).not.toContain('from "three"');
    expect(rootLayout).not.toMatch(/from "\.\.\/experience\/ImmersiveExperience"/);
    expect(gate).toContain('import("./ImmersiveExperience")');
    expect(gate).not.toContain('from "three"');
    expect(provider).not.toContain('from "three"');
    expect(existsSync(resolve(root, "src/experience/ImmersiveExperience.tsx"))).toBe(true);
  });
});
