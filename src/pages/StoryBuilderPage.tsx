import "../styles/platform-v3.css";
import "../styles/story-builder.css";
import "../styles/story-director-v7.css";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, FilePlus2, ImagePlus, LayoutTemplate, Monitor, PanelsTopLeft, Plus, Save, Smartphone, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { StoryBuilderPreview } from "../components/stories/StoryBuilderPreview";
import { StoryTimeline } from "../components/stories/StoryTimeline";
import { SceneDirectorControls } from "../components/stories/SceneDirectorControls";
import { archiveProjects } from "../data/living-archive";
import { visualAssetById } from "../data/visual-assets";
import { readArchiveCollection } from "../hooks/useArchiveCollection";
import { useSEO } from "../hooks/useSEO";
import {
  createStoryChapter,
  createStoryProject,
  createStoryProjectFile,
  createStoryProjectId,
  deleteStoryProject,
  listStoryProjects,
  parseStoryProjectFile,
  saveStoryProject,
  type StoryProject,
  type StoryProjectFrame,
} from "../lib/story-project-store";
import type { StoryLayout } from "../types/visual-story";
import { setCreativeWorkDirty } from "../lib/creative-work-state";
import { useWorkspaceProjects } from "../hooks/useWorkspaceProjects";
import { useWorkspaceCopy, type WorkspaceCopyKey } from "../i18n/workspace-copy";

const LAST_STORY_KEY = "nhb:last-story-project";
const layouts: Array<{ id: StoryLayout; label: WorkspaceCopyKey }> = [
  { id: "full", label: "layoutFull" },
  { id: "columns", label: "layoutColumns" },
  { id: "contact", label: "layoutContact" },
  { id: "quiet", label: "layoutQuiet" },
  { id: "diptych", label: "layoutDiptych" },
  { id: "compare", label: "layoutCompare" },
  { id: "annotation", label: "layoutAnnotation" },
  { id: "interlude", label: "layoutInterlude" },
  { id: "constellation", label: "layoutConstellation" },
];

const archiveFrames = archiveProjects.flatMap((project) => project.media.map((media, index): StoryProjectFrame => ({
  id: `${project.id}-${index}`,
  projectId: project.id,
  src: media.src,
  alt: media.alt,
})));

function createStarterProject() {
  const picks = [
    archiveFrames.find((frame) => frame.projectId === "light-workshop"),
    archiveFrames.find((frame) => frame.projectId === "weather-glasshouse"),
    archiveFrames.find((frame) => frame.projectId === "material-index"),
  ].filter((frame): frame is StoryProjectFrame => Boolean(frame));
  return createStoryProject({
    name: "Light, weather, material",
    title: "A Field Note in Three Movements",
    subtitle: "光、天气与材料之间的缓慢往返",
    chapters: picks.map((frame, index) => createStoryChapter(index, [frame])),
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function StoryBuilderPage() {
  const { text } = useWorkspaceCopy();
  useSEO({ title: text("buildStory"), descKey: "platform.routes.create", path: "/create/story" });
  const [project, setProject] = useState<StoryProject | null>(null);
  const [projects, setProjects] = useState<StoryProject[]>([]);
  const [activeChapterId, setActiveChapterId] = useState("");
  const [status, setStatus] = useState(text("loadingLocalProjects"));
  const [notice, setNotice] = useState("");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const hydratedRef = useRef(false);
  const importRef = useRef<HTMLInputElement>(null);
  const { activeProject, linkResource } = useWorkspaceProjects();

  const refreshProjects = useCallback(async () => setProjects(await listStoryProjects()), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await listStoryProjects();
      const lastId = localStorage.getItem(LAST_STORY_KEY);
      const initial = stored.find((entry) => entry.id === lastId) ?? stored[0] ?? createStarterProject();
      if (stored.length === 0) await saveStoryProject(initial);
      if (cancelled) return;
      setProjects(stored.length ? stored : [initial]);
      setProject(initial);
      setActiveChapterId(initial.chapters[0]?.id ?? "");
      localStorage.setItem(LAST_STORY_KEY, initial.id);
      hydratedRef.current = true;
      setStatus(text("autosaveReady"));
    })().catch((error) => {
      console.warn("Story Builder storage is unavailable; continuing in memory", error);
      const initial = createStarterProject();
      if (cancelled) return;
      setProjects([initial]);
      setProject(initial);
      setActiveChapterId(initial.chapters[0]?.id ?? "");
      hydratedRef.current = true;
      setStatus(text("autosaveReady"));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!project || !hydratedRef.current) return;
    setCreativeWorkDirty("story", true);
    const timeout = window.setTimeout(() => {
      const snapshot = { ...project, savedAt: Date.now() };
      void saveStoryProject(snapshot).then(() => {
        setProjects((current) => [snapshot, ...current.filter((entry) => entry.id !== snapshot.id)]);
        localStorage.setItem(LAST_STORY_KEY, snapshot.id);
        setStatus(text("savedLocally"));
        setCreativeWorkDirty("story", false);
      }).catch((error) => {
        console.warn("Story Builder could not persist this change", error);
        setStatus(text("autosaveReady"));
        setCreativeWorkDirty("story", false);
      });
    }, 500);
    setStatus(text("saving"));
    return () => window.clearTimeout(timeout);
  }, [project]);
  useEffect(() => () => setCreativeWorkDirty("story", false), []);
  const workspaceLinked = Boolean(project && activeProject?.storyIds.includes(project.id) && activeProject.activeSurface === "story");
  useEffect(() => {
    if (project && activeProject && !workspaceLinked) linkResource("story", project.id);
  }, [activeProject, linkResource, project, workspaceLinked]);
  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 2_600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const activeChapter = useMemo(
    () => project?.chapters.find((chapter) => chapter.id === activeChapterId) ?? project?.chapters[0],
    [activeChapterId, project],
  );

  const updateProject = (change: (current: StoryProject) => StoryProject) => {
    setProject((current) => current ? change(current) : current);
  };

  const updateActiveChapter = (change: (chapter: NonNullable<typeof activeChapter>) => NonNullable<typeof activeChapter>) => {
    if (!activeChapter) return;
    updateProject((current) => ({
      ...current,
      chapters: current.chapters.map((chapter) => chapter.id === activeChapter.id ? change(chapter) : chapter),
    }));
  };

  const openProject = async (next: StoryProject) => {
    if (project) await saveStoryProject({ ...project, savedAt: Date.now() });
    setProject(next);
    setActiveChapterId(next.chapters[0]?.id ?? "");
    localStorage.setItem(LAST_STORY_KEY, next.id);
  };

  const createNewProject = async () => {
    const next = createStarterProject();
    await saveStoryProject(next);
    await openProject(next);
    await refreshProjects();
  };

  const duplicateProject = async () => {
    if (!project) return;
    const now = Date.now();
    const next = { ...project, id: createStoryProjectId(), name: text("projectCopyName", { name: project.name }), createdAt: now, savedAt: now };
    await saveStoryProject(next);
    await openProject(next);
    await refreshProjects();
  };

  const removeCurrentProject = async () => {
    if (!project) return;
    await deleteStoryProject(project.id);
    const remaining = (await listStoryProjects()).filter((entry) => entry.id !== project.id);
    const next = remaining[0] ?? createStarterProject();
    if (remaining.length === 0) await saveStoryProject(next);
    setProjects(remaining.length ? remaining : [next]);
    setProject(next);
    setActiveChapterId(next.chapters[0]?.id ?? "");
  };

  const addChapter = () => {
    if (!project) return;
    const chapter = createStoryChapter(project.chapters.length);
    updateProject((current) => ({ ...current, chapters: [...current.chapters, chapter] }));
    setActiveChapterId(chapter.id);
  };

  const moveChapter = (direction: -1 | 1) => {
    if (!project || !activeChapter) return;
    const index = project.chapters.findIndex((chapter) => chapter.id === activeChapter.id);
    const target = index + direction;
    if (target < 0 || target >= project.chapters.length) return;
    const chapters = [...project.chapters];
    [chapters[index], chapters[target]] = [chapters[target], chapters[index]];
    updateProject((current) => ({ ...current, chapters }));
  };

  const reorderChapter = (sourceId: string, targetId: string) => {
    if (!project) return;
    const sourceIndex = project.chapters.findIndex((chapter) => chapter.id === sourceId);
    const targetIndex = project.chapters.findIndex((chapter) => chapter.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const chapters = [...project.chapters];
    const [moved] = chapters.splice(sourceIndex, 1);
    chapters.splice(targetIndex, 0, moved);
    updateProject((current) => ({ ...current, chapters }));
  };

  const importArchiveExhibition = () => {
    const workspaceFrames = activeProject?.assets.map((asset): StoryProjectFrame => ({
      id: `workspace-${asset.assetId}`,
      projectId: activeProject.id,
      src: asset.src,
      alt: asset.alt,
    })) ?? [];
    const legacyFrames = readArchiveCollection().map((assetId) => visualAssetById.get(assetId)).filter(Boolean).map((asset): StoryProjectFrame => ({
      id: `asset-${asset!.id}`,
      projectId: asset!.projectIds[0] ?? "visual-archive",
      src: asset!.src,
      alt: asset!.alt,
    }));
    const frames = workspaceFrames.length ? workspaceFrames : legacyFrames;
    if (!frames.length) {
      setNotice(text("archiveEmpty"));
      return;
    }
    const chapterLayouts: StoryLayout[] = ["diptych", "annotation", "constellation", "interlude"];
    const additions = Array.from({ length: Math.ceil(frames.length / 2) }, (_, index) => ({
      ...createStoryChapter((project?.chapters.length ?? 0) + index, frames.slice(index * 2, index * 2 + 2)),
      kicker: `${String((project?.chapters.length ?? 0) + index + 1).padStart(2, "0")} / EXHIBITION`,
      title: `展览线索 ${index + 1}`,
      layout: chapterLayouts[index % chapterLayouts.length],
    }));
    updateProject((current) => ({ ...current, chapters: [...current.chapters, ...additions] }));
    setActiveChapterId(additions[0]!.id);
    setNotice(text("archiveFramesImported", { count: frames.length }));
  };

  const removeChapter = () => {
    if (!project || !activeChapter || project.chapters.length === 1) return;
    const chapters = project.chapters.filter((chapter) => chapter.id !== activeChapter.id);
    updateProject((current) => ({ ...current, chapters }));
    setActiveChapterId(chapters[0].id);
  };

  const addFrame = (frame: StoryProjectFrame) => updateActiveChapter((chapter) => (
    chapter.media.some((entry) => entry.id === frame.id) || chapter.media.length >= 4
      ? chapter
      : { ...chapter, media: [...chapter.media, frame] }
  ));

  const importProject = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = await parseStoryProjectFile(file);
      const now = Date.now();
      const next = { ...parsed, id: createStoryProjectId(), name: `${parsed.name} imported`, createdAt: now, savedAt: now };
      await saveStoryProject(next);
      await openProject(next);
      await refreshProjects();
      setNotice(text("storyProjectImported"));
    } catch {
      setNotice(text("storyImportFailed"));
    }
  };

  if (!project || !activeChapter) return <div className="story-builder-loading">{text("storyLoading")}</div>;

  return (
    <PageTransition className="story-builder-page">
      <header className="story-builder-topbar">
        <PrefetchLink to="/create" title={text("backCreate")}><ArrowLeft size={18} aria-hidden="true" /></PrefetchLink>
        <div><span>NHB / STORY BUILDER 3.0</span><strong data-story-status>{notice || status}</strong></div>
        <div className="story-builder-topbar__actions">
          <button type="button" data-action="new-project" title={text("newProject")} onClick={createNewProject}><FilePlus2 size={18} aria-hidden="true" /></button>
          <button type="button" data-action="duplicate-project" title={text("duplicateProject")} onClick={duplicateProject}><Plus size={18} aria-hidden="true" /></button>
          <button type="button" data-action="import-project" title={text("importStoryProject")} onClick={() => importRef.current?.click()}><Upload size={18} aria-hidden="true" /></button>
          <button type="button" data-action="import-exhibition" title={text("importExhibition")} onClick={importArchiveExhibition}><PanelsTopLeft size={18} aria-hidden="true" /></button>
          <button type="button" data-action="export-project" title={text("exportStoryProject")} onClick={() => downloadBlob(createStoryProjectFile(project), `${project.name.replace(/\s+/g, "-").toLowerCase()}.nhb-story`)}><Download size={18} aria-hidden="true" /></button>
          <input ref={importRef} type="file" accept=".nhb-story,application/json" hidden onChange={(event) => void importProject(event.target.files?.[0])} />
        </div>
      </header>

      <aside className="story-builder-projects" aria-label={text("storyProjects")}>
        <header><span>{text("storyProjects")} / {projects.length}</span><button type="button" onClick={createNewProject} title={text("newProject")}><Plus size={16} aria-hidden="true" /></button></header>
        <div>{projects.map((entry) => <button type="button" key={entry.id} onClick={() => void openProject(entry)} className={entry.id === project.id ? "is-active" : ""}><strong>{entry.name}</strong><small>{entry.chapters.length} chapters</small></button>)}</div>
        <button type="button" className="story-builder-delete-project" onClick={() => void removeCurrentProject()}><Trash2 size={15} aria-hidden="true" />{text("deleteProject")}</button>
      </aside>

      <section className="story-builder-workspace">
        <div className="story-builder-canvas">
          <StoryTimeline chapters={project.chapters} activeChapterId={activeChapter.id} onSelect={setActiveChapterId} onReorder={reorderChapter} onAdd={addChapter} />
          <div className="story-builder-device-switch" role="group" aria-label={text("previewSize")}>
            <button type="button" data-preview-device="desktop" className={previewDevice === "desktop" ? "is-active" : undefined} aria-pressed={previewDevice === "desktop"} onClick={() => setPreviewDevice("desktop")}><Monitor size={15} aria-hidden="true" />{text("desktop")}</button>
            <button type="button" data-preview-device="mobile" className={previewDevice === "mobile" ? "is-active" : undefined} aria-pressed={previewDevice === "mobile"} onClick={() => setPreviewDevice("mobile")}><Smartphone size={15} aria-hidden="true" />{text("mobile")}</button>
          </div>
          <StoryBuilderPreview project={project} activeChapterId={activeChapter.id} onSelectChapter={setActiveChapterId} device={previewDevice} />
        </div>
        <aside className="story-builder-controls">
          <section>
            <span className="platform-index">01 / STORY</span>
            <label>{text("projectName")}<input data-story-field="project-name" value={project.name} onChange={(event) => updateProject((current) => ({ ...current, name: event.target.value }))} /></label>
            <label>{text("title")}<input value={project.title} onChange={(event) => updateProject((current) => ({ ...current, title: event.target.value }))} /></label>
            <label>{text("subtitle")}<textarea rows={2} value={project.subtitle} onChange={(event) => updateProject((current) => ({ ...current, subtitle: event.target.value }))} /></label>
            <label>{text("accent")}<input type="color" value={project.accent} onChange={(event) => updateProject((current) => ({ ...current, accent: event.target.value }))} /></label>
          </section>

          <section>
            <header><span className="platform-index">02 / {text("chapters")}</span><button type="button" data-action="add-chapter" onClick={addChapter}><Plus size={15} aria-hidden="true" />{text("add")}</button></header>
            <div className="story-builder-chapter-tabs">{project.chapters.map((chapter, index) => <button type="button" key={chapter.id} onClick={() => setActiveChapterId(chapter.id)} className={chapter.id === activeChapter.id ? "is-active" : ""}>{String(index + 1).padStart(2, "0")}</button>)}</div>
            <div className="story-builder-order-actions">
              <button type="button" title={text("moveChapterUp")} onClick={() => moveChapter(-1)}><ArrowUp size={16} aria-hidden="true" /></button>
              <button type="button" title={text("moveChapterDown")} onClick={() => moveChapter(1)}><ArrowDown size={16} aria-hidden="true" /></button>
              <button type="button" title={text("removeChapter")} disabled={project.chapters.length === 1} onClick={removeChapter}><Trash2 size={16} aria-hidden="true" /></button>
            </div>
            <label>{text("kicker")}<input value={activeChapter.kicker} onChange={(event) => updateActiveChapter((chapter) => ({ ...chapter, kicker: event.target.value }))} /></label>
            <label>{text("heading")}<input value={activeChapter.title} onChange={(event) => updateActiveChapter((chapter) => ({ ...chapter, title: event.target.value }))} /></label>
            <label>{text("body")}<textarea rows={4} value={activeChapter.body} onChange={(event) => updateActiveChapter((chapter) => ({ ...chapter, body: event.target.value }))} /></label>
            <div className="story-builder-layouts" role="group" aria-label={text("chapterLayout")}>{layouts.map((layout) => <button type="button" key={layout.id} data-story-layout={layout.id} className={activeChapter.layout === layout.id ? "is-active" : ""} onClick={() => updateActiveChapter((chapter) => ({ ...chapter, layout: layout.id }))}><LayoutTemplate size={14} aria-hidden="true" />{text(layout.label)}</button>)}</div>
            <SceneDirectorControls value={activeChapter.scene} onChange={(scene) => updateActiveChapter((chapter) => ({ ...chapter, scene }))} />
          </section>

          <section>
            <span className="platform-index">03 / SELECTED FRAMES</span>
            <div className="story-builder-selected">{activeChapter.media.map((frame) => <div key={frame.id}><ImageWithFallback src={frame.src} alt="" title={frame.alt} sizes="90px" /><button type="button" title={text("removeFrame")} onClick={() => updateActiveChapter((chapter) => ({ ...chapter, media: chapter.media.filter((entry) => entry.id !== frame.id) }))}><X size={13} aria-hidden="true" /></button></div>)}</div>
          </section>

          <section className="story-builder-archive">
            <span className="platform-index">04 / ARCHIVE FRAMES</span>
            <div>{archiveFrames.map((frame) => <button type="button" key={frame.id} title={text("addFrame", { title: frame.alt })} onClick={() => addFrame(frame)} disabled={activeChapter.media.some((entry) => entry.id === frame.id)}><ImageWithFallback src={frame.src} alt="" title={frame.alt} sizes="110px" /><ImagePlus size={15} aria-hidden="true" /></button>)}</div>
          </section>
        </aside>
      </section>

      <footer className="story-builder-footer"><span><Save size={15} aria-hidden="true" />{text("projectsStayLocal")}</span><PrefetchLink to="/stories">{text("viewPublishedStories")} <ArrowRight size={16} aria-hidden="true" /></PrefetchLink></footer>
    </PageTransition>
  );
}
