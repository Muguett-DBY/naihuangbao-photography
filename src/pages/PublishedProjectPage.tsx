import "../styles/published-project-v7.css";
import "../styles/exhibition-v8.css";
import { ChevronLeft, ChevronRight, Copy, Download, Expand, ExternalLink, Grid3X3, RotateCcw } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { useParams, useSearchParams } from "react-router";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { useWorkspaceProjects } from "../hooks/useWorkspaceProjects";
import { useSEO } from "../hooks/useSEO";
import { fetchPublishedProject, listPublishedProjectVersions } from "../lib/project-publish";
import type { ResolvedPublishedProjectSnapshot, PublishedProjectVersion } from "../types/published-project";

function requestedVersion(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function PublishedProjectPage() {
  const { slug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const version = requestedVersion(searchParams.get("version"));
  const embedded = searchParams.get("embed") === "1";
  const workspace = useWorkspaceProjects();
  const [snapshot, setSnapshot] = useState<ResolvedPublishedProjectSnapshot | null>(null);
  const [versions, setVersions] = useState<PublishedProjectVersion[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useSEO({ title: snapshot?.project.name ?? "Published visual project", descKey: "platform.routes.projects", path: `/share/${slug}` });

  useEffect(() => {
    let cancelled = false;
    setSnapshot(null);
    setError("");
    void fetchPublishedProject(slug, version).then((project) => {
      if (!cancelled) setSnapshot(project);
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : "Published project unavailable");
    });
    void listPublishedProjectVersions(slug).then((availableVersions) => {
      if (!cancelled) setVersions(availableVersions);
    }).catch(() => {
      if (!cancelled) setVersions([]);
    });
    return () => { cancelled = true; };
  }, [slug, version]);

  const selectVersion = (nextVersion: number | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (nextVersion) next.set("version", String(nextVersion)); else next.delete("version");
    setSearchParams(next, { replace: false });
  };

  const copyPinnedLink = async () => {
    if (!snapshot) return;
    const url = new URL(window.location.href);
    url.searchParams.set("version", String(snapshot.version));
    await navigator.clipboard.writeText(url.toString());
    setNotice(`Pinned edition ${snapshot.version} link copied.`);
  };

  if (error) return <PageTransition className="published-project-error"><span>NHB / PUBLISHED PROJECT</span><h1>Edition unavailable.</h1><p>{error}</p><PrefetchLink to="/archive">Return to Archive</PrefetchLink></PageTransition>;
  if (!snapshot) return <div className="published-project-loading" role="status">Loading published project...</div>;

  const project = snapshot.project;
  const exhibition = project.exhibition;
  const cover = project.assets.find((asset) => asset.assetId === project.coverAssetId) ?? project.assets[0];
  const orderedVersions = [...versions].sort((left, right) => right.version - left.version);
  const versionIndex = orderedVersions.findIndex((entry) => entry.version === snapshot.version);
  const newer = versionIndex > 0 ? orderedVersions[versionIndex - 1] : undefined;
  const older = versionIndex >= 0 ? orderedVersions[versionIndex + 1] : undefined;
  const className = [
    "published-project",
    `exhibition--${exhibition.theme}`,
    `exhibition--${exhibition.density}`,
    `exhibition--motion-${exhibition.motion}`,
    embedded ? "exhibition--embedded" : "",
  ].filter(Boolean).join(" ");

  return (
    <PageTransition className={className} style={{ "--exhibition-accent": project.accent } as CSSProperties}>
      <div className="exhibition-utility" aria-label="Exhibition controls">
        <span>{exhibition.theme.toUpperCase()} / {exhibition.density.toUpperCase()}</span>
        <button type="button" onClick={() => void copyPinnedLink()}><Copy size={15} aria-hidden="true" />PIN EDITION</button>
        <button type="button" onClick={() => void document.documentElement.requestFullscreen?.()}><Expand size={15} aria-hidden="true" />FULLSCREEN</button>
      </div>

      {exhibition.showIndex && project.assets.length ? <nav className="exhibition-index" aria-label="Frame index"><Grid3X3 size={16} aria-hidden="true" />{project.assets.map((asset, index) => <a key={asset.assetId} href={`#frame-${index + 1}`} aria-label={`Go to frame ${index + 1}`}>{String(index + 1).padStart(2, "0")}</a>)}</nav> : null}

      <header className="published-project__hero">
        {cover ? <ImageWithFallback src={cover.src} alt={cover.alt} title={cover.title} sizes="100vw" priority tone="ink" /> : null}
        <div className="published-project__scrim" aria-hidden="true" />
        <div className="published-project__intro">
          <span>NHB / VISUAL EXHIBITION / EDITION {String(snapshot.version).padStart(2, "0")}</span>
          <h1>{project.name}</h1>
          <p>{project.description || "A personal visual study assembled from the NHB archive."}</p>
          {!embedded ? <div><button type="button" onClick={() => workspace.importProject({ ...project, updatedAt: Date.now(), lastOpenedAt: Date.now() })}><Download size={17} aria-hidden="true" />REMIX LOCALLY</button><PrefetchLink to="/archive"><ExternalLink size={17} aria-hidden="true" />EXPLORE ARCHIVE</PrefetchLink></div> : null}
        </div>
        <footer><span>{project.assets.length} FRAMES</span><span>{new Date(snapshot.publishedAt).toLocaleDateString()}</span><span>{snapshot.contentHash.slice(0, 12)}</span></footer>
      </header>

      <main className="published-project__body">
        <header><span>01 / EXHIBITION</span><h2>Selected visual clues</h2><p>Generated concept imagery is presented as a personal practice study, not as commissioned client work.</p></header>
        <div className="published-project__grid">
          {project.assets.map((asset, index) => <figure id={`frame-${index + 1}`} key={asset.assetId} style={{ "--exhibition-order": index } as CSSProperties}><ImageWithFallback src={asset.src} alt={asset.alt} title={asset.title} sizes={exhibition.density === "immersive" ? "100vw" : "(max-width: 720px) 100vw, 33vw"} tone={exhibition.theme === "night" ? "ink" : index % 3 === 1 ? "sage" : "cream"} /><figcaption><span>{String(index + 1).padStart(2, "0")}</span><strong>{asset.title}</strong></figcaption></figure>)}
        </div>
      </main>

      {orderedVersions.length ? <section className="exhibition-editions" aria-labelledby="exhibition-editions-title"><header><span>02 / VERSION TREE</span><h2 id="exhibition-editions-title">Every edition remains visitable.</h2></header><div className="exhibition-editions__rail"><button type="button" disabled={!older} onClick={() => older && selectVersion(older.version)}><ChevronLeft size={16} aria-hidden="true" />OLDER</button>{orderedVersions.slice(0, 12).map((entry) => <button type="button" key={entry.version} className={entry.version === snapshot.version ? "is-active" : undefined} aria-pressed={entry.version === snapshot.version} onClick={() => selectVersion(entry.version)}><span>V{String(entry.version).padStart(2, "0")}</span><small>{new Date(entry.publishedAt).toLocaleDateString()}</small></button>)}<button type="button" disabled={!newer} onClick={() => newer && selectVersion(newer.version)}>NEWER<ChevronRight size={16} aria-hidden="true" /></button></div>{notice ? <p role="status">{notice}</p> : null}</section> : null}

      {!embedded ? <footer className="published-project__footer"><span><RotateCcw size={15} aria-hidden="true" />Immutable edition {snapshot.version}</span><PrefetchLink to="/projects">Open Project Memory</PrefetchLink></footer> : null}
    </PageTransition>
  );
}
