import { Archive, Boxes, BrainCircuit, CircleGauge, Cloud, History, Layers3, Play, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { PrefetchLink } from "../shared/PrefetchLink";
import type { WorkspaceProject, WorkspaceProjectEvent, WorkspaceSurface } from "../../types/workspace-project";

const surfaceRoutes: Record<WorkspaceSurface, string> = {
  archive: "/archive",
  vault: "/vault",
  composer: "/compose",
  studio: "/studio",
  story: "/create/story",
  publish: "/projects#publish",
};

function relativeTime(timestamp: number) {
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "NOW";
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  return `${Math.round(hours / 24)}D AGO`;
}

export function ProjectCommandCenter({ project, events }: { project: WorkspaceProject; events: WorkspaceProjectEvent[] }) {
  const outputs = project.creativeDocumentIds.length + project.compositionIds.length + project.storyIds.length;
  const momentum = Math.min(100, 12 + project.assets.length * 4 + outputs * 12 + Math.min(events.length, 8) * 3);
  const recentEvents = events.slice(0, 5);

  return (
    <section className="project-command" aria-labelledby="project-command-title">
      <header className="project-command__header">
        <div>
          <span>NHB / PROJECT COMMAND / V8</span>
          <h2 id="project-command-title">Resume the work,<br />not the setup.</h2>
        </div>
        <PrefetchLink className="project-command__resume" to={surfaceRoutes[project.activeSurface]}>
          <Play size={18} aria-hidden="true" />
          <span><small>CONTINUE / {project.activeSurface.toUpperCase()}</small><strong>{project.name}</strong></span>
        </PrefetchLink>
      </header>

      <div className="project-command__grid">
        <article className="project-command__momentum">
          <div className="project-command__dial" style={{ "--project-momentum": `${momentum}%` } as CSSProperties}>
            <CircleGauge size={25} aria-hidden="true" />
            <strong>{momentum}</strong>
          </div>
          <div><span>PROJECT MOMENTUM</span><p>{project.assets.length} frames and {outputs} authored outputs are ready to continue.</p></div>
        </article>

        <nav className="project-command__surfaces" aria-label="Project workspaces">
          <PrefetchLink to="/archive"><Archive size={18} aria-hidden="true" /><span>Archive<small>Find references</small></span></PrefetchLink>
          <PrefetchLink to="/vault"><Boxes size={18} aria-hidden="true" /><span>Asset Vault<small>Import originals</small></span></PrefetchLink>
          <PrefetchLink to="/compose"><Sparkles size={18} aria-hidden="true" /><span>Composer<small>Direct scenes</small></span></PrefetchLink>
          <PrefetchLink to="/curate"><BrainCircuit size={18} aria-hidden="true" /><span>Curator<small>Build an edit</small></span></PrefetchLink>
          <PrefetchLink to="/studio"><Layers3 size={18} aria-hidden="true" /><span>Studio<small>Finish frames</small></span></PrefetchLink>
        </nav>

        <article className="project-command__activity">
          <header><span><History size={16} aria-hidden="true" />ACTIVITY</span><small>LOCAL JOURNAL</small></header>
          {recentEvents.length ? recentEvents.map((event) => (
            <div key={event.id}><span>{event.surface.toUpperCase()}</span><strong>{event.summary}</strong><small>{relativeTime(event.createdAt)}</small></div>
          )) : <p>Project actions will appear here as you collect, compose, and publish.</p>}
        </article>

        <article className="project-command__cloud">
          <Cloud size={20} aria-hidden="true" />
          <span>CLOUD CONTINUITY</span>
          <p>Local-first by default. Signed-in projects gain immutable cloud revisions and offline recovery.</p>
          <small>SYNC ENGINE / ACTIVE</small>
        </article>
      </div>
    </section>
  );
}
