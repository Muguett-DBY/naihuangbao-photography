import "../styles/published-project-v7.css";
import "../styles/workspace-v7.css";
import "../styles/workspace-v8.css";
import { CloudUpload, Copy, Download, ExternalLink, FileUp, FolderOpen, Images, Layers3, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useWorkspaceProjects } from "../hooks/useWorkspaceProjects";
import { createWorkspaceProjectPackage, parseWorkspaceProjectPackage } from "../lib/workspace-project-package";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { ProjectCommandCenter } from "../components/projects/ProjectCommandCenter";
import { ProjectSyncPanel } from "../components/projects/ProjectSyncPanel";
import { ExhibitionControls } from "../components/projects/ExhibitionControls";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import {
  fetchPublishedProject,
  getLocalPublication,
  listPublishedProjectVersions,
  publishWorkspaceProject,
} from "../lib/project-publish";
import type { PublishedProjectReceipt, PublishedProjectVersion } from "../types/published-project";
import { useWorkspaceCopy } from "../i18n/workspace-copy";

function downloadPackage(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function ProjectsPage() {
  const { text, locale } = useWorkspaceCopy();
  const workspace = useWorkspaceProjects();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publication, setPublication] = useState<PublishedProjectReceipt | null>(null);
  const [versions, setVersions] = useState<PublishedProjectVersion[]>([]);
  const project = workspace.activeProject;

  useEffect(() => {
    let cancelled = false;
    const current = project ? getLocalPublication(project.id) : null;
    setPublication(current);
    setVersions([]);
    if (current) void listPublishedProjectVersions(current.slug).then((items) => {
      if (!cancelled) setVersions(items);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [project?.id]);

  const importPackage = async (file: File | undefined) => {
    if (!file) return;
    try {
      workspace.importProject(await parseWorkspaceProjectPackage(file));
      setNotice(text("workspaceImported"));
    } catch {
      setNotice(text("invalidWorkspace"));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const publishProject = async () => {
    if (!project || !project.assets.length) return;
    setPublishing(true);
    setNotice(text("publishingSnapshot"));
    try {
      const receipt = await publishWorkspaceProject(project);
      setPublication(receipt);
      setVersions(await listPublishedProjectVersions(receipt.slug));
      setNotice(text("publishedVersion", { version: receipt.version }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : text("publishFailed"));
    } finally {
      setPublishing(false);
    }
  };

  const copyPublicationLink = async () => {
    if (!publication) return;
    await navigator.clipboard.writeText(new URL(publication.url, window.location.origin).toString());
    setNotice(text("shareCopied"));
  };

  const restoreVersion = async (version: number) => {
    if (!publication) return;
    try {
      const snapshot = await fetchPublishedProject(publication.slug, version);
      workspace.importProject({ ...snapshot.project, activeSurface: "publish", updatedAt: Date.now() });
      setNotice(text("versionRestored", { version }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : text("restoreFailed"));
    }
  };

  const exportPackage = async () => {
    if (!project) return;
    downloadPackage(await createWorkspaceProjectPackage(project), `${project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "nhb-project"}.nhbpack`);
    setNotice(text("packageExported"));
  };

  return (
    <div className="workspace-page">
      <header className="workspace-page__hero">
        <div>
          <span>NHB / PROJECT OPERATING SYSTEM / V8</span>
          <h1>{text("projectsTitle")}</h1>
        </div>
        <div className="workspace-page__hero-copy">
          <p>{text("projectsIntro")}</p>
          <div>
            <button type="button" onClick={() => workspace.createProject(text("newProjectName", { count: workspace.projects.length + 1 }))}><Plus size={17} aria-hidden="true" />{text("newProject")}</button>
            <button type="button" onClick={() => fileInputRef.current?.click()}><FileUp size={17} aria-hidden="true" />{text("importProject")}</button>
            <input ref={fileInputRef} type="file" accept=".nhbpack,application/json,application/x-nhb-workspace+json" hidden onChange={(event) => void importPackage(event.target.files?.[0])} />
          </div>
          {notice ? <p className="workspace-page__notice" role="status">{notice}</p> : null}
        </div>
      </header>

      <nav className="workspace-project-list" aria-label={text("projectList")}>
        {workspace.projects.map((entry, index) => (
          <button type="button" key={entry.id} className={entry.id === project?.id ? "is-active" : undefined} onClick={() => workspace.setActiveProjectId(entry.id)}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{entry.name}</strong>
            <small>{text("framesAndOutputs", { frames: entry.assets.length, outputs: entry.creativeDocumentIds.length + entry.compositionIds.length + entry.storyIds.length })}</small>
          </button>
        ))}
      </nav>

      {project ? <ProjectCommandCenter project={project} events={workspace.events} /> : null}

      {project ? (
        <section className="workspace-project" style={{ "--workspace-accent": project.accent } as CSSProperties}>
          <header className="workspace-project__head">
            <div>
              <span>{text("activeSurface", { surface: project.activeSurface.toUpperCase() })}</span>
              <input aria-label={text("projectName")} value={project.name} onChange={(event) => workspace.updateActiveProject({ name: event.target.value })} />
              <textarea aria-label={text("projectDescription")} value={project.description} onChange={(event) => workspace.updateActiveProject({ description: event.target.value })} />
            </div>
            <div className="workspace-project__stats">
              <span><Images size={18} aria-hidden="true" /><strong>{project.assets.length}</strong><small>{text("frames")}</small></span>
              <span><Layers3 size={18} aria-hidden="true" /><strong>{project.compositionIds.length}</strong><small>{text("compositions")}</small></span>
              <span><FolderOpen size={18} aria-hidden="true" /><strong>{project.storyIds.length}</strong><small>{text("stories")}</small></span>
            </div>
          </header>

          <section className="workspace-project__frames" aria-labelledby="workspace-frames-title">
            <header><div><span>01 / {text("projectLightTable")}</span><h2 id="workspace-frames-title">{text("collectedFrames")}</h2></div><p>{text("framesLocal")}</p></header>
            {project.assets.length ? (
              <div className="workspace-project__grid">
                {project.assets.map((asset, index) => (
                  <figure key={asset.assetId}>
                    <ImageWithFallback src={asset.src} alt={asset.alt} title={asset.title} sizes="(max-width: 720px) 48vw, 22vw" tone={index % 3 === 0 ? "sage" : "cream"} />
                    <figcaption><span>{String(index + 1).padStart(2, "0")}</span><strong>{asset.title}</strong><button type="button" onClick={() => workspace.removeAsset(asset.assetId)} aria-label={text("removeAsset", { title: asset.title })}><Trash2 size={14} aria-hidden="true" /></button></figcaption>
                  </figure>
                ))}
              </div>
            ) : <div className="workspace-project__empty"><p>{text("emptyProject")}</p><PrefetchLink to="/archive">{text("exploreArchive")}</PrefetchLink></div>}
          </section>

          <section className="workspace-project__publish" aria-labelledby="workspace-publish-title">
            <header>
              <div><span>02 / {text("publishLabel")}</span><h2 id="workspace-publish-title">{text("publishEditions")}</h2></div>
              <p>{text("publishDisclosure")}</p>
            </header>
            <ExhibitionControls value={project.exhibition} onChange={(exhibition) => workspace.updateActiveProject({ exhibition })} />
            <div className="workspace-project__publish-actions">
              <button type="button" data-action="publish-project" onClick={() => void publishProject()} disabled={publishing || !project.assets.length}><CloudUpload size={17} aria-hidden="true" />{publishing ? text("publishing") : publication ? text("publishVersion") : text("publishProject")}</button>
              {publication ? <button type="button" onClick={() => void copyPublicationLink()}><Copy size={17} aria-hidden="true" />{text("copyLink")}</button> : null}
              {publication ? <a data-action="open-publication" href={publication.url} target="_blank" rel="noreferrer"><ExternalLink size={17} aria-hidden="true" />{text("openLive")}</a> : null}
            </div>
            {versions.length ? (
              <div className="workspace-project__versions" aria-label={text("publishedVersions")}>
                {versions.map((version) => (
                  <article key={version.version}>
                    <span>V{String(version.version).padStart(2, "0")}</span>
                    <strong>{new Date(version.publishedAt).toLocaleString(locale)}</strong>
                    <small>{version.contentHash.slice(0, 12)}</small>
                    <button type="button" data-action="restore-version" onClick={() => void restoreVersion(version.version)} title={text("restoreVersion", { version: version.version })}><RotateCcw size={15} aria-hidden="true" />{text("restoreLocal")}</button>
                  </article>
                ))}
              </div>
            ) : <p className="workspace-project__publish-empty">{text("noPublishedEdition")}</p>}
          </section>

          <ProjectSyncPanel project={project} />

          <footer className="workspace-project__footer">
            <div><span>{text("nextSurface")}</span><PrefetchLink to="/create">{text("composeProject")}</PrefetchLink><PrefetchLink to="/create/story">{text("buildStory")}</PrefetchLink></div>
            <div>
              <button type="button" onClick={() => void exportPackage()}><Download size={17} aria-hidden="true" />{text("exportProject")}</button>
              <button type="button" className="is-danger" onClick={() => void workspace.removeProject(project.id)}><Trash2 size={17} aria-hidden="true" />{text("deleteProject")}</button>
            </div>
          </footer>
        </section>
      ) : null}
    </div>
  );
}
