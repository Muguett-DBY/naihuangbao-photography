import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isWorkspaceRoute } from "../data/product-navigation";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("workspace route boundaries", () => {
  it("keeps local project storage out of the public application shell", () => {
    const layout = read("src/layouts/RootLayout.tsx");
    const scope = read("src/layouts/WorkspaceProjectScope.tsx");

    expect(layout).toContain('lazy(() => import("./WorkspaceProjectScope"))');
    expect(layout).not.toContain('from "../hooks/useWorkspaceProjects"');
    expect(scope).toContain("WorkspaceProjectProvider");
    expect(isWorkspaceRoute("/")).toBe(false);
    expect(isWorkspaceRoute("/booking")).toBe(false);
    expect(isWorkspaceRoute("/projects")).toBe(true);
    expect(isWorkspaceRoute("/create/story")).toBe(true);
  });

  it("routes workspace chrome through the route-scoped copy catalog", () => {
    const localizedSurfaces = [
      "src/pages/ArchiveProjectPage.tsx",
      "src/pages/AssetVaultPage.tsx",
      "src/pages/CreativeCuratorPage.tsx",
      "src/pages/ProjectsPage.tsx",
      "src/pages/PublishedProjectPage.tsx",
      "src/pages/SceneComposerPage.tsx",
      "src/pages/StoryBuilderPage.tsx",
      "src/components/projects/ProjectCommandCenter.tsx",
      "src/components/projects/ProjectSyncPanel.tsx",
      "src/components/projects/ExhibitionControls.tsx",
      "src/components/composer/SceneComposerInspector.tsx",
      "src/components/composer/SceneComposerPreview.tsx",
      "src/components/composer/SceneComposerTimeline.tsx",
      "src/components/stories/SceneDirectorControls.tsx",
      "src/components/stories/StoryBuilderPreview.tsx",
      "src/components/stories/StoryTimeline.tsx",
      "src/components/stories/VisualStoryReader.tsx",
    ];

    for (const path of localizedSurfaces) {
      expect(read(path), path).toContain("useWorkspaceCopy");
    }

    const copy = read("src/i18n/workspace-copy.ts");
    expect(copy).toContain('const copies = { en, "zh-CN": zh, ja, ko }');
    expect(copy).toContain('language.startsWith("zh")');
  });
});
