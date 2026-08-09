import "../styles/published-project-v7.css";
import { Download, ExternalLink, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { useWorkspaceProjects } from "../hooks/useWorkspaceProjects";
import { useSEO } from "../hooks/useSEO";
import { fetchPublishedProject } from "../lib/project-publish";
import type { PublishedProjectSnapshot } from "../types/published-project";

export function PublishedProjectPage() {
  const { slug = "" } = useParams();
  const workspace = useWorkspaceProjects();
  const [snapshot, setSnapshot] = useState<PublishedProjectSnapshot | null>(null);
  const [error, setError] = useState("");
  useSEO({ title: snapshot?.project.name ?? "Published visual project", descKey: "platform.routes.projects", path: `/share/${slug}` });

  useEffect(() => {
    let cancelled = false;
    setSnapshot(null);
    setError("");
    void fetchPublishedProject(slug).then((project) => {
      if (!cancelled) setSnapshot(project);
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : "Published project unavailable");
    });
    return () => { cancelled = true; };
  }, [slug]);

  if (error) return <PageTransition className="published-project-error"><span>NHB / PUBLISHED PROJECT</span><h1>Edition unavailable.</h1><p>{error}</p><PrefetchLink to="/archive">Return to Archive</PrefetchLink></PageTransition>;
  if (!snapshot) return <div className="published-project-loading" role="status">Loading published project...</div>;

  const project = snapshot.project;
  const cover = project.assets.find((asset) => asset.assetId === project.coverAssetId) ?? project.assets[0];
  return (
    <PageTransition className="published-project">
      <header className="published-project__hero">
        {cover ? <ImageWithFallback src={cover.src} alt={cover.alt} title={cover.title} sizes="100vw" priority tone="ink" /> : null}
        <div className="published-project__scrim" aria-hidden="true" />
        <div className="published-project__intro">
          <span>NHB / PUBLISHED VISUAL STUDY / V{String(snapshot.version).padStart(2, "0")}</span>
          <h1>{project.name}</h1>
          <p>{project.description || "A personal visual study assembled from the NHB archive."}</p>
          <div><button type="button" onClick={() => workspace.importProject({ ...project, updatedAt: Date.now() })}><Download size={17} aria-hidden="true" />REMIX LOCALLY</button><PrefetchLink to="/archive"><ExternalLink size={17} aria-hidden="true" />EXPLORE ARCHIVE</PrefetchLink></div>
        </div>
        <footer><span>{project.assets.length} FRAMES</span><span>{new Date(snapshot.publishedAt).toLocaleDateString()}</span><span>{snapshot.contentHash.slice(0, 12)}</span></footer>
      </header>

      <main className="published-project__body">
        <header><span>01 / LIGHT TABLE</span><h2>Selected visual clues</h2><p>Generated concept imagery is presented as a personal practice study, not as commissioned client work.</p></header>
        <div className="published-project__grid">
          {project.assets.map((asset, index) => <figure key={asset.assetId}><ImageWithFallback src={asset.src} alt={asset.alt} title={asset.title} sizes="(max-width: 720px) 100vw, 33vw" tone={index % 3 === 1 ? "sage" : "cream"} /><figcaption><span>{String(index + 1).padStart(2, "0")}</span><strong>{asset.title}</strong></figcaption></figure>)}
        </div>
      </main>

      <footer className="published-project__footer"><span><RotateCcw size={15} aria-hidden="true" />Immutable edition {snapshot.version}</span><PrefetchLink to="/projects">Open Project Memory</PrefetchLink></footer>
    </PageTransition>
  );
}
