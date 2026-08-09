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

function downloadPackage(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function ProjectsPage() {
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
      setNotice("Workspace imported locally.");
    } catch {
      setNotice("This file is not a valid NHB workspace package.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const publishProject = async () => {
    if (!project || !project.assets.length) return;
    setPublishing(true);
    setNotice("Publishing immutable project snapshot...");
    try {
      const receipt = await publishWorkspaceProject(project);
      setPublication(receipt);
      setVersions(await listPublishedProjectVersions(receipt.slug));
      setNotice(`Published version ${receipt.version}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Project publish failed.");
    } finally {
      setPublishing(false);
    }
  };

  const copyPublicationLink = async () => {
    if (!publication) return;
    await navigator.clipboard.writeText(new URL(publication.url, window.location.origin).toString());
    setNotice("Share link copied.");
  };

  const restoreVersion = async (version: number) => {
    if (!publication) return;
    try {
      const snapshot = await fetchPublishedProject(publication.slug, version);
      workspace.importProject({ ...snapshot.project, activeSurface: "publish", updatedAt: Date.now() });
      setNotice(`Version ${version} restored as the active local project.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Version restore failed.");
    }
  };

  const exportPackage = async () => {
    if (!project) return;
    downloadPackage(await createWorkspaceProjectPackage(project), `${project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "nhb-project"}.nhbpack`);
    setNotice("Portable project package exported with linked local snapshots.");
  };

  return (
    <div className="workspace-page">
      <header className="workspace-page__hero">
        <div>
          <span>NHB / PROJECT OPERATING SYSTEM / V8</span>
          <h1>Your visual work,<br />ready to resume.</h1>
        </div>
        <div className="workspace-page__hero-copy">
          <p>References, original files, directed scenes, compositions, stories, and published editions now share one durable project identity.</p>
          <div>
            <button type="button" onClick={() => workspace.createProject(`Visual study ${workspace.projects.length + 1}`)}><Plus size={17} aria-hidden="true" />New project</button>
            <button type="button" onClick={() => fileInputRef.current?.click()}><FileUp size={17} aria-hidden="true" />Import .nhbpack</button>
            <input ref={fileInputRef} type="file" accept=".nhbpack,application/json,application/x-nhb-workspace+json" hidden onChange={(event) => void importPackage(event.target.files?.[0])} />
          </div>
          {notice ? <p className="workspace-page__notice" role="status">{notice}</p> : null}
        </div>
      </header>

      <nav className="workspace-project-list" aria-label="Local visual projects">
        {workspace.projects.map((entry, index) => (
          <button type="button" key={entry.id} className={entry.id === project?.id ? "is-active" : undefined} onClick={() => workspace.setActiveProjectId(entry.id)}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{entry.name}</strong>
            <small>{entry.assets.length} FRAMES / {entry.creativeDocumentIds.length + entry.compositionIds.length + entry.storyIds.length} OUTPUTS</small>
          </button>
        ))}
      </nav>

      {project ? <ProjectCommandCenter project={project} events={workspace.events} /> : null}

      {project ? (
        <main className="workspace-project" style={{ "--workspace-accent": project.accent } as CSSProperties}>
          <header className="workspace-project__head">
            <div>
              <span>ACTIVE / {project.activeSurface.toUpperCase()}</span>
              <input aria-label="Project name" value={project.name} onChange={(event) => workspace.updateActiveProject({ name: event.target.value })} />
              <textarea aria-label="Project description" value={project.description} onChange={(event) => workspace.updateActiveProject({ description: event.target.value })} />
            </div>
            <div className="workspace-project__stats">
              <span><Images size={18} aria-hidden="true" /><strong>{project.assets.length}</strong><small>FRAMES</small></span>
              <span><Layers3 size={18} aria-hidden="true" /><strong>{project.compositionIds.length}</strong><small>COMPOSITIONS</small></span>
              <span><FolderOpen size={18} aria-hidden="true" /><strong>{project.storyIds.length}</strong><small>STORIES</small></span>
            </div>
          </header>

          <section className="workspace-project__frames" aria-labelledby="workspace-frames-title">
            <header><div><span>01 / PROJECT LIGHT TABLE</span><h2 id="workspace-frames-title">Collected frames</h2></div><p>Frames stay local until you explicitly publish a project.</p></header>
            {project.assets.length ? (
              <div className="workspace-project__grid">
                {project.assets.map((asset, index) => (
                  <figure key={asset.assetId}>
                    <ImageWithFallback src={asset.src} alt={asset.alt} title={asset.title} sizes="(max-width: 720px) 48vw, 22vw" tone={index % 3 === 0 ? "sage" : "cream"} />
                    <figcaption><span>{String(index + 1).padStart(2, "0")}</span><strong>{asset.title}</strong><button type="button" onClick={() => workspace.removeAsset(asset.assetId)} aria-label={`Remove ${asset.title}`}><Trash2 size={14} aria-hidden="true" /></button></figcaption>
                  </figure>
                ))}
              </div>
            ) : <div className="workspace-project__empty"><p>This project is waiting for its first visual clue.</p><PrefetchLink to="/archive">Explore the Archive</PrefetchLink></div>}
          </section>

          <section className="workspace-project__publish" aria-labelledby="workspace-publish-title">
            <header>
              <div><span>02 / PUBLISH</span><h2 id="workspace-publish-title">Immutable project editions</h2></div>
              <p>Only public archive URLs are included. Browser-only uploads stay on this device.</p>
            </header>
            <ExhibitionControls value={project.exhibition} onChange={(exhibition) => workspace.updateActiveProject({ exhibition })} />
            <div className="workspace-project__publish-actions">
              <button type="button" onClick={() => void publishProject()} disabled={publishing || !project.assets.length}><CloudUpload size={17} aria-hidden="true" />{publishing ? "PUBLISHING" : publication ? "PUBLISH NEW VERSION" : "PUBLISH PROJECT"}</button>
              {publication ? <button type="button" onClick={() => void copyPublicationLink()}><Copy size={17} aria-hidden="true" />COPY LINK</button> : null}
              {publication ? <a href={publication.url} target="_blank" rel="noreferrer"><ExternalLink size={17} aria-hidden="true" />OPEN LIVE</a> : null}
            </div>
            {versions.length ? (
              <div className="workspace-project__versions" aria-label="Published versions">
                {versions.map((version) => (
                  <article key={version.version}>
                    <span>V{String(version.version).padStart(2, "0")}</span>
                    <strong>{new Date(version.publishedAt).toLocaleString()}</strong>
                    <small>{version.contentHash.slice(0, 12)}</small>
                    <button type="button" onClick={() => void restoreVersion(version.version)} title={`Restore version ${version.version}`}><RotateCcw size={15} aria-hidden="true" />RESTORE LOCAL</button>
                  </article>
                ))}
              </div>
            ) : <p className="workspace-project__publish-empty">No published edition yet.</p>}
          </section>

          <ProjectSyncPanel project={project} />

          <footer className="workspace-project__footer">
            <div><span>NEXT SURFACE</span><PrefetchLink to="/create">Compose from this project</PrefetchLink><PrefetchLink to="/create/story">Build a visual story</PrefetchLink></div>
            <div>
              <button type="button" onClick={() => void exportPackage()}><Download size={17} aria-hidden="true" />Export project</button>
              <button type="button" className="is-danger" onClick={() => void workspace.removeProject(project.id)}><Trash2 size={17} aria-hidden="true" />Delete</button>
            </div>
          </footer>
        </main>
      ) : null}
    </div>
  );
}
