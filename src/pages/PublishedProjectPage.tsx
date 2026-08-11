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
import { useWorkspaceCopy } from "../i18n/workspace-copy";

function requestedVersion(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function PublishedProjectPage() {
  const { text, locale } = useWorkspaceCopy();
  const { slug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const version = requestedVersion(searchParams.get("version"));
  const embedded = searchParams.get("embed") === "1";
  const workspace = useWorkspaceProjects();
  const [snapshot, setSnapshot] = useState<ResolvedPublishedProjectSnapshot | null>(null);
  const [versions, setVersions] = useState<PublishedProjectVersion[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useSEO({ title: snapshot?.project.name ?? text("publishedTitle"), descKey: "platform.routes.projects", path: `/share/${slug}` });

  useEffect(() => {
    let cancelled = false;
    setSnapshot(null);
    setError("");
    void fetchPublishedProject(slug, version).then((project) => {
      if (!cancelled) setSnapshot(project);
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : text("publishedUnavailable"));
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
    setNotice(text("pinnedCopied", { version: snapshot.version }));
  };

  if (error) return <PageTransition className="published-project-error"><span>NHB / PUBLISHED PROJECT</span><h1>{text("publishedUnavailable")}</h1><p>{error}</p><PrefetchLink to="/archive">{text("returnArchive")}</PrefetchLink></PageTransition>;
  if (!snapshot) return <div className="published-project-loading" role="status">{text("loadingPublished")}</div>;

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
      <div className="exhibition-utility" aria-label={text("exhibitionControls")}>
        <span>{exhibition.theme.toUpperCase()} / {exhibition.density.toUpperCase()}</span>
        <button type="button" onClick={() => void copyPinnedLink()}><Copy size={15} aria-hidden="true" />{text("pinEdition")}</button>
        <button type="button" onClick={() => void document.documentElement.requestFullscreen?.()}><Expand size={15} aria-hidden="true" />{text("fullscreen")}</button>
      </div>

      {exhibition.showIndex && project.assets.length ? <nav className="exhibition-index" aria-label={text("frameIndex")}><Grid3X3 size={16} aria-hidden="true" />{project.assets.map((asset, index) => <a key={asset.assetId} href={`#frame-${index + 1}`} aria-label={text("goFrame", { index: index + 1 })}>{String(index + 1).padStart(2, "0")}</a>)}</nav> : null}

      <header className="published-project__hero">
        {cover ? <ImageWithFallback src={cover.src} alt={cover.alt} title={cover.title} sizes="100vw" priority tone="ink" /> : null}
        <div className="published-project__scrim" aria-hidden="true" />
        <div className="published-project__intro">
          <span>NHB / VISUAL EXHIBITION / EDITION {String(snapshot.version).padStart(2, "0")}</span>
          <h1>{project.name}</h1>
          <p>{project.description || text("publishedFallback")}</p>
          {!embedded ? <div><button type="button" onClick={() => workspace.importProject({ ...project, updatedAt: Date.now(), lastOpenedAt: Date.now() })}><Download size={17} aria-hidden="true" />{text("remixLocally")}</button><PrefetchLink to="/archive"><ExternalLink size={17} aria-hidden="true" />{text("exploreArchive")}</PrefetchLink></div> : null}
        </div>
        <footer><span>{text("frameCount", { count: project.assets.length })}</span><span>{new Date(snapshot.publishedAt).toLocaleDateString(locale)}</span><span>{snapshot.contentHash.slice(0, 12)}</span></footer>
      </header>

      <div className="published-project__body">
          <header><span>01 / {text("exhibitionLabel")}</span><h2>{text("selectedClues")}</h2><p>{text("conceptDisclosure")}</p></header>
        <div className="published-project__grid">
          {project.assets.map((asset, index) => <figure id={`frame-${index + 1}`} key={asset.assetId} style={{ "--exhibition-order": index } as CSSProperties}><ImageWithFallback src={asset.src} alt={asset.alt} title={asset.title} sizes={exhibition.density === "immersive" ? "100vw" : "(max-width: 720px) 100vw, 33vw"} tone={exhibition.theme === "night" ? "ink" : index % 3 === 1 ? "sage" : "cream"} /><figcaption><span>{String(index + 1).padStart(2, "0")}</span><strong>{asset.title}</strong></figcaption></figure>)}
        </div>
      </div>

      {orderedVersions.length ? <section className="exhibition-editions" aria-labelledby="exhibition-editions-title"><header><span>02 / {text("versionTree")}</span><h2 id="exhibition-editions-title">{text("everyEdition")}</h2></header><div className="exhibition-editions__rail"><button type="button" disabled={!older} onClick={() => older && selectVersion(older.version)}><ChevronLeft size={16} aria-hidden="true" />{text("older")}</button>{orderedVersions.slice(0, 12).map((entry) => <button type="button" key={entry.version} className={entry.version === snapshot.version ? "is-active" : undefined} aria-pressed={entry.version === snapshot.version} onClick={() => selectVersion(entry.version)}><span>V{String(entry.version).padStart(2, "0")}</span><small>{new Date(entry.publishedAt).toLocaleDateString(locale)}</small></button>)}<button type="button" disabled={!newer} onClick={() => newer && selectVersion(newer.version)}>{text("newer")}<ChevronRight size={16} aria-hidden="true" /></button></div>{notice ? <p role="status">{notice}</p> : null}</section> : null}

      {!embedded ? <footer className="published-project__footer"><span><RotateCcw size={15} aria-hidden="true" />{text("immutableEdition", { version: snapshot.version })}</span><PrefetchLink to="/projects">{text("openProjectMemory")}</PrefetchLink></footer> : null}
    </PageTransition>
  );
}
