import "../../styles/studio-v2.css";
import "../../styles/studio-v4.css";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Camera,
  Copy,
  Download,
  FileDown,
  FileImage,
  FolderOpen,
  History,
  ImagePlus,
  Layers3,
  Plus,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CompositionCanvas } from "../CompositionCanvas";
import { useCompositionHistory, type CompositionEditableState } from "../../hooks/useCompositionHistory";
import {
  COMPOSITION_AUTOSAVE_ID,
  createCompositionProjectFile,
  createCompositionProjectId,
  createCompositionSnapshot,
  createCompositionVersion,
  deleteCompositionProject,
  getCompositionProject,
  listCompositionProjects,
  listCompositionVersions,
  parseCompositionProjectFile,
  saveCompositionProject,
  type CompositionProjectSnapshot,
  type CompositionVersionSnapshot,
} from "../../lib/composition-project-store";
import type { CompositionMode } from "../../lib/composition-layout";
import { safeLocalStorage } from "../../lib/browser-storage";
import { DEFAULT_COMPOSITION_TRANSFORM, type CompositionImage, type CompositionTextAlign } from "../../types/composition";
import { track } from "../../utils/track";
import { exportStudioCanvas } from "../../lib/studio-export";
import { StudioRecipeRail, type CompositionRecipe } from "../../features/studio/StudioRecipeRail";
import { StudioStorageStatus } from "../../features/studio/StudioStorageStatus";
import { StudioArtboardControls } from "../../features/studio/StudioArtboardControls";
import { StudioFrameControls } from "../../features/studio/StudioFrameControls";
import { StudioWorkspaceBridge } from "../../features/studio/StudioWorkspaceBridge";
import { setCreativeWorkDirty } from "../../lib/creative-work-state";
import { useWorkspaceProjects } from "../../hooks/useWorkspaceProjects";
export const compositionSampleImages: CompositionImage[] = [
  { id: "sample-garden", src: "/images/optical-archive/conservatory-after-rain-v1.webp", name: "Morning conservatory" },
  { id: "sample-prism", src: "/images/optical-archive/glass-fern-caustics-v1.webp", name: "Tactile optics" },
  { id: "sample-paper", src: "/images/optical-archive/paper-water-lab-v1.webp", name: "Paper water lab" },
  { id: "sample-darkroom", src: "/images/optical-archive/print-room-morning-v2.webp", name: "Print room" },
  { id: "sample-rain", src: "/images/optical-archive/rain-observation-room-v1.webp", name: "Weather room" },
];

const modes: CompositionMode[] = ["filmstrip", "contact-sheet", "postcard", "moodboard"];
const paperColors = ["#fffaf0", "#f4e3b6", "#dfe7d8", "#e6b6a8", "#5b2438"];
const LAST_PROJECT_KEY = "nhb-last-composition-project";
type ProjectSummary = Pick<CompositionProjectSnapshot, "id" | "name" | "mode" | "savedAt"> & { imageCount: number };
type ExportFormat = "png" | "webp" | "jpeg" | "avif";

function createInitialState(): CompositionEditableState {
  return {
    projectName: "Optical Garden Study",
    mode: "filmstrip",
    images: compositionSampleImages,
    title: "NHB / OPTICAL GARDEN",
    caption: "RAIN / GLASS / QUIET LIGHT",
    paperColor: paperColors[0],
    textAlign: "left",
    titleScale: 1,
    artboardPreset: "auto",
    selectedImageId: compositionSampleImages[0].id,
  };
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CompositionStudio({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const [projectId, setProjectId] = useState(COMPOSITION_AUTOSAVE_ID);
  const [createdAt, setCreatedAt] = useState(Date.now);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [versions, setVersions] = useState<CompositionVersionSnapshot[]>([]);
  const [rendered, setRendered] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"loading" | "saving" | "saved" | "error">("loading");
  const [error, setError] = useState("");
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [exportBackend, setExportBackend] = useState<"worker" | "main-thread" | null>(null);
  const { state, update, replace, undo, redo, canUndo, canRedo } = useCompositionHistory(createInitialState());
  const { activeProject, linkResource } = useWorkspaceProjects();
  const inkColor = state.paperColor === "#5b2438" ? "#fffaf0" : "#203128";
  const selectedImage = state.images.find((image) => image.id === state.selectedImageId) ?? null;
  const revokeObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, []);

  const refreshProjects = useCallback(async () => {
    const stored = await listCompositionProjects();
    setProjects(stored.map((project) => ({
      id: project.id,
      name: project.name,
      mode: project.mode,
      savedAt: project.savedAt,
      imageCount: project.images.length,
    })));
  }, []);

  const refreshVersions = useCallback(async (id: string) => {
    setVersions(await listCompositionVersions(id));
  }, []);

  const applySnapshot = useCallback((snapshot: CompositionProjectSnapshot) => {
    revokeObjectUrls();
    const restoredImages = snapshot.images.map((image) => {
      if (!image.blob) return image;
      const src = URL.createObjectURL(image.blob);
      objectUrlsRef.current.push(src);
      return { ...image, src };
    });
    setProjectId(snapshot.id);
    setCreatedAt(snapshot.createdAt);
    safeLocalStorage.setItem(LAST_PROJECT_KEY, snapshot.id);
    replace({
      projectName: snapshot.name,
      mode: snapshot.mode,
      title: snapshot.title,
      caption: snapshot.caption,
      paperColor: snapshot.paperColor,
      textAlign: snapshot.textAlign,
      titleScale: snapshot.titleScale,
      artboardPreset: snapshot.artboardPreset,
      images: restoredImages,
      selectedImageId: restoredImages[0]?.id ?? null,
    });
    setRendered(false);
  }, [replace, revokeObjectUrls]);

  const buildSnapshot = useCallback(() => createCompositionSnapshot({
    id: projectId,
    createdAt,
    name: state.projectName,
    mode: state.mode,
    title: state.title,
    caption: state.caption,
    paperColor: state.paperColor,
    textAlign: state.textAlign,
    titleScale: state.titleScale,
    artboardPreset: state.artboardPreset,
    images: state.images,
  }), [createdAt, projectId, state]);

  useEffect(() => {
    let cancelled = false;
    const lastId = safeLocalStorage.getItem(LAST_PROJECT_KEY) || COMPOSITION_AUTOSAVE_ID;
    void getCompositionProject(lastId)
      .then(async (snapshot) => {
        const fallback = snapshot ?? (lastId === COMPOSITION_AUTOSAVE_ID ? null : await getCompositionProject());
        if (!cancelled && fallback) applySnapshot(fallback);
        if (!cancelled) setSaveStatus(fallback ? "saved" : "saving");
        if (!cancelled) await Promise.all([refreshProjects(), refreshVersions(fallback?.id ?? COMPOSITION_AUTOSAVE_ID)]);
      })
      .catch(() => { if (!cancelled) setSaveStatus("error"); })
      .finally(() => { if (!cancelled) setHydrated(true); });
    return () => { cancelled = true; };
  }, [applySnapshot, refreshProjects, refreshVersions]);

  useEffect(() => () => revokeObjectUrls(), [revokeObjectUrls]);
  useEffect(() => setRendered(false), [state]);

  useEffect(() => {
    if (!hydrated) return;
    setCreativeWorkDirty("composition", true);
    setSaveStatus("saving");
    const timeout = window.setTimeout(() => {
      const snapshot = buildSnapshot();
      void saveCompositionProject(snapshot)
        .then(() => {
          setSaveStatus("saved");
          setCreativeWorkDirty("composition", false);
          safeLocalStorage.setItem(LAST_PROJECT_KEY, snapshot.id);
          setProjects((current) => [{
            id: snapshot.id,
            name: snapshot.name,
            mode: snapshot.mode,
            savedAt: snapshot.savedAt,
            imageCount: snapshot.images.length,
          }, ...current.filter((project) => project.id !== snapshot.id)]);
        })
        .catch(() => setSaveStatus("error"));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [buildSnapshot, hydrated]);
  useEffect(() => () => setCreativeWorkDirty("composition", false), []);

  const workspaceLinked = Boolean(activeProject?.compositionIds.includes(projectId) && activeProject.activeSurface === "studio");
  useEffect(() => {
    if (hydrated && activeProject && !workspaceLinked) linkResource("studio", projectId);
  }, [activeProject, hydrated, linkResource, projectId, workspaceLinked]);

  const imageCountLabel = useMemo(() => t("platform.studio.imageCount", { count: state.images.length }), [state.images.length, t]);
  const markRendered = useCallback(() => setRendered(true), []);

  const addFiles = (files: FileList | File[]) => {
    const accepted = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, 12 - state.images.length);
    if (!accepted.length) {
      setError(t("platform.studio.invalidFiles"));
      return;
    }
    const additions = accepted.map((file) => {
      const src = URL.createObjectURL(file);
      objectUrlsRef.current.push(src);
      return { id: `${file.name}-${file.lastModified}-${file.size}`, src, name: file.name, blob: file, transform: { ...DEFAULT_COMPOSITION_TRANSFORM } };
    });
    update((current) => ({ ...current, images: [...current.images, ...additions].slice(0, 12), selectedImageId: additions[0]?.id ?? current.selectedImageId }));
    setError("");
    track("studio_images_added", { count: additions.length });
  };

  const updateSelectedTransform = (patch: Partial<typeof DEFAULT_COMPOSITION_TRANSFORM>) => {
    if (!selectedImage || selectedImage.locked) return;
    update((current) => ({
      ...current,
      images: current.images.map((image) => (image.id === selectedImage.id || (selectedImage.groupId && image.groupId === selectedImage.groupId)) && !image.locked
        ? { ...image, transform: { ...DEFAULT_COMPOSITION_TRANSFORM, ...image.transform, ...patch } }
        : image),
    }));
  };

  const moveImage = (id: string, direction: -1 | 1) => {
    update((current) => {
      const index = current.images.findIndex((image) => image.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.images.length) return current;
      const images = [...current.images];
      [images[index], images[target]] = [images[target], images[index]];
      return { ...current, images };
    });
  };

  const exportComposition = async (format: ExportFormat) => {
    const canvas = canvasRef.current;
    if (!canvas || !rendered) return;
    const mime = format === "jpeg" ? "image/jpeg" : `image/${format}`;
    try {
      const { blob, backend } = await exportStudioCanvas(canvas, mime, format === "png" ? undefined : 0.92);
      if (format === "avif" && blob.type !== "image/avif") {
        setError(t("platform.studio.unsupportedExport", "This browser cannot export AVIF from canvas."));
        return;
      }
      setExportBackend(backend);
      downloadBlob(blob, `nhb-${state.mode}-${Date.now()}.${format === "jpeg" ? "jpg" : format}`);
      track("studio_export", { mode: state.mode, format, imageCount: state.images.length });
    } catch {
      setError(t("platform.studio.unsupportedExport", "This browser cannot export the selected format."));
    }
  };

  const exportProject = async () => {
    downloadBlob(await createCompositionProjectFile(buildSnapshot()), `${state.projectName.trim().replace(/\s+/g, "-").toLowerCase() || "nhb-project"}.nhb`);
    track("studio_project_export", { imageCount: state.images.length });
  };

  const importProject = async (file: File) => {
    try {
      const snapshot = await parseCompositionProjectFile(file);
      applySnapshot(snapshot);
      await saveCompositionProject(snapshot);
      await Promise.all([refreshProjects(), refreshVersions(snapshot.id)]);
      setSaveStatus("saved");
      setError("");
    } catch {
      setError(t("platform.studio.invalidProject", "This NHB project could not be opened."));
    }
  };

  const startFreshProject = (duplicate = false) => {
    const now = Date.now();
    const next = duplicate ? { ...state, projectName: `${state.projectName} Copy` } : createInitialState();
    setProjectId(createCompositionProjectId());
    setCreatedAt(now);
    replace(next);
    setVersions([]);
    setActiveVersionId(null);
    setSaveStatus("saving");
  };

  const createNewProject = async (duplicate = false) => {
    if (hydrated) {
      const current = buildSnapshot();
      await saveCompositionProject(current);
      setProjects((projects) => [{
        id: current.id,
        name: current.name,
        mode: current.mode,
        savedAt: current.savedAt,
        imageCount: current.images.length,
      }, ...projects.filter((project) => project.id !== current.id)]);
    }
    startFreshProject(duplicate);
  };

  const openProject = async (id: string) => {
    const snapshot = await getCompositionProject(id);
    if (!snapshot) return;
    applySnapshot(snapshot);
    setActiveVersionId(null);
    await refreshVersions(snapshot.id);
  };

  const removeCurrentProject = async () => {
    await deleteCompositionProject(projectId);
    startFreshProject(false);
    await refreshProjects();
  };

  const saveVersion = async () => {
    const branch = activeVersionId ? `branch-${versions.filter((version) => version.parentVersionId === activeVersionId).length + 1}` : "main";
    const version = await createCompositionVersion(buildSnapshot(), `${state.projectName} / ${versions.length + 1}`, activeVersionId ?? undefined, branch);
    setActiveVersionId(version?.id ?? null);
    await refreshVersions(projectId);
  };

  const updateSelectedLayer = (patch: Partial<Pick<CompositionImage, "visible" | "opacity" | "blendMode" | "locked" | "groupId">>) => {
    if (!selectedImage) return;
    update((current) => ({
      ...current,
      images: current.images.map((image) => image.id === selectedImage.id ? { ...image, ...patch } : image),
    }));
  };

  const updateSelectedLook = (patch: Partial<Pick<CompositionImage, "adjustments" | "crop" | "mask">>) => {
    if (!selectedImage || selectedImage.locked) return;
    update((current) => ({
      ...current,
      images: current.images.map((image) => image.id === selectedImage.id ? { ...image, ...patch } : image),
    }));
  };

  const importWorkspaceAssets = () => {
    if (!activeProject) return;
    const knownSources = new Set(state.images.map((image) => image.src));
    const additions = activeProject.assets
      .filter((asset) => !knownSources.has(asset.src))
      .slice(0, Math.max(0, 12 - state.images.length))
      .map((asset) => ({ id: `workspace-${asset.assetId}`, src: asset.src, name: asset.title, transform: { ...DEFAULT_COMPOSITION_TRANSFORM } }));
    if (!additions.length) return;
    update((current) => ({ ...current, images: [...current.images, ...additions], selectedImageId: additions[0]?.id ?? current.selectedImageId }));
    linkResource("studio", projectId);
    track("studio_workspace_assets_imported", { count: additions.length });
  };

  const applyRecipe = (recipe: CompositionRecipe) => {
    update((current) => ({
      ...current,
      mode: recipe.mode,
      paperColor: recipe.paperColor,
      title: recipe.title,
      caption: recipe.caption,
      titleScale: recipe.titleScale,
      images: current.images.map((image) => ({ ...image, visible: true, opacity: recipe.opacity, blendMode: recipe.blendMode })),
    }));
    track("studio_recipe_applied", { recipe: recipe.id });
  };

  return (
    <div className={`studio-workspace${embedded ? " studio-workspace--embedded" : ""}`} data-create-workspace="composition">
      <section className="studio-project-shelf" aria-labelledby="studio-project-shelf-title">
        <header>
          <span><History size={18} aria-hidden="true" /><strong id="studio-project-shelf-title">PROJECT SHELF</strong><small>{projects.length} LOCAL</small></span>
          <div>
            <button type="button" onClick={undo} disabled={!canUndo} aria-label={t("editor.undo")} title={t("editor.undo")}><Undo2 size={16} aria-hidden="true" /></button>
            <button type="button" onClick={redo} disabled={!canRedo} aria-label={t("editor.redo")} title={t("editor.redo")}><Redo2 size={16} aria-hidden="true" /></button>
            <button type="button" onClick={() => void createNewProject(false)}><Plus size={16} aria-hidden="true" />NEW</button>
            <button type="button" onClick={() => void createNewProject(true)}><Copy size={16} aria-hidden="true" />DUPLICATE</button>
            <button type="button" onClick={() => void saveVersion()}><Camera size={16} aria-hidden="true" />SNAPSHOT</button>
          </div>
        </header>
        <div className="studio-project-shelf__list">
          {projects.map((project) => (
            <button key={project.id} type="button" className={project.id === projectId ? "is-active" : ""} onClick={() => void openProject(project.id)}>
              <span>{project.mode.toUpperCase()}</span><strong>{project.name}</strong><small>{project.imageCount} FRAMES / {new Date(project.savedAt).toLocaleDateString()}</small>
            </button>
          ))}
        </div>
        {versions.length ? (
          <div className="studio-project-shelf__versions" aria-label="Project versions">
            <span>VERSIONS</span>
            {versions.map((version) => <button type="button" className={activeVersionId === version.id ? "is-active" : undefined} key={version.id} onClick={() => { setActiveVersionId(version.id); applySnapshot(version.snapshot); }}>{version.label}<small>{version.branch.toUpperCase()} · {new Date(version.createdAt).toLocaleTimeString()}</small></button>)}
          </div>
        ) : null}
        <StudioStorageStatus />
        {activeProject ? <StudioWorkspaceBridge name={activeProject.name} assetCount={activeProject.assets.length} disabled={!activeProject.assets.length || state.images.length >= 12} onLoad={importWorkspaceAssets} /> : null}
      </section>

      <StudioRecipeRail onApply={applyRecipe} />

      <aside className="studio-controls" aria-label={t("platform.studio.controls")}>
        <section className="studio-project-control">
          <span className="studio-control-index">00 / PROJECT</span>
          <label><span>{t("platform.studio.projectName", "Project name")}</span><input value={state.projectName} maxLength={48} onChange={(event) => update({ projectName: event.target.value })} /></label>
          <div className="studio-project-actions">
            <input ref={projectInputRef} type="file" accept=".nhb,application/x-nhb-project+json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importProject(file); event.currentTarget.value = ""; }} />
            <button type="button" onClick={() => projectInputRef.current?.click()}><FolderOpen size={16} aria-hidden="true" />{t("platform.studio.importProject", "Open")}</button>
            <button type="button" onClick={() => void exportProject()}><FileDown size={16} aria-hidden="true" />{t("platform.studio.exportProject", "Save .nhb")}</button>
            <button type="button" onClick={() => void removeCurrentProject()} aria-label="Delete current project"><Trash2 size={16} aria-hidden="true" /></button>
          </div>
          <p className={`studio-save-status is-${saveStatus}`} role="status">{t(`platform.studio.saveStatus.${saveStatus}` as never, saveStatus)}</p>
        </section>

        <section>
          <span className="studio-control-index">01 / FORMAT</span>
          <div className="studio-mode-control" role="group" aria-label={t("platform.studio.modeLabel")}>
            {modes.map((item) => <button type="button" key={item} className={state.mode === item ? "is-active" : ""} onClick={() => update({ mode: item })}>{t(`platform.studio.modes.${item}` as never)}</button>)}
          </div>
          <StudioArtboardControls value={state.artboardPreset} onChange={(artboardPreset) => update({ artboardPreset })} />
        </section>

        <section>
          <span className="studio-control-index">02 / IMAGES</span>
          <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={(event) => event.target.files && addFiles(event.target.files)} />
          <button type="button" className="studio-upload" onClick={() => imageInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}>
            <ImagePlus size={22} aria-hidden="true" /><span><strong>{t("platform.studio.addImages")}</strong><small>{imageCountLabel}</small></span>
          </button>
          <div className="studio-image-strip">
            {state.images.map((image, index) => (
              <div key={image.id} title={image.name} className={image.id === state.selectedImageId ? "is-selected" : ""}>
                <button type="button" className="studio-image-select" onClick={() => update({ selectedImageId: image.id })} aria-label={`Select ${image.name}`}><img src={image.src} alt="" /></button>
                <span>
                  <button type="button" onClick={() => moveImage(image.id, -1)} disabled={index === 0 || image.locked} aria-label={`Move ${image.name} left`}><ArrowUp size={12} aria-hidden="true" /></button>
                  <button type="button" onClick={() => moveImage(image.id, 1)} disabled={index === state.images.length - 1 || image.locked} aria-label={`Move ${image.name} right`}><ArrowDown size={12} aria-hidden="true" /></button>
                  <button type="button" disabled={image.locked} onClick={() => update((current) => ({ ...current, images: current.images.filter((entry) => entry.id !== image.id), selectedImageId: current.selectedImageId === image.id ? current.images.find((entry) => entry.id !== image.id)?.id ?? null : current.selectedImageId }))} aria-label={`${t("common.remove", "Remove")} ${image.name}`}><Trash2 size={12} aria-hidden="true" /></button>
                </span>
              </div>
            ))}
          </div>
          <button type="button" className="studio-reset" onClick={() => replace({ ...createInitialState(), projectName: state.projectName })}>{t("platform.studio.restoreSamples")}</button>
          {error ? <p className="studio-error" role="alert">{error}</p> : null}
        </section>

        {selectedImage ? <StudioFrameControls image={selectedImage} onTransform={updateSelectedTransform} onLayerChange={updateSelectedLayer} onLookChange={updateSelectedLook} /> : null}

        <section>
          <span className="studio-control-index">04 / TYPE</span>
          <label><span>{t("platform.studio.titleLabel")}</span><input value={state.title} maxLength={44} onChange={(event) => update({ title: event.target.value })} /></label>
          <label><span>{t("platform.studio.captionLabel")}</span><input value={state.caption} maxLength={64} onChange={(event) => update({ caption: event.target.value })} /></label>
          <div className="studio-type-controls">
            {(["left", "center", "right"] as CompositionTextAlign[]).map((alignment) => {
              const Icon = alignment === "left" ? AlignLeft : alignment === "center" ? AlignCenter : AlignRight;
              return <button type="button" key={alignment} className={state.textAlign === alignment ? "is-active" : ""} onClick={() => update({ textAlign: alignment })} aria-label={`${alignment} align`} title={`${alignment} align`}><Icon size={16} aria-hidden="true" /></button>;
            })}
            <label><span>TYPE SCALE</span><input type="range" min="0.7" max="1.35" step="0.05" value={state.titleScale} onChange={(event) => update({ titleScale: Number(event.target.value) })} /></label>
          </div>
        </section>

        <section>
          <span className="studio-control-index">05 / PAPER</span>
          <div className="studio-swatches" role="group" aria-label={t("platform.studio.paperLabel")}>
            {paperColors.map((color) => <button type="button" key={color} className={state.paperColor === color ? "is-active" : ""} style={{ backgroundColor: color }} onClick={() => update({ paperColor: color })} aria-label={color} aria-pressed={state.paperColor === color} />)}
          </div>
        </section>
      </aside>

      <main className="studio-preview">
        <div className="studio-preview__bar"><span><Layers3 size={16} aria-hidden="true" /> {t(`platform.studio.modes.${state.mode}` as never)}</span><small>{imageCountLabel}{exportBackend ? ` / EXPORT ${exportBackend === "worker" ? "WORKER" : "MAIN"}` : ""}</small></div>
        <div className={`studio-canvas-frame studio-canvas-frame--${state.mode}`}>
          <CompositionCanvas ref={canvasRef} mode={state.mode} images={state.images} title={state.title} caption={state.caption} paperColor={state.paperColor} inkColor={inkColor} textAlign={state.textAlign} titleScale={state.titleScale} artboardPreset={state.artboardPreset} onRendered={markRendered} />
        </div>
        <div className="studio-export-actions">
          <button type="button" onClick={() => void exportComposition("png")} disabled={!rendered}><Download size={18} aria-hidden="true" /> PNG</button>
          <button type="button" onClick={() => void exportComposition("webp")} disabled={!rendered}><FileImage size={18} aria-hidden="true" /> WebP</button>
          <button type="button" onClick={() => void exportComposition("jpeg")} disabled={!rendered}><FileImage size={18} aria-hidden="true" /> JPEG</button>
          <button type="button" onClick={() => void exportComposition("avif")} disabled={!rendered}><FileImage size={18} aria-hidden="true" /> AVIF</button>
          <span>{t("platform.studio.localOnly")}</span>
        </div>
      </main>
    </div>
  );
}
